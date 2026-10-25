# Gantt Viewer

Read-only schedule viewer for one project. Open a SharePoint List `.xlsx` export and review the WBS, dates, progress, and calendar in the browser. The viewer never writes back to the workbook or to SharePoint.

Open `dist/index.html` in Chrome or Edge. It also works from a `file://` address. Choose **Choose workbook**, or drop an `.xlsx` file onto the page.

- **Reload** reads the same file again.
- **Change** picks a different workbook.
- **Forget** drops the remembered file and the workstream colors for this browser session.
- On a compatible browser, the previous file can be offered again after you return. Permission is requested only after you click. Task rows are not stored.

The page title is the file name without `.xlsx`.

## Excel setup

Export or refresh the list to a real `.xlsx` file. Web-query `.iqy` files, formulas, and macros are not read. Put the schedule on a worksheet named `ProjectWBS`. If that sheet is missing and the workbook has exactly one sheet, that sheet is used and a warning is shown. Several sheets and no `ProjectWBS` sheet stops the import.

Row 1 is the header row. One task per row, starting on row 2. Empty rows are skipped. Header matching ignores spaces, punctuation, and capitalization. Unknown columns are ignored. Two headers that mean the same field stop the import.

### Columns

| Field | Accepted headers | Required | What to enter |
|---|---|---|---|
| ID | `ID` | Yes | Stable item key. Unique in the sheet. Text or number. |
| Task name | `Title`, `Task Name` | Yes | Non-empty name. |
| WBS | `WBSCode`, `WBS` | Yes | Display code. Unique in the sheet. This is a label, not the parent link. |
| Type | `TaskType`, `Type` | Yes | `Summary`, `Task`, or `Milestone`. |
| Parent | `ParentTaskID` | No | The parent row’s `ID`. Blank means a top-level row. |
| Start | `PlannedStart`, `Start` | For tasks | Date only. Excel date, Excel serial, or `YYYY-MM-DD`. |
| Finish | `PlannedEnd`, `Finish`, `End` | For tasks | Date only. Same as start, or later. |
| Progress | `Progress`, `Done` | No | Whole number 0–100, or an Excel percent. Blank stays blank. |
| Status | `TaskStatus`, `Status` | No | One of the six statuses below. |
| Owner | `AssignedTo`, `Owner` | No | Person’s display name. |
| Workstream | `Workstream` | No | Any label. Color comes from first-seen order, not from the name. |
| Sort | `SortOrder` | No | Number. Rows with a sort value come before rows without one. Ties use `ID`. |
| Priority | `Priority` | No | Accepted and stored. It is not shown in the table, the chart, or the detail panel. |
| Predecessors | `PredecessorIDs` | No | Other rows’ `ID` values, separated by comma, semicolon, or space. |
| Description | `Description` | No | Plain text for the detail panel. |
| Modified | `Modified` | No | Timestamp. The latest value is shown as “latest source record modified.” |
| Item link | `ItemURL`, `Link to item`, `URL` | No | HTTPS link on `pmicloud.sharepoint.com`. |

### Task types and dates

- **Task.** Needs both a start and a finish. The finish must be on or after the start. A task with a blank or unreadable date stays in the list and has no bar.
- **Milestone.** Needs one date. If both start and finish are filled, they must be the same day. The chart draws a diamond on that day.
- **Summary.** Dates in the Excel row are replaced. The bar runs from the earliest planned start to the latest planned finish among scheduled leaf descendants. Parent links come only from `ParentTaskID`. A summary whose children have no dates has no bar. If every `ParentTaskID` is blank, nothing rolls up.

Both the 1900 and 1904 Excel date systems are accepted. A date is kept as a calendar day, so the viewer does not shift it across a time zone.

### Progress, status, and people

Progress is a percent already in the range 0–100. If the cell’s Excel format is percent, or the text ends with `%`, the viewer multiplies by 100. `50%` and `50` both mean halfway. A value outside 0–100 is ignored and reported. Blank progress is empty on a task. On a summary it counts as 0 while weighting the rollup.

Summary progress is the duration-weighted average of its scheduled **Task** leaves. Duration is the inclusive number of calendar days from planned start through planned finish. Milestones are left out of that average. If there is nothing to weight, progress is **N/A**. The overall progress card uses the same rule across the whole sheet.

Status must be one of:

`Not Started`, `In Progress`, `Completed`, `At Risk`, `Blocked`, `Cancelled`

A blank or unrecognized status becomes **Unknown**. A blank owner or workstream becomes **Unassigned**. A summary keeps the status imported on its own row.

### Hierarchy, order, and links

`ParentTaskID` must match an `ID` in the same sheet. A missing parent, a parent cycle, a blank ID, a duplicate ID, or a duplicate WBS code stops the import and lists the row. The chart is not drawn from a partial tree.

Predecessor cells store task IDs only. `FS`, `SS`, `FF`, `SF`, and lag such as `+2d` are skipped with a warning. Unknown IDs are skipped the same way. Turn on **Dependencies** to draw a finish-to-start arrow for each kept ID.

`ItemURL` opens only when it is HTTPS, has no user name or password, and the host is exactly `pmicloud.sharepoint.com`. Any other link is disabled and the detail panel says the task has no allowed ItemURL. The viewer does not invent a link from the ID.

### When import stops

These problems reject the workbook: missing required column, two headers for one field, unreadable file, no usable sheet, blank or duplicate ID, duplicate WBS, parent ID that is not in the sheet, parent cycle, unreadable date, finish before start, or a type other than Summary, Task, or Milestone.

Warnings still load the chart. Typical warnings are a missing optional column, a task with no dates, a milestone whose two dates differ, an ignored predecessor token, an out-of-range progress value, or a rejected link.

## Using the viewer

### Summary cards

- **Total tasks** counts every row that is not a Summary. Milestones are included.
- **Overall progress** is the duration-weighted progress of scheduled tasks.
- **Needs attention** shows two numbers: rows that are At Risk or Blocked, and rows whose finish is before today. Completed and Cancelled rows are not called overdue. Summaries are left out of both counts.
- **Milestones** counts milestone rows.

“Today” is the current date in Asia/Tokyo.

### Work breakdown

WBS and Task stay on screen. Owner, Status, and Finish are on by default. **Columns** can add Done, Start, Workstream, and Type. The chevron in the Task header expands or collapses every group. A newly imported file opens the first level and leaves deeper groups closed.

Search matches WBS code, task name, and owner. **Filters** are multi-select. Several values inside one filter match any of them. Different filters all have to match. Matching children keep their ancestor rows so the tree still makes sense. Status and Owner filters apply while those columns are visible. Type and Workstream filters appear only after those columns are shown. **Hide inactive** removes Completed and Cancelled rows.

The footer counts visible rows and total imported records.

### Timeline

The chart spans the earliest planned start through the latest planned finish.

- **Day** shows the day number. Weekend and holiday columns are shaded, including the day-number cell. A holiday name appears on hover.
- **Week** labels each column with the Monday of that week, as `mm/dd`.
- **Month** labels each column with its ISO week number.
- **Quarter** shows month groups with a light tick mark.
- **Fit entire schedule** sizes the span to the timeline pane. Choosing Day, Week, Month, or Quarter leaves fit mode and uses a fixed scale.
- **Today** scrolls to the current date. A vertical line marks today when it falls inside the span.
- Drag the divider between the table and the chart. Arrow keys move it while it is focused. Home and End jump to the limits.

Bars use the workstream color. Summary bars are lighter. A milestone is a diamond centered in its day. Hover a bar for the short remaining-work text: `0 day`, `+n days`, or `Overdue`. Completed and Cancelled rows omit that text.

### Task details

Click a row or a bar, or press Enter or Space on a focused row or bar. Arrow Up and Arrow Down move between rows. The panel shows owner, workstream, planned dates, WBS, type, progress, description, predecessor names, and the SharePoint link. Escape closes the panel, and also closes Filters, Columns, and Calendar settings.

Remaining working days count weekdays after today through the finish date, skipping weekends and Japanese public holidays. Blackout days still count as working days. Completed and Cancelled rows hide this line. A finish with no holiday table for that year says **Holiday coverage incomplete** instead of a number.

### Calendar

Japanese weekends are Saturday and Sunday. Public holidays for 2026–2030 are bundled. That table is provisional until it is checked against the official calendar. A year outside that range is requested by year from the holidays-jp API when the browser can reach it. Weekend and holiday shading is drawn on Day and Week views.

**PGCM** meets every 14 days starting 2026-10-26. A date that is not a Japanese working day moves forward to the next one, up to 14 days. If that adjusted date sits in a blackout, the meeting is hidden and the following date stays on the original cadence. Only meetings on today or later, inside the schedule span, are shown. Day view shades the whole column. Week view shows a marker and tag. Month and Quarter views omit PGCM.

**Calendar settings** holds an optional blackout range. The range is inclusive, lasts for this session only, and starts off. It is drawn in amber on Day and Week views. It does not change holiday shading or remaining-workday counts. Apply requires a start and an end, with the end on or after the start.

### Workstream colors

The first 15 distinct workstream names in sheet order receive the fixed palette. Later names reuse those colors from the start. The same name keeps its color for the browser session, including after reload. **Forget** clears the map.

## Develop

```bash
npm install
npm run dev
npm run build
npm test
npm run test:e2e
```

`npm run build` writes one self-contained `dist/index.html` and `dist/SHA256.txt`.
