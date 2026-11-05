# Cursor Development Plan — v1.3

## Phase 0: Freeze visual baseline and tests
Check immutable v17 SHA-256 against README. Copy into reference folder only. Capture Playwright screenshots (default, Day PGCM, Week PGCM, 3-generation expansion, detail). Scaffold TS/build/test. Exit: no visual edits and regression images available.

## Phase 1: Data model and Excel parsing
Implement normalized task and aliases, date serial handling, optional source URL, synthetic fixtures, malformed-workbook error states, tree and weighted summary. Exit: parse/validation and calendar date tests pass; no UI work beyond harness.

## Phase 2: Excel chooser / remembered file workflow
Implement standard file picker, optional File System Access handle in IndexedDB, permission-aware Reconnect fallback, Reload/Change/Forget and provenance. Exit: usable on `file://` without persistence; no company-data network access; last valid dataset retained when reload fails.

## Phase 3: Wire real data to frozen UI
Replace synthetic mock array with typed import state without changing geometry. Add dynamic Status/Owner and optional Type/Workstream filters; ensure 15 palette colors stable; source-record links; Needs Attention count; 3-level hierarchy. Exit: browser screenshots match approved v17 for equivalent fixtures.

## Phase 4: Calendar calculations and display
Bundle **verified** 2026–2030 holidays; optional API for later years. Implement remaining workdays, active/inactive visibility, PGCM recurrence (holiday shifting, blackout cancellation), Day full column, Week marker, amber blackout settings. Exit: unit tests + screenshot baselines pass.

## Phase 5: Production validation
Cross-test managed Edge and Chrome, with/without internet and without persistent file permissions, .xlsx from actual approved SharePoint export (with non-sensitive sanitized records), 500/2000 row performance and keyboard access. Validate `ItemURL` and disabled behavior. Build one HTML artifact and checksum; publish only through permitted corporate distribution channel.

## Mandatory task protocol for Cursor
For each phase: read AGENTS and relevant docs, implement only that phase, list modified files, run tests/syntax checks/screenshots, report expected vs actual, document outstanding issues, **stop**. Do not tackle later phases before sign-off.

## Review amendments after Phase 5
Approved on 2026-10-25 and 2026-10-26, after the phase exits above. These are current requirements and are specified in the PRD, Excel contract, UI spec, and technical design. They supersede frozen v17 pixels only for: the non-working shade (`#eef3f8`, including the Day date cell), centered milestone diamonds, Monday `mm/dd` Week labels, and one ISO week number per Month column. The approved ItemURL host is exactly `pmicloud.sharepoint.com`. Do not treat "no visual edits" in Phase 0 as permission to revert these amendments.

## Ready-to-copy initial prompt
> Read README.md, AGENTS.md, 01_PRD_v1.3.md, 02_Excel_Data_Contract.md, 03_UI_Design_Spec_v1.3.md, 04_Technical_Design_v1.3.md and 05_Development_Plan_v1.3.md. Treat UI_BASELINE_v17_FROZEN.html as immutable. Execute Phase 0 only. Verify the checksum, establish screenshot regression tests and TS project scaffolding without touching the frozen UI. Run tests, report results, and stop.
