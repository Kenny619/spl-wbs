# SPT-WBS Product Experience / UI Design Workstream

**Status:** PROPOSED v1.1 for discussion; not a frozen specification. **Date:** 2026-11-07 JST. **Controlling issue:** [#25 — UI overhaul](https://github.com/Kenny619/spl-wbs/issues/25).

## Charter
Design a first-class enterprise project schedule workspace that reduces cognitive and interaction burden while preserving clarity, safety, auditability and powerful WBS/Gantt functionality. Treat **laptop editing** and **office review/sharing** (same screen, conference-room display and video-call screen share) as distinct usage contexts; the same UI density may not serve them equally well. Design deliberately for the complete planned product, not just the original viewer. Work is led through an interactive Product Owner + AI design-director dialogue. There is only one human Product Owner; AI design / engineering / QA roles must be represented truthfully.

## Current reference and provenance
- **Approved current visual target:** v18, [reference/UI_BASELINE_v18_CANDIDATE.html](../../reference/UI_BASELINE_v18_CANDIDATE.html); reference SHA-256: `375425fa94e41ef7d55cc4fac8fe60ad038a2c1095ad04d735bdc1656345ad83`, per [baseline manifest](../../reference/baseline-manifest.json).
- Source mock: [Gantt_Viewer_UI_Mock_v18_Cursor_Baseline.html](../../Gantt_Viewer_UI_Mock_v18_Cursor_Baseline.html). Historical v17 is not current approval authority.
- Current product code: `src/ui/` on `main`. Excel Managed Variant implementation: `feature/excel-managed-v1`, [draft PR #19](https://github.com/Kenny619/spl-wbs/pull/19). Draft branch head at initial inventory: `453c55bd0fc0779a496b8b256fd1cec0e1e5df1f`; expected to change.
- Supporting pain points: [#17 top area](https://github.com/Kenny619/spl-wbs/issues/17), [#22 relationships/dependencies](https://github.com/Kenny619/spl-wbs/issues/22), [#23 entity creation](https://github.com/Kenny619/spl-wbs/issues/23), [#24 project onboarding](https://github.com/Kenny619/spl-wbs/issues/24).
- This is a **source/code review inventory**, not an owner-observed rendering audit. Screenshot review and usability validation follow when the UI overhaul begins.

## Documents
- [01 — Product experience principles](01_PRINCIPLES.md): why and how to resolve trade-offs.
- [02 — UI guideline](02_UI_GUIDELINE.md): initial rules, tokens and testable expectations.
- [03 — Design review and change-control process](03_REVIEW_PROCESS.md): future concept, approval and validation gates **plus post-release feedback, change request and UI issue management**.
- [04 — Meeting workflows and display targets](04_MEETING_WORKFLOWS_AND_VIEWPORTS.md): evidence of weekly live editing versus leadership briefing, provisional resolution/type/density budgets, and scenarios for holistic testing.
- [05 — Persistent risk watch model](05_RISK_WATCH_MODEL.md): hybrid automatic timeline and manual contextual signals, cross-meeting persistence, Green/health ambiguity and separation from meeting priority.
- [06 — DES-001 holistic concept comparison](06_CONCEPT_COMPARISON.md): two complete weekly-review alternatives and leadership briefing, annotated decision matrix and owner review scenarios.
- [DES-001 historical prototype](../../design/concepts/DES-001-holistic-meeting-concepts.html): original concept A/B/Leadership comparison (superseded for current owner critique, retained for provenance).
- [07 — DES-002 owner feedback, design decisions and validation](07_DES002_OWNER_FEEDBACK.md): report/presentation convergence, no separate integrity view, single-panel meeting edit, deadline/workdays visibility.
- [DES-002 historical prototype](../../design/concepts/DES-002-consolidated-review-and-reports.html): consolidated meeting discussion and report presentation (superseded for current critique, preserved).
- [08 — DES-003 filters, dependencies and report-contract implications](08_DES003_FILTERS_DEPENDENCIES_REPORTING.md): owner feedback and design change impacts, calendar/business-day definitions, event-source gaps, and acceptance scenarios.
- [DES-003 current interactive design prototype](../../design/concepts/DES-003-filtered-meeting-and-weekly-report.html): larger filterable task list + compact selected detail with predecessor/successor navigation, holiday/blackout-aware working-day fixture, and synthetic 7-day stakeholder Update Report.

## Boundaries and change control
- **No design implementation, pixel-baseline replacement, issue acceptance, merge, release or approval is implied by these drafts.**
- The v18 design lock and ongoing managed-feature requirements remain authoritative for existing development.
- UI design reviews do **not** join every ongoing feature iteration before the separately authorized overhaul starts.
- Keep every proposed redesign in a dedicated design branch / draft PR, versioned with source links, annotated wireframes, decision log and owner disposition. Merge into the source repository only after explicit Product Owner approval.
- Future artifacts: a task-flow inventory, annotated low-fidelity wireframes, visual concepts, interactive prototypes, state matrix, design tokens, accessibility/performance evidence and accepted baselines. Every mock image should link to its source and design decision, not be an orphan screenshot.

## Owner feedback incorporated in proposed v0.2 (2026-11-07)
1. P8 now accounts for corporate laptop edit ergonomics and shared-screen legibility on meeting monitors or via video calls; separate presentation/review behavior remains a concept to compare, **not an approved implementation requirement**.
2. Font, spacing, row-height and density numbers are acceptable only as candidate starting values. No token decision until full holistic design mocks are reviewed in all relevant contexts.
3. Review governance extends beyond release: GitHub feedback intake, deduplication, triage, severity, owner disposition, proportionate review, release traceability and experience follow-up.
No current v18 code/spec lock is altered. No design-freeze or implementation authorization inferred.

## Additional owner workflow feedback incorporated in v0.3 (2026-11-07)
- Weekly status meetings: sequential WBS review, frequently append Updates and change planned dates/status/owner live; creating tasks live is rare, and later additions are based on separate notes.
- Management/leadership meetings: progress, upcoming milestones, and flagged risks take priority over editing.
- Explore **Working Review** versus **Leadership Briefing** presentation experiences, without assuming separate product modules or changing save contracts. Proposed logical design targets: 1366×768 laptop editing and 1280×720 presentation canvas, with 1920×1080 share output where available; all figures remain hypotheses awaiting holistic mock and video-call validation.

## Additional owner workflow feedback incorporated in v0.4 (2026-11-07)
- Weekly status agenda: **pre-meeting flagging and prioritization** → **exceptions-first discussion across workstreams** → **workstream-grouped WBS update review** → **entity data integrity and closure**.
- Workstream order is already reflected in much of the WBS structure. Retain that hierarchy, do not flatten permanently.
- The same task appears in both exception and workstream navigation contexts; any meeting-only reviewed marker must not mutate real task status.
- Flag-source semantics are still a design question; existing risk/overdue indicators are candidate signals, not automatic equivalents of pre-meeting curated flags.
- Added to the [meeting workflow study](04_MEETING_WORKFLOWS_AND_VIEWPORTS.md) and [UI guideline](02_UI_GUIDELINE.md) without approving meeting-session features or save-contract changes.

## Additional owner risk-monitoring feedback incorporated in v0.5 (2026-11-07)
- Flagging is hybrid: timeline-impacting risks automatically detected; contextual risks from stakeholder communication manually flagged by the project operator.
- Once Under Watch, a task remains flagged across meetings until it returns to Green. Multiple active sources must not cancel one another silently.
- Proposed design separates TaskStatus, delivery health, persistent watch and meeting priority/review markers. Current TaskStatus contract does not contain a Green state; formal Green definition and persistence architecture remain open product questions. See [risk watch model](05_RISK_WATCH_MODEL.md). No implementation approval implied.

## Additional owner direction explored in v0.6 (2026-11-07)
- Preferred direction for discussion: **derived / risk-driven Green**, instead of manually assigning Green as a direct task health input.
- Green requires current/reliable automatic checks with no active schedule risks **and** explicit resolution of all outstanding manually flagged contextual risks. Amber/Red thresholds are still open. Unknown risk state must not be displayed as Green.
- Important unresolved case: extending planned dates can erase calculated overdue conditions but not necessarily undo the impact on the original commitment. Documented in [Risk Watch Model](05_RISK_WATCH_MODEL.md) as a high-priority design question.
- This is **exploratory owner preference**, not acceptance of any risk algorithm, new workbook data structure, or delivery implementation.

## Additional owner design direction explored in v0.7 (2026-11-07)
- Preserve agreed commitment impact when planned dates change, but **do not equate all historical slippage with ongoing risk**. Avoid eternal watch flags after genuinely resolved/accepted changes.
- Favor a versioned reference commitment (explicitly agreed, not merely the first recorded date), current plan, separate unresolved risk reasons, and auditable historical variance. Current managed `UpdateHistory` supports changes but **does not prove approval**.
- Propose contextual inline impact review only for material/adverse commitment changes; ordinary edits keep the approved explicit Save flow. Replan acceptance does not erase the prior target or clear unrelated risks.
- Pending key decision: who/what can accept a revised commitment (operator confirmation vs recorded external approval vs impact-based hybrid)? See [Persistent Risk Watch Model](05_RISK_WATCH_MODEL.md).
- No baseline data field, replan workflow, approval authority or forecasting functionality authorized by this exploration.

## Product Owner design-direction decision incorporated in v0.8 (2026-11-07)
- **Proportional commitment acceptance selected as design direction:** for low-impact routine replanning, the project operator may record an accepted revised commitment; for materially consequential revisions, capture evidence of the appropriate stakeholder/decision-maker's agreement.
- Merely saving a new planned finish does **not** constitute accepting or authorizing a changed commitment. Preserve planned/current vs agreed/accepted dates and previous commitment history.
- When approval is pending, retain a meaningful impact/Under Watch state; cleared historical variance alone should not keep a task permanently watched.
- Minimize administration with contextual inline impact acknowledgement rather than a separate approval workflow/modal for every task edit.
- Details such as materiality, external evidence, audit fields, authority and data model **are not frozen/authorized**. See [Persistent Risk Watch Model v0.4](05_RISK_WATCH_MODEL.md).

## D1 concept exploration started in v0.9 (2026-11-07)
- Created [DES-001](../../design/concepts/DES-001-holistic-meeting-concepts.html), a standalone, editable HTML design **simulator** comparing **Schedule Canvas A**, **Meeting Guide B**, and **Leadership Briefing**. Synthetic project data only; simulated Save does not write Excel.
- Recorded an [annotated, scenario-led comparison](06_CONCEPT_COMPARISON.md), including trade-offs and unresolved integration concerns (retaining WBS context versus video-call comprehensibility).
- This is **not implementation or rendered visual acceptance**. Visual QA at relevant laptop and presentation viewports, accessibility evaluation and user concept selection are pending. No numeric UI tokens or new feature contract frozen.

## Owner prototype feedback addressed in proposed v1.0 (2026-11-08)
- **Report/presentation convergence:** Leadership presentation now explored as **Present**, an optional reading experience of Output Reports' Latest Status / Update Report content; frozen EMV-REPORT-1.0 **still specifies plain-text output**, exact copy/preview parity and committed source data. Rich presentation is not authorized by the frozen contract.
- **No distinct Integrity stage** in weekly review; incomplete fields, if relevant, should remain discoverable within ordinary workstream review.
- **Meeting layout simplified:** agenda + one prominent selected-task panel. An **Edit task** action reveals fields and update composer inline; remove duplicate Active Discussion versus Task Detail panels.
- **Deadline clarity over decorative progress:** emphasize finish date and *remaining working days* in the selected-task view, schedule rows and report presentation. Gantt bars convey schedule spans, never fabricated percent complete. The demo fixes its date to Nov 08 2026 and excludes sample JP holiday Nov 23, **not** project blackouts or custom calendars.
- Current review artifact: [DES-002](../../design/concepts/DES-002-consolidated-review-and-reports.html). Source-level behavior smoke passes; visual, device, accessibility and owner acceptance still pending. See [full decision record](07_DES002_OWNER_FEEDBACK.md).

## Owner feedback incorporated in DES-003 / proposed v1.1 (2026-11-08)
- Reallocate Meeting Guide surface area toward an information-rich task list; the selected detail remains compact and supports inline editing.
- Make the agenda area actionable **filters**, not large summary counts: Exceptions, Workstreams/All, Due Today, Due in <5 working days, plus Workstream and Owner (including Unassigned). Source tasks remain unique; selection and linked-task navigation are preserved.
- Show both **predecessor** (what a task depends on) and **successor** (tasks that depend on it) records, with clickable ID-based task links. No invented external SharePoint URLs.
- Working-day simulation now excludes Japan's official November 2026 holidays **and project-specific sample blackout dates**. Count semantics/fixture are documented, while actual persistent project-owned calendar remains proposed in Issue #20.
- Proposal for future weekly **Update Report**: default inclusive last seven calendar dates; highlight completed/added tasks, new risks and released watches, other meaningful changes, with no stakeholder-facing Save-event count. **Frozen #7 still expressly requires Save counts and only UpdateHistory**; new lifecycle sources and requirement-change approval are not yet granted.
- **Latest Status** task lists show Workstream headings and Owner per task without redundant bracketed workstream prefixes.
- DES-003 is a design prototype, not an authorized change to v18, Excel Managed contracts, task creation, risk engine, settings, or product code. See [decision study](08_DES003_FILTERS_DEPENDENCIES_REPORTING.md).

## Decisions needed in dialogue
1. Which core job dominates the first-screen hierarchy: daily schedule authoring/maintenance or rapid schedule inspection/review? Both must remain supported.
2. Should the opening workspace be schedule-first with contextual tools, or action/exception-first with a schedule destination? Test rather than assume.
3. Which information must remain permanently visible during an edit (task identity, context, save state, dependency impact)?
These are open hypotheses, not new requirements.
