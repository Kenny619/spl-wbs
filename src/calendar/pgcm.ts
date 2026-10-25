import { addCalendarDays } from "./dateOnly";
import { blackoutContains, type BlackoutInterval } from "./blackout";
import { yearCovered, type HolidayCalendar } from "./jpHolidays";
import { isWorkday } from "./workdays";

export const PGCM_ANCHOR = "2026-10-26";
export const PGCM_INTERVAL_DAYS = 14;
const SHIFT_LIMIT = 14;
const DAY_MS = 86_400_000;

export type PgcmMeeting = {
  date: string;
  nominal: string;
  shifted: boolean;
};

/**
 * Nominal dates stay on the 14-day cadence. A nominal that is not a Japanese
 * working day moves forward to the next one. The adjusted date is dropped when
 * it falls in blackout, and the following nominal does not move.
 * Meetings before today, or outside the schedule span, are omitted.
 * A year without a holiday table suppresses the meeting instead of assuming a workday.
 */
export function pgcmMeetings(
  spanStart: number,
  spanEnd: number,
  today: string,
  calendar: HolidayCalendar,
  blackout: BlackoutInterval,
): PgcmMeeting[] {
  const meetings: PgcmMeeting[] = [];
  const todayMs = noon(today);
  let nominalMs = noon(PGCM_ANCHOR);
  while (nominalMs < spanEnd + DAY_MS) {
    const nominal = iso(nominalMs);
    if (nominalMs >= todayMs - PGCM_INTERVAL_DAYS * DAY_MS) {
      const actual = shiftToWorkday(nominal, calendar);
      if (actual) {
        const actualMs = noon(actual.date);
        const insideSpan = actualMs >= spanStart && actualMs < spanEnd;
        if (actualMs >= todayMs && insideSpan && !blackoutContains(blackout, actual.date)) {
          meetings.push({ date: actual.date, nominal, shifted: actual.shifted });
        }
      }
    }
    nominalMs += PGCM_INTERVAL_DAYS * DAY_MS;
  }
  return meetings;
}

function shiftToWorkday(nominal: string, calendar: HolidayCalendar): { date: string; shifted: boolean } | null {
  let date = nominal;
  for (let attempt = 0; attempt < SHIFT_LIMIT; attempt += 1) {
    if (!yearCovered(calendar, date)) return null;
    if (isWorkday(date, calendar)) return { date, shifted: date !== nominal };
    date = addCalendarDays(date, 1);
  }
  return null;
}

function noon(iso: string): number {
  return Date.parse(`${iso}T12:00:00Z`);
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
