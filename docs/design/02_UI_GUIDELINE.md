# SPT-WBS UI Guideline — draft 0.1

**State:** PROPOSED, 2026-11-07. These values are candidate guardrails, not adopted token changes. Approved v18 remains the live development baseline until separately superseded.

## 1. Information architecture
- Treat **Schedule** (hierarchical grid + synchronized timeline) as the provisional primary workspace. Keep a contextual task inspector/editor, with History, Reports, Settings, project onboarding and management operations reachable as subordinate destinations or tools. Validate against primary personas before freezing.
- Keep context through filter, edit and detail transitions; never obscure the selected task and its place in the hierarchy without a compelling reason.
- Cluster commands by user job and frequency: navigation, finding/filtering, scheduling/inspection, editing, and system/project settings. Avoid the all-controls-at-once header pattern.
- Promote alerts that result in action. “Needs attention” should expose affected tasks with a one-action filter or direct navigation, not merely a static number (Issue #17).
- Do not reserve large permanent screen area for low-action-value KPIs. The schedule should have the largest useful working region at common desktop viewports.

## 2. Text, spacing and density — candidate design tokens
- Use a system-compatible sans serif with tabular numerals for dates, WBS and numeric columns. Proposed working baseline: regular body **14px**, grid **13–14px**, secondary metadata **12–13px** (avoid essential data below 12px). Validate at Windows Edge scaling and 125–200% zoom.
- Establish a consistent 4px spacing grid with purposeful 8/12/16/24px relationships. Don't use identical spacing blindly where content grouping requires variation.
- Candidate grid row heights: standard 40–44px, optional compact 34–38px after accessibility testing. Preserve visible hierarchy indentation and line alignment.
- Candidate interactive targets: prefer at least 32px in high-density desktop controls, 40–44px for primary actions; WCAG 2.2 AA target-size minimum is 24×24 CSS pixels subject to stated exceptions/spacing.
- Avoid arbitrary fixed-height schedule regions that squander vertical space. Support 1024×768, 1440×900, 1920×1080 and browser zoom; test overflow and splitter at each.

## 3. Typography, color and meaning
- Text contrast: WCAG 2.2 AA **4.5:1** for normal text, **3:1** for large text; meaningful UI graphic contrast **3:1** where applicable.
- Keep semantic status treatments separate from workstream identity colors and from calendar overlays. Use readable labels or shapes alongside color.
- Existing 15-slot workstream palette is the **approved v18 implementation mapping**. Do not change it in ongoing development. Explore improved distinguishability later under explicit new design approval.
- Define light/dark semantic tokens for surface, ink, border, focus, muted text, positive, warning, critical, selected, disabled, workstream identity and calendar overlays; validate both, not just invert hues.
- Use restrained shadows, radius and animation to clarify layering/interaction; avoid decoration-only motion. Honor reduced-motion preference.

## 4. Controls and behavior
- Prefer **icon + text** for novel or consequential commands. Use icon-only for well-understood compact actions only when accessible label, tooltip and discoverability are established.
- **Switch:** immediate binary state (e.g., show/hide a display layer if it applies instantly). **Checkbox:** selection of multiple values, especially filter lists. **Radio/segmented control:** mutually exclusive modes (e.g., timeline scale). Use labels that state outcome.
- For WBS relationship editing, show the intended new parent/dependency before save; do not confuse reparenting with finish-to-start links. Drag-only interaction requires a keyboard or non-drag alternative.
- Define full state coverage: empty, loading, invalid workbook, permission needed, stale source, unsaved draft, saving, success, partial data, conflict, recovery and offline. Each state must say what happened and what the user can do next.
- Avoid chains of modal dialogs for normal workflows. Keep confirmations for loss, collision or irreversible operations; restore focus after dismissals. Prefer inline reversible feedback for routine changes.
- Search/filter chips or indicators must make active constraints visible, editable and easy to clear. Preserve task ancestor context.

## 5. Grid and Gantt ergonomics
- Maintain visual row alignment and synchronized vertical movement between table and timeline; preserve keyboard operation, focus and scroll orientation.
- Numeric and date columns align consistently. Headers and values avoid truncation of meaning-critical status or date fields; reveal full values by accessible means.
- Schedule semantics remain distinct: hierarchy indentation/chevrons, predecessor arrows, milestone diamonds, workstream color, progress fill, today, weekends, public holidays, PGCM and blackout.
- Define layer precedence and a lightweight explanation/legend for overlapping schedule overlays. Hover-only meaning is insufficient.
- Task edit and history must preserve workbook provenance, change-set relationships and a clear committed-vs-draft distinction.

## 6. Provisional quality gates for the later overhaul
1. WCAG 2.2 AA-focused keyboard/contrast/reflow review and data-grid APG assessment.
2. Screen-state and density review at approved desktop sizes and zoom; both light and dark.
3. Scenario walkthroughs for opening a workbook, finding a blocked task, editing and saving, inspecting history, generating a report, adding/reparenting a task and starting a new project.
4. Quantitative task completion, misclick and error evidence versus present baseline.
5. Independent technical feasibility, regression and security review after design concept approval.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [ARIA APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), [Fluent 2 Layout](https://fluent2.microsoft.design/layout), [GOV.UK Checkboxes](https://design-system.service.gov.uk/components/checkboxes/).
