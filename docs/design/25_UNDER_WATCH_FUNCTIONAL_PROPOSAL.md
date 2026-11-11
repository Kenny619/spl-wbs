# Under Watch — functional contract proposal WATCH-0.1 (OWNER DIRECTION SET; NOT FROZEN)

**Prepared:** 2026-11-11 JST · **Controlling issue:** [#25](https://github.com/Kenny619/spl-wbs/issues/25)  
**Earlier design discovery:** [Risk Watch Model 0.4](05_RISK_WATCH_MODEL.md); [DES-012 visual approval](22_DES012_REVIEW08_OWNER_DESIGN_APPROVAL.md).  
**Current authorized state:** Excel Managed v1 contains **TaskStatus**, dates, relationships, saved field history and genuine workbook safety mechanisms, **not** independent persistent watch reasons, audited RAG health, accepted commitments or baseline models. This proposal does not change frozen #3–#7 or authorize implementation.

> **Owner decision (2026-11-11): [WATCH-D01 = A, WATCH-D02 = A, WATCH-D03 = A, MR-D01 = B](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6786902711).** Shared, auditable project watch state is required so **one person's update is visible to all project members**. Initial health must be reason-backed Watch/Clear/Unknown (not invented Red/Amber), and clearance must use the low-administration Resolve / accepted revised commitment model. **The owner also decided to withhold Meeting Review functionality until real Under Watch is designed and integrated.**
>
> These are **owner-selected product directions**, not approval of a storage technology, schema, authentication method, automatic alert thresholds, workbook mutation, risk severity model or feature implementation. A local workbook copy does *not* itself guarantee concurrent cross-user visibility. [Decision record](26_2026-11-11_FUNCTIONAL_RECONCILIATION_OWNER_DISPOSITION.md).

## 1. Already aligned product intent — do not discard

1. Detect **credible timeline-impacting risks automatically** and permit **contextual stakeholder risks manually**; neither substitutes for the other.
2. **Under Watch persists** across reviews until reliable current health is Green; no automatic clearing because a meeting ended, a task was discussed, progress changed or a planned finish was moved.
3. **Green** requires completed/current automatic checks with **zero active automatic signals and zero unresolved manual reasons**. Unknown/missing/stale evidence is **Unknown, not Green**. A task can be In Progress and Green/Under Watch/Unknown independent of TaskStatus.
4. Multiple risks for the same task stay independently attributable. Clearing one source never hides remaining sources.
5. An agreed commitment's impact is retained after a revised plan, with **minimal administration**. A date change is NOT implicit approval of a new baseline; preserve old commitment, new commitment and acceptance provenance.
6. The application does not read Teams/Outlook stakeholder communications automatically. Manual contextual reasons are entered by operator; the app must not claim their existence without an approved source.
7. **Under Watch ≠ prioritized for this meeting ≠ discussed in this meeting ≠ TaskStatus At Risk/Blocked**.

These are **owner-endorsed design directions**, not a frozen workbook or risk-scoring spec.

## 2. Proposed domain semantics

### Immutable identity / reason-level lifecycle

Use existing stable **TaskID** as parent identity, with zero or more separately identifiable **Watch reasons**:

| Datum | Purpose / proposed rule |
|---|---|
| Reason ID, TaskID | Stable link to task and independent reason |
| Origin | Automatic schedule check OR manually entered contextual reason |
| Evidence reference, summary | Human-readable source and consequence; no fabricated cause |
| Opened/last-reviewed/cleared | Auditable state changes and display timezone |
| Active / Resolved / Unknown evidence | Never erase a reason; keep its history |
| Owner/actor/decision | Record explicit review/resolution/commitment acceptance where permitted |
| Accepted reference commitment | Separate from current PlannedEnd, versioned with source/approval provenance |
| Current plan | Persisted task PlannedStart/PlannedEnd from actual ProjectWBS, not a new hidden date |
| Watch status and calculated health | Derived from trustworthy reason and check data, **not a manually set magical Green field** |

**Storage, validation and exact audit schema are NOT approved.** In particular, UpdateHistory field edits alone do not prove reference-commitment approval, and current TaskStatus does not contain a risk reason.

### Conservative lifecycle

`NOT WATCHED` → `UNDER WATCH` when at least one verified active reason exists.  
`UNDER WATCH` persists if any reason remains active or if an existing watch cannot be safely re-evaluated.  
`UNDER WATCH` → `CLEAR / GREEN` **only** when required checks are current and all automatic signals and manual reasons have cleared.  
`UNKNOWN` retains prior watch and carries an evidence warning rather than resetting a record.

**Do not automatically treat Completed, Cancelled, newly re-dated or "no current At Risk status" as Green.** Preserve watch episodes and allow later reopening with new reasons.

### Minimal-friction interactions (proposed, no new HTML controls approved)

- Existing task editing remains unchanged for ordinary nonadverse date updates, with one explicit Save. A moved due date itself never clears a reason.
- A manually flagged risk may be **resolved in one contextual action** when genuinely resolved; preserve who/when, original reason and optional short resolution note or approved structured rationale. Re-evaluate all remaining risks automatically.
- Where a material scheduled commitment impact exists, show a compact comparison of **Accepted target vs Current plan**; request explicit **Accept revised commitment** only when needed, capturing actor/time and auditable reference, not a second confirmation for every edit.
- Do not add generic **Set Green**, **Ignore risk**, speculative Red/Amber severity selectors or artificial completion percentages.
- Display active reasons and evidence within the approved inspector/layout only after separate design change control for this new content.

## 3. Automatic signals — evidence boundaries

Automatic watch should be based on **specified testable conditions**, not invented forecasting:

- Candidate low-complexity source: incomplete overdue tasks with a reliable due date/calendar (existing date model) or credible departure from a previously accepted reference commitment. This is a **proposal**, not currently a frozen risk trigger.
- Dependency impact forecasts, critical path, accepted replan thresholds, holiday/blackout source, and what constitutes critical **Red** versus cautionary **Amber** require explicit specifications/evidence. A revised current date without accepted reference is insufficient to mark a commitment fully recovered.
- When committed source, holiday coverage, reference approval or risk check is missing: display **Unknown/Needs verification**, not fabricated Green/Red.
- Existing Status At Risk / Blocked may be shown as **current operational exceptions**, but they must not be misrepresented as separately persisted Under Watch lifecycle or actual manual RAG.

## 4. Persistent storage / safety architecture (open)

Recommended product direction: **project-portable persistence**, reviewed alongside managed workbook architecture, rather than browser-local watch entries that disappear on another device. A candidate is a separately validated workbook-owned watch/commitment data surface or explicit compatible companion data format, but **neither is approved**.

Before coding, architecture must establish:
- Does it change/add a worksheet, field, sidecar or browser-local object? Compatibility with frozen [#3 workbook contract](https://github.com/Kenny619/spl-wbs/issues/3), optional custom columns, preflight, Save/Save As, versioned audit, backups, concurrent edits and readback.
- Actor/source identity and how to avoid unauthorized overwrites, stale states and partial writes; no external service assumption.
- Timezone is for presentation; original risk/acceptance instants remain canonical.
- Existing SharePoint read-only variant continues to run without workbook write features.
- Migration of existing workbooks without risk metadata must not silently classify every task Green or fabricate an original accepted commitment.
- Report 1.1 includes verified RAG only if a real supported source exists; no automatic report redesign or risk schema injection into frozen #7.

## 5. Acceptance scenarios after distinct owner freeze & implementation authorization

1. Automatic timeline signal opens watch, persists through two review sessions, clears only with trustworthy evaluation and no other active reason.
2. Manual stakeholder context opens watch while dates appear healthy; cannot go Green until explicit resolution.
3. Two concurrent reasons; first cleared; still watched. Second cleared + checks current; clear with history preserved.
4. One revised PlannedEnd fails to change accepted reference silently; impact remains until distinct acceptance/mitigation is recorded, while original target remains audit-visible.
5. Source/coverage unavailable; watch retained and rendered Unknown. Recover source; re-evaluate without data loss.
6. Task selection/history across Schedule/Meeting/Reports does not forge write transactions or conflate meeting discussion with risk clearance.
7. Save/Save As failure, conflict, invalid worksheet or read-only mode preserve original data and explicit errors.
8. Permission/keyboard/screen-share/accessibility checks and both light/dark themes at the approved inspector width.

## 6. Owner-selected directions — functional details still to freeze

**WATCH-D01 — persistence owner**  
A **OWNER-SELECTED**: Project-portable, auditable watch/commitment state, with exact workbook/companion storage decided in a separate safe architecture review; do not ship local-only watch as the true shared register.  
B: Browser-local watch as an explicitly personal aid; not portable/team-shared. If B, it cannot be presented as project-wide risk truth.

**WATCH-D02 — initial severity policy**  
A **OWNER-SELECTED**: First deliver **Watch / Clear / Unknown** with reason provenance; add Red/Amber only after criticality thresholds and source facts are approved. Preserve existing TaskStatus labels independently.  
B: Include a separately specified manual severity source from day one, with its own audit/storage/permissions contract. No implied Risk score.

**WATCH-D03 — low-administration clearance**  
A **OWNER-SELECTED**: Explicit context-risk **Resolve** action with actor/time, original reason and lightweight rationale, plus contextual **Accept revised commitment** when material; re-evaluate all reasons automatically.  
B: Require additional structured approval steps for every risk/commitment resolution, with a separately defined authority model.

**WATCH-D04 — delivery sequence**  
A **REJECTED as written**: Freeze data/safety architecture independently, implement watch in a separate future feature branch after accepted Meeting Review core (if approved), then integrate watch indicators into the protected design under design change control.  
B **OWNER-SELECTED via MR-D01**: Hold Meeting Review until watch architecture is complete, then implement together.

**Disposition:** Watch A/A/A and integrated Meeting Review sequencing are directionally approved, but the shared source, exact schema, permission rules, actor identity, conflict handling, trigger conditions and thresholds remain open. Do not treat this as approval to add sheets, invent Green or begin production coding. Until then WATCH-0.1 remains a proposal.
