import { FUTURE_REMAINING_LABEL, TODAY_REMAINING_LABEL } from "../config/decisions";
import { addCalendarDays } from "./dateOnly";
import { blackoutContains, type BlackoutInterval } from "./blackout";
import { holidayName, yearCovered, type HolidayCalendar } from "./jpHolidays";

export type RemainingWork =
  | { kind: "hidden" }
  | { kind: "no-finish" }
  | { kind: "overdue" }
  | { kind: "today" }
  | { kind: "count"; days: number }
  | { kind: "unknown" };

const INACTIVE = new Set(["Completed", "Cancelled"]);

export function isWeekend(iso: string): boolean {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function isWorkday(iso: string, calendar: HolidayCalendar): boolean {
  return !isWeekend(iso) && holidayName(calendar, iso) == null;
}

export function isInactiveStatus(status: string): boolean {
  return INACTIVE.has(status);
}

/**
 * Weekdays strictly after today through finish, excluding Japanese holidays.
 * An OPTIONAL committed project blackout excludes each overlapping weekday once.
 * Existing v18 read-only callers omit it, preserving their frozen behavior.
 * A year outside the loaded holiday table yields `unknown` instead of a count.
 */
export function remainingWorkdays(
  finish: string | null, today: string, status: string,
  calendar: HolidayCalendar, committedBlackout?: BlackoutInterval,
): RemainingWork {
  if (isInactiveStatus(status)) return { kind: "hidden" };
  if (!finish) return { kind: "no-finish" };
  if (finish < today) return { kind: "overdue" };
  if (finish === today) return { kind: "today" };
  let count = 0;
  for (let cursor = addCalendarDays(today, 1); cursor <= finish; cursor = addCalendarDays(cursor, 1)) {
    if (!yearCovered(calendar, cursor)) return { kind: "unknown" };
    if (isWorkday(cursor, calendar) && (!committedBlackout || !blackoutContains(committedBlackout, cursor))) count += 1;
  }
  return { kind: "count", days: count };
}

export function compactRemaining(value: RemainingWork): string | null {
  if (value.kind === "hidden") return null;
  if (value.kind === "overdue") return "Overdue";
  if (value.kind === "today" || (value.kind === "count" && value.days === 0)) return TODAY_REMAINING_LABEL;
  if (value.kind === "count") return FUTURE_REMAINING_LABEL.replace("n", String(value.days));
  if (value.kind === "no-finish") return "No finish date";
  return "Holiday coverage incomplete";
}

export function detailRemaining(value: RemainingWork): string | null {
  if (value.kind === "hidden") return null;
  if (value.kind === "overdue") return "Overdue";
  if (value.kind === "today" || (value.kind === "count" && value.days === 0)) return "0 workdays remaining";
  if (value.kind === "count") return `${value.days} workday${value.days === 1 ? "" : "s"} remaining`;
  if (value.kind === "no-finish") return "No finish date";
  return "Holiday coverage incomplete";
}
