# SPT-WBS Stage B (v1.1) — Everyday Usability: proposed functional & UX contract

**State:** DRAFT for Product Owner review — NOT frozen, NOT implementation/release authorization  
**Started:** 2026-11-15 JST after Stage A owner acceptance  
**Parent:** [Product roadmap #1](https://github.com/Kenny619/spl-wbs/issues/1) · [Top-area #17](https://github.com/Kenny619/spl-wbs/issues/17) · [PGCM #16](https://github.com/Kenny619/spl-wbs/issues/16) · [Local preferences #21](https://github.com/Kenny619/spl-wbs/issues/21)  
**Sole cross-view visual authority:** [DES-012 consolidated Review08](https://github.com/Kenny619/spl-wbs/blob/design/ui-overhaul-foundations-v0.1/design/concepts/DES-012-consolidated-review08-task-detail.html)

## Business outcome
Make the WBS faster to understand and operate in daily meetings: see what needs intervention, navigate straight to the source task, and keep noncritical notifications out of the primary work area. Retain Stage A functional safety, workbook-as-source-of-truth, shared Watch/Calendar and read-only variant.

## Proposed delivery order
1. **B1 — #17 lean top area.** Remove redundant tagline "Project schedule overview · WBS visualization"; preserve clear project identity, current workbook and essential open/save state. Reduce oversized Total tasks/Progress/Needs Attention/Milestones cards to a restrained summary/attention treatment aligned with DES-012. No data signals may silently disappear.
2. **B2 — #17 actionable Needs Attention.** A status/count may be activated by mouse or keyboard to reveal the actual qualifying workbook tasks, with a clear active-filter state, workstream/WBS context and one-action navigation to Task Detail. Distinguish Blocked, At Risk, overdue, and independently recorded Under Watch; avoid falsely equating them or inventing new RAG. Avoid counting summary nodes twice. Existing column filters/search must have deterministic interaction with attention filter; present an obvious way to clear it.
3. **B3 — #17 notices.** Separate urgent actionable errors/unsaved or permission/conflict concerns from ordinary info/warnings. Deliver an accessible compact notice area or panel with severity, concise action and dismiss/revisit behavior only for safely dismissible notices. Critical Save failure or unsaved draft state cannot be silently dismissed or obscured. Prefer a bounded in-page experience to new global navigation.
4. **B4 — #16 PGCM highlight toggle.** Place a labeled On/Off preference under Settings (not a Gantt toolbar checkbox); affect PGCM visual highlighting only, not calendar/working-day calculations, workbook data, shared project settings or report contents. Persist per browser/profile where allowed, with safe fallback to a documented default. Distinguish highlight from existing PGCM calculation. Confirm the current accepted default during design review.
5. **B5 — #21 strictly optional local UX refinements.** Evaluate only tangible gaps after already accepted five Recent Projects MRU-01–03; do not retest or redesign the feature speculatively. No enlargement of recent-history footprint or storing workbook task content. Multiple blackout periods and project-owned Calendar changes remain outside B (Stage D #20). Blank starter workbook (#24a) is OPTIONAL and should not delay B; full authoring belongs to Stage C.

## Proposed acceptance checks — new/changed behavior only
- **B-01:** Top area on laptop and conference view keeps project/source/save state visible and removes duplicate filler; summary controls do not obscure primary Gantt, nor bury essential information.
- **B-02:** On a synthetic workbook with blocked, at-risk, overdue, completed/cancelled, summary and Under Watch rows, actionable attention counts and the actual visible task list agree with the documented category semantics; no double count.
- **B-03:** Selecting attention opens the right task and maintains WBS/workstream/selected context; clear action restores the previous non-attention view predictably; search/filters/keyboard navigation still work.
- **B-04:** Critical Save/permission/unsaved state remains perceivable and actionable even when notices are collapsed; benign notifications do not crowd the header; focus order and screen reader semantics are practical.
- **B-05:** PGCM toggle changes only highlighting, remains local across reload/restart when storage works, behaves safely when storage fails and changes zero workbook bytes.
- **B-06:** Light/Dark/System, 860px laptop layout, DES-012 cross-page hierarchy, read-only viewer, existing reports, Watch, Calendar, histories, Save/backup/recovery and five recent projects preserve established contracts. Run bounded regression plus full pinned integrated gate only before owner UAT/merge; do not repeat Stage A physical acceptance.
- **B-07:** Owner reviews only meaningful visual/interaction deviations and verifies targeted B-01–B-05 on a fictional Edge UAT package before Stage B acceptance. No corporate/shared workbook testing.

## Clarifications for owner design review (not blockers to drafting)
1. For top-card treatment, prefer **one compact attention summary + quieter metrics** rather than four equally prominent blocks (proposed default).
2. For attention action, prefer **filter the existing WBS and open Task Detail**, not a duplicate task list (proposed default).
3. For notices, prefer **compact persistent urgent strip with expandable notice inbox**, preserving non-dismissible Save errors (proposed default).
4. For PGCM highlight, preserve the current active visual default on first rollout to avoid a surprise behavior change (proposed default).

## Hard scope limits
- Stage A accepted on personal Windows/Edge with synthetic Excel; no re-acceptance requirement unless relevant behavior changes.
- No automatic edits, no remote workbook upload, no third-party/shared-workbook multiwriter assurance and no change to append-only UpdateHistory or guarded Save.
- Corporate Edge `file://` folder-picker failure, later non-PM read-only / PM Node localhost distributions and moderate ExcelJS/UUID advisories remain OPEN/DEFERRED and NOT waived.
- No Stage C task/project authoring, Stage D multi-blackout UX, Stage E drag/drop dependencies, beta, corporate release or deployment.
- This document proposes a review contract; feature coding/merges require an explicit owner-approved Stage B contract and normal QA gates.

## Delivery gates
1. DMO and UI/Product review the draft with #17/#16/#21 and DES-012; consolidate only genuine owner choices.
2. Product Owner freezes a versioned Stage B contract and authorizes bounded implementation.
3. Small implementation PR(s), local tests first, targeted QA; minimal Actions consumption under tiered CI policy.
4. One integrated pinned CI/Edge fictional kit; focused owner acceptance; DMO updates [executive project status](../PROJECT_STATUS.md) after material transitions.
