/**
 * Development-only DES-010 owner UAT packaging.
 * Run AFTER npm run build:managed's Vite step, which produces dist-managed/managed.html.
 * Existing CI uploads dist-managed as a GitHub Actions ZIP; placing the workbook and
 * instructions here makes that artifact a COMPLETE UAT kit, never just HTML.
 * No corporate data, external URLs, secrets or product workbook handling.
 */
import ExcelJS from "exceljs";
import { readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const dist = "dist-managed";
const htmlPath = join(dist, "managed.html");
await stat(htmlPath).catch(() => { throw new Error("Run managed Vite build before packaging UAT."); });

const headers = [
  "ID", "Title", "WBSCode", "ParentTaskID", "TaskType",
  "PlannedStart", "PlannedEnd", "Progress", "TaskStatus",
  "AssignedTo", "Workstream", "SortOrder", "Priority",
  "PredecessorIDs", "Description", "Updates", "Modified"
];
// 23 completely fictional rows and four realistic workstreams. No actual user or company data.
// Values intentionally exercise At Risk, Blocked, Completed, dependencies, updates and milestones.
const rows = [
  [100,"Discovery & Requirements","1",null,"Summary","2026-10-19","2026-11-13",null,"In Progress","Aiko Tanaka","Discovery & Requirements",null,"Define scope, success measures and operating requirements.",null],
  [101,"Confirm executive objectives","1.1",100,"Task","2026-10-19","2026-10-23",100,"Completed","Aiko Tanaka","Discovery & Requirements",null,"Confirm strategic goals with fictional stakeholders.","2026-10-23 15:30 — Objectives confirmed."],
  [102,"Map current user journeys","1.2",100,"Task","2026-10-22","2026-10-30",100,"Completed","Kenji Mori","Discovery & Requirements",101,"Document experiences and integration touchpoints.","2026-10-30 17:00 — Mapping complete."],
  [103,"Validate data-handling requirements","1.3",100,"Task","2026-10-26","2026-11-06",75,"At Risk","Mina Sato","Discovery & Requirements",102,"Review permissions, quality, audit history and retention.","2026-11-06 11:20 — Fictional permission check remains open."],
  [104,"Requirements sign-off","1.4",100,"Milestone","2026-11-13","2026-11-13",0,"Not Started","Aiko Tanaka","Discovery & Requirements",103,"Gate for controlled implementation.",null],
  [200,"Experience Design","2",null,"Summary","2026-10-26","2026-11-27",null,"In Progress","Naomi Ishida","Experience Design",null,"Define desktop and responsive user experiences.",null],
  [201,"Define navigation architecture","2.1",200,"Task","2026-10-26","2026-11-02",100,"Completed","Naomi Ishida","Experience Design",102,"Define core views, task selection and navigation.","2026-11-02 14:10 — Navigation approved in sample."],
  [202,"Prototype schedule workspace","2.2",200,"Task","2026-11-02","2026-11-12",80,"In Progress","Yui Nakamura","Experience Design",201,"Prototype high-fidelity Schedule/Gantt behavior.","2026-11-07 16:40 — Gantt-local selector implemented."],
  [203,"Accessibility and keyboard review","2.3",200,"Task","2026-11-05","2026-11-17",45,"At Risk","Naomi Ishida","Experience Design",202,"Check focus, keyboard controls and labels.","2026-11-06 18:10 — More screen-reader review needed."],
  [204,"Conduct UX acceptance session","2.4",200,"Task","2026-11-16","2026-11-20",0,"Not Started","Kenji Mori","Experience Design",203,"Validate with fictional single Product Owner.",null],
  [205,"Design sign-off","2.5",200,"Milestone","2026-11-27","2026-11-27",0,"Not Started","Naomi Ishida","Experience Design",204,"Freeze experience before release.",null],
  [300,"Platform Integration","3",null,"Summary","2026-10-26","2026-12-04",null,"In Progress","Daichi Suzuki","Platform Integration",null,"Integrate workbook interfaces and reporting.",null],
  [301,"Build workbook import validation","3.1",300,"Task","2026-10-26","2026-11-03",100,"Completed","Daichi Suzuki","Platform Integration",103,"Validate worksheet headers and task identity.","2026-11-03 15:00 — Fictional import test passed."],
  [302,"Implement controlled Save workflow","3.2",300,"Task","2026-11-02","2026-11-18",55,"In Progress","Riku Watanabe","Platform Integration",301,"Protect candidate writes and backup checks.","2026-11-08 10:30 — Recovery review still open."],
  [303,"Verify audit history integrity","3.3",300,"Task","2026-11-05","2026-11-20",40,"Blocked","Mina Sato","Platform Integration",302,"Verify Save associations and timestamps.","2026-11-07 13:00 — Awaiting sample data."],
  [304,"Integrate weekly reporting","3.4",300,"Task","2026-11-09","2026-11-25",10,"Not Started","Riku Watanabe","Platform Integration",302,"Generate committed snapshots and clipboard parity.",null],
  [305,"Complete integration verification","3.5",300,"Milestone","2026-12-04","2026-12-04",0,"Not Started","Daichi Suzuki","Platform Integration",303,"Confirm full system acceptance.",null],
  [400,"Launch Readiness","4",null,"Summary","2026-11-09","2026-12-18",null,"Not Started","Haruka Kato","Launch Readiness",null,"Prepare fictional deployment communications.",null],
  [401,"Draft operational handbook","4.1",400,"Task","2026-11-09","2026-11-24",0,"Not Started","Haruka Kato","Launch Readiness",205,"Document features and recovery.",null],
  [402,"Prepare enablement materials","4.2",400,"Task","2026-11-11","2026-12-02",0,"Not Started","Yui Nakamura","Launch Readiness",401,"Make synthetic training materials.",null],
  [403,"Complete release security review","4.3",400,"Task","2026-11-16","2026-12-09",0,"Not Started","Mina Sato","Launch Readiness",305,"Check security controls and dependencies.",null],
  [404,"Publish release readiness report","4.4",400,"Task","2026-12-07","2026-12-15",0,"Not Started","Haruka Kato","Launch Readiness",403,"Summarize risks, results and owner decisions.",null],
  [405,"Readiness decision","4.5",400,"Milestone","2026-12-18","2026-12-18",0,"Not Started","Haruka Kato","Launch Readiness",404,"Final gate; not automatic release.",null]
];
if (rows.length !== 23 || new Set(rows.map(row=>row[0])).size !== 23) {
  throw new Error("Synthetic UAT task count or identity failure.");
}
const workbook = new ExcelJS.Workbook();
workbook.creator = "SPT-WBS synthetic UAT fixture";
workbook.created = new Date("2026-11-08T00:00:00Z");
workbook.modified = new Date("2026-11-08T00:00:00Z");
const sheet = workbook.addWorksheet("ProjectWBS");
sheet.addRow(headers);
for (const [i,row] of rows.entries()) {
  const [id,title,wbs,parent,type,start,end,progress,status,owner,workstream,pred,description,updates]=row;
  const data = [id,title,wbs,parent,type,start,end,progress,status,owner,workstream,i+1,
                ["High","Medium"].includes(type==="Summary"?"Medium":"High")?"High":"Medium",
                pred,description,updates,"2026-11-08T10:00:00.000Z"];
  sheet.addRow(data);
}
sheet.views = [{ state:"frozen", ySplit:1 }];
sheet.getRow(1).font = { bold:true, color:{ argb:"FFFFFFFF" } };
sheet.getRow(1).fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF175C89" } };
sheet.getRow(1).height = 23;
for (let c=1;c<=headers.length;c++) sheet.getColumn(c).width = [10,35,12,14,12,16,16,11,17,19,25,12,12,18,38,42,24][c-1];
// Do not add worksheet AutoFilter: the managed v1 fail-closed preflight expressly rejects it.
const workbookPath = join(dist,"SPT-WBS_DES010_Synthetic_UAT.xlsx");
await workbook.xlsx.writeFile(workbookPath);
const verify = new ExcelJS.Workbook();
await verify.xlsx.readFile(workbookPath);
if (verify.getWorksheet("ProjectWBS")?.rowCount !== 24) throw new Error("Packaged workbook failed roundtrip.");
// Validate the raw sheet against the exact unsupported-feature gate before distributing
// a workbook that owner UAT needs to save. A roundtrip through ExcelJS alone is insufficient.
const JSZip = (await import("jszip")).default;
const sourceZip = await JSZip.loadAsync(await readFile(workbookPath));
const worksheetXML = await sourceZip.file("xl/worksheets/sheet1.xml")?.async("string");
if (!worksheetXML || /<(?:f|drawing|legacyDrawing|tableParts|pivotTable|extLst|oleObjects|controls|sheetProtection|conditionalFormatting|dataValidations|hyperlinks|mergeCells|autoFilter|protectedRanges|customSheetViews|scenarios)\b/i.test(worksheetXML)) {
  throw new Error("Owner UAT workbook includes an unsupported Excel worksheet feature; refusing to package.");
}

const start = [
  "SPT-WBS DES-010 — COMPLETE Owner UAT Kit",
  "=====================================",
  "This ZIP contains the app, fictional Excel workbook, instructions and UAT results template.",
  "Managed draft PR #32 — development only. DO NOT use any real/corporate workbook.",
  "",
  "1. Extract all files. Do not run the HTML inside the ZIP.",
  "2. Create a new EMPTY local working folder for the test.",
  "3. COPY SPT-WBS_DES010_Synthetic_UAT.xlsx into that folder; keep the original untouched.",
  "4. Open managed.html in Microsoft Edge (Ctrl+O).",
  "5. Select Project > Choose project folder, then select your disposable working folder.",
  "   Confirm the workbook title and 23 tasks appear. If not, record the exact status line.",
  "6. Follow README-OWNER-UAT.txt and fill in UAT-RESULTS-TEMPLATE.md.",
  "",
  "Do not merge, release or deploy on the basis of this development-preview package."
].join("\n")+"\n";
const checklist = [
  "SPT-WBS — DES-010 Owner UAT (Development Preview)",
  "================================================",
  "Source: https://github.com/Kenny619/spl-wbs/pull/32",
  "Use only the included synthetic workbook, copied to a new disposable folder.",
  "",
  "REVIEW CHECKS — record PASS / FAIL / CONCERN",
  "A. Schedule: check icon and fixed navigation, task selection, inspector dimensions, internal scrolling, WBS/workstream/owner/status and Days left.",
  "B. Gantt scope: Workstreams displays all fictional workstreams; Exceptions filters the existing At Risk/Blocked statuses. Return to Workstreams; verify previous manual filters survive.",
  "C. Unsaved editing: change a task title, then navigate. Cancel must retain the draft; Discard must not save. Test Save only with the disposable workbook.",
  "D. Settings: check right-side drawer, timezone, Dark/Light/System, Columns, Reset and managed development version in About.",
  "E. Change History: after one successful Save, check one row per field action, shared Save identity, task/field/date filters and literal before/after values.",
  "F. Reports: generate Latest Status and Update Report. Default range is eight inclusive calendar dates (today - 7 to today). Changing dates must not regenerate until Generate/Refresh. Check Copy == preview.",
  "G. Safety: confirm normal read-only v18 viewer remains separate and untouched. Do not test real corporate files or complex unsupported Excel cases.",
  "",
  "RECORD: Windows / Edge versions, display/zoom, results A–G, exact errors and screenshots. Report Save backup and UpdateHistory outcome.",
  "STOP if the browser denies write permission or Save/recovery reports uncertainty. Do not force retries.",
  "No owner acceptance, merge, release or deployment is implied."
].join("\n")+"\n";
const resultsTemplate = [
  "# SPT-WBS DES-010 Owner UAT Results",
  "",
  "Windows version: ___ | Edge version: ___ | Resolution: ___ | Zoom: ___%",
  "Date: ___ | Disposable workbook location: ___",
  "",
  "| Check | PASS / FAIL / CONCERN / NOT RUN | Observations / exact errors |",
  "|---|---|---|",
  ...["A Schedule","B Gantt scopes","C Draft guard and Save","D Settings","E History","F Reports","G Safety"].map(x=>"| "+x+" | NOT RUN | |"),
  "",
  "Backup after Save: ___  ",
  "UpdateHistory rows / Save reference: ___  ",
  "Overall UAT verdict: ___  ",
  "Do not interpret these results as permission to release or merge."
].join("\n")+"\n";
await writeFile(join(dist,"START-HERE.txt"),start);
await writeFile(join(dist,"README-OWNER-UAT.txt"),checklist);
await writeFile(join(dist,"UAT-RESULTS-TEMPLATE.md"),resultsTemplate);
const deliverables=["managed.html","SPT-WBS_DES010_Synthetic_UAT.xlsx","START-HERE.txt","README-OWNER-UAT.txt","UAT-RESULTS-TEMPLATE.md"];
const sums=[];
for(const name of deliverables){
  const bytes=await readFile(join(dist,name));
  sums.push(createHash("sha256").update(bytes).digest("hex")+"  "+name);
}
await writeFile(join(dist,"SHA256SUMS.txt"),sums.join("\n")+"\n");
console.log("Complete synthetic owner UAT bundle prepared:",deliverables.join(", "));
