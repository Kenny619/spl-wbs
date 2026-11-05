# UI Design Specification v1.3 — frozen v17

## Visual authority
`UI_BASELINE_v17_FROZEN.html` is the approved reference. Extract actual CSS geometry and SVG markup from that artifact rather than extrapolating from written approximations. No new sidebar, redesign, or component substitutions. Screenshot-diff against reference at desktop sizes.

## Immutable key details
- Single-screen view with project header, KPIs (including Needs Attention), toolbar, WBS task grid and synchronized Gantt timeline with draggable divider.
- Task grid defaults: **WBS, Task, Owner, Status, Finish**; optional **Start, Done, Type, Workstream**. WBS/Task pinned. `Done` is optional and hidden on load. Percentage right-aligned.
- All table header titles and the Task title's expand-all chevron are bottom aligned consistently with the approved padding. The individual row chevrons use proportionate **15×15 SVG** with rounded strokes; text and icon share the same vertically centered flex row.
- Status badge labels use small approved type; selecting columns must not cause header overlap.
- Status+Owner checkbox filters always available when corresponding visible; Type/Workstream filter entries appear when column enabled, derived from actual imported values. Clear all and Hide inactive coexist.
- 3+ WBS levels visually indicated with indentation; expanded/collapsed icon direction follows v17. Parent/child hierarchy is independent of predecessor FS arrows.
- Timeline Day/Week/Month/Quarter segmented control, Fit exactly to task bounds, task bars with progress fill, Today indicator, holiday/PGCM/blackout visuals.
- In Day, PGCM is a pale purple **filled day column**, not merely a left-edge line; Week uses v17 marker. Holiday same background as weekends. Blackout amber overlay and Calendar settings popover.
- Task hover remaining text: `0 day`, `+n days`, `Overdue` (active only). Detail drawer: long-form workday remainder active only. Finished/Cancelled hide these fields entirely.
- Needs Attention text: count At Risk or Blocked, and overdue tasks separately. These categories may overlap.
- Detail drawer: source-record action with Microsoft Lists-inspired icon and external-link cue; link disabled when `itemUrl` not available. Icon is presentation only; no SharePoint APIs.
- Do not re-add the removed sample explanation: "WBS hierarchy example: 2 → 2.2 → 2.2.2 (three levels). Dependency arrows show task predecessors, not WBS parentage."

## Approved workstream palette (order preserved)
Colors are semantic **workstream identity only**, not stages, project status or risk. Mapping is assigned to distinct workstream names, preserved in session across filtering/reimport. If >15 distinct values, reuse is allowed but users should not infer uniqueness.

| Slot | Hex | Slot | Hex | Slot | Hex |
|---:|---|---:|---|---:|---|
| 1 | `#5A82C8` | 6 | `#6E91A9` | 11 | `#A78D67` |
| 2 | `#9277C7` | 7 | `#9A7EA7` | 12 | `#5F9B9B` |
| 3 | `#319C91` | 8 | `#719B82` | 13 | `#A37E90` |
| 4 | `#D99D47` | 9 | `#B78A6D` | 14 | `#879B65` |
| 5 | `#C57786` | 10 | `#7D85B3` | 15 | `#8C8FA1` |

## Authorized Excel-loading adaptations (not yet frozen visuals)
- No file: lightweight in-chart **Choose workbook** empty state; hide mock KPIs/sample tasks in production.
- Loaded: unobtrusive file name, Loaded at time, Reload/Change/Forget commands in existing chrome replacing any Sync wording.
- Best effort remembered file: Reconnect file prompt with permission; file picker fallback. No arbitrary pathname access.
- Show concise import error/validation warning without replacing known-good displayed data.
- New controls must visually reuse v17 tokens and avoid moving baseline WBS/task-bar geometry. Review these additions visually before marking them frozen.

## Approved review amendments (2026-10-26)
These later approvals supersede the frozen HTML for the listed items only. Every other v17 geometry, color, and control stays as frozen.

- Non-working days use `#eef3f8` at full opacity, including the legend swatch for Weekend / holiday. Weekday chart background stays white. The shade paints above opaque task-row backgrounds so it remains visible, and it stays lighter than a strong blue-gray. Day and Week only.
- On Day, each weekend or holiday also shades the date cell from the top of the day-number band to the bottom of the header, behind the day number. The number stays readable. This matches the PGCM full-column highlight. Week has no per-day header cell, so the shade is the chart column only.
- Week minor labels are the Monday of that calendar week, zero-padded `mm/dd` (example: a span starting Thursday 2026-10-01 begins with `09/28`). One label per Monday-aligned column. Week type stays the existing 10px label size.
- Month minor labels are the ISO week number alone. Delete the word "Week". One number occupies each Monday-aligned column; do not skip a column or draw one number across two columns. Type is 8px, with padding removed and overflow hidden, so a two-digit number fits without overlapping the next column.
- Quarter minor ticks stay the frozen treatment. Quarter grid lines stay every 7 days from the span start. Week and Month grid lines align to Mondays inside the span.
- The milestone diamond is centered in its day column. The 13px rotated square's center is the column center. On a fitted day narrower than the diamond's visual width, the mark may extend equally past both sides of that column.
- The task detail pane is 580px wide on desktop, and no wider than the viewport minus 28px. Task attributes use three columns, two columns below 630px. The close control stays in view. The pane body scrolls on its own and does not scroll the Gantt. Updates, when the task has content, sits under Source record. Its heading matches the other section labels at 12px and weight 800. There is no divider immediately above that heading. Date dividers sit between entry groups. Entry cards use the existing pale surface, 10px radius, and the current text colors.

## QA screenshot states
Default v17, 3-level WBS expanded, Day PGCM, Week PGCM, blackout enabled, multi-select filters, all optional columns shown, right detail with/without ItemURL, Completed/Cancelled hover, empty Excel load, reconnect file, invalid file.
