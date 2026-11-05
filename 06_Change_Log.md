# Decision register and change log through UI v17

- **v10:** Last pre-calendar frozen baseline; compact GanttPRO-inspired layout, bottom-aligned headers, single-screen UI.
- **PRD v1.1:** Excel `.xlsx` imported locally replaces direct SharePoint List reads/SPFx; remembered-file best effort with explicit permission fallback, no automatic refresh. Export source remains SharePoint; source data is not live.
- **Calendar addendum v1.2 / UI v11–v13:** JP public holiday shading, remaining workdays, fortnightly PGCM from 2026-10-26, editable blackout period, muted PGCM column Day / Week marker; short hover wording; original workstream color character restored.
- **UI v14:** 15 reusable workstream palette slots; colors dynamically assigned to workstream identities, never tied to predefined stages.
- **UI v15:** Needs Attention displays count of overdue tasks separately; visible three-generation WBS example and optional predecessor arrows.
- **UI v16:** Remove visible three-level explanatory sentence; suppress remaining days/Overdue for Completed and Cancelled; detail panel shows source SharePoint List link with Lists-inspired icon, disabled if no valid ItemURL.
- **UI v17 (APPROVED, FROZEN):** Better proportioned 15px row-chevron SVGs, centered against task text. Every other approved visual treatment preserved.

The HTML uses synthetic tasks. Business rules and Excel import requirements come from v1.3 docs; exact visuals from v17 HTML except the review amendments below. Earlier references to v10 as active visual authority are superseded. Calendar sample fixtures for 2027–2030 must be independently confirmed before production shipping.

## Review approvals after the v17 freeze

Recorded from user review on 2026-10-25 and 2026-10-26. These amend the documents above.

- **ItemURL host:** enable a link only when it is HTTPS and the hostname is exactly `pmicloud.sharepoint.com`. No userinfo and no subdomain match. This is the approved allowlist, not an open "any SharePoint host" rule.
- **Non-working shade:** weekends and public holidays must be distinguishable from weekdays. The first stronger blue-gray was rejected as too strong. Approved color is `#eef3f8` at full opacity, on Day and Week, shared by weekends and weekday holidays. The legend swatch matches.
- **Day date cell:** that same shade covers the Day header date cell, behind the day number, in the same full-column manner as PGCM highlighting.
- **Week labels:** replace `W1`, `W2`, `W3` with the Monday of that calendar week in zero-padded `mm/dd`. One label per column, aligned to Mondays rather than to 7-day chunks from the first scheduled day.
- **Month labels:** remove the word "Week". Show only the ISO week number, once per Monday-aligned column. Do not skip a column or place one number over two columns. Use smaller type so two digits fit with no overlap. Approved size is 8px with overflow hidden.
- **Milestone:** center the diamond in its day column. The previous left-edge placement put the rotated point across the previous day's border.

## Day-one usage amendments (2026-10-26)

- **Row order:** siblings sort by WBS code, with numeric segments so `1.2` precedes `1.10`. ID is only the tiebreaker. `SortOrder` does not reorder the chart.
- **Owner:** the grid shows the full owner name. Initials are not a substitute.
- **PGCM mark:** the Day column highlight stays as approved. The PGCM label and the Week line use a quieter tint that sits with the rest of the palette.
- **Row hover:** hovering either the WBS row or its timeline row highlights both.
- **Pane height:** when the viewport has empty space below the chart, the Gantt pane grows so more rows are on screen. It does not shrink below the approved 535px.
- **Missing bars:** a row with no schedule bar uses a pale amber background. Summary rows keep the existing cool row tint.

## Updates field (2026-10-30)

- Optional Excel column `Updates` stores SharePoint rich text on the task. Missing and blank values stay null.
- The detail pane is 580px on desktop. Attributes use three columns. The close control stays put while the pane body scrolls.
- Updates render at the bottom only when content remains after sanitizing. Newest timestamped entries come first. A date divider appears when the day changes. Content with no timestamp boundary is one undated entry. `Modified` is not a timestamp.
