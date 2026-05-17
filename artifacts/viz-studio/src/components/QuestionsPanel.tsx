import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  RotateCcw,
  VolumeX,
  X,
} from "lucide-react";
import {
  useGetQuestionBank,
  useCreateCeOverride,
  useUpdateCeOverride,
  useDeleteCeOverride,
  getGetQuestionBankQueryKey,
  type MergedQuestionBundle,
  type MergedQuestionCandidate,
  type QuestionBankView,
  type QuestionOverrideMutationResult,
} from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import {
  BundleGroupedList,
  OpenInBankLink,
  questionBankDeepLinkForSub,
} from "@/pages/QuestionBank";

const WRITER_KEY = "viz-studio:writer-name";
const PILL =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";

interface EditorState {
  mode: "edit" | "add";
  bundleId: string;
  archetype: string;
  defaultTemplate: string;
  existingOverrideId?: number;
  initialTemplate?: string;
}

export function QuestionsPanel({
  ceSlug,
  ceName,
}: {
  ceSlug: string;
  ceName: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [writerName, setWriterName] = useState<string>(() => {
    try {
      return window.localStorage.getItem(WRITER_KEY) ?? "";
    } catch {
      return "";
    }
  });

  function updateWriterName(name: string) {
    setWriterName(name);
    try {
      window.localStorage.setItem(WRITER_KEY, name);
    } catch {
      /* ignore */
    }
  }

  const bankParams = { ceSlug };
  const { data: view, isLoading, error } = useGetQuestionBank(bankParams, {
    query: {
      enabled: open,
      queryKey: getGetQuestionBankQueryKey(bankParams),
    },
  });

  const createMut = useCreateCeOverride();
  const deleteMut = useDeleteCeOverride();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetQuestionBankQueryKey() });
  }

  /**
   * Mutations return the freshly merged `view` for the affected scope. Push it
   * into the cache so the panel re-renders instantly without waiting for a
   * refetch round-trip; then invalidate so other scopes pick it up.
   */
  function applyMutationResult(res: QuestionOverrideMutationResult) {
    qc.setQueryData<QuestionBankView>(
      getGetQuestionBankQueryKey(bankParams),
      res.view,
    );
    invalidate();
  }

  async function quickMute(bundleId: string, archetype: string) {
    if (!writerName) {
      alert("Enter your name in the panel header first.");
      return;
    }
    if (!confirm(`Mute ${archetype} for ${ceName}?`)) return;
    const res = await createMut.mutateAsync({
      data: {
        ceSlug,
        bundleId,
        archetype,
        action: "mute",
        createdBy: writerName,
      },
    });
    applyMutationResult(res);
  }

  async function quickRevert(overrideId: number) {
    if (!confirm("Revert this CE-scope override?")) return;
    const res = await deleteMut.mutateAsync({ id: overrideId });
    applyMutationResult(res);
  }

  const resolvedSubId = view?.scope.resolvedSubcategoryId ?? null;
  const ceOverrideCount = view?.ceOverrides.length ?? 0;
  const categoryOverrideCount = view?.categoryOverrides.length ?? 0;

  return (
    <section
      className="rounded-2xl border"
      style={{
        background: "white",
        borderColor: BRAND.slate200,
        marginTop: 32,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4"
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown size={16} style={{ color: BRAND.slate500 }} />
          ) : (
            <ChevronRight size={16} style={{ color: BRAND.slate500 }} />
          )}
          <h3
            className="text-sm font-extrabold"
            style={{ color: BRAND.slate950, letterSpacing: "-0.01em" }}
          >
            Questions used to assemble this deck
          </h3>
          {open && (
            <>
              {ceOverrideCount > 0 && (
                <span
                  className={PILL}
                  style={{ background: BRAND.holaSoft, color: BRAND.hola }}
                >
                  {ceOverrideCount} CE override
                  {ceOverrideCount === 1 ? "" : "s"}
                </span>
              )}
              {categoryOverrideCount > 0 && (
                <span
                  className={PILL}
                  style={{ background: BRAND.bgMint, color: BRAND.okayInk }}
                >
                  {categoryOverrideCount} category override
                  {categoryOverrideCount === 1 ? "" : "s"}
                </span>
              )}
            </>
          )}
        </div>
        <span
          className="text-[11px] font-bold"
          style={{ color: BRAND.slate500 }}
        >
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div
          className="border-t px-5 pb-5 pt-3"
          style={{ borderColor: BRAND.slate200 }}
        >
          <div
            className="mb-3 rounded-xl px-3 py-2 text-[11px]"
            style={{
              background: BRAND.bgLilac,
              color: BRAND.slate900,
              fontWeight: 650,
              lineHeight: 1.45,
            }}
          >
            These are the <strong>templated questions</strong> the deterministic
            assembler runs every time you click <strong>Regenerate</strong>.
            <strong> Skip on regenerate</strong> silences a single question for
            this CE only. AI-generated chart ideas live in the{" "}
            <strong>CE Intel</strong> panel and aren't affected by this.
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-[640px] text-xs" style={{ color: BRAND.slate700 }}>
              Candidate questions the assembler evaluates for {ceName}. Edits
              here apply only to this CE. Use "Open in editor" to change
              defaults for the whole subcategory.
            </p>
            <div className="flex items-center gap-2">
              {resolvedSubId && <OpenInBankLink subcategoryId={resolvedSubId} />}
              <input
                value={writerName}
                onChange={(e) => updateWriterName(e.target.value)}
                placeholder="Your name (audit)"
                className="rounded-xl border px-2 py-1 text-[11px] font-bold"
                style={{
                  borderColor: BRAND.slate200,
                  color: BRAND.slate900,
                  background: "white",
                  width: 160,
                }}
              />
            </div>
          </div>

          {isLoading && (
            <div
              className="rounded-xl border p-4 text-center text-xs"
              style={{
                background: BRAND.slate50,
                borderColor: BRAND.slate200,
                color: BRAND.slate700,
              }}
            >
              <Loader2
                size={14}
                className="mr-2 inline animate-spin"
                style={{ color: BRAND.purps }}
              />
              Loading questions…
            </div>
          )}
          {error && (
            <div
              className="rounded-xl border p-3 text-xs"
              style={{
                background: BRAND.candySoft,
                borderColor: BRAND.candySoft,
                color: BRAND.candy,
              }}
            >
              Failed to load: {(error as Error).message}
            </div>
          )}
          {view && (
            <BundleGroupedList
              bundles={view.mergedBundles}
              showActions={true}
              compareToDefault={false}
              renderActions={(bundle, c) => (
                <CeRowActions
                  bundle={bundle}
                  candidate={c}
                  writerName={writerName}
                  resolvedSubId={resolvedSubId}
                  createPending={createMut.isPending}
                  deletePending={deleteMut.isPending}
                  onEdit={() =>
                    setEditor({
                      mode: "edit",
                      bundleId: bundle.bundleId,
                      archetype: c.archetype,
                      defaultTemplate: c.questionTemplate,
                      existingOverrideId:
                        c.source === "ce_override"
                          ? (c.overrideId ?? undefined)
                          : undefined,
                      initialTemplate:
                        c.source === "ce_override"
                          ? c.questionTemplate
                          : undefined,
                    })
                  }
                  onMute={() => quickMute(bundle.bundleId, c.archetype)}
                  onRevert={
                    c.source === "ce_override" && c.overrideId
                      ? () => quickRevert(c.overrideId!)
                      : undefined
                  }
                />
              )}
              bundleFooter={(bundle) => (
                <button
                  type="button"
                  disabled={!writerName}
                  onClick={() =>
                    setEditor({
                      mode: "add",
                      bundleId: bundle.bundleId,
                      archetype: "",
                      defaultTemplate: "",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
                  style={{
                    borderColor: BRAND.purpsSoft,
                    color: BRAND.purps,
                    background: "white",
                  }}
                >
                  <Plus size={11} /> Add CE question
                </button>
              )}
            />
          )}
        </div>
      )}

      {editor && (
        <CeEditorModal
          ceSlug={ceSlug}
          state={editor}
          writerName={writerName}
          onWriterNameChange={updateWriterName}
          onClose={() => setEditor(null)}
          onSaved={() => {
            invalidate();
            setEditor(null);
          }}
        />
      )}
    </section>
  );
}

function CeRowActions({
  bundle: _bundle,
  candidate,
  writerName,
  resolvedSubId,
  createPending,
  deletePending,
  onEdit,
  onMute,
  onRevert,
}: {
  bundle: MergedQuestionBundle;
  candidate: MergedQuestionCandidate;
  writerName: string;
  resolvedSubId: string | null;
  createPending: boolean;
  deletePending: boolean;
  onEdit: () => void;
  onMute: () => void;
  onRevert?: () => void;
}) {
  const isCategoryRow = candidate.source === "category_override";
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        disabled={!writerName}
        title={!writerName ? "Enter your name first" : "Edit for this CE only"}
        onClick={onEdit}
        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
        style={{
          borderColor: BRAND.slate200,
          color: BRAND.purps,
          background: "white",
        }}
      >
        <Edit3 size={11} /> Edit for this CE
      </button>
      {isCategoryRow && resolvedSubId && (
        <a
          href={questionBankDeepLinkForSub(resolvedSubId)}
          target="_blank"
          rel="noreferrer"
          title="Jump to the subcategory editor where this override lives"
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
          style={{
            borderColor: BRAND.slate200,
            color: BRAND.okayInk,
            background: BRAND.bgMint,
          }}
        >
          Edit at subcategory
        </a>
      )}
      {!candidate.muted && (
        <button
          type="button"
          disabled={!writerName || createPending}
          onClick={onMute}
          title="Don't ask this question when regenerating the deck for this CE"
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
          style={{
            borderColor: BRAND.candySoft,
            color: BRAND.candy,
            background: "white",
          }}
        >
          <VolumeX size={11} /> Skip on regenerate
        </button>
      )}
      {onRevert && (
        <button
          type="button"
          onClick={onRevert}
          disabled={deletePending}
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
          style={{
            borderColor: BRAND.slate200,
            color: BRAND.candy,
            background: "white",
          }}
        >
          <RotateCcw size={11} /> Revert
        </button>
      )}
    </div>
  );
}

function CeEditorModal({
  ceSlug,
  state,
  writerName,
  onWriterNameChange,
  onClose,
  onSaved,
}: {
  ceSlug: string;
  state: EditorState;
  writerName: string;
  onWriterNameChange: (v: string) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [template, setTemplate] = useState(
    state.initialTemplate ?? state.defaultTemplate ?? "",
  );
  const [archetype, setArchetype] = useState(state.archetype);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(writerName);

  const qc = useQueryClient();
  const createMut = useCreateCeOverride();
  const updateMut = useUpdateCeOverride();
  const isPending = createMut.isPending || updateMut.isPending;
  const isAdd = state.mode === "add";

  function applyResult(res: QuestionOverrideMutationResult) {
    qc.setQueryData<QuestionBankView>(
      getGetQuestionBankQueryKey({ ceSlug }),
      res.view,
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Enter your name for the audit trail.");
      return;
    }
    if (!template.trim()) {
      alert("Question template cannot be empty.");
      return;
    }
    if (isAdd && !archetype.trim()) {
      alert("Pick an archetype for the new question.");
      return;
    }
    onWriterNameChange(name.trim());
    try {
      let res: QuestionOverrideMutationResult;
      if (state.existingOverrideId) {
        res = await updateMut.mutateAsync({
          id: state.existingOverrideId,
          data: {
            questionTemplate: template.trim(),
            notes: notes.trim() || null,
            createdBy: name.trim(),
          },
        });
      } else {
        res = await createMut.mutateAsync({
          data: {
            ceSlug,
            bundleId: state.bundleId,
            archetype: archetype || state.archetype,
            action: isAdd ? "add" : "edit",
            questionTemplate: template.trim(),
            notes: notes.trim() || undefined,
            createdBy: name.trim(),
          },
        });
      }
      applyResult(res);
      onSaved();
    } catch (err) {
      alert(
        `Save failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,15,16,0.55)" }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border"
        style={{ background: "white", borderColor: BRAND.slate200 }}
      >
        <header
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: BRAND.slate200 }}
        >
          <h3
            className="text-base font-extrabold"
            style={{ color: BRAND.slate950 }}
          >
            {isAdd ? "Add CE question" : "Edit for this CE"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1"
            style={{ color: BRAND.slate500 }}
          >
            <X size={16} />
          </button>
        </header>
        <div className="space-y-3 px-5 py-4">
          <div
            className="rounded-lg px-3 py-2 text-[11px]"
            style={{ background: BRAND.slate50, color: BRAND.slate700 }}
          >
            <span className="font-bold">Bundle:</span> {state.bundleId}
            {!isAdd && (
              <>
                <span className="mx-1">·</span>
                <span className="font-bold">Archetype:</span> {state.archetype}
              </>
            )}
          </div>
          {isAdd && (
            <label className="block">
              <span
                className="mb-1 block text-[11px] font-bold uppercase tracking-wide"
                style={{ color: BRAND.slate700 }}
              >
                Archetype id
              </span>
              <input
                value={archetype}
                onChange={(e) => setArchetype(e.target.value)}
                placeholder="e.g. weekly_pattern"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.slate200 }}
              />
            </label>
          )}
          <label className="block">
            <span
              className="mb-1 block text-[11px] font-bold uppercase tracking-wide"
              style={{ color: BRAND.slate700 }}
            >
              Question template
            </span>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.slate200, fontFamily: "inherit" }}
            />
            <span
              className="mt-1 block text-[11px]"
              style={{ color: BRAND.slate500 }}
            >
              Use {"{{ceName}}"} as a placeholder.
            </span>
          </label>
          <label className="block">
            <span
              className="mb-1 block text-[11px] font-bold uppercase tracking-wide"
              style={{ color: BRAND.slate700 }}
            >
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.slate200, fontFamily: "inherit" }}
            />
          </label>
          <label className="block">
            <span
              className="mb-1 block text-[11px] font-bold uppercase tracking-wide"
              style={{ color: BRAND.slate700 }}
            >
              Your name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.slate200 }}
            />
          </label>
        </div>
        <footer
          className="flex items-center justify-end gap-2 border-t px-5 py-3"
          style={{ borderColor: BRAND.slate200 }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold"
            style={{
              borderColor: BRAND.slate200,
              color: BRAND.slate700,
              background: "white",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-extrabold"
            style={{
              background: isPending ? BRAND.slate200 : BRAND.purps,
              color: "white",
              border: "none",
            }}
          >
            {isPending && <Loader2 size={12} className="animate-spin" />}
            {isAdd ? "Add" : "Save"}
          </button>
        </footer>
      </form>
    </div>
  );
}
