/**
 * PR #98 synthetic-only owner UAT overlay. Run after:
 * npm ci (once, before this script); the script then builds fresh and packages.
 * UAT_SOURCE_COMMIT=74ef5e22ce06cf537d52cef6338984ec116148a2 node scripts/package-stage-b-98-uat.mjs
 * No corporate workbooks, GitHub Actions or deployment involved.
 */
import { readFile, writeFile, stat, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import JSZip from "jszip";
import ExcelJS from "exceljs";

const expected = "74ef5e22ce06cf537d52cef6338984ec116148a2";
const sourceCommit = process.env.UAT_SOURCE_COMMIT;
if (sourceCommit !== expected) throw new Error("Refusing unpinned/wrong PR #98 source");
// Fail closed: independently establish exact application source and regenerate output.
// Run this script from a clean, committed checkout of the packaging branch.
const git = (...args) => execFileSync("git", args, { encoding:"utf8" }).trim();
const head = git("rev-parse","HEAD");
if (head === expected) throw new Error("Packaging overlay commit is absent");
try { git("merge-base","--is-ancestor",expected,"HEAD"); }
catch { throw new Error("Current HEAD is not descended from approved PR #98 application SHA"); }
const sourcePaths = ["src","test","package.json","package-lock.json","vite.config.ts"];
if (git("diff","--name-only",expected,"HEAD","--",...sourcePaths,"scripts/package-option-a-integrated-candidate.mjs","scripts/prepare-managed-html.mjs","scripts/package-report11-uat.mjs","scripts/package-des010-uat.mjs","vite.managed.config.ts","docs/specifications/EMV_PROJECT_DATA_0_1_2_FROZEN.json"))
  throw new Error("Packaging branch modifies application/build/test source after approved PR #98");
if (git("status","--porcelain","--untracked-files=no","--",...sourcePaths,"scripts/package-stage-b-98-uat.mjs"))
  throw new Error("Uncommitted source or packaging-script changes: refuse to package");
// Do not accept stale managed.html or workbook outputs from an earlier build.
await rm("work/option-a-candidate",{recursive:true,force:true});
execFileSync("npm",["run","build:managed"],{stdio:"inherit",shell:process.platform==="win32"});
execFileSync(process.execPath,["scripts/package-option-a-integrated-candidate.mjs"],{stdio:"inherit"});
const dir = "work/option-a-candidate";
const workbook = "SPT-WBS_OptionA_Fictional_23_Task_Project.xlsx";
const html = "managed.html";
const metadata = JSON.parse(await readFile(join(dir,"PROVENANCE.json"),"utf8"));
if (metadata.contract !== "EMV-PROJECT-DATA-0.1.2" || metadata.taskCount !== 23 ||
    metadata.watch?.open !== 1 || metadata.watch?.resolved !== 1)
  throw new Error("Synthetic five-sheet workbook contract/Watch fixture mismatch");
if ((await stat(join(dir,html))).size < 100000 ||
    (await stat(join(dir,workbook))).size < 5000)
  throw new Error("Managed app or synthetic workbook absent");
// Independently open the generated XLSX rather than trusting PROVENANCE.json alone.
const verifiedWorkbook = new ExcelJS.Workbook();
await verifiedWorkbook.xlsx.readFile(join(dir,workbook));
const expectedSheets = ["ProjectWBS","UpdateHistory","ProjectMeta","ProjectCalendar","WatchReasons","ProjectCommitments","ProjectAudit"];
const actualSheets = verifiedWorkbook.worksheets.map(sheet => sheet.name);
if (actualSheets.join("|") !== expectedSheets.join("|") ||
    verifiedWorkbook.getWorksheet("ProjectWBS")?.rowCount !== 24 ||
    verifiedWorkbook.getWorksheet("UpdateHistory")?.rowCount !== 6 ||
    verifiedWorkbook.getWorksheet("WatchReasons")?.rowCount !== 3 ||
    verifiedWorkbook.getWorksheet("ProjectAudit")?.rowCount !== 5) {
  throw new Error("Independent synthetic workbook sheet/fixture validation failed");
}
const watchSheet = verifiedWorkbook.getWorksheet("WatchReasons");
const watchHeaders = watchSheet.getRow(1).values.map(value => String(value ?? ""));
const stateCol = watchHeaders.indexOf("State");
if (stateCol < 1 ||
    [2,3].map(row => String(watchSheet.getRow(row).getCell(stateCol).value)).sort().join("|") !== "Open|Resolved") {
  throw new Error("Synthetic Watch Open/Resolved fixtures missing");
}
const app = await readFile(join(dir,html),"utf8");
if (!/pgcm/i.test(app) || !/provenance/i.test(app))
  throw new Error("Managed HTML lacks PGCM or provenance indicators; inspect build");

const start = [
"# SPT-WBS — Stage B #16/#17 combined owner UAT",
"",
"**Candidate only; NOT accepted, merged, deployed or released.**",
"Source PR: https://github.com/Kenny619/spl-wbs/pull/98",
"Exact application source commit: `"+expected+"`",
"Automated combined-head CI: https://github.com/Kenny619/spl-wbs/actions/runs/44033611876",
"",
"Extract the ZIP. On a PERSONAL Windows PC, open managed.html in Edge.",
"Copy only the supplied fictional XLSX into a NEW EMPTY disposable folder.",
"Use Project > Choose project folder to select that folder.",
"Do not use any company/shared workbook. Do not assume file:// folder access",
"works on corporate Edge. If picker is blocked, record BLOCKED; a supported",
"localhost launch may be used only after validating its folder-access behavior.",
"Do not retry uncertain Save operations or discard recovery evidence.",
"",
"Perform only the three checks in UAT_CHECKLIST.md; Stage A and B2/B3 already passed.",
"Report PASS/FAIL/BLOCKED and Edge version on PR #98. Owner physical acceptance",
"and separate protected-main merge approval are still required.",
"RAG/Green/Clear policy remains open in Issue #82.",
""
].join("\n");
const checklist = [
"# Stage B #16/#17 — three focused owner checks",
"",
"Source: `"+expected+"`. Fictional workbook ONLY.",
"",
"| ID | Procedure | Expected | Result |",
"|---|---|---|---|",
"| PGCM-01 | In Schedule choose Day, then Week. In Settings switch PGCM highlight OFF and ON. | Default ON; real Day and Week markers appear in their own zoom only; OFF removes markers; no assumption of Month markers. | |",
"| PGCM-02 | Switch PGCM OFF, reload and reopen the fictional workbook, then Settings > Reset. | OFF persists locally after reload; Reset restores ON and markers. Workbook bytes are unchanged by display-only toggles. | |",
"| H17-01 | At laptop (~860px) and desktop (1366/1440px), keyboard-open the header source/provenance disclosure; inspect a long source, press Escape. | Existing full source wraps; Escape closes and returns focus; urgent Save/recovery/permission/unsaved warnings stay visible and non-dismissible. | |",
"",
"Do not repeat accepted B2/B3 or Stage A tests. Record observed failure text.",
""
].join("\n");
const provenance = {
  ...metadata, pr:98, scope:"stage-b-pgcm-header-combined-owner-uat",
  sourceCommit:expected, ciRun:"44033611876",
  ownerUatReady:false, ownerAccepted:false, stageBAccepted:false,
  mergeAuthorized:false, securityWaiver:false,
  checks:["PGCM-01","PGCM-02","H17-01"],
  knownDeferred:["Corporate Edge file:// folder picker","Health/RAG/Clear policy #82",
    "Two inherited moderate dependency advisories","Shared workbook concurrency"]
};
await writeFile(join(dir,"START_HERE.md"),start+"\n");
await writeFile(join(dir,"UAT_CHECKLIST.md"),checklist+"\n");
await writeFile(join(dir,"PROVENANCE.json"),JSON.stringify(provenance,null,2)+"\n");
const names=[html,workbook,"START_HERE.md","UAT_CHECKLIST.md","PROVENANCE.json"];
const sha=b=>createHash("sha256").update(b).digest("hex");
const checks=[];
const zip=new JSZip();
for (const name of names) {
  const bytes=await readFile(join(dir,name));
  checks.push(sha(bytes)+"  "+name);
  zip.file(name,bytes);
}
const sums=checks.join("\n")+"\n";
zip.file("SHA256SUMS.txt",sums);
const out="work/SPT-WBS_StageB_PR98_Owner_UAT.zip";
await mkdir("work",{recursive:true});
await writeFile(out,await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"}));
const checkZip=await JSZip.loadAsync(await readFile(out));
for (const name of names) {
  const bytes=await checkZip.file(name)?.async("nodebuffer");
  if (!bytes || !checks.includes(sha(bytes)+"  "+name)) throw new Error("ZIP checksum mismatch: "+name);
}
if ((await checkZip.file("SHA256SUMS.txt").async("string"))!==sums)
  throw new Error("ZIP manifest mismatch");
console.log("Verified synthetic PR #98 UAT ZIP: "+out+"; approved app source "+expected+"; packaging HEAD "+head);
