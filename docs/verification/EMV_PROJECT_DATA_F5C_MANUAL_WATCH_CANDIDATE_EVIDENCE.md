# F5c — Reason-level Manual Under Watch Add/Resolve, audited workbook candidate

**Prepared:** 13 November 2026 JST. **Technical draft**, not field-contract freeze, production implementation acceptance, owner UAT or live multiuser collaboration proof.  
**PR:** [#50](https://github.com/Kenny619/spl-wbs/pull/50), stacked on draft [#49](https://github.com/Kenny619/spl-wbs/pull/49) and earlier project-data PRs.  
**Initial corrected exact head:** `059f972563aa651374ed03220e7a1994f9266166`.  
**CI run:** [#43315243737](https://github.com/Kenny619/spl-wbs/actions/runs/43315243737). **CI pending at document publication** — do not claim SUCCESS before final job outcomes are checked.  
**Governance:** [owner data ownership #28](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md), [approved sheet shape #29](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md), [proposed exact field contract v0.1.2](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md), [field-level review](../specifications/EMV_PROJECT_DATA_FIELD_FREEZE_REVIEW_2026-11-13.md), [Watch proposal](../design/25_UNDER_WATCH_FUNCTIONAL_PROPOSAL.md).

## Bounded implementation

- `src/managed/projectDataCandidate.ts` adds precisely **two manual-only** members to its existing typed project-data candidate union: `add-watch-reason` and `resolve-watch-reason`. It uses the F2 inspector for existing five-sheet schema, valid stable WBS TaskID, unique UUIDs and cross-sheet references. It **does not create/modify project extension sheets on import** and refuses legacy, partial or future schema for Watch mutations.
- **Add:** one unique reason episode with literal `Origin=Manual`, `RuleCode=null`, `State=Open`, immutable ReasonID/TaskID/opening time/user-entered actor label, validated safe plain text `Title`, optional Details/EvidenceRef. Completed TaskStatus is not a reason to discard a manually recorded risk.
- **Resolve:** permitted only for an already Open **Manual** reason, never for recorded Automatic reasons without a frozen rule registry. Preserves opening metadata and independently traces `State`, `LastReviewedUTC`, `ResolvedUTC`, `ResolvedBy` and optional `ResolutionNote`. Rejects repeat resolution or an earlier-than-opened timestamp; resolving one of multiple reasons never erases the other.
- **Audit:** append a genuine `ProjectAudit` field-level record for each changed Watch field with same UUID transaction/UTC, correct TaskID, `ActorLabel`/truthful `ActorProvenance=UnverifiedLocal`, and source `Web UI`. No fake `UpdateHistory` task records and no changes to `ProjectMeta`, `ProjectCalendar`, `ProjectCommitments`, frozen `ProjectWBS`, custom worksheets or existing task change history.
- **Safety:** all validation/candidate round-trip checks occur before guarded File System Access Save; pre-existing `saveManagedProjectDirect` is reused **without any second disk writer**, including source hash, predecessor backup, pending-state recovery and verified readback. This is not an interactive Add/Resolve UI yet; the exported typed candidate can be exercised using synthetic disposable handles.
- **No invented Green:** the F5a pure reader continues showing `Under Watch` when at least one recorded Open reason exists, otherwise `Unknown` until a complete approved automatic check set and accepted commitment policy exist. Neither a task finish edit nor resolving one reason implicitly changes accepted commitments or automatic health.

## Verification matrix — 12 new synthetic unit cases

| ID | Test |
|---|---|
| F5C-01 | Add manual reason to existing task, preserve ProjectWBS/customer sheet/UpdateHistory, no false Green |
| F5C-02 | Resolve manual Open reason with correct audit old/new, UTC and original opened provenance retained |
| F5C-03 | Two reasons remain independent; resolving one leaves other Under Watch |
| F5C-04 | Reject duplicate reason UUID case-insensitively |
| F5C-05 | Reject already-Resolved reason re-resolution; no history rewrite |
| F5C-06 | Reject unknown TaskID and malformed ReasonID |
| F5C-07 | Reject formula-like Title/EvidenceRef and unsafe actor labels |
| F5C-08 | Refuse resolution earlier than OpenedUTC |
| F5C-09 | Reject reused ChangeSetID from existing project audit |
| F5C-10 | Refuse Manual-path resolution of Automatic source without rule evaluator |
| F5C-11 | Refuse uninitialized, partial and unsupported-future workbook schema |
| F5C-12 | Exercise actual guarded direct Save against disposable synthetic directory; verify original predecessor backup, committed hash, no stage, F5a readback Under Watch |

**Initial F5c job provenance:** earlier head `78bf36438d02a4da2472fb40ed321367037d9875` passed the full new 12-case suite (**261/261 unit**) but its strict TypeScript application build found a **test-helper union type error**. Corrected helper return type at `059f972563aa651374ed03220e7a1994f9266166`. Earlier incomplete/cancelled runs are not final acceptance evidence; the new exact-head CI must pass in full.

## Open readiness / policy gates

1. **Exact worksheet field/actor/event/audit schema remains proposed v0.1.2.** Five-sheet shape was approved, but this code does not itself freeze the contract.
2. **No Manual Watch UI or direct real-world file access** is wired; no automatic rule, Green/Clear engine, accepted revised commitment workflow, or Watch-integrated Meeting Review.
3. **No authenticated actor identity**. An unverified entered actor label and matching audit reference are not proof of who truly took action or signed off a commitment.
4. **Real shared-file concurrency** (Excel open locks, SharePoint/OneDrive same canonical shared file vs independent synced copies, stale hash, crash and recovery) is not established by a synthetic in-memory directory; require physical corporate Edge/Node26 and realistic file-provider UAT.
5. **Owner visual baseline** DES-012 Review08 / premium Report Review02 must be retained. Do not introduce a low-fidelity fallback Meeting Review or status-only fake risk signals.
6. **No merge/release/UAT ZIP or README link** from synthetic CI alone. Keep this PR draft until separate contract freeze, independent QA, real file test and authorization.

**Disposition at initial publication:** F5c feature candidate and 12 regression cases submitted; CI outcome pending.
