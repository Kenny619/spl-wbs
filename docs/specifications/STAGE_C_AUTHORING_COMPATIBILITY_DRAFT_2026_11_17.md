# SPT-WBS | Stage C Authoring — Functional & Engineering Freeze Candidate

**Version:** C-AUTHOR-0.2 — **REVIEW CANDIDATE / NOT FROZEN; NO CODE OR RELEASE AUTHORIZATION IN THIS DOCUMENT**  
**Updated:** 2026-11-18 JST  
**Parent:** [Issue #23 — Add new entity](https://github.com/Kenny619/spl-wbs/issues/23) → [Issue #24 — New project onboarding](https://github.com/Kenny619/spl-wbs/issues/24); [Project roadmap](../PROJECT_STATUS.md).  
**Baseline:** Stage A accepted; Stage B usability owner-accepted through PRs #92/#98; **manual RAG HW-FUNC-1.0 is now owner-frozen and merged on main via PR #84**, but RAG implementation remains a separate post-Stage-C pre-beta milestone. **DES-012 Review08** remains the controlling cross-view visual design reference.

## 1. Source-backed technical preflight — verified on current protected main

| Current source | Finding | Consequence for Stage C |
| --- | --- | --- |
| `src/data/types.ts`, `src/data/normalize.ts` | `TaskType` exactly **Summary / Task / Milestone**; IDs accept canonical string keys from either text or safe integers. Each item requires ID, title, WBSCode and TaskType; duplicate ID/WBS and missing/cyclic parent are fatal. | Generate a **new immutable string TaskID**, while preserving existing numeric/text IDs. Validate against *all* existing rows, not just visible/filtered rows. Reuse the canonical import parser in candidate readback. |
| `src/managed/workbookCandidate.ts` | `buildManagedCandidate` requires **exactly one existing TaskID** and edits its allowed fields; `UpdateHistory` is strictly validated as **field-edit records**. | **Do not** fake entity creation via existing edit candidate or append unsupported `Field=Created` directly. New validated create candidate and explicit creation-audit semantics are necessary. |
| `src/managed/history.ts` | Rejects `UpdateHistory.Field` not in `EDITABLE_FIELDS`. | Any new "Create" event requires a **versioned and backward-compatible history-reader/writer contract**; legacy reports/history must not break on newly created files. |
| `src/managed/projectDataInspector.ts`, `src/managed/projectDataCandidate.ts` | Accepted **ProjectData v0.1.2 five-sheet** extension: ProjectMeta, ProjectCalendar, WatchReasons, ProjectCommitments, ProjectAudit. `ProjectAudit` validates entity/action semantics and is not a general unrestricted Task creation log. | **Do not** silently repurpose ProjectAudit or add Task entity/action values without explicitly specifying compatibility/versioning. The existing WatchReasons sheet can remain empty; no active Watch conversion is required. |
| `src/managed/directSave.ts`, `src/managed/preflight.ts` | Verified guarded direct Save/Save As, source hash, preflight and recovery protections exist. | All new creation and onboarding write paths must reuse the accepted **candidate → verify/readback → guarded write → reload** flow; never write immediately from a form or bypass backup/conflict checks. |
| `src/managed/main.ts` | Managed application has task editor, unsaved-change protection, folder picker, read-only inspection and separate user-local recent projects. | Stage C may introduce "Add" and onboarding controls without modifying the read-only viewer. Corporate `file://` folder-picker failure is NOT resolved. |

**Critical gating finding:** the immutable ID / header / spreadsheet compatibility and create-audit format have to be defined together. Pure domain validation/preparation and fictional fixtures can proceed independently, but **no runnable workbook-create path should be promoted into protected main until a tested creation-event history contract is approved**. Do not build a second ad hoc event format.

## 1A. Audit compatibility options — isolated design decision

The accepted `UpdateHistory` table has ten columns and validates `Field` against `EDITABLE_FIELDS`; that list **does not include `PredecessorIDs`**. The accepted `ProjectAudit` permits actions including `Create`, but `EntityType` is restricted to `ProjectMeta`, `Blackout`, `WatchReason` and `Commitment` — **not Task**. The difference between an audit event with the correct name and a fully recorded new task matters.

| Option | Approach | Compatibility and consequence |
| --- | --- | --- |
| **A — schema-stable bounded slice** | Append existing allowed `UpdateHistory` field rows under one new ChangeSetID, including **`Title: null → new title`** as an implicit create convention. The new history UI may label that group “Created task” after verifying the new TaskID and complete one-time field evidence. | **No physical column/schema change**; older reader accepts the rows. However there is **no explicit Create action** and no permitted `PredecessorIDs` history field. It is suitable only for a genuinely bounded first slice with **no predecessor initialization** (or a separately approved relationship audit). The UI must not falsely claim a fully auditable dependency snapshot. |
| **B — explicit versioned task creation** | Define a new, typed **Task Create** audit event with immutable TaskID, WBS, full initial values **including dependencies**, UTC change ID and unverified actor, through a compatible versioned workbook/history reader+writable contract. | **Recommended for the full Stage C acceptance**, because template generation requires auditable new predecessor relationships and truthful task creation. Must design backward-compatible reading of old files and safe refusal by older writers on future formats, then obtain separate schema approval. Higher initial change cost but avoids a later divergent audit model. |

**DMO recommendation:** use **B for the complete Stage C implementation contract**; optionally prepare validation-only/unsaved draft logic in parallel. Do not silently adopt A to pretend that accepted historical field edits are explicit creation events, and do not smuggle `PredecessorIDs` into other fields. A genuine schema decision remains a **Product Owner gate** before any workbook-changing creation code is integrated.

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
9. **Create history:** define a single explicit creation event with item ID, item type, WBS, editor provenance as **unverified**, timestamp and initial field snapshot; ensure existing Change History and Report readers remain compatible. **This event format and any extension version require separately approved, backward-compatible contract**; current `UpdateHistory.Field` whitelist rejects a new create marker.
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

1. **Stage C design close:** review this candidate, validate `ProjectWBS` columns/unique-ID semantics, confirm create-audit event representation and template minimum. Clearly distinguish *recommended* Stage C choices from Product Owner-approved policy.
2. **#23 safe creator foundation:** validate-only pure create draft + unit cases → in-memory workbook candidate + explicit approved history semantics → guarded Save integration → targeted Windows/Edge functional review → focused Owner UAT.
3. **#24 onboarding:** blank starter and safe download flow → template catalog and preview → same creation engine + validation → targeted QA/Owner UAT.
4. **After Stage C:** independent manual RAG workbook/UI/PM authorization/report implementation & UAT and holistic UX consolidation, both mandatory before beta. Stage D multi-blackout and Stage E drag/drop still deferred.
5. **CI cost:** prefer file-diff scoped unit/relevant browser tests, no replay of Stage A MRU or six already accepted Stage B physical UAT cases; avoid promoting documentation drafts merely to trigger full Windows regressions.

**No implementation, workbook/schema mutation, code merge, corporate release or beta is authorized by this unapproved candidate.** The latest owner “Proceed” advances Stage C analysis/delivery preparation; it does not silently ratify unresolved schema/audit choices.
