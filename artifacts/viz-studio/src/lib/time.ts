const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Headout time format: "4am", "4pm", "12 noon", "12 midnight".
 * Hours outside 0..23 are clamped.
 */
export function formatHour(hour: number): string {
  const safe = Number.isFinite(hour) ? Math.max(0, Math.min(24, Math.floor(hour))) : 0;
  const h = safe === 24 ? 0 : safe;
  if (h === 0) return "12 midnight";
  if (h === 12) return "12 noon";
  const display = h % 12 === 0 ? 12 : h % 12;
  const suffix = h >= 12 ? "pm" : "am";
  return `${display}${suffix}`;
}

/**
 * Headout clock format from "HH:MM" string: "4am", "4:30pm", "12 noon".
 * Minute=0 collapses to bare hour ("4am" not "4:00am").
 */
export function formatClock(t: string): string {
  const parts = t.split(":");
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  if (m === 0) return formatHour(h);
  if (h === 0) return `12:${String(m).padStart(2, "0")} midnight`;
  if (h === 12) return `12:${String(m).padStart(2, "0")} noon`;
  const display = h % 12 === 0 ? 12 : h % 12;
  const suffix = h >= 12 ? "pm" : "am";
  return `${display}:${String(m).padStart(2, "0")}${suffix}`;
}

/**
 * Headout date format: "24 January" (day, full month name, no comma).
 * Accepts "YYYY-MM-DD" strings or Date objects.
 */
export function formatDayMonth(input: string | Date): string {
  let day: number;
  let monthIdx: number;
  if (input instanceof Date) {
    day = input.getUTCDate();
    monthIdx = input.getUTCMonth();
  } else {
    const parts = input.split("-");
    if (parts.length >= 3) {
      monthIdx = (Number(parts[1]) || 1) - 1;
      day = Number(parts[2]) || 1;
    } else {
      const d = new Date(input);
      if (isNaN(d.getTime())) return input;
      day = d.getUTCDate();
      monthIdx = d.getUTCMonth();
    }
  }
  const month = MONTH_LONG[monthIdx] ?? "";
  return month ? `${day} ${month}` : `${day}`;
}
