# DES-004 — One-Header, List-Scroll / Fixed-Detail Meeting Review (proposed 0.1)

**Date:** 2026-11-08 JST · **Status:** D1 draft concept / not frozen or approved for implementation · **Controlling:** [Issue #25](https://github.com/Kenny619/spl-wbs/issues/25), [design PR #29](https://github.com/Kenny619/spl-wbs/pull/29).

**Interactive source:** [DES-004-single-header-fixed-detail.html](../../design/concepts/DES-004-single-header-fixed-detail.html). **Predecessor:** [DES-003](../../design/concepts/DES-003-filtered-meeting-and-weekly-report.html), retained unchanged as historical review reference.

## Owner feedback / design disposition

| Owner's observation | DES-004 change | Intended behavior and residual questions |
| --- | --- | --- |
| List/detail balance is good | **Preserve the DES-003 width relationship**; do not redesign the core two-column meeting grid | Size still requires holistic viewport proof and actual owner visual sign-off |
| Three concept-explanation boxes at bottom are unnecessary | Remove the entire lower comparison strip | The concept switcher in the single header remains only for owner exploration, not a frozen end-user navigation pattern |
| All Workstreams causes full-page vertical scrolling, moving task details away | In **Meeting Review at laptop/desktop widths**, lock the top-level viewport and keep the **list as an independently vertically scrollable region**. Header, filters, list column headers and adjacent task-detail card remain fixed while the list scrolls. Retain list scroll position when selecting another task; reset when filters change; linked task selection reveals the destination. | On constrained widths **≤970px**, restore natural document scrolling / stacked panels to prevent inaccessible content. On very short desktop viewports or exceptional long detail, the **detail card may scroll internally** while its outer card stays anchored, so no content is clipped. Validate keyboard, scroll focus and wheel interaction in actual Edge. |
| Two-row overall page header wastes space | Merge brand, project identity, concept navigation and conditional Schedule stage actions into **one compact desktop header**. Remove the standalone project/context header row. | Responsive narrow-width wrapping is an accessibility fallback; do not force content off screen to achieve a cosmetic single-row requirement. |
| Say **days**, not “workdays” | User-facing summary/filter/countdown labels now use **Days left**, **Due in <5 days**, and e.g. **3 days left** or **2 days overdue**. Counting logic is unchanged: include *working dates only*, excluding weekends, JP holidays and project blackout dates. Calendar information is available in a collapsible legend and contextual tooltip. | Never change the calculation to elapsed calendar days simply because the label was shortened; keep meaning discoverable. “Days” is a concise product-specific term for calendar-aware **working days** in task/meeting context. If shown outside this context, clarify its semantics. |
| Detail should show WBS number and workstream name | Add **labeled Workstream and WBS identity chips in the selected task panel**, immediately above task title, visible in read and edit states. | Avoid duplicating a tiny subtitle plus identity labels. Respect source workstream and WBS code; orphan/empty values to be handled in the actual product design. |

## Fixed-view layout hypothesis
At **1366×768 logical pixels** with desktop Meeting Review selected:
- App top header approximately 60 CSS px, one row.
- The meeting page's outer body and content area **do not scroll vertically**. Instead: the item list panel is a flex column with fixed heading/filters/column headings and `meeting-data` uses `overflow-y:auto;min-height:0;flex:1`.
- The selected detail panel stays in the same visible position when All Workstreams has 11 (or many more) tasks and the user scrolls the list.
- The selected task remains visible in detail when selecting an item; preserve list `scrollTop` across DOM redraw for selection, but reset when query/filter changes. Navigation through a predecessor/successor link resets restricting filters as needed and attempts to bring the linked task into view.
- At small/laptop display scaling and narrower viewports, do not trap the page inside an inaccessible fixed-height box. Responsive fallback is explicit; actual product design may use resizable panes or collapse detail.

## Days semantics — no regression to calendar-day arithmetic
The DES-003 sample calendar is preserved: simulated meeting/reference date **2026-11-09**, Mon–Fri working week, Japan holidays **Nov 03 and 23**, sample **project blackout Nov 12 and Nov 20**. The `workdayCount` calculation remains the single source for filter and label values; **only terminology changed**. Results are not estimates of task remaining effort, elapsed days, or completion percent. The actual production calculation still needs an approved project calendar source (Issue #20) and corresponding spec tests.

## Scope and risk safeguards
- The full feature proposal remains **unapproved**. Frozen EMV-REPORT-1.0 in [Issue #7](https://github.com/Kenny619/spl-wbs/issues/7) and workbook/history/editor contracts remain authoritative.
- The simulated task editor still does not persist Excel data. All report lifecycle events and project blackouts are synthetic; implementation of real reporting events and project-owned settings remains separately scoped.
- **No modification** to approved v18 UI baseline, running app, current feature branch or releases. This draft does not authorize merging.
- Source does not imply rendered browser/Edge screenshot acceptance.

## Source-level checks, pending browser visual review
- JavaScript syntax: **PASS**.
- Mocked-DOM test results: **19/19 PASS** for single-header/no concept footer, default fixed Meeting state, task list scroll region, WBS/workstream labels, concise days and calendar legend, selected-task scroll preservation, All Workstreams list/filter reset, blackout arithmetic, editing and Save/Cancel guard, Schedule/Reports unlock behavior, and return to fixed Meeting view.
- **Not yet verified:** true scrollbar isolation, 1366×768 rendered fit, browser zoom 125%–200%, keyboard focus preservation across re-renders, actual Edge wheel/trackpad behavior, screen-sharing readability and panel overflow. These require rendered review; CSS/source smoke alone is not sufficient.

## Next owner visual critique
Review at 1366×768 or comparable laptop size with **All · Workstreams** active. Scroll long task lists while watching selected detail remain in place; then use a dependent-task link, Edit, and switch to Reports. Verify whether the single-line top bar and compact Days wording actually reduce distraction without concealing critical information.
