import { describe, expect, it } from "vitest";
import type { Task } from "../../src/data/types";
import {
  prioritizeManagedNotices, projectAttention, type ManagedNotice,
} from "../../src/managed/attentionFoundation";

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id, taskName: id, wbsCode: id, parentId: null,
    taskType: "Task", plannedStart: null, plannedEnd: null,
    progress: null, status: "Not Started", owner: "", workstream: "",
    sortOrder: null, priority: null, predecessorIds: [],
    description: "", updates: "", modified: null, itemUrl: null,
    scheduled: false, sourceRow: 2, ...patch,
  };
}

describe("Stage B actionable attention foundation", () => {
  it("counts source-backed statuses and overdue separately, without double counting task identity", () => {
    const snapshot = projectAttention([
      task("summary", { taskType: "Summary", status: "Blocked", plannedEnd: "2020-01-01" }),
      task("blocked-late", { status: "Blocked", plannedEnd: "2026-11-15" }),
      task("at-risk-late", { status: "At Risk", plannedEnd: "2026-11-14" }),
      task("due-today", { plannedEnd: "2026-11-16" }),
      task("completed", { status: "Completed", plannedEnd: "2020-01-01" }),
      task("cancelled", { status: "Cancelled", plannedEnd: "2020-01-01" }),
      task("no-finish", { status: "Unknown", plannedEnd: null }),
    ], "2026-11-16");
    expect(snapshot.counts).toEqual({
      blocked: 1, "at-risk": 1, overdue: 2, "under-watch": null,
    });
    expect(snapshot.taskIdsByKind.blocked).toEqual(["blocked-late"]);
    expect(snapshot.taskIdsByKind.overdue).toEqual(["blocked-late", "at-risk-late"]);
    expect(snapshot.distinctAttentionTaskCount).toBe(2);
    expect(snapshot.signals).toContainEqual({
      taskId: "blocked-late", kind: "blocked", source: "recorded-task-status",
    });
  });

  it("does not infer no Watch, Green or clearance from unverified workbook input", () => {
    const source = [task("a", { status: "Completed" }), task("b")];
    const unavailable = projectAttention(source, "2026-11-16");
    expect(unavailable.counts["under-watch"]).toBeNull();
    expect(unavailable.taskIdsByKind["under-watch"]).toBeNull();
    const verified = projectAttention(source, "2026-11-16", new Set(["a", "not-in-current-workbook"]));
    expect(verified.counts["under-watch"]).toBe(1);
    expect(verified.taskIdsByKind["under-watch"]).toEqual(["a"]);
    expect(verified.distinctAttentionTaskCount).toBe(1);
    expect(source[0]?.status).toBe("Completed"); // no edit or inferred status
  });

  it("uses strict date-only comparison, preserving on-date and future tasks", () => {
    const snapshot = projectAttention([
      task("late", { plannedEnd: "2026-11-15" }),
      task("today", { plannedEnd: "2026-11-16" }),
      task("later", { plannedEnd: "2026-11-17" }),
      task("malformed", { plannedEnd: "16/11/2026" }),
      task("duplicate", { plannedEnd: "2026-11-15" }),
      task("duplicate", { plannedEnd: "2026-11-15" }),
    ], "2026-11-16");
    expect(snapshot.taskIdsByKind.overdue).toEqual(["late", "duplicate"]);
    expect(() => projectAttention([], "2026-11-16T00:00Z")).toThrow(/date-only/);
  });

  it("keeps independent Under Watch and task status flags on the same task", () => {
    const snapshot = projectAttention([
      task("a", { status: "Blocked", plannedEnd: "2026-11-15" }),
      task("b", { status: "At Risk" }),
    ], "2026-11-16", new Set(["a", "b"]));
    expect(snapshot.counts).toEqual({
      blocked: 1, "at-risk": 1, overdue: 1, "under-watch": 2,
    });
    expect(snapshot.distinctAttentionTaskCount).toBe(2);
  });
});

describe("Stage B typed notice severity groundwork", () => {
  it("sorts critical before warning before information, preserving equal-priority order", () => {
    const notices: ManagedNotice[] = [
      { id: "i1", kind: "general-info", message: "red words are not a risk source" },
      { id: "w1", kind: "unsaved-changes", message: "Draft edited" },
      { id: "c1", kind: "save-unverified", message: "Save cannot be verified" },
      { id: "i2", kind: "save-verified", message: "Saved successfully" },
      { id: "c2", kind: "recovery-blocked", message: "Inspect recovery state" },
      { id: "w2", kind: "permission-denied", message: "Access refused" },
    ];
    const ordered = prioritizeManagedNotices(notices);
    expect(ordered.map(n => n.id)).toEqual(["c1", "c2", "w1", "w2", "i1", "i2"]);
    expect(ordered.filter(n => !n.dismissible).map(n => n.id)).toEqual(["c1", "c2", "w1", "w2"]);
    expect(ordered.filter(n => n.needsAttention).map(n => n.id)).toEqual(["c1", "c2", "w1", "w2"]);
    expect(notices.map(n => n.id)).toEqual(["i1", "w1", "c1", "i2", "c2", "w2"]); // pure
  });

  it("never infers priority from message text and preserves source text exactly", () => {
    const [a, b] = prioritizeManagedNotices([
      { id: "info", kind: "general-info", message: "CRITICAL failed red Green" },
      { id: "critical", kind: "workbook-conflict", message: "all good" },
    ]);
    expect(a?.severity).toBe("critical");
    expect(a?.message).toBe("all good");
    expect(b?.severity).toBe("info");
    expect(b?.message).toBe("CRITICAL failed red Green");
  });

  it("does not permit dismissal of recovery, conflict or unverified save", () => {
    const ordered = prioritizeManagedNotices([
      { id: "a", kind: "recovery-blocked", message: "" },
      { id: "b", kind: "workbook-conflict", message: "" },
      { id: "c", kind: "save-unverified", message: "" },
    ]);
    expect(ordered.every(n => n.severity === "critical" && !n.dismissible)).toBe(true);
  });
});
