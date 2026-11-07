# Persistent Risk Watch — Working Review Concept (proposed 0.1)

**Date:** 2026-11-07 JST · **State:** PROPOSED / product-design discovery, NOT an approved functional specification · **Controlling:** [UI overhaul Issue #25](https://github.com/Kenny619/spl-wbs/issues/25), [draft PR #29](https://github.com/Kenny619/spl-wbs/pull/29).

## Product Owner discovery (verbatim concepts, paraphrased)
- Exception identification uses **both automatic and manual signals**.
- **Timeline-impacting risks** are flagged automatically.
- **Contextual risks** are learned through other stakeholder communications and flagged manually.
- Once an entity is **Under Watch**, its flag persists across meetings **until its health returns to Green**.
- Weekly status meetings prioritize prepared exceptions first, then continue by workstream and WBS order.

## Design direction, not yet a requirement
Treat a task's **execution status**, its **delivery health/risk**, its **Under Watch lifecycle**, and **whether discussed in a particular meeting** as different concepts. A single TaskStatus column cannot safely represent all four.

### 1. Risk signals, with independent origins
- **Automatic schedule signal:** condition-derived warning for a credible timeline impact. Proposed candidates include late milestones, overdue work and forecast/dependency impacts; **do not assert an algorithm, severity threshold or forecast capability before requirements are approved**. Existing Needs Attention counters may inform candidates but do not implement full risk analytics.
- **Manual stakeholder/context signal:** an operator flags a risk based on communications, including a short reason and optionally affected deadline/impact, stakeholder source reference and last-reviewed time. Do **not** assume the application monitors Teams, Outlook, email or other stakeholder channels; user manually logs relevant information. Protect confidential information.
- A single task can have **both** sources. Multiple reasons must remain understandable; one resolved reason must not hide another active reason.

### 2. Persistent watch lifecycle
- **Not Watched** → **Under Watch** when any credible automatic or manually recorded active risk is present.
- **Under Watch** persists across successive weekly reviews, regardless of whether the item was discussed, its weekly priority rank, or whether a save occurred.
- **Cleared / Green** only when **all** relevant schedule signals have cleared **and** manually raised contextual risks are explicitly confirmed resolved (or an approved auditable equivalent).
- If a schedule risk clears but an unresolved manual context risk remains, **stay Under Watch**. Conversely, if the manual context resolves but schedule risk remains, **stay Under Watch**.
- Unknown/unchecked/stale risk state is **not safely equivalent to Green**. Flagged items should not silently disappear on failed or missing workbook data.
- Proposed state history (flagged time, origin, reason, update, clearance time and mechanism) must be specified against workbook architecture and audit obligations **before implementation**. Do not add columns or write behind the user's back.

### 3. Green / Amber / Red contract gap
The existing current workbook has a `TaskStatus` enum including **Not Started, In Progress, Completed, At Risk, Blocked, Cancelled**, but **no separate Green field**. A task being In Progress or having future dates does not establish Green. We should define **delivery health** separately from task workflow status, and the health rollup should not classify a manually flagged unresolved risk as Green.

**Approval needed later:** the precise definition of Green; whether operator confirmation is always required to remove a manual risk, and whether cleared watch history persists. The present Owner statement establishes *desired persistence* but is not approval for a new data-contract field, calculations, or persistence technology.

### 4. Meeting priority is a separate dimension
- **Under Watch** defines continued monitoring, not guaranteed top agenda position.
- **Prioritized for This Meeting** is a subset/order of watched issues chosen based on meeting consequence and need for discussion.
- **Discussed in This Meeting** can be displayed for avoiding duplicate discussion; it must **not** clear Under Watch or change TaskStatus.
- When the presenter switches from exceptions to workstream/WBS, the same task remains linked to the same entity. Display persistent watch and source context, without cloning or resaving the issue as a different task.

## UI concept and communication cues
- **Compact WBS row:** unobtrusive but legible watch indicator + number/type of active reasons (e.g. clock for schedule, flag for context); important labels available without hover or color-only reliance.
- **Exception review list:** readable `[Workstream] Task`, source(s), consequence, latest update, duration under watch and meeting priority, with a one-action route to task details. Visual ranking must not misrepresent uncomputed severity.
- **Task detail:** existing edit actions remain accessible; a distinct risk panel reveals active reasons, evidence/context summary, status and explicit confirmation of resolved contextual flags **only if later approved**.
- **Leadership Briefing:** surface decision-relevant watched items and their consequences, not every underlying warning; preserve drill-down.
- **Safe states:** unknown risk evidence, outdated source, stale workbook, no permission, an updated timeline that still has context flags, multiple concurrent risk reasons, and previously closed/reopened watch.

## Validation scenarios for future holistic mock
1. A task is automatically flagged for schedule impact, remains watched through two meetings, then becomes Green when the schedule condition reliably clears and there is no other active risk.
2. A stakeholder manually flags a risk while dates are on track; the task stays watched despite an otherwise healthy-looking schedule.
3. A task has both schedule and contextual risks; one clears; the task remains watched because the other risk is active.
4. A watched task is discussed in the exception phase, then encountered in its original workstream; the UI shows that it was discussed but does not falsely mark the risk resolved.
5. A watched task's data is stale, missing or ambiguous; do not silently mark Green or erase the flag.
6. Validate shared-screen readability, keyboard selection, manual flag/clear comprehension and provenance of changes using realistic synthetic project data.

## Open decisions for Product Owner discussion
1. **Meaning of Green:** Is it an explicit RAG-style delivery-health assessment separate from TaskStatus, or should Green be derived solely from defined risk checks plus explicit manual-context resolution?
2. **Who confirms context resolution?** Can the operator mark a manual risk resolved in one quick action with a reason, or is some other evidence/approval needed?
3. **Watch storage and audit:** persistent flag state requires an approved workbook/data architecture; no assumption that the existing Excel Managed Variant already contains it.

## Change-control boundary
Exploration only. Existing v18 baseline, Excel workbook schema, TaskStatus enum, frozen managed requirements, and authorized delivery activities remain unchanged. No implementation, merge, release or additional mandatory UI review triggered by this concept.
