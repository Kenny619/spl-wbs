# F6a — Adversarial workbook-integrity QA for Watch direct Save

**Date:** 2026-11-13 JST. **Classification:** draft technical QA; not independent organizational signoff, physical corporate-file UAT, field-level contract freeze or release.
**PR:** [draft #53](https://github.com/Kenny619/spl-wbs/pull/53), based on [draft #52](https://github.com/Kenny619/spl-wbs/pull/52).
**Initial head:** bcfe08160ab6aba02435c6778bd3a6e70f407a8f.
**CI:** [Actions #43373292438](https://github.com/Kenny619/spl-wbs/actions/runs/43373292438): **269/269 Ubuntu unit tests in 37 files and managed/read-only builds PASS**; Windows Chromium still running at first evidence publication.

## Independent fault-injection matrix

The existing guarded project-data writer stages a predecessor, writes a pending record, replaces the source, updates its backup and owner record, then cleans up. This test-only change introduces controlled createWritable close failures against *real synthetic XLSX bytes* using the production verified writer. Previously tested ordinary success paths are retained, not replaced.

| ID | Fault / fidelity test | Required result |
|---|---|---|
| F6A-01 | Inject failure after **stage close** | Source untouched, orphan stage classified **STOP**, no automatic retry |
| F6A-02 | Inject failure after **pending close** | Old source/stage and pending record retained, **BEFORE_WRITE**, no retry |
| F6A-03 | Inject failure after **source close** | Updated source may exist, predecessor evidence retained, **NEEDS_BACKUP**, retry refused |
| F6A-04 | Inject failure after **backup close** | Updated source and predecessor backup, old owner possible, **BACKUP_VERIFIED**, retry refused |
| F6A-05 | Inject failure after **owner close** | Updated source/backup/owner with pending cleanup, **BACKUP_VERIFIED**, retry refused |
| F6A-06 | Two stale editors, sequential reload | Editor B's stale hash refused without a write; after explicit reload B can append independently audited second Watch reason |
| F6A-07 | Watch Add → task edit → Watch Resolve | Both separate task/project histories, custom column/worksheet and formatting, backup predecessor and reason history preserved; no fake Green |
| F6A-08 | Tamper stored WatchReason audit TaskID | Refuse next candidate as incompatible **before staging**, preserving changed source for investigation |

**Source:** test/unit/projectDataF6a.transactionIntegrity.test.ts. Eight tests, including five independently parameterized close-failure scenarios; no production source modifications. The test calls actual saveManagedProjectDirect/saveManagedDirect, inspectManagedSave, inspectProjectData and projectWatchProjection functions, and checks source bytes, backup hashes and worksheet content.

## What these results do not prove

Synthetic File System Access handles do **not** establish atomic distributed locking, real SharePoint/OneDrive concurrent copy safety, Office-open file locking, guaranteed disk-write atomicity or corporate Node26/Edge compatibility. A SHA-256 source fingerprint is not a distributed CAS. The workbook audit is not cryptographically immutable or linked to a trusted corporate identity. Detailed project-data v0.1.2 fields, accepted commitments, automatic risk evidence and actor policy remain **proposed**; do not infer Green/Clear or approval authority.

**Remaining gates:** exact-head Windows browser CI; reviewer-independent test audit; corporate disposable shared-file sequential/locked-file UAT; owner contract freeze and DES-012 Review08 visual acceptance. No release, merge, production workbook writes or README/UAT kit.

**Initial disposition:** unit/build PASS; full CI and non-synthetic gates pending.
