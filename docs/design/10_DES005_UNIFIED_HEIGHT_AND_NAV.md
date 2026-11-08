# DES-005 — Unified Workspace Heights, Panel Scrolling and Fixed Header Navigation (proposed 0.1)

**Product Owner feedback date:** 2026-11-08 JST  
**Stage:** D1 holistic UI iteration · **Status:** Design proposal (not approved for implementation or merging)  
**Controlling issue:** [SPT-WBS UI Overhaul #25](https://github.com/Kenny619/spl-wbs/issues/25) · **Design draft PR:** [#29](https://github.com/Kenny619/spl-wbs/pull/29)

**New interactive prototype:** [DES-005 — Unified Height and Scroll](../../design/concepts/DES-005-unified-height-and-scroll.html). DES-004 remains unchanged as a historical prototype.

## Product Owner request → design disposition

| Owner request | DES-005 response | Design safeguard |
| --- | --- | --- |
| Schedule and Meeting list/detail boxes should use the same full viewable height, with scrolling as needed | Both Schedule and Meeting workspaces now occupy the **same available viewport height** beneath the desktop header. The Gantt/WBS table and Meeting task list scroll **inside their own panels**. The selected-task detail panel fills the corresponding height in both views and scrolls internally only when its content overflows. | Avoid short `max-height` restrictions, clipped long updates, and page-level scrolling on supported desktop widths. Preserve source task/edit controls. |
| Reports should scroll in its box, not the entire page; navigation always visible | Reports becomes a full-height **report-workspace** with fixed report navigation/period/Generate/Copy controls and an independently scrollable **report-content** region that contains presentation or plain-text preview. | Keep both top app navigation and report-specific actions visible. Report generation semantics remain frozen under [Issue #7](https://github.com/Kenny619/spl-wbs/issues/7); this is design-only. |
| Header navigation button locations should not change between views | Use a **fixed-column desktop header layout** and reserve a constant slot for Schedule-only phase actions. When not applicable, those actions are invisible, not removed from layout. Project subtitle length cannot move the navigation controls; navigation buttons have the same order/location across Schedule, Meeting and Reports. | At narrow/zoomed widths, the header reflows predictably to a stable second row. It may become two lines for accessibility, but the navigation position does not depend on selected view. |

## Layout rules for holistic visual review

### Shared desktop behavior
- **Header:** fixed approximately **60 CSS px** in this mock; fixed-width navigation track with a permanently reserved phase-control area. This is a *candidate design value*, not a frozen UI token.
- **Workspace:** all three views occupy the remaining viewport height, e.g. `100dvh - 60px`. No parent-page vertical scrolling in normal desktop mode.
- **Schedule:** Gantt/WBS list and chart area can scroll within the Schedule panel; selected task detail stays anchored beside it at **full matching panel height**. Table header remains sticky inside the schedule scroll region.
- **Meeting Review:** filters and task-list column headings remain visible; scroll the task list independently. The selected task detail remains in position and uses the same full-height behavior as Schedule.
- **Reports:** top report bar (Latest Status/Update, Preview/Present, Generate/Refresh, Copy) and the date-period controls are outside its scroll container. Only generated report content scrolls.
- **State:** task-list and Schedule scroll offsets survive selection re-renders; report scroll offset survives non-navigation redraws; deliberate change of report mode or Preview/Present resets report scroll to top.

### Narrow-screen and accessibility fallback
- At effective widths ≤970 CSS px (such as zoomed browsers), **permit natural page scrolling** and stacked panels rather than forcing fixed-height regions that could hide controls.
- At very narrow widths, use a deterministic multi-row responsive header rather than allowing nav buttons to overlap. Buttons must keep their location **consistent across view changes at the same viewport width**.
- Long task detail content uses an internal detail scroll at desktop, so no records are clipped. All scrollable regions should remain keyboard reachable, with visible focus and independent wheel/trackpad behavior. The prototype has keyboard-focusable task-list, schedule, and report scroll containers; actual browser usability remains to be tested.
- Avoid promising pixel-perfect one-row navigation at 200% zoom: prioritize accessible reflow while preserving stable navigation ordering.

## No new functional requirements
This iteration changes layout and navigation positioning only. The existing hybrid-risk and commitment proposal, dependency links, filter behavior, sample calendar with Japanese holidays and synthetic project blackout dates, Latest Status and proposed Weekly Update reporting content remain as in DES-004. No workbook file writes, permissions or backend operations occur in the design HTML.

**Frozen contracts remain untouched:** [EMV-WB-1.0 #3](https://github.com/Kenny619/spl-wbs/issues/3), [EMV-EDIT-1.0 #4](https://github.com/Kenny619/spl-wbs/issues/4), [EMV-REPORT-1.0 #7](https://github.com/Kenny619/spl-wbs/issues/7), and the approved v18 viewer reference. DES-005 does not authorize a product implementation, merge, release, deployment or contract freeze.

## Source-level verification
- JS syntax parser: **PASS**.
- Mocked DOM interaction checks: **18/18 PASS** on prototype source. Checks include one fixed-width header nav track, reserved Schedule-phase space, uniform full-height parent layout, default Meeting scroll, preserved list scroll after selection, Schedule panel scroll and selected-detail height, preserved Schedule offset, Reports toolbar outside independent scroll container, Reports content scroll, mode/preview transition behavior, returning to another view and narrow fallback presence.
- **Actual Chromium/Edge visual QA remains pending:** compare rendered panel tops/bottoms after switching Schedule ↔ Meeting; use long All Workstreams lists; scroll Schedule and Reports with wheel/trackpad; verify top navigation and Reports controls stay visible; check 1366×768 and 1440×900 at 100% / 125% zoom, plus accessible responsive fallback. Source checks alone do not prove these interactions in a browser.

## History
- DES-005 v0.1 (2026-11-08): three owner-approved design feedback points incorporated into a **new design prototype**, preserving DES-004 for traceability.
