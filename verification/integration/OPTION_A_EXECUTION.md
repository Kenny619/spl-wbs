# Option A engineering increment: Manual Watch and shared Calendar

Source: PR #72, 978b51161a40fa2ceb77a5ae695d5449ad933589. Existing F7 source reused from 9089f964f55f4047f05dd2ddff21e9f4a0143cd0 without merging its competing UI.

Integrated guarded project-data candidate/direct-save protocol, invalid-extension task write guard, Manual Add/Resolve UI with unverified actor provenance and resolved history, shared workbook Calendar/name dialog and managed-only blackout-aware Task Detail/Schedule tooltip. Original frozen JSON, v18 reference and original viewer calls preserved. Task and project saves remain separate explicit transactions; no atomic multi-domain claim or actor authentication.

Synthetic five-sheet XLSX browser checks cover Open/Resolved/malformed read-only imports, DOM escaping, no writes, guarded Add/Resolve/reopen, stable TaskID/ReasonID and predecessor backup. Imported 48 writer/guard tests passed with existing tests (249/249 before Calendar addition); Calendar addition: 259/259 tests in 36 files passed; typecheck and both production builds passed (exit 0). Hosted exact-head checks required.

Environment: Codex Cloud Linux, Node v24.22.1/npm 11.9.0. Clean npm ci succeeded using --cache work/npm-cache because default home cache is unwritable. Local Playwright download: network policy HTTP 403 Domain forbidden for cdn.playwright.dev. Installed system Chromium cannot open file:// app (ERR_BLOCKED_BY_ADMINISTRATOR). These are environment blockers, not a product/browser PASS. Hosted Windows CI remains required. No screenshot baseline or tolerance changed. Physical corporate Edge/Excel locks, independent QA and comprehensive UAT remain outstanding.


Second increment adds the actual workbook Watch-backed Review08 Meeting agenda (independent search and multi-select owner/finish/status/workstream filters, shared Task Detail navigation) and REPORT11-MANUAL-WATCH-ADDENDUM-1. Reports expose current attributed Manual Open/Resolved evidence in HTML/plain/Outlook bytes without altering local generated-name source or UpdateHistory counts. Six real-XLSX report cases plus existing snapshot tests passed (11/11); full suite 265/265 and both builds passed.

First hosted run 43585997008 at 682d9579c96973d9dc7d0112ff29fa12f7dc75ea: Ubuntu success, Windows 81/83. Failures retained: relationship test acted before completed asynchronous import; Manual Watch post-save internal selection was intercepted by its own draft guard. Completion signal wait and clearing the verified completed Watch draft before internal selection restore address these respectively. No assertions/baselines/tolerances relaxed. Localhost Chromium functional diagnostics supplement, but do not replace, hosted file:// or physical Edge evidence.

Remaining gates: final exact-head Windows CI, actual 1440/1024 light/dark whole-design review, Node26 compatibility, independent integrity/security QA, physical corporate Edge folder permissions/Excel-open locks/recovery, final composite artifact inspection and comprehensive UAT. No UAT kit promoted, no README link changed, no protected-main merge/release.
