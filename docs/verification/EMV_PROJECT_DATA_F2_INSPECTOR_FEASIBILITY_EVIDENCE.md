# F2 — Read-only Excel ProjectData domain inspection feasibility

**Date:** 2026-11-12 JST  
**State:** Independent technical inspection **prototype**, NOT integrated Save validation or approved production feature.  
**Draft PR:** [#39](https://github.com/Kenny619/spl-wbs/pull/39) stacked on [F1 PR #38](https://github.com/Kenny619/spl-wbs/pull/38), then draft Report PR #37.  
**Exact verified F2 head:** `1527deff498c2532503e43cb04db0fc5bd631f55`  
**CI run:** [#43174632840](https://github.com/Kenny619/spl-wbs/actions/runs/43174632840).  
**Approved sheet scope:** [Decision 29](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md).  
**Detailed schema:** [Draft v0.1.2](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md), [machine counterpart](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.json).  
**Protected existing workbook/edit/history, visual and staging contracts:** #3–#7, [DES-012 Review 08](../../design/concepts/DES-012-consolidated-review08-task-detail.html), after-Stage-C beta, no UAT kit publication.

## Implementation actually completed

- New isolated **`src/managed/projectDataInspector.ts`**, exported `inspectProjectData(ExcelJS.Workbook)` pure read-only; **not invoked** by `src/managed/workbookCandidate.ts`, `src/managed/directSave.ts`, `src/managed/main.ts` or Save As.
- Four outcomes: `legacy` (none of five sheets), `valid` (all five recognized and draft field validations satisfied), `incompatible` (partial/invalid cross-sheet data), `unsupported_future` (newer schema version).
- 16 new `test/unit/projectDataF2.inspector.test.ts` synthetic cases; no real project source and no workbook bytes written.
- The preceding F1 10/10 tests and the rest of v18/managed unit tests are preserved unchanged in the branch stack.
- No new writer, migration, actor authentication, automatic watch condition, blackout-aware remaining-days logic, ProjectName UI binding, or multiuser synchronization created.

## Verified evidence checkpoint

At source SHA `1527deff`, the GitHub Actions Ubuntu **Build + unit** job [#131035801826](https://github.com/Kenny619/spl-wbs/actions/runs/43174632840/job/131035801826) passed:
- **188/188 unit tests PASS in 30 files**, including F2 **16/16** and F1 **10/10**.
- UUID bounded screen PASS; `tsc --noEmit`/read-only production build and managed production build PASS.
- The initial attempt `f05dbe221a9161b638b9a83463f4f6f37dfd2095` found a **TypeScript narrowing error only in the new inspector** after all unit tests passed; it was corrected at `1527deff` and the exact-head Ubuntu build was independently verified. Do not use the earlier head as production build-pass evidence.
- **Windows Chromium CI: PASS** at exact HEAD [job #131035802050](https://github.com/Kenny619/spl-wbs/actions/runs/43174632840/job/131035802050): **66/66 Playwright** PASS, Windows product build and artifact steps succeeded. [Overall run #43174632840](https://github.com/Kenny619/spl-wbs/actions/runs/43174632840): **SUCCESS** at SHA `1527deff498c2532503e43cb04db0fc5bd631f55`. CI uses Node 22; corporate Node 26.13.0/npm 11.19.1 not verified by this run.

## Matrix — feasibility proof versus product contract

| Test area | Synthetic verdict | Not proven or deliberately excluded |
|---|---|---|
| Legacy `ProjectWBS` only | **PASS** read-only inspector reports `legacy` and leaves sheets unchanged | No implemented Calendar/Watch missing-state UI |
| Complete five project sheets | **PASS** inspector reports `valid`, reads shared plain-text ProjectName and real TaskID links; actual XLSX preflight/roundtrip works | Schema 0.1.2 is proposed, not final production version |
| Partial sheets / future version | **PASS** `incompatible` and `unsupported_future` are distinguished | **Save not connected to validator**, so existing task Save still has historical gap until separate integration |
| Headers and metadata | **PASS** missing/duplicate headers/keys, invalid UUID/project name/version flagged | Exact error UX, compatibility migration and full metadata registry unimplemented |
| Blackout and dates | **PASS** invalid ISO, non-Boolean enabled, duplicate IDs, reversed range, >1 enabled rejected by inspector | Committed Calendar write, blackout-aware workday count and time-window UI not implemented |
| Watch reasons | **PASS** TaskID matching, origin/state and explicit resolution fields checked | Approved automatic RuleCode registry absent; no Watch lifecycle engine or external actor truth |
| Accepted commitments | **PASS** predecessor target and cycles checked | Commit authority/actual accepted baseline semantics and writer absent |
| ProjectAudit | **PASS** entity IDs, fake project TaskID, action kind, timestamp consistency and UnverifiedLocal provenance checked | New audit append-only transaction/immutability is not provable from a single loaded XLSX snapshot and not implemented |
| Side-effect protection | **PASS** inspector does not mutate workbook cells | No all-write-path fail-closed wiring tested |
| Existing UI regression | **PASS: 66/66 Windows Chromium at exact F2 head** | Still no physical Edge, current Report 1.1 workbook name-source amendment, or Review 08 pixel-parity acceptance |

## Independent-source review findings and bounded F3 requirements

1. **Write-path safety remains open.** The inspector is not wired into existing task-only `buildManagedCandidate`, `saveManagedDirect` or `saveManagedAsCopy`. It must not be portrayed as fixing F1's original partial-schema-write vulnerability until integration is separately authorized, tested and verified.
2. **Future version/read-only handling.** The inspector recognizes newer semver but does not implement UI diagnostics/recovery. Legacy default remains no configured project name or blackout; don't auto-migrate on view.
3. **Draft contract precision pending.** Auto Watch `RuleCode` has only syntax/presence validation, not a frozen trusted rule registry; all additional verified actor provenance methods are not yet supported (only `UnverifiedLocal`). Audit field/action allowlists are provisional and need exact owner-frozen semantics. No actual source hash or external identity checks in this pure workbook inspector.
4. **Domain invariants to verify before freezing:** all five sheets must have compatible header maps/unknown-sheet preservation, cross-link to ProjectWBS.TaskID, missing extension state distinct from partial/corrupt, and `UpdateHistory` remains task-only. Ensure project audit event entity-level field rules match future typed writer; pure inspection cannot prove historical tamper resistance.
5. **Physical provider concurrency remains unproven.** Same committed workbook version means same project data when reopened; no real-time or simultaneous safe editing implied.
6. **Next technical integration proposal (not yet authorized):** wire the domain gate to every actual write path **before** candidate mutation and **after** serialization/readback, including unrelated task edits, Save and Save As, while keeping true legacy task-only saves unchanged. Then implement separate project-only candidate/audit writer with a single validated transaction, after precise schema freeze.

## Disposition

**F2 read-only inspection feasibility PASS (limited, exact CI SUCCESS):** 188/188 unit (16 new F2, 10 earlier F1), 66/66 Windows Chromium browser and read-only/managed builds. The draft schema can be inspected and differentiated using a side-effect-free typed component and synthetic tests. **Not production Save-integrated or accepted.** Independent QA and actual project metadata persistence/Save safety remain future release gates.

No merge, tag, release, real workbook modification, corporate Edge UAT, UAT kit or README link change is authorized by this evidence.
