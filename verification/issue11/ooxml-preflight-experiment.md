# Issue #11 — OOXML compatibility preflight experiment

**Execution:** 2026-11-06 JST, Linux Python 3 standard library, synthetic fixture only. **Test-only; not production implementation.**  
**Status:** 5/5 expected classifications in a self-authored diagnostic harness. This is exploratory feasibility evidence, **not independent QA sign-off** or a workbook supported-feature allowlist.

## Inputs and observations

Input: `FS04-PERMISSION.xlsx` synthetic workbook from the previously published Phase 2 pilot, treated as a ZIP container with 8 OOXML entries. The probe never writes user workbooks and performs no ExcelJS serialization.

| Input | Preflight decision | Finding |
|---|---|---|
| Unmodified synthetic Phase 2 workbook | PRELIMINARY_CANDIDATE_ONLY | Only known simple parts present; this is **not** a safe-to-save certification |
| Add `customXml/item1.xml` | BLOCK | Unknown OOXML part not on proposed allowlist |
| Add `xl/charts/chart1.xml` | BLOCK | Advanced chart package part |
| Add worksheet formula node `x:f` | BLOCK | No verified formula-cache recalculation policy |
| Truncate ZIP central directory | BLOCK | Invalid archive |

Detections were confirmed through Python `zipfile` and `xml.etree.ElementTree`: part-name inventory, well-formed XML, formula-node scan, and archive-open verification. No original project data was used.

**Important limitations:** The probe has an intentionally narrow, example-only allowlist; it does not resolve OOXML relationships, content-type integrity, style references or cross-part semantic consistency comprehensively. A syntactically valid ZIP with basic known parts could still be unsafe. XML-level modifications are artificial and are not Excel-authored fidelity fixtures. Passing this probe would never justify allowing Save.

## Next technical QA gate (no further owner smoke reruns)

1. **FS-10:** Establish independent Excel-authored fixture matrix, including tables, styles, formulas with stale caches, validation, names, shared strings, preserved unrelated worksheets, charts, pivots, links, `customXml`, protection, metadata and unsupported parts. Record a formal **supported allowlist** only after ExcelJS read/serialize/reopen plus Excel desktop validation. Expect unknowns to block both direct Save and Save As.
2. **FS-08/09:** Implement *test-only* fault injection models (not production app), run three consecutive synthetic saves, rotate a single same-folder backup, and interrupt before/after backup creation, close, verification, rotation and source readback. Save the full bytes/hashes and avoid overstating physical power-loss safety.
3. **FS-06/07/11:** Independently review Excel-open lock limitations and race windows, test conflicting-source Save As provenance and verified active-handle switch using disposable files; no magical guarantees about Excel locks or atomicity.
4. **Independent QA:** Reviewer who did not author these tests inspects exact SHA, environments, logs and failures. The approved architecture and frozen v18 UI remain untouched.

## Governance

Approved: EMV-ARCH-1.0 direction and earlier DEC-EMV-002-01 through -11. **Not yet approved:** final supported workbook contract, final residual guarantee decision or architecture freeze. Issue #11 remains open and Issue #2 open/unfrozen. No product implementation, PR merge, deployment or release authorization.
