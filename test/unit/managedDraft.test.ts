import { describe, expect, it } from "vitest";
import { collectTaskChanges, hasTaskChanges, initialTaskDraft } from "../../src/managed/draft";
import type { Task } from "../../src/data/types";

const sample: Task = {
  id: "1", taskName: "Original", wbsCode: "1", parentId: null, taskType: "Task",
  plannedStart: "2026-11-02", plannedEnd: "2026-11-05", progress: 25,
  status: "In Progress", owner: "A", workstream: "Delivery", sortOrder: 1,
  priority: "Medium", predecessorIds: [], description: "Background",
  updates: "Historical update", modified: null, itemUrl: null,
  scheduled: true, sourceRow: 2,
};

describe("Excel managed one-task draft", () => {
  it("starts clean and does not rewrite committed Updates", () => {
    const initial = initialTaskDraft(sample);
    expect(initial.Updates).toBe("");
    expect(hasTaskChanges(initial, { ...initial })).toBe(false);
    expect(collectTaskChanges(initial, initial)).toEqual({});
  });

  it("collects only changes and treats new Updates as appended entries", () => {
    const initial = initialTaskDraft(sample);
    const draft = { ...initial, Title: "Revised", Progress: 50, Updates: "Follow-up" };
    expect(collectTaskChanges(initial, draft)).toEqual({
      Title: "Revised", Progress: 50, Updates: "Follow-up",
    });
  });

  it("ignores blank new Updates but treats actual status and progress independently", () => {
    const initial = initialTaskDraft(sample);
    const draft = { ...initial, Updates: "  ", Progress: 100 };
    expect(collectTaskChanges(initial, draft)).toEqual({ Progress: 100 });
    expect(collectTaskChanges(initial, { ...initial, TaskStatus: "Completed" }))
      .toEqual({ TaskStatus: "Completed" });
  });

  it("protects calculated summary values", () => {
    const initial = initialTaskDraft({
      ...sample, taskType: "Summary", plannedStart: "2026-11-01", progress: 80,
    });
    expect(initial.Progress).toBeNull();
    expect(initial.PlannedStart).toBeNull();
  });
});
