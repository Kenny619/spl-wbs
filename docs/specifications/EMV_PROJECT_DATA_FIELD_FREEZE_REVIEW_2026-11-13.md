# Project-data detailed contract — consolidated freeze review (13 Nov 2026)

**Purpose:** Group the remaining **genuine Product Owner policy choices** before promoting the stacked F1–F5 draft implementations. **This document is a review proposal, NOT an approved/frozen new contract, PR merge authorization, real corporate-file migration or UI acceptance.**

**Controlling sources:** [owner project-data ownership](../design/28_EXCEL_PROJECT_DATA_AND_LOCAL_PREFERENCES_OWNER_CLARIFICATION.md), [scope disposition](../design/29_2026-11-12_PROJECT_DATA_SCOPE_DISPOSITION.md), [human proposed v0.1.2](EMV_PROJECT_DATA_0_1_PROPOSED.md), [machine proposed v0.1.2](EMV_PROJECT_DATA_0_1_PROPOSED.json), and [Under Watch proposal](../design/25_UNDER_WATCH_FUNCTIONAL_PROPOSAL.md). Preserve frozen #3 `ProjectWBS`/`UpdateHistory` unchanged. Owner-approved DES-012 Review08 layout is authoritative visual reference.

## Already owner-decided — do not ask again

- Project WBS entities, Watch reasons/state/history, accepted commitments and blackout dates must be persisted **inside the same Excel project workbook**. Individual theme, visible columns, PGCM *display* preference, timezone, filters/zoom and recently loaded file history remain browser/device-local.
- Five additive plain-data sheets are approved **as a shape**, not yet exact headers/validators: `ProjectMeta`, `ProjectCalendar`, `WatchReasons`, `ProjectCommitments`, `ProjectAudit`.
- ProjectName is required shared metadata and source for app/Calendar/browser title; it must not be inferred from filename. Calendar has initially **at most one active inclusive blackout**, affecting managed Gantt, Task Detail Days Remaining and applicable PGCM behavior.
- Owner-approved Watch model is **reason-backed Under Watch / Clear / Unknown**, with manual and automatic reasons independent; Unknown never silently becomes Green, and new accepted commitments are distinct explicit audited decisions.
- **MR-D01 B:** no interim status-only Meeting Review; first release must genuinely integrate Watch. The frozen Reports/visual baseline must not be discarded.

## Recommended narrowly frozen field-level package — pending one owner disposition

| Area | Recommended freeze-level interpretation | Compatibility/QA consequence |
|---|---|---|
| `ProjectMeta` | `Key,Value`, required unique `ProjectID` UUID, `ProjectName` plain text 1–180 characters, exact `ProjectDataSchemaVersion` assigned only at final freeze | On legacy, first explicit confirmed project Save creates all five sheets; no file-name fallback, no creation on import |
| `ProjectCalendar` | `BlackoutID,Enabled,StartDate,EndDate,Label,ModifiedUTC`; UUID, literal boolean, real ISO date-only inclusive, UTC audit, ≤1 active interval; disabled rows retained | No double subtraction for weekend/holiday overlap, invalid/partial/future schema fail closed rather than empty saved calendar |
| `WatchReasons` | `ReasonID,TaskID,Origin,RuleCode,State,Title,Details,EvidenceRef,OpenedUTC,OpenedBy,LastReviewedUTC,ResolvedUTC,ResolvedBy,ResolutionNote`; unique immutable reason episode, valid WBS TaskID, `Manual/Automatic`, `Open/Resolved`, reason-level audit | Multiple reasons independent; an Open recorded reason = Under Watch. Resolved-only or no reason = Unknown **until complete approved rule evaluation**, not Green |
| `ProjectCommitments` | `CommitmentID,TaskID,AcceptedFinishDate,AcceptedUTC,AcceptedBy,PreviousCommitmentID,Rationale,EvidenceRef`; one immutable row per recorded reference, **one root per TaskID, no forks, successor AcceptedUTC strictly after predecessor**; same-task reference | Current task PlannedEnd edit must never silently rebaseline. No row = unconfirmed. Even the latest **recorded** row is **not verified acceptance authority** without a separately approved actor/acceptance policy |
| `ProjectAudit` | `EventID,ChangeSetID,TimestampUTC,EntityType,EntityID,TaskID,Action,Field,OldValue,NewValue,ActorLabel,ActorProvenance,Source,AppVersion`; separate from frozen task `UpdateHistory` and one UUID/UTC per logical Save | Strict type/reference/event validation; no invented TaskID for project events; no duplicate ChangeSetID across separate project Saves or task-history IDs. Audit is **not** authenticated/cryptographically immutable |
| Actor identity | Until a corporate identity source is approved, display actor as a **user-provided unverified label** and `ActorProvenance=UnverifiedLocal`; no role-security/authentication claims | Any authorization-based operation remains gated; no false corporate account attribution |
| Safe writes | Preserve any unknown compatible worksheets/extra columns; fail on reserved-name collisions and unsupported OOXML; preflight→candidate validation→verified Save/backup/readback; never replace source on stale SHA | Current local SHA is **not** distributed CAS; multiuser shared provider must have separate real Edge/Excel lock tests |
| Read/Watch evaluation | F5a conservatively renders recorded Open reasons and unresolved/legacy/invalid states, with `hasRecordedProjectAudit` meaning only a trace reference exists | Automatic rule evaluation and reliable Green computation must remain separate, not smuggled into structural field freeze |

**F6b field-validation addendum (proposed, 2026-11-13):** in the `WatchReasons` row, canonical `LastReviewedUTC` and `ResolvedUTC` must not precede the corresponding `OpenedUTC` when populated; equal timestamps are valid. The F6b inspector now applies this to **imported or manually altered workbook rows as well as newly saved episodes**, blocking an inconsistent extension before any managed Save. [Exact-head QA](../verification/EMV_PROJECT_DATA_F6B_WATCH_CHRONOLOGY_QA.md) PASS (275 unit/80 Windows browser). This consistency check does **not** add risk thresholds, authenticated actors, rebaseline authority or a final field-level approval.

**F6c field-validation addendum (proposed, 2026-11-13):** [commitment history QA](../verification/EMV_PROJECT_DATA_F6C_COMMITMENT_HISTORY_QA.md) validates imported ProjectCommitments as exactly one linear revision chain per task, rejects competing root records, forks and backward/same-time successor UTCs, and exposes only **recorded/unverified** history. This enforces the proposed historical-record shape; it does **not** authorize the actor to accept a revised commitment, establish a trusted baseline for automatic risk checks or approve release.

## Product choices that must NOT be inferred from schema approval

1. **Automatic risk rule registry:** exact conditions, acceptance of baseline, data freshness/holiday coverage, when to open/close, and whether an already-recorded automatic reason can be safely resolved. **Recommended:** defer rule activation; all unchecked tasks remain Unknown. Shipping “Green” before this decision is prohibited.
2. **Manual reason/Resolve UX:** interaction layout and required actor/closure rationale, especially when multiple reasons exist. **Recommended:** reason-by-reason Add and Resolve with one guarded Save, no magic Set Green; preserve unresolved reasons and full history. Validate visually against DES-012 before owner UAT.
3. **Accepted revised commitment:** who can record acceptance without authenticated identity, whether a user-entered label alone is acceptable for operational record, and which accepted reference is shown in the inspector. **Recommended:** display unverified provenance explicitly; postpone permission claims and date-shift auto-approval.
4. **Report 1.1 project-name source amendment:** separately approve replacing report-local name with Excel ProjectName in generated headers under frozen Issue #7. Until approved, do not silently change existing report output.
5. **Corporate collaboration envelope:** canonical shared workbook location/provider and read/edit/write permission/locking; no synchronized-copy live editing guarantees. **Recommended:** require sequential edit/reload, source-hash conflict refusal and explicit user-visible freshness/last-loaded state pending corporate UAT.

## Release/QA gate sequence (avoid repeated owner approvals)

1. Have one independent technical QA pass on F1–F5 data integrity, including reserved sheet collision, task/project audit replay, workbook extension fidelity and F4c/d Save failure recovery. CI-only smoke is not organizational independent signoff.
2. Product Owner **one consolidated field-level review** for the five-sheet schema and unverified actor semantics. Resolve only business choices that cannot be safely deferred; do not re-present accepted five-sheet/blackout ownership decisions.
3. After freeze, synchronize the machine JSON, human guide, version, changelog, acceptance register and implementation tests; explicitly distinguish implemented vs proposed.
4. Consolidate stacked draft branches **in correct dependency order** without changing reviewed functional behavior; preserve exact SHA evidence and do not merge to main automatically. Product Owner merge/physical corporate UAT gates remain distinct.
5. On an authorized disposable work-PC kit, test actual Windows Edge/Node26 and Excel-open/file-provider concurrency before any real production workbook migration or beta/release.
6. Complete Under Watch reason lifecycle and real Meeting Review, with owner's approved polished Schedule/Reports layout before soliciting visual acceptance.

**Disposition:** Product review/technical QA planning only. Current draft code may demonstrate the proposed shape; it does **not** retroactively freeze the field-level workbook contract. Do not merge/deploy real project-data writers until the distinct gates complete.
