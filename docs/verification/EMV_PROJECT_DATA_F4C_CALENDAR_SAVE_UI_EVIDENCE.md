# F4c — Excel-owned Project Calendar edit / verified Save / Cancel in managed Settings

**Prepared:** 2026-11-13 JST  
**Classification:** Draft experimental managed-product functionality on [PR #46](https://github.com/Kenny619/spl-wbs/pull/46), stacked on F4b #45; **not an accepted production workbook migration, official corporate UAT or merge approval.**  
**Initial exact head:** `62a1c67b5bff43fb5c1d7af4cfd52593887a5439`  
**Initial CI:** [Actions run #43288334052](https://github.com/Kenny619/spl-wbs/actions/runs/43288334052) (**Ubuntu build/unit PASS, Windows Chromium pending at original report checkpoint**).  
**Owner direction:** Excel is project-wide source for ProjectMeta, ProjectCalendar, Watch and audit; only theme, columns, PGCM display and recent-file history are browser-local. Five additive sheets and one active inclusive blackout were approved in principle; field-level schema v0.1.2 is still a PROPOSAL.  
**Prior proof:** [F4a–F4b shared project context and read-only Settings](EMV_PROJECT_DATA_F4A_F4B_CONTEXT_UI_EVIDENCE.md), [F3c verified Save](EMV_PROJECT_DATA_F3C_VERIFIED_SAVE_SPIKE_EVIDENCE.md), [F3d audit collision remediation](EMV_PROJECT_DATA_F3D_CHANGESET_ID_QA.md).  
**Approved visual shell:** DES-012 Review 08 remains frozen; this experimental managed drawer extends existing styling without replacing the accepted design.

## Functionality added on isolated PR #46

1. F4a project context now provides the **validated active BlackoutID and label**, not merely date range. Editing an existing blackout reuses its stable ID; disabling it preserves the row for project audit. Legacy/invalid/future states remain explicit.
2. Existing **Settings → Project Calendar** adds an inline draft with Enable, Start, inclusive End, optional description, and explicit **Save to shared workbook / Cancel calendar edit** buttons.
3. **First initialization is explicit**: a legacy workbook requires a separately entered shared ProjectName (never silently copied from XLSX filename); initializes the five proposed sheets on Save, not on read. Save requires an additional development-preview confirmation.
4. A valid workbook with active blackout supports editing the same interval and disabling it; a valid workbook with none can add one new enabled interval. At most one active range; no overloading per-user local preference data.
5. **All actual project Save uses the F3c shared guarded writer** `saveManagedProjectDirect` — stale-source loaded hash refusal, existing preflight, separate ProjectAudit, saved-source + predecessor-backup verification and uncertain-recovery hold. No new parallel File System Access protocol.
6. **No optimistic “saved” state:** after successful guarded write, read source bytes again, verify SHA256, validate project extension, reimport tasks and restore view, then publish the committed context. On failure, retain draft, report refusal, and hold editing after uncertain postcommit states. No file update on Cancel or invalid date.
7. **Task guard:** a pending dirty task edit prevents project Save until explicitly resolved; read-only preview/unverified workbook/recovery hold cannot write. Disable duplicate Calendar submit while saving.
8. Browser-local theme/timezone/columns and recent-file history stay separate from Excel; existing Task UpdateHistory and Report 1.1 local report-name contract unchanged.

## CI and synthetic end-to-end coverage

Initial [run #43288334052](https://github.com/Kenny619/spl-wbs/actions/runs/43288334052): TypeScript + managed/read-only production builds PASS, **237/237 unit tests PASS**, including previous F3c/F3d/F4a safety cases. Windows Chromium full-suite result to be verified at exact head before final disposition.

Added four targeted Windows Playwright browser cases using disposable XLSX + a File System Access in-memory directory:
- **F4C-B1 Cancel:** modifying dates then cancelling leaves committed range, Excel bytes, ProjectAudit and sidecars untouched.
- **F4C-B2 Save + Disable:** existing blackout edits persist through verified direct Save, append ProjectAudit, retain previous backup; second Save disables it and preserves historical row.
- **F4C-B3 Legacy initialize:** required user-entered ProjectName; creates five sheets and audited blackout only after explicit Save, no fictitious task history.
- **F4C-B4 Stale source:** externally modified XLSX after load blocks Save, preserves UI draft, does not create stage/backup files or fake success.

## Open release/acceptance gates

- **CI Windows final check pending** at initial evidence publication. If failed, record exact tests and fix/retest, do not claim PASS.
- **Full schema and actor/audit contract not frozen**, full independent QA and real corporate Edge/Node26/Excel locking tests not completed; synthetic file handles do not establish multiwriter shared-file safety or real-time synchronization.
- **F4d dependency open:** the committed blackout is stored and displayed but **not yet fed into actual managed Schedule/Task Detail/PGCM calculations**. F4a optional blackout-aware workday arithmetic is independently tested, not hooked to the visible managed Gantt.
- No automatic Under Watch rule engine, shared commitment handling, watch-aware Meeting Review, approved Report 1.1 name-source amendment or full DES-012 Review08 visual parity acceptance.
- **Project Save As remains a separate unsupported project-only workflow.** Existing Task Save As is unchanged.
- Owner UAT kit/README latest-only link, merge/tag/release/beta milestone require separate governance; all PRs remain drafts.

**Disposition:** F4c implementation and initial unit/build gate completed on draft. Final CI/QA disposition must be updated at exact successful head.
