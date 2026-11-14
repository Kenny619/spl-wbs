import type { Task } from "../data/types";
import type { WatchProjection } from "./watchProjection";
import { escapeReportHtml as esc } from "./report11AuditRender";

/** REPORT11-MANUAL-WATCH-ADDENDUM-1: recorded current facts, never period changes or RAG. */
export type ReportWatchEvidence = Readonly<{
  available: boolean;
  unknownTasks: number;
  rows: readonly Readonly<{ taskId: string; name: string; workstream: string;
    openCount: number; resolvedCount: number; reasons: readonly string[] }>[];
}>;
export function reportWatchEvidence(tasks: readonly Task[], projection?: WatchProjection | null): ReportWatchEvidence {
  const available = projection?.workbookState === "valid" && projection.schemaValidated;
  if (!available) return Object.freeze({ available: false, unknownTasks: tasks.length, rows: Object.freeze([]) });
  let unknownTasks = 0;
  const rows: ReportWatchEvidence["rows"][number][] = [];
  for (const task of tasks) {
    const watch = projection.tasks.find(row => row.taskId === task.id);
    const open = watch?.openReasons.filter(r => r.origin === "Manual") ?? [];
    const resolved = watch?.resolvedReasons.filter(r => r.origin === "Manual") ?? [];
    if (!open.length) unknownTasks++;
    if (open.length || resolved.length) rows.push(Object.freeze({
      taskId: task.id, name: task.taskName, workstream: task.workstream.trim() || "Unassigned",
      openCount: open.length, resolvedCount: resolved.length,
      reasons: Object.freeze([...open, ...resolved].map(reason =>
        reason.state + " · " + reason.title + " · Reason " + reason.reasonId +
        " · recorded by " + reason.openedBy + " (unverified)" +
        (reason.resolvedBy ? " · resolved by " + reason.resolvedBy + " (unverified)" : ""))),
    }));
  }
  return Object.freeze({ available: true, unknownTasks, rows: Object.freeze(rows.sort((a,b) => a.workstream.localeCompare(b.workstream))) });
}
export function reportWatchText(evidence?: ReportWatchEvidence): string {
  const lines = ["RECORDED MANUAL WATCH · WORKBOOK EVIDENCE",
    "Current workbook records, not period-change evidence. Authorship, automatic checks and clearance are unverified."];
  if (!evidence?.available) return [...lines, "Unknown / unverified: workbook Watch source unavailable."].join("\n");
  lines.push(evidence.unknownTasks + " task(s) Unknown; resolved-only records do not imply Green or Clear.");
  let group = "";
  for (const row of evidence.rows) {
    if (row.workstream !== group) { group = row.workstream; lines.push(group); }
    lines.push("- " + row.name + " · TaskID " + row.taskId + " · " +
      (row.openCount ? "Under Watch" : "Unknown") + " · " + row.openCount + " Open / " + row.resolvedCount + " Resolved", ...row.reasons.map(x => "  " + x));
  }
  return lines.join("\n");
}
export function reportWatchHtml(evidence?: ReportWatchEvidence): string {
  return '<section class="report-section"><h2>Recorded Manual Watch · Workbook evidence</h2><div style="white-space:pre-wrap">' + esc(reportWatchText(evidence)) + '</div></section>';
}
