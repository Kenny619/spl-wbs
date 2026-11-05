# Proposed AGENTS.md appendix — pending Product Owner review

Append the following after existing rules; do not replace any existing section. This proposal is not implementation authorization. Existing phase approval requirements continue to apply.

## Product authority and change control

- The Product Owner is the approval authority for requirements, acceptance, design exceptions, architecture freeze and implementation authorization. Product Manager coordinates scope and priorities; engineering proposes designs and reports feasibility; QA supplies independent evidence. Engineering or an agent cannot approve its own scope expansion.
- Issues #1/#2 govern Excel Managed Variant scope. Preserve DEC-EMV-002-01 through DEC-EMV-002-11. Issue #2 remains open until remaining design decisions and feasibility evidence have been reviewed and explicitly accepted by the Product Owner.
- Any requirement change requires a linked proposal recording current behavior/decision ID, proposed behavior, reason, privacy/UI/compatibility impacts, alternatives, tests and explicit Product Owner disposition. Do not treat technical difficulty, a passing test, a draft PR or informal engineering recommendation as approval. Preserve the original decision history; record supersession explicitly if approved.

## Frozen UI and variant boundaries

- All existing frozen v17 protections, hash, visuals, palette, functional/calendar/security rules and screenshot requirements remain mandatory. Never regenerate the frozen HTML or approved screenshots, raise screenshot tolerance, rename interface features or weaken assertions to make CI green. Authorized new managed UI needs narrowly scoped requirements and regression evidence for unaffected areas.
- The existing SharePoint/export viewer remains read-only, with its current no-write contract. Do not add writes to its entry point/controller as a side effect of sharing code. Use dedicated managed entry points, adapters, state and artifacts under a separately approved implementation plan. Shared pure utilities require regression evidence for both variants.
- Managed writes are conditional on recorded Product Owner implementation authorization and approved architecture, never this appendix alone. Maintain local-only/no-upload data handling. Persist handles/approved configuration best effort, not task/project data. Test-only spikes use synthetic workbooks and remain isolated from production imports.

## Tests and evidence

- For each PR record exact commit, Node/npm/browser/OS versions, commands, exit codes and known baseline failures. Run clean-checkout npm ci, npm test, npm run build, npm run test and required browser/E2E checks. Preserve TypeScript coverage of tests and fixture code. Do not remove, skip or relax failed baseline assertions.
- Required CI follows #8/#9: build/typecheck/unit plus Windows browser regression against approved 1440×900 and 1024-width snapshots. Keep generated dist changes out of source PRs unless deliberately authorized packaging. Upload failure diagnostics without sensitive workbook data. Missing reference artifacts are a failing reproducibility defect, not a green waiver.
- Managed implementation requires positive and negative tests for full field/history parity, append-only history, ChangeSetID/no-op/retry idempotency, failed-save UI consistency, conflicts, backups/rotation/recovery, permissions, Save As switching, compatibility rejection and all feature-specific #8 tests.
- Label evidence explicitly: automated test, code inspection, documentation, or actual Windows/Edge hardware. Mocked browser/Node/Linux results do not satisfy physical Windows file-system evidence. Record FS-01 through FS-12 and any limitations; never claim comprehensive Excel locking or physical atomicity without evidence.

## Independent QA and release authority

- A reviewer independent of the implementation author must examine reproducibility, negative cases, data integrity, recovery, privacy and UI regression evidence. Independent QA and actual Windows 11/Edge/file:// testing are required before #2 is eligible for freeze. The author must not label self-review as independent QA.
- Keep changes in scoped reviewable branches/PRs. Draft feasibility/documentation/test PRs do not accept product requirements. Report failures and limitations and follow the existing per-phase stop-for-approval rule.
- No agent may merge, enable auto-merge, deploy, publish, tag/release, alter branch protections, or mark a requirement/epic complete without explicit authorization for that action. Green CI alone is not authorization. Product Owner acceptance and authorized maintainer merge/release action remain separate gates.
