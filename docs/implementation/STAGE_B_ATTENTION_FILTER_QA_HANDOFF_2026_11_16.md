# Stage B — Live Needs Attention integration / QA handoff

**State:** draft (PR #90); 2026-11-16 JST; exact-head validation and owner acceptance pending.  
**Parent behavior:** PR #81 reversible Blocked / At Risk status buttons and PR #88 pure source-backed attention model. This integrated draft targets main for scoped CI; no merge authority or RAG/Clear policy approval.

## Shipped in this branch

- `ViewState.attentionIds` is an optional managed-only restriction: undefined = no attention restriction; empty array = an active restriction with zero matching tasks. The same WBS tree preserves ancestor context, not a duplicate result list.
- Summary has Blocked, At Risk, Overdue, *verified open Under Watch*, and nonclickable Open milestones. Counts reflect source-backed facts; overlapping signals are separate, while source-task identity is deduplicated.
- Unknown/legacy/incompatible Watch workbook => no verified open-Watch task ID list, displays **—**, disables only the Under Watch shortcut; never displays a fabricated zero/Green.
- Clicking an available shortcut temporarily clears conflicting search/column/status/owner/type/workstream/finish filters, applies exact task IDs, and selects the first matched Task Detail. A second click restores prior view/search/selection. Switching categories preserves the original baseline.
- Live Watch projection refreshes after verified project workbook snapshot is read. No workbook write or new health assessment.

## Targeted QA evidence still required

| ID | Test target | Source / expectation |
|---|---|---|
| ATT-01 | Legacy single-sheet fixture; fixed Nov 16 today | Overdue=1; Under Watch=— and disabled; click Overdue reveals actual row/Task Detail; click again restores prior search |
| ATT-02 | Synthetic 23-task valid ProjectData workbook with open and resolved reasons | Under Watch shows only tasks with recorded **open** reasons, independent of status, with no inference of Green/Clear; source rows match WBS and Task Detail |
| ATT-03 | One task Blocked AND overdue AND Watch; another At Risk, no date | Distinct categories, no duplicate task identity; correct filter scope and selection |
| ATT-04 | Unsaved task edit and unsaved Watch draft, then attention switch | Existing guarded Save / Discard / Cancel; Cancel retains draft and current view; no implicit source write |
| ATT-05 | Reopen different workbook; verified Watch save resolves final reason; invalid XLSX fallback | No stale selected Watch IDs, no fabricated zero / automatic Green; preserve last verified workbook and explicit unknown |
| ATT-06 | Existing Schedule status/owner/finish/search filters prior to attention click | One click restores exact prior filter arrays/selection after leaving shortcut, with WBS ancestry preserved |
| ATT-07 | Keyboard, light/dark, 860px/1366px/1440px | Discoverability, focus/ARIA pressed, full context and no visual overlap; accepted DES-012 reference retains authority |
| ATT-08 | Byte integrity | Filtering/navigation only. Source Excel, ProjectAudit and UpdateHistory byte-identical, no save attempt |

## Risks to verify before integration

- Existing `Exceptions` / `Workstreams` chart-local scope uses its own status filter state; confirm it does not leave misleading pressed state after attention switching. Avoid implementing a separate UI silo.
- Read-only generic viewer must remain unaffected by the optional managed-only ID restriction.
- A later user-edited column filter while attention is active currently intersects the temporary ID set. A second activation restores the previously saved baseline; document or refine this navigation behavior after focused UAT.
- Narrow width <=960px currently hides the top priority strip under the Stage A layout. The approved Gantt-local Exceptions control remains; decide on a compact mobile/laptop attention affordance before B2 can be considered complete.
- `getWatchProjection` depends on verified committed workbook evidence, never a draft/manual actor claim.
- The source package includes #81 and #88 code because it is an integration candidate. Verify dependency sequencing and no duplicated nonidentical files before merging parent/child PRs.

## Delivery gate

Exact-head build + unit, targeted Windows Chromium, independently reviewed real Watch/recovery behavior and focused owner B2 UAT are mandatory before protected-main integration. Keep Stage A acceptance frozen and Report1.1 / Issue #82 RAG policy unchanged.
