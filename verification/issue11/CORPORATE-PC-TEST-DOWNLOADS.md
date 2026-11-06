# SPT-WBS Issue #11 — corporate-PC test downloads

**Use GitHub for every file needed on the corporate PC.** No sandbox downloads or ChatGPT-local file paths are required.

## 1. Desktop Excel fidelity check

Download the CI artifact [unit-diagnostics.zip](https://github.com/Kenny619/spl-wbs/actions/runs/42163242988/artifacts/13478115420) from GitHub Actions. Unzip it and open **issue11-exceljs-roundtrip.xlsx** with desktop Excel.

- CI generation SHA: `66ff0a1494f254e3396e1f1219ca46d9db9f23b1` (draft PR #18; closed unmerged).
- Workbook SHA-256: `bf25f74deb6f88baceba26d1c6d7a2dc3b59dfad09e9a53e5db353b96c327c11`.
- Check that Excel opens it without a repair warning, that `ProjectWBS!D2=45`, that `ProjectWBS!E2` shows two lines (Initial update and Follow-up), that `UpdateHistory` has an existing row plus two appended rows, and that `Reference!A1` is retained and bold.
- **Note:** This GitHub Actions artifact expires **2026-11-13 04:34 UTC**. If expired, regenerate through a test-only CI run and update this link before requesting another physical test.

## 2. Edge recovery (only after workbook check)

Download the standalone browser test harness directly from GitHub:
[SPT-WBS-Edge-Fingerprint-v2.html](https://github.com/Kenny619/spl-wbs/raw/6d7b3a2a864f91226a17f7840d79ba00dc216974/verification/issue11/SPT-WBS-Edge-Fingerprint-v2.html).

The HTML has both synthetic XLSX fixtures embedded; **no other files are necessary for this step**. Download the HTML rather than viewing it in GitHub, launch it from `file://` in Microsoft Edge, and use a **brand-new disposable empty folder**. Run the previously defined single **After source readback** interruption case, then its **read-only inspector** after refresh/restart. Never select a real project directory.

Standalone HTML SHA-256: `7d1f962b8b5f55134ae54a7ccfeecfbc36ed3c18b7d1831407c6b1cbc35f969a`.

## Evidence handoff

Send the Excel reopen result (repair warning: yes/no; field and history checks: pass/fail) and the Edge inspector log. No additional mock runs, owner smoke reruns or duplicate governance cycles are required.

**Scope:** test-only, synthetic data. Issue #11 stays open and #2 stays unfrozen. Do not merge these test materials to `main`.
