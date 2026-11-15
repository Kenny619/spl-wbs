# SPT-WBS | Project Status & Roadmap

**Last updated:** 2026-11-15 (JST)  
**Audience:** Project sponsors, executives, Product Owner, and delivery stakeholders  
**Maintained by:** Delivery Management Office (DMO)  
**Purpose:** The business-facing source of truth for completed milestones, current priorities, future deliverables, decisions and material risks. Technical detail stays in linked GitHub issues and pull requests.

> **Overall status: STAGE A ACCEPTED. STAGE B ACTIVE — owner-approved direction, bounded development initiated (draft PRs; not accepted).** The core Excel-managed application works in the **tested personal Windows/Edge environment**. Corporate deployment, multi-user concurrency and product beta **have not been approved**.

## Executive snapshot

| Executive question | Current position |
|---|---|
| **What are we building?** | An easy-to-use project schedule and work breakdown tool where an Excel workbook remains the project-owned source of truth. Project managers can maintain tasks, follow risks and prepare meeting reports; other users can review project progress. |
| **What is complete?** | **Stage A — reliable Excel-managed foundation, ACCEPTED on 15 November 2026.** Workbook loading, editing, guarded saving, backups, project data, Calendar, Manual Under Watch, Meeting Review, Reports, and **five Recent Projects** passed the agreed personal-PC acceptance checks. The established read-only viewer is preserved. |
| **Where are we now?** | **Stage B — everyday usability, initiated.** Product Owner approved the proposed Stage B approach and four default design directions on 15 Nov. Documentation contract [PR #79](https://github.com/Kenny619/spl-wbs/pull/79) updated; PGCM display-only implementation started in draft [PR #80](https://github.com/Kenny619/spl-wbs/pull/80). No Stage B feature yet QA-verified or accepted. |
| **What happens next?** | Deliver and accept Stage B, then **Stage C — create tasks and projects from within the app**, including practical templates. A separate Product Owner decision determines when controlled beta testing may begin **after A, B and C are accepted**. |
| **Main dependencies?** | Corporate Edge file-access restrictions and two moderate dependency advisories remain outside Stage A personal-PC acceptance. Both must receive an appropriate disposition before any corporate rollout; shared-file concurrency must be separately demonstrated. |
| **Delivery forecast?** | **No committed Stage B/C completion dates or reliable remaining-effort estimate** yet. Forecasts will be introduced only after their specifications and implementation scope are agreed. |
| **Decision needed now?** | **None for starting bounded development**: owner approved the Stage B approach and four design defaults. Later: inspect integrated Stage B interactions and decide acceptance/merge after independent QA. No repeated Stage A owner testing unless affected behavior changes. |

## Roadmap at a glance

| Phase / milestone | What stakeholders gain | Status as of 15 Nov 2026 | Exit criteria / next gate |
|---|---|---|---|
| **Stage A — Excel Managed v1 foundation** | Reliable Excel-backed planning and reporting: task edits, Save/Save As, history, backups, recovery checks, shared Calendar/Watch, Meeting Review, Reports and quick recent-project switching | **ACCEPTED & INTEGRATED** | Owner E1–E17 and MRU-01–03 PASS, full merged-build CI PASS. Scoped to tested personal Windows/Edge with fictional local files; **not a corporate release** |
| **Stage B — Everyday usability (v1.1)** | Less navigation and visual clutter; notices by importance; task-linked “Needs Attention”; PGCM highlight display preference; selected local preference refinements | **ACTIVE — DESIGN APPROVED / DRAFT DEVELOPMENT** | Agree experience/acceptance spec for [#17](https://github.com/Kenny619/spl-wbs/issues/17), [#16](https://github.com/Kenny619/spl-wbs/issues/16) and bounded [#21](https://github.com/Kenny619/spl-wbs/issues/21); implement, independently verify and obtain owner acceptance |
| **Stage C — Project authoring (v1.2)** | Add new tasks/entities and launch new projects using an empty workbook or practical preconfigured templates | **PLANNED — NOT STARTED** | Approve and deliver safe [entity creation #23](https://github.com/Kenny619/spl-wbs/issues/23) and [new-project onboarding #24](https://github.com/Kenny619/spl-wbs/issues/24); validate workbook integrity and owner workflow |
| **Controlled beta — Go/no-go** | A small group of users tests end-to-end viewing, editing, reporting and project creation in a supported environment | **FUTURE DECISION — NOT AUTHORIZED** | Stages **A+B+C accepted**, supported-environment and security assessment, a verified rollback-capable distribution, and separate owner authorization. No automatic beta launch |
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

1. **Stage B owner-approved direction (15 Nov).** The four proposed UI defaults were approved; [draft requirements PR #79](https://github.com/Kenny619/spl-wbs/pull/79) records the implementation/acceptance boundaries. [Draft feature PR #80](https://github.com/Kenny619/spl-wbs/pull/80) starts the isolated browser-local PGCM toggle. Lean header, actionable Needs Attention and prioritized notices remain next. Avoid piecemeal redesign; DES-012 Review08 controls.
2. **Stage B delivery and acceptance.** Implement the approved usability improvements, retain safe workbook behavior and accessibility, test the integrated build, then obtain Product Owner acceptance.
3. **Stage C project authoring.** Progress from safe task creation to an empty-project workflow and validated project templates, with separate owner acceptance.
4. **Beta readiness decision, not an automatic launch.** Review A–C evidence, supported devices, multi-user constraints, security, support and rollback before selecting a pilot.
5. **Later corporate deployment architecture.** Only after the shared design/features are stable, evaluate a non-PM read-only Viewer and a PM Node.js localhost application against enterprise Edge/IT policy and file-integrity risks. Merely hosting the same browser code on localhost is **not** proof that the folder picker will work.

## Reporting and maintenance contract

This page is the **single executive-facing progress summary**. It is not an alternative product spec, live performance dashboard, or inventory of every issue.

- **Owner:** SPT-WBS Delivery Management Office. Review **weekly (Monday, Japan time)** and **immediately after material owner acceptance, new phase start/close, scope change, major risk, or changed forecast**. Update the date and source links whenever those facts change.
- **Evidence rules:** read the latest GitHub [roadmap/epic #1](https://github.com/Kenny619/spl-wbs/issues/1), relevant phase issues, merged PRs and acceptance records. Never mark a phase “accepted” from passing CI alone. Keep integrated, owner-accepted, planned and release-authorized status distinct.
- **Executive clarity:** lead with the current phase, what changed since the previous review, next outcome, material risk and genuine Product Owner decision. No invented completion percentages, delivery promises, engineering hours or unsupported savings estimates.
- **Audit trail:** the Markdown file's Git history is the status change log. Avoid maintaining a parallel manually synchronized project-status spreadsheet. Detailed Actions cost measurements remain in [Issue #73](https://github.com/Kenny619/spl-wbs/issues/73).
- **Governance:** routine documentation and progress reconciliation are delegated; changing scope, authorizing beta/production release or waiving safety limitations is **not** delegated by this file.

**Detailed project record:** [Product roadmap and acceptance epic](https://github.com/Kenny619/spl-wbs/issues/1) · [Current readme](../README.md) · [UI/UX decision workstream](https://github.com/Kenny619/spl-wbs/issues/25) · [Stage B usability #17](https://github.com/Kenny619/spl-wbs/issues/17).
