// Accademia PYV — data visualizations
// Each viz is a self-contained card, sized to be screenshot-friendly (fits in ~560×400 or smaller).
// Headout design system: Purps #8000FF, Candy #FF0076, Slate black text, Manrope, soft cards.

const VIZ_TOKENS = {
  purps: '#8000FF',
  purpsSoft: '#F3E8FF',
  candy: '#FF0076',
  candySoft: '#FFE4EF',
  slate900: '#222222',
  slate700: '#666666',
  slate500: '#A6A6A6',
  slate300: '#D0D0D0',
  slate200: '#E6E6E9',
  slate100: '#F0F0F0',
  slate50: '#F8F8F8',
  white: '#FFFFFF',
  cream: '#FFF8EF',
  mint: '#D2FDEB',
  peach: '#FFC7CC',
  green: '#15D876',
  mustard: '#FFBC00',
  orange: '#FF9D7C',
};

// ─────────────────────────────────────────────────────────────
// Card shell — consistent chrome for every viz card.
// ─────────────────────────────────────────────────────────────
function VizCard({ children, width = 520, height = 380, title, subtitle, sourceLabel, sourceTone = 'verified', style }) {
  const toneColor = {
    verified: { bg: '#EAF7EE', fg: '#0E7B3A', dot: VIZ_TOKENS.green, label: 'Verified' },
    estimated: { bg: '#FFF6D9', fg: '#8A5A00', dot: VIZ_TOKENS.mustard, label: 'Estimated' },
    proxy: { bg: '#FFE4EF', fg: '#B0004F', dot: VIZ_TOKENS.candy, label: 'Proxy data' },
    qualitative: { bg: '#F3E8FF', fg: '#5B00BD', dot: VIZ_TOKENS.purps, label: 'Reported' },
  }[sourceTone];

  return (
    <div style={{
      width, height,
      background: VIZ_TOKENS.white,
      borderRadius: 16,
      border: `1px solid ${VIZ_TOKENS.slate200}`,
      boxShadow: '0 2px 4px rgba(15,15,16,0.06), 0 1px 2px rgba(15,15,16,0.04)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Manrope, -apple-system, sans-serif',
      color: VIZ_TOKENS.slate900,
      boxSizing: 'border-box',
      ...style,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: VIZ_TOKENS.slate500, marginBottom: 6 }}>
            Accademia Gallery · Florence
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: VIZ_TOKENS.slate700, marginTop: 4, lineHeight: 1.4 }}>{subtitle}</div>}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: toneColor.bg, color: toneColor.fg,
          padding: '4px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: toneColor.dot }} />
          {toneColor.label}
        </div>
      </div>

      {/* Viz body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0, marginTop: 12 }}>
        {children}
      </div>

      {/* Footer source */}
      <div style={{
        marginTop: 16, paddingTop: 12, borderTop: `1px solid ${VIZ_TOKENS.slate100}`,
        fontSize: 11, color: VIZ_TOKENS.slate500, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
        <span>{sourceLabel}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. Annual visitors — big stat + 6-year sparkline
// ─────────────────────────────────────────────────────────────
function AnnualVisitorsViz() {
  const data = [
    { year: 2019, visitors: 1.70 },
    { year: 2020, visitors: 0.32 },
    { year: 2021, visitors: 0.54 },
    { year: 2022, visitors: 1.50 },
    { year: 2023, visitors: 2.01 },
    { year: 2024, visitors: 2.10 },
  ];
  const max = 2.2;
  const W = 472, H = 130;
  const barW = W / data.length - 8;
  return (
    <VizCard
      title="2.1M visitors, €17.1M revenue"
      subtitle="Annual ticket sales, 2019 — 2024"
      sourceLabel="Italian Ministry of Culture · via Statista"
      sourceTone="verified"
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: VIZ_TOKENS.purps }}>2.10M</div>
          <div style={{ fontSize: 12, color: VIZ_TOKENS.slate700, marginTop: 4 }}>
            <span style={{ color: VIZ_TOKENS.green, fontWeight: 700 }}>↑ 4.3%</span> vs 2023
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative', height: H }}>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {data.map((d, i) => {
              const h = (d.visitors / max) * (H - 28);
              const x = i * (W / data.length) + 4;
              const y = H - 24 - h;
              const isLast = i === data.length - 1;
              return (
                <g key={d.year}>
                  <rect x={x} y={y} width={barW} height={h} rx="3"
                    fill={isLast ? VIZ_TOKENS.purps : VIZ_TOKENS.slate200} />
                  <text x={x + barW / 2} y={H - 8} fontSize="11" fill={VIZ_TOKENS.slate500} textAnchor="middle" fontFamily="Manrope" fontWeight="500">
                    {String(d.year).slice(2)}
                  </text>
                  {isLast && (
                    <text x={x + barW / 2} y={y - 6} fontSize="11" fill={VIZ_TOKENS.purps} textAnchor="middle" fontFamily="Manrope" fontWeight="700">
                      2.1M
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${VIZ_TOKENS.slate200}` }}>
        <div>
          <div style={{ fontSize: 11, color: VIZ_TOKENS.slate500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Revenue</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>€17.1M</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: VIZ_TOKENS.slate500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Daily avg</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>~6,800</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: VIZ_TOKENS.slate500, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Closed</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Mondays</div>
        </div>
      </div>
    </VizCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Ticket comparison — walk-up vs skip-the-line vs guided
// ─────────────────────────────────────────────────────────────
function TicketCompareViz() {
  const rows = [
    { label: 'Walk-up', price: '€16', wait: 90, waitLabel: '60–120 min', tone: 'slate', note: 'Only if you arrive before 8:30' },
    { label: 'Official online', price: '€20', wait: 15, waitLabel: '10–20 min', tone: 'purps', note: '€4 booking fee · timed slot' },
    { label: 'Skip-the-line', price: '€22.75', wait: 10, waitLabel: '≤ 10 min', tone: 'candy', note: 'Priority entry, flexible' },
    { label: 'Guided tour', price: '€32', wait: 8, waitLabel: '~ 8 min', tone: 'purps', note: 'Escorted past queues' },
  ];
  const MAX_WAIT = 120;

  const toneFill = (t) => t === 'purps' ? VIZ_TOKENS.purps : t === 'candy' ? VIZ_TOKENS.candy : VIZ_TOKENS.slate300;

  return (
    <VizCard
      title="How you arrive changes everything"
      subtitle="Price vs. minutes waiting in line, peak season"
      sourceLabel="galleriaaccademiafirenze.it · partner booking data"
      sourceTone="verified"
      height={360}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '130px 60px 1fr', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: VIZ_TOKENS.slate500, marginTop: 1 }}>{r.note}</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: VIZ_TOKENS.slate900 }}>{r.price}</div>
            <div style={{ position: 'relative', height: 22, background: VIZ_TOKENS.slate50, borderRadius: 999 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${(r.wait / MAX_WAIT) * 100}%`,
                background: toneFill(r.tone),
                borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: 8,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: VIZ_TOKENS.white, whiteSpace: 'nowrap' }}>
                  {r.waitLabel}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </VizCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Best time of day — 12-slot heat strip
// ─────────────────────────────────────────────────────────────
function TimeOfDayViz() {
  // 8:15 open to 18:45 close (museum closes 18:45, last entry 18:20)
  // Relative crowd density 0-1 based on consensus reporting
  const slots = [
    { time: '8:15', level: 0.12, label: 'Open' },
    { time: '9', level: 0.22 },
    { time: '10', level: 0.75 },
    { time: '11', level: 0.92 },
    { time: '12', level: 0.95, label: 'Peak' },
    { time: '13', level: 0.88 },
    { time: '14', level: 0.78 },
    { time: '15', level: 0.55 },
    { time: '16', level: 0.38 },
    { time: '17', level: 0.22, label: 'Quiet' },
    { time: '18', level: 0.15 },
    { time: '18:20', level: 0.08, label: 'Last' },
  ];
  const colorAt = (l) => {
    // Interpolate mint → mustard → candy
    if (l < 0.35) return VIZ_TOKENS.mint;
    if (l < 0.6) return '#FFE29A';
    if (l < 0.85) return VIZ_TOKENS.orange;
    return VIZ_TOKENS.candy;
  };

  return (
    <VizCard
      title="Go at open, or after 4 PM"
      subtitle="Relative crowd density by hour of day"
      sourceLabel="Based on visitor reports and editorial consensus — no hourly counts are published"
      sourceTone="qualitative"
      height={280}
    >
      <div>
        <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
          {slots.map((s, i) => {
            const h = 20 + s.level * 70;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: h,
                  background: colorAt(s.level),
                  borderRadius: '6px 6px 2px 2px',
                  position: 'relative',
                }}>
                  {s.label && (
                    <div style={{
                      position: 'absolute', bottom: `calc(100% + 4px)`, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 10, fontWeight: 700, color: VIZ_TOKENS.slate900, whiteSpace: 'nowrap',
                    }}>
                      {s.label}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: VIZ_TOKENS.slate500, marginTop: 6, fontWeight: 500 }}>{s.time}</div>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: VIZ_TOKENS.slate700, marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${VIZ_TOKENS.slate200}` }}>
          <span style={{ fontWeight: 600, color: VIZ_TOKENS.slate900 }}>Crowd level</span>
          {[
            { c: VIZ_TOKENS.mint, l: 'Quiet' },
            { c: '#FFE29A', l: 'Steady' },
            { c: VIZ_TOKENS.orange, l: 'Busy' },
            { c: VIZ_TOKENS.candy, l: 'Packed' },
          ].map((x) => (
            <span key={x.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: x.c }} />
              {x.l}
            </span>
          ))}
        </div>
      </div>
    </VizCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Day of week — bar chart with free-Sunday callout
// ─────────────────────────────────────────────────────────────
function DayOfWeekViz() {
  const days = [
    { d: 'Mon', level: 0, label: 'Closed', closed: true },
    { d: 'Tue', level: 0.95, tone: 'candy' },
    { d: 'Wed', level: 0.55 },
    { d: 'Thu', level: 0.50 },
    { d: 'Fri', level: 0.60 },
    { d: 'Sat', level: 0.75 },
    { d: 'Sun', level: 0.85, tone: 'candy' },
  ];

  return (
    <VizCard
      title="Skip Tuesday and the first Sunday"
      subtitle="Relative crowding by day of week"
      sourceLabel="Visitor reports aggregated across 6+ guides — no day-level counts are published"
      sourceTone="qualitative"
      height={300}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 140 }}>
        {days.map((x) => {
          const h = x.closed ? 0 : x.level * 130;
          return (
            <div key={x.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: '100%', height: 140, display: 'flex', alignItems: 'flex-end',
              }}>
                {x.closed ? (
                  <div style={{
                    width: '100%', height: '100%',
                    background: `repeating-linear-gradient(45deg, ${VIZ_TOKENS.slate100} 0 6px, ${VIZ_TOKENS.white} 6px 12px)`,
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: VIZ_TOKENS.slate500,
                    letterSpacing: '0.06em',
                  }}>CLOSED</div>
                ) : (
                  <div style={{
                    width: '100%', height: h,
                    background: x.tone === 'candy' ? VIZ_TOKENS.candy : VIZ_TOKENS.purps,
                    opacity: x.tone === 'candy' ? 1 : 0.35 + x.level * 0.4,
                    borderRadius: '8px 8px 3px 3px',
                  }} />
                )}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: VIZ_TOKENS.slate900 }}>{x.d}</div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 16, padding: 12,
        background: VIZ_TOKENS.candySoft, borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: VIZ_TOKENS.candy, color: VIZ_TOKENS.white,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, flexShrink: 0,
        }}>!</div>
        <div style={{ fontSize: 12, color: '#8A0042', lineHeight: 1.4 }}>
          <strong>First Sunday of every month is free</strong> — expect 2–3 hr queues and avoid unless you're set on it.
        </div>
      </div>
    </VizCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Monthly curve — area chart (airport proxy)
// ─────────────────────────────────────────────────────────────
function MonthlyCurveViz() {
  // Normalized crowd index from Florence airport monthly passengers (proxy)
  const months = [
    { m: 'Jan', v: 0.22 }, { m: 'Feb', v: 0.28 }, { m: 'Mar', v: 0.52 },
    { m: 'Apr', v: 0.72 }, { m: 'May', v: 0.82 }, { m: 'Jun', v: 0.92 },
    { m: 'Jul', v: 0.98 }, { m: 'Aug', v: 1.00 }, { m: 'Sep', v: 0.80 },
    { m: 'Oct', v: 0.66 }, { m: 'Nov', v: 0.30 }, { m: 'Dec', v: 0.38 },
  ];
  const W = 472, H = 160;
  const stepX = W / (months.length - 1);
  const pts = months.map((m, i) => `${i * stepX},${H - m.v * (H - 20) - 10}`).join(' ');
  const areaPts = `0,${H} ${pts} ${W},${H}`;

  // Best window: Apr–May + Sep–Oct
  return (
    <VizCard
      title="When to come: April, May, September, October"
      subtitle="Estimated monthly crowding, Florence tourist flow"
      sourceLabel="Estimated from Florence Peretola airport passenger data (proxy) — no month-level Accademia counts are published"
      sourceTone="proxy"
      height={340}
    >
      <div>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="mc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VIZ_TOKENS.purps} stopOpacity="0.22"/>
              <stop offset="100%" stopColor={VIZ_TOKENS.purps} stopOpacity="0"/>
            </linearGradient>
            <pattern id="sweet-spot" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={VIZ_TOKENS.green} strokeWidth="1.5" opacity="0.35"/>
            </pattern>
          </defs>

          {/* Sweet-spot bands (Apr–May, Sep–Oct) */}
          <rect x={3 * stepX} y="0" width={2 * stepX} height={H} fill="url(#sweet-spot)" />
          <rect x={8 * stepX} y="0" width={2 * stepX} height={H} fill="url(#sweet-spot)" />

          {/* Baseline */}
          <line x1="0" y1={H - 10} x2={W} y2={H - 10} stroke={VIZ_TOKENS.slate200} strokeWidth="1" />

          {/* Area + line */}
          <polygon points={areaPts} fill="url(#mc-fill)" />
          <polyline points={pts} fill="none" stroke={VIZ_TOKENS.purps} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Peak callout */}
          {months.map((m, i) => {
            if (m.m !== 'Aug') return null;
            const cx = i * stepX;
            const cy = H - m.v * (H - 20) - 10;
            return (
              <g key="peak">
                <circle cx={cx} cy={cy} r="5" fill={VIZ_TOKENS.candy} stroke={VIZ_TOKENS.white} strokeWidth="2"/>
                <text x={cx} y={cy - 10} fontSize="11" fill={VIZ_TOKENS.candy} textAnchor="middle" fontWeight="700" fontFamily="Manrope">Peak</text>
              </g>
            );
          })}

          {/* Month labels */}
          {months.map((m, i) => (
            <text key={m.m} x={i * stepX} y={H + 14} fontSize="11" fill={VIZ_TOKENS.slate500} textAnchor="middle" fontFamily="Manrope" fontWeight="500">
              {m.m}
            </text>
          ))}
        </svg>

        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: VIZ_TOKENS.slate700, marginTop: 24 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14'><pattern id='p' width='6' height='6' patternTransform='rotate(45)' patternUnits='userSpaceOnUse'><line x1='0' y1='0' x2='0' y2='6' stroke='%2315D876' stroke-width='1.5' opacity='0.5'/></pattern><rect width='14' height='14' fill='url(%23p)'/></svg>")` }} />
            Sweet spot
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: VIZ_TOKENS.candy }} /> Peak crowding
          </span>
        </div>
      </div>
    </VizCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. Booking lead time — timeline with sell-out zone
// ─────────────────────────────────────────────────────────────
function BookingLeadViz() {
  // 60-day timeline. Left: today (0 days out). Right: 60 days out (opens).
  // Sell-out zone: 14-30 days (morning slots in peak).
  const W = 472, H = 100;

  return (
    <VizCard
      title="Book 3 – 4 weeks ahead in peak"
      subtitle="When peak-season morning slots disappear"
      sourceLabel="accademia-tickets.com · Viator partner data (average lead: 49 days)"
      sourceTone="verified"
      height={280}
    >
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {/* Track */}
        <rect x="0" y="40" width={W} height="14" rx="7" fill={VIZ_TOKENS.slate100} />

        {/* Booking window fill (0 -> 60d from left: 0 = today, 60 = booking opens) */}
        {/* We visualize right-to-left: right=60d out, left=today. Gradient fills from purps (available) to candy (gone). */}
        <defs>
          <linearGradient id="bl-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={VIZ_TOKENS.candy}/>
            <stop offset="35%" stopColor={VIZ_TOKENS.orange}/>
            <stop offset="70%" stopColor={VIZ_TOKENS.mustard}/>
            <stop offset="100%" stopColor={VIZ_TOKENS.green}/>
          </linearGradient>
        </defs>
        <rect x="0" y="40" width={W} height="14" rx="7" fill="url(#bl-grad)" />

        {/* Ticks: 0, 7, 14, 30, 49, 60 days */}
        {[
          { d: 0, label: 'Today', sub: 'Likely sold out' },
          { d: 14, label: '2 wks', sub: 'Afternoon only' },
          { d: 30, label: '1 mo', sub: 'Most slots gone' },
          { d: 49, label: '49 d', sub: 'Avg lead time', star: true },
          { d: 60, label: '60 d', sub: 'Booking opens' },
        ].map((t, i) => {
          // reverse: today is at left=0. But booking opens at far left? Actually: booking opens 60 days ahead => at the right side of timeline in days-before-visit.
          // Let's map: x = (60 - d) / 60 * W, so 60d out is on the LEFT (opens), today is on the RIGHT (visit day).
          const x = ((60 - t.d) / 60) * W;
          return (
            <g key={i}>
              <line x1={x} y1="32" x2={x} y2="62" stroke={VIZ_TOKENS.slate700} strokeWidth="1" />
              {t.star && (
                <circle cx={x} cy="47" r="8" fill={VIZ_TOKENS.white} stroke={VIZ_TOKENS.purps} strokeWidth="2.5"/>
              )}
              <text x={x} y="80" fontSize="11" fill={VIZ_TOKENS.slate900} textAnchor="middle" fontFamily="Manrope" fontWeight="700">{t.label}</text>
              <text x={x} y="94" fontSize="10" fill={VIZ_TOKENS.slate500} textAnchor="middle" fontFamily="Manrope" fontWeight="500">{t.sub}</text>
            </g>
          );
        })}

        {/* Endpoint labels */}
        <text x="0" y="22" fontSize="10" fill={VIZ_TOKENS.slate500} textAnchor="start" fontFamily="Manrope" fontWeight="600">60 DAYS OUT</text>
        <text x={W} y="22" fontSize="10" fill={VIZ_TOKENS.slate500} textAnchor="end" fontFamily="Manrope" fontWeight="600">VISIT DAY</text>
      </svg>
    </VizCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. Visit duration — horizontal stacked bar
// ─────────────────────────────────────────────────────────────
function DurationViz() {
  // Estimated distribution of typical visit length (based on review reports)
  const segs = [
    { label: '< 45 min', pct: 18, tone: VIZ_TOKENS.slate300, note: 'David + quick loop' },
    { label: '45 – 90 min', pct: 52, tone: VIZ_TOKENS.purps, note: 'Typical' },
    { label: '90 min – 2 hr', pct: 22, tone: VIZ_TOKENS.candy, note: 'Thorough' },
    { label: '2 hr+', pct: 8, tone: VIZ_TOKENS.slate500, note: 'Completionist' },
  ];

  return (
    <VizCard
      title="Plan for about 75 minutes"
      subtitle="How long visitors actually spend inside"
      sourceLabel="Estimated from visitor review patterns — no distribution data is published"
      sourceTone="estimated"
      height={280}
    >
      <div>
        <div style={{ display: 'flex', height: 48, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
          {segs.map((s) => (
            <div key={s.label} style={{
              width: `${s.pct}%`,
              background: s.tone,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: VIZ_TOKENS.white, fontSize: 13, fontWeight: 700,
            }}>
              {s.pct}%
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {segs.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.tone, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: VIZ_TOKENS.slate900 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: VIZ_TOKENS.slate500 }}>{s.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </VizCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. Also booked with — ranked list
// ─────────────────────────────────────────────────────────────
function AlsoBookedViz() {
  // Relative ranking (no %). Uses bar length to show relative strength.
  const items = [
    { name: 'Uffizi Gallery', strength: 1.00, note: 'Most common pairing' },
    { name: 'Duomo · Brunelleschi\'s Dome', strength: 0.78 },
    { name: 'Palazzo Vecchio', strength: 0.54 },
    { name: 'Bargello Museum', strength: 0.44, badge: 'New combo €26' },
    { name: 'Boboli Gardens', strength: 0.32 },
  ];

  return (
    <VizCard
      title="Most guests pair it with the Uffizi"
      subtitle="Relative co-booking strength, ordered by frequency"
      sourceLabel="Headout first-party booking data — exact percentages withheld"
      sourceTone="verified"
      height={340}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((it, i) => (
          <div key={it.name} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: i === 0 ? VIZ_TOKENS.purps : VIZ_TOKENS.slate100,
              color: i === 0 ? VIZ_TOKENS.white : VIZ_TOKENS.slate700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>{i + 1}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: VIZ_TOKENS.slate900 }}>
                  {it.name}
                  {it.badge && (
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700,
                      background: VIZ_TOKENS.candySoft, color: '#B0004F',
                      padding: '2px 6px', borderRadius: 4, letterSpacing: '0.02em',
                    }}>{it.badge}</span>
                  )}
                </div>
                {it.note && <span style={{ fontSize: 10, color: VIZ_TOKENS.slate500 }}>{it.note}</span>}
              </div>
              <div style={{ height: 8, background: VIZ_TOKENS.slate100, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${it.strength * 100}%`, height: '100%',
                  background: i === 0 ? VIZ_TOKENS.purps : `color-mix(in srgb, ${VIZ_TOKENS.purps} ${40 + it.strength * 40}%, ${VIZ_TOKENS.slate200})`,
                  borderRadius: 999,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </VizCard>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. Capacity dial — compact "how full right now" explainer
// ─────────────────────────────────────────────────────────────
function CapacityViz() {
  const inside = 200;        // max concurrent
  const slotMin = 15;
  const slotCap = 50;        // approx per 15-min slot

  return (
    <VizCard
      title="Only 200 people inside at once"
      subtitle="Timed entry slots keep the David breathable"
      sourceLabel="galleriaaccademiafirenze.it · official capacity mechanics"
      sourceTone="verified"
      height={280}
      width={460}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Radial gauge */}
        <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
          <svg width="110" height="110" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke={VIZ_TOKENS.slate100} strokeWidth="12"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke={VIZ_TOKENS.purps} strokeWidth="12"
              strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 50 * 0.85} ${2 * Math.PI * 50}`}
              transform="rotate(-90 60 60)" />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: VIZ_TOKENS.slate900, lineHeight: 1 }}>{inside}</div>
            <div style={{ fontSize: 10, color: VIZ_TOKENS.slate500, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Max inside</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: VIZ_TOKENS.slate500, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Slot length</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Every {slotMin} min</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: VIZ_TOKENS.slate500, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Per slot</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>~ {slotCap} people</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: VIZ_TOKENS.slate500, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Book window</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>60 days out</div>
          </div>
        </div>
      </div>
    </VizCard>
  );
}

Object.assign(window, {
  VizCard,
  AnnualVisitorsViz, TicketCompareViz, TimeOfDayViz, DayOfWeekViz,
  MonthlyCurveViz, BookingLeadViz, DurationViz, AlsoBookedViz, CapacityViz,
});
