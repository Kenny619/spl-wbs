# EMV-REPORT-1.1 — Product Owner decision package

**Prepared:** 2026-11-09 JST  
**Controlling issue:** [#7](https://github.com/Kenny619/spl-wbs/issues/7) · **Proposal:** [EMV_REPORT_1_1_CHANGE_PROPOSAL.md](EMV_REPORT_1_1_CHANGE_PROPOSAL.md) · **QA:** [EMV_REPORT_1_1_REVIEW_AND_TRACEABILITY.md](EMV_REPORT_1_1_REVIEW_AND_TRACEABILITY.md)  
**Status:** READY FOR **TWO DISTINCT PRODUCT OWNER DISPOSITIONS**, both currently **OPEN**. The Owner has already approved the **general direction**; do not reinterpret that as formal requirements freeze or implementation approval.

## Decision A — freeze specification

**Approval wording, if granted:** "As Product Owner, I approve and freeze EMV-REPORT-1.1 as described in PR #36, including three report modes (Latest Status, Progress & Risks Update, Detailed Change Audit), plain-text and standalone HTML outputs, the recorded-versus-current evidence rules, security/immutability protections, and the traceability and acceptance criteria. Preserve EMV-REPORT-1.0 as historical baseline."

**Consequence of approval:** Mark 1.1 requirements **FROZEN** in Issue #7 and living specifications; date and link approval, retain 1.0 provenance and regression requirements. No source-code implementation, merge or release follows solely from this choice.

## Decision B — bounded implementation authorization (independent of A)

**Recommended approval wording, if granted after A:** "I authorize the bounded EMV-REPORT-1.1 implementation on a new isolated draft feature branch rooted in the currently reviewed Excel Managed development baseline. Reuse the existing audited report/history engines, keep the v18 read-only viewer and managed workbook transaction/safety code unchanged, verify exact-head automated and AI-assisted QA, and prepare targeted owner UAT. Do not merge, release, deploy, alter workbook schema or accept residual dependency risk."

**What implementation may do only if authorized:** typed canonical report model, three modes, read-only text/HTML rendering from one immutable snapshot, explicit .html export, stakeholder evidence classification, retained 1.0 Detailed Audit, no-write and XSS tests, source-focused impact docs. No new risk engine, free-form AI summarization, server, cloud connections, external assets or historical-baseline reconstruction.

**Consequence of no B approval:** docs-only change-control progression may continue; no report-engine coding.

## Why decisions must remain independent

- Frozen [EMV-REPORT-1.0](https://github.com/Kenny619/spl-wbs/issues/7) already exists and remains controlling until Decision A.
- The previously granted **direction approval** did not specify the completed event classification rules, HTML security contract, ambiguous-history behavior, or test gates; these are detailed new requirements needing a distinct freeze.
- Implementation would change a frozen mode, add a rendered HTML output (security-sensitive) and expand acceptance requirements; it should occur only under bounded, explicit authority.

## Exact in-scope behavior for PO signoff

| Capability | Freeze proposed 1.1 | Existing implemented behavior |
|---|---|---|
| Latest Status | Reuse current committed weighted progress, attention, milestones and grouping | Available in plain text; preserve |
| Progress & Risks Update | Stakeholder-focused period changes with timestamped event evidence, separately identify current open risks and upcoming dates, **no invented change or trend** | Not implemented |
| Detailed Change Audit | Preserve all exact existing 1.0 Update Report historical facts, Save/ChangeSetID and long-text behavior | Existing Update Report plain text |
| Plain text | Exact preview/clipboard parity for each mode | Implemented for 1.0 modes |
| HTML | Static, standalone, inert printable report, escaped workbook text, explicit output/preview/download from exact same snapshot | Not implemented; XSS/security test mandatory |
| Workbook safety | Read-only report generation; unsaved edits excluded; no new schema, remote calls or workbook saves | Existing 1.0 protections preserved |

## Remaining known limits (not release blockers to *freeze* if accepted)

1. `UpdateHistory` records saved in-app field events, not every externally performed activity. Progress/risk transitions are attributed to recorded changes; present current risk separately.
2. Historical project-wide % movement cannot be computed accurately from partial field history without complete snapshots; do not present it.
3. A missing `UpdateHistory` worksheet currently returns no events; the revised implementation must distinguish absent vs empty source when reporting coverage without changing the workbook schema.
4. HTML creates an injection surface; require strict inert/escaped offline document output and cross-format factual parity tests.
5. Stage A physical workbook safety, security advisories, draft DES-010 UI PRs and merge/release approvals remain **separate gates**. Requirements freeze or isolated coding does not waive them.

## Mandatory delivery gates after independent Decision B authorization

1. Contract traceability + acceptance tests for current/recorded state distinctions, status reversals, schedule revisions, DST and workstream heading rules.
2. Legacy Detailed Audit output/parity and `ChangeSetID` regression tests.
3. Offline HTML with malicious-as-text workbook fixtures, no scripts/remotes, browser export and print smoke; plain text exact clipboard.
4. CI exact-head Ubuntu unit/build and Windows Chromium; second-pass AI critical review labeled appropriately.
5. One targeted physical corporate Edge UAT for stakeholder report quality, formats, HTML exported document, and audit parity, using synthetic workbooks only.
6. Separate explicit PO approval for integration, main merge, security risk disposition and release.

**Current decision register:** direction APPROVED 2026-11-09; A OPEN; B OPEN. No execution beyond docs authorized as of publication.
