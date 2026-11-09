# DES-010 UI-INT-01–03 — Implementation Checkpoint and Independent QA Checklist

**Date:** 2026-11-08 JST  
**Owner authority:** [DEC-D3-A/B approved](https://github.com/Kenny619/spl-wbs/blob/design/ui-overhaul-foundations-v0.1/docs/design/21_D3_PO_APPROVAL_A_B.md)  
**Draft implementation PR:** [#32](https://github.com/Kenny619/spl-wbs/pull/32) stacked against managed [PR #19](https://github.com/Kenny619/spl-wbs/pull/19)  
**Frozen design HTML blob:** `77dc7333ee4e061dc06e54d74caa30b07bdbe79e`  
**Checkpoint:** Implemented draft code and new browser assertions; **exact current implementation SHA CI completion and independent QA acceptance are not yet claimed**.

## Code delivered in this draft

| Slice | Production code | Bounded behavior |
|---|---|---|
| UI-INT-01 | `src/managed/shell.ts`, `main.ts`, `managed.css` | Header reuses existing favicon, live workbook title and safe controls; stable Schedule/Reports navigation; project actions grouped in a menu without duplicating handlers; exact original task grid/detail nodes moved into 61/39 full-height shared workspace with independent scroll; Fit remains Gantt-local. |
| Gantt-local scope | `src/managed/shell.ts` | Exceptions uses existing literal statuses `At Risk` and `Blocked`, only when Status column active, via original `ImportController.patchView`. Workstreams restores prior status selection. The **same managed draft Save/Discard/Cancel guard** protects switching. **No inferred overdue/Under Watch semantics** or schema additions. |
| UI-INT-02 | `settingsUi.ts`, `historyUi.ts`, `managed.css` | Both Settings and History are right-side dialog drawers; Settings has Preferences and Change History tabs, not duplicate History section; selected-task History opens prefiltered, with native workbook `UpdateHistory`. One chronological field-action log row, shared short Save/ChangeSetID reference, date/field/task filters, safe history text and long-value comparison retained. |
| Version | `version.ts`, `main.ts`, `settingsUi.ts` | Same real internal managed development version `0.1.0-dev` continues to populate `UpdateHistory.AppVersion` and now appears in Settings About, distinctly from approved read-only UI baseline v18. `package.json` placeholder `0.0.0` is not presented as a release. |
| UI-INT-03 | `reportsUi.ts`, `managed.css` | Existing committed-only Latest Status / Update report logic in modeless full-height Reports workspace; fixed configuration/action controls, independently scrollable plain-text preview, previous snapshot/copy preservation; eight inclusive dates already supplied by existing engine. |

**Unmodified transactional/contract code:** `src/managed/directSave.ts`, `workbookCandidate.ts`, `history.ts`, `settings.ts`, `reports.ts`. This draft does not alter source task/history schema, audit serialization, backup or Save As algorithm, calendar data, risk/watch business logic, or nonmanaged v18 production viewer.

## Existing tests adapted, new tests added
- Adapted current `test/browser/managed.spec.ts` to use the new Project control grouping and Settings → Change History tab; it still tests actual generated workbook History, historical identity, safe literal untrusted text, filtering, timezone, Save/Save As/conflict, Settings persist/theme/Reset and exact Report copy.
- Replaced old Save-card display assertions with **stronger one-row-per-saved-field log** and common Save-reference assertions (not removed coverage).
- Added three real managed browser tests: 1366×768 app icon/inspector/Gantt-local scope and screenshot; 1024×768 Settings/History drawer identity and persisted action screenshot; 1366×768 Reports fixed navigation/committed preview and screenshot.
- Full clean-install/typecheck/unit/Windows Chromium checks are still needed on **the final exact head**, including unmodified read-only v18 baseline tests. Do not claim browser PASS based solely on original DES-010 design CI.

## Known design/implementation boundaries and QA risks
1. **No permanent Meeting Review** is implemented; the actual header currently offers **Schedule and Reports**, not a fake/inert Meeting button. This is deliberately constrained by B approval excluding new business workflow.
2. **Exceptions meaning** is narrowed and openly disclosed to the existing status pair only. Fully fledged exception+overdue+watch behavior requires another approved spec; Status column must be enabled for this filter to work. Verify restoring earlier status filters and dirty draft state.
3. **Settings ↔ History** currently transitions between two dialog instances occupying the **same fixed right slot**, retaining genuine history behavior. QA should validate minimal transition flicker, focus restoration, filter state and keyboard Escape; an eventual shared-pane component may be warranted if transition UX is degraded.
4. **Project menu** contains existing folder/workbook/reload/change/forget/Save State controls. The original Gantt Fit command is moved to its chart toolbar. QA must confirm permissions and recovery actions remain discoverable at laptop and high zoom, including at effective width under 800px.
5. **Selected-task inspector** is moved into the main grid. The v18 task controller still manages `.open` and `aria-hidden`; keyboard focus semantics and an empty selection state require explicit accessibility review. No transactional algorithms were changed.
6. Reports now use a modeless, in-page native dialog with preserved actual generation/copy semantics. Verify report actions accessible to keyboard/screen readers, no underlying task edit lost, original committed-only warning, snapshot immutability and no workbook writes.
7. Native Windows/Edge `file://` permission, Excel file lock/restart, backup source fidelity and malformed workbook recovery remain **Stage A physical gates on PR #19**, not this visual integration's CI.
8. Theme Light/Dark/System still uses stored local preferences. New shell/drawer/report CSS must be checked for contrast and legible state colors in all modes.

## Required independent QA verdict on exact implementation SHA
- Typecheck, unit tests, managed standalone build, original viewer build and v18 screenshot parity.
- Windows Chromium browser: all existing managed Save/History/Settings/Reports scenarios and the three new responsive screenshots.
- User-facing scope/authorization audit to exclude new schema, Meeting/risk/watch/blackout persistence and lifecycle reports.
- Read-only workbook bytes unchanged from Settings/History/Reports operations; actual `UpdateHistory` used for History and Save counts preserved.
- If any test fails, record exact failure and remediation on PR #32; **do not mark the increment accepted** or request Owner UAT while CI is red.

## Authority
Draft PR #32 targets `feature/excel-managed-v1`, not main. No merge, release, deployment, real production corporate workbook use, or owner functional acceptance authorized yet. Only one human Product Owner is involved; QA/engineering can use AI agents, but do not present unverified checks or invented people as reviewers.
