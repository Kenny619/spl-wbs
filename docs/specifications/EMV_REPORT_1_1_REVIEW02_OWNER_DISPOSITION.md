# EMV-REPORT-1.1 — Review 02 owner design disposition & requirements delta

**Date:** 2026-11-10 JST  
**Source:** [Owner's feedback on Issue #7](https://github.com/Kenny619/spl-wbs/issues/7#issuecomment-6757994310), followed by explicit owner response in the Report review chat: **"Excellent update. No more change requests. Please proceed."**  
**Visual reference:** [Review 02 interactive HTML](../prototypes/SPT-WBS_Report_1.1_Interactive_Prototype_Review02.html), commit `abddcd80f93d11a6d2bf1326927cfc8c660cd3d2`.  
**Disposition:** **REVIEW-02 DESIGN ACCEPTED / NO FURTHER DESIGN CHANGE REQUESTS**. Scope may proceed to formal versioned specification reconciliation and delivery gate preparation. **Not** a formal requirements freeze (Decision A), report-engine implementation authorization (Decision B), integration/merge, release, or owner UAT acceptance. Frozen EMV-REPORT-1.0 remains controlling until explicit 1.1 freeze.

## Product Owner-directed changes (proposed for EMV-REPORT-1.1)

| ID | Report behavior and acceptance expectation |
|---|---|
| R11-UX-01 | Show **project name**, never workbook filename, inside any generated report (HTML/text/clipboard/export); workbook filename may remain in the report workspace UI for operator orientation. |
| R11-UX-02 | Task listing selector defaults to **All Tasks**, with Top 10 as an optional user-controlled alternative. Any limit applies explicitly and consistently to the relevant section, with suppressed-item count disclosed; no hidden arbitrary cap. |
| R11-UX-03 | Render compact scannable **one-task-per-row** reporting, grouping multiple tasks by plain workstream headings per frozen #7 naming convention; keep task details concise and preserve accessible wrapping/printability. Do not silently omit qualifying tasks merely to shorten a report. |
| R11-UX-04 | Red/Blocked and Amber/At Risk status are prominent through **label + contrast + border/color**, not color alone. Risk table combines items with Red/Amber RAG where available **or** current Blocked/At Risk status; never infer manual RAG solely from unrelated fields. |
| R11-SUM-01 | **Remove overall progress metric and progress-percentage headline** from the stakeholder-facing Latest Status and Progress & Risks Update summary; retain existing calculation for other application functionality, not as a primary report KPI. |
| R11-SUM-02 | **First metric:** count remaining Japanese working days **after today through go-live**, excluding weekends and the approved holiday calendar. Visible number uses “days” terminology. Go-live source is a Milestone with a name matching **Launch Date**, **Release Date**, or **G5** (case-/whitespace-insensitive). Do not infer a date from an ordinary Task. If none or multiple candidates, show an explicit unresolved state (no invented date/count). |
| R11-SUM-03 | **Upcoming milestone metric:** exactly one earliest scheduled, incomplete milestone on/after today; present the single date and remaining working-day count once each; omit task count. Empty state explicit. |
| R11-STATUS-01 | Remove generic healthy **In-progress Highlights**; status report is exceptions/commitment-led. Historical recorded progress remains present in the period stakeholder update where saved evidence exists. |
| R11-UPD-01 | One **Risks and Blockers** section for current Red/Amber RAG and/or Blocked/At Risk tasks, with current state differentiated from historical recorded risk entries; no duplication across separate risk sections. |
| R11-UPD-02 | A distinct **Schedule Changes** section restricted to task date edits actually recorded in valid `UpdateHistory` in the selected inclusive local-date window. Never include merely late/current overdue tasks as “changed.” |
| R11-UPD-03 | **Upcoming Commitments** lists scheduled incomplete tasks or milestones due **today through 5 working days from today**, including the fifth workday, and no later; dates are evaluated at generation time in selected Settings timezone with configured Japanese holidays. Overdue items belong in attention/risk context, not upcoming. |
| R11-AUD-01 | **Detailed Change Audit** renders **one table per local calendar date** (selected IANA timezone), all that day's field changes as rows. Repeated fixed column widths/order across every table: Save/time, Workstream, Task/WBS, Field, Before, After. Stable deterministic chronological order, original full `ChangeSetID` preserved in report evidence (not merely abbreviated tooltip), historical WBS/title snapshot and shared Save associations retained. Both HTML and plain text carry all substantive facts; no extra XLSX writes. |
| R11-CLIP-01 | Add **Copy for Outlook** when HTML view is selected, writing `text/html` and `text/plain` ClipboardItem MIME representations on an explicit gesture using safe escaped inline/email-compatible markup; fallback/error is explicit if clipboard permissions/browser/Outlook prevent rich paste. **Clipboard copy does not send email.** HTML export remains inert and standalone. |

## Implementation-facing boundaries

- No new source workbook columns, no rewrite of historical 1.0 Update Report semantics, no calendar approximation in production, no inferred RAG or unrecorded historical event, and no external service.
- Only committed/reloaded task state contributes to report facts. Pending edits must be warned about and excluded. Exactly one report data snapshot backs rendered HTML, plain text, downloads and clipboard representations until explicit Generate/Refresh.
- Day labels say “days”; business arithmetic remains working-day based, consistent with Owner UAT A.
- Report date calculations use selected Settings IANA timezone for "today", and the existing validated Japanese holiday source. If holiday coverage is missing, show “Holiday coverage incomplete” rather than a misleading exact countdown.
- For large All-Tasks output: use grouping, concise single-line rows where possible, print-safe breaks and reader-friendly summary first. A progressive-collapse UI may be evaluated later but must not silently truncate copied/exported reports.
- The Review 02 mock is a **fictional design illustration**, not implementation verification; its hardcoded project name, illustrative RAG flags, and holiday sample **must not** be copied into production as data sources.

## Two source-contract gaps discovered during reconciliation

1. **Project name is not a distinct attribute in the current `Task` or managed report context** (context presently exposes `fileName`). Proposed non-schema resolution for Decision A: require an explicit **Project name** field in the report workspace, kept in local UI preferences keyed to the workbook identity; do not emit the filename as a fallback inside the report. Empty project name blocks generation with an actionable message. Requires design/product acceptance as part of formal 1.1 freeze.
2. **Current `Task` model exposes `TaskStatus` but no separate Red/Amber RAG field.** Proposed bounded resolution: always include `At Risk`/`Blocked` statuses; include separately sourced Red/Amber flags **only if** a verified supported app-level risk/RAG source is available. Do **not** invent RAG from `Priority`, status or historical free text, or add a workbook column silently. The Product Owner must accept the source limitation or approve a separate data contract before treating manual-RAG integration as complete.

## Mandatory regression and targeted UAT additions

1. Project-name-only report headers across HTML, text, clipboard, export; filename UI-only; blank name actionable.
2. Multiple/none/exactly one launch/release/G5 candidate; workday/day wording, holiday gaps, past-due go-live and timezone rollover.
3. Distinct RAG vs status union and deduplication, contrast and screen-reader labels; appropriate behavior when no RAG source exists.
4. All Tasks default; Top 10 explicit; >100 task readability, no invisible truncation; only one task per row and no redundant workstream prefix.
5. Task status vs saved-date event discrimination, genuine 5-working-day end boundary, risk and schedule separation.
6. One table per local date across DST; fixed columns; no ChangeSetID, snapshot WBS/title or field-value loss; chronological stable Save grouping and full-value option.
7. Corporate Edge → new **Outlook HTML-compose** rich paste of text/html and text/plain, inline-format fidelity, safe malicious workbook text, denied-permission fallback, no auto-send; download/print independent.
8. Existing v18 read-only viewer, managed workbook Save/History, dirty-draft protections, and no report-induced workbook writes unchanged.

## Decision state

| Gate | State |
|---|---|
| Review 02 design feedback closure | **ACCEPTED** (owner: no further change requests) |
| Formal EMV-REPORT-1.1 requirements freeze — Decision A | **OPEN** |
| Bounded draft implementation authorization — Decision B | **OPEN** |
| Independent QA / owner physical Edge + Outlook UAT | **NOT RUN** |
| Merge / release | **NOT AUTHORIZED** |
