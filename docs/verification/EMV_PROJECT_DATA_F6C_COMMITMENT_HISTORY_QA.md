# F6c — ProjectCommitments linear-chain integrity and conservative recorded-history projection

**Prepared:** 2026-11-13 JST. **Technical draft**, not an approved acceptance authority/commitment workflow, field-level contract freeze, owner UAT, or production rollout.  
**PR:** [#55](https://github.com/Kenny619/spl-wbs/pull/55), stacked on F6b [#54](https://github.com/Kenny619/spl-wbs/pull/54); PRs are DRAFT/unmerged.  
**Corrected tested head:** `4d94cd1dd8865d470e2a7be22c12db3316c7a732`.  
**Final CI:** [#43376877253](https://github.com/Kenny619/spl-wbs/actions/runs/43376877253) **completed SUCCESS at exact head**: [Ubuntu #131725308184](https://github.com/Kenny619/spl-wbs/actions/runs/43376877253/job/131725308184) **286/286 unit tests PASS in 39 files** (11 F6c), strict TypeScript and managed/read-only builds PASS; [Windows Chromium #131725308498](https://github.com/Kenny619/spl-wbs/actions/runs/43376877253/job/131725308498) **80/80 browser PASS (2.6m)**.

## Finding: the proposed commitment chain could be ambiguous

The proposed v0.1.2 field contract states that each `ProjectCommitments.PreviousCommitmentID` references **the last accepted version for the same immutable TaskID**, with chronological ordering, unique IDs and no cycles. The F2 inspector already rejected dangling/cross-task predecessors and cycles, but accepted several mutually inconsistent histories:
- **Two first/root commitment records** on the same TaskID, each with no predecessor, with no safe one current reference.
- **Two separate revision records with the same predecessor**, creating a fork and ambiguous latest.
- **A successor with `AcceptedUTC` equal to or earlier than its predecessor**, defeating chronological order.

These issues are **record consistency validation only**; they do not establish who is entitled to accept an actual commitment, its business rationale or the approved comparison threshold.

## Scoped code and output

- `src/managed/projectDataInspector.ts`: additional fail-closed `MULTIPLE_COMMITMENT_ROOTS`, `FORKED_COMMITMENT_CHAIN` and `COMMITMENT_TIME_ORDER`. A valid existing row remains immutable; a new revision must refer to exactly the previous head for the task and have a **strictly later canonical UTC** than its parent. The shared inspector protects both read-only consumers and all managed project writes (including ordinary Task Save/Save As through the existing F2 hook). A mismatched edited workbook is not silently normalized, migrated or cleared.
- `src/managed/commitmentProjection.ts`: **pure, read-only** task-indexed `ProjectCommitments` history from the same validated XLSX source, ordered by recorded UTC. Empty valid registry = `Unconfirmed`; recorded rows = `Recorded (unverified)` with `acceptanceAuthorityVerified=false`. This exposes `latestRecorded` **as a structural historical tail only**, NOT as an authoritative approved business baseline. A matching `ProjectAudit` entity reference is a structural trace pointer, not identity verification. Invalid/legacy/future/partial source never fabricates a recorded acceptance. Nothing is written to Excel or browser storage.
- `test/unit/projectDataF6c.commitmentHistory.test.ts`: eleven synthetic tests exercising both the reader and actual shared write gate. No UI, accepted commitment Save action, auto detection/Green/Watch threshold, authenticated actor, Report 1.1 output or frozen ProjectWBS/UpdateHistory change.

## New synthetic QA matrix

| ID | Coverage |
|---|---|
| F6C-01 | Legacy workbook: no invented acceptance or task baseline |
| F6C-02 | Five-sheet valid workbook without commitments: every task `Unconfirmed` |
| F6C-03 | One recorded row with audit entity reference and unverified actor; read leaves source bytes unchanged |
| F6C-04 | Two valid same-task revisions ordered by UTC; historical tail is explicitly unverified |
| F6C-05 | Task-specific histories stay isolated; TaskStatus completion does not grant authority |
| F6C-06 | Two roots for one TaskID refused as `MULTIPLE_COMMITMENT_ROOTS` |
| F6C-07 | Two children of one predecessor refused as `FORKED_COMMITMENT_CHAIN` |
| F6C-08 | Same or older successor UTC refused as `COMMITMENT_TIME_ORDER` |
| F6C-09 | Existing orphan/cross-task/cycle validation remains fail-closed |
| F6C-10 | Partial/future extension does not imply valid-empty acceptance history |
| F6C-11 | Imported fork refused by real guarded project Save **before source/stage/backup**, with customer workbook bytes unchanged |

## Execution provenance and release limits

Initial head `f8e53f75e18ad8c5d509a536872bb7c8100b3657` [CI #43376721949](https://github.com/Kenny619/spl-wbs/actions/runs/43376721949) **FAILED at test compile**, because the newly added synthetic test file declared identical `T4` twice. No F6c behavior tests executed in that attempt; previously existing 275 unit tests passed. The duplicate test-only constant was removed at `4d94cd1dd8865d470e2a7be22c12db3316c7a732`, and the new exact-head [full CI #43376877253](https://github.com/Kenny619/spl-wbs/actions/runs/43376877253) completed **SUCCESS**, with all 286 unit and 80 Windows tests PASS, including 11/11 F6c. The initial red head remains historical failure evidence, not retroactive PASS.

**Hard boundaries:** an Excel row and an `UnverifiedLocal` actor label are not a corporate authorization; `ProjectAudit` is not cryptographically immutable. The safe linear-chain structure helps readers but does **not authorize a new Accept Commitment action or determine the current trusted baseline**. The owner-approved five-sheet shape is not a field-level freeze. Real Excel open-file locks, separate synced copies, corporate Node26/Edge file-provider interactions, independent organizational QA and DES-012 Review08 visual acceptance remain OPEN. No production file, merge, beta/release, README/UAT kit or automatic Green/Report name change.

**Final technical disposition:** F6c synthetic functional/data-integrity and Windows regression **PASS at exact SHA `4d94cd1dd8865d470e2a7be22c12db3316c7a732`** — 286/286 unit, 80/80 Windows Chromium and both builds. This does **not** mean accepted commitment authority/automatic Watch thresholds are approved, nor independent organizational or physical corporate Excel/Edge QA. Draft PR #55 unmerged; v0.1.2 field-level contract remains proposed, with owner freeze and release/UAT gates still open.
