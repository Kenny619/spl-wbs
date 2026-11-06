# Issue #11 — FS-08/FS-09 backup recovery reference model (2026-11-06 JST)

**Classification: executable Python POSIX local-filesystem MODEL, not a browser-runtime/ExcelJS/Windows proof.** This is exploratory validation of a proposed staging order, not Product Owner acceptance, independent QA, or authorization to implement.

## Executed experiment

Input: previously distributed fully synthetic `FS04-PERMISSION.xlsx` fixture. Disposable temporary directories only; generated candidate content was the exact synthetic XLSX bytes with differentiating trailing model markers, **not valid edited Excel workbooks**. Python 3 standard library (`tempfile`, `hashlib`, `pathlib`). The script and machine-readable output are attached to the current ChatGPT verification run; source script SHA-256 `bd62ebd470360ef1867fad59634afea7d6b46b8a3edbc469dbf366c6c649e1f5`; results SHA-256 `67e3f8c24c08d703c5531cbe474f997ed6419408c904c47b7d9057f9917968b5`.

The reference sequence is:

1. Reject pre-existing `*.backup.stage.xlsx` as an unreconciled/collision condition.
2. Read the current synthetic source, write complete predecessor into same-directory staging and read back to verify.
3. Write a new synthetic candidate into the source, fresh-read it and verify.
4. Rotate staged predecessor into the single named `*.backup.xlsx` in steady state; verify backup equals immediate prior source.
5. Never claim success before source readback. Inject a controlled logical exception at named boundaries; report **uncertain or failed**, retain state for explicit reconciliation; do not silently perform recovery.

## Results — 8/8 *reference-model* assertions

| Case | Result | Observation |
|---|---|---|
| Save 1 | PASS_MODEL | Backup equals original source |
| Save 2 | PASS_MODEL | Backup equals immediately preceding source |
| Save 3 | PASS_MODEL | Backup equals immediately preceding source |
| Inject at precheck | PASS_MODEL | No false success, predecessor recoverable |
| Inject after stage verification | PASS_MODEL | No false success, recoverable staged predecessor |
| Inject after source readback | PASS_MODEL | No false success, predecessor recoverable |
| Inject after backup rotation | PASS_MODEL | No false success, predecessor recoverable |
| Pre-existing staging filename collision | PASS_MODEL | Fail-closed; unrelated file/source left untouched |

## Major uncovered design risk

**This model uses Python `Path.replace` / OS replacement for backup rotation. There is no verified equivalent atomic rename/move primitive for the approved Edge File System Access API.** The tested model therefore does **not** establish a safe browser-implementable single-backup rotation. Depending on permissions and interleaving, naive delete/recreate of an existing backup may destroy the last good recovery copy. A browser-implementable rotation must be separately designed and tested, or the backup guarantee explicitly narrowed through new owner approval.

Other untested conditions: partial/truncated writes; power loss; browser termination; failed `close`; disk full/ACL; uncertain write completion and history dedupe; actual Excel workbook semantic validity or OOXML fidelity; recoverable identity across multiple folders/workbooks; directory sync; actual Excel locks; external edit race; Save As switch. The model's extra marker bytes are **not valid workbook edits** and must not be described as fidelity evidence.

## Required next gate

1. Independent QA review the synthetic model and challenge the staging/rotation property, with a browser-compatible implementation experiment in an isolated test-only harness.
2. Execute on disposable Windows/Edge file:// environment without re-running closed exploratory owner smoke; gather negative-path/failure evidence and actual backup hashes.
3. Continue FS-10 ExcelJS/OOXML compatibility corpus with independent Excel desktop reopen evidence.
4. Do not freeze #2 or accept #11 without separately verified FS-08/09 guarantees and owner disposition for any residual limitations.

Previously approved DEC-EMV-002-01..11 and EMV-ARCH-1.0 remain unchanged. **No product implementation, merge, or release authorized.**
