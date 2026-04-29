// One-shot seed: replaces the chart set for "Galleria dell'Accademia" with
// the curated 7-chart deck per Headout reference designs.
// Run from the workspace root:
//   node --experimental-vm-modules scripts/src/seed-accademia.mjs
// (Resolves `pg` via lib/db so we don't add a duplicate dependency.)
import path from "node:path";
import { createRequire } from "node:module";

const req = createRequire(path.resolve("lib/db/package.json"));
const pg = req("pg");
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const slug = "galleria-dellaccademia";

await client.query("BEGIN");

const findRes = await client.query(
  "SELECT id FROM ces WHERE slug = $1",
  [slug],
);

let ceId;
if (findRes.rows.length === 0) {
  const ins = await client.query(
    `INSERT INTO ces (slug, name, city, country, category, summary, emoji, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'ready')
     RETURNING id`,
    [
      slug,
      "Galleria dell'Accademia",
      "Florence",
      "Italy",
      "museum",
      "Home of Michelangelo's David and one of Florence's most-visited museums. The intimate galleries pack in fast — timing your visit and your entrance lane is what saves the day.",
      "🗿",
    ],
  );
  ceId = ins.rows[0].id;
  console.log("Created Accademia CE id:", ceId);
} else {
  ceId = findRes.rows[0].id;
  await client.query(
    `UPDATE ces
        SET name = $1, city = $2, country = $3, category = $4,
            summary = $5, emoji = $6, status = 'ready'
      WHERE id = $7`,
    [
      "Galleria dell'Accademia",
      "Florence",
      "Italy",
      "museum",
      "Home of Michelangelo's David and one of Florence's most-visited museums. The intimate galleries pack in fast — timing your visit and your entrance lane is what saves the day.",
      "🗿",
      ceId,
    ],
  );
  console.log("Updated existing Accademia CE id:", ceId);
}

await client.query("DELETE FROM charts WHERE ce_id = $1", [ceId]);

const charts = [
  {
    slug: "tribune-density",
    question: "When does the Tribune get packed?",
    title: "Tribune crowd density by time",
    subtitle: "Peak season · Tribune only",
    insight:
      "Arrive at 8:15am opening for a 30-45 minute window before tour groups push the Tribune to capacity from 10am to 2pm.",
    chart_type: "tribune_density",
    spec: {
      type: "tribune_density",
      scope: "Peak season · Tribune only",
      y_label: "Crowd density in Tribune",
      points: [
        { time: "8:15", density: 1 },
        { time: "8:30", density: 2 },
        { time: "9:00", density: 4 },
        { time: "9:30", density: 8 },
        { time: "10:00", density: 9 },
        { time: "11:00", density: 10 },
        { time: "12:00", density: 10 },
        { time: "13:00", density: 9 },
        { time: "14:00", density: 7 },
        { time: "15:00", density: 5 },
        { time: "16:00", density: 3 },
        { time: "16:30", density: 2 },
        { time: "17:00", density: 1 },
        { time: "18:00", density: 1 },
      ],
      zones: [
        { label: "Quiet start", tone: "quiet", start: "8:15", end: "9:30" },
        { label: "Packed", tone: "packed", start: "9:30", end: "15:00" },
        {
          label: "Second window",
          tone: "second_window",
          start: "15:00",
          end: "18:00",
        },
      ],
      arrow_callout: {
        label: "Tour groups arrive",
        at: "9:30",
        helper: "30–45 min lag before most visitors reach the Tribune",
      },
      context_pills: [
        {
          icon: "calendar",
          title: "8:15am opening",
          subtitle: "Arrive early for calm",
          tone: "candy",
        },
        {
          icon: "people",
          title: "9:30am surge",
          subtitle: "Tour groups arrive",
          tone: "candy",
        },
        {
          icon: "people_full",
          title: "10am–2pm packed",
          subtitle: "Expect almost full Tribune",
          tone: "candy",
        },
        {
          icon: "sun",
          title: "4pm onwards",
          subtitle: "Much calmer",
          tone: "okay",
        },
        {
          icon: "clock",
          title: "Last entry",
          subtitle: "6:20pm",
          tone: "purps",
        },
      ],
    },
  },
  {
    slug: "best-time-of-day",
    question: "What's the best time of day to visit?",
    title: "Crowd levels through the day",
    subtitle: "Typical daily pattern",
    insight:
      "8:15-9:30am offers the calmest window. Avoid 11am-3pm when the gallery hits peak crowd. After 4:30pm is the second-best slot.",
    chart_type: "daily_pattern",
    spec: {
      type: "daily_pattern",
      points: [
        { time: "8:15", crowd: 1 },
        { time: "9:00", crowd: 2 },
        { time: "9:30", crowd: 3 },
        { time: "11:00", crowd: 7 },
        { time: "12:30", crowd: 9 },
        { time: "13:00", crowd: 10 },
        { time: "14:00", crowd: 9 },
        { time: "15:30", crowd: 7 },
        { time: "16:30", crowd: 4 },
        { time: "17:30", crowd: 2 },
        { time: "18:00", crowd: 1 },
        { time: "18:20", crowd: 1 },
      ],
      zones: [
        { label: "Best", tone: "best", start: "8:15", end: "9:30" },
        { label: "Peak", tone: "peak", start: "9:30", end: "16:30" },
        {
          label: "2nd best",
          tone: "second_best",
          start: "16:30",
          end: "18:20",
        },
      ],
      caption: { opens: "8:15am", last_entry: "6:20pm" },
    },
  },
  {
    slug: "weekly-pattern",
    question: "Which day of the week is quietest?",
    title: "Weekly crowd pattern",
    subtitle: "Typical weekly pattern",
    insight:
      "Wednesday and Thursday are the calmest. Tuesday and Sunday are the busiest. Monday is closed.",
    chart_type: "weekly_pattern",
    spec: {
      type: "weekly_pattern",
      days: [
        { day: "mon", level: "closed", score: 0 },
        { day: "tue", level: "busiest", score: 95 },
        { day: "wed", level: "quiet", score: 50 },
        { day: "thu", level: "quietest", score: 42 },
        { day: "fri", level: "quiet", score: 55 },
        { day: "sat", level: "busy", score: 78 },
        { day: "sun", level: "busiest", score: 92 },
      ],
    },
  },
  {
    slug: "booking-lead-time",
    question: "How far in advance should I book my ticket?",
    title: "When visitors book their ticket",
    subtitle: "Booking lead time pattern",
    insight:
      "The 15-30 day window is the sweet spot — best availability without prices climbing. Inside 7 days, popular slots are usually gone.",
    chart_type: "booking_window",
    spec: {
      type: "booking_window",
      curve: [
        { days_before: 0, share: 8 },
        { days_before: 2, share: 11 },
        { days_before: 5, share: 16 },
        { days_before: 10, share: 20 },
        { days_before: 22, share: 22 },
        { days_before: 45, share: 15 },
        { days_before: 90, share: 8 },
      ],
      sweet_spot: {
        days_before_min: 15,
        days_before_max: 30,
        label: "15–30 days · best availability",
      },
      sold_out_risk: {
        threshold_days: 7,
        message:
          "Inside 7 days, popular morning slots are routinely sold out in peak season.",
      },
    },
  },
  {
    slug: "visit-duration",
    question: "How long should I plan to spend here?",
    title: "How long visitors actually stay",
    subtitle: "Most visitors stay 60–90 minutes",
    insight:
      "Plan for 60–90 minutes if you want to see David, the Hall of Colossus, and the Musical Instruments. David-only visits run 30-45 minutes.",
    chart_type: "duration_profiles",
    spec: {
      type: "duration_profiles",
      headline: "Most visitors stay 60–90 minutes",
      scale_min: [
        { label: "0", minutes: 0 },
        { label: "30 min", minutes: 30 },
        { label: "45 min", minutes: 45 },
        { label: "60 min", minutes: 60 },
        { label: "90 min", minutes: 90 },
        { label: "2 hr", minutes: 120 },
      ],
      profiles: [
        {
          name: "David only",
          icon: "head",
          range_min: 30,
          range_max: 45,
          note: "David + quick Prisoners look",
        },
        {
          name: "Core highlights",
          icon: "column",
          range_min: 45,
          range_max: 60,
          note: "Add Hall of the Colossus",
        },
        {
          name: "Most visitors",
          icon: "lyre",
          range_min: 60,
          range_max: 90,
          note: "Add Musical Instruments",
          highlight: true,
        },
        {
          name: "Deep visit",
          icon: "bust",
          range_min: 90,
          range_max: 120,
          note: "Add plaster casts + paintings",
        },
        {
          name: "Art enthusiast",
          icon: "bench",
          range_min: 120,
          range_max: 120,
          note: "Full collection + more David time",
        },
      ],
      tip: "save 15–20 minutes for the Tribune with David.",
    },
  },
  {
    slug: "entrance-lanes",
    question: "Which entrance lane has the shortest wait?",
    title: "Entrance lanes and typical waits",
    subtitle: "All four lanes share the same doorway",
    insight:
      "Reserved tickets clear in 10–20 minutes. Walk-up swells to 45–120 minutes in peak season. Accessible visitors get priority entry.",
    chart_type: "entrance_lanes",
    spec: {
      type: "entrance_lanes",
      venue_label: "Accademia Gallery entrance",
      shared_caption: "All four lanes share the same doorway",
      lanes: [
        { name: "Reserved", wait_label: "10–20 min", tone: "candy", dots: 8 },
        {
          name: "Walk-up",
          wait_label: "45–120 min",
          tone: "purps",
          dots: 24,
        },
        {
          name: "Groups",
          wait_label: "Variable",
          tone: "okay",
          dots: 12,
          dashed: true,
        },
        {
          name: "Accessible",
          wait_label: "Priority",
          tone: "purps",
          dots: 1,
        },
      ],
    },
  },
  {
    slug: "co-bookings",
    question: "What do visitors pair the Accademia with?",
    title: "What visitors also book in Florence",
    subtitle: "Most co-booked nearby landmarks",
    insight:
      "Nearly 3 in 4 visitors also book the Uffizi. The Florence Duomo is the top easy-walk pairing at 58%.",
    chart_type: "co_bookings",
    spec: {
      type: "co_bookings",
      highlight_top: 2,
      items: [
        {
          name: "Uffizi Gallery",
          share: 72,
          icon: "landmark",
          badge: "Top pairing",
        },
        {
          name: "Florence Duomo",
          share: 58,
          icon: "church",
          badge: "Easy walk",
        },
        { name: "Palazzo Vecchio", share: 41, icon: "castle" },
        { name: "Bargello Museum", share: 28, icon: "building" },
        { name: "Boboli Gardens", share: 24, icon: "trees" },
        { name: "Medici Chapels", share: 19, icon: "gem" },
      ],
    },
  },
];

for (let i = 0; i < charts.length; i++) {
  const c = charts[i];
  await client.query(
    `INSERT INTO charts
       (ce_id, slug, question, title, subtitle, insight, chart_type, spec, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      ceId,
      c.slug,
      c.question,
      c.title,
      c.subtitle,
      c.insight,
      c.chart_type,
      JSON.stringify(c.spec),
      i,
    ],
  );
}

const rows = (
  await client.query(
    "SELECT id, slug, chart_type FROM charts WHERE ce_id = $1 ORDER BY sort_order",
    [ceId],
  )
).rows;

await client.query("COMMIT");

console.log(`Inserted ${rows.length} curated charts:`);
for (const r of rows) {
  console.log(`  /studio/embed/${r.id}  [${r.chart_type}] ${r.slug}`);
}

await client.end();
