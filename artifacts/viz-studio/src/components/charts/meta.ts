import { type ChartSpec } from "@/lib/chart-spec";

export const CHART_TYPE_META: Record<
  ChartSpec["type"],
  { label: string; emoji: string }
> = {
  weekly_pattern: { label: "Weekly pattern", emoji: "📅" },
  hourly_heatmap: { label: "Hourly heatmap", emoji: "🕒" },
  month_calendar: { label: "90-day calendar", emoji: "🗓" },
  booking_window: { label: "Booking window", emoji: "🎟" },
  stat_grid: { label: "Quick stats", emoji: "📊" },
  compare_zones: { label: "Zone comparison", emoji: "🆚" },
  donut_breakdown: { label: "Breakdown", emoji: "🍩" },
  seasonal_curve: { label: "Seasonal curve", emoji: "🌤" },
  ticket_ladder: { label: "Ticket tiers", emoji: "🎫" },
  daily_pattern: { label: "Daily pattern", emoji: "⏰" },
  tribune_density: { label: "Tribune density", emoji: "🌊" },
  duration_profiles: { label: "Visit duration", emoji: "⏱" },
  entrance_lanes: { label: "Entrance lanes", emoji: "🚪" },
  co_bookings: { label: "Pairs with", emoji: "🔗" },
  zone_crowd_heatmap: { label: "Zone × hour crowd", emoji: "🗺" },
  zone_wait_heatmap: { label: "Zone × hour wait", emoji: "⏳" },
  golden_hour_match: { label: "Golden-hour match", emoji: "🌅" },
  savings_breakdown: { label: "Card savings", emoji: "💳" },
  return_buffer_rank: { label: "Return buffer", emoji: "🚢" },
  seat_value_map: { label: "Seat value", emoji: "🎭" },
  optimal_departure: { label: "Optimal slot", emoji: "🚁" },
  stop_frequency: { label: "Stop frequency", emoji: "🚌" },
};
