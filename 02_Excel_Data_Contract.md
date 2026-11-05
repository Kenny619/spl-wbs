> **Current baseline: approved v18.** The Product Owner directive of 2026-11-05 supersedes v17 as the current UI/UX authority and authorizes implementation in PR #15. v17 references below are historical; use the pinned v18 and live product/reference tests for visual acceptance. Read-only access and all eleven Excel Managed Variant decisions remain unchanged.

# Excel / SharePoint export data contract v1.3

## Workbook source
A saved `.xlsx` file produced from a SharePoint List export or Excel's refreshed SharePoint query. Viewer does not parse `.iqy`, call SharePoint endpoints, or execute workbook formulas/macros. Prefer worksheet `ProjectWBS`; specify row 1 as header, one task per row. Keep a dedicated SharePoint export view with required columns.

| Canonical property | Typical export headers | Value/rules | Required |
|---|---|---|---|
| `id` | `ID` | Stable item key, normalized string | Yes |
| `taskName` | `Title`, `Task Name` | Nonempty text | Yes |
| `wbsCode` | `WBSCode`, `WBS` | Unique within project | Yes |
| `parentId` | `ParentTaskID` | Optional reference to `id` | No |
| `taskType` | `TaskType`, `Type` | Summary / Task / Milestone | Yes |
| `plannedStart` | `PlannedStart`, `Start` | Date-only, Excel serial or unambiguous ISO | Conditional |
| `plannedEnd` | `PlannedEnd`, `Finish` | Date-only, >= start for duration task | Conditional |
| `progress` | `Progress`, `Done` | 0..100, no fraction unless explicit mapping | No |
| `status` | `TaskStatus`, `Status` | Not Started / In Progress / Completed / At Risk / Blocked / Cancelled | No |
| `owner` | `AssignedTo`, `Owner` | Person display name string | No |
| `workstream` | `Workstream` | Any string; drives palette, not predefined phase | No |
| `sortOrder` | `SortOrder` | Numeric optional. Stored when valid. Display order follows `wbsCode`, then `id`. | No |
| `priority` | `Priority` | Display field optional | No |
| `predecessorIds` | `PredecessorIDs` | Delimited stable IDs (FS in MVP) | No |
| `description` | `Description` | Plain text; escape DOM | No |
| `updates` | `Updates` | Optional SharePoint rich text. Stored as HTML and sanitized at render. Missing or blank is null and shows no section. | No |
| `modified` | `Modified` | Timestamp, optional freshness indicator. Never used as an Updates timestamp. | No |
| `itemUrl` | `ItemURL`, `Link to item` | Per-item HTTPS SharePoint List URL | No |

## URL behavior
Prefer explicit export `ItemURL`, never synthesize arbitrary item links from just an ID. A link is enabled only when it is HTTPS, has no user name or password, and its hostname is exactly `pmicloud.sharepoint.com`. Subdomains, other SharePoint hosts, `javascript:`, `data:`, and malformed URLs stay disabled. Escape attribute values and use `target=_blank rel=noopener noreferrer`. Missing or rejected ItemURL: disabled link with explanation. Optionally enrich the Excel workbook/export view to provide a source link, subject to company policy. Adding another hostname is a new approved decision.

## Validation
- Missing required headers blocks import; blank/duplicate IDs, cycles, missing parents, malformed dates, duplicate WBS codes create actionable errors; never silently misalign task bars.
- Milestone needs one valid date. Summary dates derive from children. Unscheduled/invalid leaves have no bar and must be flagged.
- Excel date systems (1900/1904) and leap-day edge cases need tests; avoid timezone shifting date-only cells and ambiguous localized date coercion.
- Unknown/empty owners/statuses/workstreams should be normalized consistently (`Unassigned` / `Unknown`) for filters and palette.
- Summary rollup uses only eligible scheduled non-milestone leaves, inclusive planned calendar-day duration.
- "Latest source record modified" represents the maximum reliable `modified`, not workbook export time and not live data.
- `Updates` is optional. Other column mappings stay unchanged when the column is absent. HTML entities stay in the stored string and are decoded when the entry is rendered. A timestamp splits entries only when a block's entire text is a date, optionally with a time, or the value is a JSON array of `{html, timestamp}` or nodes with `data-entry-date` / `data-update-timestamp`. A date mentioned inside a sentence does not split the cell and does not create a date. Slash dates are read as month/day/year. Times display as 24-hour `HH:mm`. Entries sort newest first. One date divider is drawn per day change. Undated content stays one entry with no invented date.

## Fixture set required
Include valid 3-level WBS, 15 workstreams, Completed/Cancelled overdue-dated tasks, status+owner cross filters, 2026-11-23 PGCM, blackout spanning Dec/Jan, missing ItemURL, malicious URL/text, corrupt file, alternate header labels, Excel serial dates and invalid parent cycles. Never use real company WBS data in public or personal test repositories.
