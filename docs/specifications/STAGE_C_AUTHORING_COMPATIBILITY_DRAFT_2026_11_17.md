# SPT-WBS | Stage C Authoring — Functional & Engineering Freeze Candidate

**Version:** C-AUTHOR-0.3 — **B2 TASK CREATE AUDIT ARCHITECTURE PRODUCT OWNER-APPROVED (2026-11-18 JST); REMAINING FUNCTIONAL/PHYSICAL SCHEMA CONTRACT IS A REVIEW CANDIDATE; NO WORKBOOK-WRITING CODE OR RELEASE AUTHORIZATION**  
**Updated:** 2026-11-18 JST  
**Parent:** [Issue #23 — Add new entity](https://github.com/Kenny619/spl-wbs/issues/23) → [Issue #24 — New project onboarding](https://github.com/Kenny619/spl-wbs/issues/24); [Project roadmap](../PROJECT_STATUS.md).  
**Baseline:** Stage A accepted; Stage B usability owner-accepted through PRs #92/#98; **manual RAG HW-FUNC-1.0 is now owner-frozen and merged on main via PR #84**, but RAG implementation remains a separate post-Stage-C pre-beta milestone. **DES-012 Review08** remains the controlling cross-view visual design reference.

## 1. Source-backed technical preflight — verified on current protected main

| Current source | Finding | Consequence for Stage C |
| --- | --- | --- |
| `src/data/types.ts`, `src/data/normalize.ts` | `TaskType` exactly **Summary / Task / Milestone**; IDs accept canonical string keys from either text or safe integers. Each item requires ID, title, WBSCode and TaskType; duplicate ID/WBS and missing/cyclic parent are fatal. | Generate a **new immutable string TaskID**, while preserving existing numeric/text IDs. Validate against *all* existing rows, not just visible/filtered rows. Reuse the canonical import parser in candidate readback. |
| `src/managed/workbookCandidate.ts` | `buildManagedCandidate` requires **exactly one existing TaskID** and edits its allowed fields; `UpdateHistory` is strictly validated as **field-edit records**. | **Do not** fake entity creation via existing edit candidate or append unsupported `Field=Created` directly. New validated create candidate and explicit creation-audit semantics are necessary. |
| `src/managed/history.ts` | Rejects `UpdateHistory.Field` not in `EDITABLE_FIELDS`. | **B2 puts the Create event in `ProjectAudit`, NOT `UpdateHistory`;** keep existing edit-history contract intact and reconcile combined History/Report reads across both event sources. |
| `src/managed/projectDataInspector.ts`, `src/managed/projectDataCandidate.ts` | Accepted **ProjectData v0.1.2 five-sheet** extension: ProjectMeta, ProjectCalendar, WatchReasons, ProjectCommitments, ProjectAudit. `ProjectAudit` currently restricts `EntityType` to non-Task categories, although `Action=Create` exists. | **Owner selected B2**: extend existing `ProjectAudit` with explicitly versioned `EntityType=Task` and `Action=Create` semantics, preserving five sheets and all old records. Detailed candidate [C-AUDIT-B2-0.1](STAGE_C_B2_TASK_CREATE_AUDIT_CONTRACT_DRAFT.md); exact schema/version remains to be frozen. |
| `src/managed/directSave.ts`, `src/managed/preflight.ts` | Verified guarded direct Save/Save As, source hash, preflight and recovery protections exist. | All new creation and onboarding write paths must reuse the accepted **candidate → verify/readback → guarded write → reload** flow; never write immediately from a form or bypass backup/conflict checks. |
| `src/managed/main.ts` | Managed application has task editor, unsaved-change protection, folder picker, read-only inspection and separate user-local recent projects. | Stage C may introduce "Add" and onboarding controls without modifying the read-only viewer. Corporate `file://` folder-picker failure is NOT resolved. |

**Critical gating finding:** **B2 is now binding by explicit Product Owner decision** ([#23](https://github.com/Kenny619/spl-wbs/issues/23#issuecomment-6970324100)); immutable identity, exact physical schema/version, snapshot field encoding, dual-version reader and Save/backup compatibility must be reconciled as one contract. Pure domain validation (PR #105) may proceed, but **do not promote a workbook-writing Create path until the exact tested schema contract and integration gate are approved**. Do not build an ad hoc second event format.

## 1A. Architecture decision — **B2 approved**; earlier alternatives superseded

**Product Owner approval, 2026-11-18 JST:** Use **Option B2: extend the existing `ProjectAudit` with an explicit `Task` / `Create` event**, capturing the complete initial WBS snapshot and predecessor references in an atomic, traceable logical transaction. Do **not** introduce a new dedicated Task Audit worksheet.

This **supersedes Option A** (implicit creation via `UpdateHistory.Title` edit), **B1** (expanding `UpdateHistory` into a Create-event table) and **B3** (new TaskAudit sheet). These are no longer active Stage C options. Existing `UpdateHistory` remains field-edit-only; Task Create is a distinct ProjectAudit event, and the combined History/Report projections must preserve both chronologies.

**Detailed engineering proposal:** [Stage C B2 Task Create Audit Contract — C-AUDIT-B2-0.1](STAGE_C_B2_TASK_CREATE_AUDIT_CONTRACT_DRAFT.md). It proposes an additive **ProjectData 0.1.3** version with identical five sheets and ProjectAudit headers, a Task/Create row group with one ChangeSetID, complete serialized first-save field snapshot including `PredecessorIDs`, 0.1.2 read compatibility and atomic upgrade-on-first-Create. **The architecture is owner-approved; this exact version identifier and field encoding remain review candidates until the precise contract is frozen and tested.**

## 2. Proposed #23 first delivery — create an entity within an existing workbook

**Owner request:** create entities from the HTML application. Deliver **existing-project task creation first**; project-wide workbook remains the source of truth, and view preferences stay local.

### Recommended initial contract (for one concise Product Owner freeze)

1. **Types:** allow Summary, Task and Milestone under the existing `ProjectWBS` schema; no new database entity or independent Workstream table. Workstream remains a shared string in WBS rows. Default new leaf type is **Task**.
2. **Entry:** "Add entity" from the managed Schedule/Task Detail flow. Inline form (not a second permanently open editor), keyboard reachable and accessible at laptop/conference sizes. Selected parent/active workstream may prefill but **must be reviewable**; never make hidden filters change identity.
3. **TaskID:** generate a collision-resistant UUID string per creation attempt; recheck its uniqueness across the entire latest workbook just before guarded Save. Never reuse a previously deleted identifier if history could reference it; support existing text/numeric IDs without coercive rewrite.
4. **WBSCode:** suggest a next unused code under selected Summary parent (e.g., `3.2.1`); allow manual override before Save; reject duplicates, invalid blank/control input and parent-code conflict. **No cascade renumbering or rewrite of existing WBSCode/TaskIDs.**
5. **Hierarchy:** parent optional for root item; if provided it must refer to an existing valid **Summary**, not the new item; reject orphan/cycle/non-Summary parent. Summary dates/progress are derived; Milestone single date; active leaf Task accepts optional dates only if existing parser permits unscheduled rows, otherwise valid ordered dates required. First delivery uses the existing source date semantics, not an invented date system.
6. **Defaults and validation:** require title, type and WBS. Default source TaskStatus `Not Started`, optional Owner/Workstream/Description/priority/progress/date; never assign an invented owner or create a project commitment/Watch reason. Treat formula/control-character injection and unsupported field types as invalid. Distinguish blank progress from 0.
7. **Dependencies:** opt-in validated `PredecessorIDs`, referencing *existing verified TaskIDs* with supported Finish-to-Start relation only. Reject self-reference and cycles for a newly authored row; do not rely on read-only importer warnings that silently drop invalid tokens. No relation change to existing rows.
8. **Save lifecycle:** new item is a local draft until guarded Save succeeds. Compose a disposable XLSX copy, validate all sheets and history, reload with the canonical parser, verify new TaskID and preexisting row identity, then commit with existing source hash/backup/recovery safeguards. Cancel, deny, failure or conflict → **no persisted entity, no false success**.
9. **Create history (B2 approved):** record **one logical Task/Create** operation as related rows in **existing `ProjectAudit`**, with immutable TaskID, TaskType, WBS, ParentTaskID and complete initial field snapshot **including `PredecessorIDs`**, one ChangeSetID/UTC time, unverified local provenance and validated links to `ProjectWBS`. Current `UpdateHistory` stays edit-only. Consult [proposed B2 contract](STAGE_C_B2_TASK_CREATE_AUDIT_CONTRACT_DRAFT.md) for 0.1.3 candidate, field serialization, dual-version safety, event grouping and atomic save. Architecture is approved; exact physical contract is not yet frozen.
10. **RAG:** new valid item displays **Green by default**, *not* a manual PM health assessment or recorded Green audit event. Later PM-only Amber/Red entry requires **Project Impact + Path to Green**, and return to Green requires **Resolution**, under frozen HW-FUNC-1.0; do not implement manual RAG in the Stage C creation slice.
11. **Cross-view:** committed item appears once in Schedule, Task Detail, Meeting Review, Needs Attention, filtering/reporting as supported; readonly viewer can load the workbook but **never mutate**.
12. **No hidden scope:** no multi-row bulk creation, drag/drop hierarchy, cascade WBS renumbering, role auth or production shared-workbook concurrency claim in first slice.

### Candidate acceptance matrix — only new functionality, NOT executed

| ID | Test | Required evidence |
| --- | --- | --- |
| **C23-01** | Add Task with valid Summary parent, Save, reopen | Exactly one new stable ID/WBS, correct parent, row and cross-view |
| **C23-02** | Add root Summary, then a child Task and Milestone | Accepted three TaskTypes, valid dates/derived Summary, no duplicate rollup |
| **C23-03** | Duplicate WBS/ID, non-Summary parent, invalid date or self/cyclic predecessor | Rejected before Save, source unchanged and clear typed error |
| **C23-04** | New Task unscheduled with blank Progress vs explicit 0 | Exact canonical existing import semantics, no guessed schedule/RAG |
| **C23-05** | Cancel draft, change workbook, leave page with unsaved data | Guarded discard/return; no phantom committed row |
| **C23-06** | Second writer, stale loaded hash, backup failure or denied folder | No partial row, no false Save success, recoverable draft |
| **C23-07** | Save creation; inspect new + previous history | One explicit Create event with stable identity; old history unaltered; reload/Report reader succeeds |
| **C23-08** | Read resulting workbook in readonly Viewer and compare | Identical workbook facts; no write affordance or user-local preference leakage |
| **C23-09** | Create item with no explicit RAG, near finish/Overdue criteria met | Green default unchanged, separate source-attributed task-status/Overdue warnings |
| **C23-10** | Existing project has incompatible/future/partial ProjectData | Creation fails closed, without repairing/rewriting its sheets |

## 3. Proposed #24 onboarding after #23 creator is accepted

**Required by the Product Owner:** (1) create Excel at chosen location and add items via HTML; (2) download an empty workbook with guidance; (3) choose from multiple prepared templates that generate workstreams, parent-child and dependency relationships.

**Delivery sequence — recommended:**
- **C24-A Blank new project:** Explicit name and destination choice; create valid `ProjectWBS` headers, empty UpdateHistory and five accepted ProjectData sheets with legitimate ProjectMeta ID/name/version. Ensure an empty ProjectWBS round-trips with current parsers and report/list views; don't fabricate empty task or human assessment rows.
- **C24-B Save location / fallback:** If the directory picker is denied under `file://`, offer **Download XLSX** with user-selected Save destination, then normal verified import into managed app. Never overwrite an existing name silently; no folder-write assumption on corporate Edge. A separately approved localhost writer may improve corporate permissions later.
- **C24-C Template catalog:** propose three **synthetic** starter profiles (Simple Project / Cross-functional Program / Milestone-led Delivery) plus Blank; preview workstreams/entity counts, hierarchy/dependencies and default dates before generation. Templates reuse the **same validated TaskID/parent/dependency creator** as #23, not a second ad hoc writer. No fictional past history, Watch reason or manually assessed Amber/Red.
- **C24-D Post-create handoff:** verified workbook becomes active only after accepted path/import/readback. Recent Projects local list updates only after success, not on cancelled/failing attempt. Do not alter the previous workbook/session on failed onboarding.
- **C24-E Compatibility:** generated book must open in managed and read-only variants, preserve the accepted project schema and full current Excel semantics, and pass safe Save As/reopen.

**Focused candidate acceptance (NOT executed):** C24-01 empty valid workbook roundtrip; C24-02 download and folder choice; C24-03 each template valid IDs/parents/predecessors; C24-04 no overwrite; C24-05 deny/cancel without phantom session; C24-06 save/reload/history and recent-file registration; C24-07 readonly viewer; C24-08 keyboard/light/dark/860px usability; C24-09 no invented RAG audit or obsolete Watch data.

## 4. Engineering sequence and gates

**Already frozen, never reopen by implication:** Stage A workbook/history, safe Save and read-only behavior; Stage B accepted usability; HW-FUNC-1.0 manual RAG semantics (separate pre-beta implementation); DES-012 Review08 overarching UI authority.

1. **Stage C design close:** **do not reopen B2**. Freeze exact schema version and field encodings, verify older-client safe refusal, source-row/ID normalization, and minimum template/entry flow; separately review still-proposed Stage C functional details. The [B2 technical contract](STAGE_C_B2_TASK_CREATE_AUDIT_CONTRACT_DRAFT.md) is now the canonical review candidate.
2. **#23 safe creator foundation:** validate-only pure create draft + unit cases → in-memory workbook candidate + explicit approved history semantics → guarded Save integration → targeted Windows/Edge functional review → focused Owner UAT.
3. **#24 onboarding:** blank starter and safe download flow → template catalog and preview → same creation engine + validation → targeted QA/Owner UAT.
4. **After Stage C:** independent manual RAG workbook/UI/PM authorization/report implementation & UAT and holistic UX consolidation, both mandatory before beta. Stage D multi-blackout and Stage E drag/drop still deferred.
5. **CI cost:** prefer file-diff scoped unit/relevant browser tests, no replay of Stage A MRU or six already accepted Stage B physical UAT cases; avoid promoting documentation drafts merely to trigger full Windows regressions.

**Product Owner APPROVED the B2 Task Create audit architecture and preparation of its versioned specification on 2026-11-18 JST.** Exact 0.1.3 proposal, source-field encoding and other Stage C first-slice choices remain technical contract candidates, **not a frozen full Stage C specification**. Preparation and validation-only engineering may proceed; this does **not** authorize workbook/schema mutation in the accepted app, writer integration/merge, credentials, corporate deployment, beta or release.
