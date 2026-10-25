import { inclusiveCalendarDays } from "../calendar/dateOnly";
import type { Task } from "../data/types";

export function rollupSummaries(tasks: readonly Task[]): Task[] {
  const copies = tasks.map((task) => ({ ...task }));
  const byId = new Map(copies.map((task) => [task.id, task]));
  const childIds = new Map<string, string[]>();
  for (const task of copies) {
    if (!task.parentId || !byId.has(task.parentId)) continue;
    const list = childIds.get(task.parentId) ?? [];
    list.push(task.id);
    childIds.set(task.parentId, list);
  }

  for (const task of copies) {
    if (task.taskType !== "Summary") continue;
    const descendants = leafDescendants(task.id, byId, childIds);
    const dated = descendants.filter((item) => item.scheduled && item.plannedStart && item.plannedEnd);
    task.plannedStart = dated.length ? earliest(dated.map((item) => item.plannedStart as string)) : null;
    task.plannedEnd = dated.length ? latest(dated.map((item) => item.plannedEnd as string)) : null;
    task.scheduled = Boolean(task.plannedStart && task.plannedEnd);
    const weighted = descendants.filter(
      (item) => item.taskType === "Task" && item.scheduled && item.plannedStart && item.plannedEnd,
    );
    const denominator = weighted.reduce(
      (sum, item) => sum + inclusiveCalendarDays(item.plannedStart as string, item.plannedEnd as string),
      0,
    );
    if (denominator === 0) {
      task.progress = null;
      continue;
    }
    const numerator = weighted.reduce((sum, item) => {
      const duration = inclusiveCalendarDays(item.plannedStart as string, item.plannedEnd as string);
      return sum + (item.progress ?? 0) * duration;
    }, 0);
    task.progress = Math.round(numerator / denominator);
  }

  return copies;
}

export function overallProgress(tasks: readonly Task[]): number | null {
  const weighted = tasks.filter(
    (task) => task.taskType === "Task" && task.scheduled && task.plannedStart && task.plannedEnd,
  );
  const denominator = weighted.reduce(
    (sum, task) => sum + inclusiveCalendarDays(task.plannedStart as string, task.plannedEnd as string),
    0,
  );
  if (denominator === 0) return null;
  const numerator = weighted.reduce((sum, task) => {
    const duration = inclusiveCalendarDays(task.plannedStart as string, task.plannedEnd as string);
    return sum + (task.progress ?? 0) * duration;
  }, 0);
  return Math.round(numerator / denominator);
}

function leafDescendants(id: string, byId: Map<string, Task>, childIds: Map<string, string[]>): Task[] {
  const children = childIds.get(id) ?? [];
  if (!children.length) return [];
  return children.flatMap((childId) => {
    const child = byId.get(childId);
    if (!child) return [];
    const nested = childIds.get(childId) ?? [];
    return nested.length ? leafDescendants(childId, byId, childIds) : [child];
  });
}

function earliest(values: string[]): string {
  return values.reduce((best, value) => (value < best ? value : best));
}

function latest(values: string[]): string {
  return values.reduce((best, value) => (value > best ? value : best));
}
