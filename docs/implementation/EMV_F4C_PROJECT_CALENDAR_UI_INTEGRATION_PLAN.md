# F4c — Workbook-owned Project Calendar Save/Cancel + Schedule application handoff

**Status:** Implementation design only; **not a field-contract freeze, Save/Cancel implementation, UAT pass or merge authority**.  
**Owner directions:** [shared Excel vs personal preferences](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md) and [five sheets / one active blackout / integrated delivery](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md).  
**Existing technical branches:** F3c [PR #42](https://github.com/Kenny619/spl-wbs/pull/42), F3d [#43](https://github.com/Kenny619/spl-wbs/pull/43), F4a [#44](https://github.com/Kenny619/spl-wbs/pull/44), F4b [#45](https://github.com/Kenny619/spl-wbs/pull/45).  
**Protected visual reference:** DES-012 Review 08 approved HTML exact blob `de6ebaa63aa035ba741b4435cf1cdb9d1166d958`; keep polished Report Review02 visual principles.  
**Delivery contract:** Proposed v0.1.2 field values remain to be frozen before real corporate workbook migration.

## User interaction target

1. **Settings → Project Calendar** is project-owned, not a browser preference. Display one active inclusive blackout range and a clear workbook state: `Not configured` on legacy, `No enabled blackout` on a valid configured workbook, `Start – End` when saved, `Project data unavailable` for incompatible/future. Display the authoritative Excel `ProjectName`.
2. **Edit** opens an in-place draft with Enabled, Start date, End date, optional Label; **Save**, **Cancel/Discard**. Exactly one active interval initially; switching to a new interval must explicitly disable the old one (with audit). No silent side effects while typing, and no persistent browser-local draft masquerading as shared.
3. **Legacy first Save** requires an explicitly entered project name (no filename substitution), confirms initial five-sheet initialization in one verified transaction and indicates it is a project-data schema extension. Do not automatically create a sheet on read.
4. **Save request** must pass the same existing unsaved Task edit guard; if dirty, require explicit resolve before a project Save. Disable duplicate submissions. Verify selected writable directory and last-loaded SHA. A cancelled permission/confirmation leaves source, backup, audit, and shared UI unchanged.
5. **Commit** uses existing F3c `saveManagedProjectDirect`, no second writer: OOXML preflight → domain/TaskHistory validate → typed candidate/ProjectAudit → re-open → source hash/stage/pending → guarded source + predecessor backup readback → confirmed Save. Only on success refresh the exact committed workbook and update its hash/context/view.
6. **On failure** retain input draft with error message, never display a committed state. On stale source, block and request Reload; on ambiguous partial write, preserve recovery sidecars and block retry until explicit inspection. No guessed auto-merge of two editors.
7. **View semantics after verified Save:** update Schedule/Gantt and Task Detail Days Remaining **using committed ProjectCalendar** through the F4a calendar-aware predicate; exclude weekend OR JP holiday OR blackout once per date (Today-exclusive→Finish-inclusive), preserve incomplete holiday coverage as Unknown. Reuse one context for all screens, not a second local calendar.
8. **PGCM behavior:** tie project planning blackout to only approved PGCM scheduling rules. Existing read-only v18 session-only Calendar remains untouched; do not let the interim managed session control override Excel-owned project Calendar or silently change the approved meeting shift policy.
9. **Personal preferences** (timezone, columns, theme, PGCM display option, recently opened Excel files) stay only in browser/device. Reset preferences must never erase saved project Calendar.
10. **Project identity**: use committed `ProjectMeta.ProjectName` in Schedule/Meeting/Reports app context, Calendar heading, browser document title; for generated Report 1.1 headers, reconcile frozen Issue #7 report-local source with a narrow Product Owner-approved amendment rather than implicit change.
11. **No downgrade in UX:** preserve DES-012 Review08 Schedule full Gantt toolset and Report Review02 aesthetic; separate fixed-height/scrollable inspector principles and approved dialogs. No parallel simplified calendar sheet UI or duplicate controls.

## Acceptance evidence needed before owner UAT

| ID | Required proof |
|---|---|
| **F4C-01** | Legacy old XLSX loads read-only Calendar `Not configured`; task editing unchanged; first project save explicit with valid name and all five sheets |
| **F4C-02** | Valid configured empty, valid one enabled blackout, disabled historical row, and unsupported/partial extension each render truthful distinct states |
| **F4C-03** | Save/Cancel/Discard/duplicate submission and unsaved Task guard; no mutation until verified Save |
| **F4C-04** | Real project name persists across Reload/Save As and two users opening same committed file; no filename/local override |
| **F4C-05** | After verified Calendar Save, Gantt + Task Detail Days Remaining changes immediately without double count; holiday/weekend/blackout overlap and Unknown tested |
| **F4C-06** | Save rejects stale source, real Excel-open locks/provider permission, malformed source, unknown sidecars; no data loss or fake success |
| **F4C-07** | Interrupted source/backup/owner writes leave safe recovery; return to READY only after explicit reconciliation |
| **F4C-08** | Task UpdateHistory untouched except legitimate task edit; ProjectAudit old/new exact, unique ChangeSetID, actor provenance displayed as unverified |
| **F4C-09** | Browser-local appearance/columns/PGCM display persist independently of Project Calendar workbook Save/Reset |
| **F4C-10** | Read-only v18 and existing Report 1.1 contracts unchanged; DES-012 Review08 visual parity reviewed |
| **F4C-11** | Windows 11 Edge and corporate Node26/npm11 work PC smoke with actual folder picker plus fallback; physical Excel/SharePoint/OneDrive permission/lock behavior documented |
| **F4C-12** | Independent QA exact-head checks + targeted owner UAT, latest one README download link only, no merge/release until authorized |

## Non-negotiable architecture boundaries

- The canonical **Excel workbook is shared source data when the same saved file is opened**; this design does **not** provide real-time push or safe simultaneous writes across separate sync copies. Source SHA is not distributed atomic CAS. Present an explicit last-loaded/reload status and reject stale writes.
- `ProjectAudit` is workbook audit history, not cryptographically tamper-proof and not proof of trusted user identity; `UnverifiedLocal` remains until a distinct identity policy is approved.
- Watch rules, accepted commitment policy, Meeting Review integration and Report 1.1 output naming still have separate controlled specifications.
- All source changes belong in isolated draft PRs with exact-head CI, independent QA, and Product Owner decision only for genuinely unresolved business rules. Do not overwrite production or publish UAT materials based on synthetic CI alone.

**Recommended next bounded implementation:** F4c calendar UI on a draft branch stacked after validated F4b, with real managed-app E2E using synthetic directory files. Do not merge or release until field-contract freeze, QA and corporate-file UAT.
