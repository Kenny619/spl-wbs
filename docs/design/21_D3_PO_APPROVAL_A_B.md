# D3 Product Owner Decision — DES-010 Exact Visual Freeze and Bounded Managed UI Implementation

**Decision date:** 2026-11-08 (JST)  
**Controlling Issue:** [#25 UI overhaul](https://github.com/Kenny619/spl-wbs/issues/25)  
**Design-only PR:** [#29](https://github.com/Kenny619/spl-wbs/pull/29)  
**Owner response:** “Agree, let's go with A + B.”  
**Previous decision package:** [20_DES010_D3_FREEZE_AND_UI_IMPLEMENTATION_DECISION.md](20_DES010_D3_FREEZE_AND_UI_IMPLEMENTATION_DECISION.md)

## DEC-D3-A — APPROVED: Freeze the exact visual and interaction design

**Authoritative DES-010 reference:** [design/concepts/DES-010-gantt-local-scope.html](../../design/concepts/DES-010-gantt-local-scope.html), Git blob **`77dc7333ee4e061dc06e54d74caa30b07bdbe79e`**. This is the **post-responsive-fix** revision, not the earlier `5bff3213...` source.

Freeze this exact **D3 visual/interaction design reference for the Excel Managed Variant**, including:
- App icon only, no redundant brand/version beside it; fixed primary Schedule / Reports navigation positions (Meeting Review remains a separately proposed UI scope).
- Full-height, internal-scroll schedule and inspector panels; selected inspector width consistent between views.
- Schedule-local **Exceptions | Workstreams** switch inside the Gantt panel; actual task/exception semantics must come from an approved source, not synthetic flags.
- Top-right Settings, right-side Settings/Change History drawer, one row per saved field action with visible logical Save/ChangeSetID association; task-specific history entry.
- Fixed Reports controls with internally scrolling content; last same weekday through today **eight inclusive calendar dates** as default, custom period retained.
- Existing frozen workbook/edit/history/settings/report source and safety semantics remain authoritative.

**Evidence:** [Windows Chromium CI #42447648745](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745) **SUCCESS: 41/41 browser tests** and Build/Unit SUCCESS. Includes original real-responsive defect finding (Settings hidden at 1024px in [40/41 prior run](https://github.com/Kenny619/spl-wbs/actions/runs/42447420570)), corrected before approved exact blob. Browser screenshots in [artifact #13603389072](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745/artifacts/13603389072).

**Meaning of freeze:** No unilateral material UI design changes. Physical Edge owner UAT and product implementation acceptance are separate future gates. Frozen currently deployed/viewer baseline **v18** remains unchanged until separately accepted managed UI, and the original read-only SharePoint viewer stays intact. No main merge, release or deployment authority is created by this approval.

## DEC-D3-B — APPROVED: Bounded implementation on a separate draft managed branch

Authorize only **UI-INT-01, UI-INT-02, UI-INT-03**, implemented *on a new isolated branch based on current managed development branch* `feature/excel-managed-v1`. Reuse the managed implementation's production data, safe Save/Save As/draft behavior, history, settings and reports rather than copying DES-010's synthetic fixtures or replacing the workbook engine.

1. **UI-INT-01 — Shell and Schedule presentation:** consistent header/nav, Gantt-local scope switch only if backed by an existing approved task filter, internal scrolling, stable task inspector, preserved workbook chooser, safety and recovery actions.
2. **UI-INT-02 — Settings and History presentation:** slide-out right drawer, Preferences and Change History tab, direct task History. Keep IANA timezone, browser-local persistence, all existing columns, Light/Dark/System, Reset; history task/field/**period** filtering, safe full-text comparison, immutable historical identity and Save grouping.
3. **UI-INT-03 — Reports presentation:** full-height Reports, fixed controls and independent internal scroll, exact committed-only **plain-text** preview/copy snapshots, historical Save-event/field counts and associations, workstream grouping, DST-safe period bounds and existing eight-inclusive-date default.

**Implementation restrictions:** Draft PR only, no main merge/release/deployment, use synthetic/disposable test workbooks only, maintain distinct v18 read-only viewer and existing managed safety architecture, do not touch frozen #3–#7 source-of-truth contracts. Run exact-SHA typecheck/build/unit/Windows Chromium CI, independent QA and owner UAT before a later merge decision. Do not claim physical Edge safety based on Chromium.

**Explicit exclusions requiring future specification/change-control:** New permanent Meeting Review business workflow, new risk/watch or revised-commitment models, project blackout persistence (#20), dependency editing/new schema, new completed/added/risk/released-watch lifecycle report data, and removing required Save counts from v1 frozen #7. These stay design hypotheses/proposals. Preserve all open Stage A #2/#11/#8/#14 physical/save compatibility gates for PR #19.

## Governance and provenance

- The **only human Product Owner** made A and B approval. Engineering and QA support may use AI agents; do not invent human reviewers.
- The **design PR #29 remains draft** and serves as source/reference only; it must not be merged as application code.
- The UI implementation PR must be **distinct and stacked against the active managed branch**, avoiding redundant implementation, and cannot merge without another explicit owner decision.
- Subsequent UI fixes during implementation can correct defects without changing design intent; material departures need another logged Product Owner design decision.
- The separately authorized current Stage A restricted managed development work continues unaffected.
