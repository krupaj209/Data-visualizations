import {
  DAY_FULL,
  MONTH_LABELS,
  type ChartProvenanceLite,
  type ChartSpec,
} from "./chart-spec";

export type ChartFactStatus =
  | "verified"
  | "source_backed"
  | "estimated"
  | "needs_review";

export interface ChartFactRow {
  id: string;
  claim: string;
  value: string;
  sourceLabel: string;
  sourceUrl?: string;
  confidence: number;
  status: ChartFactStatus;
  path: string;
}

interface SourceContext {
  label: string;
  url?: string;
  confidence: number;
  status: ChartFactStatus;
}

export function buildChartFactRows(
  spec: ChartSpec,
  provenance: ChartProvenanceLite | null | undefined,
): ChartFactRow[] {
  const context = sourceContext(provenance);
  const estimates = provenance?.estimates ?? [];

  const withSource = (
    row: Omit<ChartFactRow, "sourceLabel" | "sourceUrl" | "confidence" | "status">,
  ): ChartFactRow => {
    const estimate = estimates.find((item) => fieldMatchesPath(item.field, row.path));
    if (estimate) {
      return {
        ...row,
        sourceLabel: "Generator estimate",
        confidence: Math.min(context.confidence, 55),
        status: "estimated",
      };
    }
    return {
      ...row,
      sourceLabel: context.label,
      sourceUrl: context.url,
      confidence: context.confidence,
      status: context.status,
    };
  };

  switch (spec.type) {
    case "weekly_pattern":
      return spec.days.map((day, index) =>
        withSource({
          id: `weekly-${day.day}`,
          claim: `${DAY_FULL[day.day]} crowd level`,
          value: `${day.score}/100 · ${day.level}${day.note ? ` · ${day.note}` : ""}`,
          path: `days[${index}]`,
        }),
      );

    case "hourly_heatmap":
      return [
        withSource({
          id: "hourly-hours",
          claim: "Opening window used by the heatmap",
          value: `${formatHour(spec.open_hour)}-${formatHour(spec.close_hour)}`,
          path: "open_hour",
        }),
        ...(spec.best_window
          ? [
              withSource({
                id: "hourly-best-window",
                claim: "Best visit window",
                value: `${spec.best_window.label}: ${DAY_FULL[spec.best_window.day]} ${formatHour(
                  spec.best_window.start_hour,
                )}-${formatHour(spec.best_window.end_hour)}`,
                path: "best_window",
              }),
            ]
          : []),
        ...spec.rows.slice(0, 7).map((row, index) =>
          withSource({
            id: `hourly-${row.day}`,
            claim: `${DAY_FULL[row.day]} hourly intensity`,
            value: row.closed ? "Closed" : summarizeNumbers(row.hours, "/100"),
            path: `rows[${index}].hours`,
          }),
        ),
      ];

    case "month_calendar":
      return [
        withSource({
          id: "calendar-start",
          claim: "Calendar start date",
          value: spec.start_date,
          path: "start_date",
        }),
        ...spec.recommended_dates.map((item, index) =>
          withSource({
            id: `calendar-rec-${index}`,
            claim: `Recommended date: ${item.date}`,
            value: item.reason,
            path: `recommended_dates[${index}]`,
          }),
        ),
      ];

    case "booking_window":
      return [
        withSource({
          id: "booking-sweet-spot",
          claim: "Recommended booking window",
          value: `${spec.sweet_spot.days_before_min}-${spec.sweet_spot.days_before_max} days before · ${spec.sweet_spot.label}`,
          path: "sweet_spot",
        }),
        ...(spec.sold_out_risk
          ? [
              withSource({
                id: "booking-risk",
                claim: "Sold-out risk threshold",
                value: `${spec.sold_out_risk.threshold_days} days · ${spec.sold_out_risk.message}`,
                path: "sold_out_risk",
              }),
            ]
          : []),
        ...spec.curve.map((point, index) =>
          withSource({
            id: `booking-${index}`,
            claim: `Bookings ${point.days_before} days before visit`,
            value: `${point.share}% share`,
            path: `curve[${index}].share`,
          }),
        ),
      ];

    case "stat_grid":
      return spec.stats.map((stat, index) =>
        withSource({
          id: `stat-${index}`,
          claim: stat.label,
          value: `${stat.value}${stat.unit ? ` ${stat.unit}` : ""}${stat.delta ? ` · ${stat.delta}` : ""}`,
          path: `stats[${index}]`,
        }),
      );

    case "compare_zones":
      return spec.zones.map((zone, index) =>
        withSource({
          id: `zone-${index}`,
          claim: `${zone.name} ${spec.metric_label}`,
          value: `${zone.wait_min}-${zone.wait_max} min · ${zone.status}${
            zone.share_of_visitors ? ` · ${zone.share_of_visitors}% visitors` : ""
          }`,
          path: `zones[${index}]`,
        }),
      );

    case "donut_breakdown":
      return spec.segments.map((segment, index) =>
        withSource({
          id: `donut-${index}`,
          claim: segment.label,
          value: `${segment.value}%`,
          path: `segments[${index}].value`,
        }),
      );

    case "seasonal_curve":
      return [
        withSource({
          id: "seasonal-best",
          claim: "Best months",
          value: spec.best_months.join(", "),
          path: "best_months",
        }),
        withSource({
          id: "seasonal-worst",
          claim: "Worst months",
          value: spec.worst_months.join(", "),
          path: "worst_months",
        }),
        ...spec.months.map((month, index) =>
          withSource({
            id: `seasonal-${month.month}`,
            claim: `${MONTH_LABELS[month.month]} seasonal score`,
            value: `${month.score}/100 · ${month.status}${month.note ? ` · ${month.note}` : ""}`,
            path: `months[${index}]`,
          }),
        ),
      ];

    case "ticket_ladder":
      return spec.tiers.map((tier, index) =>
        withSource({
          id: `tier-${index}`,
          claim: `${tier.name} ticket`,
          value: `${spec.currency}${tier.price} · ${tier.includes.join(", ")}${
            tier.share ? ` · ${tier.share}% bookings` : ""
          }`,
          path: `tiers[${index}]`,
        }),
      );

    case "daily_pattern":
      return [
        ...spec.zones.map((zone, index) =>
          withSource({
            id: `daily-zone-${index}`,
            claim: `${zone.label} time window`,
            value: `${zone.start}-${zone.end} · ${zone.tone}`,
            path: `zones[${index}]`,
          }),
        ),
        ...spec.points.map((point, index) =>
          withSource({
            id: `daily-point-${index}`,
            claim: `${point.time} crowd level`,
            value: `${point.crowd}/10`,
            path: `points[${index}].crowd`,
          }),
        ),
      ];

    case "tribune_density":
      return [
        withSource({
          id: "tribune-scope",
          claim: "Density scope",
          value: `${spec.scope} · ${spec.y_label}`,
          path: "scope",
        }),
        ...spec.context_pills.map((pill, index) =>
          withSource({
            id: `tribune-pill-${index}`,
            claim: pill.title,
            value: pill.subtitle,
            path: `context_pills[${index}]`,
          }),
        ),
        ...spec.points.map((point, index) =>
          withSource({
            id: `tribune-point-${index}`,
            claim: `${point.time} density`,
            value: `${point.density}/10`,
            path: `points[${index}].density`,
          }),
        ),
      ];

    case "duration_profiles":
    case "duration_stat":
      return [
        withSource({
          id: "duration-headline",
          claim: "Duration headline",
          value: spec.headline,
          path: "headline",
        }),
        ...spec.profiles.map((profile, index) =>
          withSource({
            id: `duration-${index}`,
            claim: `${profile.name} visit duration`,
            value: `${profile.range_min}-${profile.range_max} min${profile.note ? ` · ${profile.note}` : ""}`,
            path: `profiles[${index}]`,
          }),
        ),
      ];

    case "entrance_lanes":
    case "queue_compare":
      return spec.lanes.map((lane, index) =>
        withSource({
          id: `lane-${index}`,
          claim: `${lane.name} lane wait`,
          value: `${lane.wait_label}${lane.wait_peak ? ` · peak ${lane.wait_peak}` : ""}${
            lane.wait_off_peak ? ` · off-peak ${lane.wait_off_peak}` : ""
          }`,
          path: `lanes[${index}]`,
        }),
      );

    case "co_bookings":
      return spec.items.map((item, index) =>
        withSource({
          id: `pair-${index}`,
          claim: `${item.name} pairing rate`,
          value: `${item.share}%${item.badge ? ` · ${item.badge}` : ""}`,
          path: `items[${index}]`,
        }),
      );

    case "zone_crowd_heatmap":
    case "zone_wait_heatmap":
      return spec.zones.map((zone, index) =>
        withSource({
          id: `heatmap-zone-${index}`,
          claim: `${zone.name} hourly profile`,
          value: summarizeNumbers(zone.hours, spec.type === "zone_wait_heatmap" ? ` ${spec.unit}` : "/100"),
          path: `zones[${index}].hours`,
        }),
      );

    case "route_profile":
      return [
        withSource({
          id: "route-summary",
          claim: `${spec.route_label} route summary`,
          value: [
            spec.mode,
            spec.distance_km ? `${spec.distance_km} km` : "",
            spec.total_duration_min ? `${spec.total_duration_min} min` : "",
            spec.headline_metric ?? "",
          ]
            .filter(Boolean)
            .join(" · "),
          path: "route_label",
        }),
        ...spec.stops.map((stop, index) =>
          withSource({
            id: `route-stop-${index}`,
            claim: `${stop.name} route point`,
            value: [
              stop.kind,
              stop.duration_from_start_min !== undefined
                ? `${stop.duration_from_start_min} min from start`
                : "",
              stop.landmark_count !== undefined
                ? `${stop.landmark_count} landmarks`
                : "",
              stop.note ?? "",
            ]
              .filter(Boolean)
              .join(" · "),
            path: `stops[${index}]`,
          }),
        ),
      ];

    case "history_timeline":
      return [
        withSource({
          id: "history-span",
          claim: "Timeline span",
          value: spec.span_label,
          path: "span_label",
        }),
        ...spec.events.map((event, index) =>
          withSource({
            id: `history-${index}`,
            claim: `${event.date_label}: ${event.title}`,
            value: `${event.era} · ${event.description}${
              event.metric_label || event.metric_value
                ? ` · ${[event.metric_label, event.metric_value].filter(Boolean).join(": ")}`
                : ""
            }`,
            path: `events[${index}]`,
          }),
        ),
      ];

    case "daily_programme":
      return [
        withSource({
          id: "programme-hours",
          claim: "Programme operating window",
          value: `${spec.open_time}-${spec.close_time}`,
          path: "open_time",
        }),
        ...spec.events.map((event, index) =>
          withSource({
            id: `programme-${index}`,
            claim: event.name,
            value: `${event.start_time} · ${event.duration_min} min · ${event.location} · popularity ${event.popularity}/100`,
            path: `events[${index}]`,
          }),
        ),
      ];

    case "time_split":
      return [
        withSource({
          id: "time-total",
          claim: "Total time budget",
          value: `${spec.total_min} min${spec.total_label ? ` · ${spec.total_label}` : ""}`,
          path: "total_min",
        }),
        ...spec.segments.map((segment, index) =>
          withSource({
            id: `time-segment-${index}`,
            claim: segment.label,
            value: `${segment.minutes} min${segment.note ? ` · ${segment.note}` : ""}`,
            path: `segments[${index}]`,
          }),
        ),
      ];

    case "slot_compare":
      return [
        ...spec.slots.map((slot, index) =>
          withSource({
            id: `slot-${index}`,
            claim: `${slot.name} slot`,
            value: `${slot.time_window ?? "No time window"}${
              slot.recommended ? " · recommended" : ""
            }`,
            path: `slots[${index}]`,
          }),
        ),
        ...spec.dimensions.map((dimension, index) =>
          withSource({
            id: `slot-dimension-${index}`,
            claim: `${dimension.label} scores`,
            value: dimension.scores.join(", "),
            path: `dimensions[${index}].scores`,
          }),
        ),
      ];

    default:
      return genericFactRows(spec, withSource);
  }
}

function sourceContext(
  provenance: ChartProvenanceLite | null | undefined,
): SourceContext {
  const firstSource = provenance?.web_sources?.find((source) => source.url || source.title);
  const hasIssues = /issue\(s\)|failed/i.test(provenance?.verifier_notes ?? "");
  const verifierOk = /verifier:\s*ok/i.test(provenance?.verifier_notes ?? "");

  if (hasIssues) {
    return {
      label: "Verifier flagged",
      confidence: 45,
      status: "needs_review",
    };
  }
  if (provenance?.status === "drd_grounded") {
    return {
      label: "Deep research doc",
      confidence: 90,
      status: verifierOk ? "verified" : "source_backed",
    };
  }
  if (provenance?.status === "web_grounded") {
    return {
      label: firstSource?.title || "Live source / CE Intel",
      url: firstSource?.url,
      confidence: 80,
      status: verifierOk ? "verified" : "source_backed",
    };
  }
  if ((provenance?.intelligence_refs?.length ?? 0) > 0) {
    return {
      label: "CE Intel fact",
      confidence: 78,
      status: "source_backed",
    };
  }
  if (firstSource) {
    return {
      label: firstSource.title || "Live source",
      url: firstSource.url,
      confidence: 75,
      status: "source_backed",
    };
  }
  return {
    label: "Generator estimate",
    confidence: 50,
    status: "estimated",
  };
}

function fieldMatchesPath(field: string | undefined, path: string): boolean {
  if (!field) return false;
  const cleanedField = field.replace(/^spec\./, "").toLowerCase();
  const cleanedPath = path.toLowerCase();
  return cleanedField.includes(cleanedPath) || cleanedPath.includes(cleanedField);
}

function summarizeNumbers(values: number[], suffix: string): string {
  if (values.length === 0) return "No values";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return `min ${min}${suffix} · avg ${avg}${suffix} · max ${max}${suffix}`;
}

function formatHour(hour: number): string {
  const safe = Number.isFinite(hour) ? hour : 0;
  const suffix = safe >= 12 ? "pm" : "am";
  const display = safe % 12 === 0 ? 12 : safe % 12;
  return `${display}${suffix}`;
}

function genericFactRows(
  spec: ChartSpec,
  withSource: (
    row: Omit<ChartFactRow, "sourceLabel" | "sourceUrl" | "confidence" | "status">,
  ) => ChartFactRow,
): ChartFactRow[] {
  const entries = Object.entries(spec as Record<string, unknown>)
    .filter(([key]) => key !== "type")
    .slice(0, 10);

  return entries.map(([key, value]) =>
    withSource({
      id: `generic-${key}`,
      claim: humanizeKey(key),
      value: summarizeUnknown(value),
      path: key,
    }),
  );
}

function summarizeUnknown(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object" && value !== null) return "Structured value";
  if (value === undefined || value === null) return "Not set";
  return String(value);
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
