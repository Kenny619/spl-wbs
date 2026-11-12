# F4d — Applied committed Excel ProjectCalendar to managed Schedule and Task Detail

**Prepared:** 2026-11-13 JST  
**Status:** **DRAFT bounded managed integration**, not a production release, merged main, corporate Edge/Excel UAT, or DES-012 Review08 visual approval.  
**Draft PR:** [#47](https://github.com/Kenny619/spl-wbs/pull/47), stacked on [F4c #46](https://github.com/Kenny619/spl-wbs/pull/46).  
**Initial exact head:** `fc68d9ae5df1de8fa1a3aba73a7b458d5fb6eb9b`  
**Initial CI:** [run #43290170198](https://github.com/Kenny619/spl-wbs/actions/runs/43290170198), Ubuntu build/unit PASS, Windows browser job pending at first checkpoint.  
**Controlling requirements:** Excel-owned ProjectMeta/ProjectCalendar/Watch, one enabled project blackout and ProjectName shared across users; user appearance, column, PGCM display and recent-file preferences are local. Detail field/audit schema v0.1.2 remains proposed.

## Code delta

1. `src/managed/main.ts` dispatches the **validated committed project blackout** after successful Excel load, read-only preview, Task Save, Project Settings Save, Save As, and disconnect. It does not dispatch uncommitted draft fields or write local browser Calendar state.
2. `src/ui/mount.ts` listens to this internal **managed-only** event and repaints Gantt/Task Detail. Managed mode uses the Excel blackout, read-only v18 continues using its historical session blackout. Verified no-active or legacy sends a disabled interval, not a guessed saved value.
3. `src/ui/timeline.ts` accepts an optional committed blackout for real task-bar remaining-days tooltips; the same committed interval also feeds current Gantt shading and existing PGCM blackout cancellation rules.
4. `src/ui/detail.ts` accepts optional committed blackout for Task Detail Days Remaining. Old read-only four-argument calls preserve their frozen weekend/JP holiday logic; F4a calculation uses Today-exclusive to planned Finish-inclusive, excluding weekend/JP holiday/blackout overlap once per date.
5. `src/managed/shell.ts` clarifies that managed days exclude weekends, Japanese holidays and workbook-saved blackout; `managed.css` hides the **old conflicting session Calendar button/popup only in managed mode**. Project Calendar editing remains under Settings, consistent with approved placement.
6. `test/browser/managed.spec.ts` adds an actual synthetic Excel project test with frozen Tokyo date, confirming both visible Task Detail and Gantt tooltip change after verified Save to disable a shared blackout. Prior legacy managed-only assertion that old session popover is visible is revised to hidden; pure v18 tests unchanged.

## Validation gates

- **Ubuntu unit and production build:** PASS for the initial head [run #43290170198](https://github.com/Kenny619/spl-wbs/actions/runs/43290170198); exact unit count and Windows browser test total to be appended after CI completion.
- **Windows Chromium:** pending at first report checkpoint; no overall PASS claimed until the final run conclusion and exact SHA are established.
- **Physical corporate environment:** NOT TESTED. CI Node22 is not corporate Node26/npm11, a disposable synthetic directory is not proof of real Excel/OneDrive/SharePoint sequential multiuser locking.
- **Owner visual review:** PENDING. This bounded managed implementation does not represent the fully accepted DES-012 Review08 visual mock being integrated into product.
- **Data policies:** exact proposed ProjectData field-level/actor and audit semantics still need freeze. Under Watch rules/Meeting Review and Report 1.1 shared-name output amendment remain separate.

## Next path

First close exact F4d browser CI; then independently QA that managed Schedule, Task Detail and PGCM share the same committed calendar across reload/first init/disable and recovery, without regression of frozen v18. Do not change Product Owner-reviewed Report Review02 styling or downgrade the Gantt feature set. A corporate Edge+shared Excel same-file sequential-edit UAT and owner acceptance are required before any real project workbook rollout.

**Disposition:** draft implementation, no merge, release, new README/UAT kit download or real corporate data modification authorized by this work.
