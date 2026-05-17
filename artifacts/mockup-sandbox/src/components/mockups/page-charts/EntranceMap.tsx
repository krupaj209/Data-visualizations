import { EntranceMapChart } from "@viz/components/charts/EntranceMapChart";
import type { EntranceMapSpec } from "@/lib/chart-spec";

const SPEC: EntranceMapSpec = {
  type: "entrance_map",
  venue_label: "Vatican Museums",
  entrances: [
    {
      name: "Viale Vaticano (main)",
      status: "standard",
      wait_label: "60–120 min",
      best_for: ["walk-up tickets"],
      note: "Default queue at the official ticket office.",
    },
    {
      name: "Sant'Anna Gate (reserved)",
      status: "recommended",
      wait_label: "5–15 min",
      best_for: ["skip-the-line tickets", "early entry"],
      note: "Used by pre-booked timed-entry holders.",
    },
    {
      name: "Cancello Petriano",
      status: "groups",
      wait_label: "Tour-led",
      best_for: ["organised groups"],
    },
    {
      name: "Step-free entrance",
      status: "accessible",
      best_for: ["wheelchair users", "strollers"],
      note: "Ramp and lift access.",
    },
    { name: "Old service gate", status: "closed", note: "Staff-only." },
  ],
  callout:
    "Pre-book a timed slot and use Sant'Anna — biggest queue-saver at the Vatican.",
};

export function Preview() {
  return (
    <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <EntranceMapChart spec={SPEC} context="Vatican Museums entrances" />
      </div>
    </div>
  );
}
