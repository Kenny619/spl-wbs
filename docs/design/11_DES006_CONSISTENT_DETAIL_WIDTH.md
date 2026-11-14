# DES-006 — Shared Selected-Task Inspector Width (proposed 0.1)

**Date:** 2026-11-08 JST · **Stage:** D1 UI iteration · **Status:** PROPOSED, design-only, not frozen  
**Controlling issue:** [#25 UI Overhaul](https://github.com/Kenny619/spl-wbs/issues/25) · **Design PR:** [#29](https://github.com/Kenny619/spl-wbs/pull/29)

**Current interactive prototype:** [DES-006-consistent-detail-width.html](../../design/concepts/DES-006-consistent-detail-width.html).  
**Previous prototype:** [DES-005-unified-height-and-scroll.html](../../design/concepts/DES-005-unified-height-and-scroll.html), retained unchanged.

## Owner feedback
> The selected-task box should not change width when switching between Schedule and Meeting Review. Everything else in DES-005 looks good.

## Narrow design decision
- Preserve all other DES-005 behaviors, navigation positions, full-height pane sizing, independent panel scroll, Reports fixed controls and report-content scroll, all previous task list filters, dependency links and report prototypes.
- At the same **desktop viewport width**, Schedule and Meeting Review now use the **identical two-column layout tracks**: `minmax(0,1fr) minmax(365px,39%)`. The **right-hand selected-task inspector** is therefore the same pixel width in both views. Only the **left content** changes between WBS/Gantt and meeting task list.
- The CSS rule is shared across both views, with the same selector specificity, and placed after prior concept-specific desktop grid rules to prevent mode-specific overrides.
- At effective viewport widths **≤970 CSS px**, preserve the DES-005 responsive/stacked layout; forcing a 365px inspector beside a narrow left panel would harm accessible use. “Width does not change” applies when toggling modes at the **same viewport**, not when resizing/zooming the browser.
- This is a layout detail, **not a finalized universal column percentage** or redesign of the selected-task content.

## Source-level checks
- **10/10 source-level CSS/JS structure checks passed:** matching shared desktop selectors, same right-panel grid rule, desktop-only application, preserved full-height pane/scroll behavior and responsive fallback, unchanged one-row header, no explanation footer, Reports scroll container, no real workbook write.
- **Illustrative width arithmetic, not browser pixel measurements** (assuming 32px horizontal canvas padding and 13px grid gap): at 1024px viewport both inspectors ≈382px; 1366px ≈515px; 1440px ≈544px. Exact widths remain subject to real browser CSS constraints and zoom behavior.
- **Actual Edge visual/scroll/zoom testing has not been performed**. Verify by switching Schedule ↔ Meeting at unchanged viewport, checking the inspector's left/right edges, then inspect at 100% / 125% zoom and 1366×768. The report should be unaffected.

## Authority boundary
DES-006 changes a standalone design HTML file and design documentation only. It does not modify frozen v18, Excel Managed Variant feature branches, workbook structure, approved Output Reports contract, app source, or release. This is **not** authorization to implement, merge, deploy or freeze the UI overhaul.
