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
import { BRAND } from "@/lib/brand";

interface Props {
  spec: ChartSpec;
  header: ChartHeader;
}

export function ChartRenderer({ spec, header }: Props) {
  switch (spec.type) {
    case "weekly_pattern":
      return <WeeklyPatternChart spec={spec} header={header} />;
    case "hourly_heatmap":
      return <HourlyHeatmapChart spec={spec} header={header} />;
    case "month_calendar":
      return <MonthCalendarChart spec={spec} header={header} />;
    case "booking_window":
      return <BookingWindowChart spec={spec} header={header} />;
    case "stat_grid":
      return <StatGridChart spec={spec} header={header} />;
    case "compare_zones":
      return <CompareZonesChart spec={spec} header={header} />;
    case "donut_breakdown":
      return <DonutBreakdownChart spec={spec} header={header} />;
    case "seasonal_curve":
      return <SeasonalCurveChart spec={spec} header={header} />;
    case "ticket_ladder":
      return <TicketLadderChart spec={spec} header={header} />;
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
};
