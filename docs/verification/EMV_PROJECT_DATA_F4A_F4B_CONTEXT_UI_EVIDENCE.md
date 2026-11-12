# F4a–F4b: Excel-owned project context and managed UI identity — technical evidence

**Date:** 2026-11-12 JST  
**Scope:** Experimental stacked draft PRs, no main merge, release, real corporate XLSX modification or owner UAT kit.  
**Owner decisions:** [Shared Excel versus local preferences](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md) and [SCH-01/CAL-02/SEQ-01](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md).  
**Detailed field contract:** Proposed v0.1.2 only; complete field/audit/actor policy **not frozen**.

## F4a — committed context reader and blackout-adjusted Days Remaining

**Draft [PR #44](https://github.com/Kenny619/spl-wbs/pull/44)** exact `93c4589d87447129c1cf9bded51648824635f97d`. [GitHub Actions run #43199372423](https://github.com/Kenny619/spl-wbs/actions/runs/43199372423) **SUCCESS**, **237/237 unit tests in 34 files** including 10 new F4a, **66/66 Windows Chromium**, read-only/managed builds PASS.

- New `src/managed/projectContext.ts` reads the **actual loaded Excel bytes**, using the F2 domain validator first. Returns `legacy`, `valid`, `incompatible`, or `unsupported_future`. Only `valid` yields authoritative `ProjectMeta.ProjectName` and a saved enabled `ProjectCalendar` interval. Legacy remains **unconfigured**, invalid/future never masquerade as saved “no blackout”.
- `src/calendar/workdays.ts` adds an **optional committed blackout argument**. Old four-argument v18 callers are unchanged; F4a `remainingProjectDays` uses it after verified workbook read. Today-exclusive→Finish-inclusive; each working date excluded once for weekend/Japanese holiday/committed blackout; incomplete holiday year remains Unknown and inactive task handling unchanged.
- Test data covers actual XLSX, legacy/empty/partial/future distinction, Unicode-safe project names, no filename-derived fallback, blackout across weekends and JP holiday overlaps and unchanged source/audit bytes.

**Limit:** F4a is pure data and math, **not connected to an actual Schedule/Task Detail or Settings Save flow**. No user-facing change in the F4a branch.

## F4b — managed-only project identity and read-only Calendar summary

**Draft [PR #45](https://github.com/Kenny619/spl-wbs/pull/45)** stacked directly on F4a. **Exact result must be confirmed from its latest head CI before declaring PASS.**

- `src/managed/main.ts` stores the authoritative project context from the successful verified workbook load/read-only preview and verified Save/Save As reload; failed workbook switches retain last-good context and Disconnect clears it. Invalid/partial project extension blocks editor Save while keeping viewable task data when safe. No localStorage ProjectName.
- `src/ui/mount.ts` consults the shared-name override **only in `spt-managed` mode**; frozen v18 read-only viewer keeps the filename-derived title. The managed heading and browser `document.title` show actual `ProjectMeta.ProjectName`, or explicit **“Project name not configured”** for legacy files; a future/invalid extension says project-data unavailable.
- `src/managed/settingsUi.ts` adds a **read-only Project Calendar** section displaying saved workbook blackout (including the valid configured-empty case) separate from personal timezone/appearance/columns. **It is not Save/Cancel and never writes the workbook**.
- `test/browser/managed.spec.ts` updates historic filename-title expectations for legacy Managed mode and adds a synthetic real five-sheet workbook with ProjectName different from its filename to check heading, browser title, Calendar summary and reload.
- The already frozen Report 1.1 **local report project-name input/output has not been modified**; it still requires a narrow Issue #7 contract amendment before migrating report headers.

## Current gaps and next material implementation gates

1. **Full field-level schema/actor/audit semantics approval**, separate from approved five-sheet structure. Audit identity is `UnverifiedLocal`, not corporate authentication.
2. **F4c: Project Calendar edit/save UI in Settings** with explicit validated draft/Save/Discard, existing guarded F3c direct Save and exact committed refresh; preserve unsaved Task edit guard, no fake localStorage persistence and no visible “saved” before verified source + backup.
3. **F4d: feed committed workbook blackout into managed Schedule + Task Detail** for real Days Remaining and PGCM (PGCM semantics separately governed); old v18 read-only session behavior must remain frozen. Current F4a new arithmetic is **not yet called by Schedule/Task Detail**.
4. **ProjectName on Calendar and Meeting/Reports workspaces**, preserve approved DES-012 Review 08 UI. Report 1.1 name-source change requires separate #7 approval.
5. **Shared-file collaboration validation** on the canonical corporate workbook, source refresh and multiwriter conflict/Excel lock model; local fingerprint is not distributed CAS. Corporate Edge/Node 26/npm11 physical UAT remains pending.
6. **Under Watch + integrated Meeting Review** still require frozen automatic rule catalog, reason lifecycle, accepted commitment and data completeness policy.
7. All PRs remain draft in stacked branches. No new UAT kit, README download link, merge, beta milestone or release has been authorized here.

**Evidence status:** Synthetic technical and browser CI only. No production Save flow for Calendar is reachable from user interface yet.
