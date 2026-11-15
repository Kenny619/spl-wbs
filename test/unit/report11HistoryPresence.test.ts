import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { readManagedHistory, readManagedHistoryWithPresence } from "../../src/managed/history";
import { HISTORY_COLUMNS } from "../../src/managed/workbookCandidate";

async function workbook(withSheet: boolean): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("ProjectWBS");
  sheet.addRow(["ID", "Title", "WBSCode", "TaskType"]);
  sheet.addRow(["1", "Task", "1", "Task"]);
  if (withSheet) book.addWorksheet("UpdateHistory").addRow([...HISTORY_COLUMNS]);
  return new Uint8Array(await book.xlsx.writeBuffer());
}

describe("EMV-REPORT-1.1 history presence and legacy compatibility", () => {
  it("distinguishes an absent history sheet from an empty valid history sheet", async () => {
    const missing = await workbook(false);
    const empty = await workbook(true);
    expect(await readManagedHistoryWithPresence(missing))
      .toEqual({ present: false, events: [] });
    expect(await readManagedHistoryWithPresence(empty))
      .toEqual({ present: true, events: [] });
    // EMV-REPORT-1.0 reader contract is intentionally unchanged.
    expect(await readManagedHistory(missing)).toEqual([]);
    expect(await readManagedHistory(empty)).toEqual([]);
  });
  it("rejects unreadable workbook input rather than treating it as no events", async () => {
    await expect(readManagedHistoryWithPresence(new Uint8Array([0,1,2,3])))
      .rejects.toThrow();
  });
});
