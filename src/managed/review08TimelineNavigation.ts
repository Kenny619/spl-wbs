import type { Zoom } from "../app/state";
import type { ImportController } from "../data/importController";
import { pixelsPerDay } from "../ui/scale";

/**
 * DES-012 Review08 Timeline Previous/Next buttons for the LIVE Excel-managed
 * Gantt only. These scroll the existing date-scaled #timeScroll viewport,
 * rather than shifting fictional mock dates, changing task commitments, or
 * adding a second calendar/rendering pipeline. The read-only v18 viewer is
 * deliberately unchanged.
 *
 * At Fit/no overflow the buttons are genuinely disabled. This is more honest
 * than claiming an action that would have no visible effect.
 */
const PERIOD_DAYS: Record<Zoom, number> = {
  day: 4,
  week: 28,
  month: 120,
  quarter: 360,
};

export function mountManagedReview08TimelineNavigation(
  doc: Document,
  controller: ImportController,
  timelineControls: HTMLElement,
): void {
  const timeScroll = doc.getElementById("timeScroll");
  const today = timelineControls.querySelector<HTMLElement>("#today");
  if (!timeScroll || !today) {
    throw new Error("Managed DES-012 timeline navigation needs the existing Gantt and Today control.");
  }
  const group = doc.createElement("div");
  group.className = "managed-review08-period-nav";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Timeline navigation");

  const makeArrow = (id: string, symbol: string, label: string) => {
    const button = doc.createElement("button");
    button.type = "button";
    button.id = id;
    button.className = "tool managed-review08-period-arrow";
    button.textContent = symbol;
    button.setAttribute("aria-label", label);
    button.title = label + " within the loaded project schedule";
    group.append(button);
    return button;
  };
  const previous = makeArrow("prevGantt", "‹", "Previous timeline period");
  // Reparent the ORIGINAL Today button: v18 already wired its calendar
  // scroll-to-today handler. No clone or extra conflicting click listener.
  group.append(today);
  const next = makeArrow("nextGantt", "›", "Next timeline period");
  const zoomGroup = timelineControls.querySelector(".zoom-group");
  if (zoomGroup) zoomGroup.after(group);
  else timelineControls.prepend(group);

  const maxScroll = () => Math.max(0, timeScroll.scrollWidth - timeScroll.clientWidth);
  const sync = () => {
    const { tasks, view } = controller.getState();
    const scheduled = tasks?.some(t => t.scheduled && t.plannedStart && t.plannedEnd) ?? false;
    const max = maxScroll();
    const canNavigate = scheduled && !view.fitMode && max > 2;
    previous.disabled = !canNavigate || timeScroll.scrollLeft <= 1;
    next.disabled = !canNavigate || timeScroll.scrollLeft >= max - 1;
    group.title = canNavigate
      ? "Move through actual project dates in the timeline"
      : "All loaded project dates fit; choose Day or Week zoom for navigation";
  };
  const move = (direction: -1 | 1) => {
    const { view } = controller.getState();
    const max = maxScroll();
    if (view.fitMode || max <= 2) return;
    const step = Math.min(
      Math.max(45, PERIOD_DAYS[view.zoom] *
        pixelsPerDay(view.zoom, false, timeScroll.clientWidth, 1)),
      Math.max(45, timeScroll.clientWidth * 0.8),
    );
    const target = Math.max(0, Math.min(max, timeScroll.scrollLeft + direction * step));
    if (Math.abs(target - timeScroll.scrollLeft) < 1) return;
    timeScroll.scrollLeft = target;
    sync();
  };
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  // The original Gantt paints first in the controller notification sequence.
  controller.subscribe(sync);
  timeScroll.addEventListener("scroll", sync, { passive: true });
  new ResizeObserver(sync).observe(timeScroll);
  sync();
}
