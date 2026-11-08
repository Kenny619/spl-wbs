# DES-009 — Icon-only Header and Single History Navigation Entry

**Date:** 2026-11-08 JST  
**Stage:** D3 design refinement, not implementation approval or full visual-system freeze  
**Source:** [DES-009-icon-only-header.html](../../design/concepts/DES-009-icon-only-header.html)  
**Exact source blob validated:** `4c46e7c2f7c9a8eb5f1d93b46a54d4b55b07cf7f`  
**Predecessor:** [DES-008](../../design/concepts/DES-008-settings-history-drawer.html), preserved unchanged.

## Product Owner disposition

The Product Owner stated the **Settings and History visual design looks good**, and asked for two final simplifications:

1. **App icon only in the header.** Remove the adjacent `SPT–WBS v0.0.0` and `Design concept · Synthetic data` text. Retain the actual repo favicon as the only brand element in the leftmost header slot. A concise accessible app-icon name remains. Shrink the reserved desktop brand grid track from 178/166px to 42px at normal desktop/tablet widths. Because the intervening project column is flexible, primary navigation coordinates remain stable across Schedule, Meeting Review, and Reports at each given viewport width. Retain the responsive fallback at narrow/zoomed widths.
2. **Remove duplicate History under Settings preferences.** The Settings drawer already has a **Change History** tab, so delete the redundant `History` section and `View Change History` link from the Preferences content. Retain the **Change History** tab, read-only global action log, task-specific History entry and filtering. No loss of audit provenance or the underlying history design contract.

**Important distinction:** This request removes the `v0.0.0` text **from the top header only**. Settings → **About this application** still shows the repository package version `v0.0.0` (placeholder metadata) and approved UI baseline `v18` separately, preserving the earlier explicit version-display request.

## Regression evidence

- JavaScript syntax parse: PASS.
- **17/17 mocked-document source assertions PASS** against exact blob above:
  - Real app icon displayed without adjacent branding/subtitle; fixed grid layout and inspector width remain.
  - Settings remains a right slide-out pane and contains a working Change History tab.
  - Redundant History section/link is absent from Settings preferences.
  - About retains package version and approved UI baseline.
  - Global History still renders one row per saved field action, retaining shared Save identifiers.
  - Task-specific History and filtering continue to work; Escape closes the pane.
  - Edited task → Settings still uses Save/Discard/Cancel; Discard opens the drawer without leftover modal.
  - Default Update Report still spans 8 inclusive calendar dates (Nov 02–09 example).
  - No workbook writes.
- **Actual Edge/Chromium visual rendering and accessibility testing were not conducted.** This is source-level evidence only, not screenshot or UAT acceptance.

## Authority boundaries

- Existing owner-endorsed Schedule/Meeting/Reports layout and previous DES-006 width/height/scroll decisions remain intact.
- DES-008 remains a historical artifact; DES-009 is the current D3 visual-review candidate.
- Frozen Issues #3–#7, current approved v18 app baseline, existing Excel Managed feature development and report implementation contracts remain unchanged.
- **No production code implementation, merge, release, deployment or full D3 design freeze is authorized.** A final full design approval remains an explicit separate owner decision.
