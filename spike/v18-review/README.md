# Approved v18 application baseline

The Product Owner's 2026-11-05 directive adopts v18 as the authoritative current
UI/UX baseline and authorizes implementation in the existing application and PR #15.
Visual-target UAT is complete. Intentional v17/v18 differences are approved changes.
No further target-approval cycle is required by this work.

## Immutable identity

- Source: `f216bec4b7e5677a3c21a1d8aa16d87097790d11`, `Gantt_Viewer_UI_Mock_v18_Cursor_Baseline.html`.
- Pinned reference: `reference/UI_BASELINE_v18_CANDIDATE.html` (provenance filename retained).
- Git blob: `3e1c0323ded67bff259e4da27bbb2f0f14109509`.
- SHA-256: `375425fa94e41ef7d55cc4fac8fe60ad038a2c1095ad04d735bdc1656345ad83`.
- Accepted UAT package: commit `eab90573d600e47a544269a67af7ac7aa98f7941`, artifact `13393112933`.

The original UAT procedure and calibration record remain historical evidence in
`UAT.md` and `calibration-evidence.md`. The manifest records both target UAT and
current adoption. These records do not authorize merge, deployment or release.

## Implementation and acceptance

The existing modular application implements the approved full owner display,
numeric WBS ordering (ID tiebreaker, not SortOrder), linked grid/timeline hover,
unscheduled-row tint, pane sizing, quiet PGCM markers and desktop detail geometry.
Updates are imported as untrusted text and rendered with a DOM allowlist, date
sections and safe HTTPS links. No workbook or SharePoint write path is added.
All eleven Excel Managed Variant decisions remain unchanged; this is not their
implementation or an architecture investigation.

Active browser tests compare the freshly built application directly with the
pinned v18 under identical synthetic data, fixed Asia/Tokyo clock and viewports.
The maximum differing-pixel ratio remains 0.001, counting every differing RGBA
pixel. Cases cover the original fourteen views plus Month/Quarter, applied filters
and expanded Gantt/blackout/Day states. Fixture inputs include owner names,
ID/WBS/SortOrder conflicts and Updates history. Product-only behavioral checks
cover rich-text safety, date grouping, linked hover, ordering and pane scrolling.

The original Gantt behavioral regression remains active. Its obsolete PNG
expectations are replaced by equivalent live v18 Gantt comparisons. All original
v17 tests and PNG bytes remain under `test/historical/v17/`, with the original
approval/hash retained. Original v17 HTML is unavailable; its integrity is
unverified and is not a current UI acceptance criterion.

## Run

Use Node 22 and the package lock:

```sh
npm ci
npm test
npm run build
npm run test:e2e
node scripts/package-baseline-review.mjs
```

The diagnostic package contains approved `reference-v18.html`, the freshly built
`current-product.html`, a synthetic workbook, provenance and `VALIDATION.md`.
It is not a release. Windows CI exercises the packaged `file://` workflow and
retains reference/current/diff images and metrics.

When cloud administrator policy blocks file navigation, a temporary loopback
server may serve exactly the reference and product at `/reference` and `/product`.
Set `BASELINE_REVIEW_LOCALHOST=http://127.0.0.1:<port>` for the comparison suite.
This is a diagnostic transport, never file:// or physical Windows/Edge evidence.
Do not bypass browser policy. Browser checks are implementation validation, not
an additional independent QA workstream or renewed PO target-UAT request.
