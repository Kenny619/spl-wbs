# SPT-WBS | Manual PM-Owned RAG — Decision Register and Acceptance Vectors

**Status:** Stage B documentation draft, reconciled **2026-11-18 JST**, **NOT FROZEN**. The latest Product Owner direction in [Issue #82](https://github.com/Kenny619/spl-wbs/issues/82) **supersedes** the previous proposed Under Watch / reason lifecycle / Clear and automatic RAG design. Historical decisions remain in issue comments and Git history; they do not govern the new RAG target where inconsistent. Functional candidate: [HW-FUNC-0.4](HEALTH_LIFECYCLE_FUNCTIONAL_FREEZE_CANDIDATE.md).

## 1. Binding owner decisions

| ID | Current owner directive | Safe technical consequence |
| --- | --- | --- |
| **HW-01** | Each valid WBS item **Green by default**; PM may set Amber or Red. Exactly three RAG states. | A valid legacy item without an explicit saved RAG is Green. No Unknown or Clear badge. A failed/unsupported workbook is a load error, not a fourth RAG. |
| **HW-02** | **Never automate RAG**. | Existing approved *effective TaskStatus* schedule/dependency computations are independent, readonly and cannot write or derive RAG. |
| **HW-03** | Authorized PM manually returns Amber/Red to Green after remediation, with a mandatory **Resolution**. | No automatic clear/downgrade; previous Amber/Red and material-impact history remain auditable. Current badge is latest explicitly saved PM selection or Green default. |
| **HW-04** | Under Watch and Clear **obsolete**; owner confirms **no active Watch data**. | Remove future Watch UI/operations; no conversion, dedicated migration or bespoke Watch historical viewer required. Leave existing workbook data/audit non-destructively intact; no Watch-to-RAG mapping. |
| **HW-05** | Only authorized PM edits RAG. | PM Mode gate to be specified; shared password ≠ authenticated identity and does not prevent direct Excel writes. Never claim verified actor. |
| **HW-06** | TaskStatus independent of RAG. | Valid combinations include In Progress/Amber, Blocked/Green, Completed/Red, Not Started/Green. |
| **HW-07** | One shared current RAG across applicable views, future Report 1.1 replacement. | Report current snapshot vs period-valid RAG transitions separately, no report writes or historical backfill, preserve workstream grouping and export parity. |
| **HW-08** | Shared workbook truth and historical RAG inputs. | Future additive schema/audit for old/new RAG, **Project Impact + Path to Green** on Amber/Red and **Resolution** on return to Green. Save/backup/concurrency, legacy non-destructive compatibility and unsupported-file rejection need separate authorization. |

### Preserved HW-02 execution-status approvals (NOT RAG)
- Recorded TaskStatus never automatically overwritten. Verified, read-only **effective TaskStatus** may derive an *At Risk execution-status warning* for active scheduled **leaf Task** at **0–5 inclusive working days** with progress <50%, recorded Not Started or no substantive current Updates. Old meaningful updates qualify; stale-age rules deferred.
- Active overdue work gets separate **Overdue**, not automatic effective At Risk solely because it is late. Milestones do not get automatic near-finish At Risk from missing progress/Updates/Not Started; Summary only displays child-sourced exceptions.
- Only validated Finish-to-Start predecessor chains propagate effective Blocked, with root-source TaskIDs; Completed/Cancelled successors retain terminal status and stop inherited propagation, with contradiction notice. Invalid graph/source quality never produces fabricated Blocked.
- All workday calculations use verified business calendar and committed shared blackout; common evaluation-date/filter semantics still to finalize in [HW-02 PR #101](https://github.com/Kenny619/spl-wbs/pull/101).
- **None of these calculations modifies RAG or creates RAG change history.**

## 2. Mandatory transition fields — approved, not optional

| Manual RAG transition | Required PM text input | Validation |
| --- | --- | --- |
| Green → Amber or Red | **Project Impact**, **Path to Green** | Both required, separate, nonblank; describe actual/potential impact and remediation conditions |
| Amber → Red or Red → Amber | **Updated Project Impact**, **Updated Path to Green** | Both required and saved as a new assessment, with earlier versions retained |
| Amber or Red → Green | **Resolution** | Mandatory nonblank proof/narrative of completed remediation; keep prior Impact/Path in audit |
| Green → Green / Amber → Amber / Red → Red | None | No-op, no new RAG audit |

All successful RAG changes record item ID, previous/current RAG, supplied required inputs, UTC time and **unverified** edit attribution in an append-only guarded workbook audit, with source conflict/backup protections. No separate Under Watch reason or Clear operation.

## 3. Target UAT / independent QA scenarios (designed; NOT EXECUTED)

| ID | Synthetic scenario | Required result |
| --- | --- | --- |
| **R-01** | Open a valid new/legacy workbook with WBS items and no manual RAG data | Every item displays **Green (default)**, with no write necessary and no RAG Unknown. |
| **R-02** | PM changes In Progress Task A Green → Amber with populated Project Impact + Path to Green | TaskStatus stays In Progress; current RAG Amber only after guarded Save; audit captures both required inputs and old/new RAG. |
| **R-03** | PM changes Amber → Red with updated Impact + Path; then Red → Green with required Resolution | Current RAG Green; old Amber/Red and each Impact/Path version plus Resolution retained; no Clear/Watch operation. |
| **R-04** | Date becomes overdue while RAG remains Green | Separate Overdue indicator is visible; RAG **stays Green**. Never auto-Amber/Red. |
| **R-05** | Verified near-finish criteria calculate effective At Risk while PM-set RAG is Green | Effective TaskStatus At Risk with provenance; RAG remains Green. Recorded source TaskStatus unchanged. |
| **R-06** | Recorded Blocked Task or validated inherited effective Blocked but PM-set RAG Amber | Each status shown independently; no auto-Red, no RAG edit/audit event. |
| **R-07** | PM manually sets Completed item to Red | Display Completed + Red (if valid source); completion does not auto-clear RAG. |
| **R-08** | One parent Summary with Red child, parent manually Green | Parent remains Green; Red child may appear in child-exception rollup, **not a parent RAG mutation**. |
| **R-09** | Existing workbook has obsolete WatchReasons sheet but no active records or explicit RAG for item | Valid item shows Green default; sheet/audit remain untouched; **no dedicated migration or historical Watch UI**; never auto-map Watch→Amber/Red. |
| **R-10** | Read-only Viewer loads project with Amber/Red RAG | Viewer shows shared saved RAG/history; no manual RAG write affordance. Personal dark mode/columns remain local. |
| **R-11** | PM attempts RAG edit without PM Mode | Reject write without changing current RAG or audit. Password unlock never claims verified personal identity. |
| **R-12** | PM Mode unlocked but stale workbook, concurrent writer or backup/recovery error | No false success, partial RAG write, lost audit, corrupt workbook, or gate bypass. |
| **R-13** | Valid older schema has no RAG field; unreadable/future schema is then loaded | Valid old source → Green default; invalid/future/unverifiable source → explicit load/error handling, preserve bytes and no forced Green. |
| **R-14** | Report chosen period predates a current Amber edit | Current snapshot may say Amber now; period history does **not** falsely claim the edit happened during the selected period. |
| **R-15** | Report current RAG and period transitions output HTML/plain/Outlook | Same facts, workstream groups and correct time basis; no Excel writes from report operations. |
| **R-16** | Green→Amber action with no change to recorded TaskStatus | Only RAG and approved audit fields change, through guarded Save, no effective TaskStatus recalculation side effect. |
| **R-17** | PM selects same RAG as current | Treat no-op as no change event; do not create fabricated assessment history. |
| **R-18** | Auto overdue flag clears due to verified schedule correction | RAG unchanged, independent previously saved PM health assessments and history intact. |
| **R-19** | Open accepted five-sheet workbook without active Watch data under new RAG-capable version | Non-destructive source/backups/ProjectAudit compatibility; no dedicated Watch conversion, no Watch-to-RAG mapping, no full legacy Watch test suite. |
| **R-20** | A previously material Red issue is remediated and PM manually sets Green with explanation | Current Green; historical Red impact and prior assessment preserved. No rule forces current Red to persist indefinitely. |

| **R-21** | PM tries Green → Red with missing Project Impact or missing Path to Green | Reject without Save or audit success, show which field needs completion. |
| **R-22** | PM tries Amber → Green with blank/whitespace Resolution | Reject without Save or audit success, preserve current Amber and prior Impact/Path. |
| **R-23** | PM changes Red → Amber but omits updated Impact or Path | Reject new status; require both updated inputs; preserve former Red record. |
| **R-24** | PM successfully returns Red → Green with meaningful Resolution | Green now; previous Red's Project Impact and Path to Green remain historical, and Resolution is recorded with UTC transaction time. |
| **R-25** | PM cancels edit or Save fails after entering both Impact and Path | No partial field update, no premature status transition or history entry. |

## 4. Superseded scenarios — DO NOT BUILD as future product

- Watch reason Open/Resolved/Reopened UI lifecycle, reason-specific precedence and multi-cause aggregation as a separate status model.
- Resolving the last Watch reason and invoking Clear.
- RAG Unknown, auto-Green on reason closure, persistent current Red after authorized manual Green, and any automatic schedule→RAG classification.
- New UAT for obsolete Watch editing beyond minimum **legacy data preservation and migration regression**. The Stage A manual Watch tests were accepted previously and do not need full replay for this policy change.

Owner confirms **no active Under Watch data**. No Watch-specific migration/backfill or special viewer is necessary. Do not falsify/destroy any existing audit bytes. Existing Watch page/filter/report surface in the accepted app stays until a separately authorized RAG implementation replaces it.

## 5. Remaining design decisions and gate

1. **PM authority model:** project-scoped vs device-local verifier, setup/rotation/reset/recovery, unlock timeout, exact edit permissions. Shared PM password gate cannot prove personal identity; do not store plaintext client secrets. [PM Mode draft #100](https://github.com/Kenny619/spl-wbs/pull/100) must eliminate old Watch-specific edit permissions.
2. **RAG persistence:** approved separate Project Impact + Path to Green fields required when setting Amber/Red, and required Resolution on return to Green. Design per-item current fields and append-only old/new/timestamp/all supplied input history; guarded workbook Save and report event source. Exact physical Excel columns/tables require later schema approval; **do not reopen whether these inputs are mandatory**.
3. **Retirement, no active-data migration:** owner confirms no active Watch data; disable Watch editing/surfaces upon separately approved future RAG replacement, preserve existing workbook sheets/audit non-destructively and standard backup/rollback. **No special Watch history UI, backfill, conversion or dedicated migration acceptance gate.**
4. **Reports:** freeze a new Report 1.1 delta only after agreed target UI, with RAG replacing current Under Watch sections; no changes to accepted report before then.
5. **Effective TaskStatus edges:** finish the already-authorized HW-02 date/filter/incomplete-source technical decisions independently; do not reopen the completed task-type, 0–5 day, overdue and terminal-successor approvals.

**Current status:** Owner approved manual RAG policy **and the exact required transition fields**; these documents are reconciled drafts, **not** an overall freeze. No implementation, schema/password creation, main merge or beta authorization follows.
