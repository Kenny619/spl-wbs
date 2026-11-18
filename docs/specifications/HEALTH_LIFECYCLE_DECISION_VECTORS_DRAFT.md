# SPT-WBS | Health / RAG / Under Watch — Decision Register and Verification Vectors

**Status:** Controlled Stage B **specification working draft**, last reconciled **2026-11-18 JST**. Individual Product Owner directions below are recorded; **the overall health lifecycle specification is NOT yet frozen**, and no feature/schema/report implementation, protected merge, corporate release, or beta follows from this document.

**Source of truth:** [Issue #82](https://github.com/Kenny619/spl-wbs/issues/82). Related drafts [HW-05 authorization PR #100](https://github.com/Kenny619/spl-wbs/pull/100) and [HW-02 effective status PR #101](https://github.com/Kenny619/spl-wbs/pull/101). Preserve [frozen Report 1.1](EMV_REPORT_1_1_FROZEN.md), [Manual Watch addendum 1](REPORT11_MANUAL_WATCH_ADDENDUM_1.md), approved five-sheet ProjectData 0.1.2 and existing accepted Stage A/B functionality.

## 1. Resolved Product Owner decisions — do not re-ask

| Decision | Explicit accepted direction | Boundary |
| --- | --- | --- |
| **HW-01 RAG taxonomy** | **Red:** observed issue impacts scope/timeline/deliverable/cost/structure **even after underlying issue is resolved**. **Amber:** observed risk that could impact those dimensions. **Green:** normal, no issue/risk observed. **Unknown and Clear removed as health/RAG states.** | A task's source `TaskStatus` `Unknown` or an unavailable evidence source is **not** a fourth health status; never silently assign Green to incomplete or unverified evidence. |
| **HW-02 source versus effective status** | **Option A**: retain original `ProjectWBS.TaskStatus` in Excel, calculate a transparent **effective TaskStatus** for display from the same verified workbook/date/calendar/dependency inputs. No automatic write or audit claim. | This is *task/schedule status*, **not** a direct RAG decision. Exact overdue/milestone/precedence/filter boundary details remain open. |
| **HW-02 schedule triggers direction** | Owner proposed **within 5 working days** of planned finish, effective `At Risk` when any: progress below 50%, recorded `Not Started`, or no substantive `Updates` recorded. Also propagate effective `Blocked` through validated downstream predecessor relationships, with causal explanation. | The exact inclusive boundary (recommended 0..5), edge cases and automatic clearance precedence remain for confirmation; no direct workbook mutation. |
| **HW-02 update-presence rule** | **No update ever entered** intent = no **substantive update currently recorded in workbook Updates**. One meaningful update, however old, satisfies update-presence trigger. Detect never-maintained-looking tasks such as `In Progress` with no notes. | A blank present-day cell cannot prove an update was never entered then erased. Do not use generic `Modified` as an Updates timestamp. **Defer age/staleness review monitoring until after user testing.** |
| **HW-03 Red reassessment — Option A** | Historical Red impact, prior Red assessment, and associated reason/audit history are **permanently preserved**. **Current** Red may change only following an **explicit PM reassessment with documented supporting evidence and a complete saved audit transition**. | Neither reason resolution nor a calculated schedule improvement can auto-change Red. Amber/Green require a justified review of independent causes; PM password gate does not authenticate the individual's identity. |
| **HW-05 control direction** | Lightweight **PM password gate** for manual Watch Add/Resolve/future Reopen and future manual RAG edits. View status/history without password. | Browser gate deters casual edits but **cannot prevent direct Excel modification or authenticate user identity**. Keep audit actor unverified. Verifier storage/bootstrap/rotation/recovery and timeout not yet approved. [PR #100](https://github.com/Kenny619/spl-wbs/pull/100) is a draft, no code. |
| **HW-07 reports** | **Retain existing Under Watch filter and task listing under Exceptions. Emphasize current Under Watch items in Latest Status and Progress & Risks. DEFER detailed report content finalization** until all task and Watch specs are settled. | Preserve current Report 1.1/Manual Watch addendum, current vs selected-period distinction, HTML/plain/Outlook parity, workstream grouping and no report writes. Detailed Change Audit and Meeting Review unchanged for now. Version a new report delta only after owner review. |

Direct issue comments: [HW-01](https://github.com/Kenny619/spl-wbs/issues/82#issuecomment-6949427305), [HW-05](https://github.com/Kenny619/spl-wbs/issues/82#issuecomment-6949707407), [HW-02 Option A](https://github.com/Kenny619/spl-wbs/issues/82#issuecomment-6950049738), [HW-02 no-update](https://github.com/Kenny619/spl-wbs/issues/82#issuecomment-6950220272), [HW-07](https://github.com/Kenny619/spl-wbs/issues/82#issuecomment-6950328377).

## 2. Remaining business decisions for concise individual review

**HW-03 — Option A Red reassessment APPROVED; other reason-transition details still open**:
- **Approved:** an issue that caused material project impact remains in permanent historical Red evidence, but its **current** Red assessment can change only by explicit, evidence-backed PM reassessment with a fully preserved old/new/timestamp/rationale/source audit trail. No implicit Green on reason closure. Do not repeat the permanent-Red-versus-reassessment decision.
- **Still open:** exact required evidence and note formats for `Open → Resolved` and future `Resolved → Reopened`, no-op handling, and how all independent causes constrain current reassessment. Schema/persistence implementation requires a separate future approval. A shared PM password does not certify reviewer identity.

**HW-04 — Multiple concurrent causes** (proposed safest default, not yet accepted):
- Preserve all independent reasons (including resolved history); an unrelated issue or risk may remain after one is resolved. Show each reason and the aggregate effective task conditions. Resolution of one cause must not silence others. Explicitly decide competing risk/issue precedence for final RAG health.

**HW-02 outstanding precise rule edges** (proposal, not approved yet):
- Whether `within five working days` means remaining days **0–5 inclusive**; overdue handling after finish; treatment of `Completed`, `Cancelled`, `Summary`, `Milestone`, nullable progress and inconsistent recorded status.
- Use only verified Japanese holidays and the **committed shared project blackout** (not browser-local settings) for workday computation; select common project business date, proposed JST. Unsupported/missing dependency and cycles must not fabricate inherited Blocked. Preserve root TaskID evidence through transitive/multiple Blocked paths.
- Clarify where effective versus recorded TaskStatus drives filter/exception counts and which source labels users see; no frozen Report 1.1 delta until after the detailed task/Watch specs.

**HW-05 remaining protection design** (not an authorization to implement):
- Where to provision a per-project password verifier, how to bootstrap, rotate/reset/recover and lock after idle, and which existing status edit operations beyond Watch/RAG should be protected. No default password or hashed secret stored in uncontrolled client HTML/JS. No claim that a shared password certifies the identity of an editor.

**HW-06 common status projection** (design pending):
- Ensure one shared source-backed projection feeds Schedule, Needs Attention, Task Detail, Meeting Review and future versioned Reports. Do not mix task status, manual reason states, schedule exceptions and RAG health. Source detail/keyboard labels accompany colors.

**HW-08 missing/legacy/future data** (owner decision pending):
- With obsolete health `Unknown`, choose a **non-RAG availability message** (e.g., `Health assessment unavailable`) for missing/invalid/unverified source. Never fabricate Green, never corrupt legacy/future workbooks and require migration/compatibility approval before any new health-specific Excel fields.

**Persistence and reporting sequencing:** Any new RAG assessment or Reopen transaction must follow an independently approved versioned schema, guarded workbook Save, append-only audit, backward compatibility and PM gate design. Defer detailed report content and versioned Report 1.1 delta until task/Watch lifecycle is settled. Health/report integration is a **separate pre-beta implementation milestone after Stage C**, not a license to implement during this Stage B specification-only review.

## 3. Existing evidence versus forbidden assumptions

| Existing evidence available | Safe statement | Do not assert |
| --- | --- | --- |
| Source `Blocked` or `At Risk` TaskStatus | Recorded task execution condition | Verified RAG Red or Amber unless separately assessed |
| Open Watch reason | Recorded reason is open, source and provenance disclosed | That it automatically has a complete and authenticated RAG decision |
| Resolved Watch reason | Resolution is recorded, past impact and reason trail preserved | Independent impacts are gone or project health is Green |
| Overdue / ≤5-workday condition | Calculated date signal with verified working-day inputs and source | Automatic confirmed Red, historic report event, or self-cleared Watch reason |
| Blank Updates field | No substantive update currently recorded | Proof the task was never historically reviewed, or that notes are stale |
| Legacy/invalid health source | Health assessment **unavailable**, explicit evidence-quality warning | Green or a fourth RAG badge called Unknown |
| Current Watch item in a period report | Current source snapshot, clearly labeled current | Newly opened during that period without a recorded period event |

## 4. Synthetic scenario checklist (future tests, NOT executed)

| ID | Scenario | Invariant / pending policy |
| --- | --- | --- |
| H-01 | Open manual Watch issue and source `In Progress` | Preserve reason/source and Red impact evidence without inventing health calculation |
| H-02 | Two independent Watch reasons; resolve only one | Other stays open and complete history remains; no automatic Green |
| H-03 | Reopen a previously resolved reason | Preserve transition trail; authority/PM Mode and Reopen rationale still pending; separate PM assessment required for any current Red change |
| H-03A | Material-impact Red reason resolved with no PM RAG reassessment | **Current Red remains; original impact and prior Red event persist** |
| H-03B | PM explicitly reassesses a previously impacted Red to Green with complete evidence of no current risks/issues | **Current RAG can change only via documented guarded PM transaction; original Red and complete history remain**; future schema and multi-cause verification separately approved |
| H-03C | One of several reasons resolves while another risk remains | No automatic Green or aggregate downgrade; independent risk retained, Amber eligibility subject to HW-04 |
| H-04 | Five-day boundary, 49% progress, dated update | Calculated effective At Risk with original Excel status intact; exact day boundary pending |
| H-05 | Five-day boundary, 80% progress, In Progress, blank Updates | Calculated effective At Risk for no update currently recorded |
| H-06 | Five-day boundary, 80% progress, In Progress, old substantive Updates | No missing-update At Risk; age monitoring explicitly deferred |
| H-07 | Source Blocked A -> dependent B -> C | Derived effective Blocked, origin A/ID, no workbook writes or fake Watch reasons |
| H-08 | A and D independently block B; A unblocked | B stays effectively Blocked via D |
| H-09 | A unblocked while B has independent open Watch reason | Only inherited flag clears; Watch remains open |
| H-10 | Legacy/future-version workbook without valid health fields | Do not mutate, invent Green or show obsolete RAG Unknown |
| H-11 | Health assessment conflicts with source status/Watch | Preserve actual independent facts, define precedence and authority before implementation |
| H-12 | Report selected period includes resolution; reopen occurs outside it | Period events and current snapshot clearly distinct; defer content finalization |
| H-13 | Save fails, stale source, concurrent writer or recovery hold | No false Save success, history loss or password bypass |
| H-14 | HTML/plain/Outlook output and read-only Viewer | Preserve existing frozen outputs, no report writes, future delta gated |

## 5. Exit sequence and governance

1. Record outstanding HW-02/03 (reason notes/reopen details only)/04/05/06/08 owner decisions individually and reconcile the above matrix without requesting approval again for approved HW-01/HW-02 Option A/update-presence/HW-03 Option A/HW-05 direction/HW-07 deferral.
2. Propose a consolidated **versioned health lifecycle functional-spec freeze** only when conflict/transition and missing-evidence rules are complete. This document and PR remain **documentation-only draft** pending approval and normal documentation integration checks.
3. After Stage C authoring stabilizes, separately authorize any versioned workbook schema/health calculation and Report 1.1 delta; independently QA + owner UAT before beta. No implicit merge/release or corporate permission claim.

**Current gate:** Stage B health specification analysis, **not** implementation or a completed owner health-policy freeze.
