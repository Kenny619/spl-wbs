import ExcelJS from "exceljs";
import { writeFile } from "node:fs/promises";

const target = process.argv[2];
if (!target) throw new Error("Pass the .xlsx output path.");

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("ProjectWBS");
sheet.addRow(["ID", "Task Name", "WBSCode", "TaskType", "PlannedStart", "PlannedEnd"]);
sheet.addRow(["1", "Kickoff", "1", "Task", new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 9, 2))]);
await writeFile(target, Buffer.from(await workbook.xlsx.writeBuffer()));
