# Stage C B2 — Creation Audit Continuity and Readback Design Review

**Status:** implementation-preparation proposal; not a frozen schema or writable-feature authorization.  
**Date:** 2026-11-18 JST  
**Owner-approved direction:** Task creation is an explicit `EntityType=Task` / `Action=Create` event in the *existing* fourteen-column `ProjectAudit` sheet (Option B2, Issue #23). Proposed five-sheet ProjectData `0.1.3` remains subject to exact technical contract acceptance.  
**Inputs:** `docs/specifications/STAGE_C_B2_TASK_CREATE_AUDIT_CONTRACT_DRAFT.md`, PR #105 (non-writing validator and audit planner), accepted ProjectData 0.1.2 and edit-only `UpdateHistory` contract.

## Why this review is necessary

The original B2 Create snapshot captures the values of the **newly saved row at creation time**. Ordinary later edits are audited in `UpdateHistory`. Therefore a validator that insists an old Create snapshot equals the **current** ProjectWBS row is wrong: a legitimate Title, status, owner or date edit would make the file appear corrupt. Conversely, merely checking that a Create group has the right number of rows cannot prove that its saved initial values were truthful.

The following proposal resolves that design ambiguity without changing existing Stage A behaviors or claiming that an Excel audit is tamper-proof.

## Proposed continuity invariant — two distinct validation layers

**Layer 1: structural integrity (required for opening every 0.1.3 workbook).** Validate the complete `ProjectAudit` Task/Create group independently of the current WBS values:

1. Exactly one Create **logical group per created TaskID**, grouped by `(ChangeSetID, TaskID, Action=Create)`; each field has one unique EventID, with no duplicated Field in the group. A ChangeSetID may cover **multiple different TaskIDs** in one template Save; do not reject that legitimate case.
2. Identical canonical UTC time, actor/provenance, Source and app version within the group's rows; `EntityID=TaskID`; all rows are `EntityType=Task`, `Action=Create`, and have blank `OldValue`.
3. Snapshot includes every recognized field **present in the original creation source-row schema** (four identity fields mandatory), including explicitly blank cells and zeroes. Never infer that a missing optional column was originally present merely because today's workbook has it.
4. Decode `PredecessorIDs` as a canonical JSON array; validate field encodings, unique identities and the creation-time parent/predecessor references against the creation-time entity state. Do not assume today's predecessor graph is the creation-time graph.
5. Preserve historical `UpdateHistory` and pre-existing `ProjectAudit` records byte-equivalently across the candidate transaction wherever the workbook writer can preserve that representation. Never synthesize old Create events for 0.1.2 items.
6. Reject repeated TaskID creation, EventID collisions, malformed or truncated Create groups, unsupported schema and ambiguous ordering before enabling new writes. Preserve a safe read-only diagnostic path where the accepted viewer supports it.

**Layer 2: historical continuity (required for a future accepted writable implementation).**

1. On an **initial Task Create**, compare normalized saved WBS-row fields with that transaction's Create snapshot in the serialized **candidate** and again after readback from committed destination. This proves initial equality at the time of creation.
2. After the item is edited, compare current values only to the **replayed chronological state**, not to the original Create snapshot. Replay starts with the Create snapshot and applies only valid later `UpdateHistory` field transitions in documented canonical order.
3. Check each replayable edit's `OldValue` against the prior replayed value, then apply `NewValue`; reject duplicate transaction identifiers or impossible transitions rather than silently skipping records. Distinguish a legacy pre-0.1.3 item with **no Create event**: it must not be forced to invent a creation baseline or fail solely for lacking one.
4. Current `ProjectWBS` field presence, historical source-column presence, aliases, optional blank semantics and derived Summary fields require an explicit mapping. If an old edit history cannot reconstruct a field, do **not** claim full historical verification; provide a scoped diagnostic and deny unsafe writes.
5. For 0.1.2-to-0.1.3 first Create, preserve the original physical and logical history and never reinterpret earlier edits as if they followed the first newly created entity.
6. Any mismatch between stored source, audit and candidate readback must fail the guarded **write** without reporting creation success; retain source/backup and recoverable draft as specified in B2.

### Chronology and historical provenance policy

Chronology requires a documented total order for events sharing a timestamp. `ChangeSetID` is an identity, **not** inherently sortable by time. Do not infer ordering from lexicographic UUIDs or rely on timestamps alone if ties are possible. Before implementation, inspect the actual `UpdateHistory` row schema and accepted writer append rules to establish a deterministic, non-destructive tie policy (e.g. ordered saved rows when verified), and test it with synthetic equal-timestamp events. If stable ordering cannot be established, reject ambiguous replay/write; never guess.

`ActorLabel`/`UnverifiedLocal` are unverified provenance, not authenticated evidence. The Create audit remains normal workbook data and does not protect against malicious out-of-app Excel edits.

## Proposed next engineering slice (separate guarded authorization remains required)

1. **Pure verifier:** Given a normalized immutable Create-group snapshot, recognized historical source-column set and audit rows, validate field-set equality, canonical values and group consistency. No Excel I/O, UI or writes.
2. **Synthetic continuity fixtures:** One new item with zero follow-up edits; one with a later Title/TaskStatus edit; one multi-entity template sharing ChangeSetID; one legacy pre-Create entity; one repeated Create/duplicate EventID; one missing optional column vs explicit blank; one tied-timestamp ambiguity.
3. **Dual-version read gate:** Read accepted 0.1.2 with no forced upgrade; read proposed 0.1.3 and interpret Task/Create groups; existing old writer must fail closed on future version.
4. **Guarded candidate/readback:** Only after exact schema/field ordering approval, implement atomic first-Create version bump, hash conflict checking, backup/no-clobber, serialized candidate readback, destination readback and UI success only after verification.
5. **History projection:** Group Create rows once per `(ChangeSetID, TaskID)`; project later edits in chronological order; do not count per-field Create rows as separate operations. Report 1.1 changes require their separately approved contract.

## Targeted acceptance additions — proposals, NOT executed tests

| ID | Fixture/action | Expected evidence |
| --- | --- | --- |
| B2-CONT-01 | Create then edit Title and status | Original Create values retained; new current values valid through subsequent edit history, not false corruption |
| B2-CONT-02 | One template Save creates two Tasks under one ChangeSetID | Two distinct logical Create events, unique TaskIDs and field EventIDs |
| B2-CONT-03 | Existing 0.1.2 Task later edited after first 0.1.3 Task Create | Legacy task does not require invented Create audit; historical edits preserved |
| B2-CONT-04 | Optional column absent at creation but later present | Original snapshot completeness judged against historical source schema, not today's headers |
| B2-CONT-05 | Missing field, duplicated EventID or noncanonical predecessor JSON | Reject invalid transaction without modifying source or claiming success |
| B2-CONT-06 | Two edits share TimestampUTC with ambiguous order | Deterministic documented order or guarded refusal, never arbitrary replay |
| B2-CONT-07 | Create candidate passes memory checks but committed destination differs | Readback mismatch blocks UI success, preserves recovery path |

## Release and authority boundary

This document recommends validation invariants and tests only. It **does not freeze 0.1.3**, authorize schema mutation, workbook-writing code integration, PM password/localhost controls, corporate Edge distribution, Report 1.1 amendment, beta, production release or deployment. Keep Stage A accepted workbook data, previous audit chronology and old-client fail-closed behavior intact. Avoid repeating accepted MRU/PGCM/header owner UAT; limit future checks to changed creation, historical continuity and rollback surfaces.
