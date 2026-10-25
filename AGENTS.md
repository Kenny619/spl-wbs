# AGENTS.md — Gantt Viewer (MANDATORY)

## Approved design lock
- **Immutable reference:** `UI_BASELINE_v17_FROZEN.html`, SHA-256 `5e6f438fb3817e253984a806bb5bccd4d82f3f14e93d0d03e6eaf5ada2fb84d7`.
- NEVER alter this file, rename its interface features, redesign layouts, change colors, spacing, fonts, row/header alignment, chevron SVGs, overlays, or CSS without explicit approval.
- Build production separately and compare side-by-side/screenshots at 1440×900 and 1024px. UI test snapshots should cover Day/Week, 3-level WBS, filters, details, optional columns, and blackout dialog.
- All column labels and Task header chevron share approved bottom alignment; all task-row expand/collapse chevrons use the approved 15×15 SVG in an inline flex row, vertically centered against task names. Preserve exact v17 behavior.
- Workstream colors use the **15-slot approved palette**; not fixed phase/status mappings. Preserve mapping for current session through reload/import.
- Existing WBS table, hierarchy, Gantt task bars, hover, calendar settings, counters, popovers and detail panel must remain visually faithful to v17.

## Data source and security
- Accept `.xlsx` files exported/refreshed from SharePoint Lists; **no direct SharePoint API, Graph, SPFx or five-minute polling**.
- Viewer is read-only; never write to workbook or SharePoint. User opens SharePoint entry via valid exported `ItemURL` only.
- Support standalone `file://`, all scripts/styles/parser bundled. No data uploads, telemetry, remote modules, or eval. Holiday API may fetch **year only**, with offline 2026–2030 fallback.
- Remember previous workbook **best effort** using persisted file handles in compatible browsers; request permission only after an explicit user gesture when required. Always support regular file picker; don't persist task data.
- Escape all Excel text rendered into DOM; sanitize/validate URLs as approved HTTPS SharePoint host URLs (configurable allowlist). Never inject Excel values as HTML or raw CSS.

## Functional contract
- Single project; WBS depth >=3; parent/child via stable IDs, never parsing WBS code as a foreign key.
- Parent summary span derived from descendants; progress weighted by inclusive planned calendar-day durations of scheduled non-milestone leaf tasks.
- Status+Owner filters are multi-select; Type+Workstream filters appear when their columns are shown; OR within filter, AND across filters; preserve matching ancestors. Hide inactive Completed/Cancelled, without false overdue messages.
- Day / Week / Month / Quarter, Fit exactly to earliest/latest planned dates, optional FS arrows, draggable pane, right details.
- Japanese weekends/holidays shading; remaining workdays exclude weekends + public holidays, **not blackout**; hover `0 day` / `+n days` / `Overdue`, full detail message; hide remainder for Completed/Cancelled.
- PGCM nominal every 14 days anchored 2026-10-26, shift holiday meetings to next JP weekday, cancel adjusted dates in blackout; never shift recurrence. Only current/future PGCM. Day: full pale-purple column; Week: approved week marker; Month/Quarter: no PGCM marker.
- Blackout inclusive, editable during session, visually distinct and does not count as holiday. Needs Attention shows risk/blocked count and overdue count separately.

## Implementation discipline
- Modular TypeScript, isolated import adapters, pure model/calendar functions, DOM/SVG views; no monolithic refactor.
- Separate mock fixture data from production. Do not use workstream label to select fixed semantic palette color.
- For each phase: change only specified source files, run unit/browser tests, show diffs/screenshots, list limitations and stop awaiting approval.
- Test dates with Asia/Tokyo interpretation and across New Year, leap years and holidays. Future holiday coverage requires official verification and versioning; do not silently assume an unknown date is not a holiday.
- If a requirement cannot be implemented without visual regression or security exception, report the conflict; do not silently compromise.
