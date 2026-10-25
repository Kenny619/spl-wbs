import { HOLIDAY_SNAPSHOT_ID, type HolidayCalendar } from "../calendar/jpHolidays";

export function holidayCoverageNote(calendar: HolidayCalendar, spanYears: readonly number[]): string {
  const loaded = [...calendar.coveredYears].sort((left, right) => left - right).join(", ");
  const missing = spanYears.filter((year) => !calendar.coveredYears.has(year));
  const note = `Holiday years loaded: ${loaded} · provisional offline table ${HOLIDAY_SNAPSHOT_ID}`;
  if (!missing.length) return note;
  return `${note} · ${missing.join(", ")} require holiday API access`;
}

export function shadeTitle(iso: string, calendar: HolidayCalendar): string {
  return calendar.names[iso] ?? "Weekend";
}
