import { describe, expect, it } from "vitest";
import type { Task } from "../../src/data/types";
import type { HistoryEvent } from "../../src/managed/history";
import { buildReport11Audit } from "../../src/managed/report11Audit";

function task(id: string, workstream: string): Task {
  return {
    id, taskName: "Renamed " + id, wbsCode: "9." + id,
    taskType: "Task", parentId: null, plannedStart: null, plannedEnd: null,
    progress: 0, status: "In Progress", owner: "", workstream,
    sortOrder: null, priority: null, predecessorIds: [],
    description: "", updates: "", modified: null, itemUrl: null,
    scheduled: false, sourceRow: Number(id),
  };
}
function event(id: string, timestampUTC: string, ids: readonly string[]): HistoryEvent {
  return {
    changeSetId: id, timestampUTC,
    changes: ids.map((taskId, index) => ({
      row: index + 2, taskId, wbsCode: "old." + taskId,
      taskTitle: "Historical " + taskId,
      field: "Updates" as const, oldValue: "Before",
      newValue: "<img src=x onerror=alert(1)>\nText",
      source: "Web UI", appVersion: "1.0",
    })),
  };
}
const SAVE_A = "11111111-1111-4111-8111-111111111111";
const SAVE_B = "22222222-2222-4222-8222-222222222222";
describe("EMV-REPORT-1.1 Detailed Change Audit daily model", () => {
  it("groups every change from a local day in one table without splitting logical Saves", () => {
    const audit = buildReport11Audit([
      event(SAVE_A, "2026-11-08T23:55:00.000Z", ["1", "2"]),
      event(SAVE_B, "2026-11-09T03:30:00.000Z", ["1"]),
    ], [task("1", "Platform"), task("2", "Operations")],
    "2026-11-09", "2026-11-09", "Asia/Tokyo");
    expect(audit.days).toHaveLength(1);
    expect(audit.days[0].localDay).toBe("2026-11-09");
    expect(audit.days[0].rows).toHaveLength(3);
    expect(audit.days[0].rows.map(x => x.changeSetId)).toEqual([SAVE_B, SAVE_A, SAVE_A]);
    expect(audit.logicalSaves).toBe(2);
    expect(audit.fieldRows).toBe(3);
    expect(audit.distinctTasks).toBe(2);
    expect(audit.days[0].rows[1]).toMatchObject({
      currentWorkstream: "Platform",
      historicalWbsCode: "old.1", historicalTaskTitle: "Historical 1",
      newValue: "<img src=x onerror=alert(1)>\nText",
    });
  });

  it("distinguishes current Unknown Workstream from historical saved task identity", () => {
    const audit = buildReport11Audit([event(SAVE_A,"2026-11-09T00:00:00.000Z", ["9"])],
      [task("1","Platform")], "2026-11-09","2026-11-09","Asia/Tokyo");
    expect(audit.days[0].rows[0].currentWorkstream).toBe("Unknown Workstream");
    expect(audit.days[0].rows[0].historicalTaskTitle).toBe("Historical 9");
  });

  it("uses selected timezone, not UTC day, and excludes records outside the half-open window", () => {
    const events = [
      event(SAVE_A, "2026-03-08T07:59:59.999Z", ["1"]),
      event(SAVE_B, "2026-03-08T08:00:00.000Z", ["1"]),
      event("33333333-3333-4333-8333-333333333333","2026-03-09T06:59:59.999Z",["1"]),
      event("44444444-4444-4444-8444-444444444444","2026-03-09T07:00:00.000Z",["1"]),
    ];
    const result = buildReport11Audit(events,[task("1","")],
      "2026-03-08","2026-03-08","America/Los_Angeles");
    expect(result.fieldRows).toBe(2);
    expect(result.logicalSaves).toBe(2);
    expect(result.days[0].rows.map(x => x.changeSetId)).toEqual([
      "33333333-3333-4333-8333-333333333333", SAVE_B,
    ]);
    expect(result.days[0].rows[0].currentWorkstream).toBe("Unassigned");
  });

  it("preserves source inputs and rejects invalid date windows", () => {
    const original = event(SAVE_A, "2026-11-09T02:00:00.000Z", ["1","2"]);
    const before = JSON.stringify(original);
    const audit = buildReport11Audit([original],[task("1","Ops"),task("2","Ops")],
      "2026-11-09","2026-11-09","Asia/Tokyo");
    expect(JSON.stringify(original)).toBe(before);
    expect(audit.days[0].rows).toHaveLength(2);
    expect(() => buildReport11Audit([original],[],"2026-11-10","2026-11-09","UTC")).toThrow();
  });
});
