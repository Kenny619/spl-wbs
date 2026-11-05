# Codex Cloud pilot — Issue #11 feasibility assessment

2026-11-05 (Asia/Tokyo). Supports #2 and epic #1. Overall **CONCERN: plausible architecture, insufficient evidence for architecture freeze or implementation**. No product features, frozen UI, read-only behavior, approved decisions, merge, deployment, release, or issue completion changed.

## Scope and evidence

Read README.md, AGENTS.md, issues #1/#2/#8/#10/#11, all twelve comments on #2 (eleven approved decisions plus stage-one assessment 6649570643), and draft PR #9 including its workflow and failed Windows job logs. Repository under test: `80a4a6f51fbf5673b9b78f70b22ff20f0d099eef` (main's content; local branch `work`). PR #9 head: `dbff99a69440e727499adbf4cd509ee30fa5eca6`.

Evidence labels used below:

- **A — verified by automated test:** executed in this Linux cloud session; exact scope stated.
- **C — verified by code inspection:** describes existing implementation or absence, not successful file operations.
- **D — supported by documentation:** platform/library contract, not deployment evidence.
- **H — requires actual Windows 11/Edge hardware testing:** remains unverified. Historical Windows Server Chromium CI is not this evidence.

Synthetic workbooks only for the spike. No real workbook data was opened. No simulated picker, mocked permissions, Node filesystem operations, or Linux browser result is claimed as a Windows filesystem success. Independent QA has not been performed.

## Cloud baseline results

Linux x64, Node `v24.22.1`, npm `11.9.0`; CI specifies Node 22. Current managed network policy is enforced/restricted, with package-manager and GitHub hosts available. No runtime secrets or outbound identities were reported; the separately connected GitHub app provided repository access.

| Requested command | Observed result |
|---|---|
| `npm ci` | PASS after environment setup correction; 251 packages installed using a workspace cache and supported network-enabled execution. Initial default-sandbox attempt failed with proxy connection EPERM and could not write the default home cache. An intermediate install attempt failed with extraction ENOENT; the subsequent isolated run succeeded. No lockfile changes. |
| `npm test` | FAIL, exit 1: 48 passed, 2 failed; 1 additional suite could not load. |
| `npm run build` | FAIL, exit 2: TS2552 missing Buffer; TS2307 missing node:crypto, node:fs, node:fs/promises, node:path declarations. Vite/package/checksum stages did not execute. |
| `npm run test` | FAIL, exit 1: same 48 passes, 2 failures, 1 suite load failure. This aliases the same test script, not an extra browser suite. |

Baseline diagnoses:

1. **Issue #10 reproduced (A/C):** `.gitignore` excludes `reference`; neither reference file is tracked. `baseline.test.ts` cannot load the approved HTML; `calendar.test.ts` cannot compare its holiday table; `dataSource.test.ts` cannot load data-source.xlsx. Browser baseline/harness/release tests also depend on these files. The missing HTML's approved SHA-256 is `5e6f438fb3817e253984a806bb5bccd4d82f3f14e93d0d03e6eaf5ada2fb84d7`; its integrity cannot be verified without the original bytes. Reconstructing an approximate HTML or changing that hash would defeat the baseline protection.
2. **Build typing defect (A/C):** package.json has no direct `@types/node` devDependency. The lockfile places Node 14 types only under fast-csv dependencies. tsconfig includes Node-based unit tests and fixtures, but root compilation cannot resolve those declarations. Recommend an explicit supported Node 22 types devDependency and reviewed lockfile update in a separate test/tooling change. Do not exclude tests from typechecking to hide the defect.
3. **Additional existing CI defects (historical automated evidence):** [run 41964706681](https://github.com/Kenny619/spl-wbs/actions/runs/41964706681) failed both jobs. Ubuntu unit failure skipped build. Windows Server 2025/Chromium job reproduced the same TypeScript errors in release setup, missing reference files, and an 8,486-pixel (~1%) mismatch for `gantt-1440-win32.png`; result 17 failed, 5 did not run, 1 passed. The screenshot cause is unresolved: inspect actual/diff images and runner/browser/fonts before proposing a correction. Never increase tolerance or regenerate approved snapshots to hide this.
4. **Dependency health (A):** `npm audit` reports 5 findings: 3 moderate, 2 critical (vitest/tinypool critical; exceljs/uuid/@vitest/mocker moderate). This is a dependency audit result, not proof of exploitability in the bundled app. Review advisories and exposure separately; no forced upgrades or ExcelJS version changes in this pilot.

The exact requested sequence was run after installation, including build despite test failure. Local E2E was not run: required references are missing and committed snapshots are Windows-specific. No screenshots were generated or changed. CI is not green; the cloud pilot exposed reproducibility defects rather than establishing a release gate.

### Reproducible cloud foundation proposal

Use a clean checkout, Node 22 matching CI, and workspace-local npm cache (for example `npm ci --cache "$PWD/work/npm-cache"`) through the configured proxy with TLS verification intact. No Docker, VPN, server, data upload, or private project fixture is needed. Run all four requested commands and retain exit codes/logs even when earlier checks fail. Run Windows browser CI separately; preserve diagnostics with `upload-artifact` on failure, including Playwright actual/diff/expected images and reports. Keep PR #9 draft until baseline defects are repaired and independently reviewed; required branch checks need repository-owner configuration after checks are green.

For #10 recommend committing the exact approved, reviewed non-sensitive frozen HTML at the tested reference path (or a pinned, hash-verified controlled artifact if it cannot be committed). Use a deterministic synthetic workbook matching the reference test's explicit contract, with provenance and content review; preserve semantic assertions, including hierarchy/date/status/link behavior. Audit browser fixture coupling too. Do not copy private workbook bytes, remove assertions, skip failures, or replace frozen HTML with regenerated output. This report does not resolve #10 or imply access to missing originals.

## FS-01 through FS-12

PASS/FAIL apply only to the named subtest. Every overall FS item remains **CONCERN**, because the required hardware acceptance has not been executed. See `windows-edge-runbook.md` for reproduction steps and evidence requirements.

| ID | Assessment and evidence | Remaining actual Windows/Edge proof |
|---|---|---|
| FS-01 file:// capability | CONCERN (D/C). file URLs can be trustworthy; this does not establish picker permission. Packaged single-HTML model exists; no managed directory workflow exists. | Launch offline packaged harness from file://; record secure context, actual picker grant and read/write. Compare localhost only diagnostically. |
| FS-02 folder enumerate/selection | CONCERN (D/C). showDirectoryPicker supports user-granted access. Current main.ts uses showOpenFilePicker only. | Explicit compact keyboard selection, including one candidate; exclude backups, ~$ locks, temporary and incompatible files; never auto-select newest. |
| FS-03 directory write/sibling backup | CONCERN (D/C). A file handle alone does not confer parent access. Directory authorization is required for sibling creation. | Create whole-byte backup, close, reread and hash-verify before source replacement; deny/full disk/collision paths must block save. |
| FS-04 persistence/repermission | CONCERN (C/D). Existing IndexedDB store persists one file handle only; read permissions are queried/requested. Unit mocks do not establish directory serialization or restart grants. | Refresh/restart/move/revoke; offer prior selection and renew grants only after gesture; store handles/configuration only, no project data. |
| FS-05 save/reopen parity | CONCERN; PASS for narrow in-memory serialization (A), not physical save. Synthetic edited field plus history and enumerated features reopened successfully. | Actual write/close/getFile/readback, full field/history ChangeSetID parity, no-op, failed UI consistency. |
| FS-06 Excel lock | CONCERN (D/C). No definitive browser cross-process Excel-open query; source must be closed per -02. Browser writer exclusivity is not proof of Excel lock ownership. | Open/save/close workbook in desktop Excel; test access errors and Retry/Save As/Cancel without losing edits or claiming success. |
| FS-07 external edits/race | CONCERN (C). Current code has no conflict detection. Proposed full-byte hash and late checks improve detection but cannot eliminate check-to-commit race. | External same-size/mtime-preserved changes, rename/replacement, second tab, changes before close; block known conflicts, never merge. |
| FS-08 failure/recovery | CONCERN (D). createWritable stages changes until close, typically via temporary file; no proven multi-file/power-loss atomicity. | Inject failures before/after backup close, source write/close/readback and restart; inspect original/backup bytes; uncertain state must not report success. |
| FS-09 single-backup rotation | CONCERN (design only). Retain one latest verified pre-save backup per workbook; staged verified replacement needed before old recovery copy removal. | At least three saves, two workbooks, failures during rotation/cleanup and process interruption. Never destroy the only verified recovery copy. |
| FS-10 workbook fidelity | CONCERN; narrow PASS and preservation FAIL (A). Listed simple features survive; formula cache stays stale; related customXml part disappears. Negative test passes by detecting that loss. | Native Excel-authored positive/negative corpus; independent package/semantic comparison and Excel reopen without repair prompts. |
| FS-11 Save As switch | CONCERN (C). Existing viewer has no save/switch transaction. Approved rule: new workbook active only after successful save; old original untouched. | Cancel/failure/locked source/new directory/identity collision; subsequent Save targets new file with new-directory backup lifecycle. |
| FS-12 laptop scaling/keyboard | CONCERN (C). Frozen snapshots exist for 1440 and 1024 widths; no managed chooser is implemented. | Physical 1920×1080 laptop, Windows 125%/150%, keyboard-only native picker, dialogs/focus/zoom; preserve frozen workspace. |

## Synthetic ExcelJS 4.4.0 evidence and compatibility proposal

Run from repository root after npm ci: `node spike/issue-11/fidelity.test.mjs` (when these proposed files are checked out). Executed in cloud as `node work/cloud-pilot/fidelity.test.mjs`: **3 tests passed**. Uses only in-memory synthetic workbooks; imports no production code and performs no physical workbook saves. Existing unit assertions were not edited. Inspect the script for the exact assertions.

| Feature | Observed coverage | Proposed write policy pending PO/QA |
|---|---|---|
| Scalar edit + appended history, prior history, unrelated sheet | PASS for one numeric edit, one append, existing row and unrelated scalar | Candidate only; does not validate the future product schema or transaction orchestration. |
| Simple formula/reference and cached result | Formula and old cached result preserved; changing C2 from 10 to 25 leaves D2 cache 20 rather than 50 | No calculation engine. Until recalculation/display policy is approved, block affected formulas or restrict supported contract. Never label stale cached values recalculated. |
| Basic font/color/number format, table presence, whole-number validation, simple defined name, creator | PASS for enumerated assertions only | Not proof of all styles, table XML/data consistency, metadata or complex references. Expand corpus and compare semantics before allowlisting. |
| Related customXml OOXML part | FAIL preservation: input part exists, output part absent | Reject unknown parts/relationships before BOTH Save and Save As. |
| Charts, pivots, macros, external links, images, conditional formatting, signatures, protection/encryption, complex names/formulas, arbitrary unknown sheets/features | Not tested here; no safe preservation claim | Default reject for writes until individually demonstrated. Unrelated sheet content still needs full compatibility review. |

Preflight must inspect original ZIP content types, relationships and worksheet features, not only extension or values returned by the normalizer. Explicitly reject malformed/encrypted/macro-enabled/signed packages, unsupported features and unknown extension parts; impose ZIP expansion/size limits. Establish an allowlist from tested OOXML structures plus workbook schema, not a list of filename suffixes. ExcelJS normalizes/reserializes supported parts; generic byte-for-byte preservation is not promised. Compare unedited semantic content and package part inventories after serialization; unknown part loss in this probe proves successful serialization alone is insufficient. Save As is not a bypass for compatibility checks. Byte-for-byte full-source backup should avoid ExcelJS entirely.

## Proposed architecture — no implementation approval

Keep separate read-only and Excel-managed entry points/artifacts and isolated controllers/adapters. Existing main.ts, read-only permission store, importer and frozen UI contract remain unchanged. Share only independently regression-tested pure calendar/model/view utilities; scope future managed UI additions narrowly. Do not serialize normalized Task records into a new workbook: excelReader.ts reduces formulas to cached values and drops unknown columns/sheet content from its output.

Managed-only session holds directory/file handles, original source bytes and full-byte digest, immutable committed model, pending edit set and transaction identity in memory. Browser storage holds best-effort handles and approved configuration only, never workbook bytes, task rows, history or draft edits. Show the active filename. Preserve pending edits after cancel/failure; no reload/switch discards edits without explicit confirmation. Cross-session retry reconciliation needs a workbook-carried identifier/schema design, not persisted project data.

Canonical proposed direct-save transaction:

1. Explicit Save gesture; single-flight coordinator. Validate all pending edits and compatibility before writing. No-op returns without a history append or destructive write. Confirm current readwrite authorization through user action when needed.
2. Reread source from active handle; compare SHA-256 of full bytes with loaded/last committed baseline (size/mtime are advisory only). Detected difference blocks source write: Reload with unsaved-loss confirmation, Save As, Cancel. Lock/access errors offer Retry/Save As/Cancel; Retry rechecks everything. Never automatic merge.
3. Clone the full supported workbook, patch only authorized cells and append matching history with one stable ChangeSetID and canonical UTC timestamps. Serialize to candidate bytes, reopen, validate all edits/history and unedited supported content. No UI commit yet.
4. Copy the exact verified source bytes into a same-folder staging backup, close/reread/hash it. An existing conventional backup name without reliable app ownership is a collision, not permission to overwrite. Create no destructive source stream if backup creation/verification/rotation fails.
5. Promote the verified staged backup to the retained backup using only capabilities proven on Edge. Retain the older verified recovery copy until replacement verification succeeds. Recheck source digest before any replacement and as late as possible before source close. Never assume atomic rename/move support for user-visible files. If copy/verify/cleanup is needed, preserve valid staging on interruption and stop for recovery.
6. Write complete candidate through createWritable; await write and close; obtain fresh File and verify digest, schema, field/history parity and ChangeSetID. Only then replace committed model, baseline hash, clear pending edits and show saved. If close/readback is ambiguous, mark outcome uncertain and reconcile actual bytes/ChangeSetID before retry, preventing duplicate history. Never auto-restore over possibly newer valid data.
7. After successful verification, clean old staging/rotation artifacts so steady state retains exactly one latest pre-save backup per workbook. Cleanup failure is a distinct recovery/cleanup condition, never false success about retention; retain recovery rather than delete blindly.

This is a logical transaction design, **not a demonstrated physical atomic transaction**. Documentation supports temporary-stream commit on close, but there is no established compare-and-swap, cross-file transaction, universal desktop lock detection or power-loss guarantee. A residual external-write race remains after the final hash check. Test exclusive browser writers if supported but do not equate them with Excel locks. Multiple transient recovery artifacts may exist during safe rotation/failure; the exact temporary naming and recovery policy require PO refinement under -08, rather than silently turning one steady-state backup into a version archive.

Recovery should enumerate owned recovery candidates, validate bytes and explain which predecessor each represents. Preserve drafts in memory. Require explicit user intent and current-content conflict checks before restore; preferably restore to a new file when state is uncertain. After a browser crash, drafts cannot be promised recoverable under the no-project-data storage rule. A verified predecessor backup is recovery evidence, not an append-only audit history replacement.

Save As uses the loaded baseline plus pending edits and existing history, never silently incorporates external changes. Clearly disclose that provenance if source changed. Reject a destination that is the active original or any managed backup/staging file; proposed v1 path chooses a new nonexisting destination to avoid unsafe overwrite of another project. Validate/write/close/readback before atomically switching the in-memory active identity/model and digest. If no durable handle is available, identify the new copy and require future permission/Save As rather than claim direct-save support. Plain browser download lacks verification and durable destination identity: label it unverified export, not successful Save As/active-source switch, unless PO approves a separately evidenced policy. Obtain new directory permission before any subsequent direct save requiring sibling backup. Cancel/failure preserves prior active source and edits.

## Approved-decision traceability

All DEC-EMV-002-01 through -11 remain intact. The companion `approved-decisions.md` preserves the eleven original decision bodies and source links.

| Decision suffix | Preserved constraint | Design/evidence mapping |
|---|---|---|
| 01 | Explicit direct Save primary, safe Save As fallback | Transaction and FS-05/11 |
| 02 | Close desktop Excel, best-available lock handling | Lock limits and FS-06 |
| 03 | Switch active workbook only after successful Save As | Save As and FS-11 |
| 04 | Block detectable external edits; no auto-merge | Digest checks and FS-07 |
| 05 | All fields/history together; ChangeSetID/no-op/idempotent retry | Transaction and FS-05/08 |
| 06 | Preserve content; block unsafe Save AND Save As | Compatibility and FS-10 |
| 07 | Complete verified pre-save recovery backup | Transaction and FS-03/08 |
| 08 | One latest pre-save backup per workbook; safe rotation | Rotation and FS-09 |
| 09 | Same-directory backup; fail closed without permission | Directory adapter and FS-03 |
| 10 | Primary user-initiated project-folder opening | Selection and FS-01/02/04 |
| 11 | Explicit eligible workbook choice, exclude backups, remember handles | Selection and FS-02/04/12 |

## Governance and next gates

`governance-additions.md` is a proposed appendix to AGENTS.md, not an overwrite or activation. It preserves existing mandatory rules and distinguishes the existing no-write viewer from the not-yet-authorized managed scope.

Recommended order:

1. PO/maintainer approves the #10 fixture provenance strategy; obtain the exact approved HTML without changing its hash and provide synthetic reproducible workbook fixtures. Resolve explicit Node types in separate tooling change, repeat clean Node 22 checks, and investigate the historical screenshot diff without changing approved baselines.
2. Review dependency advisories in a separate maintenance slice, preserving the locked parser pending deliberate compatibility review. Enhance draft CI diagnostics and make its green checks required only after baseline recovery; do not merge #9 in this task.
3. Continue test-only #11 on actual Windows 11/corporate Edge/file:// using the companion runbook. Record exact OS/Edge/Excel versions, policies, file location, SHA-256 and before/after files. Test localhost only as comparison, not substitute. Include native Excel-authored synthetic fidelity fixtures and controlled interruptions.
4. Independent QA reviews test evidence, negative paths, workbook differences and each FS result before recommendation to freeze #2. PO then decides supported contract and unresolved limitations. Feature implementation still needs separate authorization.

PO refinements needed (no approved decision reopened by this assessment): exact backup ownership/naming/collision and transient rotation cleanup; supported workbook feature/formula recalculation contract; conflict-copy provenance wording; Save As destination/overwrite and handleless download semantics; unsaved-switch choices; acceptable documented race/crash limitations after hardware evidence. If target file:// directory/backup workflow fails, return for an explicit exception rather than dropping -07 through -11 or silently changing runtime.

## Documentation sources

MDN source pages were retrieved through their public GitHub mirror on 2026-11-05; documentation support is not physical testing:

- https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker — secure context, transient activation, readwrite mode, cancellation/security errors.
- https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/requestPermission — explicit gesture and permission lifecycle.
- https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable — changes reflected after close; typical temporary-file replacement; writer modes/errors.
- https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts — local file potential trust does not guarantee deployed API usability.
- Installed ExcelJS 4.4.0 README, formula-value documentation — formula calculation is not provided by ExcelJS. Synthetic script independently confirms stale cache behavior.

Executive recommendation: cloud-based investigation is workable after fixing repository portability and typing defects. Direct browser-managed Excel saves remain a conditional design, not an accepted capability. Preserve all eleven decisions, keep #2 open, and prioritize independent Windows/Edge recovery and fidelity evidence before any feature work.
