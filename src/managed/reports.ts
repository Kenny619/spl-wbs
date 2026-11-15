import { addCalendarDays, parseIsoDateOnly, todayInTimeZone } from "../calendar/dateOnly";
import type { Task } from "../data/types";
import { overallProgress } from "../model/summaryRollup";
import { attentionCounts, compareTasks } from "../model/wbsTree";
import { historyDisplayTime, historyValueLabel, type HistoryChange, type HistoryEvent } from "./history";

export type ReportLimit = "top10" | "all";
export type LatestReportInput = {
  fileName: string;
  tasks: readonly Task[];
  timeZone: string;
  generatedAt: Date;
  limit?: ReportLimit;
};
export type UpdateReportInput = LatestReportInput & {
  history: readonly HistoryEvent[];
  startDay: string;
  endDay: string;
  includeFullValues?: boolean;
};

function labelWorkstream(task: Task | undefined): string {
  return task ? (task.workstream.trim() || "Unassigned") : "Unknown Workstream";
}
function taskLabel(task: Task, workstreamHeading: boolean): string {
  return workstreamHeading ? task.taskName : "[" + labelWorkstream(task) + "] " + task.taskName;
}
function header(fileName: string, mode: string, now: Date, timeZone: string): string[] {
  if (!Number.isFinite(now.getTime())) throw new Error("Report generated-at instant is invalid.");
  const stamp = historyDisplayTime(now.toISOString(), timeZone);
  return [mode, "Workbook: " + fileName, "Generated: " + stamp + " (" + timeZone + ")"];
}
function sortByDateAndWbs(a: Task, b: Task): number {
  return (a.plannedEnd ?? "9999-12-31").localeCompare(b.plannedEnd ?? "9999-12-31") ||
    compareTasks(a, b);
}
function formatTaskSection(
  title: string,
  items: readonly Task[],
  render: (task: Task, heading: boolean) => string,
  limit: ReportLimit,
): string[] {
  const shown = limit === "all" ? items : items.slice(0, 10);
  const output = ["", title];
  if (!shown.length) return [...output, "None"];
  const multi = new Set(shown.map((task) => task.id)).size > 1;
  if (!multi) return [...output, ...shown.map((task) => "- " + render(task, false))];
  const groups = new Map<string, Task[]>();
  for (const task of shown) {
    const name = labelWorkstream(task);
    const list = groups.get(name) ?? [];
    list.push(task);
    groups.set(name, list);
  }
  for (const name of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
    output.push("", name);
    for (const task of groups.get(name)!) output.push("- " + render(task, true));
  }
  if (limit !== "all" && items.length > shown.length) {
    output.push("… " + (items.length - shown.length) + " more; select All to include them.");
  }
  return output;
}

export function generateLatestStatusReport(input: LatestReportInput): string {
  const { tasks, fileName, timeZone, generatedAt } = input;
  const limit = input.limit ?? "top10";
  const day = todayInTimeZone(generatedAt, timeZone);
  const rows = tasks.filter((task) => task.taskType !== "Summary");
  const progress = overallProgress(tasks);
  const attention = attentionCounts(tasks, day);
  const statuses = ["Not Started", "In Progress", "Completed", "At Risk", "Blocked", "Cancelled", "Unknown"];
  const counts = statuses.map((status) => status + ": " + rows.filter((row) => row.status === status).length);
  const attentionPriority = (task: Task): number =>
    task.status === "Blocked" ? 0 : task.status === "At Risk" ? 1 : 2;
  const outstanding = rows.filter((task) => task.status !== "Completed" && task.status !== "Cancelled");
  const needs = outstanding.filter((task) =>
    task.status === "Blocked" || task.status === "At Risk" ||
    (task.plannedEnd !== null && task.plannedEnd < day));
  needs.sort((a, b) => attentionPriority(a) - attentionPriority(b) || sortByDateAndWbs(a, b));
  const milestones = outstanding.filter((task) => task.taskType === "Milestone" &&
    task.plannedEnd !== null && task.plannedEnd >= day).sort(sortByDateAndWbs);
  const upcomingEnd = addCalendarDays(day, 14);
  const highlights = outstanding.filter((task) => task.taskType === "Task" &&
    task.plannedEnd !== null && task.plannedEnd >= day && task.plannedEnd <= upcomingEnd)
    .sort(sortByDateAndWbs);
  const tag = (task: Task) => {
    if (task.status === "Blocked" || task.status === "At Risk") return task.status;
    return task.plannedEnd && task.plannedEnd < day ? "Overdue" : task.status;
  };
  return [
    ...header(fileName, "Latest Status Report", generatedAt, timeZone),
    "",
    "Executive Snapshot",
    "Overall progress: " + (progress === null ? "N/A" : progress + "%"),
    "Task count (excluding summaries): " + rows.length,
    ...counts,
    "Needs attention (at risk / blocked): " + attention.atRiskOrBlocked,
    "Overdue unfinished tasks: " + attention.overdue,
    ...formatTaskSection("Needs Attention", needs,
      (task, heading) => taskLabel(task, heading) + " — " + tag(task) +
        (task.plannedEnd ? " (Finish " + task.plannedEnd + ")" : ""), limit),
    ...formatTaskSection("Upcoming Milestones", milestones,
      (task, heading) => taskLabel(task, heading) + " — " + (task.plannedEnd ?? "Unscheduled"), limit),
    ...formatTaskSection("Task / Status Highlights (next 14 days)", highlights,
      (task, heading) => taskLabel(task, heading) + " — " + task.status +
        " (Finish " + task.plannedEnd + ")", limit),
  ].join("\n");
}

function isIsoDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && parseIsoDateOnly(value) === value;
}
/** First UTC millisecond whose local calendar day is at/after the specified date. */
function localMidnightUtc(day: string, zone: string): number {
  const center = Date.parse(day + "T00:00:00Z");
  const localDay = (ms: number): string => todayInTimeZone(new Date(ms), zone);
  // Worldwide IANA offsets are within [-12h,+14h], including DST.
  let low = center - 2 * 86_400_000;
  let high = center + 2 * 86_400_000;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (localDay(mid) >= day) high = mid;
    else low = mid + 1;
  }
  return low;
}
/** Inclusive local days become a half-open UTC interval; handles DST/short/long days. */
export function reportUtcRange(startDay: string, endDay: string, timeZone: string): {
  startMs: number; endExclusiveMs: number;
} {
  if (!isIsoDay(startDay) || !isIsoDay(endDay) || endDay < startDay) {
    throw new Error("Choose valid start/end dates in YYYY-MM-DD order.");
  }
  // Explicitly reject unknown zones even when history is empty.
  new Intl.DateTimeFormat("en-US", { timeZone });
  return {
    startMs: localMidnightUtc(startDay, timeZone),
    endExclusiveMs: localMidnightUtc(addCalendarDays(endDay, 1), timeZone),
  };
}
function valueForReport(change: HistoryChange, value: string | number | null, full: boolean): string {
  const raw = historyValueLabel(change.field, value);
  const isLong = change.field === "Updates" || change.field === "Description" || raw.length > 140;
  if (isLong && !full && raw.length > 140) return raw.slice(0, 140).replace(/\n/g, "⏎") + "…";
  return raw;
}
function sectionByWorkstream(
  event: HistoryEvent,
  tasksById: Map<string, Task>,
  full: boolean,
  timeZone: string,
): string[] {
  const lines = [
    "",
    "Saved " + historyDisplayTime(event.timestampUTC, timeZone) +
      " (" + event.timestampUTC + ")",
    "ChangeSetID: " + event.changeSetId,
  ];
  const distinctTasks = new Set(event.changes.map((change) => change.taskId));
  const multi = distinctTasks.size > 1;
  const sorted = [...event.changes].sort((a, b) =>
    a.wbsCode.localeCompare(b.wbsCode, "en", { numeric: true }) ||
    a.taskId.localeCompare(b.taskId, "en", { numeric: true }) ||
    a.row - b.row);
  const groups = new Map<string, HistoryChange[]>();
  for (const change of sorted) {
    const ws = labelWorkstream(tasksById.get(change.taskId));
    const changes = groups.get(ws) ?? [];
    changes.push(change);
    groups.set(ws, changes);
  }
  for (const name of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
    if (multi) lines.push("", name);
    for (const change of groups.get(name)!) {
      const taskTitle = multi ? change.taskTitle : "[" + name + "] " + change.taskTitle;
      const oldValue = valueForReport(change, change.oldValue, full);
      const newValue = valueForReport(change, change.newValue, full);
      if (full && (oldValue.includes("\n") || newValue.includes("\n"))) {
        lines.push("- " + taskTitle + " (WBS " + change.wbsCode +
          ", TaskID " + change.taskId + ") — " + change.field,
          "  BEFORE:", ...oldValue.split("\n").map((line) => "    " + line),
          "  AFTER:", ...newValue.split("\n").map((line) => "    " + line));
      } else {
        lines.push("- " + taskTitle + " (WBS " + change.wbsCode +
          ", TaskID " + change.taskId + ") — " + change.field +
          ": " + oldValue.replace(/\n/g, "⏎") + " → " + newValue.replace(/\n/g, "⏎"));
      }
    }
  }
  return lines;
}

export function generateUpdateReport(input: UpdateReportInput): string {
  const { startMs, endExclusiveMs } = reportUtcRange(input.startDay, input.endDay, input.timeZone);
  const events = input.history.filter((event) => {
    const time = Date.parse(event.timestampUTC);
    if (!Number.isFinite(time)) throw new Error("Invalid saved history timestamp.");
    return time >= startMs && time < endExclusiveMs;
  }).sort((a, b) =>
    b.timestampUTC.localeCompare(a.timestampUTC) || a.changeSetId.localeCompare(b.changeSetId));
  const tasksById = new Map(input.tasks.map((task) => [task.id, task]));
  const allChanges = events.flatMap((event) => event.changes);
  const affected = new Set(allChanges.map((change) => change.taskId));
  const lines = [
    ...header(input.fileName, "Update Report", input.generatedAt, input.timeZone),
    "Period (inclusive local dates): " + input.startDay + " to " + input.endDay,
    "",
    "Update Summary",
    "Distinct affected tasks: " + affected.size,
    "Logical Save events: " + events.length,
    "Field-change rows: " + allChanges.length,
    "",
    "Saved Changes (newest first)",
  ];
  if (!events.length) lines.push("No changes were saved during this period.");
  for (const event of events) {
    lines.push(...sectionByWorkstream(event, tasksById, !!input.includeFullValues, input.timeZone));
  }
  return lines.join("\n");
}
