# Foundation repair evidence — 2026-11-05

Parent baseline: 80a4a6f51fbf5673b9b78f70b22ff20f0d099eef.
Linux cloud; Node 22.23.4 via a workspace-cached npm exec runtime; npm 11.9.0.
No production source, frozen reference, snapshots or screenshot tolerances changed.

## Results

- Clean npm ci: exit 0, 253 packages installed.
- npm test: exit 1, 49 passed, 1 failed, plus 1 suite load failure.
- npm run build: exit 0, complete single-HTML bundle and checksum.
- npm run test: exit 1, same 49 passes and frozen-reference failures.
- Synthetic reference import: original assertions pass with the new committed fixture.
- Repeated fixture generation: identical SHA-256 978f282e9b71b886808595b6b55d9db1e5b42bc44570fc99e6f557f090bbcf99.
- Linux system Chromium diagnostic: 2 localhost harness tests passed; 6 packaged file tests failed with net::ERR_BLOCKED_BY_ADMINISTRATOR. This is a cloud browser policy limitation, not successful physical Windows/Edge evidence. No policy bypass attempted. The temporary executable-path config is not a committed product/test baseline change.

## Remaining blockers

The original frozen HTML is absent from all available local Git history and workspace files. Exact-name and broader UI_BASELINE searches of connected Drive returned no results. Its hash, CSS comparison, holiday-table comparison and browser assertions are deliberately untouched and remain failing. Only the exact approved original can resolve this. No approximation can satisfy the trust requirement.

Historical PR #9 had no downloadable artifacts, so its 8,486-pixel Windows screenshot mismatch cannot yet be visually diagnosed. The workflow in this PR preserves actual/expected/diff/report artifacts for a new run; no baseline image or tolerance changed. Remaining screenshot causes are unverified until those artifacts are reviewed.

General Codex-window messaging was not exposed by available tools, and plugin discovery found no relevant cross-window messaging capability. Connected document-control tools address Office document sessions, not general Codex chat threads. GitHub remains the durable handoff.

Independent QA and Windows 11/corporate Edge hardware validation are still outstanding. Issues #2/#10/#11 must not be marked complete. No product feature implementation, merge, deployment or release is authorized by these fixes.

## Captured Node 22 logs

### node22-ci.log

```text
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated rimraf@2.7.1: Rimraf versions prior to v4 are no longer supported
npm warn deprecated lodash.isequal@4.5.0: This package is deprecated. Use require('node:util').isDeepStrictEqual instead.
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated fstream@1.0.12: This package is no longer supported.
npm warn deprecated uuid@8.3.2: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).

added 253 packages in 6s

```

### node22-test.log

```text

> gantt-viewer@0.0.0 test
> vitest run


 RUN  v3.2.7 /workspace/spl-wbs

 ✓ test/unit/importWorkbook.test.ts (8 tests) 381ms
 ✓ test/unit/importController.test.ts (10 tests) 291ms
 ❯ test/unit/calendar.test.ts (9 tests | 1 failed) 18ms
   × bundled Japanese holidays > copies the frozen v17 table 7ms
     → ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
   ✓ bundled Japanese holidays > rejects a holiday payload that is not a year of date names 2ms
   ✓ bundled Japanese holidays > fetches one year and ignores a second copy of a bundled year 2ms
   ✓ remaining workdays > counts weekdays after today through finish and skips holidays 1ms
   ✓ remaining workdays > crosses the new year and the 2028 leap day without counting blackout 1ms
   ✓ remaining workdays > hides the remainder for inactive tasks and refuses an uncovered year 0ms
   ✓ PGCM recurrence > shifts 2026-11-23 to the next working day and keeps the next nominal 1ms
   ✓ PGCM recurrence > cancels the adjusted date inside blackout and does not move the cadence 2ms
   ✓ PGCM recurrence > hides past meetings and meetings in a year without a holiday table 1ms
 ✓ test/unit/model.test.ts (8 tests) 8ms
 ✓ test/unit/dataSource.test.ts (1 test) 91ms
 ✓ test/unit/dateOnly.test.ts (6 tests) 26ms
 ✓ test/unit/fileHandleStore.test.ts (3 tests) 6ms
 ✓ test/unit/state.test.ts (3 tests) 27ms
 ✓ test/unit/scale.test.ts (1 test) 4ms
 ✓ test/unit/keyboard.test.ts (1 test) 4ms

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/unit/baseline.test.ts [ test/unit/baseline.test.ts ]
Error: ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
 ❯ test/unit/baseline.test.ts:36:16
     34|
     35| describe("frozen baseline", () => {
     36|   const html = readFileSync("reference/UI_BASELINE_v17_FROZEN.html");
       |                ^
     37|   const readme = readFileSync("README.md", "utf8");
     38|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/unit/calendar.test.ts > bundled Japanese holidays > copies the frozen v17 table
Error: ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
 ❯ test/unit/calendar.test.ts:28:18
     26| describe("bundled Japanese holidays", () => {
     27|   it("copies the frozen v17 table", () => {
     28|     const html = readFileSync("reference/UI_BASELINE_v17_FROZEN.html",…
       |                  ^
     29|     const start = html.indexOf("const holidays=");
     30|     const frozen = Function(`return ${html.slice(start + "const holida…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  2 failed | 9 passed (11)
      Tests  1 failed | 49 passed (50)
   Start at  05:48:01
   Duration  5.82s (transform 486ms, setup 0ms, collect 1.53s, tests 855ms, environment 3ms, prepare 925ms)


```

### node22-build.log

```text

> gantt-viewer@0.0.0 build
> tsc --noEmit && vite build && node scripts/checksum-dist.mjs

vite v6.4.5 building for production...
transforming...
✓ 37 modules transformed.
rendering chunks...
[plugin vite:singlefile]

[plugin vite:singlefile] Inlining: index-BYl_VwBK.js
[plugin vite:singlefile] Inlining: style-Davbat57.css
computing gzip size...
dist/index.html  1,133.52 kB │ gzip: 329.34 kB
✓ built in 6.56s
bd0ee65033752ce79c4245adcc3b87ad5e0c6a3dbdf883df6b6ccf095492cedb

```

### node22-retest.log

```text

> gantt-viewer@0.0.0 test
> vitest run


 RUN  v3.2.7 /workspace/spl-wbs

 ❯ test/unit/calendar.test.ts (9 tests | 1 failed) 21ms
   × bundled Japanese holidays > copies the frozen v17 table 6ms
     → ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
   ✓ bundled Japanese holidays > rejects a holiday payload that is not a year of date names 4ms
   ✓ bundled Japanese holidays > fetches one year and ignores a second copy of a bundled year 3ms
   ✓ remaining workdays > counts weekdays after today through finish and skips holidays 1ms
   ✓ remaining workdays > crosses the new year and the 2028 leap day without counting blackout 1ms
   ✓ remaining workdays > hides the remainder for inactive tasks and refuses an uncovered year 0ms
   ✓ PGCM recurrence > shifts 2026-11-23 to the next working day and keeps the next nominal 1ms
   ✓ PGCM recurrence > cancels the adjusted date inside blackout and does not move the cadence 1ms
   ✓ PGCM recurrence > hides past meetings and meetings in a year without a holiday table 1ms
 ✓ test/unit/importWorkbook.test.ts (8 tests) 393ms
 ✓ test/unit/importController.test.ts (10 tests) 168ms
 ✓ test/unit/dataSource.test.ts (1 test) 88ms
 ✓ test/unit/state.test.ts (3 tests) 23ms
 ✓ test/unit/dateOnly.test.ts (6 tests) 26ms
 ✓ test/unit/model.test.ts (8 tests) 9ms
 ✓ test/unit/fileHandleStore.test.ts (3 tests) 5ms
 ✓ test/unit/keyboard.test.ts (1 test) 4ms
 ✓ test/unit/scale.test.ts (1 test) 4ms

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/unit/baseline.test.ts [ test/unit/baseline.test.ts ]
Error: ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
 ❯ test/unit/baseline.test.ts:36:16
     34|
     35| describe("frozen baseline", () => {
     36|   const html = readFileSync("reference/UI_BASELINE_v17_FROZEN.html");
       |                ^
     37|   const readme = readFileSync("README.md", "utf8");
     38|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/unit/calendar.test.ts > bundled Japanese holidays > copies the frozen v17 table
Error: ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
 ❯ test/unit/calendar.test.ts:28:18
     26| describe("bundled Japanese holidays", () => {
     27|   it("copies the frozen v17 table", () => {
     28|     const html = readFileSync("reference/UI_BASELINE_v17_FROZEN.html",…
       |                  ^
     29|     const start = html.indexOf("const holidays=");
     30|     const frozen = Function(`return ${html.slice(start + "const holida…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  2 failed | 9 passed (11)
      Tests  1 failed | 49 passed (50)
   Start at  05:48:18
   Duration  5.56s (transform 460ms, setup 0ms, collect 1.30s, tests 741ms, environment 4ms, prepare 967ms)


```
