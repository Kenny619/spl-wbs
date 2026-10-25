import { describe, expect, it } from "vitest";
import type { Task } from "../../src/data/types";
import { overallProgress, rollupSummaries } from "../../src/model/summaryRollup";
import { attentionCounts, compareTasks, flattenVisible, initialExpandedIds } from "../../src/model/wbsTree";
import { assignPalette, loadPalette, paletteColor, savePalette, WORKSTREAM_PALETTE } from "../../src/model/workstreamPalette";

function task(partial: Partial<Task> & Pick<Task, "id" | "taskType">): Task {
  return {
    taskName: partial.id,
    wbsCode: partial.id,
    parentId: null,
    plannedStart: null,
    plannedEnd: null,
    progress: null,
    status: "Not Started",
    owner: "Unassigned",
    workstream: "Unassigned",
    sortOrder: null,
    priority: null,
    predecessorIds: [],
    description: "",
    modified: null,
    itemUrl: null,
    scheduled: false,
    sourceRow: 2,
    ...partial,
  };
}

describe("summary rollup", () => {
  const tasks = [
    task({ id: "1", taskType: "Summary", status: "At Risk", wbsCode: "1" }),
    task({
      id: "2",
      taskType: "Task",
      parentId: "1",
      plannedStart: "2026-10-01",
      plannedEnd: "2026-10-10",
      progress: 50,
      scheduled: true,
      wbsCode: "1.1",
    }),
    task({
      id: "3",
      taskType: "Milestone",
      parentId: "1",
      plannedStart: "2026-10-20",
      plannedEnd: "2026-10-20",
      scheduled: true,
      wbsCode: "1.2",
    }),
    task({
      id: "4",
      taskType: "Task",
      parentId: "1",
      plannedStart: "2026-10-01",
      plannedEnd: "2026-10-01",
      progress: 0,
      scheduled: true,
      wbsCode: "1.3",
    }),
  ];

  it("weights scheduled non-milestone leaves and keeps summary status", () => {
    const [summary] = rollupSummaries(tasks);
    expect(summary?.plannedStart).toBe("2026-10-01");
    expect(summary?.plannedEnd).toBe("2026-10-20");
    expect(summary?.progress).toBe(45);
    expect(summary?.status).toBe("At Risk");
    expect(overallProgress(rollupSummaries(tasks))).toBe(45);
  });

  it("returns N/A when no eligible leaf duration exists", () => {
    const onlyMilestone = rollupSummaries([
      task({ id: "1", taskType: "Summary" }),
      task({
        id: "2",
        taskType: "Milestone",
        parentId: "1",
        plannedStart: "2026-11-23",
        plannedEnd: "2026-11-23",
        scheduled: true,
      }),
    ]);
    expect(onlyMilestone[0]?.progress).toBeNull();
    expect(overallProgress(onlyMilestone)).toBeNull();
  });
});

describe("tree filters", () => {
  const tasks = [
    task({ id: "1", taskType: "Summary", status: "Cancelled", owner: "P", wbsCode: "1", sortOrder: 1 }),
    task({ id: "10", taskType: "Summary", parentId: "1", status: "In Progress", owner: "P", wbsCode: "1.1", sortOrder: 0 }),
    task({ id: "2", taskType: "Task", parentId: "10", status: "At Risk", owner: "A", wbsCode: "1.1.1", taskName: "Alpha" }),
    task({ id: "3", taskType: "Task", parentId: "1", status: "Blocked", owner: "B", wbsCode: "1.2", taskName: "Beta", sortOrder: 2 }),
    task({ id: "4", taskType: "Task", parentId: "1", status: "Completed", owner: "A", wbsCode: "1.3", taskName: "Done", sortOrder: 1 }),
  ];

  it("sorts by sort order, then numeric id", () => {
    const rows = flattenVisible(tasks, new Set(["1", "10"]));
    expect(rows.map((row) => row.id)).toEqual(["1", "10", "2", "4", "3"]);
    expect(rows.find((row) => row.id === "2")?.depth).toBe(3);
  });

  it("expands only depth-1 nodes for a new import", () => {
    const expanded = new Set(initialExpandedIds(tasks));
    const rows = flattenVisible(tasks, expanded);
    expect(rows.map((row) => row.id)).toEqual(["1", "10", "4", "3"]);
    expect(compareTasks(tasks[4]!, tasks[3]!)).toBeLessThan(0);
  });

  it("keeps ancestors and ignores filters for hidden columns", () => {
    const rows = flattenVisible(tasks, new Set(["1", "10"]), {
      statuses: ["At Risk", "Blocked"],
      owners: ["A", "B"],
      types: ["Milestone"],
      columns: { type: false },
      hideInactive: true,
    });
    expect(rows.map((row) => row.id)).toEqual(["1", "10", "2", "3"]);
  });

  it("counts risk and overdue separately and skips summaries", () => {
    const dated = tasks.map((item) =>
      item.id === "2" ? { ...item, plannedEnd: "2026-10-01", status: "At Risk" as const } : item,
    );
    expect(attentionCounts(dated, "2026-10-25")).toEqual({ atRiskOrBlocked: 2, overdue: 1 });
    const completed = dated.map((item) => (item.id === "2" ? { ...item, status: "Completed" as const } : item));
    expect(attentionCounts(completed, "2026-10-25").overdue).toBe(0);
  });
});

describe("workstream palette", () => {
  it("assigns the approved slots in first-seen order and reuses them", () => {
    const first = assignPalette(["Planning", "Design"]);
    expect(paletteColor(first, "Planning")).toBe(WORKSTREAM_PALETTE[0]);
    expect(paletteColor(first, "Design")).toBe(WORKSTREAM_PALETTE[1]);
    const names = Array.from({ length: 16 }, (_item, index) => `WS${index + 1}`);
    const cycled = assignPalette(names);
    expect(cycled.WS1).toBe(0);
    expect(cycled.WS16).toBe(0);
    expect(paletteColor(cycled, "WS16")).toBe(paletteColor(cycled, "WS1"));
    const again = assignPalette(["Design", "Planning", "Build"], first);
    expect(again.Planning).toBe(0);
    expect(again.Design).toBe(1);
    expect(again.Build).toBe(2);
  });

  it("persists only the slot map", () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
    };
    savePalette(storage, { Planning: 3 });
    expect(saved.values().next().value).not.toContain("taskName");
    expect(loadPalette(storage)).toEqual({ Planning: 3 });
    expect(loadPalette({ getItem: () => "{not json" })).toEqual({});
  });
});
