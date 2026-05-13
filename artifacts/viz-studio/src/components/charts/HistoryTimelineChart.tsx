import { useEffect, useMemo, useRef, useState } from "react";
import { Landmark } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import type { HistoryTimelineSpec } from "@/lib/chart-spec";
import { toSentenceCase } from "@/lib/text";

interface Props {
  spec: HistoryTimelineSpec;
  context?: string;
  compact?: boolean;
}

type EraKey = HistoryTimelineSpec["events"][number]["era"];
type Event = HistoryTimelineSpec["events"][number];

const ERA_TONES: Record<
  EraKey,
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

/** Width threshold: at or above this, render the horizontal layered layout. */
const HORIZONTAL_MIN_WIDTH = 560;

export function HistoryTimelineChart({ spec, context, compact }: Props) {
  const events = useMemo(
    () => [...spec.events].sort((a, b) => a.sort_year - b.sort_year),
    [spec.events],
  );
  const highlightTitle = spec.highlight_event;

  // Layout switch: measure the chart container width via ResizeObserver and
  // pick horizontal (≥560px wide and not in compact mode) or vertical fallback.
  // Compact mode (sub-340px iframes) always uses vertical — horizontal can't
  // fit 9 columns of titles below ~440px wide.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setWidth(r.width);
      setHeight(r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const useHorizontal = !compact && width >= HORIZONTAL_MIN_WIDTH;

  // Vertical "dense" auto-detect (legacy path): when the iframe is tall enough
  // to skip global compact (≥340px) but still too short to show every event
  // with description without scrolling, drop descriptions + callout.
  const verticalNeeded = events.length * 64 + 80;
  const verticalDense =
    !useHorizontal && !compact && height > 0 && height < verticalNeeded;
  const hideDescriptions = compact || verticalDense;

  return (
    <ChartCard context={context} compact={compact} pill="Timeline">
      <div
        ref={containerRef}
        className="flex h-full min-h-0 flex-col"
        style={{ gap: compact ? 8 : 12 }}
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
            <div
              className="text-right"
              style={{
                color: BRAND.slate500,
                fontSize: "clamp(9px, 0.95cqi, 11px)",
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {events.length} key moments
            </div>
          </div>
        )}

        {useHorizontal ? (
          <HorizontalTimeline
            events={events}
            highlightTitle={highlightTitle}
            callout={spec.callout}
          />
        ) : (
          <VerticalTimeline
            events={events}
            highlightTitle={highlightTitle}
            compact={!!compact}
            hideDescriptions={hideDescriptions}
            callout={spec.callout}
          />
        )}
      </div>
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal layered layout (≥560px wide)                             */
/* ------------------------------------------------------------------ */

function HorizontalTimeline({
  events,
  highlightTitle,
  callout,
}: {
  events: Event[];
  highlightTitle?: string;
  callout?: string;
}) {
  // Group consecutive events by era for the top pill rail. Each group spans
  // a number of columns equal to its event count, so the era pill rail
  // visually weights eras by how much happened in them.
  const eraGroups = useMemo(() => {
    const groups: { era: EraKey; count: number; startIndex: number }[] = [];
    for (let i = 0; i < events.length; i++) {
      const era = events[i]!.era;
      const last = groups[groups.length - 1];
      if (last && last.era === era) {
        last.count += 1;
      } else {
        groups.push({ era, count: 1, startIndex: i });
      }
    }
    return groups;
  }, [events]);

  const cols = `repeat(${events.length}, minmax(0, 1fr))`;
  const highlightIndex = events.findIndex((e) => e.title === highlightTitle);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ gap: 8, position: "relative" }}
    >
      {/* Row 1 — era pill rail */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: 4,
        }}
      >
        {eraGroups.map((g) => {
          const tone = ERA_TONES[g.era];
          return (
            <div
              key={`era-${g.startIndex}`}
              style={{
                gridColumn: `span ${g.count}`,
                background: tone.bg,
                color: tone.fg,
                border: `1px solid ${tone.line}33`,
                borderRadius: 999,
                padding: "3px 8px",
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.4,
              }}
              title={tone.label}
            >
              {tone.label}
            </div>
          );
        })}
      </div>

      {/* Row 2 — date pills above timeline spine + nodes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: 0,
          position: "relative",
          paddingTop: 4,
        }}
      >
        {events.map((event, i) => {
          const tone = ERA_TONES[event.era];
          return (
            <div
              key={`date-${i}`}
              style={{
                display: "flex",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  background: tone.bg,
                  color: tone.fg,
                  border: `1px solid ${tone.line}33`,
                  borderRadius: 8,
                  padding: "3px 7px",
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {event.date_label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Row 3 — spine + nodes */}
      <div
        style={{
          position: "relative",
          height: 18,
          display: "grid",
          gridTemplateColumns: cols,
          alignItems: "center",
        }}
      >
        {/* Spine line spans only between first and last node center */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: `calc((100% / ${events.length}) / 2)`,
            right: `calc((100% / ${events.length}) / 2)`,
            height: 2,
            background: BRAND.slate200,
            transform: "translateY(-1px)",
          }}
        />
        {events.map((event, i) => {
          const tone = ERA_TONES[event.era];
          const isHighlight = i === highlightIndex;
          const size = isHighlight ? 16 : 12;
          return (
            <div
              key={`node-${i}`}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: tone.line,
                  border: isHighlight
                    ? `3px solid ${BRAND.bgLilac}`
                    : `2px solid #fff`,
                  boxShadow: isHighlight
                    ? `0 0 0 2px ${BRAND.purps}`
                    : `0 0 0 1px ${tone.line}33`,
                  display: "block",
                }}
                title={event.title}
              />
            </div>
          );
        })}
      </div>

      {/* Row 4 — titles + metric chips */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: 4,
          minHeight: 0,
          flex: 1,
        }}
      >
        {events.map((event, i) => {
          const isHighlight = i === highlightIndex;
          return (
            <div
              key={`title-${i}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 4,
                padding: "0 4px",
                minWidth: 0,
              }}
            >
              {isHighlight && (
                <span
                  style={{
                    background: BRAND.bgLilac,
                    color: BRAND.purps,
                    fontSize: 8,
                    fontWeight: 900,
                    padding: "1px 6px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                  }}
                >
                  ★ Pivotal
                </span>
              )}
              <h3
                style={{
                  margin: 0,
                  color: BRAND.slate950,
                  fontSize: "clamp(10px, 1.05cqi, 12px)",
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  wordBreak: "break-word",
                  hyphens: "auto",
                }}
              >
                {toSentenceCase(event.title)}
              </h3>
              {event.metric_value && (
                <span
                  style={{
                    background: BRAND.bgCream,
                    border: `1px solid ${BRAND.slate100}`,
                    color: BRAND.slate950,
                    fontSize: 10,
                    fontWeight: 900,
                    padding: "1px 6px",
                    borderRadius: 999,
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                  title={
                    event.metric_label
                      ? `${event.metric_value} ${event.metric_label}`
                      : event.metric_value
                  }
                >
                  {event.metric_value}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {callout && (
        <div
          className="rounded-2xl"
          style={{
            background: BRAND.bgLilac,
            color: BRAND.purps,
            border: `1px solid ${BRAND.purpsSoft}`,
            padding: "8px 12px",
            fontSize: "clamp(10px, 1.1cqi, 12px)",
            fontWeight: 750,
            lineHeight: 1.3,
            textAlign: "center",
          }}
        >
          {toSentenceCase(callout)}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vertical layout (narrow widths + compact)                           */
/* ------------------------------------------------------------------ */

function VerticalTimeline({
  events,
  highlightTitle,
  compact,
  hideDescriptions,
  callout,
}: {
  events: Event[];
  highlightTitle?: string;
  compact: boolean;
  hideDescriptions: boolean;
  callout?: string;
}) {
  return (
    <>
      <ol
        className="relative min-h-0 flex-1"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: hideDescriptions ? 6 : 10,
        }}
      >
        {events.map((event, index) => {
          const tone = ERA_TONES[event.era];
          const isHighlight = highlightTitle === event.title;
          const isLast = index === events.length - 1;
          return (
            <li
              key={`${event.date_label}-${event.title}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: compact
                  ? "60px 1fr"
                  : "minmax(72px, 88px) 1fr",
                gap: compact ? 10 : 14,
                position: "relative",
                paddingBottom: isLast ? 0 : compact ? 2 : 4,
              }}
            >
              <div
                className="flex flex-col items-stretch"
                style={{ minWidth: 0, position: "relative" }}
              >
                <div
                  style={{
                    background: tone.bg,
                    color: tone.fg,
                    border: `1px solid ${tone.line}33`,
                    borderRadius: 10,
                    padding: compact ? "4px 6px" : "6px 8px",
                    fontWeight: 900,
                    fontSize: compact ? 11 : 13,
                    lineHeight: 1.05,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {event.date_label}
                </div>
                {!isLast && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: compact ? 26 : 32,
                      bottom: -6,
                      width: 2,
                      background: BRAND.slate100,
                      transform: "translateX(-1px)",
                    }}
                  />
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  style={{ rowGap: 4 }}
                >
                  <span
                    style={{
                      background: tone.bg,
                      color: tone.fg,
                      fontSize: compact ? 8 : 9,
                      fontWeight: 900,
                      padding: compact ? "1px 6px" : "2px 7px",
                      borderRadius: 999,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      lineHeight: 1.4,
                    }}
                  >
                    {tone.label}
                  </span>
                  {isHighlight && (
                    <span
                      style={{
                        background: BRAND.bgLilac,
                        color: BRAND.purps,
                        fontSize: compact ? 8 : 9,
                        fontWeight: 900,
                        padding: compact ? "1px 6px" : "2px 7px",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        lineHeight: 1.4,
                      }}
                    >
                      ★ Pivotal
                    </span>
                  )}
                  {event.metric_value && (
                    <span
                      className="inline-flex items-baseline gap-1"
                      style={{
                        background: BRAND.bgCream,
                        border: `1px solid ${BRAND.slate100}`,
                        color: BRAND.slate950,
                        fontSize: compact ? 10 : 11,
                        fontWeight: 900,
                        padding: compact ? "1px 7px" : "2px 8px",
                        borderRadius: 999,
                        lineHeight: 1.4,
                      }}
                    >
                      {event.metric_value}
                      {event.metric_label && (
                        <span
                          style={{
                            color: BRAND.slate700,
                            fontWeight: 700,
                            fontSize: compact ? 9 : 10,
                          }}
                        >
                          {event.metric_label}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <h3
                  style={{
                    margin: compact ? "3px 0 0" : "5px 0 0",
                    color: BRAND.slate950,
                    fontSize: compact ? 13 : "clamp(14px, 1.5cqi, 16px)",
                    fontWeight: 900,
                    lineHeight: 1.15,
                    letterSpacing: 0,
                  }}
                >
                  {toSentenceCase(event.title)}
                </h3>
                {!hideDescriptions && (
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: BRAND.slate700,
                      fontSize: "clamp(11px, 1.15cqi, 13px)",
                      fontWeight: 600,
                      lineHeight: 1.35,
                    }}
                  >
                    {toSentenceCase(event.description)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {!hideDescriptions && callout && (
        <div
          className="rounded-2xl"
          style={{
            background: BRAND.bgLilac,
            color: BRAND.purps,
            border: `1px solid ${BRAND.purpsSoft}`,
            padding: "9px 12px",
            fontSize: "clamp(11px, 1.15cqi, 13px)",
            fontWeight: 750,
            lineHeight: 1.3,
          }}
        >
          {toSentenceCase(callout)}
        </div>
      )}
    </>
  );
}
