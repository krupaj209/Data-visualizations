import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquareWarning, Loader2, Check, X } from "lucide-react";
import {
  useCreateChartFeedback,
  useListChartFeedback,
  getListChartFeedbackQueryKey,
  getGetCeQueryKey,
  type ChartFeedback,
} from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";

interface Props {
  chartId: number;
  ceSlug?: string;
  /** Optional pre-counted open issues to render the badge without an extra fetch. */
  openCount?: number;
  topSeverity?: "high" | "medium" | "low" | null;
}

const ISSUE_OPTIONS: { value: string; label: string }[] = [
  { value: "wrong_data", label: "Wrong data" },
  { value: "misleading", label: "Misleading framing" },
  { value: "doesnt_answer", label: "Doesn't answer the question" },
  { value: "ugly", label: "Looks ugly / cramped" },
  { value: "other", label: "Other" },
];

export function FeedbackButton({
  chartId,
  ceSlug,
  openCount,
  topSeverity,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState<string>("");
  const [note, setNote] = useState("");
  const [reporter, setReporter] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const qc = useQueryClient();

  const createMut = useCreateChartFeedback();
  const list = useListChartFeedback(chartId, {
    query: {
      enabled: open,
      // Align with the generated key so post-submit invalidation
      // (`getListChartFeedbackQueryKey(chartId)`) refreshes the
      // "Recent feedback" list immediately.
      queryKey: getListChartFeedbackQueryKey(chartId),
    },
  });

  const badgeCount = openCount ?? 0;
  const badgeColor =
    topSeverity === "high"
      ? BRAND.candy
      : topSeverity === "medium"
        ? "#D97706"
        : topSeverity === "low"
          ? BRAND.purps
          : BRAND.slate500;

  async function submit() {
    if (rating == null && !category && !note.trim()) return;
    await createMut.mutateAsync({
      id: chartId,
      data: {
        rating,
        issueCategory: category || null,
        note: note.trim(),
        reporterName: reporter.trim(),
      },
    });
    setSubmitted(true);
    setRating(null);
    setCategory("");
    setNote("");
    qc.invalidateQueries({ queryKey: getListChartFeedbackQueryKey(chartId) });
    if (ceSlug) {
      qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
    }
    setTimeout(() => setSubmitted(false), 1800);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "white",
          color: BRAND.slate950,
          border: `1px solid ${BRAND.slate200}`,
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
        title="Send feedback on this chart"
      >
        <MessageSquareWarning size={14} />
        Feedback
        {badgeCount > 0 && (
          <span
            style={{
              background: badgeColor,
              color: "white",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 800,
              padding: "1px 7px",
              minWidth: 18,
              textAlign: "center",
              lineHeight: "16px",
            }}
          >
            {badgeCount}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 50,
            width: 340,
            background: "white",
            borderRadius: 14,
            border: `1px solid ${BRAND.slate200}`,
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
            padding: 16,
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 8 }}
          >
            <strong style={{ fontSize: 13, color: BRAND.slate950 }}>
              Flag this chart
            </strong>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: BRAND.slate500,
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? null : n)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  borderRadius: 8,
                  border: `1px solid ${rating === n ? BRAND.purps : BRAND.slate200}`,
                  background: rating === n ? BRAND.purpsSoft : "white",
                  color: rating === n ? BRAND.purps : BRAND.slate700,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${BRAND.slate200}`,
              fontSize: 12,
              fontWeight: 600,
              background: "white",
              marginBottom: 8,
            }}
          >
            <option value="">Issue category…</option>
            {ISSUE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's wrong, in one sentence?"
            rows={3}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${BRAND.slate200}`,
              fontSize: 12,
              fontFamily: "inherit",
              resize: "vertical",
              marginBottom: 8,
            }}
          />
          <input
            value={reporter}
            onChange={(e) => setReporter(e.target.value)}
            placeholder="Your name (optional)"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${BRAND.slate200}`,
              fontSize: 12,
              marginBottom: 10,
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={createMut.isPending}
            style={{
              width: "100%",
              background: submitted ? BRAND.bgMint : BRAND.purps,
              color: submitted ? "#0E8F4E" : "white",
              border: "none",
              padding: "10px 12px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {createMut.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : submitted ? (
              <Check size={14} />
            ) : null}
            {submitted ? "Sent" : "Send feedback"}
          </button>

          {list.data && list.data.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: BRAND.slate500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Recent feedback
              </div>
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  maxHeight: 160,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {list.data.slice(0, 6).map((f: ChartFeedback) => (
                  <li
                    key={f.id}
                    style={{
                      fontSize: 11,
                      color: BRAND.slate700,
                      borderLeft: `3px solid ${
                        f.severity === "high"
                          ? BRAND.candy
                          : f.severity === "medium"
                            ? "#D97706"
                            : BRAND.slate200
                      }`,
                      paddingLeft: 8,
                      lineHeight: 1.4,
                    }}
                  >
                    <strong style={{ color: BRAND.slate950 }}>
                      {f.issueCategory ?? (f.rating ? `${f.rating}/5` : "note")}
                    </strong>
                    {f.note ? ` — ${f.note}` : ""}
                    <span
                      style={{
                        marginLeft: 6,
                        color: BRAND.slate500,
                      }}
                    >
                      · {f.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
