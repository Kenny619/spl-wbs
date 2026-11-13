import type { ViewState } from "../app/state";
import type { Task } from "../data/types";
import { formatPlanDate } from "../ui/format";
import { activeColumns } from "../ui/grid";

/**
 * DES-012 Schedule filter indicators for the Excel-managed UI only.
 *
 * The v18 read-only viewer keeps its existing selected-VALUE count; the
 * managed UI reports selected FILTERED COLUMNS, not selected values, and
 * marks only the corresponding visible column headings. Filters are still
 * applied by the original v18 live ViewState and filter control handlers.
 * No table rows or workbook records are copied or mutated here.
 */
const supported = [
  { column: "status", key: "statuses" },
  { column: "owner", key: "owners" },
  { column: "type", key: "types" },
  { column: "workstream", key: "workstreams" },
  { column: "finish", key: "finishes" },
] as const;

export function syncManagedReview08FilterIndicators(doc: Document, view: ViewState): void {
  const header = doc.getElementById("gridHeader");
  const active = activeColumns(view.columns);
  const filtering = new Map<string, number>();
  for (const { column, key } of supported) {
    if (view.columns.includes(column) && (view[key]?.length ?? 0)) {
      filtering.set(column, view[key]?.length ?? 0);
    }
  }
  const count = filtering.size;
  const badge = doc.getElementById("filterCount");
  const button = doc.getElementById("filterToggle");
  const clear = doc.getElementById("clearFilters");
  if (badge) {
    badge.textContent = String(count);
    badge.hidden = count === 0;
    badge.setAttribute("data-filter-meaning", "columns");
  }
  if (button) {
    button.classList.toggle("active", count > 0 || view.hideInactive);
    button.setAttribute("aria-label", count
      ? `Filters, ${count} ${count === 1 ? "column" : "columns"} filtered`
      : "Filters");
  }
  // Hide inactive is a display toggle, not a filtered column, but it must
  // still be clearable by the already-bound "Clear all filters" action.
  clear?.toggleAttribute("hidden", count === 0 && !view.hideInactive);

  if (!header) return;
  const cells = Array.from(header.children);
  for (const [index, column] of active.entries()) {
    const cell = cells[index];
    if (!(cell instanceof HTMLElement)) continue;
    cell.querySelector(".managed-filtered-column-mark")?.remove();
    cell.classList.remove("managed-filtered-column");
    cell.removeAttribute("data-filtered-column");
    cell.removeAttribute("title");
    const selectedValueCount = filtering.get(column.id);
    if (!selectedValueCount) continue;
    cell.classList.add("managed-filtered-column");
    cell.dataset.filteredColumn = column.id;
    cell.title = `${column.title}: ${selectedValueCount} filter ${selectedValueCount === 1 ? "value" : "values"} selected`;
    const indicator = doc.createElement("span");
    indicator.className = "managed-filtered-column-mark";
    indicator.setAttribute("aria-label", `${column.title} filtered`);
    indicator.textContent = "▼";
    cell.append(indicator);
  }
}

/**
 * Live Finish-date filter control, matching the approved DES-012 per-column
 * multi-select behavior. ISO dates are preserved as XLSX calendar dates, not
 * timezone-shifted timestamps; the empty value represents a blank finish.
 * This fieldset is injected only when the managed shell is mounted.
 */
export function syncManagedReview08FinishFilter(
  doc: Document,
  tasks: readonly Task[],
  view: ViewState,
  readView: () => ViewState,
  onChange: (patch: Partial<ViewState>) => void,
): void {
  const groups = doc.querySelector<HTMLElement>("#filterPopover .filter-groups");
  if (!groups) return;
  let group = doc.getElementById("managedFinishFilterGroup");
  if (!group) {
    group = doc.createElement("fieldset");
    group.id = "managedFinishFilterGroup";
    group.className = "filter-group";
    const legend = doc.createElement("legend");
    legend.append(doc.createTextNode("Finish "));
    const selected = doc.createElement("span");
    selected.id = "managedFinishSelection";
    legend.append(selected);
    const options = doc.createElement("div");
    options.id = "managedFinishOptions";
    options.className = "filter-options";
    group.append(legend, options);
    groups.append(group);
  }

  const showing = view.columns.includes("finish");
  group.hidden = !showing;
  doc.getElementById("managedFinishSelection")!.textContent =
    view.finishes?.length ? `(${view.finishes.length})` : "";
  if (!showing) return;
  const container = doc.getElementById("managedFinishOptions");
  if (!container) return;
  const values = [...new Set(tasks.map(task => task.plannedEnd ?? ""))].sort();
  const signature = values.join("\n");
  if (container.dataset.values !== signature) {
    container.dataset.values = signature;
    container.replaceChildren();
    for (const date of values) {
      const label = doc.createElement("label");
      label.className = "filter-option";
      const input = doc.createElement("input");
      input.type = "checkbox";
      input.value = date;
      input.setAttribute("aria-label", date ? `Finish date ${formatPlanDate(date)}` : "No finish date");
      input.addEventListener("change", () => {
        const selected = new Set(readView().finishes ?? []);
        if (input.checked) selected.add(date);
        else selected.delete(date);
        onChange({ finishes: [...selected] });
      });
      const text = doc.createElement("span");
      text.textContent = date ? formatPlanDate(date) : "No finish date";
      label.append(input, text);
      container.append(label);
    }
  }
  for (const input of Array.from(container.querySelectorAll<HTMLInputElement>("input"))) {
    input.checked = (view.finishes ?? []).includes(input.value);
  }
}
