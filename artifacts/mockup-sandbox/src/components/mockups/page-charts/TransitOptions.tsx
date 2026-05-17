import { TransitOptionsChart } from "@viz/components/charts/TransitOptionsChart";
import type { TransitOptionsSpec } from "@/lib/chart-spec";

const SPEC: TransitOptionsSpec = {
  type: "transit_options",
  origin_label: "Rome city centre",
  destination_label: "Vatican Museums",
  options: [
    {
      mode: "metro",
      label: "Line A → Ottaviano",
      minutes_min: 15,
      minutes_max: 25,
      cost_label: "€1.50 single",
      frequency_label: "Every 4–7 min",
      walk_min: 9,
      recommended: true,
      note: "Cheapest reliable option.",
    },
    {
      mode: "tram",
      label: "Tram 19 from Risorgimento",
      minutes_min: 20,
      minutes_max: 35,
      cost_label: "€1.50 single",
      frequency_label: "Every 10–15 min",
      walk_min: 8,
    },
    {
      mode: "bus",
      label: "Bus 40 / 64 to Borgo",
      minutes_min: 25,
      minutes_max: 45,
      cost_label: "€1.50 single",
      frequency_label: "Every 5–10 min",
      walk_min: 12,
      note: "Pickpocket-heavy — keep valuables zipped.",
    },
    {
      mode: "taxi",
      label: "Licensed taxi from Termini",
      minutes_min: 15,
      minutes_max: 30,
      cost_label: "€13–18",
      frequency_label: "On-demand",
      walk_min: 0,
    },
    {
      mode: "walk",
      label: "On foot from Piazza Navona",
      minutes_min: 25,
      minutes_max: 35,
      cost_label: "Free",
      walk_min: 0,
    },
  ],
  callout: "Metro Line A to Ottaviano wins on every axis except step-free comfort.",
};

export function Preview() {
  return (
    <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <TransitOptionsChart spec={SPEC} context="Rome → Vatican Museums" />
      </div>
    </div>
  );
}
