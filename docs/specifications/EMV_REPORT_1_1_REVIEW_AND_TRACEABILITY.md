# EMV-REPORT-1.1 — AI-assisted contract review & traceability

**Date:** 2026-11-09 JST  
**Reference branch:** `docs/report-1-1-po-approved-direction`, draft [PR #36](https://github.com/Kenny619/spl-wbs/pull/36)  
**Approval record:** Owner approved **direction** (Progress & Risks Update primary, Detailed Change Audit separate, plain-text and HTML). No freeze, implementation, merger, release or owner UAT acceptance inferred.

## Source inspected and evidence boundary

- Frozen [Issue #7](https://github.com/Kenny619/spl-wbs/issues/7), **EMV-REPORT-1.0**: plain-text-only Latest Status + UpdateHistory-only Update Report, precise workstream/ChangeSetID formatting, snapshot, timezone and committed-only guarantees.
- `src/managed/reports.ts` (feature `excel-managed-v1`): current Latest Status uses `overallProgress`, `attentionCounts`, 10/all task grouping; Update Report uses validated inclusive local-date range / persisted `HistoryEvent` old-new rows; no historic full-project snapshot or HTML.
- `src/managed/history.ts`: validated `HistoryEvent` has `changeSetId`, `timestampUTC` and `changes`; each change has saved `taskId`, `wbsCode`, `taskTitle`, `field`, `oldValue`, `newValue`, `row`, `source`, `appVersion`. **Missing UpdateHistory sheet returns an empty event list**, which by itself cannot distinguish “never tracked” from “tracked but empty.”
- `src/managed/workbookCandidate.ts`: editable fields are `Title`, `AssignedTo`, `TaskStatus`, `Progress`, `PlannedStart`, `PlannedEnd`, `Priority`, `Description`, `Updates`, `Workstream`, `WBSCode`. **No actual start/end, risk cause, mitigation, meeting decision, variance baseline or event-sourced full state snapshot is guaranteed.**
- `src/managed/reportsUi.ts`: frozen text copy and fixed snapshot behavior; managed workspace updates in separate draft PR #35.

**Review method:** AI-assisted comparative code/spec critical review, not independent human or dynamic QA. No app code changed and no CI/runtime PASS claimed by this documentation-only review.

## Findings, resolution and residual risk

| ID | Severity | Finding | Resolution in 1.1 draft | Residual |
|---|---|---|---|---|
| REPORT11-DATA-01 | HIGH if unspecified | New risks / advances could be incorrectly inferred from today's status | Explicit split between saved period transitions and current-only state. Added field transition truth table and chronological/reversal rules | Historic changes outside in-app UpdateHistory remain unobservable |
| REPORT11-DATA-02 | HIGH if unspecified | Period completion % delta cannot be accurately reconstructed from row-level changes | Explicitly disallow historic project-level % change/velocity without full validated snapshots and approved formula | Stakeholder report is event-based, not a project burndown |
| REPORT11-DATA-03 | MEDIUM | Empty history vs absent history can be conflated | Require differentiated messaging if source presence can be established without schema changes; no assertion of full activity | Implementation needs workbook-sheet-presence signal |
| REPORT11-AUDIT-01 | HIGH if audit replaced | Owner's new stakeholder report could displace frozen change ledger | Preserve original 1.0 Update Report as independent Detailed Change Audit mode incl. ChangeSetID associations | Requires regression tests against existing exact known output |
| REPORT11-SEC-01 | HIGH if unsafe | HTML output can execute XLSX-origin HTML/JS or load external resources | Require inert offline HTML, explicit workbook-text escaping, static inline CSS only, no script/remote resources, per-format integration safety tests | Strict sanitizer/renderer design review needed before implementation |
| REPORT11-UX-01 | MEDIUM | Format toggle may inadvertently generate a different snapshot from plain text | Require one immutable canonical report snapshot and rendering to plain text and HTML without requerying/recalculating | Need explicit text+HTML parity tests and format-toggle roundtrips |
| REPORT11-STATUS-01 | MEDIUM | A status entering and exiting risk in the same period could be counted as still emerging | Preserve event transition chronology, report current outstanding risk separately | Need contradictory/reversal fixture test |
| REPORT11-SCOPE-01 | HIGH governance | Direction approval could be mistaken for frozen contract + implementation | Spec states "direction approved, formal revision proposed, not frozen"; changes isolated to docs | Product Owner must explicitly freeze/authorize new scope |

## Traceability matrix for follow-up tests

| Proposed requirement | Source / original contract | Minimum test intent |
|---|---|---|
| Latest Status preserved | #7 §2, `overallProgress`, `attentionCounts` | Same committed data produces same snapshot and task list in v1 text mode |
| Period selection & DST | #7 §3, `reportUtcRange` | Inclusive local days in Asia/Tokyo and DST timezones, invalid start/end rejected |
| Recorded completion/progress | `HistoryEvent`, editable fields | Status Completed or increasing Progress shown as recorded, not inferred from current state |
| Emerging/reversing risks | Saved TaskStatus, PlannedEnd | Entry, exit and re-entry within period; overdue current status distinguished from saved end-date extension |
| No fabricated progress delta | No full-project snapshot | No invented “+X% this week”; incomplete history clearly signaled |
| Workstream grouping | #7 §4 | No brackets under workstream heading; standalone `[Workstream]`; unknown/missing task |
| Historical identity | #7 §3–4, `HistoryChange` | Saved title/WBS used; shared Save link retained even across workstreams |
| Detailed Audit parity | #7 original §3 | Saved event counts/values/ChangeSetID and full/concise long text unchanged |
| Safe HTML | New approved direction | Inject `<script>`, `<img src>`, event attributes, Unicode and multiline text in task names/Updates; resulting offline export displays inert text and makes no requests |
| Text & HTML factual parity | #7 snapshot + new direction | Same timestamp, range, order, values; no refetch on toggle; export from current snapshot only |
| No side effects | #7 §1, §5 | Unsaved edit excluded; no workbook/History/save/backup mutations; clipboard denial and export cancellation handled |
| Original variant isolation | #7 §6 and DES-010 scope | Read-only v18 static file and accepted prior visual contracts unchanged |

## Implementation-readiness recommendations (not implementation permission)

1. Introduce pure, typed **report data model** from `ProjectWBS` + validated `HistoryEvent`, preserving current text renderers behind old regression tests. ChangeEvent source must be explicit.
2. Make valid-history / absent-history / invalid-history distinctions at report load, not by inferring from empty events; no schema expansion to solve this by default.
3. Render HTML from this typed model with strict context-aware escaping and explicit offline export security, not by converting an arbitrary Markdown report or concatenating raw workbook values into markup.
4. Preserve the existing Issue #7 Update Report exactly under Detailed Change Audit; no suppression of ChangeSetIDs or old/new values for audit readers.
5. Use a single synthetic UAT workbook with multiple dated Save events, status reversal, Progress increased then decreased, late PlannedEnd, separate workstreams, unchanged current risk, Unicode/newlines and malicious-as-text payloads. Tests cover both format outputs, source provenance, offline HTML and zero writes.
6. Return with one consolidated **1.1 freeze + bounded implementation authorization** decision after contract review; do not demand repeated owner permission for docs-only prep.

**Overall QA disposition:** **CONCERN (governance / historical evidence limitations explicitly bounded) → proposal suitable for Product Owner freeze review**, not accepted implemented software. No merge or release recommendation until specified tests and owner acceptance exist.
