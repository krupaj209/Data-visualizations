import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Accessibility,
  Brain,
  Building2,
  Check,
  CircleHelp,
  Ear,
  HeartHandshake,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_SOFT, BRAND } from "@/lib/brand";
import {
  type AccessAvailability,
  type AccessCategory,
  type AccessibilityGuideSpec,
} from "@/lib/chart-spec";

interface Props {
  spec: AccessibilityGuideSpec;
  context?: string;
  compact?: boolean;
}

const AVAIL_META: Record<
  AccessAvailability,
  {
    label: string;
    accent: "okay" | "hola" | "candy" | "purps";
    Icon: typeof Check;
  }
> = {
  full: { label: "Available", accent: "okay", Icon: Check },
  partial: { label: "Partial", accent: "hola", Icon: Minus },
  none: { label: "Not available", accent: "candy", Icon: X },
  on_request: { label: "On request", accent: "purps", Icon: CircleHelp },
};

const CATEGORY_META: Record<
  AccessCategory,
  { label: string; Icon: typeof Check }
> = {
  mobility: { label: "Mobility", Icon: Accessibility },
  sensory: { label: "Sensory", Icon: Ear },
  cognitive: { label: "Cognitive", Icon: Brain },
  services: { label: "Services", Icon: HeartHandshake },
  facilities: { label: "Facilities", Icon: Building2 },
};

export function AccessibilityGuideChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { features, headline, contact, callout } = spec;

  const grouped = useMemo(() => {
    const map = new Map<
      AccessCategory,
      AccessibilityGuideSpec["features"]
    >();
    for (const f of features) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return Array.from(map.entries());
  }, [features]);

  return (
    <ChartCard
      context={context ?? headline ?? "Accessibility at a glance"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 flex flex-col min-h-0"
          style={{ gap: compact ? 6 : 10, overflowY: "auto" }}
        >
          {compact
            ? features.map((f, i) => (
                <FeatureRow key={i} feature={f} index={i} compact />
              ))
            : grouped.map(([cat, list], gi) => {
                const meta = CATEGORY_META[cat];
                const CIcon = meta.Icon;
                return (
                  <div key={cat}>
                    <div
                      className="flex items-center"
                      style={{ gap: 6, marginBottom: 4 }}
                    >
                      <CIcon
                        size={12}
                        strokeWidth={2.5}
                        color={BRAND.slate700}
                      />
                      <span
                        style={{
                          fontSize: "clamp(9px, 1cqi, 11px)",
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: BRAND.slate700,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div
                      className="flex flex-col"
                      style={{ gap: 4 }}
                    >
                      {list.map((f, i) => (
                        <FeatureRow
                          key={`${cat}-${i}`}
                          feature={f}
                          index={gi * 10 + i}
                          compact={false}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
        </div>

        {!compact && (callout || contact) && (
          <div style={{ marginTop: 10, flexShrink: 0 }}>
            {callout && (
              <div className="flex items-start gap-2">
                <Sparkles
                  size={14}
                  strokeWidth={2.5}
                  style={{ color: BRAND.candy, marginTop: 1, flexShrink: 0 }}
                />
                <span
                  style={{
                    color: BRAND.slate900,
                    fontSize: "clamp(10px, 1.1cqi, 12px)",
                    fontWeight: 600,
                    lineHeight: 1.35,
                  }}
                >
                  {callout}
                </span>
              </div>
            )}
            {contact && (
              <div
                style={{
                  marginTop: callout ? 4 : 0,
                  fontSize: "clamp(9px, 1cqi, 11px)",
                  fontWeight: 700,
                  color: BRAND.purps,
                  lineHeight: 1.35,
                }}
              >
                {contact}
              </div>
            )}
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function FeatureRow({
  feature,
  index,
  compact,
}: {
  feature: AccessibilityGuideSpec["features"][number];
  index: number;
  compact: boolean;
}) {
  const meta = AVAIL_META[feature.availability];
  const Icon = meta.Icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.02 * index,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flex items-start"
      style={{
        gap: compact ? 6 : 8,
        padding: compact ? "4px 8px" : "6px 10px",
        background: "white",
        border: `1px solid ${BRAND.slate100}`,
        borderRadius: 10,
        opacity: feature.availability === "none" ? 0.7 : 1,
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: compact ? 18 : 22,
          height: compact ? 18 : 22,
          borderRadius: 999,
          background: ACCENT_SOFT[meta.accent],
          color: ACCENT_FG[meta.accent],
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <Icon size={compact ? 10 : 12} strokeWidth={3} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          className="flex items-baseline"
          style={{ gap: 6, flexWrap: "wrap" }}
        >
          <span
            style={{
              fontSize: compact
                ? "clamp(10px, 1.1cqi, 12px)"
                : "clamp(11px, 1.2cqi, 13px)",
              fontWeight: 700,
              color: BRAND.slate950,
              lineHeight: 1.25,
            }}
          >
            {feature.label}
          </span>
          <span
            style={{
              fontSize: "clamp(8px, 0.95cqi, 10px)",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: ACCENT_FG[meta.accent],
            }}
          >
            {meta.label}
          </span>
        </div>
        {!compact && feature.detail && (
          <div
            style={{
              fontSize: "clamp(9px, 1cqi, 11px)",
              fontWeight: 600,
              color: BRAND.slate700,
              marginTop: 2,
              lineHeight: 1.35,
            }}
          >
            {feature.detail}
          </div>
        )}
      </div>
    </motion.div>
  );
}
