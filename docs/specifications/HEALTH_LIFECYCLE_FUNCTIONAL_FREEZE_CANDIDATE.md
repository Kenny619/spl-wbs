# SPT-WBS | Manual RAG — Stage B Approved Functional Specification

**Version:** HW-FUNC-1.0 — **PRODUCT OWNER APPROVED / FROZEN 2026-11-18 JST; IMPLEMENTATION NOT AUTHORIZED**  
**Binding source:** [Owner decisions, Issue #82](https://github.com/Kenny619/spl-wbs/issues/82). Supersedes the previous Under Watch / Clear / reason-lifecycle design and previous interpretation that Red persists as the *current* health after remediation. Retain historical issue comments and commits for traceability.

## 1. User model and scope — Product Owner-approved direction

The UI has **two independent classifications**:
- **Task execution status** (e.g., Not Started / In Progress / At Risk / Blocked / Completed / Cancelled), sourced from workbook `ProjectWBS.TaskStatus` and, where separately approved, an explicitly labeled read-only **effective TaskStatus** derived from scheduling and dependency data.
- **RAG health assessment:** exactly **Green, Amber, Red**, a **current, per-item manual PM judgment**. It is never a derivative of TaskStatus or schedule facts.

Every valid WBS **Task, Milestone and Summary** item is **Green unless an authorized PM has manually changed it to Amber or Red**. Each item's health is independent; displaying child RAG exceptions on a Summary is permitted, **but does not change the Summary's own Green badge**. Applicability to other non-WBS entities is excluded pending explicit scope.

| Current RAG | Practical meaning | Entry and exit |
| --- | --- | --- |
| **Green** (default) | No unresolved concern has been *manually registered in RAG* for this item. This is a product default, not a guarantee that schedule, dependencies or delivery are risk-free. | Starts Green for valid items with no current manual assessment. An authorized PM can manually return Amber or Red to Green after remediation. |
| **Amber** | Authorized PM flags a concern/risk needing attention, with potential impact. | Authorized PM sets Amber; only an authorized PM changes it to Green or Red. |
| **Red** | Authorized PM flags an issue judged critical or already impacting delivery. | Authorized PM sets Red; only an authorized PM changes it to Green or Amber after reassessment/remediation. Historical Red remains in audit. |

**Never calculate, infer, auto-escalate, auto-downgrade, or auto-clear RAG.** Changes to `TaskStatus`, dates, progress, updates, overdue notices, dependencies, blackout dates, calendar, or report filters never alter RAG. A user may see `In Progress + Amber`, `Blocked + Green`, or `Completed + Red` without an internal contradiction: task status and PM opinion are independent.

**Removed from target product specification:** Under Watch as a separate current concept; Watch reason Add/Resolve/Reopen/ReasonID as the future RAG workflow; Clear status; automatic Green rules; Unknown as a fourth RAG value; automatic mapping from TaskStatus to RAG. Do not show parallel Under Watch and RAG exception controls in the eventual UI.

## 2. Manual editing workflow — PM-only

1. Default RAG Green is a rule, not necessarily a persisted Green record for every row. For a valid workbook with no explicit manual RAG value, render **Green (default)**.
2. Viewing RAG and full historical assessment changes is read-only for project members. Editing RAG is enabled only after the approved PM-gated flow. No other workflow may write RAG.
3. PM selects a WBS item and chooses **Green / Amber / Red**. The required form changes with the transition:
   - **Any manual change to Amber or Red** (Green→Amber/Red, Amber→Red, Red→Amber): require two **separate nonblank text fields**, **Project Impact** (actual or potential impact on project delivery, cost, scope or deliverables) and **Path to Green** (corrective actions and the criteria needed to return to Green). For Amber↔Red explicitly update both values as a new assessment.
   - **Amber or Red → Green**: require a separate **Resolution** text field that explains actual remediation/completion; previous Project Impact and Path to Green remain in historical assessment records.
   - **No RAG change**: no form or audit event.
   - Do not allow a blank, whitespace-only or uncommitted draft value to satisfy mandatory fields.
   - Save only through the separately authorized guarded workbook Save transaction. A change is committed only after validation and verified success. No automation may set/alter RAG.
4. **Approved required input policy; proposed exact audit schema:** each transition preserves WBS TaskID, previous/current RAG, UTC decision time, the required **Project Impact and Path to Green** for Amber/Red decisions **or Resolution** for return to Green, source workbook/version and non-authenticated PM Mode editor label. Preserve prior versions of the fields in append-only history. After resolution, display current RAG Green while keeping previous impact, plan, resolution and Red/Amber records auditable.
5. Every accepted workbook copy with the same saved data must show the same current RAG and history. RAG is NOT a browser-local preference. Save As, reload, read-only viewer, backup, stale-source and second-writer rules apply.
6. A PM password is only a workflow gate; **it cannot prove the human PM's identity or block Excel edits outside the app**. Never call a password-unlock event a verified author signature. See [draft PM Mode PR #100](https://github.com/Kenny619/spl-wbs/pull/100); its Watch-specific scope is obsolete and needs specification-only revision.

**Required-input policy is now fully owner-approved.** Do not re-ask whether notes are optional: Project Impact + Path to Green are mandatory on entry/change to Amber/Red; Resolution mandatory on change from Amber/Red back to Green. No additional separate Watch-reason entry or closure is needed.

## 3. Previously approved HW-02 *effective TaskStatus* rules — explicitly NOT RAG automation

These approved decisions remain intact, because they change only **read-only execution status and evidence**:
- Never overwrite recorded `ProjectWBS.TaskStatus` automatically. Label any calculated **effective TaskStatus** and display its source trigger/TaskID separately from manually assessed RAG.
- For an **active scheduled leaf Task**, at **0–5 inclusive verified working days remaining** (exclude weekends, verified Japanese public holidays and saved shared project blackout), effective `At Risk` if **any** condition holds: recorded progress <50%; recorded `Not Started`; **no substantive Updates currently recorded**. A missing progress value is not zero. An old meaningful update satisfies presence; update-age/staleness rules remain deferred until after UAT.
- Past-finish active work gets a **separate prominent Overdue exception**; overdue alone does **not** derive `At Risk`. Finish date equal to today is 0 remaining; date in past is overdue. Preserve exact date/provenance, and do not fabricate results for unverifiable calendar/source.
- **Milestone**: due/Overdue and independently recorded or validated inherited Blocked/At Risk may display, but missing note/progress or `Not Started` does not trigger near-finish effective At Risk. **Summary**: only child-sourced exceptions, no independent calculated near-finish or overdue and no duplicate counts.
- **Dependency graph**: validated Finish-to-Start `PredecessorIDs` may propagate effective `Blocked` through active successors with all root source TaskIDs. `Completed` / `Cancelled` successors retain terminal status, show a conflicting-predecessor diagnostic and break inherited root propagation through that node. Cancelled predecessor alone is not Blocked. Invalid IDs, unsupported relationships, cycles and unknown quality require visible diagnostics, not invented confirmed Blocked. WBS hierarchy is not an FS link.
- Final project business date/filter/quality UX mapping remains HW-02 technical design work. Cross-view task-status semantics must remain labeled and consistent. See [HW-02 draft PR #101](https://github.com/Kenny619/spl-wbs/pull/101).

**Absolute prohibition:** none of these calculations may set, clear, change, or create a RAG assessment or a RAG historical transition.

## 4. Retiring accepted Stage A Under Watch without losing project information

The accepted Stage A workbook includes a WatchReasons capability; the Product Owner confirms there is **no active Under Watch data** to migrate. Under Watch is **superseded as a future business concept**. No dedicated Watch data conversion, reconciliation, migration tool or historical Watch viewer is required; no destructive changes to existing workbooks or audit history are authorized.

Migration design must:
- Preserve the current accepted five-sheet ProjectData 0.1.2 workbook until a separately approved **versioned, backward-compatible** format and guarded migration are available. No silent rewrite or removal of `WatchReasons`, `ProjectAudit`, `UpdateHistory` or historical reason details.
- No active Watch data needs conversion. If any previously saved legacy Watch record is encountered, treat it as unchanged historical data only; never translate it automatically to Red/Amber. A valid legacy item with no manual RAG is Green by the new product rule.
- Retire the current Watch UI/operations when the new RAG implementation is separately authorized and shipped; leave existing accepted Watch tabs/audit bytes non-destructively intact. No special legacy Watch history page/export or bespoke migration project is needed. Preserve ordinary workbook backup/rollback safeguards.
- Do not interpret unrecognized, invalid, future-version, failed or corrupt workbook content as trustworthy Green. Show a **load/data-quality error**, not a fourth RAG status; refuse unsafe writes. Valid workbook with absent health value is different: **Green by default**.

Separately authorized implementation and schema compatibility/backup checks are prerequisites to replacing accepted Watch behavior. **Legacy Watch migration is not a required workstream.** No instant feature removal follows from this functional approval.

## 5. Common view, attention and reporting contract

- One shared, workbook-backed current RAG source feeds Schedule, Task Detail, Needs Attention, Meeting Review and a versioned future Reports delta. Each view may filter Red/Amber/Green, but may not compute its own RAG from effective TaskStatus, open legacy Watch reasons or date calculations.
- Use visible **Red / Amber / Green** words with color and accessible labels. Needs Attention can show *separate* sections for manual Red/Amber and automatic task/schedule exceptions; this is categorization, not automated RAG.
- Reports show **current manual RAG snapshot** separately from **RAG transition events that occurred in the requested reporting period**. Never present today's Amber/Red as if it changed during a historical reporting period. Keep workstream grouping, HTML/plain text/Outlook copy parity, readonly Generate/Copy/Download and source provenance. Future Report 1.1 delta will remove *current* Under Watch content/controls but may provide historical legacy audit reference.
- The frozen Report 1.1 and existing Manual Watch addendum remain operational until a separately approved versioned replacement. Do not silently amend prior approved report content.

## 6. Technical design follow-ups (not part of the approved functional freeze)

- **HW-05 PM Mode / architecture recommendation:** use a **PM-only Node.js localhost editor** with server-side gate and guarded workbook writer, and a separate **read-only Edge viewer**. Bind localhost to loopback, protect cross-origin/CSRF access, avoid secrets embedded in static HTML/JS, and enforce Windows filesystem/share write permissions where possible; record that a shared PM password is not human identity verification or protection from out-of-app Excel writes. Exact PM gate scope, verifier provisioning/rotation/recovery/idle lock still need technical design approval. This is recommended architecture, **not** authorization to build the two-app variation yet.
- **Workbook persistence:** versioned schema design for per-item RAG; current **Project Impact**, **Path to Green** while Amber/Red, and **Resolution** on return to Green; append-only full previous/new RAG and input audit; atomic Save/backup/conflict detection, verified SourceID/TaskID and backward-compatible read; no current schema or writer change authorized.
- **Audit UX:** on Amber/Red show two clearly labeled required fields with review/read-only presentation; on Green return show required Resolution, retain prior Impact/Path values in history. Show edited-by as **unverified** unless real authentication is deployed; avoid creating separate risk/reason registers.
- **Visibility:** design display hierarchy if a default Green item is separately Overdue or effectively Blocked, preserving both facts clearly rather than forcing a matching RAG.
- **Acceptance:** targeted tests for required Impact+Path-to-Green and Resolution on correct transitions (including Amber↔Red), default Green, full field/audit history retention, RAG independence from TaskStatus, save/reload, failed/unauthorized/stale Save, non-destructive old workbook compatibility, report current-vs-period and viewer read-only parity. Reuse accepted Stage A/B coverage; **no dedicated Watch migration or obsolete Watch lifecycle regression suite**.

## 7. Governance and exit

**Already approved and no need to ask again:** RAG Green/Amber/Red only; Green default; manual PM changes; Project Impact + Path to Green mandatory on any change to Amber/Red, Resolution mandatory when returning to Green; per-transition history; TaskStatus independence; Under Watch and Clear removed from target product; no active legacy Watch data to migrate; never automate RAG. Previous HW-02 effective TaskStatus approvals continue without RAG linkage.

**Stage B health/RAG functional specification gate: FROZEN following explicit Product Owner approval (“Approved. Keep going”), 2026-11-18 JST.** This freezes the requirements in sections 1–5 and the transition input/audit requirements in section 2, while section 6 enumerates still-unapproved technical architecture/schema/access-control choices. **After Stage C**, separately approve implementation of the backward-compatible workbook contract, UI replacement and versioned Report 1.1 delta; perform proportionate independent QA and focused Owner UAT before beta. Holistic UX gate remains separate.

**Scope of this functional approval:** specification only. It does not authorize application implementation, PM credential creation, workbook schema changes or migration, destructive Watch cleanup, production changes, unreviewed protected-main changes, release or beta. Documentation-only protected integration may proceed subject to exact-head checks and branch protections.
