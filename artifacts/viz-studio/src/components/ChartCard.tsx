import { type ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { BRAND } from "@/lib/brand";

interface Props {
  context?: string;
  pill?: string;
  pillTone?: "purps" | "candy" | "okay" | "hola";
  children: ReactNode;
  className?: string;
  /**
   * When true, drops the ESTIMATED pill + context subtitle entirely (recovers
   * ~40px of vertical space) and tightens outer padding so the visualization
   * gets every available pixel. Used by the compact embed mode.
   */
  compact?: boolean;
}

const PILL_TONES = {
  purps: { bg: BRAND.purpsSoft, fg: BRAND.purps },
  candy: { bg: BRAND.candySoft, fg: BRAND.candy },
  okay: { bg: BRAND.bgMint, fg: "#0E8F4E" },
  hola: { bg: BRAND.holaSoft, fg: "#A65A00" },
};

export function ChartCard({
  context,
  pill = "Estimated",
  pillTone = "purps",
  children,
  className,
  compact = false,
}: Props) {
  const tone = PILL_TONES[pillTone];
  return (
    <div
      className={`relative h-full w-full bg-white flex flex-col overflow-hidden ${className ?? ""}`}
      style={{
        borderRadius: 20,
        padding: compact
          ? "clamp(10px, 1.8cqi, 18px)"
          : "clamp(16px, 2.6cqi, 32px)",
        boxShadow: "var(--shadow-card)",
        border: `1px solid ${BRAND.slate100}`,
        containerType: "inline-size",
      }}
    >
      {!compact && (
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full"
            style={{
              background: tone.bg,
              color: tone.fg,
              padding: "4px 10px",
              fontSize: "clamp(9px, 1cqi, 11px)",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <BarChart3
              style={{ width: "1em", height: "1em" }}
              strokeWidth={2.5}
            />
            {pill}
          </div>
          {context && (
            <span
              style={{
                color: BRAND.slate500,
                fontSize: "clamp(10px, 1.05cqi, 12px)",
                fontWeight: 600,
              }}
            >
              {context}
            </span>
          )}
        </div>
      )}

      <div
        className={`flex-1 min-h-0 flex flex-col ${compact ? "" : "mt-4"}`}
      >
        {children}
      </div>
    </div>
  );
}
