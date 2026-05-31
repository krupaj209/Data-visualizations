import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  Keyboard,
  LayoutDashboard,
  LifeBuoy,
  RefreshCw,
  Sparkles,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import { HeadoutLogo } from "@/components/HeadoutLogo";
import { BRAND } from "@/lib/brand";
import { KEYBOARD_SHORTCUTS } from "@/lib/keyboard-shortcuts";
import {
  CHART_ARCHETYPES,
  PAGE_TEMPLATES,
  QUESTION_BUNDLES,
  type ChartArchetypeId,
  type PageType,
} from "@workspace/question-bank";
import { ChartRenderer } from "@/components/charts";
import { ARCHETYPE_SAMPLES } from "@/lib/archetype-samples";
import {
  PRESENTATION_REGISTRY,
  PALETTE_LABELS,
  DIRECTION_LABELS,
  DENSITY_LABELS,
} from "@/lib/presentation";
import { resetTour } from "@/components/SpotlightTour";
import { EVIDENCE_TYPE_LABELS, EVIDENCE_TYPE_DESCRIPTIONS } from "@/lib/evidence-type-labels";

export default function Guide() {
  const [tourRestarted, setTourRestarted] = useState(false);

  function handleRestartTour() {
    resetTour();
    setTourRestarted(true);
    setTimeout(() => { window.location.href = "/"; }, 800);
  }

  return (
    <div className="min-h-screen w-full" style={{ background: BRAND.bgShell }}>
      <Header onRestartTour={handleRestartTour} tourRestarted={tourRestarted} />
      <main className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8">
        <HeroCard />
        <SectionLibrary />
        <SectionCeAnatomy />
        <SectionIntelPanel />
        <SectionRegenerating />
        <SectionEmbedding />
        <SectionShortcuts />
        <SectionArchetypes />
        <SectionPageTemplates />
        <SectionEvidenceGlossary />
        <SectionPresentationMatrix />
      </main>
    </div>
  );
}

function Header({ onRestartTour, tourRestarted }: { onRestartTour: () => void; tourRestarted: boolean }) {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur"
      style={{ background: "rgba(250,247,255,0.88)", borderBottom: `1px solid ${BRAND.slate100}` }}
    >
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
        <HeadoutLogo height={22} />
        <div style={{ width: 1, height: 26, background: BRAND.slate200 }} />
        <div className="flex-1 min-w-0">
          <div style={{ fontWeight: 800, color: BRAND.slate950, fontSize: 16, letterSpacing: "-0.01em" }}>
            Guide
          </div>
          <div style={{ fontSize: 11, color: BRAND.slate700, fontWeight: 600, marginTop: 2 }}>
            Everything you need to use Viz Studio
          </div>
        </div>
        <button
          type="button"
          onClick={onRestartTour}
          disabled={tourRestarted}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: tourRestarted ? BRAND.bgMint : BRAND.purpsSoft,
            color: tourRestarted ? BRAND.okayInk : BRAND.purps,
            border: "none",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 800,
            cursor: tourRestarted ? "default" : "pointer",
            letterSpacing: "-0.005em",
          }}
        >
          <RotateCcw size={12} strokeWidth={2.5} />
          {tourRestarted ? "Tour restarting…" : "Restart tour"}
        </button>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: BRAND.slate100,
            color: BRAND.slate700,
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={12} strokeWidth={2.5} /> Back to library
        </Link>
      </div>
    </header>
  );
}

function HeroCard() {
  return (
    <div
      className="rounded-3xl p-7"
      style={{ background: BRAND.purps, boxShadow: "0 4px 24px rgba(128,0,255,0.22)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 8 }}>
          <LifeBuoy size={22} color="white" strokeWidth={2} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Reference
        </span>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "white", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 10 }}>
        Viz Studio user guide
      </h1>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: 500, lineHeight: 1.55, maxWidth: 560 }}>
        This guide explains the tool's layout, features, and editorial concepts. The data-driven
        sections at the bottom auto-update whenever the underlying registries change.
      </p>
    </div>
  );
}

/* ---------- STATIC NARRATIVE SECTIONS ---------- */

function GuideSection({ icon, eyebrow, title, children }: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl p-7" style={{ background: "white", border: `1px solid ${BRAND.slate100}`, boxShadow: "var(--shadow-soft)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ background: BRAND.purpsSoft, borderRadius: 8, padding: 7, color: BRAND.purps }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: BRAND.purps, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {eyebrow}
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.015em", lineHeight: 1.1 }}>
            {title}
          </h2>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5, color: BRAND.slate700, fontWeight: 500, lineHeight: 1.6 }}>
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: BRAND.slate900, fontWeight: 700 }}>{children}</strong>;
}

function Pill({ children, color = BRAND.purps }: { children: React.ReactNode; color?: string }) {
  const soft = color === BRAND.purps ? BRAND.purpsSoft : color === BRAND.candy ? BRAND.candySoft : BRAND.holaSoft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", background: soft, color, borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 800, letterSpacing: "0.01em" }}>
      {children}
    </span>
  );
}

function GuideList({ items }: { items: { term: React.ReactNode; def: string }[] }) {
  return (
    <dl style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map(({ term, def }, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "baseline" }}>
          <dt style={{ fontWeight: 800, color: BRAND.slate900, fontSize: 13 }}>{term}</dt>
          <dd style={{ margin: 0 }}>{def}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionLibrary() {
  return (
    <GuideSection icon={<LayoutDashboard size={16} strokeWidth={2.5} />} eyebrow="The library" title="Home page overview">
      <P>
        The home page shows every CE (Combined Entity — an attraction like the Vatican Museums or Eiffel Tower) your team has created.
        Each card shows the CE name, city, and a status badge.
      </P>
      <GuideList items={[
        { term: <><Pill>Published</Pill> status</>, def: "All charts in this deck have been approved and are ready for the CMS." },
        { term: <><Pill color={BRAND.hola}>Draft</Pill> status</>, def: "One or more charts are still drafts — review and publish them before embedding." },
        { term: "Empty", def: "No charts yet. Use the Create panel on the left to generate a first deck." },
      ]} />
      <P>
        To create a new CE, type the attraction name in the <B>Create panel</B> on the left side of the home page.
        You can optionally add a city and country for accuracy, then click <B>Create CE</B>. The AI will fetch the DRD and generate a full chart deck.
      </P>
    </GuideSection>
  );
}

function SectionCeAnatomy() {
  return (
    <GuideSection icon={<BarChart3 size={16} strokeWidth={2.5} />} eyebrow="Inside a CE" title="Chart card anatomy">
      <P>
        Each chart card has several layers of information layered around the visualization itself.
        Understanding each element helps you decide what action to take.
      </P>
      <GuideList items={[
        { term: "ESTIMATED pill", def: "The chart contains AI-estimated values. Check the fact table below the visualization before publishing — look for low-confidence entries." },
        { term: "Confidence pill", def: "How closely the AI's data matched its grounding sources. Low confidence is a signal to manually verify the numbers before publishing." },
        { term: "Verifier notes", def: "A second AI read the DRD and challenged specific claims. Notes appear as warnings — they don't block publishing, but they're worth a quick read." },
        { term: "Fact table", def: "Every numeric value in the chart appears here with its source and confidence score. Green = verified, amber = estimated, red = weak evidence." },
        { term: "Evidence chips", def: "Coloured chips on each fact show the type of evidence (visitor tip, authoritative fact, etc.). See the Evidence glossary below for definitions." },
        { term: "Editorial verdict", def: "Charts proposed by the Intel panel carry a Ship / Hold / Cut badge. Ship = strong evidence; Hold = partial; Cut = too generic or CE-specific evidence missing." },
        { term: "Bundle ID chip", def: "A purple chip showing which question bundle selected this chart, and why. Hover for the visitor intent it serves." },
      ]} />
      <P>
        Use <B>J</B> and <B>K</B> to navigate between cards. Press <B>P</B> to publish the focused card,
        <B> E</B> to expand it to full-size, or <B>F</B> to leave feedback.
      </P>
    </GuideSection>
  );
}

function SectionIntelPanel() {
  return (
    <GuideSection icon={<Sparkles size={16} strokeWidth={2.5} />} eyebrow="The Intel panel" title="Understanding Intel">
      <P>
        The Intel panel (opened from the sidebar tabs in CE detail) shows what the AI found about the attraction and which charts it recommends.
      </P>
      <GuideList items={[
        { term: "Recommended", def: "Ideas the AI scored highly on usefulness, CE specificity, visual fit, and conversion value. These are strong candidates to add to the deck." },
        { term: "Rejected", def: "Ideas the AI considered but cut — usually because evidence was too thin or the chart wouldn't be specific enough to this attraction." },
        { term: "Search more", def: 'Run a targeted re-check on a rejected idea. The AI looks for missing evidence across its sources. If it finds enough, the idea is promoted to "Recommended with a \'Found by recheck\' badge."' },
        { term: "Evidence chips", def: "Each fact in the panel has a type chip (mint background). These show the category of evidence — see the glossary below." },
        { term: "Quality score axes", def: "Seven axes (traveler usefulness, evidence strength, uniqueness, visual fit, CE specificity, CMS value, verifier risk) score each recommendation. Expand 'Why this score' to see the breakdown." },
      ]} />
    </GuideSection>
  );
}

function SectionRegenerating() {
  return (
    <GuideSection icon={<RefreshCw size={16} strokeWidth={2.5} />} eyebrow="Regenerating" title="When and how to regenerate">
      <P>
        The <B>Regenerate</B> button rebuilds the entire chart deck from scratch for a given page type.
        Use it when the current deck is significantly off — wrong charts, stale data, or you've changed the page type.
      </P>
      <P>
        <B>Regenerate vs. edit manually:</B> Regenerate is a full replacement (draft rows only — published charts survive).
        If just one chart needs fixing, use the edit icon on that card instead.
        If you want to try a new chart idea without committing, use the Ideas panel or the <B>+ Add chart</B> button.
      </P>
      <GuideList items={[
        { term: "Page-type selector", def: "Changes which question bundles the AI uses to pick charts. 'Plan your visit' asks crowd/timing/duration questions. 'Skip the line' focuses on entry logistics and queue risk. You can switch and regenerate as many times as needed." },
        { term: "Feedback note", def: "Tell the AI what to improve before regenerating. Be specific: 'The seasonal chart doesn't reflect the summer peak' is more useful than 'fix the charts'." },
        { term: "Keep / replace writer charts", def: "Charts you added manually (via '+ Add chart') can be kept or replaced during regen. Pipeline-generated drafts are always replaced." },
        { term: "Published charts", def: "Regeneration never touches published charts. Only draft rows are replaced." },
      ]} />
    </GuideSection>
  );
}

function SectionEmbedding() {
  return (
    <GuideSection icon={<Code2 size={16} strokeWidth={2.5} />} eyebrow="Embedding" title="Copying embed URLs for the CMS">
      <P>
        Each chart has an embed URL that the CMS pastes into an iframe. The URL is stable — it won't change if
        you edit presentation settings.
      </P>
      <P>
        Copy it from the <B>Copy iframe URL</B> button on any chart card, or from the Presentation panel
        at the bottom of the card.
      </P>
      <GuideList items={[
        { term: "Default chrome", def: "Full chart with header (ESTIMATED pill, title, subtitle), insight paragraph, legend, and axis labels. Best for iframes ≥ 340px tall." },
        { term: "?compact=1", def: "Strips the header and secondary chrome. The visualization fills the entire iframe. Best for small embeds or sidebar widgets." },
        { term: "?palette=mono", def: "Switches to a neutral monochrome colour set — useful when the page already has strong colour." },
        { term: "?direction=low_bad", def: "Flips the colour ramp on quantitative charts so high values read as 'good' (e.g. booking-window charts where more lead time = safer)." },
        { term: "?emphasis=mon", def: "Highlights a specific element with a brand-colour ring (e.g. Monday on a weekly-pattern chart). Chart-type specific — see the Presentation matrix below." },
      ]} />
      <div className="rounded-2xl p-4" style={{ background: BRAND.slate950, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 }}>
        <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>CMS snippet</div>
        <div style={{ color: "#A5B4FC" }}>{"<iframe"}</div>
        <div style={{ color: "#86EFAC", paddingLeft: 16 }}>{'  src="https://<host>/studio/embed/<chartId>"'}</div>
        <div style={{ color: "#A5B4FC", paddingLeft: 16 }}>{'  frameborder="0"'}</div>
        <div style={{ color: "#A5B4FC" }}>{">"}</div>
        <div style={{ color: "#A5B4FC" }}>{"</iframe>"}</div>
      </div>
    </GuideSection>
  );
}

/* ---------- DATA-DRIVEN SECTIONS ---------- */

function SectionShortcuts() {
  return (
    <section className="rounded-3xl p-7" style={{ background: "white", border: `1px solid ${BRAND.slate100}`, boxShadow: "var(--shadow-soft)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ background: BRAND.purpsSoft, borderRadius: 8, padding: 7, color: BRAND.purps }}>
          <Keyboard size={16} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: BRAND.purps, letterSpacing: "0.08em", textTransform: "uppercase" }}>Auto-updated</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.015em" }}>Keyboard shortcuts</h2>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: BRAND.slate500, fontWeight: 600 }}>
          CE Detail page · not active in inputs
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", fontSize: 11, fontWeight: 800, color: BRAND.slate500, letterSpacing: "0.06em", textTransform: "uppercase", paddingBottom: 8, borderBottom: `1px solid ${BRAND.slate100}` }}>Key</th>
            <th style={{ textAlign: "left", fontSize: 11, fontWeight: 800, color: BRAND.slate500, letterSpacing: "0.06em", textTransform: "uppercase", paddingBottom: 8, borderBottom: `1px solid ${BRAND.slate100}`, paddingLeft: 16 }}>Action</th>
            <th style={{ textAlign: "left", fontSize: 11, fontWeight: 800, color: BRAND.slate500, letterSpacing: "0.06em", textTransform: "uppercase", paddingBottom: 8, borderBottom: `1px solid ${BRAND.slate100}`, paddingLeft: 16 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {KEYBOARD_SHORTCUTS.map((s, i) => (
            <tr key={s.key} style={{ borderBottom: i < KEYBOARD_SHORTCUTS.length - 1 ? `1px solid ${BRAND.slate100}` : undefined }}>
              <td style={{ padding: "10px 0" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: `1px solid ${BRAND.slate200}`,
                  background: BRAND.slate50,
                  color: BRAND.slate950,
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  boxShadow: "0 2px 0 rgba(0,0,0,0.06)",
                }}>
                  {s.key}
                </span>
              </td>
              <td style={{ padding: "10px 0 10px 16px", fontSize: 13.5, fontWeight: 700, color: BRAND.slate900 }}>{s.label}</td>
              <td style={{ padding: "10px 0 10px 16px", fontSize: 13, color: BRAND.slate700, fontWeight: 500 }}>{s.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SectionArchetypes() {
  const archetypes = Object.values(CHART_ARCHETYPES).filter((a) => a.implemented);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="rounded-3xl p-7" style={{ background: "white", border: `1px solid ${BRAND.slate100}`, boxShadow: "var(--shadow-soft)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ background: BRAND.purpsSoft, borderRadius: 8, padding: 7, color: BRAND.purps }}>
          <BarChart3 size={16} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: BRAND.purps, letterSpacing: "0.08em", textTransform: "uppercase" }}>Auto-updated</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.015em" }}>Chart archetypes</h2>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: BRAND.slate500, fontWeight: 600 }}>
          {archetypes.length} implemented
        </div>
      </div>
      <p style={{ fontSize: 13, color: BRAND.slate700, marginBottom: 16, fontWeight: 500 }}>
        These are the chart types Viz Studio can generate today. Click a row to see what visitor question it answers and what data shape it expects.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {archetypes.map((a) => (
          <div key={a.id}>
            <button
              type="button"
              onClick={() => setExpanded(expanded === a.id ? null : a.id)}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: expanded === a.id ? BRAND.bgLilac : "transparent",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                transition: "background 120ms",
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700, color: BRAND.slate900, flex: 1 }}>{a.label}</span>
              <span style={{ fontSize: 12, color: BRAND.slate500, fontWeight: 500, fontFamily: "ui-monospace, Menlo, monospace" }}>{a.id}</span>
              {expanded === a.id ? <ChevronDown size={14} color={BRAND.purps} /> : <ChevronRight size={14} color={BRAND.slate500} />}
            </button>
            {expanded === a.id && (
              <div style={{ padding: "8px 12px 16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Chart preview */}
                {(() => {
                  const sample = ARCHETYPE_SAMPLES[a.id as ChartArchetypeId] ?? null;
                  return (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: BRAND.slate500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                        Sample preview
                      </div>
                      <div
                        style={{
                          border: `1px solid ${BRAND.slate100}`,
                          borderRadius: 10,
                          background: BRAND.slate50,
                          overflow: "hidden",
                          height: 210,
                          display: "flex",
                          alignItems: "stretch",
                        }}
                      >
                        {sample ? (
                          <div style={{ width: "100%" }}>
                            <ChartRenderer
                              spec={sample}
                              header={{ title: a.label, subtitle: "Example", question: a.label }}
                              compact
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              color: BRAND.slate500,
                              fontSize: 11,
                              fontWeight: 600,
                              textAlign: "center",
                              padding: 16,
                              lineHeight: 1.5,
                            }}
                          >
                            Preview coming soon — generate a chart for a<br />CE to see this archetype in action.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: BRAND.slate500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Answers</div>
                  <div style={{ fontSize: 13, color: BRAND.slate700, fontWeight: 500 }}>{a.answers}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: BRAND.slate500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Data shape</div>
                  <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 2 }}>
                    {a.data_shape.map((d, i) => (
                      <li key={i} style={{ fontSize: 12.5, color: BRAND.slate700, fontWeight: 500 }}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionPageTemplates() {
  const templates = Object.values(PAGE_TEMPLATES);
  return (
    <section className="rounded-3xl p-7" style={{ background: "white", border: `1px solid ${BRAND.slate100}`, boxShadow: "var(--shadow-soft)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ background: BRAND.purpsSoft, borderRadius: 8, padding: 7, color: BRAND.purps }}>
          <LayoutDashboard size={16} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: BRAND.purps, letterSpacing: "0.08em", textTransform: "uppercase" }}>Auto-updated</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.015em" }}>Page templates</h2>
        </div>
      </div>
      <p style={{ fontSize: 13, color: BRAND.slate700, marginBottom: 16, fontWeight: 500 }}>
        Each listing-page template defines which question bundles the AI draws from and in what order. Selecting a template before Regenerate changes which charts get built.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {templates.map((t) => (
          <div key={t.id} style={{ borderRadius: 12, border: `1px solid ${BRAND.slate100}`, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: BRAND.slate950 }}>{t.label}</span>
              <span style={{ fontSize: 11, color: BRAND.slate500, fontFamily: "ui-monospace, Menlo, monospace" }}>{t.id}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: BRAND.slate500, fontWeight: 600 }}>{t.minCharts}–{t.maxCharts} charts</span>
            </div>
            <p style={{ fontSize: 12.5, color: BRAND.slate700, fontWeight: 500, marginBottom: 10 }}>{t.narrative}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {t.slots.map((slot, i) => {
                const label = slot.forcedArchetype
                  ? slot.forcedArchetype
                  : slot.bundleId
                    ? (QUESTION_BUNDLES[slot.bundleId]?.label ?? slot.bundleId)
                    : "—";
                const isRequired = !!slot.required;
                return (
                  <span key={i} style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: isRequired ? BRAND.purpsSoft : BRAND.slate50,
                    color: isRequired ? BRAND.purps : BRAND.slate700,
                    border: `1px solid ${isRequired ? BRAND.bgLilac : BRAND.slate200}`,
                    borderRadius: 999,
                    padding: "3px 9px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {slot.forcedArchetype && <span style={{ fontSize: 10 }}>★</span>}
                    {label}
                    {isRequired && <span style={{ fontSize: 9, opacity: 0.7 }}>required</span>}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionEvidenceGlossary() {
  return (
    <section className="rounded-3xl p-7" style={{ background: "white", border: `1px solid ${BRAND.slate100}`, boxShadow: "var(--shadow-soft)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ background: BRAND.purpsSoft, borderRadius: 8, padding: 7, color: BRAND.purps }}>
          <BookOpen size={16} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: BRAND.purps, letterSpacing: "0.08em", textTransform: "uppercase" }}>Auto-updated</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.015em" }}>Evidence type glossary</h2>
        </div>
      </div>
      <p style={{ fontSize: 13, color: BRAND.slate700, marginBottom: 16, fontWeight: 500 }}>
        Every fact surfaced by the Intel panel carries one of these evidence type labels.
        They tell you where the data came from and how much to trust it.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(EVIDENCE_TYPE_LABELS).map(([key, label]) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, alignItems: "baseline", borderBottom: `1px solid ${BRAND.slate100}`, paddingBottom: 8 }}>
            <div>
              <span style={{
                display: "inline-flex",
                background: BRAND.bgMint,
                color: BRAND.okayInk,
                borderRadius: 999,
                padding: "2px 9px",
                fontSize: 11,
                fontWeight: 700,
              }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: 13, color: BRAND.slate700, fontWeight: 500 }}>
              {EVIDENCE_TYPE_DESCRIPTIONS[key] ?? ""}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionPresentationMatrix() {
  const entries = Object.entries(PRESENTATION_REGISTRY).filter(([, opts]) => opts != null) as [string, NonNullable<typeof PRESENTATION_REGISTRY[string]>][];

  return (
    <section className="rounded-3xl p-7" style={{ background: "white", border: `1px solid ${BRAND.slate100}`, boxShadow: "var(--shadow-soft)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ background: BRAND.purpsSoft, borderRadius: 8, padding: 7, color: BRAND.purps }}>
          <ExternalLink size={16} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: BRAND.purps, letterSpacing: "0.08em", textTransform: "uppercase" }}>Auto-updated</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.015em" }}>Presentation options matrix</h2>
        </div>
      </div>
      <p style={{ fontSize: 13, color: BRAND.slate700, marginBottom: 16, fontWeight: 500 }}>
        Presentation overrides let you re-skin a chart without re-calling the AI. These can be set via the Presentation panel in CE Detail, or via URL params on the embed.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${BRAND.slate100}` }}>
              {["Chart type", "Palettes", "Views", "Direction", "Density", "Emphasis"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 800, color: BRAND.slate500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 10px 8px 0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(([chartType, opts], i) => (
              <tr key={chartType} style={{ borderBottom: i < entries.length - 1 ? `1px solid ${BRAND.slate100}` : undefined }}>
                <td style={{ padding: "9px 10px 9px 0", fontFamily: "ui-monospace, Menlo, monospace", color: BRAND.purps, fontWeight: 700 }}>{chartType}</td>
                <td style={{ padding: "9px 10px 9px 0", color: BRAND.slate700 }}>
                  {opts.palettes.map((p) => PALETTE_LABELS[p] ?? p).join(", ")}
                </td>
                <td style={{ padding: "9px 10px 9px 0", color: BRAND.slate700 }}>
                  {opts.views.length > 0 ? opts.views.map((v) => v.label).join(", ") : <span style={{ color: BRAND.slate300 }}>—</span>}
                </td>
                <td style={{ padding: "9px 10px 9px 0" }}>
                  {opts.supportsDirection ? <span style={{ color: BRAND.okayInk, fontWeight: 700 }}>✓</span> : <span style={{ color: BRAND.slate300 }}>—</span>}
                </td>
                <td style={{ padding: "9px 10px 9px 0" }}>
                  {opts.supportsDensity ? <span style={{ color: BRAND.okayInk, fontWeight: 700 }}>✓</span> : <span style={{ color: BRAND.slate300 }}>—</span>}
                </td>
                <td style={{ padding: "9px 10px 9px 0", color: BRAND.slate700 }}>
                  {opts.emphasisLabel ?? <span style={{ color: BRAND.slate300 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
