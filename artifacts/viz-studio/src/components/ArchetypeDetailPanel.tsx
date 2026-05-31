import { X, Check, Minus, Database, Zap, Info } from "lucide-react";
import { Component, type ReactNode } from "react";
import type { ChartArchetypeId } from "@workspace/question-bank";
import { ChartRenderer } from "@/components/charts";
import { CHART_TYPE_META } from "@/components/charts/meta";
import { ARCHETYPE_SAMPLES } from "@/lib/archetype-samples";
import { getArchetypeDataRequirements } from "@/lib/archetype-data-requirements";
import { BRAND } from "@/lib/brand";

/**
 * One-paragraph plain-language description of what each archetype answers
 * and why travelers care. Shown in the detail panel.
 */
const ARCHETYPE_TRAVELER_PITCH: Partial<Record<string, string>> = {
  weekly_pattern:
    "Travelers plan their visit days in advance and want to avoid the weekend crush. This chart answers the single most-googled question for any popular venue: which day is calmest? It takes the guesswork out of day selection and directly increases booking confidence.",
  hourly_heatmap:
    "Even on a busy day, most venues have pockets of quiet. The hourly heatmap surfaces the exact hour-and-day combination that minimises queues — the most actionable timing advice a CMS page can give. Visitors who see it convert at higher rates because they feel in control.",
  daily_pattern:
    "A single-day crowd curve answers the question travelers ask after they've committed to a date: 'What time should I arrive?' The shape of the curve — morning lull, midday peak, afternoon dip — drives first-session bookings and repeat-visit planning.",
  seasonal_curve:
    "Month-to-month crowd and weather variation is the primary reason visitors delay booking. Seeing a clear best-months window removes that friction and often lifts booking rates for shoulder-season visits.",
  booking_window:
    "Visitors are anxious about missing out. A booking-lead-time chart converts that anxiety into action by showing exactly how far ahead the venue fills up — making a compelling case for booking now rather than later.",
  entrance_lanes:
    "Queue anxiety is one of the top visitor pain points. Showing the exact wait difference between a standard lane and a skip-the-line lane — in a single glance — is the most persuasive argument for upgrading a ticket.",
  ticket_access_matrix:
    "When a venue has multiple ticket tiers, visitors struggle to understand what they're actually paying for. A side-by-side access matrix removes confusion and makes the recommended tier's value obvious without reading walls of copy.",
  duration_budget:
    "Visitors consistently underestimate how long they'll spend. A time-budget breakdown that shows the express route vs the deep-dive day sets expectations, reduces disappointment, and helps visitors choose the right ticket tier for their schedule.",
  rules_checklist:
    "Practical barriers — bag restrictions, dress codes, security screening — are the #1 source of negative surprise reviews. Surfacing rules before arrival prevents bad experiences and builds trust that Headout did the homework.",
  transit_options:
    "Getting there is the first micro-anxiety in a visitor's journey. A clean transit comparison (metro 12 min €1.50 vs taxi 20 min €15) answers the logistics question in seconds and keeps visitors focused on booking.",
  landmark_coverage:
    "On hop-on-hop-off or multi-route products, visitors can't tell which route covers the landmarks they actually care about. A coverage matrix resolves this comparison instantly and drives upgrades to fuller-coverage routes.",
  itinerary_flow:
    "Tour buyers want to feel the rhythm of the experience before they commit. A stop-by-stop timeline makes the itinerary tangible — how long at the Louvre, how long in transit — and substantially lifts tour-product conversion.",
  best_for_matrix:
    "When a product suits multiple audiences, a single description can't speak to all of them. The best-for matrix lets each audience (families, solo, photographers) find the version built for them — boosting relevance and reducing refunds.",
  season_weather_fit:
    "For outdoor or weather-dependent experiences, visitors need more than 'best in summer.' A dimension × month heatmap shows exactly why March is better than June for this activity — temperature, rainfall, crowds, operator availability — making the case for off-peak booking.",
  accessibility_guide:
    "Visitors with accessibility needs do more research than any other segment and abandon pages that don't answer their questions. A structured accessibility chart signals that Headout has done the homework, building trust and completing bookings that would otherwise be lost.",
  floor_plan_flow:
    "Large museums and venues overwhelm first-timers. A room-by-room recommended flow reduces decision fatigue and helps visitors feel confident they won't miss the highlights — a direct driver of positive review sentiment.",
  entrance_map:
    "Multi-entrance venues are confusing on arrival. A map of which gate to use — and why — prevents the frustration of queuing at the wrong door and is especially valuable for reserved-access ticket holders.",
  highlight_rank:
    "Every visitor wants to see the must-sees before their time runs out. A ranked list of highlights with priority scores gives them a clear 'top 3 to prioritise' even if they only have an hour — reducing regret and improving satisfaction scores.",
  history_timeline:
    "Context transforms a visit from sightseeing to storytelling. A timeline from founding to today gives visitors the 'why this place matters' before they arrive — a proven driver of deeper engagement and longer dwell time.",
  time_split:
    "Tour and day-trip buyers need to know how their time is actually divided — transit vs at-site vs optional extras. A time split removes the most common complaint ('I didn't realise we'd spend 40 minutes on the bus') and sets accurate expectations.",
  slot_compare:
    "When the same experience is available at different times of day (sunrise vs midday vs sunset), visitors genuinely don't know which to choose. A side-by-side slot comparison on the dimensions they care about — crowds, light, queues — resolves that uncertainty and drives higher-value bookings.",
  daily_programme:
    "Venues with timed shows or feeding sessions have a hidden conversion driver: visitors who plan around the events stay longer and spend more. Surfacing the programme before booking turns an incidental visit into a purposeful experience.",
  sighting_probability:
    "Wildlife and nature experiences carry inherent uncertainty. A monthly sighting probability chart converts that uncertainty into honest, evidence-backed expectations — building trust and helping visitors choose the right month for their trip.",
  departure_reliability:
    "For experiences that depend on weather (hot-air balloons, skydiving), cancellation risk is the primary objection to booking. Showing monthly departure reliability data quantifies the risk and helps visitors book in the reliable season.",
  price_curve:
    "Dynamic pricing creates anxiety: 'Is this the right time to buy?' A month-by-month price index answers that question directly, making the case for booking in the off-season and surfacing the cheapest window.",
  savings_breakdown:
    "City card and combo products are perceived as risky ('will I actually visit all those attractions?'). A savings breakdown that shows the standalone price of each included attraction makes the value tangible and accelerates the purchase decision.",
  time_value_matrix:
    "Higher-tier tickets (full-day, skip-the-line, guided) face the objection 'is the upgrade worth it for me?' A time-value matrix that scores each scenario on time, cost, depth, and flexibility lets each visitor self-select their best option.",
  golden_hour_match:
    "Photography-focused visitors plan their entire day around the light. A golden-hour alignment matrix by month and departure slot is the one chart that converts photography-tour doubters into bookers.",
  stat_grid:
    "Headline stats — annual visitors, average visit length, skip-the-line adoption — establish credibility and scale at a glance. They're especially effective on the top of listing pages where scanners haven't yet committed to reading.",
  compare_zones:
    "Multi-zone venues (museums with popular galleries vs quieter wings, theme parks with different lands) create anxiety about where to go first. A zone comparison on wait times turns that anxiety into a clear action plan.",
  conditions_calendar:
    "Snow, swell, and visibility conditions are what drive the value of skiing, diving, and surfing products. A monthly conditions calendar is the one chart that converts a researcher into a booker — they can see at a glance whether their travel dates fall in a good window.",
  optimal_departure:
    "For cruises and helicopter tours, the departure slot materially affects the experience (light, weather, crowd). A visual comparison of slots across key dimensions makes the premium-slot upsell obvious and justified.",
  stop_frequency:
    "Hop-on-hop-off visitors are anxious about getting stranded at a stop. Showing peak and off-peak headways per stop reduces that anxiety and makes visitors more likely to actually hop off — improving the experience and review sentiment.",
};

interface PlanItem {
  question: string;
  archetype: string;
  why_it_matters?: string;
  data_needed?: string[];
  evidence_refs?: string[];
  quality_score?: {
    overall?: number;
    label?: string;
    rationale?: string;
  };
  mandatory?: boolean;
  /** Assembler signals that caused this archetype to fire. */
  triggering_signals?: string[];
  /** Assembler bundle score for the matched slot. */
  bundle_score?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: PlanItem;
  /** Called when writer keeps the chart (checked). */
  onKeep?: () => void;
  /** Called when writer removes the chart (unchecked). */
  onRemove?: () => void;
  /** Whether the chart is currently selected/checked. */
  isSelected: boolean;
  /** Whether the chart is mandatory (locked). */
  mandatory?: boolean;
}

class ChartErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function SignalChip({ signal }: { signal: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        borderRadius: 999,
        padding: "2px 8px",
        background: BRAND.purpsSoft,
        color: BRAND.purps,
        fontSize: 10,
        fontWeight: 750,
        fontFamily: "monospace",
      }}
    >
      {signal}
    </span>
  );
}

export function ArchetypeDetailPanel({
  open,
  onClose,
  item,
  onKeep,
  onRemove,
  isSelected,
  mandatory = false,
}: Props) {
  if (!open) return null;

  const meta = CHART_TYPE_META[item.archetype as keyof typeof CHART_TYPE_META] ?? {
    label: item.archetype,
    emoji: "📊",
  };
  const sample = ARCHETYPE_SAMPLES[item.archetype as ChartArchetypeId] ?? null;
  const pitch =
    ARCHETYPE_TRAVELER_PITCH[item.archetype] ??
    `This chart directly answers a question travelers have when choosing a time or ticket for ${item.archetype.replace(/_/g, " ")}.`;
  const dataReqs = getArchetypeDataRequirements(item.archetype);

  return (
    <>
      <div
        role="presentation"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 16, 35, 0.45)",
          zIndex: 80,
        }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={`${meta.label} detail`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 96vw)",
          background: "white",
          zIndex: 81,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 40px rgba(15, 23, 42, 0.18)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "18px 20px 14px",
            borderBottom: `1px solid ${BRAND.slate100}`,
            gap: 12,
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 1,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 22 }}>{meta.emoji}</span>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  color: BRAND.slate950,
                }}
              >
                {meta.label}
              </span>
              {mandatory && (
                <span
                  style={{
                    borderRadius: 999,
                    padding: "2px 8px",
                    background: BRAND.purpsSoft,
                    color: BRAND.purps,
                    fontSize: 10,
                    fontWeight: 850,
                  }}
                >
                  Always included
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: 13,
                color: BRAND.slate700,
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {item.question}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: BRAND.slate500,
              padding: 4,
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "20px 20px 0" }}>
          {/* Chart preview */}
          <div
            style={{
              border: `1px solid ${BRAND.slate200}`,
              borderRadius: 12,
              overflow: "hidden",
              background: BRAND.slate50,
              marginBottom: 20,
              minHeight: 220,
            }}
          >
            {sample ? (
              <ChartErrorBoundary
                fallback={
                  <div
                    style={{
                      minHeight: 220,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: BRAND.slate500,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Preview unavailable
                  </div>
                }
              >
                <ChartRenderer
                  spec={sample}
                  header={{
                    title: meta.label,
                    subtitle: "Example data",
                    question: meta.label,
                  }}
                />
              </ChartErrorBoundary>
            ) : (
              <div
                style={{
                  minHeight: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: BRAND.slate500,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                Preview coming soon — generate the chart to see the real version.
              </div>
            )}
          </div>

          {/* Why travelers care */}
          <Section icon={<Info size={13} />} title="What this chart answers">
            <p
              style={{
                fontSize: 13,
                color: BRAND.slate700,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {pitch}
            </p>
          </Section>

          {/* What data this needs */}
          <Section icon={<Database size={13} />} title="What data this needs">
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                display: "grid",
                gap: 4,
              }}
            >
              {dataReqs.map((req, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 12,
                    color: BRAND.slate700,
                    lineHeight: 1.5,
                  }}
                >
                  {req}
                </li>
              ))}
            </ul>
          </Section>

          {/* Why it was selected for this CE */}
          {(item.why_it_matters ??
            item.quality_score?.rationale ??
            (item.evidence_refs && item.evidence_refs.length > 0)) && (
            <Section icon={<Zap size={13} />} title="Why selected for this CE">
              {item.why_it_matters && (
                <p
                  style={{
                    fontSize: 13,
                    color: BRAND.slate700,
                    lineHeight: 1.55,
                    margin: "0 0 8px",
                  }}
                >
                  {item.why_it_matters}
                </p>
              )}
              {item.quality_score?.rationale &&
                item.quality_score.rationale !== item.why_it_matters && (
                  <p
                    style={{
                      fontSize: 12,
                      color: BRAND.slate500,
                      lineHeight: 1.5,
                      margin: "0 0 8px",
                      fontStyle: "italic",
                    }}
                  >
                    {item.quality_score.rationale}
                  </p>
                )}
              {item.evidence_refs && item.evidence_refs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {item.evidence_refs.map((ref, i) => (
                    <SignalChip key={i} signal={ref} />
                  ))}
                </div>
              )}
              {item.triggering_signals && item.triggering_signals.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 850,
                      color: BRAND.slate500,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      marginBottom: 4,
                    }}
                  >
                    Matched signals
                    {typeof item.bundle_score === "number" && (
                      <span
                        style={{
                          marginLeft: 6,
                          background: BRAND.purpsSoft,
                          color: BRAND.purps,
                          borderRadius: 4,
                          padding: "1px 5px",
                          fontWeight: 750,
                          fontSize: 9,
                          verticalAlign: "middle",
                        }}
                      >
                        score {item.bundle_score}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {item.triggering_signals.map((sig, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          borderRadius: 999,
                          padding: "2px 8px",
                          background: BRAND.bgMint,
                          color: BRAND.okayInk,
                          fontSize: 10,
                          fontWeight: 750,
                          fontFamily: "monospace",
                        }}
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {item.data_needed && item.data_needed.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 850,
                      color: BRAND.slate500,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      marginBottom: 4,
                    }}
                  >
                    Planner notes
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      display: "grid",
                      gap: 3,
                    }}
                  >
                    {item.data_needed.map((d, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 12,
                          color: BRAND.slate700,
                          lineHeight: 1.45,
                        }}
                      >
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          <div style={{ height: 100 }} />
        </div>

        {/* Footer actions */}
        {!mandatory && (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: "white",
              borderTop: `1px solid ${BRAND.slate100}`,
              padding: "14px 20px",
              display: "flex",
              gap: 10,
            }}
          >
            {isSelected ? (
              <button
                type="button"
                onClick={() => {
                  onRemove?.();
                  onClose();
                }}
                style={{
                  flex: 1,
                  border: `1px solid ${BRAND.slate200}`,
                  borderRadius: 10,
                  padding: "9px 14px",
                  background: "white",
                  color: BRAND.slate700,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                }}
              >
                <Minus size={14} />
                Remove this chart
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onKeep?.();
                  onClose();
                }}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 16px",
                  background: BRAND.purps,
                  color: "white",
                  fontSize: 13,
                  fontWeight: 850,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                }}
              >
                <Check size={14} />
                Keep this chart
              </button>
            )}
            {isSelected && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 16px",
                  background: BRAND.purps,
                  color: "white",
                  fontSize: 13,
                  fontWeight: 850,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                }}
              >
                <Check size={14} />
                Keep this chart
              </button>
            )}
          </div>
        )}
        {mandatory && (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: "white",
              borderTop: `1px solid ${BRAND.slate100}`,
              padding: "14px 20px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 10,
                padding: "9px 16px",
                background: BRAND.purps,
                color: "white",
                fontSize: 13,
                fontWeight: 850,
                cursor: "pointer",
              }}
            >
              Got it — always included
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <span style={{ color: BRAND.purps, display: "flex" }}>{icon}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 850,
            color: BRAND.slate950,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
