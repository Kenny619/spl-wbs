import type { ImportController } from "../data/importController";
import type { Zoom } from "../app/state";
import { DAY_MS, pixelsPerDay, scheduleBounds } from "../ui/scale";

/**
 * Managed-only DES-012 Review08 Gantt period navigation.
 * The original v18 timeline keeps ownership of render, selection, zoom,
 * today, fit, scroll synchronization and Excel workbook task data.
 */
const PERIOD_DAYS: Record<Zoom, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
};

export function review08PeriodPixels(
  zoom: Zoom, width: number, spanDays: number,
): number {
  return PERIOD_DAYS[zoom] * pixelsPerDay(zoom, false, width, spanDays);
}

export function mountReview08PeriodNavigation(
  doc: Document,
  controller: ImportController,
  container: HTMLElement,
): void {
  const timeScroll = doc.getElementById("timeScroll");
  if (!timeScroll) throw new Error("DES012 Gantt period navigation needs the live timeline scroller.");
  const previous = doc.createElement("button");
  previous.type = "button";
  previous.id = "prevGantt";
  previous.className = "tool managed-period-button";
  previous.textContent = "‹";
  previous.title = "Previous timeline period";
  previous.setAttribute("aria-label", "Previous timeline period");
  const next = doc.createElement("button");
  next.type = "button";
  next.id = "nextGantt";
  next.className = "tool managed-period-button";
  next.textContent = "›";
  next.title = "Next timeline period";
  next.setAttribute("aria-label", "Next timeline period");

  const realToday = container.querySelector<HTMLElement>("#today");
  if (!realToday) throw new Error("Review08 Timeline nav needs the real Today control.");
  // Visible sequence: timeline zoom → Prev → original Today → Next → Fit.
  realToday.before(previous);
  realToday.after(next);

  const sync = (): void => {
    const state = controller.getState();
    const bounds = scheduleBounds(state.tasks ?? []);
    const canMove = !!bounds && !state.view.fitMode && timeScroll.scrollWidth > timeScroll.clientWidth + 1;
    const max = Math.max(0, timeScroll.scrollWidth - timeScroll.clientWidth);
    previous.disabled = !canMove || timeScroll.scrollLeft <= 1;
    next.disabled = !canMove || timeScroll.scrollLeft >= max - 1;
  };
  const move = (direction: -1 | 1): void => {
    const state = controller.getState();
    const bounds = scheduleBounds(state.tasks ?? []);
    if (!bounds || state.view.fitMode) return;
    const span = (bounds.end - bounds.start) / DAY_MS;
    const amount = review08PeriodPixels(state.view.zoom, timeScroll.clientWidth, span);
    const max = Math.max(0, timeScroll.scrollWidth - timeScroll.clientWidth);
    timeScroll.scrollLeft = Math.min(max,
      Math.max(0, timeScroll.scrollLeft + direction * amount));
    sync();
  };
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  timeScroll.addEventListener("scroll", sync);
  controller.subscribe(() => {
    sync();
    requestAnimationFrame(sync); // after existing v18 timeline paint
  });
  const resized = new ResizeObserver(sync);
  resized.observe(timeScroll);
  // View-state publications may occur just before the original v18 timeline
  // repaints; a frame sync reads the final width/zoom without touching layout.
  const originalZoom = container.querySelector<HTMLElement>(".zoom-group");
  originalZoom?.addEventListener("click", () => requestAnimationFrame(sync));
  container.querySelector("#fitTop")?.addEventListener("click", () => requestAnimationFrame(sync));
  container.querySelector("#today")?.addEventListener("click", () => requestAnimationFrame(sync));
  sync();
}
