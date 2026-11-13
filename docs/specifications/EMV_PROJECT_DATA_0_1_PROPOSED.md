# EMV-PROJECT-DATA-0.1.2 — Workbook extension with owner-approved scope and draft detailed contract

**Status:** **VERSION 0.1.2 · SCH-01/CAL-02/SEQ-01 OWNER-APPROVED IN PRINCIPLE · FIELD-LEVEL CONTRACT NOT YET FROZEN · NO PRODUCTION IMPLEMENTATION AUTHORIZATION**  
**Decision source:** Product Owner “proceed” after [Issue #25 recommended scope review](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6812740341), recorded in [owner scope disposition #29](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md).  
**Approved decisions:** SCH-01 = five additive ordinary workbook sheets (keeping ProjectWBS/UpdateHistory unchanged); CAL-02 = one enabled inclusive blackout interval initially; SEQ-01 = Calendar, Watch and Meeting are a dependent integrated delivery package. These do not certify exact field-level schema, risk rules, multiwriter integrity or beta scope.  
**Owner feedback incorporated:** [Issue #25 comment #6812583483](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6812583483) — blackout must affect remaining workdays; shared project name must reside in `ProjectMeta` and populate UI, Calendar and HTML document title. These two requested changes supersede the prior proposal's contrary rules; see [proposal changelog](EMV_PROJECT_DATA_PROPOSAL_CHANGELOG.md).  
**Prepared:** 2026-11-12 JST · **Owner data-ownership decision:** [DEC-DATA-2026-11-12](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md)  
**Controlling visual baseline:** [DES-012 approved Review 08](../../design/concepts/DES-012-consolidated-review08-task-detail.html), Git blob `de6ebaa63aa035ba741b4435cf1cdb9d1166d958`.  
**Baseline to protect:** frozen [#3 / EMV-WB-1.0](https://github.com/Kenny619/spl-wbs/issues/3), [#4 Edit](https://github.com/Kenny619/spl-wbs/issues/4), [#5 History](https://github.com/Kenny619/spl-wbs/issues/5), [#6 personal Settings](https://github.com/Kenny619/spl-wbs/issues/6), [#2/#11 file safety](https://github.com/Kenny619/spl-wbs/issues/2), existing read-only v18.  
**Machine-readable counterpart:** [EMV_PROJECT_DATA_0_1_PROPOSED.json](EMV_PROJECT_DATA_0_1_PROPOSED.json).  
**Test companion:** [EMV_PROJECT_DATA_0_1_ACCEPTANCE_PLAN.md](../verification/EMV_PROJECT_DATA_0_1_ACCEPTANCE_PLAN.md).

## 0. Intent and non-goals

All **project facts** are carried by one Excel workbook. Members loading **the same successfully committed workbook version** see identical project data, including WBS, Under Watch, commitments, blackout dates, task Updates and audit. Browser/device-local settings such as theme, column configuration, PGCM display toggle, individual filters/zoom, timezone and recent-file history never become workbook fields.

**Not promised:** automatic live push between browsers, simultaneous multi-writer editing of synced copies, server data storage, authenticated actor identity, a risk score, automatic risk trigger thresholds, or a silent schema migration. These require their own proof/approval.

The current code supports one session-only inclusive blackout interval and influences Gantt shading and PGCM presentation; **the existing `remainingWorkdays` currently excludes blackout because it does not receive that input**. **Owner explicitly requires a functional change:** the new workbook-backed blackout **must also reduce remaining working days**. On a date excluded as a weekend, Japanese holiday or enabled project blackout, exclude it **once**; neither double-subtract nor include it as available working capacity. Retain the approved counting window **strictly after Today through the Planned Finish, inclusive**, excluding inactive statuses and maintaining safe Unknown when required source/holiday information is unavailable. This is a deliberate **proposed amendment** to the previous function's behavior, not merely a persistence change. Calendar blackout alone does not prove a schedule slip or a risk severity.

## 1. Additive workbook structure — proposal

**Keep unchanged:** `ProjectWBS` plus `UpdateHistory` and their existing ordered/aliased headers, historical values and compatibility rules. The new structures are **additional ordinary Excel worksheets** (plain typed cells; no formulas/macros/external connections). The **five-sheet additive organization is owner-approved as SCH-01**. The *exact headers/types, migration and Save semantics remain a detailed proposal*, not an approved or executed migration.

| New worksheet | Primary key / model | What it holds | Write type |
|---|---|---|---|
| `ProjectMeta` | Unique `Key` | Stable project UUID, **shared project name** and extension schema version | Explicit creation/metadata updates only |
| `ProjectCalendar` | `BlackoutID` UUID | Shared inclusive blackout ranges, enabled state and label | Current records plus project audit |
| `WatchReasons` | `ReasonID` UUID | Separate manual/automatic watch reasons and their current resolution state | Current records plus project audit |
| `ProjectCommitments` | `CommitmentID` UUID | Versioned accepted reference finish dates and provenance | Append-only decision records |
| `ProjectAudit` | `EventID` UUID | Field-level project changes, including Calendar, Watch and commitment actions | Append-only, grouped by `ChangeSetID` |

**Why separate project audit?** Frozen `UpdateHistory` demands a real `TaskID`, a task-field `Field` from its allowlist and task WBS/title snapshots. Writing project-calendar events into that existing sheet would fabricate task identities or violate the contract. `ProjectAudit` is the additive, typed project-event journal. A successful logical Save may add genuine task field records to `UpdateHistory` **and** genuine project field records to `ProjectAudit`, sharing transaction ID and UTC timestamp as appropriate; every affected sheet must commit or fail together.

### 1A. `ProjectMeta` — key/value, headers `Key, Value`

| Key | Proposed value |
|---|---|
| `ProjectID` | Project-owned UUID, created on the first explicitly confirmed extension write |
| `ProjectName` | **Required shared project display name**, nonblank after trimming, plain text, up to 180 Unicode characters (matching current report input limit); stored in Excel, not filename-derived or user-local |
| `ProjectDataSchemaVersion` | Exact draft value `0.1.2` for the proposed extension; final value to be set upon the fully validated contract freeze |

Required keys are case-insensitive exact matches, unique and nonblank; extra compatible keys may be preserved. Validate `ProjectName` as Unicode plain text (reject blank/control characters and unsupported rich-value/formula types; render as inert text, not injected HTML). Neither filename nor local browser path is ProjectID or ProjectName. `Save As` retains both ProjectID and ProjectName as a **copy/version** of the same logical project, **not** as proof the copies synchronize; a later explicit rename changes only ProjectName through an audited project Save. A future **Create New Project** must allocate a fresh ID through its own approved workflow.

**Authoritative display binding:** Load ProjectName from the **committed `ProjectMeta`** and display the same string in (a) the global application/project title on Schedule, Meeting Review and Reports, (b) Calendar workspace/section heading and calendar context, and (c) the browser HTML document's `<title>` (e.g. `ProjectName — SPT-WBS`). Escape/inject safely via `textContent` / `document.title` rather than `innerHTML`; changes propagate only after a successful verified Save/reload and across all workspaces without touching personal browser preferences. Do **not** use the workbook filename or a browser-local report-name entry as a competing authoritative project name.

**Legacy display:** Without `ProjectMeta.ProjectName`, show **“Project name not configured”** clearly and keep the workbook filename only as a separately labeled **source file identifier**; do not silently assign a project name from filename or an old local preference. The first explicit project-metadata Save supplies a required name and creates the extension atomically. **Report 1.1 impact:** its currently frozen report-only project-name input/local preference must be reconciled under a separate, narrow update to [#7](https://github.com/Kenny619/spl-wbs/issues/7) before reusing ProjectName in exported report headers; do not silently change an already frozen reporting contract.

### 1B. `ProjectCalendar` — shared blackout records

**Proposed row-1 headers:**
`BlackoutID | Enabled | StartDate | EndDate | Label | ModifiedUTC`

- `BlackoutID`: UUID, unique. `Enabled`: literal Excel boolean. `StartDate`/`EndDate`: ISO date-only `YYYY-MM-DD`, inclusive; start ≤ end when enabled. `Label`: optional plain text. `ModifiedUTC`: canonical ISO timestamp, correlated with last verified Save.
- **Initial UI scope (CAL-02 APPROVED):** at most **one enabled** inclusive interval, matching the real existing control. The table may preserve disabled historical records; a later separately approved multiple-range UI/logic update may increase the number without replacing this sheet. Do not silently enable additional ranges.
- Calendar Setting changes occur inside **Settings → Project Calendar**, separately from personal **Appearance / Columns / Timezone**.
- On a successful Save, show the persisted range. A no-op does not write. Cancel/discard leaves the workbook and display at the prior committed value.
- **Owner-required Days Remaining behavior:** Calculate eligible days strictly after Today through Finish (inclusive) excluding **weekends OR Japanese holidays OR any date covered by the enabled, workbook-committed blackout interval**, once per date. The persisted blackout is the authoritative calculation input for both Schedule Gantt and Task Detail, rather than a separate browser/session-only setting. Do not let an unsaved Calendar draft masquerade as committed days remaining; if a draft preview is offered it must be explicitly labeled. Missing/invalid/unsupported project calendar must not generate an invented numeric count.
- Calendar title/context displays `ProjectMeta.ProjectName`; the Calendar setting remains project-owned while theme/columns/PGCM *display preferences* remain personal.
- Existing blackout's impact on Gantt shading and PGCM remains. Do **not** change the independently frozen working-day/Due Today calculations under this storage amendment alone.
- Removal/disable must preserve project audit; never hide another member's new range through stale last-writer-wins.

### 1C. `WatchReasons` — independently traceable risk reasons

**Proposed row-1 headers:**
`ReasonID | TaskID | Origin | RuleCode | State | Title | Details | EvidenceRef | OpenedUTC | OpenedBy | LastReviewedUTC | ResolvedUTC | ResolvedBy | ResolutionNote`

- `ReasonID`: immutable UUID per reason occurrence. `TaskID`: stable `ProjectWBS.ID`, not WBS code/title or row index. `Origin`: `Manual` / `Automatic`. `RuleCode`: nonblank for automatic only, from a **separately approved** deterministic rule registry; empty for manual. `State`: `Open` / `Resolved`.
- `Title`, `Details`, `EvidenceRef`, `ResolutionNote`: safe plain-text content, no executable links or HTML. Empty allowed except nonblank Title. Preserve original text exactly under safe worksheet value rules.
- Dates: canonical UTC ISO for opened/reviewed/resolved when present. A resolved reason must have ResolvedUTC and closure provenance; an open reason has blank resolution fields. Do not overwrite opening history. Reopening after a new risk requires a new reason episode or a separately approved explicit reopen event in the log.
- **Proposed temporal integrity clarification (F6b, 2026-11-13):** Valid stored `LastReviewedUTC` and `ResolvedUTC`, whenever populated, must not precede the same reason's `OpenedUTC` (equality permitted). Apply this check to **imported/externally edited workbook rows** as well as newly authored candidates; invalid chronology is an `incompatible` project extension and blocks further managed writes **before** staging. This rejects inconsistent history but creates no automatic Watch threshold, new Green decision or authenticated actor claim. [F6b synthetic QA](../verification/EMV_PROJECT_DATA_F6B_WATCH_CHRONOLOGY_QA.md). This is a clarification within proposed v0.1.2, **not an Owner field-level freeze**.
- `OpenedBy`/`ResolvedBy` are **actor labels, not verified corporate identities** in the current standalone browser. Do not claim authentication or enforce user roles until a permitted identity source is specified. A clear source-provenance label should be included in the audit.
- More than one reason may exist per task, including mixed manual and automatic reasons. Clearing one does not clear another; stale/unevaluable automatic checks are **Unknown**, not automatically resolved.
- **Under Watch** is a *derived current evaluation* from saved reason states and reliable current automatic checks, not an independently editable free-text status. `Clear/Green` only when the check set is complete/current AND there are no active automatic reasons AND no unresolved manual reasons. Do not mark new/legacy projects automatically Green when required evidence is absent.
- **No algorithm approved yet** for auto-detection, criticality, original commitment validity or evidence refresh. Schema proposal does not authorize background writes or pass off volatile computed signals as persisted Watch state.

### 1D. `ProjectCommitments` — immutable accepted reference history

**Proposed row-1 headers:**
`CommitmentID | TaskID | AcceptedFinishDate | AcceptedUTC | AcceptedBy | PreviousCommitmentID | Rationale | EvidenceRef`

- Each accepted reference is a **new immutable row** linked to TaskID. `AcceptedFinishDate` is date-only; `AcceptedUTC` is canonical. `PreviousCommitmentID` points to the last version for that task or blank for the first accepted commitment. Validate uniqueness, link validity, chronological ordering and no cycles.
- `AcceptedBy` is an actor label with source provenance caveat above, not a verified approval authority.
- No row means **“commitment not confirmed”**, not an assumed earliest PlannedEnd, not Green and not permission to quietly replace a baseline on task date edit.
- The latest valid accepted version governs comparisons with **current** `ProjectWBS.PlannedEnd`; keep the full original series and historical variance. A material movement may request the **approved lightweight acceptance flow**, but thresholds and permission rules remain unfrozen.
- The ordinary task PlannedEnd edit remains within frozen #4; an accepted commitment is a **distinct explicit action**. Both can share one verified workbook transaction only if separately authorized and fully tested.

### 1E. `ProjectAudit` — immutable project field/event ledger

**Proposed row-1 headers:**
`EventID | ChangeSetID | TimestampUTC | EntityType | EntityID | TaskID | Action | Field | OldValue | NewValue | ActorLabel | ActorProvenance | Source | AppVersion`

- `EventID`, `ChangeSetID`: UUIDs. One logical Save has one ChangeSetID and one TimestampUTC across all new audit rows and any legitimate `UpdateHistory` field rows in that Save.
- `EntityType`: `ProjectMeta`, `Blackout`, `WatchReason`, `Commitment`. `EntityID` maps to the relevant key or UUID. `TaskID` blank for project-wide blackout/meta; valid for Watch/Commitment. `Action` is a validated action such as `Create`, `Update`, `Resolve`, `AcceptCommitment`, `Disable`.
- `Field`: actual changed field, one row per changed field, with canonical old/new values as text/typed value under an approved field normalization rule. Reject unknown required values; preserve compatible custom columns without rewriting.
- `ActorLabel` reflects a local user-entered profile identifier or approved future provider. `ActorProvenance` must truthfully identify `UnverifiedLocal` or a later approved verified identity source. No corporate-authentication claim in a standalone file.
- `Source`: initially `Web UI`; `AppVersion` records a real build version. Existing historical rows are append-only; no migration/normalization/overwrite through UI.
- Long text may require compact UI diff, but persisted old/new values remain full fidelity.
- **Unverified Save, cancelled Save, no-op or conflict = zero new audit events and no displayed committed state.** Ambiguous write requires reconciliation before retry to avoid duplicated transaction IDs.

## 2. Version compatibility, first-write and migrations

1. **Legacy workbook** containing only `ProjectWBS` and optional `UpdateHistory`: continue to load/view existing tasks and preexisting history without data rewrite. Show **Watch unavailable/Unknown** if auto checks or metadata are missing; show **Project Calendar: not configured**, not an invented saved “no blackout” decision. **Pending technical compatibility validation:** continue calculating legacy Days Remaining with existing weekends/Japanese-holiday rules and an *explicit unconfigured empty-blackout fallback* while no extension exists; label **“Project blackout not configured”**, not a persisted project decision. Once project metadata exists, calculate against the committed `ProjectCalendar`. A partial or invalid extension is a data error/Unknown, never silently an empty blackout. Never create extension sheets on ordinary read.
2. First **explicit confirmed project-data Save** creates any missing extension sheets **together**, after source preflight, validation and candidate readback. It establishes `ProjectID` and proposed schema version. Do not create half the extension or migrate legacy content opportunistically.
3. Maintain the existing #3 rule that `UpdateHistory` is present after the first successful non-no-op Save: if a project-only Save is the first one, create an **empty header-only** `UpdateHistory` sheet if absent; do not invent a task audit row.
4. The workbook already having any *recognized* extension sheet but lacking required companions/headers/consistent version is an **incompatible partial extension**: fail closed for writes; allow explicit read-only inspection/diagnostics where safe. No silent repair or deletion. Compatible extra columns/worksheets must be retained.
5. On import, validate unique IDs, workbook task links, date validity, canonical types and version, event provenance, no duplicate audit IDs, consistent shared transaction timestamps and no append-only violations. Unsupported future versions block write but may permit marked read-only access where safe.
6. Existing unsupported Excel package features, macros, sheet formulas, unsafe relationships or other preflight failures remain **blocked** for direct Save and Save As under #2; do not weaken the allowlist to “make Watch work.”
7. **Save As** makes a full copy of project data and audit, with stable ProjectID and historical IDs; this is **a separate workbook copy**, not a live-synced replica. New-project/template creation is a separate workflow with fresh ID and separately authorized initial project config.
8. **Personal “Reset settings”** must not remove blackout ranges, Watch reasons, commitments, task history, project metadata, audit or any other workbook data.
9. Date-only values stay date-only regardless of selected display timezone. UTC instants display in each user's local preference only, without altering stored values.
10. Once `ProjectMeta.ProjectName` is configured, it is the sole authoritative project display name in the global UI, Calendar title/context and browser `document.title`. A legacy workbook lacking ProjectName shows an explicit unconfigured state and a separately labeled source filename, not a falsely saved project name.

## 3. Shared workbook Save/reload transaction

**Current proven direction:** local Edge File System Access API with explicit user gesture, source hash comparison, verified sibling backup and readback. That is not an atomic multi-device lock or a real-time sync engine; harden/validate the same-file environment before claiming cross-member safety.

**Proposed logical transaction:**

1. User initiates Watch Resolve, Accept Commitment or Calendar Save explicitly; keep a draft, not optimistic committed UI.
2. Check current workbook access, current file hash/version and supported feature preflight. Block on external modification, unknown Excel features, malformed extension/history, loss of permission, unresolved backup or invalid IDs.
3. Apply task changes (if any) plus project mutations in **one in-memory workbook candidate**, with deterministic validations; append only the relevant `UpdateHistory` / `ProjectAudit` events with a single ChangeSetID and TimestampUTC. Do not treat every project Save as a fake task edit.
4. Serialize then **reopen candidate and verify** worksheet names, full non-target fidelity, all row counts and identities, reference integrity, changed values, and task/project event coherence. No write on failed candidate verification or no-op.
5. Immediately before write, re-verify source version/hash and available lock/checkout semantics. If another editor/sync client intervenes, **stop without overwrite**, preserve the draft and ask user to reload/resolve. Hash checking alone is not distributed CAS; do not promise multiwriter atomicity without provider-specific proof.
6. Use existing staged write/sibling predecessor backup/ownership/recovery protocol, then verify saved bytes, committed workbook state and backup. A failed/unverified operation **must not be shown as shared saved**. Preserve pending draft on uncertainty, and block retries until recovery has been inspected.
7. Only after confirmation, refresh the Gantt, Meeting Review/Watch, calendar and reports from the **same persisted workbook snapshot**; task-facing local filters/view preferences remain unchanged.
8. Another project member sees the new data after loading/refreshing the same updated authoritative workbook. A stale session shows last verified version and asks for reload before further edits. **No live push/remote sync is implied**.
9. For file shares/sync clients without reliable single-writer/version-conditional save semantics, **concurrent editing is unsupported**, with explicit warning and safe refusal when conflicts are detected; run a two-user real-environment feasibility test before claiming support.

### Source/freshness warning contract

- `Verified latest read` means only the bytes actually read at a given time are verified; it is not proof that no other user will modify the shared file after the check.
- If a stored view is stale/unknown, the UI labels it **“Workbook may have changed; refresh before saving or claiming current Watch health.”**
- Green cannot be derived from stale/unknown automatic data. A watch reason must never be cleared simply because a revised PlannedEnd is later or because the file could not be read.

## 4. Product and architecture boundaries to retain

- **Meeting Review** ships **with genuine workbook-backed Under Watch**, together with workbook-backed Calendar in the **SEQ-01 owner-selected integrated delivery package**. Status-only interim MR is rejected (MR-D01 B). This does **not** shift the existing after-Stage-C beta entry milestone. A watch-aware refinement of Meeting content/UX requires targeted separate visual signoff; do not replace the approved 3-page visual language.
- **Personal UI settings** stay browser-local: Theme, columns, PGCM display, zoom, search/filter state if saved, timezone and recent workbook history. **PGCM display** option is local even when the date/meeting facts it shows are project facts. **ProjectName is not a view preference** and must not use the existing browser-local Report 1.1 project name as a competing source.
- **Calendar** is inside Settings but clearly separated as a **shared project setting**, with its own explicit Save/Cancel. The formerly proposed session-only storage is superseded. **Owner-required amendment:** enabled blackout dates also reduce the same centrally calculated **Days Remaining** values (no double-count of overlapping weekends/holidays) across views.
- **Under Watch** status is not `TaskStatus`. Existing `At Risk`/`Blocked` statuses do not establish saved Watch reason evidence. No unsourced Red/Amber score or unapproved automatic risk algorithm.
- **Reports 1.1** remains governed by the frozen source/health rules. Never inject synthetic RAG from a new Watch sheet into a status report unless the report contract and verified source semantics are separately amended.
- **Read-only v18** and the SharePoint viewer must never write to workbook, change its local data contract or receive managed-only configuration.

## 5. Explicitly OPEN to settle before requirements freeze / coding

| ID | Design Office recommendation | Owner decision needed? |
|---|---|---|
| **SCH-01 Additive sheet schema** | Five ordinary project worksheets, **ProjectMeta.ProjectName required**, preserved frozen `ProjectWBS`/`UpdateHistory`, separate `ProjectAudit` | **Owner APPROVED sheet structure; exact headers/typing/validators still pending full spec freeze** |
| **NAME-01 Project-name source** | Shared `ProjectMeta.ProjectName` is authoritative for app header, Calendar and browser HTML document title; old local Report 1.1 name setting requires separate #7 compatibility review | **Owner direction received; technical/report migration still to reconcile** |
| **CAL-02 Active blackout scope** | **One enabled inclusive range initially**, while table can permit multiple later | **Owner APPROVED initial boundary; multi-range logic excluded from first delivery** |
| **CAL-RULE-01 Blackout affects remaining days** | **Owner-directed: YES.** Exclude enabled project blackout from Days Remaining in addition to weekends/Japanese holidays, once per date; preserve other counting and Unknown rules | **Decision confirmed by owner; no longer an open preserve-old-rule question** |
| **LEGACY-CAL-01 Legacy without project-calendar metadata** | **Proposed**: retain supported legacy weekend/holiday Days Remaining with a visible unconfigured-blackout qualifier; partial or invalid extension remains fail-closed | **Technical compatibility validation before detailed contract freeze** |
| **ACT-01 Actor identity truth** | Store a plain actor label with **`UnverifiedLocal` provenance**, do not claim authenticated corporate identity without a permitted source | **Yes** if verifiable attribution is mandatory for this version |
| **SYNC-01 Shared edit policy** | Same-file reload consistency, fail-closed external changes, **one editor at a time** unless verified locking/CAS; not live simultaneous editing | **Yes** if true concurrent multiuser writes are required |
| **SEQ-01 Integrated delivery** | **Owner APPROVED**: shared Calendar including blackout-aware Days Remaining is delivered together with workbook-backed Watch and integrated Meeting Review. Stage timing is a separate planning decision; retain existing beta gate after Stage C without silent changes. | **Dependency grouping approved; exact stage/date and change to beta readiness NOT approved** |
| **WATCH-RULES-01** | Automatic risk signals, reference-commitment thresholds and Green check completeness need separate functional specification; no invented rules now | **Yes**, later functional design gate |
| **UI-01** | Preserve approved Review 08 visual scheme, with targeted Watch-enabled Meeting content review after functional contract | **Yes**, later only for material change |

## 6. Approval/release gates

1. Owner reviews/finalizes extension schema and choices, including the newly required `ProjectName` and blackout-aware remaining-day behavior; record precise versioned changes to frozen #3 and affected calendar/date semantics without mutating prior accepted history. Assess frozen Report #7's local-name preference separately.
2. Independent technical feasibility on disposable **Windows/Edge** workbooks: new plain sheets/OOXML preflight, preserving extra columns and unsupported-feature fail-closed; two-authority/copy conflict and Excel-open lock tests.
3. Only after explicit coding authorization: isolated feature branch, versioned machine JSON/human spec synchronization, code/tests and independent QA, exact-head UI parity.
4. Owner UAT only after verified real workbook roundtrip and source/safety gates, with only one latest approved UAT kit advertised in README. Do not publish a new kit during the current reconciliation hold.
5. No PR merge/release/beta authorization follows from this proposal.

**Record status:** VERSION **0.1.2 · owner-approved structure/scope; detailed field-level validation and runtime safeguards remain DRAFT**. SCH-01/CAL-02/SEQ-01 are no longer open choices. `ProjectName` and blackout-aware Days Remaining remain owner-directed requirements. Do not interpret scope approval as full schema freeze, engineering implementation order, or release authorization.
