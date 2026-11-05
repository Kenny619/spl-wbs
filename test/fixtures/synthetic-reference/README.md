# Synthetic reference workbook

`data-source.xlsx` is generated solely from literals in
`test/browser/write-reference-fixture.mjs`. It contains invented task/owner/workstream
names and synthetic links on the application's existing allowed host. No original
company workbook content was copied or opened.

It preserves the existing reference test's asserted import contract: 36 rows,
14 summaries, 16 tasks (three unscheduled), six milestones, eight workstreams,
blank parents, the tested date range/IDs/WBS labels and source timestamp. Those
structural literals are test requirements, not real project content. Existing
semantic assertions remain unchanged.

Regenerate from repository root:

```sh
node test/browser/write-reference-fixture.mjs test/fixtures/synthetic-reference/data-source.xlsx
```

Document and ZIP-entry timestamps are fixed. With the locked dependencies, two
independent generation runs produced SHA-256:
`978f282e9b71b886808595b6b55d9db1e5b42bc44570fc99e6f557f090bbcf99`.

This workbook does not replace or reapprove the frozen v17 HTML/UI baseline.
