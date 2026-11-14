import type { ImportController } from "../data/importController";
import type { WatchProjection } from "./watchProjection";
import type { ManagedReports } from "./reportsUi";

/** DES-012 Review08 agenda backed only by the currently verified workbook. */
export function mountMeetingReview(doc: Document, controller: ImportController,
  reports: ManagedReports, projection: () => WatchProjection | null,
  guard: (action: () => void) => void): () => void {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls = "") => {
    const node = doc.createElement(tag); node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const host = make("section", undefined, "managed-meeting");
  host.setAttribute("aria-label", "Meeting agenda");
  host.append(make("h2", "Meeting agenda"), make("p", "Exceptions first, grouped by workstream · recorded workbook Watch"));
  const summary = make("p"); host.append(summary);
  const tools = make("div", undefined, "managed-meeting-tools");
  const search = make("input"); search.type = "search";
  search.setAttribute("aria-label", "Search meeting tasks"); search.placeholder = "Search tasks…";
  const scope = make("button", "Exceptions", "managed-action active"); scope.type = "button";
  const all = make("button", "All workstreams", "managed-action"); all.type = "button";
  const filters = make("details"); filters.append(make("summary", "Filter"));
  const choices = new Map<string, HTMLSelectElement>();
  for (const key of ["owner", "finish", "status", "workstream"]) {
    const label = make("label", key + " ");
    const select = make("select"); select.multiple = true;
    select.setAttribute("aria-label", "Meeting " + key + " filter");
    choices.set(key, select); label.append(select); filters.append(label);
    select.addEventListener("change", () => refresh());
  }
  tools.append(scope, all, search, filters); host.append(tools);
  const list = make("div", undefined, "managed-meeting-list"); host.append(list);
  doc.querySelector(".managed-schedule-body")?.prepend(host);
  const button = make("button", "Meeting Review", "managed-action"); button.type = "button";
  button.dataset.managedView = "meeting";
  doc.querySelector('[data-managed-view="reports"]')?.before(button);
  let exceptions = true;
  const navigate = (open: boolean) => {
    reports.close(); doc.body.classList.toggle("spt-managed-meeting-open", open);
    button.classList.toggle("active", open);
    if (open) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    refresh();
  };
  button.addEventListener("click", () => guard(() => navigate(true)));
  doc.querySelector('[data-managed-view="schedule"]')?.addEventListener("click", event => {
    event.preventDefault(); event.stopImmediatePropagation(); guard(() => navigate(false));
  }, true);
  doc.querySelector('[data-managed-view="reports"]')?.addEventListener("click", event => {
    event.preventDefault(); event.stopImmediatePropagation(); guard(() => {
      doc.body.classList.remove("spt-managed-meeting-open"); button.classList.remove("active"); button.removeAttribute("aria-current"); reports.open();
    });
  }, true);
  scope.addEventListener("click", () => { exceptions = true; refresh(); });
  all.addEventListener("click", () => { exceptions = false; refresh(); });
  search.addEventListener("input", () => refresh());
  function refresh() {
    const tasks = controller.getState().tasks ?? [];
    const watch = projection();
    const available = watch?.workbookState === "valid" && watch.schemaValidated;
    const openIds = new Set(available ? watch.tasks.filter(t => t.openReasons.length).map(t => t.taskId) : []);
    const count = available ? watch.tasks.reduce((n,t) => n + t.openReasons.length, 0) : 0;
    summary.textContent = available ? openIds.size + " Under Watch · " + count + " recorded Open reasons · " +
      (tasks.length - openIds.size) + " Unknown · authorship and automatic checks unverified"
      : "Unknown / unverified: workbook Watch evidence unavailable. No clearance inferred.";
    const value = (task: typeof tasks[number], key: string) => key === "finish" ? task.plannedEnd ?? "Unscheduled"
      : key === "status" ? task.status : key === "owner" ? task.owner || "Unassigned" : task.workstream || "Unassigned";
    for (const [key, select] of choices) {
      const selected = Array.from(select.selectedOptions).map(o => o.value);
      const values = [...new Set(tasks.map(t => value(t,key)))].sort();
      if (Array.from(select.options).map(o => o.value).join("\n") !== values.join("\n")) {
        select.replaceChildren(...values.map(v => { const o = make("option",v); o.value = v; o.selected = selected.includes(v); return o; }));
      }
    }
    scope.classList.toggle("active", exceptions); all.classList.toggle("active", !exceptions);
    scope.setAttribute("aria-pressed", String(exceptions)); all.setAttribute("aria-pressed", String(!exceptions));
    const query = search.value.trim().toLocaleLowerCase();
    const rows = tasks.filter(t => (!exceptions || openIds.has(t.id)) &&
      (!query || [t.taskName,t.id,t.owner,t.workstream,t.status].join(" ").toLocaleLowerCase().includes(query)) &&
      [...choices].every(([key, select]) => !select.selectedOptions.length || Array.from(select.selectedOptions).some(o => o.value === value(t,key))))
      .sort((a,b) => value(a,"workstream").localeCompare(value(b,"workstream")));
    const columns = make("div", undefined, "managed-meeting-columns");
    columns.append(...["TASK", "OWNER", "FINISH", "STATUS"].map(label => make("span", label)));
    list.replaceChildren(columns);
    let group = "";
    for (const task of rows) {
      const ws = value(task,"workstream");
      if (group !== ws) { group = ws; list.append(make("h3",ws,"managed-meeting-group")); }
      const row = make("button", undefined, "managed-meeting-task"); row.type = "button"; row.dataset.taskId = task.id;
      row.classList.toggle("selected", controller.getState().view.selectedId === task.id);
      const facts = available ? watch.tasks.find(t => t.taskId === task.id) : null;
      row.append(make("strong",task.taskName + " · WBS " + task.wbsCode), make("span",value(task,"owner")),
        make("span",value(task,"finish")), make("span",task.status),
        make("span",(openIds.has(task.id) ? "Under Watch" : "Unknown") + " · " + (facts?.openReasons.length ?? 0) + " Open / " + (facts?.resolvedReasons.length ?? 0) + " Resolved"));
      row.addEventListener("click", () => controller.patchView({ selectedId: task.id })); list.append(row);
    }
    if (!rows.length) list.append(make("p", available ? "No tasks match these filters. Unknown is not Green or Clear." : "No verified Watch agenda. Choose All workstreams to inspect current tasks with Unknown evidence."));
  }
  return refresh;
}
