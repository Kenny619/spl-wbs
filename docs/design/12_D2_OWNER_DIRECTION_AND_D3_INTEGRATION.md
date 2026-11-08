# D2 Convergence — Product Owner DES-006 Direction and D3 Integration Plan

**Date:** 2026-11-08 JST  
**Controlling issue:** [#25 — UI overhaul](https://github.com/Kenny619/spl-wbs/issues/25)  
**Draft design PR:** [#29](https://github.com/Kenny619/spl-wbs/pull/29)  
**Decision:** `D2-DIR-001` · **OWNER-ENDORSED DESIGN DIRECTION** (not visual-system freeze, implementation approval or final UI UAT)  
**Exact reviewed conceptual artifact:** [DES-006-consistent-detail-width.html](../../design/concepts/DES-006-consistent-detail-width.html), Git blob SHA `b833afeefe5fa3392b17efea79589bd7eede390f` and design PR head at feedback `09550a7e7083581e9cea24c947713755256c2b91`.

## Product Owner disposition
The sole human Product Owner's explicit feedback to DES-006 was **“Perfect. I like it. let's continue.”** This provides direction to **stop divergent layout comparisons** and use DES-006 as the **D2 information architecture / workspace interaction reference** for further integration work. It does **not** approve an unreviewed visual design system, add features to a frozen managed-variant specification, authorize coding or merging, or replace current accepted v18.

### Converged working concept
- **Schedule**: detailed WBS/Gantt with synchronized row/timeline context; full-height content pane and selected-task inspector.
- **Meeting Review**: information-rich workstream-aware task list, filters for Exceptions / All Workstreams / Due Today / Due in fewer than five working-calendar days, Owner and Workstream; same inspector width/height; internal scrolling with navigation fixed.
- **Selected task**: WBS, Workstream, owner, status, scheduled finish and calendar-aware days remaining; clickable predecessors and downstream dependent tasks; inspect then Edit *in place*.
- **Reports**: one existing reporting concept with Latest Status / Update Report, fixed report controls and independent report content scrolling; an optional proposed **Present** reading treatment is **not** an approved change to the frozen plain-text report contract.
- **Global layout**: same top nav button location across views, one compact desktop header, no decorative concept explainer cards, fill usable viewport height, and a responsive stacked fallback when effective width is constrained.
- **Status and risk exploration**: separate actual TaskStatus from derived delivery health, independent active schedule/context risk reasons and persistent Under Watch; proportional revised commitment acceptance and historical impact. All remain **concept-only** without approved new workbook fields or live risk algorithm.
- **Working calendar exploration**: the mock's “days” count means future **working calendar dates**, excluding weekdays off, Japan holidays and synthetic project blackout days; actual project-owned calendar is pending scope in #20. Do not confuse the count with remaining effort.

### Rejected or superseded design ideas
1. Three separate concepts as mandatory permanent app modes; instead keep a Schedule workspace, focused Meeting workflow and Reports-driven presentation treatment.
2. Large independent Active Discussion and Task Detail boxes in Meeting; use **one compact inspector**, expanding only while editing.
3. Third Integrity navigation stage with little differentiation from routine workstream quality checks.
4. Unexplained or fake progress fill where genuine percentage complete is unavailable; emphasize finish dates and remaining working-calendar days.
5. Static exception/workstream count tiles masquerading as navigation; use actionable task filters.
6. Page scrolling that removes selected detail, Reports controls or header from sight; contain scroll inside useful panels.
7. Divergent width of selected task inspector when switching Schedule and Meeting.

## Design scope versus frozen managed requirements
This is an **interaction-direction decision**, not permission to replace the frozen contract. Historical `UpdateHistory` and existing `Updates` task notes remain different data products; all managed writes are governed by Issue #4. Proposed weekly event-story reports must not silently replace the already frozen Issue #7 UpdateHistory-only report.

### D3 integration coverage matrix
| Feature / user job | Binding approved source | What DES-006 currently demonstrates | D3 design gap / next test | Status |
| --- | --- | --- | --- | --- |
| Read and navigate WBS/Gantt | v18 reference + current product | Schedule view, selected detail, stage filters, synthetic timeline | Cross-workstream hierarchy, non-summary task treatment, row/timeline alignment, larger workbooks, unscheduled tasks, responsive layout | Partial |
| Weekly task review | Owner meeting decisions in #25 design record | Exceptions, all workstreams, owner and due filters, contextual selected task | Discovering overdue without watch signal; maintaining selection and keyboard focus when filtering/scanning many tasks; exact meeting-to-schedule return | Partial |
| Task inspector/edit | Frozen [EMV-EDIT-1.0 #4](https://github.com/Kenny619/spl-wbs/issues/4) | Inline Edit, **Simulate save**, Cancel demo (browser memory) | One unsaved draft; explicit actual **Save / Discard / Cancel** on task/view/workbook change; disabled/invalid field states; no-op; pending conflict/uncertain Save recovery; safe Updates append. **Simulation is not contractual Save proof.** | Critical not demonstrated |
| Committed workbook + audit | Frozen [EMV-WB-1.0 #3](https://github.com/Kenny619/spl-wbs/issues/3) + recovery #2 | Static sample task objects | Distinguish draft vs committed/reloaded data; backup/write/readback status; incompatible history blocks Save and Save As; no unverified success banners | Critical not demonstrated |
| Global Change History | Frozen [EMV-HIST-1.0 #5](https://github.com/Kenny619/spl-wbs/issues/5) | Not present in DES-006 | Global and task-specific entry points; read-only grouped ChangeSetID → task → fields; timezone-aware periods; long/multiline safe diffs; return to selected task | Missing |
| Settings: timezone, columns, theme | Frozen [EMV-SET-1.0 #6](https://github.com/Kenny619/spl-wbs/issues/6) | Not present | Secondary navigation without moving top buttons; display timezone affects *instants*, not date-only values; Columns parity; Light/Dark/System, local persistence, Reset confirmation | Missing |
| Project calendar / blackout | Existing session Calendar + proposed [#20](https://github.com/Kenny619/spl-wbs/issues/20) | Synthetic static blackout/holiday calendar | Accurate calendar source, holiday/blackout provenance and nonworking-target warning; no premature workbook persistence or conflation with personal Settings | Concept only |
| Latest Status | Frozen [EMV-REPORT-1.0 #7](https://github.com/Kenny619/spl-wbs/issues/7) | Synthetic Report/Present and text preview, workstream and owner | Committed source, verified task progress rollups, summary deduplication, actual limits, timezone and exact Copy/Preview snapshot parity | Partial |
| Historical Update Report | Frozen #7, based strictly on #3/#5 | Synthetic fixture for **proposed weekly lifecycle summary** | Preserve existing approved UpdateHistory/ChangeSetID counts and text output for v1; explore a distinct subsequent weekly stakeholder report change contract with task-created/watch-open/watch-closed sources | **Frozen conflict; scope decision later** |
| Delivery health and persistent watch | Design decision in [Risk Watch Model](05_RISK_WATCH_MODEL.md) | Synthetic auto/manual watch markings | No real risk engine, accepted reference commitment field, manual risk persistence, historical watch lifecycle or stakeholder approval evidence source | Unapproved functional model |
| Creation and structural changes | Separate proposal [#23](https://github.com/Kenny619/spl-wbs/issues/23) / frozen #4 editable allowlist | None | Must not assume task creation or new task audit events are available in frozen v1; design entry points only after requirements authorized | Future scope |
| Accessibility & office viewing | Design principles / review process | Responsive CSS and basic labels | Edge laptop 1366×768, 1440×900; zoom 125–200%; keyboard, screen-reader semantics, reduced video-call window, contrast, focus recovery, scroll trapping | Evidence pending |

## D3 design preparation (AI design work can proceed without another owner micro-approval)
**D3-A — Complete a contract-aligned navigation/state inventory.**
Treat DES-006 as the layout reference, then draw *design-only* interaction flows for global History, task History, Settings, safe exit while editing, and Reports. Keep the three primary navigation buttons stationary; secondary functions should not crowd the approved header layout.

**D3-B — Build integrated scenario mocks, not isolated buttons.**
Demonstrate a single loaded project and selected task throughout these transitions:
1. Schedule → select `[Data Migration] Data reconciliation` → Edit → modify date/status/append an Update → open Meeting or History while dirty → **Save / Discard / Cancel** decision. Failure, conflicting source, invalid data and no-op must have distinct accurate states.
2. Schedule / Meeting → task History → inspect grouped field changes → back to the same selected task without losing context. Global History must be independently reachable.
3. Settings → change IANA display timezone and verify display timestamps only, not date-only planned finish; toggle Light/Dark/System and Columns; reset with explicit confirmation. Preserve local-vs-project storage ownership.
4. Meeting → navigate a predecessor outside the current filter, return to previous context and test independent scrolling and focus restoration.
5. Generate Latest Status with unsaved draft present; show an accurate warning and a fixed, committed-only preview. Switch to existing historical Update Report without silently adopting the proposed weekly lifecycle-event report.
6. Risk-watch scenario: one automatic schedule signal clears, one contextual risk remains; revised planned date alone does **not** constitute acceptance; task cannot be inferred Green from status/dates alone.
7. Share the workspace at laptop/video-call sizes; validate fixed navigation positions, equal inspector width and report scroll containment with actual Edge rendering.

**D3-C — Holistic visual system review and freeze proposal.**
Only after the integrated scenarios are credible, propose coherent typography, density, spacing, semantic color, iconography, focus states, Light/Dark/System, responsive behaviors and major empty/error states as one full-workspace design. Obtain **specific owner approval of the exact rendered artifact/source SHA** before declaring D3 frozen. Then seek separate authorization for implementation; do not conflate design acceptance with product release.

### Required evidence that remains open
DES-006 source/CSS structure checks previously passed, but **actual Edge screenshots, browser wheel/trackpad behavior, focus/keyboard support, visual-contrast/zoom evidence and functional workbook integration were not validated**. A local browser screenshot test is not automatically authorized by source code availability; record the evidence type truthfully if/when completed.

## Scope control / no automatic change to existing feature delivery
- No owner request to start implementing the overhaul in app code was made. **Do not merge PR #29** or authorize build work on current Excel Managed Variant branches.
- The D3 integration inventory is a design to-do list; it is **not a mandate to expand frozen #3–#7** or backport speculative new features.
- Only the actual owner may freeze a new visual baseline, approve functional scope change and authorize future main integration. AI QA may review without being represented as a human.
