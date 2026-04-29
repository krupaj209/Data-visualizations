// Hand-curated chart deck for the Florence Duomo (Cattedrale di Santa Maria
// del Fiore). Mirrors the `seasonal_curve` structure used for the Accademia.
//
// The Duomo's complex covers the cathedral, dome climb, baptistery, bell
// tower and crypt — most visitors are split between dome-climb tickets and
// the free cathedral floor, so seasonality is dominated by the climb queues.

export const ce = {
  slug: "duomo-di-firenze",
  name: "Duomo di Firenze",
  city: "Florence",
  country: "Italy",
  category: "landmark",
  summary:
    "Brunelleschi's iconic dome and the cathedral complex at the heart of Florence. The free cathedral floor sees relentless walk-up lines; the dome climb sells out months ahead in summer and is the real planning bottleneck.",
  emoji: "⛪",
};

export const charts = [
  {
    slug: "by-month",
    question: "Which month is best for me?",
    title: "Crowds, weather and price by month",
    subtitle: "Toggle to see what matters to you most",
    insight:
      "Climb the dome in March or late October for short queues and cool stairs. Avoid July and August — afternoon dome climbs become a sweltering 80m wait inside the brick vault.",
    chart_type: "seasonal_curve",
    spec: {
      type: "seasonal_curve",
      months: [
        { month: "jan", score: 30, status: "quiet", weather_score: 32, price_score: 40 },
        { month: "feb", score: 32, status: "quiet", weather_score: 38, price_score: 42 },
        { month: "mar", score: 55, status: "moderate", weather_score: 64, price_score: 58 },
        { month: "apr", score: 84, status: "busy", weather_score: 82, price_score: 78 },
        { month: "may", score: 90, status: "busy", weather_score: 92, price_score: 82 },
        { month: "jun", score: 92, status: "busy", weather_score: 70, price_score: 88 },
        { month: "jul", score: 98, status: "peak", weather_score: 48, price_score: 95 },
        { month: "aug", score: 99, status: "peak", weather_score: 44, price_score: 98 },
        { month: "sep", score: 82, status: "busy", weather_score: 88, price_score: 82 },
        { month: "oct", score: 58, status: "moderate", weather_score: 80, price_score: 62 },
        { month: "nov", score: 40, status: "quiet", weather_score: 46, price_score: 46 },
        { month: "dec", score: 62, status: "moderate", weather_score: 36, price_score: 60 },
      ],
      best_months: ["March", "October"],
      worst_months: ["July", "August"],
      calendar_notes: [
        { label: "Cathedral closed Sundays for mass", kind: "closed" },
        { label: "Dome closed major holidays", kind: "closed" },
        { label: "Easter week: extended hours, very long queues", kind: "free" },
        { label: "Cathedral floor always free; dome ticket required", kind: "free" },
      ],
      metric_insights: {
        crowd:
          "January–February and early November are the only months when the dome climb has same-day availability and short queues at the entry point.",
        weather:
          "April–May and late September give you blue-sky views from the lantern without the brutal heat that builds inside the dome's brick shell from June onward.",
        price:
          "Combined-ticket prices are flat year-round, but dome-climb resale and skip-the-line add-ons run 25–40% higher in July and August.",
      },
    },
  },
];
