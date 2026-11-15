import { addCalendarDays, todayInTimeZone } from "../calendar/dateOnly";
import type { HolidayCalendar } from "../calendar/jpHolidays";
import { yearCovered } from "../calendar/jpHolidays";
import { isWorkday, remainingWorkdays } from "../calendar/workdays";
import type { Task } from "../data/types";
import { compareTasks } from "../model/wbsTree";

/**
 * EMV-REPORT-1.1 source-normalized planning facts.
 *
 * Pure, read-only helpers intentionally separated from HTML and workbook I/O.
 * They only describe CURRENT committed tasks; history-driven claims belong in
 * the separate saved-ChangeSet event model.
 */
export type DaysToGoLive =
  | { kind: "identified"; task: Task; date: string; days: number }
  | { kind: "past"; task: Task; date: string; days: 0 }
  | { kind: "unidentified" }
  | { kind: "ambiguous"; candidateIds: readonly string[] }
  | { kind: "holiday-coverage-incomplete"; task: Task; date: string };

export type UpcomingMilestone =
  | { kind: "identified"; task: Task; date: string; days: number }
  | { kind: "none" }
  | { kind: "holiday-coverage-incomplete"; task: Task; date: string };

export type Commitments =
  | { kind: "ready"; through: string; tasks: readonly Task[] }
  | { kind: "holiday-coverage-incomplete" };

export type StatusException = { task: Task; tone: "red" | "amber"; status: Task["status"] };

const GO_LIVE_NAMES = new Set(["launch date", "release date", "g5"]);

export function reportToday(generatedAt: Date, timeZone: string): string {
  if (!Number.isFinite(generatedAt.getTime())) throw new Error("Invalid report snapshot time");
  return todayInTimeZone(generatedAt, timeZone);
}

export function getDaysToGoLive(
  tasks: readonly Task[], today: string, calendar: HolidayCalendar,
): DaysToGoLive {
  const matches = tasks.filter((task) =>
    task.taskType === "Milestone" && GO_LIVE_NAMES.has(task.taskName.trim().toLowerCase()));
  if (matches.length === 0) return { kind: "unidentified" };
  if (matches.length > 1) {
    return { kind: "ambiguous", candidateIds: matches.map((task) => task.id).sort() };
  }
  const task = matches[0]!;
  const date = task.plannedEnd;
  if (!date) return { kind: "unidentified" };
  if (date < today) return { kind: "past", task, date, days: 0 };
  const value = remainingWorkdays(date, today, "In Progress", calendar);
  if (value.kind === "unknown") return { kind: "holiday-coverage-incomplete", task, date };
  if (value.kind === "count") return { kind: "identified", task, date, days: value.days };
  if (value.kind === "today") return { kind: "identified", task, date, days: 0 };
  return { kind: "unidentified" };
}

export function getUpcomingMilestone(
  tasks: readonly Task[], today: string, calendar: HolidayCalendar,
): UpcomingMilestone {
  const task = tasks.filter((row) => row.taskType === "Milestone" &&
    row.status !== "Completed" && row.status !== "Cancelled" &&
    row.plannedEnd !== null && row.plannedEnd >= today)
    .sort((a, b) => (a.plannedEnd as string).localeCompare(b.plannedEnd as string) ||
      compareTasks(a, b))[0];
  if (!task || !task.plannedEnd) return { kind: "none" };
  const value = remainingWorkdays(task.plannedEnd, today, task.status, calendar);
  if (value.kind === "unknown") return { kind: "holiday-coverage-incomplete", task, date: task.plannedEnd };
  return { kind: "identified", task, date: task.plannedEnd,
    days: value.kind === "count" ? value.days : 0 };
}

/** Inclusive of tasks due today and through the FIFTH working day after today. */
export function fiveWorkingDayCommitments(
  tasks: readonly Task[], today: string, calendar: HolidayCalendar,
): Commitments {
  let cursor = today;
  let workdays = 0;
  // Bounded across holidays; fail closed if we cannot verify every touched year.
  for (let inspected = 0; workdays < 5 && inspected < 40; inspected += 1) {
    cursor = addCalendarDays(cursor, 1);
    if (!yearCovered(calendar, cursor)) return { kind: "holiday-coverage-incomplete" };
    if (isWorkday(cursor, calendar)) workdays += 1;
  }
  if (workdays !== 5) return { kind: "holiday-coverage-incomplete" };
  const within = tasks.filter((task) =>
    task.taskType !== "Summary" &&
    task.status !== "Completed" && task.status !== "Cancelled" &&
    task.plannedEnd !== null && task.plannedEnd >= today && task.plannedEnd <= cursor);
  return { kind: "ready", through: cursor,
    tasks: within.sort((a, b) =>
      (a.plannedEnd as string).localeCompare(b.plannedEnd as string) || compareTasks(a, b)) };
}

/**
 * Deliberately STATUS-ONLY until a separately supported manual RAG input exists.
 * Do not misrepresent Priority or historical free text as a red/amber RAG field.
 */
export function currentStatusExceptions(tasks: readonly Task[]): readonly StatusException[] {
  return tasks.filter((task) => task.taskType !== "Summary" &&
    task.status !== "Completed" && task.status !== "Cancelled" &&
    (task.status === "Blocked" || task.status === "At Risk"))
    .sort((a, b) => Number(a.status !== "Blocked") - Number(b.status !== "Blocked") ||
      compareTasks(a, b))
    .map((task) => ({
      task, tone: task.status === "Blocked" ? "red" as const : "amber" as const,
      status: task.status,
    }));
}
