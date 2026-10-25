const DAY_MS = 86_400_000;

/** Excel 1900-system serial 60 is the fictional 29 Feb 1900. */
export const FICTIONAL_1900_SERIAL = 60;

export function excelSerialToIso(serial: number, date1904: boolean): string | null {
  if (!Number.isFinite(serial)) return null;
  const whole = Math.trunc(serial);
  if (date1904) {
    if (whole < 0) return null;
    return addCalendarDays("1904-01-01", whole);
  }
  if (whole < 1 || whole === FICTIONAL_1900_SERIAL) return null;
  const offset = whole < FICTIONAL_1900_SERIAL ? whole - 1 : whole - 2;
  return addCalendarDays("1900-01-01", offset);
}

export function isoToExcelSerial(iso: string, date1904 = false): number {
  const parsed = parseIsoDateOnly(iso);
  if (!parsed) {
    throw new Error(`Not a calendar date: ${iso}`);
  }
  const target = Date.parse(`${parsed}T00:00:00Z`);
  if (date1904) {
    const epoch = Date.parse("1904-01-01T00:00:00Z");
    return Math.round((target - epoch) / DAY_MS);
  }
  const epoch = Date.parse("1900-01-01T00:00:00Z");
  const days = Math.round((target - epoch) / DAY_MS);
  return target < Date.parse("1900-03-01T00:00:00Z") ? days + 1 : days + 2;
}

/**
 * ExcelJS converts 1900-system serials with the leap bug inverted:
 * serial 1 becomes 1899-12-31, serial 59 becomes 1900-02-27, and serial 60
 * becomes 1900-02-28. Dates on or after 1900-03-01 already match Excel.
 * Returns null for the fictional serial and for values that are not dates.
 */
export function interpretExcelDate(value: Date, date1904: boolean): string | null {
  if (Number.isNaN(value.getTime())) return null;
  const iso = utcDate(value);
  if (date1904) return iso < "1904-01-01" ? null : iso;
  if (iso === "1900-02-28") return null;
  const corrected = iso < "1900-03-01" ? addCalendarDays(iso, 1) : iso;
  return corrected < "1900-01-01" ? null : corrected;
}

export function parseIsoDateOnly(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isCalendarDay(year, month, day)) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function addCalendarDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return utcDate(date);
}

export function inclusiveCalendarDays(start: string, end: string): number {
  const first = Date.parse(`${start}T00:00:00Z`);
  const last = Date.parse(`${end}T00:00:00Z`);
  return Math.round((last - first) / DAY_MS) + 1;
}

export function todayInTimeZone(now: Date, timeZone = "Asia/Tokyo"): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = part(parts, "year");
  const month = part(parts, "month");
  const day = part(parts, "day");
  return `${year}-${month}-${day}`;
}

export function interpretExcelTimestamp(value: Date, date1904: boolean): string | null {
  const corrected = interpretExcelDate(value, date1904);
  if (!corrected) return null;
  const original = utcDate(value);
  if (corrected === original) return value.toISOString();
  return new Date(value.getTime() + DAY_MS).toISOString();
}

export function utcTimestamp(value: Date): string {
  return value.toISOString();
}

function utcDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isCalendarDay(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const found = parts.find((item) => item.type === type);
  if (!found) throw new Error(`Missing ${type} in formatted date.`);
  return found.value;
}
