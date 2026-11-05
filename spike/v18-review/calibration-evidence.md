# Capture calibration — synthetic localhost diagnostic

2026-11-05, Linux Chromium; this is not Windows/Edge file-system or visual UAT.
The identical pinned reference was loaded twice with the same synthetic input,
clock, viewport, animations disabled and caret hidden.

| Capture | Different pixels | Ratio | Existing 0.001 limit |
|---|---:|---:|---|
| Same reference, 1440 default | 0 | 0 | Pass |
| Same reference, 1024 default | 0 | 0 | Pass |
| Same reference, detail | 19 | 0.00001466 | Pass |
| Known different product/reference, 1440 default | 112,551 | 0.07472315 | Fail |

Raw byte equality flagged the tiny same-reference detail difference; image
inspection bounded it to a small edge region rather than a changed detail layout.
The final comparator therefore preserves the existing 0.001 different-pixel
ratio. It counts every differing RGBA pixel, without perceptual color/anti-alias
suppression, and attaches actual/reference/difference images and metrics. PNG
parsing uses pinned test-only pngjs 7.0.0; no product dependency/import changed.
An active browser capture-control test exercises identical-reference default
1440/1024 and detail states alongside the fourteen product/reference comparisons.

These controls validate the diagnostic mechanism, not product conformance.
Independent QA and PO visual UAT remain outstanding.
