import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Compass,
  FileText,
  Globe2,
  Loader2,
  Lock,
  MapPin,
  MapPinOff,
  Palette,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

const BRAND = {
  purps: "#8000FF",
  purpsHover: "#6D00E0",
  purpsSoft: "#F3E8FF",
  candy: "#FF0076",
  hola: "#FF9800",
  holaSoft: "#FFF1D9",
  okayGreen: "#15D876",
  okayInk: "#0E8F4E",
  bgShell: "#FAF7FF",
  bgLilac: "#F3E8FF",
  bgMint: "#D2FDEB",
  slate950: "#0F0F10",
  slate700: "#666666",
  slate500: "#A6A6A6",
  slate300: "#D0D0D0",
  slate200: "#E6E6E9",
  slate100: "#F0F0F0",
};

interface CE {
  id: string;
  name: string;
  chartCount: number;
  publishedCount: number;
  draftCount: number;
  curated: boolean;
}

interface City {
  id: string;
  name: string;
  country: string;
  colorChip: string;
  mapPos: { x: number; y: number };
  ces: CE[];
}

const MOCK_DATA: City[] = [
  {
    id: "florence",
    name: "Florence",
    country: "Italy",
    colorChip: "#8000FF",
    mapPos: { x: 52, y: 38 },
    ces: [
      { id: "c1", name: "Galleria dell'Accademia", chartCount: 6, publishedCount: 6, draftCount: 0, curated: true },
      { id: "c2", name: "Galleria degli Uffizi", chartCount: 7, publishedCount: 7, draftCount: 0, curated: true },
      { id: "c3", name: "Duomo di Firenze", chartCount: 5, publishedCount: 5, draftCount: 0, curated: true },
      { id: "c4", name: "Palazzo Vecchio", chartCount: 4, publishedCount: 2, draftCount: 2, curated: false },
    ],
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    colorChip: "#FF0076",
    mapPos: { x: 54, y: 42 },
    ces: [
      { id: "c5", name: "Colosseum", chartCount: 6, publishedCount: 6, draftCount: 0, curated: true },
      { id: "c6", name: "Pantheon", chartCount: 4, publishedCount: 1, draftCount: 3, curated: false },
      { id: "c7", name: "Trevi Fountain", chartCount: 3, publishedCount: 3, draftCount: 0, curated: false },
    ],
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    colorChip: "#15D876",
    mapPos: { x: 45, y: 30 },
    ces: [
      { id: "c8", name: "Eiffel Tower", chartCount: 6, publishedCount: 4, draftCount: 2, curated: false },
      { id: "c9", name: "Louvre Museum", chartCount: 5, publishedCount: 5, draftCount: 0, curated: false },
      { id: "c10", name: "Seine River Cruise", chartCount: 4, publishedCount: 0, draftCount: 4, curated: false },
    ],
  },
  {
    id: "barcelona",
    name: "Barcelona",
    country: "Spain",
    colorChip: "#FF9800",
    mapPos: { x: 42, y: 40 },
    ces: [
      { id: "c11", name: "Sagrada Família", chartCount: 5, publishedCount: 4, draftCount: 1, curated: false },
      { id: "c12", name: "Park Güell", chartCount: 4, publishedCount: 4, draftCount: 0, curated: false },
    ],
  },
  {
    id: "nyc",
    name: "New York",
    country: "USA",
    colorChip: "#00B4D8",
    mapPos: { x: 22, y: 35 },
    ces: [
      { id: "c13", name: "Statue of Liberty", chartCount: 6, publishedCount: 6, draftCount: 0, curated: false },
      { id: "c14", name: "Empire State Building", chartCount: 5, publishedCount: 3, draftCount: 2, curated: false },
    ],
  },
  {
    id: "vatican",
    name: "Vatican City",
    country: "Vatican City",
    colorChip: "#FFD700",
    mapPos: { x: 53.5, y: 42.5 },
    ces: [
      { id: "c15", name: "Vatican Museums", chartCount: 7, publishedCount: 5, draftCount: 2, curated: false },
      { id: "c16", name: "St. Peter's Basilica", chartCount: 4, publishedCount: 4, draftCount: 0, curated: false },
    ],
  },
  {
    id: "london",
    name: "London",
    country: "UK",
    colorChip: "#E63946",
    mapPos: { x: 43, y: 25 },
    ces: [
      { id: "c17", name: "Tower of London", chartCount: 5, publishedCount: 3, draftCount: 2, curated: false },
      { id: "c18", name: "British Museum", chartCount: 4, publishedCount: 2, draftCount: 2, curated: false },
    ],
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    colorChip: "#F4A261",
    mapPos: { x: 47, y: 24 },
    ces: [
      { id: "c19", name: "Rijksmuseum", chartCount: 4, publishedCount: 4, draftCount: 0, curated: false },
    ],
  },
];

export function Atlas() {
  const [activeCityId, setActiveCityId] = useState<string>("florence");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [drdText, setDrdText] = useState("");

  const activeCity = MOCK_DATA.find((c) => c.id === activeCityId) || MOCK_DATA[0];

  const totalCities = MOCK_DATA.length;
  const totalCes = MOCK_DATA.reduce((acc, c) => acc + c.ces.length, 0);
  const totalCurated = MOCK_DATA.reduce(
    (acc, c) => acc + c.ces.filter((ce) => ce.curated).length,
    0
  );
  const totalDrafts = MOCK_DATA.reduce(
    (acc, c) => acc + c.ces.reduce((sum, ce) => sum + ce.draftCount, 0),
    0
  );

  return (
    <div className="min-h-screen w-full font-['Manrope'] flex flex-col" style={{ background: BRAND.bgShell }}>
      {/* HEADER */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(250, 247, 255, 0.85)",
          borderBottom: `1px solid ${BRAND.slate100}`,
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Logo — match Home.tsx Headout wordmark */}
            <div className="flex items-center gap-3">
              <span
                style={{
                  fontFamily: "Manrope, sans-serif",
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: "-0.03em",
                  color: BRAND.purps,
                  lineHeight: 1,
                }}
              >
                headout
              </span>
              <div style={{ width: 1, height: 26, background: BRAND.slate200 }} />
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
                  Viz Studio
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: BRAND.slate700,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  AI-generated visuals for listing pages
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[11px] font-[800] text-slate-500 mr-4 tracking-wide uppercase">
              <span>{totalCities} cities</span>
              <span className="text-slate-300">•</span>
              <span>{totalCes} CEs</span>
              <span className="text-slate-300">•</span>
              <span style={{ color: BRAND.purps }}>{totalCurated} curated</span>
              <span className="text-slate-300">•</span>
              <span style={{ color: BRAND.hola }}>{totalDrafts} drafts</span>
            </div>

            <button
              className="inline-flex items-center gap-1.5"
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "6px 11px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "-0.005em",
              }}
            >
              <BookOpen size={13} strokeWidth={2.5} />
              Question bank
            </button>
            <button
              className="inline-flex items-center gap-1.5"
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "6px 11px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "-0.005em",
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
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col max-w-[1280px] mx-auto w-full px-6 py-8 gap-8">
        
        <div className="flex flex-col lg:flex-row gap-8 items-stretch h-[540px]">
          {/* ATLAS LEFT */}
          <div
            className="flex-1 rounded-3xl relative overflow-hidden flex flex-col shadow-sm"
            style={{
              background: "#ffffff",
              border: `1px solid ${BRAND.slate100}`,
            }}
          >
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
              backgroundImage: `radial-gradient(${BRAND.purps} 1.5px, transparent 1.5px)`,
              backgroundSize: '24px 24px'
            }} />
            
            <div className="p-6 relative z-10 flex items-center gap-2">
              <Compass size={18} color={BRAND.purps} />
              <h2 style={{ fontSize: 18, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.01em" }}>
                Global Coverage
              </h2>
            </div>

            {/* MAP STAGE */}
            <div className="flex-1 relative w-full h-full">
              {MOCK_DATA.map((city) => {
                const isActive = city.id === activeCityId;
                const size = 16 + city.ces.length * 4;
                return (
                  <button
                    key={city.id}
                    onClick={() => { setActiveCityId(city.id); setShowAddForm(false); }}
                    className="absolute group hover:scale-110 transition-transform origin-bottom"
                    style={{
                      left: `${city.mapPos.x}%`,
                      top: `${city.mapPos.y}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div className={`text-[11px] font-[800] mb-1 px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${isActive ? 'bg-slate-900 text-white' : 'bg-white/80 text-slate-700 backdrop-blur group-hover:bg-slate-100'}`} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        {city.name}
                      </div>
                      <div
                        className="rounded-full shadow-md flex items-center justify-center text-white font-bold"
                        style={{
                          width: size,
                          height: size,
                          background: isActive ? BRAND.purps : BRAND.purpsSoft,
                          color: isActive ? '#fff' : BRAND.purps,
                          border: `2px solid ${isActive ? '#fff' : BRAND.purps}`,
                          fontSize: 10,
                          zIndex: isActive ? 20 : 10,
                        }}
                      >
                        {city.ces.length}
                      </div>
                      <div className="w-0.5 h-3" style={{ background: isActive ? BRAND.purps : BRAND.purpsSoft }} />
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? BRAND.purps : BRAND.purpsSoft }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* DETAIL PANEL RIGHT */}
          <div
            className="w-[420px] rounded-3xl flex flex-col bg-white shadow-sm overflow-hidden"
            style={{
              border: `1px solid ${BRAND.slate100}`,
            }}
          >
            <div className="p-6 pb-4 border-b border-slate-100 relative">
              {activeCity.ces.some(c => c.curated) && (
                <div className="absolute top-6 right-6 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: BRAND.purpsSoft, color: BRAND.purps, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <Lock size={12} strokeWidth={2.5} />
                  Curated Cluster
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full" style={{ background: activeCity.colorChip }} />
                {activeCity.country}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                {activeCity.name}
              </h1>
              <p className="mt-2 text-[13px] font-[500] text-slate-600">
                {activeCity.ces.length} attractions · {activeCity.ces.reduce((sum, c) => sum + c.draftCount, 0)} drafts · {activeCity.ces.reduce((sum, c) => sum + c.publishedCount, 0)} published
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-1">
                {activeCity.ces.map((ce) => (
                  <div
                    key={ce.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: BRAND.bgShell }}>
                        {ce.curated ? <Lock size={14} color={BRAND.purps} /> : <MapPin size={14} color={BRAND.slate500} />}
                      </div>
                      <div>
                        <div className="text-[14px] font-[800] text-slate-900 leading-tight group-hover:text-[#8000FF] transition-colors">{ce.name}</div>
                        <div className="text-[11px] font-[600] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{ce.chartCount} charts</span>
                          {ce.draftCount > 0 && (
                            <>
                              <span>•</span>
                              <span style={{ color: BRAND.hola }}>{ce.draftCount} draft</span>
                            </>
                          )}
                          {ce.publishedCount > 0 && (
                            <>
                              <span>•</span>
                              <span style={{ color: BRAND.okayGreen }}>{ce.publishedCount} live</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-purps transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-transform active:scale-[0.98]"
                  style={{
                    background: "white",
                    border: `1px dashed ${BRAND.slate300}`,
                    color: BRAND.slate700,
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  <Plus size={16} />
                  Add an attraction in {activeCity.name}
                </button>
              ) : (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[12px] font-[800] text-slate-900 uppercase tracking-widest">New {activeCity.name} CE</div>
                    <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
                  </div>
                  <input
                    type="text"
                    placeholder="Attraction name (e.g. Uffizi Gallery)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] font-[500] text-slate-900 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#8000FF] mb-3"
                  />
                  <textarea
                    placeholder="Paste DRD markdown (optional)..."
                    value={drdText}
                    onChange={(e) => setDrdText(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-[12px] font-[500] text-slate-900 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#8000FF] mb-3 resize-none"
                  />
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-transform active:scale-[0.98]"
                    style={{
                      background: BRAND.purps,
                      color: "white",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    <Sparkles size={14} />
                    Generate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CLUSTERS TRAY */}
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: BRAND.slate700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            City Clusters
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
            {MOCK_DATA.map((city) => {
              const isActive = city.id === activeCityId;
              const hasDrafts = city.ces.some(c => c.draftCount > 0);
              
              return (
                <button
                  key={city.id}
                  onClick={() => { setActiveCityId(city.id); setShowAddForm(false); }}
                  className="flex-shrink-0 flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer text-left"
                  style={{
                    width: 200,
                    background: isActive ? "white" : "transparent",
                    border: `1px solid ${isActive ? BRAND.purps : BRAND.slate200}`,
                    boxShadow: isActive ? "0 4px 12px rgba(128,0,255,0.08)" : "none",
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: city.colorChip + '15' }}>
                    <MapPin size={18} color={city.colorChip} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-[800] text-slate-900 truncate">
                      {city.name}
                    </div>
                    <div className="text-[11px] font-[600] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      {city.ces.length} CEs
                      {hasDrafts && (
                        <>
                          <span className="w-1 h-1 rounded-full" style={{ background: BRAND.hola }} />
                          <span style={{ color: BRAND.hola }}>Drafts</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
