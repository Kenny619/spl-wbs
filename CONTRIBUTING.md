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

## Current v18 baseline

v18 is the approved current UI/UX authority; implementation is authorized in PR #15.
`reference/UI_BASELINE_v18_CANDIDATE.html` retains its provenance filename and immutable
SHA-256. The manifest records adoption. Do not reopen the settled visual-target UAT.

Current unit checks pin the v18 source bytes and holiday snapshot. Browser tests
load the same synthetic workbook into reference and freshly built product at a fixed
Asia/Tokyo clock and compare screenshots with a 0.001 maximum different-pixel ratio.
The fixture includes full owner names, ID/WBS/SortOrder conflicts and Updates.
The original v17 tests and PNGs remain byte-for-byte under `test/historical/v17/`;
they are not current acceptance oracles. The Gantt functional regression remains
active; corresponding visual states are checked against live v18.

For restricted cloud Chromium use the loopback diagnostic override documented in
`spike/v18-review/README.md`; file:// remains the deployment mode and is exercised
by Windows CI. Never bypass administrator browser policy.

## CI and diagnosis

The workflow derives from draft PR #9. It runs Ubuntu Node 22 unit/build checks
and Windows Chromium browser regression, preserving diagnostics on failure.
The build step still runs after unit failure when installation succeeded, so a
fixture failure cannot hide a separate TypeScript defect. Review actual/expected/
diff images before proposing any visual correction; the approved v18 reference and 0.001 screenshot tolerance stay fixed. CI does not modify baselines.

The former v17 Gantt PNG mismatch is retained as historical evidence. Current
visual acceptance compares equivalent Gantt states directly with approved v18,
while the existing behavioral assertions remain active.

## Approval and evidence boundaries

Routine fixes and test/documentation PRs proceed under the Product Owner's standing
delegation in AGENTS.md. Product decisions, architecture acceptance and visual UAT
remain explicit gates. Keep production behavior and the existing read-only variant
unchanged except for the explicitly authorized v18 UI/UX implementation. No merge/deployment/release is implied.

Label evidence as automated test, code inspection, documentation, or actual Windows
11/Edge hardware. Linux Chromium and Windows Server CI cannot qualify Edge/Excel
file locks, native picker permissions, power-loss recovery or laptop scaling.

GitHub issues and PRs are the durable handoff between sessions. This environment's
available tools do not expose general messaging to another Codex conversation or
window. Do not claim an automatic cross-window handoff or background worker exists.
