> **Current baseline: approved v18.** The Product Owner directive of 2026-11-05 supersedes v17 as the current UI/UX authority and authorizes implementation in PR #15. v17 references below are historical; use the pinned v18 and live product/reference tests for visual acceptance. Read-only access and all eleven Excel Managed Variant decisions remain unchanged.

# Gantt Viewer — Product Requirements Document v1.3
**Status:** Approved requirements consolidated through UI v17, 2026-10-25, plus review amendments approved 2026-10-25 and 2026-10-26. **Purpose:** Corporate read-only, single-project WBS/Gantt visualization from locally selected Excel exports of a SharePoint List.

## 1. Objectives, scope, non-goals
Provide an intuitive WBS hierarchy, planned schedule timeline, owner/status visibility, workstream colors, upcoming governance dates, blackout windows and attention signals without editing tasks. Target desktop Edge/Chrome; distributed as a self-contained HTML file opened via `file://` where permitted.

Non-goals: direct SharePoint reads/writes, SPFx, Graph, database/server, periodic sync, live collaboration, task editing, scheduling engine, baselines, actual dates, automatic movement of task bars, user-entered task changes and cross-project views.

## 2. Approved UI and behavior
- Visual authority: immutable `UI_BASELINE_v17_FROZEN.html`. Do not use v10 screenshots or older PRD layouts as visual instructions.
- Full-width single-screen Gantt, no sidebar. WBS grid + resizable timeline; compact rows; header labels aligned to bottom as reference, Task all-expand chevron next to title, row chevrons 15px inline SVG centered against text.
- Initial grid columns: WBS, Task, Owner, Status, Finish. Start, Done, Type and Workstream optional. Numeric Done/progress right aligned; compact status pills. Column chooser and multi-select filter popover.
- Status and Owner filters multi-select; Type and Workstream values available for filtering when corresponding column visible. OR selections within a field, AND across fields; keep matching ancestors; hide-inactive toggle removes Completed/Cancelled unless needed as hierarchy context; clear all resets filter state.
- WBS supports >=3 generations; initial expansion first 2 levels (sample may reveal 3 to demonstrate). Summary bar spans valid scheduled descendants. Summary % = Σ(leaf progress × inclusive planned calendar duration)/Σ(duration), excluding milestones/unscheduled leaves; N/A when denominator zero.
- Segmented Day/Week/Month/Quarter, exact-span Fit entire schedule; optional FS task predecessor arrows, not parent-child WBS connectors. Details drawer read-only with source SharePoint List item link where valid.
- Item links open only for HTTPS URLs whose hostname is exactly `pmicloud.sharepoint.com`, with no user name or password and no subdomain match. Any other URL is disabled. The viewer does not invent a link from the task ID.
- Week columns are Monday–Sunday calendar weeks. Each column is labeled with that week's Monday as zero-padded `mm/dd`, including when that Monday is before the first scheduled day. Month uses those same columns and shows only the ISO week number, one number in every column. A month label is not stretched across two columns and a column is not skipped. The month number is small enough that two digits fit inside the column without overlapping the next label. Quarter keeps its existing minor tick.
- A milestone mark is centered in its one-day column. The center of the diamond is the center of that day.
- Workstream bar colors: 15 approved colors in `03_UI_Design_Spec_v1.3.md`, assigned dynamically per workstream, stable during session and reload/reimport, no status semantics; more than 15 can cycle with differentiation caveat.
- Needs Attention presents `At Risk/Blocked` and `Overdue` counts separately (may overlap). Overdue only tasks not Completed/Cancelled where planned finish < today; do not label inactive tasks overdue or show remaining-days messages for them.

## 3. Excel import and refresh
- `.xlsx` saved from SharePoint List export / refreshed via desktop Excel; `.iqy` itself not supported. User chooses, drag-drops where supported, reloads or switches local workbook; no automatic List synchronization. Preserve prior valid data if import fails.
- Startup: best-effort remember prior file handle; try permitted read; if permission missing display Reconnect file and Choose workbook. On unsupported browsers default to manual picker. No workbook rows stored in localStorage/IndexedDB; storing file handle metadata is allowed with user consent/browser authorization.
- On import show file name, local `Loaded at` time, task count, data validation warnings; optional maximum Modified timestamp labeled "Latest source record modified" (never represent as live SharePoint sync). Forget workbook clears handle + session data.
- Map and validate fields as `02_Excel_Data_Contract.md`; preserve view state on successful reload if possible; fail safely on missing required data.

## 4. Calendar features
- Japanese public holidays 2026–2030 bundled for offline operation. API format: `https://holidays-jp.github.io/api/v1/{year}/date.json` (date key / holiday name value). Fetch additional years opportunistically; incomplete/unverified coverage must warn and avoid falsely precise results.
- Day and Week paint weekends and public holidays with one pale non-working shade, `#eef3f8`, visibly distinct from weekday backgrounds and lighter than a strong blue-gray. On Day, the same shade covers the date cell behind the day number, in the same full-column way as the PGCM highlight. Week shades the chart column for each non-working day. Month and Quarter do not paint this shade. Hover names the holiday; a weekend with no holiday name reads as Weekend. Weekends and weekday holidays share this one shade.
- Remaining workdays: if active task finish < JST today: `Overdue`; finish = today: `0 day` (tooltip) / `0 workdays remaining` (detail); finish later: count weekdays strictly after today up to and including planned finish, excluding Saturday/Sunday and JP holidays, **not** blackout. Tooltip uses `+n days`; detail uses longer wording. Completed/Cancelled: neither hover nor detail remainder appears.
- PGCM recurrence anchor Monday 2026-10-26, every 14 calendar days. Shift a holiday occurrence to the next non-holiday weekday; if actual date within blackout, CANCEL occurrence without changing cadence. Only PGCM dates >= JST today; Day uses full subtle purple column, Week retains v17 marker, Month/Quarter omit. Never show past occurrences.
- Blackout: configurable one inclusive interval (start/end), enabled toggle, cross-year, session only; amber overlay in Day/Week; PGCM cancellation but no impact on remaining workdays or holiday labeling.

## 5. Critical success and acceptance
P0: Excel import works offline; parsing never uploads data; screenshot comparison retains v17; WBS and schedule results correct; status/owner/type/workstream filtering; accurate Finish/Start optional columns; correct 15 workstream colors; no overdue messages for inactive; direct source link only when valid; 2026–2030 holiday fallback; PGCM shift/cancel rules; remaining-workday calculation, blackout controls; UI accessible with keyboard and text alternatives.
P1: Browser-supported remembered file handles; reimport state preservation; robust 2,000-row scrolling; dependency toggle for valid FS edges; accessible legends/tooltips.

Acceptance scenarios:
1. File picker `.xlsx` with all required fields renders correct hierarchy; `.iqy` rejected with guidance; invalid workbook doesn't erase last valid chart.
2. `id` and `parentId` build 3+ nested generations; collapsing hides all descendants and bars; visible rows align with timeline.
3. Filtering Status=[At Risk,Blocked] AND Owner=[A,B] includes matches and ancestor context; hidden Type/Workstream filters do not apply invisibly.
4. Changing zoom preserves task positions relative to real dates; Fit ends exactly at latest scheduled finish and starts at earliest start.
5. Summary percentage uses planned calendar-day weights; milestones/unscheduled tasks excluded.
6. Bar colors follow dynamically assigned workstreams, including 15 distinct default slots; chosen workstream assignment stable after filtering or reload.
7. A Completed or Cancelled task past its finish shows no Overdue text in tooltip, drawer, or overdue KPI.
8. Active tasks: today finish -> `0 day`; future finish -> `+n days`; past finish -> `Overdue`.
9. 2026-11-23 PGCM nominal shifts to 2026-11-24; next nominal remains 2026-12-07.
10. Blackout suppresses adjusted PGCM dates, not cadence, holiday identification, or working-day counts.
11. Day PGCM highlights entire day column; Week uses existing marker. Past PGCM hidden.
12. Clicking a valid exported SharePoint ItemURL opens that exact list item safely; missing/invalid URL disables link.
13. All 2026–2030 holiday data available offline, validated against source before production release.
14. Browser without file-handle APIs remains usable via file picker and never claims a remembered workbook is readable without permission.
15. An `https://pmicloud.sharepoint.com/...` ItemURL opens that item. A link on any other host, including a subdomain, stays disabled.
16. On Day and Week, Saturday, Sunday, and a weekday public holiday are pale `#eef3f8` against white weekdays. On Day, that shade also sits behind the day number. The day number stays readable.
17. Week headers read `mm/dd` of each Monday, one label per week column. Month headers read the ISO week number only, one number per week column, with two digits inside the column and no overlap.
18. A milestone diamond is centered on its day, so both points sit equally relative to the column. On a day narrower than the diamond, the mark extends the same amount past both edges.
19. A task with nonempty `Updates` shows that section at the bottom of the detail pane. Rich text keeps paragraphs, bold, italic, lists, highlights, and https links. The same day shares one date divider. Different days get their own dividers. A cell with no reliable timestamp has no date. Scripts, event handlers, and unsafe links are removed. A task with no Updates shows no empty section. Long Updates scroll inside the pane and do not move the Gantt.
