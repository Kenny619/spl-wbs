# F3d — Audit transaction identity adversarial QA and remediation

**Date:** 2026-11-12 JST  
**Branch:** [draft PR #43](https://github.com/Kenny619/spl-wbs/pull/43), stacked on F3c [#42](https://github.com/Kenny619/spl-wbs/pull/42).  
**Exact fixed head:** `c022c5a8db0f6ed9ae2120554eba828edae45983`  
**Verified CI:** [run #43198573317](https://github.com/Kenny619/spl-wbs/actions/runs/43198573317), **SUCCESS**: **227/227 unit tests in 33 files**, including F3c/F3d **12/12**; **66/66 Windows Chromium**; read-only and managed production builds PASS.  
**Scope:** Technical adversarial review of synthetic workbook Save, not independent organizational QA signoff, user UAT, real workbook migration or production release.

## Discovery and red reproduction

A new negative test at **test-only SHA `69a20dfd5a1ec7eb304ac2575badf4a5b2c1c61c`** submitted a *second* project metadata Save with the **same already committed ProjectAudit `ChangeSetID` and UTC timestamp**. The existing inspector checked timestamp consistency within a change set but did not enforce **one ChangeSetID per separate committed Save**. The second Save succeeded, potentially causing two distinct Saves to appear as a single audit transaction.

[Test-first red CI run #43198294535](https://github.com/Kenny619/spl-wbs/actions/runs/43198294535): Ubuntu **225 tests PASS / 1 new test FAIL**, with failure “promise resolved `{kind:'saved'}` instead of rejecting.” This was actual proof of the gap, not a claimed production exploit or a green test outcome.

## Targeted remediation

The isolated F3b `buildProjectDataCandidate` now **rejects an incoming transaction UUID previously found in either**:
- The committed workbook's existing **`ProjectAudit.ChangeSetID`**; or
- The existing frozen task **`UpdateHistory.ChangeSetID`**.

The result is explicit `DUPLICATE_CHANGESET` before creating a new project-data candidate or any staged file. Comparisons are case-insensitive for UUIDs. Source, backup, stage and pending files remain unchanged after refusal. The guard does not rewrite historical task records, delete evidence or attempt automatic retry/reconciliation.

## Post-fix regression results

- Duplicate project-to-project ChangeSetID with same UTC: **rejected**.
- New project Save reusing an existing *task* ChangeSetID: **rejected**.
- Alternating **project → task → project** verified direct Saves with distinct IDs: **PASS**, preserves separate task UpdateHistory and ProjectAudit, verified predecessor backup and final READY state.
- Original 9 F3c tests and entire F3a/F2/F1 baseline: **PASS**.
- [GitHub Actions run #43198573317](https://github.com/Kenny619/spl-wbs/actions/runs/43198573317) at exact SHA `c022c5a8db0f6ed9ae2120554eba828edae45983`: **227/227 unit and 66/66 Windows Chromium**, build PASS.

## Release boundaries still open

This remediation proves **logical transaction identity uniqueness for the isolated project-only writer with the currently modeled audit sources**, not cryptographic integrity, authenticated approval, automatic Watch facts or distributed atomic file locking. Field-level project-data contract version 0.1.2 remains proposed beyond already owner-approved five-sheet organization, single active blackout and Calendar/Watch/Meeting coupling.

The draft writer is still **not wired into managed Settings**, project Save As is absent, actual corporate Edge/Node26 and real shared file provider/Excel lock are untested, and full visual parity with approved DES-012 Review 08 is a separate UAT gate.

**Disposition:** F3d technical adversarial QA **PASS at exact draft head**; keep PR #43 draft/unmerged. No owner UAT kit, download link, release or merge authorized by this test outcome.
