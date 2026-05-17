import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Command,
  FileText,
  Filter,
  LayoutGrid,
  Lock,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
  AlertCircle
} from "lucide-react";

// Headout Brand Colors
const BRAND = {
  purps: "#8000FF",
  purpsHover: "#6D00E0",
  purpsSoft: "#F3E8FF",
  candy: "#FF0076",
  hola: "#FF9800",
  holaSoft: "#FFF1D9",
  okayGreen: "#15D876",
  bgMint: "#D2FDEB",
  bgShell: "#FAF7FF",
  bgLilac: "#F3E8FF",
  slate950: "#0F0F10",
  slate700: "#666666",
  slate500: "#A6A6A6",
  slate300: "#D0D0D0",
  slate200: "#E6E6E9",
  slate100: "#F0F0F0",
  slate50: "#F8F8F8",
  okayInk: "#0E8F4E",
};

// Mock Data
type CEStatus = "locked" | "published" | "draft" | "stale";

interface MockCE {
  id: string;
  name: string;
  city: string;
  country: string;
  status: CEStatus;
  draftCount: number;
  publishedCount: number;
  drdAgeDays: number | null;
  lastGenerated: string;
  writer: string;
  isRecent?: boolean;
}

const MOCK_CES: MockCE[] = [
  {
    id: "ce-01",
    name: "Galleria dell'Accademia",
    city: "Florence",
    country: "Italy",
    status: "locked",
    draftCount: 0,
    publishedCount: 5,
    drdAgeDays: 4,
    lastGenerated: "2 hours ago",
    writer: "JD",
    isRecent: true,
  },
  {
    id: "ce-02",
    name: "Galleria degli Uffizi",
    city: "Florence",
    country: "Italy",
    status: "locked",
    draftCount: 1,
    publishedCount: 4,
    drdAgeDays: 12,
    lastGenerated: "5 hours ago",
    writer: "JD",
    isRecent: true,
  },
  {
    id: "ce-03",
    name: "Duomo di Firenze",
    city: "Florence",
    country: "Italy",
    status: "locked",
    draftCount: 0,
    publishedCount: 6,
    drdAgeDays: 8,
    lastGenerated: "1 day ago",
    writer: "AL",
    isRecent: true,
  },
  {
    id: "ce-04",
    name: "Colosseum",
    city: "Rome",
    country: "Italy",
    status: "locked",
    draftCount: 0,
    publishedCount: 7,
    drdAgeDays: 2,
    lastGenerated: "2 days ago",
    writer: "MK",
  },
  {
    id: "ce-05",
    name: "Vatican Museums",
    city: "Vatican City",
    country: "Vatican City",
    status: "published",
    draftCount: 2,
    publishedCount: 5,
    drdAgeDays: 15,
    lastGenerated: "3 days ago",
    writer: "JD",
    isRecent: true,
  },
  {
    id: "ce-06",
    name: "Eiffel Tower",
    city: "Paris",
    country: "France",
    status: "stale",
    draftCount: 0,
    publishedCount: 4,
    drdAgeDays: 45,
    lastGenerated: "2 months ago",
    writer: "AL",
  },
  {
    id: "ce-07",
    name: "Louvre Museum",
    city: "Paris",
    country: "France",
    status: "published",
    draftCount: 0,
    publishedCount: 6,
    drdAgeDays: 5,
    lastGenerated: "1 week ago",
    writer: "AL",
  },
  {
    id: "ce-08",
    name: "Sagrada Família",
    city: "Barcelona",
    country: "Spain",
    status: "draft",
    draftCount: 5,
    publishedCount: 0,
    drdAgeDays: 1,
    lastGenerated: "10 mins ago",
    writer: "MK",
  },
  {
    id: "ce-09",
    name: "Park Güell",
    city: "Barcelona",
    country: "Spain",
    status: "draft",
    draftCount: 4,
    publishedCount: 1,
    drdAgeDays: 2,
    lastGenerated: "1 hour ago",
    writer: "MK",
  },
  {
    id: "ce-10",
    name: "Casa Batlló",
    city: "Barcelona",
    country: "Spain",
    status: "published",
    draftCount: 0,
    publishedCount: 4,
    drdAgeDays: 20,
    lastGenerated: "3 weeks ago",
    writer: "JD",
  },
  {
    id: "ce-11",
    name: "Statue of Liberty",
    city: "New York",
    country: "USA",
    status: "published",
    draftCount: 1,
    publishedCount: 5,
    drdAgeDays: 8,
    lastGenerated: "5 days ago",
    writer: "AL",
  },
  {
    id: "ce-12",
    name: "Empire State Building",
    city: "New York",
    country: "USA",
    status: "stale",
    draftCount: 0,
    publishedCount: 4,
    drdAgeDays: 60,
    lastGenerated: "3 months ago",
    writer: "AL",
  },
  {
    id: "ce-13",
    name: "Tower of London",
    city: "London",
    country: "UK",
    status: "published",
    draftCount: 0,
    publishedCount: 5,
    drdAgeDays: 14,
    lastGenerated: "2 weeks ago",
    writer: "MK",
  },
  {
    id: "ce-14",
    name: "London Eye",
    city: "London",
    country: "UK",
    status: "published",
    draftCount: 2,
    publishedCount: 3,
    drdAgeDays: 10,
    lastGenerated: "1 week ago",
    writer: "MK",
  },
  {
    id: "ce-15",
    name: "Van Gogh Museum",
    city: "Amsterdam",
    country: "Netherlands",
    status: "draft",
    draftCount: 4,
    publishedCount: 0,
    drdAgeDays: null,
    lastGenerated: "Never",
    writer: "JD",
  },
  {
    id: "ce-16",
    name: "Rijksmuseum",
    city: "Amsterdam",
    country: "Netherlands",
    status: "draft",
    draftCount: 6,
    publishedCount: 0,
    drdAgeDays: 1,
    lastGenerated: "Just now",
    writer: "JD",
  },
  {
    id: "ce-17",
    name: "Pantheon",
    city: "Rome",
    country: "Italy",
    status: "stale",
    draftCount: 0,
    publishedCount: 4,
    drdAgeDays: 90,
    lastGenerated: "4 months ago",
    writer: "AL",
  },
  {
    id: "ce-18",
    name: "Roman Forum",
    city: "Rome",
    country: "Italy",
    status: "published",
    draftCount: 1,
    publishedCount: 3,
    drdAgeDays: 25,
    lastGenerated: "1 month ago",
    writer: "MK",
  },
  {
    id: "ce-19",
    name: "Borghese Gallery",
    city: "Rome",
    country: "Italy",
    status: "draft",
    draftCount: 5,
    publishedCount: 0,
    drdAgeDays: null,
    lastGenerated: "Never",
    writer: "JD",
  },
];

const LOGO_URL = "https://cdn-imgix-open.headout.com/logo/svg/Headout_purps.svg";

export function Workbench() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);

  const filteredCEs = useMemo(() => {
    let result = MOCK_CES;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (ce) =>
          ce.name.toLowerCase().includes(q) ||
          ce.city.toLowerCase().includes(q) ||
          ce.country.toLowerCase().includes(q)
      );
    }
    if (filter === "curated") result = result.filter((ce) => ce.status === "locked");
    else if (filter === "published") result = result.filter((ce) => ce.publishedCount > 0);
    else if (filter === "drafts") result = result.filter((ce) => ce.draftCount > 0);
    else if (filter === "no-drd") result = result.filter((ce) => ce.drdAgeDays === null);
    else if (filter === "florence") result = result.filter((ce) => ce.city === "Florence");

    return result;
  }, [search, filter]);

  const recentCEs = MOCK_CES.filter((ce) => ce.isRecent);

  return (
    <div className="min-h-screen w-full font-['Manrope'] text-sm" style={{ background: BRAND.bgShell }}>
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "rgba(250, 247, 255, 0.85)",
          borderBottom: `1px solid ${BRAND.slate200}`,
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-4">
          <img src={LOGO_URL} alt="Headout" height={20} style={{ height: 20 }} />
          <div style={{ width: 1, height: 20, background: BRAND.slate300 }} />
          <div className="flex-1 flex items-center gap-4">
            <div style={{ fontWeight: 800, color: BRAND.slate950, letterSpacing: "-0.01em", fontSize: 14 }}>
              Viz Studio
            </div>
            <div style={{ fontSize: 12, color: BRAND.slate500, fontWeight: 600 }}>
              AI-generated visuals
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5"
              style={{
                background: BRAND.purpsSoft,
                color: BRAND.purps,
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
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
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <Palette size={13} strokeWidth={2.5} />
              Style guide
            </button>
            <span
              style={{
                background: BRAND.slate200,
                color: BRAND.slate700,
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

      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {/* Command Bar */}
        <div className="mb-8 relative z-30">
          <div
            className="flex items-center bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ border: `1px solid ${BRAND.slate200}` }}
          >
            <div className="pl-4 flex-shrink-0 text-slate-400">
              <Search size={18} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your library or type to add a new CE..."
              className="flex-1 bg-transparent border-none outline-none py-3.5 px-3 text-sm font-semibold placeholder:text-slate-400"
              style={{ color: BRAND.slate950 }}
            />
            <div className="pr-2 flex items-center gap-2">
              <div
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-500 font-bold"
                style={{ fontSize: 10, letterSpacing: "0.05em" }}
              >
                <Command size={10} /> K
              </div>
              <button
                onClick={() => setIsCreating(!isCreating)}
                className="flex items-center justify-center rounded-xl transition hover:opacity-90 active:scale-95"
                style={{
                  background: isCreating ? BRAND.purpsHover : BRAND.purps,
                  color: "white",
                  width: 36,
                  height: 36,
                }}
              >
                {isCreating ? <ChevronDown size={18} /> : <Plus size={18} />}
              </button>
            </div>
          </div>

          {/* Inline Create Form Expand */}
          {isCreating && (
            <div
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg p-5 animate-in fade-in slide-in-from-top-2"
              style={{ border: `1px solid ${BRAND.slate200}` }}
            >
              <div className="flex gap-4">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: BRAND.slate700 }}>
                      Attraction Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Louvre Museum"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-purps"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: BRAND.slate700 }}>
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="Paris"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-purps"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: BRAND.slate700 }}>
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="France"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-purps"
                    />
                  </div>
                </div>
                <div className="w-px bg-slate-100 mx-2" />
                <div className="w-64 flex flex-col gap-2">
                  <label className="block text-xs font-bold mb-0.5" style={{ color: BRAND.slate700 }}>
                    Ground Truth (Optional)
                  </label>
                  <button
                    className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-500 hover:border-purps hover:text-purps transition"
                  >
                    <Upload size={14} /> Upload DRD (.md or .pdf)
                  </button>
                </div>
                <div className="w-px bg-slate-100 mx-2" />
                <div className="flex items-end">
                  <button
                    className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm text-white transition hover:opacity-90 active:scale-95 whitespace-nowrap h-[42px]"
                    style={{ background: BRAND.purps }}
                  >
                    <Sparkles size={14} /> Generate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left Rail */}
          <div className="col-span-2 flex flex-col gap-6 sticky top-24">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider mb-3 text-slate-500">
                Views
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { id: "all", label: "All Library", count: MOCK_CES.length, icon: LayoutGrid },
                  { id: "curated", label: "Curated", count: 4, icon: Lock },
                  { id: "published", label: "Published", count: 11, icon: Check },
                  { id: "drafts", label: "Drafts", count: 8, icon: FileText },
                  { id: "no-drd", label: "Needs DRD", count: 2, icon: AlertCircle },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-semibold"
                    style={{
                      background: filter === f.id ? BRAND.purpsSoft : "transparent",
                      color: filter === f.id ? BRAND.purps : BRAND.slate700,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <f.icon size={14} strokeWidth={filter === f.id ? 3 : 2} />
                      {f.label}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        opacity: filter === f.id ? 1 : 0.6,
                        fontWeight: filter === f.id ? 800 : 600,
                      }}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider mb-3 text-slate-500">
                Clusters
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { id: "florence", label: "Florence" },
                  { id: "rome", label: "Rome" },
                  { id: "paris", label: "Paris" },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFilter(c.id)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold"
                    style={{
                      background: filter === c.id ? BRAND.purpsSoft : "transparent",
                      color: filter === c.id ? BRAND.purps : BRAND.slate700,
                    }}
                  >
                    <Filter size={14} className="opacity-50" />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-10 flex flex-col gap-8">
            {/* Recent Section */}
            {(filter === "all" && !search) && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Recently opened</h2>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {recentCEs.slice(0, 4).map((ce) => (
                    <div
                      key={ce.id}
                      className="bg-white rounded-xl p-4 cursor-pointer transition-shadow hover:border-purps"
                      style={{ border: `1px solid ${BRAND.slate200}`, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                          {ce.city.substring(0, 2)}
                        </div>
                        <span className="text-xs font-bold text-slate-400">{ce.lastGenerated}</span>
                      </div>
                      <div className="font-extrabold text-slate-900 truncate tracking-tight">{ce.name}</div>
                      <div className="text-xs font-semibold text-slate-500 mt-1">{ce.city}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Library Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {filter === "all" ? "All CEs" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  <span className="ml-2 text-slate-400 font-semibold text-sm">{filteredCEs.length}</span>
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Sort by:</span>
                  <select className="bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer">
                    <option>Last updated</option>
                    <option>Name</option>
                    <option>Status</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: `1px solid ${BRAND.slate200}` }}>
                {/* Table Header */}
                <div className="grid grid-cols-[minmax(200px,2fr)_1fr_1fr_1fr_80px_40px] gap-4 px-6 py-3 border-b bg-slate-50 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  <div>Attraction</div>
                  <div>Status</div>
                  <div>Charts</div>
                  <div>Intelligence</div>
                  <div>Activity</div>
                  <div></div>
                </div>

                {/* Table Rows */}
                <div className="divide-y" style={{ borderColor: BRAND.slate100 }}>
                  {filteredCEs.map((ce) => (
                    <div key={ce.id} className="grid grid-cols-[minmax(200px,2fr)_1fr_1fr_1fr_80px_40px] gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors group">
                      {/* Attraction */}
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate tracking-tight text-sm mb-0.5">
                          {ce.name}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 truncate">
                          {ce.city}, {ce.country}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap"
                          style={{
                            background: ce.status === "locked" ? BRAND.bgLilac :
                                      ce.status === "published" ? BRAND.bgMint :
                                      ce.status === "stale" ? BRAND.holaSoft :
                                      BRAND.slate100,
                            color: ce.status === "locked" ? BRAND.purps :
                                   ce.status === "published" ? BRAND.okayInk :
                                   ce.status === "stale" ? BRAND.hola :
                                   BRAND.slate700,
                          }}
                        >
                          {ce.status === "locked" && <Lock size={10} strokeWidth={3} />}
                          {ce.status === "published" && <Check size={10} strokeWidth={3} />}
                          {ce.status === "stale" && <AlertCircle size={10} strokeWidth={3} />}
                          {ce.status}
                        </div>
                      </div>

                      {/* Charts */}
                      <div className="flex flex-col gap-1">
                        {ce.publishedCount > 0 && (
                          <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: BRAND.okayInk }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: BRAND.okayGreen }} />
                            {ce.publishedCount} Published
                          </div>
                        )}
                        {ce.draftCount > 0 && (
                          <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: BRAND.hola }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: BRAND.hola }} />
                            {ce.draftCount} Drafts
                          </div>
                        )}
                        {(ce.publishedCount === 0 && ce.draftCount === 0) && (
                          <div className="text-xs font-bold text-slate-400">No charts</div>
                        )}
                      </div>

                      {/* Intelligence */}
                      <div>
                        {ce.drdAgeDays !== null ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <FileText size={12} className="text-slate-400" />
                            DRD: {ce.drdAgeDays === 0 ? "Today" : `${ce.drdAgeDays}d old`}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-candy">
                            <AlertCircle size={12} />
                            No DRD
                          </div>
                        )}
                      </div>

                      {/* Activity */}
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="text-xs font-bold text-slate-900 whitespace-nowrap">
                          {ce.lastGenerated}
                        </div>
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-[9px] font-extrabold text-slate-700 flex items-center justify-center" title={`By ${ce.writer}`}>
                          {ce.writer}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        <button className="p-1.5 rounded-md text-slate-400 hover:text-purps hover:bg-purpsSoft transition opacity-0 group-hover:opacity-100">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredCEs.length === 0 && (
                    <div className="p-12 text-center text-slate-500 font-semibold text-sm">
                      No attractions found matching the current filters.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
