# EMV-REPORT-1.1 — Developer/QA handoff (AUTHORIZED)

**Authorization date:** 2026-11-10 JST. Owner explicitly approved both A (freeze) and B (bounded implementation).  
**Controlling contract:** [EMV_REPORT_1_1_FROZEN.md](../specifications/EMV_REPORT_1_1_FROZEN.md).  
**Issue:** [#7](https://github.com/Kenny619/spl-wbs/issues/7).  
**Visual authority:** [Report 1.1 Review02 design](https://github.com/Kenny619/spl-wbs/blob/docs/report-1-1-po-approved-direction/docs/prototypes/SPT-WBS_Report_1.1_Interactive_Prototype_Review02.html).  
**Branch:** `feature/report-1-1-stakeholder-html` rooted **exactly** at `378c10f5444cb2d5e4c2ac61f15b38cf11765a82` (approved managed UAT-02 visual remediation PR #35). This stacks upon PR #35 -> #34 -> #32 -> #19; do not independently merge this or any ancestor PR.

## Execution order for Cursor / DEV+QA

### 1. Contract-first implementation

Implement a typed, immutable report view model shared by **all** text/HTML renderers. Keep the existing validated Issue #7 1.0 report/history engine and its tests as regression references. A full factual field-row audit must remain possible. Integrate with the DES-010 managed Report workspace; preserve its fixed Schedule/Reports navigation (do not reintroduce a Close button).

- Implement 3 modes: Latest Status, Progress & Risks Update (primary), Detailed Change Audit.
- Keep reports read-only, from committed/reloaded workbook and validated UpdateHistory only. Dirty drafts warned and excluded; no Save, backup, source mutations, cloud calls or DOM injection.
- Add explicit *Project name* input as a **local preference** scoped to workbook identity, with clear no-persistence fallback when storage is blocked; never put filename inside report HTML/text, and block Generate if project name empty.
- Use existing `TaskStatus` Blocked/At Risk immediately. The current Task schema **does not** contain a separate RAG field: show Red/Amber from an independent signal only where verified as supported; no invented values, new fields or schema migration. Color and words must make exceptions unmistakable.
- Go-live milestone: unique Launch Date/Release Date/G5, case/whitespace insensitive, milestone only. If zero/multiple, show explicit unresolved state. Calculate Japanese **working days** after today through date in configured Settings timezone with the approved holiday resolver; UI calls them **days** and signals incomplete holiday coverage. No overall-progress or healthy In-progress Highlights in reports.
- One next open milestone (date and days remaining, no double date); All Tasks default; compact one-task-per-row workstream groups, optional Top 10 with explicit omitted counts. Cross-section readability for 100+ tasks.
- Current Risks and Blockers unified; saved period progress/accomplishments separately described; **Schedule Changes** from recorded PlannedStart/PlannedEnd event edits only; current Upcoming Commitments due within 5 *working* days inclusive. Maintain verified current vs recorded distinction, no invented historic project %.
- Detailed Audit: one fixed-column table **per selected-timezone calendar date**, historical title/WBS, full ChangeSetID/Save association and field values retained; distinguish absent/empty/invalid history; correct DST boundaries and long-value option.
- Same immutable snapshot for text, escaped inert standalone HTML, download, copy and print. For **Copy for Outlook**, write `text/html` and `text/plain` ClipboardItem payload with safe email-compatible inline CSS, truthful permission errors; **do not send email**. HTML document must be self-contained with no scripts, remote assets or executable workbook content.

### 2. Tests and independent QA

- Focused pure unit tests for snapshot consistency, local date/5th vs 6th working day, holiday gaps, 0/1/multiple go-live, one milestone, RAG-source absence, per-day audit grouping with full ChangeSetID, saved title/WBS, invalid/absent history and history reversals.
- Windows Chromium browser tests for all 3 report modes, HTML/text parity, full content, top10/all, clipboard MIME and denied permissions, offline export, malicious workbook strings inert, dark/light accessibility, 100+ items, DES-010 fixed navigation and no workbook save.
- Exact-HEAD Linux npm ci/typecheck/unit/build; Windows Chromium and CI artifact capture. AI-assisted second-pass review against spec and security concerns, clearly separated from actual automated/physical UAT.
- Physical Owner UAT in corporate Edge with synthetic/disposable workbook for report appearance, print, exported HTML, plain text, **paste into Outlook HTML mail compose** (format retained; no sending), audit parity and no-write protection.
- Preserve workbooks, backup safeguards, v18 read-only viewer, prior approved PR #35 dark/wording fixes and historical owner UAT evidence. Do not modify or claim acceptance of residual ExcelJS/uuid advisory.

### 3. Deliverables & handoff

1. Commit application code and tests on **this implementation branch**, update this draft PR with exact head SHA and test evidence.
2. Post one concise DEV status/update on PR and Issue #7, including any genuine design/data-contract blockage, not routine interruptions.
3. Package an owner UAT ZIP with complete `managed.html`, synthetic workbook and START-HERE/README-UAT/results template/integrity manifest; pin exact build SHA and GitHub Actions artifact in README. Include precise corporate Edge/Outlook steps.
4. Obtain independent QA plus targeted Owner UAT, then prepare an exact-SHA integration/merge decision package. **Do not merge automatically**, release, deploy, tag, close Issue #7 or infer security risk waiver.

**Current state of this handoff:** Authorized and ready for implementation; this file is a task/QA assignment, not completed product implementation. There is no implementation CI or Owner UAT PASS to claim.
