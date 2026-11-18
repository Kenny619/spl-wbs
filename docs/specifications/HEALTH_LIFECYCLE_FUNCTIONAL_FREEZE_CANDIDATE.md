# SPT-WBS | Manual RAG — Stage B Functional Freeze Candidate

**Version:** HW-FUNC-0.4 (reconciled 2026-11-18 JST) — **WORKING DRAFT, NOT FROZEN OR IMPLEMENTATION-AUTHORIZED**  
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
3. PM selects a WBS item, chooses **Green / Amber / Red**, and saves by the existing guarded workbook Save transaction. A change is committed only after validation and verified success. If no change, do not fabricate a change event.
4. **Proposed audit minimum** (technical design pending): TaskID, previous/current RAG, UTC decision time, concise substantive PM explanation/remediation note, source workbook/version and non-authenticated PM Mode editor label. Each change is append-only in history. Old Amber/Red entries never disappear when current becomes Green.
5. Every accepted workbook copy with the same saved data must show the same current RAG and history. RAG is NOT a browser-local preference. Save As, reload, read-only viewer, backup, stale-source and second-writer rules apply.
6. A PM password is only a workflow gate; **it cannot prove the human PM's identity or block Excel edits outside the app**. Never call a password-unlock event a verified author signature. See [draft PM Mode PR #100](https://github.com/Kenny619/spl-wbs/pull/100); its Watch-specific scope is obsolete and needs specification-only revision.

**Owner confirmation still useful but not blocking drafting:** should an explanation be **required** for all manual changes, or only for changes returning to Green? Recommended low-friction default: one concise explanation for *every* actual change so that leadership can interpret prior Amber/Red and remediation. No obligation to register or close separate Watch reasons.

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

The existing released/accepted Stage A workbook contains independently saved **WatchReasons** and project audit. The owner has now **superseded Under Watch as a future business concept**, but has **not** approved destroying project data or removing working features immediately.

Migration design must:
- Preserve the current accepted five-sheet ProjectData 0.1.2 workbook until a separately approved **versioned, backward-compatible** format and guarded migration are available. No silent rewrite or removal of `WatchReasons`, `ProjectAudit`, `UpdateHistory` or historical reason details.
- Treat legacy Watch records as **historical facts only**; they **do not automatically convert to Red/Amber**, and no legacy Watch event can automatically set today's RAG. A valid legacy item with no manual RAG is Green by the new product rule, with a transparent notice about legacy data at transition.
- Provide a read-only history/access/export path as needed for historical Watch entries; prevent future Watch Add/Resolve/Reopen once the new RAG workflow is explicitly authorized and shipped. Plan a safe rollback/compatibility path for older viewers before any data change.
- Do not interpret unrecognized, invalid, future-version, failed or corrupt workbook content as trustworthy Green. Show a **load/data-quality error**, not a fourth RAG status; refuse unsafe writes. Valid workbook with absent health value is different: **Green by default**.

A deprecation/migration design and owner authorization are prerequisites for code edits that replace accepted Watch behavior. No instant feature removal is authorized by this specification reconciliation.

## 5. Common view, attention and reporting contract

- One shared, workbook-backed current RAG source feeds Schedule, Task Detail, Needs Attention, Meeting Review and a versioned future Reports delta. Each view may filter Red/Amber/Green, but may not compute its own RAG from effective TaskStatus, open legacy Watch reasons or date calculations.
- Use visible **Red / Amber / Green** words with color and accessible labels. Needs Attention can show *separate* sections for manual Red/Amber and automatic task/schedule exceptions; this is categorization, not automated RAG.
- Reports show **current manual RAG snapshot** separately from **RAG transition events that occurred in the requested reporting period**. Never present today's Amber/Red as if it changed during a historical reporting period. Keep workstream grouping, HTML/plain text/Outlook copy parity, readonly Generate/Copy/Download and source provenance. Future Report 1.1 delta will remove *current* Under Watch content/controls but may provide historical legacy audit reference.
- The frozen Report 1.1 and existing Manual Watch addendum remain operational until a separately approved versioned replacement. Do not silently amend prior approved report content.

## 6. Technical policy and open decisions (not blockers to recorded owner direction)

- **HW-05 PM Mode:** password-gated RAG edit, read-only member views, exact protected mutation scope, verifier provision/rotation/recovery/idle lock. No built-in default password or plaintext client secret. Shared verifier does not authenticate an actual PM.
- **Workbook persistence:** schema design for per-item manual RAG plus append-only audit, atomic Save/backup/conflict detection, verified SourceID/TaskID and legacy compatibility; no current schema or writer change authorized.
- **Audit UX:** lightweight explanatory text and edited-by attribution without false authentication claim; avoid creating separate risk/reason registers.
- **Visibility:** design display hierarchy if a default Green item is separately Overdue or effectively Blocked, preserving both facts clearly rather than forcing a matching RAG.
- **Acceptance:** small targeted tests for default Green, manually set Amber/Red and manual Green, independence from TaskStatus/schedule, multi-item/source reload, failed/unauthorized/stale Save, preserved legacy Watch history, report current-vs-period, and viewer readonly parity. Reuse already accepted Stage A/B coverage; do not rerun obsolete Watch functional cases against future target.

## 7. Governance and exit

**Already approved and no need to ask again:** RAG exactly Green/Amber/Red, Green default on valid items, manual PM-only changes including return to Green after remediation, full RAG/TaskStatus independence, Under Watch and Clear removed from target product, no RAG automation; previous HW-02 effective TaskStatus approvals continue without RAG linkage.

**Stage B owner gate:** review this reconciled functional candidate and any remaining concise evidence/authorization questions, then expressly freeze it. **After Stage C**, seek separate approval for backward-compatible workbook implementation, UI replacement, Report 1.1 versioned delta, focused independent QA and owner UAT, before beta. Holistic UX gate remains separate.

**Not authorized by this draft:** implementation; password/credential creation; workbook schema or migration; deleting Watch data; production changes; protected-main merge; release or beta.
