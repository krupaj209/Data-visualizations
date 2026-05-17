/**
 * Editorial Overlay — React Component
 *
 * Renders the complete editorial layer on top of any chart.
 * Handles all visual states: loading, error, personalized, compact.
 */

import React from "react";
import type { EditorialOverlay as EditorialOverlayType } from "@workspace/editorial";

interface Props {
  overlay: EditorialOverlayType;
  compact?: boolean;
  onCtaClick?: () => void;
}

export const EditorialOverlay: React.FC<Props> = ({
  overlay,
  compact = false,
  onCtaClick,
}) => {
  if (compact) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-900 leading-tight">
          {overlay.headline}
        </h3>
        <p className="text-xs text-gray-500 leading-snug">
          {overlay.subheadline}
        </p>
        {overlay.personalizationNote && (
          <p className="text-xs text-purple-600">
            {overlay.personalizationNote}
          </p>
        )}
        {overlay.cta &&
          (overlay.cta.url ? (
            <a
              href={overlay.cta.url}
              onClick={onCtaClick}
              className="text-xs text-purple-600 font-medium hover:underline"
            >
              {overlay.cta.text} →
            </a>
          ) : (
            <button
              onClick={onCtaClick}
              className="text-xs text-purple-600 font-medium hover:underline"
            >
              {overlay.cta.text} →
            </button>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">
              {overlay.headline}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{overlay.subheadline}</p>
          </div>

          {/* Confidence badge */}
          <div className="flex-shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                overlay.confidence.level === "high"
                  ? "bg-green-100 text-green-700"
                  : overlay.confidence.level === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {overlay.confidence.level === "high" && "●"}
              {overlay.confidence.level === "medium" && "◐"}
              {overlay.confidence.level === "low" && "○"}
              {overlay.confidence.level} confidence
            </span>
          </div>
        </div>

        {/* Personalization note */}
        {overlay.personalizationNote && (
          <p className="text-sm text-purple-600 mt-2 flex items-center gap-1">
            <span>✨</span>
            {overlay.personalizationNote}
          </p>
        )}
      </div>

      {/* Warning */}
      {overlay.warning && (
        <div
          className={`rounded-lg p-3 text-sm ${
            overlay.warning.severity === "alert"
              ? "bg-red-50 border border-red-200 text-red-800"
              : overlay.warning.severity === "warning"
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">{overlay.warning.icon}</span>
            <span>{overlay.warning.text}</span>
          </div>
        </div>
      )}

      {/* Tip */}
      {overlay.tip && (
        <div
          className={`rounded-lg p-3 text-sm ${
            overlay.tip.highlight
              ? "bg-purple-50 border border-purple-200 text-purple-800"
              : "bg-gray-50 text-gray-700"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">{overlay.tip.icon}</span>
            <span className="italic">{overlay.tip.text}</span>
          </div>
        </div>
      )}

      {/* Social proof */}
      {overlay.socialProof && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>📊</span>
          <span>{overlay.socialProof.stat}</span>
          {overlay.socialProof.source && (
            <span className="text-gray-400">· {overlay.socialProof.source}</span>
          )}
        </div>
      )}

      {/* CTA */}
      {overlay.cta &&
        (() => {
          const cta = overlay.cta;
          const className = `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            cta.variant === "primary"
              ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
              : cta.variant === "secondary"
                ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                : "text-purple-600 hover:text-purple-700 hover:underline"
          }`;
          const inner = (
            <>
              {cta.text}
              {cta.icon && <span>{cta.icon}</span>}
              {!cta.icon && cta.variant !== "ghost" && <span>→</span>}
            </>
          );
          return (
            <div className="pt-1">
              {cta.url ? (
                <a href={cta.url} onClick={onCtaClick} className={className}>
                  {inner}
                </a>
              ) : (
                <button onClick={onCtaClick} className={className}>
                  {inner}
                </button>
              )}
            </div>
          );
        })()}

      {/* Fallback */}
      {overlay.fallback && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
          <p>{overlay.fallback.message}</p>
          {overlay.fallback.alternative && (
            <p className="mt-1 text-purple-600">
              {overlay.fallback.alternative}
            </p>
          )}
          {overlay.fallback.action && (
            <button className="mt-2 text-xs text-purple-600 font-medium hover:underline">
              {overlay.fallback.action}
            </button>
          )}
        </div>
      )}

      {/* Freshness footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <span>🕐</span>
          <span>
            {typeof overlay.freshness.lastUpdated === "string"
              ? new Date(overlay.freshness.lastUpdated).toLocaleDateString()
              : overlay.freshness.lastUpdated.toLocaleDateString()}
          </span>
          <span>· {overlay.freshness.updateFrequency} updates</span>
        </div>
        {overlay.generatedBy === "curated" && (
          <span className="text-purple-500">Hand-curated</span>
        )}
      </div>
    </div>
  );
};
