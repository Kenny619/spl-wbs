# DES-008 — D3 Integration Regression and Owner Visual Review Handoff

**Prepared:** 2026-11-08 JST  
**Controlling issue:** [#25](https://github.com/Kenny619/spl-wbs/issues/25) · **Draft design PR:** [#29](https://github.com/Kenny619/spl-wbs/pull/29)  
**Current candidate:** [DES-008 interactive HTML](../../design/concepts/DES-008-settings-history-drawer.html)  
**Exact validated candidate Git blob:** `982b30e2d6f0db339ea7f65f9146ddab8290d197` (source size: 194,729 UTF-8 characters at check time). **Require matching blob before attributing this evidence to a newer revision.**  
**Status:** **D3 source-interaction gate PASS; real browser rendering and Product Owner visual acceptance PENDING.** No new visual-design freeze or production implementation authorization.

## Post-feedback regressions corrected

| ID | Finding in DES-008 draft | Remediation | Why it matters |
| --- | --- | --- | --- |
| D3-DRAWER-01 | Save or Discard on a pending navigation into Settings could open the right drawer while leaving the old dirty-draft dialog visible | Clear and rerender the dirty dialog state before entering the drawer; after Discard return the underlying task panel to read mode | Eliminates competing modal layers and an apparent data-loss state |
| D3-GUARD-02 | Meeting filters, workstream/owner selectors, meeting date and Schedule stage buttons used a simplified blocking alert instead of the same three-choice dirty-draft decision | Route all of them through the shared `requestNavigation` Save/Discard/Cancel state machine. Store target selection; restore current selector value while the draft decision is pending | A changed draft should never be bypassed by incidental navigation or silently lost |
| D3-GUARD-03 | Exiting an unchanged edit state to Settings could leave the editor rendered after `editing=false` | Rerender the read-only task state before opening the drawer when there are no actual draft changes | Avoids phantom edit controls and pointless warning prompts |
| D3-FOCUS-04 | Changing Settings timezone/appearance, History task/action filters or the Reset state rebuilt the drawer markup and could drop keyboard focus | Explicitly refocus the updated control or active tab after rerender; focus the Reset decision / return control | Reduces keyboard disorientation during settings exploration. True focus trapping/restoration still requires browser and assistive-technology verification |

## Source-mocked regression evidence (exact source blob above)
**PASS — 29/29 assertions**, using executable source in a JavaScript mocked-document harness. Includes:
1. Existing app icon and version labelling; Settings opens a right drawer while Schedule/Meeting/Reports positions remain unchanged.
2. About section distinguishes `package.json` `v0.0.0` placeholder from approved `v18` UI baseline.
3. History exists within Settings and renders **3 action rows from 2 sample Saves**, with **2 rows sharing `SV-0142`**, per-action labels, filters and chronology.
4. Task-scoped History does not inherit a restrictive field filter. Changing task/action filters and display timezone restores the expected control focus. Date-only planned finish does not shift when timestamp timezone changes.
5. Reset remains within the right drawer and returns focus to its launcher; Close and Escape dismiss the drawer.
6. Dirty task → Settings prompts. Cancel preserves the edit; Discard returns to read mode and opens Settings with the old overlay cleared; a simulated valid Save also clears the overlay and opens Settings.
7. Dirty task → task-list filter / Owner / meeting date uses the same protective decision. Cancel preserves the draft, Discard navigates, and the custom meeting date is applied only after resolution.
8. Eight-day report default automatically follows selected meeting date; in the fixture **Nov 03–Nov 10** after changing the reference date to Tuesday Nov 10, **inclusive**. The default report snapshot remains generated only at explicit refresh according to simulated controls.
9. Syntactic JavaScript parse PASS; no actual XLSX read/write is performed.

**Evidence caveat:** The harness validates code paths and source state only. It is not Chromium, Edge, keyboard hardware, assistive technology, an Excel workbook, or screenshot review.

## Owner visual walkthrough (targeted; only new integration features)

1. **Main layout preserved** — Open the exact DES-008 HTML in Edge at your usual laptop zoom. Switch Schedule → Meeting → Reports. Confirm identical inspector widths and full-height scrolling, and that the main navigation buttons never move.
2. **Settings drawer** — Click top-right **Settings**. Check that it slides from the **right**, the page behind it stays anchored, scrolling occurs inside the drawer, and the authentic app icon and version/About labels are legible. Use Close, backdrop and Escape. Settings/History should not open a centered box.
3. **History log** — Settings → **Change History**. Check one row per individual field-change action; date/time, task identity, action, before/after, and a visible shared Save reference. Filter to **Data reconciliation** and **Status changed**, then clear filters. Verify it reads like a chronological activity log rather than a Save-card report.
4. **Task History** — Close Settings, select **Data reconciliation** in Meeting Review, then click **History** in selected detail. Confirm the same right pane opens prefiltered to that task and still supports changing to global History.
5. **Unsaved editing** — Edit a task's Owner, then click Settings. Test **Cancel** (draft stays in editor), **Discard** (old dialog disappears and Settings opens), and **Simulate Save** (demo only). Try the same with a filter. This is not workbook persistence UAT.
6. **Eight-day reporting** — Reports → Update Report → Plain-text preview. Check default **Nov 02–Nov 09**, both dates included, and the report's Generate/Refresh behavior. In Meeting Review change the simulated date to **Nov 10**; the default should update to **Nov 03–Nov 10** if the range was not manually customized. Custom period should remain controllable.
7. **Responsive edge check** — At 1366×768 and at 125% browser zoom, check that the drawer does not cut off actions or trap scrolling and the task inspector/list proportions remain usable.

## Scope and release gate assessment
- **D3 source integration:** PASS with findings remediated.
- **Real-browser visual/scroll/keyboard/accessibility gate:** **NOT RUN**. External GitHub file retrieval into the available Chromium runtime was unavailable during this check; no browser screenshot or Edge UAT has been fabricated.
- **Frozen contract fidelity:** selected History, Settings and Save paths are demonstrators only; full #3–#7 transactional validation and UpdateHistory history filtering still require authorized implementation and test evidence.
- **Owner visual approval / final design freeze:** **PENDING**; do not infer freeze from “good, move forward.”
- **Merge / release / deployment:** **NOT AUTHORIZED**; draft PR #29 stays open. Existing v18 source and approved Excel Managed Variant implementation branches are unaffected.

## Next genuine Product Owner decision
After the targeted visual review, the owner may explicitly accept the DES-008 **D3 interaction design** against the exact source blob and authorize a separate **implementation-planning** step. Acceptance of a visual prototype does not silently amend frozen workbook/editor/history/settings/report contracts; the proposed 8-day report default and richer weekly lifecycle reporting must undergo their own documented requirements change if implementation is requested.
