# F5d — Workbook-backed Manual Watch controls in managed Task Detail

**Prepared:** 13 November 2026 JST.  
**Classification:** DRAFT technical/UI experiment on [PR #51](https://github.com/Kenny619/spl-wbs/pull/51), stacked on F5c [PR #50](https://github.com/Kenny619/spl-wbs/pull/50). **Not a production migration, approved detailed schema, owner visual acceptance, independent organizational QA or release.**  
**First exact-head under test:** `20fe1eab51ffe4376cf10ce1117669da55c72f2a` · [GitHub Actions #43318362460](https://github.com/Kenny619/spl-wbs/actions/runs/43318362460). **Final Windows result pending at this document's initial publication.**

## Functional boundaries

- The managed Schedule/Task Detail inspector uses the existing fixed-height, independently scrolling panel, not a new simplified Gantt or a modal stack. A compact section below existing task actions shows **recorded open Manual/Automatic reasons individually**, with native collapsed resolved history, reason title/details/evidence reference, opening/resolution time and explicit **unverified** actor labels.
- A recorded Open reason displays **Under Watch · N open**, regardless of ordinary TaskStatus or PlannedEnd. With zero open recorded reasons, display **Unknown**, explicitly **not Green/Clear**, because automatic check completeness and accepted commitment policy are not approved.
- A matching workbook `ProjectAudit` entity pointer is labeled **a recorded reference, not independently authenticated proof**. A missing audit pointer does not fabricate evidence.
- The only editable actions are inline **Add manual reason** and **Resolve this reason**, wired to F5c typed project actions. Recorded Automatic reasons remain **read-only**; no manual clearance and no new automatic trigger or policy.
- Inputs are temporary UI drafts, **never saved to browser localStorage**. Reason ID is stable for a draft. Task selection, workbook navigation or browser unload require explicit unsaved-draft handling. Cancel does not write the source or ProjectAudit.
- Committing calls the **same original `saveManagedProjectDirect` verified source/backup/recovery protocol** as Project Calendar: explicit development-preview confirmation, loaded hash/stale-source rejection, audit, saved-source SHA readback, reimport, Watch reprojection and only then updated visible disposition. No second file writer.
- Dirty task edits block Watch Save; blocked/error states retain the Watch draft. Source inconsistency or uncertain postcommit reload can activate the existing recovery hold. This is not distributed atomic compare-and-swap across independent synced corporate copies.
- `ProjectMeta.ProjectName`, `ProjectCalendar`, unrelated project sheets, user preference settings and frozen task `UpdateHistory` stay separately governed. The read-only v18 viewer does not import Watch UI or change its session calendar behavior.

## File-level change list

- `src/managed/watchUi.ts`: dedicated text-safe DOM reason cards, collapsible resolved history, inline forms, explicit Unknown/Under Watch and unverified source notes.
- `src/managed/main.ts`: refresh F5a Watch projection from the **verified same workbook bytes** for preview/load, task/project Save and Save As; mount the managed reason section; reuse one shared project mutation Save coordinator for Calendar/Watch, preserve dirty-task guard and workbook recovery.
- `src/managed/managed.css`: balanced compact inspector styling with dark-mode/border contrast, focus indicators and no change to approved Gantt layout dimensions.
- `test/browser/managed.spec.ts`: **three additional synthetic Windows browser tests** using real five-sheet XLSX and disposable file-handle mocks: Add→verified Save→audited readback→Resolve→Unknown/history, Cancel and externally modified source failure/draft retention, and recorded Automatic reason remaining read-only.

## Test and acceptance constraints

**At initial checkpoint:** application Build + unit PASS with existing **261 unit tests**, while Windows Chromium run and exact new browser count awaited. Do not conflate a green unit job with a complete CI pass.

| Gate | Requirement | Status |
|---|---|---|
| F5D-UI-01 | Real browser manual Add, structural project audit, correct stable TaskID, frozen TaskHistory unaffected | PENDING final browser result |
| F5D-UI-02 | Single manual reason Resolve retains opening fields, full project audit, resolved history; zero Open → Unknown not Green | PENDING final browser result |
| F5D-UI-03 | Cancel no disk write; stale external source refuses write and preserves user draft | PENDING final browser result |
| F5D-UI-04 | Recorded Automatic reason visible read-only; no unsupported manual clearance | PENDING final browser result |
| F5D-UI-05 | Original 74 browser regressions for v18/managed/Calendar/Reports, including 2000-row virtualization | PENDING final browser result |
| F5D-UX-01 | DES-012 Review08 full visual parity, accessible focus/scroll/dark mode and nonintrusive inspector | Engineering CSS only; owner UAT remains OPEN |
| F5D-CORP-01 | Actual corporate Edge/Node26, Excel locked/shared canonical file and two-editor reload/concurrency safety | NOT TESTED |

## Next genuinely gated work

1. **Freeze exact field/audit/actor policy** proposed in [consolidated review](../specifications/EMV_PROJECT_DATA_FIELD_FREEZE_REVIEW_2026-11-13.md) before production workbook migration. The five-sheet structural approval must not be mistaken for approval of every field, automatic signal, or authenticated actor.
2. Independent adversarial QA should inspect Save/recovery, stale source, task editor and Calendar draft collision, unknown future schema, project audit ID consistency and workbook fidelity.
3. Owner-approved DES-012 Review08 visual parity must be confirmed against real Schedule/Task Detail after all logic is integrated. Do not substitute a plain status-only Meeting Review.
4. Only a genuinely Watch-integrated Meeting Review (MR-D01 B) and distinct accepted revised commitment workflow can progress to release after their rules are approved. Existing frozen Report 1.1 output naming remains unchanged until a narrow Issue #7 amendment.
5. Keep all stacked project-data PRs **draft and unmerged**. No production XLSX, real corporate shared file, UAT ZIP or README download link should be published as an implied acceptance.

**Initial disposition:** implementation submitted and unit/build gate green; browser and independent QA/UAT gates open.
