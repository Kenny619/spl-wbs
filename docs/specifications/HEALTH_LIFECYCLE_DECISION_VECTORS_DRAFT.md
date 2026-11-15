# Under Watch / Clear / RAG — decision and verification vectors (DRAFT)

Status: **analysis only, not an approved health policy**. Prepared against main `6306b9f3bfae61af1560ca27df2ffb4b07d4a8f5` on 2026-11-16 JST for [Issue #82](https://github.com/Kenny619/spl-wbs/issues/82). This is **not** an amendment to the frozen [Report 1.1](../specifications/EMV_REPORT_1_1_FROZEN.md), [Manual Watch addendum](../specifications/REPORT11_MANUAL_WATCH_ADDENDUM_1.md), or workbook schema. No inferred Green, Clear, or authenticated actor.

## Separation of facts and proposed decisions

| Input | Existing evidence that may be displayed | Unapproved interpretation that MUST NOT be emitted |
| --- | --- | --- |
| Task status Blocked or At Risk | Explicit task status and matching task filter | Certified Red or Amber health |
| Open manual Watch reason | Reason, open/resolved state, existing audit evidence | Automatically Red or automatically not Green |
| Resolved manual Watch reason | Recorded resolution and retained history | Overall Clear, Green, or verification of all independent causes |
| Overdue task / schedule exception | Derived schedule exception with its source and date context | Automatically Red, or automatic resolution when schedule changes |
| Missing or legacy health assessment | No verified health assessment | Default Green |
| Report period with resolution event | Historical event within period plus current open/resolved facts separately | Retroactively treating prior periods as Green |

## Acceptance vectors requiring owner-approved expected outcomes

| ID | Synthetic scenario | Invariant to verify now | Decision required before health implementation |
| --- | --- | --- | --- |
| H-01 | One open manual Watch reason; task status On Track | Preserve reason and provenance | Whether open Watch constrains RAG |
| H-02 | Two independent open Watch reasons; resolve only one | Other reason stays open; no implicit clearance | Whether Clear requires all reasons closed and review |
| H-03 | Reopen a previously resolved reason | Preserve both historical transitions | Who may reopen and whether prior clearance becomes stale |
| H-04 | Task overdue with no manual Watch reason | Show overdue independently | Whether and how overdue affects assessed RAG |
| H-05 | Schedule becomes on time while an independent Watch reason remains | Never auto-resolve manual Watch | Whether prior RAG assessment expires |
| H-06 | Legacy workbook with no approved health fields | Preserve workbook and avoid synthesized Green | Unknown display, migration/version strategy |
| H-07 | Health assessment contradicts task status or Watch facts | Expose conflicting sources without silently overriding | Precedence and reviewer authority |
| H-08 | Report period includes reason resolution, followed by reopen outside period | Keep period events distinct from current state | Report sections, historical-as-of rules |
| H-09 | Unsaved editor change, then health action attempted | Existing guard must prevent misleading persisted state | Health transaction boundary and audit actor semantics |
| H-10 | Save fails, stale workbook, or second writer intervenes | No false success or loss of existing history | Conflict, backup, recovery and no-multiwriter guarantee |
| H-11 | Report HTML/plain/Outlook representations | Preserve approved Report 1.1 contract and parity | Versioned report delta after policy freeze |
| H-12 | Read-only Viewer loads future-version workbook | No mutation; clear unsupported/unknown indication | Forward compatibility and feature gating |

## Minimal decision sequence

1. **Taxonomy and authority:** define whether Clear refers to an individual Watch reason, a reviewed aggregate, or a separate state; define Red/Amber/Green/Unknown, assessment authority, evidence, staleness and conflicting-source precedence.
2. **Transition table:** specify Add/Resolve/Reopen, approval and audit identity limitations; decide whether schedule exceptions affect assessed health or remain independent signals.
3. **Versioned persistence:** compare keeping the current five-sheet schema unchanged versus an additive, backward-compatible versioned extension. Do not implement either without a frozen decision and integrity plan.
4. **Report delta:** map current facts, period events, unverified assessments, and resolved causes to Latest Status, Progress & Risks, Detailed Change Audit and Meeting Review. Maintain HTML/plain/Outlook parity.
5. **Only after Stage C authoring stabilizes:** implement common projections, independent unit/browser/workbook round-trip tests, report integration, focused owner UAT and explicit acceptance before beta.

**Current gate:** Stage B may finalize this specification, but no application, schema or Report 1.1 business-semantic change is authorized by this draft. Continue #17/#16 QA and #25 UX audit independently.
