import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { filterManagedHistory, historyDisplayTime, historyValueLabel, readManagedHistory } from "../../src/managed/history";

const A = "e6a1f5c1-8a63-4b99-8ec5-f3c178e2f660";
const B = "203f8c19-953d-4434-b0da-d3b1529f03a1";
const T1 = "2026-11-06T16:30:00.000Z"; // Nov 7 JST, Nov 6 America/Los_Angeles
const T2 = "2026-11-05T12:00:00.000Z";

async function workbook(mode: "no-history" | "valid" | "invalid-id" | "missing-header" | "mixed-event-time" = "valid") {
  const book = new ExcelJS.Workbook();
  const wbs = book.addWorksheet("ProjectWBS");
  wbs.addRow(["ID", "Title", "WBSCode", "TaskType"]);
  wbs.addRow([1, "Current name", "8.2", "Task"]);
  if (mode === "no-history") return new Uint8Array(await book.xlsx.writeBuffer());
  const hist = book.addWorksheet("UpdateHistory");
  const cols = ["Extra", "TaskID", "ChangeSetID", "TaskTitle", "TimestampUTC",
    "WBSCode", "Field", "OldValue", "NewValue", "Source", "AppVersion"];
  if (mode === "missing-header") cols.splice(cols.indexOf("TimestampUTC"), 1);
  hist.addRow(cols);
  const firstId = mode === "invalid-id" ? "NOT A UUID" : A;
  const entry = (values: Record<string, string | number | null>) =>
    hist.addRow(cols.map((name) => values[name] ?? null));
  entry({ Extra: "kept", TaskID: 1, ChangeSetID: firstId, TaskTitle: "Historical name",
    TimestampUTC: T1, WBSCode: "7.1", Field: "Title", OldValue: "<script>bad()</script>",
    NewValue: "New title", Source: "Web UI", AppVersion: "0.1.0" });
  entry({ Extra: "kept", TaskID: 1, ChangeSetID: A, TaskTitle: "Historical name",
    TimestampUTC: mode === "mixed-event-time" ? T2 : T1,
    WBSCode: "7.1", Field: "Progress", OldValue: 20, NewValue: 60,
    Source: "Web UI", AppVersion: "0.1.0" });
  entry({ Extra: "kept", TaskID: 2, ChangeSetID: B, TaskTitle: "Previous task",
    TimestampUTC: T2, WBSCode: "2.1", Field: "Updates", OldValue: null, NewValue: "Long first\nsecond",
    Source: "Web UI", AppVersion: "0.1.0" });
  return new Uint8Array(await book.xlsx.writeBuffer());
}

describe("Excel Managed read-only Change History", () => {
  it("groups reordered compatible history by transaction, newest first, retaining historical identity", async () => {
    const events = await readManagedHistory(await workbook());
    expect(events).toHaveLength(2);
    expect(events[0].changeSetId).toBe(A);
    expect(events[0].changes.map((r) => r.field)).toEqual(["Title", "Progress"]);
    expect(events[0].changes[0]).toMatchObject({
      taskId: "1", wbsCode: "7.1", taskTitle: "Historical name",
      oldValue: "<script>bad()</script>", newValue: "New title",
    });
    expect(events[1].changes[0]).toMatchObject({ field: "Updates", newValue: "Long first\nsecond" });
    expect(historyValueLabel("Progress", 60)).toBe("60%");
    expect(historyValueLabel("Updates", null)).toBe("—");
  });

  it("uses the display timezone for inclusive date filters and retains original event data", async () => {
    const events = await readManagedHistory(await workbook());
    const onlyJstNov7 = filterManagedHistory(events, {
      fromDate: "2026-11-07", throughDate: "2026-11-07", timeZone: "Asia/Tokyo",
    });
    expect(onlyJstNov7.map((x) => x.changeSetId)).toEqual([A]);
    const onlyLaNov6 = filterManagedHistory(events, {
      fromDate: "2026-11-06", throughDate: "2026-11-06", timeZone: "America/Los_Angeles",
    });
    expect(onlyLaNov6.map((x) => x.changeSetId)).toEqual([A]);
    const byTaskAndField = filterManagedHistory(events, {
      taskId: "1", field: "Progress", timeZone: "Asia/Tokyo",
    });
    expect(byTaskAndField).toHaveLength(1);
    expect(byTaskAndField[0].changes.map((r) => r.field)).toEqual(["Progress"]);
    expect(events[0].changes).toHaveLength(2);
    expect(historyDisplayTime(T1, "Asia/Tokyo")).toContain("Nov 7");
  });

  it("returns a clear zero-history signal when the sheet is absent", async () => {
    expect(await readManagedHistory(await workbook("no-history"))).toEqual([]);
  });

  it("refuses malformed existing rows instead of displaying a misleading partial timeline", async () => {
    for (const scenario of ["invalid-id", "missing-header", "mixed-event-time"] as const) {
      await expect(readManagedHistory(await workbook(scenario))).rejects.toMatchObject({
        code: "INVALID_HISTORY",
      });
    }
  });
});
