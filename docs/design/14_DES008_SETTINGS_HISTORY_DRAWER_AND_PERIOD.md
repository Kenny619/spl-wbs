# DES-008 — Settings Drawer, Action-Log History, Real App Icon and Eight-Day Report Window

**Date:** 2026-11-08 JST · **Stage:** D3 interaction exploration, **PROPOSED (not a visual/system freeze)**  
**Controlling:** [Issue #25](https://github.com/Kenny619/spl-wbs/issues/25) · Draft design [PR #29](https://github.com/Kenny619/spl-wbs/pull/29).  
**Current interactive prototype:** [DES-008-settings-history-drawer.html](../../design/concepts/DES-008-settings-history-drawer.html).  
**Predecessor:** [DES-007](../../design/concepts/DES-007-integrated-history-settings-states.html) preserved as historical concept. The **DES-006 owner-endorsed working-view layout** remains the selected D2 reference.

## Product Owner feedback and DES-008 resolution

| Feedback | Proposed UI behavior | Scope boundary |
| --- | --- | --- |
| Top-right **Settings**, with **History within Settings menu** | Replace More with **⚙ Settings**, keeping the same reserved header slot. Settings opens the right drawer and contains **Preferences** / **Change History** sections and an explicit **View Change History** entry. Task-specific History opens the same drawer with the task prefiltered. | Secondary navigation; primary Schedule/Meeting/Reports locations remain stationary. #5 history and #6 settings contracts are unchanged. |
| Show current application version | Small version label beside the product name plus an **About this application** section containing both **Package version v0.0.0** (verified `package.json`) and **Approved UI baseline v18** (verified repository README). | `0.0.0` is the repository package metadata and is currently a **placeholder**, not evidence of a public release number. Final implementation should bind actual build/release metadata when available, without conflating UI design revisions with package versions. |
| Replace boxed W with app icon | Reuse the **original embedded `data:image/x-icon` favicon** from the repository's production `index.html`, embedded unchanged as an image inside the prototype. | No newly invented product logo. The original icon is large because the multi-resolution ICO is embedded inline; optimize/serve the actual app asset appropriately for production. |
| Settings should slide in from right and accommodate growth | **Right-side slide-out drawer**, wide enough for more sections, with its own scrollable contents, pinned heading and Preferences/Change History navigation. Avoid a centered overlay for Settings and History. Reset confirmation stays inline inside Settings, not in a separate centered dialog. | A centered decision modal remains for *unsaved edits* where Save/Discard/Cancel is essential. Drawer slide/ARIA/Fast Escape/focus-cycle are design examples, not validated accessibility acceptance. |
| History log, **one row per action** | Read-only chronological **log table**, one line per individual saved field-change action (timestamp, WBS/task, action, before → after). Shared Save ID is retained in each row; alternate subtle left borders/backgrounds visually associate multiple rows from one Save without consuming separate log rows. Field and task filters are available. | `UpdateHistory` still uses one row per field change; #5 Save-group association is not discarded. No reconstruction from free-text Updates, fake risk lifecycle events or unaudited current data. The demo uses immutable sample data only. |
| Default report period **8 calendar dates inclusive**, matching weekday | For simulated Monday meeting **Nov 09, 2026**, default **Monday Nov 02–Monday Nov 09**, **both dates included**. When the selected meeting date changes, the default start becomes **meeting date minus 7 calendar days** (unless the user has explicitly customized the range). | This is **a proposed convenience default**, not a rolling 8×24-hour range and **not yet a frozen amendment** to Issue #7. The report remains a fixed snapshot until explicit Generate/Refresh; actual v1 timezone boundary logic remains #7/#6-controlled. |

## Behavioral invariants
- DES-006 core: fixed navigation, same Schedule/Meeting selected inspector width and full-height pane heights, independent list/report scrolling, task relationships, workstream/owner/due filters.
- The right pane closes by **Close**, backdrop click or **Escape**. It uses a fixed panel occupying the right edge, not an all-page replacement. Prefers reduced motion and responsive full-width fallback; focus is moved to Close upon initial open and a basic Tab cycle is provided for the pane. Actual Edge/assistive-tech verification remains open.
- **Global History**: Settings → Change History; source is synthetic. **Task History**: selected task → History directly opens same pane with TaskID filter; entering task-specific history resets an old field filter to **all changes** so it does not hide relevant actions.
- **Source timestamps**: format UTC instants in chosen display timezone; date-only planned finish stays unchanged.
- A dirty task draft **must** remain protected by Save / Discard / Cancel when navigating to Settings or another workspace. No-op draft transitions avoid unnecessary prompts. Simulated Save writes browser-memory task data only and **does not persist Excel or audit history**.
- In DES-008 the Settings selections are session-memory illustration; Appearance/Columns are not actual UI transformations, browser storage persistence is not implemented. Do not claim parity with frozen #6.
- The proposed weekly event-summary Update Report is still **not** the frozen #7 UpdateHistory-only report. No change to task creation/risk-watch lifecycle event schemas is authorized.

## Eight-day default test cases
- Review date `2026-11-09` (Monday): inclusive `2026-11-02` → `2026-11-09`; **8 dates**.
- Review date `2026-11-10` (Tuesday): inclusive `2026-11-03` → `2026-11-10`; **8 dates**.
- Review date `2026-11-08` (Sunday): inclusive `2026-11-01` → `2026-11-08`; **8 dates**.
- Period boundaries need to follow the selected **IANA display timezone**, the required historical UTC conversion and DST rules in frozen #6/#7 for actual production reporting. Synthetic fixture does not fully implement them.

## Checks and verification status
- Inline JS syntax parser: **PASS**.
- Source/mock behavior test: **22/22 PASS** after correcting the header package version literal and task-history filter entry reset. Verified: genuine favicon embedded, package/UI version display, fixed primary navigation, Settings opens drawer, History within Settings, three action rows from two Save events, shared Save identity and visual grouping, workstream orientation, task/action filtering, timezone-independent planned dates, reset confirmation inline, drawer close/Escape, task History, dirty-edit protection, and Monday-to-Monday default report snapshot.
- **Not rendered in a real browser yet:** slide transition, icon visual crispness, actual scroll containment, task-details viewport height, mobile/zoom reflow, accessibility keyboard trap/focus restoration, screen readers, clipboard parity, or real XLSX data safety. Source-level mock checks are **not** Owner UAT or an implementation result.
- The finalized exact HTML artifact must still be visually reviewed at laptop and video-call sizes before design freeze.

## Authority
**Design source and docs only.** Do not change frozen [#3 workbook](https://github.com/Kenny619/spl-wbs/issues/3), [#4 editing](https://github.com/Kenny619/spl-wbs/issues/4), [#5 History](https://github.com/Kenny619/spl-wbs/issues/5), [#6 Settings](https://github.com/Kenny619/spl-wbs/issues/6), [#7 Reports](https://github.com/Kenny619/spl-wbs/issues/7), project calendar Issue #20, or the currently accepted **v18 UI baseline**. No production code, merge, release, deployment, app rebranding or formal D3 freeze was approved by this discussion.
