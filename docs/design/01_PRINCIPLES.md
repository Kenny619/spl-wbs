# SPT-WBS Product Experience Principles — draft 0.2

**State:** PROPOSED, 2026-11-07. No Product Owner design freeze.

## North star
**Help the user understand the real project situation, make the next sound decision, and change the schedule safely—without spending attention on the software itself.** SPT-WBS is a work instrument, not a decorative dashboard.

## Ranked principles and trade-off rules

### P1. Start from the user's job, not the feature inventory
Lead with what users repeatedly need to do: orient, find, assess, edit, relate, save, review. New features must be mapped into those jobs. Avoid a permanent toolbar button for every capability. Evaluate separately for editors, read-only reviewers and project starters. **Conflict rule:** prioritize the dominant job, then give secondary users a clear entry point.

### P2. Minimize **total effort**, not absolute click count
Optimize recognition, visual scanning, decision-making, movement, error prevention and recovery together. One dangerous silent save is worse than two explicit, confidence-building steps. **Conflict rule:** prefer a visible reversible action over a marginally shorter risky flow. Assess task completion and errors as well as clicks.

### P3. Preserve spatial context and orientation
The WBS/grid and synchronized Gantt are the product's strongest mental model. The selected task, its hierarchy, workstream, timing and dependencies should remain understandable while the user inspects or edits. **Conflict rule:** don't make every operation a blocking full-screen dialog when a context-preserving region works better.

### P4. Use progressive disclosure without hiding essentials
Keep frequent actions available, infrequent configuration secondary, and advanced details where they are needed. Data state, current selection, edit/save status and risk should never depend only on hover, tooltip or a hidden menu. **Conflict rule:** reduce clutter only while the next appropriate action stays discoverable.

### P5. Make risky actions predictable, reversible and auditable
Separate uncommitted drafts from workbook state. Make source identity, save destination, unsaved changes, conflicts, recovery and success visible in plain language. Use guardrails proportional to harm. **Conflict rule:** explicit confirmation is justified for destructive or difficult-to-undo actions, not routine harmless ones.

### P6. Represent meaning consistently
Hierarchy is not dependency; task status is not workstream identity; date-only schedule fields are not timezone-sensitive timestamps. Color, icon, label and location should reinforce—not contradict—the domain meaning. No key information by color alone.

### P7. Be dense with information, not dense with friction
Enterprise users need high information throughput. Maintain aligned columns, readable labels and efficient navigation without forcing tiny text, low-contrast metadata or precision clicking. Allow adaptable density after evidence, not a single permanently cramped layout.

### P8. Accessibility, office ergonomics, and shared-screen readability are core quality
Target WCAG 2.2 AA; keyboard-operable grid, dialogs and splitter; perceivable focus; reduced motion; readable light/dark themes; resize/reflow; usable keyboard and mouse paths. Design for **two materially different corporate-office contexts**:
1. **Work / edit on a laptop:** the operator is near the screen and needs high information density, precise task editing, dependable keyboard/mouse control, error prevention and a clear save state, often in limited vertical space.
2. **Review / communicate on a shared display:** the audience sees the schedule on the same laptop, a conference-room monitor or through video-call screen sharing. Legibility must survive viewing distance, scaling, resolution reduction, video compression and missing hover affordances. Important dates, progress, status and the current discussion focus must remain recognizable without requiring the audience to decipher the entire editor.

**Trade-off rule:** don't force one cramped high-density editing layout to serve distant viewers, nor permanently inflate the editing layout to presentation dimensions. Evaluate adaptive layout, adjustable density and a distinct *present/review focus* as alternative concepts before deciding. Sharing should be intentional and safe; not every viewer should need edit controls. An offline local-workbook application must communicate its local/offline and permission states calmly and accurately.

### P9. Let user evidence outrank trends
“Modern 2026” is not a style recipe. Reuse familiar enterprise conventions when they decrease learning; create novel patterns only when they improve actual scenarios. Test before freezing design.

## Explicit challenges to initial ideas
- **“Fewer clicks”**: track total time, cognitive steps and recovery cost; not one number.
- **“More icons”**: icons alone are often ambiguous for domain actions such as History, Reports, Reparent, Save As and Inspect Save State. Prefer icon+label or label where comprehension matters. Icon-only can suit universally recognized actions with accessible names.
- **“Switches instead of checkboxes”**: switches belong to immediately applied binary state; checkboxes remain better for multi-selection and deferred-apply filter/configuration forms. Appearance change alone is not a design benefit.
- **“Dashboard = modern”**: four tall KPI cards are only justified if they deliver decisions or drilldowns proportional to their area. Favor task-oriented, action-linked summaries.

## Provisional success framework
Before freezing concepts, define representative **editing and shared-screen review scenarios** and baseline them against the current implementation. Proposed measures: task success without assistance, median and P90 completion time, error/undo frequency, time to identify a blocked/late task, time to edit and verify a save, subjective confidence, and whether distant/video-call viewers can identify the referenced task, status, milestone and date without verbal UI-navigation instructions. Numeric targets must be based on baselining, not invented in advance.

## Standards and design references
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C WAI-ARIA APG — Data Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [Microsoft Fluent 2 — Layout](https://fluent2.microsoft.design/layout)
- [Microsoft Fluent 2 — Design Principles](https://fluent2.microsoft.design/design-principles)
- [NN/g — Recognition Rather than Recall](https://www.nngroup.com/articles/recognition-and-recall/)

These are evidence sources, not wholesale adoption of another product's visual branding.
