# EMV shared-project workbook extension — proposal changelog

**Change-control state:** PROPOSED versions only; **no frozen schema or implementation authorization**.  
**Controlling Product Owner data direction:** [DEC-DATA-2026-11-12](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md).  
**Current proposal:** [human specification](EMV_PROJECT_DATA_0_1_PROPOSED.md) · [machine contract](EMV_PROJECT_DATA_0_1_PROPOSED.json) · [QA plan](../verification/EMV_PROJECT_DATA_0_1_ACCEPTANCE_PLAN.md).

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
