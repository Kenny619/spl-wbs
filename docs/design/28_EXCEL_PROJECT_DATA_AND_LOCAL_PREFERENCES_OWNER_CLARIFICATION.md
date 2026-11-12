# DEC-DATA-2026-11-12 — Workbook project source of truth / local view preference boundary

**Date:** 2026-11-12 JST · **Authority:** Product Owner clarification in the current SPT-WBS discussion, following the [Issue #25 architecture options review](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6786997777).  
**Disposition:** **Owner-confirmed storage-ownership and product behavior direction**, superseding inconsistent earlier Design Office recommendations; **not** an exact workbook schema freeze, implementation approval, merge authorization, release or claim of real-time collaboration.  
**Protected visual source:** [DES-012 / Consolidated Design Review 08](../../design/concepts/DES-012-consolidated-review08-task-detail.html), exact HTML blob `de6ebaa63aa035ba741b4435cf1cdb9d1166d958`.

## Owner clarification (binding direction)

> Project members need to be synchronized on everything except for the user view preference and history of loaded excel files. WBS entity information including under watch status and its associated information should be kept in the excel and should provide same information to the users loading the same excel. On the other hands, view settings such as darkmode, columns to be displayed, PGCM display option should be left for the invidual users and the configuration should be manged outside of the excel e.g. browser local or cookie.
>
> In this case, blackout date should be a common information shared across the project member. when it's set, it should be recorded in the excel

## 1. Data ownership matrix (controlling concept)

| Information | Authoritative persistence | All members opening same committed workbook | Notes |
|---|---|---|---|
| Project WBS entities: TaskID, title, hierarchy, owner, dates, TaskStatus, Progress, workstream, dependencies, descriptions | **Excel workbook** (`ProjectWBS`) | **Yes** | Preserve existing frozen workbook field semantics; task identity is stable |
| Human-readable Task Updates | **Excel workbook** (`ProjectWBS.Updates`) | **Yes** | Append-only per frozen #4 |
| Task UpdateHistory / Save audit | **Excel workbook** (`UpdateHistory`) | **Yes** | Distinct from user file-open history; immutable historical entries |
| **Under Watch** status, reason-level automatic/manual signals, evidence, recorded accept/resolve actions, watch history and accepted reference commitment | **Excel workbook** | **Yes** | Candidate extension pending separately approved schema; do not pretend TaskStatus is Watch |
| **Project blackout dates** and related project-calendar config | **Excel workbook** | **Yes** | **Supersedes CAL-D01 A “session only” portion**. UI location under Settings still approved, now clearly project-owned/shared |
| Display theme Light/Dark/System | **User/device browser storage** | **No** | Never write into workbook |
| Visible columns, widths/order where supported, search/filter/UI state, Gantt zoom/layout | **User/device browser storage** when persisted | **No** | Do not force a user-specific view onto project collaborators |
| **PGCM display option** | **User/device browser storage** | **No** | Display toggle is private; PGCM meeting/date facts used as project data remain governed by their existing approved source |
| User-selected display timezone | **User/device browser storage** | **No** | Timestamps remain stored canonically in UTC; date-only task fields unchanged |
| Recently opened Excel file list / last selected workbook and local path or permissions | **User/device browser storage** | **No** | Browser permission model remains in force; no project history of individual file launches |
| Meeting Review local visual settings and selections | **User/device browser storage** unless explicitly defined as project data | **No** | A future meeting discussion or Watch reason *is* project data, not a personal filter |
| Project history, shared decisions, accepted commitments | **Excel workbook**, through validated approved data fields/records | **Yes** | Audit scope and ownership to be frozen; no external service as default |

**Rule:** Project information travels with the workbook and is consistent for a member who opens that **same committed workbook version**. Per-user view and navigation preferences stay outside it.

## 2. Supersessions and no-silent-scope changes

- **WATCH-D01 A** remains APPROVED as the shared-project requirement, but “project-portable” is now specifically **workbook-backed and authoritative**. Design Office proposal **B1 separate authenticated Watch registry/service** in [the earlier architecture options](27_SHARED_WATCH_ARCHITECTURE_OPTIONS.md) is **REJECTED as the default approach**. No remote risk-content service should be introduced absent a new explicit owner decision.
- **CAL-D01 A from Nov 11 remains valid only for UI location (Settings).** The previous assumption that the blackout model stays session-only is **SUPERSEDED** by the owner's Nov 12 direction: when a blackout date is set, it must be saved into Excel as project-owned data. Current code and frozen v1 #6 still have older session-only behavior; they are now **identified requirement gaps**, not retrospectively compliant.
- **MR-D01 B remains**: Meeting Review must be designed/implemented together with real workbook-backed Under Watch, not shipped as an interim status-only agenda.
- **WATCH-D02 A** (reason-backed Watch / Clear / Unknown) and **WATCH-D03 A** (simple audited resolve/recommitment) remain.
- **EMV-SET-1.0 / Issue #6** stays frozen for **personal timezone / columns / theme storage**; adding a separate project Calendar section to the Settings UI must not make those personal preferences workbook-backed.
- **EMV-WB-1.0 / Issue #3** stays frozen **as the existing baseline**, but new Watch/project calendar persistence requires a separately versioned **schema amendment** (new workbook parts/fields, validation, compatibility and migration) with PO approval before implementation. Do not modify original frozen requirements or invent sheet headers as if approved.
- **Roadmap #1 Stage D** previously deferred persistent blackout; the new owner direction **settles data ownership** but not an exact delivery date/priority. Reconcile calendar sequencing with Under Watch risk calculations and acceptance gates; no silent Stage A expansion.

## 3. Workbook-based shared consistency — precise promise

- **Same committed bytes = same project facts**, subject to a consistent implementation/version of workbook parsing and explicit locale formatting rules. One user may choose dark mode and show Owner, another may use light mode and hide Owner, but their underlying Task/Watch/Blackout project data are the same.
- **No automatic live push was specified.** A browser session that has already loaded the workbook may be stale after another member saves. Users must reopen/refresh/check the authoritative workbook before relying on current shared Watch data. Distinguish displayed last-load/revision state from current-source truth.
- **Concurrent edits are a safety problem, not merely a UI problem**: preserve existing source hash / external change checks / backup / verified write/readback / single transaction / audit. For a shared file in a managed network folder or sync drive, verify provider behavior. Two divergent local copies are *not* the same authoritative workbook; synchronization of separate copies cannot be promised.
- A project setting or Watch action must be committed **only on verified Save**. A failure, permission issue or unresolved external-write conflict retains the pending draft and does not claim shared visibility.
- Existing read-only SharePoint variant remains isolated; it never writes project data. Do not send Excel/project data to a new backend/API by default.
- Existing versioned `UpdateHistory` should record sanctioned shared modifications consistently, but how to represent new Watch/Calendar events while preserving its frozen field-level meaning requires a schema/audit amendment.
- Safe import/reopen of an older workbook without the new metadata must have explicit compatibility defaults and **Unknown** watch if checks are unavailable; never infer Green from absence of watch sheets, or assume a missing blackout value means authoritatively “no blackout” without an approved migration rule.

## 4. Architecture design work now needed (without approval to implement)

1. Define **workbook schema extension** for project settings/blackouts and reason-level Watch ledger, identity/reference commitment, audit, versions and compatibility. Evaluate existing sheets/unknown-sheet fidelity and frozen history semantics before selecting exact worksheet names/columns.
2. Define UI save path for project Calendar (under Settings) and Watch/Resolve actions using one safe, conflict-checked workbook transaction; no browser-only “saved” state.
3. Define refresh/stale-source signaling when another member modifies the shared Excel. Do not promise real-time collaboration; define a detectable “newer workbook” state and reload behavior, including unsaved draft protection.
4. Define safe two-user scenario with a **single authoritative file** and tests: actor A saves risk → actor B reloads same workbook and sees risk; B saves blackout → A reloads and sees blackout; simultaneous changed files conflict safely; both users' local themes/columns/PGCM view stay independent; shared audit remains intact.
5. Reconcile the authorized source location and practical Windows/Edge/Excel access limits before any rollout. A managed/shared location may be necessary for members to access the **same version**, but this is a deployment/file-sharing question, **not** authorization to create a separate app data service.
6. Propose distinct bounded functional contract updates for Watch + Meeting and Calendar; preserve DES-012 reviewed design style and prior user workflow.

## 5. Minimum verification/acceptance scenarios

- Open same committed workbook on two separate Edge user profiles: WBS/Watch/Blackout and UpdateHistory are identical in underlying data, while themes/columns/PGCM display and MRU remain independent.
- Save a Watch reason/clearance/accepted reference commitment on one profile; reload on the other and observe the verified new state with consistent audit.
- Set/update/remove blackout dates in Settings; persist to Excel, reopen and validate same calendar and accurate remaining-day/risk calculations.
- Test workbook lock/conflicts, stale file, concurrent save, recovery, backup and restart. Never silently overwrite another user's changes.
- Empty/new/older project workbook migration and incompatible custom workbook features fail safely with actionable guidance.
- Personal “Reset preferences” does **not** erase workbook project settings, reasons or audit records; project calendar editing is its own explicit Save/Cancel flow with separate permissions.
- Project sync never implies the browser session automatically reflects another member's changes until source freshness/reload is established.

**Approval boundary:** Owner clarified desired **data ownership and visibility**. Exact new worksheet names, fields, lock/version strategy, migration, UI implementation slices and release scope remain proposed, subject to the existing six-stage change-control discipline and independent QA/Owner acceptance.
