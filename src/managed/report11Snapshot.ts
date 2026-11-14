import { reportWatchEvidence, type ReportWatchEvidence } from "./report11Watch";
import type { WatchProjection } from "./watchProjection";
import { todayInTimeZone } from "../calendar/dateOnly";
import type { HolidayCalendar } from "../calendar/jpHolidays";
import type { Task } from "../data/types";
import type { HistoryEvent, HistoryValue } from "./history";
import { reportUtcRange } from "./reports";
import {
  currentStatusExceptions, fiveWorkingDayCommitments, getDaysToGoLive,
  getUpcomingMilestone,
} from "./report11Planning";

export type Report11Mode = "status" | "progress" | "audit";
export type Report11TaskRow = Readonly<{
  taskId: string;
  workstream: string;
  name: string;
  wbsCode: string;
  status: string;
  owner: string;
  due: string | null;
  tone: "red" | "amber" | "neutral";
}>;
export type Report11ChangeRow = Readonly<{
  changeSetId: string;
  timestampUTC: string;
  historicalName: string;
  historicalWbs: string;
  taskId: string;
  workstream: string;
  field: string;
  oldValue: HistoryValue;
  newValue: HistoryValue;
}>;
export type Report11Snapshot = Readonly<{
  mode: Exclude<Report11Mode, "audit">;
  manualWatch?: ReportWatchEvidence;
  projectName: string;
  timeZone: string;
  generatedAt: string;
  today: string;
  period: Readonly<{ start: string; end: string }> | null;
  goLive: ReturnType<typeof getDaysToGoLive>;
  nextMilestone: ReturnType<typeof getUpcomingMilestone>;
  risks: readonly Report11TaskRow[];
  totalRedRisks: number;
  totalAmberRisks: number;
  omittedRisks: number;
  commitments: readonly Report11TaskRow[];
  omittedCommitments: number;
  commitmentCoverage: "ready" | "holiday-coverage-incomplete";
  recordedProgress: readonly Report11ChangeRow[];
  scheduleChanges: readonly Report11ChangeRow[];
  riskTransitions: readonly Report11ChangeRow[];
  historyCoverage: "not-requested" | "available" | "unavailable";
}>;

export type Report11Input = Readonly<{
  mode: "status" | "progress";
  watchProjection?: WatchProjection | null;
  projectName: string;
  tasks: readonly Task[];
  history: readonly HistoryEvent[] | null;
  historyAvailable: boolean;
  timeZone: string;
  generatedAt: Date;
  calendar: HolidayCalendar;
  startDay?: string;
  endDay?: string;
  limit?: "all" | "top10";
}>;

function eventInRange(
  event: HistoryEvent, startMs: number, endExclusiveMs: number,
): boolean {
  const ms = Date.parse(event.timestampUTC);
  if (!Number.isFinite(ms)) throw new Error("Invalid saved event timestamp");
  return ms >= startMs && ms < endExclusiveMs;
}
function mapCurrent(task: Task, tone: Report11TaskRow["tone"]): Report11TaskRow {
  return Object.freeze({
    taskId: task.id, workstream: task.workstream.trim() || "Unassigned",
    name: task.taskName, wbsCode: task.wbsCode, status: task.status,
    owner: task.owner, due: task.plannedEnd, tone,
  });
}
function mapChange(
  event: HistoryEvent, change: HistoryEvent["changes"][number],
  currentById: ReadonlyMap<string, Task>,
): Report11ChangeRow {
  const current = currentById.get(change.taskId);
  return Object.freeze({
    changeSetId: event.changeSetId, timestampUTC: event.timestampUTC,
    historicalName: change.taskTitle, historicalWbs: change.wbsCode,
    taskId: change.taskId, workstream: current ?
      current.workstream.trim() || "Unassigned" : "Unknown Workstream",
    field: change.field, oldValue: change.oldValue, newValue: change.newValue,
  });
}
function orderedEvents(input: Report11Input): readonly HistoryEvent[] {
  if (input.mode !== "progress") return [];
  if (!input.startDay || !input.endDay) throw new Error("Report period is required.");
  const { startMs, endExclusiveMs } = reportUtcRange(input.startDay, input.endDay, input.timeZone);
  return (input.history ?? []).filter((event) =>
    eventInRange(event, startMs, endExclusiveMs)).sort((a, b) =>
    a.timestampUTC.localeCompare(b.timestampUTC) ||
    a.changeSetId.localeCompare(b.changeSetId));
}
function limited<T>(items: readonly T[], limit: "all" | "top10"): readonly T[] {
  return limit === "top10" ? items.slice(0, 10) : [...items];
}
export function buildReport11Snapshot(input: Report11Input): Report11Snapshot {
  const name = input.projectName.trim();
  if (!name || name.length > 180) throw new Error("Enter a Project name to generate a report.");
  if (input.mode === "progress" && input.historyAvailable && input.history === null) {
    throw new Error("Verified history data is required when history is marked available.");
  }
  const today = todayInTimeZone(input.generatedAt, input.timeZone);
  const limit = input.limit ?? "all";
  const tasks = input.tasks.filter((task) => task.taskType !== "Summary");
  const byId = new Map(input.tasks.map((task) => [task.id, task]));
  const allRisks = currentStatusExceptions(tasks)
    .map((item) => mapCurrent(item.task, item.tone));
  const risks = limited(allRisks, limit);
  const upcoming = fiveWorkingDayCommitments(tasks, today, input.calendar);
  const allCommitments = upcoming.kind === "ready" ?
    upcoming.tasks.map((task) =>
      mapCurrent(task, task.status === "Blocked" ? "red" :
        task.status === "At Risk" ? "amber" : "neutral")) : [];
  const commitments = limited(allCommitments, limit);
  const recordedProgress: Report11ChangeRow[] = [];
  const riskTransitions: Report11ChangeRow[] = [];
  const scheduleChanges: Report11ChangeRow[] = [];
  if (input.mode === "progress" && input.historyAvailable) {
    for (const event of orderedEvents(input)) {
      for (const change of [...event.changes].sort((a, b) => a.row - b.row)) {
        const row = mapChange(event, change, byId);
        if (change.field === "TaskStatus") {
          if (change.newValue === "Completed" && change.oldValue !== "Completed") recordedProgress.push(row);
          if ((change.newValue === "Blocked" || change.newValue === "At Risk") &&
            change.oldValue !== change.newValue) riskTransitions.push(row);
        }
        if (change.field === "Progress" && typeof change.newValue === "number" &&
          typeof change.oldValue === "number" && change.newValue > change.oldValue) {
          recordedProgress.push(row);
        }
        if ((change.field === "PlannedStart" || change.field === "PlannedEnd") &&
          change.newValue !== change.oldValue) scheduleChanges.push(row);
      }
    }
  }
  // Validate even when the workbook has no history sheet.
  if (input.mode === "progress") orderedEvents(input);

  return Object.freeze({
    manualWatch: reportWatchEvidence(input.tasks, input.watchProjection),
    mode: input.mode, projectName: name, timeZone: input.timeZone,
    generatedAt: input.generatedAt.toISOString(), today,
    period: input.mode === "progress" ?
      Object.freeze({ start: input.startDay!, end: input.endDay! }) : null,
    goLive: getDaysToGoLive(tasks, today, input.calendar),
    nextMilestone: getUpcomingMilestone(tasks, today, input.calendar),
    risks: Object.freeze([...risks]),
    totalRedRisks: allRisks.filter((row) => row.tone === "red").length,
    totalAmberRisks: allRisks.filter((row) => row.tone === "amber").length,
    omittedRisks: allRisks.length - risks.length,
    commitments: Object.freeze([...commitments]),
    omittedCommitments: allCommitments.length - commitments.length,
    commitmentCoverage: upcoming.kind,
    recordedProgress: Object.freeze(recordedProgress),
    scheduleChanges: Object.freeze(scheduleChanges),
    riskTransitions: Object.freeze(riskTransitions),
    historyCoverage: input.mode === "status" ? "not-requested" :
      input.historyAvailable ? "available" : "unavailable",
  });
}
