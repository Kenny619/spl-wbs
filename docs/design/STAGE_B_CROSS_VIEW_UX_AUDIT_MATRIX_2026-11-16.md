# SPT-WBS holistic UX audit — cross-view evidence and acceptance matrix (working draft)

**Date:** 2026-11-16 JST  
**Owner:** UI/UX workstream #25; DMO coordination  
**Authority:** DES-012 consolidated Review08 is the **sole accepted cross-view visual baseline**. This document is an audit plan and gap register, not a replacement design, approval, or claim that browser checks have passed.  
**Baseline:** protected main `6306b9f3bfae61af1560ca27df2ffb4b07d4a8f5`; Stage A accepted only in personal Windows/Edge. Stage B PRs #79/#80/#81 and stacked #85 remain drafts.

## Decision rules

- Classify each finding as **functional Stage B fix**, **cross-view consolidation after C**, **accessibility/security blocker**, or **defer**. Do not polish screens independently against inconsistent design rules.
- Preserve workbook-owned project facts (tasks, calendar, blackout, manual Watch, audit) separately from browser-owned display preferences (dark mode, columns, PGCM visibility). Never use display-only controls to mutate workbook state.
- Manual Watch Open/Resolved is evidence only. Never label it verified Green/Clear/RAG; Report 1.1 remains governed by its frozen specification and manual-Watch addendum until #82 policy approval.
- Do not repeat Stage A UAT. Audit with fictional workbook data and supported personal Edge; corporate file-picker compatibility is an unresolved environment issue, not a pass.

## Cross-view gap matrix

| Surface | Observed requirement / source | Bounded Stage B verification | Consolidation after C | Evidence still required |
|---|---|---|---|---|
| Global header and navigation | #17: remove low-value subtitle and reduce header footprint | One primary title, clear current view, navigation remains keyboard accessible; important alerts never truncated | Shared spacing, title hierarchy and responsive shell | Browser captures at laptop and conference-monitor widths; keyboard path |
| Overview / Needs Attention | #17/#21: summary tiles consume space; attention must reach actual tasks | Blocked/At Risk shortcuts navigate to real filtered rows, Reset restores all; preserve Cancel/unsaved drafts (#81) | Shared card density, action labels, filter affordance | Positive/negative matches, no-match state, browser history and focus return |
| Schedule / Gantt | #16: PGCM toggle belongs in Settings, browser-local | Actual PGCM marker show/hide/reload/reset with unchanged workbook (#80/#85); no schedule calculation change | Toolbar, zoom, scroll, fixed header, contrast, filtered-column indicators | Targeted Chromium execution for #85 exact head; visual Day/Week check |
| Task Detail / managed editing | DES-012 Review08; Stage A guarded Save accepted | Navigation to task preserves unsaved-edit Cancel and Save/recovery notices | Consistent detail identity, actions, history and relationship hierarchy | Keyboard focus, long names, sticky actions and no clipped warnings |
| Meeting Review | Exception-first, task detail context, fixed-height list/detail | Existing Watch facts and report links must not imply health verification | Common filters, typography, scroll confinement and detail affordances | Keyboard and scroll checks; long note content |
| Reports 1.1 | Frozen Report 1.1 and manual Watch addendum | Show factual Watch context only; avoid inferred RAG, Green or Clear | Consistent print/screen hierarchy and controls after #82/#23/#24 stabilize | Report output comparison, long text, provenance labels |
| Settings / Project Calendar | #16 PGCM local; shared blackout persisted in workbook | Display preference does not alter workbook; shared calendar does; reset scoped to local preferences | Uniform toggles, validation, cancel/close behavior and grouping | Reload, corrupted preference, workbook bytes, keyboard labels |
| Notices / recovery | #17: prioritize import, Save/recovery, provenance; no truncation | Persistent blocking/error notices, accessible announcement and disclosure; no silent loss on navigation | One consistent notice taxonomy, placement and contrast | Synthetic warning/error/success, long text, screen reader semantics |
| Read-only viewer | Stage A viewer preserved | No new write capability; PGCM local managed preference does not silently alter viewer | Shared visual language without implying edit permission | Separate read-only smoke after integration |
| Onboarding / new task creation | Stage C #23/#24 not yet authorized for implementation | Record future interaction dependencies only | Audit empty state, creation, validation, cancel, recovery after authoring stabilizes | Stage C specification and implementation |

## Prioritized audit execution

1. **Now — B functional safety:** #81 actual filtered results + Cancel protection (focused QA recorded at head `4ac699d1`); #85 actual PGCM marker test still requires exact-head execution; #17 notices and actionable navigation implementation remains READY. Avoid duplicated CI.
2. **In parallel — UX evidence collection:** capture DES-012 Review08 comparison for header, Overview, Schedule, Task Detail, Meeting Review, Reports and Settings at standard laptop width, conference-monitor width, light/dark mode and keyboard-only. Record actual defect, screenshot/reference, severity and proposed owner decision; no invented PASS.
3. **After C authoring stabilizes:** reconcile new creation/onboarding flows with navigation, notices, focus and Settings patterns. Produce a single unified design delta, focused regression/UAT pack, and owner acceptance before beta.

## Severity and exit rubric

- **P0** data loss, unsafe save, false health certification, unauthorized write, inaccessible critical warning.
- **P1** user cannot reach a flagged task, navigation silently discards edits, unusable primary control, unreadable error.
- **P2** inconsistent typography/spacing, excessive summary real estate, visual mismatch without functional impairment.
- **Exit:** all P0/P1 closed with reproducible focused evidence; P2 explicitly triaged; no unapproved Report 1.1/health/schema semantics; consolidated design approved and integrated; focused owner UAT passed. This audit draft itself does **not** satisfy the pre-beta UX gate.

## Coordination / collision control

Do not modify PR #80/#81/#85 branches from this audit lane. Stage B engineering should continue independently on #17, while #82 semantics remain awaiting a separately approved frozen specification. Cross-reference #25 and #1 when audit findings materially change roadmap scope, not on every hourly review.
