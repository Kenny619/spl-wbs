import type { ManagedReports } from "./reportsUi";
import type { ImportController } from "../data/importController";
import type { ManagedSettings } from "./settingsUi";

/**
 * DES-010 UI-INT-01: managed-only presentation adapter around the already-mounted
 * v18 viewer. Move the original DOM nodes; NEVER clone file, Gantt, or editor controls.
 * The regular read-only viewer never imports this module.
 */
export function mountManagedShell(
  doc: Document,
  controller: ImportController,
  reports: ManagedReports,
  settings: ManagedSettings,
  guard: (action: () => void) => void,
): void {
  const main = doc.querySelector<HTMLElement>(".main");
  const topbar = doc.querySelector<HTMLElement>(".topbar");
  const originalActions = doc.querySelector<HTMLElement>(".top-actions");
  const chart = doc.querySelector<HTMLElement>(".chart-card");
  const inspector = doc.getElementById("panel");
  if (!main || !topbar || !originalActions || !chart || !inspector) {
    throw new Error("Managed shell requires the approved v18 core layout.");
  }

  const brand = doc.createElement("div");
  brand.className = "managed-brand";
  brand.setAttribute("aria-label", "SPT-WBS app icon");
  const asset = doc.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href;
  if (asset) {
    const icon = doc.createElement("img");
    icon.src = asset;
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    brand.append(icon);
  }
  topbar.prepend(brand);

  const title = doc.getElementById("title")?.parentElement;
  title?.classList.add("managed-project-heading");

  const nav = doc.createElement("nav");
  nav.className = "managed-main-nav";
  nav.setAttribute("aria-label", "Managed workspaces");
  const schedule = doc.createElement("button");
  schedule.type = "button";
  schedule.dataset.managedView = "schedule";
  schedule.className = "managed-action active";
  schedule.setAttribute("aria-current", "page");
  schedule.textContent = "Schedule";
  schedule.addEventListener("click", () => reports.close());

  const reportsLaunch = reports.getLaunchButton();
  reportsLaunch.textContent = "Reports";
  reportsLaunch.dataset.managedView = "reports";
  nav.append(schedule, reportsLaunch);

  const menu = doc.createElement("details");
  menu.className = "managed-project-menu";
  const summary = doc.createElement("summary");
  summary.textContent = "Project";
  summary.setAttribute("aria-label", "Project and workbook actions");
  menu.append(summary, originalActions);
  // Native details keeps pointer/keyboard activation; close it when the user
  // selects a project action or leaves the menu, rather than obscuring the WBS.
  const dismissMenu = () => { menu.open = false; };
  originalActions.addEventListener("click", dismissMenu);
  originalActions.addEventListener("change", dismissMenu);
  doc.addEventListener("pointerdown", (event) => {
    if (menu.open && event.target instanceof Node && !menu.contains(event.target)) dismissMenu();
  }, true);
  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      event.preventDefault();
      dismissMenu();
      summary.focus();
    }
  });

  const settingsLaunch = settings.getLaunchButton();
  settingsLaunch.classList.add("managed-global-settings");

  topbar.append(nav, menu, settingsLaunch);

  // Only previously approved TaskStatus values back this first scope control.
  // Under Watch, inferred overdue and new commitment algorithms are NOT included.
  const scope = doc.createElement("div");
  scope.className = "managed-gantt-scope";
  scope.setAttribute("role", "group");
  scope.setAttribute("aria-label", "Gantt task scope");
  const exceptionButton = doc.createElement("button");
  exceptionButton.type = "button";
  exceptionButton.textContent = "Exceptions";
  exceptionButton.title = "Existing statuses only: At Risk and Blocked. No inferred watch/risk data.";
  exceptionButton.dataset.managedScope = "exceptions";
  const workstreamButton = doc.createElement("button");
  workstreamButton.type = "button";
  workstreamButton.textContent = "Workstreams";
  workstreamButton.title = "Return to the previous status filter and inspect all workstreams.";
  workstreamButton.dataset.managedScope = "workstreams";
  scope.append(exceptionButton, workstreamButton);
  const scopeHint = doc.createElement("span");
  scopeHint.className = "managed-gantt-scope-note";
  scopeHint.textContent = "Existing status-based exceptions only";
  scope.append(scopeHint);
  const chartTitle = doc.querySelector<HTMLElement>(".chart-top");
  const toolbar = doc.querySelector<HTMLElement>(".chart-top .toolbar");
  if (chartTitle) chartTitle.insertBefore(scope, toolbar ?? null);

  let mode: "exceptions" | "workstreams" = "workstreams";
  let previousStatuses: string[] = [];
  const statusExceptions = ["At Risk", "Blocked"];
  const isExceptionFilter = (value: readonly string[]) =>
    value.length === statusExceptions.length && statusExceptions.every(x => value.includes(x));
  const syncScope = () => {
    const current = controller.getState().view;
    if (mode === "exceptions" && !isExceptionFilter(current.statuses)) mode = "workstreams";
    exceptionButton.disabled = !current.columns.includes("status");
    for (const [button, kind] of [[exceptionButton, "exceptions"], [workstreamButton, "workstreams"]] as const) {
      const active = mode === kind;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  };
  exceptionButton.addEventListener("click", () => {
    if (mode === "exceptions") return;
    guard(() => {
    const view = controller.getState().view;
    if (!view.columns.includes("status")) return;
    previousStatuses = [...view.statuses];
    mode = "exceptions";
    controller.patchView({ statuses: [...statusExceptions] });
    syncScope();
    });
  });
  workstreamButton.addEventListener("click", () => {
    if (mode === "workstreams") return;
    guard(() => {
    mode = "workstreams";
    controller.patchView({ statuses: [...previousStatuses] });
    syncScope();
    });
  });
  controller.subscribe(syncScope);
  syncScope();

  const fit = doc.getElementById("fitTop");
  if (fit) {
    fit.textContent = "Fit";
    fit.setAttribute("aria-label", "Fit entire schedule");
    fit.setAttribute("title", "Fit the entire project timeline");
    fit.classList.remove("btn-primary");
    fit.classList.add("tool");
    doc.querySelector<HTMLElement>(".chart-top .toolbar")?.append(fit);
  }
  // Preserve the original task-selection and editor nodes and all their handlers.
  const workspace = doc.createElement("div");
  workspace.className = "managed-schedule-body";
  main.insertBefore(workspace, chart);
  workspace.append(chart, inspector);
  inspector.setAttribute("role", "region");
  const backdrop = doc.getElementById("backdrop");
  if (backdrop) backdrop.setAttribute("hidden", "");

  // Reports owns its visibility and keeps its actual committed-workbook engine.
  const syncNav = () => {
    const inReports = doc.body.classList.contains("spt-managed-report-open");
    schedule.classList.toggle("active", !inReports);
    if (inReports) schedule.removeAttribute("aria-current");
    else schedule.setAttribute("aria-current", "page");
    reportsLaunch.classList.toggle("active", inReports);
  };
  const observer = new MutationObserver(syncNav);
  observer.observe(doc.body, { attributes: true, attributeFilter: ["class"] });
  syncNav();
}
