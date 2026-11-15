/**
 * Adds Report 1.1-specific disposable evidence alongside the already accepted
 * DES-010 five-file kit. Never edits the DES-010 workbook or actual project files.
 * Invoked after scripts/package-des010-uat.mjs by npm run build:managed.
 */
import ExcelJS from "exceljs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const dir = "dist-managed";
const input = join(dir, "SPT-WBS_DES010_Synthetic_UAT.xlsx");
const output = join(dir, "SPT-WBS_Report11_Synthetic_UAT.xlsx");
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(input);
const sheet = wb.getWorksheet("ProjectWBS");
if (!sheet || sheet.rowCount !== 24) throw new Error("Expected the validated 23-task synthetic source.");
const keys = new Map();
sheet.getRow(1).eachCell((cell, index) => keys.set(String(cell.value), index));
function rowForId(id) {
  for (let i=2; i<=sheet.rowCount; i++) if (String(sheet.getRow(i).getCell(keys.get("ID")).value) === id) return sheet.getRow(i);
  throw new Error("Missing required fictional task "+id);
}
const g5 = rowForId("405");
g5.getCell(keys.get("Title")).value = "G5";
if (String(g5.getCell(keys.get("TaskType")).value) !== "Milestone") {
  throw new Error("Expected G5 as a milestone rather than an ordinary Task.");
}
const history = wb.addWorksheet("UpdateHistory");
const columns = [
  "ChangeSetID", "TimestampUTC", "TaskID", "WBSCode", "TaskTitle",
  "Field", "OldValue", "NewValue", "Source", "AppVersion",
];
history.addRow(columns);
const idA="11111111-1111-4111-8111-111111111111";
const idB="22222222-2222-4222-8222-222222222222";
const idC="33333333-3333-4333-8333-333333333333";
function record(id,time,taskId,field,before,after){
  const row=rowForId(taskId),name=String(row.getCell(keys.get("Title")).value),wbs=String(row.getCell(keys.get("WBSCode")).value);
  history.addRow([id,time,taskId,wbs,name,field,before,after,"Web UI","1.1"]);
}
// Two selected-timezone calendar dates, different workstreams, one multi-task Save.
// The committed ProjectWBS state corresponds to the last new values where present.
record(idA,"2026-11-09T02:30:00.000Z","303","TaskStatus","At Risk","Blocked");
record(idB,"2026-11-09T06:15:00.000Z","202","Progress",55,80);
record(idB,"2026-11-09T06:15:00.000Z","302","PlannedEnd","2026-11-17","2026-11-18");
record(idC,"2026-11-10T00:00:00.000Z","304","Progress",0,10);
// A deliberately hostile historical value verifies HTML escaping. It is not
// executable markup and must only be shown as inert text in the report.
record(idC,"2026-11-10T00:00:00.000Z","303","Updates","Review pending",
  "<script>alert('synthetic test only')</script>\nNo code must execute.");
history.getRow(1).font = { bold:true };
history.views = [{state:"frozen",ySplit:1}];
await wb.xlsx.writeFile(output);
const verify = new ExcelJS.Workbook();await verify.xlsx.readFile(output);
if (verify.getWorksheet("ProjectWBS")?.rowCount !== 24 ||
    verify.getWorksheet("UpdateHistory")?.rowCount !== 6 ||
    verify.getWorksheet("ProjectWBS")?.getRow(g5.number).getCell(keys.get("Title")).value !== "G5") {
  throw new Error("Report 1.1 synthetic UAT workbook failed round-trip.");
}
const start = [
 "SPT-WBS — Report 1.1 targeted Owner UAT",
 "=====================================",
 "Commit-specific DEVELOPMENT kit for synthetic data only. Not a release.",
 "",
 "FILES: managed.html, SPT-WBS_Report11_Synthetic_UAT.xlsx,",
 "REPORT11_START_HERE.txt, REPORT11_UAT_CHECKLIST.md,",
 "REPORT11_CHECKSUMS.txt and the original DES-010 files.",
 "",
 "1. Extract the entire GitHub Actions ZIP locally. Do not open within the ZIP.",
 "2. Create an empty disposable local folder.",
 "3. Copy ONLY SPT-WBS_Report11_Synthetic_UAT.xlsx into this folder.",
 "4. Open managed.html in Edge (Ctrl+O).",
 "5. Choose Project > Choose project folder and select your disposable folder.",
 "6. If folder picker is blocked, use Project > Open XLSX read-only and choose",
 "   the provided Report11 workbook. Mark write-based checks BLOCKED.",
 "7. Open Reports; enter Project name 'Fictional Enterprise Program'.",
 "8. Latest Status: G5 on 2026-12-18, current Blocked/At Risk, next milestone.",
 "9. Progress & Risks Update: period 2026-11-09 through 2026-11-10.",
 "   Validate 202/304 progress, 302 schedule change, current 303 Blocked.",
 "10. Detailed Change Audit: the same period displays 2 local-day tables,",
 "    3 unique logical Saves, 5 field changes, full Save IDs and old/new values.",
 "11. Switch HTML/plain without Generate; copy rich HTML into a NEW Outlook",
 "    message with HTML formatting enabled. Inspect appearance; DO NOT SEND.",
 "12. Download HTML, reopen offline, test print and ensure the hostile literal",
 "    '<script>' entry is displayed as text rather than executing.",
 "13. Compare workbook bytes before/after report-only actions; no report write.",
 "14. Record PASS / FAIL / BLOCKED / observations in REPORT11_UAT_CHECKLIST.md.",
 "",
 "The short G5 name is intentional and required for frozen 1.1 matching.",
 "The fixture is entirely synthetic. It is safe to discard after review.",
].join("\n")+"\n";
await writeFile(join(dir,"REPORT11_START_HERE.txt"), start);
const checklist = [
 "# Report 1.1 — Targeted Product Owner UAT",
 "",
 "Version: frozen EMV-REPORT-1.1. Branch: feature/report-1-1-stakeholder-html.",
 "Source PR: https://github.com/Kenny619/spl-wbs/pull/37",
 "Record exact GitHub Actions workflow run, commit SHA and Edge/Outlook versions.",
 "Use **only** the included fictional Report11 workbook copied to a disposable folder.",
 "",
 "| ID | Test | Result (PASS / FAIL / BLOCKED) | Observations |",
 "|---|---|---|---|",
 "| UAT11-01 | Loads the 23-task fictional Report11 workbook and G5 milestone | | |",
 "| UAT11-02 | Latest Status: days to G5, one upcoming milestone, meaningful red/amber status, no overall % | | |",
 "| UAT11-03 | Project name visible in text and HTML; workbook filename absent from generated report | | |",
 "| UAT11-04 | Progress & Risks: distinct current Risks, recorded accomplishments, recorded Schedule Changes, five-working-day commitments | | |",
 "| UAT11-05 | Detailed Audit: Nov 09 + Nov 10 local-day tables; 3 Saves/5 field changes, same fixed columns and full Save IDs | | |",
 "| UAT11-06 | All Tasks default; optional Top 10; no silently missing tasks | | |",
 "| UAT11-07 | Changing report mode/date/format alone leaves current generated snapshot unaltered | | |",
 "| UAT11-08 | Copy for Outlook: paste into blank HTML email with readable headings, status colours, table alignment; DO NOT SEND | | |",
 "| UAT11-09 | Download standalone HTML and open it offline; verify print and no active scripts/remote assets | | |",
 "| UAT11-10 | No workbook write, backups or unexpected state changes from report generation/copy/export | | |",
 "| UAT11-11 | Invalid range and blocked clipboard show honest errors and preserve last valid snapshot | | |",
 "| UAT11-12 | Edge folder picker blocked fallback supports read-only report view; mark writable tests BLOCKED as needed | | |",
 "",
 "Owner acceptance (not granted by this checklist): ___________",
 "Exact tested SHA: ___________",
 "CI link: ___________",
 "Outlook version/mode: ___________",
].join("\n")+"\n";
await writeFile(join(dir,"REPORT11_UAT_CHECKLIST.md"),checklist);
const files=["managed.html","SPT-WBS_Report11_Synthetic_UAT.xlsx","REPORT11_START_HERE.txt","REPORT11_UAT_CHECKLIST.md"];
const sha = [];
for(const name of files){sha.push(createHash("sha256").update(await readFile(join(dir,name))).digest("hex")+"  "+name);}
await writeFile(join(dir,"REPORT11_CHECKSUMS.txt"),sha.join("\n")+"\n");
console.log("Report11 synthetic UAT kit appended with G5/history fixture, checklist and integrity checks.");
