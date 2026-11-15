# SPT-WBS Option A + CI Cost Optimization — isolated composite validation

## Authority and provenance (2026-11-15 JST)

- **Not a merge/release:** An independently reviewable branch-only proof based on the exact personal-PC-owner-accepted PR #72 commit `6cd12a69ca3767a8184e8ed6a76261f3125c62a6`. No modification to PR #72, PR #74, `main`, current README or its single accepted UAT ZIP.
- **CI source:** PR #74 draft `611d2f49140bd12fce26ce23230e33c672eb0869` supplies `scripts/ci-plan.mjs`, `scripts/run-browser-tier.mjs` and its planner test baseline. These scripts remain identical to their source blobs; only `scripts/ci-plan.test.mjs` gains composite-invariant assertions.
- **Product source:** `src/**`, `test/browser/release.spec.ts` (blob `98817b41fc7c5f451c50b163f17a7c2d2643887f`), locked package dependencies and managed security scripts remain byte-identical to accepted PR #72. The two previously conflicting files are deliberately composed: workflow rewritten with both control sets; release browser spec retained as accepted.

## Workflow safety contract

1. Keep the exact required job labels `Build + unit tests` and `Browser regression (Windows Chromium)`; a failed planner must not falsely satisfy or skip protected checks. `CI_BROWSER_SCOPE` empty falls back to full.
2. Full native Windows Chromium suite on `main` pushes, ready PRs targeting `main`, forced `[full-ci]`, missing/unknown diff, CI/security/workbook integrity edits, and explicit manual full runs; only confident feature slices can use targeted tests.
3. Every Linux fast/full job runs production high/critical audit, positive/negative UUID fixtures, bounded ExcelJS scanner, all 265 managed-app unit tests, both read-only and managed TypeScript production builds.
4. Preserve the approved 2,000-row stress scroll, last-row visibility/identity and Chrome/Edge launch tests by reusing PR #72 `test/browser/release.spec.ts` unchanged.
5. The comprehensive 23-task fictional Option A ZIP is generated/uploaded **only when an operator uses `workflow_dispatch` and explicitly selects `publish_owner_uat=true`** while full scope and planner validity are proven. This does not auto-publish or update README. CI source SHA/run/provenance and 5 hashes must be independently verified before any future UAT link change.
6. Artifacts and Linux diagnostics are failure/full gated, reducing routine uploads. Existing production/OOXML/backup/Watch guards are never bypassed.
7. Preserve locked managed `package-lock.json` from PR #72; PR #74 older main-derived dependency lock must not replace it. Production audit's two moderate ExcelJS/UUID records remain open, without waiver. Full dev audit evidence remains separate.

## Acceptance gates and outstanding decisions

- Composite branch exact-head CI: planner invariant/policy tests, Linux unit+managed builds, bounded UUID scanner, production audit, Windows full suite; investigate failures before any second run. No real/sensitive workbook access.
- Check branch and file comparison against frozen `6cd12a69ca3767a8184e8ed6a76261f3125c62a6`: only workflow, three CI scripts and this QA record may differ. Future main-lineage reconciliation must retain current main README and the 18 README-only historical commits.
- GitHub branch-protection required-status metadata remains inaccessible to the connector (403); authorized admin confirmation is mandatory before any production CI adoption or main merge.
- PR #72 owner physical E1–E17 PASS / E18 SKIPPED remains attached only to original SHA, not falsely to composite. Corporate Edge E2 remains open/deferred; real Excel-open lock, shared-writer atomicity and security-label behavior are unproven.
- Target ≥60% gross Actions compute reduction remains unmeasured until an authorized pilot provides comparable event-weighted job-minute evidence; main full-gate costs must not be reduced by weakening quality.
