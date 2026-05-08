import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { useGetChart } from "@workspace/api-client-react";
import { BRAND } from "@/lib/brand";
import { ChartRenderer } from "@/components/charts";
import { FeedbackButton } from "@/components/FeedbackButton";
import { type ChartSpec } from "@/lib/chart-spec";

/**
 * Hysteresis bounds for auto-compact. Below ENTER, chrome doesn't fit and we
 * flip into compact mode; above EXIT we restore default chrome. The 20px gap
 * prevents flicker when a host iframe is animated/resized near the boundary.
 *
 * Empirical break-even is ~340px: the largest chart with full chrome
 * (seasonal_curve: ESTIMATED pill + subtitle + Crowds/Weather/Price toggle +
 * bars + months + insight paragraph + calendar chips) needs at least that to
 * render every label without crowding or clipping.
 */
const COMPACT_ENTER_PX = 330;
const COMPACT_EXIT_PX = 350;

export default function Embed() {
  const params = useParams<{ id: string }>();
  const idNum = Number(params.id);
  const isValid = !Number.isNaN(idNum) && idNum > 0;
  const { data, isLoading, error } = useGetChart(isValid ? idNum : 0);

  // `?compact=1|0` is an explicit override. `compact=1` always uses
  // chart-only chrome; `compact=0` always shows full chrome (even in tiny
  // iframes — embedder takes responsibility for sizing). When the flag is
  // absent we auto-detect based on the rendered viewport height.
  const explicit = readExplicitCompact();
  const auto = useAutoCompact();
  const compact = explicit ?? auto;
  // `?studio=1` is set by Studio-internal links so internal staff can leave
  // feedback while previewing. Public CMS iframes never carry it, so the
  // hosted-on-the-listing-page experience stays clean.
  const studio = readStudioFlag();

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

  // No height floor: the host iframe is the source of truth on size. The
  // chart components use container-query-based clamps and adapt to whatever
  // box they're given. When the box is short, `compact` auto-flips on (see
  // useAutoCompact) to drop chrome that would otherwise crowd or clip.
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "white",
        display: "flex",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
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
      {studio && (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 60,
          }}
        >
          <FeedbackButton chartId={chart.id} ceSlug={ce?.slug} />
        </div>
      )}
    </div>
  );
}

function readStudioFlag(): boolean {
  if (typeof window === "undefined") return false;
  const v = new URLSearchParams(window.location.search).get("studio");
  return v === "1" || v === "true";
}

/**
 * Returns true when the URL explicitly sets `compact=1|true`, false when it
 * sets `compact=0|false`, and null when the flag is absent.
 */
function readExplicitCompact(): boolean | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("compact");
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return null;
}

/**
 * Tracks the document's viewport height and returns true when the rendered
 * iframe is shorter than the threshold below which default chrome would
 * crowd or clip the visualization. Uses ENTER/EXIT hysteresis so a host
 * iframe animating across the boundary doesn't flicker.
 */
function useAutoCompact(): boolean {
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerHeight < COMPACT_ENTER_PX;
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const evaluate = () => {
      const h = window.innerHeight;
      setCompact((prev) => {
        if (prev) {
          // Currently compact — stay compact until clearly above EXIT.
          return h <= COMPACT_EXIT_PX;
        }
        // Currently default — flip to compact only below ENTER.
        return h < COMPACT_ENTER_PX;
      });
    };
    const onResize = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return compact;
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
