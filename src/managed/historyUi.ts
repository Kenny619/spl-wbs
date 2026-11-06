import { EDITABLE_FIELDS } from "./workbookCandidate";
import {
  filterManagedHistory, historyDisplayTime, historyValueLabel, readManagedHistory,
  type HistoryChange, type HistoryEvent,
} from "./history";

/**
 * A compact, read-only dialog. Every workbook-owned label/value is rendered
 * with textContent, never as trusted HTML. No workbook bytes are changed.
 */
export async function openManagedHistory(
  doc: Document, workbook: Uint8Array,
  options: { taskId?: string; timeZone: string },
): Promise<void> {
  const dialog = doc.createElement("dialog");
  dialog.className = "managed-history";
  dialog.setAttribute("aria-label", "Change History");
  doc.body.append(dialog);

  const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K, text?: string, className?: string,
  ): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const dismiss = () => { if (dialog.open) dialog.close(); };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && dialog.open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dismiss();
    }
  };
  doc.addEventListener("keydown", keydown, true);
  dialog.addEventListener("close", () => {
    doc.removeEventListener("keydown", keydown, true);
    dialog.remove();
  }, { once: true });

  const head = element("div", undefined, "managed-history-head");
  const heading = element("h2", "Change History");
  const close = element("button", "Close", "managed-action");
  close.type = "button";
  close.addEventListener("click", dismiss);
  head.append(heading, close);
  dialog.append(head);

  let records: HistoryEvent[];
  try {
    records = await readManagedHistory(workbook);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unable to read UpdateHistory.";
    dialog.append(element("p", "Change History cannot be displayed safely: " + reason, "managed-history-error"));
    dialog.showModal();
    close.focus();
    return;
  }

  const filters = element("div", undefined, "managed-history-filters");
  const createFilter = (title: string, field: HTMLInputElement | HTMLSelectElement) => {
    const wrap = element("label", undefined, "managed-history-filter");
    wrap.append(element("span", title), field);
    filters.append(wrap);
  };
  const task = element("select");
  task.setAttribute("aria-label", "History task filter");
  const allTask = element("option", "All tasks");
  allTask.value = "";
  task.append(allTask);
  const snapshots = new Map<string, string>();
  for (const event of records) for (const change of event.changes) {
    if (!snapshots.has(change.taskId)) snapshots.set(change.taskId,
      change.wbsCode + " · " + change.taskTitle + " [ID " + change.taskId + "]");
  }
  if (options.taskId && !snapshots.has(options.taskId)) snapshots.set(options.taskId, "Task " + options.taskId);
  for (const [id, name] of [...snapshots.entries()].sort((a, b) => a[1].localeCompare(b[1]))) {
    const entry = element("option", name);
    entry.value = id;
    task.append(entry);
  }
  task.value = options.taskId ?? "";
  createFilter("Task", task);

  const field = element("select");
  field.setAttribute("aria-label", "History field filter");
  const any = element("option", "All fields");
  any.value = "";
  field.append(any);
  for (const name of EDITABLE_FIELDS) {
    const entry = element("option", name);
    entry.value = name;
    field.append(entry);
  }
  createFilter("Field", field);

  const from = element("input");
  from.type = "date";
  from.setAttribute("aria-label", "History start date");
  createFilter("From", from);
  const through = element("input");
  through.type = "date";
  through.setAttribute("aria-label", "History end date");
  createFilter("Through", through);
  dialog.append(filters);

  const description = element("p",
    "Times are displayed in " + options.timeZone + "; saved UTC timestamps and historic task labels are unchanged.",
    "managed-history-note");
  dialog.append(description);
  const results = element("div", undefined, "managed-history-results");
  results.setAttribute("aria-live", "polite");
  dialog.append(results);

  const valueView = (change: HistoryChange): HTMLElement => {
    const wrap = element("div", undefined, "managed-history-values");
    const oldValue = historyValueLabel(change.field, change.oldValue);
    const newValue = historyValueLabel(change.field, change.newValue);
    const lengthy = ["Description", "Updates"].includes(change.field) ||
      oldValue.length > 130 || newValue.length > 130;
    if (!lengthy) {
      wrap.append(element("span", "Before: " + oldValue),
        element("span", "After: " + newValue));
    } else {
      wrap.append(element("p", "Before: " + oldValue.slice(0, 80) + (oldValue.length > 80 ? "…" : "") +
        "  →  After: " + newValue.slice(0, 80) + (newValue.length > 80 ? "…" : "")));
      const detail = element("details");
      detail.append(element("summary", "Expand full before / after"));
      detail.append(element("pre", "BEFORE\n" + oldValue + "\n\nAFTER\n" + newValue));
      wrap.append(detail);
    }
    return wrap;
  };

  const draw = () => {
    results.replaceChildren();
    let filtered: HistoryEvent[];
    try {
      filtered = filterManagedHistory(records, {
        timeZone: options.timeZone,
        taskId: task.value || undefined,
        field: field.value as "" | typeof EDITABLE_FIELDS[number],
        fromDate: from.value || undefined,
        throughDate: through.value || undefined,
      });
    } catch (error) {
      results.append(element("p", "Cannot apply filters: " +
        (error instanceof Error ? error.message : "Invalid timezone"), "managed-history-error"));
      return;
    }
    if (from.value && through.value && from.value > through.value) {
      results.append(element("p", "Start date cannot be later than end date.", "managed-history-error"));
      return;
    }
    if (!filtered.length) {
      results.append(element("p", records.length
        ? "No changes match these filters." : "This workbook has no saved Change History yet.",
      "managed-history-empty"));
      return;
    }
    results.append(element("p", filtered.length + " saved change event(s)", "managed-history-note"));
    for (const event of filtered) {
      const entry = element("section", undefined, "managed-history-event");
      entry.append(element("h3",
        historyDisplayTime(event.timestampUTC, options.timeZone) +
        " · " + event.changes.length + " field change(s)"));
      const idText = element("small", "ChangeSetID " + event.changeSetId);
      entry.append(idText);
      for (const change of event.changes) {
        const row = element("div", undefined, "managed-history-row");
        row.append(element("strong", change.wbsCode + " · " + change.taskTitle +
          " (ID " + change.taskId + ") · " + change.field));
        row.append(valueView(change));
        entry.append(row);
      }
      results.append(entry);
    }
  };
  for (const control of [task, field, from, through]) {
    control.addEventListener("change", draw);
    control.addEventListener("input", draw);
  }
  draw();
  dialog.showModal();
  close.focus();
}
