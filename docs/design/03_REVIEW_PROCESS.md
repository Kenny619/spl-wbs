# SPT-WBS UI Design Review & Change Control — draft 0.1

**State:** PROPOSED, 2026-11-07. **Controlling issue:** [#25](https://github.com/Kenny619/spl-wbs/issues/25). This is the **future overhaul review process**, not a new approval gate for current feature iterations.

## Roles
- **Product Owner (sole human):** user outcomes, design direction, requirement exceptions, design freeze, final visual UAT and release/merge decisions when required.
- **UI Director (AI support):** research, design system, adversarial critique, concepts, accessibility assessments, decision/evidence traceability; makes recommendations but cannot self-approve owner decisions.
- **Development agent:** estimates/design feasibility and implements only authorized approved contracts.
- **Independent QA agent:** tests evidence and reports concerns without impersonating a human reviewer. Automated checks are not owner visual UAT.

## Before the overhaul starts
- Maintain a draft design charter, guidelines, risks, feature inventory and design research within `docs/design/` on a design-only branch/PR.
- Engage the Product Owner in deliberate discussion; keep alternatives open. No implementation or forced redesign of the current v18 UI.
- Do not require UI-director participation or sign-off for each routine change in active managed feature delivery. Record emerging user-facing requirements from existing backlog when convenient, without blocking work.

## Gates after explicit UI-overhaul kickoff
**D0 / Understand:** inventory current live product + approved UI reference; define key personas/jobs, task scenarios, constraints, baseline measurements and known issues. Output: reviewed problem statement and journey map.

**D1 / Diverge:** create at least two materially different annotated layouts, initially low fidelity. Explain hierarchy, navigation, task/context preservation and disadvantages. Output: wireframes with scenario paths and critique; no premature visual freeze.

**D2 / Converge:** assess against principles, representative scenarios, keyboard paths, information density and realistic workbook data. Record a comparative decision matrix, rejected approaches and rationale. Output: Product Owner approval of information architecture / interaction direction only.

**D3 / Visual system:** establish reusable color/type/spacing/icon/state tokens, surfaces and components; produce desktop variants, light/dark and key state images. Output: owner-approved visual/interaction spec, versioned immutable baseline and explicit scope/change log.

**D4 / Implement & review:** developer implements on an isolated feature PR; independent QA reviews behavior, visual diffs, accessibility, performance, offline/permission/save semantics and regression against approved **new** design. Preserve historical v18 files intact.

**D5 / Owner UAT & decision:** user completes scenario-led visual and ergonomic UAT with synthetic/disposable workbooks. Owner explicitly accepts or sends changes; no implicit merge from screenshot similarity or green CI.

**D6 / Maintain:** new changes use proposal → impact / alternative assessment → owner disposition → specification/tokens/wireframe update → implementation & regression evidence → version/change log. Review only material UI changes or an agreed periodic design health check; avoid mandatory review of routine non-UI iterations.

## Review rubric (score 0–3; hard blockers override totals)
- Task fit and comprehension
- Cognitive and motor effort
- Orientation/context retention
- Readability and density
- Affordance/discoverability
- Error prevention, save trust and recovery
- Accessibility and device/zoom resilience
- Technical feasibility and performance
Record **actual evidence vs expert hypothesis**. WCAG-critical functional failure, data loss hazard or misleading save/conflict state is a blocker regardless of aggregate score.

## Design artifact contract
For each concept `DES-###`: purpose, linked issue and requirement IDs, baseline ref/SHA, version/state, source file, screenshot or editable wireframe, target viewports, states, decision log, unresolved questions, review evidence and owner disposition. Prefer editable source (HTML/CSS/SVG or equivalent) plus image export. Store under `docs/design/` (principles/process/contracts) and `design/` (concepts/assets) or a later owner-approved layout. Never overwrite historical approved baselines.

**Status vocabulary:** Proposed → Under Review → Owner Approved (design freeze) → Implemented → QA Verified → Owner Accepted. Rejected/Superseded retained as historical evidence. Approval must identify exact artifact version/hash and scope.

## Separation of concerns
- Existing v18 and frozen product requirements control present development.
- The UI overhaul starts only by a distinct Product Owner decision. Keep implementation/merging/release permissions separate from design approvals.
- If new features affect future concept assumptions, record them into the concept's capability inventory; do not reopen a current feature solely to make it prettier.
