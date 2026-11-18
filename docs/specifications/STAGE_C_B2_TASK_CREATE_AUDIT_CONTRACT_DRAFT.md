# SPT-WBS | Stage C B2 Task Create Audit — Versioned Workbook Contract

**Contract ID:** C-AUDIT-B2-0.1 • **Draft technical elaboration, 2026-11-18 JST**  
**Binding Product Owner decision:** **Option B2 approved** in [Issue #23](https://github.com/Kenny619/spl-wbs/issues/23#issuecomment-6970324100), for Stage C versioned functional/technical specification, backward compatibility, complete history and targeted QA.  
**Approval boundary:** B2 **architecture is approved**; this exact proposed version number, representation and migration details are **review candidates**, not an authorization to write real Excel files, merge a schema migration or deliver a release.  
**Related:** [#24 onboarding](https://github.com/Kenny619/spl-wbs/issues/24), [Stage C functional draft](STAGE_C_AUTHORING_COMPATIBILITY_DRAFT_2026_11_17.md), [HW-FUNC-1.0 approved manual RAG](HEALTH_LIFECYCLE_FUNCTIONAL_FREEZE_CANDIDATE.md).

## 1. Goals, source reality and exclusions

**B2 fixed decision:** Persist a genuine **Task Create event in existing `ProjectAudit`**, with `EntityType=Task` and `Action=Create`. A **single logical transaction** covers a newly created Task, Summary or Milestone and its complete initially saved WBS fields—including hierarchy and predecessor links—without masquerading as one or more ordinary field edits. Do **not** add a separate TaskAudit worksheet.

**Current accepted baseline:** ProjectData schema **0.1.2**, five named extension sheets (`ProjectMeta`, `ProjectCalendar`, `WatchReasons`, `ProjectCommitments`, `ProjectAudit`) and `ProjectWBS` + optionally `UpdateHistory`. `ProjectAudit` already has an `Action=Create` value but its `EntityType` validator currently rejects Task; its `NewValue` validates as optional text. `UpdateHistory` is strictly field-edit-only and does not accept a `Created` field or `PredecessorIDs` field today. A v0.1.2 writer is intentionally **not** permitted to edit a newer ProjectData schema.

**Out of scope for this contract:** Automatic RAG; Under Watch migration; task deletion/archival; drag/drop or WBS recoding; authenticated personal attribution; cloud synchronization; loosening folder permissions; editing the current accepted 0.1.2 workbook without guarded transaction controls; any corporate release or beta.

## 2. Proposed additive schema delta — **ProjectData 0.1.3 candidate**

| Item | Accepted 0.1.2 | B2 proposed 0.1.3 | Compatibility intent |
| --- | --- | --- | --- |
| ProjectData sheets | Five fixed sheets | **Same five sheets; no added sheet** | Keep current workbook organization |
| `ProjectMeta.ProjectDataSchemaVersion` | `0.1.2` | `0.1.3` **after first authorized Create** | Explicitly gate new semantics |
| `ProjectAudit` column headers | Existing 14-column audit table | **Keep exact existing 14 headers** | Avoid column migration; extend validated value domain only |
| `ProjectAudit.EntityType` | ProjectMeta, Blackout, WatchReason, Commitment | Add **Task** | Typed event, not ad hoc Field sentinel |
| `ProjectAudit.Action` | Includes Create | Retain Create | Distinguish creation from Update |
| `UpdateHistory` | Task field-edit records | **Unchanged physical structure and edit-only semantics** | Legacy task edits remain readable |
| `ProjectWBS` | Current Task/Summary/Milestone columns | No new column required by B2 itself | Existing viewer source preserved |

The **0.1.3 version number is a proposed minimal next increment**, not yet an approved production schema. Check any intervening schema proposals before freezing the exact value.

### 2.1 One logical Create transaction, multiple field audit rows

For **each** initial field snapshot, append a `ProjectAudit` row with these **existing** columns:

| Column | Expected new Task Create value |
| --- | --- |
| `EventID` | Fresh unique UUID **per audit row** |
| `ChangeSetID` | **One UUID shared** by all rows in the logical creation, and any needed project-version event in that Save |
| `TimestampUTC` | Same canonical ISO UTC millisecond timestamp across the transaction |
| `EntityType` | **Task** |
| `EntityID` | Generated immutable `ProjectWBS.ID`, represented canonically as a string |
| `TaskID` | Exactly the same TaskID, not an invented project/parent ID |
| `Action` | **Create**, across the whole initial snapshot |
| `Field` | Recognized source field from the complete initial snapshot list below |
| `OldValue` | Empty text, representing *no prior entity value*; never imply an earlier task existed |
| `NewValue` | Validated canonical **text** representation of the initial saved field, including explicitly blank optional fields |
| `ActorLabel` | Nonblank local editor label, **not verified individual identity** |
| `ActorProvenance` | Existing literal **UnverifiedLocal** |
| `Source` | Existing literal **Web UI** |
| `AppVersion` | Nonblank version of the writer |

**Logical transaction** means the UI/history groups these rows by `ChangeSetID`, `TaskID` and action to display exactly one “Created [TaskName]” operation, not 10–20 independent actions. Every row is linked to an actual `ProjectWBS` record. Two different Create transactions must not introduce the same TaskID. Replaying the same ChangeSetID must fail instead of duplicating a row.

### 2.2 Initial snapshot completeness

Create must record **every recognized and physically present initial ProjectWBS field**, not just Title; optional columns absent from the workbook are not fabricated. **Proposed canonical field vocabulary** (using normalized recognized headers, independent of `UpdateHistory.EDITABLE_FIELDS`):

`ID`, `Title`, `WBSCode`, `TaskType`, `ParentTaskID`, `TaskStatus`, `PlannedStart`, `PlannedEnd`, `Progress`, `AssignedTo`, `Workstream`, `PredecessorIDs`, `Priority`, `Description`, `Updates`, `SortOrder`, `Modified`, `ItemURL`.

- Capture fields even when initially blank. Blank text represents an explicit empty value, distinct from numeric **0** represented by `"0"`; fixed enumeration values use their canonical source spelling.
- Store dates as ISO `YYYY-MM-DD` text, independently from Excel date-cell formatting. No derived Summary dates/progress masquerade as authored input.
- **PredecessorIDs:** canonical serialized **JSON array of TaskID strings**, e.g. `["T-101","T-205"]` or `[]` (not a comma-delimited ambiguous string). Validate and round-trip every referenced TaskID and allowed Finish-to-Start meaning. Do not write a formula or an escaped/ambiguous display representation into the audit.
- **Workstream** remains a text property of the entity, not a separate source of truth. **RAG Green default is a computed display policy for a valid item, not a new RAG field or event on creation.**
- Define exact serialization for every optional field (notably Excel datetime, percentages, hyperlinks and SortOrder) before implementing; equality is against the **normalized saved WBS row** after XLSX roundtrip, not only the raw draft.
- The selected B2 storage is still an **ordinary Excel audit**, not tamper-proof cryptographic proof: out-of-app manual Excel modification cannot be attributed to a person.

### 2.2A Workbook-column presence and canonical source-of-truth rules

**Compatibility refinement (source-backed, 2026-11-18):** The accepted `ProjectWBS` reader requires only ID, Title, WBSCode and TaskType, while optional columns can legitimately be absent or have accepted header aliases. A B2 writer must **not silently add optional workbook columns** merely to satisfy a fixed audit list.

- Snapshot **every recognized ProjectWBS field physically present in the normalized, committed source row**, including explicit blanks; require the four canonical identity fields. A missing optional *column* is **absent from the snapshot** and must not be represented as an invented authored blank. A present optional column with a blank *cell* is recorded with `NewValue=""`. Audit validator compares the field set with the actual recognized source columns, so a truncated “Create” group cannot masquerade as a complete snapshot.
- Normalize known legacy header aliases to the canonical field names before emitting audit fields. Preserve the original worksheet's actual headers/styles/formula/text data; never rename or fill existing user columns as a side-effect.
- Canonical first-save values are taken **after workbook candidate readback**, not an unsaved UI draft or derived Summary rollup. Use ISO calendar dates `YYYY-MM-DD`, canonical 0–100 progress, unambiguous finite numeric SortOrder, true blank `""`, and a JSON array of TaskID strings for PredecessorIDs. Reject non-finite numeric values, invalid dates, duplicated/unknown references, formula/control text or overlong serialized cells before writing a candidate.
- The `ProjectAudit` version-aware validator must enforce one unique `Field` per Task/Create logical group, all required identity fields, same `EntityID`/`TaskID` and ChangeSetID/UTC/provenance on each row, and **exact field/value matching** to the WBS row. It must reject duplicate ID or ChangeSetID across historical events, truncated snapshots, and missing/extra fields. Do not rely on the old generic `ProjectAudit` row validator alone.
- A create-event audit references the item **as initially saved**. Subsequent legitimate `UpdateHistory` changes may make its original values differ from today's WBS row; validation needs to compare against a replayed/proven initial state or a separately documented continuity rule, rather than incorrectly rejecting a workbook after a later edit. **Before shipping**, define and test that reconciliation invariant.
- A missing field, unsupported header alias, or source/audit mismatch blocks *Create*, not the historical read-only display of previously accepted workbooks. Viewer fallback and old-writer fail-closed behavior remain distinct.

### 2.3 Create transaction atomicity and append-only evidence

1. **Preflight:** verify source workbook identity, accepted schema, complete headers, historical audit integrity, TaskID and WBS uniqueness, parent Summary, predecessor existence/no forbidden cycles, user write permission and existing save/recovery hold.
2. **Draft candidate:** prepare a fresh in-memory workbook clone, append the new `ProjectWBS` row, append all corresponding `ProjectAudit` Task/Create field rows and update ProjectMeta version **within one candidate**. Never write an audit row before an actual task candidate exists.
3. **Validation:** re-open serialized candidate, run canonical parser plus version-specific ProjectData validation, check exactly one persisted entity ID and one complete logical Create event, compare all normalized source fields and audit snapshot, and confirm existing WBS/history/extension data remains unchanged except the authorized transaction.
4. **Guarded commit:** recheck hash/stale source immediately before Save; use existing backup, no-clobber/Save As and recovery safeguards. If interrupted or denied, **no committed status or audit success**; preserve the original and recoverable draft.
5. **Post-save verification:** reload committed workbook from actual destination, confirm bytes/identity, row and audit event, then update UI and Recent Projects (if relevant). Do not report success from an uncommitted candidate.
6. **Future edit behavior:** subsequent Task field updates remain in existing `UpdateHistory` with their own ChangeSetID; the creation event stays in ProjectAudit, and combined History displays correct chronological ordering without silently dropping either stream.

## 3. Compatibility and migration matrix

| Input / app | Read | Create/edit policy | Safety condition |
| --- | --- | --- | --- |
| 0.1.2 workbook in B2-aware future app | **Yes, preserve semantics** | Existing edits allowed under current protections; a later approved Create can upgrade atomically to 0.1.3 | Old audit/Watch/Calendar/Commitment rows retained, no invented historical Create records |
| 0.1.3 workbook in B2-aware future app | **Yes, full Task Create history** | Only validated and guarded editor operations | Audit fields, exact version and Task references verified |
| 0.1.3 workbook in existing 0.1.2 managed writer | **Must not claim compatibility** | **Fail closed on write**, as current inspector rejects future schema | Do not downgrade, strip Task events or silently bypass protection |
| 0.1.3 workbook in existing read-only viewer | **Conditional, test** | Never offers write | Verify canonical ProjectWBS display; a project-extension-aware reader may show unsupported-schema warning. No false unconditional compatibility promise |
| Legacy workbook with no ProjectData extension | Existing legacy viewer behavior | No implicit creation migration | Require separately approved initialize/upgrade flow before B2 Create |
| Partial/corrupt/future workbook | Error / diagnostic | No write | Never transform unknown state into valid new schema |

**Transition rule:** Never bulk-backfill old entities with fabricated Create events. Existing accepted 0.1.2 workbook edits remain valid without triggering an upgrade. Upgrade only for an explicitly authorized feature that needs B2, with a pre-write backup and the reversible original. Preserve the five-sheet structure, original records and the raw historical event chronology.

## 4. Targeted independent QA — **not yet executed**

| ID | Stimulus | Pass evidence |
| --- | --- | --- |
| **B2-01** | Create a fictional Task with no predecessor | ProjectWBS + exactly one logical Task/Create with complete snapshot and matching ChangeSetID |
| **B2-02** | Create Task with two validated predecessor IDs and parent Summary | `PredecessorIDs` JSON round-trip matches saved WBS, TaskID/parent/WBS stable |
| **B2-03** | Create Summary and Milestone with optional blanks | Required fields captured, blank vs 0 preserved, Summary-derived fields not fabricated |
| **B2-04** | Upgrade accepted synthetic 0.1.2 workbook on first Create | Precisely one schema bump; original UpdateHistory, ProjectAudit, WatchReasons, commitments, Calendar and unrelated rows preserved |
| **B2-05** | Open 0.1.2 and perform ordinary task edit in new app | No forced upgrade or spurious Create events; existing task history remains valid |
| **B2-06** | Old 0.1.2 managed writer receives newly created 0.1.3 workbook | Explicit unsupported-version refusal, no destructive downgrade or overwrite |
| **B2-07** | Open B2 file in new viewer and older read-only viewer | New reader correct; old viewer may explicitly refuse incompatible extension but **never writes**, displays reliable facts only |
| **B2-08** | Repeat same ChangeSetID, duplicate TaskID, duplicate WBS or invalid predecessor | Fail closed; original workbook and history unchanged |
| **B2-09** | Concurrent modification, missing write permission, backup/recovery failure | No partial row or audit success, clear recovery and original preservation |
| **B2-10** | Save/reopen and inspect combined history + Report event period | Exactly one correctly dated Create operation; historical reports don't claim current task existed before Create |
| **B2-11** | Task created and later ordinary field edited | One original ProjectAudit Create, subsequent valid UpdateHistory edit; both visible without fabricated attribution |
| **B2-12** | Inspect current RAG/Watch after creation | Green **default** (not an assessment audit), no Under Watch mutation or auto-RAG |

**Proportionate QA:** Start with pure field serialization and grouping tests, then synthetic XLSX candidate/roundtrip tests, then affected managed-browser scenario and only the minimal Owner UAT necessary for actual creation, history and safe Save. Do not replay accepted Stage A MRU or Stage B UI tests without an identified regression surface. Capture source SHA, exact fixtures, case results and recovery evidence.

## 5. Implementation slices and owner gates

1. **NOW — architecture decision recorded:** B2 selected and binding. Prepare versioned contract/spec and validation-only tests; keep draft PRs non-writing while final details are reviewed.
2. **NEXT — freeze the exact contract**: schema identifier (0.1.3 proposed), canonical field encoding, audit grouping/validation, old-client behavior, upgrade rules. Verify the existing `projectDataInspector`, `projectDataCandidate`, `history`, `workbookCandidate`, `directSave` and read-only consumer behavior against this draft.
3. **THEN — separately authorized bounded writer implementation:** dual-version validator, one guarded Create transaction, readback verification, history/report projection, independent QA and targeted Owner UAT; only after successful contract gate.
4. **AFTER #23 — #24 onboarding/templates** reuse exactly this creator; no parallel ad hoc event path.
5. **LATER** separate frozen RAG implementation, versioned Report 1.1 delta and holistic UX gate before any beta decision.

**No authority is implied for new credentials, application deployment, corporate use, destructive migrations, unreviewed merge of workbook-writing code, beta or production release.** Architecture approval is not a user acceptance test.
