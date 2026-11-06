import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildManagedCandidate, HISTORY_COLUMNS } from "../../src/managed/workbookCandidate";
import { ManagedWorkbookError } from "../../src/managed/preflight";

const ID = "4c2d16b9-bf8f-4eb4-99a4-0a449d7d8752";
const WHEN = "2026-11-06T04:00:00.000Z";

async function source(options: { withHistory?: boolean; percent?: boolean } = {}) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("ProjectWBS");
  sheet.addRow([
    "ID", "Title", "WBSCode", "TaskType", "Progress", "TaskStatus", "AssignedTo", "Updates",
    "Description", "ParentTaskID", "PlannedStart", "PlannedEnd",
  ]);
  sheet.addRow([1, "Original", "1", "Task", options.percent ? 0.25 : 25, "In Progress", "A", "Legacy note", "Detail", null, "2026-11-02", "2026-11-06"]);
  sheet.addRow([2, "Second task", "2", "Task", 0, "Not Started", "B", null, null, null, "2026-11-07", "2026-11-09"]);
  if (options.percent) sheet.getCell("E2").numFmt = "0%";
  book.addWorksheet("Other").getCell("A1").value = "Keep unrelated data";
  if (options.withHistory) {
    const history = book.addWorksheet("UpdateHistory");
    const shuffled = ["CustomReviewer", "TaskID", "ChangeSetID", "TimestampUTC", "TaskTitle",
      "WBSCode", "Field", "NewValue", "OldValue", "Source", "AppVersion"];
    history.addRow(shuffled);
    history.addRow(["Keep me", 1, "203f8c19-953d-4434-b0da-d3b1529f03a1",
      "2026-11-05T00:00:00.000Z", "Original", "1", "Progress", 25, 0, "Web UI", "0.1.0"]);
  }
  return new Uint8Array(await book.xlsx.writeBuffer());
}

async function parse(bytes: Uint8Array) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return book;
}

function request(bytes: Uint8Array, changes: Record<string, string | number | null>) {
  return {
    source: bytes,
    taskId: "1",
    changes,
    appVersion: "0.1.0",
    changeSetId: ID,
    timestampUTC: WHEN,
  };
}

describe("Excel Managed v1 candidate builder (isolated from read-only viewer)", () => {
  it("creates UpdateHistory only for a changed Save, with one ChangeSetID and a timestamped appended update", async () => {
    const sourceBytes = await source();
    const result = await buildManagedCandidate(request(sourceBytes, {
      Title: "Revised",
      Progress: 45,
      Updates: "Follow-up",
    }));
    expect(result.kind).toBe("candidate");
    if (result.kind !== "candidate") return;
    expect(result.changes.map((value) => value.field)).toEqual(["Title", "Progress", "Updates"]);
    const book = await parse(result.bytes);
    const sheet = book.getWorksheet("ProjectWBS")!;
    expect(sheet.getCell("B2").value).toBe("Revised");
    expect(sheet.getCell("E2").value).toBe(45);
    expect(sheet.getCell("H2").value).toBe("Legacy note\n[" + WHEN + "] Follow-up");
    const history = book.getWorksheet("UpdateHistory")!;
    expect(history.getRow(1).values).toEqual([, ...HISTORY_COLUMNS]);
    expect(history.rowCount).toBe(4);
    for (const index of [2, 3, 4]) {
      expect(history.getRow(index).getCell(1).value).toBe(ID);
      expect(history.getRow(index).getCell(2).value).toBe(WHEN);
      expect(history.getRow(index).getCell(3).value).toBe("1");
      expect(history.getRow(index).getCell(4).value).toBe("1");
      expect(history.getRow(index).getCell(5).value).toBe("Revised");
    }
    expect(book.getWorksheet("Other")?.getCell("A1").value).toBe("Keep unrelated data");
    expect((await parse(sourceBytes)).getWorksheet("UpdateHistory")).toBeUndefined();
  });

  it("no-op does not generate bytes or create a history sheet", async () => {
    const result = await buildManagedCandidate(request(await source(), { Title: "Original", Progress: 25 }));
    expect(result).toEqual({ kind: "noop", changes: [] });
  });

  it("appends to existing reordered UpdateHistory columns and leaves custom values untouched", async () => {
    const result = await buildManagedCandidate(request(await source({ withHistory: true }), {
      AssignedTo: "C",
    }));
    expect(result.kind).toBe("candidate");
    if (result.kind !== "candidate") return;
    const history = (await parse(result.bytes)).getWorksheet("UpdateHistory")!;
    expect(history.rowCount).toBe(3);
    expect(history.getCell("A2").value).toBe("Keep me");
    expect(history.getCell("C2").value).toBe("203f8c19-953d-4434-b0da-d3b1529f03a1");
    expect(history.getCell("C3").value).toBe(ID);
    expect(history.getCell("G3").value).toBe("AssignedTo");
    expect(history.getCell("H3").value).toBe("C");
    expect(history.getCell("I3").value).toBe("A");
    expect(history.getCell("A3").value).toBeNull();
  });

  it("handles percentage-formatted Excel numeric cells without converting 50 percent to 5000 percent", async () => {
    const result = await buildManagedCandidate(request(await source({ percent: true }), { Progress: 50 }));
    expect(result.kind).toBe("candidate");
    if (result.kind !== "candidate") return;
    expect((await parse(result.bytes)).getWorksheet("ProjectWBS")!.getCell("E2").value).toBe(0.5);
    expect(result.changes[0]).toEqual({ field: "Progress", oldValue: 25, newValue: 50 });
  });

  it("blocks malformed existing history rather than overwriting it", async () => {
    const bytes = await source({ withHistory: true });
    const book = await parse(bytes);
    book.getWorksheet("UpdateHistory")!.getCell("C2").value = "NOT-UUID";
    await expect(buildManagedCandidate(request(new Uint8Array(await book.xlsx.writeBuffer()), { Title: "Changed" })))
      .rejects.toMatchObject({ code: "INVALID_HISTORY" });
  });

  it("blocks duplicate WBS codes and leaves the original workbook bytes unchanged", async () => {
    const bytes = await source();
    const original = Uint8Array.from(bytes);
    await expect(buildManagedCandidate(request(bytes, { WBSCode: "2" })))
      .rejects.toMatchObject({ code: "INVALID_TASK_STRUCTURE" });
    expect(bytes).toEqual(original);
  });

  it("blocks missing parents, invalid progress, and editing derived Summary progress", async () => {
    const bytes = await source();
    await expect(buildManagedCandidate(request(bytes, { ParentTaskID: "999" })))
      .rejects.toMatchObject({ code: "INVALID_TASK_STRUCTURE" });
    await expect(buildManagedCandidate(request(bytes, { Progress: 101 })))
      .rejects.toMatchObject({ code: "INVALID_PROGRESS" });
    const book = await parse(bytes);
    book.getWorksheet("ProjectWBS")!.getCell("D2").value = "Summary";
    await expect(buildManagedCandidate(request(new Uint8Array(await book.xlsx.writeBuffer()), { Progress: 55 })))
      .rejects.toMatchObject({ code: "INVALID_SUMMARY_EDIT" });
  });

  it("blocks unsafe formula-bearing worksheets before any XLSX serialization", async () => {
    const book = await parse(await source());
    book.getWorksheet("Other")!.getCell("B1").value = { formula: "1+1", result: 2 };
    await expect(buildManagedCandidate(request(new Uint8Array(await book.xlsx.writeBuffer()), { Title: "Changed" })))
      .rejects.toMatchObject({ code: "UNSUPPORTED_SHEET_FEATURE" });
  });

  it("rejects unknown customXml package parts instead of silently dropping them", async () => {
    const zip = await JSZip.loadAsync(await source());
    zip.file("customXml/item1.xml", "<pilot>do-not-discard</pilot>");
    const unsafe = await zip.generateAsync({ type: "uint8array" });
    await expect(buildManagedCandidate(request(unsafe, { Title: "Changed" })))
      .rejects.toMatchObject({ code: "UNSUPPORTED_PACKAGE" });
  });

  it("reports user-visible typed safety errors", () => {
    const issue = new ManagedWorkbookError("UNSUPPORTED_PACKAGE", "Unknown Excel part.");
    expect(issue).toBeInstanceOf(Error);
    expect(issue.code).toBe("UNSUPPORTED_PACKAGE");
    expect(issue.message).toContain("Unknown");
  });
});
