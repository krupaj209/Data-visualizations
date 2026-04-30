import { motion } from "framer-motion";
import {
  Landmark,
  Church,
  Castle,
  Building2,
  Trees,
  Gem,
} from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type CoBookingsSpec } from "@/lib/chart-spec";

interface Props {
  spec: CoBookingsSpec;
  context?: string;
  compact?: boolean;
}

const ICON_MAP: Record<
  CoBookingsSpec["items"][number]["icon"],
  React.ElementType
> = {
  landmark: Landmark,
  church: Church,
  castle: Castle,
  building: Building2,
  trees: Trees,
  gem: Gem,
};

export function CoBookingsChart({ spec, context, compact = false }: Props) {
  const { items, highlight_top = 2 } = spec;
  const max = Math.max(...items.map((i) => i.share), 1);

  return (
    <ChartCard
      context={context ?? "Most co-booked nearby landmarks"}
      pill="Estimated"
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 flex flex-col min-h-0"
          style={{
            rowGap: compact
              ? "clamp(2px, 0.4cqi, 5px)"
              : "clamp(6px, 0.9cqi, 10px)",
          }}
        >
          {items.map((item, i) => {
            const isHi = i < highlight_top;
            const fill = isHi ? BRAND.purps : BRAND.purpsSoft;
            const widthPct = Math.max((item.share / max) * 100, 3);
            const Icon = ICON_MAP[item.icon];
            return (
              <Row
                key={i}
                index={i}
                rank={i + 1}
                Icon={Icon}
                item={item}
                fill={fill}
                widthPct={widthPct}
                compact={compact}
              />
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}

function Row({
  index,
  rank,
  Icon,
  item,
  fill,
  widthPct,
  compact,
}: {
  index: number;
  rank: number;
  Icon: React.ElementType;
  item: CoBookingsSpec["items"][number];
  fill: string;
  widthPct: number;
  compact: boolean;
}) {
  const rankSize = compact ? 18 : 24;
  const iconCircle = compact ? 22 : 32;
  const iconSize = compact ? 12 : 18;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: compact
          ? `${rankSize + 4}px ${iconCircle + 4}px minmax(0, 110px) 1fr`
          : `${rankSize + 4}px ${iconCircle + 4}px minmax(0, 150px) 1fr`,
        alignItems: "center",
        columnGap: compact ? 8 : 10,
        flex: 1,
      }}
    >
      <div className="flex items-center justify-center">
        <div
          className="flex items-center justify-center"
          style={{
            width: rankSize,
            height: rankSize,
            borderRadius: "50%",
            background: BRAND.purps,
            color: "white",
            fontWeight: 800,
            fontSize: compact ? 10 : 12,
          }}
        >
          {rank}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div
          className="flex items-center justify-center"
          style={{
            width: iconCircle,
            height: iconCircle,
            borderRadius: "50%",
            background: BRAND.purpsSoft,
            color: BRAND.purps,
          }}
        >
          <Icon size={iconSize} strokeWidth={1.7} />
        </div>
      </div>

      <div className="min-w-0">
        <div
          style={{
            color: BRAND.slate900,
            fontWeight: 800,
            fontSize: compact
              ? "clamp(10px, 1.1cqi, 12px)"
              : "clamp(11px, 1.3cqi, 14px)",
            lineHeight: 1.1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </div>
        {!compact && item.badge && (
          <div
            className="inline-block mt-1"
            style={{
              border: `1px solid ${BRAND.purps}`,
              color: BRAND.purps,
              padding: "1px 7px",
              borderRadius: 4,
              fontSize: "clamp(8px, 0.9cqi, 10px)",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {item.badge}
          </div>
        )}
      </div>

      <div
        className="relative flex items-center"
        style={{
          height: compact
            ? "clamp(14px, 1.8cqi, 20px)"
            : "clamp(28px, 4.2cqi, 44px)",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{
            duration: 0.9,
            delay: 0.2 + index * 0.07,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="h-full"
          style={{
            background: fill,
            borderRadius: 6,
          }}
        />
        <span
          style={{
            marginLeft: 10,
            color: BRAND.slate900,
            fontWeight: 800,
            fontSize: "clamp(11px, 1.3cqi, 14px)",
            whiteSpace: "nowrap",
          }}
        >
          {Math.round(item.share)}%
        </span>
      </div>
    </div>
  );
}
