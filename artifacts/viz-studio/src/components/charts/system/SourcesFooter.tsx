import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { BRAND } from "@/lib/brand";
import {
  EVIDENCE_KIND_META,
  evidenceKindCounts,
  type ChartProvenanceLite,
  type EvidenceKind,
} from "@/lib/chart-spec";

interface Props {
  provenance?: ChartProvenanceLite | null;
  /** Compact mode hides this footer entirely. */
  compact?: boolean;
}

const EVIDENCE_KIND_VALUES: readonly EvidenceKind[] = [
  "official",
  "marketplace",
  "review",
  "inferred",
  "estimate",
  "unknown",
];

function asKind(v: unknown): EvidenceKind {
  return typeof v === "string" &&
    (EVIDENCE_KIND_VALUES as readonly string[]).includes(v)
    ? (v as EvidenceKind)
    : "unknown";
}

/**
 * Small, low-chrome "n sources" affordance rendered at the bottom of charts
 * whose factual claims are externally verifiable. Click expands a list of
 * source URLs from `provenance.web_sources`, grouped and chip-tagged by
 * EvidenceKind (Task #63). Renders nothing when there are no web sources.
 */
export function SourcesFooter({ provenance, compact }: Props) {
  const [open, setOpen] = useState(false);
  const sources = (provenance?.web_sources ?? []).filter(
    (s) => typeof s?.url === "string" && (s.url ?? "").length > 0,
  );
  if (compact || sources.length === 0) return null;

  // Per-kind rollup across ALL provenance citations (web sources + DRD
  // snippets + estimates) — gives writers/embedders a one-glance read of
  // what kinds of evidence back this chart.
  const counts = evidenceKindCounts(provenance);
  // Task #97: hide "estimate" and "unknown" buckets from the rollup chips.
  // The ChartCard chrome already renders a canonical ESTIMATED pill, and
  // "unknown" is noise to writers. Counts are still computed so they can be
  // surfaced in the expanded source list if a backing URL exists.
  const ROLLUP_KINDS = EVIDENCE_KIND_VALUES.filter(
    (k) => k !== "estimate" && k !== "unknown",
  );
  const rollup = ROLLUP_KINDS.filter((k) => counts[k] > 0);

  // Group expanded source list by kind so reviewers can scan by trust tier.
  const byKind = new Map<EvidenceKind, typeof sources>();
  for (const s of sources) {
    const k = asKind(s.kind);
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k)!.push(s);
  }
  const kindOrder = EVIDENCE_KIND_VALUES.filter((k) => byKind.has(k));

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 flex-wrap"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: BRAND.slate700,
          fontSize: "clamp(9px, 1cqi, 11px)",
          fontWeight: 700,
        }}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1">
          <Link2 size={11} strokeWidth={2.5} />
          {sources.length} source{sources.length === 1 ? "" : "s"}
        </span>
        {rollup.map((k) => {
          const meta = EVIDENCE_KIND_META[k];
          return (
            <span
              key={k}
              style={{
                background: meta.bg,
                color: meta.fg,
                padding: "1px 6px",
                borderRadius: 999,
                fontSize: "clamp(8px, 0.9cqi, 10px)",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {meta.label} {counts[k]}
            </span>
          );
        })}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-2">
          {kindOrder.map((k) => {
            const meta = EVIDENCE_KIND_META[k];
            const list = byKind.get(k) ?? [];
            return (
              <div key={k}>
                <div
                  style={{
                    fontSize: "clamp(8px, 0.9cqi, 10px)",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: meta.fg,
                    marginBottom: 2,
                  }}
                >
                  {meta.label} ({list.length})
                </div>
                <ul
                  className="flex flex-col gap-1"
                  style={{ listStyle: "none", padding: 0, margin: 0 }}
                >
                  {list.slice(0, 6).map((s, i) => (
                    <li key={`${s.url}-${i}`} style={{ lineHeight: 1.3 }}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1"
                        style={{
                          color: BRAND.purps,
                          fontSize: "clamp(9px, 1cqi, 11px)",
                          fontWeight: 600,
                          textDecoration: "none",
                          wordBreak: "break-all",
                        }}
                      >
                        <ExternalLink size={10} strokeWidth={2.5} />
                        {s.title || s.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
