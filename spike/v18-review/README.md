# v18 baseline migration — preparation, not acceptance

The Product Owner explicitly chose **prepare a reviewed v18 migration** on
2026-11-05 after being informed that the supplied file differs from v17. This
supersedes the test-oracle selection for migration preparation only. Independent
QA and Product Owner visual UAT remain outstanding. No product source changes,
managed features, merge, deployment, release or Issue #2 completion are authorized.

## Reference identity

- Source: main commit `f216bec4b7e5677a3c21a1d8aa16d87097790d11`,
  `Gantt_Viewer_UI_Mock_v18_Cursor_Baseline.html`.
- Git blob: `3e1c0323ded67bff259e4da27bbb2f0f14109509`.
- SHA-256: `375425fa94e41ef7d55cc4fac8fe60ad038a2c1095ad04d735bdc1656345ad83`.
- Pinned copy: `reference/UI_BASELINE_v18_CANDIDATE.html`, identical bytes.
- Status and provenance: `reference/baseline-manifest.json`.

The historical v17 checksum remains
`5e6f438fb3817e253984a806bb5bccd4d82f3f14e93d0d03e6eaf5ada2fb84d7`.
Its original bytes are still unavailable; integrity is **unverified**. It was not
reconstructed, renamed or claimed equivalent to v18. The original unit/calendar/
browser tests are preserved byte-for-byte with checksums in `test/historical/v17`.
These archival files retain original relative imports and are historical evidence,
not an executable v18 suite or passing v17 result.

## Replacement checks and remaining differences

The original v17 was a synthetic mock. The supplied v18 is a compiled empty-state
viewer with a bundled parser and two style blocks. The old literal `const holidays`
extraction, first-style-to-source equality and 17-task startup checks do not describe
that artifact. Under the explicit migration authorization they are replaced with:

1. Exact candidate hash/source-byte/provenance checks and historical-test integrity.
2. A separate unchanged-product-CSS hash guard, explicitly not v18 equivalence.
3. A holiday JSON snapshot independently extracted from the candidate's literal
   object, checked against the pinned HTML and the runtime's 89-entry table. No
   eval/Function or application-generated expected table. Official holiday
   verification remains provisional.
4. Fourteen active browser comparisons at 1440×900 and 1024×900, using the same
   synthetic workbook and fixed Asia/Tokyo clock in supplied reference and freshly
   built product. Each comparison attaches both images, a difference image and pixel metrics.
   The existing maximum different-pixel ratio of 0.001 is preserved; every differing
   RGBA pixel counts, stricter than perceptual color/anti-alias suppression. A
   same-reference control exposed small rendering noise under raw PNG-byte equality,
   so byte equality is not used as a visual oracle. No reference PNGs are generated
   or promoted.

All existing approved v17/product snapshot PNGs and the existing Gantt screenshot
regression test remain unchanged. The historical 8,486-pixel Gantt mismatch remains
separate and unresolved. A passing integrity/unit check cannot accept the migration.

Already observed by localhost/Linux diagnostic inspection with synthetic data:

| Area | Current product | Supplied v18 candidate |
|---|---|---|
| Detail width | 410px | 580px |
| Detail attribute columns | Two | Three at desktop size |
| Owner in grid | Initials | Full owner name |
| Ordering | Existing ID/SortOrder behavior | WBS ordering amendment |
| Updates | No current source support | Compiled support present |

The six newly supplied v1.3 documents retain v17 authority with scoped later
amendments, including these changes. This migration exposes the differences; it
does not authorize implementing them or copying the compiled bundle into product
source. Keep all DEC-EMV-002-01 through -11 intact.

See [calibration-evidence.md](calibration-evidence.md) for the independent same-reference
capture control and its explicit scope.

## Review package and execution

After `npm ci && npm run build`, run:

```sh
node scripts/package-baseline-review.mjs
```

`work/v18-review/` contains two self-contained HTML files, a synthetic workbook,
provenance and UAT instructions. CI uploads it as **v18-unapproved-UAT-package**;
it is a diagnostic review artifact, not a release. Browser comparison images are
attached in **windows-browser-diagnostics**. Download from the linked PR's CI run.
Follow [UAT.md](UAT.md); no company workbook is needed.

Default browser comparisons exercise `file://` in Windows CI. Localhost override
`BASELINE_REVIEW_LOCALHOST=http://127.0.0.1:<port>` is diagnostic only and annotated
as such. Cloud browser policy blocks file navigation; do not bypass that policy or
claim localhost success as file:// acceptance. Windows Server/Chromium CI is not
actual Windows 11/corporate Edge permission, Excel-lock or hardware-scaling evidence.

Acceptance requires independent QA review of the differences and subsequent Product
Owner visual UAT. A future approved update must explicitly record which candidate
and screenshots are accepted. Do not update manifest status automatically.
