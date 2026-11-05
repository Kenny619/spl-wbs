// Synthetic replacement for the unavailable private reference workbook.
// This recreates its asserted import contract, not its original project content.
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { writeFile } from "node:fs/promises";

const target = process.argv[2];
if (!target) throw new Error("Pass the synthetic .xlsx output path.");
const workbook = new ExcelJS.Workbook();
workbook.creator = "Synthetic test fixture";
workbook.created = new Date("2026-10-25T00:00:00.000Z");
workbook.modified = new Date("2026-10-25T00:00:00.000Z");
const sheet = workbook.addWorksheet("tblWBS");
sheet.addRow(["ID", "Title", "WBSCode", "TaskType", "ParentTaskID", "PlannedStart", "PlannedEnd", "Progress", "TaskStatus", "AssignedTo", "Workstream", "Modified", "ItemURL"]);
const taskIds = new Set([7, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 31, 32, 33]);
const milestoneIds = new Set([27, 28, 29, 30, 35, 36]);
for (let id = 1; id <= 36; id += 1) {
  const type = taskIds.has(id) ? "Task" : milestoneIds.has(id) ? "Milestone" : "Summary";
  const scheduled = type !== "Summary" && ![31, 32, 33].includes(id);
  const start = scheduled ? new Date("2026-10-26T00:00:00.000Z") : null;
  const finish = scheduled ? new Date(type === "Milestone" ? "2026-10-26T00:00:00.000Z" : id === 7 ? "2026-11-05T00:00:00.000Z" : "2027-03-02T00:00:00.000Z") : null;
  const wbs = id === 7 ? "10.1" : id === 19 ? "20.4.1" : `SYN.${id}`;
  sheet.addRow([id, `Synthetic ${type} ${id}`, wbs, type, null, start, finish, null, "Not Started", "Synthetic Owner", `Synthetic Workstream ${(id - 1) % 8 + 1}`, "2026-10-25T19:51:45.000Z", `https://pmicloud.sharepoint.com/sites/synthetic/Lists/Tasks/DispForm.aspx?ID=${id}`]);
}
// Fix ZIP member timestamps as well as document timestamps for reproducible bytes.
const zip = await JSZip.loadAsync(await workbook.xlsx.writeBuffer());
zip.forEach((_name, entry) => { entry.date = new Date("2026-10-25T00:00:00.000Z"); });
await writeFile(target, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
