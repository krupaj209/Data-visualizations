import type { CuratedCe } from "../types";

export const vaticanMuseums: CuratedCe = {
  ce: {
    slug: "vatican-museums",
    name: "Vatican Museums",
    city: "Vatican City",
    country: "Vatican City",
    category: "museum",
    summary:
      "Five centuries of pontifical collections — Egyptian antiquities, Greco-Roman sculpture, the Pinacoteca, the Raphael Rooms, and the Sistine Chapel — under one roof; the second-most-visited museum in the world (~6.8M visitors / yr).",
    emoji: "🏛️",
  },
  charts: [
    {
      slug: "entrances",
      question:
        "Which entrance should I use at the Vatican Museums?",
      title: "Which door to use at the Vatican Museums",
      subtitle: "Five gates, very different waits",
      insight:
        "The single biggest queue-saver at the Vatican is using Sant'Anna with a pre-booked timed slot — Viale Vaticano's main queue routinely runs 60–120 minutes from 9am.",
      chart_type: "entrance_map",
      spec: {
        type: "entrance_map",
        venue_label: "Vatican Museums",
        intro_phrase: "5 entrances · north-west, east, south-east",
        entrances: [
          {
            name: "Viale Vaticano (main)",
            status: "standard",
            position: "nw",
            wait_label: "60–120 min",
            best_for: ["walk-up tickets"],
            transport: { mode: "metro", label: "Metro A · Ottaviano (5 min walk)" },
            note: "Default queue at the official ticket office on Viale Vaticano, along the north-west wall. Long lines from 9am to noon.",
          },
          {
            name: "Sant'Anna Gate (reserved)",
            status: "recommended",
            position: "e",
            wait_label: "5–15 min",
            best_for: ["skip-the-line tickets", "early entry"],
            transport: { mode: "metro", label: "Metro A · Ottaviano (8 min walk)" },
            note: "On Via di Porta Angelica on the east side. Used by pre-booked timed-entry holders — arrive 10 min before your slot.",
          },
          {
            name: "Cancello Petriano",
            status: "groups",
            position: "se",
            wait_label: "Tour-led",
            best_for: ["organised groups"],
            transport: { mode: "bus", label: "Bus 40/64 · Borgo (5 min walk)" },
            note: "South-east of the colonnade, just off St. Peter's Square. Group-only gate; individuals not admitted here.",
          },
          {
            name: "Step-free entrance",
            status: "accessible",
            position: "ne",
            best_for: ["wheelchair users", "strollers"],
            transport: { mode: "metro", label: "Metro A · Ottaviano (8 min walk)" },
            note: "Dedicated ramp and lift access alongside Sant'Anna on the north-east — ring the bell for staff assistance.",
          },
          {
            name: "Old service gate",
            status: "closed",
            position: "w",
            note: "Staff-only gate on the west wall; do not queue here despite older guidebook maps.",
          },
        ],
        assembly_point: {
          label: "Tour meeting point · Piazza del Risorgimento",
          position: "n",
        },
        callout:
          "Pre-book a timed slot and use Sant'Anna on the east side — it's the single biggest time-saver at the Vatican Museums.",
      },
    },
    {
      slug: "floor-plan-flow",
      question:
        "What's the best room-by-room order through the Vatican Museums?",
      title: "Suggested order through the galleries",
      subtitle: "About four hours from Sant'Anna to the Sistine Chapel",
      insight:
        "Walk against the crowd: cover the Pinacoteca first while everyone races to the Sistine, then arrive at the chapel rested and ahead of the late-morning waves.",
      chart_type: "floor_plan_flow",
      spec: {
        type: "floor_plan_flow",
        start_label: "Sant'Anna entrance",
        total_min: 240,
        stops: [
          { name: "Sant'Anna entrance & ticket pickup", kind: "start", dwell_min: 10 },
          {
            name: "Pinacoteca picture gallery",
            level: "Wing IV",
            kind: "stop",
            dwell_min: 45,
            note: "Da Vinci's St. Jerome, Raphael's Transfiguration.",
          },
          {
            name: "Egyptian & Etruscan rooms",
            level: "Lower level",
            kind: "stop",
            dwell_min: 30,
          },
          {
            name: "Pio-Clementine sculpture wing",
            level: "Wing I",
            kind: "stop",
            dwell_min: 30,
            note: "Laocoön and the Apollo Belvedere.",
          },
          {
            name: "Gallery of Maps & Tapestries",
            kind: "stop",
            dwell_min: 25,
          },
          {
            name: "Raphael Rooms",
            kind: "highlight",
            dwell_min: 30,
            note: "School of Athens and the four papal apartments.",
          },
          {
            name: "Sistine Chapel",
            kind: "highlight",
            dwell_min: 30,
            note: "Michelangelo's ceiling and Last Judgement.",
          },
          {
            name: "Exit via St. Peter's shortcut",
            kind: "end",
            dwell_min: 5,
            note: "Tour-only shortcut into the basilica; otherwise exit via the Spiral Stair.",
          },
        ],
        callout:
          "Walk against the crowd: cover the Pinacoteca first while everyone races to the Sistine.",
      },
    },
    {
      slug: "rules-checklist",
      question:
        "What rules should I know before visiting the Vatican Museums?",
      title: "What to know before you go",
      subtitle: "Dress code, security, and photo rules",
      insight:
        "Two non-negotiables trip up most first-time visitors: shoulders and knees must be covered, and photography is strictly forbidden inside the Sistine Chapel.",
      chart_type: "rules_checklist",
      spec: {
        type: "rules_checklist",
        headline: "Vatican Museums house rules",
        items: [
          {
            label: "Shoulders & knees covered",
            severity: "required",
            category: "dress",
            note: "Strict at St. Peter's and the Sistine Chapel. No shorts above the knee, no sleeveless tops.",
          },
          { label: "Hat off inside the basilica", severity: "required", category: "dress" },
          {
            label: "Bag check at entry",
            severity: "required",
            category: "security",
            note: "Large bags must be left at the free cloakroom.",
          },
          {
            label: "Backpacks larger than 40×35×15 cm",
            severity: "prohibited",
            category: "items",
          },
          { label: "Tripods, selfie sticks & monopods", severity: "prohibited", category: "photography" },
          {
            label: "Photography in the Sistine Chapel",
            severity: "prohibited",
            category: "photography",
            note: "Strictly enforced. Photos allowed elsewhere without flash.",
          },
          { label: "Quiet voices in the Sistine Chapel", severity: "required", category: "behavior" },
          {
            label: "Bottled water",
            severity: "allowed",
            category: "food",
            note: "Refill fountains throughout the museums.",
          },
          { label: "Food & snacks inside galleries", severity: "prohibited", category: "food" },
          { label: "Small handbags", severity: "allowed", category: "items" },
        ],
        source_note:
          "From the Vatican Museums official visitor regulations (museivaticani.va).",
      },
    },
    {
      slug: "transit-options",
      question:
        "How do I get to the Vatican Museums from central Rome?",
      title: "Getting there from central Rome",
      subtitle: "Five ways from the historic centre to Viale Vaticano",
      insight:
        "Metro Line A to Ottaviano is the single best balance of speed, cost, and predictability — taxis only win when you're carrying a stroller or lots of bags.",
      chart_type: "transit_options",
      spec: {
        type: "transit_options",
        origin_label: "Rome city centre",
        destination_label: "Vatican Museums",
        options: [
          {
            mode: "metro",
            label: "Line A → Ottaviano",
            minutes_min: 15,
            minutes_max: 25,
            cost_label: "€1.50 single",
            frequency_label: "Every 4–7 min",
            walk_min: 9,
            recommended: true,
            note: "Cheapest reliable option; expect crowded carriages 8–10am.",
          },
          {
            mode: "tram",
            label: "Tram 19 from Risorgimento",
            minutes_min: 20,
            minutes_max: 35,
            cost_label: "€1.50 single",
            frequency_label: "Every 10–15 min",
            walk_min: 8,
          },
          {
            mode: "bus",
            label: "Bus 40 / 64 to Borgo",
            minutes_min: 25,
            minutes_max: 45,
            cost_label: "€1.50 single",
            frequency_label: "Every 5–10 min",
            walk_min: 12,
            note: "Pickpocket-heavy — keep valuables zipped.",
          },
          {
            mode: "taxi",
            label: "Licensed taxi from Termini",
            minutes_min: 15,
            minutes_max: 30,
            cost_label: "€13–18",
            frequency_label: "On-demand",
            walk_min: 0,
          },
          {
            mode: "walk",
            label: "On foot from Piazza Navona",
            minutes_min: 25,
            minutes_max: 35,
            cost_label: "Free",
            walk_min: 0,
            note: "Scenic — over Ponte Sant'Angelo and along Via della Conciliazione.",
          },
        ],
        callout:
          "Metro Line A to Ottaviano wins on every axis except step-free comfort.",
      },
    },
    {
      slug: "time-value-matrix",
      question:
        "Which Vatican Museums ticket gives the best value for my time?",
      title: "Which ticket gives the best payoff",
      subtitle: "Four common ticket scenarios compared",
      insight:
        "Skip-the-line guided is the sweet spot for most adult visitors — covers the headline rooms without paying for before-hours, while the early-access ticket is the only way to see the Sistine without crowds.",
      chart_type: "time_value_matrix",
      spec: {
        type: "time_value_matrix",
        currency: "EUR",
        scenarios: [
          {
            id: "half_day_basic",
            label: "Half-day basic",
            accent: "slate",
            time_label: "~3 hrs",
            price_label: "€20",
          },
          {
            id: "skip_line_guided",
            label: "Skip-the-line guided",
            accent: "candy",
            time_label: "~4 hrs",
            price_label: "€69",
          },
          {
            id: "early_access",
            label: "Before-hours access",
            accent: "purps",
            time_label: "~5 hrs",
            price_label: "€115",
          },
          {
            id: "two_day_deep",
            label: "Two-day deep dive",
            accent: "okay",
            time_label: "2 days",
            price_label: "€140",
          },
        ],
        dimensions: [
          {
            label: "Headline coverage",
            scores: [55, 80, 90, 100],
            note: "How much of the museum's must-see hits the walk.",
          },
          {
            label: "Queue avoidance",
            scores: [20, 90, 100, 75],
            note: "Bigger = less time queueing at Viale Vaticano.",
          },
          { label: "Sistine without crowds", scores: [10, 40, 100, 50] },
          { label: "Value per €", scores: [85, 70, 45, 75] },
          {
            label: "Kid-friendliness",
            scores: [65, 55, 30, 80],
            note: "Long tours wear young kids out.",
          },
        ],
        summary: {
          best_value_scenario: "skip_line_guided",
          headline:
            "Skip-the-line guided is the sweet spot for most adult visitors.",
        },
        insight:
          "If a quiet Sistine matters more than money, the before-hours ticket is the only scenario that delivers it.",
      },
    },
    {
      slug: "accessibility",
      question: "How accessible are the Vatican Museums?",
      title: "Accessibility at the Vatican Museums",
      subtitle: "What's step-free, what's on request, and who to contact",
      insight:
        "Most of the museum is fully step-free; the Sistine Chapel's final approach is the one notable gap and staff can assist on request.",
      chart_type: "accessibility_guide",
      spec: {
        type: "accessibility_guide",
        headline: "Accessibility at the Vatican Museums",
        features: [
          {
            label: "Step-free access to all main galleries",
            category: "mobility",
            availability: "full",
            detail: "Lifts serve every floor on the standard visit route.",
          },
          {
            label: "Manual wheelchair loan",
            category: "mobility",
            availability: "on_request",
            detail: "Free at the Sant'Anna entrance; first-come first-served.",
          },
          {
            label: "Step-free access to the Sistine Chapel",
            category: "mobility",
            availability: "partial",
            detail: "Last 12 steps require staff assistance via the side lift.",
          },
          {
            label: "Audio guide with descriptive narration",
            category: "sensory",
            availability: "full",
            detail: "Available in 7 languages at the audio guide desk.",
          },
          {
            label: "Sign-language guided tours",
            category: "sensory",
            availability: "on_request",
            detail: "LIS-trained guides — pre-book at least 7 days ahead.",
          },
          {
            label: "Sensory-friendly visit slots",
            category: "cognitive",
            availability: "on_request",
            detail: "Quieter pre-opening tours on selected mornings.",
          },
          {
            label: "Companion ticket (free)",
            category: "services",
            availability: "full",
            detail: "One free entry for the carer of a disabled visitor.",
          },
          {
            label: "Accessible toilets on every level",
            category: "facilities",
            availability: "full",
          },
          {
            label: "Designated parking",
            category: "facilities",
            availability: "none",
            detail: "No on-site parking; nearest accessible spots at Risorgimento garage.",
          },
        ],
        contact: "Disabled visitors office: accoglienza.disabili@scv.va",
        callout:
          "Most of the museum is fully step-free; staff can assist for the Sistine's final approach.",
      },
    },
    {
      slug: "best-for",
      question: "Who are the Vatican Museums best for?",
      title: "Who the Vatican Museums are best for",
      subtitle: "How four visitor types fare across the headline experiences",
      insight:
        "Art lovers and architecture buffs win the most; families with under-7s should pick the early-access slot or skip the long galleries for a focused Sistine + St. Peter's combo.",
      chart_type: "best_for_matrix",
      spec: {
        type: "best_for_matrix",
        facets: [
          { name: "Sistine Chapel" },
          { name: "Raphael Rooms" },
          { name: "Pinacoteca paintings" },
          { name: "Sculpture wings" },
          { name: "Egyptian / Etruscan" },
          { name: "Quiet visit experience" },
        ],
        audiences: [
          {
            label: "Art lovers",
            accent: "candy",
            scores: [95, 95, 90, 70, 55, 60],
            note: "The single best museum in Italy for canonical Renaissance painting.",
          },
          {
            label: "Architecture buffs",
            accent: "purps",
            scores: [85, 80, 50, 80, 40, 55],
            note: "Bramante's spiral stair, the gallery sequence, and the chapel itself.",
          },
          {
            label: "Families with kids",
            accent: "okay",
            scores: [70, 40, 35, 75, 80, 30],
            note: "Sculpture and Egyptian wings hold attention; long painting halls don't.",
          },
          {
            label: "First-time Rome visitors",
            accent: "hola",
            scores: [100, 70, 55, 60, 45, 35],
            note: "Sistine is the headline; pair with a guided tour to manage crowds.",
          },
        ],
        insight:
          "Art lovers and architecture buffs win the most; families should pick the early-access slot for a focused Sistine + sculpture combo.",
      },
    },
    // --- Modern timing charts (embed-safe, compact-aware). ---
    // NOTE: Two legacy-type Vatican charts that previously lived in the dev DB
    // were intentionally NOT curated here: `vatican-zone-waits` (compare_zones)
    // and `vatican-ticket-options` (ticket_ladder). Those chart types predate
    // the curated cluster, have no compact support, and are outside the CMS
    // embed contract. If a writer later wants zone-wait or ticket guidance on
    // live, rebuild it in a supported, embed-safe chart type.
    {
      slug: "vatican-hourly-crowds",
      question: "What time of day is best to avoid the biggest crowds?",
      title: "Beat The Crowds",
      subtitle:
        "Estimated crowd levels inside the museums by hour and day of the week.",
      insight:
        "For the quietest visit, book the first slot of the day or enter after 3 PM when tour groups have left.",
      chart_type: "hourly_heatmap",
      spec: {
        type: "hourly_heatmap",
        open_hour: 8,
        close_hour: 19,
        rows: [
          {
            day: "mon",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 40, 60, 80, 90, 95, 90, 80, 60, 50, 40, 0,
              0, 0, 0, 0, 0,
            ],
          },
          {
            day: "tue",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 35, 55, 75, 85, 90, 85, 75, 50, 40, 30, 0,
              0, 0, 0, 0, 0,
            ],
          },
          {
            day: "wed",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 50, 70, 80, 75, 85, 90, 80, 65, 55, 45, 0,
              0, 0, 0, 0, 0,
            ],
          },
          {
            day: "thu",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 35, 55, 75, 85, 90, 85, 75, 50, 40, 30, 0,
              0, 0, 0, 0, 0,
            ],
          },
          {
            day: "fri",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 45, 65, 85, 95, 98, 95, 85, 65, 55, 45, 0,
              0, 0, 0, 0, 0,
            ],
          },
          {
            day: "sat",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 60, 80, 95, 100, 100, 95, 90, 75, 65, 55,
              0, 0, 0, 0, 0, 0,
            ],
          },
          {
            day: "sun",
            closed: true,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0,
            ],
          },
        ],
        best_window: {
          day: "tue",
          label: "Quietest Window",
          start_hour: 15,
          end_hour: 17,
        },
      },
    },
    {
      slug: "vatican-booking-advice",
      question: "How far in advance should I book my Vatican tickets?",
      title: "When To Book",
      subtitle:
        "Share of tickets booked a certain number of days before the visit date.",
      insight:
        "Book at least 60 days in advance for peak season to secure your preferred date and time.",
      chart_type: "booking_window",
      spec: {
        type: "booking_window",
        curve: [
          { days_before: 120, share: 5 },
          { days_before: 90, share: 15 },
          { days_before: 60, share: 25 },
          { days_before: 45, share: 20 },
          { days_before: 30, share: 15 },
          { days_before: 14, share: 10 },
          { days_before: 7, share: 5 },
          { days_before: 2, share: 0 },
        ],
        sweet_spot: {
          label: "Best availability and choice of times.",
          days_before_min: 45,
          days_before_max: 90,
        },
        sold_out_risk: {
          message: "High risk of selling out for popular times within 3 weeks.",
          threshold_days: 21,
        },
      },
    },
    {
      slug: "vatican-best-season",
      question: "What is the best month to visit the Vatican?",
      title: "Best Time Of Year",
      subtitle: "A month-by-month guide to crowds and typical conditions.",
      insight:
        "For pleasant weather and slightly more manageable crowds, plan your visit for May or September.",
      chart_type: "seasonal_curve",
      spec: {
        type: "seasonal_curve",
        months: [
          { month: "jan", score: 40, status: "quiet", note: "Cool weather, fewer crowds." },
          { month: "feb", score: 35, status: "quiet", note: "Lent can affect opening hours." },
          { month: "mar", score: 60, status: "moderate", note: "Crowds build towards Easter." },
          { month: "apr", score: 80, status: "busy", note: "Pleasant weather, post-Easter rush." },
          { month: "may", score: 85, status: "busy", note: "Beautiful weather, very popular." },
          { month: "jun", score: 95, status: "peak", note: "Summer peak season begins." },
          { month: "jul", score: 90, status: "peak", note: "Very hot and crowded." },
          { month: "aug", score: 100, status: "peak", note: "Hottest and busiest month." },
          { month: "sep", score: 88, status: "busy", note: "Great weather, still very busy." },
          { month: "oct", score: 82, status: "busy", note: "Cooler weather, popular shoulder month." },
          { month: "nov", score: 50, status: "moderate", note: "Crowds drop off significantly." },
          { month: "dec", score: 65, status: "busy", note: "Festive season brings holiday crowds." },
        ],
        best_months: ["May", "September"],
        worst_months: ["August"],
      },
    },
  ],
};
