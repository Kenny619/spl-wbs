import { describe, expect, it } from "vitest";
import { barGeometry, isoWeekNumber, milestoneLeft, mondayOnOrBefore, monthDayLabel, pixelsPerDay, scheduleBounds } from "../../src/ui/scale";

describe("timeline scale", () => {
  it("fits bars to inclusive planned dates", () => {
    const bounds = scheduleBounds([
      { scheduled: true, plannedStart: "2026-10-01", plannedEnd: "2026-10-03" },
      { scheduled: false, plannedStart: null, plannedEnd: null },
    ]);
    expect(bounds).not.toBeNull();
    if (!bounds) return;
    expect(pixelsPerDay("week", true, 300, 3)).toBe(100);
    expect(pixelsPerDay("week", false, 300, 3)).toBe(7.5);
    expect(barGeometry("2026-10-01", "2026-10-03", bounds.start, 10)).toEqual({ left: 0, width: 30 });
    expect(milestoneLeft(0, 27)).toBe(7);
    expect(milestoneLeft(100, 10)).toBe(98.5);
    expect(mondayOnOrBefore("2026-10-01")).toBe("2026-09-28");
    expect(mondayOnOrBefore("2026-10-26")).toBe("2026-10-26");
    expect(mondayOnOrBefore("2026-10-04")).toBe("2026-09-28");
    expect(monthDayLabel("2026-09-28")).toBe("09/28");
    expect(isoWeekNumber("2026-01-01")).toBe(1);
    expect(isoWeekNumber("2026-01-05")).toBe(2);
    expect(isoWeekNumber("2026-10-26")).toBe(44);
  });
});
