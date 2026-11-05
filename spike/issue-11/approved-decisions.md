# Approved decisions — evidence copy

Retrieved 2026-11-05 from GitHub Issue #2. Not an amendment. All eleven decisions remain approved; Issue #2 remains open. No implementation authorization is inferred.

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649398875

## Product Owner decision — DEC-EMV-002-01 (2026-11-05)

**Status: APPROVED — directional decision, Issue #2 remains OPEN for refinement.**

The Excel Managed Variant shall use **direct Save to the originally opened local .xlsx workbook** as its primary workflow. Where direct write access is unavailable, provide a **safe Save As fallback** rather than claiming the original was updated.

Consequences for the detailed requirement:
- The original workbook is the source of truth; no server/database dependency.
- Save must be an explicit user action.
- A successful direct save updates the original workbook; successful Save As must clearly identify that a copy was saved.
- On failure or cancellation, the UI must preserve unsaved edits and never show them as persisted.
- Changes should only be reported as saved after write completion; history and updated fields belong to the same logical save.
- Conflict handling, file locking, preservation of workbook contents, permission behavior, and exact fallback semantics remain **OPEN** pending further product/technical refinement.
- Existing SharePoint/read-only variant must remain unaffected.

**Next PO decision:** What should happen if the same workbook is already open for editing in desktop Excel? Avoid assuming safe simultaneous write access.

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649406026

## Product Owner decision — DEC-EMV-002-02 (2026-11-05)

**Status: APPROVED. Issue #2 remains OPEN.**

**Policy:** The source workbook must be closed in desktop Excel before the Excel Managed Variant saves directly to it. When direct Save is prevented by file locking/conflicting external changes, offer **Retry** (after closing Excel or resolving the conflict) and **Save As** (separate updated workbook). Cancel must preserve unsaved edits.

### Acceptance behavior
- A valid, writable, unchanged, closed source workbook can be directly saved.
- A detected lock/conflict blocks direct Save; do not silently overwrite or merge external changes.
- Failure/cancellation does not mark edits/history as persisted.
- Save As must not overwrite the original and must clearly identify the destination/copy.
- Preserve edits for retry after failure.

### Feasibility caveat
A standalone web app cannot necessarily detect whether desktop Excel has opened a workbook in every browser/runtime or file-sharing configuration. Implement best-available file-lock/external-modification protection, fail safely on detectable conflicts, and document detection limitations. Do not claim perfect or preemptive Excel-open detection.

**Next design question:** Specify save/confirmation UX and Save As continuation semantics, plus workbook write integrity/recovery. Do not treat this decision as full architecture acceptance.

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649413122

## Product Owner decision — DEC-EMV-002-03 (2026-11-05)

**Status: APPROVED — Issue #2 remains OPEN.**

After a **successful Save As**, the newly saved workbook automatically becomes the **active workbook/source of truth** for the current session.

### Acceptance criteria
- Do not switch the active workbook until the newly chosen destination has been saved successfully.
- Clearly update the active workbook filename/indicator after switching.
- Subsequent edits target the newly saved workbook, not the prior original.
- The prior workbook remains untouched by Save As.
- If Save As fails or is canceled, keep the prior active workbook and preserve pending edits.
- If the browser does not provide a durable writable file handle for the new copy, communicate this explicitly and request permission or offer another Save As on future saves; never pretend direct-save capability is guaranteed.

### Continuity
This extends approved DEC-EMV-002-01 (direct Save with safe fallback) and DEC-EMV-002-02 (require desktop Excel to be closed; handle detectable locks/conflicts safely). Remaining architecture/UX constraints are still pending. No implementation authorization or issue closure is implied.

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649433022

## Product Owner decision — DEC-EMV-002-04 (2026-11-05)

**Status: APPROVED — Issue #2 remains OPEN.**

When the currently active workbook has been modified externally since the application loaded (or last successfully saved) it, **block direct Save** and present conflict-resolution choices. **Do not implement automatic merge in v1.**

### Acceptance behavior
- If no detectable external modification exists, Save may proceed subject to other validation/permission checks.
- On detected modification, do not overwrite source or claim success. Present **Reload Workbook**, **Save As**, and **Cancel**.
- **Reload Workbook** must require confirmation if unsaved edits exist; warn those edits could be lost. Do not discard pending edits merely by opening the conflict dialog.
- **Save As** preserves the original conflicted workbook and follows approved DEC-EMV-002-03: switch active source only after successful Save As. Save As content/provenance when external changes exist must be verified by the architecture spike; never silently merge.
- **Cancel** returns to editing without discarding pending changes.
- Repeated direct Save without conflict resolution remains blocked.
- Use best available external-modification detection; browser limitations mean perfect detection cannot be promised. Document limitations and fail safely for detectable conflicts.

### UX direction
Prefer an on-demand contextual conflict dialog over a persistent banner, preserving the 14-inch / 1920×1080 (often scaled) Gantt workspace.

### Remaining work
Specify provenance/compare strategy, save transaction safeguards, workbook fidelity, permissions and persistence, plus implementation test evidence before freezing Issue #2. No automatic merge or implementation approval is implied.

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649441669

## Product Owner decision — DEC-EMV-002-05 (2026-11-05)

**Status: APPROVED — Issue #2 remains OPEN.**

A Save operation shall commit **all edited fields and their associated UpdateHistory records together as one logical transaction**. **No partial saves** are allowed.

### Acceptance behavior
- Validate the full pending edit set before writing; if any field is invalid, reject the entire Save and identify invalid fields.
- On success, persist all approved field changes and matching history entries with a shared `ChangeSetID`, then update the UI to the committed workbook state.
- On failure, do not claim that any changes were saved or present partially committed UI state; preserve pending edits for retry.
- A no-op Save creates no UpdateHistory records.
- If a save is retried after an uncertain interruption, prevent accidental duplicate history entries and verify actual persisted state before claiming success.

### Engineering validation needed
An .xlsx write is not automatically physically atomic. Architecture spike must demonstrate a safe write/recovery strategy (temporary artifact/verification/replacement where feasible; explicit limitations otherwise), and tests for failure/interruption, rollback/recovery, full field-history parity, and no-op behavior.

**Not yet frozen:** file replacement guarantees, workbook-content fidelity, browser permissions, unsupported Excel features, and remaining save UX details. Do not infer implementation authorization from this directional approval.

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649449520

## Product Owner decision — DEC-EMV-002-06 (2026-11-05)

**Status: APPROVED — Issue #2 remains OPEN.**

**Preserve existing workbook content and block unsafe saves when important Excel features cannot be preserved.** Applies to both Save and Save As.

### Approved functional contract
- Modify only intended editable fields of `ProjectWBS` and append new entries in `UpdateHistory` as part of the approved logical Save transaction.
- Preserve existing history rows and unrelated worksheets.
- Preserve workbook formatting, formulas/references, tables, validation, named ranges, and other existing content to the extent verified as supported.
- Before enabling a write, validate workbook compatibility. If there is a credible risk of discarding or altering important unsupported features, **block save**, explain what prevents preservation, and do not claim success.
- Never silently remove or corrupt unrelated workbook content.

### Engineering/QA obligations
- Investigate actual ExcelJS read/write round-trip fidelity including unsupported OOXML parts, formulas, macros, charts, pivot tables, external links, images, conditional formatting, named ranges and workbook metadata.
- Define and test a defensible compatibility/preflight strategy; do not assume library support implies byte-for-byte or semantic preservation.
- Include representative positive and negative workbook fixtures, post-save reopen/content checks, and recovery tests.
- Clarify exactly which workbook types/features are within the supported contract before freezing Issue #2. Inability to guarantee preservation of arbitrary workbook features is a constraint, not permission to silently drop them.

Prior decisions remain: DEC-EMV-002-01 direct Save with fallback; -02 no direct save while desktop Excel is open where detectable; -03 switch active source after successful Save As; -04 block on detected external modification; -05 all field/history edits together without partial saves.

**No implementation authorization or full Issue #2 freeze yet.**

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649461733

## Product Owner decision — DEC-EMV-002-07 (2026-11-05)

**Status: APPROVED — Issue #2 remains OPEN for remaining design and feasibility.**

The Excel Managed Variant must **automatically maintain a recoverable backup of the entire original .xlsx workbook before replacing it during direct Save** and provide a clear recovery process.

### Acceptance contract
- Create and verify a recoverable pre-save backup **before** destructive replacement of the active source.
- If backup creation/verification fails, block the direct Save and preserve pending edits and the source; never silently proceed without recovery protection.
- Backup contains the full preceding workbook, including unrelated sheets/features and existing history, not merely changed task fields.
- If save fails or is interrupted, preserve the backup and present recovery guidance; do not falsely claim a successful workbook commit.
- Recovery/restore must avoid silently overwriting newer valid content and should require explicit user intent.
- Keep backup/recovery distinct from the append-only `UpdateHistory` audit trail.
- Apply source integrity and conflict checks under DEC-EMV-002-02/-04/-05/-06.

### Still OPEN for refinement
- Browser File System Access permissions and whether a local sibling backup can be created; establish a realistic, testable fallback if automatic backup is blocked.
- Backup storage placement, filename, retention/count policy, cleanup, and user visibility.
- Save As-specific backup semantics (never overwrite original).
- Interrupted write and recovery guarantees per supported browser/runtime.

### Existing approved decisions
DEC-EMV-002-01 direct Save with Save As fallback; -02 avoid saving while workbook is open in Excel (best available detection); -03 switch active source after successful Save As; -04 block detectable external modifications; -05 logical all-or-nothing field/history transaction; -06 preserve workbook contents and block unsafe round trips.

**No implementation authorization or full issue freeze.**

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649502863

## Product Owner decision — DEC-EMV-002-08 (2026-11-05)

**Status: APPROVED — Issue #2 remains OPEN.**

**Backup retention:** Keep **only the latest successful pre-save recovery backup per workbook**. Do not build an accumulating version-history archive.

### Acceptance behavior
- Direct Save must create and verify a complete pre-save backup before replacing source content, under DEC-EMV-002-07.
- On subsequent successful direct Save, rotate so that the most recent pre-save version is the retained backup; older backups should be removed through safe cleanup.
- Never delete/overwrite the only valid recovery copy before verifying its replacement. A failure in backup generation/rotation must prevent an unsafe source replacement.
- On interrupted/failed write, retain whichever verified recovery copy can restore the original; do not imply success.
- Backups belong to each individual workbook, not one global slot shared by unrelated projects.
- After successful Save As, the new workbook becomes active per DEC-EMV-002-03 and follows its own backup lifecycle on subsequent direct saves.
- Backup retention/cleanup should require no routine user interaction.

### Open technical detail
Placement, filename, permissions, rotation strategy under File System Access, recovery UI, and exact interrupted-save protections are **NOT yet frozen**. The engineering spike must demonstrate that the single-backup policy can be implemented safely in the supported local runtime and explicitly report any browser limitations.

**Product decisions approved so far:** DEC-EMV-002-01 through DEC-EMV-002-08. Do not close #2 or initiate implementation until remaining architecture/UX decisions and feasibility are addressed.

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649518383

## Product Owner decision — DEC-EMV-002-09 (2026-11-05)

**Status: APPROVED — Issue #2 remains OPEN.**

**Backup location:** Maintain the single latest recovery backup in the **same directory as the active Excel workbook**.

### Acceptance behavior
- The backup resides alongside its corresponding active workbook, not in a central/global directory.
- Proposed conventional name: `<workbook-base>.backup.xlsx` (exact naming and collision policy still to be confirmed).
- Preserve the entire pre-save workbook per DEC-EMV-002-07; retain the latest safely under DEC-EMV-002-08.
- Following a successful Save As and active-workbook switch under DEC-EMV-002-03, subsequent direct saves apply the backup policy in the new active workbook directory.
- Do not proceed with destructive direct Save if permission to create/verify/rotate the same-directory backup is unavailable. Give actionable permission/error feedback and a safe alternative consistent with prior decisions.

### Feasibility gate
The standalone browser's file handle may not provide the parent directory or permission to create sibling files. The architecture spike must prove a supported user-granted directory workflow on the intended Windows/Edge environment, or raise an explicit Product Owner decision rather than bypassing backup protection.

**Still OPEN:** directory authorization UX, naming/collision handling, actual write/recovery mechanism, compatibility verification, and interruption scenarios. No implementation authorization or Issue #2 freeze.

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649536222

## Product Owner decision — DEC-EMV-002-10 (2026-11-05)

**Status: APPROVED — Issue #2 remains OPEN.**

**Primary opening workflow:** User selects the **project folder** containing the Excel workbook, rather than relying on a file-only picker as the main workflow. The app obtains user-granted directory access to support reading/writing the active workbook and creating/verifying/rotating the one recovery backup in the same directory.

### Acceptance behavior
- Provide user-initiated project-folder selection.
- Identify eligible .xlsx workbook files within the chosen folder; allow explicit selection when multiple candidates exist (exact selection UX not yet frozen).
- Request only necessary permissions through browser-mediated user interactions; do not assume permissions are perpetual.
- The app must clearly show the active workbook and distinguish its backup from user-selectable sources.
- Perform direct Save and same-directory recovery-backup operations only when actual authorization/capability checks pass.
- If permission is missing/denied or unsupported, preserve edits, report the limitation accurately, and offer a safe resolution without bypassing DEC-EMV-002-07 through -09.
- Optimize selection and permission UX for 14-inch 1920×1080 Windows laptop, including 125%–150% scaling.

### Technical validation pending
Confirm File System Access API directory-picker and writable-handle behavior in the actual standalone `file://` Edge deployment, including permissions across reopen and browser restart. If this cannot be implemented reliably, return to PO for an exception/alternative rather than silently switching to another design.

Approved decisions DEC-EMV-002-01 through -10 remain directional requirements. Do not close #2 or authorize implementation until the feasibility spike and remaining design questions are resolved.

---

https://github.com/Kenny619/spl-wbs/issues/2#issuecomment-6649544584

## Product Owner decision — DEC-EMV-002-11 (2026-11-05)

**Status: APPROVED — Issue #2 remains OPEN.**

After choosing a project folder, **the user explicitly selects the active workbook from eligible .xlsx files**. Exclude recovery backups from the normal workbook selection list. **Remember the last selected workbook** to simplify reopening.

### Acceptance behavior
- Present a compact, keyboard-accessible list of eligible workbooks in the chosen directory; never automatically choose the most recently modified workbook.
- If only one eligible workbook exists, show it as the available choice. Do not silently activate an unintended workbook.
- Exclude app-managed backup files using a reliable naming/identification convention; account for Excel temporary lock files and unsuitable files during eligibility validation.
- Persist a best-effort reference to the last selected folder/workbook, but no task/project data in browser storage.
- On reopen, offer the previous selection when possible; seek renewed user permission through an explicit interaction if browser permissions have expired.
- If the folder/workbook moved, disappeared or became inaccessible, show a clear recovery path to choose another.
- When switching workbooks, show the active filename and guard against silently discarding any unsaved edits.
- Keep workbook chooser transient/compact to preserve 14-inch 1920×1080 laptop Gantt real estate.

### Feasibility and unapproved details
Confirm File System Access API directory-handle persistence and permission behavior for locally launched Edge/file://. Define exact naming/eligibility and unsaved-switch behavior prior to final freeze. Do not infer permission persistence or implement an unsafe substitute.

**Decision chain:** DEC-EMV-002-01 through -11 approved. No full Issue #2 freeze/implementation authorization yet.