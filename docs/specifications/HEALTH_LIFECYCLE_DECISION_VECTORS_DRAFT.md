# SPT-WBS | Manual PM-Owned RAG — Decision Register and Acceptance Vectors

**Status:** Stage B documentation draft, reconciled **2026-11-18 JST**, **NOT FROZEN**. The latest Product Owner direction in [Issue #82](https://github.com/Kenny619/spl-wbs/issues/82) **supersedes** the previous proposed Under Watch / reason lifecycle / Clear and automatic RAG design. Historical decisions remain in issue comments and Git history; they do not govern the new RAG target where inconsistent. Functional candidate: [HW-FUNC-0.4](HEALTH_LIFECYCLE_FUNCTIONAL_FREEZE_CANDIDATE.md).

## 1. Binding owner decisions

| ID | Current owner directive | Safe technical consequence |
| --- | --- | --- |
| **HW-01** | Each valid WBS item **Green by default**; PM may set Amber or Red. Exactly three RAG states. | A valid legacy item without an explicit saved RAG is Green. No Unknown or Clear badge. A failed/unsupported workbook is a load error, not a fourth RAG. |
| **HW-02** | **Never automate RAG**. | Existing approved *effective TaskStatus* schedule/dependency computations are independent, readonly and cannot write or derive RAG. |
| **HW-03** | Authorized PM manually returns Amber/Red to Green after remediation. | No automatic clear/downgrade; previous Amber/Red and material-impact history remain auditable. Current badge is latest explicitly saved valid PM selection or Green default. |
| **HW-04** | Under Watch and Clear **obsolete** in target specification. | Remove future current Watch status, reason Add/Resolve/Reopen, separate reason aggregation, Watch filter and Watch-specific report controls. Preserve already saved legacy Watch/audit records via reviewed versioned migration. |
| **HW-05** | Only authorized PM edits RAG. | PM Mode gate to be specified; shared password ≠ authenticated identity and does not prevent direct Excel writes. Never claim verified actor. |
| **HW-06** | TaskStatus independent of RAG. | Valid combinations include In Progress/Amber, Blocked/Green, Completed/Red, Not Started/Green. |
| **HW-07** | One shared current RAG across applicable views, future Report 1.1 replacement. | Report current snapshot vs period-valid RAG transitions separately, no report writes or historical backfill, preserve workstream grouping and export parity. |
| **HW-08** | Shared workbook truth, manual history protected. | Future additive schema/audit design, Save/backup/concurrency checks, legacy read-only history and unsupported-file rejection need separate authorization. |

### Preserved HW-02 execution-status approvals (NOT RAG)
- Recorded TaskStatus never automatically overwritten. Verified, read-only **effective TaskStatus** may derive an *At Risk execution-status warning* for active scheduled **leaf Task** at **0–5 inclusive working days** with progress <50%, recorded Not Started or no substantive current Updates. Old meaningful updates qualify; stale-age rules deferred.
- Active overdue work gets separate **Overdue**, not automatic effective At Risk solely because it is late. Milestones do not get automatic near-finish At Risk from missing progress/Updates/Not Started; Summary only displays child-sourced exceptions.
- Only validated Finish-to-Start predecessor chains propagate effective Blocked, with root-source TaskIDs; Completed/Cancelled successors retain terminal status and stop inherited propagation, with contradiction notice. Invalid graph/source quality never produces fabricated Blocked.
- All workday calculations use verified business calendar and committed shared blackout; common evaluation-date/filter semantics still to finalize in [HW-02 PR #101](https://github.com/Kenny619/spl-wbs/pull/101).
- **None of these calculations modifies RAG or creates RAG change history.**

## 2. Target UAT / independent QA scenarios (designed; NOT EXECUTED)

| ID | Synthetic scenario | Required result |
| --- | --- | --- |
| **R-01** | Open a valid new/legacy workbook with WBS items and no manual RAG data | Every item displays **Green (default)**, with no write necessary and no RAG Unknown. |
| **R-02** | PM manually sets In Progress Task A from Green to Amber | TaskStatus stays In Progress; current RAG Amber only after successful guarded Save; audit captures old/new RAG. |
| **R-03** | PM manually sets Task A Amber → Red, then Red → Green after remediation | Current RAG Green; **both earlier Amber and Red retained historically**; no independent Clear/Resolve operation. |
| **R-04** | Date becomes overdue while RAG remains Green | Separate Overdue indicator is visible; RAG **stays Green**. Never auto-Amber/Red. |
| **R-05** | Verified near-finish criteria calculate effective At Risk while PM-set RAG is Green | Effective TaskStatus At Risk with provenance; RAG remains Green. Recorded source TaskStatus unchanged. |
| **R-06** | Recorded Blocked Task or validated inherited effective Blocked but PM-set RAG Amber | Each status shown independently; no auto-Red, no RAG edit/audit event. |
| **R-07** | PM manually sets Completed item to Red | Display Completed + Red (if valid source); completion does not auto-clear RAG. |
| **R-08** | One parent Summary with Red child, parent manually Green | Parent remains Green; Red child may appear in child-exception rollup, **not a parent RAG mutation**. |
| **R-09** | Previously accepted WatchReasons row is Open, but there is no saved explicit RAG for its item | New target RAG shows **Green default**, with transparent accessible legacy history; no automatic Watch→Amber/Red mapping. Must not delete prior Watch source/audit. |
| **R-10** | Read-only Viewer loads project with Amber/Red RAG | Viewer shows shared saved RAG/history; no manual RAG write affordance. Personal dark mode/columns remain local. |
| **R-11** | PM attempts RAG edit without PM Mode | Reject write without changing current RAG or audit. Password unlock never claims verified personal identity. |
| **R-12** | PM Mode unlocked but stale workbook, concurrent writer or backup/recovery error | No false success, partial RAG write, lost audit, corrupt workbook, or gate bypass. |
| **R-13** | Valid older schema has no RAG field; unreadable/future schema is then loaded | Valid old source → Green default; invalid/future/unverifiable source → explicit load/error handling, preserve bytes and no forced Green. |
| **R-14** | Report chosen period predates a current Amber edit | Current snapshot may say Amber now; period history does **not** falsely claim the edit happened during the selected period. |
| **R-15** | Report current RAG and period transitions output HTML/plain/Outlook | Same facts, workstream groups and correct time basis; no Excel writes from report operations. |
| **R-16** | Green→Amber action with no change to recorded TaskStatus | Only RAG and approved audit fields change, through guarded Save, no effective TaskStatus recalculation side effect. |
| **R-17** | PM selects same RAG as current | Treat no-op as no change event; do not create fabricated assessment history. |
| **R-18** | Auto overdue flag clears due to verified schedule correction | RAG unchanged, independent previously saved PM health assessments and history intact. |
| **R-19** | Migration from existing accepted five-sheet workbook to future version | Preserve WatchReasons/ProjectAudit/UpdateHistory and backups; old clients/future-version behavior explicitly tested; no silent Watch-to-RAG mapping. |
| **R-20** | A previously material Red issue is remediated and PM manually sets Green with explanation | Current Green; historical Red impact and prior assessment preserved. No rule forces current Red to persist indefinitely. |

## 3. Superseded scenarios — DO NOT BUILD as future product

- Watch reason Open/Resolved/Reopened UI lifecycle, reason-specific precedence and multi-cause aggregation as a separate status model.
- Resolving the last Watch reason and invoking Clear.
- RAG Unknown, auto-Green on reason closure, persistent current Red after authorized manual Green, and any automatic schedule→RAG classification.
- New UAT for obsolete Watch editing beyond minimum **legacy data preservation and migration regression**. The Stage A manual Watch tests were accepted previously and do not need full replay for this policy change.

Historical Watch rows are not discarded, nor should old audit entries be falsified. Any old page/filter/report surface remains in the accepted running application until a separately authorized migration replaces it; the table above is the future target.

## 4. Remaining design decisions and gate

1. **PM authority model:** project-scoped vs device-local verifier, setup/rotation/reset/recovery, unlock timeout, exact edit permissions. Shared PM password gate cannot prove personal identity; do not store plaintext client secrets. [PM Mode draft #100](https://github.com/Kenny619/spl-wbs/pull/100) must eliminate old Watch-specific edit permissions.
2. **RAG persistence and minimal explanation:** propose one per-item RAG field plus append-only old/new/timestamp/reason history, guarded workbook Save and report event source. Exact fields and mandatory note rule need later owner-reviewed schema approval.
3. **Retirement/migration:** preserve all existing five-sheet Watch/audit data, disable new Watch editing in the future RAG product only after approved transition, maintain read-only historical access, version and rollback.
4. **Reports:** freeze a new Report 1.1 delta only after agreed target UI, with RAG replacing current Under Watch sections; no changes to accepted report before then.
5. **Effective TaskStatus edges:** finish the already-authorized HW-02 date/filter/incomplete-source technical decisions independently; do not reopen the completed task-type, 0–5 day, overdue and terminal-successor approvals.

**Current status:** Owner **has approved the new high-level manual RAG policy**; these documents are reconciled specification drafts, **not** an overall functional freeze. No implementation, schema/password creation, main merge, or beta authorization follows from the update.
