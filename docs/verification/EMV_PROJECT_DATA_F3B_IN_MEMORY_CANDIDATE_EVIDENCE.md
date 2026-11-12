# F3b — audited ProjectMeta and project Calendar in-memory XLSX candidate (synthetic feasibility)

**Date:** 2026-11-12 JST  
**Status:** **DRAFT TECHNICAL FEASIBILITY** — project-only candidate exists in a separate draft PR; **not connected to disk Save or UI**, no production acceptance.  
**Draft PR:** [#41](https://github.com/Kenny619/spl-wbs/pull/41) stacked on [F3a #40](https://github.com/Kenny619/spl-wbs/pull/40) → F2 #39 → F1 #38 → draft Report 1.1 #37.  
**Exact source after initial TypeScript/UUID remediation:** `13e30cc2ac5c8e9ca37c943b90dd144b176eba3a`  
**GitHub CI:** [run #43193399656](https://github.com/Kenny619/spl-wbs/actions/runs/43193399656).  
**Owner decisions and scope:** [Decision #29](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md); detailed field schema [proposal v0.1.2](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md) **not fully frozen**.  
**Accepted visual baseline:** [Review 08](../../design/concepts/DES-012-consolidated-review08-task-detail.html).  

## 1. Exactly what has been implemented in this isolated F3b spike

- **`src/managed/projectDataCandidate.ts`** exports a pure, in-memory `buildProjectDataCandidate` taking a user-intended explicit project-data action and a validated synthetic transaction identifier, UTC timestamp, unverified actor label and app version. **No file handle, direct Save/Save As call, app UI binding or global data store is touched**.
- The four tested typed actions are **initialize** project metadata (optional first blackout), **rename** `ProjectMeta.ProjectName`, **set/update** one enabled `ProjectCalendar` blackout, and **disable** that blackout without dropping its historical row.
- **Initialization is explicit only:** after validating an unextended legacy workbook, create all five proposed ordinary sheets (`ProjectMeta`, `ProjectCalendar`, `WatchReasons`, `ProjectCommitments`, `ProjectAudit`) in one in-memory candidate. If frozen task `UpdateHistory` is absent on this first non-no-op project-data Save, create **header-only** `UpdateHistory`, no fabricated TaskID or task change.
- **ProjectAudit is separate:** append one field-level project event per actual changed field, tied by a shared ChangeSetID and UTC timestamp; actor explicitly represented as `UnverifiedLocal`. Preserve prior task `UpdateHistory` unchanged, including if already populated. An XLSX audit is auditable application history, **not cryptographically tamper-proof**.
- **Safe no-op:** identical project name or identical persisted blackout does not produce a new candidate or audit row. Changing or disabling a blackout preserves prior Excel row; initial UI limit remains one enabled interval.
- **Pre-write validation:** execute existing OOXML preflight and historical task-history read, reject unsupported or partial new extension and unknown mutation, validate typed UUID/date/text inputs and every resulting ProjectData relation using the previously QA-remediated F2 inspector.
- **Candidate readback:** serialize, run preflight, reopen with ExcelJS, inspect all five new sheets again, compare project identity and contents of existing WBS and unrelated worksheets, and ensure existing task history was not altered.
- **Not a shared-data service:** the proposed result is disposable workbook bytes only; no automatic syncing, user identity verification, cloud storage, or distributed concurrency guarantee.

## 2. CI evidence and historical unsuccessful prototype

The first run at `5937bcf221af4fc2579cbc285e020e8174c4cd4a` correctly **FAILED** (14/14 new tests failed) because the spike's local UUID regex was mistakenly `8-4-4-12` instead of the canonical `8-4-4-4-12`. The TypeScript production build also caught nullable-value narrowing around sheet headers/rows. This is historical failure evidence, **not** a validated F3b version.

At corrected commit `13e30cc2ac5c8e9ca37c943b90dd144b176eba3a`, [Ubuntu CI unit/build job #131098120743](https://github.com/Kenny619/spl-wbs/actions/runs/43193399656/job/131098120743):
- **PASS: 215/215 unit tests in 32 files**, including all **14/14 new F3b**, **10 F3a**, **19 F2** and **10 F1**.
- TypeScript/production build and managed variant build PASS; existing UUID source scanning PASS.
- **Windows Chromium:** PENDING at first evidence publication, verify separately before saying overall CI SUCCESS.

The new F3b synthetic test suite covers first Save metadata-only and with blackout, audit provenance/UUID/time, safe Unicode rename, exact old/new ModifiedUTC, double-blackout refusal, explicit disable and next interval after disable, no-op, preservation of unrelated cells/task history, partial extension, malformed history and unsafe project fields.

## 3. Risk register and future blocking requirements

| Gate | Current F3b evidence | Required next proof |
|---|---|---|
| Actual shared Excel Save | **NOT IMPLEMENTED**: no connection to File System Access staging, backup, recovery, readback or Save As | Integrate one typed candidate with the same proven existing save/recovery protocol after field contract freeze and independent QA |
| No data loss in real XLSX | Checks in-memory cell values for unchanged worksheets and required new tables | Test styles, merged cells, extra columns, sheet order, unsupported OOXML parts and corrupt workbook preservation under real Windows/Edge |
| Project audit | Actual proposed append-only event rows and cross-sheet validity in candidate | Prove history replay, field/action allowlist, conflicting writes/transaction retries, retention, immutable IDs, and unverified actor semantics |
| Legacy first project Save | Explicit-only in-memory 5-sheet migration candidate, header-only UpdateHistory | User authorization, local file permissions, verified backup and rollback before disk mutation |
| Blackout calculation | Stored dates and one-active-range enforced in candidate | Calendar UI Save/Cancel and Owner-required exclusion from Days Remaining/PGCM as separately specified; overlap with holidays/weekends excluded once |
| Cross-user use | Same committed candidate bytes would contain same data when reopened | Validate actual canonical file access, external-change detection and stale/no-live-push behavior with real Windows/Edge; a sync folder is not atomic CAS |
| Under Watch | Empty draft `WatchReasons` and `ProjectCommitments` created, no mutation API | Freeze rule registry, identity/actor provenance, acceptance/clearance workflows and reason-level audit before code |
| UI / Reports | Shared `ProjectName` exists in candidate | App/Calendar/browser title binding; separately amend frozen Report 1.1 name-source contract |
| Acceptance and release | Synthetic CI only, draft branch | Independent QA, owner UAT on proper real app package, exact approved SHA, no PR merge or release without separate authorization |

**Recommended next bounded slice:** F3c verified project-only direct-Save adapter built by reusing the existing recovery/backup pipeline without a competing implementation, plus negative tests for stale file, no-op, locks and interrupted save. **Not yet authorized for real user files.**

**Status:** F3b in-memory candidate feasibility only; no product acceptance, UAT ZIP, release or merge.
