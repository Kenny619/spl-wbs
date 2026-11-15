import { describe, expect, it } from "vitest";
import { bundledHolidayCalendar, type HolidayCalendar } from "../../src/calendar/jpHolidays";
import type { Task } from "../../src/data/types";
import {
  currentStatusExceptions, fiveWorkingDayCommitments, getDaysToGoLive,
  getUpcomingMilestone, reportToday,
} from "../../src/managed/report11Planning";

function task(id: string, changes: Partial<Task> = {}): Task {
  return {
    id, taskName: "Task " + id, wbsCode: id, taskType: "Task",
    parentId: null, plannedStart: "2026-11-09", plannedEnd: "2026-11-20",
    progress: 20, status: "In Progress", owner: "Owner", workstream: "Delivery",
    sortOrder: null, priority: null, predecessorIds: [], description: "", updates: "",
    modified: null, itemUrl: null, scheduled: true, sourceRow: Number(id) + 1,
    ...changes,
  };
}
const HOLIDAYS = bundledHolidayCalendar();

describe("EMV-REPORT-1.1 planning facts, current state only", () => {
  it("uses the selected timezone to resolve today from an immutable generated instant", () => {
    const instant = new Date("2026-11-09T16:00:00Z");
    expect(reportToday(instant, "Asia/Tokyo")).toBe("2026-11-10");
    expect(reportToday(instant, "America/Los_Angeles")).toBe("2026-11-09");
    expect(() => reportToday(new Date("invalid"), "Asia/Tokyo")).toThrow();
  });

  it("identifies a unique launch/release/G5 Milestone only and does not guess from an ordinary task", () => {
    const regular = task("1", { taskName: "G5", taskType: "Task" });
    expect(getDaysToGoLive([regular], "2026-11-10", HOLIDAYS).kind).toBe("unidentified");
    const milestone = task("2", { taskType: "Milestone", taskName: "  RELEASE DATE  ", plannedEnd: "2026-11-17" });
    const result = getDaysToGoLive([regular, milestone], "2026-11-10", HOLIDAYS);
    expect(result.kind).toBe("identified");
    if (result.kind === "identified") {
      expect(result.days).toBe(5); // Wed 11 through Tue 17, excluding weekends.
      expect(result.task.id).toBe("2");
    }
    const duplicated = task("3", { taskType: "Milestone", taskName: "launch date" });
    expect(getDaysToGoLive([regular, milestone, duplicated], "2026-11-10", HOLIDAYS))
      .toEqual({ kind: "ambiguous", candidateIds: ["2", "3"] });
  });

  it("counts after today, excludes the 23 November holiday, and handles today/past dates", () => {
    const milestone = task("1", { taskType: "Milestone", taskName: "G5", plannedEnd: "2026-11-24" });
    const result = getDaysToGoLive([milestone], "2026-11-20", HOLIDAYS);
    expect(result.kind).toBe("identified");
    if (result.kind === "identified") expect(result.days).toBe(1);
    expect(getDaysToGoLive([milestone], "2026-11-24", HOLIDAYS)).toMatchObject({ kind: "identified", days: 0 });
    expect(getDaysToGoLive([milestone], "2026-11-25", HOLIDAYS)).toMatchObject({ kind: "past", days: 0 });
  });

  it("refuses an exact go-live count without covered Japanese holiday years", () => {
    const missing: HolidayCalendar = { names: {}, coveredYears: new Set(), failedYears: [2026] };
    const milestone = task("1", { taskType: "Milestone", taskName: "Launch Date", plannedEnd: "2026-11-20" });
    expect(getDaysToGoLive([milestone], "2026-11-10", missing).kind).toBe("holiday-coverage-incomplete");
  });

  it("shows one earliest incomplete upcoming milestone with stable WBS ties", () => {
    const rows = [
      task("1", { taskType: "Milestone", plannedEnd: "2026-11-17", wbsCode: "2" }),
      task("2", { taskType: "Milestone", plannedEnd: "2026-11-17", wbsCode: "1" }),
      task("3", { taskType: "Milestone", plannedEnd: "2026-11-10", status: "Completed" }),
      task("4", { taskType: "Task", plannedEnd: "2026-11-12" }),
    ];
    const result = getUpcomingMilestone(rows, "2026-11-10", HOLIDAYS);
    expect(result.kind).toBe("identified");
    if (result.kind === "identified") expect(result.task.id).toBe("2");
    expect(getUpcomingMilestone([], "2026-11-10", HOLIDAYS)).toEqual({ kind: "none" });
  });

  it("includes today through the fifth business day, not sixth, skipping 2026-11-23", () => {
    const rows = [
      task("1", { plannedEnd: "2026-11-20" }),
      task("2", { plannedEnd: "2026-11-23" }),
      task("3", { plannedEnd: "2026-11-27" }),
      task("4", { plannedEnd: "2026-11-30" }),
      task("5", { plannedEnd: "2026-11-19" }),
      task("6", { plannedEnd: "2026-11-20", status: "Completed" }),
      task("7", { plannedEnd: "2026-11-20", taskType: "Summary" }),
    ];
    const result = fiveWorkingDayCommitments(rows, "2026-11-20", HOLIDAYS);
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.through).toBe("2026-11-30"); // 24, 25, 26, 27, 30 are five weekdays.
      expect(result.tasks.map(t => t.id)).toEqual(["1", "2", "3", "4"]);
    }
    expect(fiveWorkingDayCommitments(rows, "2026-11-20", {
      names: {}, coveredYears: new Set(), failedYears: [2026],
    })).toEqual({ kind: "holiday-coverage-incomplete" });
  });

  it("does not generate synthetic RAG from Priority or free text", () => {
    const rows = [
      task("1", { status: "Blocked", priority: "Low" }),
      task("2", { status: "At Risk", priority: "Low" }),
      task("3", { status: "In Progress", priority: "RED", description: "red" }),
      task("4", { status: "Completed" }),
      task("5", { taskType: "Summary", status: "Blocked" }),
    ];
    const result = currentStatusExceptions(rows);
    expect(result.map(x => ({ id: x.task.id, tone: x.tone })))
      .toEqual([{ id: "1", tone: "red" }, { id: "2", tone: "amber" }]);
  });
});
