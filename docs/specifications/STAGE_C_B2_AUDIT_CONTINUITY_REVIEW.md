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

## Independent QA remediation proposals — 2026-11-18 (not approved)

The following are **candidate contract choices**, not implemented behavior or an approved 0.1.3 schema. They address the two CONCERN findings in the PR review without silently changing the fourteen-column ProjectAudit or accepted UpdateHistory.

### C1 — creation-time recognized-field manifest

**Preferred candidate:** define one reserved, explicitly versioned *metadata record* inside the existing ProjectAudit transaction, with an unambiguous reserved Field identifier and canonical sorted JSON payload enumerating the exact normalized ProjectWBS source columns recognized **at Create time**, plus schema version. Reserve and validate this identifier before accepting any Create; exclude this metadata row from ordinary WBS field replay and require exactly one manifest per logical `(ChangeSetID, TaskID)` Create group. Its precise placement/Field encoding, allowed JSON shape, identity and uniqueness rules, and whether the existing fourteen-column reader can safely ignore it **must be agreed against the actual ProjectAudit contract before freeze**. If this cannot be made backward-compatible, stop and present an explicit versioned alternative; do not overload a real WBS field or add a worksheet silently.

**Alternative:** a fixed schema-version-to-recognized-field-set registry, but only if every historical creation schema and future optional-column introduction is uniquely versioned and provably mapped. A version string without an immutable field-set registry does not solve the ambiguity.

**Required validation:** compare the Create field set to the persisted creation-time manifest/registry, not today's ProjectWBS headers. Explicit blank and numeric zero count as present. Missing a manifest, unknown version, duplicate field, unsupported metadata, or mismatch must fail guarded writes; older 0.1.2 items with no Create remain valid legacy items, not fabricated events. A manifest proves structural completeness relative to the claimed schema, **not** immunity from direct Excel tampering.

### C2 — tied-timestamp UpdateHistory chronology

The existing `src/managed/history.ts` reader groups `ChangeSetID`, preserves individual row numbers, and displays events sorted by descending timestamp with lexicographic UUID tie-break. This is a **view sort**, not a verified historical replay order. Do not reuse that ordering to validate Create-to-current continuity.

**Preferred candidate:** accept physical worksheet row order for replay only after confirming the writer appends each ChangeSetID as one contiguous transaction block, never rewrites/reorders prior rows, and preserves that invariant across save/readback. Require monotonic nondecreasing UTC timestamps between transaction blocks (equal timestamps permitted), one consistent timestamp per block, and reject noncontiguous reappearance of the same ChangeSetID. For equal timestamps, block starting-row order is the tie-break; within each block, retain row order and validate field transition uniqueness. A reordered or noncontiguous history is ambiguous and must fail guarded writes rather than silently sort by UUID.

**Fallback:** if append-order preservation cannot be demonstrated on both 0.1.2 history and 0.1.3 candidate round-trips, reject equal-timestamp conflicting edits as ambiguous for replay and do not claim full historical continuity. Preserve read-only history viewing where safe; do not retroactively rewrite legacy history to manufacture an order.

### Targeted synthetic QA to add before contract freeze

| ID | Fixture | Required result |
| --- | --- | --- |
| B2-CONT-08 | Optional column introduced after Create, with valid earlier manifest | Earlier Create remains structurally complete |
| B2-CONT-09 | Optional column existed at Create but its audit field is missing | Reject truncated Create; no workbook write |
| B2-CONT-10 | Explicit blank and numeric zero in Create | Both retained and counted as present |
| B2-CONT-11 | Two different ChangeSetIDs edit same field at same UTC millisecond, contiguous append blocks | Replay in verified block-row order, not UUID order |
| B2-CONT-12 | Same ChangeSetID reappears after another block, or timestamp regresses | Fail closed for unsafe replay/write |
| B2-CONT-13 | Legacy 0.1.2 audit and first 0.1.3 Create round-trip | Preserve old history and reject fabricated historical Create |

**Gate:** independent technical QA must validate the proposed encoding against the actual ProjectAudit reader/writer and prove physical append behavior before either candidate is adopted. No runtime code, schema change, workbook writer, CI escalation, merge or release is authorized by this appendix.


### Source-backed verification checkpoint — 2026-11-18 JST (technical QA, no approval)

Reviewed current protected-main `src/managed/projectDataInspector.ts`, `src/managed/workbookCandidate.ts` and `src/managed/history.ts` against C1/C2. This narrows the remaining contract work:

- **C1 existing reader constraint:** `inspectProjectData` requires fourteen named `ProjectAudit` headers, requires a nonblank `Field` and text-compatible `NewValue`, but currently accepts only `ProjectMeta`, `Blackout`, `WatchReason`, `Commitment` as `EntityType`. Thus a reserved `Field` metadata row is technically representable in the existing columns **only after a version-specific Task/Create validator is explicitly designed**. The current 0.1.2 inspector must remain unchanged for legacy files and reject future 0.1.3 writes. Do not assume an existing reader can already understand or ignore the reserved field. Specify reserved Field literal, JSON schema, maximum payload, uniqueness and strict collision rejection before freeze.
- **C2 append behavior confirmed narrowly:** `buildManagedCandidate` appends each changed field via `history.addRow([])` within one loop, with one ChangeSetID/timestamp; serialized readback checks row count and final ChangeSetID. This supports contiguous blocks for **new writes by this function**. However, `inspectHistory` does **not** enforce global ChangeSetID contiguity, monotonic timestamps, or uniqueness across separated blocks; `readManagedHistoryWithPresence` groups by ID and sorts equal timestamps lexicographically by UUID. Existing or externally modified 0.1.2 histories therefore **cannot be presumed** to satisfy the proposed C2 ordering invariant.
- **Consequence:** do not adopt physical row order as verified historical chronology merely from the append loop. First add synthetic read-only verification of existing history block contiguity, timestamp regression and equal-timestamp conflicting edits, and demonstrate XLSX round-trip preservation. Where ambiguous, preserve safe viewing but deny replay-dependent writes. Do not reorder or repair historical rows automatically.
- **Additional cross-stream constraint:** ProjectAudit Create and UpdateHistory edit records are separate sheets. A common timestamp cannot establish whether a Create or edit happened first; the future verifier must use per-Task existence and an explicit cross-stream ordering/causality rule, or fail closed. A UUID sort is not a valid substitute.

**Disposition:** C1/C2 remain design CONCERN, not independently QA-passed or owner-frozen. No implementation, schema change, new CI run, merge or workbook modification follows from this checkpoint.


### Cross-sheet causality decision gate — proposed synthetic vectors (2026-11-18 JST)

A Task/Create transaction in `ProjectAudit` and subsequent edits in `UpdateHistory` cannot be ordered by physical worksheet position across sheets. Until the contract supplies a verified per-Task creation boundary, the replay verifier must **fail closed for writes** rather than infer causality from equal timestamps or UUIDs. The accepted 0.1.2 viewer remains independently readable; these proposals do not authorize a new writer.

| ID | Synthetic scenario | Required result before 0.1.3 freeze |
| --- | --- | --- |
| B2-CONT-14 | Newly created Task has Create and Update events with identical TimestampUTC, distinct ChangeSetIDs | Require an explicit verifiable cross-sheet causality marker or reject replay-dependent write; never sort by UUID or sheet position |
| B2-CONT-15 | An UpdateHistory event for a newly created Task has a timestamp earlier than its Create event | Reject as impossible chronology for guarded writes, preserving source and diagnostic evidence |
| B2-CONT-16 | Legacy 0.1.2 Task has edit history but no Task/Create event; a different Task is first created under 0.1.3 | Preserve legacy history without invented Create or cross-task ordering; validate the new Task separately |
| B2-CONT-17 | Candidate serialization/readback preserves each sheet independently but loses the proposed cross-sheet causality evidence | Reject guarded write success and preserve backup/recoverable draft |

**Independent QA gate:** validate an exact proposed marker/encoding against the fourteen-column ProjectAudit contract, the existing UpdateHistory columns and real XLSX round-trip behavior before marking this issue resolved. Avoid adding an undocumented column, rewriting historical rows, or treating unverified timestamps as proof of transaction order.


## Simplified recommended resolution — per-Task causal boundary (2026-11-19 JST)

**Decision candidate, not approval:** Prefer a task-scoped creation boundary to a workbook-wide event ordinal. Stage C requires reliable Create-to-edit continuity for each newly created immutable TaskID; it does not require a global total order across unrelated project events. This narrows the change to the existing Task/Create group and existing UpdateHistory rows. The global-ordinal proposal above remains an alternative if future product requirements genuinely require cross-task total ordering.

### Exact candidate wire representation (for review)

Use **one reserved ProjectAudit Field literal `__TaskCreateManifestV1`** within each 0.1.3 Task/Create group. It uses the existing fourteen headers, distinct unique EventID, the group's ChangeSetID, TaskID/EntityID, TimestampUTC, actor, source and app version, and blank OldValue. NewValue is the canonical compact JSON object:

```json
{"v":1,"fields":["ID","TaskType","Title","WBSCode"],"historyBoundary":0}
```

The example represents a minimal source sheet with no nonempty UpdateHistory data rows. The exact historical field list MUST contain each recognized present field exactly once, sorted in ascending ASCII order, including all four mandatory identity fields. Its value is bounded by the existing Excel cell limit (32,767 UTF-16 units); reject unknown keys, unknown fields, malformed/noncanonical JSON, missing/duplicate manifest, unsupported version, negative/noninteger/unsafe boundary and manifest/field-row mismatch. The reserved field cannot be a WBS attribute. It is structural metadata, not a separate business event; exclude it from user-visible field lists and replay.

`historyBoundary` is the count of **nonempty physical UpdateHistory data rows** immediately before Create, measured from the verified original workbook (zero for absent/empty history). It is an append-prefix boundary, not a global event ordinal or a timestamp. No previous rows are rewritten and no UpdateHistory header or sheet is added by the manifest itself.

### Task-scoped ordering/readback invariant

- Preflight: new UUID TaskID must be absent from **all** source WBS rows and all existing TaskID-bearing audit/history references, not merely the active grid; reject collision/reuse. At creation, no prior edit for that ID can exist. Multiple new entities in one template Save share the same boundary and ChangeSetID; each has its own manifest. Validate all against the original source before appending anything.
- Persist the complete Task/Create group and recorded boundary in the guarded candidate; compare its field snapshot to the normalized serialized WBS row. Verify the complete prior history prefix and audit rows remain unchanged; candidate and destination readback must agree. This is append-only evidence, not cryptographic tamper resistance.
- For a B2-created task, every UpdateHistory row bearing its ID must lie **after** the recorded prefix boundary. Reject an edit in the prefix, boundary beyond the available history, a reused Create ID, or a duplicate/discontiguous change-set block involving this task. Replay that task's later edits in physical append block order, verifying each typed OldValue/NewValue chain and complete current editable field equality. Preserve within-block row order and reject duplicate field transitions within a task/change-set. Verify block boundaries and prefix preservation on subsequent writer saves.
- Equal UTC milliseconds across Create/edit or between edit blocks are allowed **when the persisted boundary and verified append order establish causality**; never use UUID lexical order. For B2-created tasks reject timestamps earlier than their Create time or regressing within their own validated edit sequence; clock regressions produce a clear write refusal, not fabricated history. Unrelated legacy timestamps do not impose a new global monotonicity rule. Existing legacy 0.1.2 edit/read semantics stand; legacy entities without Create require no manifest or invented boundary.
- Scope the new replay proof to B2 Task/Create and subsequent supported field edits. For fields outside the accepted edit whitelist, preserve their initial snapshot and require unchanged values while no legitimate versioned change operation exists. If a future column is introduced, it is not retroactively part of the original snapshot; its initial/edited value needs a separately defined extension policy. Do not assert full replay proof for values/aliases whose canonical mapping has not been implemented. Out-of-app rewrites/reordering can defeat ordinary Excel audit integrity; fail closed for detectable inconsistencies. No authentication or tamper-proof claims.
- On ambiguity, unsupported encoding or loss of continuity: reject guarded writes, preserve the original, and offer the established safe diagnostic/read-only path. Do not rewrite legacy rows to manufacture evidence.

### Evidence and limitations

Source review confirms existing `UpdateHistory` has ChangeSetID/TaskID and physical row positions; `workbookCandidate.ts` appends the changes in a contiguous loop, while `history.ts` sorts display events by time then UUID. Therefore the proposed boundary avoids changing the 10 existing UpdateHistory columns and requires a separate replay validator instead of reusing display sorting. Existing `ProjectAudit` text columns can carry the JSON record, but its 0.1.2 EntityType whitelist excludes Task; the 0.1.3 version-specific validation remains mandatory. Do not claim old readers accept the new format. The boundary also does not prove arbitrary cross-task event ordering, which is intentionally outside this recommendation; reports requiring such semantics would need a separate contract.

### Focused proof before freeze (not yet executed)

| ID | Test | Required result |
| --- | --- | --- |
| B2-BOUND-01 | Existing history prefix with legacy edits; create new UUID then same-millisecond edit | New edit after saved boundary; causal replay succeeds without UUID sort |
| B2-BOUND-02 | Two created tasks in one template transaction; interleaved later edits | Both manifests share boundary; each task independently replays |
| B2-BOUND-03 | New ID already referenced by a prior history/audit row | Preflight refuses; original unchanged |
| B2-BOUND-04 | Missing/duplicate/unknown manifest, field omission, noncanonical JSON | Reject candidate |
| B2-BOUND-05 | Insert or move edit for created ID into pre-Create prefix; boundary beyond available rows | Reject write; no false success |
| B2-BOUND-06 | Tied-timestamp edit blocks with UUID order opposite physical order | Replay physical order, validate typed old/new chain |
| B2-BOUND-07 | Discontiguous/duplicate task change-set or timestamp regression | Reject ambiguous writes |
| B2-BOUND-08 | Actual synthetic XLSX candidate serialization loses prefix, manifest or row ordering | Reject readback; preserve source/backup |
| B2-BOUND-09 | Legacy file or legacy task with no Create manifest | Existing supported behavior; no backfill or forced upgrade |
| B2-BOUND-10 | Optional column introduced later versus omitted field present in manifest | First case structurally valid under extension policy; second rejected |

**Next actionable engineering:** pure in-memory proof of manifest validation, prefix boundary and task-scoped replay with these fixtures, followed by independent review and synthetic XLSX roundtrip. The exact 0.1.3 schema, writer integration and release are not approved by this recommendation. Avoid another global-order design loop unless a concrete product need is demonstrated.
