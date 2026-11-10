import { describe, expect, it } from "vitest";
import { bundledHolidayCalendar } from "../../src/calendar/jpHolidays";
import type { Task } from "../../src/data/types";
import type { HistoryEvent } from "../../src/managed/history";
import { buildReport11Snapshot } from "../../src/managed/report11Snapshot";
import { renderReport11Html, renderReport11Text } from "../../src/managed/report11StakeholderRender";

const UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function task(id: string, change: Partial<Task> = {}): Task {
  return {
    id, taskName: "Task " + id, wbsCode: id, taskType: "Task",
    parentId: null, plannedStart: "2026-11-09", plannedEnd: "2026-11-13",
    progress: 20, status: "In Progress", owner: "Owner", workstream: "Program",
    sortOrder: null, priority: null, predecessorIds: [], description: "",
    updates: "", modified: null, itemUrl: null, scheduled: true,
    sourceRow: Number(id) + 1, ...change,
  };
}
const CHANGES: HistoryEvent[] = [
  {
    changeSetId: UUID, timestampUTC: "2026-11-09T06:00:00.000Z",
    changes: [
      { row: 2, taskId: "1", taskTitle: "Historic Risk <script>alert(1)</script>",
        wbsCode: "old.1", field: "TaskStatus", oldValue: "In Progress",
        newValue: "Blocked", source: "Web UI", appVersion: "1.1" },
      { row: 3, taskId: "2", taskTitle: "Historic Schedule",
        wbsCode: "old.2", field: "PlannedEnd", oldValue: "2026-11-12",
        newValue: "2026-11-13", source: "Web UI", appVersion: "1.1" },
      { row: 4, taskId: "3", taskTitle: "Historic Progress",
        wbsCode: "old.3", field: "Progress", oldValue: 30,
        newValue: 45, source: "Web UI", appVersion: "1.1" },
    ],
  },
];
const TASKS: Task[] = [
  task("1", { status: "Blocked", priority: "High" }),
  task("2", { status: "In Progress" }),
  task("3", { status: "Completed" }),
  task("4", { taskName: "G5", taskType: "Milestone", plannedEnd: "2026-11-23" }),
];
function build(overrides: Partial<Parameters<typeof buildReport11Snapshot>[0]> = {}) {
  return buildReport11Snapshot({
    mode: "progress", projectName: "Project <Orion> & Co",
    tasks: TASKS, history: CHANGES, historyAvailable: true,
    timeZone: "Asia/Tokyo", generatedAt: new Date("2026-11-10T01:00:00.000Z"),
    calendar: bundledHolidayCalendar(), startDay: "2026-11-09", endDay: "2026-11-10",
    ...overrides,
  });
}
describe("EMV-REPORT-1.1 canonical stakeholder snapshot", () => {
  it("separates current risks, actual recorded date changes and saved progress", () => {
    const snapshot = build();
    expect(snapshot.risks.map(x => x.taskId)).toEqual(["1"]);
    expect(snapshot.scheduleChanges.map(x => x.taskId)).toEqual(["2"]);
    expect(snapshot.recordedProgress.map(x => x.taskId)).toEqual(["3"]);
    expect(snapshot.riskTransitions.map(x => x.taskId)).toEqual(["1"]);
    expect(snapshot.commitments.some(x => x.taskId === "3")).toBe(false);
    expect(snapshot.goLive.kind).toBe("identified");
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.risks)).toBe(true);
  });

  it("produces an inert HTML and text view from the identical snapshot", () => {
    const snapshot = build();
    const html = renderReport11Html(snapshot);
    const text = renderReport11Text(snapshot);
    expect(html).toContain("Project &lt;Orion&gt; &amp; Co");
    expect(html).toContain("Historic Schedule");
    expect(html).toContain("2026-11-12");
    expect(html).toContain(UUID);
    expect(html).toContain("Risks and Blockers");
    expect(html).toContain("Schedule Changes");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img ");
    expect(html).not.toContain("Workbook:");
    expect(text).toContain("Project: Project <Orion> & Co");
    expect(text).toContain("Historic Schedule");
    expect(text).toContain(UUID);
    expect(text).not.toContain("Overall progress");
    expect(text).not.toContain("Workbook:");
  });

  it("does not invent period activity when historical source is absent", () => {
    const s = build({ historyAvailable: false, history: null });
    expect(s.historyCoverage).toBe("unavailable");
    expect(s.recordedProgress).toHaveLength(0);
    expect(renderReport11Html(s)).toContain("History not available");
    expect(renderReport11Text(s)).toContain("History not available");
    expect(() => build({ projectName: "  " })).toThrow();
  });

  it("supports latest status with no history read or dated transition claims", () => {
    const s = build({ mode: "status", history: null, historyAvailable: false });
    const html = renderReport11Html(s);
    expect(s.period).toBeNull();
    expect(s.historyCoverage).toBe("not-requested");
    expect(html).not.toContain("Recorded Progress & Accomplishments");
    expect(html).toContain("Latest Status");
  });

  it("limits listings explicitly without truncating saved evidence", () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      task(String(i + 10), { status: "At Risk" }));
    const s = build({ tasks: [...TASKS, ...many], limit: "top10" });
    expect(s.risks).toHaveLength(10);
    expect(s.scheduleChanges).toHaveLength(1);
    expect(() => build({ startDay: "2026-11-11", endDay: "2026-11-10" })).toThrow();
  });
});
