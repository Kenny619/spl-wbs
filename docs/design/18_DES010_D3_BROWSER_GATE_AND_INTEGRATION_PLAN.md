# DES-010 — D3 Browser Validation and Controlled Integration Handoff

**Prepared:** 2026-11-08 JST  
**Controlling design issue:** [#25](https://github.com/Kenny619/spl-wbs/issues/25) · **Design-only draft:** [PR #29](https://github.com/Kenny619/spl-wbs/pull/29)  
**Selected visual concept:** [DES-010](../../design/concepts/DES-010-gantt-local-scope.html), original owner-endorsed blob `5bff3213b227b36305dca82253309a10178fad17`; **current QA-remediated, Windows Chromium-tested blob `77dc7333ee4e061dc06e54d74caa30b07bdbe79e`**.  
**Product Owner disposition:** “perfect! let's continue and keep our momentum.” Record as **strong endorsement of the DES-010 design direction**, particularly Schedule-local Exceptions/Workstreams navigation; **not** a blanket specification change, a tested production build, a main merge, or an unconditional release approval.

## Reality check: reuse the live managed implementation

**The managed application is not a blank slate.** The separately authorized, still-draft [Excel Managed Variant PR #19](https://github.com/Kenny619/spl-wbs/pull/19) has already implemented and CI-tested significant portions of the frozen v1 contract:

- **Workbook import / candidate write / conflict, backup, Save As and readback** in `src/managed/` on `feature/excel-managed-v1`, with a disposable-development-preview only. Stage A real-device recovery and fidelity gates remain open.
- **Task editing / unsaved draft guards** on the existing v18 managed UI.
- **Global and task-scoped Change History** from real `UpdateHistory` and `ChangeSetID`, with timezone-aware filtering and safe text rendering.
- **Display timezone, Columns, Light/Dark/System and confirmed Reset**, stored locally, with a safe fallback.
- **Latest Status and historical Update Reports** from committed source only, with precise inclusive time bounds and fixed plain-text preview/copy behavior.
- **Continuous CI** on the existing managed implementation, while **owner acceptance, independent QA and main merge remain pending**. Do not infer release readiness from automated passing tests.

**Do not reimplement the above functionality from the synthetic DES-010 JavaScript.** Treat DES-010 as an information-architecture/UI reference, and the verified managed modules as the future integration source. All actual workbook write operations remain controlled by the existing managed transaction code, not the design mock.

## Independent D3 browser-design evidence

A new **design-only** Playwright suite now lives at [`test/browser/des010-design-review.spec.ts`](../../test/browser/des010-design-review.spec.ts), on **PR #29's design branch only**. It uses the repository's existing Windows Chromium runner and validates the standalone DES-010 HTML without opening or writing any workbook.

### Tests / screenshots requested
1. **1366×768, 1024×768, 1440×900:** Schedule/Meeting selected-task inspector width/height/x alignment; stable global header button x coordinates across Schedule/Meeting/Reports; Gantt-local scope placement and switching (3 synthetic Exceptions vs 11 Workstreams); screenshot attachments.
2. **1366×768:** All Workstreams task-list internal scroll with anchored selected inspector and no window/page scroll; screenshot.
3. **1366×768:** Update Report's own scroll region, with global nav and report toolbar stationary; screenshot.
4. **1440px, 1024px, 860px:** Settings action visible and right drawer operable, History log entry and three sample action rows; screenshot. **Confirmed and corrected in DES-010:** first Windows Chromium run found Settings hidden at 1024px due to preexisting `max-width:1220px` CSS. Current responsive CSS keeps the fixed Settings slot visible while preserving primary global navigation.
5. **Dirty task draft:** Schedule Exceptions↔Workstreams uses Save/Discard/Cancel, preserving edits on Cancel and switching only after Discard.
6. **Update Report:** default Nov 02–09 eight inclusive dates and fixed preview until Generate/Refresh.

**Final D3 browser regression verdict: PASS at corrected source blob `77dc7333ee4e061dc06e54d74caa30b07bdbe79e`.** [CI run #42447648745](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745) completed **SUCCESS**: Windows Chromium **41/41 browser tests passed** (including all 8 new DES-010 tests), Ubuntu Build/Unit job SUCCESS, product build and review-package creation SUCCESS. Browser evidence: [Windows browser diagnostics artifact #13603389072](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745/artifacts/13603389072), including Playwright screenshot attachments and report; [v18 implementation validation package #13604485966](https://github.com/Kenny619/spl-wbs/actions/runs/42447648745/artifacts/13604485966) remains independent baseline evidence. This is actual **Windows Chromium** rendering, **not physical Microsoft Edge Owner UAT** or workbook safety acceptance.

**Finding and remediation trace:** Earlier [run #42447420570](https://github.com/Kenny619/spl-wbs/actions/runs/42447420570) had **40/41** browser checks pass, one failed because Settings was not visible at **1024px**. A **design CSS-only** responsive adjustment fixed accessibility of Settings at 971–1220px and narrower stacked layouts without changing the three primary header nav positions. The exact corrected source and new CI run passed every check. No product/application code was modified.

## D3 design-to-implementation compatibility matrix

| DES-010 surface | Existing production contract and code | Safe implementation approach once separately authorized | Contract/decision gap |
| --- | --- | --- | --- |
| Global header and shared pane dimensions | Approved v18 + managed standalone shell | Extract shared view shell / layout tokens; preserve primary nav x and matching inspector width/height at fixed viewport | Owner exact-artifact freeze + Edge/zoom proof |
| Schedule Exceptions / Workstreams switch inside Gantt box | Current viewer Gantt source; design-owned scope switch | Mount selector in Gantt panel header; use real WBS selectors and save-state guard; no synthetic task array | Exception semantics must map to actual supported task/health model, not DES-010 fixture |
| Schedule and Meeting selected task detail | Frozen #4 + managed draft/save modules | One task identity, one editor state and transactional Save; switch view without losing a draft, independent panel scroll | Meeting Review is a new UI surface; requires separate scoped feature authorization |
| Meeting filters (Owner, Workstream, Due Today, <5 days) | Existing WBS statuses, date-only planned finish, current session Calendar | Compose filters on current loaded task model, respect task identity and backlog; avoid artificial summary counts | Holiday and **project blackout** calendar provenance/persistence are not frozen (#20); no silent new project file schema |
| Dependency lists and drill-through | Existing `PredecessorIDs` task data | Render previous/successor linked tasks using stable ID, not name matching; warn for missing IDs | Full dependency editing or new constraints require separate approval |
| Settings right drawer | Frozen #6; implemented settings module in PR #19 | Re-house existing Settings UI and local persistence inside slide-out shell; maintain full IANA zones, Light/Dark/System, columns and Reset | DES-010's three sample zones and nonfunctional theme controls are **not** acceptable substitutes |
| History right drawer / one log row per field action | Frozen #5, persisted `UpdateHistory`, implemented history source | Replace presentation only; keep task/period/field filters, historical WBS/title, escape untrusted values, compare long text, preserve common Save grouping/ChangeSetID and timezone | **Potential #5 wording tension**: one row per action is only compliant if every logical Save still visibly groups/associates its affected task/field rows; QA/PO must confirm rather than discard grouping |
| Latest Status | Frozen #7, implemented `reports.ts` and text UI | Use actual committed-only report engine and exact preview/clipboard snapshot under DES-010 layout; show current workstream/owner correctly | DES-010 “Present” layout is an unapproved optional display; not required by v1 |
| Update Report default dates | Frozen #7 inclusive date selector and timezone behavior | An 8-inclusive-date *default* (last same weekday through review day) can be proposed without changing date filter boundary semantics or report engine | **#7 approval needed for default only if freeze interprets unspecified defaults as binding**; record change-control disposition before implementation |
| Weekly story report: added/completed/new risk/released watch, no Save counts | Frozen #7 reads UpdateHistory only, requires **logical Save counts** | **Do not integrate into current v1**. Keep as separately proposed future report variant | Explicit #7 conflict; added/risk/watch lifecycle events not guaranteed by frozen #3; requires new event source / PO spec approval |
| Persistent Under Watch, revised commitments, project blackout | Concept docs / proposed #20; frozen #3 workbook schema | Defer noncontracted risk/watch persistence and project calendar changes | **New data contract and approval mandatory** |
| App icon and version | Real `index.html` favicon, managed `package.json` placeholder 0.0.0 | Reuse real asset and show reliable build metadata in Settings About, not top header | Do not claim v0.0.0 is a released product version |
| Separate read-only SharePoint viewer | Frozen v18 on main and existing baseline regression | Keep distinct build/output; no modification from managed redesign | Continuous screenshot parity and no SharePoint regression |

## Recommended sequenced delivery (AI/engineering preparation, not authorization)

### Track 0 — continue the existing authorized Stage A safety effort
Maintain PR #19's original v18-derived managed implementation until safety gates close. Protect direct Save, transaction recovery, backup integrity, OOXML unsupported-feature fail-closed behavior, Save As and imported-last-good state. Independently test actual Windows/Edge file locking, backup, failure/restart, and compatibility per #2/#11; triage #14 dependency advisories without unapproved parser downgrades. **Do not block these safety tasks while refining UI.**

### Track 1 — D3 exact visual gate
- Execute new Windows Chromium design checks in CI on the **design branch** and collect screenshots; remediate proven layout/navigation defects only in the design prototype, preserving owner's stable core layout.
- Verify actual Edge 1366×768, common browser zoom, pointer/keyboard scrolling, Settings drawer and Change History log with a disposable local HTML file. This is a **human Product Owner** decision gate only where visual judgment is needed.
- Reconcile CSS and source SHA after each remediation. Offer one concise **exact-blob D3 design freeze decision package**, not a series of routine “proceed” prompts.

### Track 2 — approved-scope integration planning
- Publish a code-level integration map mapping each DES-010 component to current `src/managed` modules, interfaces, state and tests. Reuse existing implementation, avoid redesigning workbook writes.
- Identify which parts can be presented without schema or behavior changes and which are **new scope** (Meeting workspace, new lifecycle report, risk watch and persistent blackout calendar).
- Build a small, staged **UI-integration implementation** proposal for PO approval: first shared shell + Schedule/Settings/History/Reports using existing engines, then newly specified Meeting Review only after its feature contract is approved.
- Separate implementation authorization, owner functional UAT, merge and release authority; avoid repeating UI design approval for each CSS adjustment.

## Exact next actionable owner gate
Once CI screenshot evidence is reviewed and remaining design gaps are resolved, ask the Product Owner **once** to freeze the exact D3 source version and approve a bounded implementation-planning scope. Until then **DES-010 design direction is endorsed but not frozen**, PR #29 remains a design-only draft and PR #19 remains a separately authorized, draft managed-variant implementation. No new product code, merge or production workbook use is authorized by this document.
