/**
 * One-time controlled Stage B owner UAT overlay on the existing fictional
 * Option A workbook and verified managed.html packaging. No company data.
 * Run only after scripts/package-option-a-integrated-candidate.mjs.
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const dir = "work/option-a-candidate";
const workbook = "SPT-WBS_OptionA_Fictional_23_Task_Project.xlsx";
const html = "managed.html";
const sourceCommit = process.env.UAT_SOURCE_COMMIT || process.env.GITHUB_SHA || "LOCAL_UNPINNED";
const ciCheckoutCommit = process.env.GITHUB_SHA || "LOCAL_UNPINNED";
const runId = process.env.GITHUB_RUN_ID || "LOCAL_UNPINNED";
const metaFile = join(dir, "PROVENANCE.json");
const meta = JSON.parse(await readFile(metaFile, "utf8"));
if (meta.contract !== "EMV-PROJECT-DATA-0.1.2" || meta.taskCount !== 23 ||
    meta.watch?.open !== 1 || meta.watch?.resolved !== 1) {
  throw new Error("Stage B UAT requires the verified fictional 23-task, five-sheet workbook.");
}
if ((await stat(join(dir, html))).size < 100000 ||
    (await stat(join(dir, workbook))).size < 5000) {
  throw new Error("UAT application or fictional workbook is missing.");
}
const start = [
  "# SPT-WBS — Stage B Needs Attention & Severity Owner UAT",
  "",
  "**TARGET: personal Windows / Edge, local disposable fictional workbook only.**",
  "**NOT** Stage B acceptance, protected-main merge, beta, corporate release or an",
  "authorization to use a real/shared workbook. Stage A MRU already accepted.",
  "",
  "Exact app source SHA: `" + sourceCommit + "`",
  "GitHub Actions run: https://github.com/Kenny619/spl-wbs/actions/runs/" + runId,
  "Integration PR: https://github.com/Kenny619/spl-wbs/pull/92",
  "",
  "## Included",
  "",
  "- `managed.html` — built from exact integrated Stage B source",
  "- `" + workbook + "` — 23 fictional tasks; 1 Open Watch reason on Task 303,",
  "  1 Resolved Watch reason on Task 203, shared Calendar and fictional history",
  "- `UAT_CHECKLIST.md` — only NEW owner checks B2/B3 (Stage A already accepted)",
  "- `PROVENANCE.json` / `SHA256SUMS.txt` — source/run evidence and payload hashes",
  "",
  "## Start",
  "",
  "1. Extract all files. Copy **only** the supplied fictional XLSX to a new,",
  "   empty disposable folder. Keep the HTML elsewhere in the extracted package.",
  "2. Open `managed.html` in personal Edge. Use Project > Choose project folder",
  "   and select the disposable folder containing the copied XLSX.",
  "3. Execute **three** short checks in UAT_CHECKLIST.md. Test with only fictional",
  "   data; do not open real corporate/shared workbooks or send Outlook emails.",
  "4. Record PASS / FAIL / BLOCKED per check as a comment on GitHub PR #92.",
  "",
  "If the folder picker is blocked, capture the error and record BLOCKED.",
  "Do not treat read-only XLSX fallback as proof of writable folder access.",
  "Do not retry a Save after uncertain verification; retain all recovery files.",
  "No Green/Clear/RAG health inference is delivered by this Stage B slice.",
  "The two inherited moderate dependency advisories and corporate Edge limitations",
  "remain open. No corporate or production release has been authorized.",
  "",
].join("\n");
const checklist = [
  "# Stage B — 3 targeted owner UAT checks (new behavior only)",
  "",
  "Exact source SHA: `" + sourceCommit + "`",
  "Post results to https://github.com/Kenny619/spl-wbs/pull/92",
  "Record Edge version, viewport and PASS / FAIL / BLOCKED. Use the supplied",
  "fictional XLSX and keep any new workbook copy in the disposable folder.",
  "",
  "| ID | Action | Expected result | Outcome |",
  "|---|---|---|---|",
  "| B2-01 | Open Schedule at laptop width (~860px), then full desktop. Expand **Needs attention** on laptop using mouse or Enter; click a non-zero category. | Compact summary remains visible with Blocked/At Risk/Overdue/Under Watch counts (Unknown is not 0), expanded buttons can be activated, WBS shows the source task and Task Detail; Gantt stays usable and no clipping. | |",
  "| B2-02 | On Schedule, first enter a distinctive search that matches no tasks. Activate a category with a positive count (the fictional workbook records one Open Watch on Task 303); open Task Detail, then click the same attention category again. | Existing task list/Task Detail is used, not a duplicate list; original search/filter state is restored; Under Watch reflects a recorded Open reason only and never implies Green/Clear. | |",
  "| B3-01 | Edit a fictional task title **without saving**. Confirm the warning appears. Attempt to navigate; choose **Cancel**, then **Discard**. Check the warning in light and dark themes. | Warning is visible as soon as the draft changes, remains on Cancel without losing typed text, disappears after Discard; no workbook write occurs; keyboard focus and text are legible. | |",
  "",
  "**Do not repeat accepted Stage A E1-E17 or MRU-01/02/03 checks.**",
  "A separate exact-head Windows regression covers strict Gregorian overdue",
  "dates, overlapping categories, Open/Resolved Watch sources, Save failure",
  "alerts, byte integrity, browser keyboard behavior and other safety cases.",
  "",
  "If any check fails: include exact observed text/step and, if possible, a",
  "screenshot. A BLOCKED picker is NOT PASS. Do not open genuine corporate data.",
  "",
].join("\n");
await writeFile(join(dir, "START_HERE.md"), start+"\n");
await writeFile(join(dir, "UAT_CHECKLIST.md"), checklist+"\n");
const provenance = {
  ...meta, scope: "stage-b-b2-b3-needs-attention-and-severity",
  pr: 92, status: "OWNER_UAT_CANDIDATE_NOT_ACCEPTED",
  sourceCommit, ciCheckoutCommit, ciRun: runId,
  stageAAlreadyAccepted: true, stageBAccepted: false, mergeAuthorized: false,
  stageBChecks: ["B2-01","B2-02","B3-01"],
  knownDeferred: ["Corporate Edge file-picker policies", "RAG/Green/Clear policy",
    "Stage C task and project authoring", "moderate dependency advisories"],
};
await writeFile(metaFile, JSON.stringify(provenance,null,2)+"\n");
const files = [html, workbook, "START_HERE.md", "UAT_CHECKLIST.md", "PROVENANCE.json"];
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
await writeFile(join(dir,"SHA256SUMS.txt"),
  (await Promise.all(files.map(async name =>
    sha256(await readFile(join(dir,name)))+"  "+name))).join("\n")+"\n");
console.log("Stage B fictional UAT candidate prepared, source "+sourceCommit);
