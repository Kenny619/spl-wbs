# SPT-WBS Health Lifecycle | Stage B Functional Freeze Candidate

**Version:** HW-FUNC-0.3 — **CANDIDATE, NOT FROZEN** (HW-03 Option A approved, 2026-11-18 JST)  
**Prepared:** 2026-11-18 JST  
**Owner instruction:** Continue Stage B specification closure after acceptance of the Stage B usability integration. This authorizes **drafting and decision reconciliation**, not unreviewed policy assumptions, schema changes, application implementation or release.  
**Controlling issue:** [#82](https://github.com/Kenny619/spl-wbs/issues/82)  
**Companion detail:** [HW-02 task-status draft PR #101](https://github.com/Kenny619/spl-wbs/pull/101), [HW-05 PM Mode draft PR #100](https://github.com/Kenny619/spl-wbs/pull/100), and [decision vectors PR #84](https://github.com/Kenny619/spl-wbs/pull/84).  

## 1. Scope / evidence hierarchy

The system must distinguish **four independent facts**:
1. **Recorded task execution state:** `ProjectWBS.TaskStatus`; persisted, manually edited through accepted guarded Save, with normal update-history evidence.
2. **Effective task execution state:** a **read-only, deterministic computed projection** with recorded status, evaluated conditions, source TaskIDs, evaluation date and confidence; never automatically written to Excel.
3. **Under Watch reason lifecycle:** every source-backed, separately identified Manual reason with Open/Resolved lifecycle and historical audit; future Reopen must preserve old transitions. Independent reasons cannot be silently cleared by any unrelated signal or a change to effective task status.
4. **Assessed health:** three **RAG-only** states, Red/Amber/Green, carrying reviewer decision and actual evidence *only when a valid source and approved schema make such an assessment available*. Lack of valid assessment is an **evidence availability condition**, not a fourth health state.

All users loading identical committed workbook bytes and evaluating with the same project date and verified calendar/rules must see the same factual and effective results. Individual theme, local PGCM highlight, grid layout, history of files and PM Mode unlock **must not** change the shared project assessment.

## 2. Approved Product Owner decisions (binding direction)

| Topic | Recorded decision | Implementation restriction |
| --- | --- | --- |
| **HW-01** | **Red:** identified issue materially affects project scope/timeline/deliverables/cost/structure **even if the issue later resolves**. **Amber:** identified risk could affect those dimensions. **Green:** no issue/risk observed. | Obsolete `Unknown` / `Clear` as **RAG health statuses**; never manufacture a Green rating when evidence unavailable. The existing source TaskStatus `Unknown` is not a RAG rating. |
| **HW-02 Option A** | Keep workbook `TaskStatus` unchanged; use a read-only effective execution status with visible source/trigger provenance. | Do not save a computed flag to `TaskStatus`, `ProjectAudit`, `UpdateHistory` or Watch reason. |
| **HW-02 update presence** | `No update` means no substantive `Updates` content **currently recorded**. An old but meaningful update meets presence. | Defer stale/aged-update or review-recency thresholds until **after user testing**; generic `Modified` is NOT an update timestamp. Blank current source cannot prove update never existed historically. |
| **HW-02 other owner direction** | Within approximately **five working days** of finish, flag effective At Risk if progress <50%, recorded Not Started, or no substantive update. If a task is Blocked, propagate effective Blocked to successors. | Exact inclusive/overdue and exceptional-task semantics remain **proposed**, not owner-finalized. |
| **HW-03 Option A — Red reassessment** | Historical material project impact and the original Red record are **permanently retained**. The **current** Red health assessment may change only through **explicit PM reassessment with documented evidence and complete audit history**. | Reason resolution, schedule recovery, or disappearance of a calculated flag can **never** auto-downgrade Red or synthesize Green. Current Amber/Green must be justified using all independent issues and risks. Shared PM password is only a workflow gate; actor identity remains unverified. |
| **HW-05** | Lightweight PM password unlock before manual Watch Add/Resolve/future Reopen or future RAG edit. Read-only Watch/history remains available without unlock. | Shared password is only a workflow deterrent, **not** user authentication, file-level access control or protection against direct Excel write. Keep actor labels unverified. |
| **HW-07** | Preserve Under Watch Exception filter/list; emphasize current Under Watch items in Latest Status and Progress & Risks. | Final report content/layout **deferred** until task/Watch specifications finish; frozen Report 1.1/Manual Watch addendum unchanged. |

## 3. Schedule automation — review-ready defaults, NOT yet owner-approved

**P-HW02-1: inclusive near-finish rule — proposed, owner confirmation pending.** For a scheduled, active leaf Task with verified remaining working days **0 through 5 inclusive**, calculate At Risk if **any**: `Progress < 50`, `TaskStatus = Not Started`, or `Updates has no substantive content`. A missing `Progress` is **not zero**. The workday calculator excludes weekends, verified Japanese holidays and the **committed shared project blackout**, counting dates strictly after today through finish inclusive. Finish **today = 0**; finish in the past = **Overdue**, not a negative or zero remaining count. A future nonworking finish may yield 0 eligible workdays without meaning the finish is today. When source/holiday/blackout cannot be verified, show `Schedule evaluation unavailable`, never a guessed flag. Proposed shared evaluation date: **Asia/Tokyo**, independent of personal display timezone. **Recommended overdue treatment:** retain a distinct prominent `Overdue` exception regardless of progress or note presence; **do not additionally derive effective At Risk solely due to overdue** unless separately approved. Overdue can be cleared by valid source date correction or completion, without erasing a historical schedule-change event, independent Watch reason, or assessed Red. Alternative for explicit owner choice: add derived effective At Risk *and* the separate Overdue reason. The full policy table and acceptance variants are in [HW-02 draft PR #101](https://github.com/Kenny619/spl-wbs/pull/101), section 2B.

**P-HW02-2: precedence and eligibility.** Effective Blocked from an explicit recorded Blocked or any validated inherited blocking chain takes priority over an existing recorded At Risk, which takes priority over calculated near-finish At Risk; otherwise display recorded TaskStatus. Completed/Cancelled must retain their original status; a contradictory blocked predecessor on a completed successor is a visible dependency anomaly, not an automatic rewrite. Summary rollups, milestones and duration-zero tasks require explicit approved rules before implementation, not broad inference.

**P-HW02-3: transitive dependency propagation.** Supported validated Finish-to-Start `PredecessorIDs` graph: `A Blocked -> B effectively Blocked -> C effectively Blocked`. Preserve every independent root blocking source TaskID/WBS, including multi-parent paths, and display `Blocked — inherited from <source>`. Never infer a block along a WBS parent/child relationship. Unsupported relationship, missing IDs and cycles produce diagnostics instead of invented confirmed blockers. When root A ceases to be Blocked, remove **only its derived flag**; if root D or a Manual Watch reason remains, those independently persist.

**P-HW02-4: UX/filters.** One common source-attributed calculation feeds the applicable views; show calculated vs recorded label and an explanation without relying solely on color. Status filtering must not silently switch from recorded to effective semantics in already accepted reports/views; any UX mapping requires an explicit versioned addendum.

## 4. Under Watch reason lifecycle — HW-03 Red reassessment approved; other lifecycle details pending (HW-03/HW-04)

- One unique **ReasonID per independent reason**. Every reason has a subject TaskID, origin, concise nonempty title, actual evidence/description if provided, state, and saved transaction provenance. A reason is a factual risk/issue record, not automatically a Red/Amber assessment.
- **Add:** a PM-unlocked user adds an independently identified reason through the existing guarded, verified workbook Save. Duplicate intent/no-op cannot masquerade as a new audit event. Reason title mandatory (existing accepted behavior).
- **Resolve:** permitted only for a currently Open reason. Proposed: require a meaningful resolution note showing *what changed or was verified*; record factual timestamp and unverified actor label. Do not delete prior Open cause or automatically set Green.
- **Reopen (future operation):** permitted only for a Resolved reason, requires a new explanation/reason; preserve prior Open/Resolved chronology and original ReasonID plus new audit transition. The accepted five-sheet schema may not currently preserve this complete lifecycle without an independently approved extension.
- **No-op and conflicts:** resolving an already Resolved reason, reopening one already Open or making a stale-source transaction should never create a false audit event or success. Guard against concurrent writer changes, backup failure, unverified source, unsupported future schema, and recovery hold.
- **Multiple causes:** keep all active and resolved reasons. Resolution of A leaves B independently Open. A task with one documented Red-impact issue and an unrelated Amber-risk cause must not be collapsed by a last-write-wins rule or automatically downgraded from Red.
- **HW-03 Option A — APPROVED:** retain the historical Red assessment, underlying material-impact facts, prior reason states and audit events permanently. **Current Red persists** even after a reason is marked Resolved, until the PM performs an **explicit evidence-backed reassessment** and records a new current assessment through a verified guarded Save under the future approved health model. Never silently downgrade Red due to a reason being resolved, a schedule becoming healthy, or any automatic flag disappearing. A PM may reassess to Amber only when a supported potential-impact risk remains and no unresolved current material issue requires Red under the eventual assessment aggregation policy. A PM may reassess to Green only with sufficient recorded evidence that **no observed issue or risk remains** and other independent causes have been reviewed; no auto-Green from an empty/open-reason list alone. The precise cross-cause aggregation/eligibility rules remain an **HW-04 owner decision**.
- **Reassessment record requirement — APPROVED principle, exact schema pending:** preserve old/new RAG, decision timestamp, documented rationale and supporting evidence, linkage to affected reason(s) and recorded unverified actor provenance in append-only history. The prior Red record must remain visible and auditable. **No password-unlock event may be represented as authenticated identity or reviewer approval.** No current workbook field or new Write API is authorized by this document.
- **Reviewer authority:** HW-05 PM Mode gates Add/Resolve/future Reopen and assessed RAG edits. It cannot prove who is typing: no authenticated reviewer, signature or verified approval claim. Project member viewing remains unaffected.

## 5. Explicit assessed-RAG projection — proposed, NOT yet owner-approved (HW-04/HW-06/HW-08)

- **RAG is NOT TaskStatus.** `At Risk` is not automatically `Amber`, `Blocked` not automatically `Red`. Verified, source-backed manual health assessments control the RAG badge; computed schedule signals display alongside as supporting evidence, not stealth health edits.
- **Red over Amber / independent causes:** if an accepted manual assessment includes a material issue, preserve Red and the issue provenance even when a second independent Amber-risk cause is present. An explicit human reassessment is needed for changed assessed RAG. No implicit transition on just one reason resolving.
- **HW-03 Red-to-current-RAG guard (APPROVED):** the historical impact and prior Red remain retained even if a PM records a later different current assessment with documented evidence. The current badge is the **latest valid explicit PM assessment**, not an automatic lifecycle result. A later Green must be supported by a PM review establishing **no observed outstanding issue/risk across independent causes**; a residual potential-impact risk may support Amber subject to HW-04 aggregation; an unresolved material issue cannot be ignored. No Green from merely having no Open Manual Watch reasons, a healthy schedule, or missing data.
- **Missing/legacy/future/unverified source:** show **`Health assessment unavailable`** as a source-quality message, not a fourth RAG badge, and fail closed for health writes; preserve bytes. The currently used historical Watch display `Unknown` may be harmonized by a separately approved UI migration, never by silently rewriting report history or schema.
- **Common provenance:** include verified/unverified source quality, reason state, assessment origin, effective-status reasons and computation date separately. No fabricated timestamps or actor trust.

## 6. HW-05 password provisioning design options — proposal, NOT yet owner-approved

**Path A — project-scoped workbook verifier:** owner-controlled setup of a salted slow password verifier, stored under a *separately authorized versioned backward-compatible schema extension*. All clients reading the same project workbook can unlock using the shared password. **Limitation:** any file editor can replace/bypass verifier; copied verifier can be attacked offline. No plaintext password in Excel, source code or logs.

**Path B — device-local verifier:** no workbook schema change but every PM device must be manually provisioned; this does not synchronize password policy and can create inconsistent access. This option is less aligned with common project shared control.

**Suggested default for later owner decision:** Path A for consistent shared PM Mode, together with an explicit project-owner bootstrap, rotation/reset/recovery without backdoor, no persistent unlocked session, and suggested 15-minute idle relock. Do not create secrets or a new workbook tab now. Restrict ONLY manual Watch and RAG operations initially; other TaskStatus editing would require explicit separate approval. Already-approved Save conflict/backup/restore guards cannot be bypassed by entering a password.

## 7. Reporting and compatibility boundary (HW-07)

- Frozen Report 1.1 **Latest Status, Progress & Risks, Detailed Change Audit** and Meeting Review stay unchanged until **all task and Watch functional contracts** settle.
- Retain the existing Under Watch Exception filter and listings; make current open Watch items prominent in the two stakeholder summaries only after a **separate versioned Report 1.1 content delta** is approved.
- Always distinguish **current workbook fact** from **period-valid UpdateHistory event**, Open from Resolved, and unverified actor from authenticated identity. Preserve workstream grouping and HTML/plain/Outlook copy parity. Generate/Copy/Download never writes back to Excel.
- This document is NOT the Report 1.1 delta and cannot alter accepted report placements, status aggregation or historical event claims.

## 8. Synthetic acceptance vector appendix (spec targets; NO QA PASS)

| ID | Synthetic example | Invariant |
| --- | --- | --- |
| HC-01 | 5 working days left, progress 49%, update exists | Calculated effective At Risk, recorded TaskStatus unchanged; threshold pending final confirmation |
| HC-02 | 4 working days left, In Progress, 80%, blank rich-text Updates | Calculated At Risk because no substantive update |
| HC-03 | 4 days left, 80%, meaningful 6-month-old update | No missing-update trigger; age monitoring deferred |
| HC-04 | 6 working days left, 30% | No five-day calculated flag (other explicit status persists) |
| HC-04A | 0 days left, finish today, 40% | Near-finish effective At Risk under proposed inclusive rule |
| HC-04B | Active task past finish, with 95% progress and meaningful update | Prominent separate Overdue signal regardless of trigger; exact effective At Risk mapping awaits owner choice |
| HC-04C | Overdue date changed through guarded Save | Recalculate derived Overdue, retain schedule history and unrelated Watch/RAG |
| HC-04D | Future finish falls on nonworking date, computed remaining eligible days = 0 | Preserve true finish date and factual count, no false 'finishes today' statement |
| HC-05 | Blocked A -> B -> C, two independent roots feed B | Preserve transitive roots and original B/C recorded status |
| HC-06 | A unblocked but B has another blocked predecessor | B still effectively Blocked; don't erase other causes |
| HC-07 | Blocked A clears, B has open Manual Watch | Only effective blocker clears; Watch remains Open |
| HC-08 | Watch reason 1 Resolved while reason 2 Open | Reason 2 remains; all past entries retained |
| HC-09 | Previously material Red issue marked Resolved | Current Red remains, past impact permanently retained; **never automatic Green** |
| HC-09A | PM explicitly reassesses a resolved Red with evidence; no independent active issues/risks | Proposed current Green can be recorded under later authorized persistence design; preserve original Red and full transition audit; do not infer authenticated PM identity |
| HC-09B | PM reassesses after Red resolution but a separate potential-impact risk persists | May record current Amber only after evidence-backed review and owner-approved multi-cause aggregation; historical Red never disappears |
| HC-09C | Resolved Red followed by automatic schedule recovery without PM reassessment | Current Red remains unchanged; automatic projection cannot write RAG or clear historical impact |
| HC-09D | PM attempts reassessment without sufficient explanation, stale source, or outside PM Mode | Reject guarded Save; no new RAG or misleading audit entry |
| HC-10 | Invalid/legacy workbook lacks verified assessment | No RAG Green or obsolete Unknown badge synthesized |
| HC-11 | PM Mode locked and attempted Watch/RAG write | Block action and guarded Save; no audit success |
| HC-12 | PM Mode unlocked, source changed by another writer | Conflict holds; no bypass by shared password |
| HC-13 | Current open reason in selected-period report | Clearly current snapshot; do not claim opened during period absent dated event |
| HC-14 | Meeting Review/Reports HTML/plain/Outlook | Preserve frozen semantics/format parity; no report write |
| HC-15 | Completed child with blocked predecessor | Preserve recorded Completed, surface contradiction pending final decision |

## 9. Owner decisions still required BEFORE this becomes a frozen Stage B specification

1. **HW-03 Option A — RESOLVED (2026-11-18):** historical Red stays permanently auditable; current Red may change **only** after explicit evidence-backed PM reassessment with full audit history. Do **not** ask again. The form of saved health-assessment transactions awaits a separately approved schema/persistence model.
2. **HW-02 threshold and overdue — reviewed technical proposal, approval pending:** confirm **0..5 inclusive** working days for near-finish At Risk and choose **A (recommended) a standalone Overdue exception without auto-At Risk solely for overdue**, or **B Overdue plus derived effective At Risk**. Confirm Summary/Milestone and blocked-completed anomalies separately. See [HW-02 section 2B](https://github.com/Kenny619/spl-wbs/blob/docs/hw02-effective-status-projection-20261117/docs/specifications/HW02_EFFECTIVE_TASK_STATUS_AUTOMATION_DRAFT.md).
3. **HW-04 reason detail & multi-cause:** require resolution/reopen reason and retain independent causes; distinguish aggregate manual RAG judgment from source task status.
4. **HW-05 provisioning details:** confirm workbook-verifier vs device-local, recovery/rotation/idle-lock policy and exact locked mutation scope.
5. **HW-06/08 data-quality and cross-view consistency:** approve the factual-source/quality vocabulary and one common display projection.
6. **Persistence/Report addendum:** explicitly separate later versioned schema and reporting approval after Stage C, as already directed.

These are **individual review gates**; previous generic instruction to proceed does not itself approve the listed decisions or authorize actual implementation.

## 10. Stage B closure / subsequent milestones

- **Already accepted:** Stage A Excel Managed foundation, Stage B B2/B3 through merged [PR #92](https://github.com/Kenny619/spl-wbs/pull/92), and Stage B PGCM/header through merged [PR #98](https://github.com/Kenny619/spl-wbs/pull/98); six targeted owner checks PASS in total.
- **Stage B not yet closed:** formal Health/RAG/Under Watch lifecycle specification freeze by the Product Owner. This candidate plus PR #84 decision vector matrix are documentation, not accepted frozen requirements.
- **After Stage C:** separately authorize and implement the versioned health/RAG model, PM gate, dependency projection and Report 1.1 delta; independently QA and owner UAT, plus separate holistic UX consolidation, before beta.
- **Out of scope today:** changing current five-sheet workbook, credential provisioning, source code, existing Report 1.1, cloud/corporate deployment, protected main merge of health draft, beta/release.

