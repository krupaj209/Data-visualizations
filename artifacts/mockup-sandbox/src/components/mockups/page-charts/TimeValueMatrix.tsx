import { TimeValueMatrixChart } from "@viz/components/charts/TimeValueMatrixChart";
import type { TimeValueMatrixSpec } from "@/lib/chart-spec";

const SPEC: TimeValueMatrixSpec = {
  type: "time_value_matrix",
  currency: "EUR",
  scenarios: [
    { id: "half_day_basic", label: "Half-day basic", accent: "slate", time_label: "~3 hrs", price_label: "€20" },
    { id: "skip_line_guided", label: "Skip-the-line guided", accent: "candy", time_label: "~4 hrs", price_label: "€69" },
    { id: "early_access", label: "Before-hours access", accent: "purps", time_label: "~5 hrs", price_label: "€115" },
    { id: "two_day_deep", label: "Two-day deep dive", accent: "okay", time_label: "2 days", price_label: "€140" },
  ],
  dimensions: [
    { label: "Headline coverage", scores: [55, 80, 90, 100] },
    { label: "Queue avoidance", scores: [20, 90, 100, 75] },
    { label: "Sistine without crowds", scores: [10, 40, 100, 50] },
    { label: "Value per €", scores: [85, 70, 45, 75] },
    { label: "Kid-friendliness", scores: [65, 55, 30, 80] },
  ],
  summary: {
    best_value_scenario: "skip_line_guided",
    headline: "Skip-the-line guided is the sweet spot for most adult visitors.",
  },
  insight: "If a quiet Sistine matters more than money, the before-hours ticket is the only scenario that delivers it.",
};

export function Preview() {
  return (
    <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <TimeValueMatrixChart spec={SPEC} context="Ticket scenarios compared" />
      </div>
    </div>
  );
}
