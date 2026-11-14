> **Change-control status updated 2026-11-14:** An independently versioned [frozen v0.1.2 human contract](EMV_PROJECT_DATA_0_1_2_FROZEN.md) and [frozen machine contract](EMV_PROJECT_DATA_0_1_2_FROZEN.json) now supersede the *field/audit schema* proposal below. All earlier entries remain historical; do not reinterpret their then-current “NOT FROZEN” labels as today's status. The bounded Product Owner approval is [Issue #3](https://github.com/Kenny619/spl-wbs/issues/3#issuecomment-6871527705).

## 2026-11-14 — Product Owner bounded field/audit contract freeze, version 0.1.2 (FROZEN)

**Decision:** Owner approved exactly the consolidated v0.1.2 five-sheet headers, required/optional typed fields and cross-reference/chronology integrity model. `ProjectMeta` retains required safe `ProjectName` and fixed schema literal `0.1.2`; Calendar has ≤1 inclusive enabled blackout and excludes each nonworking date once. F6b Watch reviewed/resolved UTC ≥ opened UTC (equality allowed), F6c one-root/no-fork/forward-time commitment chains and a distinct append-only `ProjectAudit` are included. `ActorProvenance=UnverifiedLocal` is permitted only as a historical user-supplied label, not proof of identity or business authority.

**Protected boundaries:** Original `ProjectWBS` / task-only `UpdateHistory` remain frozen under EMV-WB-1.0; legacy/no extension is viewable with explicit Unknown/not-configured state, whereas partial/future extensions fail closed for managed writes. Automatic Watch thresholds/Green, commitment acceptance authorization, Report11 project-name-source change, provider locking/live sync, implementation authorization, production migration, merge, deployment and owner UAT acceptance **remain open/unapproved**. No new code/CI success inferred by this documentation decision.

**Artifacts:** [Frozen human contract](EMV_PROJECT_DATA_0_1_2_FROZEN.md) · [frozen machine contract](EMV_PROJECT_DATA_0_1_2_FROZEN.json) · [proposed 61-case acceptance plan now scoped to frozen schema](../verification/EMV_PROJECT_DATA_0_1_ACCEPTANCE_PLAN.md) · [owner approval](https://github.com/Kenny619/spl-wbs/issues/3#issuecomment-6871527705). Frozen metadata/addenda are separately versioned; historical draft files retained for audit.

# EMV shared-project workbook extension — proposal changelog

**Change-control state:** PROPOSED versions only; **no frozen schema or implementation authorization**.  
**Controlling Product Owner data direction:** [DEC-DATA-2026-11-12](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md).  
**Current proposal:** [human specification](EMV_PROJECT_DATA_0_1_PROPOSED.md) · [machine contract](EMV_PROJECT_DATA_0_1_PROPOSED.json) · [QA plan](../verification/EMV_PROJECT_DATA_0_1_ACCEPTANCE_PLAN.md).

## 2026-11-13 — F6c proposed v0.1.2 commitment-chain integrity (NOT FROZEN)

**Source:** [F6c recorded commitment lineage QA](../verification/EMV_PROJECT_DATA_F6C_COMMITMENT_HISTORY_QA.md) · [draft PR #55](https://github.com/Kenny619/spl-wbs/pull/55). The initial 11 new synthetic unit cases and strict build passed; use the final exact-head CI report for the full browser outcome.

**Old proposed validation:** `ProjectCommitments` required stable TaskID, unique commitment ID, an existing same-task predecessor (or blank), and no cycles. The inspector accepted multiple independently rooted histories for one task, two successors to one prior version, and a revision dated before/equal to its predecessor—so no unambiguous latest recorded reference could be selected.

**Clarified proposed rule:** at most one blank-predecessor root per task, at most one successor per prior CommitmentID, and successor `AcceptedUTC` **strictly greater** than its predecessor's canonical UTC. These apply to **imported and externally edited** workbook rows as well as future project-data candidates, with explicit fail-closed diagnostics before staging. A pure read-only `projectCommitmentProjection` now presents individual records as **“Recorded (unverified)”** and the chain tail as **latest recorded only**, never as authorized accepted business baseline. No implicit task date rebaseline or Green health.

**Traceability/impact:** synchronized both human and JSON proposed v0.1.2 validators. Frozen `ProjectWBS`/`UpdateHistory` unchanged; the exact actor/acceptance authority, automatic thresholds, corporate file locks and Report 1.1 name-source amendment remain separate unapproved gates. No real workbook, merge, release or detailed field-contract freeze is implied.

## 2026-11-13 — F6b proposed v0.1.2 Watch chronology clarification (NOT FROZEN)

**Source:** [F6b exact-head integrity QA](../verification/EMV_PROJECT_DATA_F6B_WATCH_CHRONOLOGY_QA.md) · [draft PR #54](https://github.com/Kenny619/spl-wbs/pull/54). Exact SHA `96125391d09409fc93657f8a62cc67fb973faed0` [CI #43374712341](https://github.com/Kenny619/spl-wbs/actions/runs/43374712341) **SUCCESS (275 unit / 80 Windows Chromium)**.

**Old drafted validation:** `WatchReasons` required canonical UTC timestamps and complete closure provenance; the new manual Save candidate rejected a new resolution before its opening, but the read-only inspector could accept an externally edited historical row where `LastReviewedUTC` or `ResolvedUTC` preceded `OpenedUTC`.

**Clarified proposed rule:** a populated canonical review or resolution UTC must be **at or after** its reason's `OpenedUTC` (equality allowed), including imported/external rows. Such a contradiction is a fail-closed `WATCH_TIME_ORDER` finding: no valid Watch projection and no subsequent managed write until the workbook is reconciled. This neither approves automatic thresholds nor authenticates actor labels.

**Traceability/impact:** synchronized the human proposal and JSON Watch constraints while retaining proposal version `0.1.2` and unchanged approved sheet shape. Six synthetic QA scenarios added; no legacy `ProjectWBS`/`UpdateHistory` change, release, main merge or corporate workbook migration. **Product Owner field-level review still required** before freezing the additive extension.

## 2026-11-12 — Revision 0.1.2 (approved scope; full field contract still DRAFT)

**Source:** Owner “proceed” following [Issue #25 scope decisions](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6812740341); [canonical disposition](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md).

**SCH-01 approved:** five ordinary worksheets `ProjectMeta`, `ProjectCalendar`, `WatchReasons`, `ProjectCommitments`, `ProjectAudit` while protecting `ProjectWBS`/`UpdateHistory`.  **CAL-02 approved:** initial maximum one enabled inclusive blackout interval. **SEQ-01 approved:** persist Calendar with blackout-aware days as part of the integrated Watch and Meeting Review delivery package, not an interim session-only implementation. Previous after-Stage-C beta milestone unchanged unless separately reauthorized.

**No implied field-level freeze or code authorization**. One additional **LEGACY-CAL-01 compatibility proposal** distinguishes a fully legacy workbook (calculate existing weekends/holidays with clearly unconfigured blackout) from an invalid partially present extension (fail-closed). Planned test matrix now contains **61 cases**, no executed PASS results. Machine JSON and human text advance to internal version `0.1.2`; proposal filename suffix `_0_1_PROPOSED` remains stable to preserve GitHub links and prior review evidence. Open: actor provenance, workbook multiwriter safety, automatic watch thresholds, Report 1.1 name-source compatibility, precise field validation and migration/defaults.

## 2026-11-12 — Revision 0.1.1 (Owner correction, NOT FROZEN)

**Source:** [Issue #25 comment #6812583483](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6812583483).

| Contract | Old proposal v0.1.0 | Revised v0.1.1 | Reason and impact |
|---|---|---|---|
| **CAL-RULE-01 Days Remaining** | Blackout saved to Excel but excluded only from Gantt/PGCM days; `remainingWorkdays` logic unchanged | **Enabled committed project blackout dates must be excluded from Days Remaining** alongside weekends/Japanese public holidays, once per date, from Today-exclusive to Finish-inclusive. Preserve missing-calendar Unknown/inactive cases | Explicit Owner correction; changes actual working-day calculation, Task Detail and Gantt numbers; data logic and test plan change required |
| **NAME-01 Project name** | `ProjectMeta` had ProjectID and schema version only, app title currently inferred from filename, Report 1.1 project title browser-local | **Required `ProjectMeta.ProjectName`** as shared Excel data, shown in application/project header, Calendar context/title and HTML `document.title` (safe text), with no filename/local-source substitution | Explicit Owner correction; new validation and auditing; affects legacy workbook import/new project flow and report name-source contract |
| **NAME-REPORT-01 Report 1.1** | Report workspace local project-name preference per frozen #7 | Workbook name should be authoritative shared project identity; **separate targeted Report 1.1 specification amendment** before changing generated report headers or existing draft code | Prevent silent retroactive change to an already frozen/authorized report contract |
| **QA** | 49 designed test scenarios, no executed results | **60 designed test scenarios**, adding blackout overlap/counting and project name/legacy/title/cross-user cases | Preserve existing test IDs and historical evidence, no test PASS asserted |

**Spec state after revision:** Workbook ownership directions are owner-approved, but the concrete five-sheet additive extension, exact input details, transaction and execution scope remain **PROPOSED**. Previously requested **CAL-RULE-01 preserve-old arithmetic** is formally **superseded**, not an open question.

**Frozen contract impact:** New sheets/requirements must be versioned against existing frozen #3; project/calendar UI separated from browser-local #6; #7 local report-name contract requires narrowly scoped amendment. Preserve legacy source integrity, #2/#11 write/recovery, read-only variant, approved DES-012 visual reference. No production branch mutation, CI run, UAT package or merge authorized.

## 2026-11-12 — Initial proposal 0.1.0

**Source:** [Owner workbook source-of-truth clarification](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md).

Five additional ordinary Excel worksheets were proposed: `ProjectMeta`, `ProjectCalendar`, `WatchReasons`, `ProjectCommitments`, `ProjectAudit`. Existing `ProjectWBS` and `UpdateHistory` remain intact. Project facts live in workbook, personal display/PGCM preference/recent files in browser. Legacy read-only inspection, safe verified Save, no-op and source-conflict protections proposed.

**Original v0.1.0 was a draft, not a frozen approved schema.** The working file retains the suffix `_0_1_PROPOSED` for stable GitHub links, while its internal version and machine contract have advanced to **0.1.1**.
