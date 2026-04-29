import { useEffect } from "react";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { useGetChart } from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import { ChartRenderer } from "@/components/charts";
import { type ChartSpec } from "@/lib/chart-spec";

export default function Embed() {
  const params = useParams<{ id: string }>();
  const idNum = Number(params.id);
  const isValid = !Number.isNaN(idNum) && idNum > 0;
  const { data, isLoading, error } = useGetChart(isValid ? idNum : 0);

  // `?compact=1` strips footer chrome that hosts typically duplicate as bullet
  // copy below the card (insight paragraph, calendar chips), and lowers the
  // height floor so the chart fits short CMS card slots (~320×320).
  const compact = readCompactFlag();

  useEffect(() => {
    document.body.classList.add("embed-mode");
    return () => document.body.classList.remove("embed-mode");
  }, []);

  if (!isValid) {
    return <FullCenter>Invalid chart id.</FullCenter>;
  }
  if (isLoading) {
    return (
      <FullCenter>
        <Loader2 className="animate-spin" color={BRAND.purps} size={20} />
      </FullCenter>
    );
  }
  if (error || !data) {
    return <FullCenter>Chart not found.</FullCenter>;
  }

  const { chart, ce } = data;
  const spec = chart.spec as unknown as ChartSpec;
  const ceName = ce?.name;

  // Fill whatever the host iframe gives us, but enforce a minimum height so
  // the chart never collapses to an unreadable strip when an embedder picks a
  // too-short iframe. Body has `overflow: hidden` in embed mode, so below the
  // floor content is clipped. Default floor (400px) accommodates the chart
  // with the most chrome (seasonal_curve: toggle + bars + months + insight +
  // chips). Compact floor (260px) accommodates just the visualization for
  // hosts that supply their own footer copy.
  const minHeight = compact ? 260 : 400;
  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        background: "white",
        display: "flex",
      }}
    >
      <div
        style={{
          width: "100%",
          minHeight,
          height: "100vh",
          display: "flex",
        }}
      >
        <ChartRenderer
          spec={spec}
          preserve={ceName}
          compact={compact}
          header={{
            title: chart.title,
            subtitle: chart.subtitle || undefined,
            question: chart.question,
            insight: chart.insight || undefined,
          }}
        />
      </div>
    </div>
  );
}

function readCompactFlag(): boolean {
  if (typeof window === "undefined") return false;
  const v = new URLSearchParams(window.location.search).get("compact");
  return v === "1" || v === "true";
}

function FullCenter({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        placeItems: "center",
        background: "white",
        color: BRAND.slate700,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}
