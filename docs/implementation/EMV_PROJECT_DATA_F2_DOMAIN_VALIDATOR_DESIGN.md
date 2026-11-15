# F2 — Excel ProjectData domain validator / writer integration design (NOT AUTHORIZED TO IMPLEMENT)

**Date:** 2026-11-12 JST · **Status:** Technical design, **not** a frozen field-level contract or production implementation authorization.  
**Source of scope:** [Owner decisions SCH-01/CAL-02/SEQ-01](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md); [human v0.1.2](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.md), [machine v0.1.2](../specifications/EMV_PROJECT_DATA_0_1_PROPOSED.json).  
**Evidence:** [F1 spike run 43147141579 / 172 unit + 66 browser PASS](../verification/EMV_PROJECT_DATA_F1_SYNTHETIC_FEASIBILITY_EVIDENCE.md) at `5f81454a5a38db603533a10601c493259a2beb7c`, [draft test-only PR #38](https://github.com/Kenny619/spl-wbs/pull/38).  
**Safety boundaries:** existing [Issue #2](https://github.com/Kenny619/spl-wbs/issues/2), [#11](https://github.com/Kenny619/spl-wbs/issues/11), frozen workbook/edit/history #3–#5, personal Settings #6, Report 1.1 #7. Protected DES-012 UI unchanged. Do not silently change main or read-only v18.

## 1. What F1 established — and why F2 is essential

The existing `src/managed/preflight.ts` is a **package-level OOXML safety gate**: ZIP names/content types/relationships/unsupported XML constructs. F1 verified it safely admits extra **ordinary** sheets. It is **not** a schema validator for project concepts. Specifically, F1's diagnostic test demonstrated an XLSX containing only `ProjectMeta` among the five extension sheets **passes package preflight**.

Current task-only `src/managed/workbookCandidate.ts` performs its own Task/UpdateHistory integrity checks but **does not yet validate** any new project sheets. That implies a safety requirement **even before Watch/Calendar UI ships**: after the extension is recognized, **all managed workbook write paths must call the ProjectData validator**, including ordinary task edits, Save As and future project-only Save. A partial/unsupported extension must not slip through an unrelated task write and become apparently committed.

The existing `src/managed/history.ts` properly rejects fake task-field `UpdateHistory` records for Calendar/Watch. Create a **separate typed `ProjectAudit` reader/append model**, not a relaxation of existing task history.

## 2. Proposed contract-driven inspection states

`inspectProjectData(workbook)` should **not write**; return a discriminated result:

| Kind | Meaning | Reader behavior | Managed write behavior |
|---|---|---|---|
| `legacy` | **None** of the five recognized extension sheets exists | Existing `ProjectWBS` and optional `UpdateHistory` remain readable; Watch **Unknown**, Project Calendar **not configured**, ProjectName **not configured**, source filename separately labeled | Existing **task-only** edits remain available under frozen v1 safety; first explicit **project-data** Save must create/validate all five sheets atomically and require ProjectName |
| `valid` | **All five** recognized sheets exist, known supported version, required fields and referential integrity valid | Read committed project data and derived Watch/Calendar; personal views stay local | Allow candidate construction only after full cross-sheet validation and existing OOXML preflight |
| `incompatible` | Recognized subset present, wrong version, missing/duplicate header/key, invalid type, orphan reference, insufficient provenance or irreconcilable audit state | Give truthful row/field diagnostics and **read-only view where safe**, never synthesize Green or zero blackout from malformed data | **Block every managed write path**, including a plain Task Title edit, Save As and auto-retry; never silently repair/overwrite |
| `unsupported_future` | Full recognizable extension but future schema version | Label unsupported; do not downgrade/erase | Block writes; require separately approved compatible version upgrade |

**Case handling:** match **recognized worksheet names without case sensitivity** but reject duplicate case-folded aliases; preserve unrelated custom worksheets by identity. Existing custom worksheet named `ProjectMeta` alone must not be quietly adopted as an incomplete new project schema or overwritten. A read-only diagnostic needs to be possible without a write.

## 3. Proposed field validation map (to freeze separately)

### `ProjectMeta`
- Required unique keys `ProjectID` UUID, `ProjectName` nonblank Unicode plain text ≤180 UTF-16 code units for consistency with current Report 1.1 input (if code point vs grapheme choice differs, freeze explicitly), `ProjectDataSchemaVersion` a known exact version. Trim only for validation/display; preserve canonical intended name without invisible truncation.
- No formulas, rich data, dangerous control characters or silent fallback from workbook filename or browser-local Report preference. Safe DOM text only.
- Unrelated metadata keys preserved if supported; extra headers preserved as nonauthoritative data under fidelity policy.

### `ProjectCalendar`
- `BlackoutID` unique UUID; literal boolean `Enabled`; optional human `Label`; valid ISO date-only `StartDate`/`EndDate`, `StartDate <= EndDate` when enabled; `ModifiedUTC` canonical timestamp.
- At most **one** enabled interval (`CAL-02`); disabled historical entries retained, no duplicate UUID or silently preferred row.
- A saved blackout is used by the **shared calendar workday predicate**: count eligible dates strictly **after Today through Finish inclusive**, one exclusion per date if weekend, Japanese holiday or committed blackout. Unknown required calendar coverage → Unknown. Never count a draft as saved.
- Legacy no-extension may use existing weekend/Japanese-holiday count with explicit **“Project blackout not configured”** indicator, pending compatibility test; malformed extension is **not** treated as legacy.

### `WatchReasons`
- Each ReasonID UUID unique; TaskID must resolve to one existing ProjectWBS.ID; manually entered `Origin=Manual` or approved deterministic `Origin=Automatic`. Automatic rule code MUST be from a **separately frozen registry**; until then, automatic reason writes remain unauthorized.
- State Open/Resolved, allowed corresponding timestamps/actor labels; resolution must not erase opened reason identity/history; explicit unresolved/Unknown when automatic check provenance absent.
- No hidden direct “Set Green”; clearing one reason cannot clear others. Other watch-specific rule thresholds remain a separate functional specification.

### `ProjectCommitments`
- CommitmentID UUID unique; TaskID resolved; ISO AcceptedFinishDate; canonical AcceptedUTC; accepted actor label/provenance (do not call unauthenticated input a trusted corporate approval).
- Append-only rows for each acceptance; `PreviousCommitmentID` links same task and is acyclic/consistent; date edit alone never overwrites an accepted reference.

### `ProjectAudit`
- EventID UUID unique, ChangeSetID UUID and TimestampUTC canonical; EntityType/EntityID/TaskID/Action/Field names from exact allowlists (to freeze). Preserve both before/after values as safe inert full-fidelity fields.
- Project-wide Calendar/Meta events have no fake TaskID; task-level edits continue in `UpdateHistory`.
- All rows of one logical Save share ChangeSetID/UTC and reflect actual committed data, without duplicate IDs. Distinguish app-level append-only behavior from tamper-proof cryptographic audit (not provided by an editable XLSX).
- Do not falsely certify all historical events if an operator externally edits their workbook.

## 4. Safe integration order (read → candidate → write)

**Proposed sequence (pseudocode, not code change):**

```text
inspect(sourceBytes):
  preflightManagedWorkbook(sourceBytes)                     // EXISTING package safety
  workbook = ExcelJS.load(sourceBytes)
  validate baseline ProjectWBS and UpdateHistory           // EXISTING task history contract
  extension = inspectProjectData(workbook)                  // NEW domain-only read
  return { baseline, extension, sourceHash }

prepareCandidate(verifiedSource, typedActions):
  if extension incompatible/future: reject every write
  if extension legacy and actions only task edits:
    apply current task editor; keep extension absent
  if extension legacy and actions include project changes:
    require explicit user project migration + ProjectName
    create all 5 sheets in a SINGLE in-memory candidate
  validate all typed actions and TaskID/ReasonID/CommitmentID refs
  update only intended cells; create ProjectAudit for project fields
  create legitimate UpdateHistory only for task-field changes
  use one ChangeSetID and TimestampUTC for all changes in this logical Save
  preflight candidate, re-open, validate extension+task history again
  compare unchanged custom/non-target data and verify all expected edits
  return candidate or reject with no source mutation

write(candidate):
  use existing staged direct Save / backup / pending / sourceHash / readback
  block on stale source or unresolved recovery
  NEVER claim shared success without verified source+backup
  remind that local source hash does not supply distributed atomic locking
```

**Canonical paths to inspect/update once separately authorized:**
`src/managed/preflight.ts` (package safety unchanged);
`src/managed/workbookCandidate.ts` (existing TaskID writer, must invoke new project-domain gate);
`src/managed/history.ts` (frozen Task history untouched);
new isolated project reader/validator and ProjectAudit model;
`src/managed/directSave.ts` (reuse guarded transaction without widening unsafe overwrite);
`src/managed/settingsUi.ts`, `src/ui/mount.ts` and `src/calendar/workdays.ts` (after specification freeze for shared Calendar, ProjectName, and blackout-aware day counting).

## 5. Feasibility and regression gates (tests to implement later)

1. **Read-only inspection:** all 5 sheets valid, all absent legacy, 1–4 partially present, duplicate/case variants, unknown version, invalid ProjectName, unsupported value types, malformed audit.
2. **Existing task-only Save safety with extension:** valid project sheets allow legitimate Task edit and preserve them; partial/malformed extension **blocks** Task Edit Save, direct Save and Save As before any disk mutation.
3. **First project-only Save:** adds all 5 sheets and ProjectAudit, legitimate header-only UpdateHistory if absent, **no invented TaskID row**, one transaction ID, verified reopen/backup.
4. **No-op & failure:** no new audit/bytes for no-op; forced preflight/readback/backup failures never show saved, preserve pending recovery.
5. **Calendar and identity:** blackout overlap/weekends/holidays counted once; today/finish boundaries; unknown coverage; ProjectName visible on all authorized surfaces and document.title, safe Unicode/control text.
6. **Cross-editor source:** A saves project reason; B reads same file afterward, sees committed facts; stale B Save rejects; actual Windows Edge/Excel locks and sync client provider must be tested separately.
7. **Shared task + project Save:** consistent paired Task UpdateHistory + ProjectAudit ChangeSetID/time; no unauthorized mutation of frozen UpdateHistory.
8. **Read-only v18 regression:** preserved and unchanged; design parity against exact DES-012 source.
9. **Corporate Node 26.13.0/npm 11.19.1:** independently test current corporate runtime; original GitHub CI uses Node22 and is not an equivalent proof.
10. **UAT kit:** only after exact-head independent QA, release hold removal and one current README link; F1 spike artifact is **not** a UAT download.

## 6. Genuine remaining decisions

- **ACT-01:** how an actor label is sourced and how its credibility is represented; current standalone browser cannot claim verified corporate identity.
- **SYNC-01:** validated sequential shared-file access model vs required simultaneous multiwriter edits; a local/sync-copied file is not distributed CAS.
- **WATCH-RULES-01:** explicit automatic watch trigger catalog, evidence reliability, accepted commitment comparison, Green/Unknown completeness and clearance thresholds.
- **NAME-REPORT-01:** Report 1.1 frozen browser-local project-name preference vs new shared ProjectMeta.ProjectName; handle via narrow #7 amendment.
- **LEGACY-CAL-01:** explicit readable legacy no-calendar fallback versus corrupt partial schema; technical compatibility tests required.
- **Stage sequencing:** SEQ-01 couples integrated features but does not override prior beta-after-Stage-C gate absent a separate owner scheduling decision.

**Disposition:** **F2 design prepared, not implemented or approved for production.** Owner-selected five sheets, single range and integrated feature delivery remain authoritative. No need for routine owner “proceed” between reading this design and technical review; escalate only genuine policy/architecture decisions.
