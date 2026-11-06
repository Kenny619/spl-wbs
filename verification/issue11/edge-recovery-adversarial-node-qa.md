# Issue #11 — executable Edge recovery pilot QA, second pass

Date: 2026-11-06 JST. **Test-only** analysis; no production source changed.

## Verified by execution
Ran the original mocked-handle suite and a newly authored nine-case adversarial suite **together** in Node.js on Linux: **25 passed, 0 failed, 0 skipped**. The original 16 tests reproduce without changes.

New adversarial cases:
1. A second successful save retains the immediately prior source in managed backup.
2. Staging file close exception preserves an unknown stage and blocks retries.
3. Partial staging write detected before source mutation.
4. Source close exception retains the staged predecessor.
5. Partial source write detected; state classified STOP.
6. Partial backup write detected; staged predecessor retained.
7. Foreign backup inserted after source readback is not overwritten.
8. Owner metadata without backup blocks before writing.
9. Previously owned backup modified without manifest update blocks and remains untouched.

### Exact reproducibility hashes (SHA-256)
- Original standalone pilot ZIP: `6f5b739a2bdd5369d4b57a23ebde2b76d1d691044acc362a4cef07d28c569b76`.
- Recovery core: `4f52cafdb8460ba841bf5e8d8abcadcbbba366ef65a4c3fe70d237fe759101e9`.
- Original 16-case suite: `ab8f43ec581c1a99e22d7356a1f99cb037b234e76193eed6699e8b9194cb0776`.
- New 9-case adversarial suite: `86a00d7af3d65c5157cc743d764cfa3c79837876f8074a3251dd81098e68452d`.
- Combined Node TAP result: `8cf9474b32750fcf9cb4777fb50fb35b013b81ba1043f1216d01200cc319a852`.

The exact scripts, browser HTML, README and TAP log are bundled as `Issue11-Edge-Recovery-Verified-Package.zip`, downloadable from the current conversation. **This repository record does not assert binary publication to GitHub**; hash comparison is required before a reviewer accepts the archive.

## Important limitations
- Node mock streams provide no actual Windows/Edge permission, locking, `createWritable` close semantics, durability or process termination evidence.
- The harness tests bytewise source/stage/backup transactions with prebuilt synthetic XLSX fixtures; no ExcelJS edit/history serialization, ChangeSetID or Excel desktop re-open.
- Recovery `inspect` reports descriptive states but is read-only and intentionally does not automatically repair uncertain writes.
- The filename/manifest hash scheme is not authenticated ownership against malicious actors; the test protects only scenarios explicitly checked.
- Potential time-of-check/time-of-use races around source and backup writes remain unproven, including multiple writers.

## Required technical next steps
- Run packaged HTML using real Edge file handles on **new disposable synthetic folder**, recording actual file hashes after at least one injected failure and restart, with independent reviewer evidence.
- FS-10 compatibility corpus and Excel-authored positive/negative OOXML fixtures, ExcelJS and desktop Excel round-trip verification.
- FS-11 Save As transaction and active-handle switching, independently QA'd.
- No automatic closure of FS-08/09, Issue #11 or architecture freeze of #2.

The EMV-ARCH-1.0 direction and DEC-EMV-002-01..11 remain approved and unchanged. No product implementation, merge or deployment authorized.
