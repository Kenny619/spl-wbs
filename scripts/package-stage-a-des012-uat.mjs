/**
 * Stage A DES-012 functional UAT distribution.
 * Run after the existing synthetic DES-010 fixture builder and Report11 builder.
 * Browser regressions continue to use those historical fixtures in dist-managed,
 * but the artifact exposed to the user contains ONLY this current compact kit.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";

const source = "dist-managed";
const dir = join(source, "stage-a-uat");
await mkdir(dir, { recursive:true });
const candidate = join(source, "managed.html");
const workbook = join(source, "SPT-WBS_Report11_Synthetic_UAT.xlsx");
const html = await readFile(candidate);
const bytes = await readFile(workbook);

// The distributed file must contain the functional managed shell and BOTH
// Review08-specific live integration and Report Review02 rather than a mock.
const actual = html.toString("utf8");
for (const marker of [
  "spt-managed-des012-live",
  "managed-inspector-scroll",
  "report11-builder",
  "managed-main-nav",
]) {
  if (!actual.includes(marker)) throw Error("Stage A functional HTML missing " + marker);
}
if (!actual.includes("spt-managed")) throw Error("Read-only v18 viewer packaged in place of managed editor.");

const book = new ExcelJS.Workbook();
await book.xlsx.load(bytes);
const wbs = book.getWorksheet("ProjectWBS"), history = book.getWorksheet("UpdateHistory");
if (wbs?.rowCount !== 24 || history?.rowCount !== 6) {
  throw Error("Current Report11 fictional workbook has wrong task/history count.");
}
const files = ["managed.html", "SPT-WBS_Report11_Synthetic_UAT.xlsx"];
await writeFile(join(dir,files[0]),html);
await writeFile(join(dir,files[1]),bytes);
const sourceSha=process.env.GITHUB_SHA ?? "local-build-not-release-pinned";
const instructions=[
  "SPT-WBS — Stage A Review08 functional Excel UAT CANDIDATE",
  "========================================================",
  "Development / synthetic fixture only. NOT a production release.",
  "Exact source SHA: "+sourceSha,
  "",
  "Contents: managed.html, SPT-WBS_Report11_Synthetic_UAT.xlsx,",
  "START_HERE.txt, STAGE_A_UAT_CHECKLIST.md, SHA256SUMS.txt.",
  "No older DES-010 mock, HTML or redundant test instructions are included.",
  "",
  "1. Extract ALL files from the GitHub Actions artifact ZIP.",
  "2. In Windows create a NEW EMPTY DISPOSABLE folder.",
  "3. Copy ONLY SPT-WBS_Report11_Synthetic_UAT.xlsx into that folder.",
  "4. Open managed.html LOCALLY in Microsoft Edge (Ctrl+O); do not open inside the ZIP.",
  "5. Select Project > Choose project folder, then the empty disposable folder",
  "   containing ONLY the provided synthetic workbook. Pick the Report11 XLSX.",
  "6. If folder access is blocked, use Project > Open XLSX read-only. It is the",
  "   SAME Schedule/Task Detail/Reports UI, but all Save/backup cases are BLOCKED.",
  "7. On Schedule, inspect actual task rows, zoom Day/Week/Month/Quarter, search,",
  "   chart-local Filters, Exceptions/Workstreams, Dependencies, Task Detail",
  "   editor and stable fixed-heading scroll. Use Settings for theme and history.",
  "8. On Reports, check the accepted Review02 paper, all three modes, HTML/text",
  "   preview and Copy for Outlook into a NEW UNSENT Outlook email. DO NOT SEND.",
  "9. For audit mode use 2026-11-09 through 2026-11-10, Project name",
  "   'Fictional Enterprise Program'. All tasks and audit rows are fictional.",
  "10. If writable, make a simple edit ONLY to this disposable workbook, Save,",
  "    inspect UpdateHistory/backup, and reopen in desktop Excel. Preserve logs.",
  "11. Record each result in STAGE_A_UAT_CHECKLIST.md on Issue #7/#11.",
  "",
  "Important: Meeting Review backed by shared Watch reasons is NOT delivered",
  "within Stage A. The approved prototype has a Meeting view for the later",
  "coupled Calendar+Watch+Meeting work, but this UAT build has genuine Schedule",
  "and Reports only. Do not mistake absence of Meeting Review for a broken tab.",
  "",
  "Keep ALL company project workbooks and sensitive file paths out of this UAT.",
].join("\n")+"\n";
await writeFile(join(dir,"START_HERE.txt"),instructions);
files.push("START_HERE.txt");
const checks=[
"# SPT-WBS Stage A — current functional UI + Excel / Reports UAT",
"",
"Source SHA: `"+sourceSha+"`. Only fictional workbook data. Record Microsoft Edge, Excel, Outlook versions and local vs shared folder type.",
"",
"| ID | Validation | Result (PASS/FAIL/BLOCKED) | Notes |",
"|---|---|---|---|",
"| S-A-UI-01 | Review08 Schedule / Task Detail is latest, not DES-010 shell; real task rows load | | |",
"| S-A-UI-02 | Day/Week/Month/Quarter, chart-local search/filters, scope, dependencies and selection all work | | |",
"| S-A-UI-03 | Task Detail header fixed, content scrolls, owner/workstream/WBS/dates/status visible, edit fields work | | |",
"| S-A-UI-04 | Light/dark and laptop/meeting-screen layouts match approved Review08; no contrast/overlap defects | | |",
"| S-A-UI-05 | Opening same XLSX by folder versus read-only fallback gives SAME UI; fallback disables Save | | |",
"| S-A-EXCEL-01 | Writable disposable XLSX Save/Reload/UpdateHistory/backup/Excel reopen; mark BLOCKED in read-only mode | | |",
"| S-A-EXCEL-02 | Genuine corporate Excel-open locking, stale-file source change and Save As; no silent overwrite | | |",
"| S-A-REPORT-01 | Review02 paper-style Report Studio shows all three report modes with real synthetic history | | |",
"| S-A-REPORT-02 | HTML/text preview, 2026-11-09–10 audit, copy rich HTML into an UNSENT Outlook draft | | |",
"| S-A-REG-01 | Settings/History and unsaved-change guard remain working; read-only v18 build unaffected | | |",
"",
"Out-of-scope: Genuine Watch-backed Meeting Review and shared ProjectCalendar are NOT Stage A acceptance requirements.",
"",
"Owner verdict: __________________  Exact ZIP artifact/run: __________________",
].join("\n")+"\n";
await writeFile(join(dir,"STAGE_A_UAT_CHECKLIST.md"),checks);
files.push("STAGE_A_UAT_CHECKLIST.md");
const sums=[];
for (const file of files) {
  sums.push(createHash("sha256").update(await readFile(join(dir,file))).digest("hex")+"  "+file);
}
await writeFile(join(dir,"SHA256SUMS.txt"),sums.join("\n")+"\n");
const actualFiles=[...files,"SHA256SUMS.txt"];
if(actualFiles.length!==5 || new Set(actualFiles).size!==5) throw Error("Unexpected Stage A distribution members");
console.log("Stage A DES012 functional UAT kit ready: "+actualFiles.join(", "));
