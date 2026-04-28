import { type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";

interface Props {
  title: string;
  subtitle?: string;
  insight?: string;
  question?: string;
  pill?: string;
  pillTone?: "purps" | "candy" | "okay" | "hola";
  children: ReactNode;
  className?: string;
}

const PILL_TONES = {
  purps: { bg: BRAND.purpsSoft, fg: BRAND.purps },
  candy: { bg: BRAND.candySoft, fg: BRAND.candy },
  okay: { bg: BRAND.bgMint, fg: "#0E8F4E" },
  hola: { bg: BRAND.holaSoft, fg: "#A65A00" },
};

export function ChartCard({
  title,
  subtitle,
  insight,
  pill = "Estimated",
  pillTone = "purps",
  children,
  className,
}: Props) {
  const tone = PILL_TONES[pillTone];
  return (
    <div
      className={`relative h-full w-full bg-white flex flex-col overflow-hidden ${className ?? ""}`}
      style={{
        borderRadius: 24,
        padding: "clamp(20px, 3.2cqi, 44px)",
        boxShadow: "var(--shadow-card)",
        border: `1px solid ${BRAND.slate100}`,
        containerType: "inline-size",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="inline-flex items-center gap-1.5 rounded-full"
          style={{
            background: tone.bg,
            color: tone.fg,
            padding: "6px 12px",
            fontSize: "clamp(10px, 1.1cqi, 12px)",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <Sparkles
            style={{
              width: "1em",
              height: "1em",
            }}
            strokeWidth={2.5}
          />
          {pill}
        </div>
      </div>

      <div className="mt-3">
        <h2
          style={{
            color: BRAND.slate950,
            fontSize: "clamp(20px, 2.6cqi, 32px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              color: BRAND.slate700,
              fontSize: "clamp(12px, 1.3cqi, 16px)",
              fontWeight: 500,
              marginTop: 4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 mt-5 flex flex-col">{children}</div>

      {insight && (
        <div
          className="mt-4 flex items-start gap-2"
          style={{
            paddingTop: 14,
            borderTop: `1px solid ${BRAND.slate100}`,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              minWidth: 6,
              borderRadius: 999,
              background: BRAND.candy,
              marginTop: 7,
            }}
          />
          <p
            style={{
              color: BRAND.slate900,
              fontSize: "clamp(11px, 1.25cqi, 14px)",
              fontWeight: 600,
              lineHeight: 1.45,
            }}
          >
            {insight}
          </p>
        </div>
      )}
    </div>
  );
}
