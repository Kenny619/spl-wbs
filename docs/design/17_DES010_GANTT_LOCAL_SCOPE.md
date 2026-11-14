# DES-010 — Gantt-Local Exceptions / Workstreams Control

**Date:** 2026-11-08 JST · **Status:** D3 design direction refined, proposed, not frozen for production  
**Owner feedback:** “exception/workstream view change control under Schedule view should be located inside of a Gantt chart box. going back and forth between gantt chart box and header navigation would be a husstle. everything else looks good”

**Current prototype:** [DES-010-gantt-local-scope.html](../../design/concepts/DES-010-gantt-local-scope.html)  
**Source-level owner-feedback blob:** `5bff3213b227b36305dca82253309a10178fad17`. **Current corrected HTML blob, real Windows Chromium tested:** `77dc7333ee4e061dc06e54d74caa30b07bdbe79e`.  
**Historical predecessor:** [DES-009-icon-only-header.html](../../design/concepts/DES-009-icon-only-header.html), retained unchanged.  
**Controlling:** [UI overhaul Issue #25](https://github.com/Kenny619/spl-wbs/issues/25), design-only draft [PR #29](https://github.com/Kenny619/spl-wbs/pull/29).

## Design decision — local task-scope switching
- **Move** `Exceptions | Workstreams` from the *global top header* into the **Schedule's Gantt panel heading**, aligned beside “WBS / Gantt schedule” with the existing illustrative-duration hint.
- Keep the main header's Schedule / Meeting Review / Reports buttons in a **fixed position**, including the former phase slot as inert reserved layout space so the main navigation does not jump when switching views.
- The Schedule-only selector appears **only in Schedule**; it does not consume Meeting Review or Reports UI space. Buttons show clearly which task scope is active and expose an accessible pressed state (`aria-pressed`).
- Scope switching uses the existing `state.stage` and original `flagged()` (Exceptions) / complete `tasks` (Workstreams). No new interpretation or persistence for exceptions is introduced.
- The control is dynamically created as part of each Schedule view. **Bind its click handling during each render**, rather than once at application startup. This was identified and corrected in the source-level test.
- Preserve the existing Save / Discard / Cancel protection if a task edit contains unsaved changes and scope switching would navigate away.
- On narrow screens, allow the panel title and local switch to wrap within the Gantt panel, rather than placing controls back in the global header.

## Unchanged decisions
- DES-006–009 endorsed working-view layout: equal-height Schedule/Meeting panels, same selected-task inspector width, internal scroll containment, fixed primary buttons, task identity and dependency links.
- DES-009 icon-only left header and streamlined right Settings/History drawer; no duplicate History under Preferences.
- DES-008 Monday-to-Monday **eight inclusive calendar dates** as a proposed weekly reporting default, with frozen EMV-REPORT-1.0 #7 unchanged.
- Current v18 production visual baseline; no app code, workbook writes, schema, or frozen functional requirements modified.

## Validation
- JavaScript syntax parser: **PASS**.
- **18/18 source-mocked DOM assertions PASS** against the exact blob above. Includes:
  - Global header contains no task-scope controls, retains unchanged three primary navigation targets and a reserved phase slot.
  - Gantt panel alone contains the scope selector, positioned after its heading and before scrollable schedule rows.
  - Exceptions starts active; scope switch displays **3 synthetic flagged tasks** versus **11 synthetic total tasks**, and switching back restores the 3 flagged tasks.
  - Meeting Review and Reports omit the scope selector; returning to Schedule retains selection.
  - Changes to scope while editing trigger Save/Discard/Cancel; Cancel keeps the prior scope and draft, Discard applies the selected scope.
  - Existing Settings entry, icon-only brand, selected-task inspector proportions retained.
- Source check **does not prove** actual Edge layout, pointer/keyboard behavior, screen-share legibility or accessibility. Real-browser visual review is still needed before final D3 UI freeze.

## Scope and authority
This is a **single localized design change**. Owner’s “everything else looks good” acknowledges the remaining DES-009 design direction but does not authorize implementation, merging, release, deployment, or an unreviewed D3 specification freeze. The design-only PR remains draft. Future product implementation must preserve frozen Issues #3–#7 and the currently accepted v18 reference unless explicitly superseded through Product Owner change control.

## D3 real-browser validation addendum — 2026-11-08
- Added [Playwright design regression tests](../../test/browser/des010-design-review.spec.ts) to draft design PR #29, reusing existing Windows Chromium CI and attaching screenshots for Schedule, Meeting, Reports and Settings/History at realistic widths.
- First [Windows Chromium run #42447420570](https://github.com/Kenny619/spl-wbs/actions/runs/42447420570) produced **40/41 browser PASS** and found exactly one real usability defect: Settings in the global header was hidden at 1024px due to a preexisting breakpoint rule.
- Fixed the header CSS for 971–1220px and for narrower responsive layouts without moving primary navigation; no workbook or production app code changed.
- Re-ran [CI #42447648745](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745) against exact HTML blob `77dc7333ee4e061dc06e54d74caa30b07bdbe79e`. **41/41 Windows Chromium browser checks PASS**, Ubuntu Build/Unit SUCCESS, both normal read-only viewer and review packaging SUCCESS.
- [Screenshots and Playwright report](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745/artifacts/13603389072) in the Windows browser diagnostics artifact. The browser tests assert stable nav coordinates, matching detail dimensions, contained scrolling, scope switching, Settings drawer at 1440/1024/860, dirty-draft guard and eight-inclusive-date reporting.
- **Not equivalent to physical Edge owner UAT** or full accessibility/assistive-technology acceptance; final D3 design freeze requires explicit Product Owner decision on the revised source, and the already-authorized managed-variant implementation in [PR #19](https://github.com/Kenny619/spl-wbs/pull/19) remains a separate gate.
