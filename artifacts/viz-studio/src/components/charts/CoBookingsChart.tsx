import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Landmark,
  Church,
  Castle,
  Building2,
  Trees,
  Gem,
  MapPin,
  BookOpen,
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
  const [hovered, setHovered] = useState<number | null>(null);
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (lockedIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLockedIdx(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lockedIdx]);

  const locked = lockedIdx !== null ? items[lockedIdx] : null;

  return (
    <ChartCard
      context={context ?? "Most co-booked nearby landmarks"}
      pill="Estimated"
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!compact && (
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
        )}

        <div
          className="flex-1 flex flex-col min-h-0"
          style={{
            rowGap: compact ? "clamp(2px, 0.4cqi, 5px)" : "clamp(6px, 0.9cqi, 10px)",
          }}
        >
          {items.map((item, i) => {
            const isHi = i < highlight_top;
            const fill = isHi ? BRAND.purps : BRAND.purpsSoft;
            const widthPct = Math.max((item.share / max) * 100, 3);
            const Icon = ICON_MAP[item.icon];
            const isHovered = hovered === i;
            const isLocked = lockedIdx === i;
            const dim = lockedIdx !== null && !isLocked;
            return (
              <Row
                key={i}
                index={i}
                rank={i + 1}
                Icon={Icon}
                item={item}
                fill={fill}
                widthPct={widthPct}
                isHi={isHi}
                isHovered={isHovered}
                isLocked={isLocked}
                dim={dim}
                compact={compact}
                onEnter={() => setHovered(i)}
                onLeave={() => setHovered(null)}
                onToggle={() =>
                  setLockedIdx((p) => (p === i ? null : i))
                }
              />
            );
          })}
        </div>

        {!compact && locked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden", marginTop: 10 }}
            role="region"
            aria-label={`${locked.name} pairing detail`}
          >
            <div
              style={{
                padding: "10px 12px",
                background: BRAND.purpsSoft,
                borderRadius: 10,
                border: `1px solid ${BRAND.purps}25`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    color: BRAND.purps,
                    fontWeight: 800,
                    fontSize: "clamp(12px, 1.35cqi, 14px)",
                  }}
                >
                  {locked.name} · {Math.round(locked.share)}% co-book
                </div>
                <button
                  type="button"
                  onClick={() => setLockedIdx(null)}
                  aria-label="Close pairing detail"
                  style={{
                    background: "white",
                    color: BRAND.purps,
                    border: `1px solid ${BRAND.purps}25`,
                    padding: "2px 9px",
                    borderRadius: 999,
                    fontSize: "clamp(9px, 1cqi, 11px)",
                    fontWeight: 800,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  Close
                </button>
              </div>
              {locked.pairing && (
                <div
                  style={{
                    color: BRAND.slate900,
                    fontSize: "clamp(10px, 1.1cqi, 12px)",
                    fontWeight: 600,
                    lineHeight: 1.4,
                    marginBottom: 4,
                  }}
                >
                  <strong style={{ fontWeight: 800 }}>Pair:</strong>{" "}
                  {locked.pairing}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {locked.walk && (
                  <span
                    style={{
                      background: "white",
                      color: BRAND.slate700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <MapPin size={10} strokeWidth={2.5} />
                    {locked.walk}
                  </span>
                )}
                {locked.on_library && (
                  <span
                    style={{
                      background: BRAND.purps,
                      color: "white",
                      padding: "3px 9px",
                      borderRadius: 999,
                      fontSize: "clamp(9px, 1cqi, 11px)",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <BookOpen size={10} strokeWidth={2.5} />
                    On library
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
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
  isHi,
  isHovered,
  isLocked,
  dim,
  compact,
  onEnter,
  onLeave,
  onToggle,
}: {
  index: number;
  rank: number;
  Icon: React.ElementType;
  item: CoBookingsSpec["items"][number];
  fill: string;
  widthPct: number;
  isHi: boolean;
  isHovered: boolean;
  isLocked: boolean;
  dim: boolean;
  compact: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onToggle: () => void;
}) {
  const rankSize = compact ? 18 : 24;
  const iconCircle = compact ? 22 : 32;
  const iconSize = compact ? 12 : 18;
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-label={`Toggle ${item.name} pairing detail (${Math.round(item.share)}%)`}
      aria-pressed={isLocked}
      style={{
        display: "grid",
        gridTemplateColumns: compact
          ? `${rankSize + 4}px ${iconCircle + 4}px minmax(0, 110px) 1fr`
          : `${rankSize + 4}px ${iconCircle + 4}px minmax(0, 150px) 1fr`,
        alignItems: "center",
        columnGap: compact ? 8 : 10,
        background: "transparent",
        border: "none",
        padding: 4,
        margin: -4,
        textAlign: "left",
        cursor: "pointer",
        opacity: dim ? 0.4 : 1,
        outline: "none",
        borderRadius: 10,
        boxShadow: isLocked
          ? `0 0 0 2px ${BRAND.purps}`
          : isHovered
            ? `0 0 0 2px ${BRAND.purps}33`
            : "none",
        transition: "opacity .2s ease, box-shadow .15s ease",
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
            color: isLocked ? BRAND.purps : BRAND.slate900,
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
            : "clamp(22px, 2.8cqi, 30px)",
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
    </button>
  );
}
