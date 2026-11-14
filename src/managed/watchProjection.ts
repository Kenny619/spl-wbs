import ExcelJS from "exceljs";
import { inspectProjectData, type ProjectFinding } from "./projectDataInspector";

/**
 * F5a conservative READ-ONLY Watch projection from a committed workbook.
 *
 * Never produces Green/Clear without an approved, fully evaluated automatic
 * rule registry and accepted-reference contract. An Open workbook reason is
 * an explicitly recorded Under Watch reason; its actor identity and factual
 * risk evidence are NOT independently authenticated by this module.
 *
 * No workbook edits, auto-creation, rule inference, time-based automation,
 * browser-local Watch state, or independently invented task statuses.
 */
export type WatchDisposition = "Under Watch" | "Unknown";
export type RecordedWatchReason = {
  reasonId: string;
  taskId: string;
  origin: "Manual" | "Automatic";
  ruleCode: string | null;
  state: "Open" | "Resolved";
  title: string;
  details: string | null;
  evidenceRef: string | null;
  openedUTC: string;
  openedBy: string;
  lastReviewedUTC: string | null;
  resolvedUTC: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  /** Audit row presence is a trace pointer, not proof of trusted authorship. */
  hasRecordedProjectAudit: boolean;
};
export type TaskWatchProjection = {
  taskId: string;
  disposition: WatchDisposition;
  openReasons: RecordedWatchReason[];
  resolvedReasons: RecordedWatchReason[];
  /** Current auto-rule completeness is NOT evidenced by proposed v0.1.2. */
  automaticChecksVerified: false;
  /** Current accepted finish-reference verification is NOT yet implemented. */
  commitmentVerified: false;
};
export type WatchProjection = {
  workbookState: "legacy" | "valid" | "incompatible" | "unsupported_future";
  projectName: string | null;
  tasks: TaskWatchProjection[];
  findings: ProjectFinding[];
  /**
   * True iff the workbook structure and referential schema were validated.
   * No claim of identity authenticity, complete automatic check execution,
   * or Green/clearance follows from a valid structure.
   */
  schemaValidated: boolean;
};

type Table = { sheet: ExcelJS.Worksheet; cols: Record<string, number> };
const cellText = (v: ExcelJS.CellValue): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const taskIdValue = (v: ExcelJS.CellValue): string | null => {
  if (typeof v === "number" && Number.isSafeInteger(v)) return String(v);
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
};
function table(book: ExcelJS.Workbook, name: string): Table {
  const sheet = book.worksheets.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!sheet) throw new Error("Watch projection requires a validated " + name + " sheet.");
  const cols: Record<string, number> = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, index) => {
    if (typeof cell.value === "string") cols[cell.value.trim().toLowerCase()] = index;
  });
  return { sheet, cols };
}
function at(t: Table, row: ExcelJS.Row, name: string): ExcelJS.CellValue {
  return row.getCell(t.cols[name.toLowerCase()]).value;
}
function stringAt(t: Table, row: ExcelJS.Row, name: string): string {
  return String(at(t, row, name) ?? "");
}
function optionalAt(t: Table, row: ExcelJS.Row, name: string): string | null {
  return cellText(at(t, row, name));
}

export async function projectWatchProjection(source: Uint8Array | ArrayBuffer): Promise<WatchProjection> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(source as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  const inspected = inspectProjectData(book);
  if (inspected.kind !== "valid") {
    return {
      workbookState: inspected.kind,
      projectName: null, tasks: [], findings: inspected.findings,
      schemaValidated: false,
    };
  }
  const wbs = table(book, "ProjectWBS");
  const reasons = table(book, "WatchReasons");
  const audit = table(book, "ProjectAudit");
  const auditRefs = new Set<string>();
  for (let i = 2; i <= audit.sheet.rowCount; i++) {
    const row = audit.sheet.getRow(i);
    if (!row.hasValues || stringAt(audit, row, "EntityType") !== "WatchReason") continue;
    const reasonId = stringAt(audit, row, "EntityID");
    if (reasonId) auditRefs.add(reasonId.toLowerCase());
  }

  const tasks = new Map<string, TaskWatchProjection>();
  for (let i = 2; i <= wbs.sheet.rowCount; i++) {
    const row = wbs.sheet.getRow(i);
    if (!row.hasValues) continue;
    const id = taskIdValue(at(wbs, row, "ID"));
    if (!id) continue; // Invalid IDs are prevented by inspectProjectData.
    tasks.set(id, {
      taskId: id, disposition: "Unknown",
      openReasons: [], resolvedReasons: [],
      automaticChecksVerified: false, commitmentVerified: false,
    });
  }
  for (let i = 2; i <= reasons.sheet.rowCount; i++) {
    const row = reasons.sheet.getRow(i);
    if (!row.hasValues) continue;
    const id = stringAt(reasons, row, "ReasonID");
    const taskId = taskIdValue(at(reasons, row, "TaskID"));
    const task = taskId ? tasks.get(taskId) : undefined;
    if (!task || !taskId) continue; // References are checked before projection.
    const origin = stringAt(reasons, row, "Origin") as RecordedWatchReason["origin"];
    const state = stringAt(reasons, row, "State") as RecordedWatchReason["state"];
    const reason: RecordedWatchReason = {
      reasonId: id, taskId,
      origin, state,
      ruleCode: optionalAt(reasons, row, "RuleCode"),
      title: stringAt(reasons, row, "Title"),
      details: optionalAt(reasons, row, "Details"),
      evidenceRef: optionalAt(reasons, row, "EvidenceRef"),
      openedUTC: stringAt(reasons, row, "OpenedUTC"),
      openedBy: stringAt(reasons, row, "OpenedBy"),
      lastReviewedUTC: optionalAt(reasons, row, "LastReviewedUTC"),
      resolvedUTC: optionalAt(reasons, row, "ResolvedUTC"),
      resolvedBy: optionalAt(reasons, row, "ResolvedBy"),
      resolutionNote: optionalAt(reasons, row, "ResolutionNote"),
      hasRecordedProjectAudit: auditRefs.has(id.toLowerCase()),
    };
    if (state === "Open") {
      task.openReasons.push(reason);
      task.disposition = "Under Watch";
    } else {
      task.resolvedReasons.push(reason);
    }
  }

  return {
    workbookState: "valid", projectName: inspected.projectName,
    tasks: [...tasks.values()], findings: [],
    schemaValidated: true,
  };
}

/**
 * Conservative, read-only adapter for the managed Schedule / Task Detail UI.
 * All task IDs come from the validated workbook. An absent, legacy, malformed,
 * or future-schema source MUST NOT silently become a Green/Clear state.
 *
 * This adapter is intentionally pure: no local persistence, workbook mutation,
 * automatic policy inference, or author/commitment authentication.
 */
export type ManagedWatchRow = {
  taskId: string;
  watchLabel: WatchDisposition;
  openReasonCount: number;
  openReasonTitles: string[];
  recordedAuditCount: number;
  automaticChecksVerified: false;
  commitmentVerified: false;
};
export type ManagedWatchView =
  | { kind: "ready"; projectName: string; rows: ManagedWatchRow[] }
  | { kind: "unavailable"; workbookState: Exclude<WatchProjection["workbookState"], "valid">; findings: ProjectFinding[] };

export function toManagedWatchView(projection: WatchProjection): ManagedWatchView {
  if (projection.workbookState !== "valid" || !projection.schemaValidated || projection.projectName === null) {
    return {
      kind: "unavailable",
      workbookState: projection.workbookState === "valid" ? "incompatible" : projection.workbookState,
      findings: projection.findings,
    };
  }
  return {
    kind: "ready",
    projectName: projection.projectName,
    rows: projection.tasks.map(task => ({
      taskId: task.taskId,
      watchLabel: task.openReasons.length > 0 ? "Under Watch" : "Unknown",
      openReasonCount: task.openReasons.length,
      openReasonTitles: task.openReasons.map(reason => reason.title),
      recordedAuditCount: task.openReasons.filter(reason => reason.hasRecordedProjectAudit).length,
      automaticChecksVerified: false,
      commitmentVerified: false,
    })),
  };
}
