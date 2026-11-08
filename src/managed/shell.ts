import type { ManagedReports } from "./reportsUi";
import type { ManagedSettings } from "./settingsUi";

/**
 * DES-010 UI-INT-01: managed-only presentation adapter around the already-mounted
 * v18 viewer. Move the original DOM nodes; NEVER clone file, Gantt, or editor controls.
 * The regular read-only viewer never imports this module.
 */
export function mountManagedShell(
  doc: Document,
  reports: ManagedReports,
  settings: ManagedSettings,
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

  const settingsLaunch = settings.getLaunchButton();
  settingsLaunch.classList.add("managed-global-settings");

  topbar.append(nav, menu, settingsLaunch);

  const fit = doc.getElementById("fitTop");
  doc.querySelector<HTMLElement>(".chart-top .toolbar")?.append(...(fit ? [fit] : []));
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
