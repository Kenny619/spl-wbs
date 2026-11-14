# F5e — Watch draft navigation and committed reload safety QA

**Date:** 2026-11-13 JST  
**Classification:** bounded QA defect-remediation draft [PR #52](https://github.com/Kenny619/spl-wbs/pull/52), stacked on F5d [PR #51](https://github.com/Kenny619/spl-wbs/pull/51). **No field-level schema freeze, independent organizational acceptance, corporate Excel collaboration proof, or release.**  
**Final verified head:** `186cc991ed62901328276da03eadc4e24d3fd23e`.  
**Final CI:** [#43372171933](https://github.com/Kenny619/spl-wbs/actions/runs/43372171933) **completed SUCCESS at exact SHA** — **261/261 Ubuntu unit tests** (36 files), managed/read-only TypeScript builds PASS, and **80/80 Windows Chromium PASS**, including the three new F5e browser scenarios.

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
| F5E-01 | Unsaved Watch draft + Change folder; decline discard = unchanged draft/source; accept = draft discarded without accidental native picker or XLSX write | **PASS at 186cc991** |
| F5E-02 | Unsaved Watch draft + read-only XLSX preview action; picker suppressed and status instructs Save/Cancel, workbook unchanged | **PASS at 186cc991** |
| F5E-03 | Add manual reason through full guarded Save; Reload the same committed workbook; reproject reason and Under Watch from Excel while source bytes and ProjectAudit row count stay identical | **PASS at 186cc991** |

**No false multiwriter claim:** F5E-03 reloads the **same synthetic in-memory canonical source** after sequential Save; it does **not** prove SharePoint/OneDrive two-editor synchronization, Excel-open locks or remote distributed compare-and-swap.

## CI history and remaining decisions

The exact-head Windows Chromium and full baseline suite must pass before calling F5e technically verified. If failed, preserve defect and correction trail and rerun at the final SHA. The v0.1.2 field-level Watch/audit/actor specification, accepted commitments and complete automatic rule registry remain **proposed/not frozen**. Genuine Watch-integrated Meeting Review, full DES-012 Review08 visual parity and real corporate Windows Edge/Node26 + shared Excel file UAT remain separate gates.

**Final technical disposition:** **F5e PASS at exact draft head** (`186cc991ed62901328276da03eadc4e24d3fd23e`) with 261/261 unit and 80/80 Windows browser; no independent organizational QA or real corporate multiwriter/provider/UAT approval. All project-data branches remain draft/unmerged, with no production XLSX, README latest-download link, UAT kit, tag or release modified.

## Historical RED → GREEN — test navigation, not a product-code defect

1. [Initial run #43324474929](https://github.com/Kenny619/spl-wbs/actions/runs/43324474929), exact SHA `907c6296c16b0f8b5facf0a0ec760b720bfa7f0a`: Ubuntu **261/261 unit PASS**, Windows Chromium **79/80 PASS, 1 FAIL** with a 30-second timeout in **F5E-01 Change folder**. The other two F5e tests, all F5d Watch UI, Calendar, Reports, and read-only v18 regressions PASS. The first F5E-01 Change-folder action intentionally triggered the app's guarded discard confirmation, while the **Project action menu auto-dismissed after that click** (existing `src/managed/shell.ts` behavior). The test then tried to click `#change` for a second time without reopening the menu and timed out. This was **test navigation**, not an Excel save or shared-file data defect; product app safeguards passed the existing suite.
2. Corrected only `test/browser/managed.spec.ts` at final SHA `186cc991ed62901328276da03eadc4e24d3fd23e`: after the first declined discard dialog, explicitly assert the Project menu is closed, reopen the menu via its summary, then trigger the second confirmed discard. Neither `src/managed/main.ts` nor any workbook writer was modified as part of this correction. This preserves the intentional auto-dismiss behavior and accurately models user interactions.
3. [New exact-head run #43372171933](https://github.com/Kenny619/spl-wbs/actions/runs/43372171933) completed **SUCCESS**, with **261/261 unit tests (36 files), managed/read-only builds and 80/80 Windows Chromium PASS** in 2.5 minutes. The previously failing F5E-01 passed in 1.1 seconds. F5E-02 and F5E-03 passed as well.

**QA interpretation:** This closes the three scoped F5e synthetic browser navigation/reload checks. It does **not** certify safe simultaneous edits across corporate shared cloud-sync copies, authenticated actors, project-data field-level v0.1.2 freeze, independently approved risk/commitment policies, or the accepted DES-012 Review08 appearance in the real corporate Edge environment.
