# DEC-UI-2026-11-13 — DES-012 Review08 is the sole approved cross-view visual baseline

**Decision date:** 2026-11-13 JST  
**Authority:** Explicit Product Owner correction in this conversation: “The Report 1.1 Review02 prototype was actually older than the DES-012 consolidated Review08. Let's make DES-012 as the approved baseline for UI at this moment, **including reporting page**.”

## Exact controlling artifact and precedence

- **ONLY CURRENT UI VISUAL BASELINE across every SPT-WBS screen:** [DES-012 Consolidated Design Review08 interactive HTML](../../design/concepts/DES-012-consolidated-review08-task-detail.html), immutable Git **blob `de6ebaa63aa035ba741b4435cf1cdb9d1166d958`**, branch `design/ui-overhaul-foundations-v0.1`. This **includes the Reports page**. The visual approval covers the app-wide shell, typography, spacing, component placement, navigation, colors/contrast, panel composition, and interaction design.
- **Historical visual artifact ONLY — NOT a competing Reports baseline:** [Report 1.1 interactive Review02](https://github.com/Kenny619/spl-wbs/blob/docs/report-1-1-po-approved-direction/docs/prototypes/SPT-WBS_Report_1.1_Interactive_Prototype_Review02.html), blob `4c22e18d2f3c3ab69379e8752708d46e02cabf01`. Its prior acceptance is historically valid, but **superseded as an active visual/layout authority** by this Product Owner decision. Do not require its two-column or KPI/paper micro-layout to override or constrain what Review08 actually shows; if Review08 leaves an implementation micro-detail unspecified, propose a Review08-consistent solution rather than reactivating Review02 as an alternative standard.
- Existing design approval [DEC-DES-012, Nov 11](22_DES012_REVIEW08_OWNER_DESIGN_APPROVAL.md) remains the historical origin. This **new November 13 decision clarifies precedence across all three pages**, resolving the previous inaccurate “Review02 prevails for Reports” instruction.

## Included without exceptions

1. **Schedule:** complete Review08 WBS/Gantt visual system and functional controls (real time-scaled Gantt must be preserved at implementation), chart-local Exceptions/Workstreams, zoom, navigation, search, per-column filtering, dependencies, dates, owner/status, scrolling and theme.
2. **Meeting Review:** Review08 full page and navigation, workstream/exception grouping, independent search/filter and same fixed-size Task Detail inspector — **visual baseline only** until genuinely Excel-backed Watch behavior and required approvals are delivered. Do not substitute a status-only interim implementation (MR-D01 B).
3. **Task Detail:** persistent selected-task identity and actions; Owner/Priority, **Option A integrated Start/Finish/Days Remaining/recorded Progress rail**, missing-progress structural stability and milestone treatment; description, linked parent/predecessor/dependent tasks with return navigation, chronological Updates and guarded inline editing.
4. **Reports:** **DES-012 Review08 Reports page controls, layout, report builder, preview, colors, content hierarchy and typography are controlling**. Preserve frozen Report 1.1 business behavior and valid real data/copy/export semantics **as functional requirements**, but do not carry forward the older Report02 prototype's appearance when inconsistent with DES-012.
5. **Global:** common header, right Settings/History drawer, personal visual preferences, light/dark parity, consistent scroll/height/width and accessibility.

## Nonvisual contract and release guardrails

- **UI visual baseline ≠ data/business acceptance.** Frozen requirements #3–#7, including Report 1.1 generation/UpdateHistory/clipboard contracts, are **not modified by this visual decision**. Any needed functional change such as shared ProjectName report source still requires its own approved amendment.
- **Under Watch/Meeting workflow:** Excel-owned shared Watch reasons, Calendar and accepted commitments; real risk rules/actor validation remain separately gated. The sample DES-012 design interaction is synthetic, not proof of implemented authority or committed records.
- **Delivery:** Stage A original roadmap and explicit Stage B/C/beta gates do not change. The distinct Calendar+Watch+Meeting integrated package has not been assigned a delivery stage. Do not turn this visual approval into a silent beta obligation or product authorization.
- **Current HOLD still applies:** No new UAT ZIP, no application UI integration, no main merges/releases or corporate workbook changes until the exact approved complete HTML is reconfirmed and an implementation plan covers *every* approved UI element. Draft PR #60 remains partial, historically narrow CI PASS but **NOT** complete Review08 visual parity.
- **Traceability:** Update all current README and delivery/Design Office references to state that **DES-012 alone is current**, even for Reports. Keep older documents unchanged as *historical evidence* where appropriate, but explicitly supersede outdated active-precedence statements in an addendum.

**Next gate:** future actual UI integration and screenshot regression map directly to DES-012 across Schedule/Meeting/Task Detail/**Reports**, not to two competing prototypes. No repeated cosmetic approval request for an already approved baseline.
