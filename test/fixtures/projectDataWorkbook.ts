import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";

/** Synthetic XLSX derived from the frozen contract, never a company workbook. */
export async function projectDataWorkbook(state: "Open" | "Resolved" | "malformed" = "Open") {
  const contract = JSON.parse(readFileSync("docs/specifications/EMV_PROJECT_DATA_0_1_2_FROZEN.json", "utf8"));
  const book = new ExcelJS.Workbook();
  const wbs = book.addWorksheet("ProjectWBS");
  wbs.addRow(["ID", "Title", "WBSCode", "TaskType", "Progress", "TaskStatus", "AssignedTo", "Updates", "PlannedStart", "PlannedEnd"]);
  wbs.addRow([501, "Synthetic milestone", "1.2", "Task", 20, "In Progress", "Owner A", "Initial update", "2026-11-02", "2026-11-20"]);
  for (const spec of contract.worksheets) {
    book.addWorksheet(spec.name).addRow(spec.headers.map((c: string | { name: string }) => typeof c === "string" ? c : c.name));
  }
  const meta = book.getWorksheet("ProjectMeta")!;
  meta.addRow(["ProjectID", "bd95a399-257e-4b42-ac0e-fb6ee984c1aa"]);
  meta.addRow(["ProjectName", "Synthetic shared project"]);
  meta.addRow(["ProjectDataSchemaVersion", "0.1.2"]);
  const reasonId = "7e4d09da-832e-4647-9202-8cbb8f8704d2";
  book.getWorksheet("WatchReasons")!.addRow([
    reasonId, state === "malformed" ? "999" : "501", "Manual", null,
    state === "Resolved" ? "Resolved" : "Open", "Supplier <img src=x onerror=alert(1)>",
    "Synthetic recorded evidence", "Meeting note", "2026-11-12T02:00:00.000Z", "Synthetic editor",
    null, state === "Resolved" ? "2026-11-13T02:00:00.000Z" : null,
    state === "Resolved" ? "Synthetic resolver" : null, state === "Resolved" ? "Mitigated" : null,
  ]);
  book.getWorksheet("ProjectAudit")!.addRow([
    "43f416bf-33f4-4a32-aa46-7e0945561faa", "c6dbf481-6868-48b7-b9b5-8726be2e2561",
    "2026-11-12T02:00:00.000Z", "WatchReason", reasonId, state === "malformed" ? "999" : "501",
    "Create", "State", "", "Open", "Synthetic editor", "UnverifiedLocal", "Web UI", "integration-test",
  ]);
  return Buffer.from(await book.xlsx.writeBuffer());
}
