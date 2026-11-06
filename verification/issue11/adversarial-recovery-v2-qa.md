# Issue #11 — second adversarial review and fail-closed model v2

**2026-11-06 JST. TEST-ONLY PYTHON MODEL, NOT Edge, ExcelJS, Windows hardware, independently signed-off implementation or a frozen contract.** Synthetic disposable workbook fixtures only.

## Reproducible independent model QA

Existing owner-manifest/reconciliation model SHA-256 `923c4bd2a9cd52b91e9c8b823008a08d889388f3964447da15b8ce0f06bca77b` still reproduces **8/8 original passing tests**. A NEW independently written adversarial harness SHA-256 `ec027ee84fe08ee1102b0184e8abe66cd450ad298f1bb72b99e6a67e24765db7` ran 8 additional tests: **7 safe, 1 unsafe**.

### Confirmed unresolved defect in previously reported model

During a pending transaction on an already owned workbook, another process can replace the managed backup with unrelated data. The previous backup-owner manifest still records the OLD hash, and `recover()` accepted the mismatch as a partially written backup. The function returned `RECONCILED_VERIFIED` and **overwrote the externally changed backup**. This violates the approved rule not to overwrite unverified/unrelated files. The earlier 8/8 is not sufficient.

| New adversarial case | Original model |
|---|---|
| Existing foreign backup before Save | Safely blocked |
| Existing foreign staging file | Safely blocked |
| External source modification while transaction pending | Safely blocked |
| Pending transaction hash tampering | Safely blocked |
| Staged predecessor hash tampering | Safely blocked |
| Foreign backup inserted after initial transaction without prior owner | Safely blocked |
| **Foreign backup replaces previously owned backup during pending transaction** | **FAIL: overwrites unrelated bytes** |
| Orphan owner metadata without backup | Safely blocked |

### Test-only v2 model correction

Fail-closed when any managed-backup bytes are not equal to a recognized **complete predecessor hash** for the pending transaction, even if an older owner manifest exists. If the backup is partially written, this deliberately returns `BLOCK_UNRECOGNIZED_BACKUP_STATE` and keeps the stage + transaction record for manual/independently verified recovery. Do not silently overwrite uncertain bytes.

Exact v2 model SHA-256 `178d6d7381feb8364eda03697a417ec62ca1cc724f8a49a03c4740ede879824c`. Re-executed: **8/8 model assertions pass** (updated partial-backup expectation is safe refusal). Independent v2 adversarial QA SHA-256 `36410145964728dbeb61260ad31deff97a40920c1d61eb21d74f16c83318e07a`: **8/8 adversarial safety assertions pass**. Machine results SHA-256 `4474dc1a1ee831295d766d01e3c7d53482940656dc7c2a6819c7823d5a02d4d0`.

**This does NOT prove that the backup owner metadata is genuinely trustworthy** (JSON can be tampered with), nor that the browser API provides atomic writes or crash durability. Concurrent changes between check/write and source edits can still race. The only supported conclusion is that the revised tested Python model blocks the uncovered overwrite path.

## Evidence provenance

The following exact executable files were produced, executed and retained as downloadable conversation artifacts:
- `adversarial_reconciliation_qa.py`
- `adversarial_reconciliation_qa_results.json`
- `owned_backup_reconciliation_model_v2.py`
- `owned_backup_reconciliation_v2_results.json`
- `adversarial_reconciliation_v2_qa.py`
- `adversarial_reconciliation_v2_qa_results.json`

This Markdown record and hash values do not substitute for committing/examining the exact scripts; reviewers must inspect them against the above SHA-256 before accepting a test claim.

## Next gate

Do not close FS-08/09. Require a synthetic **actual Edge File System Access API** negative-path/restart protocol, demonstrated with exact harness and source/backup hashes, and independent review. Keep pending FS-10 ExcelJS OOXML allowlist/desktop Excel reopen and FS-11 Save As switching. Maintain earlier owner smoke-phase closure.

**Governance:** EMV-ARCH-1.0 and DEC-EMV-002-01..11 unchanged. #2 remains OPEN/UNFROZEN; #11 OPEN; no product implementation, merge, deployment or release authorized.
