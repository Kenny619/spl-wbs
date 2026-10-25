# Gantt Viewer — Approved Cursor Handoff v1.3

**Approval:** UI mock v17 is frozen and approved on 2026-10-25. **Source checksum (SHA-256):** `5e6f438fb3817e253984a806bb5bccd4d82f3f14e93d0d03e6eaf5ada2fb84d7`. Copy `UI_BASELINE_v17_FROZEN.html` into the project unmodified. This package supersedes v1.0/v1.1 documentation and the v1.2 addendum when conflicts arise.

## Contents
- `AGENTS.md` — mandatory rules and protected UI contract
- `01_PRD_v1.3.md` — unified product requirements and acceptance criteria
- `02_Excel_Data_Contract.md` — Excel mapping and data quality
- `03_UI_Design_Spec_v1.3.md` — frozen visuals and authorized data-load additions
- `04_Technical_Design_v1.3.md` — modular architecture, calendar algorithms, file access
- `05_Development_Plan_v1.3.md` — Cursor work phases and tests
- `06_Change_Log.md` — reconciled historical decisions
- `UI_BASELINE_v17_FROZEN.html` — immutable approved reference and synthetic-data demonstration

## Source-of-truth order
1. User's explicit latest approvals and this package's decision register (functional behavior).
2. Frozen v17 HTML for all visual geometry and aesthetics (not for data/access architecture).
3. PRD and detailed specifications; escalate contradictions rather than guessing.

**Important:** v17 is a **UI mock using synthetic data**, not evidence that Excel parsing, persistent file permissions, complete holiday accuracy, network reliability or external SharePoint links are production-ready. Do not ship the demo task list or demonstration URLs as real records.

## First Cursor task
Read `AGENTS.md` and every document. Verify baseline SHA-256 and capture a baseline screenshot. Implement Phase 0 only, with no visual modifications. Report tests and stop.
