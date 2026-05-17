import { RulesChecklistChart } from "@viz/components/charts/RulesChecklistChart";
import type { RulesChecklistSpec } from "@/lib/chart-spec";

const SPEC: RulesChecklistSpec = {
  type: "rules_checklist",
  headline: "Vatican Museums house rules",
  items: [
    {
      label: "Shoulders & knees covered",
      severity: "required",
      category: "dress",
      note: "Strict at St. Peter's and the Sistine Chapel.",
    },
    { label: "Hat off inside the basilica", severity: "required", category: "dress" },
    { label: "Bag check at entry", severity: "required", category: "security" },
    {
      label: "Backpacks larger than 40×35×15 cm",
      severity: "prohibited",
      category: "items",
    },
    { label: "Tripods, selfie sticks & monopods", severity: "prohibited", category: "photography" },
    {
      label: "Photography in the Sistine Chapel",
      severity: "prohibited",
      category: "photography",
      note: "Strictly enforced.",
    },
    { label: "Quiet voices in the Sistine Chapel", severity: "required", category: "behavior" },
    { label: "Bottled water", severity: "allowed", category: "food" },
    { label: "Food & snacks inside galleries", severity: "prohibited", category: "food" },
    { label: "Small handbags", severity: "allowed", category: "items" },
  ],
  source_note: "From the Vatican Museums official visitor regulations.",
};

export function Preview() {
  return (
    <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <RulesChecklistChart spec={SPEC} context="Vatican Museums rules" />
      </div>
    </div>
  );
}
