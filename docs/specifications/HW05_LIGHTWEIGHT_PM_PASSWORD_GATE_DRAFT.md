# SPT-WBS | HW-05 Lightweight PM Password Gate — Functional Authorization Specification

**Date:** 2026-11-17 JST  
**Status:** **Product Owner chose lightweight password-gated PM Mode for specification; this document is a DRAFT elaboration, not an implementation or schema authorization.**  
**Source:** [Issue #82 — Health/RAG/Clear](https://github.com/Kenny619/spl-wbs/issues/82); [HW-01 approved RAG taxonomy](https://github.com/Kenny619/spl-wbs/issues/82#issuecomment-6949427305).  
**Scope:** Excel Managed application, actions affecting recorded Under Watch reasons and assessed RAG health; no deployment or corporate identity claim.

## 1. Product decision and protection objective

- Provide a **lightweight, project-specific password gate** to limit casual or accidental health-state edits to the Project Manager and a small group entrusted with the project password.
- **Viewing** all task health, Under Watch reasons and history remains available without a password, subject to the user's existing ability to load the workbook.
- Restrict **Add**, **Resolve**, and future **Reopen** of manual Under Watch reasons, and future **manual RAG assessment/change**. Password authorization is checked at both the command entry and immediately before a guarded workbook Save. One successful unlock permits these actions only within an active, scoped PM Mode session.
- The gate **does not** change other currently permitted task editing or project settings actions by implication; those require separate authorization decisions if scope expands.
- This is **not** identity-verified RBAC, file encryption, or protection against editing the Excel workbook outside SPT-WBS. People with direct workbook write access or who modify/bypass the local app can evade this control. A shared password cannot identify who performed an action.
- Treat the gate as **workflow deterrence**, not enforcement of corporate user access policy. Strong enforcement would require workbook/file ACLs or trusted authentication and a controlled write service, separately designed and authorized.

## 2. Permission matrix (first implementation target)

| Operation | Locked / ordinary viewer | Unlocked PM Mode | Notes |
|---|---|---|---|
| Read Schedule, Task Detail, Watch counts/reasons and resolved history | Allowed | Allowed | Existing workbook-read conditions still apply. |
| Inspect reports and historical project audit | Allowed | Allowed | Reports remain read-only. |
| Add a manual Watch reason | Block | Permit via existing validated/guarded Save | Title required under existing policy. |
| Resolve an open manual Watch reason | Block | Permit via existing validated/guarded Save | Resolution details follow the separately approved lifecycle contract. |
| Reopen a resolved manual Watch reason | Block | Permit **only if later lifecycle implementation is approved** | Reopen does not exist in the current frozen operation contract. |
| Enter/change an assessed RAG value | Block | Permit **only if later HW-02/HW-03 policy and schema are approved** | RAG assessment editing is not yet implemented. |
| Read automated health/schedule signals | Allowed | Allowed | Signals do not gain privileged authority from PM Mode. |
| Change unrelated task fields, calendar or existing Settings | Unchanged from existing permissions | Unchanged | Outside HW-05; do not accidentally lock all workbook editing. |
| Edit Excel directly outside the app | Not technically prevented | Not technically prevented | Must be disclosed in UI documentation. |

## 3. User experience and authorization flow

**PM Mode states:** `Locked` / `Unlocked for this project` / `Unlock unavailable`. These are access/session states, **not RAG health statuses**. Do not revive `Unknown` or `Clear` as health badges. If health data cannot be verified, report that assessment is unavailable; never synthesize Green.

1. Opening a workbook defaults to **Locked**, with read-only Watch/RAG inspection available. Sensitive actions show a concise locked indicator and an accessible **Unlock PM Mode** action; do not mislead the user that a disabled button is a file-access error.
2. Unlock requires the configured project password. On success, enable only scoped sensitive actions and announce the unlocked state. Do not claim a user identity or administrator role was verified.
3. Failed password leaves the session locked, does not write workbook data, does not reveal any password or verifier, and provides a generic accessible error message. Introduce bounded attempt throttling in the app as a usability deterrent, **not** a claim of brute-force-resistant security.
4. Provide explicit **Lock PM Mode**; automatically lock on application/reload/session restart, workbook change or source-identity change, and after a proposed **15 minutes of inactivity** (value subject to implementation/UX review). Switching from Project A must never carry an unlock into Project B.
5. If automatic locking occurs during an unsaved form, keep the draft visible if safe but block submission until the same project is unlocked again. Then revalidate source hash, reason state, permissions and standard Save preflight. Never silently Save or discard a draft because of a lock transition.
6. `Cancel`, `Discard`, Save conflict/backup/recovery and existing unsaved-change protections retain their accepted semantics. Unlocking does not override folder-picker permissions, read-only mode, stale-source checks, another writer's changes, or recovery holds.
7. Do not preserve unlocked access across browser or app restarts. Avoid single-character shortcuts; use the existing accessible interaction pattern and ensure keyboard/focus/contrast behavior.
8. For a project with no configured password verifier, **do not silently grant edit access**. Present `PM Mode not configured`; initial provisioning must be an explicit owner-controlled setup step (design pending), not a default password.

## 4. Password provisioning and storage: constraints, not implementation approval

- No password, reusable secret, or secret-derived bypass token may be hard-coded into distributed HTML/JavaScript, source control, test fixtures using real credentials, application logs, URLs, query strings, analytics, localStorage or sessionStorage.
- **Never store the password in plaintext in the workbook.** If a browser-local verification design is chosen later, use a random per-project salt and a reviewed, slow password-verification derivation; clear the entered secret promptly. A verifier or hash is **not** equivalent to strong authorization: it can be copied or attacked offline and client-side enforcement can be bypassed.
- A single password shared by a small group cannot individually authorize or revoke users; rotation replaces the shared secret for everyone. All such audit actor labels remain **unverified local editor** unless separate authenticated identity is later delivered.
- **Provisioning location is unresolved**: (A) a project-scoped verifier in an explicitly approved, backward-compatible workbook extension, or (B) a separately provisioned per-device/per-project local configuration with no claim of cross-device synchronization. Compare both for usability, exposure and portability before design freeze. **Do not modify the frozen five-sheet ProjectData v0.1.2 contract now.**
- Specify owner-controlled first-time setup, password change/rotation, forgotten-password recovery without hard-coded backdoors, optional local reset, shared-password distribution, and loss-of-device/compromise handling in a later bounded security/UX review. Reset must never silently delete Watch history or restore a Green assessment.
- Using filesystem/share ACLs to restrict physical Excel writes is an **optional compensating control**, not implied by this selected lightweight approach.
- Implementation must be tested in the actual approved personal Windows/Edge mode and later in any separately authorized localhost distribution; no assumption that browser password gating solves corporate `file://` restrictions.

## 5. Record, lifecycle and audit invariants

- Existing **Open/Resolved reasons are factual workbook records** and historical records must be preserved, not deleted or overwritten to hide a past issue.
- HW-01 defines **Red** as an issue with project impact even after underlying issue resolution; **Amber** as an observed risk with potential impact; **Green** as no observed issue/risk. A password unlock does not determine health, imply Green, or settle outstanding HW-02/HW-03 calculation and resolution policy.
- Any eventual Reopen operation requires its own approved state transition and guarded workbook transaction; reopening must preserve the original Open/Resolved trail and show a new recorded transition rather than editing history away.
- Multiple reasons remain independent. Resolving one must not silently resolve another. A permitted password-gated Save still checks the exact reason state, workbook source/version, conflict/no-op rules, backup and post-save verification.
- Record transaction identifiers and timestamps in the existing audit model only as actually observed. **PM Mode unlocked** may be reported as local UI state, but **must not be promoted to authenticated user identity**, verified reviewer approval or proof of direct workbook write restrictions.
- Preserve read-only Viewer behavior and the approved synthetic/workbook fidelity; do not change the frozen Report 1.1 semantics or rewrite historical periods.

## 6. Acceptance scenarios (future implementation scope only)

| ID | Focus | Required outcome |
|---|---|---|
| AUTH-01 | New project loaded; view locked | Watch/RAG facts and history visible, mutation controls blocked with accessible unlock affordance. |
| AUTH-02 | Incorrect password / no verifier | No mutation, no unlocked state, generic feedback; no secret persisted or logged. |
| AUTH-03 | Correct password, one project | Scoped Add/Resolve permitted only after source and Save guards pass. |
| AUTH-04 | Project switch / reload / idle / explicit Lock | Returns to Locked; no access leaks into another workbook. |
| AUTH-05 | Idle lock with unsaved Watch draft | No automatic Save or discard; re-unlock and revalidation required before commit. |
| AUTH-06 | Save conflict / recovery hold / read-only source | Password does not bypass existing hard blocks, backups or integrity protection. |
| AUTH-07 | Resolved-only / multiple open reasons / future Reopen | No automatic Green or loss of history; independent reasons preserved; unimplemented operations remain unavailable. |
| AUTH-08 | Future manual RAG change | Same password gate; no unauthorized RAG write and no conflict with HW-01 Red persistence. |
| AUTH-09 | Audit, actor and credential review | No verified identity claim; no plaintext secret; no credentials in logs, workbook or local storage. |
| AUTH-10 | Direct Excel edit and modified app negative test | Explicitly document that the lightweight gate **cannot** stop bypass; never report an enterprise enforcement PASS. |
| AUTH-11 | Legacy/future-version, mismatched project or missing policy config | Safe locked/no-new-write behavior; no forced migration or fabricated health state. |
| AUTH-12 | Personal Edge, responsive keyboard and read-only Viewer | Accessible lock/unlock and labels; existing Stage A/B behaviors and report outputs preserved. |

## 7. Open design choices before implementation authorization

These are **not** approvals or blockers to continue other Stage B work.

1. Select and separately approve the **verifier provisioning/storage** path and any exact workbook format change; supply a compatibility/migration and backup plan if workbook-based.
2. Confirm password rotation/recovery ownership, bootstrap ceremony and whether the suggested 15-minute idle timeout is appropriate.
3. Decide later whether other **existing TaskStatus edits** require the same gate (not implied by this decision).
4. Finalize the independent HW-02/HW-03 RAG assessment and issue-resolution transitions; define what a protected RAG edit actually persists and how reports show it.
5. Confirm the separate target security posture for any corporate rollout; the PM password gate alone cannot certify user authorization.

## 8. Governance and change boundaries

**Approved:** HW-05 authorization *direction* is a lightweight PM password gate for Under Watch Add/Resolve/Reopen and future RAG edits, accepting its bypass and non-identity limitations. **This document is a draft functional elaboration** and may be refined within Issue #82.

**Not approved:** runtime code, credential/verifier creation, workbook/schema migration, new Reopen/RAG implementation, modified audit trust semantics, changes to frozen Report 1.1, release, merge, corporate security attestation or beta. Keep design discussion separate from implementation and preserve all existing owner-accepted behavior.
