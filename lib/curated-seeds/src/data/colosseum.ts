import type { CuratedCe } from "../types";

export const colosseum: CuratedCe = {
  ce: {
    slug: "colosseum",
    name: "Colosseum",
    city: "Rome",
    country: "Italy",
    category: "landmark",
    summary:
      "The Flavian Amphitheatre at the heart of Rome — the largest entertainment venue of the ancient world, now Italy's most-visited cultural site with ~14.7M annual visitors across the wider Archaeological Park.",
    emoji: "🏛",
  },
  charts: [
    {
      slug: "history-timeline",
      question: "What is the history of the Colosseum?",
      title: "From Vespasian to today",
      subtitle: "Two thousand years of Rome's most famous monument",
      insight:
        "Built in eight years from the spoils of Jerusalem, the Colosseum hosted spectacle for four centuries, was quarried for a thousand more, then rescued by 18th-century popes — and is now the most-visited monument in Italy.",
      chart_type: "history_timeline",
      spec: {
        type: "history_timeline",
        span_label: "AD 72–2026",
        events: [
          {
            date_label: "AD 72",
            sort_year: 72,
            title: "Construction begins",
            era: "construction",
            description:
              "Vespasian commissions the amphitheatre on the drained lake of Nero's Domus Aurea, financed by spoils from the Sack of Jerusalem.",
            metric_value: "~100,000 m³",
            metric_label: "travertine",
          },
          {
            date_label: "AD 80",
            sort_year: 80,
            title: "Inaugural games",
            era: "spectacle",
            description:
              "Titus dedicates the Colosseum with games described by Martial; Cassius Dio reports more than 9,000 animals killed in the opening spectacle.",
            metric_value: "100 days",
            metric_label: "of games",
          },
          {
            date_label: "AD 96",
            sort_year: 96,
            title: "Hypogeum completed",
            era: "construction",
            description:
              "Domitian adds the underground hypogeum — 80 shafts, 28 capstan elevators — and a top gallery, bringing the venue to peak capacity.",
            metric_value: "~65,000",
            metric_label: "seats",
          },
          {
            date_label: "AD 523",
            sort_year: 523,
            title: "Last recorded games",
            era: "decline",
            description:
              "Animal hunts staged for the consulship of Anicius Maximus under the Ostrogothic king Theodoric end the arena's working life.",
          },
          {
            date_label: "c. 1200",
            sort_year: 1200,
            title: "Frangipane fortress",
            era: "reuse",
            description:
              "The Frangipane family fortifies the abandoned arena as a medieval castle; vaulted spaces become housing, workshops, and a small chapel.",
          },
          {
            date_label: "1349",
            sort_year: 1349,
            title: "Earthquake & quarry",
            era: "reuse",
            description:
              "A magnitude 6.7–7.0 quake collapses the southern outer ring; the rubble is quarried for centuries to build St. Peter's and more.",
            metric_value: "2,500 cartloads",
            metric_label: "hauled in 1452",
          },
          {
            date_label: "1749",
            sort_year: 1749,
            title: "Benedict XIV ends quarrying",
            era: "restoration",
            description:
              "Urged by St. Leonard of Port Maurice, Benedict XIV consecrates the arena to the Passion of Christ — saving it from total demolition.",
          },
          {
            date_label: "1932",
            sort_year: 1932,
            title: "Modern ceremonial axis",
            era: "modern",
            description:
              "Mussolini fully excavates the hypogeum and inaugurates Via dei Fori Imperiali, a 1 km parade route from Piazza Venezia.",
          },
          {
            date_label: "2024",
            sort_year: 2024,
            title: "Italy's most-visited site",
            era: "modern",
            description:
              "The Colosseum Archaeological Park records 14.7M visitors and €101.9M revenue — a UNESCO Site and New Seven Wonder of the World.",
            metric_value: "14.7M",
            metric_label: "visitors / yr",
          },
        ],
        highlight_event: "Inaugural games",
        callout:
          "Built in eight years, in continuous use for nearly two thousand — and now lit gold every time a death sentence is commuted.",
      },
    },
    {
      slug: "hourly-crowd-pattern",
      question: "What does an hour-by-hour crowd pattern at the Colosseum look like?",
      title: "Hour-by-hour crowd pattern at the Colosseum",
      subtitle: "When the arena is calmest and when it's wall-to-wall",
      insight:
        "The Colosseum opens at 8:30 but most timed-entry slots release groups in from 10:30 onwards — get in line by 8:00 or push past 16:30 to walk the upper tier without shoulder-to-shoulder crowds.",
      chart_type: "hourly_heatmap",
      spec: {
        type: "hourly_heatmap",
        // Reflects summer schedule (29 Apr–30 Sep): 8:30–19:15, last entry 18:15.
        // Autumn shoulder closes 18:30, winter closes 16:30; opening is 8:30 year-round.
        open_hour: 8,
        close_hour: 19,
        // Intensity 0–100 per hour. Hours outside open/close are masked
        // by the renderer regardless of value.
        rows: [
          {
            day: "mon",
            closed: false,
            // Mon: slightly lighter than Tue–Thu; many groups arrive Tue+
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 25, 35, 70, 88, 92, 88, 78, 62, 45, 30,
              15, 0, 0, 0, 0, 0,
            ],
          },
          {
            day: "tue",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 22, 30, 65, 82, 86, 82, 72, 55, 38, 25,
              12, 0, 0, 0, 0, 0,
            ],
          },
          {
            day: "wed",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 20, 28, 62, 80, 84, 80, 70, 52, 36, 24,
              12, 0, 0, 0, 0, 0,
            ],
          },
          {
            day: "thu",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 22, 30, 64, 82, 86, 82, 72, 55, 38, 26,
              13, 0, 0, 0, 0, 0,
            ],
          },
          {
            day: "fri",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 28, 38, 75, 92, 96, 92, 82, 68, 52, 36,
              18, 0, 0, 0, 0, 0,
            ],
          },
          {
            day: "sat",
            closed: false,
            // Weekend peak — independent travellers added to tour groups.
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 35, 50, 85, 98, 100, 96, 88, 75, 60, 42,
              22, 0, 0, 0, 0, 0,
            ],
          },
          {
            day: "sun",
            closed: false,
            // Sunday similar to Sat; first Sunday of month is free entry and
            // spikes even harder but isn't representative of every Sunday.
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 32, 48, 82, 95, 98, 94, 85, 72, 56, 40,
              20, 0, 0, 0, 0, 0,
            ],
          },
        ],
        best_window: {
          label: "Tue–Thu, 8:30–9:30 entry",
          day: "wed",
          start_hour: 8,
          end_hour: 9,
        },
        highlight_cards: [
          {
            kind: "quietest_hours",
            headline: "8:30–9:30, Tue–Thu",
            detail:
              "Queue 30 minutes before opening with a pre-booked ticket and you'll walk the arena floor before the first group buses arrive at 10:30.",
          },
          {
            kind: "best_photography",
            headline: "16:30–17:30, low light",
            detail:
              "Late sun rakes the travertine outer ring in warm gold while the upper tier finally clears — best window for unobstructed wide shots.",
          },
          {
            kind: "best_weather",
            headline: "April–May, mornings",
            detail:
              "Average highs of 19–24 °C and the hypogeum is open without the July–August heat that turns the arena floor into a 35 °C oven by midday.",
          },
          {
            kind: "fastest_entry",
            headline: "Pre-booked, 8:30 sharp",
            detail:
              "Reserved-entry tickets bypass the standby line; security and bag check at the Stern entrance clear in under 10 minutes before 9:30.",
          },
          {
            kind: "best_evening",
            headline: "Moon Tour, Fri–Sat 19:00+",
            detail:
              "After-hours guided access lets ~25 people walk the arena floor and hypogeum lit by ambient lamps, with no day-ticket crowds inside.",
          },
          {
            kind: "best_off_season",
            headline: "Mid-January to late February",
            detail:
              "Lowest visitation of the year, short or no queues at opening, and shorter winter hours (8:30–16:30) with dry, crisp Roman afternoons.",
          },
        ],
      },
      provenance: {
        status: "curated",
        web_sources: [
          {
            url: "https://parcocolosseo.it/en/visit/visiting-hours/",
            title: "Parco archeologico del Colosseo — Visiting hours",
          },
          {
            url: "https://parcocolosseo.it/en/visit/the-moon-over-the-colosseum/",
            title: "Parco archeologico del Colosseo — Moon Tour",
          },
          {
            url: "https://www.romewise.com/colosseum-tips.html",
            title: "Romewise — Colosseum visitor guidance",
          },
          {
            url: "https://en.wikipedia.org/wiki/Climate_of_Rome",
            title: "Wikipedia — Climate of Rome (monthly averages)",
          },
        ],
        estimates: [
          {
            field: "rows[].hours",
            note: "Hand-set 0–100 intensities reflecting the widely-reported pattern: opening hour quiet, 10:30–14:00 peak as group buses arrive, weekends ~10–15 points higher than mid-week, gentle drop after 15:00.",
          },
          {
            field: "best_window",
            note: "Tue–Thu 8:30–9:30 entry is the staple visitor-guidance recommendation across Romewise, The Roman Guy, and ItalyChronicles.",
          },
        ],
      } as Record<string, unknown>,
    },
    {
      slug: "entrance-map",
      question: "Which entrance should I use at the Colosseum?",
      title: "Three gates around the amphitheatre",
      subtitle: "Pick the right door for your ticket type",
      insight:
        "The Colosseum has three working entrances, all on the north / west side facing the Metro stop. Pre-booked individual visitors should head to Sperone Valadier on the west — Group Gate and Stern Gate are reserved for organised tours.",
      chart_type: "entrance_map",
      spec: {
        type: "entrance_map",
        venue_label: "Colosseum",
        intro_phrase: "3 entrances · west, north, north-east",
        entrances: [
          {
            name: "Sperone Valadier",
            status: "recommended",
            position: "w",
            wait_label: "10–20 min",
            best_for: ["individuals", "skip-the-line tickets"],
            transport: { mode: "metro", label: "Metro B · Colosseo (3 min walk)" },
            note: "Main visitor entrance on the west side, facing Via di San Gregorio.",
          },
          {
            name: "Group Gate",
            status: "groups",
            position: "n",
            wait_label: "Tour-led",
            best_for: ["organised groups", "guided tours"],
            transport: { mode: "metro", label: "Metro B · Colosseo (2 min walk)" },
            note: "Reserved for tour operators — individuals are turned away here.",
          },
          {
            name: "Stern Gate",
            status: "groups",
            position: "ne",
            wait_label: "Tour-led",
            best_for: ["school groups"],
            transport: { mode: "bus", label: "Bus 75/87 · Via Labicana" },
            note: "Facing Via Labicana on the north-east; school and pre-booked group lanes only.",
          },
        ],
        assembly_point: {
          label: "Tour meeting point · Arco di Costantino",
          position: "sw",
        },
        callout:
          "The Colosseum has three entrances on its northern half — Sperone Valadier on the west for individual ticket-holders, Group Gate on the north for organised groups, and Stern Gate on the north-east facing Via Labicana. All three are a 2–3 minute walk from Metro B Colosseo.",
      },
      provenance: {
        status: "curated",
        web_sources: [
          {
            url: "https://parcocolosseo.it/en/visit/the-entrances/",
            title: "Parco archeologico del Colosseo — Entrances",
          },
        ],
        estimates: [
          {
            field: "entrances[].wait_label",
            note: "Coarse wait windows synthesised from visitor reports — Sperone Valadier averages 10–20 min for pre-booked timed entry; the two group gates are tour-led with no individual queue.",
          },
        ],
      } as Record<string, unknown>,
    },
    {
      slug: "time-budget",
      question: "How long should I budget for the Colosseum visit?",
      title: "Budgeting your time",
      subtitle:
        "One combo ticket covers all three sites — pick the plan that matches your day",
      insight:
        "The ticket includes the Colosseum, Roman Forum, and Palatine Hill. Solid blocks are the can't-skip core (~1h 30m). Dashed blocks are extensions on the same ticket — add one for a half-day, both for a full archaeological park visit.",
      chart_type: "time_split",
      spec: {
        type: "time_split",
        total_label: "Standard visit",
        total_min: 210,
        segments: [
          {
            label: "Security & entry",
            minutes: 30,
            accent: "slate",
            note: "Bag check at the Stern entrance.",
          },
          {
            label: "Colosseum main levels",
            minutes: 60,
            accent: "candy",
            note: "Arena floor view, 1st & 2nd tier.",
          },
          {
            label: "Roman Forum",
            minutes: 60,
            accent: "purps",
            optional: true,
            note: "Skip if short on time.",
          },
          {
            label: "Palatine Hill",
            minutes: 60,
            accent: "okay",
            optional: true,
            note: "Skip if short on time.",
          },
        ],
      },
      provenance: {
        status: "curated",
        web_sources: [
          {
            url: "https://parcocolosseo.it/en/visit/visiting-hours/",
            title: "Parco archeologico del Colosseo — Visiting hours & ticket",
          },
        ],
        estimates: [
          {
            field: "segments[].minutes",
            note: "Visit timings are guide-school estimates synthesised from operator FAQs and recurring visitor-review themes: ~30m security, ~60m Colosseum interior, ~60m each for Forum and Palatine. Optional flag mirrors the standard 'Colosseum-only is fine if tight; Forum + Palatine are the full archaeological park' guidance.",
          },
        ],
      } as Record<string, unknown>,
    },
  ],
};
