import { chartSpecSchema } from "../../artifacts/api-server/src/lib/chart-spec.ts";

const positives: unknown[] = [
  {
    type: "savings_breakdown",
    currency: "EUR",
    card_price: 165,
    card_label: "Paris Pass 3-day",
    attractions: [
      { name: "Louvre", standalone_price: 22, usage_rate: 78 },
      { name: "Versailles", standalone_price: 21, usage_rate: 41 },
      { name: "Arc de Triomphe", standalone_price: 16, usage_rate: 55 },
      { name: "Sainte-Chapelle", standalone_price: 13, usage_rate: 28 },
      { name: "Centre Pompidou", standalone_price: 15 },
    ],
  },
  {
    type: "return_buffer_rank",
    ship_departure_time: "17:00",
    options: [
      { name: "Rome highlights private", buffer_minutes: 25, notes: "Tight" },
      { name: "Vatican half-day skip-the-line", buffer_minutes: 75 },
      { name: "Civitavecchia walking", buffer_minutes: 240 },
      { name: "Tivoli gardens day-trip", buffer_minutes: 45 },
    ],
  },
  {
    type: "seat_value_map",
    currency: "USD",
    venue_label: "Minskoff Theatre",
    layout: ["stalls", "circle", "upper_circle"],
    sections: [
      {
        name: "Stalls premium",
        tier: "stalls",
        price: 189,
        sightline_score: 95,
        value_score: 60,
      },
      {
        name: "Stalls front",
        tier: "stalls",
        price: 159,
        sightline_score: 95,
        value_score: 75,
      },
      {
        name: "Circle front",
        tier: "circle",
        price: 129,
        sightline_score: 88,
        value_score: 92,
      },
      {
        name: "Circle rear",
        tier: "circle",
        price: 99,
        sightline_score: 70,
        value_score: 80,
      },
      {
        name: "Upper circle",
        tier: "upper_circle",
        price: 69,
        sightline_score: 60,
        value_score: 78,
      },
    ],
    best_section: "Circle front",
  },
  {
    type: "optimal_departure",
    recommended_slot: "golden-hour",
    slots: [
      {
        id: "morning",
        name: "Morning",
        light_quality: 70,
        conditions: 90,
        crowd_level: 40,
      },
      {
        id: "midday",
        name: "Midday",
        light_quality: 60,
        conditions: 85,
        crowd_level: 80,
      },
      {
        id: "golden-hour",
        name: "Golden hour",
        light_quality: 95,
        conditions: 80,
        crowd_level: 65,
        note: "Best Manhattan glow",
      },
    ],
  },
  {
    type: "stop_frequency",
    route_label: "Big Bus London — Red Route",
    stops: [
      { name: "Trafalgar Square", peak_headway_min: 8, offpeak_headway_min: 15 },
      { name: "St Paul's", peak_headway_min: 10, offpeak_headway_min: 18 },
      { name: "Tower of London", peak_headway_min: 12, offpeak_headway_min: 22 },
      { name: "Marble Arch", peak_headway_min: 8, offpeak_headway_min: 15 },
      { name: "Hyde Park Corner", peak_headway_min: 10, offpeak_headway_min: 17 },
    ],
  },
];

const negatives: { label: string; spec: unknown }[] = [
  {
    label: "seat_value_map tier not in layout",
    spec: {
      type: "seat_value_map",
      currency: "USD",
      layout: ["stalls"],
      sections: [
        {
          name: "A",
          tier: "stalls",
          price: 100,
          sightline_score: 80,
          value_score: 80,
        },
        {
          name: "B",
          tier: "stalls",
          price: 90,
          sightline_score: 70,
          value_score: 80,
        },
        {
          name: "C",
          tier: "stalls",
          price: 80,
          sightline_score: 60,
          value_score: 80,
        },
        {
          name: "D",
          tier: "circle",
          price: 70,
          sightline_score: 50,
          value_score: 80,
        },
      ],
    },
  },
  {
    label: "optimal_departure unknown recommended_slot",
    spec: {
      type: "optimal_departure",
      recommended_slot: "missing",
      slots: [
        {
          id: "a",
          name: "A",
          light_quality: 50,
          conditions: 50,
          crowd_level: 50,
        },
        {
          id: "b",
          name: "B",
          light_quality: 50,
          conditions: 50,
          crowd_level: 50,
        },
      ],
    },
  },
  {
    label: "optimal_departure non-kebab slot id",
    spec: {
      type: "optimal_departure",
      recommended_slot: "golden_hour",
      slots: [
        {
          id: "morning",
          name: "Morning",
          light_quality: 70,
          conditions: 90,
          crowd_level: 40,
        },
        {
          id: "golden_hour",
          name: "Golden hour",
          light_quality: 95,
          conditions: 80,
          crowd_level: 65,
        },
      ],
    },
  },
];

let okCount = 0;
for (const s of positives) {
  const r = chartSpecSchema.safeParse(s);
  const t = (s as { type: string }).type;
  if (r.success) {
    console.log("OK     ", t);
    okCount++;
  } else {
    console.log("FAIL   ", t, JSON.stringify(r.error.issues));
  }
}

let rejectCount = 0;
for (const n of negatives) {
  const r = chartSpecSchema.safeParse(n.spec);
  if (!r.success) {
    console.log("REJECT ", n.label, "→", r.error.issues[0]?.message);
    rejectCount++;
  } else {
    console.log("LEAK   ", n.label);
  }
}

console.log(
  `\n${okCount}/${positives.length} positives, ${rejectCount}/${negatives.length} negatives`,
);

if (okCount !== positives.length || rejectCount !== negatives.length) {
  process.exit(1);
}
