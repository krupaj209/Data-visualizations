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
  | "needs_review"
  | "approved"
  | "rejected";

export interface ChartFactReview {
  status: "approved" | "rejected" | "needs_review";
  reason?: string;
  claim_override?: string;
  value_override?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ChartFactBackingSource {
  kind: "drd" | "web" | "intel" | "estimate";
  label: string;
  detail?: string;
  url?: string;
  /**
   * "row" = matched specifically to this row's claim/value/path keywords.
   * "chart" = chart-level evidence shown as fallback when no row match was
   * found. Lets the UI flag which evidence is actually scoped to the claim.
   */
  scope: "row" | "chart";
}

/**
 * Lightweight shape of a CE intelligence fact, kept here to avoid pulling
 * the full server type into the frontend lib. Mirrors `IntelFact` from
 * `artifacts/api-server/src/lib/ce-intelligence.ts`.
 */
export interface ChartFactIntelFact {
  id: string;
  bucket?: string;
  value: string;
  quote?: string;
  source_url?: string;
}

export interface BuildChartFactRowsOptions {
  /**
   * Resolved CE intelligence facts the chart cited in
   * `provenance.intelligence_refs`. When provided, rows that share keywords
   * with a fact's value/quote get that fact directly listed in their
   * `backingSources`.
   */
  intelFacts?: ChartFactIntelFact[];
}

export interface ChartFactRow {
  id: string;
  /** Default claim text from the spec (writer overrides take precedence). */
  claim: string;
  /** Default value text from the spec (writer overrides take precedence). */
  value: string;
  /** Writer's overridden claim text, if any. */
  claimOverride?: string;
  /** Writer's overridden value text, if any. */
  valueOverride?: string;
  sourceLabel: string;
  sourceUrl?: string;
  confidence: number;
  /**
   * Status precedence: writer review (approved/rejected/needs_review) wins
   * over the auto-derived verifier/source status.
   */
  status: ChartFactStatus;
  /** True when the row's value came from the generator's estimate path. */
  estimated: boolean;
  /** Persisted writer decision, if any. */
  review?: ChartFactReview;
  /** Merged list of evidence backing this row (DRD, web, intel, estimate). */
  backingSources: ChartFactBackingSource[];
  path: string;
}

interface SourceContext {
  label: string;
  url?: string;
  confidence: number;
  status: ChartFactStatus;
}

function readFactReviews(
  provenance: ChartProvenanceLite | null | undefined,
): Record<string, ChartFactReview> {
  const map = (provenance as { fact_reviews?: unknown } | null | undefined)
    ?.fact_reviews;
  if (!map || typeof map !== "object" || Array.isArray(map)) return {};
  return map as Record<string, ChartFactReview>;
}

export function buildChartFactRows(
  spec: ChartSpec,
  provenance: ChartProvenanceLite | null | undefined,
  options: BuildChartFactRowsOptions = {},
): ChartFactRow[] {
  const context = sourceContext(provenance);
  const estimates = provenance?.estimates ?? [];
  const reviews = readFactReviews(provenance);

  const drdSnippets = (provenance?.drd_snippets ?? []).filter(Boolean);
  const webSources = (provenance?.web_sources ?? []).filter(
    (s) => s?.title || s?.url,
  );
  const intelRefs = new Set(provenance?.intelligence_refs ?? []);
  // Only consider intel facts that this chart actually cited.
  const citedIntel = (options.intelFacts ?? []).filter((f) =>
    intelRefs.has(f.id),
  );

  const allDrd: ChartFactBackingSource[] = drdSnippets.map((snippet) => ({
    kind: "drd",
    label: "Deep research doc",
    detail: snippet,
    scope: "chart",
  }));
  const allWeb: ChartFactBackingSource[] = webSources.map((source) => ({
    kind: "web",
    label: source.title || source.url || "Live source",
    url: source.url,
    scope: "chart",
  }));
  const allIntel: ChartFactBackingSource[] = citedIntel.map((fact) => ({
    kind: "intel",
    label: fact.value,
    detail: fact.quote || (fact.bucket ? `Bucket: ${fact.bucket}` : undefined),
    url: fact.source_url,
    scope: "chart",
  }));

  const withSource = (
    row: Pick<ChartFactRow, "id" | "claim" | "value" | "path">,
  ): ChartFactRow => {
    const estimate = estimates.find((item) => fieldMatchesPath(item.field, row.path));
    const isEstimated = Boolean(estimate);
    const baseStatus: ChartFactStatus = isEstimated ? "estimated" : context.status;
    const baseLabel = isEstimated ? "Generator estimate" : context.label;
    const baseUrl = isEstimated ? undefined : context.url;
    const baseConfidence = isEstimated
      ? Math.min(context.confidence, 55)
      : context.confidence;

    // Row-level keyword bag pulled from the claim text + value text + spec
    // path. Every chart-level evidence item is then scored against it; items
    // that share at least one keyword get promoted to row-scoped, the rest
    // stay as a chart-level fallback list so writers can always see the full
    // pool without leaving the row.
    const rowKeywords = extractKeywords(
      `${row.claim} ${row.value} ${row.path}`,
    );

    const matchedDrd = filterByKeywords(allDrd, rowKeywords, (item) => item.detail ?? "");
    const matchedWeb = filterByKeywords(
      allWeb,
      rowKeywords,
      (item) => `${item.label} ${item.url ?? ""}`,
    );
    const matchedIntel = filterByKeywords(
      allIntel,
      rowKeywords,
      (item) => `${item.label} ${item.detail ?? ""}`,
    );

    const matchedIds = new Set([
      ...matchedDrd.map((d) => d.detail),
      ...matchedWeb.map((w) => `${w.label}|${w.url ?? ""}`),
      ...matchedIntel.map((i) => i.label),
    ]);

    const remainingDrd = allDrd
      .filter((d) => !matchedIds.has(d.detail))
      .slice(0, 4);
    const remainingWeb = allWeb
      .filter((w) => !matchedIds.has(`${w.label}|${w.url ?? ""}`))
      .slice(0, 6);
    const remainingIntel = allIntel
      .filter((i) => !matchedIds.has(i.label))
      .slice(0, 6);

    const backing: ChartFactBackingSource[] = [
      ...matchedIntel.map((i) => ({ ...i, scope: "row" as const })),
      ...matchedDrd.map((d) => ({ ...d, scope: "row" as const })),
      ...matchedWeb.map((w) => ({ ...w, scope: "row" as const })),
      ...remainingIntel,
      ...remainingDrd,
      ...remainingWeb,
    ];
    if (estimate) {
      backing.unshift({
        kind: "estimate",
        label: estimate.field || "Estimated field",
        detail: estimate.reasoning || "Marked as estimated by the generator.",
        scope: "row",
      });
    }

    const review = reviews[row.id];
    const status: ChartFactStatus = review ? review.status : baseStatus;

    return {
      ...row,
      sourceLabel: baseLabel,
      sourceUrl: baseUrl,
      confidence: baseConfidence,
      status,
      estimated: isEstimated,
      review,
      claimOverride: review?.claim_override,
      valueOverride: review?.value_override,
      backingSources: backing,
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
    row: Pick<ChartFactRow, "id" | "claim" | "value" | "path">,
  ) => ChartFactRow,
): ChartFactRow[] {
  const entries = Object.entries(spec as unknown as Record<string, unknown>)
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

/* -------------------------------------------------------------------------- */
/* Row-scoped evidence matching                                                */
/* -------------------------------------------------------------------------- */

const STOPWORDS = new Set([
  "the","a","an","and","or","of","in","on","at","to","for","by","with","is",
  "it","its","that","this","be","are","was","were","as","from","but","not",
  "have","has","had","you","your","our","their","they","we","us","i","me",
  "do","does","did","so","if","then","than","also","very","more","most",
  "less","least","some","any","each","per","one","two","item","items","items",
  "set","not","null","true","false","yes","no","value","values","level",
  "score","note","notes","data","chart","claim","crowd","time","day","days",
  "month","months","hour","hours","week","weeks","year","years","section",
  "structured","tour","tours","ticket","tickets","metric","metrics","field",
]);

function extractKeywords(text: string): Set<string> {
  if (!text) return new Set();
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return new Set(tokens);
}

function filterByKeywords<T>(
  items: T[],
  rowKeywords: Set<string>,
  textOf: (item: T) => string,
): T[] {
  if (rowKeywords.size === 0) return [];
  return items.filter((item) => {
    const tokens = extractKeywords(textOf(item));
    for (const tok of tokens) {
      if (rowKeywords.has(tok)) return true;
    }
    return false;
  });
}
