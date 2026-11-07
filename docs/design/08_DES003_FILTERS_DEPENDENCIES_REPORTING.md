# DES-003 — Filtered Meeting Review and Weekly Reporting Concepts (proposed 0.1)

**Date:** 2026-11-08 JST · **Stage:** D1 / owner-led holistic concept iteration · **State:** PROPOSED / not design-frozen · **Controlling:** [Issue #25](https://github.com/Kenny619/spl-wbs/issues/25) · **Design PR:** [#29](https://github.com/Kenny619/spl-wbs/pull/29).

**Current interactive source:** [DES-003-filtered-meeting-and-weekly-report.html](../../design/concepts/DES-003-filtered-meeting-and-weekly-report.html) · **Predecessor:** [DES-002](../../design/concepts/DES-002-consolidated-review-and-reports.html), preserved unchanged.

## Product Owner feedback and disposition

| Feedback | Design change in DES-003 | Rationale / contract boundary |
| --- | --- | --- |
| Active Discussion panel occupies too much screen | Reallocate workspace toward a **task-list-first 2-column layout**. Left: detailed table-like item list with task, owner, status, finish date and working time. Right: compact selected-task overview and inline Edit. | Better information coverage and comprehension during weekly calls; avoid giant title/metric surfaces. Compare at realistic laptop and screen-share sizes before freezing. |
| Meeting Agenda counts lack value; add filters | Replace summary counts with actionable filters: **Exceptions**, **All · Workstreams**, **Due Today**, and **Next <5 Working Days**. Add **Workstream** and **Owner** selectors including Unassigned, plus a simulated meeting-date picker. | One exclusive primary filter; workstream and owner selections are **AND** constraints. Exception items still reference the original tasks, not duplicated entities. |
| Show dependent task list and links | Task detail now shows **Depends on / predecessors** and **Dependent tasks / successors**, with task titles/WBS and clickable internal navigation. | Direction matters: the predecessor list comes from `PredecessorIDs`; downstream dependencies are computed by reverse matching existing IDs. Links navigate to task details, not fabricated SharePoint URLs. This is a simulated FS relationship demo, not an editable dependency model. |
| Working days must respect holidays and project blackouts | A single **sample working-calendar function** drives count labels, the due-soon filter and report deadlines. Excludes nonworking weekdays, official holidays and explicit sample project blackout dates. | Date-only UTC-safe arithmetic; not effort remaining. Actual project calendar persistence is still future Issue #20, not approved in current EMV-SET-1.0. |
| Update Report needs completed, added, new risk, watch released; not Save counts; 7-day default | Present **Weekly Update Report (proposed enhancement)** with the four requested event categories plus significant field changes; default **7 inclusive calendar dates** ending on the simulated meeting date. No Save-event count in this stakeholder-facing proposal. | The **frozen EMV-REPORT-1.0 #7 explicitly requires Save event counts and generates period updates exclusively from UpdateHistory**. Task creation and risk/watch lifecycle events are not currently guaranteed by frozen workbook #3. This concept is an **unapproved potential future contract change**; do not silently implement it in v1. Preserve underlying ChangeSetID audit identity even if routine stakeholder copy doesn't show it. |
| Latest Status task listings need workstream and owner | Group task listings by **Workstream** headings and show **Owner** for each task. Keep scheduled finish and working-day context. | Preserves frozen #7's nonredundant workstream-heading rule (no redundant `[Workstream]` prefix beneath a workstream heading). For standalone references use `[Workstream] Task`. |

## Navigation and filter semantics
1. **Exceptions:** include every synthetic task with at least one active schedule or contextual risk reason, not just the top of a count dashboard.
2. **All · Workstreams:** group the full task set by its existing workstream/WBS hierarchy. No artificial third Integrity stage.
3. **Due Today:** exact scheduled date equals the selected meeting date, including a nonworking-date warning where applicable.
4. **Next <5 workdays:** scheduled finish is not before the reference date and has **0–4 remaining working days** (includes due today; separate Today filter makes the exact-date case accessible).
5. **Workstream** and **Owner** selectors are combined with the primary filter as AND constraints. **Unassigned** is selectable.
6. When selecting a dependency outside the active filter, the demo switches to All · Workstreams, resets owner/workstream restrictions and opens the linked task so its context is visible.
7. If a filter matches nothing, show an explanatory empty state and Clear Filters. Avoid using counts to replace navigation.

## Working calendar fixture — illustrative, not a production authority
- **Meeting/reference date:** Monday **2026-11-09**, selected as a synthetic weekly-meeting scenario. It is **not** a claim about the user's actual date.
- Working weekdays: **Monday–Friday**.
- National holidays in the **November 2026** sample: **2026-11-03 Culture Day** and **2026-11-23 Labour Thanksgiving Day**, per Japan Cabinet Office official [2026 national holiday table](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html).
- Synthetic project-owned blackout dates: **2026-11-12 Environment freeze** and **2026-11-20 Deployment blackout**. These are sample data, not actual user/project restrictions.
- Count **working dates after the reference date, through the finish date inclusive**. The display is *calendar working days to deadline*; it is **not remaining effort**, forecast duration, or a prediction of completion.
- As-of Nov 09, sample expected working-day counts: **Nov 09: 0**; **Nov 12: 2** (Nov 12 blackout); **Nov 14: 3**; **Nov 17: 5**; **Nov 30: 12** (Nov 12, Nov 20 blackout, Nov 23 holiday excluded).
- A finish date on a holiday, weekend or blackout should be visibly identified, not silently treated as an ordinary delivery day.
- Design contract still to confirm: how nonstandard working weeks, regional holidays, project-calendar configuration, time-zone display, and invalid imported blackout rules affect this function. Current session-scoped calendar behavior cannot be assumed to persist to workbook without explicit future owner approval.

## Report data lineage and change-control gap
### Approved existing EMV-REPORT-1.0 (#7)
- **Latest Status:** reads committed/reloaded current workbook model, uses existing verified summary calculations, groups lists by workstream, and has fixed Generate/Refresh with exact text preview and Copy parity.
- **Update Report:** reads **only** compatible `UpdateHistory` saved field changes, includes Save-event counts and associations, supports arbitrary inclusive date period, and preserves historical snapshots and identity.
- Do **not** change these frozen production requirements simply because DES-003 visually explores a different briefing report.

### Potential revised weekly stakeholder-report contract (requires owner decision)
| Requested event | Candidate reliable source | Current status |
| --- | --- | --- |
| Completed task | `TaskStatus` transition recorded in `UpdateHistory`, considering transition semantics and source integrity | Potentially derivable with careful rules |
| Added task | Explicit `TaskCreated` event or auditable creation history | **Not guaranteed** by current frozen `UpdateHistory`; task creation remains separate Issue #23 |
| New risk identified | New automatic signal / manually raised watch-reason lifecycle event, with timestamp and source | **Not guaranteed** by current workbook schema; requires risk-model contract |
| Under Watch released | All active reasons resolved and an auditable watch-cleared transition | **Not guaranteed** by current workbook schema; requires watch-lifecycle contract |
| Other important task changes | Existing field-level `UpdateHistory` | Available in frozen contract |

Default proposed period: **the seven calendar dates ending on the user's current local review date, inclusive** (for this fixture, Nov 03–09), with editable From/Through date controls. Such a default would **not** limit the user's ability to generate another inclusive date period. Saved report text must be a fixed snapshot and Copy must reproduce it exactly.

**Do not infer an Added, Risk Opened, or Watch Released event from merely comparing current rows to the prior snapshot or from a task note.** If source events are absent, make the report capability explicitly unavailable/partial, not fabricate event history. All DES-003 events are **synthetic fixtures**, explicitly labelled as proposed when unsupported.

## Mock test scenarios and evidence
- HTML/JS source is versioned on the design branch. No workbook writes, SharePoint accesses, external communication scanning, backend reporting or persistent browser state.
- **Automated source-level validation: PASS (24/24 mocked-DOM assertions)** on DES-003 source Git blob `5c0acc557396cd30c85d4b80ea7255044d587afc`. Verified initial Meeting screen, four filter controls, calendar basis, due-today selection, less-than-five workdays inclusion and blackout counts, owner/workstream intersection with empty state, all 11 sample rows, predecessor and successor links, dependency drill-down, inline Edit/Cancel, blocked navigation during edit, Latest Status owner/workstream, copy-equivalent plain-text snapshot, four weekly lifecycle categories, default seven calendar dates, snapshot immutability until Generate/Refresh, extended event-source warnings, Unassigned owner filter and meeting-date change. Script compiled without syntax errors.
- **Not equivalent to browser testing:** assertions run with a simulated DOM, not actual Chromium. Exact visual layout, clipboard behavior, screen-reader and pointer/keyboard ergonomics remain unverified.
- **Still required:** real Edge/Chromium rendering at 1366×768 and reduced video-call sizes; cross-device typography/overflow audit; keyboard focus/ARIA review; real workbook calendar fidelity; owner visual acceptance. No unverified WCAG/visual QA claims.

## Next UI critique priorities
1. Is the task list now large enough for useful cross-task scanning while still keeping the selected detail readable on a laptop and in a screen share?
2. Are primary filters discoverable and do Owner + Workstream secondary filters behave predictably?
3. Are predecessor and downstream task links understandable, and does navigation preserve context when a link is outside the current filter?
4. Is working-day terminology adequately differentiated from remaining effort and scheduled duration, and is blackout/holiday provenance easy to find?
5. Does the proposed weekly Update Report answer the stakeholder question **“what changed this week?”** without becoming an administrative event log?
6. Should Update Report categories be prioritized by decision relevance or by lifecycle stage? Not decided.

## Authority
**Research and UI prototype only.** No approval to modify EMV-REPORT-1.0 (#7), workbook schema (#3), Editor (#4), Settings (#6), project calendar Issue #20, task creation Issue #23, current v18 baseline, existing implementation PRs, merging, release or deployment. Any new events, persistent project calendar and reporting semantics require explicit future Product Owner specification freeze with impact analysis and independent acceptance.
