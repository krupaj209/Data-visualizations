import type { CuratedCe } from "../types";

/**
 * Thames Cruise — curated from the published deck that already lives on the
 * live database (4 published charts). These specs were copied verbatim from
 * live so the curated seed becomes the durable source of truth and dev/live
 * stay in sync. Chart slugs are kept identical to live so the additive
 * seeder never re-inserts or duplicates them (and embed URLs stay stable).
 *
 * NOTE: Two of these charts use legacy types (`ticket_ladder`,
 * `compare_zones`) that are outside the modern curated embed contract. They
 * are curated here only because they already exist as published, embed-linked
 * charts on live — curating preserves them rather than introducing new ones.
 * The 4 Thames *draft* charts on live (slot_compare / route_profile drafts)
 * are intentionally NOT curated.
 */
export const thamesCruise: CuratedCe = {
  ce: {
    slug: "thames-cruise",
    name: "Thames Cruise",
    city: "London",
    country: "UK",
    category: "attraction",
    summary:
      "See London's landmarks connect from the water on a Thames Cruise. Choose the right experience for you, from narrated sightseeing tours and scenic transport to destination journeys and atmospheric dinner cruises.",
    emoji: "🛥️",
  },
  charts: [
    {
      slug: "thames-cruise-ticket-options",
      question: "Which cruise ticket offers the most flexibility?",
      title: "Cruise ticket comparison",
      subtitle: "Price and features by ticket type",
      insight:
        "The 24-hour hop-on-hop-off ticket is the most popular choice, offering the freedom to explore riverside attractions at your own pace.",
      chart_type: "ticket_ladder",
      spec: {
        type: "ticket_ladder",
        currency: "GBP",
        tiers: [
          {
            name: "Single journey",
            price: 15,
            share: 25,
            includes: [
              "One-way travel between two piers",
              "30-40 minute duration",
            ],
            recommended: false,
          },
          {
            name: "24-hr hop-on-hop-off",
            price: 28,
            share: 60,
            includes: [
              "Unlimited travel for 24 hours",
              "Access to 4 major piers",
              "Live audio commentary",
            ],
            recommended: true,
          },
          {
            name: "Evening lights cruise",
            price: 32,
            share: 15,
            includes: [
              "Round trip after sunset",
              "See London's landmarks illuminated",
              "60-90 minute duration",
            ],
            recommended: false,
          },
        ],
      },
    },
    {
      slug: "thames-cruise-pier-queues",
      question: "Which pier has the shortest queues to board?",
      title: "Pier queue times",
      subtitle: "Average wait to board at major piers",
      insight:
        "Boarding at Greenwich Pier is often quickest, while Westminster Pier, close to many major attractions, typically has the longest waits.",
      chart_type: "compare_zones",
      spec: {
        type: "compare_zones",
        metric_label: "Average boarding wait",
        zones: [
          {
            name: "Westminster Pier",
            emoji: "🏛️",
            status: "long",
            wait_min: 20,
            wait_max: 40,
            tip: "Main tourist hub, so expect the biggest queues, especially midday.",
          },
          {
            name: "London Eye Pier",
            emoji: "🎡",
            status: "medium",
            wait_min: 15,
            wait_max: 30,
            tip: "Busy with London Eye visitors; lines can surge after ride slots end.",
          },
          {
            name: "Tower Pier",
            emoji: "🏰",
            status: "medium",
            wait_min: 10,
            wait_max: 25,
            tip: "A popular spot near the Tower of London, but boarding is generally efficient.",
          },
          {
            name: "Greenwich Pier",
            emoji: "⚓",
            status: "short",
            wait_min: 5,
            wait_max: 15,
            tip: "Quietest boarding point, great for starting your trip with minimal fuss.",
          },
        ],
      },
    },
    {
      slug: "thames-cruise-hourly-crowds",
      question: "What time of day has the best light and fewest people?",
      title: "Hourly cruise crowds",
      subtitle: "Boarding queue intensity by hour and day",
      insight:
        "For beautiful photos and lighter crowds, aim for a late afternoon cruise between 4pm and 6pm to catch the golden hour light.",
      chart_type: "hourly_heatmap",
      spec: {
        type: "hourly_heatmap",
        open_hour: 10,
        close_hour: 21,
        rows: [
          {
            day: "mon",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 40, 60, 70, 60, 50, 40, 30, 35,
              40, 45, 0, 0, 0,
            ],
          },
          {
            day: "tue",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 40, 65, 75, 65, 55, 45, 35, 40,
              45, 50, 0, 0, 0,
            ],
          },
          {
            day: "wed",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 35, 45, 70, 80, 70, 60, 50, 40, 45,
              50, 55, 0, 0, 0,
            ],
          },
          {
            day: "thu",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 35, 45, 75, 85, 75, 65, 55, 45, 50,
              55, 60, 0, 0, 0,
            ],
          },
          {
            day: "fri",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 50, 80, 90, 80, 70, 60, 55, 65,
              70, 75, 0, 0, 0,
            ],
          },
          {
            day: "sat",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 65, 90, 100, 95, 85, 75, 70, 75,
              80, 85, 0, 0, 0,
            ],
          },
          {
            day: "sun",
            closed: false,
            hours: [
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 45, 60, 85, 95, 80, 70, 60, 50, 55,
              60, 65, 0, 0, 0,
            ],
          },
        ],
        best_window: {
          day: "fri",
          label: "Best for sunset views",
          start_hour: 17,
          end_hour: 19,
        },
      },
    },
    {
      slug: "thames-cruise-seasonal-guide",
      question: "Which month offers the best balance of weather and crowds?",
      title: "Seasonal cruise guide",
      subtitle: "Crowd levels and likely weather by month",
      insight:
        "September is the sweet spot, offering pleasant weather and smaller crowds after the summer school holiday peak has passed.",
      chart_type: "seasonal_curve",
      spec: {
        type: "seasonal_curve",
        months: [
          { month: "jan", score: 20, status: "very_quiet", price_score: 90, weather_score: 20 },
          { month: "feb", score: 25, status: "very_quiet", price_score: 85, weather_score: 25 },
          { month: "mar", score: 40, status: "quiet", price_score: 75, weather_score: 40 },
          { month: "apr", score: 60, status: "moderate", price_score: 60, weather_score: 60 },
          { month: "may", score: 75, status: "busy", price_score: 50, weather_score: 75 },
          { month: "jun", score: 85, status: "busy", price_score: 40, weather_score: 85 },
          { month: "jul", score: 95, status: "peak", price_score: 30, weather_score: 90 },
          { month: "aug", score: 100, status: "peak", price_score: 30, weather_score: 88 },
          { month: "sep", score: 70, status: "busy", price_score: 55, weather_score: 80 },
          { month: "oct", score: 55, status: "moderate", price_score: 65, weather_score: 55 },
          { month: "nov", score: 30, status: "quiet", price_score: 80, weather_score: 30 },
          { month: "dec", score: 50, status: "moderate", price_score: 50, weather_score: 25, note: "Christmas lights" },
        ],
        best_months: ["May", "September"],
        worst_months: ["August", "January"],
        metric_insights: {
          crowd:
            "Crowds peak in July and August with school holidays; winter months are significantly quieter.",
          weather:
            "Summer offers the warmest weather, but spring and autumn often have bright, clear days perfect for sightseeing from the water.",
        },
      },
    },
  ],
};
