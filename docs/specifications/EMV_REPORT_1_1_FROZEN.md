# EMV-REPORT-1.1 — FROZEN product specification

**Product Owner formal authorization:** 2026-11-10 (JST), explicit reply **“Approved both A and B”** to separately presented requirements-freeze Decision A and bounded-implementation Decision B.  
**Controlling issue:** [#7](https://github.com/Kenny619/spl-wbs/issues/7)  
**Design reference:** [Review 02 accepted prototype](../prototypes/SPT-WBS_Report_1.1_Interactive_Prototype_Review02.html); [Owner Review 02 disposition](EMV_REPORT_1_1_REVIEW02_OWNER_DISPOSITION.md)  
**Revision history:** EMV-REPORT-1.0 frozen 2026-11-06 (preserved as historical baseline in Issue #7); 1.1 direction approved 2026-11-09; Review 02 accepted 2026-11-10; **1.1 formally FROZEN 2026-11-10**.  
**Authority:** Implementation of this exact bounded 1.1 scope on a separate draft feature branch is **AUTHORIZED**; **no merge, deployment, tag, release, closure, product/Stage A acceptance or security-risk waiver**.

## 1. Scope and source of truth

Provide three reporting modes: **Latest Status**, **Progress & Risks Update** (primary dated stakeholder report), and **Detailed Change Audit** (complete preserved legacy historical audit). Provide both **plain text** and **static standalone HTML**, accessible previews, explicit Generate/Refresh, plain-text Copy, **Copy for Outlook** (rich HTML + text MIME) and Download HTML/plain text.

Each report is generated exclusively from committed/reloaded `ProjectWBS` and valid persisted `UpdateHistory` as appropriate. Never read unsaved drafts into report facts, implicitly Save, alter workbook/audit history, create backup transactions, or transmit project data remotely. Show a clear dirty-draft warning. A generated report is an **immutable snapshot** until the next explicit Generate/Refresh; switching format/copying/downloading does not recompute, silently requery, or change the content. Report status/model and rendering must be deterministic for the same inputs and generatedAt instant.

**Project identity:** A generated report (HTML, text, clipboard, downloaded document) displays **Project name**, never the workbook filename. The filename may appear inside the operator's Reports UI, not in report output. Current source model has fileName but **no distinct project-name attribute**. Approved non-schema resolution: add an explicit report-workspace `Project name` input, retained as a **local UI preference scoped to the active workbook/project identity** (using existing supported local preference storage); an empty name blocks Generate with a helpful message. Do not silently derive or fall back to the filename. Respect local storage/policy denial and allow manual entry without losing unsaved work; do not store worksheet contents there.

## 2. Common report layout and headline facts

The report begins with the project name, mode, an appropriate as-of date or inclusive selected period, the current selected Settings IANA timezone, and exact generatedAt timestamp. Show compact, prioritized sections suitable for stakeholder reading. Fixed report output never includes an overall project weighted-completion percentage or "In-progress Highlights" section; the internal existing weighted-progress calculation is not changed or repurposed.

**Headline KPI 1 — Days to go-live:** Resolve one Milestone task whose trimmed case-insensitive `Title` is exactly **Launch Date**, **Release Date**, or **G5**. If exactly one qualifying Milestone exists, display **remaining working days AFTER local Today THROUGH its date**, excluding Japanese weekends/holidays using the established calendar library, displaying the visible unit **“days”** (not “workdays”). A past date shows `0 days` plus a past-go-live note rather than an invented positive countdown; a milestone on today shows `0 days`. If none/multiple matching milestones, show **Go-live not identified / Ambiguous go-live**, with no invented date/count; don't choose an arbitrary candidate. When full holiday coverage cannot be verified, display **Holiday coverage incomplete** instead of a precise count. Calculations use the selected Settings timezone to establish Today; dates are calendar-only and must not shift across timezones.

**Headline KPI 2 — Upcoming milestone:** Exactly one earliest scheduled **incomplete, noncancelled** Milestone on/after Today, using stable task/WBS tie-breaking. Show its **single date** and **remaining working-day count** in separate places; no redundant repeated date or milestone/task count. Explicit `None` when none exists. Additional headline cards highlight RED/Blocked and AMBER/At Risk current exceptions; status and contrast must be visible without depending on color alone.

**Listing and layout:** Task listings default to **All Tasks**, with explicit `Top 10` optional selection. Within each relevant section, show each distinct task **once in its own compact table row** with concise status/date/context, workstream-grouped when multiple tasks are listed. Group headers use bare workstream name; task names under a workstream heading do not repeat [Workstream]. Standalone mentions use `[Workstream] Task Name` per frozen 1.0; blank workstream -> `Unassigned`; historical removed TaskID -> `Unknown Workstream`. Priority/date ordering within workstreams must be deterministic. If a user selects Top 10, disclose the omitted-qualifying-task count; never silently truncate or deduplicate away audit events. Large All Tasks output remains fully included in copied/exported versions; readable on screen, in print, and in HTML email.

## 3. Current status and risk semantics

**Risks and Blockers** is a **single consolidated current-state section** containing incomplete tasks with `TaskStatus=Blocked` or `At Risk`, **or** independently sourced `RAG=Red/Amber` where a verified supported source exists. Deduplicate a task meeting multiple signals. Render Red/Blocked and Amber/At Risk with strong accessible visual distinction (text label plus color/border; display a task's actual status rather than silently coercing it to a different RAG). Only include **actual** RAG values from a supported verified source; do not invent Red/Amber from TaskStatus, Priority, Description or Updates, and do not add workbook schema columns under this approval. **Approved current-source limitation:** `Task` presently contains TaskStatus but no dedicated RAG. It is fully acceptable for implementation to show Blocked/At Risk status only until an independently authorized RAG source is established; do not represent absent manual RAG as a delivered capability.

Do not imply a current Blocked/At Risk item newly emerged during a selected reporting period merely because it is currently outstanding. Materiality, prioritization and date handling must use already-approved rules; do not invent a new risk score, root cause or owner mitigation plan.

**Upcoming Commitments** includes incomplete/noncancelled tasks and milestones due from selected-timezone Today **up to and including the fifth working day after Today**, skipping weekends and confirmed Japanese holidays for window-counting; show current due date and days left. Omit items beyond the boundary. Already-overdue tasks are not called upcoming commitments. No fabricated action due dates. The report is a reader-facing task list, not a new planning engine.

## 4. Report mode contract

### 4.1 Latest Status

From committed task data only: headline go-live/next milestone and current Red/Amber/Blocked/At Risk exceptions, followed by near-term commitments in five-working-day horizon. Do **not** include a generic healthy-task In-progress Highlights section or overall-progress headline. The same underlying facts must appear in text and HTML.

### 4.2 Progress & Risks Update

Date window uses inclusive local calendar dates in selected Settings IANA timezone, internally [start local midnight UTC, next-day end local midnight UTC). Reject invalid ranges; support DST transition days. Use two evidence channels clearly labeled:

- **Recorded period change:** Valid `UpdateHistory` with `TimestampUTC`, logical `ChangeSetID`, saved historical task title/WBS, canonical field, old/new value; the event instant must fall in the date window. A saved TaskStatus entry into `Completed` is a recorded completion; numeric `Progress` increase is recorded progress advancement; status transition into `At Risk`/`Blocked` is a recorded risk entry, and out is recorded exit; saved `PlannedStart` or `PlannedEnd` changes are recorded schedule revisions, with a later new end date called delay only when supported. Notes, priority or assignee edits can be factual attributed changes, not proof of task completion or mitigation.
- **Current condition:** Current project task status, risk, outstanding deadlines and milestones from committed `ProjectWBS` **as of Generate**. Does not establish when a task became blocked, completed, delayed or resolved.

Section order:
1. **Risks and Blockers:** consolidated current qualifying exceptions (including real RAG if available); no redundant separate current/emerging risk sections.
2. **Recorded Progress and Accomplishments:** saved completed/progress transitions, with timestamps and historical identity; a valid history with no relevant records says **No recorded progress changes** rather than “no work occurred.”
3. **Schedule Changes:** ONLY actually saved date changes in selected period, with saved old/new values and timestamps; no unrecorded overdue tasks or current dates represented as recorded date moves.
4. **Upcoming Commitments:** current incomplete due items within the five-working-day horizon.

Executive summary may give **counts of verified dated event types** plus current exceptions; never invent project-wide historical completion deltas, previous-period baseline, variance metric, progress trend, risk cause or task action. Multiple transitions (reversals/re-entries) stay chronologically identifiable. When `UpdateHistory` is absent, distinguish **history not available** from **valid history but no qualifying events**; invalid history blocks a false-complete result.

### 4.3 Detailed Change Audit

Maintain all frozen EMV-REPORT-1.0 audit semantics: report solely from valid `UpdateHistory` in the selected period, total distinct affected tasks/logical Saves (`ChangeSetID`)/field rows, field labels and old/new values, original history `WBSCode`/`TaskTitle` snapshots even if current names differ, canonical original `TimestampUTC` rendered in selected IANA timezone, full ChangeSetID associations, deterministic chronological order, concise versus complete long Description/Updates values, malformed history fail-closed behavior, and no-book edits.

**HTML presentation:** group events by their **selected-timezone local calendar date** with **one table per date** showing every field-change row for that date. Every table uses the same fixed column order and widths: **Save ID/time | Workstream | Task/WBS | Field | Before | After**. Do not create one table per Save/change. Preserve full ChangeSetID as accessible/printable/copiable text (a short visible ID alone or hover tooltip is insufficient). Distinguish logical Save associations across different dates/workstreams; report each history row exactly once, even when multiple fields change in one Save. Group by current workstream only for presentation; missing current TaskID -> Unknown Workstream, never inferred historic assignment. For text output, use date headings and unambiguous full Save IDs while preserving the same factual field rows.

## 5. Format, email and security contract

Both `text/plain` and `text/html` derive from the **same canonical immutable report model** including exact project name, scope, figures, task order, audit values, dates, timezone and timestamp. HTML may present facts visually but not add contradictory facts or quietly discard history. Text Copy must match its preview **byte-for-byte**. HTML must be a complete, inert, standalone offline document (no script, remote image/font/CSS, network calls, tracking, event handlers, active embedded content). Escape all workbook-derived strings contextually; multiline values remain inert text, not HTML/JS/CSS. Printable responsive output uses strong accessible status labels, compact rows, and fixed audit columns.

In HTML mode, **Copy for Outlook** is an explicit user action writing paired `text/html` and `text/plain` clipboard representations with safe **inline email-compatible CSS** and accurate success/permission-failure feedback; provide downloadable/regular text fallback when restricted. Clipboard copy must **not** create, send, or modify an email. Actual formatted paste into corporate **Edge → Outlook HTML compose** is a mandatory targeted UAT gate, not assumed by browser smoke tests. Explicit `Download HTML` and text export do not modify any workbook or browser draft state.

## 6. Acceptance tests and delivery gates

Minimum automated & review gates: exactly one/none/multiple go-live names; holiday boundary/coverage and timezone Today; fifth versus sixth working day, overdue exclusions; default All Tasks and >100-task scannability; status-only risk and independent RAG availability/absence (no fabricated flags); non-color-only Red/Amber; workstream grouping/naming; current state vs recorded/reversed transitions; actual saved date shift only; IANA/DST inclusive period; empty/absent/malformed history; historic identity, complete cross-workstream Save links and date-grouped fixed audit tables; multiline/full history values; HTML+text factual parity, clipboard failure and Outlook rich MIME, XSS/offline security, no network, no side effects, unsaved drafts and no source file writes. Retain and rerun existing 1.0 report regression and all managed workbook safety/save/backup tests; original read-only v18 unaffected.

Implementation is authorized on **one isolated draft feature branch** rooted in the currently reviewed managed development stack, with source compatibility documented and technical QA/CI exact-HEAD Linux+Windows Chromium, independent AI-assisted critical review and one bounded physical corporate Edge/Outlook owner UAT (synthetic/disposable workbook only). Do not merge the documentation PR, implementation PR or stack into product branches/main until separately explicitly authorized; no release, deployment, real corporate workbook test, Stage A acceptance, Issue #7 closure or residual dependency/security risk waiver.

## 7. Decisions and provenance

| Date (JST) | Event | Status |
|---|---|---|
| 2026-11-06 | Product Owner approved 1.0 plain-text Latest Status + history-only Update Report | **1.0 FROZEN (historical)** |
| 2026-11-09 | Product Owner approved stakeholder Progress & Risks + separate Detailed Audit + text/HTML direction | Direction approved |
| 2026-11-10 | Product Owner reviewed Review 02 and said “Excellent update. No more change requests. Please proceed.” | **Review 02 design accepted** |
| 2026-11-10 | Product Owner explicitly said **“Approved both A and B”** to detailed 1.1 requirements freeze and bounded implementation authorization, including recommended no-schema project-name/RAG source resolutions | **1.1 FROZEN; bounded draft development AUTHORIZED** |

**Controlling release boundary:** full 1.1 scope frozen, but product delivery is not accepted until independent QA and targeted owner UAT. No auto-merge or release.
