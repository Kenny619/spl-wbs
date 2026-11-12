# F5b — Settings unsaved Project Calendar navigation guard

**Prepared:** 2026-11-13 JST. **Draft [PR #49](https://github.com/Kenny619/spl-wbs/pull/49)**, stacked on F5a #48 and earlier F4c/d. **Not merged or owner-UAT accepted.**
**Final guard head (pending CI at initial reporting):** `bc4f1b7bb6927332518ec806475901419de3017d`.
**CI:** [GitHub Actions #43311453401](https://github.com/Kenny619/spl-wbs/actions/runs/43311453401), unit/build initially passed; Windows browser completion to be verified at exact head.

## Discovered behavior and user impact

The accepted F4c Project Calendar editing flow had explicit **Save to shared workbook** and **Cancel calendar edit**, and the Excel source itself was not changed until verified Save. However, the **Settings Close button, Escape dismiss, and Change History tab** did not check whether the Calendar editor held unsaved input. Closing the drawer and reopening reset the form from the committed workbook; **the local unsaved draft disappeared without warning**. This contradicts the approved low-interaction guarded-edit principle while still leaving the Excel source safe.

## Scoped remediation (no Excel or model change)

- `src/managed/settingsUi.ts`: compare visible Calendar draft fields to last committed workbook context. If dirty, ask `Discard unsaved Project Calendar changes?` before **Close**, **Escape** or **Change History** navigation. If rejected, retain the open drawer and draft; if accepted, leave and show workbook-committed values at next open. If the form is unchanged, close normally. If a verified Save is in progress, navigation is blocked. **Explicit Cancel calendar edit** remains a one-click discard as its label promises.
- `test/browser/managed.spec.ts`: two actual Chromium tests on disposable Excel fixture: **(1)** modify blackout date, dismiss Close confirmation → draft stays; accept Close → reopen shows original committed interval; **(2)** Escape confirmation dismissed → draft retained, then explicit Cancel leaves Excel unchanged.
- Original local user preferences, staged/backup source-hash protocol, project audit, project source-of-truth and frozen read-only v18 remain untouched. No new browser-local Calendar state was introduced.

## Evidence provenance

- **Test-first commit:** `642a0c78d97af696db813b65e6ba375605333f16` added the two regression tests before production guard. Its CI run [#43311252117](https://github.com/Kenny619/spl-wbs/actions/runs/43311252117) was **cancelled by subsequent branch update**; do not claim a fully completed red-run result.
- **Fix commit:** `bc4f1b7bb6927332518ec806475901419de3017d`. The latest exact-head CI must be checked and used as the final test verdict.
- There is still no independent organizational QA signoff or physical corporate Edge+Excel/Node26 test, and v0.1.2 project fields remain a proposed contract. No merge, UAT kit, release or README link was authorized.

**Disposition at initial report:** corrective guard implemented, awaiting exact-head final Windows browser evidence before declaring full PASS.
