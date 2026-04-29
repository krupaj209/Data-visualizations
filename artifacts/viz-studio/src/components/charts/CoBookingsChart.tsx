import { useState } from "react";
import { motion } from "framer-motion";
import { Landmark, Church, Castle, Building2, Trees, Gem, MapPin } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { BRAND } from "@/lib/brand";
import { type CoBookingsSpec } from "@/lib/chart-spec";

interface Props {
  spec: CoBookingsSpec;
  context?: string;
}

const ICON_MAP: Record<CoBookingsSpec["items"][number]["icon"], React.ElementType> = {
  landmark: Landmark,
  church: Church,
  castle: Castle,
  building: Building2,
  trees: Trees,
  gem: Gem,
};

export function CoBookingsChart({ spec, context }: Props) {
  const { items, highlight_top = 2 } = spec;
  const max = Math.max(...items.map((i) => i.share), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <ChartCard
      context={context ?? "Most co-booked nearby landmarks"}
      pill="Estimated"
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Optional headline strip with map pin */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: BRAND.purpsSoft,
              color: BRAND.purps,
            }}
          >
            <MapPin size={14} strokeWidth={2.5} />
          </span>
        </div>

        <div
          className="flex-1 grid items-center min-h-0"
          style={{
            gridTemplateColumns:
              "28px 36px minmax(0, 150px) 1fr",
            columnGap: 10,
            rowGap: "clamp(6px, 0.9cqi, 10px)",
            alignContent: "stretch",
          }}
        >
          {items.map((item, i) => {
            const isHi = i < highlight_top;
            const fill = isHi ? BRAND.purps : BRAND.purpsSoft;
            const widthPct = Math.max((item.share / max) * 100, 3);
            const Icon = ICON_MAP[item.icon];
            const isHovered = hovered === i;
            return (
              <RowFragment
                key={i}
                index={i}
                rank={i + 1}
                Icon={Icon}
                item={item}
                fill={fill}
                widthPct={widthPct}
                isHi={isHi}
                isHovered={isHovered}
                onEnter={() => setHovered(i)}
                onLeave={() => setHovered(null)}
              />
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}

function RowFragment({
  index,
  rank,
  Icon,
  item,
  fill,
  widthPct,
  isHi,
  isHovered,
  onEnter,
  onLeave,
}: {
  index: number;
  rank: number;
  Icon: React.ElementType;
  item: CoBookingsSpec["items"][number];
  fill: string;
  widthPct: number;
  isHi: boolean;
  isHovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <>
      {/* Rank circle */}
      <div className="flex items-center justify-center">
        <div
          className="flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: BRAND.purps,
            color: "white",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          {rank}
        </div>
      </div>

      {/* Icon circle */}
      <div className="flex items-center justify-center">
        <div
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: BRAND.purpsSoft,
            color: BRAND.purps,
          }}
        >
          <Icon size={18} strokeWidth={1.7} />
        </div>
      </div>

      {/* Name + badge */}
      <div className="min-w-0">
        <div
          style={{
            color: BRAND.slate900,
            fontWeight: 800,
            fontSize: "clamp(11px, 1.3cqi, 14px)",
            lineHeight: 1.15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </div>
        {item.badge && (
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

      {/* Bar with % */}
      <div
        className="relative flex items-center"
        style={{ height: "clamp(22px, 2.8cqi, 30px)" }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
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
            boxShadow: isHovered ? `0 0 0 2px ${BRAND.purps}40` : "none",
            transition: "box-shadow .15s ease",
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
    </>
  );
}
