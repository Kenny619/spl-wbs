# DES-010 → Excel Managed Variant: Code-Level UI Integration Map

**Prepared:** 2026-11-08 JST  
**Design prototype:** [DES-010](../../design/concepts/DES-010-gantt-local-scope.html), **responsive remediation source blob `77dc7333ee4e061dc06e54d74caa30b07bdbe79e`**  
**Design control:** [Issue #25](https://github.com/Kenny619/spl-wbs/issues/25) / [draft PR #29](https://github.com/Kenny619/spl-wbs/pull/29)  
**Separate active managed implementation:** [draft PR #19](https://github.com/Kenny619/spl-wbs/pull/19) on `feature/excel-managed-v1`, already authorized for a restricted development preview, **not merged, UAT-accepted or release-approved**.

## Integration architecture: presentation adapter, not a new workbook engine

**Design artifact = layout/interaction source of truth only**, until an owner exact-artifact design freeze. **Managed implementation = transactional behavior source**, with current v18-compatible production baseline. The synthetic prototype does not provide production imports, backup validation, persistence, approved report data, local preferences or genuine update history. Do not copy its fake `tasks`, `events`, `demoSave`, `historyFixture` or `workdayCount` business logic into the product.

### Reuse map with verified source modules
| Existing module | Concrete code connection | DES-010 UI destination | Integration constraints and tests |
| --- | --- | --- | --- |
| `src/managed/main.ts` → `ManagedEditor` | Constructor uses `.topbar`, `.top-actions`, `#panel`, `#detailContent`, builds chooser/backup-recovery controls, wraps `ImportController.patchView`. | Shared header, Schedule/Meeting inspector, project/workbook access | Keep named folder and workbook picker, Save-State inspection, safe Save As, working file permissions and active workbook identity visible/discoverable. Never drop controls simply because DES-010 looks cleaner. |
| `ManagedEditor.isDirty()`, `guard(action)`, `resolvePending()` | One draft, three-way **Save/Discard/Cancel**. Save proceeds only after verified success. `patchView` selection changes already guarded. | All navigation: Schedule / Meeting / Report, task selection, scope, Settings, History, workstream/owner filter and project switch | New UI actions must call the same managed guard; don't implement a second synthetic draft guard with different semantics. Error/conflict/recovery hold must block proceeding, not silently dismiss. |
| `src/managed/draft.ts` | `initialTaskDraft`, `collectTaskChanges`, `hasTaskChanges`. | Compact inline Edit in selected-task inspector | Maintain frozen #4 editable allowlist and structural validation. Do not edit summaries' derived fields or treat an `Updates` journal entry as UpdateHistory. |
| `src/managed/historyUi.ts` → `openManagedHistory(doc, workbook, {taskId,timeZone})` | Reads verified persisted history via `src/managed/history.ts`, safe `textContent`/DOM creation, task/field/**date period** filters and long-text full comparison. | Settings → Change History right drawer and selected-task → History tab with task prefilter | Refactor **presentation only** into one action-per-field row. Preserve **ChangeSetID logical Save grouping**, historical TaskID/WBSCode/TaskTitle snapshots, timezone range boundaries, invalid-source errors, untrusted text escaping and read-only behavior. Not just DES-010's two test filters. |
| `src/managed/settingsUi.ts` → `ManagedSettings` | Constructor accepts guarded `navigate`; `getTimeZone()`, `getPreferences()`, appearance event handling. Uses `src/managed/settings.ts` for validated IANA zones and browser-local persistence. | Fixed top-right Settings action → right drawer with Preferences and History sections | Reuse existing v18 Columns checkbox nodes + event handlers, Light/Dark/System and Reset. Avoid fake page-session-only settings or only three sample timezones. Keep Calendar project blackout separate (#20). |
| `src/managed/reportsUi.ts` → `ManagedReports` | Committed workbook context getter: `fileName,tasks,workbook,timeZone,hasUnsavedDraft`; `generate()` uses real `reports.ts`; copy uses exact `reportText`. | Reports full-height content + fixed toolbar; Latest Status and historical Update Report | Keep **plain text** as v1 output. Fixed snapshot, clipboard/preview exact parity, unsaved-draft banner and safe errors. No invented lifecycle stories or merge of uncommitted data. |
| `ManagedReports.open()` | `todayInTimeZone(new Date(), context.timeZone)`; when From blank, `addCalendarDays(today,-7)`; Through defaults to today. | Default prior-same-weekday → review date, **eight inclusive calendar dates** | **Already matches the owner's requested eight-date default** in current PR #19. Preserve this exact behavior and user's explicitly customized date range when adapting UI. #7 allows inclusive arbitrary ranges; no separate formula engine or schema amendment needed for this default itself. |
| `src/managed/reports.ts` | `generateLatestStatusReport`, `generateUpdateReport`, reused summary rollups and `UpdateHistory` persisted source. | Reports text preview and Copy, optional concept-only Present treatment | Frozen #7 requires distinct Save counts and underlying associations in historical v1 Update Report. Preserve; do not remove Save stats in actual v1 or invent Created/Watch lifecycle events without separately approved schema. |
| `src/managed/recoveryUi.ts` | `openManagedRecovery`, read-only transaction inspection with recovery hold. | Named contextual action in Settings or Project area if visually validated | Keep exceptional recovery diagnostics discoverable before any risky Save, preserve exact fail-closed and non-mutating safeguards. |
| `src/managed/managed.css` | Current managed-only override styles for v18 shell, forms, History/Settings dialogs and themes. | DES-010 shared UI tokens / side drawer / report workspace | Refactor CSS incrementally, avoid blanket replacement that breaks real full-theme and v18 tests. |
| `src/main`, existing `ImportController` and `src/data/types` | Existing authoritative hierarchy, task model, imported WBS identifiers, dates and workstream data. | Schedule/Meeting task rows, drill-through and descendants | Render from live immutable IDs, not synthetic names; for any missing `PredecessorIDs` resolve an explicit UI warning, not fabricated external URLs. |

### Scope separation — owner decisions that cannot be inferred from prototype preference

**Existing contract / active development:** Workbook #3, editing #4, history #5, settings #6 and reports #7 can be re-skinned subject to a separately approved UI implementation authorization. Real workbook safety remains with PR #19.

**New or modified product behavior requiring a separate bounded feature freeze:** Permanent Meeting Review as distinct view; exact Exceptions meaning and nonwatch overdue treatment; dependent-task navigation and filters; hardcoded presentation dates vs project calendar; persistent hybrid Under Watch; project-owned blackout storage (#20); weekly stakeholder lifecycle summary of new/completed tasks/risks/released watches; removal of Save-event counts from historical Update Report (direct frozen #7 conflict). Do not silently ship these in the existing contracted v1 work.

**Fine design preference already aligned with current code:** Prior-same-weekday eight-date default in Update Report is implemented as `addCalendarDays(today,-7)`. Reuse rather than opening an unnecessary separate implementation item.

**Important version distinction:** Managed `src/managed/main.ts` currently uses internal `APP_VERSION="0.1.0-dev"`, while `package.json` says `0.0.0` placeholder. The final Settings About must use an explicitly defined, trustworthy build version rather than silently claim either value is an external release.

## Suggested minimal, reversible implementation slices (only after separate UI implementation authorization)

### UI-INT-01 — Shell and Schedule presentation adapter
- Common header with app icon, navigation in stable positions, same inspector width/height and pane-local scroll across Schedule/Meeting.
- Gantt-local Exceptions/Workstreams control backed by an **approved existing** exception source; do not introduce fake watch flags.
- Preserve directory/workbook picker, reload and recovery actions. Do not move any file safety code.
- QA: v18 read-only snapshot unchanged; real managed file chooser still works; OS file permission remains controlled; unit + Windows browser gate green.

### UI-INT-02 — Settings/History presentation adapter
- Right drawer, Settings primary entry and History tab, direct task History.
- Keep actual timezone, local preference persistence, Light/Dark/System, column visibility and reset; History task/period/field filters and long-text comparison.
- QA: timestamp vs date-only, DST, no workbook mutation, contrast, keyboard focus/escape, ChangeSetID groups, historical identity and raw value escaping.

### UI-INT-03 — Reporting presentation adapter
- Full-height fixed report navigation and internal preview scroll, existing `generateLatestStatusReport` / `generateUpdateReport` / exact Copy.
- Preserve one committed-source snapshot and warnings. Keep plain-text v1 report and required Save stats.
- QA: exact preview/copy, empty/invalid periods, 8-date default, DST, no workbook writes, grouping and shared Save IDs.

### UI-INT-04 — Meeting-specific design contract (separate scope authorization)
- Owner-reviewed Meeting task filters, selected task context and dependency drill-through.
- Specify Exceptions/watch model and which calendar drives "<5 days" before coding. No new workbook fields or persistent blackout model until approved.
- QA: many-workstream performance, stable task identity, return navigation and selection, pane scrolling, keyboard and dirty guard.

## Quality gate requirements
- Design [Playwright Chromium suite](../../test/browser/des010-design-review.spec.ts) runs on PR #29 and captures actual screenshots of 1024/1366/1440 workspace and 860/1024/1440 Settings access.
- Every new managed UI implementation slice requires: current PR19 exact SHA; independent QA; frozen #3–#7 invariant checks; separate managed vs read-only viewer builds; browser and file-based UAT.
- The genuine **physical Edge/Excel-lock/crash/restart/OOXML fidelity** gates #2/#11, #8 release gate and #14 dependencies remain separate from design CI. Never claim design screenshots prove workbook safety.
- Merge, release and deployment require explicit owner authorization. Keep the design-only PR #29 draft; don't merge it into main as production code.

## Decision boundary
The owner is enthusiastic about DES-010 visual direction. Use that to eliminate repeated cosmetic approval loops. When **real Chromium evidence is fully collected and D3 discrepancies fixed**, present one owner decision on the **exact visual design freeze** and a **separate bounded UI implementation approval**, with the new Meeting/risk/calendar/report scope clearly excluded unless explicitly authorized.
