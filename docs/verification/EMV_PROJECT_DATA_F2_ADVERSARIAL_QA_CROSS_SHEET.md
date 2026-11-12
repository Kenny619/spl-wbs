# F2 read-only ProjectData inspector — adversarial QA findings and regression disposition

**Date:** 2026-11-12 JST  
**Scope:** code-based negative-case QA against **draft PR #39**, not independently approved product UAT. This is a Design Office technical review and a test-driven remediation, not a separate organizational QA sign-off.  
**No production Save integration:** the read-only `src/managed/projectDataInspector.ts` is not called by the existing app writer.  
**Underlying decision:** [approved five-sheet organization and single range](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md).  
**Approved visual baseline:** [DES-012 Review 08](../../design/concepts/DES-012-consolidated-review08-task-detail.html).  
**Prior F2 feasibility:** [F2 exact-head report](EMV_PROJECT_DATA_F2_INSPECTOR_FEASIBILITY_EVIDENCE.md).

## 1. Test-driven defect discovery (reproduced red)

**Test-only SHA:** `2aab82b373f7870d7b31771d23250f601548d4bb`  
**Reproduction CI run:** [#43177718648](https://github.com/Kenny619/spl-wbs/actions/runs/43177718648), Ubuntu unit job [#131045907930](https://github.com/Kenny619/spl-wbs/actions/runs/43177718648/job/131045907930), **188 PASS / 3 FAIL among 191**. These are intentionally introduced negative-case assertions; do **not** call this SHA a full CI PASS.

| ID | Synthetic malicious/inconsistent workbook | Observed before remediation | Required outcome |
|---|---|---|---|
| **F2-QA-01** | A valid `WatchReasons.ReasonID` belongs to `TaskID=1`. A `ProjectAudit` row references that same ReasonID but uses existing **`TaskID=2`**. | `inspectProjectData` reported `valid` because both IDs separately existed; test FAIL | `incompatible` and **`AUDIT_TASK_MISMATCH`** |
| **F2-QA-02** | Same mismatch for an existing `ProjectCommitments.CommitmentID` and another real `TaskID=2`. | `valid` despite false task attribution; test FAIL | `incompatible` and **`AUDIT_TASK_MISMATCH`** |
| **F2-QA-03** | `ProjectAudit.EntityType=ProjectMeta`, but `EntityID=InventedProjectField` is not a key of the workbook's `ProjectMeta`. | `valid` despite nonexistent metadata entity; test FAIL | `incompatible` and **`UNKNOWN_AUDIT_ENTITY`** |

**Risk:** A future UI showing project audit as trustworthy could misattribute a risk/commitment to another legitimate task. This is a *data validation* issue in a draft, not a known present production-write exploit; the new project writer/reader is **not deployed**.

## 2. Scoped remediation

**Remediation SHA:** `4887239736821383d3b44186326cad58cee282a8` on [draft PR #39](https://github.com/Kenny619/spl-wbs/pull/39). No change to existing `src/managed/workbookCandidate.ts`, direct Save, Save As, `UpdateHistory`, other application functionality or approved HTML.

- Build a `ReasonID → TaskID` lookup from actual `WatchReasons` rows; reuse the existing `CommitmentID → TaskID` map.
- For audit events `EntityType=WatchReason` or `Commitment`, validate not only whether the audit's TaskID exists in ProjectWBS, but also whether it **matches the specific referenced entity's TaskID**.
- For audit events `EntityType=ProjectMeta`, ensure `EntityID` resolves to a real metadata key.
- Add three focused regression tests, leaving all previous 16 F2 and 10 F1 tests intact.

## 3. Verification at remedied SHA

**Pinned CI:** [GitHub Actions #43177864095](https://github.com/Kenny619/spl-wbs/actions/runs/43177864095), head `4887239736821383d3b44186326cad58cee282a8`.

- **Ubuntu Build + unit PASS:** [job #131046425860](https://github.com/Kenny619/spl-wbs/actions/runs/43177864095/job/131046425860), **191/191 unit tests** in 30 files; **19/19 F2**, **10/10 F1**. Read-only production build and managed variant build PASS; bounded UUID source screen PASS.
- **Windows Chromium regression:** **pending at original evidence checkpoint**; add exact-job confirmation before closing the overall CI result.
- Automated test evidence does **not** establish real browser multiuser file locking, corporate Edge/node runtime UAT or the field-level Excel schema freeze.

## 4. Remaining technical QA / design gates

1. **Writer is not guarded:** the pure inspector is not imported into existing Save/Save As/Task editing. It must run before **every** managed write and after candidate serialization under a future bounded contract.
2. **Proposed audit action/field semantics:** the inspector checks type, action presence and some entity linking, but the exact `EntityType → allowed action → changed Field` mapping and historical audit replay/append-only integrity remain unfrozen. Do not claim tamper-proof audit or complete semantic validation.
3. **Automatic Watch rule list absent:** no frozen rule codes, evaluated freshness, criticality or automatic clearing conditions; `Origin=Automatic` presence alone is not proof of a trustworthy signal. Watch health calculations are not implemented.
4. **Actor identity unverified:** only `UnverifiedLocal` is currently modeled; no verified project-wide identity or cross-user security boundary.
5. **Extension migration / legacy / unsupported future:** read-only inspection is not equivalent to safe first-save sheet creation, cross-version conversion, or same-source sequential editing.
6. **Cross-user read/write:** real file provider versioning, lock/checkout/reload, sync conflicts and corporate Edge-specific behavior remain unverified; a file hash is not distributed compare-and-swap.
7. **Product outputs:** blackout-aware Days Remaining, ProjectMeta.ProjectName in app/Calendar/browser title, Report 1.1 name-source reconciliation and actual integrated Watch+Meeting are not implemented.

## Disposition

**F2-QA-01 to 03: identified, demonstrated with failing tests, remediated in read-only inspector, and Ubuntu regression PASS at the exact remediation SHA.** Do not call this a merged, production-released or fully independent QA-approved feature. PR #39 remains draft on top of F1 PR #38; original read-only v18 and the existing managed Save pipeline are unchanged.

**Next controlled gate:** After this QA work, review/freeze field-level audit semantics, actor/automatic rule handling and legacy compatibility; only then separately authorize F3 **all-write-path** integration with synthetic Save/recovery evidence and physical shared-file tests. Do not publish new UAT ZIPs or merge these draft spikes by implication.
