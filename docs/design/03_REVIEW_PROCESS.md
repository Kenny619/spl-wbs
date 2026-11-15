# SPT-WBS UI Design Review & Change Control — draft 0.3

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
**D0 / Understand:** inventory current live product + approved UI reference; define key personas/jobs, task scenarios, constraints, baseline measurements and known issues. Explicitly cover laptop editing, same-screen discussion, conference-room monitor viewing and video-call screen sharing. Capture distinct **weekly task-by-task status updates (live date/status/owner editing and Update entries)** and **management/leadership presentation (progress, milestones, risk)**; see [meeting-workflow study](04_MEETING_WORKFLOWS_AND_VIEWPORTS.md). Output: reviewed problem statement and journey map.

**D1 / Diverge:** create at least two materially different annotated layouts, initially low fidelity. Explain hierarchy, navigation, task/context preservation and disadvantages. Output: wireframes with scenario paths and critique; no premature visual freeze.

**D2 / Converge:** assess against principles, representative edit/review/share scenarios, keyboard paths, information density and realistic workbook data. Compare responsive versus presentation/review concepts without presupposing a new mode. Record a comparative decision matrix, rejected approaches and rationale. Output: Product Owner approval of information architecture / interaction direction only.

**D3 / Visual system:** establish reusable color/type/spacing/icon/state tokens, surfaces and components. Produce *holistic* full-workspace mocks: compact laptop editing, same-screen collaboration, distant-monitor review and video-call sharing, plus light/dark and key state images. Evaluate candidate type/spacing/density *together* in those mocks; tokens remain tentative until this review. Output: owner-approved visual/interaction spec, versioned immutable baseline and explicit scope/change log.

**D4 / Implement & review:** developer implements on an isolated feature PR; independent QA reviews behavior, visual diffs, accessibility, performance, offline/permission/save semantics and regression against approved **new** design. Preserve historical v18 files intact.

**D5 / Owner UAT & decision:** user completes scenario-led visual and ergonomic UAT with synthetic/disposable workbooks, including laptop editing and actual shared-screen viewing checks where feasible. Owner explicitly accepts or sends changes; no implicit merge from screenshot similarity or green CI.

**D6 / Post-release feedback intake and triage (continuous):** capture every actionable UI/UX observation, user feedback, change request or defect in a GitHub issue (or link to the existing issue to avoid duplicates). Triage by impact and type: usability obstacle, visual/accessibility defect, behavioral bug, improvement request, or research hypothesis. Record affected workflow, environment (laptop / shared display / video call), actual-versus-expected behavior, reproducibility, screenshots or video if appropriate, severity, frequency, workaround and linked design/baseline version. The Product Owner may submit feedback directly without providing all metadata; AI support helps flesh out the record. Prioritize verified user harm, task failure and confusion above cosmetic novelty. Keep the feedback visible in a living backlog; do not require immediate implementation for every suggestion.

**D7 / Post-release design resolution and learning (as needed):** design director first determines if the item is a genuine defect relative to the accepted contract, a new requirement or an unvalidated preference. For material changes: problem → alternatives + impact on existing experiences → Product Owner decision → spec/tokens/wireframe and acceptance-criteria revision → authorized implementation → independent verification → owner acceptance where appropriate → release note/change log → follow-up assessment. For small corrections within already-approved scope, use proportional review rather than requiring a full new concept cycle. Preserve the approved baseline and historical rationale; do not quietly redefine acceptance criteria. Reopen or link related issues when a fix fails; close only with disposition and evidence.

**D8 / Periodic experience health review (lightweight, when useful):** look for recurring feedback patterns, accessibility regressions, accumulating UI inconsistency and tasks that still require avoidable effort. Record opportunities as issues or design hypotheses, not automatic development instructions. No extra owner meeting or standing UI review is mandatory during ordinary pre-overhaul product iterations.

## Post-release feedback lifecycle and decision rules
- **Intake:** any observed issue or request is captured/link-deduplicated, never lost in chat-only discussion. Use the existing GitHub issue tracker and related feature issues instead of a parallel ticketing system.
- **Disposition:** Confirmed defect / Accepted improvement / Needs evidence / Deferred / Not planned / Duplicate. Explain decisions and maintain cross-links.
- **Priority:** Critical (prevents safe completion, data loss, or serious access failure) → Major (frequent task failure or shared-view incomprehension) → Minor (workaround available) → Cosmetic. Severity labels are proposed; map them to existing repository conventions during overhaul kickoff.
- **Ownership:** AI agents may research, draft, test and recommend; the single human Product Owner approves meaningful UX/feature scope change and final acceptance. Critical incidents may initiate safety containment under existing delivery authority without silently altering frozen product decisions.
- **Close the loop:** link issue → decision/version → PR/commit → test/visual evidence → release/owner disposition. Verify whether the user problem actually improved, not only that a code change shipped.
- **Avoid bureaucracy:** small visual regressions against a frozen baseline can be corrected with scoped testing; new workflow concepts need a design review. Pre-overhaul regular delivery remains outside mandatory design-director approvals.

## Review rubric (score 0–3; hard blockers override totals)
- Task fit and comprehension
- Cognitive and motor effort
- Orientation/context retention
- Readability, density and shared-screen legibility
- Affordance/discoverability
- Error prevention, save trust and recovery
- Accessibility and device/zoom resilience
- Technical feasibility and performance
Record **actual evidence vs expert hypothesis**. WCAG-critical functional failure, data loss hazard or misleading save/conflict state is a blocker regardless of aggregate score.

## Design artifact contract
For each concept `DES-###`: purpose, linked issue and requirement IDs, baseline ref/SHA, version/state, source file, screenshot or editable wireframe, target viewports, states, decision log, unresolved questions, review evidence and owner disposition. Prefer editable source (HTML/CSS/SVG or equivalent) plus image export. Store under `docs/design/` (principles/process/contracts) and `design/` (concepts/assets) or a later owner-approved layout. Never overwrite historical approved baselines.

**Design artifact status vocabulary:** Proposed → Under Review → Owner Approved (design freeze) → Implemented → QA Verified → Owner Accepted. Rejected/Superseded retained as historical evidence. Post-release feedback issue status/disposition is tracked separately; do not conflate an issue's closure with design acceptance. Approval must identify exact artifact version/hash and scope.

## Separation of concerns
- Existing v18 and frozen product requirements control present development.
- The UI overhaul starts only by a distinct Product Owner decision. Keep implementation/merging/release permissions separate from design approvals.
- If new features affect future concept assumptions, record them into the concept's capability inventory; do not reopen a current feature solely to make it prettier.
