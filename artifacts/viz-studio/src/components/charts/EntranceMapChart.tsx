import { motion } from "framer-motion";
import {
  Accessibility,
  Ban,
  Check,
  CircleSlash,
  DoorClosed,
  DoorOpen,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { formatClockRangesInText } from "@/lib/time";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import {
  type EntranceMapSpec,
  type EntranceStatus,
} from "@/lib/chart-spec";

interface Props {
  spec: EntranceMapSpec;
  context?: string;
  compact?: boolean;
}

const STATUS_META: Record<
  EntranceStatus,
  {
    label: string;
    accent: "purps" | "candy" | "hola" | "okay" | "slate";
    Icon: typeof Check;
  }
> = {
  recommended: { label: "Recommended", accent: "okay", Icon: Star },
  avoid: { label: "Avoid", accent: "candy", Icon: Ban },
  groups: { label: "Groups only", accent: "hola", Icon: Users },
  accessible: {
    label: "Accessible",
    accent: "purps",
    Icon: Accessibility,
  },
  closed: { label: "Closed", accent: "slate", Icon: CircleSlash },
  standard: { label: "Standard", accent: "slate", Icon: DoorOpen },
};

export function EntranceMapChart({ spec, context, compact = false }: Props) {
  const { entrances, callout, venue_label } = spec;
  return (
    <ChartCard
      context={context ?? (venue_label ? `${venue_label} entrances` : "Entrances")}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="flex-1 flex flex-col"
          style={{ gap: compact ? 6 : 8, minHeight: 0 }}
        >
          {entrances.map((e, i) => {
            const meta = STATUS_META[e.status];
            const accent = e.accent ?? meta.accent;
            const Icon = meta.Icon;
            const isRec = e.status === "recommended";
            const isClosed = e.status === "closed";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.05 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex items-stretch"
                style={{
                  background: isRec ? ACCENT_SOFT[accent] : "white",
                  border: isRec
                    ? `1.5px solid ${ACCENT_FILL[accent]}`
                    : `1px solid ${BRAND.slate100}`,
                  borderRadius: 12,
                  padding: compact ? "6px 8px" : "10px 12px",
                  opacity: isClosed ? 0.55 : 1,
                  gap: compact ? 8 : 12,
                  minWidth: 0,
                }}
              >
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: compact ? 24 : 30,
                    height: compact ? 24 : 30,
                    borderRadius: 999,
                    background: ACCENT_SOFT[accent],
                    color: ACCENT_FG[accent],
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <Icon size={compact ? 12 : 16} strokeWidth={2.5} />
                </span>
                <div
                  className="flex-1"
                  style={{ minWidth: 0 }}
                >
                  <div
                    className="flex items-baseline"
                    style={{ gap: 6, flexWrap: "wrap" }}
                  >
                    <span
                      style={{
                        fontSize: compact
                          ? "clamp(11px, 1.2cqi, 13px)"
                          : "clamp(12px, 1.35cqi, 14px)",
                        fontWeight: 800,
                        color: BRAND.slate950,
                        lineHeight: 1.2,
                        textDecoration: isClosed ? "line-through" : "none",
                      }}
                    >
                      {e.name}
                    </span>
                    <span
                      style={{
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: ACCENT_FG[accent],
                      }}
                    >
                      {meta.label}
                    </span>
                    {e.wait_label && !isClosed && (
                      <span
                        style={{
                          fontSize: "clamp(9px, 1cqi, 11px)",
                          fontWeight: 700,
                          color: BRAND.slate700,
                          background: BRAND.slate50,
                          padding: "1px 7px",
                          borderRadius: 999,
                        }}
                      >
                        {formatClockRangesInText(e.wait_label)}
                      </span>
                    )}
                  </div>
                  {/* `best_for` chips hide in compact — they're the secondary
                      copy hosts typically duplicate next to the embed. */}
                  {!compact && e.best_for && e.best_for.length > 0 && (
                    <div
                      className="flex flex-wrap"
                      style={{ gap: 4, marginTop: 4 }}
                    >
                      {e.best_for.map((tag, ti) => (
                        <span
                          key={ti}
                          style={{
                            fontSize: "clamp(9px, 1cqi, 11px)",
                            fontWeight: 600,
                            color: ACCENT_FG[accent],
                            background: ACCENT_SOFT[accent],
                            padding: "1px 7px",
                            borderRadius: 999,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {!compact && e.note && (
                    <div
                      style={{
                        fontSize: "clamp(10px, 1.05cqi, 12px)",
                        fontWeight: 600,
                        color: BRAND.slate700,
                        marginTop: 3,
                        lineHeight: 1.35,
                      }}
                    >
                      {e.note}
                    </div>
                  )}
                </div>
                {isClosed && (
                  <DoorClosed
                    size={compact ? 14 : 18}
                    color={BRAND.slate500}
                    aria-hidden="true"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {!compact && callout && (
          <div
            className="flex items-start gap-2"
            style={{ marginTop: 10, flexShrink: 0 }}
          >
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
      </div>
    </ChartCard>
  );
}
