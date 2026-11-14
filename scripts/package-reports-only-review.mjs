/**
 * Bounded Reports-only review artifact. Runs after build:managed.
 * No production workbook input, no runtime network or write into a user's files.
 */
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const from = "dist-managed";
const out = "work/reports-only-review";
await mkdir(out, { recursive: true });
const files = ["managed.html", "SPT-WBS_Report11_Synthetic_UAT.xlsx"];
for (const name of files) {
  await copyFile(join(from, name), join(out, name));
  if ((await readFile(join(out, name))).byteLength === 0) throw new Error("Empty review file: "+name);
}
const sha = process.env.GITHUB_SHA ?? "LOCAL-BUILD";
const guide = `SPT-WBS — Reports 1.1 ONLY — Functional Review (NOT Stage A UAT)
=================================================================
Application source SHA: ${sha}
Visual authority: DES-012 consolidated Review08, including Reports.
Functional contract: frozen Report 1.1. Work in this ZIP is a draft.

This bundle contains:
- managed.html : real working Excel-managed application, not the standalone fictional design HTML
- SPT-WBS_Report11_Synthetic_UAT.xlsx : disposable 23-task workbook and UpdateHistory
- REPORTS_ONLY_REVIEW.md : review checklist
- SHA256SUMS.txt : manifest for the above three files

HOW TO START (Windows / Microsoft Edge)
1. Download the GitHub Actions artifact ZIP and extract every file.
2. Create an EMPTY disposable folder and COPY only the bundled .xlsx into it.
3. Open the extracted managed.html file locally in Microsoft Edge (Ctrl+O).
4. Choose Project > Choose project folder; select the disposable folder and workbook.
5. If the folder picker fails or write permission is denied, select Project > Open XLSX read-only
   and pick the same synthetic workbook. Reporting can be reviewed read-only; mark all
   save/edit/write checks BLOCKED. Never test with a real company workbook.
6. Open Reports. Verify the DES-012 builder/paper layout, Latest Status (initial mode),
   Progress & Risks Update, and Detailed Change Audit using only the synthetic source.
7. Set report project name to "Fictional Enterprise Program". For history-based reports,
   use inclusive 2026-11-09 through 2026-11-10 (JST); review historical save grouping.
8. Generate each report and review headings, workstream grouping, table layout, dates,
   milestones, calculated fields, status presentation, and paper document layout.
9. Switch HTML / Plain text, Copy, and Download HTML; open the downloaded HTML offline.
   Paste the copied HTML into an UNSENT Outlook HTML email if desired. DO NOT SEND.
10. Check that changing builder settings alone does not mutate an already-generated snapshot.
    Confirm report-only operations do not write the workbook or UpdateHistory.
11. Check Light/Dark modes, keyboard reachability, scroll, and available window widths.
12. Record PASS / FAIL / BLOCKED and observations in GitHub Issue #7.

IMPORTANT REVIEW LIMITS
- This is Reports-only functional inspection, NOT accepted integrated DES-012 UI,
  NOT a product release, and NOT an authorization to merge.
- Meeting Review remains separately gated on shared Excel Watch/Calendar decisions.
- Host Chromium CI cannot establish physical corporate Edge/Outlook UAT.
- Original readonly v18 viewer remains a separate product.
- The DES-012 design prototype uses fictional figures; generated report values must derive
  from the supplied workbook. Report document typography differences should be recorded.
- Do not introduce any new unsaved edits, personal data, corporate files, or send email.
`;
await writeFile(join(out, "REPORTS_ONLY_REVIEW.md"), guide);
const digests = [];
for (const name of [...files, "REPORTS_ONLY_REVIEW.md"]) {
  const bytes = await readFile(join(out, name));
  digests.push(createHash("sha256").update(bytes).digest("hex")+"  "+name);
}
await writeFile(join(out, "SHA256SUMS.txt"), digests.join("\n")+"\n");
console.log("Reports-only review staged:", out, files.join(", "), "SHA:", sha);
