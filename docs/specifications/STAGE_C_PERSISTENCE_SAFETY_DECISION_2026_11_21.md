# SPT-WBS | Stage C Persistence Safety & Compatibility Decision Record

**Record:** C-PERSIST-0.1 — development proof, 2026-11-21 JST  
**Status:** Candidate engineering decision record. No real workbook writing, protected merge, beta, or deployment authorization.  
**Source:** [Draft PR #110](https://github.com/Kenny619/spl-wbs/pull/110), [Stage C authoring contract](STAGE_C_AUTHORING_COMPATIBILITY_DRAFT_2026_11_17.md), [B2 Task Create contract](STAGE_C_B2_TASK_CREATE_AUDIT_CONTRACT_DRAFT.md)

## Decision context

The Product Owner requires that the same Excel workbook carry shared entity, Calendar, commitment, RAG (when implemented), and audit facts. A future read-only variant may open the same workbook, but individual display preferences remain outside it. Corporate Edge can deny the \`file://\` folder picker; a Node \`http://localhost\` PM authoring variant was explicitly retained as a possible later solution.

Stage C previews now generate 0.1.2 blank or synthetic 0.1.3 populated candidates entirely in memory. **That is not permission to persist, activate, or migrate a real 0.1.3 workbook.** The accepted 0.1.2 editor continues to reject newer schema versions.

## Evidence from current isolated proofs

| Evidence | Proved | Explicit limitation |
| --- | --- | --- |
| Pure candidate verification and B2 reopened readback | Identity, canonical imported tasks, version transition, existing ProjectAudit/Create evidence | The current 0.1.3 schema/encoding is a contract candidate, not activated |
| Synthetic in-memory exclusive port | Existing name/case alias refusal, candidate hash, interrupted stage, readback, recovery evidence | Port assumes atomic \`createExclusive\` and compare-and-remove semantics unavailable to standard browser directory handles |
| Test-only Node disk feasibility lab | Exclusive exact-name creation with \`O_EXCL\`, readback hash, no-clobber case scan, fail-closed interrupted transaction and no activation | Names and files are opened by pathname; directory handles are not pinned across operations; TOCTOU and cross-process case folding remain unproven |
| Candidate-integrity lab extension | Prewrite and postwrite XLSX structure verification, 0.1.2 blank contract or B2 source→candidate proof | A valid checksum alone is insufficient; test-only validation does not turn Node pathname semantics into production authorization |

## Options and engineering recommendation

**A — Browser-managed directory writes:** retain existing guarded 0.1.2 edits. Do **not** use standard File System Access APIs for Stage C *new-destination* exclusive create until atomic no-clobber, compare/remove, recovery and supported host behavior are demonstrably provided. The browser API's \`getFileHandle({create:true})\` does not by itself promise atomic no-clobber.

**B — Controlled browser download:** potential first-delivery fallback for a *validated new* workbook (especially corporate Edge). Download is a transfer, not a verified persistent commit or active-project handoff. Treat destination naming, OS/browser duplicate handling, actual saved-file readback and subsequent explicit re-open as separate steps. No automatic session replacement, no implied overwrite guarantees and no automatic Recent Projects entry.

**C — Protected Node localhost writer:** recommended eventual PM-authoring route if the browser path cannot meet requirements. Require a sandboxed, authenticated/authorized local service contract, trusted directory selection/pinning, file-type and name allowlists, exclusive destination creation, scoped same-directory transaction ownership, explicit case behavior on Windows, durability/fsync semantics, verified destination readback, and fail-closed manual recovery. **No localhost service or endpoint is authorized or implemented by the test lab.**

**D — Shared-drive multiwriter:** deliberately separate rollout gate. A directory-local no-clobber test does not prove correctness when users operate through SMB, OneDrive, SharePoint sync or other independently cached/multiwriter stores. Require tested source-version conflict handling, durable coordination/locking and independent filesystem/host QA before enabling concurrent PM edits.

## Minimal activation gates

1. **Version freeze:** approve the exact 0.1.3 and B2 field/provenance schema, including UpdateHistory chronology and read-only fallback. Old 0.1.2 writers continue to refuse future schemas; never silently downgrade.
2. **Candidate verification:** final XLSX must pass package preflight, canonical WBS import, ProjectMeta and ProjectAudit proof, TaskID/parent/dependency/audit completeness and original-field preservation, before any write attempt.
3. **Platform proof:** run targeted Windows/Edge and actual destination-host tests for no-clobber, case aliases, symlinks/reparse points, directory substitution, hard links, power-loss recovery and file-share permissions. Unsupported cases fail closed.
4. **Transaction boundary:** reserve owned recovery intent, guarantee exclusive destination claim, write/flush, independently re-open, reconcile exact hash and B2 history, and explicitly close or retain recovery evidence. No automatic retry after uncertain outcome.
5. **Handoff:** only verified committed bytes can be reloaded or marked active; rejected/failed/denied operations leave existing active source and Recent Projects untouched.
6. **Independent QA and owner UAT:** focused fictional end-to-end evidence with precise commit SHA. No Stage A/B repeat testing absent a regression surface; no beta or protected merge implied.

## Current action and recommendation

Continue the test-only candidate-integrity and cross-host security experiments within PR #110. Prefer **B as a separately reviewed fallback** and **C for eventual controlled PM writes** once supported by platform evidence. Preserve the accepted read-only app as the restricted corporate Edge path. Do not turn on the Save UI as a shortcut to closing Stage C.

**Open risks:** directory-identity pinning, Windows reparse/casefold, coherent recovery ownership, shared-drive multiwriter contention, independent 0.1.3 audit reader, future version compatibility, and real-host UAT.
