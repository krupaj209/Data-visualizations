import { type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, Palette } from "lucide-react";
import { HeadoutLogo } from "@/components/HeadoutLogo";
import {
  ACCENT_FG,
  ACCENT_SOFT,
  BRAND,
  LEVEL_FILL,
  LEVEL_FILL_SOFT,
  LEVEL_LABEL,
  type LevelKey,
} from "@/lib/brand";
import {
  CALLOUT_PILL,
  CHART_GRID,
  CHART_LAYOUT,
  CHART_TOOLTIP_TOKENS,
  CHART_TYPE,
} from "@/lib/chart-system";
import {
  CalloutPill,
  ChartTooltip,
  Legend,
  LegendItem,
} from "@/components/charts/system";

export default function StyleGuide() {
  return (
    <div className="min-h-screen w-full" style={{ background: BRAND.bgShell }}>
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">
        <Intro />

        <Section
          eyebrow="Rule #1"
          title="Soft default, vivid on callout"
          caption="Every chart reads as a calm field of muted tones. Only the bar / dot / band that wears an explicit callout pill saturates to the brand accent. Two bars, same data — left uses the default soft fill, right is the same bar promoted to a callout."
        >
          <SoftVsVividDemo />
          <Aside>
            Use <Code>getLevelFill(level, isCallout)</Code> for weekly bars,{" "}
            <Code>pickFill(key, isCallout, soft, vivid)</Code> for any other
            soft / vivid pair, or <Code>SEASON_FILL / SEASON_FILL_ACCENT</Code>{" "}
            for monthly bars (SEASON_FILL is the soft default; SEASON_FILL_ACCENT
            is the saturated callout companion). Never hand-pick a vivid color
            for a non-callout bar.
          </Aside>
        </Section>

        <Section
          eyebrow="Primitive"
          title="CalloutPill"
          caption='One pill shape for every "Busiest", "Sweet spot", "Best weather", "Peak", or "Quietest" callout across the system. Pill-rounded (radius 999), shared padding, shared callout type token. Pair the soft accent background with the vivid accent foreground.'
        >
          <Row>
            <CalloutPill bg={ACCENT_SOFT.candy} fg={ACCENT_FG.candy}>
              Busiest
            </CalloutPill>
            <CalloutPill bg={ACCENT_SOFT.okay} fg={ACCENT_FG.okay}>
              Sweet spot
            </CalloutPill>
            <CalloutPill bg={ACCENT_SOFT.purps} fg={ACCENT_FG.purps}>
              Peak
            </CalloutPill>
            <CalloutPill bg={ACCENT_SOFT.hola} fg={ACCENT_FG.hola}>
              Best weather
            </CalloutPill>
            <CalloutPill bg={ACCENT_SOFT.slate} fg={ACCENT_FG.slate}>
              Closed
            </CalloutPill>
            <CalloutPill bg="white" fg={ACCENT_FG.purps} bordered>
              Bordered variant
            </CalloutPill>
          </Row>
          <Aside>
            Reach for <Code>{"<CalloutPill>"}</Code> by default. If the pill
            needs to animate position (e.g. SeasonalCurve's traveling chip),
            use the <Code>CALLOUT_PILL</Code> tokens directly inside a{" "}
            <Code>motion.div</Code> wrapper so the visual rhyme is preserved.
          </Aside>
        </Section>

        <Section
          eyebrow="Primitive"
          title="ChartTooltip"
          caption="One slate-900 surface for every hover / focus tooltip. Owns the edge-clamp behavior so callers don't have to re-derive it: anchors near the left or right plot edge fold inward instead of spilling outside the card."
        >
          <TooltipDemo />
          <Aside>
            Pass <Code>anchorXPct</Code> (0–100) so the tooltip clamps at the
            edges. For tooltips below the anchor, set{" "}
            <Code>placement="below"</Code>. Pointer events are off by design —
            hover state belongs to the chart, not the tooltip.
          </Aside>
        </Section>

        <Section
          eyebrow="Primitive"
          title="Legend"
          caption="Horizontal legend rail with three swatch shapes. Square is the default and matches the rhythm of a filled cell inside a heatmap or bar; dot pairs with line / curve charts; bar pairs with stacked-bar legends."
        >
          <LegendDemo />
          <Aside>
            Pass <Code>withDivider</Code> when the legend sits directly under
            an open plot. Skip it when the chart already has a divider line
            (e.g. between bars and category labels) so we don't double-stripe.
          </Aside>
        </Section>

        <Section
          eyebrow="Tokens"
          title="Typography scale"
          caption="Every text role inside a chart has a named token in CHART_TYPE. Sizes are clamp() expressions that scale with the chart card's container width via container queries. If you find yourself reaching for a custom font size, add a token instead."
        >
          <TypographyTable />
        </Section>

        <Section
          eyebrow="Tokens"
          title="Layout, tooltip, and gridline"
          caption="Shared insets so charts compose the same way. When a chart uses both a header strip and an x-axis strip, the plot SVG sits between them at the same offsets across the entire deck."
        >
          <TokenGrid />
        </Section>

        <Section
          eyebrow="Wrapper"
          title="ChartCard"
          caption="Every chart sits inside a ChartCard. It owns the white surface, soft shadow, ESTIMATED pill, and — critically — declares containerType: inline-size so the type tokens above can scale with the card's width."
        >
          <Aside>
            Use <Code>{'pillTone="purps" | "candy" | "okay" | "hola"'}</Code>{" "}
            to match the chart's accent. Pass <Code>compact</Code> for embed
            mode, which drops the ESTIMATED pill and tightens outer padding so
            the visualization gets every available pixel.
          </Aside>
        </Section>

        <Section
          eyebrow="Don'ts"
          title="Three patterns to avoid"
          caption="The chart system is small on purpose. These are the drift patterns that have crept back into the deck before — when you spot one, the answer is almost always a token in chart-system.ts or brand.ts."
        >
          <DontList />
        </Section>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur"
      style={{
        background: "rgba(250, 247, 255, 0.85)",
        borderBottom: `1px solid ${BRAND.slate100}`,
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
        <HeadoutLogo height={22} />
        <div
          style={{ width: 1, height: 26, background: BRAND.slate200 }}
        />
        <div className="flex-1 min-w-0">
          <div
            style={{
              fontWeight: 800,
              color: BRAND.slate950,
              letterSpacing: "-0.01em",
              fontSize: 16,
              lineHeight: 1.1,
            }}
          >
            Chart system style guide
          </div>
          <div
            style={{
              fontSize: 11,
              color: BRAND.slate700,
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            The shared design language every Viz Studio chart inherits
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5"
          style={{
            color: BRAND.purps,
            background: BRAND.purpsSoft,
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} strokeWidth={2.5} /> Back to library
        </Link>
      </div>
    </header>
  );
}

function Intro() {
  return (
    <div
      className="rounded-3xl p-7"
      style={{
        background: "white",
        border: `1px solid ${BRAND.slate100}`,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="inline-flex items-center gap-1.5 rounded-full"
        style={{
          background: BRAND.purpsSoft,
          color: BRAND.purps,
          padding: "5px 10px",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <Palette size={12} strokeWidth={2.5} />
        Reference
      </div>
      <h1
        className="mt-3"
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: BRAND.slate950,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        Two charts placed side-by-side should rhyme.
      </h1>
      <p
        className="mt-3"
        style={{
          color: BRAND.slate700,
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.55,
          maxWidth: 640,
        }}
      >
        Same axis-tick size. Same callout pill shape. Same tooltip rectangle.
        Same legend swatch. Same color rhythm. This page is the visible
        reference for those decisions — when in doubt, copy what you see here
        instead of adding a one-off. The tokens live in{" "}
        <Code>lib/chart-system.ts</Code> and the primitives in{" "}
        <Code>components/charts/system/</Code>.
      </p>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  caption,
  children,
}: {
  eyebrow: string;
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-3xl p-7"
      style={{
        background: "white",
        border: `1px solid ${BRAND.slate100}`,
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: BRAND.purps,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <h2
        className="mt-2"
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: BRAND.slate950,
          letterSpacing: "-0.015em",
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      <p
        className="mt-2"
        style={{
          color: BRAND.slate700,
          fontSize: 13.5,
          fontWeight: 500,
          lineHeight: 1.55,
          maxWidth: 720,
        }}
      >
        {caption}
      </p>
      <div className="mt-6 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}

function Aside({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        background: BRAND.bgLilac,
        color: BRAND.slate900,
        fontSize: 12.5,
        fontWeight: 500,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        background: BRAND.slate100,
        color: BRAND.slate950,
        padding: "1px 6px",
        borderRadius: 4,
        fontSize: "0.92em",
        fontWeight: 700,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      {children}
    </code>
  );
}

/* ---------- Soft vs vivid demo ---------- */

const DEMO_DAYS: Array<{ label: string; level: LevelKey; score: number }> = [
  { label: "Mon", level: "quiet", score: 0.42 },
  { label: "Tue", level: "quiet", score: 0.38 },
  { label: "Wed", level: "quietest", score: 0.28 },
  { label: "Thu", level: "busy", score: 0.62 },
  { label: "Fri", level: "busy", score: 0.74 },
  { label: "Sat", level: "busiest", score: 0.94 },
  { label: "Sun", level: "busy", score: 0.7 },
];

function SoftVsVividDemo() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <DemoBars title="Soft default" calloutLabel={null} />
      <DemoBars title='Same data, "Saturday" promoted to callout' calloutLabel="Sat" />
    </div>
  );
}

function DemoBars({
  title,
  calloutLabel,
}: {
  title: string;
  calloutLabel: string | null;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: BRAND.slate50,
        border: `1px solid ${BRAND.slate100}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: BRAND.slate700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        className="mt-4 flex items-end gap-2"
        style={{ height: 130, position: "relative" }}
      >
        {DEMO_DAYS.map((d) => {
          const isCallout = calloutLabel === d.label;
          const fill =
            d.level === "closed"
              ? "transparent"
              : isCallout
                ? LEVEL_FILL[d.level]
                : LEVEL_FILL_SOFT[d.level];
          const h = Math.max(8, d.score * 110);
          return (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              <div
                style={{
                  width: "100%",
                  height: h,
                  background: fill,
                  borderRadius: 6,
                  position: "relative",
                }}
              >
                {isCallout && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginBottom: 6,
                    }}
                  >
                    <CalloutPill
                      bg={ACCENT_SOFT.candy}
                      fg={ACCENT_FG.candy}
                    >
                      Busiest
                    </CalloutPill>
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: BRAND.slate700,
                }}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="mt-3"
        style={{
          fontSize: 11.5,
          color: BRAND.slate700,
          fontWeight: 500,
          lineHeight: 1.45,
        }}
      >
        {calloutLabel === null
          ? "Calm field. The viewer's eye is free to scan."
          : "One bar saturates. The callout earns the attention."}
      </div>
    </div>
  );
}

/* ---------- Tooltip edge-clamp demo ---------- */

function TooltipDemo() {
  const anchors = [
    { x: 6, label: "Anchored at 6% — folds left" },
    { x: 50, label: "Anchored at 50% — centered" },
    { x: 94, label: "Anchored at 94% — folds right" },
  ];
  return (
    <div className="flex flex-col gap-6">
      {anchors.map((a) => (
        <div
          key={a.x}
          className="rounded-2xl"
          style={{
            background: BRAND.slate50,
            border: `1px solid ${BRAND.slate100}`,
            padding: "44px 16px 16px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "relative",
              height: 16,
              background: BRAND.slate100,
              borderRadius: 999,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: `${a.x}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: BRAND.purps,
                border: "2px solid white",
                boxShadow: "0 0 0 2px rgba(128,0,255,0.18)",
              }}
            />
            <div style={{ position: "absolute", left: `${a.x}%`, top: -8 }}>
              <ChartTooltip anchorXPct={a.x} placement="above">
                Sample value · 12
              </ChartTooltip>
            </div>
          </div>
          <div
            className="mt-2"
            style={{
              fontSize: 11.5,
              color: BRAND.slate700,
              fontWeight: 600,
            }}
          >
            {a.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Legend demo ---------- */

function LegendDemo() {
  const levels: LevelKey[] = ["quietest", "quiet", "busy", "busiest"];
  return (
    <div className="flex flex-col gap-5">
      <LegendBlock title="Square (default) — heatmap / bar legends">
        <Legend>
          {levels.map((l) => (
            <LegendItem
              key={l}
              color={LEVEL_FILL_SOFT[l]}
              label={LEVEL_LABEL[l]}
            />
          ))}
        </Legend>
      </LegendBlock>
      <LegendBlock title="Dot — line / curve legends">
        <Legend>
          <LegendItem
            color={BRAND.purps}
            label="Tribune density"
            shape="dot"
          />
          <LegendItem
            color={BRAND.candy}
            label="Peak focus"
            shape="dot"
            active
          />
        </Legend>
      </LegendBlock>
      <LegendBlock title="Bar — stacked-bar legends, with divider">
        <Legend withDivider>
          <LegendItem color={BRAND.okayGreen} label="Quiet" shape="bar" />
          <LegendItem color={BRAND.hola} label="Busy" shape="bar" />
          <LegendItem color={BRAND.candy} label="Peak" shape="bar" />
        </Legend>
      </LegendBlock>
    </div>
  );
}

function LegendBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: BRAND.slate50,
        border: `1px solid ${BRAND.slate100}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: BRAND.slate700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/* ---------- Typography table ---------- */

interface TypeSpec {
  fontSize: string;
  fontWeight: number;
  color?: string;
}

const TYPE_ROWS: Array<{ token: string; sample: string; spec: TypeSpec }> = [
  { token: "context", sample: "Wed, Apr 29 · last 90 days", spec: CHART_TYPE.context },
  { token: "axisTick", sample: "9am  10am  11am", spec: CHART_TYPE.axisTick },
  { token: "catLabel", sample: "Mon  Tue  Wed", spec: CHART_TYPE.catLabel },
  { token: "dotLabel", sample: "12", spec: CHART_TYPE.dotLabel },
  { token: "callout", sample: "Busiest", spec: CHART_TYPE.callout },
  { token: "tooltip", sample: "Sample value · 12", spec: CHART_TYPE.tooltip },
  { token: "legend", sample: "Quietest  Quiet  Busy", spec: CHART_TYPE.legend },
  { token: "captionPill", sample: "Opens 8:15am · Last entry 6:20pm", spec: CHART_TYPE.captionPill },
];

function TypographyTable() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: BRAND.slate50,
        border: `1px solid ${BRAND.slate100}`,
        containerType: "inline-size",
      }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: "180px 1fr",
        }}
      >
        <Cell head>Token</Cell>
        <Cell head>Sample</Cell>
        {TYPE_ROWS.map((r) => (
          <RowPair key={r.token}>
            <Cell>
              <Code>CHART_TYPE.{r.token}</Code>
            </Cell>
            <Cell>
              <span
                style={{
                  fontSize: r.spec.fontSize,
                  fontWeight: r.spec.fontWeight,
                  color:
                    "color" in r.spec && r.spec.color
                      ? r.spec.color
                      : BRAND.slate950,
                }}
              >
                {r.sample}
              </span>
            </Cell>
          </RowPair>
        ))}
      </div>
    </div>
  );
}

function RowPair({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function Cell({
  children,
  head = false,
}: {
  children: ReactNode;
  head?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderTop: head ? "none" : `1px solid ${BRAND.slate100}`,
        background: head ? "white" : "transparent",
        fontSize: head ? 10 : 13,
        fontWeight: head ? 800 : 500,
        color: head ? BRAND.slate700 : BRAND.slate950,
        letterSpacing: head ? "0.06em" : undefined,
        textTransform: head ? "uppercase" : undefined,
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

/* ---------- Token grid (layout + tooltip + grid) ---------- */

function TokenGrid() {
  const layoutRows = [
    ["headerStripPx", `${CHART_LAYOUT.headerStripPx}px`, "Top strip reserved for pills / zone labels"],
    ["xAxisStripPx", `${CHART_LAYOUT.xAxisStripPx}px`, "Gap between plot and the x-axis tick row"],
    ["plotInsetX", `${CHART_LAYOUT.plotInsetX}px`, "Horizontal inset so dots / labels don't kiss the edge"],
    ["yAxisColPx", `${CHART_LAYOUT.yAxisColPx}px`, "Width of the y-axis tick column"],
    ["pillHeadroomPx", `${CHART_LAYOUT.pillHeadroomPx}px`, "Headroom above bars for the called-out pill"],
    ["detailGapPx", `${CHART_LAYOUT.detailGapPx}px`, "Standard gap above the focused / locked detail panel"],
  ];
  const tooltipRows = [
    ["bg", CHART_TOOLTIP_TOKENS.bg, "Slate-900 surface for every tooltip"],
    ["fg", CHART_TOOLTIP_TOKENS.fg, "White text"],
    [
      "padding",
      `${CHART_TOOLTIP_TOKENS.paddingY}px / ${CHART_TOOLTIP_TOKENS.paddingX}px`,
      "Vertical / horizontal padding",
    ],
    ["radius", `${CHART_TOOLTIP_TOKENS.radius}px`, "Corner radius"],
  ];
  const pillRows = [
    [
      "padding",
      `${CALLOUT_PILL.paddingY}px / ${CALLOUT_PILL.paddingX}px`,
      "Vertical / horizontal padding",
    ],
    ["radius", `${CALLOUT_PILL.radius}`, "Pill-rounded — never square"],
  ];
  const gridRows = [
    ["stroke", CHART_GRID.stroke, "Slate-100, the only gridline color we use"],
    [
      "strokeWidth",
      `${CHART_GRID.strokeWidth}`,
      "Whisper-thin so the data, not the rulings, dominates",
    ],
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <TokenCard title="CHART_LAYOUT" rows={layoutRows} />
      <TokenCard title="CHART_TOOLTIP_TOKENS" rows={tooltipRows} />
      <TokenCard title="CALLOUT_PILL" rows={pillRows} />
      <TokenCard title="CHART_GRID" rows={gridRows} />
    </div>
  );
}

function TokenCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<readonly [string, string, string]> | string[][];
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: BRAND.slate50,
        border: `1px solid ${BRAND.slate100}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: BRAND.slate700,
          letterSpacing: "0.04em",
        }}
      >
        <Code>{title}</Code>
      </div>
      <div className="mt-3 flex flex-col">
        {rows.map((r, i) => (
          <div
            key={r[0]}
            className="flex items-baseline gap-3 py-1.5"
            style={{
              borderTop:
                i === 0 ? "none" : `1px solid ${BRAND.slate100}`,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: BRAND.slate950,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                minWidth: 110,
              }}
            >
              {r[0]}
            </span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: BRAND.purps,
                minWidth: 70,
              }}
            >
              {r[1]}
            </span>
            <span
              style={{
                fontSize: 11.5,
                color: BRAND.slate700,
                fontWeight: 500,
              }}
            >
              {r[2]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Don'ts ---------- */

function DontList() {
  const items = [
    {
      bad: "Hand-picking a vivid color for a non-callout bar",
      good: "Let getLevelFill / pickFill choose. Saturated bars without a pill are visual noise.",
    },
    {
      bad: "A custom font size or weight inside a chart component",
      good: "Add a token to CHART_TYPE so the next chart inherits the same scale.",
    },
    {
      bad: "Anchoring a tooltip with raw left: 50% near a plot edge",
      good: "Pass anchorXPct to <ChartTooltip> so it folds inward instead of cropping.",
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <div
          key={it.bad}
          className="rounded-2xl p-4 grid sm:grid-cols-2 gap-3"
          style={{
            background: BRAND.slate50,
            border: `1px solid ${BRAND.slate100}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: BRAND.candy,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Don't
            </div>
            <div
              className="mt-1"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.slate950,
                lineHeight: 1.4,
              }}
            >
              {it.bad}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: BRAND.okayInk,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Do
            </div>
            <div
              className="mt-1"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.slate950,
                lineHeight: 1.4,
              }}
            >
              {it.good}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
