# EMV-REPORT-1.1 — Product Owner-approved direction / formal change proposal

**Date:** 2026-11-09 JST  
**Controlling requirements:** [Issue #7](https://github.com/Kenny619/spl-wbs/issues/7), frozen **EMV-REPORT-1.0** (approved 2026-11-06).  
**Related:** #3 workbook schema; #4 editing; #5 UpdateHistory audit; #6 Settings/timezone; DES-010 UAT Session 02 and UI [PR #35](https://github.com/Kenny619/spl-wbs/pull/35).  
**Decision status:** Product Owner explicitly approved **reporting direction** in chat on 2026-11-09 ("approved"), in response to proposed stakeholder-focused Progress & Risks Update as the primary period report, Detailed Change Audit separately, and plain-text **and HTML** output. This document captures a **proposed revision** for formal freeze/review, not an automatic amendment or implementation authorization.  
**Version status:** 1.1 *proposal*; **1.0 remains frozen and controlling until separately frozen**. No report-engine changes, PR merge, deployment, release or Issue #7 closure authorized by this document. **Review 02 visual design accepted 2026-11-10** (owner: “Excellent update. No more change requests. Please proceed.”). Newer design decisions and current source-contract gaps are described in [Review 02 Owner Disposition](EMV_REPORT_1_1_REVIEW02_OWNER_DISPOSITION.md); where an earlier proposal bullet conflicts, that delta is the current **proposed** 1.1 behavior, not frozen 1.0.

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

### 2.1 Latest Status — core source protections retained; Review 02 presentation revision proposed

- Use committed task state and existing status/date rules. **Do not display overall progress percentage** in the stakeholder report; do not alter the internal weighted-progress algorithm used elsewhere.
- Show **Days to go-live first**, derived from one uniquely identified Launch Date / Release Date / G5 milestone, using existing Japanese workday/holiday rules. Show an explicit unavailable/ambiguous state rather than guess. Show the **single next milestone** as date plus remaining days; no task count or duplicated date.
- Emphasize one **Risks and Blockers** section (Blocked, At Risk, and supported Red/Amber RAG), then scoped upcoming commitments due in **five working days**. Remove healthy In-progress Highlights.
- Display **project name, not workbook filename** in report content. Default task listing control to **All Tasks**, with a compact one-task-per-row grouped layout and optional Top 10. Workstream formatting, selected timezone, unsaved draft exclusion and fixed snapshot remain.
- Both text and HTML render the same substantive facts; unresolved project-name and manual-RAG source contracts are tracked in [Review 02](EMV_REPORT_1_1_REVIEW02_OWNER_DISPOSITION.md).

### 2.2 Progress & Risks Update — new *primary period* report

For a chosen **inclusive calendar date range** in Settings IANA timezone, use persisted `UpdateHistory` as evidence of specific changes and current committed `ProjectWBS` for **current** status. Organize for stakeholder reading, *not* as a list of field edits:

1. **Executive summary:** explicit project name (**no workbook filename**), reporting dates, selected timezone and generated timestamp; go-live working-day countdown as **first metric**, single next milestone date + days remaining, and conspicuous current Red/Amber/Blocked/At Risk counts. **Do not include overall project progress percentage** or make historical trend claims.
2. **Progress and accomplishments:** meaningful completed/advanced tasks and milestones *only when dated evidence supports a transition*; distinguish "recorded during period" from task state simply observed now. If `UpdateHistory` does not capture a transition, say so and avoid inferred historic status.
3. **Risks and Blockers / Schedule Changes:** consolidate current Red/Amber RAG (when supported) and Blocked/At Risk status into one **Risks and Blockers** section; label them current unless valid saved history proves a dated transition. A distinct **Schedule Changes** section lists **only** actual recorded PlannedStart/PlannedEnd changes with timestamps/old/new. Never infer a schedule edit from a merely overdue task.
4. **Upcoming Commitments:** current incomplete tasks/milestones due **today through five working days from today** (inclusive of fifth working day), using selected Settings timezone and authoritative Japanese holiday calendar. Exclude already-overdue items from this section. Group by workstream; **do not fabricate owner actions, mitigation plans, confidence, or causes**. Saved `Updates` text may appear as attributed factual notes, never verified completion.
5. **Workstream presentation:** show exceptions first, then evidence-backed progress, schedule changes and five-working-day commitments. Render **one task per compact row**; if more than one task appears, group by plain workstream headings with unprefixed task names; standalone mentions use `[Workstream] Task Name` as frozen in 1.0. **All Tasks** is the default, with explicit Top 10 option and no invisible truncation.
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

Retain the complete frozen EMV-REPORT-1.0 historical Update Report under a new explicitly audit-focused name. Continue reading **only** `UpdateHistory` for date-window events: affected task count, logical Save count, field-row count, old/new values, immutable historical title/WBS snapshot, field labels, timestamps, complete cross-workstream `ChangeSetID` links, full/abbreviated long-text choice, deterministic order, malformed-history rejection, empty-window behavior. For **HTML presentation**, group by selected-timezone **local calendar date**, with **one fixed-column table per day**, all changes for that day shown in rows, and identical columns/widths across each date table. Display full event identity accessibly (not solely through truncated tooltip) and preserve shared logical Save semantics. Existing validated test coverage must remain.

### 2.4 Plain-text and HTML output

- Both representations derive from the **same immutable generated snapshot and same canonical report data**. Changing display format alone must not trigger Generate/Refresh or change facts, timezone, period, grouping, ordering or totals.
- **Text:** readable preview, exact-text Copy Report, and unchanged snapshot/clipboard failure notices; no loss to existing v1 copy workflow.
- **HTML:** readable document-style preview with clear headings, workstream sections, compact progress/risk rows and strong non-color-only contrast, stable audit date tables, responsive printable layout; standalone **Download HTML** for offline browser open/printing. Offer an explicit **Copy for Outlook** rich clipboard operation with both `text/html` and `text/plain` MIME representations, safe inline email-compatible styles, accurate error/denial feedback and no automatic email sending; corporate Edge/Outlook paste must be physically verified.
- HTML is generated from trusted local render templates and **escaped untrusted workbook text**. Never treat Description/Updates as executable markup. No script, remote assets, external tracking, embedded links to untrusted locations or network transmission. Use local, static CSS. CSP-compatible inert content; malicious workbook cell text remains literal visible text.
- Export only on explicit user gesture. Exporting reports **does not write workbook files, change UpdateHistory or create Save/backup transactions**.
- Avoid claiming HTML exists in the current build; 1.0 product provides plain text only.

### 2.5 Preserved cross-cutting constraints

No source workbook changes from report generation; unsaved drafts excluded and warned; explicit Generate/Refresh snapshot; IANA timezone for instants and date-only scheduled values preserved across timezone changes; inclusive window with correct DST; original #3–#6 data integrity and edit/safety contracts, v18 read-only viewer, approved managed DES-010 navigation and workstream grouping unchanged.

## 3. Impact analysis and dependencies

- **Requirements:** change to frozen Issue #7's report modes, Update Report source/presentation, and text-only output guarantee. Formal freeze and version/changelog update required; preserve 1.0 provenance as historical baseline.
- **Data:** no XLSX schema changes proposed. `ProjectWBS` + existing `UpdateHistory` are sufficient for saved transitions and current **TaskStatus** facts, but **neither a separate project-name attribute nor independent manual RAG state is present** in the currently reviewed model. The proposed UI-only project-name configuration and RAG source limitation need explicit acceptance at the formal freeze. Historical trending remains limited; new workbook fields/event logs are **out of scope** pending a separately approved business case.
- **Implementation:** refactor `src/managed/reports.ts` into source-normalized typed report view models plus text and inert-HTML renderers; update `reportsUi.ts` to offer three modes and format selection/download. Preserve current audited generator for Detailed Change Audit and stable text contract. The reports workspace is already fixed under DES-010; Close button remediation lives in draft PR #35, not this proposal.
- **Tests:** preserve existing 1.0 text/audit contract tests as regression for Detailed Audit; add period-boundary and DST tests, recorded transition vs current-state distinction, no fabricated deltas, workstream formatting, cross-Save association, text/HTML semantic equivalence, XSS escaping and malformed data, fixed snapshot, download-only-on-click, clipboard and offline HTML rendering, dirty draft/no workbook writes.
- **Security:** HTML generation creates an injection surface. Require inert rendering, safe escaping, no remote resource loads, and security review. Existing ExcelJS/uuid moderate dependency advisory remains separately open.
- **UAT:** one consolidated owner evaluation with representative synthetic project changes and current risks, both formats, HTML offline open/print, reports navigation, text clipboard and audit parity. Do not repeat already-passed unrelated owner scenarios.
- **Delivery:** design+spec review first; implementation only after scope/authorization; AI-assisted QA with exact SHA and Windows browser; targeted physical Edge UAT; no automatic merge/release.

## 4. Proposed acceptance criteria

1. Three report modes with stakeholder Progress & Risks Update the default dated period report and a separately discoverable Detailed Change Audit.
2. Latest Status uses verified committed task status/attention handling without showing overall progress, presents the first-box go-live countdown, one upcoming milestone date plus remaining days, strong Risks and Blockers, five-working-day commitments, and omits generic In-progress Highlights.
3. Dated transition claims only when `UpdateHistory` contains supporting events, with current outstanding issues labeled separately. No historical trend or mitigation invented.
4. Clear source/evidence distinction; malformed history and missing historical baseline never misrepresented as verified period performance.
5. Stakeholder content prioritizes consolidated current Risks and Blockers, recorded progress, a separate history-backed Schedule Changes section and five-working-day commitments; project-name-only header; compact one-task-per-row workstream hierarchy; All Tasks default; strong accessible Red/Amber presentation and frozen naming rules.
6. Detailed Change Audit preserves all original Issue #7 historical field, Save grouping, timezone and clipboard rules; HTML displays one fixed-column table per selected-timezone calendar date, with complete shared ChangeSetID access and historical identity.
7. Both text and HTML operate on one fixed snapshot until Generate/Refresh; identical facts, ordering, dates, counts and timezone.
8. HTML is offline, inert, accessible and printable; workbook text escaped; no network/resource injection or active content.
9. HTML download and rich **Copy for Outlook** action explicit; clipboard provides paired HTML and plain-text MIME payloads or clear failure/fallback, without workbook/history mutation or auto-send.
10. Invalid dates, DST, no period activity, incomplete history, unsaved drafts, no workbook, disabled write status and cancelled exports covered by unit + Windows Chromium tests.
11. Existing read-only v18 and approved managed visual/UI routes remain unchanged.

## 5. Approval / change log

| Date (JST) | Status | Action |
|---|---|---|
| 2026-11-06 | **1.0 FROZEN** | Owner approved Latest Status and UpdateHistory-only plain-text Update Report with workstream formatting |
| 2026-11-09 | **1.1 direction APPROVED** | Owner approved stakeholder-focused Progress & Risks Update, separate Detailed Change Audit and plain-text + HTML outputs in response to consolidated proposal |
| 2026-11-09 | **1.1 formal proposal PREPARED** | Written contract, evidence boundaries, impact analysis and acceptance criteria prepared for explicit freeze; no production code changed |
| 2026-11-10 | **Review 02 design ACCEPTED; spec delta PROPOSED** | Owner confirmed no further design changes; incorporated Review 02 requirements with two data-source gaps awaiting formal disposition; docs-only, no implementation authorization |

**Open approval boundary:** this is the *formal revision proposal*. Product Owner approval of the direction does not silently freeze the exact detailed 1.1 requirements or authorize a PR merge/release. No remaining decisions should be escalated until the detailed spec is ready for a consolidated freeze and implementation decision.
