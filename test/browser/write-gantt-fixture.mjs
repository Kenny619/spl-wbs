import ExcelJS from "exceljs";
import { writeFile } from "node:fs/promises";

const target = process.argv[2];
if (!target) throw new Error("Pass the .xlsx output path.");

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("ProjectWBS");
sheet.addRow([
  "ID",
  "Task Name",
  "WBSCode",
  "ParentTaskID",
  "TaskType",
  "PlannedStart",
  "PlannedEnd",
  "Progress",
  "TaskStatus",
  "AssignedTo",
  "Workstream",
  "PredecessorIDs",
  "Description",
  "ItemURL",
]);
const rows = [
  ["1", "Program", "1", null, "Summary", null, null, null, "In Progress", "PMO", "Alpha", null, null, null],
  ["2", "Phase", "1.1", "1", "Summary", null, null, null, "In Progress", "PMO", "Alpha", null, null, null],
  ["3", "Wireframes", "1.1.1", "2", "Task", utc(2026, 10, 1), utc(2026, 10, 20), 50, "In Progress", "AO", "Alpha", null, "Plain text", null],
  ["4", "Interface", "1.1.2", "2", "Task", utc(2026, 10, 22), utc(2026, 11, 5), 42, "At Risk", "AO", "Alpha", "3", "<script>alert(1)</script>", "https://pmicloud.sharepoint.com/sites/demo/Lists/WBS/DispForm.aspx?ID=4"],
  ["5", "Sign-off", "1.1.3", "2", "Milestone", utc(2026, 11, 6), utc(2026, 11, 6), 0, "Not Started", "PM", "Beta", null, null, null],
  ["6", "Closed work", "1.2", "1", "Task", utc(2026, 9, 1), utc(2026, 9, 15), 100, "Completed", "QA", "Beta", null, null, "javascript:alert(1)"],
];
for (const values of rows) sheet.addRow(values);
await writeFile(target, Buffer.from(await workbook.xlsx.writeBuffer()));

function utc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}
