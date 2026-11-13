# SPT-WBS — Delivery baseline and outstanding gates (13 Nov 2026)

**Classification:** DMO current-state planning review, **NOT** a new approved schedule, scope freeze, target date, release or merge authority.

## 1. Controlling roadmap vs actual

Source of approved sequencing: [Excel Managed product epic #1](https://github.com/Kenny619/spl-wbs/issues/1), approved 2026-11-06. The approved roadmap **does not contain committed stage finish dates, workstream durations, or a beta calendar date**. Consequently no measured day-level lateness / critical-path finish forecast can be asserted. The beta gate remains **after accepted A+B+C, before D/E**, and still requires a separate owner go/no-go.

| Stage / milestone | Approved original scope | Status as of 2026-11-13 JST | Key unclosed gate |
|---|---|---|---|
| **A — Excel Managed v1 reliability** | Frozen #3–#7 editing/history/settings/Report 1.1; #2/#11 save/backup/fidelity, #8 CI+independent QA, #14 security review; narrow five-recent-project shortcut #21 | **IN PROGRESS / NOT OWNER ACCEPTED.** Strong draft implementation and CI, no production main merge or Stage A release | Report 1.1 corporate Edge/Outlook UAT + approved visual parity; physical Excel/Edge save-lock/recovery and restricted OOXML subset; independent release QA; moderate security disposition; #21 file:// handle persistence test and reviewed shortcut contract/implementation; exact-SHA owner acceptance |
| **B — v1.1 daily usability** | #17 actionable header/attention; #21 broader recent-projects UX; #16 PGCM display toggle; optional blank starter | **PLANNED, NOT STAGE-ACCEPTED.** Some concepts/visual direction exist in design drafts, but those do not complete the B feature contracts or integrated acceptance | Requirement/UX freeze, actual implementation, independent QA, owner acceptance |
| **C — v1.2 authoring** | #23 create task/entity with immutable ID/history, then #24 create-project workflow and templates | **PLANNED, NOT IMPLEMENTED/ACCEPTED.** Issues open, distinct creation contracts not frozen | Authoring specification, safety and identity, workbook creation/templating, implementation, QA, owner UAT |
| **BETA entry** | Controlled beta after fully accepted A+B+C | **NOT READY / NO APPROVED START DATE.** Owner go/no-go still required | Supported corporate workbook/Edge environment, pinned tested build, all required features and UAT, Quick Start, backup/rollback, current links in README, no unresolved critical loss/security risk |
| **D / E** | Later configuration/multiple blackouts; graphical hierarchy/dependency editing | **BACKLOG**; not original beta prerequisites | Separate future specification and implementation/acceptance |

**Exact technology evidence is not a release-state proxy.** [F7 draft PR #59](https://github.com/Kenny619/spl-wbs/pull/59) at `9089f964f55f4047f05dd2ddff21e9f4a0143cd0` has [Actions #43387994481](https://github.com/Kenny619/spl-wbs/actions/runs/43387994481) **305/305 unit and 80/80 hosted Windows Chromium PASS** for one synthetic sequential Calendar→Watch→task→Calendar→Watch file trajectory. It is **draft and unmerged**. [61-case evidence trace](../verification/EMV_PROJECT_DATA_STAGE_A_ACCEPTANCE_TRACE_2026_11_13.md): 26 direct, 22 indirect, 13 gated **synthetic evidence proximity** labels, not formal accepted case counts. Do not treat F7 or those labels as Stage A or broader product acceptance.

## 2. New shared Calendar + Under Watch + Meeting Review delivery track — stage placement OPEN

[Owner's 2026-11-12 SCH-01/CAL-02/SEQ-01 disposition](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md) approved **one Excel-owned project source**, five additive project worksheets as an organization, initially **one active inclusive blackout**, blackout-aware Days Remaining, reason-backed Watch, and a **genuine Watch-enabled Meeting Review delivered together with project Calendar**. Personal preference and recent-workbook history stay local.

[Issue #1 roadmap reconciliation](https://github.com/Kenny619/spl-wbs/issues/1#issuecomment-6812899715) explicitly states **the package was NOT assigned to A/B/C, and the beta-after-C timing was NOT silently changed**. The original Stage D's multiple-blackout expansion is still later scope; the newly approved single workbook-backed blackout plus Watch/Meeting package is a distinct integrated track whose **release placement requires a Product Owner scheduling choice**.

**Implementation status (draft, not production):**
- F1–F6f: workbook inspector, conservative project metadata/calendar, Watch manual reasons, project audit and recorded-only commitment lineage; F7 cross-domain sequential smoke passed synthetic CI.
- **Not complete:** field-level [v0.1.2 five-sheet schema and UnverifiedLocal actor disposition](https://github.com/Kenny619/spl-wbs/issues/3#issuecomment-6845478113), actual authenticated acceptance authority, approved automatic risk rule registry/completeness/Green, and **genuine Watch-enabled Meeting Review**; no status-only substitute.
- **Not supported as planned:** atomic mixed Task+Watch+Calendar in **one** logical Save (SAVE-01); F7 shows safe *sequential* commits only. `src/managed/main.ts` intentionally blocks project Save while task draft is dirty, with distinct task/project Save paths.
- **Separate frozen contract:** Report 1.1 output local-name source [Issue #7](https://github.com/Kenny619/spl-wbs/issues/7#issuecomment-6812719287) needs explicit narrow amendment before switching generated report project headers to Excel-owned ProjectName.

**Schedule options requiring one owner decision, not invented authority:**
- **Original beta path unchanged:** finish A, B, C and beta; schedule Calendar+Watch+Meeting as a separate accepted package outside the formal beta entry baseline, unless the owner explicitly changes the entry criteria.
- **Pre-beta inclusion:** develop integrated Calendar+Watch+Meeting alongside B/C but add its full field/Watch/meeting/physical QA and owner acceptance to beta's critical path. This increases scope and likely calendar risk but tests the new common project-data workflow in initial beta.

**DMO recommendation:** Do **not** silently expand Stage A or mark Stage C/beta gate changed. Continue already-authorized draft technical QA and the A critical safety/Report/recent-project validation; prepare integrated package in parallel as feasible. Record an explicit **pre-beta vs independently staged** Product Owner decision before setting dates, packaging/merging new schema, or declaring the new package a beta prerequisite.

## 3. Remaining gates, owners and true dependencies

| Gate | Current factual state | Required next evidence or decision | Owner |
|---|---|---|---|
| A1 Report 1.1 | Draft PR #37 Review02 UI and tests, no completed owner UAT/merge | Actual corporate Edge/Outlook HTML preview-copy-paste and agreed layout comparison, exact current SHA | QA + Product Owner UAT |
| A2 file safety | Simulated staged Save, predecessor backup and stale-source/refusal test extensive; basic physical Edge + Excel reopen historical only | Disposable same-file Excel-open locks, two sequential editors and reload, source conflict, interrupted Save recovery, restricted feature fidelity | Corporate Edge/Excel user + QA |
| A3 security | #14 retains two linked moderate ExcelJS/uuid advisory findings, no waiver; CI UUID screen bounded | Current-head reachability/risk assessment and explicitly disposition remaining release risk | Technical/security QA; PO only for residual waiver |
| A4 recent project | #21 five-MRU acceptance proposal and standalone Edge file:// IndexedDB probe prepared; not frozen/tested physically | Corporate Edge handle persistence/repermission evidence; narrow detailed requirement and testable implementation | QA / Product Owner if tradeoff |
| A5 final Stage A integration | Original PR #19, Reports PR #37 and stacked draft branches unmerged into main | One pinned authorized release candidate, QA and visual parity, no unresolved safety issue, owner acceptance | DMO + independent QA + PO merge |
| B/C delivery | #17/#16/#21 refinement and #23/#24 are future roadmap tasks | Freeze functional requirements, implement, test, UAT in stage order | Product + DEV/QA |
| Shared-project schema | Five sheet **shape** approved; detailed v0.1.2 still PROPOSED | One already-open [Issue #3 detailed field/audit/actor decision](https://github.com/Kenny619/spl-wbs/issues/3#issuecomment-6845478113); after approval synchronize machine/human contract, no implicit release | Product Owner |
| Watch + Meeting | Manual Watch draft exists; no approved complete auto risk/commitment authority; no actual integrated Meeting Review | Rule and commitment business decisions, reason-backed Meeting Review with approved Review08 UX, full QA | Product Owner for policy; DEV/QA for integration |
| Shared-file collaboration | Single local SHA protects detected changes, **not distributed CAS** | Actual canonical provider and sequential file-lock/reopen tests; otherwise explicitly restrict to single-writer | Corporate UAT + QA |
| Report name reconciliation | Frozen Report 1.1 local output preference distinct from shared Excel ProjectName | Narrow Issue #7 output contract amendment before any behavior change | Product Owner |
| Schedule baseline | Stage placement for integrated package unresolved; no committed dates | One explicit owner pre-beta/in-parallel vs independent-stage disposition, then rebaseline with staffing/QA capacities | Product Owner + DMO |

## 4. Schedule confidence and immediate DMO next actions

- **Stage A:** strong code/CI progress, **gate incomplete**; no factual “X days late” because no calendar target is approved.
- **B and C:** not certified delivered. These remain necessary before beta regardless of progress in Calendar/Watch spikes.
- **Beta:** **not scheduleable to a defensible calendar date** until Stage A acceptance risk, Stage B/C feature scope estimates and the integrated package's stage position are decided. Treat any date without that input as a scenario, not an approved commitment.
- **Near-term critical path:** A2 corporate file safety → A1 Report/UX UAT → A3 residual security and A4 five-MRU feasibility → A5 pinned integration/acceptance. In parallel prepare Stage B/C requirement decisions and keep integrated Watch/Meeting design from being replaced by a status-only shortcut.
- **No routine owner check-in:** Continue GitHub tracking. Escalate only the **two real business choices**: detailed v0.1.2 contract and integrated Calendar+Watch+Meeting pre-beta placement, plus later specific report-name/automatic-rule/acceptance decisions when implementation reaches them.

**Restrictions:** No approval implied by “continue” or this planning memo. No main merge, release, production workbook edits, schema freeze, security waiver, new UAT ZIP/README download, stage-date invention, or closed beta gate.
