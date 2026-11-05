# v18 implementation validation package

v18 is the approved current UI/UX baseline. Target UAT is complete; this package
supports implementation verification and is not a release or new UAT request.

1. Check `provenance.json` for the exact source commit, product hash and approved
   reference SHA-256 `375425fa94e41ef7d55cc4fac8fe60ad038a2c1095ad04d735bdc1656345ad83`.
2. Open both HTML files via `file://` in supported Edge/Chrome and choose the included
   synthetic workbook. No real company workbook is required.
3. Compare default, Day/Week/Month/Quarter, expanded hierarchy, filters, optional
   columns, blackout and detail/Updates at 1440×900 and 1024px widths. Automated
   comparisons use the fixed 2026-10-25 Asia/Tokyo clock; manual dates vary.
4. Check full owners, WBS order, linked hover, safe rich text, keyboard access and
   independent detail scrolling. Report functional failures with commit and browser
   versions. Intentional changes from v17 are approved and are not regressions.

The application remains read-only. This package does not implement or accept
managed workbook writes, FS-01–FS-12, architecture freeze, merge, release or deployment.
