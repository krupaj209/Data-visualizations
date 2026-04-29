import type { CuratedCe } from "../types";

export const uffizi: CuratedCe = {
  ce: {
    slug: "galleria-degli-uffizi",
    name: "Galleria degli Uffizi",
    city: "Florence",
    country: "Italy",
    category: "museum",
    summary:
      "Florence's flagship Renaissance museum, home to Botticelli's Birth of Venus and Primavera. The U-shaped galleries draw the largest crowds in the city, so booking and timing matter even more than at the Accademia.",
    emoji: "🖼️",
  },
  charts: [
    {
      slug: "by-month",
      question: "Which month is best for me?",
      title: "Crowds, weather and price by month",
      subtitle: "Toggle to see what matters to you most",
      insight:
        "February is the calmest gallery you'll ever see at the Uffizi. April–May and late September pair walkable weather with merely-busy lines; July and August are punishing on every axis.",
      chart_type: "seasonal_curve",
      spec: {
        type: "seasonal_curve",
        months: [
          { month: "jan", score: 25, status: "very_quiet", weather_score: 30, price_score: 36 },
          { month: "feb", score: 24, status: "very_quiet", weather_score: 36, price_score: 38 },
          { month: "mar", score: 52, status: "moderate", weather_score: 62, price_score: 56 },
          { month: "apr", score: 82, status: "busy", weather_score: 80, price_score: 76 },
          { month: "may", score: 88, status: "busy", weather_score: 92, price_score: 82 },
          { month: "jun", score: 90, status: "busy", weather_score: 78, price_score: 88 },
          { month: "jul", score: 96, status: "peak", weather_score: 58, price_score: 95 },
          { month: "aug", score: 98, status: "peak", weather_score: 54, price_score: 98 },
          { month: "sep", score: 80, status: "busy", weather_score: 90, price_score: 80 },
          { month: "oct", score: 60, status: "moderate", weather_score: 80, price_score: 62 },
          { month: "nov", score: 38, status: "quiet", weather_score: 46, price_score: 44 },
          { month: "dec", score: 55, status: "moderate", weather_score: 36, price_score: 58 },
        ],
        best_months: ["April", "September"],
        worst_months: ["July", "August"],
        calendar_notes: [
          { label: "Jan 1 closed", kind: "closed" },
          { label: "May 1 closed", kind: "closed" },
          { label: "Dec 25 closed", kind: "closed" },
          { label: "Mondays closed", kind: "closed" },
          { label: "First Sunday: free entry, longest queues of the month", kind: "free" },
        ],
        metric_insights: {
          crowd:
            "January and February are the only months when the Botticelli Room feels uncrowded — visitor counts run roughly a third of summer levels.",
          weather:
            "Late April through May and the second half of September give you bright, walkable Florence weather without the July humidity.",
          price:
            "Off-season tickets dip near base price; July and August surcharges plus skip-the-line markups push effective costs ~30% higher.",
        },
      },
    },
  ],
};
