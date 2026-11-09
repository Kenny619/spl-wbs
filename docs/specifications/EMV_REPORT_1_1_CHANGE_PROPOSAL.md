# EMV-REPORT-1.1 — Product Owner-approved direction / formal change proposal

**Date:** 2026-11-09 JST  
**Controlling requirements:** [Issue #7](https://github.com/Kenny619/spl-wbs/issues/7), frozen **EMV-REPORT-1.0** (approved 2026-11-06).  
**Related:** #3 workbook schema; #4 editing; #5 UpdateHistory audit; #6 Settings/timezone; DES-010 UAT Session 02 and UI [PR #35](https://github.com/Kenny619/spl-wbs/pull/35).  
**Decision status:** Product Owner explicitly approved **reporting direction** in chat on 2026-11-09 ("approved"), in response to proposed stakeholder-focused Progress & Risks Update as the primary period report, Detailed Change Audit separately, and plain-text **and HTML** output. This document captures a **proposed revision** for formal freeze/review, not an automatic amendment or implementation authorization.  
**Version status:** 1.1 *proposal*; **1.0 remains frozen and controlling until separately frozen**. No report-engine changes, PR merge, deployment, release or Issue #7 closure authorized by this document.

## 1. Change control: approved direction versus existing rule

| Aspect | EMV-REPORT-1.0 currently frozen | EMV-REPORT-1.1 proposed direction |
|---|---|---|
| Report modes | Latest Status; Update Report | Latest Status; **Progress & Risks Update** (primary dated stakeholder report); **Detailed Change Audit** (retained 1.0 historical Update Report) |
| Update purpose | Field-level historical entity attribute changes grouped by workstream | Stakeholder-readable progress, material changes, emerging/project risks, commitments and near-term actions; attribute-level audit moved to dedicated mode |
| Source of dated change | Exclusively persisted `UpdateHistory` | Use **historical saved evidence** for statements about *change during the period*, with current committed ProjectWBS state clearly distinguished from historical facts |
| Output representation | Plain-text preview and exact plain-text Copy | Keep exact plain-text preview/Copy; add **HTML preview** and safely generated, standalone **.html export** from the same immutable data snapshot |
| User flow | Fixed Generate/Refresh snapshot | Preserve fixed snapshot; allow text/HTML format switching without recalculating underlying content |
| Audit and schema | Lossless ChangeSetID associations, per-field rows and timestamps | **Unchanged** in Detailed Change Audit; never delete historical semantics or modify schema |

**Reason for change:** Owner's physical DES-010 UAT found the existing historical change report unhelpful to the intended management/stakeholder audience. Readers need progress and emerging risks, while raw change lists serve governance/audit rather than the primary progress narrative. Owner explicitly asks for HTML output.

## 2. Proposed product behavior (for formal contract review)

### 2.1 Latest Status — existing 1.0 functionality retained

- Current committed workbook-only progress rollups using existing calculation and status classification; no invented trend or summary-task double counts.
- Needs Attention: Blocked / At Risk / relevant overdue; milestones and near-term highlights, honoring workstream grouping, task-limit selector, and frozen display/timezone rules.
- Available as text and HTML using identical facts, generated timestamp, empty states and ordering.

### 2.2 Progress & Risks Update — new *primary period* report

For a chosen **inclusive calendar date range** in Settings IANA timezone, use persisted `UpdateHistory` as evidence of specific changes and current committed `ProjectWBS` for **current** status. Organize for stakeholder reading, *not* as a list of field edits:

1. **Executive summary:** project/file identity, reporting dates, selected timezone, generated timestamp; current weighted progress and current attention counts clearly labeled **as-of-generation**, not misrepresented as historical end-of-period metrics.
2. **Progress and accomplishments:** meaningful completed/advanced tasks and milestones *only when dated evidence supports a transition*; distinguish "recorded during period" from task state simply observed now. If `UpdateHistory` does not capture a transition, say so and avoid inferred historic status.
3. **Emerging risks and schedule shifts:** newly Blocked / At Risk status transitions, newly identified overdue exposure or changed committed dates *only where history includes the before/after values and timestamp*. If current tasks are blocked/at risk without new period history, present them as **outstanding current risks**, not "new."
4. **Actions / near-term commitments:** current incomplete or upcoming milestones/deadlines grounded in date-only scheduled values, grouped by workstream; **do not fabricate owner actions, mitigation plans, delivery confidence, or risk causes**. Include saved `Updates` text as quoted factual notes only where available and clearly attributed; do not treat a text field as verified completion.
5. **Workstream presentation:** show exceptions first, then meaningful progress and next milestones grouped by workstream. Multiple tasks beneath headings use plain workstream headings and unprefixed task names; standalone mentions use `[Workstream] Task Name` as frozen in 1.0.
6. **Evidence and no-data behavior:** a missing/incomplete history must not imply no work occurred. Display "No recorded period changes" when valid history has none; differentiate empty valid history from malformed/incompatible data (fail closed rather than produce a misleading full report). Preserve visible timestamps for factual historical changes.
7. **Ranking:** use existing approved status/deadline rules, deterministic sorting and existing priority semantics; no invented risk score or new risk model.

The exact historical extent of prior `ProjectWBS` snapshots is **not guaranteed**. Do **not** calculate before/after project completion percentages unless complete reliable snapshots and an approved method exist. `UpdateHistory` can capture discrete saved edits, **not** all corporate activities or changes made outside the application.

### 2.2.1 Evidence classification and deterministic period-event rules (review refinement)

The implementation must use **two explicit evidence channels** rather than silently promoting current task attributes into historical facts:

- **Saved-change evidence:** a valid UpdateHistory event with a canonical `TimestampUTC`, `ChangeSetID`, TaskID, field, old/new values, and a timestamp inside the chosen local-date window. Each field comparison comes from the stored values; classify *only* known editable fields.
- **Current-state evidence:** a task present in the presently committed ProjectWBS, as loaded at Generate/Refresh. A current state of Completed, At Risk, Blocked or overdue **does not prove when it became so**.
- **Unverified historical state:** a task with no relevant saved transition in the reporting period; do not assign it a “new”, “resolved”, “advanced” or “slipped this period” label.

Transition rules proposed for acceptance testing:

| Recorded field and transition | Stakeholder report fact | Explicit limitation |
|---|---|---|
| `TaskStatus` to `Completed` from another status | **Recorded completion** within period | Do not assert first-ever completion if multiple status changes exist |
| `Progress` numeric increase (0–100) | **Recorded progress increase** for task | Do not aggregate into project % historical delta; repeated events may reverse or supersede |
| `TaskStatus` to `At Risk` or `Blocked` from a different status | **Recorded risk-status entry** | Re-entry may not be the first historical risk event |
| `TaskStatus` out of `At Risk` or `Blocked` | **Recorded risk-status exit** | Do not equate exit with proven issue resolution or mitigation |
| `PlannedStart` or `PlannedEnd` changed | **Recorded schedule revision**, old/new dates | Call it a delay only when the saved end date moves later; do not infer cause |
| `AssignedTo`, `Priority`, `Updates`, `Description` changed | Optional **recorded note/reassignment/priority change**, factual and attributable | Free-form notes are not automatically a verified risk, completion or action commitment |
| No relevant validated events | **No recorded changes for this period** | Do not say “nothing progressed” or “no emerging risks” |

Multiple saved transitions for the same task within the period must be ordered by `TimestampUTC`, then deterministic ChangeSetID/row order; avoid contradictory headline claims by showing **recorded event progression and latest/current status separately**. Do not deduplicate away reversals, and do not count one logical Save as multiple separate work events merely because several fields changed. For the event's display identity, use the saved task title and WBS snapshot, even if current title differs; current workstream remains a *presentation* grouping per 1.0. A removed task may remain in recorded historical changes, grouped under **Unknown Workstream**, and cannot be claimed to be currently outstanding.

**Current-risk precedence:** Outstanding current `Blocked` / `At Risk` and overdue are evaluated from committed task data using the already-approved classification and today's date in the selected timezone, labeled **current** and displayed independently from any historical risk transitions. A period may contain a recorded risk entry that was subsequently resolved or reversed; present the historic event without calling it an outstanding risk. Where no reliable period baseline exists, show **no computed trend percentage**, no inferred planned-vs-actual variance, and no automatic risk causes or “next owner action” that is not in recorded fields.

**Historical source coverage:** Existing `readManagedHistory()` legitimately returns an **empty event set when the UpdateHistory sheet is absent**. For 1.1, report messaging must distinguish “history sheet absent” (no in-app history available) from “sheet exists with zero qualifying events” when possible without modifying the schema; both cases must avoid claiming complete corporate change coverage. A history read/parse failure must be surfaced as an error, not replaced with a generic “no updates” result.

### 2.3 Detailed Change Audit — preserve existing Update Report semantics

Retain the complete frozen EMV-REPORT-1.0 historical Update Report under a new explicitly audit-focused name. Continue reading **only** `UpdateHistory` for date-window events: affected task count, logical Save count, field-row count, old/new values, immutable historical title/WBS snapshot, field labels, timestamps, complete cross-workstream `ChangeSetID` links, full/abbreviated long-text choice, deterministic order, malformed-history rejection, empty-window behavior. Existing validated test coverage must remain.

### 2.4 Plain-text and HTML output

- Both representations derive from the **same immutable generated snapshot and same canonical report data**. Changing display format alone must not trigger Generate/Refresh or change facts, timezone, period, grouping, ordering or totals.
- **Text:** readable preview, exact-text Copy Report, and unchanged snapshot/clipboard failure notices; no loss to existing v1 copy workflow.
- **HTML:** readable document-style preview with clear headings, workstream sections, compact progress/risk highlights, accessible contrast, semantic tables only when useful, responsive printable layout; standalone **Download HTML** for offline browser open/printing.
- HTML is generated from trusted local render templates and **escaped untrusted workbook text**. Never treat Description/Updates as executable markup. No script, remote assets, external tracking, embedded links to untrusted locations or network transmission. Use local, static CSS. CSP-compatible inert content; malicious workbook cell text remains literal visible text.
- Export only on explicit user gesture. Exporting reports **does not write workbook files, change UpdateHistory or create Save/backup transactions**.
- Avoid claiming HTML exists in the current build; 1.0 product provides plain text only.

### 2.5 Preserved cross-cutting constraints

No source workbook changes from report generation; unsaved drafts excluded and warned; explicit Generate/Refresh snapshot; IANA timezone for instants and date-only scheduled values preserved across timezone changes; inclusive window with correct DST; original #3–#6 data integrity and edit/safety contracts, v18 read-only viewer, approved managed DES-010 navigation and workstream grouping unchanged.

## 3. Impact analysis and dependencies

- **Requirements:** change to frozen Issue #7's report modes, Update Report source/presentation, and text-only output guarantee. Formal freeze and version/changelog update required; preserve 1.0 provenance as historical baseline.
- **Data:** no XLSX schema changes proposed. `ProjectWBS` + existing `UpdateHistory` sufficient for factual current-state and *recorded* changes; historical trending may be limited; new fields/event log are **out of scope** pending separately approved business case.
- **Implementation:** refactor `src/managed/reports.ts` into source-normalized typed report view models plus text and inert-HTML renderers; update `reportsUi.ts` to offer three modes and format selection/download. Preserve current audited generator for Detailed Change Audit and stable text contract. The reports workspace is already fixed under DES-010; Close button remediation lives in draft PR #35, not this proposal.
- **Tests:** preserve existing 1.0 text/audit contract tests as regression for Detailed Audit; add period-boundary and DST tests, recorded transition vs current-state distinction, no fabricated deltas, workstream formatting, cross-Save association, text/HTML semantic equivalence, XSS escaping and malformed data, fixed snapshot, download-only-on-click, clipboard and offline HTML rendering, dirty draft/no workbook writes.
- **Security:** HTML generation creates an injection surface. Require inert rendering, safe escaping, no remote resource loads, and security review. Existing ExcelJS/uuid moderate dependency advisory remains separately open.
- **UAT:** one consolidated owner evaluation with representative synthetic project changes and current risks, both formats, HTML offline open/print, reports navigation, text clipboard and audit parity. Do not repeat already-passed unrelated owner scenarios.
- **Delivery:** design+spec review first; implementation only after scope/authorization; AI-assisted QA with exact SHA and Windows browser; targeted physical Edge UAT; no automatic merge/release.

## 4. Proposed acceptance criteria

1. Three report modes with stakeholder Progress & Risks Update the default dated period report and a separately discoverable Detailed Change Audit.
2. Latest Status unchanged in core facts; same verified weighted progress/attention logic and summary handling.
3. Dated transition claims only when `UpdateHistory` contains supporting events, with current outstanding issues labeled separately. No historical trend or mitigation invented.
4. Clear source/evidence distinction; malformed history and missing historical baseline never misrepresented as verified period performance.
5. Stakeholder content prioritizes changes/progress, emerging/current risks and upcoming deadlines/decisions, with workstream hierarchy and frozen naming rules.
6. Detailed Change Audit preserves all original Issue #7 historical field, Save grouping, timezone and clipboard rules.
7. Both text and HTML operate on one fixed snapshot until Generate/Refresh; identical facts, ordering, dates, counts and timezone.
8. HTML is offline, inert, accessible and printable; workbook text escaped; no network/resource injection or active content.
9. HTML download explicit, no mutation of workbook/history, text clipboard unchanged and failures surfaced accurately.
10. Invalid dates, DST, no period activity, incomplete history, unsaved drafts, no workbook, disabled write status and cancelled exports covered by unit + Windows Chromium tests.
11. Existing read-only v18 and approved managed visual/UI routes remain unchanged.

## 5. Approval / change log

| Date (JST) | Status | Action |
|---|---|---|
| 2026-11-06 | **1.0 FROZEN** | Owner approved Latest Status and UpdateHistory-only plain-text Update Report with workstream formatting |
| 2026-11-09 | **1.1 direction APPROVED** | Owner approved stakeholder-focused Progress & Risks Update, separate Detailed Change Audit and plain-text + HTML outputs in response to consolidated proposal |
| 2026-11-09 | **1.1 formal proposal PREPARED** | Written contract, evidence boundaries, impact analysis and acceptance criteria prepared for explicit freeze; no production code changed |

**Open approval boundary:** this is the *formal revision proposal*. Product Owner approval of the direction does not silently freeze the exact detailed 1.1 requirements or authorize a PR merge/release. No remaining decisions should be escalated until the detailed spec is ready for a consolidated freeze and implementation decision.
