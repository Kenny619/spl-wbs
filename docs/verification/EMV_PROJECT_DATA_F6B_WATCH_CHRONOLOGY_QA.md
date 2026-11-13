# F6b — Recorded Watch chronology integrity: fail closed on imported/corrupted Excel

**Prepared:** 2026-11-13 JST  
**Status:** bounded development and technical QA on [draft PR #54](https://github.com/Kenny619/spl-wbs/pull/54), stacked on [F6a QA PR #53](https://github.com/Kenny619/spl-wbs/pull/53). The detailed v0.1.2 field-level ProjectData contract is **proposed, not frozen**; no physical corporate-file/owner UAT or release is implied.  
**Exact tested head:** `96125391d09409fc93657f8a62cc67fb973faed0`.  
**Final CI:** [GitHub Actions #43374712341](https://github.com/Kenny619/spl-wbs/actions/runs/43374712341) **completed SUCCESS at exact head** — [Ubuntu job #131718474673](https://github.com/Kenny619/spl-wbs/actions/runs/43374712341/job/131718474673) **275/275 unit PASS** in 38 files (6/6 F6b), strict TypeScript and managed/read-only builds PASS; [Windows Chromium job #131718474993](https://github.com/Kenny619/spl-wbs/actions/runs/43374712341/job/131718474993) **80/80 browser PASS (2.6m)**.

## Inspection finding

The F2 workbook inspector already required canonical `WatchReasons.OpenedUTC`, `LastReviewedUTC` and `ResolvedUTC` timestamps, and the F5c **new mutation candidate** explicitly blocked an attempted resolution dated before opening. However, when a workbook already contained a recorded `ResolvedUTC` or `LastReviewedUTC` earlier than `OpenedUTC`, the **read-only validator accepted it as structurally valid**. That could project a chronologically impossible historical episode, or allow a different project-data Save using an externally altered legacy/imported Watch row. This is a semantic consistency gap, not a verified real-world data loss incident.

## Minimal correction

- `src/managed/projectDataInspector.ts` now records **`WATCH_TIME_ORDER`** if a canonical review or resolution UTC timestamp is **earlier** than its own opening UTC. Equality remains allowed for an immediate review or resolution. Invalid/malformed timestamp handling retains the existing `BAD_REVIEW_TIME`, `MISSING_RESOLUTION`, and `BAD_UTC` behavior. No new automated risk/accepted commitment/Green policy is introduced.
- The inspector is the **shared read-only and all-managed-write validation gate** in the stacked draft: an invalid imported Watch row makes `projectWatchProjection` return `incompatible` and zero trusted tasks, not a fake Unknown/Green or valid reason history. A subsequent project Save refuses with `INVALID_PROJECT_DATA` before stage, backup or source mutation. The existing F3c guarded writer itself is unchanged.
- No ProjectWBS/UpdateHistory fields, report semantics, names, dates, custom sheets, credentials, permissions or risk thresholds are changed.

## Six targeted regression cases

| ID | Case | Expected |
|---|---|---|
| F6B-01 | Production candidate-created valid Open and Resolved episodes | Both remain valid; Open = recorded Under Watch, resolved-only = Unknown |
| F6B-02 | Externally edit a saved ResolvedUTC to before OpenedUTC | `WATCH_TIME_ORDER`; read model `incompatible`; candidate refuses Save |
| F6B-03 | Externally set LastReviewedUTC before OpenedUTC for a still-Open reason | `WATCH_TIME_ORDER`; no reason projection |
| F6B-04 | Set LastReviewedUTC before OpenedUTC for a Resolved reason | `WATCH_TIME_ORDER` |
| F6B-05 | Exact-equal opening/review/resolution timestamps | Valid; zero-duration episodes supported |
| F6B-06 | Attempt verified direct Save with externally altered reason chronology | `INVALID_PROJECT_DATA`; no sidecars, source byte-identical, ProjectAudit and custom sheet preserved |

Test file: `test/unit/projectDataF6b.watchTimelineIntegrity.test.ts`. Synthetic ExcelJS XLSX sources and the real F2/F3c/F5a functions are used; no real production workbook is loaded.

## Provenance and limits

A test-first commit `79e6bae161ccefa4bec97a94ead9411d87687aa4` introduced six tests, followed by the inspector safeguard at `96125391d09409fc93657f8a62cc67fb973faed0`. The earlier test-first CI was superseded/cancelled by a new push; **do not claim** it completed as a separate failing-red CI result.

**Final gate:** exact-head Ubuntu 275/275 and Windows Chromium 80/80 PASS. The six new fail-closed chronology scenarios were executed successfully. No existing v18/managed/regression browser failure detected. The independent technical contract freeze, physical Windows Edge/Node26, Excel-open locks, canonical SharePoint/OneDrive sequential edits, owner-approved DES-012 Review08 UI parity and Watch-integrated Meeting Review remain **open**. This check does not make workbook audit cryptographically immutable or a local source hash into distributed locking.

**Final technical disposition:** bounded synthetic source-integrity fix **PASS at exact SHA** `96125391d09409fc93657f8a62cc67fb973faed0`, with 275/275 unit and 80/80 Windows Chromium. Independent organizational QA, field-level contract/actor authority freeze, physical corporate shared Excel locking, DES-012 Review08 visual acceptance, and genuine Watch/commitment-integrated Meeting Review remain OPEN. [PR #54](https://github.com/Kenny619/spl-wbs/pull/54) is DRAFT/unmerged. No new README/UAT ZIP, production workbook migration, release, main merge or beta change.
