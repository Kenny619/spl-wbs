# F5d — Workbook-backed Manual Watch controls in managed Task Detail

**Prepared:** 13 November 2026 JST.  
**Classification:** DRAFT technical/UI experiment on [PR #51](https://github.com/Kenny619/spl-wbs/pull/51), stacked on F5c [PR #50](https://github.com/Kenny619/spl-wbs/pull/50). **Not a production migration, approved detailed schema, owner visual acceptance, independent organizational QA or release.**  
**Final exact-head verified:** `b995a116643be70646197e1fd7d4c532a9b55f46` · [GitHub Actions #43319342268](https://github.com/Kenny619/spl-wbs/actions/runs/43319342268) **completed SUCCESS**: 261/261 Ubuntu unit tests (36 files), managed/read-only builds PASS and **77/77 Windows Chromium PASS** (2.2m), including 3 new F5d browser cases.

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

**Final exact-head CI:** [Build + unit job #131535645959](https://github.com/Kenny619/spl-wbs/actions/runs/43319342268/job/131535645959) **261/261 unit PASS**, strict TS and read-only/managed builds PASS. [Windows Chromium #131535646265](https://github.com/Kenny619/spl-wbs/actions/runs/43319342268/job/131535646265) **77/77 PASS** including the 3 new UI scenarios. This is synthetic technical/browser evidence only.

| Gate | Requirement | Status |
|---|---|---|
| F5D-UI-01 | Real browser manual Add, structural project audit, correct stable TaskID, frozen TaskHistory unaffected | **PASS — 77-browser run** |
| F5D-UI-02 | Single manual reason Resolve retains opening fields, full project audit, resolved history; zero Open → Unknown not Green | **PASS — 77-browser run** |
| F5D-UI-03 | Cancel no disk write; stale external source refuses write and preserves user draft | **PASS — 77-browser run** |
| F5D-UI-04 | Recorded Automatic reason visible read-only; no unsupported manual clearance | **PASS — 77-browser run** |
| F5D-UI-05 | Original 74 browser regressions for v18/managed/Calendar/Reports, including 2000-row virtualization | **PASS — 74 baseline + 3 new = 77/77** |
| F5D-UX-01 | DES-012 Review08 full visual parity, accessible focus/scroll/dark mode and nonintrusive inspector | Engineering CSS only; owner UAT remains OPEN |
| F5D-CORP-01 | Actual corporate Edge/Node26, Excel locked/shared canonical file and two-editor reload/concurrency safety | NOT TESTED |

## Next genuinely gated work

1. **Freeze exact field/audit/actor policy** proposed in [consolidated review](../specifications/EMV_PROJECT_DATA_FIELD_FREEZE_REVIEW_2026-11-13.md) before production workbook migration. The five-sheet structural approval must not be mistaken for approval of every field, automatic signal, or authenticated actor.
2. Independent adversarial QA should inspect Save/recovery, stale source, task editor and Calendar draft collision, unknown future schema, project audit ID consistency and workbook fidelity.
3. Owner-approved DES-012 Review08 visual parity must be confirmed against real Schedule/Task Detail after all logic is integrated. Do not substitute a plain status-only Meeting Review.
4. Only a genuinely Watch-integrated Meeting Review (MR-D01 B) and distinct accepted revised commitment workflow can progress to release after their rules are approved. Existing frozen Report 1.1 output naming remains unchanged until a narrow Issue #7 amendment.
5. Keep all stacked project-data PRs **draft and unmerged**. No production XLSX, real corporate shared file, UAT ZIP or README download link should be published as an implied acceptance.

**Final bounded disposition:** **F5d synthetic functional/browser CI PASS** at exact SHA `b995a116643be70646197e1fd7d4c532a9b55f46` (261 unit and 77 Windows Chromium). No independent organizational QA, corporate Edge/Node26 Excel provider concurrency/UAT, final field-level contract/actor authority freeze, fully reviewed DES-012 Review08 visual parity or acceptance/release authorization. All stacked project PRs remain DRAFT/unmerged; no production workbook, README/UAT ZIP, beta or release change.

## Red-to-green browser provenance — selected task restore

The initial F5d head `20fe1eab51ffe4376cf10ce1117669da55c72f2a` passed **261/261 unit tests** but [Windows run #43318362460](https://github.com/Kenny619/spl-wbs/actions/runs/43318362460) completed **FAIL** with **76 browser PASS / 1 new F5d FAIL**. Add/Resolve verification could not locate `.managed-watch` **after a successful source Save**. The saved task selection was not restored because the Watch draft navigation guard intercepted the Save coordinator's internal `controller.patchView`, while the task was still flagged as an unsaved Watch draft. The failure was therefore an actual UI workflow integration defect, not a risk-rule or Excel audit failure.

First corrective attempt `ff7b7ab96d06de687e4b29d265377dce172a3b1a` allowed restore while globally busy, but was superseded before CI completion to avoid allowing unrelated user selection during a write. Final fix at **`b995a116643be70646197e1fd7d4c532a9b55f46`** uses an explicit **`restoringVerifiedSelection` scope flag** only around the verified post-commit task selection restore; all ordinary user navigation continues to pass through the unsaved draft/busy guards. [Fresh exact-head run #43319342268](https://github.com/Kenny619/spl-wbs/actions/runs/43319342268) completed **SUCCESS**, 261 unit + **77/77 Windows Chromium**, including the previously failing Add→Save→Resolve case (2.7s). Preserve the historical red run; do not backfill PASS onto it.

**Actor/evidence caution:** the UI makes recorded project audit references visible but explicitly labels actor identity as **unverified**. The audit is not cryptographically immutable and no complete automatic rule or trusted Green evaluator exists. Corporate Excel shared-file safety is not proven by Windows Chromium synthetic folder handles.
