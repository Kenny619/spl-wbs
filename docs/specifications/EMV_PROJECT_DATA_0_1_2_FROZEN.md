# EMV-PROJECT-DATA-0.1.2 — FROZEN additive Excel project-data field and audit contract

**Status: PRODUCT OWNER APPROVED / BOUNDED FIELD-LEVEL FREEZE — 2026-11-14 JST.**  
**Authoritative approval:** [Issue #3 Product Owner decision](https://github.com/Kenny619/spl-wbs/issues/3#issuecomment-6871527705) in response to the [consolidated Nov 13 decision package](https://github.com/Kenny619/spl-wbs/issues/3#issuecomment-6845478113).  
**Machine contract:** [EMV_PROJECT_DATA_0_1_2_FROZEN.json](EMV_PROJECT_DATA_0_1_2_FROZEN.json) (source proposal Git blob `a51d97a727d5773508bc2e58bea917dc633e09bd`).  
**Historical proposal:** [human](EMV_PROJECT_DATA_0_1_PROPOSED.md) · [JSON](EMV_PROJECT_DATA_0_1_PROPOSED.json); these remain historical for traceability, not competing controlling schema authorities.  
**Baseline preserved:** original frozen [EMV-WB-1.0, Issue #3](https://github.com/Kenny619/spl-wbs/issues/3): **no change whatsoever** to `ProjectWBS`, task-field `UpdateHistory`, its ChangeSetID/field rules, existing spreadsheet header aliases, or original SharePoint read-only viewer.

This freezes the **exact five additive worksheet structures, typed/reference validation, conservative legacy behavior and audit/safe-write invariants**. It does **not** authorize production implementation, a writer merge, creating or altering a real workbook, automatic Watch rules, release, deployment, beta, or Product Owner UAT acceptance. Prior F1–F7 drafts remain drafts and their test results are evidence, not acceptance.

## 1. Workbook ownership and structure

Project metadata, Calendar blackouts, Watch reasons, recorded commitment history and project audit belong to the **same committed project `.xlsx`** as the WBS. Members who independently load the *same committed version* see the same facts; no automatic synchronization of already-loaded browsers or distributed locking is claimed. Theme, displayed columns, filters, chart zoom, timezone, PGCM **display preference**, recently opened workbook history and permissions remain user/device-local.

Exactly five additive ordinary worksheets, with **row-1 required header names** matched without order dependence and with compatible extra columns/sheets preserved:

| Sheet | Exact required row-1 headers (comma-separated) |
|---|---|
| `ProjectMeta` | `Key`, `Value` |
| `ProjectCalendar` | `BlackoutID`, `Enabled`, `StartDate`, `EndDate`, `Label`, `ModifiedUTC` |
| `WatchReasons` | `ReasonID`, `TaskID`, `Origin`, `RuleCode`, `State`, `Title`, `Details`, `EvidenceRef`, `OpenedUTC`, `OpenedBy`, `LastReviewedUTC`, `ResolvedUTC`, `ResolvedBy`, `ResolutionNote` |
| `ProjectCommitments` | `CommitmentID`, `TaskID`, `AcceptedFinishDate`, `AcceptedUTC`, `AcceptedBy`, `PreviousCommitmentID`, `Rationale`, `EvidenceRef` |
| `ProjectAudit` | `EventID`, `ChangeSetID`, `TimestampUTC`, `EntityType`, `EntityID`, `TaskID`, `Action`, `Field`, `OldValue`, `NewValue`, `ActorLabel`, `ActorProvenance`, `Source`, `AppVersion` |

All field types and required/optional flags are specified in the frozen machine JSON. A required row-1 **column** is not the same as a required nonempty **value in every row**; optional cells are defined there. UUIDs are stable identifiers; datetime fields requiring canonical UTC use millisecond ISO-8601 `YYYY-MM-DDTHH:mm:ss.sssZ`; calendar dates use valid ISO `YYYY-MM-DD` date-only, not localized text. No new implicit values should be inferred on read.

## 2. Approved constraints by sheet

### ProjectMeta
- Unique required `Key` values, including `ProjectID` (UUID), `ProjectName` (nonblank safe Unicode plain text, 1–180 characters; reject control/formula-trigger names), and **`ProjectDataSchemaVersion=0.1.2`**. Preserve compatible additional metadata.
- `ProjectName` is the shared authoritative application name and source for global/Calendar/navigation and browser document title. It must not silently derive from the filename, local user preferences or legacy source aliases. Legacy without metadata explicitly says **Project name not configured**; filename may appear *only* as a separate source-file identifier.
- The frozen Report 1.1 **generated report name source** remains a distinct Issue #7 contract: **do not silently replace its report-local project-name behavior** with ProjectMeta. This distinction is part of the approved freeze.

### ProjectCalendar
- `BlackoutID` unique UUID; `Enabled` a literal Boolean; valid inclusive `StartDate` / `EndDate` with start ≤ end; optional plain-text `Label`, canonical `ModifiedUTC`.
- Initially **at most one enabled blackout interval**; disabled historical rows preserved. Shared blackout affects Gantt/Calendar and **Days Remaining**, counting each excluded calendar day once even when also weekend/Japanese holiday. Count window remains strictly *after today through finish inclusive* under the existing inactive/coverage rules. Multi-active intervals are a later separately approved scope.

### WatchReasons
- Stable unique `ReasonID`, valid existing `ProjectWBS.ID` `TaskID`; `Origin` = `Manual` or `Automatic`, `State` = `Open` or `Resolved`; valid `RuleCode` only for a separately approved automatic rule. Manual entries keep `RuleCode` blank.
- Reason episodes are independently recorded; resolving one does not erase other reasons. Open records must have no resolution fields; resolved records need consistent resolution UTC/actor label, with full immutable project-audit trace.
- For **new and imported/external** records: any populated `LastReviewedUTC` or `ResolvedUTC` must be ≥ `OpenedUTC` (equality allowed). Contradictions fail closed, including before the next managed Save (F6b).
- A recorded Open reason supports the factual **Under Watch** projection. Resolved-only/absent reasons remain **Unknown**, not automatically Green, until separately approved full rule evaluation and completeness can be demonstrated. `TaskStatus` At Risk/Blocked is not a substitute for recorded Watch reasons.

### ProjectCommitments
- Unique immutable `CommitmentID`; valid TaskID; recorded `AcceptedFinishDate` date-only, canonical `AcceptedUTC`, `AcceptedBy` local actor label, optional rationale/evidence and same-task `PreviousCommitmentID` chain.
- **One root per TaskID, no forks, at most one direct successor per predecessor, no cycles**; each successor's `AcceptedUTC` must be strictly later than predecessor's. Invalid or ambiguous imported revision histories fail closed (F6c).
- `ProjectWBS.PlannedEnd` edits never implicitly update an accepted/reference commitment. **A recorded commitment does NOT establish verified acceptance authority**. No row = Unconfirmed; chain tail = latest recorded only. Who can authorize a revised baseline remains open.

### ProjectAudit
- Append-only, separate from task-only `UpdateHistory`; a row records an actual changed project field, preserving canonical before/after data and identity. EventID UUID per event; ChangeSetID UUID/one TimestampUTC per logical committed Save; same transaction identity may link valid task `UpdateHistory` events while different Saves never collide. Correct EntityType/EntityID and optional TaskID scope; do not invent a TaskID for a project-wide event. `Source` initially `Web UI`; `AppVersion` must be the actual build.
- `ActorLabel` may be user entered, but **`ActorProvenance=UnverifiedLocal` only** for current standalone app. This is a record of what someone entered, **not verified identity, corporate authorization, approver role or attestation of a commitment**. Any verified-provider provenance or authority policy requires separate explicit approval. Do not silently normalize historic extra column values.
- No-op, cancel, blocked/conflicting or unverified Save creates no confirmed project audit event; pending/ambiguous writes must reconcile before a retry. Field-specific OldValue/NewValue serialization must be independently verified before product writing; no new coercion rules are authorized by this structural freeze.

## 3. Legacy, data integrity, transaction, and provider gates

- **All five sheets absent**: legacy WBS/history is viewable; project metadata and blackout are **not configured**, Watch evidence **Unknown** and no automatic migration. Existing supported weekend/Japan-holiday Days Remaining may continue with an explicit unconfigured-blackout qualifier; that is not evidence of a committed empty blackout.
- **Partial/malformed/future extension**: clear diagnostics; no managed Save/Save As or fabricated safe Watch/Calendar data, and Unknown where data-dependent calculations are unverifiable. Never silently repair/version-downgrade on import.
- On the first **explicit confirmed successful non-no-op project-data Save**, create the full five-sheet extension together; if original `UpdateHistory` was absent, preserve the frozen #3 rule by adding the empty required header-only task-history sheet. Read-only import, browsing, cancellation and no-op must not change bytes.
- Preserve compatible unknown sheets, formulas/styles/columns only where the existing fail-closed OOXML preflight deems fidelity safe. Preflight source and candidate, verify source hash just before writing, guard stage/pending/backup and readback, retain recovery evidence on ambiguous failures and refuse stale overwrites. Local source hash is **not** a distributed CAS/lock; actual corporate Edge + Excel/shared-provider locking is an independent acceptance gate.

## 4. Explicitly unfrozen business/release dependencies

This approval **does not decide** automatic Watch thresholds/coverage, completeness or automatic Green/Clear transitions; authorized commitment acceptance, authentic actor identity or corporate role checks; Report11 generated-output name-source amendment; optional Watch-enabled Meeting Review interaction/acceptance design; shared-provider live synchronization/locking; or a stage/beta date. The Under Watch + persisted Calendar/blackout-aware Days Remaining + genuine Watch-enabled Meeting Review dependency remains owner-approved as a **coupled package**, without inventing a stage placement.

No separate server or browser-local truth replaces workbook ownership; no fabricated Red/Amber severity or status-only Meeting Review. **Reports UAT remains deferred** until all approved Report-impacting Under Watch functionality is integrated and the Issue #69 read-only generation fix is included in a verified comprehensive candidate.

## 5. Delivery / QA acceptance path

1. Align isolated F1–F7 implementation and unit/browser tests to this exact frozen human/machine contract; do not rewrite prior evidence or assume technical CI implies Product Owner acceptance.
2. Independently validate representative synthetic legacy/valid/partial/future workbooks; chronology, commitment chains, entity integrity, audit/save/backup/recovery, custom-sheet fidelity, blackout arithmetic and no silent write.
3. Consolidate dependency order in draft PRs, keep exact-source CI and approved DES-012 Review08 layout; no merge to protected main without separate authorization.
4. Final physical corporate Edge/Node26, Excel-open/shared-provider, permissions, locking and comprehensive Reports/Watch/Calendar/Meeting owner UAT remain mandatory before any production migration, release or acceptance.
5. Record any change to this frozen contract as a new, explicit Product Owner decision and versioned amendment, never by silently editing the approved semantics.

**Control:** Frozen specification for fields/audit only; implementation, merge, deployment and owner acceptance are **not authorized by this freeze**.
