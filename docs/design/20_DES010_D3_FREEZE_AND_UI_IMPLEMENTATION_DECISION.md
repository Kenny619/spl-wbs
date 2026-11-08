# DES-010 — D3 Design Freeze and Bounded Managed-UI Implementation Decision Package

**Prepared:** 2026-11-08 JST  
**Product Owner decision: PENDING; this document is NOT an approval.**  
**Controlling:** [UI Overhaul Issue #25](https://github.com/Kenny619/spl-wbs/issues/25) · design-only [draft PR #29](https://github.com/Kenny619/spl-wbs/pull/29)  
**Current exact design candidate:** [DES-010](../../design/concepts/DES-010-gantt-local-scope.html), **Git content blob `77dc7333ee4e061dc06e54d74caa30b07bdbe79e`**. Approved v18 remains the production visual baseline until an independently accepted implementation supersedes it.

## Executive decision

The Product Owner has repeatedly endorsed the visual direction culminating in DES-010. The concept is now backed by real Windows Chromium evidence, not only mocked DOM checks. Rather than iterate indefinitely, propose two **distinct, bounded PO decisions**: (A) freeze the exact D3 interaction reference and (B) authorize only presentation integration of **already-implemented, frozen-scope managed functionality** into an isolated draft branch. Both can be decided together but remain independently scoped and revocable. Neither permits merging or release.

## Evidence for decision A — exact design source

- **Windows Chromium CI SUCCESS:** [run #42447648745](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745), **41/41 browser tests PASS**, Build/Unit job PASS; ordinary read-only v18 build preserved.
- [Playwright DES-010 test](../../test/browser/des010-design-review.spec.ts) independently renders browser layouts at **1024×768, 1366×768, 1440×900**; checks same inspector width/height across Schedule and Meeting, fixed primary nav, Gantt-local scope switching, internal scrolling, Reports fixed toolbar, Settings/History visibility at **860, 1024 and 1440px**, unsaved-edit protection and eight-inclusive-date report preview.
- [Screenshots and test report artifact #13603389072](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745/artifacts/13603389072).
- **Genuine responsive defect caught and corrected:** initial [run #42447420570](https://github.com/Kenny619/spl-wbs/actions/runs/42447420570) was **40/41** because Settings was hidden at 1024px; corrected CSS and reran full green at source blob above.
- The owner's successive DES-006–010 feedback confirms the intended layout, panel proportions, Gantt-local Exceptions/Workstreams, icon-only header, right slide-out Settings/History and eight-day report navigation. However **physical Microsoft Edge / owner visual spot-check of the corrected source and assistive-tech accessibility remain open**.

### A — Proposed visual freeze (separate PO authority)

Freeze **DES-010 exact Git blob** as the **D3 Excel Managed Variant visual and interaction design reference** for future implementation planning, subject to maintaining identified frozen functional requirements. Continue to preserve the currently approved v18 read-only SharePoint viewer unchanged. This is not acceptance of a functioning implementation, a production app version or deployment.

**Approval test:** Product Owner acknowledges the exact source blob and the single technical Settings breakpoint fix following their prior concept endorsements. Any later materially changed UI design needs a new design decision and artifact version.

## Evidence for decision B — existing managed code reuse

The active **separately authorized restricted development preview** [Excel Managed Variant draft PR #19](https://github.com/Kenny619/spl-wbs/pull/19) already has real workbook Save, Save As, recovery inspection, stable task draft guard, actual `UpdateHistory` history, persisted local Settings and frozen `reports.ts` output engines. **Do not rebuild these based on synthetic DES-010 fixture logic.**

See [code-level interface map](19_DES010_TO_MANAGED_CODE_INTEGRATION_MAP.md), with concrete paths under `src/managed/`. Importantly `ManagedReports.open()` already uses **From = selected-timezone today minus seven calendar days** and **Through = today**, which means **eight inclusive dates**. The preferred default does not need a new report algorithm.

### B — Proposed bounded UI implementation authorization (optional separate owner decision)

Permit an isolated **draft UI-adaptation feature branch** derived from the current managed implementation head (not a merge of design PR #29):

1. **UI-INT-01 / Shell & Schedule:** shared app header/nav, WBS/Gantt panel-local scope controls *only where backed by existing authorized task selection semantics*, full-height scroll-contained layout, same selected-task inspector width, reusable existing editor/chooser/Save-State access. Do not import sample watch logic.
2. **UI-INT-02 / Settings & History:** adapt existing `ManagedSettings`, `openManagedHistory` and underlying persisted history parser into Settings/History right drawer. Preserve full IANA timezone, local persistence, Light/Dark/System, existing v18 Columns behavior, Reset, task/date/field History filters, long text safety and grouping by ChangeSetID even in a one-action-per-row log.
3. **UI-INT-03 / Reports:** adapt existing `ManagedReports` text UI into full-height Reports workspace with fixed actions and internal content scroll. Preserve exact committed-only plain-text preview/copy, Save-event counts, verified workstream formatting, source integrity checks and existing eight-inclusive-date default.

**Mandatory boundaries for B:** draft only, no merge/release/deployment, no workbook/schema expansion, preserve existing PR #19 Stage A recovery/permission protections, no real corporate production XLSX usage; exact-SHA CI and independent QA before owner UAT.

### Excluded from B pending separate future scope approval

- New permanent **Meeting Review** workflow and precise Exceptions/Watch semantics beyond the supported existing WBS model. It may remain concept-only until its functional contract is frozen; do not port fake risk flags or sample task event history.
- Persistent project blackout/calendar configuration ([Issue #20](https://github.com/Kenny619/spl-wbs/issues/20)), hybrid Under Watch lifecycle, accepted revised commitments and dependency editing.
- A new stakeholder weekly lifecycle report of **added/completed tasks, new risk, released watch**, or removal of **logical Save-event counts** from frozen Update Report (#7) without separately approved source events and report-spec change.
- Product-wide migration of the original v18 SharePoint read-only viewer or changes to its release UI without separate explicit approval.

## Further gates after B authorization

- **UI implementation** must be an explicit isolated feature branch / draft PR, not automatic merge of design-only PR #29.
- Run existing v18 visual reference CI and all managed unit/Windows Chromium regressions. Add exact DES-010 visual acceptance tests only for actual integrated UI, with readable reports and Settings/History UAT.
- Stage A actual Windows/Edge file-locking, Excel/OOXML fidelity, backup/restart, safe permissions and dependency advisory QA from PR #19/#2/#11/#14/#8 must remain independent and must pass before production release.
- **One real Product Owner** reviews and accepts the resulting product and controls any merge, release, deployment or new feature freeze. QA/engineering may be AI agents, not invented human reviewers.

## Draft owner decision text (NOT YET APPROVED)

> I approve DES-010, exact design blob `77dc7333ee4e061dc06e54d74caa30b07bdbe79e`, as the frozen D3 visual reference for the Excel Managed Variant, with the responsive Settings fix and all existing frozen functional safeguards preserved. I separately authorize **UI-INT-01 through UI-INT-03 only** on an isolated draft integration branch reusing the existing Excel Managed implementation. Exclude new Meeting, risk/watch, project calendar persistence and new event/report schema scope until independently specified and approved. Require exact-SHA CI, independent QA and owner UAT before a future merge decision. Do not merge, release or deploy automatically.

An owner may approve **A only** and leave implementation unapproved; the two approvals are explicitly separable. Merely reading this document or saying “continue” is not automatic authorization.
