# Issue #11 — Load-time fingerprint guard v2: executable test-only verification

**Date:** 2026-11-06 JST. **Scope:** isolated technical feasibility, not managed product implementation. No production viewer, frozen v18 UI, or approved workbook specifications were modified.

## Change verified

The original recovery pilot compared source bytes at Save but did not retain an identity/fingerprint from the original workbook load. Consequently, an externally edited source could be overwritten even if it changed long before Save started. The v2 pilot:
1. Introduces explicit `captureLoadedFingerprint(dir)` (read-only SHA-256 of the initially loaded source).
2. Requires a validated fingerprint in `saveTest(..., {loadedFingerprint})`; absent/malformed values block immediately.
3. Rejects a changed source before any stage, transaction record or backup is created (`STALE_LOADED_SOURCE`), including equal-size modifications.
4. Retains a late source digest check before source write (`EXTERNAL_SOURCE_CHANGED`).
5. Requires a new capture after successful save, workbook switch or browser restart; no implicit retention of stale snapshots.
6. Standalone Edge pilot adds an explicit **Capture loaded-source fingerprint** control, a disabled Save until capture, and a single-run guard. The inspector remains read-only, with no automatic restoration after interruption.

## Executed regression evidence

- Host: local Linux Node.js **22.16.0** (no actual Windows/Edge file operation).
- `node --test core-tests-v2.mjs adversarial-core-tests-v2.mjs load-fingerprint-tests.mjs`: **34/34 Node mocked-handle assertions PASS**. This is 25 adapted prior regression scenarios + 9 new assertions.
- New assertions: 7 test favorable/safe behavior, **2 deliberately reproduce unresolved check-to-close source and backup races**. Therefore **34/34 assertion passes must NOT be stated as 34/34 concurrency-safety passes**.
- Valid initial source and candidate fixtures remain pinned:
  - original `e1a78ee11371035ef75c1d81786a6ebd19fc0bcebd99c3a067dc8cf64f369deb`
  - candidate `53abbf1c9333d7b7a4d47e603556ade62cc573b2e0b1aae347b12bf8fad527a9`
  Both extracted embedded fixtures were verified as valid ZIP containers with no CRC errors; **this does not imply ExcelJS OOXML semantic fidelity**.
- The inline HTML JS passed `node --check`; the embedded core text was checked byte-for-byte against the standalone core after removing module `export` tokens.
- Linux Chromium navigation to **both file:// and localhost** was blocked by administrator policy. Consequently **no interactive browser UI test passed** here; earlier test-only physical Windows/Edge exploratory smoke results must not be conflated with the new v2 pilot.

## Reproducibility and provenance

All five files were published to the test-only branch and fetched back to confirm exact content parity with the locally executed source:
- `verification/issue11/SPT-WBS-Edge-Fingerprint-v2.html`
- `verification/issue11/fingerprint-v2/recovery-core-v2.mjs`
- `verification/issue11/fingerprint-v2/core-tests-v2.mjs`
- `verification/issue11/fingerprint-v2/adversarial-core-tests-v2.mjs`
- `verification/issue11/fingerprint-v2/load-fingerprint-tests.mjs`

Committed final source state at `01973a4d514b918d28ab0e4e91da25fcb0fd3297` (test-only distribution branch, **do not merge into main**). HTML SHA-256 `7d1f962b8b5f55134ae54a7ccfeecfbc36ed3c18b7d1831407c6b1cbc35f969a`. Full 11-file downloadable conversation ZIP `Issue11-Load-Fingerprint-Guard-v2.zip`: SHA-256 `a3a7ff50e0a0b5e2ca4e9410263550f650c3cfffd31bff470d481f95ba7ed8ee`. The ZIP contains the matching test sources, synthetic XLSX fixtures, TAP log, README, execution classification and SHA256SUMS.

## Remaining gates / explicit non-claims

- `createWritable` real browser close, permission, disk/lock behavior and reboot/restart state remain unverified for v2.
- Hash comparison cannot guarantee conflict-free writes between the final check and file close (both source and managed backup races reproduced).
- The test-only manifest and directory handles do not guarantee authenticated ownership against malicious/concurrent writers.
- No ExcelJS/OOXML semantic round-trip, UpdateHistory/ChangeSetID transaction or desktop Excel reopen has been executed here.
- Actual Windows/Edge negative-path validation and independent technical QA remain required for FS-06/07/08/09/10/11. The original exploratory smoke-test phase stays closed.

**Governance:** EMV-ARCH-1.0 and DEC-EMV-002-01..11 unchanged. Issue #11 OPEN, Issue #2 OPEN and unfrozen. No product implementation, authorization to merge, deployment, release or final architecture freeze.
