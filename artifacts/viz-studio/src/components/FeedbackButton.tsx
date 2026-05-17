import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareWarning,
  Loader2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import {
  useCreateChartFeedback,
  useListChartFeedback,
  useRegenerateChart,
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
  const [regenState, setRegenState] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [regenError, setRegenError] = useState<string | null>(null);
  const qc = useQueryClient();

  const createMut = useCreateChartFeedback();
  const regenMut = useRegenerateChart();
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

  const meaningful =
    rating != null || Boolean(category) || note.trim().length > 0;
  const busy = createMut.isPending || regenState === "pending";

  async function persistFeedback() {
    return createMut.mutateAsync({
      id: chartId,
      data: {
        rating,
        issueCategory: category || null,
        note: note.trim(),
        reporterName: reporter.trim(),
      },
    });
  }

  function resetForm() {
    setRating(null);
    setCategory("");
    setNote("");
  }

  async function submit() {
    if (!meaningful) return;
    await persistFeedback();
    setSubmitted(true);
    resetForm();
    qc.invalidateQueries({ queryKey: getListChartFeedbackQueryKey(chartId) });
    if (ceSlug) {
      qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
    }
    setTimeout(() => setSubmitted(false), 1800);
  }

  async function submitAndRegenerate() {
    if (!meaningful) return;
    setRegenError(null);
    let feedbackRow: ChartFeedback;
    try {
      feedbackRow = await persistFeedback();
    } catch (err) {
      setRegenError(
        err instanceof Error ? err.message : "Could not save feedback.",
      );
      setRegenState("error");
      return;
    }
    qc.invalidateQueries({ queryKey: getListChartFeedbackQueryKey(chartId) });
    setRegenState("pending");
    try {
      await regenMut.mutateAsync({
        id: chartId,
        data: {
          feedbackContext: {
            chartFeedbackId: feedbackRow.id,
            note: feedbackRow.note || undefined,
            issueCategory: feedbackRow.issueCategory ?? undefined,
          },
        },
      });
      qc.invalidateQueries({ queryKey: getListChartFeedbackQueryKey(chartId) });
      if (ceSlug) {
        qc.invalidateQueries({ queryKey: getGetCeQueryKey(ceSlug) });
      }
      setRegenState("success");
      resetForm();
      setTimeout(() => {
        setOpen(false);
        setRegenState("idle");
      }, 1200);
    } catch (err) {
      const rawMessage =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error ??
            (err instanceof Error ? err.message : null)
          : err instanceof Error
            ? err.message
            : null;
      // Special-case the 412 "No DRD uploaded" path so the writer sees a
      // clear next-step instead of a bare server string. The Intel panel
      // on the right side of CE Detail is where DRDs are attached.
      const isMissingDrd =
        typeof rawMessage === "string" && /no drd uploaded/i.test(rawMessage);
      setRegenError(
        isMissingDrd
          ? 'This CE has no research doc (DRD) yet — regeneration needs one for grounding. Open the "Intel & sources" panel on the right and click "Add DRD" to paste notes or upload a PDF, then try again. (Your feedback was saved.)'
          : rawMessage ??
            "Regeneration failed. The feedback was saved and is queryable from Triage.",
      );
      setRegenState("error");
    }
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
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !meaningful}
              style={{
                flex: 1,
                background: submitted ? BRAND.bgMint : "white",
                color: submitted ? "#0E8F4E" : BRAND.purps,
                border: `1px solid ${submitted ? BRAND.bgMint : BRAND.purpsSoft}`,
                padding: "10px 10px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 12,
                cursor: busy || !meaningful ? "not-allowed" : "pointer",
                opacity: !meaningful && !busy ? 0.55 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {createMut.isPending && regenState !== "pending" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : submitted ? (
                <Check size={14} />
              ) : null}
              {submitted ? "Sent" : "Send"}
            </button>
            <button
              type="button"
              onClick={submitAndRegenerate}
              disabled={busy || !meaningful}
              style={{
                flex: 1.4,
                background:
                  regenState === "success" ? BRAND.bgMint : BRAND.purps,
                color: regenState === "success" ? "#0E8F4E" : "white",
                border: "none",
                padding: "10px 10px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 12,
                cursor: busy || !meaningful ? "not-allowed" : "pointer",
                opacity: !meaningful && !busy ? 0.55 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
              title="Save the feedback and regenerate this chart with it as guidance"
            >
              {regenState === "pending" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Regenerating chart…
                </>
              ) : regenState === "success" ? (
                <>
                  <Check size={14} />
                  Regenerated
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Send &amp; regenerate
                </>
              )}
            </button>
          </div>
          {regenState === "error" && regenError && (
            <div
              role="alert"
              style={{
                marginTop: 8,
                padding: "8px 10px",
                borderRadius: 8,
                background: BRAND.candySoft,
                color: BRAND.candy,
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {regenError}
            </div>
          )}

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
