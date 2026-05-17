/**
 * Editorial Overlay — Studio CE detail authoring aid (Task #109).
 *
 * Trimmed contract: narrative + trust only. CTA / social-proof / warning /
 * personalization branches were intentionally removed in Task #109 — the
 * overlay is a writer cue, not a marketing surface. The embed view
 * (/studio/embed/*) must never use this component.
 *
 * Renders headline + subhead + confidence badge + key-insight callout +
 * freshness line, with a Copy-as-HTML button so writers can lift the
 * narrative straight into the CMS body next to the embed.
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { EditorialOverlay as EditorialOverlayType } from "@workspace/editorial";
import { BRAND } from "@/lib/brand";

interface Props {
  overlay: EditorialOverlayType;
  /** No-op for now — embeds don't render this component, but kept for
   *  parity with the surrounding chart-rendering API. */
  compact?: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CONFIDENCE_STYLE: Record<
  "live" | "high" | "medium" | "low",
  { bg: string; fg: string; icon: string; label: string }
> = {
  live: { bg: BRAND.purpsSoft, fg: BRAND.purps, icon: "◉", label: "Live data" },
  high: { bg: "#E6F4EA", fg: "#0E8F4E", icon: "●", label: "High confidence" },
  medium: { bg: "#FFF4DD", fg: "#A65A00", icon: "◐", label: "Medium confidence" },
  low: { bg: BRAND.slate100, fg: BRAND.slate700, icon: "○", label: "Low confidence" },
};

export function EditorialOverlay({ overlay, compact = false }: Props) {
  const [copied, setCopied] = useState(false);

  const insightText = overlay.tip?.text;

  async function copyAsHtml() {
    const parts = [`<h2>${escapeHtml(overlay.headline)}</h2>`];
    if (overlay.subheadline) {
      parts.push(`<p>${escapeHtml(overlay.subheadline)}</p>`);
    }
    if (insightText) {
      parts.push(`<p>${escapeHtml(insightText)}</p>`);
    }
    try {
      await navigator.clipboard.writeText(parts.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  const confidence =
    CONFIDENCE_STYLE[overlay.confidence.level] ?? CONFIDENCE_STYLE.low;

  const lastUpdated =
    typeof overlay.freshness.lastUpdated === "string"
      ? new Date(overlay.freshness.lastUpdated)
      : overlay.freshness.lastUpdated;

  return (
    <div
      className={compact ? "space-y-2" : "space-y-3"}
      style={{
        padding: compact ? 0 : "12px 14px",
        borderRadius: 14,
        background: compact ? "transparent" : "white",
        border: compact ? "none" : `1px solid ${BRAND.slate100}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontSize: compact ? 14 : 17,
              fontWeight: 800,
              color: BRAND.slate950,
              letterSpacing: "-0.01em",
              lineHeight: 1.25,
            }}
          >
            {overlay.headline}
          </h2>
          {overlay.subheadline && (
            <p
              style={{
                marginTop: 4,
                color: BRAND.slate500,
                fontSize: compact ? 11 : 13,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {overlay.subheadline}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            title={overlay.confidence.explanation ?? confidence.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 9px",
              borderRadius: 999,
              background: confidence.bg,
              color: confidence.fg,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden>{confidence.icon}</span>
            {confidence.label}
          </span>
          <button
            type="button"
            onClick={copyAsHtml}
            title="Copy headline, subhead, and key insight as HTML"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 9px",
              borderRadius: 8,
              background: copied ? BRAND.purps : "white",
              color: copied ? "white" : BRAND.slate700,
              border: `1px solid ${copied ? BRAND.purps : BRAND.slate200}`,
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy HTML"}
          </button>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5"
        style={{
          fontSize: 10,
          color: BRAND.slate500,
          fontWeight: 600,
        }}
      >
        <span aria-hidden>🕐</span>
        <span>
          Updated {lastUpdated.toLocaleDateString()} · {overlay.freshness.updateFrequency} refresh
        </span>
      </div>
    </div>
  );
}

/**
 * Key-insight callout — rendered separately so it can sit between the
 * chart and the existing Evidence/Sources disclosures rather than inside
 * the header band.
 */
export function EditorialKeyInsight({ overlay }: { overlay: EditorialOverlayType }) {
  const insightText = overlay.tip?.text;
  if (!insightText) return null;
  return (
    <div
      role="note"
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 12,
        background: BRAND.purpsSoft,
        border: `1px solid ${BRAND.purps}30`,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: 14,
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        💡
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: BRAND.purps,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Key insight
        </div>
        <div
          style={{
            color: BRAND.slate950,
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          {insightText}
        </div>
      </div>
    </div>
  );
}
