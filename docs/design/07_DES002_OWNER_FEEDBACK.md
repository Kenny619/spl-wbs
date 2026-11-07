# DES-002 — Owner feedback remediation and report-linked presentation (proposed 0.1)

**Date:** 2026-11-08 JST · **Stage:** D1 / iterative concept critique · **Owner disposition:** four substantive issues raised; addressed in proposed mock, not visually accepted or frozen.

**Editable mock:** [DES-002-consolidated-review-and-reports.html](../../design/concepts/DES-002-consolidated-review-and-reports.html). **Historical predecessor:** [DES-001](../../design/concepts/DES-001-holistic-meeting-concepts.html) retained unchanged for traceability. **Primary Issue:** [#25 UI overhaul](https://github.com/Kenny619/spl-wbs/issues/25). **Design PR:** [#29](https://github.com/Kenny619/spl-wbs/pull/29).

## Feedback, rationale and revised decisions

| Owner feedback | DES-002 disposition | Reason / boundary |
| --- | --- | --- |
| Leadership Briefing overlaps planned Output Reports | **Merge concepts**: the top-level exploration now says **Reports · Present**. Within Output Reports, select **Latest Status** or **Update Report**, and switch between **Plain-text Preview** and **Present** using the same synthetic report snapshot. | Respect frozen [EMV-REPORT-1.0 #7](https://github.com/Kenny619/spl-wbs/issues/7): its actual v1 output is **plain text**, with explicit Generate/Refresh, fixed preview, exact Preview/Copy parity, committed workbook source and no writes. A rich presentation *view* is a later proposed enhancement, **not** a changed approved output format, a third independent reporting engine, automatic report generation or permission to change the frozen contract. |
| Integrity view adds little beyond exceptions | **Remove separate Integrity stage**: only **Exceptions** and **Workstreams** remain in weekly meeting navigation. | Existing data-quality observations (e.g. missing owner) can appear alongside the appropriate workstream task; don't permanently add another top-level stage for a minor filter difference. Actual integrity rules remain a separate proposed issue if they go beyond current validation. |
| Active Discussion and Task Detail/Live Updates overlap | **Consolidate** to one two-column meeting screen: agenda left; large selected-task panel right. Task is read-only by default; **Edit task** opens fields and append-update composer in that same panel. Cancel and Simulate Save return to discussion mode. | Reduces redundancy and is more legible over screen share. The simulator blocks navigation while its inline demo editor is open; production must honor the independently frozen #4 Save/Discard/Cancel behavior, not substitute the demo guard. |
| Decorative horizontal progress bar is unhelpful if progress is not tracked; finish date and working time matter | **Remove fake 55% focus-progress bar and presentation fake progress bar**. Emphasize finish date plus **working days remaining**, and show due/workday context within meeting navigation, schedule rows and report presentation. Keep Gantt duration bars as schedule context **without rendering faux progress fills**. | Working day semantics require a project work calendar before production: current demo fixes **as-of 2026-11-08**, counts **Mon–Fri after the as-of date through finish inclusive**, excludes demonstrative national holiday **2026-11-23**, but **does not handle project blackout dates, custom working weeks or real task calendars**. Static sample schedule bars remain illustrative. |

## Calendar model and design semantics

- **Verified fixture date:** 2026-11-23 is Japan's Labour Thanksgiving Day and a national holiday; see [Cabinet Office 2026 holiday calendar](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html). The prototype only covers dates in November 2026 and is intentionally not a production calendar engine.
- **Working-days remaining as a date-context indicator**, *not* an estimate of task effort, person-days, residual effort or actual task progress. Example: as of Sun 2026-11-08, Nov 12 has **4** future working days; Nov 17 **7**; Nov 23 **10** (Nov 23 itself is excluded as a holiday); Nov 30 **15**. A target that falls on a holiday should be flagged separately during actual calendar validation.
- Working days must ultimately be derived consistently from the **approved project calendar** including nonworking weekdays, Japan holidays, project blackout dates and any additional owner-approved working-day rules. Current Issue [#20](https://github.com/Kenny619/spl-wbs/issues/20) considers future **project settings** for blackouts, and is **not approved as an implemented feature**. Do not conflate a display countdown with an approved schedule-slippage / delivery-risk engine.
- A Gantt **duration** bar remains meaningful even without progress data. Distinguish duration from completed-work fill; show completion only when sourced and clearly labelled.
- The leadership-facing report view gives due/working-day prominence. Differences from the frozen plain-text content, if desired in actual reporting, need an explicit requirements change assessment.

## Prototype/reporting fidelity

DES-002 deliberately uses one `reportSnapshots` record per report mode, and both **Present** and **Plain-text Preview** read the same fixed snapshot. **Generate / Refresh demo** explicitly replaces it. Subsequent changes to synthetic task records do not silently mutate the existing report snapshot. **Copy report text** attempts to copy that exact fixed snapshot string via the browser clipboard, with explicit success/failure messaging; clipboard may be unavailable when the local HTML is opened under restricted browser permissions.

The Latest Status fixture demonstrates workstream-grouped Needs Attention and upcoming milestones from sample statuses; the Update Report fixture is generated from separate illustrative **synthetic UpdateHistory Save events**, NOT the task's free-text Updates field. Shared synthetic `SV-0142` Save IDs are preserved across workstream headings. This approximates important frozen #7 semantics, but is not a full implementation of period filters, source validation, clipboard parity, progress rollups or history chronology.

## Functional source-level smoke evidence (not browser visual QA)

- Inline JavaScript syntax **PASS**.
- Source-mocked UI execution **PASS** for A Schedule Canvas, B Meeting Guide, exceptions/workstreams, Edit task and Cancel, blocked navigation during demo editing, Output Reports Latest Status/Update, Present/Text-preview toggling and fixed-snapshot Refresh. Clipboard code is syntactically validated but not independently browser-tested.
- Synthetic editing **PASS**: owner/status/finish/progress and Updates demo state can change without workbook access; report snapshot stays fixed until Refresh.
- Workday date examples checked against November 2026 sample calendar. The project-settings and blackout calendar are not implemented.
- **NOT YET TESTED:** actual Chromium/Edge rendered layout at 1366×768 and 1280×720, video-call downscaling, keyboard accessibility of all forms, screen-reader behavior, real workbook transactions, Report copy/clipboard, production calendar consistency. No screenshot or UAT acceptance claim.

## Specific next mock review tasks

1. **Meeting view 1366×768:** can the selected task's finish date and remaining workdays be understood at a glance, without competing horizontal bars? Is the Edit task action discoverable but not visually dominant?
2. **Edit in place:** check whether the risk reasons and latest update remain sufficiently visible while editing, and whether the composer fits without painful scrolling.
3. **Exceptions → Workstreams:** verify context and selection retention, and whether removing the Integrity stage improves comprehension rather than hiding incomplete records.
4. **Reports:** confirm the Present view feels like a readable alternative to the same Latest Status / Update Reports, not another report-generation feature. Assess whether report workstream heading structure and drill-down meet the leadership need.
5. **Schedule:** test whether scheduled Gantt duration bars still help users compare dates when percent-progress fills are absent. Select actual column widths and typography only after holistic evaluation.

## Scope boundary

**All revisions are design-only and proposed.** DES-002 does not supersede the approved v18 UI baseline, implement or alter frozen EMV-REPORT-1.0, change Excel schema, introduce a production calendar algorithm or authorize merging, release or deployment. No extra mandatory UI approval gate for existing feature work.
