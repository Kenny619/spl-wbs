# v18 implementation validation — 2026-11-05

Scope: Product Owner directive to adopt approved v18 in existing PR #15. Started
from `b35e8efa0d358166a98aed3b3484b2eea9b07fc7`; the delivered implementation SHA
and CI run are recorded on that PR. This is developer implementation validation,
not a new independent QA workstream or request to repeat target UAT.

## Changes

Existing TypeScript modules now implement full owner names/168px owner column,
numeric WBS sibling ordering with ID tiebreaker, linked grid/timeline hover,
unscheduled row treatment, responsive pane sizing, quiet PGCM markers, 580px
three-column details and read-only Updates. Updates preserve safe formatting,
links and date groups through a DOM allowlist; scripts, event handlers, unsafe
links and uncontrolled styles are discarded. Long history scrolls in the pane.
Existing local import, remembered read handles, filtering, calendars, bars,
keyboard behavior and read-only data access are retained.

v18 bytes and source provenance are unchanged (SHA-256
`375425fa94e41ef7d55cc4fac8fe60ad038a2c1095ad04d735bdc1656345ad83`). Guidance and
manifest identify v18 as current authority. The v17 tests and all 17 PNGs are
retained byte-for-byte under `test/historical/v17/`. They no longer define current
visual acceptance. The Gantt functional regression stays active; its three old
PNG assertions are replaced by live v18 comparisons of expanded Gantt/Type/
applied-blackout states at 1440/1024 and Day at 1440. No tolerance is raised.

## Executed locally

Linux, Node 22.23.4, npm 11.9.0; Debian Chromium 155.0.8059.79, Asia/Tokyo,
en-US, device scale 1, fixed `2026-10-25T03:00:00Z`, 1440×900 and 1024×900.
The package lock is unchanged from the independently clean-installed foundation.

- `npm test`: exit 0, 56 tests across 11 files. Obsolete SortOrder-first
  expectations are replaced by numeric WBS/ID assertions; Updates import is tested.
- `npm run build`: exit 0, including TypeScript checking; product SHA-256
  `f9597e6e71c493b98a1ce4dd7aebd0b7c53620a7edfaee1dd652266df15d6c3a`.
- Live v18 comparison suite over diagnostic localhost: 20/20 visual cases PASS
  plus same-reference control PASS. Maximum differing-pixel ratio
  `0.00006184895833333334` (0.006185%) versus unchanged `0.001` (0.1%) maximum.
  Default, expanded hierarchy, Week, Month, Quarter, applied filters and several
  other captures match with zero differing pixels. All 14 formerly failing views pass.
- Gantt behavior and two chooser/import harness checks: 3/3 PASS.
- Updates grouping/rich text, malicious content/unsafe links/independent scroll:
  2/2 PASS. Full owner/order/linked-hover check PASS after correcting a test hover
  target from an occluded background row to its actual task bar. No product change
  was needed for that test locator error.
- Package builder and approved-reference CSS extraction: exit 0. CSS extraction
  writes only an inspection artifact under `work/`, never production CSS.
- `git diff --check`: PASS. Approved reference and historical tests/PNG bytes are
  verified against their pre-implementation versions.

The earlier local `file://` administrator-policy limitation remains; no bypass
was attempted. Windows CI runs the full packaged/browser suite on this branch.
Its exact run and results are recorded on PR #15. Localhost evidence does not
claim physical Windows 11/Edge file-system acceptance.

## Scope boundaries

Intentional v18 differences from v17 are accepted design changes, not defects.
No Product Owner design decision is required to implement them. All eleven
DEC-EMV-002 requirements and the read-only contract remain intact. No workbook
writes, architecture investigation, dependency upgrades, merge, deployment,
release or issue closure are included. Previously reported calendar provenance,
dependency advisories and managed-write feasibility are unchanged separate concerns;
this implementation does not reopen them as new UI approval gates.
