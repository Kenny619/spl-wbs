/**
 * Internal SHA-pinned Option A INTEGRATION CANDIDATE artifact.
 * This is NOT a UAT-ready declaration or release.
 * Run only after "npm run build:managed". Never read corporate workbooks.
 */
import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const sourceDir = "dist-managed";
const destination = "work/option-a-candidate";
const sourceXlsx = join(sourceDir, "SPT-WBS_Report11_Synthetic_UAT.xlsx");
const workbookName = "SPT-WBS_OptionA_Fictional_23_Task_Project.xlsx";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const contract = JSON.parse(await readFile("docs/specifications/EMV_PROJECT_DATA_0_1_2_FROZEN.json", "utf8"));
if (contract.spec_id !== "EMV-PROJECT-DATA-0.1.2" ||
    contract.version !== "0.1.2" ||
    contract.worksheets?.length !== 5) {
  throw new Error("Frozen field contract is missing or changed: refusing UAT candidate packaging.");
}
const expectedNames = ["ProjectMeta","ProjectCalendar","WatchReasons","ProjectCommitments","ProjectAudit"];
if (contract.worksheets.map(s => s.name).join("|") !== expectedNames.join("|")) {
  throw new Error("Unexpected frozen worksheet order.");
}
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(sourceXlsx);
const source = await readFile(sourceXlsx);
const wbs = workbook.getWorksheet("ProjectWBS");
const history = workbook.getWorksheet("UpdateHistory");
if (!wbs || wbs.rowCount !== 24 || !history || history.rowCount !== 6 ||
    expectedNames.some(name => workbook.getWorksheet(name))) {
  throw new Error("Expected the original 23-task Report11 fictional workbook, unextended.");
}
const idCell = Array.from({length:wbs.columnCount},(_,i)=>String(wbs.getRow(1).getCell(i+1).value)).indexOf("ID")+1;
const ids = new Set();
for (let i=2;i<=wbs.rowCount;i++) ids.add(String(wbs.getRow(i).getCell(idCell).value));
if (ids.size!==23 || !ids.has("303") || !ids.has("203")) throw new Error("Task IDs changed.");
const sheets = new Map();
for (const spec of contract.worksheets) {
  const heads = spec.headers.map(h => typeof h === "string" ? h : h.name);
  const sheet = workbook.addWorksheet(spec.name);
  sheet.addRow(heads);
  sheets.set(spec.name,{sheet,heads});
}
function append(sheetName,values) {
  const spec=sheets.get(sheetName);
  if (!spec) throw new Error("Unknown project-data sheet");
  const extra=Object.keys(values).filter(k=>!spec.heads.includes(k));
  if (extra.length) throw new Error("Unexpected frozen column(s): "+extra.join(","));
  spec.sheet.addRow(spec.heads.map(name=>values[name] ?? null));
}
const projectId="bd95a399-257e-4b42-ac0e-fb6ee984c1aa";
const blackoutId="eb5c7fd1-8f13-4c12-bfa2-67ceae2df489";
const openReason="7e4d09da-832e-4647-9202-8cbb8f8704d2";
const resolvedReason="ed58f70a-126e-4dce-ace1-b578dc5c290e";
const opened="2026-11-11T02:00:00.000Z";
const resolved="2026-11-13T02:00:00.000Z";
for (const [key,value] of [
  ["ProjectID",projectId],["ProjectName","Fictional Enterprise Delivery Program"],
  ["ProjectDataSchemaVersion","0.1.2"],
]) append("ProjectMeta",{Key:key,Value:value});
append("ProjectCalendar",{
  BlackoutID:blackoutId,Enabled:true,StartDate:"2026-11-23",EndDate:"2026-11-24",
  Label:"Fictional shared project blackout",ModifiedUTC:"2026-11-12T02:00:00.000Z",
});
append("WatchReasons",{
  ReasonID:openReason,TaskID:"303",Origin:"Manual",State:"Open",
  Title:"Pending audit recovery evidence",Details:"Fictional dependency, recorded but not verified",
  EvidenceRef:"Synthetic review meeting",OpenedUTC:opened,OpenedBy:"Synthetic editor",
});
append("WatchReasons",{
  ReasonID:resolvedReason,TaskID:"203",Origin:"Manual",State:"Resolved",
  Title:"Accessibility review dependency",Details:"Fictional review outcome",EvidenceRef:"Synthetic design notes",
  OpenedUTC:opened,OpenedBy:"Synthetic editor",ResolvedUTC:resolved,
  ResolvedBy:"Synthetic editor",ResolutionNote:"Mitigation recorded for sample",
});
function audit(eventId,changeSetId,timestamp,entityType,entityId,taskId,action,field,oldValue,newValue) {
  append("ProjectAudit",{
    EventID:eventId,ChangeSetID:changeSetId,TimestampUTC:timestamp,
    EntityType:entityType,EntityID:entityId,TaskID:taskId,Action:action,Field:field,
    OldValue:oldValue,NewValue:newValue,ActorLabel:"Synthetic editor",
    ActorProvenance:"UnverifiedLocal",Source:"Web UI",AppVersion:"option-a-uat-candidate",
  });
}
audit("43f416bf-33f4-4a32-aa46-7e0945561faa","c6dbf481-6868-48b7-b9b5-8726be2e2561",opened,"WatchReason",openReason,"303","Create","State","","Open");
audit("2ce51de9-5bfa-4750-a62f-9a6bf14f9e78","33333333-1111-4333-8333-111111111111",opened,"WatchReason",resolvedReason,"203","Create","State","","Open");
audit("3897af45-7b7c-446f-88d7-b6a94ee7ce08","33333333-2222-4333-8333-222222222222",resolved,"WatchReason",resolvedReason,"203","Resolve","State","Open","Resolved");
audit("3a752940-787a-4428-896f-7646f85c28d8","33333333-3333-4333-8333-333333333333","2026-11-12T02:00:00.000Z","Blackout",blackoutId,null,"Create","Enabled","","true");
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
const output=join(destination,workbookName);
await workbook.xlsx.writeFile(output);
const verified=new ExcelJS.Workbook();
await verified.xlsx.readFile(output);
for(const spec of contract.worksheets) {
  const headers=spec.headers.map(h=>typeof h==="string" ? h : h.name);
  const sheet=verified.getWorksheet(spec.name);
  if(!sheet || headers.join("|")!==headers.map((_,i)=>String(sheet.getRow(1).getCell(i+1).value)).join("|")) {
    throw new Error("Frozen schema header mismatch after XLSX roundtrip: "+spec.name);
  }
}
if(verified.getWorksheet("ProjectWBS")?.rowCount!==24 ||
   verified.getWorksheet("UpdateHistory")?.rowCount!==6 ||
   verified.getWorksheet("WatchReasons")?.rowCount!==3 ||
   verified.getWorksheet("ProjectAudit")?.rowCount!==5 ||
   verified.getWorksheet("ProjectCalendar")?.rowCount!==2 ||
   sha256(await readFile(sourceXlsx))!==sha256(source)) {
  throw new Error("Synthetic project-data/Report11 fixture integrity failed.");
}
const html=join(sourceDir,"managed.html");
if((await stat(html)).size<100000) throw new Error("Missing/incomplete integrated managed.html");
await copyFile(html,join(destination,"managed.html"));
const readme=[
"# SPT-WBS Option A integrated candidate — INTERNAL QA ONLY",
"",
"**Do NOT interpret this package as Product Owner UAT-ready, accepted, merged or released.**",
"PR #72. Source commit: "+(process.env.GITHUB_SHA ?? "LOCAL_UNPINNED"),
"CI run: "+(process.env.GITHUB_RUN_ID ?? "LOCAL_UNPINNED"),
"Generated at (UTC): "+new Date().toISOString(),
"",
"## Files and safety",
"- managed.html — standalone offline Excel-managed application",
"- "+workbookName+" — 23 fictional tasks, Report11 test history,",
"  five frozen project-data sheets, one shared blackout, one Open Manual Watch",
"  and one Resolved Manual Watch, with synthetic ProjectAudit.",
"- SHA256SUMS.txt — independent payload SHA-256 hashes",
"- UAT_CHECKLIST.md — physical Edge/Excel test steps",
"",
"Open managed.html from extracted files in Edge using file://.",
"Copy ONLY the fictional .xlsx into a NEW EMPTY DISPOSABLE folder.",
"Never load actual project workbooks for this candidate.",
"Do not send Outlook test messages.",
"No automatic Green, authenticated actor or commitment approval is asserted.",
"Excel-open writing was observed to succeed in a separate corporate browser smoke test;",
"that is NOT a safe lock guarantee. Always use a fresh disposable workbook.",
"",
"This candidate artifact is an engineering QA package; the README download link",
"will be promoted only after independent QA and all agreed readiness gates.",
"",
].join("\n");
const checklist=[
"# SPT-WBS integrated Option A — physical test checklist",
"",
"Candidate commit: "+(process.env.GITHUB_SHA ?? "LOCAL_UNPINNED"),
"Record PASS / FAIL / BLOCKED and exact Edge / Excel versions in GitHub Issue #11.",
"",
"| Test | Procedure | Result | Notes |",
"|---|---|---|---|",
"| E1 | Extract ZIP; open managed.html directly as file:// in Edge | | |",
"| E2 | Choose disposable folder; load 23-task fictional workbook | | |",
"| E3 | Verify Project name from shared XLSX, Task Details, Schedule and days remaining | | |",
"| E4 | Verify Nov 23–24 blackout in Calendar/Schedule and PGCM behavior | | |",
"| E5 | Confirm task 303 shows one OPEN recorded Manual Watch reason | | |",
"| E6 | Confirm task 203 shows RESOLVED recorded Watch reason, never Green | | |",
"| E7 | Create Manual Watch reason on fictional task; direct Save; reopen; verify audit, TaskID and reason | | |",
"| E8 | Resolve a newly added Manual Watch reason; verify append-only audit on reopen | | |",
"| E9 | Verify sibling predecessor backup and recovery inspection after Save | | |",
"| E10 | Open disposable workbook in Excel; test guarded Save failure/success and report actual outcome; never assume a lock | | |",
"| E11 | Make an external change and verify stale-source Save refuses unsafe overwrite | | |",
"| E12 | Save As to new unique fictional file; confirm source unchanged and new file valid | | |",
"| E13 | Meeting Review groups recorded Watch reasons by workstream and opens same Task Detail | | |",
"| E14 | Reports generates Latest Status and Progress & Risks with factual Watch evidence | | |",
"| E15 | HTML/plain/Outlook clipboard reflects data, and Outlook message stays UNSENT | | |",
"| E16 | Read-only XLSX fallback generates report but cannot write or backup | | |",
"| E17 | Light/dark Schedule, Task Detail, Meeting Review and Reports match DES-012 Review08 | | |",
"| E18 | Do not automatically classify cleared records as Green or authenticate editor identity | | |",
"",
"**If any save/recovery or source-concurrency check behaves unexpectedly: STOP.**",
"Retain disposable source, stage, pending, backup and ownership files for investigation.",
"Do not use real or shared project data and do not retry uncertain writes blindly.",
].join("\n")+"\n";
await writeFile(join(destination,"START_HERE.md"),readme+"\n");
await writeFile(join(destination,"UAT_CHECKLIST.md"),checklist);
const manifest={candidate:true,approvedUAT:false,repo:"Kenny619/spl-wbs",pr:72,
  sourceCommit:process.env.GITHUB_SHA??null,ciRun:process.env.GITHUB_RUN_ID??null,
  contract:"EMV-PROJECT-DATA-0.1.2",taskCount:23,watch:{open:1,resolved:1},calendar:{activeBlackouts:1},
  generatedUTC:new Date().toISOString()};
await writeFile(join(destination,"PROVENANCE.json"),JSON.stringify(manifest,null,2)+"\n");
const files=["managed.html",workbookName,"START_HERE.md","UAT_CHECKLIST.md","PROVENANCE.json"];
const sums=[];
for (const name of files) sums.push(sha256(await readFile(join(destination,name)))+"  "+name);
await writeFile(join(destination,"SHA256SUMS.txt"),sums.join("\n")+"\n");
console.log("Prepared internal QA candidate at "+destination+" from "+(process.env.GITHUB_SHA??"local")+" with "+files.length+" verified payloads");
