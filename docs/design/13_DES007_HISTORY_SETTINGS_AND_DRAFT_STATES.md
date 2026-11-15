# DES-007 — Integration-State Companion to Owner-Endorsed DES-006 (historical proposed concept)

> **Superseded for current interaction critique by [DES-008](../../design/concepts/DES-008-settings-history-drawer.html) on 2026-11-08.** Retained as the earlier More/centered-overlay design. DES-008 places Settings and History in a right slide-out pane, shows action-level history, authentic app icon/version metadata, and an eight-inclusive-date reporting default. See [design record](14_DES008_SETTINGS_HISTORY_DRAWER_AND_PERIOD.md).

**Date:** 2026-11-08 JST  
**State:** D3 integration concept / PROPOSED, **not** a visual-system freeze or implementation authorization  
**Owner-approved D2 layout reference:** [DES-006](../../design/concepts/DES-006-consistent-detail-width.html), blob `b833afeefe5fa3392b17efea79589bd7eede390f`  
**New design-only prototype:** [DES-007-integrated-history-settings-states.html](../../design/concepts/DES-007-integrated-history-settings-states.html)  
**Controlling:** [Issue #25](https://github.com/Kenny619/spl-wbs/issues/25), draft [PR #29](https://github.com/Kenny619/spl-wbs/pull/29).

## Design intent and constraints
The Product Owner endorsed DES-006's Schedule/Meeting/Reports information architecture and pane proportions. DES-007 is a **companion interaction study** that preserves the already liked **three primary navigation buttons, stationary header track, full-height panels, independent scroll and fixed inspector width**. It explores where frozen editing, History and Settings responsibilities live **without allocating new permanent top-level workspace tabs or re-opening the accepted layout direction**.

The `More ···` button occupies the pre-existing reserved right-hand header region; it exposes **Global Change History** and **Settings** as secondary actions. **Task-specific History** is a concise adjacent action in the selected task inspector, alongside Edit. This secondary navigation placement is a **proposal for integrated usability review**, not a separately authorized app feature.

## Included interaction scenarios (simulation only)

| Scenario | What DES-007 demonstrates | What remains unproved |
| --- | --- | --- |
| Global History | More → Change History opens read-only modal. Synthetic logical Saves are grouped with timestamps, affected tasks and field old/new. One synthetic Save contains changes across two workstreams. | No real `UpdateHistory` reads, history validation, long-text comparison, filtering, permission or source-repair action. Frozen [#5](https://github.com/Kenny619/spl-wbs/issues/5) still controls. |
| Task History | Selected task → History opens only that TaskID's matching example rows, with a route to the global view and return to selected task. | No production TaskID lookup, focus restoration proof or real saved snapshot semantics. |
| Display timezone | Settings → change IANA timezone among three example options; sample UTC instant is formatted in the chosen zone. A date-only planned finish remains unchanged. | Full IANA validation, daylight-saving boundary suite and browser-detected default are not implemented. Frozen [#6](https://github.com/Kenny619/spl-wbs/issues/6) controls. |
| Appearance/Columns | Settings includes example System/Light/Dark and Owner/Status/Finish options and confirmed Reset. | These are **session-only illustrative selections**; no actual theme transition, grid-column reconfiguration, browser storage persistence or full reset parity. Do not mistake for implementation. |
| Dirty task navigation | An actually changed in-memory editor draft followed by Schedule/Meeting/Reports navigation or task selection opens **Save / Discard / Cancel**. Cancel returns to the unmodified editor DOM. Discard leaves without writing. Demo Save validates simple values and updates sample memory before proceeding. | No Excel save, source conflict protection, backup, readback, transaction, audit append, recoverable uncertainty or complete field validation. Frozen [#4](https://github.com/Kenny619/spl-wbs/issues/4) and [#3](https://github.com/Kenny619/spl-wbs/issues/3) control. |
| No-op draft navigation | If visible fields and update composer have not changed, navigating away does **not** show the three-option warning. | Full production dirty-state detection, cross-field equality and any rich-content normalization remain to be validated. |
| Reports continuity | Existing Reports output preview remains reachable from the identical primary nav slot after Save/Discard resolution. | Reports are sample snapshots; approved v1 requires committed-only `UpdateHistory`-backed reporting, strict preview/copy parity and no workbook write. See [#7](https://github.com/Kenny619/spl-wbs/issues/7). |

### Preserved visual contract
- Same Schedule/Meeting **inspector width**; no new global-tab displacement.
- Same full-height workspace, internal list/table/report scrolling, fixed report actions.
- Same Workstream/WBS labels, deadline-oriented day counts, dependent-task links and meeting filters.
- New modal surface is *temporary*, leaves underlying selected task and current scroll context intact.
- All sample edit/history/settings interactions are clearly identified as synthetic. No cross-project state or spreadsheet is read or changed.

### Known gaps / do not overstate
1. The Edit flow's **owner/workstream/date filter** controls still show the DES-006 simplified draft guard rather than the three-way route; global view change and task selection illustrate the requested frozen decision. All navigation destinations and failure paths require consistent contractual handling in D3.
2. Keyboard focus trapping and restoration, Escape behavior and screen-reader dialog semantics have not been verified in a real browser. Modal `role=dialog` is not evidence of accessible behavior by itself.
3. Settings selections do not apply a real Light/Dark visual system or save to local storage. Do not claim parity with frozen Settings.
4. Risk/watch engine, accepted commitment, historical lifecycle events and suggested weekly stakeholder-report enhancements are **future separate scope**, not covered by this integration prototype.
5. The appended human-readable task Updates field is not the same as the synthetic, read-only Save-based Change History view.
6. One human Product Owner reviews designs; AI functional/source checks cannot substitute owner visual UAT.

## Evidence
- Inline JavaScript compilation **PASS**.
- **11/11 mocked-document interaction assertions PASS:** initial Meeting screen, More and global History, task-specific history filter, Settings entry, timezone-induced timestamp display difference without shifting date-only planned finish, reset confirmation, no-op edit navigation without prompt, changed draft Save/Discard/Cancel, Cancel preserving the current editor and simulated Save/Discard navigation paths.
- These are **source-level, not rendered Edge browser or workbook tests**. No screenshot capture, keyboard/focus assessment, true visual fit or Chrome/Edge clipboard checks. The established D3 visual/QA gate remains open.

## Next D3 owner scenario review
With DES-007 downloaded to Edge, try **Meeting → Edit → change Owner → Schedule** and use Cancel, Discard and Save in separate trials. Then use **Task History**, **More → Global History**, **More → Settings** and return to the selected task. The question for the Product Owner is whether the new secondary entry points respect the accepted DES-006 simplicity, **not** whether real workbook functionality has been implemented.

## Implementation boundaries
Design HTML and documentation only. Do not overwrite or silently supersede accepted v18, the separate read-only SharePoint viewer, or frozen EMV-WB/EDIT/HIST/SET/REPORT contract. Do not authorize product implementation, merge, release or deployment from this companion concept. A later D3 visual/design freeze requires explicit owner approval on exact candidate artifacts and evidence, separately from any future production merge decision.
