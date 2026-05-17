import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ChartArchetypeId } from "@workspace/question-bank";
import { ChartRenderer } from "@/components/charts";
import { CHART_TYPE_META } from "@/components/charts/meta";
import { ARCHETYPE_SAMPLES } from "@/lib/archetype-samples";
import { BRAND } from "@/lib/brand";
import type { ChartSpec } from "@/lib/chart-spec";

/**
 * One-line "what this archetype answers" copy keyed by the picker option.
 * Plain-language so a non-technical writer can scan and pick quickly.
 */
const ARCHETYPE_DESCRIPTIONS: Partial<Record<string, string>> = {
  weekly_pattern: "How busy each day of the week is — Mon vs Sat at a glance.",
  hourly_heatmap:
    "Crowd or wait by hour-of-day across the week — find the quietest window.",
  month_calendar:
    "Day-by-day map of the next 90 days (e.g. price or crowd by date).",
  booking_window:
    "How far in advance visitors book — and when things start selling out.",
  seasonal_curve:
    "Month-by-month busy curve across the year with best/worst months.",
  stat_grid:
    "Four quick numbers at the top of a page (visitors, avg visit, etc.).",
  compare_zones:
    "Side-by-side wait or crowd levels for different entrances / halls.",
  donut_breakdown:
    "Single share-of-total ring (e.g. 62% buy skip-the-line tickets).",
  ticket_ladder:
    "Ticket tier comparison: prices, what's included, recommended pick.",
  entrance_lanes:
    "The fastest entrance lane to pick — wait times for each door / line.",
  route_profile:
    "Stop-by-stop map of a route or itinerary with landmarks covered.",
  history_timeline:
    "Founding → spectacle → decline → restoration arc on one horizontal spine.",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (archetype: string) => void;
  options: string[];
}

export function ArchetypeGalleryModal({
  open,
  onClose,
  onPick,
  options,
}: Props) {
  const [filter, setFilter] = useState("");
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter((a) => {
      const meta = CHART_TYPE_META[a as ChartSpec["type"]];
      const label = meta?.label.toLowerCase() ?? a;
      const desc = (ARCHETYPE_DESCRIPTIONS[a] ?? "").toLowerCase();
      return a.includes(q) || label.includes(q) || desc.includes(q);
    });
  }, [filter, options]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 16, 35, 0.55)",
            zIndex: 70,
          }}
        />
        <DialogPrimitive.Content
          aria-describedby="archetype-gallery-desc"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(1080px, 94vw)",
            maxHeight: "88vh",
            background: "white",
            borderRadius: 18,
            border: `1px solid ${BRAND.slate200}`,
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.32)",
            display: "flex",
            flexDirection: "column",
            zIndex: 71,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: `1px solid ${BRAND.slate200}`,
              gap: 12,
            }}
          >
            <div>
              <DialogPrimitive.Title
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: BRAND.slate950,
                  margin: 0,
                }}
              >
                Chart archetypes
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                id="archetype-gallery-desc"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: BRAND.slate500,
                  marginTop: 2,
                }}
              >
                Browse what each chart type looks like and what question it
                answers. Click "Use this" to drop it into the form.
              </DialogPrimitive.Description>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Search
                  size={14}
                  color={BRAND.slate500}
                  style={{ position: "absolute", left: 10 }}
                />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  aria-label="Filter chart archetypes"
                  placeholder="Filter…"
                  style={{
                    padding: "8px 10px 8px 30px",
                    borderRadius: 10,
                    border: `1px solid ${BRAND.slate200}`,
                    fontSize: 12,
                    fontWeight: 600,
                    width: 200,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: BRAND.slate700,
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            style={{
              padding: 20,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 14,
            }}
          >
            {visible.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "40px 0",
                  color: BRAND.slate500,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                No archetypes match "{filter}".
              </div>
            )}
            {visible.map((a) => {
              const meta = CHART_TYPE_META[a as ChartSpec["type"]] ?? {
                label: a,
                emoji: "📈",
              };
              const sample =
                ARCHETYPE_SAMPLES[a as ChartArchetypeId] ?? null;
              const desc =
                ARCHETYPE_DESCRIPTIONS[a] ??
                "One of the available chart types.";
              return (
                <div
                  key={a}
                  style={{
                    border: `1px solid ${BRAND.slate200}`,
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    background: "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: BRAND.slate950,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span aria-hidden>{meta.emoji}</span>
                        {meta.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: BRAND.slate500,
                          fontWeight: 600,
                          marginTop: 2,
                          lineHeight: 1.4,
                        }}
                      >
                        {desc}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(a);
                        onClose();
                      }}
                      style={{
                        background: BRAND.purps,
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: 8,
                        fontWeight: 800,
                        fontSize: 11,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <Check size={12} />
                      Use this
                    </button>
                  </div>
                  <div
                    style={{
                      border: `1px solid ${BRAND.slate200}`,
                      borderRadius: 10,
                      padding: 8,
                      background: BRAND.slate50,
                      minHeight: 200,
                      display: "flex",
                      alignItems: "stretch",
                      justifyContent: "stretch",
                    }}
                  >
                    {sample ? (
                      <div style={{ width: "100%" }}>
                        <ChartRenderer
                          spec={sample}
                          header={{
                            title: meta.label,
                            subtitle: "Example",
                            question: meta.label,
                          }}
                          compact
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          margin: "auto",
                          textAlign: "center",
                          color: BRAND.slate500,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: 12,
                        }}
                      >
                        Preview coming soon — pick this archetype and the
                        AI will draft a chart for your CE.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
