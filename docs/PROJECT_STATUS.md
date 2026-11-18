# SPT-WBS | Project Status & Roadmap

**Updated:** 2026-11-18 JST  
**Audience:** Product Owner, sponsors, executives, delivery stakeholders  
**Owner:** Delivery Management Office  
**Purpose:** One business-readable description of what has been accepted, what is next, and what remains before a beta. Feature contracts, development PRs and acceptance records remain linked below.

> **CURRENT POSITION — STAGE A ACCEPTED; STAGE B USABILITY ACCEPTED AND RAG SPECIFICATION FROZEN; STAGE C AUTHORING IS NEXT.** The application is verified in the tested **personal Windows/Edge environment**. No corporate deployment, live shared-workbook multiwriter certification, beta, or production release has been approved.

## Executive snapshot

| Question | Current position |
| --- | --- |
| **What is SPT-WBS?** | A project schedule / work-breakdown application that keeps **Excel as the shared project-owned source of truth**, supports a PM's controlled editing and delivers schedule, exceptions, Meeting Review and stakeholder reports. |
| **What is complete?** | **Stage A — Excel-managed foundation**, Product Owner accepted **15 Nov 2026**, including safe local edits, Save/Save As, backups/recovery, workbook ProjectData, Calendar, accepted historical Under Watch, Meeting Review, Reports and Recent Projects. |
| **Which Stage B outcomes are accepted?** | **Needs Attention / severity** owner 3/3 UAT PASS, integrated [PR #92](https://github.com/Kenny619/spl-wbs/pull/92); **PGCM/header accessibility** owner 3/3 UAT PASS, integrated [PR #98](https://github.com/Kenny619/spl-wbs/pull/98). **Manual PM-owned RAG policy** frozen **18 Nov 2026** as [HW-FUNC-1.0](specifications/HEALTH_LIFECYCLE_FUNCTIONAL_FREEZE_CANDIDATE.md), documentation merged [PR #84](https://github.com/Kenny619/spl-wbs/pull/84). **The RAG feature is NOT implemented yet**. |
| **What is underway?** | **Stage C — Project Authoring**: safe creation of project WBS entities, then blank-project onboarding and reusable templates ([#23](https://github.com/Kenny619/spl-wbs/issues/23), [#24](https://github.com/Kenny619/spl-wbs/issues/24)). **B2 Task Create audit architecture approved by the Product Owner**; draft technical contract covers the existing ProjectAudit sheet and versioned backward compatibility. **Not yet implemented/accepted.** |
| **What is mandatory before beta?** | (1) Implementation/independent QA/Owner UAT of the already-frozen manual RAG + versioned Report 1.1 integration, **after Stage C authoring**. (2) One **holistic cross-view UX/UI consistency and usability acceptance**. Then a separate beta go/no-go review. |
| **Primary known constraints?** | Corporate Edge `file://` folder permission restrictions; real shared-workbook concurrency and user permissions; two inherited moderate dependency advisories; CI cost controls. None are waived by personal-PC functional acceptance. |
| **Committed delivery date?** | **Not yet committed.** No reliable date for Stage C completion or beta until new-authoring scope and evidence are agreed. |
| **Immediate owner decision?** | **No new B2 architecture decision.** The next technical gates are precise versioned audit encoding, compatibility verification and Stage C first-slice UX; there is **no workbook-writing or beta authorization**. |

## Delivery roadmap

| Phase | Outcome | Status | Success/exit criterion |
| --- | --- | --- | --- |
| **Stage A — Excel-managed foundation** | WBS task edit, managed Excel persistence, guarded Save/Save As, history, Calendar, reports, Recent Projects | **Accepted — 15 Nov** | Completed targeted E1–E17 and MRU-01–03 personal Windows/Edge acceptance; no repeat physical UAT without code impact |
| **Stage B — Daily operational usability** | Actionable Needs Attention and severity, compact accessible header, browser-local PGCM preferences | **Owner-accepted and integrated** | PRs [#92](https://github.com/Kenny619/spl-wbs/pull/92) and [#98](https://github.com/Kenny619/spl-wbs/pull/98), targeted 6/6 physical checks PASS |
| **Stage B — Health/RAG business specification** | Explicit manual PM assessment independent from task/schedule status | **Functional specification frozen — 18 Nov** | [Issue #82](https://github.com/Kenny619/spl-wbs/issues/82), [HW-FUNC-1.0](specifications/HEALTH_LIFECYCLE_FUNCTIONAL_FREEZE_CANDIDATE.md), [merged PR #84](https://github.com/Kenny619/spl-wbs/pull/84); **software not yet built** |
| **Stage C1 — Create WBS entities** | Add valid Task/Summary/Milestone to existing workbook with permanent identity, hierarchy/dependency consistency and auditable Save | **B2 audit architecture approved; design/preflight underway** | Finalize exact versioned ProjectAudit Task/Create contract, then controlled implementation and focused independent QA/Owner UAT |
| **Stage C2 — New-project onboarding** | Blank workbook, chosen save location/download fallback and validated starter templates | **Design/preflight underway; follows C1** | Compatible generated workbooks, no overwrite/data loss, readable in PM and readonly views; targeted QA/Owner UAT |
| **Pre-beta gate 1 — RAG and reports** | PM-only manual RAG with required Impact/Path-to-Green/Resolution, audit, cross-view status and Report 1.1 update | **Specification approved; implementation later** | Versioned compatible Excel model, secure edit workflow, independent QA + focused Owner UAT |
| **Pre-beta gate 2 — Holistic UX** | One consistent DES-012-derived visual/interaction system across Schedule, Task Detail, Meeting Review, Reports, Settings and new authoring | **Audit/design underway** | Integrated owner experience review and cross-view acceptance |
| **Beta decision** | Controlled candidate with support, build/recovery/rollback/security readiness | **Not authorized** | Separate Product Owner go/no-go after all mandatory gates |
| **Stage D / E (later)** | Multiple blackout windows and graphical WBS/dependency editing | **Deferred** | Not beta prerequisites |

## Fixed product decisions and business meaning

**Shared versus personal data.** WBS entities, owners, dates, dependencies, project Calendar, manual RAG and history must travel with the same Excel project file. Dark mode, visible columns, PGCM *display highlight* and recent-file history stay browser-local. Identical saved workbook facts must display consistently; the app does not itself supply real-time multiwriter synchronization.

**RAG is manual and independent.** Every valid WBS item defaults **Green**. Only an authorized PM manually changes **Amber/Red/Green**. Entering/changing Amber/Red requires **Project Impact** plus **Path to Green**; returning to Green requires **Resolution**. Preserve previous RAG and text/history, no automation maps recorded/effective TaskStatus, Overdue, dates or dependency warnings to RAG. **Under Watch** and **Clear** are retired from the *future* UI; owner confirmed there is **no active Watch data to migrate**. Existing Stage A workbook history must remain non-destructively intact.

**Schedule status is separate.** Previously approved **read-only effective TaskStatus** calculations may surface near-finish At Risk, validated inherited Blocked and a separate prominent Overdue exception, while recorded Excel `TaskStatus` remains unchanged. Exact technical refinement [HW-02 PR #101](https://github.com/Kenny619/spl-wbs/pull/101) is not automatic RAG assessment.

**Security and distribution.** A PM password-only HTML gate deters mistaken edits but cannot authenticate a human or prevent direct Excel changes. A future PM-authoring Node.js localhost + read-only Edge viewer split is a **recommended later architecture**, not built or approved for rollout. Corporate Edge `file://` restrictions, network/file ACLs, controlled source integrity, shared Excel concurrency and moderate dependency advisories remain explicit deployment risks. [Security design draft PR #100](https://github.com/Kenny619/spl-wbs/pull/100).

**UI authority.** [DES-012 consolidated Review08](https://github.com/Kenny619/spl-wbs/blob/design/ui-overhaul-foundations-v0.1/design/concepts/DES-012-consolidated-review08-task-detail.html) is the sole owner-approved cross-view visual source. Preserve the accepted Reports style, layout and workstream grouping. Existing frozen Report 1.1 remains operational until a separately approved versioned health/report delta.

## Current delivery focus

1. **Stage C #23:** the Product Owner selected **B2** (explicit Task/Create rows in the existing ProjectAudit) on 18 Nov 2026. Complete the versioned, backward-compatible audit contract and source-column-safe snapshot; retain immutable IDs, WBS, parent/dependency relationships and guarded Save recovery. Current code in [PR #105](https://github.com/Kenny619/spl-wbs/pull/105) is **validation and audit planning only**, not an Excel writer. [Stage C architecture record](https://github.com/Kenny619/spl-wbs/issues/23#issuecomment-6970324100).
2. **Stage C #24:** reuse #23 creation engine for blank-project initialization and approved starter templates; support download fallback for restricted folder picker.
3. **Cost-controlled QA:** keep synthetic targeted domain/browser cases for new behavior only. Do not rerun the accepted MRU and Stage B physical scenarios. Current three-tier CI misclassifies `docs/specifications/*.md` as expensive full Windows changes; corrective DMO action [Issue #73](https://github.com/Kenny619/spl-wbs/issues/73).
4. **After Stage C:** implement frozen RAG with new versioned workbook data and approved PM controls, then Report 1.1 parity, followed by holistic UX and separate beta assessment.

## Evidence and controls

- Stage A accepted: [Epic #1](https://github.com/Kenny619/spl-wbs/issues/1), [Recent Projects #21](https://github.com/Kenny619/spl-wbs/issues/21).
- Stage B usability accepted: [PR #92](https://github.com/Kenny619/spl-wbs/pull/92), [PR #98](https://github.com/Kenny619/spl-wbs/pull/98). Latest approved fictional UAT material remains linked **once** from [README](../README.md), not duplicated here.
- Stage B manual RAG spec frozen: [Issue #82](https://github.com/Kenny619/spl-wbs/issues/82), [PR #84](https://github.com/Kenny619/spl-wbs/pull/84), HW-FUNC-1.0.
- Stage C: [Issue #23](https://github.com/Kenny619/spl-wbs/issues/23), [Issue #24](https://github.com/Kenny619/spl-wbs/issues/24), [PR #94](https://github.com/Kenny619/spl-wbs/pull/94).
- UI: [Issue #25](https://github.com/Kenny619/spl-wbs/issues/25). CI: [Issue #73](https://github.com/Kenny619/spl-wbs/issues/73). Corporate Edge restrictions: [Issue #11](https://github.com/Kenny619/spl-wbs/issues/11).

**Change discipline:** Release, corporate deployment, modified frozen Excel schema, implementation of the health model, and beta require their own explicit approval and independent evidence. Documentation freeze alone is not deployed code. This roadmap tracks accepted stage gates without promising unverified delivery dates.
