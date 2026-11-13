import { describe, expect, it } from "vitest";
import { review08PeriodPixels } from "../../src/managed/review08PeriodNavigation";

describe("DES-012 managed Gantt navigation periods", () => {
  it("moves one visible calendar unit at the active zoom, rather than fixed arbitrary pixels", () => {
    expect(review08PeriodPixels("day", 640, 365)).toBe(27);
    expect(review08PeriodPixels("week", 640, 365)).toBe(52.5);
    expect(review08PeriodPixels("month", 640, 365)).toBe(120);
    expect(review08PeriodPixels("quarter", 640, 365)).toBe(153);
  });
  it("does not derive period movement from the viewport width or project task count", () => {
    for (const zoom of ["day", "week", "month", "quarter"] as const) {
      expect(review08PeriodPixels(zoom, 420, 20)).toBe(
        review08PeriodPixels(zoom, 940, 180));
    }
  });
});
