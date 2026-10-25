import { parseIsoDateOnly } from "./dateOnly";

/** v17 table, copied verbatim. Provisional until the change log records an official check. */
export const HOLIDAY_SNAPSHOT_ID = "v17-frozen-2026-2030";
export const BUNDLED_HOLIDAY_YEARS = [2026, 2027, 2028, 2029, 2030] as const;
export const HOLIDAY_YEAR_API = "https://holidays-jp.github.io/api/v1";

export const BUNDLED_HOLIDAYS: Readonly<Record<string, string>> = Object.freeze({
  "2026-01-01": "元日",
  "2026-01-12": "成人の日",
  "2026-02-11": "建国記念の日",
  "2026-02-23": "天皇誕生日",
  "2026-03-20": "春分の日",
  "2026-04-29": "昭和の日",
  "2026-05-03": "憲法記念日",
  "2026-05-04": "みどりの日",
  "2026-05-05": "こどもの日",
  "2026-05-06": "憲法記念日 振替休日",
  "2026-07-20": "海の日",
  "2026-08-11": "山の日",
  "2026-09-21": "敬老の日",
  "2026-09-22": "国民の休日",
  "2026-09-23": "秋分の日",
  "2026-10-12": "スポーツの日",
  "2026-11-03": "文化の日",
  "2026-11-23": "勤労感謝の日",
  "2027-01-01": "元日",
  "2027-01-11": "成人の日",
  "2027-02-11": "建国記念の日",
  "2027-02-23": "天皇誕生日",
  "2027-03-21": "春分の日",
  "2027-03-22": "春分の日 振替休日",
  "2027-04-29": "昭和の日",
  "2027-05-03": "憲法記念日",
  "2027-05-04": "みどりの日",
  "2027-05-05": "こどもの日",
  "2027-07-19": "海の日",
  "2027-08-11": "山の日",
  "2027-09-20": "敬老の日",
  "2027-09-23": "秋分の日",
  "2027-10-11": "スポーツの日",
  "2027-11-03": "文化の日",
  "2027-11-23": "勤労感謝の日",
  "2028-01-01": "元日",
  "2028-01-10": "成人の日",
  "2028-02-11": "建国記念の日",
  "2028-02-23": "天皇誕生日",
  "2028-03-20": "春分の日",
  "2028-04-29": "昭和の日",
  "2028-05-03": "憲法記念日",
  "2028-05-04": "みどりの日",
  "2028-05-05": "こどもの日",
  "2028-07-17": "海の日",
  "2028-08-11": "山の日",
  "2028-09-18": "敬老の日",
  "2028-09-22": "秋分の日",
  "2028-10-09": "スポーツの日",
  "2028-11-03": "文化の日",
  "2028-11-23": "勤労感謝の日",
  "2029-01-01": "元日",
  "2029-01-08": "成人の日",
  "2029-02-11": "建国記念の日",
  "2029-02-12": "建国記念の日 振替休日",
  "2029-02-23": "天皇誕生日",
  "2029-03-20": "春分の日",
  "2029-04-29": "昭和の日",
  "2029-04-30": "昭和の日 振替休日",
  "2029-05-03": "憲法記念日",
  "2029-05-04": "みどりの日",
  "2029-05-05": "こどもの日",
  "2029-07-16": "海の日",
  "2029-08-11": "山の日",
  "2029-09-17": "敬老の日",
  "2029-09-23": "秋分の日",
  "2029-09-24": "秋分の日 振替休日",
  "2029-10-08": "スポーツの日",
  "2029-11-03": "文化の日",
  "2029-11-23": "勤労感謝の日",
  "2030-01-01": "元日",
  "2030-01-14": "成人の日",
  "2030-02-11": "建国記念の日",
  "2030-02-23": "天皇誕生日",
  "2030-03-20": "春分の日",
  "2030-04-29": "昭和の日",
  "2030-05-03": "憲法記念日",
  "2030-05-04": "みどりの日",
  "2030-05-05": "こどもの日",
  "2030-05-06": "こどもの日 振替休日",
  "2030-07-15": "海の日",
  "2030-08-11": "山の日",
  "2030-08-12": "山の日 振替休日",
  "2030-09-16": "敬老の日",
  "2030-09-23": "秋分の日",
  "2030-10-14": "スポーツの日",
  "2030-11-03": "文化の日",
  "2030-11-04": "文化の日 振替休日",
  "2030-11-23": "勤労感謝の日",
});

export type HolidayCalendar = {
  names: Readonly<Record<string, string>>;
  coveredYears: ReadonlySet<number>;
  failedYears: readonly number[];
};

export function bundledHolidayCalendar(): HolidayCalendar {
  return {
    names: BUNDLED_HOLIDAYS,
    coveredYears: new Set(BUNDLED_HOLIDAY_YEARS),
    failedYears: [],
  };
}

export function holidayName(calendar: HolidayCalendar, iso: string): string | null {
  return calendar.names[iso] ?? null;
}

export function yearCovered(calendar: HolidayCalendar, iso: string): boolean {
  return calendar.coveredYears.has(Number(iso.slice(0, 4)));
}

export function yearsTouched(startIso: string, endIsoInclusive: string): number[] {
  const first = Number(startIso.slice(0, 4));
  const last = Number(endIsoInclusive.slice(0, 4));
  const years: number[] = [];
  for (let year = first; year <= last; year += 1) years.push(year);
  return years;
}

export function absorbHolidayYear(calendar: HolidayCalendar, year: number, names: Readonly<Record<string, string>> | null): HolidayCalendar {
  if (calendar.coveredYears.has(year)) return calendar;
  if (!names) {
    return { ...calendar, failedYears: [...calendar.failedYears, year] };
  }
  return {
    names: { ...calendar.names, ...names },
    coveredYears: new Set([...calendar.coveredYears, year]),
    failedYears: calendar.failedYears,
  };
}

export function parseHolidayPayload(year: number, data: unknown): Record<string, string> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Holiday payload is not an object.");
  }
  const names: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error("Holiday payload contains a rejected key.");
    }
    const iso = parseIsoDateOnly(key);
    if (!iso || Number(iso.slice(0, 4)) !== year || typeof value !== "string") {
      throw new Error("Holiday payload contains an invalid entry.");
    }
    const name = value.trim();
    if (!name || name.length > 80 || /[\u0000-\u001f]/.test(name)) {
      throw new Error("Holiday payload contains an invalid name.");
    }
    names[iso] = name;
  }
  if (Object.keys(names).length === 0) {
    throw new Error("Holiday payload did not include any dates.");
  }
  return names;
}

export async function fetchHolidayYear(year: number, fetchImpl: typeof fetch = fetch): Promise<Record<string, string>> {
  if (!Number.isInteger(year) || year < 1970 || year > 2100) {
    throw new Error("Holiday year is out of range.");
  }
  const response = await fetchImpl(`${HOLIDAY_YEAR_API}/${year}/date.json`, {
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Holiday request failed (${response.status}).`);
  if (response.url) {
    const host = new URL(response.url).hostname;
    if (host !== "holidays-jp.github.io") throw new Error("Holiday request left the approved host.");
  }
  return parseHolidayPayload(year, await response.json());
}
