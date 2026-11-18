# SPT-WBS | HW-02 Calculated Effective Task Status — Functional Specification

**Date:** 2026-11-17 JST  
**Review state:** **Owner approved Option A (recorded vs effective status separation) and explicitly selected the "no update ever entered" safeguard. Stale/time-based update monitoring is deferred until after user testing. Other trigger/clearance edge cases remain draft until separately reviewed.**  
**Related:** [Health lifecycle Issue #82](https://github.com/Kenny619/spl-wbs/issues/82), [HW-01 RAG taxonomy owner decision](https://github.com/Kenny619/spl-wbs/issues/82#issuecomment-6949427305), [HW-05 PM password-gate draft PR #100](https://github.com/Kenny619/spl-wbs/pull/100), [Stage B accepted factual attention PR #92](https://github.com/Kenny619/spl-wbs/pull/92).

## 1. Explicitly approved Option A

1. **Recorded task status** comes from the workbook's `ProjectWBS.TaskStatus`. It must remain unchanged by automatic schedule/dependency calculations. The workbook, preserved historical audit events and guarded Save operations remain the source of truth.
2. **Effective task status** is a **read-only, calculated projection** for a specified verified workbook snapshot, selected evaluation date, validated schedule/calendar context, task updates/progress and supported predecessor graph. The UI must show the original value and each underlying calculation reason.
3. Every view consuming derived status (Schedule, Needs Attention, Task Detail, Meeting Review and, following separately approved report delta, Reports) should use **one shared pure projection**, not independent formulas with inconsistent outcomes.
4. No derived status is silently persisted to Excel, written into `UpdateHistory` or `ProjectAudit`, or represented as a manually saved transition. Computed warnings are recalculated when the verified source or evaluation date changes.
5. **TaskStatus is not assessed RAG health.** The approved HW-01 health taxonomy is exactly Red/Amber/Green: Red concerns identified project impact even after underlying issue resolution; Amber concerns possible impact from a risk; Green requires no observed issue/risk. No derived `At Risk` or `Blocked` alone certifies Red/Amber/Green, no automatic Green, and no `Clear`/`Unknown` as RAG health badge. An existing source TaskStatus `Unknown` remains a *task-data parsing/display value* under the existing import contract, not a fourth RAG outcome.
6. All users with **the same committed workbook bytes and the same evaluation date/calendar coverage/rules** must get the same projection, independent of user layout/theme/display preferences or whether PM Mode is unlocked. A calculation can change the next business day without a workbook Save; it is not a synchronized, persisted event.

## 2. Owner-proposed automatic At Risk rule (detail awaiting policy freeze)

**Owner direction:** raise `At Risk` when a task is near its planned finish and ANY of three conditions holds: progress under 50%, recorded status `Not Started`, or no task update recorded.

**Recommended explicit predicate** (not yet separately accepted in every edge case):

`0 <= remainingWorkdays(task.plannedEnd, evaluationDate) <= 5 AND (progress < 50 OR recordedStatus = Not Started OR noRecordedUpdate)`.

- Apply to scheduled, non-Summary, active tasks (Task/Milestone eligibility requires final review), excluding `Completed` and `Cancelled`; an already explicitly or inherited `Blocked` task stays Blocked at higher precedence.
- `remainingWorkdays` excludes weekends, verified Japanese public holidays, and the workbook's **committed project blackout dates**. Count future eligible workdays after the evaluation date through the finish date inclusive. The current managed code implements this counting, but the 0..5 policy and displayed effective status are **new draft requirements**.
- On finish date, count is 0 and it falls inside the proposed window; after the finish date, maintain a **distinct overdue signal** rather than quietly treating an overdue task as normal. Whether overdue additionally becomes effective `At Risk` must be approved; do not conceal overdue.
- **Progress:** existing model allows nullable progress `0..100`; a missing percent is not assumed to be 0. However, `Not Started` or absence of update can independently trigger the rule.
- **No update ever entered — approved intent:** the safeguard targets tasks marked `In Progress` (and other otherwise-eligible statuses) that appear never to have received a meaningful task update. For current source evidence, use an **absent/blank substantive `ProjectWBS.Updates` value** (including whitespace or formatting-only empty rich text), not the `Modified` field, which is not an Updates timestamp. **Do not evaluate the age of an existing update.** A substantive update from any date satisfies the update-presence condition; other triggers (progress <50% or `Not Started`) still apply. Absence in today's workbook is evidence of **no update currently recorded**, not definitive proof that none was ever entered then removed. Do not invent historical provenance; an eventual audit-history-based 'ever' check requires separately verified source fields and policy. The owner explicitly **deferred stale-update/elapsed-time monitoring until after user testing**.
- If planned finish is missing/invalid, source workbook is unverified, holiday calendar coverage is incomplete, or a required committed blackout cannot be verified, show **calculation unavailable with explanation**, not an invented workday count or false At Risk/Green.
- A resolved or old Watch reason does not directly feed this calculation; independent Watch evidence remains visible and unchanged.


## 2A. Explicit Product Owner decision on update presence (2026-11-17)

**Decision:** `no update recorded` means **no substantive update is presently recorded**; use this as a practical failsafe for tasks moved into `In Progress` without evidence that anyone subsequently reviewed or updated them. An existing substantive update, **however old**, is sufficient to avoid the missing-update branch. The owner's goal is to catch *never-maintained-looking* tasks, **not** to add time-staleness rules before user testing.

**Important evidence qualification:** the existing ProjectWBS `Updates` field is optional and may contain rich-text markup. Empty, whitespace-only or formatting-only content must not count as an entered update. A nonempty meaningful update counts regardless of date. The existing `Modified` date does not timestamp a specific update. A workbook with a currently blank Updates field does not prove that an earlier update was never entered and later removed; the UI must say **`No update recorded`**, not `historically never reviewed` as a verified fact.

**Deferred:** Any `last review was X days ago`, `stale update`, `update freshness` timer, configurable age threshold, automatic notifications for old notes, or retrospective last-edit inference. Revisit only **after user testing** with separately approved evidence source and owner decision.

## 2B. HW-02 near-finish boundary and overdue proposal — awaiting owner decision (2026-11-18)

**Recommended choice: 0–5 inclusive working days for At Risk, with overdue as a separate visible exception.** This section is a **proposed explicit policy**, not a newly approved decision.

| Verified current-source condition | Proposed outcome | Source-write / health safeguards |
| --- | --- | --- |
| Scheduled active Task, **6 or more** workdays until finish | No **near-finish** derived At Risk flag | Preserve any source At Risk, source Blocked, inherited Blocked or independently recorded Watch reason. |
| Scheduled active Task, **0 through 5** workdays left (inclusive) and any owner trigger applies | Effective **At Risk** with attribution to all actual qualifying triggers | Source TaskStatus/Excel unchanged; never auto-RAG Amber. |
| Scheduled active Task, **0 through 5** workdays left and none of the owner triggers applies | Keep ordinary recorded effective TaskStatus, except higher-priority explicitly recorded or inherited Blocked/At Risk | This is not proof of project health Green. |
| Active Task with planned finish **before** project evaluation date | Show **Overdue** separately and prominently regardless of progress or note presence | **Do not silently convert to a new persisted or effective At Risk** solely because it is overdue under the recommended option; recorded and inherited Blocked/At Risk remain visible. If owner chooses an overdue-derived At Risk status instead, this requires a separate explicit choice. |
| Task **Completed** / **Cancelled** | Exclude from new near-finish or overdue automation, retaining recorded final status | Show source contradictions and historical events where applicable, not a synthetic changed workbook status. |
| Summary row or Milestone / zero-duration item | **Do not apply progress/note-based near-finish automation by default** until the task-type-specific rule is explicitly approved; existing milestone dates and legitimate overdue exceptions remain independently visible | Never treat a missing milestone progress value as 0%; don't turn a Summary roll-up into independently flagged leaf task without a source-backed rule. |
| Invalid or missing finish, incomplete verified Japanese holiday calendar, or unverified committed shared blackout | Show **schedule evaluation unavailable** / evidence-quality note | Do not manufacture a precise workday count, At Risk, or Green. |

**Exact day-count contract:** use the existing `remainingWorkdays` semantics: count eligible working dates **strictly after the project evaluation date through the planned finish date inclusive**, excluding weekends, verified JP holidays and shared committed blackout dates. If finish equals today, classify as **0** and eligible for the near-finish rule (subject to actual trigger and valid evidence). A finish date before today is an **Overdue** branch, not `0` workdays. A future nonworking finish date can yield zero future eligible working days; retain the actual finish date for clarity instead of claiming the deadline is today. The proposed common business-date timezone is `Asia/Tokyo`, pending final owner acceptance; the user's per-device display timezone must not change the project-wide status calculation.

**Recommended calculated-flag clearance:** a five-day flag ceases if its own conditions are no longer met, the task becomes inactive, or a guarded source change moves the due date out of the qualifying horizon; the Overdue exception ends once the verified finish date is no longer in the past or the task becomes inactive. Both recompute read-only. Neither clearance resolves a Manual Watch reason, deletes a historical overdue period, overwrites explicit source At Risk/Blocked, or changes manually assessed RAG (including prior Red). The independent current and period reporting rules remain unchanged until an approved versioned Report 1.1 delta.

**Alternatives to decide:** (A, recommended) separate persistent Overdue signal with recorded/effective TaskStatus otherwise governed by source and inherited flags; or (B) make Overdue also derive effective `At Risk`, retaining an equally prominent `Overdue` reason, with explicit precedence and no workbook write. Both keep past-due evidence and do not auto-RAG Red/Amber.

## 3. Owner-proposed inherited Blocked rule (detail awaiting policy freeze)

- If task **A** has source `Blocked`, show any active successor that depends on A as **effectively Blocked**, including transitive validated Finish-to-Start relationships (A -> B -> C). Show `Blocked — inherited from A` with source TaskID/WBS link.
- Do **not** overwrite `ProjectWBS.TaskStatus` of B or C, silently create a Manual Watch reason, or write anything to Excel. Inheritance is source-attributed **effective status**.
- Derive edges from supported validated `PredecessorIDs`, **not** `ParentTaskID` WBS tree relationships. Do not infer unsupported dependency types, missing IDs or bad edges as valid blockers. Cycle-safe traversal is required; dependency errors must be surfaced and should not make false completed inferences.
- If multiple predecessors are Blocked, retain **every direct/root blocking source** and show an aggregated explanation; never let resolution of just one predecessor clear the other.
- Removing the source `Blocked` condition recomputes inherited flags, but only the flag whose causal chain is gone disappears. An independent manual Watch reason stays Open until an authorized person resolves it.
- Proposed precedence: existing recorded `Blocked` or inherited Blocked -> existing recorded `At Risk` -> calculated `At Risk` -> otherwise recorded status. `Completed` / `Cancelled` successors with a blocked predecessor need an explicit contradiction indicator, not silent rewriting; exact display behavior requires review.
- The proposal should not transform a successor from a persisted `Completed` into a newly persisted `Blocked` automatically. Partial/incomplete graph results should say the propagation is incomplete rather than implying every dependency is verified.

## 4. Shared projection and UI requirements

Conceptual fields (not an approved workbook schema): `taskId`, `recordedStatus`, `effectiveStatus`, `derivedReasons[]`, `sourceTaskIds[]`, `remainingBusinessDays`, `evaluationDate`, `calendarCoverage`, `derivationQuality`. These are **in-memory** values.

- Default visible status may prioritize the effective value while keeping the source status and explanation inspectable in Task Detail and accessible label/tooltip; no color-only explanation. Indicate source as **Recorded**, **Calculated: near finish**, or **Inherited: dependency**, not falsely as an owner-entered change.
- Existing Needs Attention TaskStatus filters must distinguish a **recorded** value from the derived effective one. Whether the Status filter switches to effective matching by default is an outstanding UX choice; no implicit redefinition of previously accepted filter behavior.
- On a fresh workbook load, recompute based on verified bytes and the same deterministic date/calendar basis. Recompute on committed workbook reload and once when the evaluation date rolls over; do not make a browser-local override appear shared.
- For consistency across users, the evaluation date must be specified by one **project-wide timezone basis**, not an individual's optional display timezone. **Proposed for initial Japan-targeted scope: Asia/Tokyo (JST)**, pending confirmation; all clients should use that same clock date and authoritative calendar/blackout snapshot. Users loading at different moments near midnight may legitimately see different flags.
- No auto-Save, new ProjectData worksheet/column, audit log entry or historical status event follows from a pure derived warning. Source status changes remain under existing explicit edited-field Save; future RAG changes are controlled by HW-05 PM Mode once separately implemented and authorized.
- Reports require an **explicit versioned Report 1.1 delta** before derived signals enter current snapshot sections. Never backdate calculated flags into historical audit periods.

## 5. Lifecycle and clearance principles

- A near-finish At Risk flag ends only when no longer caused by its own qualifying conditions, or when task becomes inactive under the final policy. Do not clear an explicit source `At Risk` due to progress or an update; it needs a separate authorized source edit.
- Inherited Blocked ends only when **all active blocking causal paths** have ceased (or dependency changes remove those paths), not just one of several predecessors.
- Automatically recalculated status may **never resolve, reopen, erase or alter** recorded Watch reasons, imply that past Red impact is gone, or unilaterally certify project Green.
- Manual acknowledgment should be a **separate recorded/user-facing action only if later approved**. A local acknowledgment must not silently hide a shared effective warning or be misrepresented as an authenticated project-wide override. Any shared dismissal/override needs its own versioned persistence and audit contract.

## 6. Acceptance vectors — specification targets, not QA PASS

| ID | Scenario | Expected projection / invariant |
|---|---|---|
| HW02-01 | 5 workdays left, progress 49%, In Progress, update exists | Calculated At Risk with threshold explanation; source status unchanged. |
| HW02-02 | 4 workdays left, progress >=50%, status Not Started | Calculated At Risk, original Not Started visible. |
| HW02-03 | 0..5 left, progress >=50%, In Progress, no substantive Updates ever evidenced by current source | Calculated At Risk due to absent recorded update; Modified field irrelevant. |
| HW02-03A | 0..5 left, progress >=50%, In Progress, one substantive update entered long ago | No At Risk **from missing-update rule alone**; update recency monitoring deferred until after user testing. |
| HW02-03B | 0..5 left, progress >=50%, In Progress, blank/whitespace/formatting-only rich text Updates | Calculated At Risk due to no substantive update recorded; no fabricated 'last update' time. |
| HW02-03C | 0..5 left, progress 35%, In Progress, one substantive update entered long ago | At Risk **because of progress <50%**, not because the update is stale. |
| HW02-03D | Workbook Updates blank, but past update deletion cannot be disproven from verified source | Treat as absent **currently recorded** update; do not assert a proven never-ever historical fact. |
| HW02-04 | 6 verified workdays left, otherwise concerning progress | No **near-finish** auto flag; show any separate explicit/manual exception. |
| HW02-05 | Completed/Cancelled with old finish date | Do not auto-change saved status; preserve historical source and other independent facts. |
| HW02-06 | No finish / incomplete JP holiday coverage / invalid shared blackout | Calculation unavailable, no fabricated due-date judgment or Green. |
| HW02-06A | Today equals finish date, 35% complete, no substantive update | Zero remaining working days and calculated At Risk; project health unchanged. |
| HW02-06B | Verified six working days left, 35% complete | No *near-finish* calculated At Risk; recorded/inherited flags still visible. |
| HW02-06C | Active Task past its finish date, status In Progress, progress 90%, recent update | Separate Overdue exception regardless of progress/update; whether also effective At Risk awaits owner choice. |
| HW02-06D | Finish moved from overdue into future via guarded Save | Derived Overdue signal recalculates, but independent Manual Watch/Red history and saved schedule-change event persist. |
| HW02-06E | Future nonworking finish date with zero future eligible workdays | Preserve actual finish date and source quality; don't mislabel finish as today. |
| HW02-06F | Summary row, Milestone with no progress, and Completed Task | No unapproved threshold conversion of Summary/Milestone or inactive Task; existing date/status signals preserved. |
| HW02-07 | Blocked A -> dependent B -> dependent C | B/C effective Blocked with links to causal A; original Excel TaskStatus unchanged. |
| HW02-08 | Blocked A and D both precede B; A unblocked | B remains inherited Blocked through D. |
| HW02-09 | Source A unblocked; independent Watch reason on B still Open | Derived dependency block clears; B's Watch reason stays Open unchanged. |
| HW02-10 | Unsupported dependency, duplicate/missing ID or cycle | No invented verified propagation; display source/graph diagnostic. |
| HW02-11 | Same workbook/date/calendar opened by two users | Same effective values and explanations; independent theme/PGCM preferences irrelevant. |
| HW02-12 | Day boundary, verified holiday and committed blackout | Recomputed count and trigger on shared date basis; historical workbook bytes/audit unaffected. |
| HW02-13 | Explicit source At Risk with improved schedule | Remains At Risk until explicit source update; no automatic Green. |
| HW02-14 | Current report vs historical period output | Current calculated signal only after approved report delta; not backdated as prior event. |

## 7. Policy details still to confirm individually

1. **Threshold/window / overdue — owner decision pending:** recommend `0–5 working days inclusive`, with a distinct, persistent **Overdue** exception for active past-due tasks instead of automatically converting solely overdue tasks to effective At Risk; alternate is derived At Risk plus separate Overdue reason. Summary/Milestone and zero-duration eligibility remains a separate accepted rule to finalize.
2. **Update-presence rule — decided:** only the absence of a substantive recorded update triggers this branch; old-but-present updates **do not** trigger it. Apply only within the agreed near-finish rule. **Post-user-testing backlog:** revisit stale/aged update monitoring after actual user testing, with reliable update-specific timestamps and separate owner approval. No time-age threshold in initial delivery.
3. **Eligibility:** Task vs Milestone vs Summary; explicit Completed/Cancelled precedence and source `Unknown` as task-data quality.
4. **Propagation:** supported FS links, transitive paths, multiple-source provenance; contradictory completed/blocked successors and incomplete dependency graph.
5. **Time basis:** common Asia/Tokyo business date for consistency independent of users' display timezone; unavailable verified holiday coverage.
6. **UI/reports:** whether existing filters switch to effective value, and report placement after a separate delta.
7. **Manual acknowledgement/overrides:** whether authorized PM Mode can record a shared override, its expiration, reason and audit behavior.

## 8. Scope boundaries

**Approved now:** **Option A**, with recorded Excel status untouched and transparent effective status recomputed from verified workbook facts. This **does not** authorize automatically persisted TaskStatus changes, Watch reason changes, RAG determinations, RAG schema/migration, modifying existing status filters without acceptance, updating frozen Report 1.1, making code changes, initiating broader QA, merging or releasing. The detailed rule edge-cases in this draft are proposals to review with the Product Owner. Preserve prior Stage A/B functional acceptances, HW-01 RAG semantics, HW-05 password-gate direction and source Save/recovery safeguards.
