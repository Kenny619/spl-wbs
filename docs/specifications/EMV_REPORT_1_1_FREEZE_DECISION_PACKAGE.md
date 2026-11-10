# EMV-REPORT-1.1 — Product Owner decision package

**Prepared:** 2026-11-09 JST  
**Controlling issue:** [#7](https://github.com/Kenny619/spl-wbs/issues/7) · **Proposal:** [EMV_REPORT_1_1_CHANGE_PROPOSAL.md](EMV_REPORT_1_1_CHANGE_PROPOSAL.md) · **QA:** [EMV_REPORT_1_1_REVIEW_AND_TRACEABILITY.md](EMV_REPORT_1_1_REVIEW_AND_TRACEABILITY.md)  
**Status:** Review 02 design **ACCEPTED on 2026-11-10**, following owner feedback; the user said “Excellent update. No more change requests. Please proceed.” The full 1.1 specification is **PROPOSED / NOT FROZEN**; two distinct Product Owner dispositions — A formal requirements freeze and B bounded implementation authorization — remain **OPEN**. That conversational “proceed” is design handoff, not evidence of A/B approval. See [Owner Review 02 disposition](EMV_REPORT_1_1_REVIEW02_OWNER_DISPOSITION.md).

## Decision A — freeze specification

**Approval wording, if granted:** "As Product Owner, I approve and freeze EMV-REPORT-1.1 as described in PR #36, including the owner-accepted Review 02 changes, three report modes (Latest Status, Progress & Risks Update, Detailed Change Audit), go-live working-day KPI, project-name-only report content, consolidated Risks and Blockers, five-day commitments, daily audit tables, plain-text, HTML and Outlook rich-copy outputs, the recorded-versus-current evidence rules, security/immutability protections, and the traceability and acceptance criteria, with the source-contract resolutions recorded. Preserve EMV-REPORT-1.0 as historical baseline."

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
| Latest Status | Existing committed-state calculations preserved internally; report replaces overall % with go-live countdown, one upcoming milestone, strong exceptions, five-day commitments | Existing plain-text report must be revised only after authorization |
| Progress & Risks Update | Stakeholder period events plus consolidated current Risks and Blockers, separate history-backed Schedule Changes, five-working-day commitments, compact one-row tasks, **All Tasks default**, no invented trends | Not implemented |
| Detailed Change Audit | Preserve complete 1.0 Update Report evidence; HTML groups by calendar day in fixed-column tables with full Save/ChangeSetID association | Existing Update Report plain text |
| Plain text | Exact preview/clipboard parity for each mode | Implemented for 1.0 modes |
| HTML | Static, standalone, inert printable report, escaped workbook text; exact-snapshot output/preview/download and rich **Copy for Outlook** (HTML + plain-text MIME) | Not implemented; browser/Outlook and XSS tests mandatory |
| Workbook safety | Read-only report generation; unsaved edits excluded; no new schema, remote calls or workbook saves | Existing 1.0 protections preserved |

## Remaining source-contract decisions before exact scope freeze

1. **Project name:** The current managed context only exposes `fileName`, not a distinct project name. Recommended resolution: an explicit report-workspace **Project name** input stored in local preferences for that workbook identity (never printed as workbook filename, blank value blocks Generate). Formal 1.1 freeze must adopt or replace this rule.
2. **Manual RAG:** The current Task schema has statuses but no separate Red/Amber manual RAG attribute. Recommended bounded resolution: include existing At Risk/Blocked statuses immediately; add independently sourced Red/Amber RAG items only if a verified, separately approved source exists. **Do not invent a manual RAG signal or XLSX column**. Formal freeze must accept this limitation or authorize a separate source contract.

All other Review 02 feedback is captured in the [design disposition](EMV_REPORT_1_1_REVIEW02_OWNER_DISPOSITION.md). Owner requested no further design iteration. These two are data-source decisions, not requests to revise visual styling.

## Remaining known limits (not release blockers to *freeze* if accepted)

1. `UpdateHistory` records saved in-app field events, not every externally performed activity. Progress/risk transitions are attributed to recorded changes; present current risk separately.
2. Historical project-wide % movement cannot be computed accurately from partial field history without complete snapshots; do not present it.
3. A missing `UpdateHistory` worksheet currently returns no events; the revised implementation must distinguish absent vs empty source when reporting coverage without changing the workbook schema.
4. HTML creates an injection surface; require strict inert/escaped offline document output and cross-format factual parity tests.
5. Stage A physical workbook safety, security advisories, draft DES-010 UI PRs and merge/release approvals remain **separate gates**. Requirements freeze or isolated coding does not waive them.

## Mandatory delivery gates after independent Decision B authorization

1. Contract traceability + acceptance tests for current/recorded state distinctions, status reversals, schedule revisions, DST and workstream heading rules.
2. Legacy Detailed Audit output/parity and `ChangeSetID` regression tests.
3. Offline HTML with malicious-as-text workbook fixtures, no scripts/remotes, browser export and print smoke; plain-text exact copy and Rich HTML+plain-text MIME **Copy for Outlook**. Validate actual corporate Edge → Outlook HTML compose.
4. CI exact-head Ubuntu unit/build and Windows Chromium; second-pass AI critical review labeled appropriately.
5. One targeted physical corporate Edge UAT for stakeholder report quality, go-live and RAG/source resolution, formats, actual Outlook rich paste, HTML exported document, and audit parity, using synthetic workbooks only.
6. Separate explicit PO approval for integration, main merge, security risk disposition and release.

**Current decision register (2026-11-10):** direction APPROVED 2026-11-09; **Review 02 design ACCEPTED** 2026-11-10; full 1.1 scope & source-contract decision A **OPEN**; bounded implementation decision B **OPEN**. No report-engine implementation, merge, release or schema mutation authorized. Do not treat the owner's general “proceed” as explicit A/B authorization.
