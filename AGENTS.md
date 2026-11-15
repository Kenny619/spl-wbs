# AGENTS.md — Gantt Viewer (MANDATORY)

## Current approved design lock — v18
- **Authoritative current UI/UX reference:** `reference/UI_BASELINE_v18_CANDIDATE.html`, SHA-256 `375425fa94e41ef7d55cc4fac8fe60ad038a2c1095ad04d735bdc1656345ad83`. The filename is retained for provenance. v18 is approved, not pending. v17 is historical only.
- NEVER alter this file, rename its interface features, redesign layouts, change colors, spacing, fonts, row/header alignment, chevron SVGs, overlays, or CSS without explicit approval.
- Build production separately and compare side-by-side/screenshots at 1440×900 and 1024px. UI test snapshots should cover Day/Week, 3-level WBS, filters, details, optional columns, and blackout dialog.
- All column labels and Task header chevron share approved bottom alignment; all task-row expand/collapse chevrons use the approved 15×15 SVG in an inline flex row, vertically centered against task names. Match approved v18 behavior.
- Workstream colors use the **15-slot approved palette**; not fixed phase/status mappings. Preserve mapping for current session through reload/import.
- Existing WBS table, hierarchy, Gantt task bars, hover, calendar settings, counters, popovers and detail panel must remain visually faithful to v18.

## Data source and security
- Accept `.xlsx` files exported/refreshed from SharePoint Lists; **no direct SharePoint API, Graph, SPFx or five-minute polling**.
- Viewer is read-only; never write to workbook or SharePoint. User opens SharePoint entry via valid exported `ItemURL` only.
- Support standalone `file://`, all scripts/styles/parser bundled. No data uploads, telemetry, remote modules, or eval. Holiday API may fetch **year only**, with offline 2026–2030 fallback.
- Remember previous workbook **best effort** using persisted file handles in compatible browsers; request permission only after an explicit user gesture when required. Always support regular file picker; don't persist task data.
- Escape all Excel text rendered into DOM; sanitize/validate URLs as approved HTTPS SharePoint host URLs (configurable allowlist). Never inject Excel values as HTML or raw CSS.

## Functional contract
- Single project; WBS depth >=3; parent/child via stable IDs, never parsing WBS code as a foreign key.
- Parent summary span derived from descendants; progress weighted by inclusive planned calendar-day durations of scheduled non-milestone leaf tasks.
- Status+Owner filters are multi-select; Type+Workstream filters appear when their columns are shown; OR within filter, AND across filters; preserve matching ancestors. Hide inactive Completed/Cancelled, without false overdue messages.
- Day / Week / Month / Quarter, Fit exactly to earliest/latest planned dates, optional FS arrows, draggable pane, right details.
- Japanese weekends/holidays shading; remaining workdays exclude weekends + public holidays, **not blackout**; hover `0 day` / `+n days` / `Overdue`, full detail message; hide remainder for Completed/Cancelled.
- PGCM nominal every 14 days anchored 2026-10-26, shift holiday meetings to next JP weekday, cancel adjusted dates in blackout; never shift recurrence. Only current/future PGCM. Day: full pale-purple column; Week: approved week marker; Month/Quarter: no PGCM marker.
- Blackout inclusive, editable during session, visually distinct and does not count as holiday. Needs Attention shows risk/blocked count and overdue count separately.

## Implementation discipline
- Modular TypeScript, isolated import adapters, pure model/calendar functions, DOM/SVG views; no monolithic refactor.
- Separate mock fixture data from production. Do not use workstream label to select fixed semantic palette color.
- For each phase: change only specified source files, run unit/browser tests, show diffs/screenshots, list limitations and stop awaiting approval.
- Test dates with Asia/Tokyo interpretation and across New Year, leap years and holidays. Future holiday coverage requires official verification and versioning; do not silently assume an unknown date is not a holiday.
- If a requirement cannot be implemented without visual regression or security exception, report the conflict; do not silently compromise.

## Standing delegation and change control (2026-11-05)
- The Product Owner has authorized continuous routine engineering, test/tooling repairs, documentation and GitHub coordination without per-action review requests. This supersedes the per-phase pause above for work within that authorized scope. Escalate product decisions and manual visual UAT; do not treat a routine progress report as an approval request.
- The Product Owner retains requirement/exception, architecture-freeze and feature-implementation approval authority. Record proposed requirement changes with the affected decision IDs, rationale, alternatives, impact, evidence and explicit disposition; never silently rewrite accepted decisions. Preserve DEC-EMV-002-01 through DEC-EMV-002-11 and keep Issue #2 open pending the required evidence and acceptance.
- Existing read-only SharePoint/export behavior and the approved v18 design protections above remain mandatory. Any future authorized Excel-managed implementation must use separate entry points, write adapters and artifacts. This delegation does not itself authorize product features or relax the existing viewer's no-write rule.
- For each scoped PR record commit, environment, commands, exit codes, limitations and CI links. Run clean-install unit/typecheck/build and applicable browser checks. Missing fixtures or red baseline tests remain failures; never skip assertions, replace the approved hash, raise screenshot tolerances or regenerate approved baselines to hide failures.
- Label automated, code-inspection, documentation and physical Windows/Edge evidence distinctly. Independent QA must review managed-save fidelity, conflicts, recovery and FS-01 through FS-12 before Issue #2 is eligible for freeze. Self-review and simulated browser behavior are not independent QA or physical filesystem acceptance.
- Maintain reviewable branches/PRs and synthetic test data. The existing prohibitions on unauthorized merging, deployment, release and requirement completion remain in effect; this standing delegation authorizes routine preparation and verification, not those actions.

## Historical migration-preparation record (superseded by adoption below)
- The Product Owner explicitly authorized preparing a reviewed migration to the supplied v18 viewer. This is a scoped exception to the old test-oracle choice, not acceptance of new visuals or product behavior.
- Preserve the v17 approval/hash above and the unchanged historical tests under `test/historical/v17/`. The original v17 bytes remain unavailable; do not claim historical integrity was verified or rename v18 to v17.
- Pin the supplied compiled candidate at `reference/UI_BASELINE_v18_CANDIDATE.html`, SHA-256 `375425fa94e41ef7d55cc4fac8fe60ad038a2c1095ad04d735bdc1656345ad83`, with source commit/blob and explicit pending status in `reference/baseline-manifest.json`.
- Active integrity/holiday checks may use that pinned candidate and independently extracted data. Do not compare compiled first-style text to production source CSS or execute strings to extract holiday data. Guard unchanged product CSS separately.
- Browser review must load the same synthetic workbook into reference and current product at the fixed clock and 1440×900/1024 widths. Retain differences as failing comparisons/attachments; do not regenerate or approve snapshot images to make CI green.
- Independent QA and Product Owner visual UAT are required before candidate acceptance. Production source, the read-only workflow, all eleven managed decisions, Issue #2's open status, and no-merge/deploy/release constraints remain unchanged.

## Historical visual-target acceptance record
- After reviewing the package at commit `eab90573d600e47a544269a67af7ac7aa98f7941`, the Product Owner reported successful UAT. Record the pinned v18 artifact as the accepted visual target, superseding the pending-PO-target status above only.
- This does not establish current-product conformity, independent QA, Windows/Edge file-system acceptance, or permission to implement managed features, merge or release. User-reported environment details were not supplied; do not infer hardware coverage.
- Keep actual product/reference differences failing and all eleven managed decisions intact. Independent QA, technical feasibility and Issue #2 freeze remain open gates.

## Product Owner directive — current v18 implementation (2026-11-05)
- v18 is the authoritative UI and UX baseline. The Product Owner has finally approved it through visual UAT and explicitly authorized implementing its interface and applicable behavior in the existing application/PR #15. This supersedes the earlier v17 design lock and preparation-only restrictions.
- Intentional v17/v18 differences are approved changes, not regressions. Keep v17 tests, PNGs and checksum as historical evidence only; never use them for current visual acceptance.
- Active visual regression compares a freshly built product with the pinned v18 using identical synthetic workbooks, clocks, viewports and interaction states. Keep the 0.001 maximum different-pixel ratio. Replace obsolete expectations only where they conflict with v18.
- Preserve functional capabilities, read-only local Excel/SharePoint access, privacy/security rules, and all DEC-EMV-002-01 through -11. This UI implementation does not authorize managed writes, architecture freeze, requirement closure, merge, deployment or release.
- Complete implementation and relevant unit/build/browser validation within the existing workflow. Do not reopen settled design approval or initiate additional QA/architecture workstreams without Product Owner approval. Report genuine functional defects separately.


## Current Product Owner authorization — Excel Managed Variant v1 (2026-11-06)
- The Product Owner explicitly approved **starting implementation** of the separate Excel Managed Variant v1 using the restricted, fail-closed supported-workbook strategy. This supersedes earlier notes stating implementation is not authorized, **only for the scoped managed v1 development**.
- Preserve approved requirement contracts EMV-WB-1.0 (#3), EMV-EDIT-1.0 (#4), EMV-HIST-1.0 (#5), EMV-SET-1.0 (#6) and EMV-REPORT-1.0 (#7), plus decisions DEC-EMV-002-01..11 and the EMV-ARCH-1.0 direction. Neither the v18 reference nor the existing read-only viewer may be modified or given managed write behavior.
- Develop in isolated `feature/excel-managed-v1` with reviewable draft PRs, existing CI, and synthetic data. Direct Save, Save As, backup/recovery, editing, history, Settings and reports must be implemented and tested before acceptance.
- Unsupported or unverified Excel constructs must **fail closed**. No promise of race-free multi-file atomicity or universal Excel lock detection. An uncertain write must never be reported as successful.
- This authorization **does not freeze Issue #2 architecture, approve PR merging, deployment or release, waive independent QA/physical Edge gates, or mark #3–#8 accepted/closed**. Only escalate genuine new product decisions or exceptions; routine coordination and implementation should proceed without redundant owner checkpoints.
- Corporate-PC validation files must be downloadable from GitHub before requesting physical tests; sandbox-only artifacts are insufficient.
