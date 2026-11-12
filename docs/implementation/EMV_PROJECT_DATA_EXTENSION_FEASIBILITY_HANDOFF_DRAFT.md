# EMV-PROJECT-DATA-0.1 — design-to-DEV/QA handoff (DRAFT / DO NOT IMPLEMENT YET)

**Prepared:** 2026-11-12 JST  
**Controlling proposed spec:** [human contract](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md), [machine contract](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.json), [acceptance matrix](../verification/EMV_PROJECT_DATA_0_1_ACCEPTANCE_PLAN.md).  
**Owner-approved data ownership:** [DEC-DATA-2026-11-12](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md).  
**Approved UI:** exact [DES-012 Review 08](../../design/concepts/DES-012-consolidated-review08-task-detail.html) (verify source blob `de6ebaa63aa035ba741b4435cf1cdb9d1166d958`).  
**Application source inspected:** draft PR #37 branch `feature/report-1-1-stakeholder-html` at `04e31d138d6aba5121ce397f2fde622e3bf6ef3d`, as of the Design Office prior source audit. **Refresh exact heads before any future coding.**

This is a **pre-implementation feasibility/work breakdown proposal** only. The proposed five-sheet schema is not frozen, stages/priorities are not re-authorized, and no Cursor development task is assigned by this document. Never use new sheets on a real user workbook until the Owner freezes a versioned extension and explicitly authorizes a bounded implementation.

## Essential technical constraints found

- `src/managed/workbookCandidate.ts`: task field candidate writer is strictly TaskID/known-EDITABLE_FIELDS and `UpdateHistory` oriented. Project-level Calendar/Watch actions cannot be shoehorned into its task-field allowlist without violating frozen #3/#4.
- `src/managed/history.ts`: rejects `UpdateHistory` Field values outside known editable task fields. A synthetic project audit row would make historical reading fail and potentially block future Save.
- `src/managed/directSave.ts`: source bytes/hash, verified staging and predecessor backup, source conflict checks, pending/recovery metadata. Reuse the same guarded transaction mechanism without diluting its fallbacks or assuming distributed file locking.
- `src/managed/preflight.ts`: explicit fail-closed supported-OOXML allowlist. Do not bypass it or downgrade unknown workbook-part handling because new sheets are requested.
- `src/calendar/blackout.ts` + `src/ui/mount.ts`: currently one **session-only** enabled inclusive range. Target is Excel-persistent Project Calendar in Settings; keep current visual/business effect unless separately approved.
- `src/calendar/workdays.ts`: `remainingWorkdays` intentionally does **not** take blackout input. Persisting blackout must not quietly change Days Remaining.
- `src/managed/settingsUi.ts`: the personal timezone/columns/Light-Dark-System settings are browser-local and should stay so. **Project Calendar needs a separate draft/Save path, not localStorage.**
- `src/managed/shell.ts`: real Gantt present, Meeting Review absent, Exceptions currently status-only. Owner selected integrated Watch+Meeting, no interim status-only Meeting Review.
- No current safe authenticated network identity or verified multiuser lock. “ActorLabel” is informational until a real provider and role contract are approved; no invented verified attribution.

## Proposed work packages — not authorized for engineering execution

| Gate/work package | Bounded deliverable and proof | Blocker / Do not do |
|---|---|---|
| **F0 spec gate** | Owner dispositions of proposal and genuine open decisions; version bump, frozen human+machine contract; exact workbook field types/validation and stage ordering | Do not code or alter frozen #3–#7 body as if approved |
| **F1 safe OOXML feasibility** | Disposable sample workbook with new ordinary sheets; preflight→ExcelJS roundtrip→re-preflight; no style/custom loss, no unsupported features silently tolerated | Do not modify v18 read-only viewer or a corporate workbook |
| **F2 reader/validator only** | Parse extension and legacy/partial/unknown schema with explicit Unknown/Not Configured states, no writes | No implicit sheet creation on import/view |
| **F3 project mutation candidate** | New typed project-data commands that generate a **single candidate** for project fields and project audit, with shared transaction ID/timestamp; no-op safe; merge only if task Save is included and verified | No fake task history entries, no “Save success” from browser memory |
| **F4 guarded workbook Save/reload** | Adapt existing staged/backup/conflict/recovery pipeline and test full snapshots; retain single-writer safety; verify two-user workbook handoff | No claims of realtime sync or CAS guarantee in OneDrive/local copies |
| **F5 Project Calendar UI** | Settings section uses draft / Save / Cancel with actual workbook-backed values and explicit persistence state, leaving user-local preference Reset untouched | No unaudited local-only blackout state or unapproved Days Remaining math change |
| **F6 Watch + Meeting** | Only after the risk checks, reason lifecycle, accepted commitment semantics, role/provenance and targeted Watch-aware Meeting design are frozen; use approved Review 08 shell | No status-only Meeting Review presented as full Watch, no invented Green/Amber severity |
| **F7 QA and controlled Owner UAT** | Independent validator and safety QA, test plan scenario matrix, exact-head screenshots at approved widths/themes, physical Edge + shared-file handoff/lock tests, read-only regression | No README-promoted UAT kit until ongoing hold and precise release gates are cleared |

## Transaction design sketch to prove, not implement blindly

1. Read exact original workbook bytes; preserve hash. Parse baseline and extension using header maps, strict validation and fail-closed diagnostics.
2. A user action yields a typed project data change *draft*; no immediate disk write, no auto-dirty UpdateHistory.
3. Build candidate from original with additive sheets and field-level `ProjectAudit`. Any simultaneous task edit may append canonical task `UpdateHistory` in the same logical Save. Both use matching `ChangeSetID` and `TimestampUTC`.
4. Preflight serialized candidate then reopen and compare all unaffected sheets/cells and identity rows; preserve custom columns and records. Reject unsupported constructs.
5. Immediately before mutation validate source file consistency; use existing stage/backup/owner protocol. Verify source + backup after close. Retain recovery files/draft on uncertainty; no duplicate event retry.
6. Refresh from saved workbook only on confirmed source; require explicit reload when another authorized member writes. If the file provider cannot offer safe single-writer behavior, mark concurrent editing unsupported.

## Separate genuine product decisions

- **Schema**: additive worksheet proposal and audit model, old-file migration/unknown-state rules.
- **One vs multiple active blackout intervals**: default to current single range for initial implementation, despite table extensibility.
- **Actor identity**: never call a local manually entered name authenticated.
- **Multi-user access**: same committed workbook version + serialized safe edits; test chosen file-sharing provider, no live sync claim.
- **Delivery sequencing**: move shared blackout earlier than roadmap Stage D only by a separate Product Owner priority decision.
- **Automatic Watch**: exact source/check catalog, accepted-commitment severity and clearance semantics must freeze before implementation.

**Status:** HANDOFF PREPARED; no work assignment, PR modification, merge/release, QA result or downloadable UAT kit is claimed.
