import type { ChartSpec } from "@/lib/chart-spec";
import type { ChartArchetypeId } from "@workspace/question-bank";

/**
 * Canonical sample chart specs used by the public Question Bank preview
 * button. One small, illustrative example per implemented archetype so
 * visitors can see what each chart type looks like without needing to
 * navigate to a real CE.
 *
 * Archetypes that don't have a sample here (long-tail / not-yet-curated)
 * gracefully fall back to a "preview coming soon" affordance in the UI.
 */
export const ARCHETYPE_SAMPLES: Partial<Record<ChartArchetypeId, ChartSpec>> = {
  weekly_pattern: {
    type: "weekly_pattern",
    days: [
      { day: "mon", level: "closed", score: 0, note: "Closed" },
      { day: "tue", level: "quietest", score: 30 },
      { day: "wed", level: "quiet", score: 45 },
      { day: "thu", level: "busy", score: 70 },
      { day: "fri", level: "busy", score: 75 },
      { day: "sat", level: "busiest", score: 95 },
      { day: "sun", level: "busy", score: 80 },
    ],
    day_notes: [{ label: "Mon closed", kind: "closed" }],
  },
  hourly_heatmap: {
    type: "hourly_heatmap",
    open_hour: 9,
    close_hour: 19,
    rows: (
      ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
    ).map((day, di) => ({
      day,
      closed: day === "mon",
      hours: Array.from({ length: 24 }, (_, h) => {
        if (day === "mon") return 0;
        if (h < 9 || h >= 19) return 0;
        const peak = 13 + (di % 2);
        const dist = Math.abs(h - peak);
        const dayBoost = di >= 4 ? 15 : 0;
        return Math.max(20, Math.min(100, 90 - dist * 12 + dayBoost));
      }),
    })),
    best_window: {
      label: "Quietest window",
      day: "tue",
      start_hour: 9,
      end_hour: 11,
    },
  },
  booking_window: {
    type: "booking_window",
    curve: [
      { days_before: 0, share: 6 },
      { days_before: 1, share: 9 },
      { days_before: 3, share: 12 },
      { days_before: 7, share: 18 },
      { days_before: 14, share: 22 },
      { days_before: 30, share: 16 },
      { days_before: 60, share: 10 },
      { days_before: 90, share: 7 },
    ],
    sweet_spot: {
      days_before_min: 7,
      days_before_max: 21,
      label: "Sweet spot · 1–3 weeks ahead",
    },
    sold_out_risk: {
      threshold_days: 3,
      message: "Saturdays sell out 3+ days out in peak season.",
    },
  },
  seasonal_curve: {
    type: "seasonal_curve",
    months: [
      { month: "jan", score: 30, status: "very_quiet" },
      { month: "feb", score: 32, status: "quiet" },
      { month: "mar", score: 55, status: "moderate", note: "Best balance" },
      { month: "apr", score: 70, status: "busy" },
      { month: "may", score: 82, status: "busy" },
      { month: "jun", score: 90, status: "peak" },
      { month: "jul", score: 95, status: "peak" },
      { month: "aug", score: 96, status: "peak", note: "Hottest, busiest" },
      { month: "sep", score: 78, status: "busy" },
      { month: "oct", score: 60, status: "moderate", note: "Best balance" },
      { month: "nov", score: 38, status: "quiet" },
      { month: "dec", score: 50, status: "moderate" },
    ],
    best_months: ["March", "October"],
    worst_months: ["August"],
  },
  stat_grid: {
    type: "stat_grid",
    stats: [
      { label: "Annual visitors", value: "1.7M", accent: "purps" },
      { label: "Avg. visit length", value: "85", unit: "min", accent: "candy" },
      { label: "Skip-the-line uptake", value: "82", unit: "%", accent: "okay" },
      { label: "Sat peak hour", value: "12:30", accent: "slate" },
    ],
  },
  ticket_ladder: {
    type: "ticket_ladder",
    currency: "EUR",
    tiers: [
      {
        name: "Standard",
        price: 16,
        includes: ["Same-day entry", "General queue"],
        recommended: false,
      },
      {
        name: "Skip-the-line",
        price: 26,
        includes: ["Priority lane", "Audio guide"],
        recommended: true,
        share: 62,
        wait_savings_min: 90,
      },
      {
        name: "Guided tour",
        price: 49,
        includes: ["Expert guide", "Skip-the-line", "Small group"],
        recommended: false,
      },
    ],
  },
  donut_breakdown: {
    type: "donut_breakdown",
    center_value: "62%",
    center_label: "skip-the-line",
    segments: [
      { label: "Skip-the-line", value: 62, accent: "purps" },
      { label: "Standard", value: 24, accent: "slate" },
      { label: "Guided tour", value: 14, accent: "candy" },
    ],
  },
  compare_zones: {
    type: "compare_zones",
    metric_label: "Average wait time",
    zones: [
      { name: "Main entrance", wait_min: 35, wait_max: 60, status: "long" },
      { name: "Group entrance", wait_min: 5, wait_max: 15, status: "short" },
      {
        name: "Reservation lane",
        wait_min: 0,
        wait_max: 5,
        status: "no_wait",
      },
    ],
  },
  entrance_lanes: {
    type: "entrance_lanes",
    venue_label: "Sample landmark entrance",
    shared_caption: "All four lanes share the same doorway · peak season",
    lanes: [
      {
        name: "Standard line",
        wait_label: "60–90 min",
        tone: "candy",
        dots: 32,
        who: "Walk-up visitors without a reservation",
        wait_peak: "60–90 min",
        wait_off_peak: "15–25 min",
        how: "Join the main queue at the front entrance.",
      },
      {
        name: "Reservation",
        wait_label: "10–20 min",
        tone: "purps",
        dots: 10,
        who: "Anyone with a timed-entry ticket booked online",
        wait_peak: "10–20 min",
        wait_off_peak: "5 min",
        how: "Book a 30-min time slot in advance and arrive on time.",
      },
      {
        name: "Skip-the-line tour",
        wait_label: "~5 min",
        tone: "okay",
        dots: 4,
        who: "Guided-tour groups with a priority slot",
        wait_peak: "5 min",
        wait_off_peak: "5 min",
        how: "Meet the guide 15 min before; they handle entry.",
      },
      {
        name: "Reserved entry pass",
        wait_label: "Variable",
        tone: "slate",
        dots: 12,
        dashed: true,
        who: "Pass holders without a fixed slot",
        wait_peak: "20–40 min",
        wait_off_peak: "10 min",
        how: "Use the pass-holder door; staff may direct overflow.",
      },
    ],
  },
  queue_compare: {
    type: "queue_compare",
    venue_label: "Sample landmark entrance",
    shared_caption: "Peak season · midday",
    lanes: [
      {
        name: "Standard line",
        wait_label: "~60 min",
        tone: "candy",
        dots: 30,
      },
      {
        name: "Skip-the-line",
        wait_label: "~10 min",
        tone: "purps",
        dots: 8,
      },
      {
        name: "Guided group",
        wait_label: "~5 min",
        tone: "okay",
        dots: 4,
      },
    ],
  },
  duration_stat: {
    type: "duration_stat",
    headline: "Most visitors stay 60–90 minutes",
    scale_min: [
      { label: "30 min", minutes: 30 },
      { label: "60 min", minutes: 60 },
      { label: "90 min", minutes: 90 },
      { label: "2 hr", minutes: 120 },
    ],
    profiles: [
      { name: "Quick visit", icon: "stopwatch", range_min: 30, range_max: 45 },
      {
        name: "Most visitors",
        icon: "head",
        range_min: 60,
        range_max: 90,
        highlight: true,
      },
      { name: "Deep visit", icon: "bust", range_min: 90, range_max: 120 },
    ],
    tip: "Save the biggest gallery for last — crowds thin out near closing.",
  },
  conditions_calendar: {
    type: "conditions_calendar",
    metric: "snow_depth_cm",
    unit_label: "cm",
    metric_label: "Snow depth",
    months: [
      { month: "jan", value: 88, status: "optimal" },
      { month: "feb", value: 92, status: "optimal" },
      { month: "mar", value: 80, status: "optimal" },
      { month: "apr", value: 55, status: "fair" },
      { month: "may", value: 20, status: "poor" },
      { month: "jun", value: 5, status: "poor" },
      { month: "jul", value: 0, status: "poor" },
      { month: "aug", value: 0, status: "poor" },
      { month: "sep", value: 10, status: "poor" },
      { month: "oct", value: 35, status: "fair" },
      { month: "nov", value: 60, status: "fair" },
      { month: "dec", value: 82, status: "optimal" },
    ],
    reference_bands: [
      { label: "Optimal", min: 70, max: 100, tone: "optimal" },
      { label: "Fair", min: 40, max: 70, tone: "fair" },
      { label: "Poor", min: 0, max: 40, tone: "poor" },
    ],
    best_months: ["January", "February", "December"],
    worst_months: ["July", "August"],
  },
  price_curve: {
    type: "price_curve",
    currency: "EUR",
    base_label: "Avg. price",
    base_value: 220,
    points: [
      { month: "jan", index: 80 },
      { month: "feb", index: 78 },
      { month: "mar", index: 90 },
      { month: "apr", index: 105 },
      { month: "may", index: 120 },
      { month: "jun", index: 138 },
      { month: "jul", index: 150 },
      { month: "aug", index: 152 },
      { month: "sep", index: 118 },
      { month: "oct", index: 95 },
      { month: "nov", index: 82 },
      { month: "dec", index: 110 },
    ],
    cheapest_months: ["January", "February", "November"],
    priciest_months: ["July", "August"],
  },

  history_timeline: {
    type: "history_timeline",
    span_label: "500 BC – present",
    events: [
      {
        date_label: "500 BC",
        sort_year: -500,
        title: "First settlement",
        era: "origins",
        description: "A hilltop gathering place for seasonal festivals draws traders and travellers from across the region.",
      },
      {
        date_label: "AD 80",
        sort_year: 80,
        title: "Monument built",
        era: "construction",
        description: "Civic authorities commission a permanent amphitheatre; local stone quarried over eight years.",
        metric_value: "50,000",
        metric_label: "seats",
      },
      {
        date_label: "AD 200",
        sort_year: 200,
        title: "Golden age",
        era: "spectacle",
        description: "Annual festival crowds peak; the venue hosts the empire's most celebrated games and ceremonies.",
        metric_value: "2M",
        metric_label: "visitors / yr",
      },
      {
        date_label: "AD 470",
        sort_year: 470,
        title: "Decline sets in",
        era: "decline",
        description: "Political instability cuts civic investment; maintenance lapses and the outer colonnade crumbles.",
      },
      {
        date_label: "1200",
        sort_year: 1200,
        title: "Fortified & reused",
        era: "reuse",
        description: "A local dynasty converts the abandoned structure; a chapel is installed inside the vaults.",
      },
      {
        date_label: "1820",
        sort_year: 1820,
        title: "Scholarly restoration",
        era: "restoration",
        description: "Archaeologists document the ruins and lobby parliament for public funding; excavation begins.",
      },
      {
        date_label: "Today",
        sort_year: 2024,
        title: "Modern landmark",
        era: "modern",
        description: "Listed as a UNESCO World Heritage Site and receiving over two million visitors a year.",
        metric_value: "2M+",
        metric_label: "visitors / yr",
      },
    ],
    highlight_event: "Golden age",
    callout: "From ancient gathering place to modern UNESCO landmark — two and a half millennia in seven events.",
  },

  time_split: {
    type: "time_split",
    total_min: 150,
    total_label: "Typical visit",
    segments: [
      { label: "Entry & orientation", minutes: 20, accent: "slate", note: "Bag check + map." },
      { label: "Main highlights", minutes: 70, accent: "candy", note: "Can't-skip core." },
      { label: "Deeper exploration", minutes: 40, accent: "purps", optional: true, note: "Skip if tight on time." },
      { label: "Gift shop & exit", minutes: 20, accent: "okay", optional: true },
    ],
    callout: "Allow 2.5 hours for the full experience; the core highlights fit in 90 minutes.",
  },

  daily_pattern: {
    type: "daily_pattern",
    points: [
      { time: "9:00", crowd: 1 },
      { time: "10:00", crowd: 3 },
      { time: "11:00", crowd: 7 },
      { time: "12:30", crowd: 10 },
      { time: "14:00", crowd: 9 },
      { time: "15:30", crowd: 7 },
      { time: "16:30", crowd: 4 },
      { time: "17:30", crowd: 2 },
      { time: "18:00", crowd: 1 },
    ],
    zones: [
      { label: "Best", tone: "best", start: "9:00", end: "10:30" },
      { label: "Peak", tone: "peak", start: "10:30", end: "16:00" },
      { label: "2nd best", tone: "second_best", start: "16:00", end: "18:00" },
    ],
    caption: { opens: "9:00am", last_entry: "5:30pm" },
  },

  slot_compare: {
    type: "slot_compare",
    slots: [
      { name: "Early morning", time_window: "8:00–10:00", accent: "purps", recommended: true },
      { name: "Midday", time_window: "11:00–14:00", accent: "candy", recommended: false },
    ],
    dimensions: [
      { label: "Quiet crowds", scores: [85, 30] },
      { label: "Photo light", scores: [90, 55] },
      { label: "Short queues", scores: [80, 28] },
      { label: "Ticket availability", scores: [58, 92] },
    ],
    insight: "Early morning wins on crowds and photography; midday has more ticket availability.",
  },

  daily_programme: {
    type: "daily_programme",
    open_time: "9:00",
    close_time: "18:00",
    events: [
      { name: "Morning keeper feeding", start_time: "9:30", duration_min: 30, location: "Main enclosure", popularity: 90, icon: "feeding", note: "First slot — quieter crowds" },
      { name: "Morning show", start_time: "11:00", duration_min: 45, location: "Arena", popularity: 95, icon: "show", note: "Book in advance" },
      { name: "Behind the scenes", start_time: "13:30", duration_min: 60, location: "Staff area", popularity: 70, icon: "tour" },
      { name: "Expert talk", start_time: "15:00", duration_min: 30, location: "Education centre", popularity: 60, icon: "talk" },
      { name: "Afternoon feeding", start_time: "16:30", duration_min: 30, location: "Main enclosure", popularity: 85, icon: "feeding" },
    ],
    highlight_event: "Morning show",
  },

  sighting_probability: {
    type: "sighting_probability",
    display: "single",
    series: [
      {
        name: "Humpback whale",
        accent: "purps",
        monthly: [20, 25, 40, 65, 80, 90, 95, 92, 75, 55, 35, 22],
      },
    ],
    best_months: ["June", "July", "August"],
    worst_months: ["January", "December"],
  },

  departure_reliability: {
    type: "departure_reliability",
    months: [
      { month: "jan", pct_ran: 72, note: "Winter storms" },
      { month: "feb", pct_ran: 78 },
      { month: "mar", pct_ran: 85 },
      { month: "apr", pct_ran: 91 },
      { month: "may", pct_ran: 96 },
      { month: "jun", pct_ran: 98 },
      { month: "jul", pct_ran: 98 },
      { month: "aug", pct_ran: 99 },
      { month: "sep", pct_ran: 97 },
      { month: "oct", pct_ran: 93 },
      { month: "nov", pct_ran: 84 },
      { month: "dec", pct_ran: 75, note: "Holiday weather" },
    ],
    target_pct: 90,
    best_months: ["August", "July"],
    worst_months: ["January", "December"],
  },

  ride_wait_curve: {
    type: "ride_wait_curve",
    subject: "Flagship coaster",
    y_label: "Wait (min)",
    unit: "min",
    open_hour: 9,
    close_hour: 20,
    hours: [
      { hour: 0, value: 0 }, { hour: 1, value: 0 }, { hour: 2, value: 0 }, { hour: 3, value: 0 },
      { hour: 4, value: 0 }, { hour: 5, value: 0 }, { hour: 6, value: 0 }, { hour: 7, value: 0 },
      { hour: 8, value: 0 }, { hour: 9, value: 8 }, { hour: 10, value: 22 }, { hour: 11, value: 45 },
      { hour: 12, value: 60 }, { hour: 13, value: 65 }, { hour: 14, value: 62 }, { hour: 15, value: 55 },
      { hour: 16, value: 42 }, { hour: 17, value: 35 }, { hour: 18, value: 28 }, { hour: 19, value: 15 },
      { hour: 20, value: 0 }, { hour: 21, value: 0 }, { hour: 22, value: 0 }, { hour: 23, value: 0 },
    ],
    zones: [
      { label: "Short wait", tone: "best", start_hour: 9, end_hour: 11 },
      { label: "Peak wait", tone: "peak", start_hour: 11, end_hour: 16 },
      { label: "Easing off", tone: "second_best", start_hour: 16, end_hour: 20 },
    ],
    insight: "Head here first at opening — waits double by 11am.",
  },

  activity_window: {
    type: "activity_window",
    subject: "Dolphin feeding bay",
    y_label: "Activity level",
    unit: "",
    open_hour: 8,
    close_hour: 17,
    hours: [
      { hour: 0, value: 0 }, { hour: 1, value: 0 }, { hour: 2, value: 0 }, { hour: 3, value: 0 },
      { hour: 4, value: 0 }, { hour: 5, value: 0 }, { hour: 6, value: 0 }, { hour: 7, value: 0 },
      { hour: 8, value: 35 }, { hour: 9, value: 65 }, { hour: 10, value: 80 }, { hour: 11, value: 70 },
      { hour: 12, value: 55 }, { hour: 13, value: 88 }, { hour: 14, value: 100 }, { hour: 15, value: 85 },
      { hour: 16, value: 60 }, { hour: 17, value: 0 }, { hour: 18, value: 0 }, { hour: 19, value: 0 },
      { hour: 20, value: 0 }, { hour: 21, value: 0 }, { hour: 22, value: 0 }, { hour: 23, value: 0 },
    ],
    zones: [
      { label: "Morning sessions", tone: "second_best", start_hour: 8, end_hour: 12 },
      { label: "Afternoon peak", tone: "peak", start_hour: 13, end_hour: 16 },
    ],
    insight: "Afternoon feeding sessions at 1pm and 2:30pm see the highest activity.",
  },

  opening_hour_rank: {
    type: "opening_hour_rank",
    subject_label: "Ride",
    unit: "min",
    hour_label: "Wait at 9am opening",
    bands: { green_max: 15, amber_max: 35 },
    subjects: [
      { name: "Flagship coaster", wait_minutes: 5, note: "Go here first" },
      { name: "Dark ride", wait_minutes: 12 },
      { name: "Sky tower", wait_minutes: 8 },
      { name: "Water rapids", wait_minutes: 25 },
      { name: "Family ride", wait_minutes: 35 },
      { name: "Thrill drop", wait_minutes: 55, note: "Most popular" },
    ],
    insight: "Get to the thrill drop immediately after opening — it's the fastest to peak.",
  },

  savings_breakdown: {
    type: "savings_breakdown",
    currency: "EUR",
    card_price: 59,
    card_label: "City Card (48 hr)",
    attractions: [
      { name: "National Museum", standalone_price: 18, usage_rate: 95 },
      { name: "Historic Baths", standalone_price: 14, usage_rate: 80 },
      { name: "Castle tour", standalone_price: 12, usage_rate: 70 },
      { name: "Gallery of Modern Art", standalone_price: 10, usage_rate: 55 },
    ],
  },

  golden_hour_match: {
    type: "golden_hour_match",
    location_label: "Summit viewpoint",
    slots: [
      { label: "Sunrise 5:30–7:30" },
      { label: "Sunset 18:00–20:00" },
    ],
    months: [
      { month: "jan", cells: [{ aligned: false, sub_rating: 30 }, { aligned: true, sub_rating: 65 }] },
      { month: "feb", cells: [{ aligned: true, sub_rating: 55 }, { aligned: true, sub_rating: 72 }] },
      { month: "mar", cells: [{ aligned: true, sub_rating: 70 }, { aligned: true, sub_rating: 80 }] },
      { month: "apr", cells: [{ aligned: true, sub_rating: 85 }, { aligned: true, sub_rating: 88 }] },
      { month: "may", cells: [{ aligned: true, sub_rating: 90 }, { aligned: true, sub_rating: 85 }] },
      { month: "jun", cells: [{ aligned: true, sub_rating: 95 }, { aligned: false, sub_rating: 40 }] },
      { month: "jul", cells: [{ aligned: true, sub_rating: 92 }, { aligned: false, sub_rating: 35 }] },
      { month: "aug", cells: [{ aligned: true, sub_rating: 88 }, { aligned: false, sub_rating: 45 }] },
      { month: "sep", cells: [{ aligned: true, sub_rating: 82 }, { aligned: true, sub_rating: 78 }] },
      { month: "oct", cells: [{ aligned: false, sub_rating: 60 }, { aligned: true, sub_rating: 82 }] },
      { month: "nov", cells: [{ aligned: false, sub_rating: 30 }, { aligned: true, sub_rating: 68 }] },
      { month: "dec", cells: [{ aligned: false, sub_rating: 20 }, { aligned: true, sub_rating: 60 }] },
    ],
    helper: "Summer sunrises and spring/autumn sunsets offer the best golden-hour light.",
  },

  zone_crowd_heatmap: {
    type: "zone_crowd_heatmap",
    open_hour: 9,
    close_hour: 18,
    zones: [
      {
        name: "Egyptian Gallery",
        emoji: "🏺",
        hours: [0,0,0,0,0,0,0,0,0,25,55,80,85,75,60,50,38,25,0,0,0,0,0,0],
      },
      {
        name: "Greek Sculpture",
        emoji: "🏛️",
        hours: [0,0,0,0,0,0,0,0,0,20,40,65,75,70,55,45,32,18,0,0,0,0,0,0],
      },
      {
        name: "Medieval Hall",
        emoji: "⚔️",
        hours: [0,0,0,0,0,0,0,0,0,15,30,50,60,55,45,38,25,15,0,0,0,0,0,0],
      },
    ],
    best_window: { label: "Medieval Hall · 9–10am", zone: "Medieval Hall", start_hour: 9, end_hour: 10 },
  },

  zone_wait_heatmap: {
    type: "zone_wait_heatmap",
    open_hour: 9,
    close_hour: 20,
    unit: "min",
    zones: [
      {
        name: "Thrill section",
        emoji: "🎢",
        hours: [0,0,0,0,0,0,0,0,0,5,25,55,70,65,60,50,40,30,20,10,0,0,0,0],
      },
      {
        name: "Family zone",
        emoji: "🎠",
        hours: [0,0,0,0,0,0,0,0,0,8,20,40,50,48,42,35,28,22,15,8,0,0,0,0],
      },
      {
        name: "Water rides",
        emoji: "💦",
        hours: [0,0,0,0,0,0,0,0,0,0,15,35,55,60,55,45,35,25,15,5,0,0,0,0],
      },
    ],
    best_window: { label: "Family zone · 9am", zone: "Family zone", start_hour: 9, end_hour: 10 },
  },
};
