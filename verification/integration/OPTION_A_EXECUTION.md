# Option A engineering increment: Manual Watch and shared Calendar

Source: PR #72, 978b51161a40fa2ceb77a5ae695d5449ad933589. Existing F7 source reused from 9089f964f55f4047f05dd2ddff21e9f4a0143cd0 without merging its competing UI.

Integrated guarded project-data candidate/direct-save protocol, invalid-extension task write guard, Manual Add/Resolve UI with unverified actor provenance and resolved history, shared workbook Calendar/name dialog and managed-only blackout-aware Task Detail/Schedule tooltip. Original frozen JSON, v18 reference and original viewer calls preserved. Task and project saves remain separate explicit transactions; no atomic multi-domain claim or actor authentication.

Synthetic five-sheet XLSX browser checks cover Open/Resolved/malformed read-only imports, DOM escaping, no writes, guarded Add/Resolve/reopen, stable TaskID/ReasonID and predecessor backup. Imported 48 writer/guard tests passed with existing tests (249/249 before Calendar addition); Calendar addition: 259/259 tests in 36 files passed; typecheck and both production builds passed (exit 0). Hosted exact-head checks required.

Environment: Codex Cloud Linux, Node v24.22.1/npm 11.9.0. Clean npm ci succeeded using --cache work/npm-cache because default home cache is unwritable. Local Playwright download: network policy HTTP 403 Domain forbidden for cdn.playwright.dev. Installed system Chromium cannot open file:// app (ERR_BLOCKED_BY_ADMINISTRATOR). These are environment blockers, not a product/browser PASS. Hosted Windows CI remains required. No screenshot baseline or tolerance changed. Physical corporate Edge/Excel locks, independent QA and comprehensive UAT remain outstanding.
