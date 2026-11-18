# SPT-WBS | HW-05 PM-Gated Manual RAG Editing — Security and Authorization Design Draft

**Status:** **TECHNICAL DESIGN DRAFT — NOT FROZEN, NOT IMPLEMENTATION AUTHORIZED**, reconciled 2026-11-18 JST.  
**Binding business requirements:** [HW-FUNC-1.0 — owner-frozen manual RAG](https://github.com/Kenny619/spl-wbs/blob/docs/health-lifecycle-decision-vectors/docs/specifications/HEALTH_LIFECYCLE_FUNCTIONAL_FREEZE_CANDIDATE.md) / [Issue #82](https://github.com/Kenny619/spl-wbs/issues/82).  
**Supersession:** old Under Watch Add/Resolve/Reopen, Clear, reason-lifecycle and auto health proposals are **out of target scope**. Product Owner confirms **no active Watch data**. Preserve accepted existing workbook/audit bytes without dedicated Watch migration. This document specifies only **future PM controls for RAG editing** and possible deployment architectures.

## 1. Fixed user-facing policy and trust boundary

- Every valid WBS Task, Milestone and Summary defaults **Green**. Only an authorized PM may manually set **Amber**, **Red**, or return to **Green**. No automatic TaskStatus, Overdue, near-finish, dependency, Report or Watch input may change RAG.
- **On entering/changing Amber/Red:** require two separate nonblank inputs: **Project Impact** (actual/potential consequence) and **Path to Green** (actions and conditions required to restore Green). **On manually returning to Green:** require substantive **Resolution** describing completed remediation. Same-state selection is a no-op.
- Persist current PM RAG and entered fields as project-wide workbook data. Each valid transition preserves WBS item ID, previous/new RAG, actual Impact/Path or Resolution, event timestamp and provenance in a complete non-destructive audit.
- A shared PM password controls a **user interface/workflow**. It does **not** establish personal identity, prevent direct Excel edits or enforce rights against someone modifying the client. Do not claim enterprise authentication. Viewer permission to read remains independent of any PM unlock.
- Do not change the business policy due to technical architecture: **RAG is always manual**, even when schedule/effective TaskStatus is calculated.

## 2. Access-control strategies to compare before code authorization

### A. Recommended for later corporate delivery — PM-only localhost writer + read-only Viewer

1. **PM-authoring app** runs on approved Windows PC as Node.js process bound to **loopback** (127.0.0.1), with Edge accessing `http://localhost`. Server handles folder/file access, guards workbook writes, performs actual PM authorization before mutation and emits audit only after successful save. Restrict writable workbook paths to owner-controlled location.
2. **Read-only Viewer** is a separate bundle or strict server-enforced read-only mode with **no write endpoint**. Ideally open a workbook copy with OS/network-folder read permissions. Any viewer-specific local preferences (theme, visible columns, PGCM display) remain user-local; shared RAG/task data remain in workbook.
3. Secure localhost: check request **Origin** and `Host`; prevent cross-site requests (CSRF); avoid permissive CORS; keep process loopback-only; reject unexpected file paths; avoid privilege escalation, untrusted uploads, secrets in logs and unsafe local APIs. Windows filesystem/network share **ACLs** offer the strongest practical additional control on who can mutate the shared workbook.
4. Choose and approve a verifier/auth approach **on the server**, not in distributed static JavaScript. A shared PM password remains a shared secret and does not identify individuals. If per-person traceability becomes mandatory, use an authenticated identity mechanism later.
5. This is **recommended architecture only**, NOT authorization to build a second app, server, credential, or packaging variation during Stage B. Earlier corporate Edge `file://` picker restrictions make this attractive, but do not justify premature divergence before common features stabilize.

### B. Interim app-only PM Mode for an existing Excel-managed HTML client

- Password unlock can deter accidental RAG edits, but local source-code tampering or Excel file direct editing bypasses it. Do **not** label this a secure authorization boundary.
- If provisioned later, avoid embedded passwords, static client secrets, default credentials or plaintext in workbook/storage/URLs/logs. A locally held verifier can be attacked offline. Restrict any unlocked session to one workbook and revalidate source just before a guarded Save.
- Suitable only if the owner **explicitly accepts bypass risk** for the actual deployment. A read-only UI is not the same as a read-only Excel file.

**Recommended direction:** design common RAG forms, workbook transactions and history so either packaging model can use them, but defer deployment split and credential decisions until the already planned later architecture phase.

## 3. PM authorization and Save workflow

| Operation | Viewer / PM Mode locked | Authorized PM mode | Audit/write |
| --- | --- | --- | --- |
| View WBS, recorded/effective TaskStatus, current RAG, saved Project Impact/Path to Green/Resolution, and history | Allow (subject to file-read access) | Allow | No write |
| Filter/sort, see schedule exceptions and generate read-only reports | Allow | Allow | No write |
| Manually set Green → Amber/Red | Block | Permit after **both** Impact and Path to Green pass mandatory checks and guarded Save | Append one committed event |
| Manually change Amber ↔ Red | Block | Permit with **updated** Impact and Path to Green; retain older versions | Append one committed event |
| Manually set Amber/Red → Green | Block | Permit with mandatory **Resolution** and verified guarded Save | Append one committed event; preserve prior Impact/Path |
| Set RAG to its existing value | No write | No write | No invented audit |
| Change non-RAG task fields | Existing independently approved rules | Existing independently approved rules | Normal existing audit only |
| Directly edit Excel outside app | Not prevented by app-only password | Not prevented by app-only password | External editing may bypass app; file ACLs may restrict |

**Recommended session states** for design: Locked, Project-scoped Unlocked, Configuration unavailable (these are not health statuses). Default to Locked on open/reload, source identity change, workbook change or process restart. Provide explicit Lock action. A proposed 15-minute idle relock is **not owner-approved**; test usability later. Upon idle lock while draft exists, do not automatically commit or discard; block submit until re-authorized, then revalidate source and any conflict.

**No-op / invalid states:** whitespace-only Impact, Path or Resolution, missing verifier, incorrect password, unsupported schema, stale source, another writer, read-only/folder permission failure, backup/recovery hold or unsaved conflicting state must **not** produce a status change, partial field write or false success. If the user simply cancels, retain saved state untouched.

## 4. Credentials, identity and recovery — choices pending

The Product Owner approved a **lightweight PM password-gated direction** previously, but **has not approved** where the verifier lives or the two-app architecture. These remain architecture decisions:

1. **Project-scoped verifier** stored under a separately approved backward-compatible workbook extension, enabling consistent unlock across authorized PM devices. Risk: verifier may be copied, modified and attacked offline; static browser implementations can be bypassed.
2. **Device-local verifier**, with separate PM provisioning per device and risk of inconsistent access.
3. **Server-side verifier / OS-backed permission** for the recommended PM-only localhost writer. Keeps verifier out of shipped static HTML and can bind workbook writes to the PM process, but still does not prove personal identity if credentials are shared.

Specify secure initial provisioning, recovery, rotation, session expiry, process restart, compromised device response and password distribution before implementation. No real credentials, verifier, default password or recovery backdoor may be created by this document. Do not assume corporate account/SSO integration exists. Document any audit actor as **unverified** unless genuine authenticated identity is introduced.

## 5. Shared workbook and audit integration prerequisites

- Future authorized **versioned schema** must hold per-item manual RAG and current Project Impact/Path to Green as applicable; transition audit must preserve every prior Impact, Path, Resolution, old/new RAG and event date. Only a later approved writer knows the exact columns/tables.
- Existing accepted five-sheet **ProjectData 0.1.2** and Stage A WatchReasons/ProjectAudit bytes remain untouched until an independently authorized implementation. No active Watch record conversion/backfill or special Watch viewer is necessary.
- Preserve strict workbook validation, path/project identity, conflict detection, backup and rollback. No browser-local RAG state; user-specific display preferences stay local.
- Any future versioned Report 1.1 delta may read the current RAG and period-valid transitions, but never derive RAG from TaskStatus, schedule signals or legacy Watch. Frozen current Report 1.1 is unchanged.

## 6. Focused future verification (NOT EXECUTED)

| ID | Scenario | Expected result |
| --- | --- | --- |
| AUTH-01 | Load valid new/legacy WBS with no manual assessments | Green default, PM Mode locked, read-only RAG visible |
| AUTH-02 | Unlocked PM tries Green→Amber with missing Impact or Path | Reject, no Save/audit and accessible field-specific validation |
| AUTH-03 | Unlocked PM sets Green→Red with both required texts | Guarded Save commits Red, fields and one audit event |
| AUTH-04 | PM manually changes Red→Green with valid Resolution | Current Green, Resolution saved; earlier Red and Impact/Path retained in audit |
| AUTH-05 | Missing/invalid password, verifier or unauthorized client | No unlocked state and no mutation; no secret stored/logged |
| AUTH-06 | Workbook switched, reload/restart, idle lock or explicit Lock | Session reverts to Locked; no cross-workbook access leak |
| AUTH-07 | Lock while form unsaved | Draft not silently saved; reauthorize and revalidate before commit |
| AUTH-08 | Concurrent writer, stale source, backup failure or read-only file | Fail closed; no partial write or fabricated audit |
| AUTH-09 | Effective At Risk, Overdue or inherited Blocked changes | No automatic RAG change, regardless of PM Mode |
| AUTH-10 | Read-only Viewer on future split architecture | No RAG write affordance **and** no writable endpoint; workbook ACL restrictions tested where configured |
| AUTH-11 | Attempt direct Excel/client bypass of an app-only gate | Disclose that app-only password is bypassable; never claim verified user identity or enterprise access security |
| AUTH-12 | Previously accepted workbook without active Watch records | No special Watch migration; historical workbook content preserved without false Red/Amber mapping |

## 7. Governance and scope

**Owner-approved and frozen business requirements:** [HW-FUNC-1.0](https://github.com/Kenny619/spl-wbs/issues/82): manual PM-only RAG; required Project Impact/Path to Green on Amber/Red; Resolution on return to Green; shared workbook and complete audit; TaskStatus independent; Under Watch/Clear retired as future concepts.

**Still requires a genuine later decision:** verifier placement/bootstrap/recovery; choice of app-only vs localhost writer/readonly viewer security architecture; exact schema and Report 1.1 delta; deployment/corporate security posture. Defer optional idle-lock timing and other UX details to focused testing.

**No authorization to implement:** this PR is a **draft, technical design proposal only**. No credential creation, schema edit, production/localhost deployment, protected-main merge, replacement of accepted Watch feature, release, beta or new security attestation is allowed solely by this document. Avoid redundant Stage A QA/CI; once authorized, test the affected security and RAG lifecycle paths proportionately.
