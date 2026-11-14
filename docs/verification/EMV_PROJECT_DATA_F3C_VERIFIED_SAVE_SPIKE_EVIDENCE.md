# F3c — Workbook-backed project-data direct Save using one shared guarded protocol

**Prepared:** 2026-11-12 JST  
**Status:** Synthetic-only **DRAFT implementation** on isolated branch. Not merged, UI-integrated, field-contract-frozen or Owner UAT-approved.  
**Draft PR:** [#42](https://github.com/Kenny619/spl-wbs/pull/42) stacked on [F3b #41](https://github.com/Kenny619/spl-wbs/pull/41) → F3a #40 → F2 #39 → F1 #38 → draft Report PR #37.  
**Exact head:** `d14293600cb8cc5c0cfc3c2b9ad0996056ce4c3f`  
**CI:** [GitHub Actions #43194464559](https://github.com/Kenny619/spl-wbs/actions/runs/43194464559).  
**Owner scope:** Five ordinary sheets, one enabled blackout, shared ProjectMeta.ProjectName, workbook source-of-truth and dependent Watch/Meeting delivery per [Decision #29](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md).  
**Exact field contract:** [Proposed v0.1.2](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md) — **not fully frozen or authorized for actual corporate workbook migration**.

## 1. Code architecture actually implemented

Only **two files differ** on PR #42 relative to its F3b base:

- `src/managed/directSave.ts`: factor the **existing verified File System Access direct Save** into one private `saveVerifiedCandidate` function; production task `saveManagedDirect` and isolated draft `saveManagedProjectDirect` call this exact same protocol. The difference is only which **pre-verified in-memory candidate** they supply (`buildManagedCandidate` or `buildProjectDataCandidate`). The original write stages, source-hash check, backup ownership, persisted pending transaction, write readback, recovery hold and cleanup are structurally preserved.
- `test/unit/projectDataF3c.verifiedSave.test.ts`: nine synthetic tests with a disposable in-memory directory adapter and **actual** `saveManagedProjectDirect` and existing staged protocol.

This does **not** create another competing Save implementation; does **not** alter Save As, task `UpdateHistory` field semantics, UI app integration, the read-only viewer, Design Review 08 styling or Report 1.1.

## 2. Exact test assertions and observed scope

| F3c test | Synthetic expected behavior | Result |
|---|---|---|
| 1. First project-data Save | Create all five proposed sheets, separate ProjectAudit, header-only Task UpdateHistory; verified original predecessor backup; no stage/pending sidecars after confirmed Save | PASS (Ubuntu) |
| 2. Second metadata rename | Persist new shared ProjectName through same protocol, rotate backup to previous committed workbook, append one audit event, preserve task History | PASS (Ubuntu) |
| 3. No-op | Identical project name returns `noop` with no source, backup, audit or stage change | PASS (Ubuntu) |
| 4. Sequential blackout actions | Change inclusive blackout then disable; verified committed workbook retains disabled row, project audit, unchanged Task History | PASS (Ubuntu) |
| 5. Stale loaded hash | External source difference refuses mutation before staging/overwrite | PASS (Ubuntu) |
| 6. Partial extension | Corrupt/partial project schema blocks project Save without writing any sidecars | PASS (Ubuntu) |
| 7. Unsafe input | Formula-like ProjectName rejected before mutation | PASS (Ubuntu) |
| 8. Interrupted source write | Pending recovery files remain, read-only inspector reports `NEEDS_BACKUP`, retry blocked | PASS (Ubuntu) |
| 9. Interrupted backup write | Source/backup/pending retained, recovery inspector reports `BACKUP_VERIFIED`, no false success | PASS (Ubuntu) |

At exact `d1429360`, [Ubuntu Build + unit job #131101791058](https://github.com/Kenny619/spl-wbs/actions/runs/43194464559/job/131101791058) **PASS: 224/224 unit tests in 33 files**, including F3c **9/9**, F3b **14/14**, F3a **10/10**, F2 **19/19**, F1 **10/10**; TS/source checks, read-only and managed production builds PASS.

**Windows Chromium job #131101791435: PASS** — [job #131101791435](https://github.com/Kenny619/spl-wbs/actions/runs/43194464559/job/131101791435), **66/66 Playwright PASS** (`66 passed (2.3m)`). **Overall [run #43194464559](https://github.com/Kenny619/spl-wbs/actions/runs/43194464559) completed SUCCESS** at exact `d14293600cb8cc5c0cfc3c2b9ad0996056ce4c3f`. CI Node22; physical corporate Edge/Node26 and actual shared file provider remain unverified.

## 3. Remaining product correctness and independent release gates

1. **UI is not wired:** no project Calendar Save/Cancel, no shared project-name header or browser title, no user authorization workflow; the exported project Save is an **experimental function**, not a reachable user feature.
2. **Project Save As is not supported** by the new adapter. The existing task Save As remains protected but does not emit a project-only mutation candidate. Plan a separate tested Save As behavior only after source-of-truth and copy semantics are frozen.
3. **Detailed ProjectData field contract v0.1.2 is still DRAFT.** A synthetically validated schema/writer is not equivalent to Product Owner approval of exact fields, actor authority, audit action/field allowlists, migration or corporate security policy. Do not merge until gate complete.
4. **Audit in XLSX is not cryptographically immutable.** Recorded `ActorLabel` is `UnverifiedLocal`; there is no authenticated corporate signature, approval role or centralized tamper-proof audit.
5. **No live multiuser synchronization**. Existing source hash and verified backup cannot create distributed CAS or lock across independent OneDrive/SharePoint synchronized copies. Actual canonical-file sequential read/edit and Excel locks must be validated at corporate environment before relying on it.
6. **Actual project business features remain pending:** blackout-aware remaining-days predicate and date-view propagation; automatic Watch rule registry, reason resolution/accepted-commitment policy and verified evidence freshness; integrated Meeting Review; narrow Report 1.1 project-name transition; full approved UI parity.
7. **Corporate physical UAT:** Windows 11/Edge, Node26.13.0/npm11.19.1 where relevant, actual file permission/folder-picker, Excel-open/lock and workbook fidelity (styles, custom columns and protected OOXML features) remain untested.
8. **Current CI Node22** builds do not prove user corporate runtime, and a disposable directory does not prove network/Sync client semantics.

## 4. Technical disposition

**F3c limited verified direct-Save feasibility PASS:** exact-head **224/224 unit** (including 9 F3c) and **66/66 Windows Chromium**, read-only/managed builds all PASS. The same existing guarded source/backup/recovery pipeline handles synthetic project candidate writes without altering managed task edit semantics. This is materially beyond F3b in-memory-only proof but **not yet a production UI feature, field-contract freeze or owner acceptance**.

**Next bounded technical review:** Independently assess changes to shared Save protocol against all historic task Save/Save As and interrupted write variants, then resolve outstanding detailed contract and scoped UI integration before promoting any real workbook UAT kit. Keep all stacked PRs as drafts and preserve prior exact-head QA evidence.

**No PR merge, tag, release, real project workbook write, UAT package, README download change or beta gate change authorized.**
