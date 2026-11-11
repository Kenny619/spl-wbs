# DEC-FUNC-2026-11-11 — Product Owner functional direction after Review 08

**Date:** 2026-11-11 JST · **Decision source:** [GitHub Issue #25, owner comment #6786902711](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6786902711).  
**Controlling visual baseline:** [DES-012 Review 08](../../design/concepts/DES-012-consolidated-review08-task-detail.html), exact approved HTML blob `de6ebaa63aa035ba741b4435cf1cdb9d1166d958`.  
**This record captures owner choices, not a release, new workbook schema, production coding authority or blanket implementation acceptance.**

## 1. Exact decisions and consequences

| Decision | Owner selection | Binding direction | What it does **not** approve |
|---|---|---|---|
| **MR-D01: Meeting Review delivery** | **B** | **Do not ship a status-only first version of Meeting Review.** Under Watch determines central page UX; complete its source/lifecycle specification, then integrate Meeting Review and Watch **together** against approved Review 08 layout | “MR-01 first” recommendation now **REJECTED / SUPERSEDED**. Does not approve developing either feature before functional/data contracts freeze |
| **WATCH-D01: shared storage ownership** | **A** | One person's risk/watch updates must be visible to other project members; watch state needs a **shared project-authoritative, auditable source** with reliable cross-user freshness | A single local XLSX copy or browser-local preferences **cannot** be advertised as shared multi-user visibility. No particular cloud, server or workbook schema approved |
| **WATCH-D02: initial health/severity** | **A** | Initial Watch / Clear / Unknown evidence-based lifecycle, with independently attributable reasons; **no invented Red/Amber** absent separate approved source/threshold | Does not redefine existing `TaskStatus` or retrofit fabricated RAG into Report 1.1 |
| **WATCH-D03: clearance** | **A** | One lightweight contextual Resolve action, traceable accepted revised commitments where applicable, automatic re-check of remaining independent reasons | No “Set Green”, no silent clearance through date edit, and no authority/persistence details yet approved |
| **CAL-D01: blackout location** | **A** | Move blackout controls **visually into Settings**, but **keep their existing session-scoped state/behavior**; separate project-persistent calendar remains Stage D #20 | No workbook change, new project setting schema, migration, reset semantics or Stage D feature authorization |

**Owner rationale for MR B:** “since watch list impacts the UX of the entire Meeting Review page.” This means the Meeting Review functional architecture must be designed **around real watch semantics** rather than treating a status-only agenda as a sufficient substitute.

## 2. Status distinctions

- **Review 08 visual design** = APPROVED exact source; do not redesign.
- **MR-D01 B and WATCH-D01/D02/D03 A; CAL-D01 A** = OWNER-DECIDED **product directions**; preserve as hard scope constraints during requirements analysis.
- **MR + Watch schemas, trigger thresholds, evidence sources, conflict semantics, and exact shared service** = OPEN DESIGN/ARCHITECTURE REQUIREMENTS, not frozen or authorized for product implementation.
- **Session-only Calendar Settings relocation** = endorsed UI location change, still requires bounded technical integration scope and regression tests before production code mutation.
- **Frozen workbook/edit/history/settings/report specs #3–#7** = remain unchanged. In particular new watch sheets, metadata, a shared backend or report RAG cannot be introduced without explicit spec changes.
- **Current draft PR #37** = Report 1.1 and existing Gantt source; no silent addition of MR/Watch. **Product UAT kit hold** remains until feature coverage/design parity gates defined and cleared.

## 3. Recommended dependent sequence (no needless owner reapproval)

1. Capture owner decisions across the canonical Design Office documents (this record and issue comment).
2. Assess shared state/data authority architecture, permission and offline/concurrency constraints; do not assume the existing local file architecture provides cross-user freshness.
3. Specify evidence-based Under Watch reason lifecycle, automatic signals/unknown states, accepted commitment mechanism and low-friction resolution. Define auditable source/storage, safety checks and migration behavior **before** deciding risk/meeting implementation scope.
4. Specify Meeting Review as an integrated Watch-enabled view using the already approved visual hierarchy, review date, filter/Search and Task Detail behaviors; do not ship interim status-only MR.
5. Separately document simple UI-only relocation of session blackout settings; freeze stable presentation and test behavior. Persistent project calendar stays Stage D, no cross-user assumption.
6. Bring the smallest **genuine unresolved owner choice** as a consolidated GitHub proposal: shared source and cross-user access model, with concrete privacy/security tradeoffs and no premature implementation.
7. Only after an exact functional contract is frozen and separately authorized, delegate isolated implementation/testing with no Gantt engine replacement, no unsafe workbook writes and no mock state presented as production.

## 4. Anti-regression and quality gates

- Genuine v18 Gantt date scale, hierarchy, dependencies, fit/zoom, and nonworking shading remain intact.
- Shared Meeting Review/Watch must use stable project/task IDs, authorized data sources, appropriate visibility/freshness, conflict detection and durable audit.
- User-specific search/filters/view preferences remain independent from shared project watch state.
- Existing written Edit/Save/Discard/Cancel and verified backup/readback behavior cannot be bypassed.
- No contradictory report risk/health state. Absent independent RAG source, the report remains status-only per frozen #7.
- No code changes/merged PR/release/Stage A completion or new Owner UAT kit implied by these decisions.
