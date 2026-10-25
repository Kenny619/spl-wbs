import { KNOWN_STATUSES } from "../data/types";
import type { Task } from "../data/types";
import type { ViewState } from "../app/state";

export function syncFilters(
  doc: Document,
  tasks: readonly Task[],
  view: ViewState,
  readView: () => ViewState,
  onChange: (patch: Partial<ViewState>) => void,
): void {
  const fields: Array<{
    column: string;
    group: string;
    container: string;
    selection: string;
    key: "statuses" | "owners" | "types" | "workstreams";
    values: string[];
  }> = [
    { column: "status", group: "statusFilterGroup", container: "filterStatuses", selection: "statusSelection", key: "statuses", values: presentStatuses(tasks) },
    { column: "owner", group: "ownerFilterGroup", container: "filterOwners", selection: "ownerSelection", key: "owners", values: distinct(tasks.map((task) => task.owner)) },
    { column: "type", group: "typeFilterGroup", container: "filterTypes", selection: "typeSelection", key: "types", values: presentTypes(tasks) },
    {
      column: "workstream",
      group: "workstreamFilterGroup",
      container: "filterWorkstreams",
      selection: "workstreamSelection",
      key: "workstreams",
      values: distinct(tasks.map((task) => task.workstream)),
    },
  ];
  for (const field of fields) {
    const group = doc.getElementById(field.group);
    const selection = doc.getElementById(field.selection);
    const container = doc.getElementById(field.container);
    if (!group || !selection || !container) continue;
    const showing = view.columns.includes(field.column);
    group.hidden = !showing;
    selection.textContent = view[field.key].length ? `(${view[field.key].length})` : "";
    if (!showing) continue;
    const signature = field.values.join("\n");
    if (container.dataset.values !== signature) {
      container.dataset.values = signature;
      container.replaceChildren();
      for (const value of field.values) {
        const label = document.createElement("label");
        label.className = "filter-option";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = value;
        input.addEventListener("change", () => {
          const current = new Set(readView()[field.key]);
          if (input.checked) current.add(value);
          else current.delete(value);
          onChange({ [field.key]: [...current] });
        });
        const text = document.createElement("span");
        text.textContent = value;
        label.append(input, text);
        container.append(label);
      }
    }
    for (const input of Array.from(container.querySelectorAll("input"))) {
      input.checked = view[field.key].includes(input.value);
    }
  }
  const count = view.statuses.length + view.owners.length + view.types.length + view.workstreams.length + (view.hideInactive ? 1 : 0);
  const badge = doc.getElementById("filterCount");
  const clear = doc.getElementById("clearFilters");
  const toggle = doc.getElementById("filterToggle");
  if (badge) {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }
  clear?.toggleAttribute("hidden", count === 0);
  toggle?.classList.toggle("active", count > 0);
}

function presentStatuses(tasks: readonly Task[]): string[] {
  const present = new Set(tasks.map((task) => task.status));
  const known = KNOWN_STATUSES.filter((status) => present.has(status));
  return present.has("Unknown") ? [...known, "Unknown"] : [...known];
}

function presentTypes(tasks: readonly Task[]): string[] {
  const present = new Set(tasks.map((task) => task.taskType));
  return (["Summary", "Task", "Milestone"] as const).filter((type) => present.has(type));
}

function distinct(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
