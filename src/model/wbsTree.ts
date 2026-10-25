import type { Task, TaskStatus } from "../data/types";

export type FlatTask = Task & { depth: number };

export type TaskFilter = {
  search?: string;
  statuses?: readonly string[];
  owners?: readonly string[];
  types?: readonly string[];
  workstreams?: readonly string[];
  hideInactive?: boolean;
  columns?: {
    status?: boolean;
    owner?: boolean;
    type?: boolean;
    workstream?: boolean;
  };
};

const INACTIVE: readonly TaskStatus[] = ["Completed", "Cancelled"];

export function compareTasks(a: Task, b: Task): number {
  if (a.sortOrder != null && b.sortOrder != null && a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }
  if (a.sortOrder != null && b.sortOrder == null) return -1;
  if (a.sortOrder == null && b.sortOrder != null) return 1;
  return a.id.localeCompare(b.id, "en", { numeric: true, sensitivity: "variant" });
}

export function initialExpandedIds(tasks: readonly Task[]): string[] {
  const depth = depthById(tasks);
  return tasks
    .filter((task) => depth.get(task.id) === 1 && tasks.some((child) => child.parentId === task.id))
    .map((task) => task.id);
}

export function flattenVisible(
  tasks: readonly Task[],
  expanded: ReadonlySet<string>,
  filter: TaskFilter = {},
): FlatTask[] {
  const visible = visibleIds(tasks, filter);
  const children = childrenByParent(tasks);
  const roots = tasks.filter((task) => task.parentId == null).sort(compareTasks);
  const rows: FlatTask[] = [];
  const visit = (task: Task, depth: number) => {
    if (!visible.has(task.id)) return;
    rows.push({ ...task, depth });
    if (!expanded.has(task.id)) return;
    for (const child of children.get(task.id) ?? []) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 1);
  return rows;
}

export function attentionCounts(tasks: readonly Task[], today: string): { atRiskOrBlocked: number; overdue: number } {
  const rows = tasks.filter((task) => task.taskType !== "Summary");
  return {
    atRiskOrBlocked: rows.filter((task) => task.status === "At Risk" || task.status === "Blocked").length,
    overdue: rows.filter(
      (task) =>
        Boolean(task.plannedEnd) &&
        (task.plannedEnd as string) < today &&
        task.status !== "Completed" &&
        task.status !== "Cancelled",
    ).length,
  };
}

export function findCycles(tasks: readonly Task[]): string[][] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const state = new Map<string, "open" | "done">();
  const cycles: string[][] = [];
  const visit = (id: string, stack: string[]) => {
    const mark = state.get(id);
    if (mark === "done") return;
    if (mark === "open") {
      const start = stack.indexOf(id);
      cycles.push(stack.slice(start));
      return;
    }
    state.set(id, "open");
    const parentId = byId.get(id)?.parentId;
    if (parentId && byId.has(parentId)) visit(parentId, [...stack, id]);
    state.set(id, "done");
  };
  for (const task of tasks) visit(task.id, []);
  return cycles;
}

function visibleIds(tasks: readonly Task[], filter: TaskFilter): Set<string> {
  const columns = {
    status: filter.columns?.status ?? true,
    owner: filter.columns?.owner ?? true,
    type: filter.columns?.type ?? true,
    workstream: filter.columns?.workstream ?? true,
  };
  const search = filter.search?.trim().toLowerCase() ?? "";
  const statuses = columns.status ? new Set(filter.statuses ?? []) : new Set<string>();
  const owners = columns.owner ? new Set(filter.owners ?? []) : new Set<string>();
  const types = columns.type ? new Set(filter.types ?? []) : new Set<string>();
  const workstreams = columns.workstream ? new Set(filter.workstreams ?? []) : new Set<string>();
  const filtering = Boolean(
    search || statuses.size || owners.size || types.size || workstreams.size || filter.hideInactive,
  );
  if (!filtering) return new Set(tasks.map((task) => task.id));

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const matched = new Set<string>();
  for (const task of tasks) {
    if (filter.hideInactive && INACTIVE.includes(task.status)) continue;
    if (search) {
      const haystack = `${task.wbsCode} ${task.taskName} ${task.owner}`.toLowerCase();
      if (!haystack.includes(search)) continue;
    }
    if (statuses.size && !statuses.has(task.status)) continue;
    if (owners.size && !owners.has(task.owner)) continue;
    if (types.size && !types.has(task.taskType)) continue;
    if (workstreams.size && !workstreams.has(task.workstream)) continue;
    matched.add(task.id);
  }
  const visible = new Set(matched);
  for (const id of matched) {
    let parentId = byId.get(id)?.parentId ?? null;
    while (parentId) {
      visible.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  }
  return visible;
}

function childrenByParent(tasks: readonly Task[]): Map<string, Task[]> {
  const children = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.parentId) continue;
    const list = children.get(task.parentId) ?? [];
    list.push(task);
    children.set(task.parentId, list);
  }
  for (const list of children.values()) list.sort(compareTasks);
  return children;
}

function depthById(tasks: readonly Task[]): Map<string, number> {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const depth = new Map<string, number>();
  const resolve = (task: Task, trail: Set<string>): number => {
    const known = depth.get(task.id);
    if (known) return known;
    if (trail.has(task.id) || !task.parentId || !byId.has(task.parentId)) {
      depth.set(task.id, 1);
      return 1;
    }
    trail.add(task.id);
    const value = resolve(byId.get(task.parentId) as Task, trail) + 1;
    depth.set(task.id, value);
    return value;
  };
  for (const task of tasks) resolve(task, new Set());
  return depth;
}
