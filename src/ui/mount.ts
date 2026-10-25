import { fileTitle, type ViewState } from "../app/state";
import { blackoutFromInput, createBlackout, type BlackoutInterval } from "../calendar/blackout";
import { todayInTimeZone } from "../calendar/dateOnly";
import { absorbHolidayYear, bundledHolidayCalendar, fetchHolidayYear, yearsTouched, type HolidayCalendar } from "../calendar/jpHolidays";
import { CHROME_EYEBROW, CHROME_SUBTITLE } from "../config/decisions";
import type { ImportController, SessionState } from "../data/importController";
import type { ImportIssue, Task } from "../data/types";
import { paletteColor } from "../model/workstreamPalette";
import { overallProgress } from "../model/summaryRollup";
import { attentionCounts, flattenVisible } from "../model/wbsTree";
import { holidayCoverageNote } from "./calendarUi";
import { renderDetail } from "./detail";
import { syncFilters } from "./filters";
import { formatPlanDate, progressLabel } from "./format";
import { COLUMN_DEFS, renderGridHeader, renderGridRows } from "./grid";
import { focusableIn, gridWidthFromKey } from "./keyboard";
import { dateMs, scheduleBounds, pixelsPerDay, DAY_MS, isoFromMs } from "./scale";
import { renderTimeline } from "./timeline";

export function mountGantt(doc: Document, controller: ImportController): void {
  const required = [
    "gantt",
    "gridHeader",
    "gridScroll",
    "taskPane",
    "headInner",
    "timeCanvas",
    "timelineRows",
    "timeScroll",
    "detailContent",
    "panel",
    "backdrop",
  ];
  if (required.some((id) => !doc.getElementById(id))) return;
  const eyebrow = doc.getElementById("eyebrow");
  if (eyebrow) eyebrow.textContent = CHROME_EYEBROW;
  const subtitle = doc.getElementById("subtitle");
  if (subtitle) subtitle.textContent = CHROME_SUBTITLE;

  const blackout = createBlackout();
  let calendar: HolidayCalendar = bundledHolidayCalendar();
  const pendingYears = new Set<number>();
  let fittedWidth = -1;
  let keyboardOpen = false;
  let announcedSelection: string | null = null;
  const timeScroll = doc.getElementById("timeScroll") as HTMLElement;
  const gridScroll = doc.getElementById("gridScroll") as HTMLElement;
  const headInner = doc.getElementById("headInner") as HTMLElement;

  const paint = () => {
    const state = controller.getState();
    const tasks = state.tasks ?? [];
    paintChrome(doc, state, tasks, blackout);
    const rows = visibleRows(tasks, state.view);
    const parents = new Set(tasks.map((task) => task.parentId).filter((id): id is string => Boolean(id)));
    const expanded = new Set(state.view.expandedIds);
    const allOpen = [...parents].every((id) => expanded.has(id));
    renderGridHeader(doc.getElementById("gridHeader") as HTMLElement, doc.getElementById("taskPane") as HTMLElement, state.view.columns, allOpen, () => {
      const current = controller.getState();
      const ids = parentIds(current.tasks ?? []);
      const open = ids.every((id) => current.view.expandedIds.includes(id));
      controller.patchView({ expandedIds: open ? [] : ids });
    });
    renderGridRows(
      gridScroll,
      rows,
      state.view.columns,
      expanded,
      state.view.selectedId,
      parents,
      (id) => {
        const current = new Set(controller.getState().view.expandedIds);
        if (current.has(id)) current.delete(id);
        else current.add(id);
        controller.patchView({ expandedIds: [...current] });
      },
      (id) => controller.patchView({ selectedId: id }),
    );
    const viewport = timeScroll.clientWidth;
    fittedWidth = viewport;
    renderTimeline({
      head: headInner,
      canvas: doc.getElementById("timeCanvas") as HTMLElement,
      rows: doc.getElementById("timelineRows") as HTMLElement,
      rowsData: rows,
      tasks,
      palette: state.palette,
      zoom: state.view.zoom,
      fitMode: state.view.fitMode,
      viewportPx: viewport,
      showDependencies: state.view.showDependencies,
      selectedId: state.view.selectedId,
      today: todayInTimeZone(new Date()),
      blackout,
      calendar,
      onOpen: (id) => controller.patchView({ selectedId: id }),
    });
    const panel = doc.getElementById("panel") as HTMLElement;
    const backdrop = doc.getElementById("backdrop") as HTMLElement;
    const selected = tasks.find((task) => task.id === state.view.selectedId) ?? null;
    panel.classList.toggle("open", Boolean(selected));
    backdrop.classList.toggle("open", Boolean(selected));
    renderDetail(doc.getElementById("detailContent") as HTMLElement, selected, tasks, state.palette, todayInTimeZone(new Date()), calendar);
    if (selected) {
      panel.removeAttribute("aria-hidden");
      panel.setAttribute("aria-labelledby", "detailTitle");
    } else {
      panel.setAttribute("aria-hidden", "true");
      panel.removeAttribute("aria-labelledby");
    }
    if (state.view.selectedId !== announcedSelection) {
      if (keyboardOpen && state.view.selectedId) doc.getElementById("close")?.focus();
      else if (keyboardOpen && announcedSelection) {
        doc.querySelector<HTMLElement>(`.task-row[data-task-id="${CSS.escape(announcedSelection)}"]`)?.focus();
      }
      keyboardOpen = false;
      announcedSelection = state.view.selectedId;
    }
    syncFilters(doc, tasks, state.view, () => controller.getState().view, (patch) => controller.patchView(patch));
    syncColumnChecks(doc, state.view.columns);
    syncZoom(doc, state.view.zoom);
    const hide = doc.getElementById("hideInactive");
    if (hide instanceof HTMLInputElement && doc.activeElement !== hide) hide.checked = state.view.hideInactive;
    const deps = doc.getElementById("deps");
    if (deps instanceof HTMLInputElement && doc.activeElement !== deps) deps.checked = state.view.showDependencies;
    const search = doc.getElementById("search");
    if (search instanceof HTMLInputElement && doc.activeElement !== search && search.value !== state.view.search) {
      search.value = state.view.search;
    }
    refreshHolidayCoverage(tasks);
  };

  const refreshHolidayCoverage = (tasks: readonly Task[]) => {
    const bounds = scheduleBounds(tasks);
    const years = bounds ? yearsTouched(isoFromMs(bounds.start), isoFromMs(bounds.end - DAY_MS)) : [];
    const note = doc.getElementById("holidayCoverage");
    if (note) note.textContent = holidayCoverageNote(calendar, years);
    for (const year of years) {
      if (calendar.coveredYears.has(year) || calendar.failedYears.includes(year) || pendingYears.has(year)) continue;
      pendingYears.add(year);
      void fetchHolidayYear(year).then(
        (names) => {
          pendingYears.delete(year);
          calendar = absorbHolidayYear(calendar, year, names);
          paint();
        },
        () => {
          pendingYears.delete(year);
          calendar = absorbHolidayYear(calendar, year, null);
          paint();
        },
      );
    }
  };

  bindChrome(doc, controller, blackout, paint, timeScroll, gridScroll, headInner);
  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePopover(doc, "filterToggle", "filterPopover");
      closePopover(doc, "columnToggle", "columnPopover");
      closePopover(doc, "calendarSettings", "calendarPopover");
      if (doc.getElementById("panel")?.classList.contains("open")) {
        keyboardOpen = true;
        controller.patchView({ selectedId: null });
      }
      return;
    }
    if (event.key === "Tab") {
      const panel = doc.getElementById("panel");
      if (!panel?.classList.contains("open")) return;
      const focusable = focusableIn(panel);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.classList.contains("task-row") && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      keyboardOpen = true;
      controller.patchView({ selectedId: target.dataset.taskId ?? null });
      return;
    }
    if (target.classList.contains("bar") && (event.key === "Enter" || event.key === " ")) {
      const id = target.dataset.taskId;
      if (!id) return;
      event.preventDefault();
      keyboardOpen = true;
      controller.patchView({ selectedId: id });
      return;
    }
    if (target.classList.contains("task-row") && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      const rows = Array.from(doc.querySelectorAll<HTMLElement>(".task-row"));
      const next = rows[rows.indexOf(target) + (event.key === "ArrowDown" ? 1 : -1)];
      if (!next) return;
      event.preventDefault();
      next.focus();
    }
  });
  controller.subscribe(paint);
  paint();
  requestAnimationFrame(() => {
    if (controller.getState().view.fitMode) paint();
  });
  const observer = new ResizeObserver(() => {
    const state = controller.getState();
    if (!state.view.fitMode || timeScroll.clientWidth === fittedWidth) return;
    paint();
  });
  observer.observe(timeScroll);
}

function paintChrome(doc: Document, state: SessionState, tasks: readonly Task[], blackout: BlackoutInterval): void {
  doc.body.dataset.status = state.status;
  const title = doc.getElementById("title");
  if (title) title.textContent = state.fileName ? fileTitle(state.fileName) : "Gantt Viewer";
  const provenance = doc.getElementById("provenance");
  if (provenance) provenance.textContent = state.status === "ready" && state.loadedAt ? provenanceText(state) : "";
  const notice = doc.getElementById("notice");
  if (notice) notice.textContent = state.notice ?? "";
  const issues = doc.getElementById("issues");
  if (issues) {
    issues.replaceChildren();
    const lines = state.loadError ? state.loadError.map((issue) => issue.message) : issueLines(state.issues);
    for (const line of lines) {
      const item = doc.createElement("li");
      item.textContent = line;
      issues.append(item);
    }
  }
  const empty = doc.getElementById("emptyState");
  if (empty) empty.hidden = tasks.length > 0;
  const emptyText = doc.getElementById("emptyText");
  if (emptyText) {
    emptyText.textContent = state.notice ?? "Choose an .xlsx workbook exported from the SharePoint list.";
  }
  const reconnect = doc.getElementById("reconnect");
  if (reconnect) reconnect.hidden = !state.canReconnect || state.status === "ready";
  const idle = state.status === "empty" && !state.canReconnect;
  for (const id of ["reload", "change", "forget"]) {
    doc.getElementById(id)?.toggleAttribute("disabled", idle);
  }
  const nonSummary = tasks.filter((task) => task.taskType !== "Summary");
  setText(doc, "metricTasks", tasks.length ? String(nonSummary.length) : "—");
  setText(doc, "metricMilestones", tasks.length ? String(tasks.filter((task) => task.taskType === "Milestone").length) : "—");
  const attention = attentionCounts(tasks, todayInTimeZone(new Date()));
  setText(doc, "metricRisks", tasks.length ? String(attention.atRiskOrBlocked) : "—");
  setText(
    doc,
    "attentionBreakdown",
    tasks.length ? `${attention.atRiskOrBlocked} at risk / blocked · ${attention.overdue} overdue` : "At risk / blocked · 0 overdue",
  );
  const progress = tasks.length ? overallProgress(tasks) : null;
  setText(doc, "metricProgress", tasks.length ? progressLabel(progress) : "—");
  const bounds = scheduleBounds(tasks);
  setText(
    doc,
    "rangeMeta",
    bounds
      ? `${formatPlanDate(new Date(bounds.start).toISOString().slice(0, 10))} – ${formatPlanDate(new Date(bounds.end - DAY_MS).toISOString().slice(0, 10))} · Planned dates only · Read-only`
      : "Planned project schedule · Read-only",
  );
  const visible = visibleRows(tasks, state.view).length;
  setText(doc, "count", tasks.length ? `${visible} visible rows · ${tasks.length} total records` : "—");
  renderLegend(doc, tasks, state.palette);
  const enabled = doc.getElementById("blackoutEnabled");
  const start = doc.getElementById("blackoutStart");
  const end = doc.getElementById("blackoutEnd");
  if (enabled instanceof HTMLInputElement && doc.activeElement !== enabled) enabled.checked = blackout.enabled;
  if (start instanceof HTMLInputElement && doc.activeElement !== start) start.value = blackout.start;
  if (end instanceof HTMLInputElement && doc.activeElement !== end) end.value = blackout.end;
}

function bindChrome(
  doc: Document,
  controller: ImportController,
  blackout: BlackoutInterval,
  paint: () => void,
  timeScroll: HTMLElement,
  gridScroll: HTMLElement,
  headInner: HTMLElement,
): void {
  const columnOptions = doc.getElementById("columnOptions");
  if (columnOptions && !columnOptions.childElementCount) {
    for (const column of COLUMN_DEFS) {
      const label = doc.createElement("label");
      label.className = "filter-option";
      const input = doc.createElement("input");
      input.type = "checkbox";
      input.dataset.column = column.id;
      input.checked = column.fixed || controller.getState().view.columns.includes(column.id);
      input.disabled = column.fixed;
      input.addEventListener("change", () => {
        const view = controller.getState().view;
        const columns = new Set(view.columns);
        if (input.checked) columns.add(column.id);
        else columns.delete(column.id);
        const patch: Partial<ViewState> = { columns: [...columns] };
        if (!input.checked && column.id === "status") patch.statuses = [];
        if (!input.checked && column.id === "owner") patch.owners = [];
        if (!input.checked && column.id === "type") patch.types = [];
        if (!input.checked && column.id === "workstream") patch.workstreams = [];
        controller.patchView(patch);
      });
      label.append(input, doc.createTextNode(column.title + (column.fixed ? " · always shown" : "")));
      columnOptions.append(label);
    }
  }

  doc.getElementById("resetColumns")?.addEventListener("click", () => {
    controller.patchView({ columns: ["owner", "status", "finish"], types: [], workstreams: [] });
  });
  doc.getElementById("search")?.addEventListener("input", (event) => {
    const value = event.target instanceof HTMLInputElement ? event.target.value.trim() : "";
    controller.patchView({ search: value });
  });
  doc.getElementById("hideInactive")?.addEventListener("change", (event) => {
    controller.patchView({ hideInactive: event.target instanceof HTMLInputElement && event.target.checked });
  });
  doc.getElementById("deps")?.addEventListener("change", (event) => {
    controller.patchView({ showDependencies: event.target instanceof HTMLInputElement && event.target.checked });
  });
  doc.querySelectorAll<HTMLButtonElement>("[data-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const zoom = button.dataset.zoom;
      if (zoom === "day" || zoom === "week" || zoom === "month" || zoom === "quarter") {
        controller.patchView({ zoom, fitMode: false });
      }
    });
  });
  doc.getElementById("fitTop")?.addEventListener("click", () => {
    controller.patchView({ fitMode: true });
    timeScroll.scrollLeft = 0;
  });
  doc.getElementById("today")?.addEventListener("click", () => {
    const state = controller.getState();
    const bounds = scheduleBounds(state.tasks ?? []);
    if (!bounds) return;
    const px = pixelsPerDay(state.view.zoom, state.view.fitMode, timeScroll.clientWidth, (bounds.end - bounds.start) / DAY_MS);
    const today = dateMs(todayInTimeZone(new Date()));
    timeScroll.scrollLeft = Math.max(0, ((today - bounds.start) / DAY_MS) * px - timeScroll.clientWidth / 2);
  });
  doc.getElementById("close")?.addEventListener("click", () => controller.patchView({ selectedId: null }));
  doc.getElementById("backdrop")?.addEventListener("click", () => controller.patchView({ selectedId: null }));
  doc.getElementById("clearFilters")?.addEventListener("click", () => clearFilters(controller, doc));
  doc.getElementById("clearInPopover")?.addEventListener("click", () => clearFilters(controller, doc));
  wirePopover(doc, "filterToggle", "filterPopover");
  wirePopover(doc, "columnToggle", "columnPopover");
  wirePopover(doc, "calendarSettings", "calendarPopover");
  doc.getElementById("filterClose")?.addEventListener("click", () => closePopover(doc, "filterToggle", "filterPopover"));
  doc.getElementById("filterDone")?.addEventListener("click", () => closePopover(doc, "filterToggle", "filterPopover"));
  doc.getElementById("columnClose")?.addEventListener("click", () => closePopover(doc, "columnToggle", "columnPopover"));
  doc.getElementById("columnDone")?.addEventListener("click", () => closePopover(doc, "columnToggle", "columnPopover"));
  doc.getElementById("calendarClose")?.addEventListener("click", () => closePopover(doc, "calendarSettings", "calendarPopover"));
  doc.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    dismissOnOutside(doc, target, "filterPopover", "filterToggle");
    dismissOnOutside(doc, target, "columnPopover", "columnToggle");
    dismissOnOutside(doc, target, "calendarPopover", "calendarSettings");
  });
  doc.getElementById("applyBlackout")?.addEventListener("click", () => {
    const enabled = (doc.getElementById("blackoutEnabled") as HTMLInputElement | null)?.checked ?? false;
    const start = (doc.getElementById("blackoutStart") as HTMLInputElement | null)?.value ?? "";
    const end = (doc.getElementById("blackoutEnd") as HTMLInputElement | null)?.value ?? "";
    const error = doc.getElementById("calendarError");
    const parsed = blackoutFromInput(enabled, start, end);
    if ("error" in parsed) {
      if (error) error.textContent = parsed.error;
      return;
    }
    blackout.enabled = parsed.interval.enabled;
    blackout.start = parsed.interval.start;
    blackout.end = parsed.interval.end;
    if (error) error.textContent = "";
    closePopover(doc, "calendarSettings", "calendarPopover");
    paint();
  });
  doc.getElementById("clearBlackout")?.addEventListener("click", () => {
    blackout.enabled = false;
    blackout.start = "";
    blackout.end = "";
    const error = doc.getElementById("calendarError");
    if (error) error.textContent = "";
    paint();
  });
  let lock = false;
  gridScroll.addEventListener("scroll", () => {
    if (lock) return;
    lock = true;
    timeScroll.scrollTop = gridScroll.scrollTop;
    lock = false;
  });
  timeScroll.addEventListener("scroll", () => {
    if (lock) return;
    lock = true;
    gridScroll.scrollTop = timeScroll.scrollTop;
    headInner.style.transform = `translateX(-${timeScroll.scrollLeft}px)`;
    lock = false;
  });
  const handle = doc.getElementById("resize");
  const gantt = doc.getElementById("gantt");
  if (handle && gantt) {
    handle.tabIndex = 0;
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    handle.setAttribute("aria-label", "Resize WBS table");
    handle.setAttribute("aria-valuemin", "285");
    let dragging = false;
    handle.addEventListener("pointerdown", (event) => {
      dragging = true;
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const rect = gantt.getBoundingClientRect();
      const value = Math.max(285, Math.min(rect.width - 260, event.clientX - rect.left));
      gantt.style.setProperty("--grid", `${value}px`);
      handle.setAttribute("aria-valuenow", String(Math.round(value)));
    });
    handle.addEventListener("pointerup", () => {
      dragging = false;
    });
    handle.addEventListener("pointercancel", () => {
      dragging = false;
    });
    handle.addEventListener("keydown", (event) => {
      const width = gantt.getBoundingClientRect().width;
      const max = width - 260;
      const current = Number.parseFloat(getComputedStyle(gantt).getPropertyValue("--grid")) || 540;
      const next = gridWidthFromKey(current, event.key, 285, max);
      if (next == null) return;
      event.preventDefault();
      gantt.style.setProperty("--grid", `${next}px`);
      handle.setAttribute("aria-valuenow", String(Math.round(next)));
      handle.setAttribute("aria-valuemax", String(Math.round(Math.max(285, max))));
    });
  }
}

function visibleRows(tasks: readonly Task[], view: ViewState) {
  const filtering = Boolean(
    view.search.trim() || view.statuses.length || view.owners.length || view.types.length || view.workstreams.length || view.hideInactive,
  );
  return flattenVisible(tasks, filtering ? new Set(tasks.map((task) => task.id)) : new Set(view.expandedIds), {
    search: view.search,
    statuses: view.statuses,
    owners: view.owners,
    types: view.types,
    workstreams: view.workstreams,
    hideInactive: view.hideInactive,
    columns: {
      status: view.columns.includes("status"),
      owner: view.columns.includes("owner"),
      type: view.columns.includes("type"),
      workstream: view.columns.includes("workstream"),
    },
  });
}

function parentIds(tasks: readonly Task[]): string[] {
  const parents = new Set(tasks.map((task) => task.parentId).filter((id): id is string => Boolean(id)));
  return [...parents];
}

function renderLegend(doc: Document, tasks: readonly Task[], palette: SessionState["palette"]): void {
  const legend = doc.getElementById("workstreamLegend");
  if (!legend) return;
  legend.replaceChildren();
  const seen: string[] = [];
  for (const task of tasks) {
    if (!seen.includes(task.workstream)) seen.push(task.workstream);
  }
  for (const name of seen) {
    const item = doc.createElement("span");
    const swatch = doc.createElement("i");
    swatch.className = "swatch";
    swatch.style.background = paletteColor(palette, name);
    item.append(swatch, doc.createTextNode(name));
    legend.append(item);
  }
}

function issueLines(issues: readonly ImportIssue[]): string[] {
  const lines: string[] = [];
  const fallback = issues.find((issue) => issue.code === "single-sheet-fallback");
  if (fallback) lines.push(fallback.message);
  const blanks = issues.filter((issue) => issue.code === "blank-dates").length;
  if (blanks) lines.push(`${blanks} ${blanks === 1 ? "task has" : "tasks have"} no planned dates and are not drawn.`);
  const rejected = issues.filter((issue) => issue.code === "rejected-item-url").length;
  if (rejected) lines.push(`${rejected} item ${rejected === 1 ? "link is" : "links are"} not on an allowed SharePoint host.`);
  const rest = issues.filter((issue) => !["single-sheet-fallback", "blank-dates", "rejected-item-url"].includes(issue.code));
  for (const issue of rest.slice(0, 5)) lines.push(issue.message);
  if (rest.length > 5) lines.push(`${rest.length - 5} more import warnings.`);
  return lines;
}

function provenanceText(state: SessionState): string {
  const modified = state.latestModified ? state.latestModified.slice(0, 10) : "not available";
  return `Loaded at ${state.loadedAt} · Tasks ${state.taskCount} · Latest source record modified ${modified}`;
}

function clearFilters(controller: ImportController, doc: Document): void {
  const hide = doc.getElementById("hideInactive");
  if (hide instanceof HTMLInputElement) hide.checked = false;
  controller.patchView({ statuses: [], owners: [], types: [], workstreams: [], hideInactive: false });
}

function syncColumnChecks(doc: Document, columns: readonly string[]): void {
  for (const input of Array.from(doc.querySelectorAll<HTMLInputElement>("#columnOptions input"))) {
    const id = input.dataset.column;
    if (!id || input.disabled) continue;
    input.checked = columns.includes(id);
  }
}

function syncZoom(doc: Document, zoom: ViewState["zoom"]): void {
  doc.querySelectorAll<HTMLButtonElement>("[data-zoom]").forEach((button) => {
    const active = button.dataset.zoom === zoom;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function wirePopover(doc: Document, buttonId: string, popoverId: string): void {
  doc.getElementById(buttonId)?.addEventListener("click", () => {
    const popover = doc.getElementById(popoverId);
    const button = doc.getElementById(buttonId);
    if (!popover || !button) return;
    const opening = popover.hidden;
    for (const id of ["filterPopover", "columnPopover", "calendarPopover"]) {
      if (id !== popoverId) closePopover(doc, id === "filterPopover" ? "filterToggle" : id === "columnPopover" ? "columnToggle" : "calendarSettings", id);
    }
    popover.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));
  });
}

function closePopover(doc: Document, buttonId: string, popoverId: string): void {
  const popover = doc.getElementById(popoverId);
  if (popover) popover.hidden = true;
  doc.getElementById(buttonId)?.setAttribute("aria-expanded", "false");
}

function dismissOnOutside(doc: Document, target: Node, popoverId: string, buttonId: string): void {
  const popover = doc.getElementById(popoverId);
  const button = doc.getElementById(buttonId);
  if (!popover || popover.hidden) return;
  if (popover.contains(target) || button?.contains(target)) return;
  closePopover(doc, buttonId, popoverId);
}

function setText(doc: Document, id: string, text: string): void {
  const node = doc.getElementById(id);
  if (node) node.textContent = text;
}
