# SPT-WBS UI Guideline — draft 0.6

**State:** PROPOSED, 2026-11-07. These values are candidate guardrails, not adopted token changes. Approved v18 remains the live development baseline until separately superseded.

## 1. Information architecture
- Treat **Schedule** (hierarchical grid + synchronized timeline) as the provisional primary workspace. Keep a contextual task inspector/editor, with History, Reports, Settings, project onboarding and management operations reachable as subordinate destinations or tools. Validate against primary personas before freezing.
- Keep context through filter, edit and detail transitions; never obscure the selected task and its place in the hierarchy without a compelling reason.
- Cluster commands by user job and frequency: navigation, finding/filtering, scheduling/inspection, editing, and system/project settings. Avoid the all-controls-at-once header pattern.
- Promote alerts that result in action. “Needs attention” should expose affected tasks with a one-action filter or direct navigation, not merely a static number (Issue #17).
- **Weekly meeting structure:** prepare and prioritize exceptions *before* the call; discuss across all workstreams at the beginning, then follow workstream-grouped WBS hierarchy for routine progress **including relevant field/data-quality checks inline**. **No separate Integrity view** unless a materially different workflow is evidenced. Present complementary Exception/Workstream navigation paths into the **same underlying tasks**, not separate task repositories. Do not silently equate calculated 'Needs Attention' with curated meeting flags.
- Discussion/review status is distinct from actual task status. If concepts such as 'discussed this meeting' or saved agenda are proposed, they must not silently write new workbook fields or alter TaskStatus without a separately approved functional contract.
- **Persistent risk monitoring:** show automatically detected schedule risks and manually flagged contextual risks as independent sources. Under Watch must survive meetings and discussion; it may clear only once all active sources resolve and delivery health is Green (exact health definition pending approval). A task with green-looking dates is not necessarily healthy when a contextual risk remains; the UI must never imply otherwise. See [Risk Watch Model](05_RISK_WATCH_MODEL.md).
- **Replan and commitment distinction:** routine task Save is not proof that a revised external commitment was accepted. Compare agreed vs planned dates contextually; offer proportional acceptance flows (operator records routine acceptance, material changes need evidence of an authorized stakeholder decision) with no extra modal for ordinary editing. Pending commitment acceptance should remain visible without pretending Save failed. All materiality and evidence rules remain proposed until a separate functional contract is approved.
- Do not reserve large permanent screen area for low-action-value KPIs. The schedule should have the largest useful working region at common desktop viewports.

## 2. Text, spacing and density — candidate design tokens
**Review disposition:** the token values below are *sound starting hypotheses*, **not approved numbers**. Do not freeze font sizes, row heights, spacing, density modes or control dimensions until they are assessed together in realistic, holistic interface mocks with editing, reviewing, overlays, dialogs and meaningful sample data. Isolated typography or component samples are insufficient.
- Use a system-compatible sans serif with tabular numerals for dates, WBS and numeric columns. Proposed working baseline: regular body **14px**, grid **13–14px**, secondary metadata **12–13px** (avoid essential data below 12px). Validate at Windows Edge scaling and 125–200% zoom.
- Establish a consistent 4px spacing grid with purposeful 8/12/16/24px relationships. Don't use identical spacing blindly where content grouping requires variation.
- Candidate grid row heights: standard 40–44px, optional compact 34–38px after accessibility testing. Preserve visible hierarchy indentation and line alignment.
- Candidate interactive targets: prefer at least 32px in high-density desktop controls, 40–44px for primary actions; WCAG 2.2 AA target-size minimum is 24×24 CSS pixels subject to stated exceptions/spacing.
- Avoid arbitrary fixed-height schedule regions that squander vertical space. Candidate test viewports include constrained laptop (e.g., 1366×768), 1440×900, 1920×1080 and browser zoom; validate actual corporate laptop viewport, scaling and Edge chrome rather than assuming those resolutions.
- Evaluate **whole-screen readability**: whether hierarchy, column width, dates, task titles, bars, action hierarchy and simultaneous edit states work *together*. Judge layout in situ; type-size adequacy cannot be decided from a table of token values alone.

## 3. Corporate-office viewing contexts — requirements to validate
**Owner workflow evidence:** weekly status calls begin with pre-flagged, prioritized exceptions across workstreams, then proceed by workstream/WBS to review updates and record integrity. Calls commonly edit existing tasks (append Updates; change dates, status, owner) while progressing entity by entity. Leadership calls mainly present progress, next milestones and flagged risks. Task creation is generally deferred until after the meeting, based on separate notes. See [meeting workflows / viewport study](04_MEETING_WORKFLOWS_AND_VIEWPORTS.md).
- **Laptop work/edit:** favor space-efficient scanning, persistent WBS/Gantt synchronization, task context, keyboard shortcuts and visible save/conflict feedback. Avoid gratuitous empty space or oversized surfaces that squeeze actual schedule content.
- **Same-screen discussion:** make a referenced task and the corresponding bar/row easy to follow as attention shifts between participants; controls should not compete with the schedule.
- **Conference-room monitor:** validate at representative audience viewing distances, including whether dates, task names, milestone labels, alerts and focused items can be read without zooming the whole desktop.
- **Video-call screen share:** validate at constrained remote-window sizes, common video-call downscaling and compressed imagery. Don't depend on fine hairlines, subtle hue differences, tiny labels, hovering, or precise cursor position to communicate meaning; support an obvious discussion/focus state.
- **Current concept comparison:** (A) schedule-centered workbench, (B) two-column Meeting Guide (agenda + one selected-task surface, **Edit task** reveals fields inline), and (C) a **Present** reading treatment inside the existing Output Reports concept. Leadership presentation should **not** become another independent report engine. EMV-REPORT-1.0's **plain-text preview/copy** remains frozen; any presentation treatment is a proposed future UI enhancement to be scoped separately. Choose only after holistic mock evaluations. Full-screen mode alone is not evidence of better comprehension.
- For shared-screen scenarios, evaluate the visibility and control of editing affordances; do not assume the presenter needs to change tasks while the audience watches. Any display adaptation must be reversible, discoverable and must not silently modify workbook content.

### Date and working-day semantics (DES-002 exploration)
- For meetings and reports, emphasize **planned finish date and working days remaining**; this is calendar time to deadline, **not outstanding effort or task completion**.
- Reuse one defined project working calendar for countdown, Gantt holidays, blackout dates and schedule-risk signals once its contract is approved. Do not confidently show an unqualified number if calendar/holiday/blackout context is unknown.
- Use Gantt bars for actual **scheduled span**, not fabricated progress fill. Render progress completion only from an eligible, trustworthy source and label its meaning.
- The fixed DES-002 sample calendar excludes Mon–Fri weekends and Japan's 2026 Nov 23 holiday, **but not project blackout dates**. These demo numbers are not approved implementation rules; project blackout persistence is a future issue (#20).

## 4. Typography, color and meaning
- Text contrast: WCAG 2.2 AA **4.5:1** for normal text, **3:1** for large text; meaningful UI graphic contrast **3:1** where applicable.
- Keep semantic status treatments separate from workstream identity colors and from calendar overlays. Use readable labels or shapes alongside color.
- Existing 15-slot workstream palette is the **approved v18 implementation mapping**. Do not change it in ongoing development. Explore improved distinguishability later under explicit new design approval.
- Define light/dark semantic tokens for surface, ink, border, focus, muted text, positive, warning, critical, selected, disabled, workstream identity and calendar overlays; validate both, not just invert hues.
- Use restrained shadows, radius and animation to clarify layering/interaction; avoid decoration-only motion. Honor reduced-motion preference.

## 5. Controls and behavior
- Prefer **icon + text** for novel or consequential commands. Use icon-only for well-understood compact actions only when accessible label, tooltip and discoverability are established.
- **Switch:** immediate binary state (e.g., show/hide a display layer if it applies instantly). **Checkbox:** selection of multiple values, especially filter lists. **Radio/segmented control:** mutually exclusive modes (e.g., timeline scale). Use labels that state outcome.
- For WBS relationship editing, show the intended new parent/dependency before save; do not confuse reparenting with finish-to-start links. Drag-only interaction requires a keyboard or non-drag alternative.
- Define full state coverage: empty, loading, invalid workbook, permission needed, stale source, unsaved draft, saving, success, partial data, conflict, recovery and offline. Each state must say what happened and what the user can do next.
- Avoid chains of modal dialogs for normal workflows. Keep confirmations for loss, collision or irreversible operations; restore focus after dismissals. Prefer inline reversible feedback for routine changes.
- Search/filter chips or indicators must make active constraints visible, editable and easy to clear. Preserve task ancestor context.

## 6. Grid and Gantt ergonomics
- Maintain visual row alignment and synchronized vertical movement between table and timeline; preserve keyboard operation, focus and scroll orientation.
- Numeric and date columns align consistently. Headers and values avoid truncation of meaning-critical status or date fields; reveal full values by accessible means.
- Schedule semantics remain distinct: hierarchy indentation/chevrons, predecessor arrows, milestone diamonds, workstream color, progress fill, today, weekends, public holidays, PGCM and blackout.
- Define layer precedence and a lightweight explanation/legend for overlapping schedule overlays. Hover-only meaning is insufficient.
- Task edit and history must preserve workbook provenance, change-set relationships and a clear committed-vs-draft distinction.

## 7. Provisional quality gates for the later overhaul
**Sizing and information budget study (nonbinding):** working review at ~1366×768 with 15–16px primary task type and ~8–12 navigable rows; leadership at ~1280×720 usable canvas with 20–24px featured task type and ~5–7 featured items; 1920×1080 video output where available. These are **candidate values**, not design approval. Validate on actual Windows laptops, room displays and reduced participant video windows.
1. WCAG 2.2 AA-focused keyboard/contrast/reflow review and data-grid APG assessment.
2. **Holistic full-workspace** reviews of proposed type, spacing and density at actual corporate laptop sizes and zoom, and on shared meeting displays, both light and dark. Do not approve design tokens before this gate.
3. Viewing evaluations on a conference display and a video-call screen share, checking legibility at distance, compression tolerance, selected-item focus and absence of hover-only information.
4. Scenario walkthroughs for opening a workbook, finding a blocked task, editing and saving, inspecting history, generating a report, adding/reparenting a task and starting a new project.
5. Quantitative task completion, misclick and error evidence versus present baseline.
6. Independent technical feasibility, regression and security review after design concept approval.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [ARIA APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), [Fluent 2 Layout](https://fluent2.microsoft.design/layout), [GOV.UK Checkboxes](https://design-system.service.gov.uk/components/checkboxes/).
