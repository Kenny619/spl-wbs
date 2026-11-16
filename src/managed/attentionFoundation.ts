import type { Task } from "../data/types";

/**
 * Stage B source-backed attention signals. These are NOT health/RAG assessments.
 * Missing manual Watch evidence remains unknown, never silently "Clear".
 *
 * This pure projection is safe for Schedule, Meeting Review and Report consumers:
 * it does not mutate workbook tasks, infer reviewer intent or calculate Green.
 */
export type AttentionKind = "blocked" | "at-risk" | "overdue" | "under-watch";
export type AttentionSignal = Readonly<{
  taskId: string;
  kind: AttentionKind;
  source: "recorded-task-status" | "planned-finish-date" | "verified-open-watch-reason";
}>;
export type AttentionSnapshot = Readonly<{
  signals: readonly AttentionSignal[];
  taskIdsByKind: Readonly<Record<AttentionKind, readonly string[] | null>>;
  counts: Readonly<Record<AttentionKind, number | null>>;
  distinctAttentionTaskCount: number;
}>;

/** Strict Gregorian date-only validation: impossible dates must not become overdue facts. */
function isCalendarDate(value: string): boolean {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || month > 12 || day > 31) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() + 1 === month
    && parsed.getUTCDate() === day;
}

export function projectAttention(
  tasks: readonly Task[],
  today: string,
  /** Null means Watch evidence has not been verified, not "no Watch reasons". */
  verifiedOpenWatchTaskIds: ReadonlySet<string> | null = null,
): AttentionSnapshot {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new Error("Attention requires an ISO date-only today, not a timestamp.");
  }
  const ids: Record<AttentionKind, string[] | null> = {
    blocked: [], "at-risk": [], overdue: [],
    "under-watch": verifiedOpenWatchTaskIds === null ? null : [],
  };
  const signals: AttentionSignal[] = [];
  const distinct = new Set<string>();
  const append = (taskId: string, kind: AttentionKind, source: AttentionSignal["source"]) => {
    (ids[kind] as string[]).push(taskId);
    signals.push({ taskId, kind, source });
    distinct.add(taskId);
  };
  const seen = new Set<string>();
  for (const task of tasks) {
    // Summary rows are derived roll-ups, never independent actionable tasks.
    if (task.taskType === "Summary" || seen.has(task.id)) continue;
    seen.add(task.id);
    if (task.status === "Blocked") append(task.id, "blocked", "recorded-task-status");
    if (task.status === "At Risk") append(task.id, "at-risk", "recorded-task-status");
    if (task.plannedEnd && /^\d{4}-\d{2}-\d{2}$/.test(task.plannedEnd)
      && task.plannedEnd < today && task.status !== "Completed" && task.status !== "Cancelled") {
      append(task.id, "overdue", "planned-finish-date");
    }
    // Watch is independent of TaskStatus. Even Completed does not automatically
    // resolve a valid, independently recorded open reason.
    if (verifiedOpenWatchTaskIds?.has(task.id)) {
      append(task.id, "under-watch", "verified-open-watch-reason");
    }
  }
  const counts: Record<AttentionKind, number | null> = {
    blocked: ids.blocked!.length,
    "at-risk": ids["at-risk"]!.length,
    overdue: ids.overdue!.length,
    "under-watch": ids["under-watch"]?.length ?? null,
  };
  return { signals, taskIdsByKind: ids, counts, distinctAttentionTaskCount: distinct.size };
}

/**
 * Notice severity is determined ONLY by the event's typed source, not by a
 * text substring. In particular, a message containing "green", "warning",
 * or "success" must never change its priority or become a health assessment.
 */
export type ManagedNoticeKind =
  | "save-unverified" | "recovery-blocked" | "workbook-conflict"
  | "permission-denied" | "unsaved-changes" | "import-warning"
  | "import-progress" | "save-verified" | "general-info";
export type ManagedNoticeSeverity = "critical" | "warning" | "info";
export type ManagedNotice = Readonly<{
  id: string;
  kind: ManagedNoticeKind;
  message: string;
}>;
export type PrioritizedManagedNotice = ManagedNotice & Readonly<{
  severity: ManagedNoticeSeverity;
  dismissible: boolean;
  needsAttention: boolean;
}>;

const NOTICE_POLICIES: Readonly<Record<ManagedNoticeKind, Readonly<{
  severity: ManagedNoticeSeverity; dismissible: boolean;
}>>> = {
  "save-unverified": { severity: "critical", dismissible: false },
  "recovery-blocked": { severity: "critical", dismissible: false },
  "workbook-conflict": { severity: "critical", dismissible: false },
  "permission-denied": { severity: "warning", dismissible: false },
  "unsaved-changes": { severity: "warning", dismissible: false },
  "import-warning": { severity: "warning", dismissible: true },
  "import-progress": { severity: "info", dismissible: true },
  "save-verified": { severity: "info", dismissible: true },
  "general-info": { severity: "info", dismissible: true },
};
const SEVERITY_RANK: Readonly<Record<ManagedNoticeSeverity, number>> =
  { critical: 0, warning: 1, info: 2 };

export function prioritizeManagedNotices(
  input: readonly ManagedNotice[],
): readonly PrioritizedManagedNotice[] {
  return input.map((notice) => ({
    ...notice,
    ...NOTICE_POLICIES[notice.kind],
    needsAttention: NOTICE_POLICIES[notice.kind].severity !== "info",
  })).sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
