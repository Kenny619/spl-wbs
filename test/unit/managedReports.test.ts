import { describe, expect, it } from "vitest";
import type { Task } from "../../src/data/types";
import type { HistoryEvent } from "../../src/managed/history";
import {
  generateLatestStatusReport, generateUpdateReport, reportUtcRange,
} from "../../src/managed/reports";

const NOW = new Date("2026-11-06T07:00:00.000Z");
const UUID = "e6a1f5c1-8a63-4b99-8ec5-f3c178e2f660";
function task(id: string, options: Partial<Task> = {}): Task {
  return {
    id, taskName: "Task " + id, wbsCode: id, taskType: "Task",
    parentId: null, plannedStart: "2026-11-01", plannedEnd: "2026-11-09",
    progress: 20, status: "In Progress", owner: "A", workstream: "Delivery",
    sortOrder: null, priority: null, predecessorIds: [],
    description: "", updates: "", modified: null, itemUrl: null,
    scheduled: true, sourceRow: Number(id) + 1, ...options,
  };
}
function change(taskId: string, field: "Title" | "Updates" | "Progress", index: number) {
  return {
    row: index, taskId, wbsCode: "old." + taskId, taskTitle: "Historic " + taskId,
    field, oldValue: field === "Progress" ? 20 : "legacy",
    newValue: field === "Progress" ? 50 : "<script>untrusted</script>\nlong description",
    source: "Web UI", appVersion: "1.0",
  };
}
describe("EMV-REPORT-1.0 Latest Status", () => {
  it("reuses duration-weighted overall progress and avoids double-counting summary statuses", () => {
    const tasks = [
      task("1", { taskType: "Summary", parentId: null, progress: 100, status: "Completed" }),
      task("2", { parentId: "1", plannedEnd: "2026-11-01", progress: 0, status: "Blocked" }),
      task("3", { parentId: "1", plannedEnd: "2026-11-03", progress: 100, status: "At Risk", workstream: "Data" }),
      task("4", { taskType: "Milestone", plannedStart: "2026-11-08", plannedEnd: "2026-11-08", progress: 0 }),
    ];
    const report = generateLatestStatusReport({
      tasks, fileName: "Demo.xlsx", generatedAt: NOW, timeZone: "Asia/Tokyo",
    });
    expect(report).toContain("Workbook: Demo.xlsx");
    expect(report).toContain("Overall progress: 75%"); // weighted 1-day 0% + 3-day 100% => 75%, adjust below
    expect(report).toContain("Task count (excluding summaries): 3");
    expect(report).toContain("Completed: 0");
    expect(report).toContain("Blocked: 1");
    expect(report).toContain("At Risk: 1");
    expect(report).toContain("Needs attention (at risk / blocked): 2");
    expect(report).toContain("Overdue unfinished tasks: 2");
    expect(report).toContain("\nData\n- Task 3 — At Risk");
    expect(report).toContain("\nDelivery\n- Task 2 — Blocked");
    expect(report).toContain("Upcoming Milestones\n- [Delivery] Task 4");
  });
  it("limits Needs Attention and upcoming milestone listings to 10 by default, allows All", () => {
    const tasks = Array.from({ length: 12 }, (_, index) =>
      task(String(index + 1), {
        taskName: "Risk " + (index + 1),
        status: "At Risk",
        plannedEnd: "2026-11-0" + ((index % 8) + 1),
      }));
    const limited = generateLatestStatusReport({ tasks, fileName: "P.xlsx", generatedAt: NOW,
      timeZone: "UTC" });
    expect(limited).toContain("… 2 more; select All to include them.");
    const all = generateLatestStatusReport({ tasks, fileName: "P.xlsx", generatedAt: NOW,
      timeZone: "UTC", limit: "all" });
    expect(all).toContain("Risk 12");
    expect(all).not.toContain("… 2 more");
  });
  it("prints explicit empty states and prefixes standalone task references with workstream", () => {
    const report = generateLatestStatusReport({
      tasks: [task("1", { taskName: "Single", workstream: "", plannedEnd: "2026-11-04", status: "In Progress" })],
      fileName: "Empty.xlsx", timeZone: "UTC", generatedAt: NOW,
    });
    expect(report).toContain("Needs Attention\n- [Unassigned] Single — Overdue");
    expect(report).toContain("Upcoming Milestones\nNone");
    expect(report).toContain("Task / Status Highlights (next 14 days)\nNone");
  });
});
describe("EMV-REPORT-1.0 Update Report", () => {
  it("translates inclusive IANA date ranges into exact UTC intervals at DST and midnight", () => {
    expect(reportUtcRange("2026-03-08", "2026-03-08", "America/Los_Angeles"))
      .toEqual({ startMs: Date.parse("2026-03-08T08:00:00.000Z"),
        endExclusiveMs: Date.parse("2026-03-09T07:00:00.000Z") }); // 23 h
    expect(reportUtcRange("2026-11-01", "2026-11-01", "America/Los_Angeles"))
      .toEqual({ startMs: Date.parse("2026-11-01T07:00:00.000Z"),
        endExclusiveMs: Date.parse("2026-11-02T08:00:00.000Z") }); // 25 h
    expect(reportUtcRange("2026-11-07", "2026-11-07", "Asia/Tokyo"))
      .toEqual({ startMs: Date.parse("2026-11-06T15:00:00.000Z"),
        endExclusiveMs: Date.parse("2026-11-07T15:00:00.000Z") });
    expect(() => reportUtcRange("2026-02-29", "2026-03-03", "UTC")).toThrow("valid");
    expect(() => reportUtcRange("2026-11-09", "2026-11-01", "UTC")).toThrow("valid");
    expect(() => reportUtcRange("2026-01-01", "2026-01-01", "No/Zone")).toThrow();
  });
  it("preserves ChangeSetID across mixed workstreams and retains historical titles without inventing history", () => {
    const history: HistoryEvent[] = [
      { changeSetId: UUID, timestampUTC: "2026-11-06T16:00:00.000Z",
        changes: [change("1", "Title", 2), change("2", "Progress", 3), change("1", "Updates", 4)] },
      { changeSetId: "203f8c19-953d-4434-b0da-d3b1529f03a1",
        timestampUTC: "2026-11-06T14:59:59.999Z", changes: [change("1", "Title", 5)] },
    ];
    const input = {
      history, tasks: [task("1", { workstream: "Data" }), task("2", { workstream: "Operations" })],
      generatedAt: NOW, timeZone: "Asia/Tokyo", fileName: "Sample.xlsx",
      startDay: "2026-11-07", endDay: "2026-11-07",
    };
    const report = generateUpdateReport(input);
    expect(report).toContain("Distinct affected tasks: 2");
    expect(report).toContain("Logical Save events: 1");
    expect(report).toContain("Field-change rows: 3");
    expect(report).toContain("ChangeSetID: " + UUID);
    expect(report).toContain("\nData\n- Historic 1 (WBS old.1");
    expect(report).toContain("\nOperations\n- Historic 2 (WBS old.2");
    expect(report).not.toContain("[Data] Historic");
    expect(report).not.toContain("14:59");
    expect(report).toContain("Generated:");
    const empty = generateUpdateReport({ ...input, startDay: "2026-11-10", endDay: "2026-11-10" });
    expect(empty).toContain("Logical Save events: 0");
    expect(empty).toContain("No changes were saved during this period.");
  });
  it("shows Unknown Workstream for deleted tasks, preserves untrusted literals, and switches long detail", () => {
    const long = "A".repeat(180) + "\n" + "<script>alert(1)</script>";
    const event: HistoryEvent = { changeSetId: UUID, timestampUTC: "2026-11-06T16:00:00.000Z",
      changes: [{ ...change("77", "Updates", 2), newValue: long }] };
    const base = { history: [event], tasks: [], generatedAt: NOW, timeZone: "Asia/Tokyo",
      fileName: "Old.xlsx", startDay: "2026-11-07", endDay: "2026-11-07" };
    const short = generateUpdateReport(base);
    expect(short).toContain("[Unknown Workstream] Historic 77");
    expect(short).toContain("…");
    expect(short).not.toContain("<script>");
    const full = generateUpdateReport({ ...base, includeFullValues: true });
    expect(full).toContain("<script>alert(1)</script>");
    expect(full).toContain("  BEFORE:");
    expect(full).toContain("  AFTER:");
  });
  it("generates deterministic fixed snapshots with no external reads or mutations", () => {
    const event: HistoryEvent = { changeSetId: UUID, timestampUTC: "2026-11-06T16:00:00.000Z",
      changes: [change("1", "Progress", 2)] };
    const input = { history: [event], tasks: [task("1")], generatedAt: NOW,
      timeZone: "Asia/Tokyo", fileName: "A.xlsx", startDay: "2026-11-07", endDay: "2026-11-07" };
    const before = JSON.stringify(input);
    const first = generateUpdateReport(input);
    const second = generateUpdateReport(input);
    expect(first).toBe(second);
    expect(JSON.stringify(input)).toBe(before);
  });
});
