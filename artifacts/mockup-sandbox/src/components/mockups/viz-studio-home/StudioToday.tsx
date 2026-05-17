import React, { useState } from "react";
import {
  BookOpen,
  Palette,
  Sparkles,
  Plus,
  X,
  FileText,
  Clock,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Lock,
  ChevronRight,
  ChevronDown
} from "lucide-react";

// Brand constants duplicated for self-containment
const BRAND = {
  purps: "#8000FF",
  purpsHover: "#6D00E0",
  purpsSoft: "#F3E8FF",
  candy: "#FF0076",
  hola: "#FF9800",
  okayGreen: "#15D876",
  bgShell: "#FAF7FF",
  bgLilac: "#F3E8FF",
  slate950: "#0F0F10",
  slate700: "#666666",
  slate200: "#E6E6E9",
  slate100: "#F0F0F0",
};

const LOGO_URL = "https://cdn-imgix-open.headout.com/logo/svg/Headout_purps.svg";

function HeadoutLogo({ height = 22 }: { height?: number }) {
  return (
    <img
      src={LOGO_URL}
      alt="Headout"
      height={height}
      style={{ height, width: "auto", display: "block" }}
    />
  );
}

const MOCK_QUEUE = [
  {
    id: 1,
    type: "review",
    title: "Review 3 draft charts for Pantheon",
    desc: "Generated yesterday. Needs editorial approval before publish.",
    icon: <Clock size={16} color={BRAND.hola} />,
    iconBg: "#FFF1D9",
    primaryAction: "Review drafts",
    secondaryAction: "Snooze"
  },
  {
    id: 2,
    type: "refresh",
    title: "DRD is 30 days old for Sagrada Família",
    desc: "Information might be outdated. Would you like to re-run the research pipeline?",
    icon: <AlertCircle size={16} color={BRAND.candy} />,
    iconBg: "#FFE4EF",
    primaryAction: "Refresh data",
    secondaryAction: "Dismiss"
  },
  {
    id: 3,
    type: "generate",
    title: "Pitti Palace is in your watchlist",
    desc: "Not yet generated. You added this 2 weeks ago.",
    icon: <Sparkles size={16} color={BRAND.purps} />,
    iconBg: BRAND.purpsSoft,
    primaryAction: "Generate now",
    secondaryAction: "Remove from list"
  },
  {
    id: 4,
    type: "flag",
    title: "Verifier flagged 2 issues on Versailles",
    desc: "Data mismatch in 'Ticket ladder' and 'Wait times'.",
    icon: <AlertCircle size={16} color={BRAND.hola} />,
    iconBg: "#FFF1D9",
    primaryAction: "View issues",
    secondaryAction: "Ignore"
  },
  {
    id: 5,
    type: "analytics",
    title: "Colosseum embed views down 18% vs last week",
    desc: "Consider updating the 'Best time to visit' chart with recent seasonality data.",
    icon: <TrendingDown size={16} color={BRAND.slate700} />,
    iconBg: BRAND.slate100,
    primaryAction: "View analytics",
    secondaryAction: "Dismiss"
  }
];

const MOCK_LIBRARY = [
  { id: 1, name: "Galleria dell'Accademia", city: "Florence", locked: true, charts: 6, status: "published" },
  { id: 2, name: "Galleria degli Uffizi", city: "Florence", locked: true, charts: 5, status: "published" },
  { id: 3, name: "Duomo di Firenze", city: "Florence", locked: true, charts: 7, status: "published" },
  { id: 4, name: "Colosseum", city: "Rome", locked: true, charts: 5, status: "published" },
  { id: 5, name: "Pantheon", city: "Rome", locked: false, charts: 4, status: "draft" },
  { id: 6, name: "Vatican Museums", city: "Vatican City", locked: false, charts: 6, status: "published" },
  { id: 7, name: "Eiffel Tower", city: "Paris", locked: false, charts: 5, status: "published" },
  { id: 8, name: "Louvre Museum", city: "Paris", locked: false, charts: 7, status: "draft" },
  { id: 9, name: "Versailles", city: "Paris", locked: false, charts: 4, status: "published" },
  { id: 10, name: "Sagrada Família", city: "Barcelona", locked: false, charts: 6, status: "published" },
  { id: 11, name: "Park Güell", city: "Barcelona", locked: false, charts: 5, status: "published" },
  { id: 12, name: "Statue of Liberty", city: "New York", locked: false, charts: 4, status: "draft" },
  { id: 13, name: "Empire State Building", city: "New York", locked: false, charts: 5, status: "published" },
  { id: 14, name: "Tower of London", city: "London", locked: false, charts: 4, status: "published" },
  { id: 15, name: "London Eye", city: "London", locked: false, charts: 6, status: "published" },
  { id: 16, name: "British Museum", city: "London", locked: false, charts: 5, status: "draft" },
  { id: 17, name: "Rijksmuseum", city: "Amsterdam", locked: false, charts: 5, status: "published" },
  { id: 18, name: "Van Gogh Museum", city: "Amsterdam", locked: false, charts: 4, status: "published" },
  { id: 19, name: "Anne Frank House", city: "Amsterdam", locked: false, charts: 4, status: "draft" },
];

export function StudioToday() {
  const [showNewPanel, setShowNewPanel] = useState(true); // Default open for mockup
  const [libraryExpanded, setLibraryExpanded] = useState(false);

  return (
    <div
      className="min-h-screen w-full font-['Manrope'] text-sm"
      style={{ background: BRAND.bgShell, color: BRAND.slate950 }}
    >
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(250, 247, 255, 0.85)",
          borderBottom: `1px solid ${BRAND.slate100}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <HeadoutLogo height={22} />
          <div style={{ width: 1, height: 26, background: BRAND.slate200 }} />
          <div className="flex-1 min-w-0">
            <div style={{ fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.01em", fontSize: 16, lineHeight: 1.1 }}>
              Viz Studio
            </div>
            <div style={{ fontSize: 11, color: BRAND.slate700, fontWeight: 600, marginTop: 2 }}>
              AI-generated visuals for listing pages
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "6px 11px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "-0.005em",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer"
              }}
            >
              <BookOpen size={13} strokeWidth={2.5} />
              Question bank
            </button>
            <button
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "6px 11px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "-0.005em",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer"
              }}
            >
              <Palette size={13} strokeWidth={2.5} />
              Style guide
            </button>
            <span
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Internal
            </span>
            <button
              onClick={() => setShowNewPanel(true)}
              style={{
                background: BRAND.purps,
                color: "white",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.005em",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                marginLeft: 8
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              New CE
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 flex gap-10">
        <div className="flex-1 flex flex-col gap-10">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "white",
                  border: `1px solid ${BRAND.slate200}`,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  color: BRAND.slate700,
                }}
              >
                <Calendar size={12} />
                Tuesday, May 17
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: BRAND.slate950,
                  letterSpacing: "-0.02em"
                }}
              >
                Good morning, Aanya
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {MOCK_QUEUE.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-5 bg-white rounded-2xl transition-shadow hover:shadow-sm"
                  style={{
                    border: `1px solid ${BRAND.slate100}`,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: item.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div style={{ fontSize: 15, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.01em" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 13, color: BRAND.slate700, fontWeight: 500, marginTop: 4 }}>
                      {item.desc}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      style={{
                        background: "transparent",
                        color: BRAND.slate700,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderRadius: 8
                      }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {item.secondaryAction}
                    </button>
                    <button
                      style={{
                        background: BRAND.purpsSoft,
                        color: BRAND.purps,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 800,
                        padding: "8px 14px",
                        cursor: "pointer",
                        borderRadius: 8
                      }}
                      className="hover:bg-purple-100 transition-colors"
                    >
                      {item.primaryAction}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div 
              className="flex items-center justify-between py-4 border-b cursor-pointer"
              style={{ borderColor: BRAND.slate200 }}
              onClick={() => setLibraryExpanded(!libraryExpanded)}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>
                  Your library ({MOCK_LIBRARY.length})
                </h2>
                <span
                  className="inline-flex items-center gap-1"
                  style={{
                    background: BRAND.purpsSoft,
                    color: BRAND.purps,
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <Lock size={10} strokeWidth={2.5} />
                  4 curated · locked
                </span>
                <span
                  style={{
                    background: BRAND.bgMint,
                    color: BRAND.okayInk,
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  11 published
                </span>
                <span
                  style={{
                    background: BRAND.holaSoft,
                    color: BRAND.hola,
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  8 drafts
                </span>
                {libraryExpanded ? <ChevronDown size={18} color={BRAND.slate700} /> : <ChevronRight size={18} color={BRAND.slate700} />}
              </div>
              
              {libraryExpanded && (
                <div className="flex items-center gap-2">
                  <button style={{ background: BRAND.purps, color: "white", border: "none", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>All</button>
                  <button style={{ background: "white", color: BRAND.slate700, border: `1px solid ${BRAND.slate200}`, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>Published</button>
                  <button style={{ background: "white", color: BRAND.slate700, border: `1px solid ${BRAND.slate200}`, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>Drafts</button>
                </div>
              )}
            </div>

            {libraryExpanded && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {MOCK_LIBRARY.map(ce => (
                  <div 
                    key={ce.id}
                    className="p-4 bg-white rounded-xl border flex flex-col gap-3 hover:border-purple-300 transition-colors cursor-pointer"
                    style={{ borderColor: BRAND.slate200 }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                        {ce.name}
                      </div>
                      {ce.locked && <Lock size={12} color={BRAND.slate500} className="shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div style={{ fontSize: 11, color: BRAND.slate700, fontWeight: 600 }}>
                        {ce.city} · {ce.charts} charts
                      </div>
                      <div 
                        style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: ce.status === 'published' ? BRAND.okayGreen : BRAND.hola 
                        }} 
                        title={ce.status}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right side panel for "New CE" */}
        {showNewPanel && (
          <div 
            className="w-[380px] shrink-0 bg-white rounded-3xl border flex flex-col sticky top-24 self-start"
            style={{ 
              borderColor: BRAND.slate200,
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
              height: "calc(100vh - 120px)"
            }}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: BRAND.slate100 }}>
              <div className="flex items-center gap-2">
                <div style={{ background: BRAND.purpsSoft, color: BRAND.purps, padding: "4px", borderRadius: 8 }}>
                  <Sparkles size={14} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em" }}>New CE</div>
              </div>
              <button 
                onClick={() => setShowNewPanel(false)}
                style={{ background: "transparent", border: "none", color: BRAND.slate500, cursor: "pointer", padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 12, fontWeight: 800, color: BRAND.slate950 }}>Attraction / experience</label>
                <input 
                  type="text" 
                  placeholder="e.g. Vatican Museums" 
                  className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-purple-500"
                  style={{ borderColor: BRAND.slate200, fontSize: 13, fontWeight: 500 }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: 12, fontWeight: 800, color: BRAND.slate950 }}>City</label>
                  <input 
                    type="text" 
                    placeholder="Vatican City" 
                    className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-purple-500"
                    style={{ borderColor: BRAND.slate200, fontSize: 13, fontWeight: 500 }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: 12, fontWeight: 800, color: BRAND.slate950 }}>Country</label>
                  <input 
                    type="text" 
                    placeholder="Vatican City" 
                    className="w-full px-3 py-2.5 rounded-xl border outline-none focus:border-purple-500"
                    style={{ borderColor: BRAND.slate200, fontSize: 13, fontWeight: 500 }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  style={{
                    alignSelf: "flex-start",
                    background: "transparent",
                    color: BRAND.purps,
                    border: `1px dashed ${BRAND.purps}`,
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <FileText size={14} />
                  Attach DRD (optional)
                </button>
              </div>
            </div>

            <div className="p-5 border-t" style={{ borderColor: BRAND.slate100 }}>
              <button
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 transition active:scale-[.98]"
                style={{
                  background: BRAND.purps,
                  color: "white",
                  fontWeight: 800,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Sparkles size={16} strokeWidth={2.5} />
                Generate visualization set
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
