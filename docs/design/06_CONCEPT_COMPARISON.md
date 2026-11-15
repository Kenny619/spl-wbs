# DES-001 — Holistic UI Concept Comparison (historical, proposed 0.1)

> **Superseded for current visual critique by [DES-002](../../design/concepts/DES-002-consolidated-review-and-reports.html), 2026-11-08.** This document intentionally preserves the initial comparison and owner critiques. Current proposed direction: report-linked presentation, no standalone Integrity stage, one inline-edit meeting task panel, due-date and working-days emphasis. See [DES-002 design record](07_DES002_OWNER_FEEDBACK.md). DES-001 remains an immutable design reference, not the current recommendation.

**Created:** 2026-11-07 JST · **State:** D1 / divergence, PROPOSED · **Controlling:** [Issue #25](https://github.com/Kenny619/spl-wbs/issues/25) · **Draft discussion:** [PR #29](https://github.com/Kenny619/spl-wbs/pull/29)

**Editable prototype:** [DES-001-holistic-meeting-concepts.html](../../design/concepts/DES-001-holistic-meeting-concepts.html) · Git blob SHA `0250c0d1a427116f20a1a92982c66577491ff4e7`. View as an HTML file locally in a browser (GitHub → Raw → save as `.html` → open with Edge); GitHub's source-code preview does not execute HTML.

## Intent and scope
First holistic comparison of *whole workspaces*, not isolated token samples. Use **synthetic Northstar Service Rollout** WBS data across Platform Readiness, Data Migration, and Launch Enablement (10 sample entities, 4 watched tasks, contextual and schedule watch signals). It reflects the owner's real meeting patterns, but no external SharePoint or workbook content.

The prototype is a **design simulator, not the app**: task selection, stage/concept switching and illustrative field/update edits run only in browser memory. **Simulate save** does **not** write Excel, preserve data on refresh, create UpdateHistory, check permissions/conflicts or demonstrate implemented risk calculations. **The timeline bars are illustrative positioning, not a verified project schedule/forecast.** Synthetic warnings, milestones and progress are fixed for presentation study. Never mistake this for a live demo or UAT evidence.

## Concepts — materially different information hierarchy
### A. Schedule Canvas (workbench-first)
- Primary region: familiar high-density WBS grid and synchronized, columnar Gantt timeline, with group headers and selectable rows.
- Secondary region: active task details, independent risk reasons, current owner/status/date/progress and append-only-style update composer.
- Exception-first, workstream and integrity **review stages** filter or group the same underlying tasks, preserving identity.
- **Strength:** greatest schedule context and cross-row comparison. **Cost:** when the editor is open, both grid and detail may be too small for distant audiences or video-call viewers; a split timeline can dominate horizontal space.
- Primary fit: working on the full schedule, detailed maintenance, spatial analysis and dependency context.

### B. Meeting Guide (discussion-first)
- Primary left: a compact meeting itinerary and ordered agenda.
- Primary center: the selected task, large title, workstream and WBS code, status/date/owner/progress, contextual timeline and active risk reasons.
- Secondary right: direct field editing and latest update capture; on constrained screens this panel may stack or require a responsive adaptation.
- **Strength:** helps participants understand the current discussion topic and move exception → workstream → integrity. **Cost:** reduces simultaneous WBS/Gantt overview and can fragment the operator's attention across three columns.
- Primary fit: weekly live-review and shared-screen walkthroughs.

### L. Leadership Briefing (communication-first)
- Readable large-format project headline; three meaningful indicators (delivery confidence, next gate, upcoming milestones), milestone horizon and prioritised watch issues.
- Editing chrome and full WBS omitted by design. Future UI must preserve a discoverable drill-down and reversible return to editing.
- **Strength:** audience focus and legibility at distance. **Cost:** less detail and no live editing in the concept; over-aggregating progress can obscure material uncertainties.

**Important:** The mock has three concept-selector buttons only so the owner can compare candidates. These are **not** approved top-level product navigation tabs or an endorsement of three permanent software modes.

## Initial comparative assessment — expert hypotheses, not measured usability evidence
| Criterion | A · Schedule Canvas | B · Meeting Guide | L · Leadership |
| --- | --- | --- | --- |
| Preserve broad WBS/Gantt spatial context | Strong | Limited by focus | Deliberately minimal |
| Rapid exception-first weekly walkthrough | Moderate, context switching required | Strong | Weak |
| Frequent in-meeting Updates/status/date/owner edits | Strong if inspector remains legible | Strong if edit pane and navigation fit laptop | Intentionally weak |
| Workstream-based review / hierarchy | Strong | Strong but narrower overview | Not primary use |
| Screen-sharing comprehension | Moderate / at risk | Potentially strong | Strongest candidate |
| Deep schedule investigation | Strong | Moderate | Weak |
| Integrity and safe Save/conflict feedback | Needs full app evidence | Needs full app evidence | Not a write surface |
| Control count and discoverability | Risk of clutter | Risk of mode/itinerary complexity | Lowest clutter |
| 1366×768 fit | Needs rendered validation | 3-column fit particularly at risk | Intended larger share viewport |

## Working recommendation (NOT an owner decision)
- **Keep the Schedule Canvas as a candidate for routine schedule authoring and deep exploration**, because users still need comprehensive WBS/Gantt spatial context.
- **Test Meeting Guide against real weekly meeting sequences**; it may become a *focus layer within the schedule workspace*, not necessarily a separate permanent module.
- **Test Leadership Briefing as a distinct audience-facing presentation experience** with safe return to the selected task. A browser fullscreen action alone is not sufficient.
- Do not choose navigation or a design system yet; compare A/B with the owner after looking at real, whole-screen renderings.

## Design validation scenarios for the next owner review
1. **Weekly exceptions, 1366×768:** before a meeting select the four watched tasks in priority order; explain which risk reasons are automatic versus manually contextual, discuss and record a vendor update, then navigate to the task's WBS workstream position.
2. **Live editing:** change one task's status, owner and planned end; append a meeting note. In the current prototype, **Simulate save** only updates local sample state; later implementation must honor the frozen single-draft, explicit Save/Discard/Cancel and audit contracts.
3. **WBS workstream review:** progress through three workstreams; find an already-discussed exception; evaluate how to signal discussion completion without corrupting actual task status.
4. **Integrity:** locate missing owner and conflicting risk/data states. Do not imply that the prototype already implements a complete automatic integrity algorithm.
5. **Leadership share:** identify the next three milestones and the two most consequential risks without reading dense grid cells. Check desktop window sharing, room monitor, and downsized attendee video window.
6. **Risk/commitment:** a manually flagged vendor risk persists after schedule conditions improve; moving planned end does not itself accept a new commitment. This is a spec concept test, **not a calculation in this prototype**.
7. **Access:** try keyboard selection, contrast, label clarity, font/row density and overflow at Edge zoom 100%, 125%, 150% and 200% (where feasible).

## Concrete questions to decide while viewing
1. During weekly status updates, **how much of the surrounding WBS/Gantt must remain visible** while editing one selected task? Compare the schedule-dominant A with the focal B.
2. Should the meeting experience be a **reversible focus mode inside the regular schedule workspace**, or a separate dedicated review destination?
3. Does Leadership Briefing need a live full Gantt at all times, or is an outcome/milestone horizon more useful with on-demand schedule drill-down?
4. Where should a **persistent Under Watch** indication live across the schedule, agenda and leadership view, and how should the current active reason remain obvious?
5. Which controls can safely disappear on a video call, and which **Save / editing state** signals must remain visible to the presenter?

## Evidence and acceptance status
- **Code authoring:** HTML/CSS/JS source committed to design-only draft branch.
- **Source validation:** inline JS syntax PASS; mocked-state execution PASS for Schedule Canvas, Meeting Guide, workstream phase and Leadership Briefing; source contains task selection and demo update handlers. This is **not** equivalent to browser-rendered visual QA or end-to-end interaction acceptance.
- **Rendered visual QA / screenshot measurements:** **NOT YET VERIFIED** in this document. Exact content fit, scroll behavior and font-size suitability are hypotheses. Do not freeze spacing/density tokens from this prototype.
- **Accessibility testing:** NOT YET COMPLETED. Prototype controls use basic labels and keyboard affordances, but no claim of WCAG conformance.
- **Product Owner visual critique:** PENDING.
- **Implementation permission:** NONE. v18 continues as the authoritative baseline.

## History
- 2026-11-07: D1 v0.1 comparison and interactive concept file created on \`design/ui-overhaul-foundations-v0.1\`. Proposals only.
