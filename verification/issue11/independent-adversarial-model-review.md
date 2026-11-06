# Issue #11 — Independent adversarial assessment of recovery model

Date: 2026-11-06 JST. Scope: **review of test-only Python reference model**, not Windows/Edge, ExcelJS, product implementation or formal independent sign-off.

## Reproducibility

Reviewed source model SHA-256: `f13bf592340b799c05ecad61ab7ff76f03a4bbb87da4f62b8be45d1d35aafaf9`. Independently authored adversarial Python test SHA-256: `c8264778c15d6fd61ec5281f51f09979269b9759313b50b608f0a83f23aeb04f`. Reran original 14 tests (14/14 green) and then four adversarial checks against the same callable `run()` using disposable synthetic data.

## Results

| Case | Observed | Assessment |
|---|---|---|
| Unrelated existing `src.backup.xlsx`, normal `foreign=False` call | Save returned `VERIFIED`; **unrelated backup bytes overwritten** | **FAIL — severe model-safety defect** |
| Existing foreign `src.stage.xlsx` | Returns `BLOCK_STAGE`, stage/source intact | PASS (fail closed) |
| Interrupted after source-write then retry | First returns `UNCERTAIN`; next attempt `BLOCK_STAGE` while source was already modified | **FAIL — lifecycle incomplete**; safe refusal but no recovery/reconciliation transition |
| Short managed-backup write | Returns `UNCERTAIN`; staged predecessor remains whole; managed backup is partial | **CONCERN — crash/restart handling required** |

The existing 14/14 green suite was insufficient. Specifically, the `foreign=True` case was explicitly passed by the test caller and did not test **detecting backup ownership**. Under the function's default behavior, an existing unrelated backup is overwritten. Do not promote the 14/14 model to implementation design or FS-08/09 acceptance.

## Required corrections to the *test model*, not the product

1. Do not rely on caller-supplied `foreign` to establish ownership. Model explicit provenance/ownership verification of managed backup and stage with collision protections and fail closed when unknown.
2. Define a state machine for restart/reconciliation after any uncertain write. The recovered state must account for original, current source, staged predecessor, backup, full SHA-256 and a persistent transaction identity. No blind retry or silent cleanup; never overwrite newer valid source.
3. Independently fault-inject partial source/managed-backup writes and verify byte-for-byte recovery across restart, not merely existence of one matching byte array in the same process.
4. Do not call a `PK` prefix a valid ZIP/OOXML proof: parse ZIP and verify full package, worksheet/history semantics, and Excel reopen.
5. Before FS-08/09 acceptance, translate only verified portions to test-only Edge `createWritable` behavior and obtain independent QA with physical Windows/Edge negative-path evidence.

No new Product Owner policy choice: this is enforcement of already approved EMV-ARCH-1.0 requirement not to overwrite unrelated backup files. All 11 previous decisions preserved. **Issue #11 OPEN, Issue #2 OPEN/unfrozen**. No production implementation, release or merge authorized.
