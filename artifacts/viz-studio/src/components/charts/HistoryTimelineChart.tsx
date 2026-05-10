import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Landmark } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import type { HistoryTimelineSpec } from "@/lib/chart-spec";
import { toSentenceCase } from "@/lib/text";

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
    fg: BRAND.slate900,
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
  const events = useMemo(
    () => [...spec.events].sort((a, b) => a.sort_year - b.sort_year),
    [spec.events],
  );
  const initialIndex = Math.max(
    0,
    events.findIndex((event) => event.title === spec.highlight_event),
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);
  const active = events[activeIndex] ?? events[0];
  const activeTone = active ? ERA_TONES[active.era] : ERA_TONES.origins;

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
              {toSentenceCase(spec.span_label)}
            </div>
            {active && (
              <div
                className="hidden items-center gap-1.5 rounded-full sm:inline-flex"
                style={{
                  background: BRAND.bgLilac,
                  color: BRAND.purps,
                  padding: "6px 10px",
                  fontSize: "clamp(10px, 1.05cqi, 12px)",
                  fontWeight: 800,
                }}
              >
                <CalendarDays size={13} strokeWidth={2.5} />
                {toSentenceCase(active.title)}
              </div>
            )}
          </div>
        )}

        <div
          className="relative min-h-0"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))`,
            alignItems: "start",
            gap: "clamp(4px, 1cqi, 10px)",
            padding: compact ? "2px 0 0" : "4px 0 2px",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "5%",
              right: "5%",
              top: compact ? 18 : 22,
              height: 2,
              background: BRAND.slate100,
            }}
          />
          {events.map((event, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                type="button"
                key={`${event.date_label}-${event.title}-${index}`}
                onClick={() => setActiveIndex(index)}
                className="relative z-10 flex min-w-0 flex-col items-center"
                style={{
                  appearance: "none",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  gap: compact ? 4 : 6,
                }}
                aria-pressed={isActive}
                title={`${event.date_label}: ${event.title}`}
              >
                <div
                  className="grid place-items-center rounded-full"
                  style={{
                    width: compact ? 30 : 38,
                    height: compact ? 30 : 38,
                    background: isActive ? BRAND.purps : "white",
                    color: isActive ? "white" : BRAND.slate700,
                    border: `2px solid ${isActive ? BRAND.purps : BRAND.slate300}`,
                    boxShadow: isActive
                      ? "0 8px 18px rgba(128, 0, 255, 0.18)"
                      : "0 3px 10px rgba(17, 24, 39, 0.06)",
                    fontSize: compact ? 10 : 11,
                    fontWeight: 900,
                  }}
                >
                  {index + 1}
                </div>
                <div
                  style={{
                    color: isActive ? BRAND.purps : BRAND.slate500,
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    fontWeight: 850,
                    lineHeight: 1.1,
                    maxWidth: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {event.date_label}
                </div>
              </button>
            );
          })}
        </div>

        {active && (
          <div
            className="grid min-h-0 rounded-2xl"
            style={{
              gridTemplateColumns: compact ? "1fr" : "minmax(84px, 0.24fr) 1fr",
              gap: compact ? 8 : 12,
              border: `1px solid ${BRAND.slate100}`,
              background: "white",
              boxShadow: "0 8px 24px rgba(17, 24, 39, 0.05)",
              padding: compact ? "10px" : "12px",
            }}
          >
            <div
              className="rounded-xl"
              style={{
                background: activeTone.bg,
                color: activeTone.fg,
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: "clamp(15px, 2cqi, 22px)",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {active.date_label}
              </div>
              <div
                style={{
                  fontSize: "clamp(9px, 0.95cqi, 11px)",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  textTransform: "uppercase",
                  color: activeTone.fg,
                }}
              >
                {activeTone.label}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  color: BRAND.slate950,
                  fontSize: "clamp(16px, 2.2cqi, 24px)",
                  fontWeight: 900,
                  lineHeight: 1.08,
                  margin: 0,
                  letterSpacing: 0,
                }}
              >
                {toSentenceCase(active.title)}
              </h3>
              <p
                style={{
                  margin: "7px 0 0",
                  color: BRAND.slate700,
                  fontSize: "clamp(11px, 1.3cqi, 14px)",
                  fontWeight: 650,
                  lineHeight: 1.35,
                }}
              >
                {toSentenceCase(active.description)}
              </p>
              {!compact && active.metric_value && (
                <div
                  className="mt-2 inline-flex items-baseline gap-2 rounded-full"
                  style={{
                    background: BRAND.slate50,
                    border: `1px solid ${BRAND.slate100}`,
                    padding: "6px 9px",
                  }}
                >
                  <span
                    style={{
                      color: BRAND.slate950,
                      fontSize: "clamp(12px, 1.35cqi, 15px)",
                      fontWeight: 900,
                    }}
                  >
                    {active.metric_value}
                  </span>
                  {active.metric_label && (
                    <span
                      style={{
                        color: BRAND.slate500,
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 800,
                      }}
                    >
                      {toSentenceCase(active.metric_label)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!compact && spec.callout && (
          <div
            className="rounded-2xl"
            style={{
              background: BRAND.slate50,
              color: BRAND.slate700,
              border: `1px solid ${BRAND.slate100}`,
              padding: "10px 12px",
              fontSize: "clamp(11px, 1.15cqi, 13px)",
              fontWeight: 750,
              lineHeight: 1.25,
            }}
          >
            {toSentenceCase(spec.callout)}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
