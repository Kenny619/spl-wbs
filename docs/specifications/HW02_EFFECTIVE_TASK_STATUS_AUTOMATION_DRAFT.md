# SPT-WBS | HW-02 Calculated Effective Task Status — Functional Specification

**Date:** 2026-11-17 JST  
**Review state:** **Owner approved Option A (recorded vs effective status separation), the "no update currently recorded" safeguard, and HW-02 boundary/overdue Option A (0–5 inclusive working days; separate Overdue exception without auto-At Risk solely for lateness). Stale-update monitoring is deferred until after user testing. **HW-02 task-type Option A and the Completed/Cancelled terminal-dependency safeguard are also approved (2026-11-18).** Shared evaluation date, cross-view filter semantics and remaining data-quality edge cases are still draft.**  
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

- Apply this automatic near-finish At Risk predicate **only to active, scheduled leaf `Task` rows** with verified source/calendar, not Milestones or Summary rows (HW-02 task-type Option A approved). Exclude `Completed` and `Cancelled`. An independently recorded or validly inherited `Blocked` takes higher precedence.
- `remainingWorkdays` excludes weekends, verified Japanese public holidays, and the workbook's **committed project blackout dates**. Count future eligible workdays after the evaluation date through the finish date inclusive. The current managed code implements this counting, but the 0..5 policy and displayed effective status are **new draft requirements**.
- On finish date, count is 0 and falls inside the **approved** inclusive window for eligible Tasks. After finish date, display the **approved separate Overdue** exception; overdue **alone never creates effective At Risk**. Do not conceal independent recorded/inherited At Risk or Blocked.
- **Progress:** existing model allows nullable progress `0..100`; a missing percent is not assumed to be 0. However, `Not Started` or absence of update can independently trigger the rule.
- **No update ever entered — approved intent:** the safeguard targets tasks marked `In Progress` (and other otherwise-eligible statuses) that appear never to have received a meaningful task update. For current source evidence, use an **absent/blank substantive `ProjectWBS.Updates` value** (including whitespace or formatting-only empty rich text), not the `Modified` field, which is not an Updates timestamp. **Do not evaluate the age of an existing update.** A substantive update from any date satisfies the update-presence condition; other triggers (progress <50% or `Not Started`) still apply. Absence in today's workbook is evidence of **no update currently recorded**, not definitive proof that none was ever entered then removed. Do not invent historical provenance; an eventual audit-history-based 'ever' check requires separately verified source fields and policy. The owner explicitly **deferred stale-update/elapsed-time monitoring until after user testing**.
- If planned finish is missing/invalid, source workbook is unverified, holiday calendar coverage is incomplete, or a required committed blackout cannot be verified, show **calculation unavailable with explanation**, not an invented workday count or false At Risk/Green.
- A resolved or old Watch reason does not directly feed this calculation; independent Watch evidence remains visible and unchanged.


## 2A. Explicit Product Owner decision on update presence (2026-11-17)

**Decision:** `no update recorded` means **no substantive update is presently recorded**; use this as a practical failsafe for tasks moved into `In Progress` without evidence that anyone subsequently reviewed or updated them. An existing substantive update, **however old**, is sufficient to avoid the missing-update branch. The owner's goal is to catch *never-maintained-looking* tasks, **not** to add time-staleness rules before user testing.

**Important evidence qualification:** the existing ProjectWBS `Updates` field is optional and may contain rich-text markup. Empty, whitespace-only or formatting-only content must not count as an entered update. A nonempty meaningful update counts regardless of date. The existing `Modified` date does not timestamp a specific update. A workbook with a currently blank Updates field does not prove that an earlier update was never entered and later removed; the UI must say **`No update recorded`**, not `historically never reviewed` as a verified fact.

**Deferred:** Any `last review was X days ago`, `stale update`, `update freshness` timer, configurable age threshold, automatic notifications for old notes, or retrospective last-edit inference. Revisit only **after user testing** with separately approved evidence source and owner decision.

## 2B. HW-02 near-finish boundary and Overdue — Option A APPROVED (2026-11-18)

**APPROVED Option A:** use a **0–5 inclusive working-day** near-finish window and a **separate prominent Overdue exception**. Overdue does **not** automatically set the effective TaskStatus to At Risk **solely because the finish date has passed**. The original TaskStatus and independently recorded/inherited At Risk or Blocked remain authoritative or visible under their own rules. Summary/Milestone eligibility and the terminal-dependency guard are also now **approved in section 3A**; other evaluation-date/filter and incomplete-evidence details remain to review.

| Verified current-source condition | Proposed outcome | Source-write / health safeguards |
| --- | --- | --- |
| Scheduled active Task, **6 or more** workdays until finish | No **near-finish** derived At Risk flag | Preserve any source At Risk, source Blocked, inherited Blocked or independently recorded Watch reason. |
| Scheduled active Task, **0 through 5** workdays left (inclusive) and any owner trigger applies | Effective **At Risk** with attribution to all actual qualifying triggers | Source TaskStatus/Excel unchanged; never auto-RAG Amber. |
| Scheduled active Task, **0 through 5** workdays left and none of the owner triggers applies | Keep ordinary recorded effective TaskStatus, except higher-priority explicitly recorded or inherited Blocked/At Risk | This is not proof of project health Green. |
| Active Task with planned finish **before** project evaluation date | Show **Overdue** separately and prominently regardless of progress or note presence | **APPROVED:** do not convert to a persisted or effective At Risk solely because it is overdue; independently recorded/calculated/inherited At Risk and Blocked remain visible when supported by their own distinct reasons. |
| Task **Completed** / **Cancelled** | Exclude from new near-finish or overdue automation, retaining recorded final status | Show source contradictions and historical events where applicable, not a synthetic changed workbook status. |
| Summary row or Milestone / zero-duration item | **APPROVED:** Milestones show approaching/due date and separate Overdue plus independently recorded or inherited Blocked/At Risk, but **no calculated near-finish At Risk** from Not Started/blank progress/no Updates. Summary shows **child-sourced exceptions only**, without independent computed near-finish or Overdue status. | Do not treat blank Milestone progress as zero or double-count Summary rollups. |
| Invalid or missing finish, incomplete verified Japanese holiday calendar, or unverified committed shared blackout | Show **schedule evaluation unavailable** / evidence-quality note | Do not manufacture a precise workday count, At Risk, or Green. |

**Exact day-count contract:** use the existing `remainingWorkdays` semantics: count eligible working dates **strictly after the project evaluation date through the planned finish date inclusive**, excluding weekends, verified JP holidays and shared committed blackout dates. If finish equals today, classify as **0** and eligible for the near-finish rule (subject to actual trigger and valid evidence). A finish date before today is an **Overdue** branch, not `0` workdays. A future nonworking finish date can yield zero future eligible working days; retain the actual finish date for clarity instead of claiming the deadline is today. The proposed common business-date timezone is `Asia/Tokyo`, pending final owner acceptance; the user's per-device display timezone must not change the project-wide status calculation.

**Calculated-flag clearance principle for approved Option A** (specific edge cases pending): a five-day flag ceases if its own conditions are no longer met, the task becomes inactive, or a guarded source change moves the due date out of the qualifying horizon; the Overdue exception ends once the verified finish date is no longer in the past or the task becomes inactive. Both recompute read-only. Neither clearance resolves a Manual Watch reason, deletes a historical overdue period, overwrites explicit source At Risk/Blocked, or changes manually assessed RAG (including prior Red). The independent current and period reporting rules remain unchanged until an approved versioned Report 1.1 delta.

**Decision recorded:** Option A is selected. The alternative of deriving effective `At Risk` **from overdue alone** is **not approved**. Keep the overdue exception prominent and recalculate it from verified source, without Excel writes or auto-RAG.

## 2C. Owner-approval record — HW-02 window and overdue (2026-11-18)

The Product Owner explicitly **approved Option A** following a comparison of two choices: (A) `0–5` inclusive near-finish At Risk based on the three existing triggers, **plus a separate prominent Overdue signal that does not by itself change effective TaskStatus**, versus (B) Overdue also deriving effective At Risk. Option B was **not selected**. At Risk may still be recorded or independently calculated/inherited on an overdue task for another reason; that separate fact must not be hidden. Historical Watch reasons and assessed Red are unaffected. This earlier boundary/overdue approval is **now supplemented** by the separate owner approval of task-type Option A and terminal dependency safeguards in section 3A. Shared date/filter behavior and other incomplete-evidence cases remain open. No runtime/schema change is authorized.

## 3. Owner-proposed inherited Blocked rule (detail awaiting policy freeze)

- If task **A** has source `Blocked`, show any active successor that depends on A as **effectively Blocked**, including transitive validated Finish-to-Start relationships (A -> B -> C). Show `Blocked — inherited from A` with source TaskID/WBS link.
- Do **not** overwrite `ProjectWBS.TaskStatus` of B or C, silently create a Manual Watch reason, or write anything to Excel. Inheritance is source-attributed **effective status**.
- Derive edges from supported validated `PredecessorIDs`, **not** `ParentTaskID` WBS tree relationships. Do not infer unsupported dependency types, missing IDs or bad edges as valid blockers. Cycle-safe traversal is required; dependency errors must be surfaced and should not make false completed inferences.
- If multiple predecessors are Blocked, retain **every direct/root blocking source** and show an aggregated explanation; never let resolution of just one predecessor clear the other.
- Removing the source `Blocked` condition recomputes inherited flags, but only the flag whose causal chain is gone disappears. An independent manual Watch reason stays Open until an authorized person resolves it.
- Proposed precedence: existing recorded `Blocked` or inherited Blocked -> existing recorded `At Risk` -> calculated `At Risk` -> otherwise recorded status. `Completed` / `Cancelled` successors with a blocked predecessor need an explicit contradiction indicator, not silent rewriting; exact display behavior requires review.
- The proposal should not transform a successor from a persisted `Completed` into a newly persisted `Blocked` automatically. Partial/incomplete graph results should say the propagation is incomplete rather than implying every dependency is verified.

## 3A. HW-02 task-type Option A and terminal-dependency guard — APPROVED (2026-11-18)

**Decision status: APPROVED functional policy.** The owner explicitly approved **Option A including the common terminal-dependency safeguard**. This section complements the already-approved 0–5-day / separate Overdue policy. It authorizes **specification only**, not implementation.

**Verified baseline:** `TaskType` is one of `Summary`, `Task` and `Milestone`. Summary progress and dates roll up from children and are protected against direct edits; milestones are single-date items and typically have no meaningful percentage progress. Existing factual attention counters deliberately exclude Summary rows. Supported `PredecessorIDs` are explicit task-ID **Finish-to-Start** edges, not WBS parent/child links; bad references and unsupported dependency tokens are diagnosed and cannot be treated as verified causal paths.

| Source TaskType / recorded state | **Option A — owner-approved rule** | Why |
| --- | --- | --- |
| Active, scheduled **Task** with verified source/calendar | Use the **approved 0–5 inclusive** near-finish At Risk OR predicates, a separate Overdue exception once past due, and inherited Blocked from validated predecessor paths. | Leaf tasks carry meaningful progress and updates. |
| Active **Milestone** (valid one-day start = finish) | **Do not infer near-finish At Risk** from blank progress, absent Updates or default Not Started. Show due/approaching-date information and **separate Overdue** once past due. Explicit recorded At Risk/Blocked and validated inherited Blocked still apply. | Milestones are date checkpoints; missing percent or ordinary Not Started is not itself evidence of risk. An explicit blocker of a required predecessor remains meaningful. |
| **Summary** (derived parent) | No independently computed near-finish At Risk or Overdue, and do not propagate inherited Blocked through a Summary node. Instead surface its underlying child Task/Milestone exceptions with source links; retain separately recorded Summary status as source fact. | Summary dates and progress are calculated; flagging a parent again would double-count the same children. A Summary predecessor edge cannot be assumed to prove a leaf FS causal path. |
| **Completed** or **Cancelled** successor with Blocked predecessor | **Preserve terminal recorded status**. Show a source-attributed *dependency inconsistency* when appropriate (e.g., `Completed while predecessor A remains Blocked`), rather than converting effective status to Blocked. **Stop propagation of this root block through the terminal successor**; never falsely block its active downstream successors from this invalid causal chain alone. | A completed dependency may have been satisfied independently; a cancelled item terminates normal execution. This requires investigation, not an unaudited rewrite. |
| Active Task/Milestone with a validated active Blocked predecessor | Derive effective **Blocked**, preserving all independent root TaskIDs and any existing recorded At Risk reason, even across transitive eligible active successors. | Implements the owner's requested downstream block inheritance while retaining source. |
| Successor of **Cancelled** predecessor but no recorded Blocked | Show an unresolved/cancelled-predecessor dependency **diagnostic** rather than inventing a recorded/inherited Blocked. | Cancelled is a separate source status and not automatically identical to Blocked. |
| Unknown/invalid TaskType, missing IDs, unsupported dependency type, cycle or incomplete graph | Explicitly show a source-quality/dependency diagnostic. Propagate only through validated, cycle-safe causal paths; do not claim full completeness or invent upstream Blocked. | Prevent false flags or infinite traversals. |

**Option B was not selected.** Do **not** derive near-finish At Risk for a Milestone merely because it is `Not Started` within 0–5 working days; also do not infer it from blank Progress or Updates. The active Milestone still receives date/Overdue, recorded At Risk/Blocked and valid inherited Blocked as specified above.

**Approved precedence with terminal guard:** `Completed/Cancelled` terminal source status remains terminal, with contradictory dependency diagnostic. For eligible active Task/Milestone, `recorded Blocked or valid inherited Blocked` > `recorded At Risk` > `calculated near-finish At Risk (only where type policy permits)` > recorded ordinary status. A source `At Risk` is **never automatically cleared**. Under Watch reasons and assessed RAG are separate and cannot be modified by this projection.

**No automatic exception masking:** a blocked Task can independently be Overdue; show both separate facts. One predecessor releasing Blocked only clears that root. If a successor is already independently recorded Blocked, preserve it. When a terminal successor interrupts a chain, display the contradiction to the PM but do not infer a new Blocked status for successors reached *only* through that terminal item.

**Approval record:** the Product Owner explicitly approved **Option A, including** keeping Completed/Cancelled successors terminal, showing contradiction diagnostics and stopping inherited Blocked propagation **through** terminal successors. An independently source-Blocked terminal successor must not be used to reclassify the terminal state; if a downstream task has a separate valid active blocking source, retain that independent cause. **Still pending:** common evaluation date (proposed JST), filter defaults, PM acknowledgment/override and detailed incomplete-graph/source-quality handling. No source TaskStatus, Manual Watch, RAG, audit or Report 1.1 changes.

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
| HW02-06C | Active Task past its finish date, status In Progress, progress 90%, substantive update exists | Separate prominent Overdue exception; no effective At Risk derived **solely** from the overdue condition. Source/effective independent flags remain visible. |
| HW02-06D | Finish moved from overdue into future via guarded Save | Derived Overdue signal recalculates, but independent Manual Watch/Red history and saved schedule-change event persist. |
| HW02-06E | Future nonworking finish date with zero future eligible workdays | Preserve actual finish date and source quality; don't mislabel finish as today. |
| HW02-06F | Summary row, Milestone with no progress, and Completed Task | No unapproved threshold conversion of Summary/Milestone or inactive Task; existing date/status signals preserved. |
| HW02-07 | Blocked A -> dependent B -> dependent C | B/C effective Blocked with links to causal A; original Excel TaskStatus unchanged. |
| HW02-08 | Blocked A and D both precede B; A unblocked | B remains inherited Blocked through D. |
| HW02-09 | Source A unblocked; independent Watch reason on B still Open | Derived dependency block clears; B's Watch reason stays Open unchanged. |
| HW02-10 | Unsupported dependency, duplicate/missing ID or cycle | No invented verified propagation; display source/graph diagnostic. |
| HW02-10A | Milestone tomorrow, Not Started, no Updates and no progress | **Approved Option A:** upcoming date only; no new near-finish At Risk from Not Started, blank Updates or missing progress. |
| HW02-10B | Milestone yesterday, 0% Progress, In Progress | Prominent **separate Overdue**; no At Risk solely from being overdue or blank progress. |
| HW02-10C | Summary enclosing two At Risk children and one Overdue milestone | Show child-sourced exceptions/links; no independently generated Summary warning or triple count. |
| HW02-10D | Blocked A -> Completed B -> active C | B remains Completed with contradiction diagnostic; no inherited Blocked in C solely via terminal B. |
| HW02-10E | Blocked A -> active Milestone B -> active Task C | B/C inherited Blocked with root A provenance if all FS edges verified. |
| HW02-10F | Cancelled predecessor A -> active Task B, no independent Blocked | Show cancelled-predecessor diagnostic; do not invent Blocked. |
| HW02-10G | Blocked A -> B; B itself source Blocked; A unblocked | B remains Blocked due to its own source; active successors of B remain inherited Blocked from B. |
| HW02-11 | Same workbook/date/calendar opened by two users | Same effective values and explanations; independent theme/PGCM preferences irrelevant. |
| HW02-12 | Day boundary, verified holiday and committed blackout | Recomputed count and trigger on shared date basis; historical workbook bytes/audit unaffected. |
| HW02-13 | Explicit source At Risk with improved schedule | Remains At Risk until explicit source update; no automatic Green. |
| HW02-14 | Current report vs historical period output | Current calculated signal only after approved report delta; not backdated as prior event. |

## 7. Policy details still to confirm individually

1. **Threshold/window / overdue — APPROVED Option A:** `0–5 working days inclusive` for eligible leaf Tasks and **separate prominent Overdue** for active past-due Tasks/Milestones, without deriving effective At Risk from lateness alone. **Task-type eligibility and Completed/Cancelled dependency safeguard are also APPROVED** (section 3A). Do not re-ask either Option A decision.
2. **Update-presence rule — decided:** only the absence of a substantive recorded update triggers this branch; old-but-present updates **do not** trigger it. Apply only within the agreed near-finish rule. **Post-user-testing backlog:** revisit stale/aged update monitoring after actual user testing, with reliable update-specific timestamps and separate owner approval. No time-age threshold in initial delivery.
3. **Task-type and terminal dependency eligibility — APPROVED Option A:** near-finish At Risk on active scheduled leaf Tasks only; Milestones get dates/Overdue and recorded/validated inherited Blocked, not near-finish At Risk from Not Started or missing update/progress; Summary child-sourced exceptions only. Completed/Cancelled successors remain terminal; show dependency inconsistency and **stop** upstream inherited Blocked through them. Source `Unknown` remains task-data quality, never a RAG state. Further graph-invalid/source-quality specifics still need review.
4. **Propagation:** supported FS links, transitive paths, multiple-source provenance; contradictory completed/blocked successors and incomplete dependency graph.
5. **Time basis:** common Asia/Tokyo business date for consistency independent of users' display timezone; unavailable verified holiday coverage.
6. **UI/reports:** whether existing filters switch to effective value, and report placement after a separate delta.
7. **Manual acknowledgement/overrides:** whether authorized PM Mode can record a shared override, its expiration, reason and audit behavior.

## 8. Scope boundaries

**Approved now:** **Option A**, with recorded Excel status untouched and transparent effective status recomputed from verified workbook facts. This **does not** authorize automatically persisted TaskStatus changes, Watch reason changes, RAG determinations, RAG schema/migration, modifying existing status filters without acceptance, updating frozen Report 1.1, making code changes, initiating broader QA, merging or releasing. The detailed rule edge-cases in this draft are proposals to review with the Product Owner. Preserve prior Stage A/B functional acceptances, HW-01 RAG semantics, HW-05 password-gate direction and source Save/recovery safeguards.
