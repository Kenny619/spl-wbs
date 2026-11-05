import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blackoutContains, blackoutFromInput, createBlackout } from "../../src/calendar/blackout";
import {
  BUNDLED_HOLIDAYS,
  absorbHolidayYear,
  bundledHolidayCalendar,
  fetchHolidayYear,
  holidayName,
  parseHolidayPayload,
} from "../../src/calendar/jpHolidays";
import { PGCM_ANCHOR, pgcmMeetings } from "../../src/calendar/pgcm";
import { compactRemaining, detailRemaining, isWeekend, isWorkday, remainingWorkdays } from "../../src/calendar/workdays";

const DAY_MS = 86_400_000;
const calendar = bundledHolidayCalendar();
const open = createBlackout();

function span(start: string, endInclusive: string): { start: number; end: number } {
  return {
    start: Date.parse(`${start}T12:00:00Z`),
    end: Date.parse(`${endInclusive}T12:00:00Z`) + DAY_MS,
  };
}

describe("bundled Japanese holidays", () => {
  it("copies the frozen v17 table", () => {
    const html = readFileSync("reference/UI_BASELINE_v17_FROZEN.html", "utf8");
    const start = html.indexOf("const holidays=");
    const frozen = Function(`return ${html.slice(start + "const holidays=".length, html.indexOf(";", start))}`)() as Record<string, string>;
    expect(BUNDLED_HOLIDAYS).toEqual(frozen);
    expect(Object.keys(BUNDLED_HOLIDAYS)).toHaveLength(89);
    expect(holidayName(calendar, "2026-11-23")).toBe("勤労感謝の日");
    expect(holidayName(calendar, "2026-10-26")).toBeNull();
  });

  it("rejects a holiday payload that is not a year of date names", () => {
    expect(() => parseHolidayPayload(2031, [])).toThrow(/object/);
    expect(() => parseHolidayPayload(2031, { "2030-01-01": "元日" })).toThrow(/invalid entry/);
    expect(() => parseHolidayPayload(2031, { "2031-02-31": "元日" })).toThrow(/invalid entry/);
    expect(() => parseHolidayPayload(2031, { "2031-01-01": "  " })).toThrow(/invalid name/);
    expect(() => parseHolidayPayload(2031, {})).toThrow(/any dates/);
    const payload = JSON.parse('{"__proto__": {"polluted": true}, "2031-01-01": "元日"}') as Record<string, unknown>;
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(() => parseHolidayPayload(2031, payload)).toThrow(/rejected key|invalid entry/);
  });

  it("fetches one year and ignores a second copy of a bundled year", async () => {
    const fetchImpl = (async (url) => ({
      ok: true,
      status: 200,
      url: String(url),
      json: async () => ({ "2031-01-01": "元日" }),
    })) as typeof fetch;
    await expect(fetchHolidayYear(2031, fetchImpl)).resolves.toEqual({ "2031-01-01": "元日" });
    const fetched = absorbHolidayYear(calendar, 2031, { "2031-01-01": "元日" });
    expect(fetched.coveredYears.has(2031)).toBe(true);
    expect(absorbHolidayYear(calendar, 2026, { "2026-01-01": "changed" })).toBe(calendar);
    const failed = absorbHolidayYear(calendar, 2031, null);
    expect(failed.failedYears).toEqual([2031]);
    expect(failed.coveredYears.has(2031)).toBe(false);
  });
});

describe("remaining workdays", () => {
  it("counts weekdays after today through finish and skips holidays", () => {
    expect(new Date(`${PGCM_ANCHOR}T12:00:00Z`).getUTCDay()).toBe(1);
    expect(isWeekend("2026-10-25")).toBe(true);
    expect(isWorkday("2026-11-23", calendar)).toBe(false);
    expect(isWorkday("2026-11-24", calendar)).toBe(true);
    expect(isWorkday("2030-11-23", calendar)).toBe(false);

    const today = remainingWorkdays("2026-10-25", "2026-10-25", "In Progress", calendar);
    expect(compactRemaining(today)).toBe("0 day");
    expect(detailRemaining(today)).toBe("0 workdays remaining");
    expect(compactRemaining(remainingWorkdays("2026-10-24", "2026-10-25", "In Progress", calendar))).toBe("Overdue");
    expect(detailRemaining(remainingWorkdays("2026-10-26", "2026-10-25", "In Progress", calendar))).toBe("1 workday remaining");
    expect(compactRemaining(remainingWorkdays("2026-11-05", "2026-10-25", "In Progress", calendar))).toBe("+8 days");
    expect(detailRemaining(remainingWorkdays("2026-11-24", "2026-11-20", "In Progress", calendar))).toBe("1 workday remaining");
  });

  it("crosses the new year and the 2028 leap day without counting blackout", () => {
    expect(detailRemaining(remainingWorkdays("2027-01-04", "2026-12-31", "In Progress", calendar))).toBe("1 workday remaining");
    expect(isWeekend("2028-02-29")).toBe(false);
    expect(holidayName(calendar, "2028-02-29")).toBeNull();
    expect(detailRemaining(remainingWorkdays("2028-02-29", "2028-02-28", "In Progress", calendar))).toBe("1 workday remaining");
    expect(detailRemaining(remainingWorkdays("2026-12-21", "2026-12-17", "In Progress", calendar))).toBe("2 workdays remaining");
  });

  it("hides the remainder for inactive tasks and refuses an uncovered year", () => {
    expect(compactRemaining(remainingWorkdays("2026-09-15", "2026-10-25", "Completed", calendar))).toBeNull();
    expect(compactRemaining(remainingWorkdays("2026-09-15", "2026-10-25", "Cancelled", calendar))).toBeNull();
    expect(detailRemaining(remainingWorkdays(null, "2026-10-25", "Not Started", calendar))).toBe("No finish date");
    expect(detailRemaining(remainingWorkdays("2031-01-05", "2030-12-31", "In Progress", calendar))).toBe("Holiday coverage incomplete");
  });
});

describe("PGCM recurrence", () => {
  it("shifts 2026-11-23 to the next working day and keeps the next nominal", () => {
    const range = span("2026-10-01", "2026-12-31");
    const meetings = pgcmMeetings(range.start, range.end, "2026-10-25", calendar, open);
    expect(meetings.map((meeting) => meeting.date)).toEqual(["2026-10-26", "2026-11-09", "2026-11-24", "2026-12-07", "2026-12-21"]);
    expect(meetings.find((meeting) => meeting.nominal === "2026-11-23")).toEqual({
      date: "2026-11-24",
      nominal: "2026-11-23",
      shifted: true,
    });
    expect(meetings.find((meeting) => meeting.nominal === "2026-12-07")?.date).toBe("2026-12-07");
  });

  it("cancels the adjusted date inside blackout and does not move the cadence", () => {
    const range = span("2026-10-01", "2027-02-01");
    const oneDay = pgcmMeetings(range.start, range.end, "2026-10-25", calendar, { enabled: true, start: "2026-11-24", end: "2026-11-24" });
    expect(oneDay.map((meeting) => meeting.date)).not.toContain("2026-11-24");
    expect(oneDay.map((meeting) => meeting.nominal)).toContain("2026-12-07");

    const yearEnd = pgcmMeetings(range.start, range.end, "2026-10-25", calendar, { enabled: true, start: "2026-12-18", end: "2027-01-08" });
    const dates = yearEnd.map((meeting) => meeting.date);
    expect(dates).not.toContain("2026-12-21");
    expect(dates).not.toContain("2027-01-04");
    expect(dates).toContain("2027-01-18");
    expect(blackoutContains({ enabled: true, start: "2026-12-18", end: "2027-01-08" }, "2026-12-18")).toBe(true);
    expect(blackoutContains({ enabled: true, start: "2026-12-18", end: "2027-01-08" }, "2027-01-08")).toBe(true);
    expect(blackoutContains({ enabled: false, start: "2026-12-18", end: "2027-01-08" }, "2026-12-21")).toBe(false);
  });

  it("hides past meetings and meetings in a year without a holiday table", () => {
    const range = span("2026-10-01", "2026-12-31");
    expect(pgcmMeetings(range.start, range.end, "2026-10-27", calendar, open).map((meeting) => meeting.date)[0]).toBe("2026-11-09");
    const unknown = { names: {}, coveredYears: new Set<number>(), failedYears: [] };
    expect(pgcmMeetings(range.start, range.end, "2026-10-25", unknown, open)).toEqual([]);
    expect(blackoutFromInput(true, "2026-12-18", "2026-12-01")).toEqual({ error: "Choose a valid start and end date." });
    expect(blackoutFromInput(false, "", "")).toEqual({ interval: open });
  });
});
