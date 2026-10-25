import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { importWorkbook } from "../../src/data/normalize";
import { overallProgress } from "../../src/model/summaryRollup";
import { attentionCounts, flattenVisible } from "../../src/model/wbsTree";

const workbookPath = path.resolve("reference/data-source.xlsx");

function linkHost(value: string | null): string | null {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) return null;
  return url.hostname;
}

describe("reference data-source workbook", () => {
  it("loads the sample export and keeps hierarchy on parent ids", async () => {
    const result = await importWorkbook(await readFile(workbookPath), { paletteStorage: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.sheetName).toBe("tblWBS");
    expect(result.tasks).toHaveLength(36);
    expect(result.expandedIds).toEqual([]);
    expect(result.tasks.every((task) => task.parentId == null)).toBe(true);
    expect(result.latestModified).toBe("2026-10-25T19:51:45.000Z");
    expect(Object.keys(result.palette)).toHaveLength(8);

    const summaries = result.tasks.filter((task) => task.taskType === "Summary");
    const tasks = result.tasks.filter((task) => task.taskType === "Task");
    const milestones = result.tasks.filter((task) => task.taskType === "Milestone");
    expect(summaries).toHaveLength(14);
    expect(tasks).toHaveLength(16);
    expect(milestones).toHaveLength(6);
    expect(summaries.every((task) => !task.scheduled && task.progress == null)).toBe(true);
    expect(tasks.filter((task) => task.scheduled)).toHaveLength(13);
    expect(tasks.filter((task) => !task.scheduled).map((task) => task.id)).toEqual(["31", "32", "33"]);
    expect(milestones.every((task) => task.scheduled && task.plannedStart === task.plannedEnd)).toBe(true);
    expect(result.tasks.find((task) => task.id === "7")).toMatchObject({
      wbsCode: "10.1",
      plannedStart: "2026-10-26",
      plannedEnd: "2026-11-05",
      progress: null,
    });
    expect(result.tasks.every((task) => linkHost(task.itemUrl) === "pmicloud.sharepoint.com")).toBe(true);
    expect(result.tasks.find((task) => task.id === "19")?.wbsCode).toBe("20.4.1");

    const scheduled = result.tasks.filter((task) => task.scheduled);
    const starts = scheduled.map((task) => task.plannedStart).sort();
    const ends = scheduled.map((task) => task.plannedEnd).sort();
    expect(starts[0]).toBe("2026-10-26");
    expect(ends.at(-1)).toBe("2027-03-02");
    expect(overallProgress(result.tasks)).toBe(0);
    expect(attentionCounts(result.tasks, "2026-10-25")).toEqual({ atRiskOrBlocked: 0, overdue: 0 });
    expect(flattenVisible(result.tasks, new Set(), { types: ["Task"], columns: { type: true } })).toHaveLength(16);
    expect(flattenVisible(result.tasks, new Set(), { search: "20.4.1" }).map((task) => task.id)).toEqual(["19"]);

    const codes = result.issues.reduce<Record<string, number>>((counts, issue) => {
      counts[issue.code] = (counts[issue.code] ?? 0) + 1;
      return counts;
    }, {});
    expect(codes).toEqual({
      "single-sheet-fallback": 1,
      "blank-dates": 3,
    });
  });
});
