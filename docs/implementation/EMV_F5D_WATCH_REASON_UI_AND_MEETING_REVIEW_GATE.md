# F5d design and QA handoff — Manual Watch reasons in approved Task Detail; genuine Meeting Review gate

**Date:** 2026-11-13 JST  
**Status:** **PROPOSED implementation sequencing**, not a new frozen Watch business rule, owner UAT acceptance, or authority to merge F5c project-data mutations.  
**Controlling references:** [Workbook source-of-truth](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md), [Owner Watch disposition #26](../design/26_2026-11-11_FUNCTIONAL_RECONCILIATION_OWNER_DISPOSITION.md), [proposed Watch model #25](../design/25_UNDER_WATCH_FUNCTIONAL_PROPOSAL.md), [owner-approved DES-012 Review08](../../design/concepts/DES-012-consolidated-review08-task-detail.html), [F5a read model evidence](../verification/EMV_PROJECT_DATA_F5A_WATCH_READ_PROJECTION_EVIDENCE.md), [F5c Add/Resolve draft evidence](../verification/EMV_PROJECT_DATA_F5C_MANUAL_WATCH_CANDIDATE_EVIDENCE.md).  
**Design governance:** Issue #25 and Review08 visual approval remain authoritative; keep Schedule Gantt tools and Reports Review02 polished style. **Do not replace it with a simpler default UI.**

## 1. What can be shown without inferring risk decisions

- In the existing Task Detail / Inspect workspace, show **recorded reason-backed** Under Watch when at least one validated `WatchReasons.State=Open`; show **Unknown** when no open recorded reasons and automatic-check completeness is unavailable. **Do not render Green/Clear, Red/Amber or auto risk scores** until a formally evaluated complete rule set exists.
- Display each recorded reason as a separate episode with type Manual / Recorded Automatic, title, details/evidence reference, opening time, opening actor explicitly marked **unverified**, LastReviewed/Resolution status and link to related project audit. **Matching audit ID is structural traceability, not proof of authenticity.**
- Keep resolved history visible in a secondary expandable area; it must never vanish after a planned date/status change. Show count of remaining open reasons, not a single magic Watch checkbox.
- A detail page should remain usable in the approved fixed-height/scroll-contained layout; preserve WBS number, workstream, dependencies, status, owner and updates. Never make the inspector longer indefinitely because several reasons are present.

## 2. Bounded user actions after detailed schema approval

1. **Add manual reason** from the task whose immutable `ProjectWBS.ID` is selected; one compact inline form: required title, optional details, optional evidence reference. The form does not persist to localStorage as if it were shared.
2. **Resolve** a single recorded **Manual/Open** reason with optional short resolution note. Show exactly which reason is being resolved; never treat resolution as a global “Set Green.” Automatic reasons are displayed but cannot be manually auto-cleared without a frozen rule evaluator.
3. **Confirmation and safety:** a one-step verified Save with inline success/error state, consistent with accepted low-interaction design; no modal stacking. Existing unsaved Task/Calendar guards must not be bypassed. No-op/cancel and stale-source refusal create **zero** audit rows. File permissions, source identity/hash, backup/recovery and postcommit reload must use original F3c writer, never a second code path.
4. **Committed refresh:** only after the saved XLSX source and backup are verified, re-read all reasons, recompute disposition via F5a and update current selected Task Detail, workstream exceptions and any Meeting Review discussion panel. If Save is uncertain, preserve draft and block another write pending recovery; do not show “resolved” optimistically.
5. **Actor attribution:** record user-entered label + `UnverifiedLocal` provenance visibly. No claims of corporate authenticated approvals or individual permissions without a separately approved identity provider.
6. **Date/commitments:** ordinary `ProjectWBS.PlannedEnd` edit never resolves or replaces Watch reasons and never automatically approves a revised accepted commitment. A distinct accepted-reference action stays unavailable until its approval/provenance rules are frozen.

## 3. Meeting Review / Reports staging — explicit dependency

- **MR-D01 B** means first usable Meeting Review must genuinely include Watch. **Do not ship** an interim status-only meeting page labeled “Meeting Review.” The proposed shared discussion panel groups exceptions and workstreams in the Owner-approved fixed-height list/detail pattern.
- An **Under Watch** row is eligible for discussion, but “In discussion,” “Priority,” “At Risk TaskStatus” and “Under Watch” are distinct concepts. Do not silently equate them.
- Preserve full Gantt day/week/month/quarter controls, owner/finish columns, chevrons, dependency toggle, multi-select filters and dark-mode contrast corrections; the user explicitly rejected a simplified replacement.
- Reports 1.1 generated project-name source and any RAG insertion must comply with frozen Issue #7 until a narrow Product Owner amendment. The committed `ProjectMeta.ProjectName` is authoritative for app/browser context, but replacing an already frozen report output contract needs separate approval.

## 4. Recommended verification matrix before Owner UAT

| ID | Test requirement |
|---|---|
| F5D-01 | Manual Add on Task A; workbook `WatchReasons` + `ProjectAudit` append, task `UpdateHistory` unchanged, same committed source reopened by another member yields identical reason |
| F5D-02 | Manual Add on already Completed task retains independent Watch fact |
| F5D-03 | Add two reasons; resolve only first; task remains Under Watch until second resolved |
| F5D-04 | Resolve second; no automatic check evidence → **Unknown**, never Green |
| F5D-05 | Automatic recorded reason cannot be resolved from manual UI |
| F5D-06 | Duplicate reason ID, stale file, unverified source/future schema, unsafe text and orphan TaskID fail closed |
| F5D-07 | Cancel, unchanged submission, concurrent dirty Task/Calendar forms cannot write or fabricate audit |
| F5D-08 | Write interruption/source changed/backup lock retain pending/recovery and never report fake success |
| F5D-09 | Reason opening/closure and both `ProjectAudit`/task `UpdateHistory` times read across timezone preferences; same raw UTC source preserved |
| F5D-10 | Approved Review08 visual parity, fixed list/detail heights, dark-mode statuses, keyboard and focus, no overlapping modal, 2k-row Gantt unchanged |
| F5D-11 | Two sequential editors reading the same **canonical committed file** (not independent sync copies); reload/conflict refusal, Excel-open lock, corporate Windows Edge/Node26 verified |
| F5D-12 | Meeting Review only releases with actual reason-backed Watch and approved accepted-commitment workflow; no status-only substitution |

## 5. Approval boundary / plan

**Ready for independent QA without new policy:** read-only F5a and in-memory/synthetic guarded writer F5c tests. **Not ready for deployment/UI:** field-level v0.1.2 Watch/audit/actor approval, manual reason UX review against Review08, physical shared Excel file safety, accepted commitment semantics, and actual Meeting Review content. Keep all project-data PRs stacked **draft**, preserve original read-only v18 and Report Review02, do not publish old links or an owner UAT ZIP until a tested candidate is authorized and README contains only the latest current package.

**Recommended next execution** after F5c exact-head CI: independent technical QA of both the Watch schema/ledger and existing Task Save fidelity, then propose the narrowly scoped Manual Watch Add/Resolve UI for a Design Office review. No automatic alert thresholds, Green classification, or accepted commitment authority should be invented merely to continue development.
