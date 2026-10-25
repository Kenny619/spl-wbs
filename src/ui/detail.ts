import type { PaletteMap, Task } from "../data/types";
import { paletteColor } from "../model/workstreamPalette";
import type { HolidayCalendar } from "../calendar/jpHolidays";
import { detailRemaining, remainingWorkdays } from "../calendar/workdays";
import { formatPlanDate, progressLabel, statusClass } from "./format";

const LIST_ICON = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="3" width="8" height="8" rx="2" fill="#8054A2"/><rect x="13" y="3" width="9" height="5" rx="1.5" fill="#9E78BC"/><rect x="13" y="10" width="9" height="5" rx="1.5" fill="#6E9C99"/><rect x="2" y="14" width="8" height="7" rx="2" fill="#8866A8"/><rect x="13" y="17" width="9" height="4" rx="1.5" fill="#7CB5AD"/></svg>`;

export function renderDetail(
  host: HTMLElement,
  task: Task | null,
  tasks: readonly Task[],
  palette: PaletteMap,
  today: string,
  calendar: HolidayCalendar,
): void {
  host.replaceChildren();
  if (!task) return;
  const byId = new Map(tasks.map((item) => [item.id, item]));
  host.append(block("div", "panel-kicker", `Work breakdown · ${task.wbsCode}`));
  const title = block("h2", "panel-title", task.taskName);
  title.id = "detailTitle";
  host.append(title);
  const pill = block("span", `pill ${statusClass(task.status)}`, task.status);
  host.append(pill);
  const grid = document.createElement("div");
  grid.className = "detail-grid";
  for (const field of [
    ["Owner", task.owner || "—"],
    ["Workstream", task.workstream || "—"],
    ["Planned start", formatPlanDate(task.plannedStart)],
    ["Planned finish", formatPlanDate(task.plannedEnd)],
    ["WBS code", task.wbsCode],
    ["Task type", task.taskType],
  ] as const) {
    const item = document.createElement("div");
    item.className = "field";
    const label = document.createElement("label");
    label.textContent = field[0];
    const value = document.createElement("strong");
    value.textContent = field[1];
    item.append(label, value);
    grid.append(item);
  }
  host.append(grid);
  const remainder = detailRemaining(remainingWorkdays(task.plannedEnd, today, task.status, calendar));
  if (remainder) {
    const workdays = document.createElement("div");
    workdays.className = "workdays-detail";
    const label = document.createElement("small");
    label.textContent = "Remaining working days";
    const value = document.createElement("strong");
    value.textContent = remainder;
    workdays.append(label, value);
    host.append(workdays);
  }
  host.append(block("div", "section-label", `Completion · ${progressLabel(task.progress)}`));
  const track = document.createElement("div");
  track.className = "progress-bg";
  const fill = document.createElement("div");
  fill.className = "progress-fg";
  fill.style.width = `${task.progress ?? 0}%`;
  fill.style.background = paletteColor(palette, task.workstream);
  track.append(fill);
  host.append(track);
  host.append(block("div", "section-label", "Description"));
  host.append(block("p", "desc", task.description || "No description"));
  host.append(block("div", "section-label", "Predecessors"));
  const names = task.predecessorIds.map((id) => byId.get(id)).filter((item): item is Task => Boolean(item));
  host.append(block("p", "desc", names.length ? names.map((item) => `${item.wbsCode} ${item.taskName}`).join(", ") : "None defined"));
  host.append(block("div", "section-label", "Source record"));
  host.append(sourceLink(task.itemUrl));
}

function sourceLink(itemUrl: string | null): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "source-record";
  if (itemUrl) {
    const link = document.createElement("a");
    link.className = "sharepoint-link";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.href = itemUrl;
    const icon = document.createElement("span");
    icon.innerHTML = LIST_ICON;
    const label = document.createElement("span");
    label.textContent = "Open SharePoint List item";
    const cue = document.createElement("span");
    cue.setAttribute("aria-hidden", "true");
    cue.textContent = "↗";
    link.append(icon, label, cue);
    wrap.append(link);
    return wrap;
  }
  const unavailable = document.createElement("span");
  unavailable.className = "sharepoint-link unavailable";
  unavailable.title = "This task has no allowed ItemURL.";
  unavailable.setAttribute("aria-disabled", "true");
  const icon = document.createElement("span");
  icon.innerHTML = LIST_ICON;
  const label = document.createElement("span");
  label.textContent = "SharePoint List item";
  const note = document.createElement("small");
  note.textContent = "No ItemURL on this task";
  unavailable.append(icon, label, note);
  wrap.append(unavailable);
  return wrap;
}

function block(tag: "div" | "h2" | "span" | "p", className: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
