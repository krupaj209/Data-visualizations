import type { ChartSpec } from "@/lib/chart-spec";
import type { ChartArchetypeId } from "@workspace/question-bank";

/**
 * Canonical sample chart specs used by the public Question Bank preview
 * button. One small, illustrative example per implemented archetype so
 * visitors can see what each chart type looks like without needing to
 * navigate to a real CE.
 *
 * Archetypes that don't have a sample here (long-tail / not-yet-curated)
 * gracefully fall back to a "preview coming soon" affordance in the UI.
 */
export const ARCHETYPE_SAMPLES: Partial<Record<ChartArchetypeId, ChartSpec>> = {
  weekly_pattern: {
    type: "weekly_pattern",
    days: [
      { day: "mon", level: "closed", score: 0, note: "Closed" },
      { day: "tue", level: "quietest", score: 30 },
      { day: "wed", level: "quiet", score: 45 },
      { day: "thu", level: "busy", score: 70 },
      { day: "fri", level: "busy", score: 75 },
      { day: "sat", level: "busiest", score: 95 },
      { day: "sun", level: "busy", score: 80 },
    ],
    day_notes: [{ label: "Mon closed", kind: "closed" }],
  },
  hourly_heatmap: {
    type: "hourly_heatmap",
    open_hour: 9,
    close_hour: 19,
    rows: (
      ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
    ).map((day, di) => ({
      day,
      closed: day === "mon",
      hours: Array.from({ length: 24 }, (_, h) => {
        if (day === "mon") return 0;
        if (h < 9 || h >= 19) return 0;
        const peak = 13 + (di % 2);
        const dist = Math.abs(h - peak);
        const dayBoost = di >= 4 ? 15 : 0;
        return Math.max(20, Math.min(100, 90 - dist * 12 + dayBoost));
      }),
    })),
    best_window: {
      label: "Quietest window",
      day: "tue",
      start_hour: 9,
      end_hour: 11,
    },
  },
  booking_window: {
    type: "booking_window",
    curve: [
      { days_before: 0, share: 6 },
      { days_before: 1, share: 9 },
      { days_before: 3, share: 12 },
      { days_before: 7, share: 18 },
      { days_before: 14, share: 22 },
      { days_before: 30, share: 16 },
      { days_before: 60, share: 10 },
      { days_before: 90, share: 7 },
    ],
    sweet_spot: {
      days_before_min: 7,
      days_before_max: 21,
      label: "Sweet spot · 1–3 weeks ahead",
    },
    sold_out_risk: {
      threshold_days: 3,
      message: "Saturdays sell out 3+ days out in peak season.",
    },
  },
  seasonal_curve: {
    type: "seasonal_curve",
    months: [
      { month: "jan", score: 30, status: "very_quiet" },
      { month: "feb", score: 32, status: "quiet" },
      { month: "mar", score: 55, status: "moderate", note: "Best balance" },
      { month: "apr", score: 70, status: "busy" },
      { month: "may", score: 82, status: "busy" },
      { month: "jun", score: 90, status: "peak" },
      { month: "jul", score: 95, status: "peak" },
      { month: "aug", score: 96, status: "peak", note: "Hottest, busiest" },
      { month: "sep", score: 78, status: "busy" },
      { month: "oct", score: 60, status: "moderate", note: "Best balance" },
      { month: "nov", score: 38, status: "quiet" },
      { month: "dec", score: 50, status: "moderate" },
    ],
    best_months: ["March", "October"],
    worst_months: ["August"],
  },
  stat_grid: {
    type: "stat_grid",
    stats: [
      { label: "Annual visitors", value: "1.7M", accent: "purps" },
      { label: "Avg. visit length", value: "85", unit: "min", accent: "candy" },
      { label: "Skip-the-line uptake", value: "82", unit: "%", accent: "okay" },
      { label: "Sat peak hour", value: "12:30", accent: "slate" },
    ],
  },
  ticket_ladder: {
    type: "ticket_ladder",
    currency: "EUR",
    tiers: [
      {
        name: "Standard",
        price: 16,
        includes: ["Same-day entry", "General queue"],
        recommended: false,
      },
      {
        name: "Skip-the-line",
        price: 26,
        includes: ["Priority lane", "Audio guide"],
        recommended: true,
        share: 62,
        wait_savings_min: 90,
      },
      {
        name: "Guided tour",
        price: 49,
        includes: ["Expert guide", "Skip-the-line", "Small group"],
        recommended: false,
      },
    ],
  },
  donut_breakdown: {
    type: "donut_breakdown",
    center_value: "62%",
    center_label: "skip-the-line",
    segments: [
      { label: "Skip-the-line", value: 62, accent: "purps" },
      { label: "Standard", value: 24, accent: "slate" },
      { label: "Guided tour", value: 14, accent: "candy" },
    ],
  },
  compare_zones: {
    type: "compare_zones",
    metric_label: "Average wait time",
    zones: [
      { name: "Main entrance", wait_min: 35, wait_max: 60, status: "long" },
      { name: "Group entrance", wait_min: 5, wait_max: 15, status: "short" },
      {
        name: "Reservation lane",
        wait_min: 0,
        wait_max: 5,
        status: "no_wait",
      },
    ],
  },
  queue_compare: {
    type: "queue_compare",
    venue_label: "Sample landmark entrance",
    shared_caption: "Peak season · midday",
    lanes: [
      {
        name: "Standard line",
        wait_label: "~60 min",
        tone: "candy",
        dots: 30,
      },
      {
        name: "Skip-the-line",
        wait_label: "~10 min",
        tone: "purps",
        dots: 8,
      },
      {
        name: "Guided group",
        wait_label: "~5 min",
        tone: "okay",
        dots: 4,
      },
    ],
  },
  duration_stat: {
    type: "duration_stat",
    headline: "Most visitors stay 60–90 minutes",
    scale_min: [
      { label: "30 min", minutes: 30 },
      { label: "60 min", minutes: 60 },
      { label: "90 min", minutes: 90 },
      { label: "2 hr", minutes: 120 },
    ],
    profiles: [
      { name: "Quick visit", icon: "stopwatch", range_min: 30, range_max: 45 },
      {
        name: "Most visitors",
        icon: "head",
        range_min: 60,
        range_max: 90,
        highlight: true,
      },
      { name: "Deep visit", icon: "bust", range_min: 90, range_max: 120 },
    ],
    tip: "Save the biggest gallery for last — crowds thin out near closing.",
  },
  conditions_calendar: {
    type: "conditions_calendar",
    metric: "snow_depth_cm",
    unit_label: "cm",
    metric_label: "Snow depth",
    months: [
      { month: "jan", value: 88, status: "optimal" },
      { month: "feb", value: 92, status: "optimal" },
      { month: "mar", value: 80, status: "optimal" },
      { month: "apr", value: 55, status: "fair" },
      { month: "may", value: 20, status: "poor" },
      { month: "jun", value: 5, status: "poor" },
      { month: "jul", value: 0, status: "poor" },
      { month: "aug", value: 0, status: "poor" },
      { month: "sep", value: 10, status: "poor" },
      { month: "oct", value: 35, status: "fair" },
      { month: "nov", value: 60, status: "fair" },
      { month: "dec", value: 82, status: "optimal" },
    ],
    reference_bands: [
      { label: "Optimal", min: 70, max: 100, tone: "optimal" },
      { label: "Fair", min: 40, max: 70, tone: "fair" },
      { label: "Poor", min: 0, max: 40, tone: "poor" },
    ],
    best_months: ["January", "February", "December"],
    worst_months: ["July", "August"],
  },
  price_curve: {
    type: "price_curve",
    currency: "EUR",
    base_label: "Avg. price",
    base_value: 220,
    points: [
      { month: "jan", index: 80 },
      { month: "feb", index: 78 },
      { month: "mar", index: 90 },
      { month: "apr", index: 105 },
      { month: "may", index: 120 },
      { month: "jun", index: 138 },
      { month: "jul", index: 150 },
      { month: "aug", index: 152 },
      { month: "sep", index: 118 },
      { month: "oct", index: 95 },
      { month: "nov", index: 82 },
      { month: "dec", index: 110 },
    ],
    cheapest_months: ["January", "February", "November"],
    priciest_months: ["July", "August"],
  },
};
