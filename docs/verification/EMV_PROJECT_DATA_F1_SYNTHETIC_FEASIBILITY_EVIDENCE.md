# F1 Project-owned Excel extension — synthetic feasibility evidence

**Evidence date:** 2026-11-12 JST  
**Exact test code branch / SHA:** `feature/project-data-f1-spike` / `5f81454a5a38db603533a10601c493259a2beb7c`  
**Draft PR:** [#38 — test-only feasibility spike](https://github.com/Kenny619/spl-wbs/pull/38)  
**Run:** [GitHub Actions CI #43147141579](https://github.com/Kenny619/spl-wbs/actions/runs/43147141579)  
**Proposed input contract:** [v0.1.2 human](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md), [machine](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.json).  
**Owner scope:** [Decision 29](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md).  
**Execution boundary:** no implementation of project-data writer; ten tests only on synthetic Excel workbooks in the existing repository test runner. No actual corporate XLSX or physical Edge UX test.

## Actual observed results (fully completed exact-head CI)

| F1 question | Evidence and verdict | Caveat |
|---|---|---|
| Can old *restricted* OOXML preflight accept an ordinary 5-sheet extension in ExcelJS? | **PASS** in `projectDataF1.feasibility.test.ts`, with real `preflightManagedWorkbook`, seven+ Excel sheets and exact cell readback | Package structure only; does not validate domain data |
| Does existing task Save silently destroy added project sheets? | **PASS, non-destruction** in real `buildManagedCandidate`; five new sheets and Reference custom cells retained, task UpdateHistory appended, existing ProjectAudit untouched | Proves existing **task** Save on synthetic example, not a newly implemented *project-data* Save |
| Can existing direct Save carry those sheets through verified backup/readback? | **PASS** in disposable File System Access directory adapter with source/backup hashes and no residual stage/pending | Tests known synthetic in-memory directory, not physical Excel file sharing |
| Do normal no-op and detectable stale local source behave safely? | **PASS** no-op leaves original bytes, stale source rejects with `STALE_SOURCE` before staging | Source hash check is not distributed atomic CAS; syncing separate copies remains unsupported |
| Unsupported formula in new project sheet or unknown package part | **PASS for expected fail-closed rejection**, via real preflight `UNSUPPORTED_SHEET_FEATURE`/`UNSUPPORTED_PACKAGE` | Does not exhaust all OOXML threats; existing security gates remain |
| Legacy file without extension | **PASS: package preflight loads** `ProjectWBS` workbook | New reader's desired “Calendar not configured / Watch Unknown” presentation not implemented |
| Partial extension such as only `ProjectMeta` | **GAP IDENTIFIED**: real package preflight **accepts** it, as expected for ZIP-level gate | **Must** add a separate, strict cross-sheet `ProjectData` schema validator before new writes |
| Project Calendar audit in existing task UpdateHistory | **GAP CONFIRMED:** `readManagedHistoryWithPresence` **rejects** a fake project Field/empty TaskID with `INVALID_HISTORY` | **Must** build separate typed ProjectAudit reader/writer, preserve frozen task history |
| Blackout-aware remaining days, ProjectName in UI/report, Watch Green/Unknown checks, true multi-user collaboration | **NOT TESTED / NOT IMPLEMENTED** | Schema scope approval ≠ feature acceptance |
| Physical corporate Edge/Excel and provider file locking/concurrency | **NOT TESTED** | Required prior to any shareable/production-write claim |

### CI provenance at checkpoint

- **Ubuntu Build + unit tests: PASS** on exact SHA (29 test files, **172/172 test cases**, including all 10 F1 tests); bounded UUID scan, read-only product build and managed build PASS.
- **Windows Chromium browser regression: PASS**, verified from [Windows job #130947542910](https://github.com/Kenny619/spl-wbs/actions/runs/43147141579/job/130947542910), **66/66 Playwright tests PASS** (reported `66 passed (2.2m)`). Windows production build, baseline package generation, diagnostics and artifact steps all succeeded. These are existing browser regressions; none prove corporate physical Edge or workbook-backed Watch UI.
- **Overall CI conclusion: SUCCESS** on exact `5f81454a5a38db603533a10601c493259a2beb7c`, run #43147141579 (push, completed). Verified both job conclusions and logs.
- This CI's suite used **Node 22** per existing `.github/workflows/ci.yml`; **it does not validate the corporate Node 26.13.0 / npm 11.19.1 pair**. Those have separate toolchain requirements and must be checked on relevant heads.
- Baseline PR #37 remains draft/unmerged. F1 PR #38 is **draft** and does not modify source implementation.
- Vitest/CI-generated artifacts are not published as an approved owner UAT package.

## Decision from present evidence

**F1 positive for packaging and preserving ordinary extension sheets under the existing strict writer**.  
**F1 NOT a green light for production project-data writes.** The existing package preflight cannot validate newly proposed domain fields or partial extensions, and the existing task history must not be repurposed. Those are expected bounded new components under a later separately authorized implementation, not automatic modifications of frozen #3/#5.

## Required before next product implementation gate

1. Finalize field-level `ProjectMeta`/`ProjectCalendar`/`WatchReasons`/`ProjectCommitments`/`ProjectAudit` validation (UUID, ISO dates, row integrity, cross-sheet references, supported version, partial extension detection, blank-name and uncertain actor provenance).
2. Implement **separate project-data reader/validator/candidate writer**, and transactional `ProjectAudit` while keeping existing `UpdateHistory` task-only. Do not create sheets on import; legacy no-extension may be viewed without fake Watch Green.
3. Preserve source hashes/preflight/backup/pending recovery; test bad XLSX, interrupted verified Save/Save As, stale source, no-op; the extension's first project-only Save needs a real typed full-candidate validator.
4. Confirm project blackout changes Days Remaining once per eligible calendar day; confirm committed `ProjectName` drives shared UI/Calendar/document title. Existing report #7 browser-local ProjectName transition remains separately controlled.
5. Test actual Windows Edge workbook/file provider across two editors to determine whether sequential single-writer mode with refresh can guarantee no lost updates. Do not claim live synchronization.
6. Maintain approved DES-012 Review 08 shell/layout and prior after-Stage-C beta gate; no new UAT kit before existing release constraints are cleared.

**Final F1 classification — PASS, LIMITED FEASIBILITY ONLY:** Existing restricted XLSX preflight, task candidate and direct-Save backup can carry the proposed five ordinary project sheets through synthetic roundtrips without losing them. Full head CI **SUCCESS (172/172 unit, 66/66 Windows Chromium, 10/10 focused spike)**.

**Explicit blockers for implementation readiness:** domain-aware project schema validator, project-level reader/candidate writer, typed ProjectAudit Save transaction, blackout-aware Days Remaining, committed ProjectName UI binding, Watch decision rules, real shared-file writer/concurrency fidelity, corporate physical Edge/Excel/UAT. None of these were implemented or accepted by F1.

**No production feature code, test workbook deployment, merge/release or owner UAT package was authorized or delivered by this spike.**
