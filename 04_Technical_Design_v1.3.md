> **Current baseline: approved v18.** The Product Owner directive of 2026-11-05 supersedes v17 as the current UI/UX authority and authorizes implementation in PR #15. v17 references below are historical; use the pinned v18 and live product/reference tests for visual acceptance. Read-only access and all eleven Excel Managed Variant decisions remain unchanged.

# Technical Design v1.3

## Build targets
- Source: modular TypeScript, Vite (or equivalent approved bundler) and Vitest/Playwright.
- Distribution: **one self-contained HTML file** with embedded approved parser/CSS/JS/holiday datasets, launched using `file://` in supported corporate Edge/Chrome. No dev server in deployment, no CDN, no external font.
- Online holiday fetch is optional; app continues offline with vetted 2026–2030 data.

## Modules
```text
src/
  data/excelReader.ts          # File/ArrayBuffer, schema/header mapping
  data/normalize.ts            # Validated task model; no HTML generation
  data/fileHandleStore.ts      # Optional IndexedDB FileSystemFileHandle
  data/importController.ts     # File picker, permission fallback, reload and forget
  model/wbsTree.ts             # Hierarchy, sorting, expansion and ancestor filtering
  model/summaryRollup.ts       # Inclusive calendar-day progress weights
  model/workstreamPalette.ts   # Stable 15-color mapping
  calendar/dateOnly.ts         # ISO date parsing; JST today
  calendar/jpHolidays.ts       # Versioned static 2026-2030; optional year API
  calendar/workdays.ts         # Remaining days
  calendar/pgcm.ts             # Fixed 14-day recurrence and cancellation
  calendar/blackout.ts         # One inclusive mutable interval
  ui/grid.ts / timeline.ts / filters.ts / detail.ts / calendarUi.ts
  app/state.ts                # In-memory view state and data provenance
```

## File access policy
Use standard `<input type=file>` universally. When supported in a suitable browser security context, `showOpenFilePicker()` returns a handle and can be persisted in IndexedDB (only with browser permission). At startup check `queryPermission`, and request permission only via user gesture (`Reconnect file`). A stored handle may fail or be revoked; always offer picker. Never assume `file://` file handles persist. Reload only on explicit action; no poll, watch or automatic SharePoint refresh. Data contents remain in RAM and are not stored in web storage.

## Excel and security
Bundle a reviewed `.xlsx` parser. Read ArrayBuffer; map exact headers/aliases; validate schema/hierarchy/status/date; strip or escape untrusted HTML; do not execute macros/formulas or external workbook links. Normalize date-only to `YYYY-MM-DD` without locale-ambiguous conversions. Workstream color assignment uses a map that survives reimport during current session. `itemUrl` must be HTTPS with no userinfo, and the hostname must equal `pmicloud.sharepoint.com`. Do not match subdomains. Never inject the URL without escaping. `rel=noopener noreferrer` on external links. `Updates` HTML is untrusted. Render it through an allowlist walker, not `innerHTML`. Allowed tags are `b`, `strong`, `i`, `em`, `u`, `s`, `mark`, `br`, `p`, `div`, `span`, `ul`, `ol`, `li`, `a`, and `blockquote`. Scripts, styles, frames, objects, images, forms, and event handlers are dropped. Unknown tags keep their text inside a span. Anchors stay only for `https` URLs with no userinfo. Copied inline style is limited to bold, italic, underline, and a yellow highlight class. Office font size and `ExternalClass` wrappers are discarded. The walker is bundled; the page does not fetch a sanitizer.

## Calendar rules
- JST today derived using explicit `Asia/Tokyo`, not UTC `.toISOString().slice(0,10)` near time-zone midnight.
- Holiday source: versioned bundled 2026–2030 snapshots, verified against authoritative data before release; endpoint `https://holidays-jp.github.io/api/v1/{year}/date.json`. Need provenance and warning when unknown/failed year. Annual spring/autumn equinox variations and substitute holidays require checking rather than assuming algorithmic estimates are authoritative.
- Nonworking = weekend or JP national holiday. Blackout does not change workday count.
- Active tasks: finish before today => Overdue; finish today => 0; otherwise count dates after today through finish inclusive that are nonweekend/nonholiday. Inactive tasks: do not emit remaining-field for tooltip or panel.
- PGCM nominal date = `2026-10-26 + 14k` days, `k>=0`; shift forward until JP working day; if final date in inclusive blackout -> suppress, never re-anchor nominal cadence. Only actual dates >= today shown, Day full-column tint / Week event marker.
- Blackout start/end inclusive in local date string, one interval, session only. Affects PGCM and overlay, **not** holiday set or remaining calculation.
- Non-working shade is inline `#eef3f8`, opacity 1, on Day and Week, for Saturday, Sunday, and any dated public holiday. It must stack above later task-row backgrounds (z-index 1). Blackout paints after it on the same day so amber stays on top. On Day, a second shade is appended to the timeline header with `top: 29px` and `bottom: 0`, using the same color, and the day-number layer stays above it (z-index 3). PGCM header tint stays above that shade. Do not edit the frozen stylesheet to recolor `.holiday-overlay`.

## WBS and view calculation
- Stable `id` and `parentId`; reject cycles; sort siblings by WBS code, then ID when the codes match. Do not use `sortOrder` or ID as the display order.
- Summary start/end derive from scheduled descendants; weighted progress includes only valid scheduled non-milestone leaf tasks with inclusive calendar durations; no leaves => N/A.
- Filters: OR within field, AND across active fields; ancestor context; hide inactive Completed/Cancelled while maintaining ancestor context if required. When a filterable column hides, its active filter is cleared.
- Date positions use actual calendar days. Fit computes earliest valid start/latest valid finish with no trailing calendar columns. Dependency overlay only valid FS edges; do not confuse tree arrows and FS lines.
- Week and Month columns start on Monday (`mondayOnOrBefore` the span start, then every 7 days). A clipped first or last week still carries that week's Monday. Week label text is `mm/dd` of that Monday. Month label text is the ISO week number of that Monday, at 8px, padding 0, overflow hidden. Quarter minor labels and quarter grid lines stay on the previous 7-day-from-span-start rule.
- Milestone geometry: the frozen CSS forces a 13px box rotated 45° around its center. Place the box at `columnLeft + (px - 13) / 2` so the diamond center is the day-column center. Bar width math for ordinary tasks is unchanged.

## Reliability / acceptance tooling
Pure logic unit tests, malicious spreadsheet fixtures, fake browser permission states, offline and file:// smoke tests, color-palette determinism, workday/PGCM cross-year cases. Browser screenshot diff against v17. Aim 500 tasks typical, 2,000 synthetic stress; use virtual rows if needed. Keep last good dataset on failed re-import. No external company-data egress.
