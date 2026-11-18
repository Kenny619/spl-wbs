# SPT-WBS | Project Status & Roadmap

**Last updated:** 2026-11-18 (JST)  
**Audience:** Project sponsors, executives, Product Owner, and delivery stakeholders  
**Maintained by:** Delivery Management Office (DMO)  
**Purpose:** The business-facing source of truth for completed milestones, current priorities, future deliverables, decisions and material risks. Technical detail stays in linked GitHub issues and pull requests.

> **Overall status: STAGE A ACCEPTED; STAGE B IMPLEMENTATION IN PROGRESS.** The core Excel-managed application works in the **tested personal Windows/Edge environment**. Corporate deployment, multi-user concurrency and product beta **have not been approved**.

## Executive snapshot

| Executive question | Current position |
|---|---|
| **What are we building?** | An easy-to-use project schedule and work breakdown tool where an Excel workbook remains the project-owned source of truth. Project managers can maintain tasks, follow risks and prepare meeting reports; other users can review project progress. |
| **What is complete?** | **Stage A — reliable Excel-managed foundation, ACCEPTED on 15 November 2026.** Workbook loading, editing, guarded saving, backups, project data, Calendar, Manual Under Watch, Meeting Review, Reports, and **five Recent Projects** passed the agreed personal-PC acceptance checks. The established read-only viewer is preserved. |
| **Where are we now?** | **Stage B — usability implementation accepted and integrated; health policy specification still open.** The owner accepted and merged [Needs Attention/severity PR #92](https://github.com/Kenny619/spl-wbs/pull/92) on Nov 16 and [PGCM/header PR #98](https://github.com/Kenny619/spl-wbs/pull/98) on Nov 18, after 3/3 focused physical UAT PASS for each. [Health specification #82](https://github.com/Kenny619/spl-wbs/issues/82) has approved decisions, but remaining lifecycle rules still require review. |
| **What happens next?** | Finalize remaining Stage B Under Watch/RAG **functional specification** (not implementation), then deliver Stage C task/project authoring. Afterwards close two distinct mandatory **pre-beta** milestones: health/report integration and comprehensive UX/UI alignment. Beta requires a separate go/no-go and is not authorized. |
| **Main dependencies?** | Corporate Edge file-access restrictions and two moderate dependency advisories remain outside Stage A personal-PC acceptance. Both must receive an appropriate disposition before any corporate rollout; shared-file concurrency must be separately demonstrated. |
| **Delivery forecast?** | **No committed Stage B/C completion dates or reliable remaining-effort estimate** yet. Forecasts will be introduced only after their specifications and implementation scope are agreed. |
| **Decision needed now?** | No further roadmap approval required. Next substantive decision is the detailed Under Watch/RAG/Clear functional policy under #82. New workbook/schema design, Report 1.1 contract revisions, beta and release retain separate gates. |

## Roadmap at a glance

| Phase / milestone | What stakeholders gain | Status as of 18 Nov 2026 | Exit criteria / next gate |
|---|---|---|---|
| **Stage A — Excel Managed v1 foundation** | Reliable Excel-backed planning and reporting: task edits, Save/Save As, history, backups, recovery checks, shared Calendar/Watch, Meeting Review, Reports and quick recent-project switching | **ACCEPTED & INTEGRATED** | Owner E1–E17 and MRU-01–03 PASS, full merged-build CI PASS. Scoped to tested personal Windows/Edge with fictional local files; **not a corporate release** |
| **Stage B — Everyday usability (v1.1)** | Compact accessible header, actionable status/overdue attention, prioritized notices, browser-local PGCM preference; **finalize Under Watch/RAG business semantics**, not prematurely implement them | **USABILITY ACCEPTED AND MERGED; HEALTH SPECIFICATION IN PROGRESS** | Owner-accepted integrated [PR #92](https://github.com/Kenny619/spl-wbs/pull/92) and [PR #98](https://github.com/Kenny619/spl-wbs/pull/98), all 6 focused UAT checks PASS; remaining [#82](https://github.com/Kenny619/spl-wbs/issues/82) specification decisions/freeze needed before overall Stage B closure. No new RAG workbook fields or source writes. |
| **Stage C — Project authoring (v1.2)** | Add new tasks/entities and launch new projects using an empty workbook or practical preconfigured templates | **PLANNED — NOT STARTED** | Approve and deliver safe [entity creation #23](https://github.com/Kenny619/spl-wbs/issues/23) and [new-project onboarding #24](https://github.com/Kenny619/spl-wbs/issues/24); validate workbook integrity and owner workflow |
| **Pre-beta milestone 1 — Health & reporting integration** | Auditable Under Watch reason lifecycles and **Red/Amber/Green only** health across Schedule, Task Detail, Meeting Review, Needs Attention and later versioned Report 1.1; shared factual interpretation and backward compatibility | **APPROVED ROADMAP GATE — SPEC IN B, DELIVERY AFTER C** | [#82](https://github.com/Kenny619/spl-wbs/issues/82) remaining semantics frozen; any workbook/report delta approved separately, implemented, independently QA verified and owner accepted. Neither obsolete `Unknown` nor `Clear` is a RAG health state. |
| **Pre-beta milestone 2 — Holistic UX/UI consolidation** | Coherent end-to-end usability on laptop, conference display and supported Edge; consistent navigation, layout, typography, accessible colors and controls across all screens | **APPROVED ROADMAP GATE — AUDIT DURING B/C, CONSOLIDATE AFTER C** | [#25](https://github.com/Kenny619/spl-wbs/issues/25) multi-view audit, revised controlled design baseline if needed, integrated implementation and focused owner visual/functional acceptance |
| **Controlled beta — Go/no-go** | A small group of users tests end-to-end viewing, editing, reporting, project health and project creation in a supported environment | **FUTURE DECISION — NOT AUTHORIZED** | Stages **A+B+C accepted**, both owner-approved pre-beta gates verified and accepted, supported-environment/security/concurrency assessment, rollback-ready distribution, and separate owner authorization. No automatic beta launch |
| **Stage D — Additional project configuration** | Broader shared project settings, including multiple blackout periods and their ownership rules | **LATER / DEFERRED** | New functional contract and validated workbook-data behavior; **not required to enter beta** |
| **Stage E — Advanced planning** | Richer hierarchy/dependency editing and direct manipulation of schedule relationships | **LATER / DEFERRED** | Resolve WBS change semantics and approve the more advanced editing model; **not required to enter beta** |
| **Corporate distribution options** | Potential distinct **non-PM read-only Viewer** and **PM localhost Node.js Manager**, sharing the same application core | **LATE-STAGE ARCHITECTURE — DEFERRED** | Revisit after common product features and holistic design stabilize; assess IT policies, file access, access control and security before implementation/rollout |

**How to read status:** *Accepted* means the Product Owner verified the defined outcome. *Integrated* means its implementation was merged. *Scoping/design* is not implementation approval. *Planned/deferred* does not imply completion dates. The **functional Stage A acceptance** cannot be interpreted as production/corporate deployment approval.

## Milestones achieved

| Date (JST) | Business milestone | Evidence |
|---|---|---|
| **5 Nov 2026** | Approved read-only viewer v18 retained as the reference starting point | [Product UI/design direction](https://github.com/Kenny619/spl-wbs/issues/1) and [approved DES-012 Review08 cross-view reference](https://github.com/Kenny619/spl-wbs/blob/design/ui-overhaul-foundations-v0.1/design/concepts/DES-012-consolidated-review08-task-detail.html) |
| **15 Nov 2026** | Accepted Excel-managed planning/reporting work integrated, including shared Calendar, Manual Watch, Meeting Review, guarded Save, and Reports | [Integration PR #76](https://github.com/Kenny619/spl-wbs/pull/76), [accepted integrated personal-PC tests](https://github.com/Kenny619/spl-wbs/issues/11#issuecomment-6888417573) |
| **15 Nov 2026** | More selective CI checks integrated to reduce unnecessary development build work, with required full regression preserved | [CI cost PR #77](https://github.com/Kenny619/spl-wbs/pull/77); aggregate ≥60% compute-saving target **not yet proven**, [usage monitoring #73](https://github.com/Kenny619/spl-wbs/issues/73) |
| **15 Nov 2026** | Five Recent Projects implemented; owners can reopen verified recent Excel projects after permission checks | [Feature PR #78](https://github.com/Kenny619/spl-wbs/pull/78), merged product commit \`8b4cb6b9239ebaf7fd8f3df6cf35df3dc5e91001\`; [post-merge CI: 270 unit / 94 Windows browser PASS](https://github.com/Kenny619/spl-wbs/actions/runs/43703177075) |
| **15 Nov 2026** | **Stage A formally accepted** after final real personal Edge checks | [Stage A owner acceptance](https://github.com/Kenny619/spl-wbs/issues/1#issuecomment-6893324889), [MRU-01–03 owner PASS](https://github.com/Kenny619/spl-wbs/issues/21#issuecomment-6893316798) |

## What people can do today — and what remains restricted

**Available in the accepted personal-PC functional scope:** review Excel-backed schedules, inspect task details, edit supported workbook fields as a project manager, save and keep update history with backup/recovery safeguards, consult recorded Watch information and shared Calendar, generate truthful meeting/status reports, and switch among up to five verified recently used projects.

**Not yet certified for corporate operation:** reliable directory access under managed corporate Edge; simultaneous edits to one synced/shared workbook by multiple users; exclusive locking when Excel has the file open; verified corporate access roles or sensitivity-label behavior. A future read-only UI must also rely on the **underlying shared-file permissions** to stop unauthorized edits; removing Save buttons alone is not access control.

**Open release risks:** the locked ExcelJS dependency and its transitive UUID dependency have **two linked moderate advisories** under [Issue #14](https://github.com/Kenny619/spl-wbs/issues/14). Existing high/critical audit checks and scoped tests pass, but those do **not** waive the moderate findings or substitute for a release/security assessment. Corporate file access and potential later packaging variants are recorded in [Issue #11](https://github.com/Kenny619/spl-wbs/issues/11#issuecomment-6892860396).

## Next outcomes and decisions

1. **Close the remaining Stage B health specification (#82).** Stage B usability #16/#17/B2/B3 is already owner-accepted and integrated through [#92](https://github.com/Kenny619/spl-wbs/pull/92) and [#98](https://github.com/Kenny619/spl-wbs/pull/98). Finish only unresolved HW-02/03/04/05/06/08 owner decisions and health contract freeze; preserve approved HW-01 three-state taxonomy and HW-07 report-content deferral. Do not repeat accepted Stage A or six Stage B physical UAT checks.
2. **Specify health before implementation (#82).** Settle independently sourced manual RAG, Red/Amber/Green/Unknown, meaning of Clear, overlapping open/closed Watch reasons, automatic schedule flags vs manual judgment, persistence/actor provenance, change history and Report 1.1 current-versus-period reporting. Existing [Manual Watch report addendum](specifications/REPORT11_MANUAL_WATCH_ADDENDUM_1.md) explicitly does **not** claim Green/Clear. Spec preparation occurs in B; implementation only after separately approved contract.
3. **Begin holistic UX/UI audit in parallel (#25).** Audit Schedule, Task Detail, Meeting Review, Reports, History, Settings, Calendar, project open/save, notifications, and Stage C authoring flows using DES-012 Review08 as the current controlling reference. Review navigation hierarchy, spacing, information density, visual design system, typography, dark/light contrast, keyboard accessibility, mobile/laptop/conference layouts and end-to-end meeting workflows. No isolated cosmetic rework that must be redone after feature stabilization.
4. **Deliver Stage C authoring (#23/#24).** Implement safe task/entity creation, new-project onboarding and templates with validated workbook relationships and history. Record focused owner acceptance.
5. **Pre-beta health/report integration acceptance.** Implement the frozen #82 delta in the common model, workbook, and Report 1.1 outputs after authoring stabilizes (parallel independent implementation may begin when dependencies allow). Verify manual reason clearance **does not automatically mean Green**; confirm cross-view parity, synthetic workbook safety, reporting facts and history.
6. **Pre-beta holistic UX/UI consolidation and acceptance.** Reconcile #25 findings with the now-stable B/C/health feature inventory, approve a single updated baseline if needed, integrate designs consistently, and run one end-to-end focused owner experience UAT.
7. **Separate beta go/no-go.** Reassess the approved A–C roadmap and confirm fulfillment of both mandatory pre-beta gates; validate Edge distribution, role/access/security, shared Excel concurrency restrictions, advisories and rollback. **No automatic beta or corporate rollout**.
8. **Later corporate distribution architecture.** Revisit non-PM read-only Viewer / PM Node.js localhost variants after shared product experience stabilizes; hosting on localhost alone does not prove permitted folder access.

### Cross-stage product dependencies and safeguards
- **Single health authority:** derive same display of manual Watch, task status, schedule risk and reviewed health across all views; do not independently reimplement status logic in each UI/report.
- **Reporting cannot invent certainty:** missing/incomplete RAG source displays Unknown/unverified, never an inferred Green or historical clearance. Amend frozen Report 1.1 via separately approved addendum, preserving HTML/plain/Outlook parity.
- **Project facts vs personal preferences:** Watch/Calendar decisions belong to Excel; theme, columns, PGCM *highlight* and recent files remain user-local. Stage D multi-blackout remains deferred.
- **Stage B is not the full redesign:** complete bounded usability while auditing cross-view UX in parallel, then consolidate after core functionality.
- **Product Owner roadmap approval (2026-11-15 JST):** Both pre-beta milestones are mandatory readiness gates. Approval sets sequencing and exit requirements only. It does **not** freeze undecided Green/Clear/RAG business semantics, authorize workbook schema amendments, approve application implementation/merge, commit completion dates, or authorize beta/corporate release.

## Reporting and maintenance contract

This page is the **single executive-facing progress summary**. It is not an alternative product spec, live performance dashboard, or inventory of every issue.

- **Owner:** SPT-WBS Delivery Management Office. Review **weekly (Monday, Japan time)** and **immediately after material owner acceptance, new phase start/close, scope change, major risk, or changed forecast**. Update the date and source links whenever those facts change.
- **Evidence rules:** read the latest GitHub [roadmap/epic #1](https://github.com/Kenny619/spl-wbs/issues/1), relevant phase issues, merged PRs and acceptance records. Never mark a phase “accepted” from passing CI alone. Keep integrated, owner-accepted, planned and release-authorized status distinct.
- **Executive clarity:** lead with the current phase, what changed since the previous review, next outcome, material risk and genuine Product Owner decision. No invented completion percentages, delivery promises, engineering hours or unsupported savings estimates.
- **Audit trail:** the Markdown file's Git history is the status change log. Avoid maintaining a parallel manually synchronized project-status spreadsheet. Detailed Actions cost measurements remain in [Issue #73](https://github.com/Kenny619/spl-wbs/issues/73).
- **Governance:** routine documentation and progress reconciliation are delegated; changing scope, authorizing beta/production release or waiving safety limitations is **not** delegated by this file.

**Detailed project record:** [Product roadmap and acceptance epic](https://github.com/Kenny619/spl-wbs/issues/1) · [Current readme](../README.md) · [UI/UX decision workstream](https://github.com/Kenny619/spl-wbs/issues/25) · [Stage B usability #17](https://github.com/Kenny619/spl-wbs/issues/17).
