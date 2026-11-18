# Stage C authoring — compatibility and acceptance design (draft, 2026-11-17 JST)

> **2026-11-18 reconciliation with frozen HW-FUNC-1.0 (Issue #82; merged PR #84):** This Stage C document remains a **technical design draft**, not a current business-policy source. Stage B usability and manual-RAG *functional specification* are now accepted/integrated; implementation and beta are not. The **target** health model is Green by default for valid items, with only PM-initiated Amber/Red/Green transitions and mandatory Impact/Path-to-Green or Resolution inputs plus preserved audit. Under Watch/Clear, Watch Add/Resolve/Reopen and automatic RAG assignment are **retired from the target model**. There is no active Watch data requiring migration. Existing accepted Stage A workbook tabs, historical Watch/audit records and runtime must remain intact until separately authorized replacement. Calculated effective TaskStatus/Overdue is independent of RAG. **Any mention below of Manual Watch as future feature scope, automatic health, or Stage B still pending is superseded by this note and [HW-FUNC-1.0](https://github.com/Kenny619/spl-wbs/blob/main/docs/specifications/HEALTH_LIFECYCLE_FUNCTIONAL_FREEZE_CANDIDATE.md).** No workbook schema, RAG writer, security gate, Report 1.1 delta, Stage C implementation or beta is authorized by this document.


**Scope:** Issues [#23](https://github.com/Kenny619/spl-wbs/issues/23) and [#24](https://github.com/Kenny619/spl-wbs/issues/24). Specification/QA planning only; no implementation, schema migration, release, or Product Owner acceptance. Baseline: protected main `8a511472322966d06e5a99df1bec73f076ac430b`, Stage A accepted; Stage B B2/B3 integrated. Stage B remains active. DES-012 Review08 remains the sole approved cross-view visual baseline.

## Authority and invariants

1. Excel is the **project-owned source of truth** for tasks, relationships, Calendar, Manual Watch and append-only ProjectAudit/UpdateHistory. Browser-local theme, PGCM display, columns and recent-file history must never be written into the shared workbook.
2. Preserve the accepted **five-sheet ProjectData contract** and its current version. Any extra column, sheet, version or migration is a separate owner decision, **not authorized** by this document. No assumption that workbook rows may be silently rewritten.
3. New entity creation must pass the same validation, explicit Save/Save As, backup, conflict detection, verified persistence, reload and recovery guards as edits. Draft creation is not persisted creation. Save failure must leave a visible unsaved draft, never a success notice.
4. Append auditable create events with verified before/after meaning under the **existing** approved history mechanism; determine whether the current event model supports creation without a schema change before coding. Do not fabricate authenticated actor identity.
5. Never change the frozen read-only viewer into a writer, upload workbook bytes, silently grant file permissions, or treat corporate managed Edge file-picker failure as solved. No claims about concurrent Excel editors or file locks.
6. A task's WBS code, parent, dependency and TaskID are distinct concerns. Do not automatically recode existing WBS siblings or rewrite existing dependencies; resolve any contract conflict through owner-approved change control.

## #23 — proposed entity creation workflow (decision candidates, not defaults)

| Topic | Safe proposed direction | Verification / unresolved decision |
|---|---|---|
| Entry | Explicit Add Task/Entity action within managed UI; keyboard reachable | Owner confirms which entity types are in first slice and where entry appears |
| Identity | Validate a unique TaskID against **all existing workbook records**, not just current filter; reject collision before Save | Inspect current ID types and historical references; decide allocation algorithm and import collisions |
| Hierarchy | Select existing parent by stable identity; validate parent exists and is not self/cyclic | Confirm how new workstream/project/root entries map to frozen workbook columns |
| WBS | Explicit validated code, preserving all existing codes | Owner decision if automatic new-code suggestion is desired; no silent recoding |
| Dependencies | Validate target existence and reject self/cycle; no phantom predecessor | Confirm current dependency representation and empty-value semantics |
| Lifecycle | Draft → validate → guarded Save → reload-backed committed state; Cancel/Discard leaves workbook unchanged | Existing unsaved-change guard must protect switching tasks/workbooks, closing and Save As |
| Audit | Record creation once after successful write, preserving preexisting history | Test rollback/retry to avoid duplicated create history on failed Save |
| Cross-view | New committed entity appears consistently in Schedule, Task Detail, filters, Meeting Review and reports as supported | No invented health/RAG/Clear or automatic Watch classification |

## #24 — proposed new-project onboarding workflow

**Phase 1 (low-risk candidate):** create an **empty valid workbook** using only the existing accepted schema and default sheets/headers. Provide explicit destination selection or download with user-controlled Save; never overwrite an existing workbook without confirmation. Open through the same validated import path, not a privileged alternate writer.

**Phase 2 (templates, requires separate acceptance):** offer a small catalog of **synthetic** templates that instantiate valid workstreams/tasks and approved parent/dependency relations. Template metadata and browser display preferences stay separate from shared project facts. A template must not create fictitious verified Watch, Green/Clear or Report history.

**Decision points:** Which project/entity fields are required on creation? What counts as a blank project with no tasks for current report/overview engines? Is TaskID allocation numeric or another accepted type? Which template categories and relationships are in first delivery? Should first Save be download-only when directory picker is denied? These are not silently decided here.

## Focused independent QA matrix

| ID | Fixture / action | Required outcome |
|---|---|---|
| C23-01 | Add task to fictional five-sheet workbook; Save, close, reopen | Exactly one committed task, same identity/parent/WBS, consistent cross-view |
| C23-02 | Duplicate ID, invalid parent, self/cyclic dependency, invalid date | Fail closed; original workbook bytes unchanged |
| C23-03 | Edit unsaved new task; switch entity, workbook, Cancel/Discard | Existing unsaved guard and reversible draft; no phantom persisted row |
| C23-04 | Permission denial, changed source, Save As, backup failure | Clear typed notice, no false success, no damaged original, recovery path retained |
| C23-05 | Create, Save, reload, inspect audit and Reports | One auditable creation; no invented historical status/Watch/RAG |
| C24-01 | Blank workbook generation, download, import and Save | Accepted five-sheet schema, parseable empty project, no browser prefs in Excel |
| C24-02 | Each synthetic template; validate all IDs/parents/dependencies | Valid import, stable relationships, no cycle, no unintended existing-row rewrite |
| C24-03 | Repeated template generation with existing filename / denied picker | Explicit overwrite prevention and fallback; no silent write |
| C-RO-01 | Load created workbook in frozen read-only viewer | Read works; editing and direct Save remain unavailable |
| C-UX-01 | Keyboard-only and 860/1366/1440 light/dark navigation | Labels, focus, overflow, error disclosure; DES-012 Review08 consistency |

**Before implementation:** inspect existing workbook parser/writer, create-event audit expressiveness, report empty-project handling and TaskID semantics; freeze the minimum contract with Product Owner. Prefer targeted unit + fictional workbook roundtrip before selective Windows Chromium. Full integration/owner UAT only for a candidate, not this document.

**Sequencing:** finish Stage B remaining functionality and #82 policy freeze in parallel; Stage C #23 creation safety before #24 template-generated entities. Health/Report 1.1 unified semantics remain a separate post-Stage-C pre-beta gate. Holistic UX consolidation remains another mandatory pre-beta gate.