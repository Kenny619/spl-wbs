import type { Task } from "../data/types";
import { todayInTimeZone } from "../calendar/dateOnly";
import type { HistoryChange, HistoryEvent } from "./history";
import { reportUtcRange } from "./reports";

/** Lossless audit rows: grouping is view-only and never changes source events. */
export type Report11AuditRow = Readonly<{
  changeSetId: string;
  timestampUTC: string;
  sourceRow: number;
  currentWorkstream: string;
  historicalWbsCode: string;
  historicalTaskTitle: string;
  taskId: string;
  field: HistoryChange["field"];
  oldValue: HistoryChange["oldValue"];
  newValue: HistoryChange["newValue"];
  source: string;
  appVersion: string;
}>;

export type Report11AuditDay = Readonly<{
  localDay: string;
  rows: readonly Report11AuditRow[];
}>;

export type Report11Audit = Readonly<{
  days: readonly Report11AuditDay[];
  distinctTasks: number;
  logicalSaves: number;
  fieldRows: number;
}>;

/**
 * One table per LOCAL calendar day. Full IDs, historical task snapshots and all
 * field rows are retained, even across multi-task or multi-workstream Saves.
 * The history reader must independently fail closed on malformed worksheets.
 */
export function buildReport11Audit(
  history: readonly HistoryEvent[],
  tasks: readonly Task[],
  startDay: string,
  endDay: string,
  timeZone: string,
): Report11Audit {
  const { startMs, endExclusiveMs } = reportUtcRange(startDay, endDay, timeZone);
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const grouped = new Map<string, Report11AuditRow[]>();
  const seenTasks = new Set<string>();
  const seenSaves = new Set<string>();
  let fieldRows = 0;

  const events = history.filter((event) => {
    const instant = Date.parse(event.timestampUTC);
    if (!Number.isFinite(instant)) throw new Error("Invalid saved event timestamp");
    return instant >= startMs && instant < endExclusiveMs;
  }).sort((a, b) =>
    b.timestampUTC.localeCompare(a.timestampUTC) ||
    a.changeSetId.localeCompare(b.changeSetId));

  for (const event of events) {
    seenSaves.add(event.changeSetId);
    const day = todayInTimeZone(new Date(event.timestampUTC), timeZone);
    const rows = grouped.get(day) ?? [];
    const changes = [...event.changes].sort((a, b) => a.row - b.row);
    for (const change of changes) {
      fieldRows += 1;
      seenTasks.add(change.taskId);
      rows.push({
        changeSetId: event.changeSetId, timestampUTC: event.timestampUTC,
        sourceRow: change.row,
        currentWorkstream: taskById.get(change.taskId)?.workstream.trim() || (
          taskById.has(change.taskId) ? "Unassigned" : "Unknown Workstream"),
        historicalWbsCode: change.wbsCode,
        historicalTaskTitle: change.taskTitle,
        taskId: change.taskId,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        source: change.source,
        appVersion: change.appVersion,
      });
    }
    grouped.set(day, rows);
  }

  return {
    days: [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]))
      .map(([localDay, rows]) => ({ localDay, rows })),
    distinctTasks: seenTasks.size,
    logicalSaves: seenSaves.size,
    fieldRows,
  };
}
