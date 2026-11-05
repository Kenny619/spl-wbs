# Cloud development and evidence

Read AGENTS.md first. Use Node 22 (the CI runtime) and the committed package lock.
For restricted cloud executors, use the supported network-enabled command path,
inherited proxy/CA trust, and a workspace-local npm cache. Do not disable TLS or
inspect credentials. No private project data is needed for development.

```sh
npm ci --cache "$PWD/work/npm-cache"
npm test
npm run build
npm run test
npm run test:e2e
```

Capture each command's exit code; do not omit build diagnostics after a unit-test
failure. Vitest unit tests and Playwright browser tests are separate gates.
The synthetic sample workbook is committed under `test/fixtures/synthetic-reference`;
see its README for provenance and deterministic regeneration.

## Frozen reference prerequisite

`reference/UI_BASELINE_v17_FROZEN.html` must contain the exact approved bytes with
SHA-256 `5e6f438fb3817e253984a806bb5bccd4d82f3f14e93d0d03e6eaf5ada2fb84d7`.
The original is absent from the available repository history. Until it is
recovered and committed after provenance/sensitivity review, the frozen-HTML
unit/calendar/browser assertions must remain red. `.gitignore` permits only that
exact reference filename; other private reference files remain ignored.

Do not reconstruct an approximation, change its hash, remove assertions, create
a synthetic UI substitute, or update snapshots to bypass the prerequisite.

## CI and diagnosis

The workflow derives from draft PR #9. It runs Ubuntu Node 22 unit/build checks
and Windows Chromium browser regression, preserving diagnostics on failure.
The build step still runs after unit failure when installation succeeded, so a
fixture failure cannot hide a separate TypeScript defect. Review actual/expected/
diff images before proposing any visual correction; the existing screenshot
tolerance and approved images are unchanged. CI does not modify baselines.

Historical PR #9 also had an 8,486-pixel mismatch for `gantt-1440-win32.png`.
Its root cause remains unverified. Browser/runner/font differences are hypotheses,
not permission to approve new images. Failure artifacts from this workflow should
make the next comparison reviewable.

## Approval and evidence boundaries

Routine fixes and test/documentation PRs proceed under the Product Owner's standing
delegation in AGENTS.md. Product decisions, architecture acceptance and visual UAT
remain explicit gates. Keep production behavior and the existing read-only variant
unchanged until feature work is authorized. No merge/deployment/release is implied.

Label evidence as automated test, code inspection, documentation, or actual Windows
11/Edge hardware. Linux Chromium and Windows Server CI cannot qualify Edge/Excel
file locks, native picker permissions, power-loss recovery or laptop scaling.

GitHub issues and PRs are the durable handoff between sessions. This environment's
available tools do not expose general messaging to another Codex conversation or
window. Do not claim an automatic cross-window handoff or background worker exists.
