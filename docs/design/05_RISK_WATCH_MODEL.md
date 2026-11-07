# Persistent Risk Watch — Working Review Concept (proposed 0.3)

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

## Owner direction for health derivation (2026-11-07; exploration, not final approval)
The Product Owner selected **risk-driven delivery health for exploration** rather than manually setting a single Green/Amber/Red judgment. Core intention: **Green when all relevant automatic risk conditions have cleared AND each outstanding manually entered contextual risk has been explicitly resolved.** This selects a concept direction, not an authorized schema change, formula, threshold, save workflow or UI implementation.

### Proposed deterministic health semantics
| Health presentation | Candidate underlying logic | Under Watch |
| --- | --- | --- |
| **Green / Clear** | Risk checks are current, data is sufficiently trustworthy, **zero active automatic signals** and **zero unresolved manual contextual risks** | No |
| **Amber / At Risk** | One or more credible unresolved signals, but no defined critical-impact condition | Yes |
| **Red / Critical** | One or more signals meet a separately approved material-impact / criticality rule | Yes |
| **Unknown / Needs verification** | Source data or risk evaluation is missing, stale, invalid or otherwise cannot establish Green | Preserve prior watch; do not falsely mark Green |

*Amber/Red classification criteria remain unapproved*. Avoid a made-up overall risk score or artificial automatic severity. A 'Blocked' task or explicit At Risk status may be a signal input, but whether and how it maps to Amber/Red requires a separate rule. Completed and Cancelled have task-lifecycle semantics, not automatic proof of contextual risk resolution.

**Conservative Green predicate, for design discussion only:**

`Green = checksCompleteAndCurrent AND automaticActiveRisks.length === 0 AND manualUnresolvedRisks.length === 0`

**Key consequence:** a manually flagged stakeholder dependency is not cleared simply because the planned finish is in the future or a date has been moved. Manual contextual risk closure requires an explicit action with auditable rationale. If another source remains active, watch persists. A task can be `In Progress` and Green, Amber, Red or Unknown; this is separate from its `TaskStatus`.

### Automatic schedule signal integrity
An especially important ambiguity exists when a user moves a deadline. **Recalculating against the new planned date alone can incorrectly make a slipping task Green.** Explore preservation of original commitments / baselines, effective date-change history, and an impact/resolution acknowledgment. The present Excel Managed Variant does **not** automatically support a forecast engine or immutable project schedule baseline; do not present them as existing functionality. Prioritize discussion of this problem before specifying any date-impact algorithm.

### Reason-based watch history
Keep the watch at the **task level**, but maintain **independent reason-level state** with source (automatic vs manually flagged), explanation, opened/updated/cleared timestamps, author/action, and link to relevant schedule/source change when supported. Multiple manual reasons can coexist. One cleared signal must not collapse others. Clearing the final reason may transition health to Green only after reliable evaluation. Record prior watch episodes and reopen on new risk, avoiding uncontrolled oscillation or lost history. Data storage and audit semantics require explicit Product Owner approval.

### Concrete edge cases to test
1. Schedule is late; health Amber/Red under an approved severity rule, even with no manual flag.
2. Schedule is healthy, but stakeholder risk unresolved; **not Green**.
3. Both risk types active; schedule recovers; **still watched**.
4. Final manual risk explicitly resolved, schedule checks current and clear; **Green; Watch cleared with historical record**.
5. Planned finish moved out, yet commitment missed; **do not silently clear watch without evaluating baseline impact**.
6. Risk check unavailable because Excel/source data is incomplete; **Unknown / retain prior watch**, not artificially Green.
7. A discussed agenda item remains watched; meeting discussion status must not alter risk lifecycle.

### UI behavior implications for later mock concepts
- An exception row communicates **which risk reasons remain**, not only an unexplained red/amber badge.
- The selected task detail offers an explicit **Resolve context risk** interaction (if future data/permission contract is approved), never a direct magical 'Set Green' control.
- In leadership presentations, show the most consequential active risks with a readable reason and target impact; do not visually treat 'Under Watch' as 'Priority this week.'
- If Risk Health is Unknown, distinguish it clearly from Green while avoiding needless alarm.

## Owner direction: preserve original commitment impact, with low administrative burden (2026-11-07; exploration)
The Product Owner selected **preserve original commitment impact after date revisions** for exploration, with the additional constraint that *resolving risk must not become unnecessary administration*. This narrows the concept direction without approving an algorithm or an editable baseline field.

### Fundamental distinction: historical variance is not necessarily a current risk
Track three separate things:
1. **Reference commitment:** the last genuinely agreed target date and its provenance (not automatically the earliest spreadsheet date or the previous edit).
2. **Current plan:** the latest committed `PlannedStart` / `PlannedEnd` displayed in the schedule.
3. **Commitment change / unresolved consequence:** what moved relative to the agreed target, why, whether the change was accepted and whether any delivery risk still exists. Keep the history even when current health becomes Green.

`UpdateHistory` may supply a date-change audit trail but **does not establish that any date was approved as a commitment**. A new baseline/reference-commitment source and permission/audit rules, if needed, must be separately specified and accepted. There is no approved baseline field or forecast source in the current workbook.

### Competing approaches and recommendation
| Option | Strength | Failure mode |
| --- | --- | --- |
| Permanent original baseline as an active risk | Never forgets original slip | Creates permanent false alarms after an accepted and fully mitigated change |
| Automatically replace reference date whenever `PlannedEnd` changes | Zero friction | Users can accidentally make missed commitments vanish from risk monitoring |
| **Versioned accepted reference commitment + independent impact evidence (recommended to explore)** | Historical accountability with current-health truth | Requires a low-friction acceptance and data-provenance design |

**Recommended principle:** an agreed target can be superseded **only through an explicit, traceable acceptance or replan decision** (not merely by editing the task date). The older benchmark and slippage stay visible in history. **Under Watch** reflects unresolved *current* risks/impacts, not every historical variance. Once all known risk reasons are truly resolved and data is reliable, the task may become Green **without erasing the variance record**.

### Minimal-friction user interaction hypothesis
- **Routine date editing:** keep existing task editor and explicit Save; do **not** add a second modal confirmation for every schedule change.
- **When the date differs from the reference commitment:** show a compact, contextual comparison (for example `Agreed Nov 10 → Planned Nov 20 · +10 calendar days`), while preserving user draft state. Use calendar-day semantics unless a separate workday contract is approved.
- **When a defined material/adverse impact is detected:** expose one inline `Review impact` affordance in the same task details flow. Proposed choices: `Still at risk` (default; remains watched) or `Revised commitment accepted, no unresolved impact` (explicit and auditable). Do **not** make vague `Ignore risk` or `Set Green` actions.
- **When a legitimate revised commitment is accepted:** keep the old reference and impact/change record, associate the new effective reference and rationale/evidence, and re-evaluate all remaining automatic and manual risk reasons. If none remain, Green follows automatically.
- **When a delay is recovered without changing the agreed reference:** automatic impact can clear when schedule checks establish recovery; an unrelated unresolved stakeholder risk keeps the task watched.
- **When the task is unaffected or change is nonadverse:** no extra click or dialog. Review prompts depend on thresholds and data quality **not yet specified**.
- **When acceptance authority or provenance is unknown:** label `Commitment not confirmed` or equivalent rather than manufacturing an approval; retain meaningful risk/unknown states. Who may record acceptance remains a product decision.

### Example (provisional illustration; not an approved schedule forecast)
- Original agreed finish: **Nov 10**. New planned finish: **Nov 20**.
- App shows `+10 days vs agreed commitment` and preserves the prior benchmark.
- If the delay is **still unaccepted or has unresolved consequence**, task stays Under Watch even though Nov 20 is in the future.
- If a **revised commitment is accepted** and there are **no remaining active schedule/contextual risk reasons**, health can become Green. Historical record still shows the 10-day slippage.
- If a vendor sign-off remains unresolved, health **cannot** become Green even after the new commitment is accepted.
- A change from Nov 10 to Nov 20 does not itself imply **10 workdays** or a defined Red severity; those require their own contracts.

### Risk model separation
The task's active health is derived from **current, sufficiently reliable risk signals** plus explicit manual-context resolution. A **historical variance record** persists for accountability even when the corresponding active risk is cleared. An **unreviewed adverse commitment change** can itself be an active risk reason, not just a historical statistic. `Under Watch` and `Prioritized for today's meeting` remain separate; closing a meeting never clears either risk reason automatically.

### Validation and UX critique for the later holistic mock
1. A nonadverse date edit takes no additional UI steps beyond current Save.
2. A material adverse date change shows an understandable date comparison and impact review **without a disruptive modal chain**.
3. Accepting a genuinely mitigated replan takes at most one compact decision beyond normal editing (candidate UX target, not a binding count).
4. The historical benchmark and reason are findable after a task returns to Green, without making Green look like Red.
5. A schedule improvement clears schedule risk but does **not** clear open contextual risk.
6. Two separate accepted replans preserve versioned provenance; a new target does not silently overwrite an older target.
7. A task without an agreed reference or reliable evaluation is not falsely reported Green or shown as having an approved benchmark.
8. A date edit that shifts a dependent milestone is not falsely marked harmless; actual impact inference must be supported by an approved and verified dependency/forecast model.

### Open decision requiring Product Owner input
**What constitutes acceptance of a revised commitment?** Possible models: (A) the project operator can confirm an accepted change during a weekly working review, with a concise reason; (B) an explicit external approval must be recorded as a reference before the watch clears; (C) hybrid, based on impact severity. This is separate from routine Save and must not imply unauthorized role approval.

## Change-control boundary
Exploration only. Existing v18 baseline, Excel workbook schema, TaskStatus enum, frozen managed requirements, and authorized delivery activities remain unchanged. No implementation, merge, release or additional mandatory UI review triggered by this concept.
