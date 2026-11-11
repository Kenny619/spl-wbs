# Meeting Review — functional specification proposal MR-0.1 (SUPERSEDED delivery alternative; NOT FROZEN)

**Prepared:** 2026-11-11 JST · **Controlling issue:** [#25](https://github.com/Kenny619/spl-wbs/issues/25)  
**Design authority:** Owner-approved [DES-012 Consolidated Review 08](../../design/concepts/DES-012-consolidated-review08-task-detail.html), exact HTML blob `de6ebaa63aa035ba741b4435cf1cdb9d1166d958` (no visual redesign authorized).  
**Proposal status:** Functional discovery/contract review only. **Existing DES-010 implementation approval B expressly excluded a permanent Meeting Review business workflow.** No coding, merge, deploy, UAT or change to #3–#7 is authorized by this document.

> **Owner decision superseding MR-01-first recommendation (2026-11-11): [MR-D01 = B](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6786902711).** The Product Owner explicitly rejected an interim status-only Meeting Review, because the watch list shapes the UX of the entire page. This document is retained as a *functional inventory* of possible review behavior, **not as authorization or an active MR-01 implementation plan**. Prepare integrated Meeting Review + real Under Watch as a dependent pair after a shared-data source and watch lifecycle have been specified, frozen and separately authorized. [Authoritative decision record](26_2026-11-11_FUNCTIONAL_RECONCILIATION_OWNER_DISPOSITION.md). The accepted [Review 08 visual design](../../design/concepts/DES-012-consolidated-review08-task-detail.html) remains untouched.

## Purpose

During a weekly project status meeting, make the most consequential open items easy to identify and inspect without losing workstream context. The Meeting Review must not devolve into a second independent task database, override project dates/identities or silently clear risks.

## Existing owner decisions to preserve

- Review **exceptions first**, then move through workstreams and WBS order rather than switching between scattered navigation modes.
- Keep Task Detail inspector proportions, task identity, dependencies and selection semantics consistent with Schedule; contained internal scrolling, fixed navigation, compact viewport.
- Available review scopes include **Exceptions**, **All Workstreams**, **Due Today** and **Due within the next five working days**, plus filters for **Owner and Workstream**.
- Separate text Search from the same multi-value per-column advanced Filter as Schedule. Within column OR, across columns AND. Show number of affected columns on Filter button and ▼ beside headings for active filters; no WBS/Task advanced filter (covered by Search).
- Workstream grouping and links use the existing immutable TaskID and actual WBS ordering; switching modes/filters must not duplicate work.
- Approved Review 08 visual and shared Task Detail content (including integrated Timeline Option A, missing-progress state, chronology of Updates and guarded Edit/History) apply unchanged.

## Recommended bounded first functional version — MR-01 (read-only agenda)

1. **Navigation and context:** a distinct Meeting Review workspace in the existing global header. Initially show active workbook project and a **review date** (default Today in selected Settings timezone, optionally selectable explicitly). Date controls are not meeting records or persisted meeting sessions.
2. **Exceptions stage:** show current, incomplete tasks with **verified existing** TaskStatus=At Risk or Blocked (and separately defined overdue/current-due warnings only if their calculation is explicitly agreed). Label it **status-based exceptions** if persistent Under Watch/risk engine is not available; never claim this is a complete watch register.
3. **Workstreams stage:** list current tasks grouped by Workstream and WBS with the same task IDs; owner/target/status and applicable days remaining. The stage should not clone tasks from exceptions into an alternative data model.
4. **Focus shortcuts:** Due Today and Due in five **working-calendar** days relative to review date, using the existing calendar model and explicit boundaries; do not confuse this with five calendar dates or implicitly count unknown holidays as working days.
5. **Search/Filter:** preserve independent search and active-column multi-select filter state for Meeting Review, with its own counts and column markers, unaffected by Schedule's current filter state.
6. **Selection and navigation:** selected task drives the approved shared Task Detail; relationships can open linked tasks outside the current filter without corrupting the selected filter; provide **Back** to previous task/list context; maintain scroll position, keyboard focus and dirty-draft Save / Discard / Cancel guard.
7. **Read-only meeting-specific layer:** viewing agenda or changing review date/stage does **not** save a discussion log, change TaskStatus, close a risk, append UpdateHistory or persist meeting attendance by itself. Editing a task through the shared inspector still uses the existing frozen #4 safe Save path.
8. **Safe states:** no workbook, missing/invalid schedule, no exceptions, no filter results, unknown day count, and read-only preview are explicit. Do not masquerade a fixture-based schedule as saved truth.

### What MR-01 intentionally does not claim

- No **Discussed in this meeting**, meeting minutes, follow-up state, meeting attendance or history until those are separately approved.
- No persistent Under Watch list, manual risk reasons, automatic RAG/Green scores or revised reference commitments until [Watch contract](25_UNDER_WATCH_FUNCTIONAL_PROPOSAL.md) is frozen and its source is trustworthy.
- No new workbook fields/sheets or hidden browser-local task stores.
- No new task/dependency authoring outside #23/#22 staged roadmap.
- It is unacceptable to label a mere status-filtered list as full Under Watch coverage.

## MR-02 future watch integration (dependent on separate owner functional approval)

Once the risk/watch source is approved and implemented, augment the same accepted visual Meeting Review with active watch reasons, source reliability, risk history and context actions. Do **not** replace At Risk / Blocked status semantics. Distinguish **Under Watch**, **prioritized for this meeting** and **discussed in this meeting** as different concepts. Discussion alone never clears risk.

## Proposed acceptance evidence (if implementation is later authorized)

- Actual workbook fixtures, immutable task selection and grouped WBS order; large workstream lists and keyboard navigation.
- Schedule and Meeting Review independent filters, search text, badge counts and ▼ headings for every displayed filterable column.
- No false watch flags, no fake Green, correct Due Today/≤5-working-days inclusive boundaries with weekends/Japanese holiday coverage, DST/timezone/date-only correctness.
- Different task selected via relationship link then Back restores review date/stage/filter context and scroll; active dirty draft uses real Save/Discard/Cancel semantics.
- Same accepted Review 08 inspector dimensions and user-facing labels at 860, 1024, 1366, 1440px, both themes, screen-share/zoom.
- No task/history/file mutations from agenda-only actions; workbook Save continues through the existing guarded transaction.
- Scope separated from existing report, workbook safety, CI and physical Edge gates.

## Historical choices — MR-D01 now decided by Owner

**A (historically recommended; rejected by Owner):** Approve **MR-01 read-only Meeting Review** as an independent feature specification/implementation authorization later, then add watch-derived agenda semantics as MR-02 only after its data model is approved. This restores the agreed third operational workspace without blocking on an unapproved risk schema, and honestly labels interim status-only exceptions.

**B (OWNER-SELECTED):** Defer permanent Meeting Review implementation until Under Watch's shared-data architecture, reason lifecycle and clearance semantics are frozen. Integrate Watch into the Meeting Review page from its first functional release. No status-only interim Meeting Review.

**Disposition:** Owner selected B (direction); details of the integrated functional contract, data source, security and implementation remain OPEN. No implementation/merge/release authorization. Keep the visual HTML and read-only v18 untouched.
