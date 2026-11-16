# Stage B #17 — compact header and informational notice accessibility: implementation/QA contract

**Status:** draft engineering handoff, 2026-11-17 JST. No new owner acceptance. Base: protected main `8a511472322966d06e5a99df1bec73f076ac430b` (accepted B2/B3 integrated). Visual reference: accepted DES-012 Review08 only.

## Scope and boundaries

Improve the remaining everyday-usability header and *informational* notice affordances without changing B2/B3 Needs Attention or origin-typed urgent notice behavior. Keep Save-not-verified/recovery/conflict and unsaved draft warnings visible, nondismissible where applicable, and never infer RAG/Clear/Green. No workbook schema or project data write. Do not alter PGCM preference (Issue #16) or the read-only viewer.

## Implementation slices (separate focused changes)

1. **Header density:** retain project identity, active workbook/save state, and primary navigation; move only secondary explanations into an explicit, keyboard-reachable disclosure. Avoid hiding critical state in hover-only UI. Preserve DES-012 hierarchy and no overlapping text at 860/1366/1440px.
2. **Informational notices:** show concise accessible summary and an explicit “Details” disclosure for longer provenance; preserve complete original text on demand. Information may be dismissible only when its source permits it. Do not duplicate urgent severity text in ambiguous Playwright selectors; scope by semantic region.
3. **Actions and reading order:** make actionable notices real buttons/links with descriptive accessible names; Enter/Space activation, Escape closing where appropriate, focus return to trigger, no automatic focus theft on notice refresh. Use live-region announcements only for *new or materially changed* urgent events, not each render.
4. **Overflow:** long filenames, project names, multiline error explanations and 200% browser zoom must wrap/scroll without obscuring Save/recovery controls or producing horizontal page clipping.

## Focused independent QA matrix

| ID | Fixture / action | Required observation |
| --- | --- | --- |
| H17-01 | 860px, 1366px, 1440px; light/dark | Project identity, save state and navigation remain visible; no overlapping controls |
| H17-02 | Keyboard Tab/Shift+Tab through header and notice disclosure | Logical reading/focus order, visible focus indicator, no keyboard trap |
| H17-03 | Long fictional workbook filename and 2–3-line informational notice | Full text accessible through disclosure; wrapping does not mask urgent notices |
| H17-04 | Edit fictional task title, then cancel/undo | Unsaved warning lifecycle stays correct; typing focus remains in editor |
| H17-05 | Synthetic Save failure / recovery / permission warning | Critical/warning source and priority remain intact; no inappropriate dismiss action |
| H17-06 | Repeated unchanged notice refresh | No duplicate live announcement or stacked duplicate notice |
| H17-07 | 200% zoom and reduced-motion preference | Controls usable, no motion-dependent disclosure |
| H17-08 | Read-only viewer smoke | No regression in existing viewer navigation/notice layout |
| H17-09 | Synthetic workbook byte comparison before/after UI-only interactions | No project workbook mutation |

## Acceptance and release boundaries

Targeted local browser/unit verification first; run only tiered exact-head CI required by risk. Independent QA must record exact SHA, tested viewport/browser, and any exception. New user-facing changes require focused Product Owner acceptance before Stage B #17 is marked accepted. Do not rerun Stage A or accepted B2/B3 UAT. No protected-main merge or beta/corporate release authorized by this document.

## Collision avoidance

Before coding, inspect active Stage B #17 branches and PRs, plus #80/#85 PGCM and merged #92, and isolate implementation from concurrent writers. This file is specification/QA groundwork only, not evidence that any test passed.
