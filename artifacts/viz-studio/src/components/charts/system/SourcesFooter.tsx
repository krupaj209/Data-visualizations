import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { type ChartProvenanceLite } from "@/lib/chart-spec";

interface Props {
  provenance?: ChartProvenanceLite | null;
  /** Compact mode hides this footer entirely. */
  compact?: boolean;
}

/**
 * Small, low-chrome "n sources" affordance rendered at the bottom of charts
 * whose factual claims are externally verifiable (calendar/seasonal family).
 * Click expands a collapsed list of source URLs from `provenance.web_sources`.
 *
 * Renders nothing when there are no web sources, so it's safe to drop into
 * any chart unconditionally.
 */
export function SourcesFooter({ provenance, compact }: Props) {
  const [open, setOpen] = useState(false);
  const sources = (provenance?.web_sources ?? []).filter(
    (s) => typeof s?.url === "string" && s.url.length > 0,
  );
  if (compact || sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1"
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
        <Link2 size={11} strokeWidth={2.5} />
        {sources.length} source{sources.length === 1 ? "" : "s"}
      </button>
      {open && (
        <ul
          className="mt-1.5 flex flex-col gap-1"
          style={{ listStyle: "none", padding: 0, margin: 0 }}
        >
          {sources.slice(0, 6).map((s, i) => (
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
      )}
    </div>
  );
}
