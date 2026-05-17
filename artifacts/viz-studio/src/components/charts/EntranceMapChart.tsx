import { motion } from "framer-motion";
import {
  Accessibility,
  Ban,
  CircleSlash,
  DoorOpen,
  Sparkles,
  Star,
  Users,
  Check,
} from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { formatClockRangesInText } from "@/lib/time";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import {
  type CompassPosition,
  type EntranceMapSpec,
  type EntranceStatus,
  type TransportMode,
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
  accessible: { label: "Accessible", accent: "purps", Icon: Accessibility },
  closed: { label: "Closed", accent: "slate", Icon: CircleSlash },
  standard: { label: "Standard", accent: "slate", Icon: DoorOpen },
};

const TRANSPORT_GLYPH: Record<TransportMode, string> = {
  metro: "M",
  bus: "B",
  tram: "T",
  train: "R",
  walk: "W",
  parking: "P",
  taxi: "X",
  ferry: "F",
};

/* SVG geometry — viewBox is intentionally larger than the silhouette so
 * outward-facing labels never get clipped at extreme compass positions. */
const VIEW_W = 240;
const VIEW_H = 160;
const CENTER_X = 120;
const CENTER_Y = 80;
const VENUE_W = 96;
const VENUE_H = 60;
const VENUE_RX = 14;
const VENUE_X = CENTER_X - VENUE_W / 2;
const VENUE_Y = CENTER_Y - VENUE_H / 2;

const COMPASS_COORDS: Record<CompassPosition, { x: number; y: number }> = {
  n: { x: 120, y: 30 },
  ne: { x: 192, y: 40 },
  e: { x: 208, y: 80 },
  se: { x: 192, y: 120 },
  s: { x: 120, y: 130 },
  sw: { x: 48, y: 120 },
  w: { x: 32, y: 80 },
  nw: { x: 48, y: 40 },
};

const COMPASS_LABEL: Record<CompassPosition, string> = {
  n: "north",
  ne: "north-east",
  e: "east",
  se: "south-east",
  s: "south",
  sw: "south-west",
  w: "west",
  nw: "north-west",
};

/** Auto-distribute pins around the venue when no positions are supplied. */
function autoCoords(i: number, total: number): { x: number; y: number } {
  // Start at -90deg (north), distribute clockwise.
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(total, 1);
  return {
    x: CENTER_X + Math.cos(angle) * 88,
    y: CENTER_Y + Math.sin(angle) * 60,
  };
}

interface PlacedPin {
  x: number;
  y: number;
  /** Angle from center, in radians (for label placement). */
  angle: number;
}

function placePin(
  entrance: EntranceMapSpec["entrances"][number],
  i: number,
  total: number,
): PlacedPin {
  const coords = entrance.position
    ? COMPASS_COORDS[entrance.position]
    : autoCoords(i, total);
  const angle = Math.atan2(coords.y - CENTER_Y, coords.x - CENTER_X);
  return { ...coords, angle };
}

interface LabelPos {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
}

function placeLabel(pin: PlacedPin): LabelPos {
  // Push label outward from venue center in the same angular direction
  // as the pin. Anchor flips so labels never overlap the silhouette.
  const dx = Math.cos(pin.angle);
  const dy = Math.sin(pin.angle);
  const offset = 12;
  const x = pin.x + dx * offset;
  const y = pin.y + dy * offset;
  let anchor: "start" | "middle" | "end" = "middle";
  if (dx > 0.4) anchor = "start";
  else if (dx < -0.4) anchor = "end";
  return { x, y, anchor };
}

export function EntranceMapChart({ spec, context, compact = false }: Props) {
  const {
    entrances,
    callout,
    venue_label,
    intro_phrase,
    walking_routes,
    assembly_point,
  } = spec;

  // If no entrance carries a position, auto-distribute every pin so legacy
  // specs (e.g. Vatican Museums) still render as a map.
  const anyPositioned = entrances.some((e) => Boolean(e.position));
  const usingAutoLayout = !anyPositioned;

  const placed: PlacedPin[] = entrances.map((e, i) =>
    placePin(usingAutoLayout ? { ...e, position: undefined } : e, i, entrances.length),
  );

  // Derive the intro phrase if the spec omits it but positions exist.
  const derivedIntro =
    intro_phrase ??
    (anyPositioned
      ? (() => {
          const dirs = entrances
            .map((e) => (e.position ? COMPASS_LABEL[e.position] : null))
            .filter((v): v is string => Boolean(v));
          if (dirs.length === 0) return undefined;
          const unique = Array.from(new Set(dirs));
          return `${entrances.length} entrances · ${unique.join(", ")}`;
        })()
      : undefined);

  const assemblyPin = assembly_point
    ? (() => {
        const c = COMPASS_COORDS[assembly_point.position];
        return {
          ...c,
          angle: Math.atan2(c.y - CENTER_Y, c.x - CENTER_X),
        };
      })()
    : null;

  const routeLookup = new Map(entrances.map((e, i) => [e.name, placed[i]]));

  return (
    <ChartCard
      context={context ?? (venue_label ? `${venue_label} entrances` : "Entrances")}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0" style={{ gap: compact ? 6 : 8 }}>
        {!compact && derivedIntro && (
          <div
            style={{
              fontSize: "clamp(10px, 1.1cqi, 12px)",
              fontWeight: 700,
              color: BRAND.slate700,
              letterSpacing: "0.01em",
              flexShrink: 0,
            }}
          >
            {derivedIntro}
          </div>
        )}

        {/* Schematic — fills available height */}
        <div
          className="flex-1 flex"
          style={{ minHeight: 0, justifyContent: "center" }}
        >
          <svg
            // Extra padding around the logical viewBox so outward-facing
            // text labels at extreme compass positions stay readable.
            viewBox={`-32 -12 ${VIEW_W + 64} ${VIEW_H + 24}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", display: "block" }}
            aria-label={derivedIntro ?? "Entrance map"}
          >
            {/* Venue silhouette */}
            <rect
              x={VENUE_X}
              y={VENUE_Y}
              width={VENUE_W}
              height={VENUE_H}
              rx={VENUE_RX}
              ry={VENUE_RX}
              fill={BRAND.bgShell}
              stroke={BRAND.slate200}
              strokeWidth={1.2}
            />
            {venue_label && (
              <text
                x={CENTER_X}
                y={CENTER_Y + 2}
                textAnchor="middle"
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  fill: BRAND.slate500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {venue_label}
              </text>
            )}

            {/* Walking routes (dashed) */}
            {walking_routes?.map((r, i) => {
              const a = routeLookup.get(r.from);
              const b = routeLookup.get(r.to);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <g key={`route-${i}`} aria-hidden="true">
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={BRAND.slate300}
                    strokeWidth={1}
                    strokeDasharray="2.5 2.5"
                    strokeLinecap="round"
                  />
                  {r.minutes !== undefined && (
                    <g>
                      <rect
                        x={mx - 10}
                        y={my - 4.5}
                        width={20}
                        height={9}
                        rx={4.5}
                        ry={4.5}
                        fill="white"
                        stroke={BRAND.slate200}
                        strokeWidth={0.6}
                      />
                      <text
                        x={mx}
                        y={my + 2.5}
                        textAnchor="middle"
                        style={{
                          fontSize: 6,
                          fontWeight: 700,
                          fill: BRAND.slate700,
                        }}
                      >
                        {r.minutes}m walk
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Pins */}
            {entrances.map((e, i) => {
              const pin = placed[i];
              const meta = STATUS_META[e.status];
              const accent = e.accent ?? meta.accent;
              const fill = ACCENT_FILL[accent];
              const soft = ACCENT_SOFT[accent];
              const isClosed = e.status === "closed";
              const isRec = e.status === "recommended";
              const label = placeLabel(pin);
              const labelY =
                label.anchor === "middle" && pin.y < CENTER_Y
                  ? label.y - 4
                  : label.y + 2;
              return (
                <motion.g
                  key={i}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.05 * i,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Recommended halo */}
                  {isRec && (
                    <circle
                      cx={pin.x}
                      cy={pin.y}
                      r={8}
                      fill={soft}
                      opacity={0.9}
                    />
                  )}
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={5}
                    fill={isClosed ? "white" : fill}
                    stroke={fill}
                    strokeWidth={isClosed ? 1.4 : 0}
                    opacity={isClosed ? 0.7 : 1}
                  />
                  {/* Transport glyph below pin */}
                  {e.transport && !isClosed && (
                    <g>
                      <circle
                        cx={pin.x + 6}
                        cy={pin.y + 5}
                        r={3.6}
                        fill="white"
                        stroke={BRAND.slate300}
                        strokeWidth={0.6}
                      />
                      <text
                        x={pin.x + 6}
                        y={pin.y + 6.6}
                        textAnchor="middle"
                        style={{
                          fontSize: 4.5,
                          fontWeight: 800,
                          fill: BRAND.slate900,
                        }}
                      >
                        {TRANSPORT_GLYPH[e.transport.mode]}
                      </text>
                    </g>
                  )}
                  {/* Label */}
                  <text
                    x={label.x}
                    y={labelY}
                    textAnchor={label.anchor}
                    style={{
                      fontSize: 6.5,
                      fontWeight: 700,
                      fill: BRAND.slate950,
                      textDecoration: isClosed ? "line-through" : "none",
                    }}
                  >
                    {e.name}
                  </text>
                </motion.g>
              );
            })}

            {/* Assembly point — starred pin */}
            {assemblyPin && assembly_point && (
              <g>
                <circle
                  cx={assemblyPin.x}
                  cy={assemblyPin.y}
                  r={5.5}
                  fill={BRAND.candy}
                />
                <text
                  x={assemblyPin.x}
                  y={assemblyPin.y + 2.2}
                  textAnchor="middle"
                  style={{ fontSize: 7, fontWeight: 800, fill: "white" }}
                >
                  ★
                </text>
                <text
                  x={(() => {
                    const lp = placeLabel(assemblyPin);
                    return lp.x;
                  })()}
                  y={(() => {
                    const lp = placeLabel(assemblyPin);
                    return lp.anchor === "middle" && assemblyPin.y < CENTER_Y
                      ? lp.y - 4
                      : lp.y + 2;
                  })()}
                  textAnchor={placeLabel(assemblyPin).anchor}
                  style={{
                    fontSize: 6.5,
                    fontWeight: 700,
                    fill: BRAND.candy,
                  }}
                >
                  {assembly_point.label}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Legend strip — preserved comparison info from the list view. */}
        {!compact && (
          <div
            className="flex flex-col"
            style={{ gap: 4, flexShrink: 0 }}
          >
            {entrances.map((e, i) => {
              const meta = STATUS_META[e.status];
              const accent = e.accent ?? meta.accent;
              const Icon = meta.Icon;
              const isClosed = e.status === "closed";
              const isRec = e.status === "recommended";
              return (
                <div
                  key={i}
                  className="flex items-center flex-wrap"
                  style={{
                    gap: "4px 8px",
                    padding: "4px 8px",
                    borderRadius: 8,
                    background: isRec ? ACCENT_SOFT[accent] : BRAND.slate50,
                    border: isRec
                      ? `1px solid ${ACCENT_FILL[accent]}`
                      : `1px solid ${BRAND.slate100}`,
                    opacity: isClosed ? 0.6 : 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: ACCENT_SOFT[accent],
                      color: ACCENT_FG[accent],
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <Icon size={11} strokeWidth={2.5} />
                  </span>
                  <span
                    style={{
                      fontSize: "clamp(10px, 1.1cqi, 12px)",
                      fontWeight: 800,
                      color: BRAND.slate950,
                      textDecoration: isClosed ? "line-through" : "none",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
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
                      flexShrink: 0,
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
                        background: "white",
                        padding: "1px 6px",
                        borderRadius: 999,
                        border: `1px solid ${BRAND.slate200}`,
                        flexShrink: 0,
                      }}
                    >
                      {formatClockRangesInText(e.wait_label)}
                    </span>
                  )}
                  {e.transport && !isClosed && (
                    <span
                      style={{
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 600,
                        color: BRAND.slate700,
                        flexShrink: 0,
                      }}
                    >
                      {e.transport.label}
                    </span>
                  )}
                  {e.best_for && e.best_for.length > 0 && (
                    <span
                      className="flex flex-wrap"
                      style={{ gap: 3 }}
                    >
                      {e.best_for.map((tag, ti) => (
                        <span
                          key={ti}
                          style={{
                            fontSize: "clamp(9px, 1cqi, 11px)",
                            fontWeight: 600,
                            color: ACCENT_FG[accent],
                            background: ACCENT_SOFT[accent],
                            padding: "1px 6px",
                            borderRadius: 999,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!compact && callout && (
          <div
            className="flex items-start gap-2"
            style={{ marginTop: 4, flexShrink: 0 }}
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
