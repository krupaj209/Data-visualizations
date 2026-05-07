import { Router, type IRouter } from "express";
import multer from "multer";
import { eq, sql } from "drizzle-orm";
import { db, drdsTable, type Drd } from "@workspace/db";
import { extractPdfToMarkdown } from "../lib/extract-drd";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB cap is plenty for a DRD PDF
});

function serialize(drd: Drd) {
  let sources: unknown = [];
  try {
    sources = JSON.parse(drd.sources);
  } catch {
    sources = [];
  }
  return {
    id: drd.id,
    ceSlug: drd.ceSlug,
    sourceType: drd.sourceType,
    sourceFilename: drd.sourceFilename,
    sources,
    markdownPreview: drd.markdown.slice(0, 1200),
    markdownLength: drd.markdown.length,
    createdAt: drd.createdAt.toISOString(),
    updatedAt: drd.updatedAt.toISOString(),
  };
}

router.get("/drds/:ceSlug", async (req, res): Promise<void> => {
  const ceSlug = req.params["ceSlug"];
  if (!ceSlug) {
    res.status(400).json({ error: "ceSlug is required" });
    return;
  }
  const [drd] = await db
    .select()
    .from(drdsTable)
    .where(eq(drdsTable.ceSlug, ceSlug));
  if (!drd) {
    res.status(404).json({ error: "No DRD uploaded for this CE yet" });
    return;
  }
  res.json(serialize(drd));
});

router.delete("/drds/:ceSlug", async (req, res): Promise<void> => {
  const ceSlug = req.params["ceSlug"];
  if (!ceSlug) {
    res.status(400).json({ error: "ceSlug is required" });
    return;
  }
  const [deleted] = await db
    .delete(drdsTable)
    .where(eq(drdsTable.ceSlug, ceSlug))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "No DRD to delete" });
    return;
  }
  res.sendStatus(204);
});

/**
 * Upload or replace the DRD for a CE. Accepts either:
 *  - multipart/form-data with `file` (PDF) and `ceSlug`
 *  - application/json with { ceSlug, markdown, sources?, sourceFilename? }
 */
router.post("/drds", upload.single("file"), async (req, res): Promise<void> => {
  let ceSlug: string | undefined;
  let markdown: string | undefined;
  let sourceType: "markdown" | "pdf" = "markdown";
  let sourceFilename: string | null = null;
  let sources: unknown[] = [];

  if (req.file) {
    ceSlug = (req.body as Record<string, string> | undefined)?.["ceSlug"];
    sourceType = "pdf";
    sourceFilename = req.file.originalname;
    try {
      markdown = await extractPdfToMarkdown(req.file.buffer);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "PDF extraction failed",
      });
      return;
    }
  } else {
    const body = (req.body ?? {}) as {
      ceSlug?: string;
      markdown?: string;
      sources?: unknown[];
      sourceFilename?: string;
    };
    ceSlug = body.ceSlug;
    markdown = body.markdown;
    if (body.sourceFilename) sourceFilename = body.sourceFilename;
    if (Array.isArray(body.sources)) sources = body.sources;
  }

  if (!ceSlug || !ceSlug.trim()) {
    res.status(400).json({ error: "ceSlug is required" });
    return;
  }
  if (!markdown || !markdown.trim()) {
    res
      .status(400)
      .json({ error: "DRD body is empty (provide markdown or a PDF file)" });
    return;
  }

  const [row] = await db
    .insert(drdsTable)
    .values({
      ceSlug: ceSlug.trim(),
      markdown,
      sourceType,
      sourceFilename,
      sources: JSON.stringify(sources),
    })
    .onConflictDoUpdate({
      target: drdsTable.ceSlug,
      set: {
        markdown,
        sourceType,
        sourceFilename,
        sources: JSON.stringify(sources),
        updatedAt: sql`NOW()`,
      },
    })
    .returning();

  if (!row) {
    res.status(500).json({ error: "Failed to persist DRD" });
    return;
  }
  res.status(201).json(serialize(row));
});

export default router;
