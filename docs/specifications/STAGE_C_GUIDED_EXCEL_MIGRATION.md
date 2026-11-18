# Stage C2 — Guided Excel WBS migration (C-IMPORT-0.1)

**2026-11-19 JST — Product Owner direction recorded; detailed contract proposed.**
The owner endorsed three onboarding routes (scratch, import, template) and clarified import is between legacy and arbitrary Excel: minimize manual effort migrating an existing managed WBS, establish a minimum input guideline (column names and required columns), map every existing item into the platform schedule, and generate the managed source Excel. This is not a general-purpose arbitrary spreadsheet ETL tool. Related #24, #23, C-AUTHOR-0.3, B2 architecture.

## Proposed input profile

Accept .xlsx, one explicitly selected worksheet, tabular header row, one WBS item per nonempty data row. Exact native headers preferred; offer documented common aliases and a small reviewable column mapping step only where needed. No macros, merged hierarchical layout interpretation, arbitrary multi-sheet joins or formula execution. Read evaluated cached values only where supported and safe; missing/unsupported values must be surfaced, never guessed.

| Input column (canonical target) | Requirement | Proposed handling |
| --- | --- | --- |
| Title | Required | Accept Task Name / Task / Activity aliases; nonblank per item |
| WBSCode | Recommended | Preserve supplied unique valid codes; if entire column absent, propose sequential root codes; mixed missing values require review |
| ID | Optional | Preserve valid unique existing IDs where possible; otherwise generate immutable UUIDs for missing IDs; maintain source-to-target reference map |
| TaskType | Optional | Task / Summary / Milestone; infer Summary only from validated explicit hierarchy; otherwise default Task; do not guess milestones from dates |
| ParentTaskID / Parent WBS | Optional | Map through source identifiers or unambiguous WBS hierarchy, show inferred parent links for approval; reject conflicts, cycles or missing parent |
| PlannedStart / PlannedEnd | Optional | Normalize supported Excel dates; unscheduled if both blank; flag ambiguous dates and invalid order |
| TaskStatus | Optional | Canonical statuses or explicit documented aliases; blank defaults Not Started; unknown nonblank values require review |
| Progress | Optional | Normalize percentage using explicit cell format or user-confirmed column convention; preserve blank versus zero |
| AssignedTo / Workstream | Optional | Preserve text; do not invent owner or workstream |
| PredecessorIDs / Predecessor WBS | Optional | Resolve through identity map; supported Finish-to-Start only; reject unresolved, ambiguous or cyclic links |
| Priority / Description / Updates / SortOrder / Modified / ItemURL | Optional | Preserve supported values using canonical normalization; report unsupported values/columns and obtain explicit review before omission |

**Proposed minimum is Title alone**, with user-reviewed generated identity/root WBS/default Task. For structured migration recommend Title + WBSCode, plus explicit hierarchy and dependency references where available. Exact minimum, aliases, inference and default rules require focused functional review; existing native workbook parser still requires ID, Title, WBSCode, TaskType in the **generated target**, not necessarily in the external input. Never silently flatten supplied hierarchy or discard nonempty rows. No silent type/field inference from visual formatting.

## User journey

1. Start New Project → Import Existing Excel; select file and worksheet. Source opened read-only; no overwrite or automatic modifications.
2. Auto-detect documented headers, show mappings, required fields, optional missing fields and unsupported columns. Only ask for mapping/format decisions that cannot be resolved reliably.
3. Preview full normalized WBS including source row references, generated IDs/codes, hierarchy, dependencies and row totals; present actionable errors and warnings. Every nonempty item must map once or be explicitly resolved; no hidden skipped rows or partial success.
4. Resolve data errors, review conversion decisions, confirm project name and target destination. Existing complete native managed workbooks use existing open workflow preserving history rather than conversion. Legacy/non-native inputs generate a separate target.
5. Generate canonical ProjectWBS and required managed workbook structures through the same validated authoring/candidate path as #23/#24. Record imported entities as new-to-platform initial snapshots at migration time using the approved B2 direction once exact schema/writer approved; never invent original creation dates, past edits, authenticated identity, or manual RAG. Imported source Modified values, if supported, are source facts, not audit timestamps. Do not erase native history.
6. Validate serialized target, compare row count and normalized mapped values/references, save only to a new destination (download fallback if picker denied), verify destination readback when possible. Do not claim a download is a verified managed reopen; open via normal flow and register Recent Projects only after successful load. Keep existing session unchanged on cancel/failure.

## Proposed targeted QA (not executed)

| ID | Required outcome |
| --- | --- |
| CIMP-01 | Minimal Title-only sheet migrates every item once with reviewed defaults and stable IDs |
| CIMP-02 | Structured source preserves task names, WBS, dates, status, progress, ownership and workstreams |
| CIMP-03 | Source ID/WBS relationships map correctly across generated IDs; parent and dependency graph preserved |
| CIMP-04 | Duplicate IDs/codes, orphan, cycle, invalid dates or unknown statuses show row-specific errors and block unsafe conversion |
| CIMP-05 | Ambiguous aliases, unsupported populated columns, ambiguous percent/date values require review; no silent data loss |
| CIMP-06 | Blank rows excluded transparently; every actual item mapped exactly once; source bytes unchanged |
| CIMP-07 | New target passes managed parser, guarded writer/readback and readonly display; native managed workbook preserves preexisting history |
| CIMP-08 | Cancellation, permission denial, existing target or readback failure leave source and prior session unchanged |
| CIMP-09 | No fabricated past edits or automatic RAG; migration-time B2 audit complete under approved schema |
| CIMP-10 | Downloaded fallback can be opened normally; Recent Projects only after verified successful open |

## Delivery and authority

Stage C2 includes three routes: scratch/blank (including starter download), guided migration and predefined templates. C1 creator remains a shared dependency; input mapping/preview validation can be prepared in parallel without workbook writes. Scope direction is owner-endorsed; exact field mapping and persistence contract are proposed, not frozen. No writer/schema mutation, beta, deployment or production release authorized. Keep QA targeted; do not replay accepted Stage A/B UAT.
