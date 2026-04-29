import { type ChartSpec, type ChartHeader } from "@/lib/chart-spec";
import { WeeklyPatternChart } from "./WeeklyPatternChart";
import { HourlyHeatmapChart } from "./HourlyHeatmapChart";
import { MonthCalendarChart } from "./MonthCalendarChart";
import { BookingWindowChart } from "./BookingWindowChart";
import { StatGridChart } from "./StatGridChart";
import { CompareZonesChart } from "./CompareZonesChart";
import { DonutBreakdownChart } from "./DonutBreakdownChart";
import { SeasonalCurveChart } from "./SeasonalCurveChart";
import { TicketLadderChart } from "./TicketLadderChart";
import { DailyPatternChart } from "./DailyPatternChart";
import { TribuneDensityChart } from "./TribuneDensityChart";
import { DurationProfilesChart } from "./DurationProfilesChart";
import { EntranceLanesChart } from "./EntranceLanesChart";
import { CoBookingsChart } from "./CoBookingsChart";
import { BRAND } from "@/lib/brand";
import { toSentenceCase } from "@/lib/text";

interface Props {
  spec: ChartSpec;
  header?: ChartHeader;
  /** CE name (or other proper nouns) preserved during sentence-casing. */
  preserve?: string;
  /**
   * When true, charts strip the ChartCard header (Estimated pill + subtitle)
   * and any footer chrome (insight paragraphs, chip rails, legends, helper
   * captions) that hosts typically duplicate as their own bullet copy beneath
   * the embed card. Honored by all chart types.
   */
  compact?: boolean;
}

export function ChartRenderer({ spec, header, preserve, compact }: Props) {
  const context = header?.subtitle
    ? toSentenceCase(header.subtitle, { preserve })
    : undefined;
  switch (spec.type) {
    case "weekly_pattern":
      return (
        <WeeklyPatternChart spec={spec} context={context} compact={compact} />
      );
    case "hourly_heatmap":
      return <HourlyHeatmapChart spec={spec} context={context} />;
    case "month_calendar":
      return <MonthCalendarChart spec={spec} context={context} />;
    case "booking_window":
      return (
        <BookingWindowChart spec={spec} context={context} compact={compact} />
      );
    case "stat_grid":
      return <StatGridChart spec={spec} context={context} />;
    case "compare_zones":
      return <CompareZonesChart spec={spec} context={context} />;
    case "donut_breakdown":
      return <DonutBreakdownChart spec={spec} context={context} />;
    case "seasonal_curve":
      return (
        <SeasonalCurveChart spec={spec} context={context} compact={compact} />
      );
    case "ticket_ladder":
      return <TicketLadderChart spec={spec} context={context} />;
    case "daily_pattern":
      return (
        <DailyPatternChart spec={spec} context={context} compact={compact} />
      );
    case "tribune_density":
      return (
        <TribuneDensityChart spec={spec} context={context} compact={compact} />
      );
    case "duration_profiles":
      return (
        <DurationProfilesChart
          spec={spec}
          context={context}
          compact={compact}
        />
      );
    case "entrance_lanes":
      return (
        <EntranceLanesChart spec={spec} context={context} compact={compact} />
      );
    case "co_bookings":
      return (
        <CoBookingsChart spec={spec} context={context} compact={compact} />
      );
    default: {
      const exhaustive: never = spec;
      void exhaustive;
      return (
        <div
          className="h-full w-full flex items-center justify-center"
          style={{ background: BRAND.slate100, borderRadius: 24 }}
        >
          <span style={{ color: BRAND.slate700 }}>Unknown chart type</span>
        </div>
      );
    }
  }
}

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
};
