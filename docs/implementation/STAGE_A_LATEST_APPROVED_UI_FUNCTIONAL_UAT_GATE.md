# Stage A — latest approved UI and functional Excel UAT reconciliation

**Date:** 2026-11-13 JST  
**Status (superseding owner direction, 2026-11-13 20:02 JST):** **CURRENT APPLICATION UAT PROMOTION WITHDRAWN / UI INTEGRATION ON HOLD**. The previously promoted candidate was functionally incomplete against the already-owner-approved DES012 Review08 visual design: missing its Option A integrated dates/progress rail and entire Meeting Review page. 162/162 unit + 68/68 browser PASS was scoped and did not test the missing features. Owner directs **review standalone approved HTML first**, then **integrate only after full baseline confirmation**, and **create NO new UAT package now**. This status supersedes earlier candidate readiness text below. Not a new design approval, release, beta change or merge authority.  
**Source:** Product Owner: “UAT package opened the excel with read-only, but the UI seems to be the old version. Is this intentional? I'd prefer to conduct UAT in the latest UI.”

## Verified root cause and correction

The current README points to [Report 1.1 development-preview artifact #13757420806](https://github.com/Kenny619/spl-wbs/actions/runs/42803451878/artifacts/13757420806), generated from [PR #37](https://github.com/Kenny619/spl-wbs/pull/37) application commit `85218fd629e50bf1ae17f22c5d2dd8f86ebb8eef`, with 162/162 unit and 66/66 hosted Chromium checks passing.

The actual **ZIP contents were inspected**: it contains `managed.html`, Report11 and DES-010 synthetic XLSX fixtures, both Report11 and historical DES-010 instructions/checklists. `managed.html` contains the Review02 Report Studio, **but still builds the Schedule shell from `src/managed/shell.ts`**, explicitly labeled `DES-010 UI-INT-01`, and renders only the old **Schedule/Reports** navigation. It does not contain the latest **DES-012 Review08** three-workspace structure and **Meeting Review** is not implemented. The most current [approved DES-012 Review08 prototype](../../design/concepts/DES-012-consolidated-review08-task-detail.html) is an interactive **design reference**, not an Excel-backed application. Do not promote it as a live Excel UAT package.

The UAT read-only import is separate: `Project → Open XLSX read-only` supports a compatible .xlsx selection when folder access is blocked. It intentionally has **no Save/Save As/backup/history-write capability**. Read-only mode is not the reason Schedule UI looks older; it is an import permission fallback, **not** an alternate newer/older interface switch. If Owner uses read-only fallback, data/report/appearance tests may proceed, but all write/backup/recovery tests are BLOCKED.

**Disposition:** Owner did not accept the older UI. Do **not** count the previous Report11 package as current/latest integrated Stage A UI acceptance. Prior automated Report11 CI stays valid for its own source SHA and scoped functions.

> **Historical record only / REVOKED AS CURRENT UAT:** The following section documents an incomplete CI-green candidate created earlier on November 13. It is **not** an eligible current latest-UI UAT package. GitHub READMEs no longer promote its ZIP. Follow the [approved visual baseline and true gap matrix](../design/31_DES012_FULL_UI_RECONFIRMATION_AND_PR60_GAP_2026_11_13.md) instead.

## Verified replacement functional candidate — November 13, 2026

- **New functional source:** [draft PR #60](https://github.com/Kenny619/spl-wbs/pull/60), packaged application exact `8bcf5c4d905cb1003549caea8134f15576e0a8e0` on an isolated branch. Live DES-012 Schedule/Task Detail DOM reorganized while real task editor, Timeline, File System Access and Report Review02 engine are preserved. No fake Meeting Review.
- **Verified CI:** [run #43400644793](https://github.com/Kenny619/spl-wbs/actions/runs/43400644793), both jobs **SUCCESS**, raw logs **162/162 unit** + **68/68 Windows Chromium** including exact new DES012 functional tests, Report11 Review02 and 2,000-row read-only stress.
- **Actual downloaded [GitHub ZIP #14024902596](https://github.com/Kenny619/spl-wbs/actions/runs/43400644793/artifacts/14024902596):** members verified to be `managed.html`, `SPT-WBS_Report11_Synthetic_UAT.xlsx`, `START_HERE.txt`, `STAGE_A_UAT_CHECKLIST.md`, `SHA256SUMS.txt`. All four SHA256 checks validated; built HTML has DES012 live Schedule markers and Report11 studio; no obsolete DES010 artifacts. Expires **2026-11-20 18:22 JST**.
- **README handoff:** single new ZIP link replaces old one on main, Report PR #37 branch and UI PR #60 branch. New docs-only HEAD changes after application SHA are distinguishable; no product code changes between packaged app SHA and README update.
- **Remaining:** Owner's actual corporate Edge latest-UI parity, physical save/Excel locks and Outlook rich-paste evidence, independent UAT disposition. Formal visual acceptance and Stage A acceptance remain **OPEN**; do not relabel hosted CI as owner PASS.

## Stage A latest integrated functional UAT: minimum change set

The existing owner-approved artifacts govern design:
- **Schedule and Task Detail:** [DES-012 Review08](../../design/concepts/DES-012-consolidated-review08-task-detail.html), exact approved blob `de6ebaa63aa035ba741b4435cf1cdb9d1166d958`; preserve actual live WBS/Gantt controls (Day/Week/Month/Quarter, date navigation, owner/finish columns, expandable hierarchies, dependency toggle, inactive toggle, header search and **per-column multi-select** filters in the Gantt box, task detail stable list/pane proportions, scroll containment, workstream/status distinctions, settings/history slide-out, dark-mode contrast). Never replace with a simplified static screenshot, inert mock, or legacy DES-010 shell.
- **Reports:** Preserve [Report 1.1 Review02 prototype](https://github.com/Kenny619/spl-wbs/blob/docs/report-1-1-po-approved-direction/docs/prototypes/SPT-WBS_Report_1.1_Interactive_Prototype_Review02.html), functional `report11` modes from PR #37 and real workbook/history report engine, two-column studio, paper preview, semantic KPI states and **Copy for Outlook**. No report output-name contract change without narrow approval on frozen Issue #7.
- **Stage boundary:** Calendar/Watch/genuine Meeting Review is an approved **separate but stage-unassigned integrated feature package**. It must not be implemented as a fake “Meeting Review,” falsely declared Stage A complete, or used to block Stage A under the current owner Stage A-only priority. For a Stage A UAT build, expose **Schedule and Reports** as delivered; explicitly note Meeting Review is not yet in this build. Do **not** make an inert third nav tab.
- **Real data and controls:** Use the same live task selection, filters, Editor, History, Settings, Reports, directory and read-only picker. Do not clone controls and abandon their listeners. Preserve v18 **read-only variant** unchanged. Confirm **read-only import and writable-folder import render the same Stage A UI**, differing only in allowed Save actions.
- **No unapproved inferred Watch or RAG**, no schema migration, corporate XLSX write, or new person/role authority. Save/Save As still follow the existing fail-closed protocol.

## Acceptance checks for a replacement, current UI UAT ZIP

| ID | Required exact-head evidence |
|---|---|
| UI-UAT-01 | Functional `managed.html` visually follows DES-012 Review08 **Schedule/Task Detail** on a normal laptop and meeting-screen viewport; core controls work with actual synthetic workbook tasks. Side-by-side screenshot comparison and owner Review08 disposition |
| UI-UAT-02 | Approved Gantt controls remain INSIDE chart card, grouping/filters/columns/search/zoom/chevrons/dependencies interactive, with 860px height safeguards and readable dark mode |
| UI-UAT-03 | Same visible Schedule/Reports UI after **writable-folder** and **Open XLSX read-only** imports. Read-only is visibly labeled; Save/Save As/backup tests BLOCKED, never silently passed |
| UI-UAT-04 | Task Detail fixed-height/scroll-contained, selectable task and dependency links, real WBS/workstream/owner/status, history and unsaved-change guards; preserve keyboard/focus |
| UI-UAT-05 | Real Report Review02 in three modes from Report11 synthetic fixture, HTML/text preview, Review02 paper/exception formatting, Outlook rich copy into UNSENT message |
| UI-UAT-06 | Existing v18 read-only viewer (separate build) remains unchanged; both builds, unit suite and Windows Chromium pass on **same release-candidate SHA** |
| UI-UAT-07 | Package includes `managed.html`, **one explicit primary Report11 synthetic XLSX**, any required additional synthetic fixtures, short setup and results template, exact source SHA/checksums, and **no older DES-010 instructions mislabeling final UI** |
| UI-UAT-08 | Verify the resulting archive's actual included `managed.html` matches current integrated UI (inspect files and perform browser smoke; not only source-side screenshots); validate download artifact availability before updating **both main and feature README**, keeping only the **latest** UAT kit link |

**Owner UAT routing:** Report/function/layout verdict in [Issue #7](https://github.com/Kenny619/spl-wbs/issues/7); cross-screen design parity in [Issue #25](https://github.com/Kenny619/spl-wbs/issues/25); corporate FS permission/Save/Excel-open locks in [Issue #11](https://github.com/Kenny619/spl-wbs/issues/11).

## Execution order — avoid repeated Owner time

1. Implement **actual Schedule/Task Detail DES-012 parity**, preserving Report Review02, on a bounded draft branch stacked on the latest appropriate Stage A code. Do not make Meeting Review a fake Stage A deliverable.
2. Independently review code/UI mapping and test generated `managed.html` on fixture in both import modes. Verify exact-head Linux/Windows CI, visual evidence and draft/provenance.
3. Package a single **new** correct integrated Stage A UAT kit on GitHub; inspect its real ZIP members for stale materials and confirm it opens the Report11 synthetic XLSX. **Only then replace** the previous UAT link and instructions in both READMEs. Do not ask Product Owner to test an old ZIP again.
4. Request one Owner combined visual and Report/Outlook UAT from the GitHub links. Write-related checks still require writable folder and actual corporate Edge/Excel testing, and report read-only results separately.

**No accepted UAT, main merge, spec rewrite, production workbook modification, or release is implied by this document.**
