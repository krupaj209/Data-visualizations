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

  const { chart } = data;
  const spec = chart.spec as unknown as ChartSpec;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          aspectRatio: "16 / 10",
          width: "100%",
          height: "100%",
          maxWidth: "min(100vw, calc(100vh * 16 / 10))",
          maxHeight: "min(100vh, calc(100vw * 10 / 16))",
        }}
      >
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
  );
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
