import ExcelJS from "exceljs";
import { importWorkbook } from "../data/normalize";
import { KNOWN_STATUSES, TASK_TYPES } from "../data/types";
import { ManagedWorkbookError, preflightManagedWorkbook } from "./preflight";

export const HISTORY_COLUMNS = [
  "ChangeSetID", "TimestampUTC", "TaskID", "WBSCode", "TaskTitle",
  "Field", "OldValue", "NewValue", "Source", "AppVersion",
] as const;

export const EDITABLE_FIELDS = [
  "Title", "AssignedTo", "TaskStatus", "Progress", "PlannedStart", "PlannedEnd",
  "Priority", "Description", "Updates", "Workstream", "WBSCode",
  "ParentTaskID", "TaskType",
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type EditValue = string | number | null;
export type EditChanges = Partial<Record<EditableField, EditValue>>;
export type FieldChange = { field: EditableField; oldValue: EditValue; newValue: EditValue };

export type CandidateInput = {
  source: Uint8Array | ArrayBuffer;
  taskId: string;
  changes: EditChanges;
  appVersion: string;
  changeSetId?: string;
  timestampUTC?: string;
};

export type CandidateResult =
  | { kind: "noop"; changes: [] }
  | {
      kind: "candidate";
      bytes: Uint8Array;
      changeSetId: string;
      timestampUTC: string;
      changes: FieldChange[];
    };

const HEADER_ALIASES: Record<string, string> = {
  id: "ID", title: "Title", taskname: "Title",
  wbscode: "WBSCode", wbs: "WBSCode",
  parenttaskid: "ParentTaskID", tasktype: "TaskType", type: "TaskType",
  plannedstart: "PlannedStart", start: "PlannedStart",
  plannedend: "PlannedEnd", end: "PlannedEnd", finish: "PlannedEnd",
  assignedto: "AssignedTo", owner: "AssignedTo",
  taskstatus: "TaskStatus", status: "TaskStatus", progress: "Progress", done: "Progress",
  priority: "Priority", description: "Description", updates: "Updates", workstream: "Workstream",
};

const fail = (code: string, message: string): never => { throw new ManagedWorkbookError(code, message); };
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** Never writes a file. Builds and reopens one validated, disposable candidate in memory. */
export async function buildManagedCandidate(input: CandidateInput): Promise<CandidateResult> {
  const timestampUTC = input.timestampUTC ?? new Date().toISOString();
  const changeSetId = input.changeSetId ?? crypto.randomUUID();
  if (!uuid.test(changeSetId)) fail("INVALID_TRANSACTION", "ChangeSetID must be a UUID.");
  if (!utc.test(timestampUTC) || Number.isNaN(Date.parse(timestampUTC))) {
    fail("INVALID_TRANSACTION", "TimestampUTC must be a valid UTC ISO timestamp.");
  }
  if (!input.appVersion.trim()) fail("INVALID_TRANSACTION", "AppVersion is required.");
  if (!input.taskId.trim()) fail("INVALID_TASK", "An immutable TaskID is required.");
  await preflightManagedWorkbook(input.source);

  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(input.source as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  } catch {
    fail("UNREADABLE_XLSX", "ExcelJS cannot load this XLSX; no changes were made.");
  }

  const taskSheet = book.worksheets.find((sheet) => sheet.name.toLowerCase() === "projectwbs");
  if (!taskSheet) fail("MISSING_SHEET", "A ProjectWBS worksheet is required for managed edits.");
  const columns = taskColumns(taskSheet);
  if (!columns.ID || !columns.Title || !columns.WBSCode || !columns.TaskType) {
    fail("INVALID_HEADERS", "ProjectWBS must have unambiguous ID, Title, WBSCode and TaskType headers.");
  }

  const matching = taskSheet.getRows(2, Math.max(0, taskSheet.rowCount - 1))?.filter((row) =>
    cellText(row.getCell(columns.ID!)) === input.taskId,
  ) ?? [];
  if (matching.length !== 1) fail("INVALID_TASK", "TaskID must identify exactly one ProjectWBS row.");
  const row = matching[0];

  // Validate existing history before even considering a new write.
  let history = book.worksheets.find((sheet) => sheet.name.toLowerCase() === "updatehistory");
  const historicalColumns = history ? inspectHistory(history) : null;

  const proposed: FieldChange[] = [];
  for (const [fieldName, requested] of Object.entries(input.changes)) {
    if (!EDITABLE_FIELDS.includes(fieldName as EditableField)) {
      fail("INVALID_FIELD", "Unsupported editable field: " + fieldName);
    }
    const field = fieldName as EditableField;
    const column = columns[field];
    if (!column) fail("MISSING_EDITABLE_COLUMN", "ProjectWBS does not have a column for " + field + ".");
    const cell = row.getCell(column);
    const previous = canonicalValue(cell, field);
    const next = newValue(field, requested, previous, timestampUTC);
    if (next !== previous) proposed.push({ field, oldValue: previous, newValue: next });
  }
  if (!proposed.length) return { kind: "noop", changes: [] };

  const currentType = cellText(row.getCell(columns.TaskType!));
  const typeChange = proposed.find((change) => change.field === "TaskType");
  const nextType = String(typeChange?.newValue ?? currentType);
  const hasChildren = (taskSheet.getRows(2, Math.max(0, taskSheet.rowCount - 1)) ?? []).some(
    (other) => cellText(other.getCell(columns.ParentTaskID ?? -1)) === input.taskId,
  );
  if (nextType === "Summary" && proposed.some((change) =>
    ["Progress", "PlannedStart", "PlannedEnd"].includes(change.field))) {
    fail("INVALID_SUMMARY_EDIT", "Derived Summary progress and dates cannot be edited.");
  }
  if (nextType !== "Summary" && hasChildren) {
    fail("INVALID_TASK_TYPE", "A task with children must remain a Summary.");
  }

  for (const change of proposed) {
    const cell = row.getCell(columns[change.field]!);
    if (change.newValue === null) cell.value = null;
    else if (change.field === "Progress" && typeof change.newValue === "number" && isPercentFormat(cell.numFmt)) {
      cell.value = change.newValue / 100;
    } else cell.value = change.newValue;
  }

  const check = await importWorkbook(await book.xlsx.writeBuffer(), { paletteStorage: null });
  if (!check.ok) {
    fail("INVALID_TASK_STRUCTURE", check.issues.filter((issue) => issue.severity === "fatal")
      .map((issue) => issue.message).join("; ") || "ProjectWBS validation failed.");
  }
  const saved = check.tasks.find((task) => task.id === input.taskId);
  if (!saved) fail("INVALID_TASK_STRUCTURE", "TaskID was lost after applying edits.");
  if (saved.taskType === "Milestone" && saved.plannedStart !== saved.plannedEnd) {
    fail("INVALID_TASK_STRUCTURE", "Milestone start and end must be the same date.");
  }
  if (saved.taskType === "Task" && saved.plannedStart && saved.plannedEnd &&
    saved.plannedEnd < saved.plannedStart) {
    fail("INVALID_TASK_STRUCTURE", "Task finish precedes its start.");
  }

  if (!history) {
    history = book.addWorksheet("UpdateHistory");
    history.addRow([...HISTORY_COLUMNS]);
  }
  const positions = historicalColumns ?? inspectHistory(history);
  for (const change of proposed) {
    const record: Record<string, string | number | null> = {
      ChangeSetID: changeSetId, TimestampUTC: timestampUTC, TaskID: input.taskId,
      WBSCode: saved.wbsCode, TaskTitle: saved.taskName, Field: change.field,
      OldValue: change.oldValue, NewValue: change.newValue,
      Source: "Web UI", AppVersion: input.appVersion,
    };
    const appended = history.addRow([]);
    for (const header of HISTORY_COLUMNS) {
      appended.getCell(positions[header]).value = record[header];
    }
  }

  const bytes = new Uint8Array(await book.xlsx.writeBuffer());
  await preflightManagedWorkbook(bytes);
  const after = new ExcelJS.Workbook();
  await after.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  const newHistory = after.worksheets.find((sheet) => sheet.name.toLowerCase() === "updatehistory");
  if (!newHistory || newHistory.rowCount !== history.rowCount) {
    fail("READBACK_FAILED", "History was not preserved during XLSX serialization.");
  }
  const last = newHistory.getRow(newHistory.rowCount);
  if (cellText(last.getCell(positions.ChangeSetID)) !== changeSetId) {
    fail("READBACK_FAILED", "Saved field-level history has a different transaction ID.");
  }
  return { kind: "candidate", bytes, changeSetId, timestampUTC, changes: proposed };
}

type TaskColumn = "ID" | EditableField;

function taskColumns(sheet: ExcelJS.Worksheet): Partial<Record<TaskColumn, number>> {
  const found: Partial<Record<TaskColumn, number>> = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
    const alias = HEADER_ALIASES[key(cellText(cell))] as TaskColumn | undefined;
    if (!alias) return;
    if (found[alias]) fail("INVALID_HEADERS", "Ambiguous ProjectWBS header: " + alias);
    found[alias] = column;
  });
  return found;
}

function inspectHistory(sheet: ExcelJS.Worksheet): Record<(typeof HISTORY_COLUMNS)[number], number> {
  const found = {} as Record<(typeof HISTORY_COLUMNS)[number], number>;
  const recognized = new Set<string>(HISTORY_COLUMNS.map((value) => value.toLowerCase()));
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
    const candidate = cellText(cell).trim().toLowerCase();
    if (!recognized.has(candidate)) return;
    const name = HISTORY_COLUMNS.find((header) => header.toLowerCase() === candidate)!;
    if (found[name]) fail("INVALID_HISTORY", "Duplicate UpdateHistory header: " + name);
    found[name] = column;
  });
  for (const name of HISTORY_COLUMNS) {
    if (!found[name]) fail("INVALID_HISTORY", "Missing UpdateHistory header: " + name);
  }
  for (let n = 2; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    if (!row.hasValues) continue;
    const value = (name: (typeof HISTORY_COLUMNS)[number]) => row.getCell(found[name]).value;
    const id = String(value("ChangeSetID") ?? "");
    const stamp = String(value("TimestampUTC") ?? "");
    const field = String(value("Field") ?? "");
    if (!uuid.test(id) || !utc.test(stamp) || Number.isNaN(Date.parse(stamp)) ||
        !EDITABLE_FIELDS.includes(field as EditableField) ||
        ["TaskID", "WBSCode", "TaskTitle", "Source", "AppVersion"].some((name) =>
          !String(value(name as (typeof HISTORY_COLUMNS)[number]) ?? "").trim())) {
      fail("INVALID_HISTORY", "Invalid required UpdateHistory data on row " + n + ".");
    }
    for (const name of ["OldValue", "NewValue"] as const) {
      const cellValue = value(name);
      if (cellValue !== null && typeof cellValue !== "string" && typeof cellValue !== "number") {
        fail("INVALID_HISTORY", "Unsupported history value type on row " + n + ".");
      }
    }
  }
  return found;
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function isPercentFormat(format: string | undefined): boolean {
  return (format ?? "").replace(/"[^"]*"/g, "").replace(/\\./g, "").includes("%");
}

function canonicalValue(cell: ExcelJS.Cell, field: EditableField): EditValue {
  if (cell.value == null) return null;
  if (field === "Progress") {
    if (typeof cell.value !== "number") fail("UNSUPPORTED_CELL", "Progress must be a numeric cell for editing.");
    return isPercentFormat(cell.numFmt) ? cell.value * 100 : cell.value;
  }
  if (cell.value instanceof Date && (field === "PlannedStart" || field === "PlannedEnd")) {
    return cell.value.toISOString().slice(0, 10);
  }
  if (typeof cell.value === "string" || typeof cell.value === "number") {
    return String(cell.value);
  }
  return fail("UNSUPPORTED_CELL", "The edited cell has an unsupported type for " + field + ".");
}

function newValue(field: EditableField, requested: EditValue | undefined, previous: EditValue, stamp: string): EditValue {
  if (requested === undefined) fail("INVALID_FIELD", "An undefined edit cannot be saved.");
  if (field === "Updates") {
    if (typeof requested !== "string") fail("INVALID_UPDATES", "An update entry must be text.");
    if (!requested.trim()) return previous;
    return String(previous ?? "") + (previous ? "\n" : "") + "[" + stamp + "] " + requested;
  }
  if (field === "Progress") {
    if (requested === null) return null;
    if (typeof requested !== "number" || !Number.isFinite(requested) || requested < 0 || requested > 100) {
      fail("INVALID_PROGRESS", "Progress must be a number from 0 through 100.");
    }
    return requested;
  }
  if (requested !== null && typeof requested !== "string") {
    fail("INVALID_FIELD", field + " must be text or blank.");
  }
  if (field === "Title" || field === "WBSCode") {
    if (!requested || !requested.trim()) fail("INVALID_REQUIRED", field + " cannot be blank.");
  }
  if (field === "TaskStatus" && requested !== null && !KNOWN_STATUSES.includes(requested as typeof KNOWN_STATUSES[number])) {
    fail("INVALID_STATUS", "Unsupported task status: " + requested);
  }
  if (field === "TaskType" && (requested === null || !TASK_TYPES.includes(requested as typeof TASK_TYPES[number]))) {
    fail("INVALID_TASK_TYPE", "Invalid task type.");
  }
  if ((field === "PlannedStart" || field === "PlannedEnd") && requested) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requested) ||
      Number.isNaN(Date.parse(requested + "T00:00:00Z")) ||
      new Date(requested + "T00:00:00Z").toISOString().slice(0, 10) !== requested) {
      fail("INVALID_DATE", "Date must be a real YYYY-MM-DD calendar day.");
    }
  }
  return requested;
}
