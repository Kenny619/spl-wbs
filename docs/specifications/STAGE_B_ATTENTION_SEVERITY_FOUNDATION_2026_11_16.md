# Stage B — Needs Attention and notification severity foundation

**Prepared:** 2026-11-16 JST  
**Status:** Draft implementation groundwork for [Issue #17](https://github.com/Kenny619/spl-wbs/issues/17), not Stage B feature acceptance, RAG/Clear policy approval or beta readiness  
**Current visual authority:** DES-012 consolidated Review08  
**Related independent streams:** [PR #81](https://github.com/Kenny619/spl-wbs/pull/81) status shortcut, [PR #87](https://github.com/Kenny619/spl-wbs/pull/87) notice wrapping, [Issue #82](https://github.com/Kenny619/spl-wbs/issues/82) health semantics

## 1. Problem and immediate outcome

The original Gantt counts overdue and recorded `TaskStatus=Blocked/At Risk`; the managed Stage B shortcuts filter Blocked and At Risk. There is **not yet one reusable, explicitly source-attributed task-attention snapshot** for the future overdue and verified open-Watch channels, nor an event-typed severity policy for the planned notices inbox. Piecemeal screen-level interpretations would risk inconsistency with Report 1.1 and future RAG work.

This change adds a **pure, typed, unit-tested groundwork module**, `src/managed/attentionFoundation.ts`, that derives only approved facts and sorts explicit notice categories. It intentionally **does not mount a new notice panel, change the workbook, alter existing Save guards, introduce RAG, or modify the viewer**. This is a foundation to integrate into current Stage B branches with focused UI tests rather than a substitute for those integrations.

## 2. Task attention — sources, not judgments

| Channel | Evidence and inclusion | Meaning / boundary |
|---|---|---|
| Blocked | Recorded `TaskStatus=Blocked` for non-Summary task/milestone | Actual saved TaskStatus, **not inferred Red** |
| At Risk | Recorded `TaskStatus=At Risk` for non-Summary | Actual saved TaskStatus, **not inferred Amber** |
| Overdue | Non-Summary task/milestone with ISO date-only `PlannedEnd < today` and neither Completed nor Cancelled | Scheduling fact, **not independent health assessment** |
| Under Watch | Explicit, verified **open Watch task-ID set** from the project's accepted Excel Watch projection, if available | Saved open reason presence; resolved-only or unverified input stays **Unknown** |

Overlaps are allowed: a task may be Blocked, overdue and Under Watch at once. Per-category counts remain distinct and `distinctAttentionTaskCount` counts each task once. Summary rows and duplicate identity are excluded. Absent verified Watch input yields a **null**, not zero count. An open Watch reason on a Completed task is not silently resolved. All projection data are read-only.

**Not specified here:** Red/Amber/Green/Clear mapping, decision authority, automatic health clearance, RAG source schema, reason severity, threshold, historical period inference. Those require #82 owner policy freeze and later pre-beta gate.

## 3. Notice severity — event type, not string heuristics

| Priority | Explicit event kinds | Behavior groundwork |
|---|---|---|
| Critical | Save not verified; recovery blocked; workbook conflict | Persistent and **never dismissible** by superficial UI clearing |
| Warning | Permission denied; unsaved changes; import warning | Permission/unsaved persistent; benign import warning may be dismissed once acknowledged |
| Information | Import progress; verified Save; ordinary info | Can be shown in expandable informational area; dismissible |

The typed priority is intentionally **not derived from `message` text**. Never classify a notice as Green/Red or a project RAG state. The severity model does **not** claim existing messages are already fully wired to these event sources: today's `ManagedWorkbookApp.message` remains a mixed string; follow-on Stage B work must connect it to explicit event kinds before claiming end-to-end severity behavior. It must continue to surface every critical Save/recovery error even when a notice area is collapsed.

## 4. Implementation wiring order, without redundant UI

1. **Connect data:** Wire `projectAttention()` to the real managed controller snapshot and **verified** `WatchProjection` only. Do not use the read-only Gantt `attentionCounts` status as a guessed Watch signal. Preserve current read-only viewer and frozen Report1.1 semantics.
2. **Connect actions:** Extend the existing PR #81 reversible filtering (no duplicate task list) with overdue and verified Watch sets using stable task IDs, ancestor context and Task Detail selection. Existing search, status/column filters, unsaved-edit guard and explicit Clear/Restore must remain deterministic.
3. **Connect notice origins:** Replace ad hoc severity guessing with event-tagged emissions at save result, conflict, recovery, picker permission and dirty-draft transitions. Preserve programmatic alert role and keyboard focus; never auto-dismiss critical errors.
4. **Present one priority area:** Compact urgent notice strip (critical/warning) plus expandable info; preserve essential project title/source and current navigation. PR #87 addresses readable long text but does not implement severity placement.
5. **Focused QA before integration:** Real synthetic workbook with overlapping Blocked/At Risk/Overdue/open Watch, Unknown Watch source, completed Watch, failed Save/backup, permission rejection, unsaved draft, long notice, keyboard and 860/1366/1440 display, light/dark. No Stage A duplicate owner tests.

## 5. Verification / release gates

- Added `test/unit/attentionFoundation.test.ts`: pure overlap/dedup/date/unknown Watch and severity sorting/persistence cases.
- Run exact-head local or CI unit/build; later add targeted managed-browser integration to prove real filtered rows + accessible notice rendering.
- Existing owner-approved Stage B draft branches are separate. Rebase/stack only after careful QA; do **not** independently merge a typed groundwork module into protected main on the assumption that the entire B2/B3 experience is accepted.
- No workbook schema, UpdateHistory, new RAG/Clear rules, corporate file permissions, deployment or beta authorization is changed.
