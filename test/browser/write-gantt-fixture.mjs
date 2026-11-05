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
  "Updates",
  "SortOrder",
]);
const rows = [
  ["1", "Program", "1", null, "Summary", null, null, null, "In Progress", "Synthetic PMO", "Alpha", null, null, null],
  ["2", "Phase", "1.1", "1", "Summary", null, null, null, "In Progress", "Synthetic PMO", "Alpha", null, null, null],
  ["3", "Wireframes", "1.1.1", "2", "Task", utc(2026, 10, 1), utc(2026, 10, 20), 50, "In Progress", "Synthetic Owner", "Alpha", null, "Plain text", null],
  ["4", "Interface", "1.1.2", "2", "Task", utc(2026, 10, 22), utc(2026, 11, 5), 42, "At Risk", "Synthetic Owner", "Alpha", "3", "<script>alert(1)</script>", "https://pmicloud.sharepoint.com/sites/demo/Lists/WBS/DispForm.aspx?ID=4"],
  ["5", "Sign-off", "1.1.3", "2", "Milestone", utc(2026, 11, 6), utc(2026, 11, 6), 0, "Not Started", "PM", "Beta", null, null, null],
  ["6", "Closed work", "1.2", "1", "Task", utc(2026, 9, 1), utc(2026, 9, 15), 100, "Completed", "QA", "Beta", null, null, "javascript:alert(1)"],
];
for (const values of rows) {
  // Exercise WBS ordering independently of ID and conflicting SortOrder.
  if (values[0] === "3") values[2] = "1.1.10";
  let updates = values[0] === "4" ? JSON.stringify([
    { timestamp: "2026-10-24T09:15:00Z", html: "<p>Earlier update</p>" },
    { timestamp: "2026-10-25T14:30:00Z", html: '<p><strong>Latest update</strong> with <em>context</em>.</p><ul><li>Review item</li></ul><p><span style="background-color:yellow">Highlighted</span> <a href="https://example.com/review">Review link</a></p>' },
    { timestamp: "2026-10-25T10:00:00Z", html: "<p>Same day update</p>" },
    { html: "<p>Undated note</p>" },
  ]) : null;
  if (values[0] === "4" && process.argv[3] === "unsafe") {
    updates = '<p onclick="alert(1)">Safe &amp; readable <strong>bold</strong></p><script>alert(1)</script><img src="https://example.com/track"><iframe src="https://example.com/frame"></iframe><p><a href="javascript:alert(1)">Unsafe link</a><a href="https://user:password@example.com/">Credentials</a><a href="https://example.com/safe">Safe link</a></p><p style="background-image:url(https://example.com/track);font-size:99px;background-color:yellow">Highlight</p><div>' + 'Long update<br>'.repeat(100) + '</div>';
  }
  sheet.addRow([...values, updates, 100 - Number(values[0])]);
}
await writeFile(target, Buffer.from(await workbook.xlsx.writeBuffer()));

function utc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}
