import { remainingProjectDays, type ProjectContext } from "./projectContext";
import type { Task } from "../data/types";
import { bundledHolidayCalendar } from "../calendar/jpHolidays";
import { remainingWorkdays, type RemainingWork } from "../calendar/workdays";
import { formatPlanDate, statusClass } from "../ui/format";
import { renderUpdatesSection } from "../ui/updates";

/**
 * Approved DES-012 Review08 Task Detail *for the managed app only*.
 * Render actual verified Excel task facts. Never import the prototype's fictional
 * dates, percentages, flags, fake Save or historical entries.
 * The separate v18 read-only viewer retains src/ui/detail.ts unchanged.
 */
export type Review08DetailActions = {
  today: string;
  projectContext?: ProjectContext | null;
  canEdit: boolean;
  canBack: boolean;
  onRelated: (taskId: string) => void;
  onBack: () => void;
  onAddUpdate: () => void;
};

const make = <T extends keyof HTMLElementTagNameMap>(
  doc: Document, tag: T, className = "", value?: string,
): HTMLElementTagNameMap[T] => {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
};

function remainingLabel(result: RemainingWork, status: Task["status"]): string {
  if (status === "Completed") return "Completed";
  switch (result.kind) {
    case "count": return `${result.days} days remaining`;
    case "today": return "0 days remaining";
    case "overdue": return "Overdue";
    case "hidden": return "Not active";
    case "no-finish": return "Finish date not set";
    case "unknown": return "Holiday coverage incomplete";
  }
}

function timeline(doc: Document, task: Task, today: string, context?: ProjectContext | null): HTMLElement {
  const container = make(doc, "div", "dt-rail-card");
  const start = task.plannedStart, end = task.plannedEnd;
  if (!start || !end) {
    container.append(make(doc, "div", "dt-empty", "Schedule not set"));
    container.setAttribute("data-schedule", "missing");
    return container;
  }
  const result = context ? remainingProjectDays(end, today, task.status, bundledHolidayCalendar(), context)
    : remainingWorkdays(end, today, task.status, bundledHolidayCalendar());
  const unavailable = result.kind === "unknown" && context &&
    (context.kind === "incompatible" || context.kind === "unsupported_future");
  const remaining = make(doc, "div", "dt-remaining", unavailable
    ? "Project Calendar unavailable" : remainingLabel(result, task.status));
  if (result.kind === "overdue") remaining.classList.add("overdue");
  container.append(remaining);

  if (task.taskType === "Milestone") {
    container.dataset.schedule = "milestone";
    const marker = make(doc, "div", "dt-milestone");
    const diamond = make(doc, "span", "dt-diamond");
    diamond.setAttribute("aria-hidden", "true");
    marker.append(diamond, make(doc, "strong", "", formatPlanDate(end)));
    marker.setAttribute("aria-label", `Milestone on ${formatPlanDate(end)}`);
    container.append(marker, make(doc, "div", "dt-progressline is-absent"));
    return container;
  }
  container.dataset.schedule = "range";
  const dates = make(doc, "div", "dt-dateedges");
  for (const [label, value] of [["Start", start], ["Finish", end]] as const) {
    const anchor = make(doc, "div");
    anchor.append(make(doc, "span", "", label), make(doc, "strong", "", formatPlanDate(value)));
    dates.append(anchor);
  }
  container.append(dates);
  const recorded = task.progress !== null && Number.isFinite(task.progress) &&
    task.progress >= 0 && task.progress <= 100;
  const track = make(doc, "div", "dt-rail");
  track.dataset.progressRecorded = String(recorded);
  track.setAttribute("role", "img");
  track.setAttribute("aria-label", `Scheduled ${formatPlanDate(start)} through ${formatPlanDate(end)}; ` +
    (recorded ? `${task.progress}% recorded progress` : "no progress recorded"));
  if (recorded) {
    const fill = make(doc, "div", "dt-rail-fill");
    fill.style.width = `${task.progress}%`;
    track.append(fill);
  }
  container.append(track);
  const progress = make(doc, "div", "dt-progressline" + (recorded ? "" : " is-absent"));
  if (recorded) {
    progress.append(make(doc, "span", "", "Recorded progress"),
      make(doc, "strong", "", `${task.progress}%`));
  } else {
    // Preserve approved layout height without suggesting that null is 0%.
    progress.setAttribute("aria-hidden", "true");
    progress.append(make(doc, "span", "", "\u00a0"));
  }
  container.append(progress);
  return container;
}

function relationGroup(
  doc: Document, label: string, related: readonly Task[], onRelated: (id: string) => void,
): HTMLElement {
  const group = make(doc, "div", "dt-relation-group");
  group.append(make(doc, "div", "relation-caption", label));
  if (!related.length) {
    group.append(make(doc, "p", "relation-empty", "None"));
    return group;
  }
  for (const target of related) {
    const button = make(doc, "button", "dt-related-task");
    button.type = "button";
    button.dataset.relatedTask = target.id;
    button.setAttribute("aria-label", `Inspect ${target.wbsCode} ${target.taskName}`);
    button.append(make(doc, "strong", "", `${target.wbsCode} · ${target.taskName}`),
      make(doc, "span", "", target.status));
    button.addEventListener("click", () => onRelated(target.id));
    group.append(button);
  }
  return group;
}

export function renderManagedReview08TaskDetail(
  host: HTMLElement, task: Task, allTasks: readonly Task[], actions: Review08DetailActions,
): void {
  const doc = host.ownerDocument;
  const byId = new Map(allTasks.map((row) => [row.id, row]));
  const root = make(doc, "div", "task-detail-root");
  root.dataset.currentTaskId = task.id;
  const facts = make(doc, "div", "detail-facts detail-grid");
  for (const [name, value] of [["Owner", task.owner || "Not assigned"],
    ["Priority", task.priority || "Not set"]] as const) {
    const fact = make(doc, "div", "detail-fact field");
    fact.append(make(doc, "label", "", name), make(doc, "strong", "", value));
    facts.append(fact);
  }
  root.append(facts);

  const timelineSection = make(doc, "section", "detail-section");
  timelineSection.append(make(doc, "h3", "", "Timeline"), timeline(doc, task, actions.today, actions.projectContext));
  root.append(timelineSection);

  const info = make(doc, "section", "detail-section");
  info.append(make(doc, "h3", "", "Task information"));
  const type = make(doc, "div", "detail-keyval");
  type.append(make(doc, "span", "", "Task type"), make(doc, "strong", "", task.taskType));
  info.append(type, make(doc, "div", "fieldlabel", "Description"));
  const description = make(doc, "p", "detail-description desc", task.description || "No description");
  info.append(description);
  root.append(info);

  const relationships = make(doc, "section", "detail-section");
  relationships.append(make(doc, "h3", "", "Relationships"));
  const parent = task.parentId ? byId.get(task.parentId) : null;
  const predecessors = task.predecessorIds.map((id) => byId.get(id)).filter((t): t is Task => !!t);
  const dependents = allTasks.filter((t) => t.predecessorIds.includes(task.id));
  relationships.append(
    relationGroup(doc, "Parent task", parent ? [parent] : [], actions.onRelated),
    relationGroup(doc, "Predecessors", predecessors, actions.onRelated),
    relationGroup(doc, "Dependent tasks", dependents, actions.onRelated),
  );
  root.append(relationships);

  const updates = make(doc, "section", "detail-section dt-updates");
  const heading = make(doc, "div", "updates-heading");
  heading.append(make(doc, "h3", "", "Updates"));
  const add = make(doc, "button", "", "+ Add update");
  add.type = "button";
  add.disabled = !actions.canEdit;
  add.addEventListener("click", actions.onAddUpdate);
  heading.append(add);
  updates.append(heading);
  const historical = renderUpdatesSection(task.updates);
  if (historical) {
    // The native Updates parser has already sanitized every external HTML node.
    historical.querySelector(".section-label")?.remove();
    updates.append(historical);
  } else {
    updates.append(make(doc, "p", "relation-empty", "No recorded updates"));
  }
  root.append(updates);
  host.replaceChildren(root);
}

/** Header and Back control are fixed outside .managed-inspector-scroll. */
export function renderManagedReview08Header(
  inspector: HTMLElement, task: Task | null, actions: {
    canBack: boolean; onBack: () => void;
  },
): void {
  const doc = inspector.ownerDocument;
  const title = inspector.querySelector<HTMLElement>(".managed-inspector-head .panel-title");
  const kicker = inspector.querySelector<HTMLElement>(".managed-inspector-kicker");
  const trail = inspector.querySelector<HTMLElement>(".managed-inspector-trail");
  const status = inspector.querySelector<HTMLElement>(".managed-inspector-status");
  const group = inspector.querySelector<HTMLElement>(".managed-inspector-actions");
  if (!title || !kicker || !trail || !status || !group) {
    throw new Error("Review08 Task Detail fixed identity header is missing.");
  }
  title.textContent = task?.taskName ?? "Task Detail";
  kicker.textContent = task ? `WBS ${task.wbsCode} · ${task.taskType}` : "TASK INSPECTOR";
  trail.textContent = task ? (task.workstream || "Workstream not set") : "Select a task to inspect";
  status.textContent = task?.status ?? "";
  status.className = "managed-inspector-status" + (task ? ` pill ${statusClass(task.status)}` : "");
  group.replaceChildren();
  if (task && actions.canBack) {
    const back = make(doc, "button", "managed-action managed-detail-back", "← Back");
    back.type = "button";
    back.addEventListener("click", actions.onBack);
    group.append(back);
  }
}
