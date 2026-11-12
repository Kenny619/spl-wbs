# F5e — Watch draft navigation and committed reload safety QA

**Date:** 2026-11-13 JST  
**Classification:** bounded QA defect-remediation draft [PR #52](https://github.com/Kenny619/spl-wbs/pull/52), stacked on F5d [PR #51](https://github.com/Kenny619/spl-wbs/pull/51). **No field-level schema freeze, independent organizational acceptance, corporate Excel collaboration proof, or release.**  
**Initial implementation head:** `907c6296c16b0f8b5facf0a0ec760b720bfa7f0a`.  
**CI:** [#43324474929](https://github.com/Kenny619/spl-wbs/actions/runs/43324474929), Ubuntu unit/build PASS at initial report, Windows Chromium in progress.

## Inspection finding: a confirmed task-only navigation guard

In `src/managed/main.ts`, the **Change folder / Choose project folder** action evaluated only the ordinary task editor's `isDirty()`. It did not check the F5d Watch panel's `watchPanel.hasDraft()`. As a result, the UI could launch a new folder picker without a prompt even though the currently selected task held an unsaved Watch Add/Resolve form. Accepting a new folder would replace workbook context; the new `openWorkbook` loading path then clears the Watch draft. This was a source-independent **user draft-loss risk**, not evidence of an already corrupted Excel workbook. Its test target is explicitly a new unsaved Watch form.

The **Open XLSX read-only…** button also checked only task dirtiness. The later `previewWorkbook` method would refuse to load while a Watch draft existed, but the native file picker could be opened unnecessarily. Users should receive a clear message before the picker and retain the draft.

## Scoped remediation

- In `src/managed/main.ts`, both entrypoints now include the existing `watchPanel.hasDraft()` check. Folder change calls the established `guard` to ask **Discard unsaved Watch reason draft?**. If declined, leave draft/context intact. If confirmed, clear draft, report that changes were resolved, and require the user to click Change folder again, preserving Edge's real transient user activation for the native picker.
- Read-only preview refuses to invoke a native file picker until task/Watch edits are saved or explicitly cancelled. The Watch draft and selected workbook remain intact, with a clear status message.
- The fix does not change `saveManagedProjectDirect`, task Save, transaction hashes, stage/backup/recovery, ProjectAudit, workbook source-of-truth or read-only v18 UI.
- No separate Watch state is stored in localStorage. This is **uncommitted UI input only**; committed reasons remain Excel-owned.

## Browser QA matrix (three targeted new scenarios)

| ID | Scenario | Initial status |
|---|---|---|
| F5E-01 | Unsaved Watch draft + Change folder; decline discard = unchanged draft/source; accept = draft discarded without accidental native picker or XLSX write | Windows browser pending |
| F5E-02 | Unsaved Watch draft + read-only XLSX preview action; picker suppressed and status instructs Save/Cancel, workbook unchanged | Windows browser pending |
| F5E-03 | Add manual reason through full guarded Save; Reload the same committed workbook; reproject reason and Under Watch from Excel while source bytes and ProjectAudit row count stay identical | Windows browser pending |

**No false multiwriter claim:** F5E-03 reloads the **same synthetic in-memory canonical source** after sequential Save; it does **not** prove SharePoint/OneDrive two-editor synchronization, Excel-open locks or remote distributed compare-and-swap.

## CI history and remaining decisions

The exact-head Windows Chromium and full baseline suite must pass before calling F5e technically verified. If failed, preserve defect and correction trail and rerun at the final SHA. The v0.1.2 field-level Watch/audit/actor specification, accepted commitments and complete automatic rule registry remain **proposed/not frozen**. Genuine Watch-integrated Meeting Review, full DES-012 Review08 visual parity and real corporate Windows Edge/Node26 + shared Excel file UAT remain separate gates.

**Disposition at initial creation:** scoped code/test integration complete; CI final outcome pending. All project-data branches remain draft/unmerged, with no production XLSX, README latest-download link, UAT kit, tag or release modified.
