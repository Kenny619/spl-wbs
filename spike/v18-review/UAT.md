# Unapproved v18 baseline — focused visual UAT

This is a review package, not a release. It contains only synthetic test data.
No managed Excel-save capability is implemented or accepted. Leave real company
workbooks closed and do not use them for this review.

1. Extract the entire **v18-unapproved-UAT-package** CI artifact into a disposable
   folder. Read `provenance.json`; check that reference SHA-256 is
   `375425fa94e41ef7d55cc4fac8fe60ad038a2c1095ad04d735bdc1656345ad83`.
2. On actual Windows 11/corporate Edge, open `reference-v18.html` and
   `current-product.html` separately via `file://`. In each, choose the included
   `schedule.xlsx`. If policy blocks either page, report the error; do not change
   corporate policy. This package only exercises read-only opening.
3. At 1440×900 and 1024px width, compare default, Day/Week, expanded Program→Phase,
   Filters, optional columns, and Calendar/blackout dialog. Open Interface details
   (valid synthetic ItemURL) and Closed work details (disabled link).
4. Inspect owner display, ordering, detail width/columns and close-control access.
   Differences from the current product are expected and must be recorded. For
   the v18 reference, assess whether the supplied appearance is the intended target;
   do not treat current/reference equality as already established.
5. Use Tab/Shift+Tab/Enter/Escape. Check laptop Windows scaling at 125% and 150%.
   UI dates/PGCM are date-dependent when opened manually; record actual date/time.
   Automated screenshot comparisons use a fixed 2026-10-25 clock.
6. Return the artifact's source commit, Windows/Edge versions, zoom/scaling, which
   reference states are acceptable, and specific exceptions/screenshots. Approval
   must distinguish **v18 target accepted** from **current product conforms**.

Independent QA must review the comparison images and test evidence before final
acceptance. If QA is unavailable, report that gap rather than claiming it occurred.
No baseline images, v17 history, or product code are updated by running this package.
