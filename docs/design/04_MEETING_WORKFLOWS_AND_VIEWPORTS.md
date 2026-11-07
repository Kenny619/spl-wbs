# SPT-WBS Office Meetings: Workflows, Display Targets & Information Budget — proposed 0.2

**Date:** 2026-11-07 JST · **State:** PROPOSED / not approved · **Controlling:** Issue #25, PR #29 · **Source:** Product Owner office-meeting workflow feedback in design discussion.

## Established user needs (Product Owner feedback)
- Corporate-office users **mostly edit on laptops**.
- Review may occur on the same laptop screen, a conference-room monitor or in a video-call screen share.
- In a **weekly status meeting**, the review follows **exceptions first across the project**, then **workstream-based regular review**. Exceptions are **flagged and prioritized before the meeting** to allocate maximum discussion time to important items. Within workstreams, WBS order naturally groups related tasks, so hierarchy should be retained rather than replaced by a disconnected flat list. After the exception phase, participants review updates and **entity data integrity** (accuracy/completeness of dates, status, owner, records). Staff commonly append time-stamped updates and may change planned dates, status and owner live. Creating new tasks live is **rare** because it disrupts meeting flow; notes may be taken separately for later entry.
- In **management and leadership meetings**, live changes are less frequent. The main purpose is presenting progress, the next milestones and flagged risks.

## Design interpretation: two audience-oriented experiences
### W1 — Working Review
**Goal:** prepare a prioritized exception agenda, discuss exceptions first across workstreams, then continue workstream-by-workstream WBS review and data-integrity checks, safely updating selected existing tasks *without leaving discussion context*.

**Candidate capabilities, not implementation authorization:**
- **Two complementary navigation paths, one underlying project model:** a prioritized cross-workstream Exception Review queue and a workstream-organized WBS Review. After exceptions, preserve native WBS hierarchy inside each workstream; provide selected task focus, clear Gantt context and predictable next/previous navigation within the active phase.
- **Pre-meeting preparation** (proposed interaction, not an approved feature): show flagged exceptions and allow prioritization before the call. The *definition of a flag* and how it is entered remain an open question. Existing 'Needs Attention' data (At Risk/Blocked and overdue) is an initial source of candidates, but it must not be conflated automatically with the user's curated meeting exceptions or risk prioritization.
- **Exception Review stage:** allocate early meeting time to prepared, cross-workstream exceptions. Show task identity, its workstream/parent path, reason for flag and discussion priority; drill into the same selected-task panel as the routine WBS review.
- **Workstream Review stage:** move through workstreams and their hierarchical WBS tasks; identify tasks already discussed during Exception Review to avoid repetition, but leave them accessible for further updates.
- **Integrity & Closure stage:** check missing or inconsistent owner, status, dates, progress and update history, and verify explicit save/unsaved states. Define actual integrity rules against the product's data contract, not by inventing arbitrary defaults.
- **Distinguish schedule status and meeting review state.** 'Reviewed in this meeting' is not 'Completed' and must not overwrite TaskStatus. Meeting-only progress may be temporary UI state or a separately approved data contract—not automatically a new persisted Excel column.
- An immediately usable selected-task panel emphasizing **append update**, **status**, **planned dates**, **owner** and **visible save state**. Long historic updates readable without swamping editing space.
- A contextual timeline rather than necessarily a full simultaneous dense grid, Gantt and editor at every viewport. Consider docked detail pane / resizing / focus mode concepts.
- Show draft/committed distinctions, Save/Discard/Cancel protections and workbook conflict/recovery messages consistent with the frozen managed contract. Do not add silent auto-save or multi-task batch-save behavior without separate approved requirements.
- New task creation remains accessible outside the review's fast path, rather than a large always-present primary action. Capture outside-meeting notes is not an assumed product feature.
- Avoid full-screen modal churn or loss of task position for frequent edit cycles.

### W2 — Leadership Briefing
**Goal:** convey overall progress, next milestones, active risk/blocked exceptions and decisions with low explanation cost.

**Candidate capabilities, not implementation authorization:**
- Selective executive summary: 2–3 actionable indicators, approximately 3–5 upcoming milestones, 3–5 attention-worthy issues (budgets flex with data).
- Larger labels and rows, simplified Gantt time horizon, explicit focus/highlight, reduced editing chrome, no color-only status interpretation or hover-only explanations.
- Drill down from a highlighted risk/milestone to the associated task without losing the leadership context. The capability to edit remains obtainable but is not visually dominant.
- Compare a separate presentation/review focus with adaptable density in a shared workspace; a mere browser fullscreen toggle is not the entire solution.

## Recommended three-stage weekly review choreography — **design hypothesis**
1. **Before the call:** flag candidates, verify which items are true exceptions, order high-impact topics first, and prepare the meeting agenda.
2. **Start of call — exceptions:** review prioritized cross-workstream items first; save updates to the same underlying task records. An issue remains in its normal workstream position.
3. **Regular call — workstreams:** review entities grouped by their existing WBS workstream structure, with previously discussed items visibly distinguishable but not hidden without the user's choice.
4. **Closure — integrity:** review record accuracy/completeness and any pending unsaved work; capture post-meeting tasks as external notes unless and until a new capture feature is approved.

A 'reviewed in this meeting' marker, agenda queue and per-meeting persistence are **concepts requiring separate product decisions**, not an assumed part of the Excel workbook or audit history.

## Candidate resolution and sizing targets — **not approved tokens**
Resolution should be treated as **effective application content viewport**, not only physical monitor pixel count.

| | Working Review candidate | Leadership Briefing candidate |
| --- | --- | --- |
| Logical target to mock | 1366 × 768 (plus 1024×768 constrained and 1440×900) | 1280 × 720 usable 16:9 canvas |
| Preferred screen-share output when supported | 1920 × 1080 | 1920 × 1080 |
| Important task text | 15–16 CSS px | 20–24 CSS px |
| Secondary text | 13–14 CSS px | 16–18 CSS px |
| Section headings | 18–20 CSS px | 24–28 CSS px |
| Standard row | 42–48 CSS px | 52–64 CSS px |
| Main summary value | 24–28 CSS px, when shown | 32–40 CSS px |
| Visible list budget | ~8–12 rows (context-dependent) | ~5–7 featured items |
| Columns in primary view | ~4–6 with editable details | ~3–4 essential |

**Source grounding:** Microsoft Teams large-meeting guidance recommends 1920×1080 sharing and full-screen presentation; this does not ensure a 1080p viewport is visible to every attendee. See https://support.microsoft.com/en-au/teams/meetings/tips-for-presenting-in-large-meetings-and-events-in-microsoft-teams .

**Not standards:** all table values above are **hypotheses for holistic mocks** and usability review; no numeric font, row, KPI or visible-item budget is frozen. Reassess at Windows 125%/150% scaling, browser zoom, actual shared-window sizes and actual audience viewing distance. Distinguish OS physical pixel resolution, browser CSS viewport and video-stream received display.

## Visual hierarchy, focus and meeting choreography
- The reviewed item's **Task/WBS identity, status, planned finish/date, owner, and update** should be legible to remote attendees. It is acceptable for peripheral rows to be smaller if their purpose is navigation rather than audience reading.
- After prioritized exceptions, the presenter works through WBS entities by workstream. Preserve native hierarchy and make the next reviewable task obvious. Provide a predictable return path from an exception to its regular workstream position without losing selected task, filters or prior discussion context.
- During live edit, keep the selected task, unsaved/committed state and source file identity visible. Avoid implicit saves, hidden changed values and jumping the scroll unexpectedly.
- When the audience changes (working group → management), suppress irrelevant controls and elevate milestone/risks; do not rely solely on zooming the same dense grid.
- Switching experience should preserve the same underlying project file, selected task, filters and timeframe where sensible. Any necessary visible change must be predictable, with a clear way to return.
- For meetings, **sharing a single app window** may avoid unrelated desktop content, but specific videoconferencing-platform behavior and corporate policy should be validated rather than assumed.

## Visual design and user-validation experiments
1. **Working laptop (1366×768 content)**: prepare and prioritize five cross-workstream exceptions, discuss them first, then visit two workstreams in WBS order, avoiding accidental re-review of discussed items; append three updates, change date/status/owner, check integrity, inspect history and save safely. Measure time, switching overhead, missed tasks, duplicate discussion, interruption frequency and error rate.
2. **Constrained laptop**: compare editing with contextual pane, resizing/splitting and alternative details layout; verify no hidden/unreachable Save or task identity.
3. **Leadership 1280×720**: identify current progress, next three milestones and active top risks in under a short, experimentally established time; trace an issue to a schedule task and back.
4. **Room monitor**: have a viewer at realistic meeting distance read selected task, date and risk while the presenter changes focus; test whether essential text remains intelligible.
5. **Video call**: test real screen sharing at 1920×1080 output with a reduced effective attendee frame, e.g. approximately 960×540, and compressed imagery. Evaluate whether labels, risk markers and focus remain distinct without hover.
6. **Accessibility**: test browser text resize/zoom (WCAG 2.2 AA), keyboard operation, focus restoration and a zoomed data grid. Non-grid content should reflow; the grid/timeline has a documented two-dimensional-layout exception where needed.

## Design questions for next dialogue
- **What exactly qualifies as a pre-meeting exception flag and how is it recorded today?** Determine whether flags are manual, based on statuses/due dates, or a combination before introducing any new field or queue.
- For live changes, should we optimize for frequent individual saves (current explicit Save contract) or introduce a later separately specified meeting session? **No behavior change is assumed.**
- Which leadership questions are repeatedly asked (missed commitments, upcoming deadlines, blockers, program-level changes), and which numbers or date windows best answer them?

## Important scope guardrail
This document is user-research and design guidance only. **Do not implement meeting modes, save semantics, data changes, UI tokens or new navigation until the Product Owner explicitly approves a future design specification.** Existing v18 and Excel Managed Variant requirements remain authoritative. Keep this source and all later illustrations/mock files versioned in GitHub.
