import { Landmark, ShieldCheck } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import type { HistoryTimelineSpec } from "@/lib/chart-spec";

interface Props {
  spec: HistoryTimelineSpec;
  context?: string;
  compact?: boolean;
}

const ERA_TONES: Record<
  HistoryTimelineSpec["events"][number]["era"],
  { bg: string; fg: string; line: string; label: string }
> = {
  origins: {
    bg: BRAND.slate50,
    fg: BRAND.slate700,
    line: BRAND.slate300,
    label: "Origins",
  },
  construction: {
    bg: BRAND.purpsSoft,
    fg: BRAND.purps,
    line: BRAND.purps,
    label: "Construction",
  },
  spectacle: {
    bg: BRAND.candySoft,
    fg: BRAND.candy,
    line: BRAND.candy,
    label: "Spectacle",
  },
  decline: {
    bg: BRAND.holaSoft,
    fg: "#A65A00",
    line: "#D89122",
    label: "Decline",
  },
  reuse: {
    bg: BRAND.slate100,
    fg: BRAND.slate800,
    line: BRAND.slate500,
    label: "Reuse",
  },
  restoration: {
    bg: BRAND.bgMint,
    fg: "#0E8F4E",
    line: "#16A765",
    label: "Restoration",
  },
  modern: {
    bg: "#EEF2FF",
    fg: "#4250B5",
    line: "#6473E8",
    label: "Modern",
  },
};

export function HistoryTimelineChart({ spec, context, compact }: Props) {
  const events = [...spec.events].sort((a, b) => a.sort_year - b.sort_year);
  const highlighted =
    spec.highlight_event &&
    events.find((event) => event.title === spec.highlight_event);

  return (
    <ChartCard context={context} compact={compact} pill="Timeline">
      <div
        className="flex h-full min-h-0 flex-col"
        style={{ gap: compact ? 10 : 14 }}
      >
        {!compact && (
          <div className="flex items-center justify-between gap-3">
            <div
              className="inline-flex items-center gap-2 rounded-full"
              style={{
                background: BRAND.slate50,
                color: BRAND.slate700,
                border: `1px solid ${BRAND.slate100}`,
                padding: "6px 10px",
                fontSize: "clamp(10px, 1.1cqi, 12px)",
                fontWeight: 800,
              }}
            >
              <Landmark size={14} strokeWidth={2.5} />
              {spec.span_label}
            </div>
            {highlighted && (
              <div
                className="hidden items-center gap-1.5 rounded-full sm:inline-flex"
                style={{
                  background: BRAND.bgMint,
                  color: "#0E8F4E",
                  padding: "6px 10px",
                  fontSize: "clamp(10px, 1.05cqi, 12px)",
                  fontWeight: 800,
                }}
              >
                <ShieldCheck size={13} strokeWidth={2.5} />
                {highlighted.title}
              </div>
            )}
          </div>
        )}

        <div
          className="relative flex-1 min-h-0 overflow-hidden"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))`,
            alignItems: "stretch",
            gap: "clamp(6px, 1.2cqi, 12px)",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "4%",
              right: "4%",
              top: compact ? "28px" : "36px",
              height: 2,
              background: BRAND.slate100,
            }}
          />
          {events.map((event, index) => {
            const tone = ERA_TONES[event.era];
            const isHighlight = event.title === spec.highlight_event;
            return (
              <div
                key={`${event.date_label}-${event.title}-${index}`}
                className="relative flex min-w-0 flex-col"
                style={{
                  paddingTop: compact ? 0 : 4,
                  gap: compact ? 6 : 8,
                }}
              >
                <div
                  className="relative z-10 mx-auto grid place-items-center rounded-full"
                  style={{
                    width: compact ? 32 : 42,
                    height: compact ? 32 : 42,
                    background: isHighlight ? tone.line : "white",
                    color: isHighlight ? "white" : tone.fg,
                    border: `2px solid ${tone.line}`,
                    boxShadow: isHighlight
                      ? "0 8px 18px rgba(128, 0, 255, 0.18)"
                      : "0 3px 10px rgba(17, 24, 39, 0.08)",
                    fontSize: compact ? 10 : 11,
                    fontWeight: 900,
                  }}
                  title={event.date_label}
                >
                  {index + 1}
                </div>
                <div
                  className="rounded-2xl"
                  style={{
                    border: `1px solid ${isHighlight ? tone.line : BRAND.slate100}`,
                    background: isHighlight ? tone.bg : "white",
                    padding: compact ? "8px" : "10px",
                    minHeight: compact ? 118 : 150,
                    boxShadow: isHighlight
                      ? "0 12px 26px rgba(128, 0, 255, 0.12)"
                      : "0 6px 18px rgba(17, 24, 39, 0.05)",
                  }}
                >
                  <div
                    style={{
                      color: tone.fg,
                      fontSize: "clamp(10px, 1.2cqi, 12px)",
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    {event.date_label}
                  </div>
                  {!compact && (
                    <div
                      className="mt-2 inline-flex rounded-full"
                      style={{
                        background: tone.bg,
                        color: tone.fg,
                        padding: "4px 7px",
                        fontSize: "clamp(8px, 0.9cqi, 10px)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {tone.label}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: compact ? 6 : 8,
                      color: BRAND.slate950,
                      fontSize: "clamp(11px, 1.35cqi, 15px)",
                      fontWeight: 900,
                      lineHeight: 1.1,
                    }}
                  >
                    {event.title}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: BRAND.slate600,
                      fontSize: "clamp(9px, 1.02cqi, 12px)",
                      fontWeight: 650,
                      lineHeight: 1.25,
                    }}
                  >
                    {event.description}
                  </div>
                  {!compact && event.metric_value && (
                    <div
                      className="mt-2 rounded-xl"
                      style={{
                        background: "rgba(255, 255, 255, 0.72)",
                        border: `1px solid ${BRAND.slate100}`,
                        padding: "6px 8px",
                      }}
                    >
                      <div
                        style={{
                          color: BRAND.slate950,
                          fontSize: "clamp(11px, 1.2cqi, 14px)",
                          fontWeight: 900,
                        }}
                      >
                        {event.metric_value}
                      </div>
                      {event.metric_label && (
                        <div
                          style={{
                            color: BRAND.slate500,
                            fontSize: "clamp(8px, 0.9cqi, 10px)",
                            fontWeight: 800,
                          }}
                        >
                          {event.metric_label}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!compact && spec.callout && (
          <div
            className="rounded-2xl"
            style={{
              background: BRAND.purpsSoft,
              color: BRAND.slate800,
              padding: "10px 12px",
              fontSize: "clamp(11px, 1.15cqi, 13px)",
              fontWeight: 750,
              lineHeight: 1.25,
            }}
          >
            {spec.callout}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
