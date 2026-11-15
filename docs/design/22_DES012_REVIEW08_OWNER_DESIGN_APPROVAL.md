# DES-012 / Consolidated Design Review 08 — Product Owner Visual Approval

> **SUPERSEDING CURRENT VISUAL PRECEDENCE — Product Owner, 2026-11-13:** [DEC-UI-2026-11-13](32_DES012_SOLE_CROSS_VIEW_UI_BASELINE_OWNER_DIRECTIVE_2026_11_13.md) makes the **exact DES-012 Review08 HTML the SOLE approved UI baseline for Schedule, Meeting Review, Task Detail AND REPORTS**. Earlier Report 1.1 Review02 prototype is **historical**, not a separate or higher-priority Reports visual authority. Preserve frozen Report 1.1 functional behavior, but derive all current visual decisions from DES-012. If older material below refers to Report02 as prevailing visual design, that statement is superseded. The PR60 partial UI remains noncompliant. No new UAT package or release is authorized by the new baseline decision.

**Decision ID:** DEC-DES-012-OWNER-APPROVAL  
**Date:** 2026-11-11 JST  
**Authority:** Product Owner (Kenny619), [Issue #25 owner comment #6784148471](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6784148471)  
**Exact owner wording:** “Looks very nice. Confirmed and approved the design applied on the last HTML.”

## Approved source (immutable exact-artifact reference)

- Full interactive source: [`design/concepts/DES-012-consolidated-review08-task-detail.html`](../../design/concepts/DES-012-consolidated-review08-task-detail.html)
- **Approved exact HTML Git blob:** `de6ebaa63aa035ba741b4435cf1cdb9d1166d958`
- Commit that introduced the HTML on design branch: `5f6d2f568fc469446ef740e1076e1d0ea893fed8`
- Prior [DES-011 option study](../../design/concepts/DES-011-task-detail-timeline-study.html) with approved **Option A** and [explicit owner approval #6783748216](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6783748216).
- Design-only branch: `design/ui-overhaul-foundations-v0.1`. No merge of design prototype into product code is implied.

**Disposition:** Complete integrated three-page visual design **APPROVED as Design Office reference** for subsequent parity review and engineering design adaptation. This is **not** acceptance of managed-product functionality, workbook safety or owner UAT.

## Confirmed design scope

1. **Schedule:** Original full Gantt visual capability and controls retained as the target; one control row; Exceptions/Workstreams selector local to chart header; independent text Search and column-multiselect Filter; active-filter count and downward triangle column indicators; controls for Day/Week/Month/Quarter, timeline navigation, Dependencies and Hide inactive toggles; WBS/Task, Owner, Finish, Status and timeline; visible nonworking-day shading; blackout configuration under Settings. Preserve actual existing Gantt engine, not synthetic replacement.
2. **Meeting Review:** Approved meeting layout with same separate search/filter behavior, status hierarchy, internal scroll and consistent task inspector.
3. **Reports:** **DES-012 Review08 Reports page itself is the current approved visual authority** (report builder, document preview, mode selector, control placement, spacing, hierarchy, styling and theme). Historical Report Review02 visual treatment has been superseded as an independent design authority by the 2026-11-13 Product Owner precedence clarification. Frozen Report 1.1 *functional* requirements for reports, HTML/text, copy/export and audit fidelity remain in force.
4. **Task Detail inspector across Schedule and Meeting:** Persistent task title/status/WBS/workstream + Edit/History; compact Owner/Priority; **Option A integrated timeline rail** for Start/Finish, working-calendar days remaining, only genuinely recorded Progress; distinct missing-progress state and stable layout; task type and full multiline Description; navigable Parent, Predecessors and Dependents with return context; chronological, append-only Updates; in-place Edit and protected Save/Discard/Cancel interaction pattern; fixed panel proportions, independently scrolling details.
5. **Shared visual language:** Consistent spacing, typography, panel proportions, semantic status appearance, light/dark, stationary global navigation and right Settings/History drawer.

## Critical distinctions and boundaries

- **Visual prototype interactions are fictional design demonstrations.** Synthetic success messages, tasks, calendar examples, Save behavior and history are not proof of production features, database/workbook persistence or physical Edge UAT.
- Existing frozen managed workbook/edit/history/settings specifications (#3–#6), separately frozen Report 1.1 (#7), prior safety/backup/recovery gates and read-only v18 code remain authoritative.
- **Permanent Meeting Review business logic, Under Watch risk/watch state and persistence, blackout project storage, task-creation/dependency-editing scope** remain separately governed and are not newly authorized by this visual approval.
- No PR merge, release, deployment, tag, corporate data use or waiver is approved.
- The previously recorded **design / requirements reconciliation HOLD** remains in force for product UAT kit promotion until functional coverage, visual parity and unresolved business contracts are reconciled.

## Next controlled work

1. Treat the exact approved HTML blob as reference; retain prior design concepts as historical evidence.
2. Create a view-by-view UI/feature parity matrix against real managed components; explicitly classify missing, fictional and functionally unauthorized elements.
3. Reconcile remaining functional specifications, especially Meeting Review and Under Watch, **without altering the accepted visual baseline**.
4. Only after separate, explicit scope authorization, integrate using existing real Gantt/editor/workbook/report engines and run exact-SHA visual and functional regression plus physical Edge UAT.

**Owner input required now:** None for Review 08 design. Return to the Owner only for future material design changes or functional-scope decisions.
