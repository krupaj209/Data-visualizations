import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extract plain text from an uploaded PDF buffer. Pages are joined with
 * blank lines so paragraph boundaries survive into the markdown form
 * stored on the `drds` table.
 *
 * Errors are wrapped so callers can return a clean 400 to the writer
 * rather than a stack trace.
 */
export async function extractPdfToMarkdown(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    return pages
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join("\n\n");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not read PDF: ${message}`);
  }
}
