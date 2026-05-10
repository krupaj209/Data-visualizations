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
  ],
};
