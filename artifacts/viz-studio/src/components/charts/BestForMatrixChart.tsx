import { motion } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import { ChartCard } from "@/components/ChartCard";
import { ACCENT_FG, ACCENT_FILL, ACCENT_SOFT, BRAND } from "@/lib/brand";
import { type BestForMatrixSpec } from "@/lib/chart-spec";

interface Props {
  spec: BestForMatrixSpec;
  context?: string;
  compact?: boolean;
}

function pickTopAudience(spec: BestForMatrixSpec, facetIdx: number): number {
  const override = spec.facets[facetIdx]?.top_audience_index;
  if (override != null && override >= 0 && override < spec.audiences.length) {
    return override;
  }
  let bestIdx = 0;
  let bestScore = -Infinity;
  spec.audiences.forEach((a, i) => {
    // a.scores is indexed by FACET (one score per facet, in facet order),
    // so for facet=facetIdx the relevant score is scores[facetIdx].
    const s = a.scores[facetIdx] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export function BestForMatrixChart({
  spec,
  context,
  compact = false,
}: Props) {
  const { facets, audiences, insight } = spec;
  const tops = facets.map((_, fi) => pickTopAudience(spec, fi));

  return (
    <ChartCard
      context={context ?? "Audience-fit scores by facet"}
      compact={compact}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Single overflow-x container so the matrix scrolls horizontally
            on narrow widths while the first column stays pinned. */}
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowX: "auto",
            overflowY: "visible",
          }}
        >
        {/* Audience header row */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${audiences.length}, minmax(80px, 1fr))`,
            minWidth: 120 + audiences.length * 80,
            gap: compact ? 4 : 8,
            marginBottom: compact ? 6 : 10,
          }}
        >
          <div
            style={{
              position: "sticky",
              left: 0,
              background: "#fff",
              zIndex: 2,
            }}
          />
          {audiences.map((a, i) => (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{
                background: ACCENT_SOFT[a.accent],
                border: `1px solid ${ACCENT_FILL[a.accent]}`,
                borderRadius: 10,
                padding: compact ? "4px 6px" : "6px 8px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: ACCENT_FILL[a.accent],
                  marginBottom: 3,
                }}
              />
              <span
                style={{
                  fontSize: compact
                    ? "clamp(9px, 1.05cqi, 11px)"
                    : "clamp(10px, 1.15cqi, 12px)",
                  fontWeight: 800,
                  color: BRAND.slate950,
                  lineHeight: 1.15,
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {a.label}
              </span>
            </div>
          ))}
        </div>

        {/* Facet rows */}
        <div
          className="flex flex-col"
          style={{ gap: compact ? 4 : 6 }}
        >
          {facets.map((f, fi) => {
            const topIdx = tops[fi];
            return (
              <div
                key={fi}
                className="grid items-center"
                style={{
                  gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${audiences.length}, minmax(80px, 1fr))`,
                  minWidth: 120 + audiences.length * 80,
                  gap: compact ? 4 : 8,
                  paddingTop: compact ? 4 : 6,
                  paddingBottom: compact ? 4 : 6,
                  borderTop: `1px solid ${BRAND.slate100}`,
                }}
              >
                <div
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "#fff",
                    zIndex: 1,
                    paddingRight: 6,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: compact
                        ? "clamp(9px, 1.05cqi, 11px)"
                        : "clamp(10px, 1.15cqi, 12px)",
                      fontWeight: 800,
                      color: BRAND.slate950,
                      lineHeight: 1.2,
                    }}
                  >
                    {f.name}
                  </div>
                  {!compact && f.note && (
                    <div
                      style={{
                        fontSize: "clamp(9px, 1cqi, 11px)",
                        fontWeight: 600,
                        color: BRAND.slate700,
                        marginTop: 1,
                        lineHeight: 1.3,
                      }}
                    >
                      {f.note}
                    </div>
                  )}
                </div>
                {audiences.map((a, ai) => {
                  // Score for THIS audience on THIS facet: scores is indexed
                  // by facet, so use fi (facet index), not ai.
                  const score = Math.max(
                    0,
                    Math.min(100, a.scores[fi] ?? 0),
                  );
                  const isTop = ai === topIdx;
                  return (
                    <div
                      key={ai}
                      className="relative"
                      style={{ minWidth: 0 }}
                    >
                      <div
                        style={{
                          background: BRAND.slate100,
                          borderRadius: 6,
                          height: compact ? 14 : 18,
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{
                            duration: 0.7,
                            delay: 0.05 * (fi * audiences.length + ai),
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{
                            height: "100%",
                            background: ACCENT_FILL[a.accent],
                            borderRadius: 6,
                            opacity: isTop ? 1 : 0.55,
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "clamp(9px, 1cqi, 11px)",
                            fontWeight: 800,
                            color: BRAND.slate950,
                            mixBlendMode: "luminosity",
                          }}
                        >
                          {score}
                        </span>
                      </div>
                      {!compact && isTop && (
                        <div
                          className="flex items-center justify-center"
                          style={{
                            position: "absolute",
                            top: -8,
                            right: -4,
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            background: BRAND.candy,
                            color: "#fff",
                            boxShadow: `0 0 0 2px #fff`,
                          }}
                          title="Top fit"
                        >
                          <Star size={9} strokeWidth={3} fill="#fff" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        </div>

        {!compact && insight && (
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
                lineHeight: 1.3,
              }}
            >
              {insight}
            </span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
