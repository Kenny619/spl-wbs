# SPT-WBS Product Experience / UI Design Workstream

**Status:** PROPOSED v0.5 for discussion; not a frozen specification. **Date:** 2026-11-07 JST. **Controlling issue:** [#25 — UI overhaul](https://github.com/Kenny619/spl-wbs/issues/25).

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

## Decisions needed in dialogue
1. Which core job dominates the first-screen hierarchy: daily schedule authoring/maintenance or rapid schedule inspection/review? Both must remain supported.
2. Should the opening workspace be schedule-first with contextual tools, or action/exception-first with a schedule destination? Test rather than assume.
3. Which information must remain permanently visible during an edit (task identity, context, save state, dependency impact)?
These are open hypotheses, not new requirements.
