# EMV-PROJECT-DATA-0.1.2 — verification matrix (APPROVED SCOPE / DETAILED CONTRACT DRAFT; no test execution yet)

**Prepared:** 2026-11-12 JST · **Status:** Owner approved SCH-01/CAL-02/SEQ-01 scope. The **61 cases** remain *planned*, not run. **No PASS claims.**  
**Human proposed schema:** [EMV_PROJECT_DATA_0_1_PROPOSED.md](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md)  
**Machine proposal:** [EMV_PROJECT_DATA_0_1_PROPOSED.json](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.json)  
**Owner ownership:** [DEC-DATA-2026-11-12](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md) and [Issue #25 latest requirements](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6812583483)  
**Test gate baseline:** existing #2/#11, #3–#6, original read-only v18, accepted Review 08. No source/workbook mutation in this design branch.

**Owner scope decision:** [DEC-EMV-PROJECT-DATA-SCOPE-2026-11-12](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md); 5-sheet structure and one active blackout interval confirmed; Calendar + Watch + Meeting are coupled. **Full field contract, implementation and test execution remain unapproved.**

## Test principles

- Synthetic/workbook fixtures only, never real corporate data.
- Automate validation and file roundtrips where feasible; **actual two-user Edge/Windows and Excel-open/remote-file tests are not replaceable by a single-browser CI simulation**.
- Every evidence record needs exact source PR SHA, package SHA, test workbook checksums, Windows/Edge versions, success/failure and screenshots on design/UX checks.
- Distinguish **expected intentional rejection PASS** from actual successful project-data write. No tests may call a simulated UI Save “persisted”.
- Preserve all existing test results; do not replace older exact-SHA owner outcomes with a newer build's inferred state.

## A. Workbook schema and compatibility

| ID | Scenario | Expected result |
|---|---|---|
| **PWB-01** | Open legacy `ProjectWBS`, no extension sheets or history | WBS loads without mutation; Watch **Unknown / no evidence**, Calendar **not configured**, **Project name not configured**; filename is separately labeled; no invisible migration |
| **PWB-02** | Open legacy workbook with compatible, reordered `UpdateHistory` and custom columns | History intact; same historical TaskIDs, WBS/title snapshots, UTC timestamps and added compatible custom columns |
| **PWB-03** | First *explicit, confirmed* blackout Save from legacy file, with a supplied required ProjectName | Creates entire compatible extension including `ProjectID` and `ProjectName`; if `UpdateHistory` absent, creates required header-only sheet; writes blackout + `ProjectAudit`; readback confirms name and calendar |
| **PWB-04** | No-op Save / Cancel / discard extension draft | No workbook bytes altered, no extension sheet creation, no History or Audit row |
| **PWB-05** | Existing extension with shuffled required column order and compatible extra columns | Read/write by header names; preserve original extra values and other sheets as far as fidelity preflight allows |
| **PWB-06** | Duplicate/blank header, duplicate UUID, invalid date/Boolean, malformed audit value | Write **blocked** with affected sheet/row/column; draft retained, source preserved |
| **PWB-07** | Recognized extension sheet only partially present, wrong version or newer unsupported version | Block direct Save and Save As; no auto repair or silent downgrade; safe read-only diagnostics |
| **PWB-08** | Existing unsupported macros/formulas/drawings/relationships/unknown OOXML feature | Existing fail-closed XLSX preflight behavior retained; no bypass in “new sheet support” |
| **PWB-09** | Open all sheets, Save As to an unused filename | Full project metadata/Watch/Calendar/Commitments/Audit copied with stable IDs; clearly a separate file, not live-synchronized |
| **PWB-10** | “Create New Project” later from a template | Fresh `ProjectID` only through separately approved authoring flow; not silently reused across genuinely new projects |
| **PWB-11** | Legacy workbook with no extension versus malformed partial `ProjectCalendar` extension | Legacy remains readable with supported weekend/holiday Days Remaining and **“Project blackout not configured”** qualifier; malformed partial extension rejects writes and cannot masquerade as empty blackout |

## B. Shared Calendar and personal preferences

| ID | Scenario | Expected result |
|---|---|---|
| **CAL-01** | Set one inclusive blackout start/end in Settings and Save | Persistent workbook range, correct event/audit, same Gantt/PGCM impact after reopen |
| **CAL-02** | Disable existing blackout, re-enable or change dates | Explicit verified Save, audit old/new, retained disabled row provenance, no stale overwrite |
| **CAL-03** | Second simultaneous enabled range under initial one-range UI contract | Rejected with clear validation (or explicitly approved future multi-range version); no silent last-wins |
| **CAL-04** | Calendar values on two Edge profiles opening **same committed workbook** | Same blackout facts and dates in both; Light/Dark/visible columns/PGCM display and MRU differ independently |
| **CAL-05** | User A uses local preference Reset | Resets only local view preferences; no Excel bytes, Watch, blacklist/blackout, task or audit changed |
| **CAL-06** | Working-day remaining with committed blackout covering an otherwise eligible weekday | **Owner-required change:** excluded blackout date reduces remaining days by one, consistently in Gantt and Task Detail; Gantt/PGCM shading remains correct |
| **CAL-07** | Workbook read-only/no file write permission | Can inspect project blackout, cannot claim new blackout Save; no browser-only fake project persistence |
| **CAL-08** | Valid/invalid crossing of year and leap-day/end-before-start interval | Date-only ISO and inclusive interval checks; malformed dates rejected; timezone does not change stored dates |
| **CAL-09** | Blackout falls on Saturday/Sunday, Japanese holiday or both, including overlapping endpoints | **Exclude each calendar date once**, never subtract twice; no change to the count if date was already a nonworking day |
| **CAL-10** | Planned Finish at blackout boundary; Today inside blackout; blackout before Today | Preserve strictly-after-Today / finish-inclusive counting; excluded finish contributes zero; past dates do not reduce future count |
| **CAL-11** | Saved blackout vs unsaved changed Settings draft; reload after another member's new blackout | Count reflects **last verified committed project calendar**; unsaved proposal not shown as saved. Reload recalculates all dependent Days Remaining consistently |
| **CAL-12** | Missing holiday coverage or malformed/incompatible project calendar metadata within target period | Unknown/error where a correct count cannot be established; no fabricated numeric result or falsely cleared Watch state |

## C. Under Watch, reasons, accepted commitment

| ID | Scenario | Expected result |
|---|---|---|
| **WATCH-01** | Add manual contextual reason to task ID and Save | Stable ReasonID and TaskID; project audit; reopen shows same reason and **Watch** |
| **WATCH-02** | Add independent automatic reason where a **separately approved** rule is defined | Correct RuleCode, evidence provenance, persisted reason via explicit safe Save; no speculative auto write |
| **WATCH-03** | Two reasons on one task, resolve only one | Other remains active; task remains watched; one reason's resolution does not mutate other reason's record |
| **WATCH-04** | Resolve final reason with known/current automatic-check evidence | Clear only if all current checks complete and other reasons absent; original episodes and audit retained |
| **WATCH-05** | Missing/unloaded/outdated rule inputs, holiday coverage or metadata | **Unknown**, never inferred Green; previous Watch not silently cleared |
| **WATCH-06** | New/legacy project has no accepted commitment | Explicit “commitment not confirmed”; editing PlannedEnd does not implicitly approve a baseline |
| **WATCH-07** | Accept a revised reference finish date | Immutable new `ProjectCommitments` row with predecessor link, actor label, rationale, proper UTC, separate audit; old reference preserved |
| **WATCH-08** | Save task PlannedEnd without accepting a revised commitment | Real task history updated; old accepted commitment remains; no risk reason silently cleared |
| **WATCH-09** | Wrong TaskID, nonapproved rule, duplicate ReasonID/CommitmentID, inconsistent resolved fields, invalid predecessor link | Fail-closed, field-/row-specific diagnostics |
| **WATCH-10** | Display/task type/status/progress changes | Status and Progress remain independent; Watch not conflated with TaskStatus=At Risk/Blocked |
| **WATCH-11** | User-entered actor name | Logged as **UnverifiedLocal**, not claimed as corporate authenticated identity or signed approval |
| **WATCH-12** | Missing task after workbook structural edit | Cannot silently orphan/drop Watch; fail safely or show explicit unresolved reference diagnostic per approved reconciliation rule |

## D. Transaction safety, concurrency and audit

| ID | Scenario | Expected result |
|---|---|---|
| **SAVE-01** | Mixed task + Watch + Calendar change in one logical Save | Atomic candidate, one `ChangeSetID`/`TimestampUTC`; genuine task changes only in `UpdateHistory`, project events only in `ProjectAudit`; both readback validated |
| **SAVE-02** | Project-only Save | ProjectAudit populated; `UpdateHistory` header-only initialized if absent, **no fake TaskID/history row** |
| **SAVE-03** | External Excel edit after app import before Save | Reject stale-source Save; pending draft protected; no blind overwrite |
| **SAVE-04** | Another app holds an Excel lock or user loses Edge folder permission | Accurate refusal/error; no claimed Save or silent temporary copy |
| **SAVE-05** | Exception while serializing candidate or before source mutation | No source write; draft/old audit preserved |
| **SAVE-06** | Interruption after source write but before backup/owner verification | Recovery hold; verified source+staged predecessor bytes; no duplicate audit on retry; no false success |
| **SAVE-07** | Existing backup ownership mismatch or corrupt recovery files | Fail-closed and preserve files for inspection; do not overwrite unknown backup |
| **SAVE-08** | Two users A and B load same version; A saves Watch, B saves calendar from older snapshot | B is blocked on detectable changed canonical file. If using a sync provider where old local copies cannot be checked atomically, **multiwriter editing remains unsupported** and cannot be claimed safe |
| **SAVE-09** | Two users sequentially edit *same actual file*, reloading between writes | B sees A's Watch and audit, B's blackout Save succeeds, A sees both after refresh/reopen |
| **SAVE-10** | Two independent copies with same ProjectID diverge | Explicitly distinct file versions; do not imply automatic reconciliation/synchronization |
| **SAVE-11** | Identical retry after uncertain Save | Recover/verify previous transaction before retry; no duplicate EventID/ChangeSetID or history rows |
| **SAVE-12** | Shared project Save with local user preference state | Workbook checksum change limited to project data and audit; local theme/columns/PGCM and MRU not accidentally serialized |

## E. Product/UI and release gates

| ID | Scenario | Expected result |
|---|---|---|
| **UI-01** | Settings personal + project Calendar sections | Visual separation and appropriate Save/Cancel; personal Reset cannot erase project Calendar |
| **UI-02** | Meeting Review with Watch reason list, task navigation, linked details | Integrates true workbook-backed Watch from first functional MR release; no status-only interim labeled complete |
| **UI-03** | Review 08 visual parity | Exact approved Gantt/Task Detail timeline/Reports and light/dark screenshots at 860, 1024, 1366, 1440 widths; material Watch content changes get separate owner review |
| **UI-04** | Edit while unsaved draft and switching task/view/workbook | Real Save / Discard / Cancel protection; failed Save retains draft and current focus |
| **UI-05** | Original read-only SharePoint variant | No managed-only Watch/Calendar writes, no visual regression |
| **UI-06** | Shared `ProjectMeta.ProjectName` loaded, changed, and saved | Same name displayed in Schedule/Meeting Review/Reports header and Calendar context, and in browser `document.title`; no filename/local preference override |
| **UI-07** | Project name includes Unicode, ampersand, quotation marks, text resembling HTML or Excel formula, long input | Safe inert text in DOM, no HTML execution, no formula injection, 1–180 char limit, blank/control characters rejected |
| **REL-01** | Windows 11 Edge file:// on synthetic allowed XLSX | Full picker-permissions/backup/readback/reopen/Excel-open and fidelity matrix independently QA verified |
| **REL-02** | Branch integration and UAT packaging | One exact pinned SHA with CI & screenshot parity and documented safety limitations; **no promotion of UAT kit until Owner's reconciliation hold is cleared** |

## F. Shared Project Name and report compatibility

| ID | Scenario | Expected result |
|---|---|---|
| **META-01** | First explicit extension Save from legacy workbook without stored ProjectName | Requires nonblank valid `ProjectName`; does not derive it from local filename or report preference; cancel leaves workbook unchanged |
| **META-02** | Reopen same committed workbook in two Edge profiles with different local themes/columns/PGCM settings | Both display identical `ProjectMeta.ProjectName` in UI, Calendar and browser title; personal view state remains independent |
| **META-03** | Rename project explicitly and Save; inspect `ProjectAudit`, `Save As` copy, and reload | Old/new project name is auditable, updated name appears after verified save, ProjectID unchanged, Save As retains name |
| **META-04** | Legacy workbook lacks metadata but has browser-local Report 1.1 Project name | UI shows “Project name not configured” and source filename separately; no silent promotion of local preference to workbook project data |
| **META-05** | Current frozen Report 1.1 generated output depends on browser-local project-name preference | **Contract compatibility review required** before replacing that source with workbook ProjectName; separate #7 approval/evidence, no silent output change |

## Recording evidence after authorization

Use a machine-readable UAT evidence register with **test ID, exact app SHA, workbook fixture checksum, workbook version, expected and actual values, Windows/Edge build, Result PASS/FAIL/CONCERN/NOT RUN, repro and independent reviewer**. The states above are **planned acceptance criteria**, not historical test results.

**No automated or physical tests were executed as part of authoring this plan.**
