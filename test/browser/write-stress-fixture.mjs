import ExcelJS from "exceljs";
import { writeFile } from "node:fs/promises";

const target = process.argv[2];
const count = Number(process.argv[3] ?? "500");
if (!target || !Number.isInteger(count) || count < 1) {
  throw new Error("Pass an .xlsx path and a positive row count.");
}

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
  "Description",
  "ItemURL",
]);

const statuses = ["Not Started", "In Progress", "Completed", "At Risk", "Blocked", "Cancelled"];
const streams = Array.from({ length: 15 }, (_, index) => `Stream ${String(index + 1).padStart(2, "0")}`);
for (let index = 1; index <= count; index += 1) {
  const start = new Date(Date.UTC(2026, 9, 1 + (index % 40)));
  const milestone = index % 50 === 0;
  const end = milestone ? start : new Date(start.getTime() + 5 * 86_400_000);
  const url =
    index === 2
      ? "javascript:alert(1)"
      : index % 20 === 0
        ? `https://pmicloud.sharepoint.com/sites/demo/Lists/WBS/DispForm.aspx?ID=${index}`
        : null;
  sheet.addRow([
    String(index),
    `Synthetic ${index}`,
    String(index),
    null,
    milestone ? "Milestone" : "Task",
    start,
    end,
    index % 7 === 0 ? 40 : null,
    statuses[index % statuses.length],
    `Owner ${index % 8}`,
    streams[index % streams.length],
    index === 3 ? "<script>alert(1)</script>" : null,
    url,
  ]);
}

await writeFile(target, Buffer.from(await workbook.xlsx.writeBuffer()));
