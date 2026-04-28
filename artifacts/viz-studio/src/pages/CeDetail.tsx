import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  useGetCe,
  useRegenerateCe,
  getGetCeQueryKey,
  getListCesQueryKey,
  type Chart,
} from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import { ChartRenderer, CHART_TYPE_META } from "@/components/charts";
import { type ChartSpec } from "@/lib/chart-spec";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export default function CeDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { data, isLoading, error } = useGetCe(slug);
  const regenMut = useRegenerateCe();
  const qc = useQueryClient();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" color={BRAND.purps} size={28} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p style={{ color: BRAND.slate700, fontWeight: 600 }}>
          CE not found.
        </p>
        <Link
          href="/"
          style={{
            color: BRAND.purps,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Back to library
        </Link>
      </div>
    );
  }

  const { ce, charts } = data;

  return (
    <div className="min-h-screen" style={{ background: BRAND.bgShell }}>
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(250, 247, 255, 0.85)",
          borderBottom: `1px solid ${BRAND.slate100}`,
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/"
            style={{
              color: BRAND.slate700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <ArrowLeft size={16} />
            Library
          </Link>
          <span style={{ color: BRAND.slate300 }}>/</span>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span style={{ fontSize: 22 }}>{ce.emoji}</span>
            <div className="min-w-0">
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: BRAND.slate950,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {ce.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: BRAND.slate700,
                }}
              >
                {ce.city}, {ce.country} · {charts.length} charts
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (
                !confirm(
                  "Replace these charts with a freshly generated set? The current ones will be discarded.",
                )
              )
                return;
              await regenMut.mutateAsync({ slug });
              qc.invalidateQueries({ queryKey: getGetCeQueryKey(slug) });
              qc.invalidateQueries({ queryKey: getListCesQueryKey() });
            }}
            disabled={regenMut.isPending}
            style={{
              background: regenMut.isPending ? BRAND.slate100 : "white",
              color: BRAND.slate950,
              border: `1px solid ${BRAND.slate200}`,
              padding: "8px 14px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 12,
              cursor: regenMut.isPending ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {regenMut.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Regenerate
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {ce.summary && (
          <p
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: BRAND.slate700,
              maxWidth: 820,
              lineHeight: 1.5,
              marginBottom: 28,
            }}
          >
            {ce.summary}
          </p>
        )}

        <div className="flex flex-col gap-12">
          {charts.map((chart) => (
            <ChartRow key={chart.id} chart={chart} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ChartRow({ chart }: { chart: Chart }) {
  const spec = chart.spec as unknown as ChartSpec;
  const meta = CHART_TYPE_META[spec.type] ?? {
    label: spec.type,
    emoji: "📈",
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <div
            className="inline-flex items-center gap-1.5"
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: BRAND.purps,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>{meta.emoji}</span>
            {meta.label}
          </div>
          <h3
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: BRAND.slate950,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              maxWidth: 720,
            }}
          >
            {chart.question}
          </h3>
        </div>
        <EmbedActions chartId={chart.id} />
      </div>

      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: BRAND.slate100,
          padding: 0,
        }}
      >
        <div className="aspect-1610 w-full">
          <ChartRenderer
            spec={spec}
            header={{
              title: chart.title,
              subtitle: chart.subtitle || undefined,
              question: chart.question,
              insight: chart.insight || undefined,
            }}
          />
        </div>
      </div>
    </section>
  );
}

function EmbedActions({ chartId }: { chartId: number }) {
  const embedPath = `${BASE}/embed/${chartId}`;
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${embedPath}`
      : embedPath;
  const iframe = `<iframe src="${fullUrl}" width="800" height="500" style="border:0;border-radius:24px" loading="lazy" allowfullscreen></iframe>`;

  const [copied, setCopied] = useState<"url" | "iframe" | null>(null);
  function copy(text: string, kind: "url" | "iframe") {
    navigator.clipboard?.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => copy(fullUrl, "url")}
        style={{
          background: copied === "url" ? BRAND.bgMint : "white",
          color: copied === "url" ? "#0E8F4E" : BRAND.slate950,
          border: `1px solid ${BRAND.slate200}`,
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {copied === "url" ? <Check size={14} /> : <Copy size={14} />}
        {copied === "url" ? "Copied" : "Copy URL"}
      </button>
      <button
        type="button"
        onClick={() => copy(iframe, "iframe")}
        style={{
          background: copied === "iframe" ? BRAND.bgMint : "white",
          color: copied === "iframe" ? "#0E8F4E" : BRAND.slate950,
          border: `1px solid ${BRAND.slate200}`,
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {copied === "iframe" ? <Check size={14} /> : <Code2 size={14} />}
        {copied === "iframe" ? "Copied" : "Copy iframe"}
      </button>
      <a
        href={embedPath}
        target="_blank"
        rel="noreferrer"
        style={{
          background: BRAND.purps,
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <ExternalLink size={14} />
        Open
      </a>
    </div>
  );
}
