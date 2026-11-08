# SPT-WBS Product Experience / UI Design Workstream

**Status:** D2 DIRECTION ENDORSED; D3 source regression PASS, visual review PENDING — PROPOSED v1.8; not a frozen specification. **Date:** 2026-11-08 JST. **Controlling issue:** [#25 — UI overhaul](https://github.com/Kenny619/spl-wbs/issues/25).

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
- [DES-003 historical prototype](../../design/concepts/DES-003-filtered-meeting-and-weekly-report.html): task-list-first filters, dependencies and weekly stakeholder reporting (retained for historical visual comparison).
- [09 — DES-004 single-header, list-scroll, fixed-detail and days semantics](09_DES004_FIXED_DETAIL_AND_DAYS.md): owner feedback mapping, viewport/scroll rules, terminology and validation.
- [DES-004 historical prototype](../../design/concepts/DES-004-single-header-fixed-detail.html): single-header, list-scroll, selected-detail and WBS identity exploration; retained for provenance.
- [10 — DES-005 unified workspace height and fixed navigation](10_DES005_UNIFIED_HEIGHT_AND_NAV.md): panel height, fixed app/report controls, scroll containment and responsive safeguards.
- [DES-005 historical prototype](../../design/concepts/DES-005-unified-height-and-scroll.html): unified full-height workspace, panel-only scrolling and anchored report/header controls; retained for comparison.
- [12 — D2 Owner Direction and D3 Integration Matrix](12_D2_OWNER_DIRECTION_AND_D3_INTEGRATION.md): record exact DES-006 concept endorsement, rejected alternatives, frozen-contract coverage gaps, integrated scenarios and separate design/implementation gates.
- [13 — DES-007 History/Settings/Draft-state integration](13_DES007_HISTORY_SETTINGS_AND_DRAFT_STATES.md): companion interaction study and gaps against frozen #3–#7.
- [DES-007 historical integration concept](../../design/concepts/DES-007-integrated-history-settings-states.html): More/centered-overlay variant, retained for traceability.
- [14 — DES-008 Settings Drawer, History Log and Eight-Day Period](14_DES008_SETTINGS_HISTORY_DRAWER_AND_PERIOD.md): owner feedback disposition, source/version verification, log semantics, default date window and remaining browser/contract gates.
- [DES-008 current interactive integration concept](../../design/concepts/DES-008-settings-history-drawer.html): authentic embedded favicon, v0.0.0 package and v18 UI metadata, fixed Settings button, right-side Settings/History log drawer, and Monday-to-Monday eight-date report default.
- [15 — D3 regression and owner visual review handoff](15_DES008_D3_REGRESSION_AND_OWNER_REVIEW.md): exact validated DES-008 blob, four corrected navigation/focus findings, 29/29 source-mocked regressions, browser evidence limitations and a bounded owner visual checklist.
- [11 — DES-006 consistent selected-task width](11_DES006_CONSISTENT_DETAIL_WIDTH.md): owner design feedback, shared column widths and source validation.
- [DES-006 current interactive design prototype](../../design/concepts/DES-006-consistent-detail-width.html): same selected-task inspector width in Schedule and Meeting Review at the same desktop viewport; DES-005 behavior otherwise preserved.

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

## Owner feedback incorporated in DES-004 / proposed v1.2 (2026-11-08)
- **Retain DES-003 list/detail balance**; do not revert to oversized discussion cards.
- **Remove bottom concept-explanation cards**; these were design scaffolding, not product content.
- **At desktop Meeting Review widths**, keep one persistent upper header and make the **task list** the main vertical scroll region while the detail card stays anchored. Preserve list position while selecting tasks. On narrow/mobile layouts, permit natural page scrolling; long detail content may overflow internally rather than clip.
- **Consolidate top brand/project/navigation into one desktop header row**, with Schedule-specific phase controls shown conditionally.
- Label business-calendar countdowns as **“days”** rather than “workdays,” but **continue excluding weekends, official holidays and project blackouts**. Expose the calendar basis via a small legend/tooltip; do not change the actual business-day calculation or call it remaining effort.
- **Show both Workstream name and WBS code prominently inside the selected task detail** in view and edit states.
- DES-004 [design rationale and 19 source-level smoke checks](09_DES004_FIXED_DETAIL_AND_DAYS.md). Pending rendered Edge/zoom/UAT review; no current product implementation, freeze or merge authorization.

## Owner feedback incorporated in DES-005 / proposed v1.3 (2026-11-08)
- All desktop **Schedule and Meeting Review panels must fill the same available viewport height** below the common top header; no arbitrary compact panel height. Scroll the Gantt/list or selected-task details internally when needed.
- **Reports** likewise occupies the full-height workspace, with its report-specific navigation, time period and Generate/Copy actions always visible; only report content scrolls, not the whole page.
- **Header navigation controls must not jump** between Schedule, Meeting and Reports. Reserve the layout slot for Schedule-only phase actions even when they are hidden, and keep the main navigation track at a constant desktop position.
- Preserve accessibility with natural page scroll and stable responsive header reflow at narrow/zoomed effective widths. Design-only verification includes **18 source-mocked checks**; real Edge viewport and zoom QA is still required.
- Current artifact: [DES-005](../../design/concepts/DES-005-unified-height-and-scroll.html), with [rationale and QA notes](10_DES005_UNIFIED_HEIGHT_AND_NAV.md). No freeze, production implementation, change to v18 or merge authorized.

## Owner feedback incorporated in DES-006 / proposed v1.4 (2026-11-08)
- **Same selected-task panel width in Schedule and Meeting Review:** retain the overall DES-005 visual composition, pane height, scrolling and navigation. The right-hand inspector uses one shared desktop grid-track definition, so it does not jump in width when switching views.
- Continue responsive stacking for narrow/zoomed screens; do not force an inaccessible side-by-side layout.
- Current mock: [DES-006](../../design/concepts/DES-006-consistent-detail-width.html). [Design rationale and 10 source checks](11_DES006_CONSISTENT_DETAIL_WIDTH.md). Owner screenshot review and actual Edge CSS measurement remain pending. No production implementation or merge authorized.

## D2 Product Owner convergence (2026-11-08)
- The Product Owner explicitly endorsed [DES-006](../../design/concepts/DES-006-consistent-detail-width.html) as the **preferred overall working-view concept**, saying “Perfect. I like it. let's continue.” Record this as **D2-DIR-001 — selected layout/information architecture direction**, against the exact DES-006 blob `b833afeefe5fa3392b17efea79589bd7eede390f`. This is **not** a D3 visual specification freeze, UAT acceptance, implementation/merge authority or a change to frozen workbook requirements.
- **Stop redundant A/B layout comparisons.** Use DES-006's stable Schedule/Meeting inspector width, full-height scroll-contained workspace and fixed global/report navigation as the reference for D3 integrated interaction mocks.
- Next: close gaps with frozen task editor, Change History and Settings contracts and distinguish future weekly stakeholder-report risk/creation events from approved history-only v1 reporting. See [D2 decision and D3 integration checklist](12_D2_OWNER_DIRECTION_AND_D3_INTEGRATION.md).
- Actual Edge screenshot/scroll/zoom and owner whole-workflow review are still pending; no speculative app development has been authorized.

## D3 integration-state concept prepared (2026-11-08)
- New [DES-007](../../design/concepts/DES-007-integrated-history-settings-states.html) is a **companion design prototype** built on DES-006, adding a reserved-header **More** menu for Global History/Settings, direct task History from selected detail, synthetic timezone appearance/column/reset controls, and an illustrative three-option Save/Discard/Cancel when navigating away from an actual changed draft.
- It deliberately retains Schedule/Meeting/Reports navigation coordinates, same inspector width, full-height scroll behavior, and existing meeting/report concepts. The accepted DES-006 artifact remains intact.
- Synthetic Save does not write Excel or UpdateHistory. Settings controls are session-only illustrations, not actual theme/column persistence; history is hardcoded sample data; complete draft protection, actual Edge keyboard/visual UAT, workbook conflict handling and full Settings parity remain pending.
- Source-level JS and **11/11 mocked interaction checks pass**; see the [DES-007 record](13_DES007_HISTORY_SETTINGS_AND_DRAFT_STATES.md). This is **not** an owner-approved D3 visual specification freeze.

## D3 owner feedback incorporated in DES-008 (2026-11-08)
- Replace the top-right **More** with **Settings**, housing **Change History** within the Settings pane. Both Settings and global/task-specific Change History open as an **expansible right slide-out**, rather than centered overlay.
- Show actual repository **favicon** (embedded unmodified from `index.html`) and distinguish **package version 0.0.0** (currently placeholder metadata in `package.json`) from the **approved UI baseline v18**. Do not claim a released semver.
- Present read-only History as a compact chronological log, **one row per saved field-change action**, visibly preserving shared Save identity/association without a multi-row box per Save.
- Proposed Update Report default window is **eight inclusive calendar dates**, last same weekday → current review weekday; synthetic Monday Nov 09 returns Monday Nov 02–Monday Nov 09. Custom chosen periods remain supported. This is a **future proposal**, not an amendment to frozen #7.
- Keep DES-006 working layout and navigation positions, and the DES-007 simulated safe edit choices. Source-level checks pass; actual Edge visual, keyboard, accessibility and production workbook tests remain pending.
- [DES-008 artifact](../../design/concepts/DES-008-settings-history-drawer.html) · [decision and traceability record](14_DES008_SETTINGS_HISTORY_DRAWER_AND_PERIOD.md). No app implementation, specification freeze or merge authorized.

## D3 integration regression completed (2026-11-08)
- **D3 source-level interaction gate PASS: 29/29 assertions** against DES-008 Git blob `982b30e2d6f0db339ea7f65f9146ddab8290d197`. Fixed the old dirty-draft dialog remaining visible after entering Settings, unified Save/Discard/Cancel protection across filter/date/stage navigation, and restored expected keyboard focus after drawer rerenders.
- Re-run the contained **owner visual review** in Edge for right drawer, action log, actual scrollbar and nav stability, keyboard/zoom, and inclusive eight-day reporting. See [the D3 handoff](15_DES008_D3_REGRESSION_AND_OWNER_REVIEW.md). Browser screenshot evidence is still **not available**; source checks must not be represented as browser UAT.
- Current accepted v18 and frozen #3–#7 remain untouched. Design PR #29 is still **draft**, and the owner has not authorized final D3 freeze or implementation/merge.

## Decisions needed in dialogue
1. Which core job dominates the first-screen hierarchy: daily schedule authoring/maintenance or rapid schedule inspection/review? Both must remain supported.
2. Should the opening workspace be schedule-first with contextual tools, or action/exception-first with a schedule destination? Test rather than assume.
3. Which information must remain permanently visible during an edit (task identity, context, save state, dependency impact)?
These are open hypotheses, not new requirements.
