# EMV-PROJECT-DATA-0.1.2 — Stage A evidence-to-acceptance gap register

**Prepared:** 2026-11-13 JST · **Source of scenarios:** [the 61-case acceptance plan](EMV_PROJECT_DATA_0_1_ACCEPTANCE_PLAN.md).  
**Status:** AI-assisted **traceability reconnaissance**, **not** a formal test execution record, independent organizational QA, a frozen field-level contract, owner UAT, feature integration decision, or release acceptance.

## How to interpret this register

This register keeps the original **61 planned acceptance cases** intact and adds *evidence pointers only*. The original acceptance plan's “no test execution yet” line refers to the plan's creation and should not be used to erase subsequent technical work; equally, **none of the 61 cases is hereby marked final acceptance PASS**. The classifications below are editorial *evidence proximity*, not verdicts:

- **D — direct synthetic evidence:** exact branch-scoped tests or code-referenced QA reports explicitly cover a substantial core of the scenario; real file and owner acceptance may remain.
- **I — indirect/partial synthetic evidence:** related pieces covered, but a material end-to-end, multi-view, or data/UX dimension is not proven.
- **G — gated/unavailable:** requires separately approved business policy, actual corporate environment, owner visual decision or a not-yet-implemented integrated feature. Prior CI cannot make it PASS.

**Count (non-acceptance labels):** 61 planned cases: **26 D**, **22 I**, **13 G**. **Final product/owner acceptance count: 0 adjudicated by this audit.**

## Evidence provenance and frozen boundaries

- Latest isolated [draft PR #58](https://github.com/Kenny619/spl-wbs/pull/58), exact head `26ce2caea188a2108e31143d477fb94cdf6f7789`: [Actions #43386556628](https://github.com/Kenny619/spl-wbs/actions/runs/43386556628) completed SUCCESS, **304/304 unit (39 files), 80/80 Windows Chromium**, both builds and bounded UUID screen PASS; imported ProjectName formula-like prefixes rejected. [PR verification comment](https://github.com/Kenny619/spl-wbs/pull/58#issuecomment-6847070239).
- Earlier [F6e draft PR #57](https://github.com/Kenny619/spl-wbs/pull/57), exact `b29d0c5d76dcbc61715722b51f0751fe35fbebf9`: [run #43385565830](https://github.com/Kenny619/spl-wbs/actions/runs/43385565830) **297 unit / 80 browser PASS**, control-character inspector hardening. ExcelJS strips DEL in synthetic serialization; do not claim a raw malicious OOXML import proof.
- Earlier [F6d draft PR #56](https://github.com/Kenny619/spl-wbs/pull/56), exact `54434e6f7ced6284ca10d0bb11c1de8da998736e`: [run #43381352622](https://github.com/Kenny619/spl-wbs/actions/runs/43381352622) **292 unit / 80 browser PASS**, adversarial audit-pointer/provenance tests.
- Earlier F1–F6c branch-specific records linked in the evidence-key section below. **Do not substitute a later stacked-head overall green run for distinct physical or scenario-specific test coverage**. Hosted runner CI uses Node 22 in the ordinary workflow; separately verified Node26/npm11 toolchain [draft PR #33](https://github.com/Kenny619/spl-wbs/pull/33) does not establish actual corporate Excel/Edge/OneDrive safety.
- Protected: original v18 read-only viewer, frozen Issue #3 `ProjectWBS`/`UpdateHistory`, owner-approved five additive workbook-sheet **shape** (not detailed headers), single inclusive blackout, owner-approved DES-012 Review08 and Report Review02. No owner approval to merge drafts, freeze detailed schema, authenticate local actor names, calculate Green or issue a real-corporate UAT/release.

## Scenario-level mapping

### A. Workbook schema and compatibility

| Planned ID | Evidence class | Technical pointer | Remaining distinction |
|---|---|---|---|
| **PWB-01** | I | F2, F5a | Legacy inspector + conservative Watch projection; full UI composite not certified |
| **PWB-02** | I | F1, F3a | History/custom-field preservation evidence; combined reordered-history scenario not independently closed |
| **PWB-03** | D | F3c, F4c | Explicit first project Save / five sheets / header-only task history in synthetic directory |
| **PWB-04** | D | F3c, F4c | No-op and cancel path evidence; physical browser file still not tested |
| **PWB-05** | D | F1, F3b, F6a | Header maps and unrelated column/sheet retention via synthetic XLSX |
| **PWB-06** | D | F2, F2QA, F6f | Negative workbook validators; F6e/f ProjectName parity on later exact-head CI |
| **PWB-07** | D | F3a | Partial and unsupported-future extension rejected before write |
| **PWB-08** | D | F1, F6a | Bounded unsupported XML/OOXML fail-closed checks; no exhaustive Excel fidelity proof |
| **PWB-09** | I | F3a, F6a | Save As/copy fidelity components exercised; full end-user copied-project flow not signed off |
| **PWB-10** | G | — | Future Create New Project authoring flow separately gated |
| **PWB-11** | I | F2, F4a | Legacy vs partial inspector states; composite Days Remaining/UI qualification pending |


### B. Shared Calendar and preferences

| Planned ID | Evidence class | Technical pointer | Remaining distinction |
|---|---|---|---|
| **CAL-01** | D | F4c, F4d | Synthetic Calendar Save/verified reload and managed schedule impact |
| **CAL-02** | D | F3c, F4c | Disable/change date creates audit and persists in synthetic workbook |
| **CAL-03** | D | F2, F3b | One active interval enforced in draft reader/writer |
| **CAL-04** | G | — | Two real Edge profiles and same authoritative corporate workbook require physical test |
| **CAL-05** | I | F4a/F4b | Project metadata separated from local prefs; reset-versus-XLSX checksum proof incomplete |
| **CAL-06** | D | F4d | Workbook-committed blackout wired into managed remaining-days calculations |
| **CAL-07** | I | F4c | Synthetic read-only/blocked permission flows; physical permission behavior untested |
| **CAL-08** | I | F2, F3b | Date-only validation covered; calendar UI crossing year/leap-day matrix not fully evidenced |
| **CAL-09** | D | F4d | Deduplicated blackout/weekend/holiday calendar exclusion synthetic checks |
| **CAL-10** | D | F4d | After-today through finish-inclusive boundary synthetic cases |
| **CAL-11** | I | F4c, F4d | Committed-vs-draft and reload flows; cross-member freshness not yet physically proved |
| **CAL-12** | I | F4d | Unsupported/unknown fallback in date model, broader missing holiday coverage not certified |


### C. Under Watch and commitments

| Planned ID | Evidence class | Technical pointer | Remaining distinction |
|---|---|---|---|
| **WATCH-01** | D | F5c, F5d | Manual reason Add, guarded Save, Task Detail audited readback |
| **WATCH-02** | G | — | Automatic rule registry and its persistence semantics not approved |
| **WATCH-03** | D | F5c, F6a | Independent manual reasons and selective Resolve in synthetic workbook |
| **WATCH-04** | G | — | Green/Clear requires separately approved complete/current automatic checks |
| **WATCH-05** | I | F5a | Unknown when check completeness unproved; actual stale-rule inputs not implemented |
| **WATCH-06** | D | F6c | No row = Unconfirmed; recorded date is not implicit approval |
| **WATCH-07** | G | F6c (read only) | Commitment history reader exists; acceptance authority/action writer not approved |
| **WATCH-08** | I | F6a, F6c | Task Save/history and conservative commitment read separately tested; integrated actor acceptance not |
| **WATCH-09** | D | F2, F6b, F6c, F6d | Invalid IDs/tasks, timestamps, forks and audit pointers rejected before write |
| **WATCH-10** | I | F5a, F5d | Watch state independent of TaskStatus; full progress/type display matrix not signed off |
| **WATCH-11** | D | F5c, F6d | UnverifiedLocal recorded; never represented as authenticated authority |
| **WATCH-12** | D | F2, F6d | Missing/mismatched task references fail closed |


### D. Transaction and concurrency

| Planned ID | Evidence class | Technical pointer | Remaining distinction |
|---|---|---|---|
| **SAVE-01** | I | F6a | Task+Watch audit coexistence exercised; full Task+Watch+Calendar single logical Save not covered |
| **SAVE-02** | D | F3c | Project-only first Save creates header-only UpdateHistory without false task event |
| **SAVE-03** | D | F3c, F6a | Stale source hash detects sequential external change in synthetic file adapter |
| **SAVE-04** | G | — | Real Excel-open file lock and corporate Edge permissions cannot be proved in CI |
| **SAVE-05** | D | F6a | Staged source/serialization failure paths fail closed in simulated directory |
| **SAVE-06** | D | F6a | Source/backup interruption classification and no-blind-retry policy simulated |
| **SAVE-07** | D | F6a | Unknown backup/owner/recovery preserved; refuse overwritten unknown records |
| **SAVE-08** | I | F6a | Two synthetic stale editors; shared provider local-copy races still unsupported |
| **SAVE-09** | G | — | Two people sequentially editing one actual canonical file need physical UAT |
| **SAVE-10** | I | F3a | Save As provenance is a copy; no live provider divergence/reconciliation proof |
| **SAVE-11** | D | F3d, F6a | Duplicate transaction ID and uncertain Save retry protected in synthetic model |
| **SAVE-12** | I | F3b, F4a | Local preference separation by architecture; full project-checksum matrix not evidenced |


### E. Product/UI and release

| Planned ID | Evidence class | Technical pointer | Remaining distinction |
|---|---|---|---|
| **UI-01** | I | F4c, F5b | Separate Calendar Save/Cancel and unsaved-close guard; owner UX visual review outstanding |
| **UI-02** | G | — | True Watch-integrated Meeting Review not implemented; status-only substitute prohibited |
| **UI-03** | G | — | DES-012 Review08 and Report Review02 exact-width light/dark owner parity not signed off |
| **UI-04** | D | F5e | Unsaved Watch draft navigation, folder preview, reload guarded in Chromium |
| **UI-05** | I | F6f CI | 80/80 hosted Chromium baseline regression; not exhaustive production UI parity |
| **UI-06** | I | F4a/F4b | Shared ProjectName bindings in app/Calendar/title; Meeting Review integration absent |
| **UI-07** | I | F6e, F6f | Control/formula-like import rejection + valid punctuation; full DOM adversarial matrix pending |
| **REL-01** | G | — | Real Windows 11 Edge file:// + Excel-open locking/provider/fidelity owner UAT |
| **REL-02** | G | — | Integration, pinned official owner UAT package and acceptance not authorized |


### F. Project identity and Reports

| Planned ID | Evidence class | Technical pointer | Remaining distinction |
|---|---|---|---|
| **META-01** | D | F3c, F4c | Initialization requires supplied name; no filename-derived implicit commit |
| **META-02** | G | — | Two real Edge profiles identical project identity with independent local settings |
| **META-03** | I | F3c | Rename audit + Save As identity subfeatures, full combined end-user flow pending |
| **META-04** | I | F4a/F4b | Unconfigured project state versus local Report name; no full Report 1.1 integration |
| **META-05** | G | — | Separate frozen Issue #7 name-source amendment required |

## Evidence keys (exact scoped technical records; not owner acceptance)

- **F1:** [EMV_PROJECT_DATA_F1_SYNTHETIC_FEASIBILITY_EVIDENCE.md](./EMV_PROJECT_DATA_F1_SYNTHETIC_FEASIBILITY_EVIDENCE.md)
- **F2:** [EMV_PROJECT_DATA_F2_INSPECTOR_FEASIBILITY_EVIDENCE.md](./EMV_PROJECT_DATA_F2_INSPECTOR_FEASIBILITY_EVIDENCE.md)
- **F2QA:** [EMV_PROJECT_DATA_F2_ADVERSARIAL_QA_CROSS_SHEET.md](./EMV_PROJECT_DATA_F2_ADVERSARIAL_QA_CROSS_SHEET.md)
- **F3a:** [EMV_PROJECT_DATA_F3A_WRITE_GATE_EVIDENCE.md](./EMV_PROJECT_DATA_F3A_WRITE_GATE_EVIDENCE.md)
- **F3b:** [EMV_PROJECT_DATA_F3B_IN_MEMORY_CANDIDATE_EVIDENCE.md](./EMV_PROJECT_DATA_F3B_IN_MEMORY_CANDIDATE_EVIDENCE.md)
- **F3c:** [EMV_PROJECT_DATA_F3C_VERIFIED_SAVE_SPIKE_EVIDENCE.md](./EMV_PROJECT_DATA_F3C_VERIFIED_SAVE_SPIKE_EVIDENCE.md)
- **F3d:** [EMV_PROJECT_DATA_F3D_CHANGESET_ID_QA.md](./EMV_PROJECT_DATA_F3D_CHANGESET_ID_QA.md)
- **F4a/F4b:** [EMV_PROJECT_DATA_F4A_F4B_CONTEXT_UI_EVIDENCE.md](./EMV_PROJECT_DATA_F4A_F4B_CONTEXT_UI_EVIDENCE.md)
- **F4a:** [EMV_PROJECT_DATA_F4A_F4B_CONTEXT_UI_EVIDENCE.md](./EMV_PROJECT_DATA_F4A_F4B_CONTEXT_UI_EVIDENCE.md)
- **F4b:** [EMV_PROJECT_DATA_F4A_F4B_CONTEXT_UI_EVIDENCE.md](./EMV_PROJECT_DATA_F4A_F4B_CONTEXT_UI_EVIDENCE.md)
- **F4c:** [EMV_PROJECT_DATA_F4C_CALENDAR_SAVE_UI_EVIDENCE.md](./EMV_PROJECT_DATA_F4C_CALENDAR_SAVE_UI_EVIDENCE.md)
- **F4d:** [EMV_PROJECT_DATA_F4D_SCHEDULE_BLACKOUT_EVIDENCE.md](./EMV_PROJECT_DATA_F4D_SCHEDULE_BLACKOUT_EVIDENCE.md)
- **F5a:** [EMV_PROJECT_DATA_F5A_WATCH_READ_PROJECTION_EVIDENCE.md](./EMV_PROJECT_DATA_F5A_WATCH_READ_PROJECTION_EVIDENCE.md)
- **F5b:** [EMV_PROJECT_DATA_F5B_CALENDAR_DIRTY_CLOSE_GUARD.md](./EMV_PROJECT_DATA_F5B_CALENDAR_DIRTY_CLOSE_GUARD.md)
- **F5c:** [EMV_PROJECT_DATA_F5C_MANUAL_WATCH_CANDIDATE_EVIDENCE.md](./EMV_PROJECT_DATA_F5C_MANUAL_WATCH_CANDIDATE_EVIDENCE.md)
- **F5d:** [EMV_PROJECT_DATA_F5D_WATCH_TASK_DETAIL_EVIDENCE.md](./EMV_PROJECT_DATA_F5D_WATCH_TASK_DETAIL_EVIDENCE.md)
- **F5e:** [EMV_PROJECT_DATA_F5E_WATCH_NAVIGATION_QA.md](./EMV_PROJECT_DATA_F5E_WATCH_NAVIGATION_QA.md)
- **F6a:** [EMV_PROJECT_DATA_F6A_TRANSACTION_FAULT_QA.md](./EMV_PROJECT_DATA_F6A_TRANSACTION_FAULT_QA.md)
- **F6b:** [EMV_PROJECT_DATA_F6B_WATCH_CHRONOLOGY_QA.md](./EMV_PROJECT_DATA_F6B_WATCH_CHRONOLOGY_QA.md)
- **F6c:** [EMV_PROJECT_DATA_F6C_COMMITMENT_HISTORY_QA.md](./EMV_PROJECT_DATA_F6C_COMMITMENT_HISTORY_QA.md)

## Dependency-aware next gates

1. **Owner policy gate:** one detailed field/audit/actor `UnverifiedLocal` decision already requested at [Issue #3, comment #6845478113](https://github.com/Kenny619/spl-wbs/issues/3#issuecomment-6845478113). Do not reopen SCH-01, CAL-02 or SEQ-01, and do not mistake generic “continue” for field freeze. The proposed human/machine version remains `0.1.2`.
2. **Safety gate:** resolve bounded independent whole-stack technical QA concerns and inspect real corporate Edge/Node26/Excel-open/OneDrive or SharePoint provider behavior with **disposable** files. In particular G-class SAVE-04, SAVE-09, CAL-04, META-02 and REL-01 cannot be closed from synthetic adapters; local hash checks are **not distributed CAS**. Preserve actual workbook-provider/locking details when eventually tested.
3. **Product policy gate:** automatic rule registry and reliable Green completeness (WATCH-02/04/05), acceptance authority for revised commitment (WATCH-07), final genuine Watch-backed Meeting Review (UI-02), Report 1.1 shared-name source decision under frozen #7 (META-05).
4. **UX/owner verification gate:** DES-012 Review08 at relevant width/light/dark combinations and Report Review02 visual parity, with actual workbook-backed data; no status-only Review placeholder.
5. **Integration/acceptance gate:** consolidate reviewed draft branches in order only on owner authorization, then pin SHA and prepare a separate authorized UAT package. Do not write real production XLSX, promote a draft as UAT/release or change beta timing.

**Review note:** Scenario rows marked D or I are *evidence cross-references*, not proof that every clause in their expected result was executed. A formal 61-row acceptance register needs scenario-specific evidence links, fixture checksums, owner/human-equivalent reviewer disposition, corporate Edge/version information where applicable, and exact final integrated SHA. Keep the original 61-case plan unchanged.
