# SPT-WBS three-tier CI optimization — November 14, 2026

Controlling delivery: [Issue #8](https://github.com/Kenny619/spl-wbs/issues/8). Dedicated CI initiative: [Issue #73](https://github.com/Kenny619/spl-wbs/issues/73). Draft only; no merge/release authorization.

## Actual usage baseline (GitHub event records)

All 987 accessible Actions run records were fetched using 10 pages of the Actions runs API. The repository's accessible history begins on **November 5, 2026**; the audit window ends November 14, 2026 UTC.

| Metric | Measured |
|---|---:|
| Workflow runs | **987** |
| Push-triggered | 510 |
| Pull request-triggered | 477 |
| Success | 327 |
| Failure | 98 |
| Cancelled | **562 (56.9%)** |
| Unique head SHA values | 673 |
| Repeated SHA + event combinations | 119 |

Do not mistake all cancellations for chargeable work: some had no jobs at all, others consumed partial minutes. The original workflow already had same-ref concurrency/cancellation and npm caching. There is a single active workflow at .github/workflows/ci.yml on main, and it ran both Linux and Windows Chromium full-suite + packaging jobs for feature pushes and PR events. Feature branch pushes with an open main-target PR can trigger *both* run types, whose different refs prevent the existing concurrency group from deduplicating them.

### Measured per-run job log timing sample

Timings are approximated using the first and last UTC timestamps in the **actual successful GitHub Actions job logs**, rounded **up per job**. This is not the billing export.

| Run | Kind | Linux rounded min | Windows rounded min | Gross list-rate USD |
|---|---|---:|---:|---:|
| [43599196713](https://github.com/Kenny619/spl-wbs/actions/runs/43599196713) | README-only main push | 1 | 3 | $0.036 |
| [43595633171](https://github.com/Kenny619/spl-wbs/actions/runs/43595633171) | README-only main push | 1 | 3 | $0.036 |
| [43598747254](https://github.com/Kenny619/spl-wbs/actions/runs/43598747254) | Actual UAT integration | 1 | 4 | $0.046 |
| [43401632523](https://github.com/Kenny619/spl-wbs/actions/runs/43401632523) | Full PR regression | 1 | 3 | $0.036 |
| [43417188202](https://github.com/Kenny619/spl-wbs/actions/runs/43417188202) | Superseded/cancelled | 1 | 1 | $0.016 |
| [43579566011](https://github.com/Kenny619/spl-wbs/actions/runs/43579566011) | Cancelled prior to jobs | 0 | 0 | $0.000 |

GitHub publishes **standard two-core Linux $0.006/min** and **two-core Windows $0.010/min** (January 2026 rates) and rounds each job's partial minutes up. Source: https://docs.github.com/en/billing/reference/actions-runner-pricing. Rates are *gross list price*; account spend, included minutes, storage and plan adjustments are unknown. The GitHub integration lacks account billing access and branch protection settings returned HTTP 403; never assert exact invoiced consumption or protection configuration.

## Three-tier policy in this unmerged draft

1. **Tier 1 fast Linux** for code changes: existing npm cache/CI unit suite, TypeScript check via npm run build, npm audit for high/critical production advisories. No standalone lint script currently exists. For documentation-only feature commits, only the lightweight planner/selftest runs. Protected-main checks remain full even for docs-only changes.
2. **Tier 2 targeted Windows Chromium** for confidently mapped UI domains (Gantt, baseline, import harness, managed display); the scripts reject a missing mapped test file rather than silently pass. Unit-only changes skip Windows. Changed Excel import/write, security-critical code, unknown source files, frozen specs, workflow/packaging and browser-release tests default **full**.
3. **Tier 3 mandatory full** for protected main pushes, non-draft PRs targeting main (including ready_for_review), manual full dispatch, forced UAT/release marker, unknown impacts and security-critical changes. Original check names **Build + unit tests** and **Browser regression (Windows Chromium)** are preserved; Windows test files remain intact. PR drafts cannot merge and must pass full before becoming ready for merge.

Duplicate suppression occurs only when GitHub API positively identifies an *open PR targeting main* with the exact head SHA of a feature push; the corresponding PR event runs validation. A PR lookup failure conservatively keeps feature checks. Existing same-ref cancellation stays unchanged. This does not depend on unverified branch protection settings.

Artifacts: Linux unit diagnostics upload only on failure, Windows diagnostics only on failure/full integration, and historical v18 validation package only on full substantive gates. No new paid services or self-hosted runners.

## Independent QA checklist / measurement

- [ ] Planner built-in tests passed on draft PR exact SHA (docs-only, main/ready PR, critical Excel, unknown, duplicate positive/fallback, targeted UI, unit-only).
- [ ] Draft PR exact SHA mandatory Windows, Linux build/unit, high/critical security gate passed.
- [ ] Check preserved status names and required checks using an **authorized repository administrator**, since the current integration returned 403. No changes to protected branch rules.
- [ ] Verify manual full dispatch and ready-for-review behavior after successful dry runs, **before any merge**.
- [ ] Verify targeted suite selection (Gantt, harness, baseline, managed) on unchanged representative commits and ensure no critical coverage regressions.
- [ ] Sample >=20 comparable post-merge changes and compute normalized gross rounded job-minutes, estimated cost, Windows minutes, duplicate count, median PR latency, and regression escapes against a comparable baseline cohort. The **≥60% reduction remains an objective, not a measured achievement**.
- [ ] Independent QA signoff and owner merge approval.

## Self-hosted Windows: decision

**Defer and do not register.** It may reduce GitHub-hosted compute usage but introduces private repo credentials, disposable-VM cleanup, unattended machine availability, corporate policy, and maintenance/security burdens. First validate hosted CI optimization. Separate owner approval would be required for credentials, runner or paid infrastructure.

The two already-known moderate ExcelJS/uuid advisories remain an **open security risk**. Audit-level=high cannot be represented as their remediation/waiver.

## Independent QA hardening — 2026-11-15 (draft, not activated)

- Full CI request must outrank duplicate-feature-push suppression: with a positively identified open PR, `[full-ci]` on a feature push still schedules Linux + **full** Windows checks. A prior planner could skip that forced gate because duplicate suppression ran first. The request's scope is a safety boundary, not an optimization hint.
- Workbook recovery, manually edited Watch state, Watch projection, and managed draft code (`src/managed/recoveryUi.ts`, `watchUi.ts`, `watchProjection.ts`, `draft.ts`) use **full** regression rather than assuming only the managed test subset is sufficient. This intentionally spends more compute for integrity-sensitive changes.
- A manually dispatched `full_regression=false` still runs **full** when a diff cannot be proved (current workflow-dispatch behavior); the flag is not permission to trust an unknown changed-file set.
- A `main` push runs the full Windows required job even for README-only changes; docs-only feature pushes can skip. This conservatively protects the main gate but limits attainable cost savings. **No measured 60% reduction should be claimed** until post-integration job-minutes are normalized by actual commit/PR mix.
- The Option A application draft PR #72 introduces an additional `npm run build:managed`, two bounded UUID/ExcelJS reachability checks, and the controlled fictional UAT package. They are **not yet integrated** into the three-tier CI workflow; preserve them when merging histories, with packaging conditioned on an explicit owner UAT/full checkpoint. The 2 file-level overlaps to resolve are `.github/workflows/ci.yml` and `test/browser/release.spec.ts`; keep the latter's 2,000-row identity assertion and any accepted baseline coverage. Never overwrite these acceptance controls to save CI minutes.
- Branch protection status check configuration remains inaccessible to current GitHub integration (403). Only an authorized administrator can certify unchanged required status identity. Do not merge/activate until this and independent composite validation are complete.
