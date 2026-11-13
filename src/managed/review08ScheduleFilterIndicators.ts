import type { ViewState } from "../app/state";
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
] as const;

export function syncManagedReview08FilterIndicators(doc: Document, view: ViewState): void {
  const header = doc.getElementById("gridHeader");
  const active = activeColumns(view.columns);
  const filtering = new Map<string, number>();
  for (const { column, key } of supported) {
    if (view.columns.includes(column) && view[key].length) {
      filtering.set(column, view[key].length);
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
