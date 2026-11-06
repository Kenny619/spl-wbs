# Issue #11 — Recovery model correction, owner-aware backup identity and restart paths

Date: 2026-11-06 JST. **TEST-ONLY PYTHON reference simulation**, synthetic fixtures only. This is neither independently signed-off QA nor actual Edge/Windows execution.

## Why this correction was needed
Independent adversarial review of the earlier 14/14 green model found 2 failures: a caller-supplied `foreign=False` flag allowed an unrelated existing backup to be overwritten, and uncertain completion left a stage file with no usable restart-reconciliation transition. Full review: [independent-adversarial-model-review.md](./independent-adversarial-model-review.md).

## Correction tested
A new non-production Python model:
- uses persisted JSON manifest (`source.backup-owner.json`) to record managed backup hash and source identity, instead of a caller-supplied `foreign` flag; existing unrecognized backups are blocked;
- writes persisted pending transaction metadata with source predecessor/candidate hashes before simulated source modification;
- keeps staged predecessor until source and managed backup are independently read back, and can reconcile some interrupted states on a new call;
- blocks automatic recovery where original source bytes remain unchanged or where a partial/foreign source requires explicit restoration consent.

### Executed results — 8 / 8 *model* assertions
1. Foreign backup collision — blocked and unrelated bytes preserved.
2. Restart with already-written candidate — reconciled candidate and predecessor backup.
3. Subsequent save — verified immediately prior source retained as backup.
4. Interruption before source changed — restart requires explicit abort confirmation.
5. Partial source — restart requires user restoration consent; staged predecessor retained.
6. Interruption after managed backup completed — restart reconciled.
7. Tampered managed backup — blocked.
8. Partial managed backup with matching prior manifest — simulated restart restored verified predecessor.

**Model source SHA-256:** `923c4bd2a9cd52b91e9c8b823008a08d889388f3964447da15b8ce0f06bca77b`.

**Important limitation:** The manifest is ordinary JSON, **not cryptographically signed**; it offers test-model identity bookkeeping but is not proof that an arbitrary existing backup is user-owned, nor protection against malicious concurrent file modification. The model calls Python `write_bytes` and does not implement browser createWritable stream/close semantics, Excel locks, atomic replacement, power loss, durable flush, directory permissions or multi-writer exclusion. It appends synthetic byte markers to XLSX bytes and does **not** prove valid workbook history/fidelity.

## Technical gates remaining
- Produce a browser File System Access API test-only harness with non-destructive controlled failure injection and actual Edge restart recovery, using only disposable workbooks; inspect ownership collisions, externally modified files, backup stage and process termination.
- Test ExcelJS/OOXML positive/negative corpus and history/ChangeSetID transaction logic with desktop Excel reopen, independent QA, and published allowlist.
- An independent reviewer must challenge this **corrected model** and execute the exact source, rather than accepting the author-reported 8/8 number.
- Obtain explicit Product Owner approval only for material deviations to the frozen requirements or final architecture freeze; routine technical work may continue under existing Issues #2/#11.

**Disposition:** Corrected reference model passed 8 illustrative cases; **FS-08/09 remain unverified**, Issue #11 OPEN, Issue #2 OPEN/unfrozen. No production feature implementation, PR merge, deployment, or release.
