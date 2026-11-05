# Cloud execution evidence

2026-11-05. Linux/Node 24.22.1/npm 11.9.0. Baseline commit 80a4a6f51fbf5673b9b78f70b22ff20f0d099eef. These are captured cloud logs, not Windows/Edge file-system tests.

## npm-ci-final.log

```text
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated rimraf@2.7.1: Rimraf versions prior to v4 are no longer supported
npm warn deprecated lodash.isequal@4.5.0: This package is deprecated. Use require('node:util').isDeepStrictEqual instead.
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn tarball tarball data for expect-type@https://registry.npmjs.org/expect-type/-/expect-type-1.4.0.tgz (sha512-KfYbmpRm0VbLjEvVa9yGwCi9GI34xvi7A/HXYWQO65CSD2u3MczUJSuwXKFIxlGsgBQizV9q5J9NHj4VG0n+pA==) seems to be corrupted. Trying again.
npm warn deprecated fstream@1.0.12: This package is no longer supported.
npm warn deprecated uuid@8.3.2: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).

added 251 packages in 5s

```

## npm-test-before.log

```text

> gantt-viewer@0.0.0 test
> vitest run


 RUN  v3.2.7 /workspace/spl-wbs

 ✓ test/unit/importWorkbook.test.ts (8 tests) 593ms
 ✓ test/unit/importController.test.ts (10 tests) 164ms
 ❯ test/unit/calendar.test.ts (9 tests | 1 failed) 19ms
   × bundled Japanese holidays > copies the frozen v17 table 6ms
     → ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
   ✓ bundled Japanese holidays > rejects a holiday payload that is not a year of date names 2ms
   ✓ bundled Japanese holidays > fetches one year and ignores a second copy of a bundled year 2ms
   ✓ remaining workdays > counts weekdays after today through finish and skips holidays 1ms
   ✓ remaining workdays > crosses the new year and the 2028 leap day without counting blackout 1ms
   ✓ remaining workdays > hides the remainder for inactive tasks and refuses an uncovered year 0ms
   ✓ PGCM recurrence > shifts 2026-11-23 to the next working day and keeps the next nominal 2ms
   ✓ PGCM recurrence > cancels the adjusted date inside blackout and does not move the cadence 3ms
   ✓ PGCM recurrence > hides past meetings and meetings in a year without a holiday table 1ms
 ✓ test/unit/model.test.ts (8 tests) 11ms
 ❯ test/unit/dataSource.test.ts (1 test | 1 failed) 7ms
   × reference data-source workbook > loads the sample export and keeps hierarchy on parent ids 6ms
     → ENOENT: no such file or directory, open '/workspace/spl-wbs/reference/data-source.xlsx'
 ✓ test/unit/dateOnly.test.ts (6 tests) 43ms
 ✓ test/unit/fileHandleStore.test.ts (3 tests) 6ms
 ✓ test/unit/state.test.ts (3 tests) 39ms
 ✓ test/unit/scale.test.ts (1 test) 5ms
 ✓ test/unit/keyboard.test.ts (1 test) 3ms

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

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/unit/calendar.test.ts > bundled Japanese holidays > copies the frozen v17 table
Error: ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
 ❯ test/unit/calendar.test.ts:28:18
     26| describe("bundled Japanese holidays", () => {
     27|   it("copies the frozen v17 table", () => {
     28|     const html = readFileSync("reference/UI_BASELINE_v17_FROZEN.html",…
       |                  ^
     29|     const start = html.indexOf("const holidays=");
     30|     const frozen = Function(`return ${html.slice(start + "const holida…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  test/unit/dataSource.test.ts > reference data-source workbook > loads the sample export and keeps hierarchy on parent ids
Error: ENOENT: no such file or directory, open '/workspace/spl-wbs/reference/data-source.xlsx'
 ❯ test/unit/dataSource.test.ts:19:41
     17| describe("reference data-source workbook", () => {
     18|   it("loads the sample export and keeps hierarchy on parent ids", asyn…
     19|     const result = await importWorkbook(await readFile(workbookPath), …
       |                                         ^
     20|     expect(result.ok).toBe(true);
     21|     if (!result.ok) return;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  3 failed | 8 passed (11)
      Tests  2 failed | 48 passed (50)
   Start at  05:24:09
   Duration  7.46s (transform 689ms, setup 0ms, collect 1.74s, tests 892ms, environment 2ms, prepare 1.18s)


```

## npm-build.log

```text

> gantt-viewer@0.0.0 build
> tsc --noEmit && vite build && node scripts/checksum-dist.mjs

test/fixtures/workbooks.ts(31,18): error TS2552: Cannot find name 'Buffer'. Did you mean 'buffer'?
test/unit/baseline.test.ts(1,28): error TS2307: Cannot find module 'node:crypto' or its corresponding type declarations.
test/unit/baseline.test.ts(2,30): error TS2307: Cannot find module 'node:fs' or its corresponding type declarations.
test/unit/calendar.test.ts(1,30): error TS2307: Cannot find module 'node:fs' or its corresponding type declarations.
test/unit/dataSource.test.ts(1,26): error TS2307: Cannot find module 'node:fs/promises' or its corresponding type declarations.
test/unit/dataSource.test.ts(2,18): error TS2307: Cannot find module 'node:path' or its corresponding type declarations.

```

## npm-test-after.log

```text

> gantt-viewer@0.0.0 test
> vitest run


 RUN  v3.2.7 /workspace/spl-wbs

 ❯ test/unit/calendar.test.ts (9 tests | 1 failed) 25ms
   × bundled Japanese holidays > copies the frozen v17 table 8ms
     → ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
   ✓ bundled Japanese holidays > rejects a holiday payload that is not a year of date names 5ms
   ✓ bundled Japanese holidays > fetches one year and ignores a second copy of a bundled year 4ms
   ✓ remaining workdays > counts weekdays after today through finish and skips holidays 1ms
   ✓ remaining workdays > crosses the new year and the 2028 leap day without counting blackout 0ms
   ✓ remaining workdays > hides the remainder for inactive tasks and refuses an uncovered year 0ms
   ✓ PGCM recurrence > shifts 2026-11-23 to the next working day and keeps the next nominal 2ms
   ✓ PGCM recurrence > cancels the adjusted date inside blackout and does not move the cadence 2ms
   ✓ PGCM recurrence > hides past meetings and meetings in a year without a holiday table 1ms
 ❯ test/unit/dataSource.test.ts (1 test | 1 failed) 12ms
   × reference data-source workbook > loads the sample export and keeps hierarchy on parent ids 11ms
     → ENOENT: no such file or directory, open '/workspace/spl-wbs/reference/data-source.xlsx'
 ✓ test/unit/importWorkbook.test.ts (8 tests) 460ms
 ✓ test/unit/importController.test.ts (10 tests) 153ms
 ✓ test/unit/dateOnly.test.ts (6 tests) 29ms
 ✓ test/unit/state.test.ts (3 tests) 22ms
 ✓ test/unit/model.test.ts (8 tests) 10ms
 ✓ test/unit/fileHandleStore.test.ts (3 tests) 7ms
 ✓ test/unit/scale.test.ts (1 test) 6ms
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

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/unit/calendar.test.ts > bundled Japanese holidays > copies the frozen v17 table
Error: ENOENT: no such file or directory, open 'reference/UI_BASELINE_v17_FROZEN.html'
 ❯ test/unit/calendar.test.ts:28:18
     26| describe("bundled Japanese holidays", () => {
     27|   it("copies the frozen v17 table", () => {
     28|     const html = readFileSync("reference/UI_BASELINE_v17_FROZEN.html",…
       |                  ^
     29|     const start = html.indexOf("const holidays=");
     30|     const frozen = Function(`return ${html.slice(start + "const holida…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  test/unit/dataSource.test.ts > reference data-source workbook > loads the sample export and keeps hierarchy on parent ids
Error: ENOENT: no such file or directory, open '/workspace/spl-wbs/reference/data-source.xlsx'
 ❯ test/unit/dataSource.test.ts:19:41
     17| describe("reference data-source workbook", () => {
     18|   it("loads the sample export and keeps hierarchy on parent ids", asyn…
     19|     const result = await importWorkbook(await readFile(workbookPath), …
       |                                         ^
     20|     expect(result.ok).toBe(true);
     21|     if (!result.ok) return;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  3 failed | 8 passed (11)
      Tests  2 failed | 48 passed (50)
   Start at  05:24:20
   Duration  5.70s (transform 456ms, setup 0ms, collect 1.57s, tests 729ms, environment 3ms, prepare 883ms)


```

## fidelity-direct.log

```text
✔ synthetic field/history edit preserves enumerated workbook semantics (154.333187ms)
✔ formula cache is not recalculated by ExcelJS after precedent changes (25.923632ms)
✔ negative fixture: related custom OOXML part is lost during ExcelJS round trip (53.510829ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 243.538031

```

## npm audit

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "@vitest/mocker": {
      "name": "@vitest/mocker",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        {
          "source": 1193684,
          "name": "@vitest/mocker",
          "dependency": "@vitest/mocker",
          "title": "Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock",
          "url": "https://github.com/advisories/GHSA-82fw-gwwq-j7x9",
          "severity": "moderate",
          "cwe": [
            "CWE-22"
          ],
          "cvss": {
            "score": 5.9,
            "vectorString": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N"
          },
          "range": ">=2.1.0 <4.1.11"
        },
        {
          "source": 1242767,
          "name": "@vitest/mocker",
          "dependency": "@vitest/mocker",
          "title": "Vitest: Code injection via unauthenticated manual mock registration",
          "url": "https://github.com/advisories/GHSA-qxg6-89mg-rqv8",
          "severity": "moderate",
          "cwe": [
            "CWE-94",
            "CWE-116",
            "CWE-306"
          ],
          "cvss": {
            "score": 4.7,
            "vectorString": "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:C/C:L/I:L/A:N"
          },
          "range": ">=2.1.0-beta.7 <4.1.12"
        }
      ],
      "effects": [
        "vitest"
      ],
      "range": "<=4.1.11",
      "nodes": [
        "node_modules/@vitest/mocker"
      ],
      "fixAvailable": {
        "name": "vitest",
        "version": "5.1.0",
        "isSemVerMajor": true
      }
    },
    "exceljs": {
      "name": "exceljs",
      "severity": "moderate",
      "isDirect": true,
      "via": [
        "uuid"
      ],
      "effects": [],
      "range": ">=3.5.0",
      "nodes": [
        "node_modules/exceljs"
      ],
      "fixAvailable": {
        "name": "exceljs",
        "version": "3.4.0",
        "isSemVerMajor": true
      }
    },
    "tinypool": {
      "name": "tinypool",
      "severity": "critical",
      "isDirect": false,
      "via": [
        {
          "source": 1241260,
          "name": "tinypool",
          "dependency": "tinypool",
          "title": "Tinypool: Prototype Pollution gadget in worker options leads to Remote Code Execution",
          "url": "https://github.com/advisories/GHSA-5gmw-xhrv-c9v3",
          "severity": "critical",
          "cwe": [
            "CWE-1321"
          ],
          "cvss": {
            "score": 0,
            "vectorString": null
          },
          "range": "<=2.1.0"
        },
        {
          "source": 1241261,
          "name": "tinypool",
          "dependency": "tinypool",
          "title": "Tinypool: Prototype Pollution Gadget to RCE in run() options",
          "url": "https://github.com/advisories/GHSA-85c8-ppgw-ccpr",
          "severity": "critical",
          "cwe": [
            "CWE-94",
            "CWE-1321"
          ],
          "cvss": {
            "score": 0,
            "vectorString": null
          },
          "range": "<2.1.2"
        }
      ],
      "effects": [
        "vitest"
      ],
      "range": "<=2.1.1",
      "nodes": [
        "node_modules/tinypool"
      ],
      "fixAvailable": {
        "name": "vitest",
        "version": "5.1.0",
        "isSemVerMajor": true
      }
    },
    "uuid": {
      "name": "uuid",
      "severity": "moderate",
      "isDirect": false,
      "via": [
        {
          "source": 1119441,
          "name": "uuid",
          "dependency": "uuid",
          "title": "uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided",
          "url": "https://github.com/advisories/GHSA-w5hq-g745-h8pq",
          "severity": "moderate",
          "cwe": [
            "CWE-787",
            "CWE-1285"
          ],
          "cvss": {
            "score": 7.5,
            "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N"
          },
          "range": "<11.1.1"
        }
      ],
      "effects": [
        "exceljs"
      ],
      "range": "<11.1.1",
      "nodes": [
        "node_modules/uuid"
      ],
      "fixAvailable": {
        "name": "exceljs",
        "version": "3.4.0",
        "isSemVerMajor": true
      }
    },
    "vitest": {
      "name": "vitest",
      "severity": "critical",
      "isDirect": true,
      "via": [
        "@vitest/mocker",
        {
          "source": 1193683,
          "name": "vitest",
          "dependency": "vitest",
          "title": "Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock",
          "url": "https://github.com/advisories/GHSA-82fw-gwwq-j7x9",
          "severity": "moderate",
          "cwe": [
            "CWE-22"
          ],
          "cvss": {
            "score": 5.9,
            "vectorString": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N"
          },
          "range": ">=2.1.0 <4.1.11"
        },
        "tinypool"
      ],
      "effects": [],
      "range": "0.0.95 - 4.1.10",
      "nodes": [
        "node_modules/vitest"
      ],
      "fixAvailable": {
        "name": "vitest",
        "version": "5.1.0",
        "isSemVerMajor": true
      }
    }
  },
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 3,
      "high": 0,
      "critical": 2,
      "total": 5
    },
    "dependencies": {
      "prod": 195,
      "dev": 106,
      "optional": 53,
      "peer": 2,
      "peerOptional": 0,
      "total": 300
    }
  }
}

```

## Historical CI excerpts

```text
2026-11-05T03:56:47.7313225Z Microsoft Windows Server 2025
2026-11-05T03:58:07.2673997Z ##[error]test/fixtures/workbooks.ts(31,18): error TS2552: Cannot find name 'Buffer'. Did you mean 'buffer'?
2026-11-05T03:58:07.2685989Z ##[error]test/unit/baseline.test.ts(1,28): error TS2307: Cannot find module 'node:crypto' or its corresponding type declarations.
2026-11-05T03:58:07.2687959Z ##[error]test/unit/baseline.test.ts(2,30): error TS2307: Cannot find module 'node:fs' or its corresponding type declarations.
2026-11-05T03:58:07.2689176Z ##[error]test/unit/calendar.test.ts(1,30): error TS2307: Cannot find module 'node:fs' or its corresponding type declarations.
2026-11-05T03:58:07.2690417Z ##[error]test/unit/dataSource.test.ts(1,26): error TS2307: Cannot find module 'node:fs/promises' or its corresponding type declarations.
2026-11-05T03:58:07.2691626Z ##[error]test/unit/dataSource.test.ts(2,18): error TS2307: Cannot find module 'node:path' or its corresponding type declarations.
2026-11-05T03:58:07.3576410Z       8486 pixels (ratio 0.01 of all image pixels) are different.
2026-11-05T03:58:07.3578502Z       - 8486 pixels (ratio 0.01 of all image pixels) are different.
2026-11-05T03:58:07.3580252Z       - 8486 pixels (ratio 0.01 of all image pixels) are different.
2026-11-05T03:58:07.3597037Z   17 failed
2026-11-05T03:58:07.3606540Z   5 did not run
2026-11-05T03:58:07.3606698Z   1 passed (38.7s)
```
