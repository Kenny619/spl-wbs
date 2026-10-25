import type { Zoom } from "../app/state";
import { blackoutContains, type BlackoutInterval } from "../calendar/blackout";
import type { HolidayCalendar } from "../calendar/jpHolidays";
import { pgcmMeetings, type PgcmMeeting } from "../calendar/pgcm";
import { compactRemaining, remainingWorkdays } from "../calendar/workdays";
import type { PaletteMap, Task } from "../data/types";
import type { FlatTask } from "../model/wbsTree";
import { paletteColor } from "../model/workstreamPalette";
import { shadeTitle } from "./calendarUi";
import { formatPlanDate, progressLabel } from "./format";
import {
  DAY_MS,
  barGeometry,
  dateMs,
  isUtcWeekend,
  isoFromMs,
  isoWeekNumber,
  milestoneLeft,
  mondayOnOrBefore,
  monthDayLabel,
  pixelsPerDay,
  scheduleBounds,
  type ScheduleBounds,
} from "./scale";

export function renderTimeline(options: {
  head: HTMLElement;
  canvas: HTMLElement;
  rows: HTMLElement;
  rowsData: readonly FlatTask[];
  tasks: readonly Task[];
  palette: PaletteMap;
  zoom: Zoom;
  fitMode: boolean;
  viewportPx: number;
  showDependencies: boolean;
  selectedId: string | null;
  today: string;
  blackout: BlackoutInterval;
  calendar: HolidayCalendar;
  onOpen: (id: string) => void;
}): void {
  const bounds = scheduleBounds(options.tasks);
  const spanDays = bounds ? (bounds.end - bounds.start) / DAY_MS : 1;
  const px = pixelsPerDay(options.zoom, options.fitMode, options.viewportPx, spanDays);
  const width = bounds ? Math.ceil(spanDays * px) : Math.max(options.viewportPx, 1);
  options.canvas.style.width = `${width}px`;
  options.head.style.width = `${width}px`;
  options.head.replaceChildren();
  options.rows.style.height = `${options.rowsData.length * 38}px`;
  options.rows.replaceChildren();
  if (bounds) {
    appendMonthLabels(options.head, bounds, px);
    appendMinorLabels(options.head, bounds, px, options.zoom);
    appendDayShades(options.head, options.rows, bounds, px, options.zoom, options.blackout, options.calendar);
  }
  const byId = new Map(options.tasks.map((task) => [task.id, task]));
  options.rowsData.forEach((task, index) => {
    const background = document.createElement("div");
    background.className = `timeline-row level-${task.depth}${task.id === options.selectedId ? " selected" : ""}`;
    background.style.top = `${index * 38}px`;
    background.addEventListener("click", () => options.onOpen(task.id));
    options.rows.append(background);
    if (task.scheduled && task.plannedStart && task.plannedEnd && bounds) {
      options.rows.append(taskBar(task, index, bounds.start, px, options.palette, options.onOpen, options.today, options.calendar));
    }
  });
  if (bounds) appendToday(options.rows, bounds, px, options.today);
  if (bounds) appendPgcm(options.head, options.rows, bounds, px, options.zoom, options.today, options.calendar, options.blackout);
  if (options.showDependencies && bounds) appendDependencies(options.rows, options.rowsData, byId, bounds.start, px, width);
}

function appendMonthLabels(head: HTMLElement, bounds: ScheduleBounds, px: number): void {
  const cursor = new Date(bounds.start);
  cursor.setUTCDate(1);
  while (cursor.getTime() < bounds.end) {
    const next = new Date(cursor);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const start = Math.max(cursor.getTime(), bounds.start);
    const end = Math.min(next.getTime(), bounds.end);
    const label = document.createElement("div");
    label.className = "time-label";
    label.style.left = `${((start - bounds.start) / DAY_MS) * px}px`;
    label.style.width = `${((end - start) / DAY_MS) * px}px`;
    label.textContent = cursor.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    head.append(label);
    cursor.setTime(next.getTime());
  }
}

function appendMinorLabels(head: HTMLElement, bounds: ScheduleBounds, px: number, zoom: Zoom): void {
  const weeks = document.createElement("div");
  weeks.style.cssText = "position:absolute;top:29px;left:0;right:0;height:32px;z-index:3";
  head.append(weeks);
  if (zoom === "week" || zoom === "month") {
    appendWeekColumns(weeks, bounds, px, zoom);
    return;
  }
  const step = zoom === "day" ? 1 : 30;
  let start = bounds.start;
  while (start < bounds.end) {
    const end = Math.min(start + step * DAY_MS, bounds.end);
    const label = document.createElement("div");
    label.className = "time-label week";
    label.style.left = `${((start - bounds.start) / DAY_MS) * px}px`;
    label.style.width = `${((end - start) / DAY_MS) * px}px`;
    const day = new Date(start).getUTCDate();
    label.textContent = zoom === "day" ? String(day) : "·";
    weeks.append(label);
    start = end;
  }
}

function appendWeekColumns(host: HTMLElement, bounds: ScheduleBounds, px: number, zoom: Zoom): void {
  let monday = dateMs(mondayOnOrBefore(isoFromMs(bounds.start)));
  while (monday < bounds.end) {
    const next = monday + 7 * DAY_MS;
    const start = Math.max(monday, bounds.start);
    const end = Math.min(next, bounds.end);
    const label = document.createElement("div");
    label.className = "time-label week";
    label.style.left = `${((start - bounds.start) / DAY_MS) * px}px`;
    label.style.width = `${((end - start) / DAY_MS) * px}px`;
    label.style.padding = "0";
    label.style.overflow = "hidden";
    const mondayIso = isoFromMs(monday);
    if (zoom === "month") {
      label.style.fontSize = "8px";
      label.style.lineHeight = "32px";
      label.textContent = String(isoWeekNumber(mondayIso));
    } else {
      label.textContent = monthDayLabel(mondayIso);
    }
    host.append(label);
    monday = next;
  }
}

function appendDayShades(
  head: HTMLElement,
  rows: HTMLElement,
  bounds: ScheduleBounds,
  px: number,
  zoom: Zoom,
  blackout: BlackoutInterval,
  calendar: HolidayCalendar,
): void {
  const fragment = document.createDocumentFragment();
  const shadeDays = zoom === "day" || zoom === "week";
  for (let time = bounds.start; time < bounds.end; time += DAY_MS) {
    const iso = isoFromMs(time);
    const x = ((time - bounds.start) / DAY_MS) * px;
    if (shadeDays && (isUtcWeekend(iso) || calendar.names[iso])) {
      fragment.append(dayShade(x, px, shadeTitle(iso, calendar)));
      if (zoom === "day") head.append(headerDayShade(x, px, shadeTitle(iso, calendar)));
    }
    if (shadeDays && blackoutContains(blackout, iso)) {
      const shade = document.createElement("div");
      shade.className = "blackout-overlay";
      shade.style.left = `${x}px`;
      shade.style.width = `${px}px`;
      fragment.append(shade);
    }
    if (zoom === "day" || ((zoom === "week" || zoom === "month") && isMonday(iso)) || (zoom === "quarter" && ((time - bounds.start) / DAY_MS) % 7 === 0)) {
      const line = document.createElement("div");
      line.className = "vertical-line";
      line.style.left = `${x}px`;
      fragment.append(line);
    }
  }
  rows.append(fragment);
}

function dayShade(x: number, px: number, title: string): HTMLElement {
  const shade = document.createElement("div");
  shade.className = "holiday-overlay";
  shade.style.left = `${x}px`;
  shade.style.width = `${px}px`;
  shade.style.background = "#eef3f8";
  shade.style.opacity = "1";
  shade.style.zIndex = "1";
  shade.title = title;
  return shade;
}

function headerDayShade(x: number, px: number, title: string): HTMLElement {
  const shade = dayShade(x, px, title);
  shade.style.top = "29px";
  shade.style.bottom = "0";
  shade.style.height = "auto";
  return shade;
}

function isMonday(iso: string): boolean {
  return new Date(`${iso}T12:00:00Z`).getUTCDay() === 1;
}

function taskBar(
  task: FlatTask,
  index: number,
  spanStart: number,
  px: number,
  palette: PaletteMap,
  onOpen: (id: string) => void,
  today: string,
  calendar: HolidayCalendar,
): HTMLElement {
  const color = paletteColor(palette, task.workstream);
  const geometry = barGeometry(task.plannedStart as string, task.plannedEnd as string, spanStart, px);
  const bar = document.createElement("div");
  bar.className = `bar${task.taskType === "Summary" ? " summary" : ""}${task.taskType === "Milestone" ? " milestone" : ""}`;
  bar.style.left = `${task.taskType === "Milestone" ? milestoneLeft(geometry.left, px) : geometry.left}px`;
  bar.style.width = `${geometry.width}px`;
  bar.style.top = `${index * 38 + (task.taskType === "Summary" ? 12 : 11)}px`;
  if (task.taskType === "Milestone") {
    bar.style.background = color;
  } else {
    bar.style.background = `${color}55`;
    bar.style.border = `1px solid ${color}75`;
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${task.progress ?? 0}%`;
    fill.style.background = color;
    bar.append(fill);
  }
  const remainder = compactRemaining(remainingWorkdays(task.plannedEnd, today, task.status, calendar));
  bar.title = `${task.wbsCode} ${task.taskName} | ${formatPlanDate(task.plannedStart)} → ${formatPlanDate(task.plannedEnd)} | ${progressLabel(task.progress)}${remainder ? ` | ${remainder}` : ""}`;
  bar.dataset.taskId = task.id;
  bar.tabIndex = 0;
  bar.setAttribute("role", "button");
  bar.setAttribute("aria-label", bar.title);
  bar.addEventListener("click", (event) => {
    event.stopPropagation();
    onOpen(task.id);
  });
  return bar;
}

function appendToday(rows: HTMLElement, bounds: ScheduleBounds, px: number, today: string): void {
  const time = dateMs(today);
  if (time < bounds.start || time > bounds.end) return;
  const line = document.createElement("div");
  line.className = "today-line";
  line.style.left = `${((time - bounds.start) / DAY_MS) * px}px`;
  rows.append(line);
}

function appendPgcm(
  head: HTMLElement,
  rows: HTMLElement,
  bounds: ScheduleBounds,
  px: number,
  zoom: Zoom,
  today: string,
  calendar: HolidayCalendar,
  blackout: BlackoutInterval,
): void {
  if (zoom !== "day" && zoom !== "week") return;
  for (const meeting of pgcmMeetings(bounds.start, bounds.end, today, calendar, blackout)) {
    const x = ((dateMs(meeting.date) - bounds.start) / DAY_MS) * px;
    const title = pgcmTitle(meeting);
    const mark = document.createElement("div");
    mark.className = zoom === "day" ? "pgcm-day-column" : "pgcm-marker";
    mark.style.left = `${x}px`;
    if (zoom === "day") mark.style.width = `${px}px`;
    mark.title = title;
    rows.append(mark);
    if (zoom === "day") {
      const headerShade = document.createElement("div");
      headerShade.className = "pgcm-day-column";
      headerShade.style.left = `${x}px`;
      headerShade.style.width = `${px}px`;
      headerShade.style.top = "29px";
      headerShade.style.bottom = "0";
      head.append(headerShade);
    }
    const tag = document.createElement("div");
    tag.className = zoom === "day" ? "pgcm-tag" : "pgcm-week-tag";
    tag.textContent = "PGCM";
    tag.style.left = `${x}px`;
    if (zoom === "day") tag.style.top = "3px";
    tag.title = title;
    head.append(tag);
  }
}

function pgcmTitle(meeting: PgcmMeeting): string {
  const when = formatPlanDate(meeting.date);
  return meeting.shifted ? `PGCM · ${when} (shifted from holiday)` : `PGCM · ${when}`;
}

function appendDependencies(
  rows: HTMLElement,
  list: readonly FlatTask[],
  byId: ReadonlyMap<string, Task>,
  spanStart: number,
  px: number,
  width: number,
): void {
  const index = new Map(list.map((task, position) => [task.id, position]));
  const height = list.length * 38;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "dep-layer");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  for (const task of list) {
    for (const predecessorId of task.predecessorIds) {
      const predecessor = byId.get(predecessorId);
      const from = index.get(predecessorId);
      const to = index.get(task.id);
      if (from == null || to == null || !predecessor?.plannedEnd || !task.plannedStart) continue;
      const x1 = ((dateMs(predecessor.plannedEnd) - spanStart) / DAY_MS) * px + px;
      const x2 = ((dateMs(task.plannedStart) - spanStart) / DAY_MS) * px;
      const y1 = from * 38 + 19;
      const y2 = to * 38 + 19;
      const mid = x1 + 8;
      svg.append(dependencyPath(`M${x1},${y1} H${mid} V${y2} H${x2 - 3}`));
      svg.append(dependencyPath(`M${x2 - 5},${y2 - 4} L${x2},${y2} L${x2 - 5},${y2 + 4}`));
    }
  }
  rows.append(svg);
}

function dependencyPath(data: string): SVGPathElement {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", data);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#8a97aa");
  path.setAttribute("stroke-width", "1.3");
  return path;
}
