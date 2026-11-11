# Shared Under Watch — architecture and cross-user integrity assessment, v0.1

**Prepared:** 2026-11-11 JST · **Status:** TECHNICAL OPTIONS / NOT approved storage design  
**Owner direction:** [WATCH-D01 A](https://github.com/Kenny619/spl-wbs/issues/25#issuecomment-6786902711): “One person's update needs to be visible by all project members.”  
**Other binding decisions:** WATCH-D02 A (Watch/Clear/Unknown; no invented RAG), WATCH-D03 A (minimal auditable resolution), MR-D01 B (Meeting Review must ship with real Watch), CAL-D01 A (blackout UI into Settings, session only). See [decision record](26_2026-11-11_FUNCTIONAL_RECONCILIATION_OWNER_DISPOSITION.md).

## 1. Critical architectural finding

The current Excel Managed Variant is **a local browser application**, using the File System Access API and **direct XLSX filesystem saves** plus source-hash preflight/reload/backup. Its `ProjectWBS` is authoritative only for the currently loaded workbook version. The existing managed source has **no verified authenticated shared Watch writer, distributed conflict lock, active shared project identity or cross-user notification/refresh**.

**A file being portable does NOT mean all project members read the same current version.** Merely storing Watch reasons in an XLSX sheet or a browser preference does not satisfy the owner's collaboration requirement if users work on different copies, if filesystem synchronization lags, or if two people concurrently update conflicting state.

Another integrity constraint: the future automatic schedule signals must use a **well-defined version of task source data**. If one user changes a due date in a local workbook while another sees an older workbook, one global Green/Watch decision cannot be truthfully derived from both without explicit source-version/staleness handling.

## 2. Candidate storage architectures

| Model | Visibility / benefits | Risks / gates | Design Office assessment |
|---|---|---|---|
| **A. Single shared canonical XLSX with new Watch metadata, managed through approved collaborative file API** | One source for tasks and Watch; portable backup | Requires a true shared writable document service/API, verified concurrency/version preconditions, workbook/schema change #3, shared credentials/permissions and safe multi-writer recovery; File System Access + optional local sync **alone is not sufficient** | Possible only if an authorized authoritative shared workbook service is identified; don't claim current app supports this |
| **B. Authenticated shared Watch register/service**, keyed by project ID and stable TaskID; XLSX remains planning task source | Strong independent actor audit and revision-aware shared reasons; clear cross-user read/refresh semantics; may avoid adding Watch sheets to frozen workbook initially | Requires separately approved network/data transmission/privacy posture, member identity and permissions, API/service deployment/operations; schedule-version reconciliation for automatic checks; failure/offline behavior | **Recommended technical direction for reliable cross-user Watch** if network policy and confidential-data requirements permit; not yet approved |
| **C. Local/browser Watch entries or alongside each local XLSX copy** | Low up-front complexity, potentially offline | Members cannot be guaranteed to see each other's records; local or sync conflicts risk lost updates, not a trustworthy shared register | **Reject as primary implementation** because it does not meet WATCH-D01 A |
| **D. Files in a synchronized shared folder without centrally enforced compare-and-swap** | Familiar folder access, little backend effort | Synchronization does not guarantee atomic multi-user writes, consistent reads or conflict-free audit; ambiguous ownership/latency; copies can diverge | Not acceptable as a validated collaborative solution until a concrete provider proves required semantics |

The above are architecture choices, **not an implied mandate to use any named vendor**. The existing project also preserves the no-upload/privacy guardrail; a network-backed design must obtain explicit owner permission with a concrete data flow.

## 3. Minimum collaborative data contract to freeze before coding

- **Canonical shared project identity:** stable unique `ProjectID` distinct from workbook filename, local path and UI-only report Project name; mapping to the canonical task source and member access. No existing approved field guaranteed for this.
- **Stable task association:** `TaskID` from `ProjectWBS.ID`; renaming/WBS edits must not rekey watch reasons. Reconciliation for deleted/duplicated tasks, new workbook copy/new project and provenance mismatch.
- **Reason ledger:** independently identifiable reasons, origin automatic/manual, actor, timestamps, evidence/source description, current state, linked accepted reference-commitment version and complete immutable event history. Separate reasons must not overwrite one another.
- **Cross-user visibility:** all authorized project members can retrieve the committed latest state; define freshness (e.g. refresh on open/reopen/manual refresh and bounded interval if approved), indication of last verified synchronization, conflict/errors and stale/unknown offline states.
- **Authorization:** who can add, update, resolve, and accept a revised commitment; role and membership mapping; avoid displaying sensitive stakeholder notes to unapproved users.
- **Concurrency:** ETag/revision/CAS and idempotent mutation IDs; concurrent edits to different reasons must merge safely, stale updates must be rejected with conflict feedback (never silent last-writer-wins). Persisted authoritative read-after-write verification.
- **Schedule truth:** shared risks cannot independently assert Green from a user-specific unsynced planned date; store/link the validated schedule source version / accepted reference and fall back to Unknown when incompatible or stale.
- **Timezone/history:** UTC instants and actor/source capture; display timezone alone may change. No fabricating prior risk episodes for imported projects.
- **Offline and availability:** read-only last-known state may be shown distinctly as stale, but never as current Green; queued changes require approved durability and reconciliation before a success claim. Failed save does not clear a watch reason.
- **Interaction with Reports 1.1:** frozen report contract allows independently verified RAG only from a supported real source. Do not inject remote notes/health into its outputs without explicit source/privacy review. Preserve existing v18 read-only SharePoint viewer.
- **Operations/security:** confidential content minimization, retention, deletion/export access, audit, backups, authentication, no accidental external publication and no server writes on view-only actions.

## 4. Architecture-specific validation gates

For **A shared canonical workbook**:
- Evidence of a true shared service with atomic version-conditional writes (not just synced folder copy), permission sharing, workbook lock/reload across two Edge profiles and original Excel app, safe Save As and external edits. Verify preflight/unknown-sheet fidelity and existing #2/#3/#4 audit logic after schema extension.

For **B shared Watch register**:
- Two distinct authorized accounts: actor A opens reason, actor B sees it on refresh; simultaneous distinct reason updates preserve both; stale same-reason update receives explicit conflict; authorized viewer cannot change it; rejected or offline write never appears as confirmed; current shared ProjectID and task source version are displayed/validated; revoking access blocks reads and writes. Include confidentiality and cross-network policy evidence before deploying.

For **either**:
- State transitions preserve reason history and Green prerequisites, failed/partial writes fail closed, no unintended task workbook changes, no automatic clearing from a revised finish date, and the final Meeting Review can accurately show active sources and status-based exceptions without mixing them up.

## 5. Genuine remaining owner architecture choice (only when ready)

**ARCH-D01 — Shared authoritative source and network policy.**

- **Option B1 (recommended if organizational policy permits):** a small authenticated **shared Watch register** for project-scoped Watch events and accepted commitments, with a documented minimal transmitted data set; keep existing workbook editing/save source untouched until a separate design authorizes task-source synchronization. This is a meaningful change to the app's current local-only/privacy posture and requires approval.
- **Option A1:** a single centrally managed **canonical project workbook** under an explicitly verified shared document service with conditional writes, concurrency and authorized access, extending the workbook contract through new specification approval.
- **Neither / needs environment validation:** if the required shared service or network path is not permitted, **do not claim WATCH-D01 is implemented**; return to feasibility before assigning Watch development. Browser-local/source copy is not an equivalent substitute.

**What requires confirmation from the Owner/IT before selecting one:** which organizational project-wide shared data store is supported/allowed, and whether project task identifiers and risk descriptions may be transmitted to it. Do not assume SharePoint, OneDrive sync, GitHub or a new SaaS endpoint is suitable simply because available in another context.

**No implementation, plugin/backend deployment, data upload, PR merge, new UAT kit, or security waiver was authorized by preparing this assessment.**
