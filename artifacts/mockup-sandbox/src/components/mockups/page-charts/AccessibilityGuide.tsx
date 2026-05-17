import { AccessibilityGuideChart } from "@viz/components/charts/AccessibilityGuideChart";
import type { AccessibilityGuideSpec } from "@/lib/chart-spec";

const SPEC: AccessibilityGuideSpec = {
  type: "accessibility_guide",
  headline: "Accessibility at the Vatican Museums",
  features: [
    {
      label: "Step-free access to all main galleries",
      category: "mobility",
      availability: "full",
      detail: "Lifts serve every floor on the standard visit route.",
    },
    {
      label: "Manual wheelchair loan",
      category: "mobility",
      availability: "on_request",
      detail: "Free at the Sant'Anna entrance.",
    },
    {
      label: "Step-free access to the Sistine Chapel",
      category: "mobility",
      availability: "partial",
      detail: "Last 12 steps require staff assistance via the side lift.",
    },
    {
      label: "Audio guide with descriptive narration",
      category: "sensory",
      availability: "full",
    },
    {
      label: "Sign-language guided tours",
      category: "sensory",
      availability: "on_request",
      detail: "Pre-book at least 7 days ahead.",
    },
    {
      label: "Sensory-friendly visit slots",
      category: "cognitive",
      availability: "on_request",
    },
    {
      label: "Companion ticket (free)",
      category: "services",
      availability: "full",
      detail: "One free entry for the carer of a disabled visitor.",
    },
    { label: "Accessible toilets on every level", category: "facilities", availability: "full" },
    {
      label: "Designated parking",
      category: "facilities",
      availability: "none",
      detail: "No on-site parking; nearest accessible spots at Risorgimento garage.",
    },
  ],
  contact: "Disabled visitors office: accoglienza.disabili@scv.va",
  callout: "Most of the museum is fully step-free; staff can assist for the Sistine's final approach.",
};

export function Preview() {
  return (
    <div style={{ padding: 24, background: "#fafafa", minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <AccessibilityGuideChart spec={SPEC} context="Vatican Museums accessibility" />
      </div>
    </div>
  );
}
