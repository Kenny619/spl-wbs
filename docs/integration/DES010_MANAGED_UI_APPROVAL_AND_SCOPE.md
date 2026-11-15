# DES-010 Managed UI Adaptation — Approved D3 Integration Gate

**Owner decision:** DEC-D3-A + DEC-D3-B, approved on 2026-11-08 JST; [canonical design approval](https://github.com/Kenny619/spl-wbs/blob/design/ui-overhaul-foundations-v0.1/docs/design/21_D3_PO_APPROVAL_A_B.md).  
**Exact frozen visual reference:** [DES-010 HTML](https://github.com/Kenny619/spl-wbs/blob/design/ui-overhaul-foundations-v0.1/design/concepts/DES-010-gantt-local-scope.html), Git blob `77dc7333ee4e061dc06e54d74caa30b07bdbe79e`; [Chromium CI 41/41 PASS](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745).  
**Source implementation base:** `feature/excel-managed-v1` / PR #19, starting commit **`0c776735289585b95980620f9a6abc3030e4c9aa`**.  
**Branch:** `feature/excel-managed-des010-ui`, **draft-only stacked PR** targeting `feature/excel-managed-v1`. Never merge automatically.

## Authority and deliverables

- **UI-INT-01:** managed-only shell/Schedule presentation; fixed app header, genuine app icon, Gantt-local applicable task scope, adequate viewport usage, full-height selected inspector and independent content scroll. Preserve real folder/project selection, reload, Save/Save As/recovery inspection, actual task data and draft guards.
- **UI-INT-02:** Settings and read-only Change History presented as a coherent right drawer, History accessible as a Settings drawer tab and direct task History. Keep true UpdateHistory ChangeSetID grouping, period/task/field filters, historical snapshots, long-text safe comparison, locally persisted timezone/theme/columns, reset, accessible focus and keyboard.
- **UI-INT-03:** Reports presentation with internal scrolling and persistent controls; all real committed-only report engines, exact plain-text snapshot and clipboard parity, workstream grouping, shared Saves and eight-inclusive-date default.

## Explicitly out of scope

New permanent Meeting Review workflow, Under Watch/risk persistence, revised commitments, project calendar/blackout persistence, task dependency schema editing, new event-sourced stakeholder report and removal of Save counts from the existing frozen Update Report. These are future separately frozen scope. The v18 read-only SharePoint viewer and all #2/#3–#8/#11/#14 stage gates remain untouched.

## Engineering constraints

1. **Preserve the managed transaction engine.** Existing `src/managed/main.ts`, `historyUi.ts`, `settingsUi.ts`, `reportsUi.ts` and `reports.ts` contain actual data operations. Integrate their presentation only. Do not import `DES-010` synthetic `tasks`, `historyFixture` or `demoSave`.
2. Build incrementally with exact-head CI, explicit progress and failing-test diagnostics. Do not claim PASS until live GitHub Action completed.
3. All screenshot/visual browser evidence must refer to actual app rather than only design HTML. Use Windows Chromium automation; physical Edge owner UAT remains later gate.
4. Keep existing v18 read-only viewer pixel-parity and original non-managed build. No real corporate workbooks until Stage A accepted.
5. Independent AI QA must assess integration, accessibility and contract regression before the owner UAT and later owner merge decision. No human reviewers other than the Product Owner.
6. No merge, deployment, release or additional feature freeze.

## Worklog
- 2026-11-08: Owner approved both A+B. Created isolated feature branch from managed PR #19 exact head. This initial file establishes governance only; individual actual implementation commits and CI evidence must be recorded separately.
