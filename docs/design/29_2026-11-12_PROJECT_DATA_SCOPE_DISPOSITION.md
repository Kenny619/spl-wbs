# DEC-EMV-PROJECT-DATA-SCOPE-2026-11-12 — Owner direction to proceed

**Date:** 2026-11-12 JST · **Source:** Product Owner response “proceed” to the immediately preceding [Issue #25 schema review / comment #6812740341](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6812740341).  
**Status:** **Owner-approved recommended scope/delivery directions**, not blanket field-level specification freeze, implementation authorization, physical UAT acceptance, beta/release approval or merge.  
**Visual baseline:** [DES-012 Review 08](../../design/concepts/DES-012-consolidated-review08-task-detail.html), exact approved HTML blob `de6ebaa63aa035ba741b4435cf1cdb9d1166d958`.  
**Workbook owner:** [Decision 28](28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md).  
**Draft human + machine contract:** [proposed extension v0.1.2](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md) + [JSON](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.json).

## Decisions approved to advance

| ID | Approved scope direction | Hard boundaries |
|---|---|---|
| **SCH-01** | **Five additive ordinary Excel worksheets**: `ProjectMeta`, `ProjectCalendar`, `WatchReasons`, `ProjectCommitments`, `ProjectAudit`; existing `ProjectWBS` and task-only `UpdateHistory` remain unchanged. | Sheet **shape and ownership approved**. Individual column validators, missing metadata compatibility, actor identity, risk rules, Save concurrency and field-level freeze still require technical validation and versioned review. Never modify frozen #3 retrospectively. |
| **CAL-02** | Initially **one active enabled inclusive blackout date interval** per project, stored in `ProjectCalendar`; sheet may support additional ranges only under a future explicitly authorized multi-range UI/logic contract. | Avoid silently accepting overlapping multiple active intervals in the initial implementation. |
| **SEQ-01** | Treat persistent shared Project Calendar, blackout-aware remaining days, genuine workbook-backed Under Watch and Watch-aware Meeting Review as a **dependent integrated delivery package**. Do not ship a session-only Calendar or status-only Meeting Review as an accepted end-state. | This approves *dependency/delivery grouping*, **not** an exact stage/date, Stage A–C scope change, or new beta gate. Previous roadmap retains beta after completed Stage C unless Owner later explicitly changes beta scope. |

## Already owner-decided and not being reopened

- **Project workbook is the authoritative shared project source:** project WBS entities, Task Updates, task UpdateHistory, Watch reasons/events, accepted commitments, blackout dates and project change audit.
- `ProjectMeta.ProjectName` is required shared Excel project identity, displayed in global UI, Calendar and browser HTML/document title. Workbook filename, browser-local Report 1.1 project name and per-user settings do not override it. Report 1.1 name-source contract remains frozen under #7 until a **separate narrow amendment**.
- Committed enabled blackout dates **reduce remaining eligible working days**, in addition to weekends and Japanese holidays, with each day excluded once even when exclusions overlap. Existing Today-exclusive → Planned Finish-inclusive boundaries, inactive handling and Unknown when necessary holiday/calendar data are not reliable remain.
- Theme, columns, PGCM **display** preference, timezone, filters/zoom and recently opened files remain local to each browser/device.
- **MR-D01 B**: Meeting Review's first functional release must be integrated with real Watch.
- **WATCH-D02/D03 A**: reason-based Watch / Clear / Unknown, no invented Red/Amber; low-friction audited Resolve and accepted revised commitments.

## Implementation and product-integrity gates

1. **Scope approval is distinct from full column-schema freeze.** The five-sheet organization is endorsed. Exact typed column meanings and migration/default/actor/provenance rules must be consistent in proposed human and machine contracts and independently reviewed before a final version freeze. In particular, `ProjectAudit` cannot be smuggled into existing task-only `UpdateHistory`.
2. **Legacy compatibility:** ordinary task editing on an old `ProjectWBS` workbook remains usable without silently creating extension sheets. Explicit project-data first Save requires a verified project name. Avoid treating “never configured blackout” as a saved factual project setting or imposing a fabricated risk health classification.
3. **Save consistency:** source hash, preflight, dry-run candidate, backup, verified readback, no-op semantics, stale-source refusal and recovery must remain. Same committed XLSX = same data, not auto-live updates or safe simultaneous writers on separate synced copies.
4. **Roadmap:** prior #1 beta milestone after stages A–C remains. Treat Calendar+Watch+Meeting as a coherent separately gated package and reconcile its place in delivery plan without silently blocking or broadening already authorized stages.
5. **Feasibility work is permissible as read-only technical review using synthetic examples and a disposable standalone workbook proof**, under existing #2/#11 engineering safety constraints; no production feature work/merge without full contract and bounded authorization.
6. **Future functional rules outstanding:** automatic watch signal registry, trusted sources and Unknown/Green completeness; original vs revised commitment acceptance; source provenance for actor attribution; exact Calendar/Watch first-run metadata behavior; Report 1.1 local-name source transition; actual shared-file lock/conflict feasibility. Those are **not** deemed approved by “proceed.”

## Next workstream handoff

- Update proposed human/JSON + changelog to mark **SCH-01, CAL-02, SEQ-01: OWNER-APPROVED SCOPE**, remaining details open and proposal **not yet fully frozen**.
- Define precise technical acceptance criteria and rollback/fail-closed behaviors to make the extension implementation-ready without claiming an external shared-service backend.
- Prepare bounded F1 workbook/OOXML feasibility work for independent QA on **synthetic project data only**. Reuse existing #11 spike rather than duplicate issue governance.
- Produce a compact Watch functional-rule registry for future owner review only where actual business policy is missing.
- Preserve DES-012 exact visual design, existing Gantt source, read-only SharePoint viewer, accepted Reports Review 02 aesthetics and latest-only downloadable UAT packaging rules.

**No product code change, existing issue closure, stage release, merge, enterprise-data migration, real-file write, CI PASS or UAT PASS is implied by this decision.**
