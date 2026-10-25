import { addCalendarDays, inclusiveCalendarDays } from "../calendar/dateOnly";
import type { Zoom } from "../app/state";

export const DAY_MS = 86_400_000;

const ZOOM_PIXELS: Record<Zoom, number> = {
  day: 27,
  week: 7.5,
  month: 4,
  quarter: 1.7,
};

export function dateMs(iso: string): number {
  return Date.parse(`${iso}T12:00:00Z`);
}

export function isoFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isUtcWeekend(iso: string): boolean {
  const day = new Date(dateMs(iso)).getUTCDay();
  return day === 0 || day === 6;
}

export type ScheduleBounds = { start: number; end: number };

export function scheduleBounds(
  tasks: readonly { scheduled: boolean; plannedStart: string | null; plannedEnd: string | null }[],
): ScheduleBounds | null {
  const dated = tasks.filter((task) => task.scheduled && task.plannedStart && task.plannedEnd);
  if (!dated.length) return null;
  const start = Math.min(...dated.map((task) => dateMs(task.plannedStart as string)));
  const end = Math.max(...dated.map((task) => dateMs(task.plannedEnd as string))) + DAY_MS;
  return { start, end };
}

export function pixelsPerDay(zoom: Zoom, fitMode: boolean, viewportPx: number, spanDays: number): number {
  if (fitMode) return Math.max(0.5, viewportPx / Math.max(spanDays, 1));
  return ZOOM_PIXELS[zoom];
}

export const MILESTONE_MARK_PX = 13;

export function barGeometry(startIso: string, endIso: string, spanStart: number, px: number): { left: number; width: number } {
  return {
    left: ((dateMs(startIso) - spanStart) / DAY_MS) * px,
    width: Math.max(3, inclusiveCalendarDays(startIso, endIso) * px),
  };
}

/** Place the rotated milestone square so its center sits in the middle of its day column. */
export function milestoneLeft(columnLeft: number, px: number): number {
  return columnLeft + (px - MILESTONE_MARK_PX) / 2;
}

export function mondayOnOrBefore(iso: string): string {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  return addCalendarDays(iso, delta);
}

export function monthDayLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

/** ISO week of the Monday-start week that contains this date. */
export function isoWeekNumber(iso: string): number {
  const monday = mondayOnOrBefore(iso);
  const thursday = addCalendarDays(monday, 3);
  const weekOne = mondayOnOrBefore(`${thursday.slice(0, 4)}-01-04`);
  const days = Math.round((dateMs(monday) - dateMs(weekOne)) / DAY_MS);
  return days / 7 + 1;
}
