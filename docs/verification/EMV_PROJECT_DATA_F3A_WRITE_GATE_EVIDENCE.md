# F3a — ProjectData write-path guard: synthetic integration evidence

**Prepared:** 2026-11-12 JST  
**Status:** Draft-branch integration test, **not** approved production feature or owner UAT.  
**Draft PR:** [#40](https://github.com/Kenny619/spl-wbs/pull/40), stacked on [F2 #39](https://github.com/Kenny619/spl-wbs/pull/39) and [F1 #38](https://github.com/Kenny619/spl-wbs/pull/38).  
**Exact head:** `5c2058a80319a7e92561587a019748df24332c57`  
**GitHub CI:** [#43179141176](https://github.com/Kenny619/spl-wbs/actions/runs/43179141176).  
**Contract source:** [Proposed v0.1.2](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md) (five sheets and one active blackout interval approved in principle; precise field-level validation and migration **not yet frozen**).  
**Previous QA:** [F2 adversarial findings / corrected owner attribution](EMV_PROJECT_DATA_F2_ADVERSARIAL_QA_CROSS_SHEET.md).

## 1. Implemented in isolated PR #40

Exactly **two changed files**:

1. `src/managed/workbookCandidate.ts`: imported F2 `inspectProjectData`; introduced `assertProjectDataForWrite` that allows `legacy` and `valid`, blocks `incompatible` using `INVALID_PROJECT_DATA`, and blocks `unsupported_future` with `UNSUPPORTED_PROJECT_DATA_VERSION`. It reports first invalid sheet/row/field. This assertion runs **before task editing/no-op return** and again **after the candidate is serialized/reopened**. It never creates or writes new ProjectData sheets.
2. `test/unit/projectDataF3.writeGuard.test.ts`: ten synthetic cases using the **actual** task candidate and File System Access disposable directory simulation. No corporate workbook, real network file or personal data involved.

**Why this covers both existing writer entry points:** `saveManagedDirect` and `saveManagedAsCopy` both call `buildManagedCandidate`. Therefore invalid supported-schema metadata is rejected before direct Save stages/source mutation or Save As creates a new target. No changes to `src/managed/directSave.ts`'s existing source-hash/stage/backup/owner/recovery protocol.

## 2. Focused synthetic tests and bounded conclusions

| F3a test | Expected property | Proven by synthetic unit test |
|---|---|---|
| Legacy v1 task edit | No extension creation, legitimate task UpdateHistory | PASS (Ubuntu) |
| Valid 5-sheet task edit | Preserve shared ProjectName, custom blackout column and untouched ProjectAudit | PASS (Ubuntu) |
| Partial extension, including no-op | Fail closed before proposed source mutation; no history generated | PASS (Ubuntu) |
| Future version | Distinct unsupported-version refusal; no silent downgrade | PASS (Ubuntu) |
| Invalid name, >1 active blackout, orphan Watch | All refused with project-data error before edit | PASS (Ubuntu) |
| Direct Save partial extension | No source change, backup, stage or pending transaction | PASS (Ubuntu) |
| Save As partial extension and zero task edits | No destination file or stage | PASS (Ubuntu) |
| Save As future extension | No destination, source unchanged | PASS (Ubuntu) |
| Direct Save valid extension | True saved source and predecessor backup, data preserved | PASS (Ubuntu) |
| Save As valid no-op copy | Full project sheets preserved, no fake task audit/history row, source unchanged | PASS (Ubuntu) |

### CI execution checkpoint

- At exact head, [Ubuntu job #131050611026](https://github.com/Kenny619/spl-wbs/actions/runs/43179141176/job/131050611026) **PASS: 201/201 unit tests in 31 files**, including F3 10/10, F2 19/19, F1 10/10; read-only and managed builds PASS; source UUID screen PASS.
- **Windows Chromium job:** **PENDING at time of original recording**. Update separately with exact SHA/job evidence before asserting overall CI PASS.
- CI uses Node22; neither corporate Node26.13.0/npm11.19.1 nor physical Edge/Excel shared-file permissions are established.

## 3. Scope boundaries and remaining gaps

- **Not implemented:** project-only workbook Save; creating sheets from a legacy workbook; typing/appending ProjectAudit; editing Watch reasons/commitments; saving a Project Calendar blackout; blackout-aware remaining days; ProjectMeta.ProjectName application header/Calendar/document title; Watch auto rules, Green completeness or integrated Meeting Review.
- **Not proved:** a deterministic end-to-end distributed multi-writer/OneDrive/SharePoint CAS lock. The current source hash is a local check only.
- **Not an approved final validator:** the F2 inspector is based on *proposed* field-level schema v0.1.2. A production merge must wait for exact field/actor/audit/legacy semantics to be frozen and independently QA-reviewed. Unknown user-custom sheets whose names collide with the new reserved extension sheet names are an explicit compatibility case to verify before release; this draft prefers refusal over overwriting them.
- **No-op safety:** this F3a guard blocks an incompatible extension even if the requested task values are unchanged. That is intentional fail-closed behavior, not a new user-visible project-data writer.
- **Save As provenance:** existing Save As may copy the last loaded workbook even if original source changed externally, with disclosed last-loaded-snapshot provenance; this spike does not silently redefine that product contract.

## 4. Technical QA and owner gates

1. Independent review of the F3a guard placement relative to existing `ProjectWBS` and `UpdateHistory` validation, no-op and Save/Save As failure behavior. Add adversarial cases if any unguarded writer route exists.
2. Freeze detailed fields, column types, actor provenance, audit action/field allowlist, legacy/partial-extension fallback and first-save extension migration; keep original #3–#7 historical contracts intact.
3. Plan F3b project-only *typed* mutation candidate, separate `ProjectAudit` append, combined task+project single transaction ID, preflight→reopen/verify→verified guarded Save; do not reuse task-only history for project events.
4. Verify physical corporate Edge, Excel open-file lock, shared workbook staleness/conflicts and Node26 toolchain before claiming owner-ready UAT.
5. Protect frozen Review 08 visual design and beta-after-Stage-C milestone; do not publish a new UAT ZIP or merge test/spike branches by implication.

**Initial disposition:** Domain guard integrated on isolated draft PR #40 and Ubuntu CI PASS. Pending exact-head Windows regression and independent QA. Not production-accepted.
