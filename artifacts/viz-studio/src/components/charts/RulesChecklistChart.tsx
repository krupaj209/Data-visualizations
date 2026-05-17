import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Backpack,
  Ban,
  Camera,
  Check,
  Shield,
  ShieldAlert,
  Shirt,
  UtensilsCrossed,
} from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_SOFT, BRAND } from "@/lib/brand";
import {
  type RulesCategory,
  type RulesChecklistSpec,
  type RulesSeverity,
} from "@/lib/chart-spec";

interface Props {
  spec: RulesChecklistSpec;
  context?: string;
  compact?: boolean;
}

const SEVERITY_META: Record<
  RulesSeverity,
  {
    label: string;
    accent: "okay" | "hola" | "candy" | "purps";
    Icon: typeof Check;
  }
> = {
  allowed: { label: "Allowed", accent: "okay", Icon: Check },
  restricted: { label: "Restricted", accent: "hola", Icon: AlertTriangle },
  prohibited: { label: "Prohibited", accent: "candy", Icon: Ban },
  required: { label: "Required", accent: "purps", Icon: ShieldAlert },
};

const CATEGORY_META: Record<
  RulesCategory,
  { label: string; Icon: typeof Check }
> = {
  items: { label: "Items", Icon: Backpack },
  dress: { label: "Dress code", Icon: Shirt },
  behavior: { label: "Behavior", Icon: Shield },
  security: { label: "Security", Icon: ShieldAlert },
  photography: { label: "Photography", Icon: Camera },
  food: { label: "Food & drink", Icon: UtensilsCrossed },
  other: { label: "Other", Icon: AlertTriangle },
};

export function RulesChecklistChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { items, headline, source_note } = spec;

  // Group items by category for default rendering; compact mode flattens
  // into a single scrollable list so the categories don't eat vertical
  // space — the per-row severity chip is enough context.
  const grouped = useMemo(() => {
    const map = new Map<RulesCategory, RulesChecklistSpec["items"]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <ChartCard
      context={context ?? headline ?? "Rules at a glance"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 flex flex-col min-h-0"
          style={{
            gap: compact ? 4 : 10,
            overflowY: "auto",
          }}
        >
          {compact
            ? items.map((it, i) => (
                <RuleRow key={i} item={it} index={i} compact />
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
                      {list.map((it, i) => (
                        <RuleRow
                          key={`${cat}-${i}`}
                          item={it}
                          index={gi * 10 + i}
                          compact={false}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
        </div>

        {!compact && source_note && (
          <div
            style={{
              marginTop: 10,
              flexShrink: 0,
              fontSize: "clamp(9px, 1cqi, 11px)",
              fontWeight: 600,
              color: BRAND.slate500,
              lineHeight: 1.35,
            }}
          >
            {source_note}
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function RuleRow({
  item,
  index,
  compact,
}: {
  item: RulesChecklistSpec["items"][number];
  index: number;
  compact: boolean;
}) {
  const meta = SEVERITY_META[item.severity];
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
        background:
          item.severity === "prohibited" || item.severity === "required"
            ? ACCENT_SOFT[meta.accent]
            : "white",
        border: `1px solid ${BRAND.slate100}`,
        borderRadius: 10,
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
            {item.label}
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
        {!compact && item.note && (
          <div
            style={{
              fontSize: "clamp(9px, 1cqi, 11px)",
              fontWeight: 600,
              color: BRAND.slate700,
              marginTop: 2,
              lineHeight: 1.35,
            }}
          >
            {item.note}
          </div>
        )}
      </div>
    </motion.div>
  );
}
