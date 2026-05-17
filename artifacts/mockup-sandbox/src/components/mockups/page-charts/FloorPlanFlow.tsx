import { FloorPlanFlowChart } from "@viz/components/charts/FloorPlanFlowChart";
import type { FloorPlanFlowSpec } from "@/lib/chart-spec";

const SPEC: FloorPlanFlowSpec = {
  type: "floor_plan_flow",
  start_label: "Sant'Anna entrance",
  total_min: 240,
  stops: [
    { name: "Sant'Anna entrance & ticket pickup", kind: "start", dwell_min: 10 },
    {
      name: "Pinacoteca picture gallery",
      level: "Wing IV",
      kind: "stop",
      dwell_min: 45,
      note: "Da Vinci's St. Jerome, Raphael's Transfiguration.",
    },
    { name: "Egyptian & Etruscan rooms", level: "Lower level", kind: "stop", dwell_min: 30 },
    {
      name: "Pio-Clementine sculpture wing",
      level: "Wing I",
      kind: "stop",
      dwell_min: 30,
      note: "Laocoön and the Apollo Belvedere.",
    },
    { name: "Gallery of Maps & Tapestries", kind: "stop", dwell_min: 25 },
    { name: "Raphael Rooms", kind: "highlight", dwell_min: 30, note: "School of Athens." },
    { name: "Sistine Chapel", kind: "highlight", dwell_min: 30, note: "Michelangelo's ceiling." },
    { name: "Exit via St. Peter's shortcut", kind: "end", dwell_min: 5 },
  ],
  callout: "Walk against the crowd: cover the Pinacoteca first.",
};

export function Preview() {
  return (
    <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <FloorPlanFlowChart spec={SPEC} context="Vatican Museums route" />
      </div>
    </div>
  );
}
