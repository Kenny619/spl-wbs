# F5a — Workbook-backed Under Watch read model: conservative evidence

**Prepared:** 2026-11-13 JST  
**State:** DRAFT synthetic feasibility on [PR #48](https://github.com/Kenny619/spl-wbs/pull/48) stacked on [F4d #47](https://github.com/Kenny619/spl-wbs/pull/47); no merge, production approval or owner UAT.  
**Exact verified head:** `dd61321faeeb566d71883ee6c04eb19eb7700277`.  
**Final CI:** [#43310858983](https://github.com/Kenny619/spl-wbs/actions/runs/43310858983) **SUCCESS at exact SHA**: Ubuntu **249/249 unit tests in 35 files**, including F5a **12/12**, managed/read-only TypeScript builds PASS; Windows Chromium **72/72 PASS**.

## Contract and permitted claim

- Owner selected **shared Excel-owned Under Watch**, reason-backed **Under Watch / Clear / Unknown**, low-interaction Resolve and accepted revised commitment, and **no status-only Meeting Review**.
- The owner approved **five additive sheet organization** and one initial enabled blackout, but **field-level Watch/audit/actor semantics, automatic signal registry and evidence freshness remain UNFROZEN**. This draft cannot legitimately claim automatic alerts, new reasons, Green, accepted commitments or a released Meeting Review.
- F5a therefore builds an entirely **READ-ONLY projection** from the already proposed five-sheet XLSX validation. A task with at least one saved **Open** reason is labeled **Under Watch (recorded)** with separate reason episodes and source notes. A task with no open reason is **Unknown**, never Green/Clear, until a complete approved automatic check set and accepted-commitment policy exist. A recorded automatic reason is displayed *as written*, not freshly calculated.
- The `hasRecordedProjectAudit` property means **a corresponding ProjectAudit entity reference exists**, not that it is cryptographically immutable, authentic, signed, or evidence of a trusted corporate actor.

## Exact code and synthetic test coverage

- `src/managed/watchProjection.ts`: `projectWatchProjection(bytes)` opens a workbook, calls `inspectProjectData` **before reading any Watch facts**, indexes stable ProjectWBS.ID and WatchReasons.TaskID, reads open/resolved reason data without mutation, preserves source order and open/resolved separation, and optionally identifies a recorded ProjectAudit reference. Returns `legacy` / `valid` / `incompatible` / `unsupported_future`, explicit validation findings, and no source identity guessing.
- `test/unit/projectDataF5a.watchProjection.test.ts`: 12 synthetic tests cover legacy Unknown, valid workbook with no reasons Unknown, open manual watch independent of completed TaskStatus, multi-reason/independently resolved history, resolved-only Unknown (not Green), recorded automatic reason without rule execution, stable task-ID isolation, orphan reason rejection, partial/future schema refusal, duplicate IDs refusal, identical repeated read/no source or audit mutation.
- No File System Access handle, localStorage Watch state, ProjectAudit writer, approval workflow, rule engine, meeting UI, reports change, background timer or corporate identity inference is added.

## Risk and handoff

1. A typed `WatchReasons` row may have an unverified local actor. `hasRecordedProjectAudit` is only a structural pointer. The final user-facing inspector must avoid claiming independent evidence validation.
2. **Unknown is a deliberate safety state**, not a failure to compute a convenient Green status; historical Watch must not auto-clear when one reason resolves, a task completes, a due date moves or a required rule cannot be evaluated.
3. A non-Excel shared service, or user-local Watch state, is not permitted under the Owner's data ownership decision. A workbook hash does not provide atomic lock/synchronization across independent cloud-sync copies.
4. The v0.1.2 proposed field-level contract requires separate approved freeze before implementing Watch Add/Resolve, commitment acceptance, provenance enforcement, automated triggers or actual Meeting Review.
5. The approved DES-012 Review08 and Report Review02 appearance must be preserved; **MR-D01 B** prohibits shipping an interim status-only Meeting Review.
6. CI is Node22/Windows Chromium; no physical corporate Node26.13.0/npm11.19.1 Edge, shared file lock or real user XLSX UAT proof is asserted.

**Final technical disposition:** F5a read-only projection feasibility **PASS** at exact head **249 unit + 72 Windows browser**; no real project-file mutation, no integrated Watch UI/Meeting Review, no production acceptance. The structural schema and business evidence/actor policy remain unfrozen. PR #48 draft/unmerged.

## Red-to-green build trace

The initial F5a candidate at `6bc91b0ab6cb5485758b56cd95de5a9b3b7a2e64` passed **249 unit tests** but the strict TypeScript build failed because `TaskID` retained a nullable type after map lookup. This was corrected with an explicit verified task-id narrowing in `watchProjection.ts` at head `dd61321faeeb566d71883ee6c04eb19eb7700277`. A full new [exact-head run #43310858983](https://github.com/Kenny619/spl-wbs/actions/runs/43310858983) passed **249/249 unit, both builds and 72/72 Windows browser**. Preserve the first red/green evidence; it was a build typing defect, not incorrect Watch classification.
