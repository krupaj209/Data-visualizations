import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  MessageSquarePlus,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import type {
  BankQuestion,
  ChartArchetype,
  ChartArchetypeId,
  SubcategoryFamily,
} from "@workspace/question-bank";
import { BRAND } from "@/lib/brand";
import { ChartRenderer } from "@/components/charts";
import { ARCHETYPE_SAMPLES } from "@/lib/archetype-samples";
import type { ChartSpec } from "@/lib/chart-spec";
import { HeadoutLogo } from "@/components/HeadoutLogo";

interface SubcategoryRow {
  id: string;
  label: string;
  family: SubcategoryFamily | null;
  description: string;
  unratified: boolean;
  questions: BankQuestion[];
}
interface BankPayload {
  archetypes: Record<ChartArchetypeId, ChartArchetype>;
  standardQuestions: BankQuestion[];
  subcategories: SubcategoryRow[];
}

const FAMILY_ORDER: (SubcategoryFamily | "Other")[] = [
  "Tickets",
  "Tours",
  "Cruises",
  "Entertainment",
  "Adventure",
  "Aerial",
  "Water",
  "Nature",
  "Food",
  "Wellness",
  "Sports",
  "Specials",
  "Transport",
  "Other",
];

async function fetchBank(): Promise<BankPayload> {
  const res = await fetch("/api/question-bank");
  if (!res.ok) throw new Error("Failed to load question bank");
  return res.json();
}

export default function QuestionBank() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["question-bank"],
    queryFn: fetchBank,
  });

  const [previewArchetype, setPreviewArchetype] =
    useState<ChartArchetypeId | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<string | null>(null);
  const [suggestSubcat, setSuggestSubcat] = useState<SubcategoryRow | null>(
    null,
  );
  const [activeFamily, setActiveFamily] = useState<string>("All");

  const grouped = useMemo(() => {
    if (!data) return new Map<string, SubcategoryRow[]>();
    const m = new Map<string, SubcategoryRow[]>();
    for (const sub of data.subcategories) {
      const key = sub.family ?? "Other";
      const arr = m.get(key) ?? [];
      arr.push(sub);
      m.set(key, arr);
    }
    return m;
  }, [data]);

  const visibleSubcats = useMemo(() => {
    if (!data) return [];
    if (activeFamily === "All") return data.subcategories;
    return data.subcategories.filter(
      (s) => (s.family ?? "Other") === activeFamily,
    );
  }, [data, activeFamily]);

  return (
    <div
      className="min-h-screen"
      style={{ background: BRAND.bgShell, fontFamily: "Manrope, system-ui, sans-serif" }}
    >
      <header
        className="border-b sticky top-0 z-20"
        style={{ background: "white", borderColor: BRAND.slate200 }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: BRAND.slate700 }}
          >
            <ArrowLeft size={16} /> Library
          </Link>
          <div className="flex-1 flex items-center gap-3 justify-center">
            <HeadoutLogo height={26} />
            <div
              className="font-extrabold"
              style={{ color: BRAND.slate900, fontSize: 18 }}
            >
              Question Bank
            </div>
          </div>
          <a
            href={typeof window !== "undefined" ? window.location.href : "#"}
            onClick={(e) => {
              e.preventDefault();
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{
              border: `1px solid ${BRAND.slate200}`,
              color: BRAND.slate700,
            }}
            title="Copy link to share"
          >
            Copy share link
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <section className="mb-10">
          <h1
            className="font-extrabold tracking-tight"
            style={{ color: BRAND.slate900, fontSize: 38, lineHeight: 1.1 }}
          >
            Every question we answer with a chart
          </h1>
          <p
            className="mt-3 max-w-2xl"
            style={{ color: BRAND.slate700, fontSize: 16, lineHeight: 1.5 }}
          >
            Browse the questions visitors actually ask, the chart we use to
            answer each one, and a sample preview. See a gap?{" "}
            <button
              className="font-semibold underline"
              style={{ color: BRAND.purps }}
              onClick={() =>
                setSuggestSubcat({
                  id: "_general",
                  label: "General",
                  family: null,
                  description: "Cross-cutting suggestion",
                  unratified: false,
                  questions: [],
                })
              }
            >
              suggest a question
            </button>
            .
          </p>
        </section>

        {isLoading && (
          <div style={{ color: BRAND.slate700 }}>Loading bank…</div>
        )}
        {error && (
          <div style={{ color: BRAND.candy }}>
            Couldn't load the bank. Try refreshing.
          </div>
        )}

        {data && (
          <>
            {/* Standards */}
            <section className="mb-12">
              <SectionHeader
                eyebrow="Standards"
                title="Every CE gets these"
                sub="The four (well, five) universal questions inherited by every attraction unless skipped."
              />
              <div className="grid gap-3 md:grid-cols-2">
                {data.standardQuestions.map((q, i) => (
                  <QuestionCard
                    key={i}
                    q={q}
                    archetype={data.archetypes[q.recommended_archetype]}
                    onPreview={() => {
                      setPreviewArchetype(q.recommended_archetype);
                      setPreviewQuestion(q.question);
                    }}
                  />
                ))}
              </div>
            </section>

            {/* Family filter chips */}
            <section className="mb-6 flex items-center gap-2 flex-wrap">
              <FamilyChip
                label="All"
                active={activeFamily === "All"}
                onClick={() => setActiveFamily("All")}
              />
              {FAMILY_ORDER.filter((f) => grouped.has(f)).map((f) => (
                <FamilyChip
                  key={f}
                  label={f}
                  active={activeFamily === f}
                  onClick={() => setActiveFamily(f)}
                />
              ))}
            </section>

            {/* Subcategories */}
            <section className="space-y-8">
              {visibleSubcats.map((sub) => (
                <SubcategoryBlock
                  key={sub.id}
                  sub={sub}
                  archetypes={data.archetypes}
                  onPreview={(arch, qText) => {
                    setPreviewArchetype(arch);
                    setPreviewQuestion(qText);
                  }}
                  onSuggest={() => setSuggestSubcat(sub)}
                />
              ))}
            </section>
          </>
        )}
      </main>

      {previewArchetype && (
        <PreviewModal
          archetypeId={previewArchetype}
          archetype={data?.archetypes[previewArchetype]}
          question={previewQuestion}
          onClose={() => {
            setPreviewArchetype(null);
            setPreviewQuestion(null);
          }}
        />
      )}

      {suggestSubcat && data && (
        <SuggestModal
          subcat={suggestSubcat}
          archetypes={data.archetypes}
          onClose={() => setSuggestSubcat(null)}
        />
      )}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-4">
      <div
        className="text-[11px] font-extrabold uppercase tracking-wider"
        style={{ color: BRAND.purps }}
      >
        {eyebrow}
      </div>
      <h2
        className="font-extrabold mt-1"
        style={{ color: BRAND.slate900, fontSize: 22 }}
      >
        {title}
      </h2>
      <p
        className="mt-1 max-w-2xl"
        style={{ color: BRAND.slate700, fontSize: 14 }}
      >
        {sub}
      </p>
    </div>
  );
}

function FamilyChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
      style={{
        background: active ? BRAND.purps : "white",
        color: active ? "white" : BRAND.slate700,
        border: `1px solid ${active ? BRAND.purps : BRAND.slate200}`,
      }}
    >
      {label}
    </button>
  );
}

function SubcategoryBlock({
  sub,
  archetypes,
  onPreview,
  onSuggest,
}: {
  sub: SubcategoryRow;
  archetypes: Record<ChartArchetypeId, ChartArchetype>;
  onPreview: (a: ChartArchetypeId, q: string) => void;
  onSuggest: () => void;
}) {
  const hasQuestions = sub.questions.length > 0;
  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: "white", borderColor: BRAND.slate200 }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className="font-extrabold"
              style={{ color: BRAND.slate900, fontSize: 18 }}
            >
              {sub.label}
            </h3>
            {sub.family && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: BRAND.purpsSoft,
                  color: BRAND.purps,
                }}
              >
                {sub.family}
              </span>
            )}
            {sub.unratified && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: BRAND.slate100 ?? "#f1f5f9",
                  color: BRAND.slate700,
                }}
                title="No curated bank yet — orchestrator bootstraps from the DRD only."
              >
                Unratified
              </span>
            )}
          </div>
          <p
            className="mt-1 max-w-2xl"
            style={{ color: BRAND.slate700, fontSize: 13 }}
          >
            {sub.description}
          </p>
        </div>
        <button
          onClick={onSuggest}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
          style={{
            border: `1px solid ${BRAND.slate200}`,
            color: BRAND.purps,
          }}
        >
          <MessageSquarePlus size={14} /> Suggest
        </button>
      </div>
      {hasQuestions ? (
        <div className="grid gap-3 md:grid-cols-2">
          {sub.questions.map((q, i) => (
            <QuestionCard
              key={i}
              q={q}
              archetype={archetypes[q.recommended_archetype]}
              onPreview={() => onPreview(q.recommended_archetype, q.question)}
            />
          ))}
        </div>
      ) : (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: BRAND.bgShell,
            color: BRAND.slate700,
            border: `1px dashed ${BRAND.slate200}`,
          }}
        >
          No curated questions yet. Suggest one to start the bank for{" "}
          <strong>{sub.label}</strong>.
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  q,
  archetype,
  onPreview,
}: {
  q: BankQuestion;
  archetype: ChartArchetype | undefined;
  onPreview: () => void;
}) {
  const hasSample = !!ARCHETYPE_SAMPLES[q.recommended_archetype];
  return (
    <div
      className="rounded-xl p-4 border flex flex-col"
      style={{
        background: BRAND.bgShell,
        borderColor: BRAND.slate200,
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <span
          className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            background: q.kind === "standard" ? BRAND.purps : BRAND.candy,
            color: "white",
          }}
        >
          {q.kind === "standard" ? "Standard" : "Signature"}
        </span>
        {q.legacy && (
          <span
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: "white",
              color: BRAND.slate700,
              border: `1px solid ${BRAND.slate200}`,
            }}
          >
            Legacy
          </span>
        )}
      </div>
      <p
        className="font-extrabold flex-1"
        style={{ color: BRAND.slate900, fontSize: 15, lineHeight: 1.3 }}
      >
        {q.question}
      </p>
      <div
        className="mt-3 text-xs"
        style={{ color: BRAND.slate700, lineHeight: 1.4 }}
      >
        Answered with{" "}
        <strong style={{ color: BRAND.purps }}>
          {archetype?.label ?? q.recommended_archetype}
        </strong>
      </div>
      {q.notes && (
        <div
          className="mt-2 text-xs italic"
          style={{ color: BRAND.slate700, lineHeight: 1.4 }}
        >
          {q.notes}
        </div>
      )}
      <button
        onClick={onPreview}
        disabled={!hasSample}
        className="mt-3 self-start text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 transition"
        style={{
          background: hasSample ? BRAND.purps : "white",
          color: hasSample ? "white" : BRAND.slate700,
          border: hasSample
            ? `1px solid ${BRAND.purps}`
            : `1px solid ${BRAND.slate200}`,
          cursor: hasSample ? "pointer" : "not-allowed",
          opacity: hasSample ? 1 : 0.7,
        }}
        title={
          hasSample
            ? "See a sample chart of this type"
            : "Sample preview coming soon"
        }
      >
        <Eye size={13} /> {hasSample ? "Preview" : "Preview soon"}
      </button>
    </div>
  );
}

function PreviewModal({
  archetypeId,
  archetype,
  question,
  onClose,
}: {
  archetypeId: ChartArchetypeId;
  archetype: ChartArchetype | undefined;
  question: string | null;
  onClose: () => void;
}) {
  const sample = ARCHETYPE_SAMPLES[archetypeId] as ChartSpec | undefined;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl p-6 relative"
        style={{ background: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full"
          style={{ color: BRAND.slate700 }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="mb-1">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: BRAND.purps }}
          >
            Sample preview · {archetype?.label ?? archetypeId}
          </span>
        </div>
        {question && (
          <h3
            className="font-extrabold mb-1"
            style={{ color: BRAND.slate900, fontSize: 20 }}
          >
            {question}
          </h3>
        )}
        {archetype && (
          <p className="text-sm mb-4" style={{ color: BRAND.slate700 }}>
            {archetype.answers}
          </p>
        )}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: BRAND.slate200,
            background: "white",
            height: 460,
          }}
        >
          {sample ? (
            <ChartRenderer
              spec={sample}
              header={{
                title: archetype?.label ?? archetypeId,
                subtitle: "Sample data — illustrative only",
                question: question ?? archetype?.answers ?? "",
              }}
            />
          ) : (
            <div
              className="h-full flex items-center justify-center text-sm"
              style={{ color: BRAND.slate700 }}
            >
              Preview not yet available for this chart type.
            </div>
          )}
        </div>
        <div
          className="mt-3 text-xs italic"
          style={{ color: BRAND.slate700 }}
        >
          Numbers shown are illustrative, not from a real CE.
        </div>
      </div>
    </div>
  );
}

function SuggestModal({
  subcat,
  archetypes,
  onClose,
}: {
  subcat: SubcategoryRow;
  archetypes: Record<ChartArchetypeId, ChartArchetype>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [question, setQuestion] = useState("");
  const [recommended, setRecommended] = useState<string>("");
  const [note, setNote] = useState("");
  const [suggestedBy, setSuggestedBy] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/question-bank/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subcategoryId: subcat.id,
          question: question.trim(),
          recommendedArchetype: recommended || undefined,
          note: note.trim() || undefined,
          suggestedBy: suggestedBy.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ["bank-suggestions"] });
    },
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const archetypeIds = Object.keys(archetypes) as ChartArchetypeId[];

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 relative"
        style={{ background: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full"
          style={{ color: BRAND.slate700 }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: BRAND.purps }}
        >
          Suggest a question · {subcat.label}
        </div>
        <h3
          className="font-extrabold mt-1 mb-3"
          style={{ color: BRAND.slate900, fontSize: 20 }}
        >
          What's missing from the bank?
        </h3>

        {submitted ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{
              background: BRAND.bgShell,
              color: BRAND.slate900,
            }}
          >
            <Check size={18} style={{ color: BRAND.purps }} />
            <div className="mt-2 font-semibold">Thanks — got it.</div>
            <div style={{ color: BRAND.slate700 }}>
              Your suggestion is in the queue for the writing team to review.
            </div>
            <button
              className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: BRAND.purps,
                color: "white",
              }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!question.trim()) return;
              mut.mutate();
            }}
            className="space-y-3"
          >
            <Field label="Question (visitor's words)">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                placeholder="e.g. Which day has the shortest queue at the David?"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.slate200, fontFamily: "Manrope, system-ui, sans-serif" }}
                required
              />
            </Field>
            <Field label="Recommended chart type (optional)">
              <select
                value={recommended}
                onChange={(e) => setRecommended(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.slate200, fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                <option value="">— pick if you have one in mind —</option>
                {archetypeIds.map((id) => (
                  <option key={id} value={id}>
                    {archetypes[id].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Why this matters (optional)">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="What do visitors get wrong without this answer?"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.slate200, fontFamily: "Manrope, system-ui, sans-serif" }}
              />
            </Field>
            <Field label="Your name (optional)">
              <input
                value={suggestedBy}
                onChange={(e) => setSuggestedBy(e.target.value)}
                placeholder="anonymous"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: BRAND.slate200, fontFamily: "Manrope, system-ui, sans-serif" }}
              />
            </Field>
            {mut.isError && (
              <div className="text-xs" style={{ color: BRAND.candy }}>
                Couldn't submit. Try again.
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold px-3 py-2 rounded-full"
                style={{
                  border: `1px solid ${BRAND.slate200}`,
                  color: BRAND.slate700,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mut.isPending || !question.trim()}
                className="text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1"
                style={{
                  background: BRAND.purps,
                  color: "white",
                  opacity:
                    mut.isPending || !question.trim() ? 0.5 : 1,
                }}
              >
                <Sparkles size={13} />
                {mut.isPending ? "Sending…" : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="block text-xs font-semibold mb-1"
        style={{ color: BRAND.slate700 }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
