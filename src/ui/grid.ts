import type { FlatTask } from "../model/wbsTree";
import { formatPlanDate, progressLabel, statusClass } from "./format";

export type ColumnId = "wbs" | "task" | "owner" | "status" | "progress" | "start" | "finish" | "workstream" | "type";

export type ColumnDef = {
  id: ColumnId;
  title: string;
  width: string;
  fixed: boolean;
};

export const COLUMN_DEFS: readonly ColumnDef[] = [
  { id: "wbs", title: "WBS", width: "49px", fixed: true },
  { id: "task", title: "Task", width: "minmax(150px,1fr)", fixed: true },
  { id: "owner", title: "Owner", width: "82px", fixed: false },
  { id: "status", title: "Status", width: "85px", fixed: false },
  { id: "progress", title: "Done", width: "65px", fixed: false },
  { id: "start", title: "Start", width: "98px", fixed: false },
  { id: "finish", title: "Finish", width: "98px", fixed: false },
  { id: "workstream", title: "Workstream", width: "105px", fixed: false },
  { id: "type", title: "Type", width: "85px", fixed: false },
];

export function activeColumns(selected: readonly string[]): ColumnDef[] {
  const chosen = new Set(selected);
  return COLUMN_DEFS.filter((column) => column.fixed || chosen.has(column.id));
}

const SVG = "http://www.w3.org/2000/svg";

export function renderGridHeader(
  header: HTMLElement,
  pane: HTMLElement,
  columns: readonly string[],
  allOpen: boolean,
  onToggleAll: () => void,
): void {
  const visible = activeColumns(columns);
  pane.style.setProperty("--col-template", visible.map((column) => column.width).join(" "));
  header.replaceChildren();
  for (const column of visible) {
    const cell = document.createElement("span");
    if (column.id === "task") {
      cell.className = "task-header-cell";
      cell.append(document.createTextNode("Task"));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "header-expand";
      button.id = "expand";
      const action = allOpen ? "Collapse" : "Expand";
      button.title = `${action} all WBS groups`;
      button.setAttribute("aria-label", `${action} all WBS groups`);
      button.setAttribute("aria-expanded", String(allOpen));
      button.append(chevron(allOpen ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6", "expand-symbol", "2"));
      button.addEventListener("click", onToggleAll);
      cell.append(button);
    } else {
      cell.textContent = column.title;
      if (column.id === "progress") cell.className = "align-right";
    }
    header.append(cell);
  }
}

export function renderGridRows(
  scroll: HTMLElement,
  rows: readonly FlatTask[],
  columns: readonly string[],
  expanded: ReadonlySet<string>,
  selectedId: string | null,
  childIds: ReadonlySet<string>,
  onToggle: (id: string) => void,
  onOpen: (id: string) => void,
): void {
  const visible = activeColumns(columns);
  const fragment = document.createDocumentFragment();
  for (const task of rows) {
    const row = document.createElement("div");
    row.className = `task-row level-${task.depth}${task.id === selectedId ? " selected" : ""}`;
    row.dataset.taskId = task.id;
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Open details for ${task.wbsCode} ${task.taskName}`);
    for (const column of visible) row.append(cell(column.id, task, expanded, childIds));
    row.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("button[data-expand]")) {
        onToggle(task.id);
        return;
      }
      onOpen(task.id);
    });
    fragment.append(row);
  }
  scroll.replaceChildren(fragment);
}

function cell(id: ColumnId, task: FlatTask, expanded: ReadonlySet<string>, childIds: ReadonlySet<string>): HTMLElement {
  if (id === "wbs") return div("wbs", task.wbsCode);
  if (id === "task") return taskCell(task, expanded, childIds);
  if (id === "owner") {
    const owner = document.createElement("div");
    owner.className = "owner";
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = task.owner.slice(0, 2) || "—";
    owner.append(avatar);
    return owner;
  }
  if (id === "status") {
    const wrap = document.createElement("div");
    const pill = document.createElement("span");
    pill.className = `pill ${statusClass(task.status)}`;
    pill.textContent = task.status;
    wrap.append(pill);
    return wrap;
  }
  if (id === "progress") return div("percent", progressLabel(task.progress));
  if (id === "start") return div("datecell", formatPlanDate(task.plannedStart));
  if (id === "finish") return div("datecell", formatPlanDate(task.plannedEnd));
  if (id === "workstream") {
    const node = div("mutedcell", task.workstream || "—");
    node.title = task.workstream;
    return node;
  }
  return div("mutedcell", task.taskType);
}

function taskCell(task: FlatTask, expanded: ReadonlySet<string>, childIds: ReadonlySet<string>): HTMLElement {
  const hasChildren = childIds.has(task.id);
  const open = expanded.has(task.id);
  const wrap = document.createElement("div");
  wrap.className = "taskname";
  wrap.style.paddingLeft = `${Math.min((task.depth - 1) * 12, 65) + 3}px`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = hasChildren ? "chev" : "chev inert";
  button.dataset.expand = task.id;
  button.setAttribute("aria-label", `${open ? "Collapse" : "Expand"} ${task.taskName}`);
  button.append(hasChildren ? chevron(open ? "m6 9 6 6 6-6" : "m9 6 6 6-6 6", "row-chevron", "2.5") : document.createTextNode("·"));
  const name = document.createElement(hasChildren ? "strong" : "span");
  name.title = task.taskName;
  name.textContent = task.taskName;
  wrap.append(button, name);
  return wrap;
}

function div(className: string, text: string): HTMLElement {
  const node = document.createElement("div");
  node.className = className;
  node.textContent = text;
  return node;
}

function chevron(pathData: string, className: string, strokeWidth: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", strokeWidth);
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", pathData);
  svg.append(path);
  return svg;
}
