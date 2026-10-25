import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  excelSerialToIso,
  inclusiveCalendarDays,
  interpretExcelDate,
  isoToExcelSerial,
  parseIsoDateOnly,
  todayInTimeZone,
} from "../../src/calendar/dateOnly";

describe("Excel serials", () => {
  it("maps the 1900 system, including the fictional leap day", () => {
    expect(excelSerialToIso(1, false)).toBe("1900-01-01");
    expect(excelSerialToIso(59, false)).toBe("1900-02-28");
    expect(excelSerialToIso(60, false)).toBeNull();
    expect(excelSerialToIso(61, false)).toBe("1900-03-01");
    expect(excelSerialToIso(44927, false)).toBe("2023-01-01");
    expect(excelSerialToIso(isoToExcelSerial("2028-02-29"), false)).toBe("2028-02-29");
    expect(excelSerialToIso(isoToExcelSerial("2026-11-23"), false)).toBe("2026-11-23");
    expect(excelSerialToIso(isoToExcelSerial("2026-12-31"), false)).toBe("2026-12-31");
    expect(excelSerialToIso(isoToExcelSerial("2027-01-01"), false)).toBe("2027-01-01");
  });

  it("maps the 1904 system from serial 0", () => {
    expect(excelSerialToIso(0, true)).toBe("1904-01-01");
    expect(excelSerialToIso(isoToExcelSerial("2026-11-23", true), true)).toBe("2026-11-23");
    expect(excelSerialToIso(isoToExcelSerial("2028-02-29", true), true)).toBe("2028-02-29");
    expect(isoToExcelSerial("2023-01-01", true)).toBe(44927 - 1462);
  });

  it("corrects ExcelJS dates that fall before March 1900", () => {
    expect(interpretExcelDate(new Date("1899-12-31T00:00:00.000Z"), false)).toBe("1900-01-01");
    expect(interpretExcelDate(new Date("1900-02-27T00:00:00.000Z"), false)).toBe("1900-02-28");
    expect(interpretExcelDate(new Date("1900-02-28T00:00:00.000Z"), false)).toBeNull();
    expect(interpretExcelDate(new Date("1900-03-01T00:00:00.000Z"), false)).toBe("1900-03-01");
    expect(interpretExcelDate(new Date("2028-02-29T00:00:00.000Z"), false)).toBe("2028-02-29");
    expect(interpretExcelDate(new Date("2023-01-01T00:00:00.000Z"), true)).toBe("2023-01-01");
  });
});

describe("calendar dates", () => {
  it("rejects ambiguous and impossible dates", () => {
    expect(parseIsoDateOnly("2026-10-25")).toBe("2026-10-25");
    expect(parseIsoDateOnly("2026-10-25T00:00:00.000Z")).toBe("2026-10-25");
    expect(parseIsoDateOnly("2028-02-29")).toBe("2028-02-29");
    expect(parseIsoDateOnly("2023-02-29")).toBeNull();
    expect(parseIsoDateOnly("2026-10-25T00:00:00+09:00")).toBeNull();
    expect(parseIsoDateOnly("10/25/2026")).toBeNull();
  });

  it("counts inclusive days across New Year and the 2028 leap day", () => {
    expect(inclusiveCalendarDays("2026-12-31", "2027-01-01")).toBe(2);
    expect(inclusiveCalendarDays("2028-02-28", "2028-03-01")).toBe(3);
    expect(inclusiveCalendarDays("2026-10-01", "2026-10-01")).toBe(1);
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("uses the Asia/Tokyo calendar day around UTC midnight", () => {
    expect(todayInTimeZone(new Date("2026-10-24T14:59:59.000Z"))).toBe("2026-10-24");
    expect(todayInTimeZone(new Date("2026-10-24T15:00:00.000Z"))).toBe("2026-10-25");
    expect(todayInTimeZone(new Date("2026-12-31T14:59:59.000Z"))).toBe("2026-12-31");
    expect(todayInTimeZone(new Date("2026-12-31T15:00:00.000Z"))).toBe("2027-01-01");
  });
});
