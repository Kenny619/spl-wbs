import { excelSerialToIso, parseIsoDateOnly } from "../calendar/dateOnly";
import { PREDECESSOR_SEPARATOR, PREFERRED_SHEET, SHAREPOINT_HOSTS } from "../config/decisions";
import { findCycles, initialExpandedIds } from "../model/wbsTree";
import { rollupSummaries } from "../model/summaryRollup";
import { assignPalette, loadPalette, savePalette } from "../model/workstreamPalette";
import { readWorkbook, type CellValue, type WorkbookGrid } from "./excelReader";
import {
  KNOWN_STATUSES,
  TASK_TYPES,
  type ImportIssue,
  type ImportResult,
  type Task,
  type TaskStatus,
  type TaskType,
} from "./types";

export type ImportOptions = {
  allowedHosts?: readonly string[];
  paletteStorage?: Pick<Storage, "getItem" | "setItem"> | null;
};

type Field =
  | "id"
  | "taskName"
  | "wbsCode"
  | "parentId"
  | "taskType"
  | "plannedStart"
  | "plannedEnd"
  | "progress"
  | "status"
  | "owner"
  | "workstream"
  | "sortOrder"
  | "priority"
  | "predecessorIds"
  | "description"
  | "modified"
  | "itemUrl";

const ALIASES: Record<string, Field> = {
  id: "id",
  title: "taskName",
  "task name": "taskName",
  wbscode: "wbsCode",
  wbs: "wbsCode",
  parenttaskid: "parentId",
  tasktype: "taskType",
  type: "taskType",
  plannedstart: "plannedStart",
  start: "plannedStart",
  plannedend: "plannedEnd",
  finish: "plannedEnd",
  end: "plannedEnd",
  progress: "progress",
  done: "progress",
  taskstatus: "status",
  status: "status",
  assignedto: "owner",
  owner: "owner",
  workstream: "workstream",
  sortorder: "sortOrder",
  priority: "priority",
  predecessorids: "predecessorIds",
  description: "description",
  modified: "modified",
  itemurl: "itemUrl",
  "link to item": "itemUrl",
  url: "itemUrl",
};

const REQUIRED: Field[] = ["id", "taskName", "wbsCode", "taskType"];

export async function importWorkbook(
  data: ArrayBuffer | Uint8Array,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const grid = await readWorkbook(data);
  if (!grid.ok) {
    return {
      ok: false,
      issues: [{ severity: "fatal", code: grid.code, message: grid.message }],
    };
  }
  return normalizeGrid(grid, options);
}

export function normalizeGrid(grid: WorkbookGrid, options: ImportOptions = {}): ImportResult {
  const issues: ImportIssue[] = [];
  if (grid.fallbackSheet) {
    issues.push({
      severity: "warning",
      code: "single-sheet-fallback",
      message: `Worksheet ${PREFERRED_SHEET} was not found. Imported the only sheet, ${grid.sheetName}.`,
    });
  }
  const mapped = mapHeaders(grid.headers);
  issues.push(...mapped.issues);
  if (issues.some((issue) => issue.severity === "fatal")) {
    return { ok: false, issues };
  }

  const columns = mapped.columns;
  warnIfColumnMissing(issues, columns, "owner", "Owner column is missing. Owners are Unassigned.");
  warnIfColumnMissing(issues, columns, "status", "Status column is missing. Statuses are Unknown.");
  warnIfColumnMissing(issues, columns, "workstream", "Workstream column is missing. Workstreams are Unassigned.");

  const allowedHosts = options.allowedHosts ?? SHAREPOINT_HOSTS;
  const drafts: Task[] = [];
  const predecessorText = new Map<string, string>();
  const seenIds = new Map<string, number>();

  for (const record of grid.records) {
    const parsed = parseRecord(record.excelRow, record.cells, columns, grid.date1904, allowedHosts);
    issues.push(...parsed.issues);
    if (parsed.id) {
      const previous = seenIds.get(parsed.id);
      if (previous) {
        issues.push({
          severity: "fatal",
          code: "duplicate-id",
          message: `Row ${record.excelRow} repeats ID ${parsed.id}, already used on row ${previous}.`,
          row: record.excelRow,
          taskId: parsed.id,
        });
      } else {
        seenIds.set(parsed.id, record.excelRow);
      }
    }
    if (!parsed.task) continue;
    drafts.push(parsed.task);
    if (parsed.predecessors) predecessorText.set(parsed.task.id, parsed.predecessors);
  }

  const seenWbs = new Map<string, number>();
  for (const task of drafts) {
    const previous = seenWbs.get(task.wbsCode);
    if (previous) {
      issues.push({
        severity: "fatal",
        code: "duplicate-wbs",
        message: `Row ${task.sourceRow} repeats WBS code ${task.wbsCode}, already used on row ${previous}.`,
        row: task.sourceRow,
        taskId: task.id,
      });
    } else {
      seenWbs.set(task.wbsCode, task.sourceRow);
    }
    if (task.parentId && !seenIds.has(task.parentId)) {
      issues.push({
        severity: "fatal",
        code: "missing-parent",
        message: `Row ${task.sourceRow} parent ${task.parentId} does not match an ID in this sheet.`,
        row: task.sourceRow,
        taskId: task.id,
      });
    }
  }

  const reportedCycles = new Set<string>();
  for (const cycle of findCycles(drafts)) {
    const key = [...cycle].sort().join(">");
    if (reportedCycles.has(key)) continue;
    reportedCycles.add(key);
    issues.push({
      severity: "fatal",
      code: "cycle",
      message: `Tasks ${cycle.join(" → ")} form a parent cycle.`,
      taskId: cycle[0],
    });
  }

  resolvePredecessors(drafts, predecessorText, seenIds, issues);

  if (issues.some((issue) => issue.severity === "fatal")) {
    return { ok: false, issues };
  }

  const tasks = rollupSummaries(drafts);
  const storage = paletteStore(options.paletteStorage);
  const palette = assignPalette(
    tasks.map((task) => task.workstream),
    storage ? loadPalette(storage) : {},
  );
  if (storage) savePalette(storage, palette);
  const modified = tasks.map((task) => task.modified).filter((value): value is string => Boolean(value)).sort();
  return {
    ok: true,
    sheetName: grid.sheetName,
    tasks,
    issues,
    latestModified: modified.at(-1) ?? null,
    palette,
    expandedIds: initialExpandedIds(tasks),
  };
}

export function sanitizeItemUrl(raw: string, allowedHosts: readonly string[]): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (!allowedHosts.some((allowed) => allowed.toLowerCase() === host)) return null;
  return url.toString();
}

type ColumnMap = Partial<Record<Field, number>>;

function mapHeaders(headers: string[]): { columns: ColumnMap; issues: ImportIssue[] } {
  const columns: ColumnMap = {};
  const issues: ImportIssue[] = [];
  headers.forEach((header, index) => {
    const field = ALIASES[headerKey(header)];
    if (!field) return;
    if (columns[field] != null) {
      issues.push({
        severity: "fatal",
        code: "ambiguous-header",
        message: `Header "${header}" repeats the ${field} column.`,
      });
      return;
    }
    columns[field] = index;
  });
  for (const field of REQUIRED) {
    if (columns[field] == null) {
      issues.push({
        severity: "fatal",
        code: "missing-required",
        message: `Required column ${field} is missing from row 1.`,
      });
    }
  }
  return { columns, issues };
}

function parseRecord(
  excelRow: number,
  cells: CellValue[],
  columns: ColumnMap,
  date1904: boolean,
  allowedHosts: readonly string[],
): { task: Task | null; id: string | null; predecessors: string | null; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const id = identity(cellAt(cells, columns.id));
  const taskName = textValue(cellAt(cells, columns.taskName));
  const wbsCode = textValue(cellAt(cells, columns.wbsCode));
  const parentId = identity(cellAt(cells, columns.parentId));
  const taskType = parseTaskType(cellAt(cells, columns.taskType));

  if (!id) {
    issues.push({ severity: "fatal", code: "blank-id", message: `Row ${excelRow} has a blank ID.`, row: excelRow });
  }
  if (!taskName) {
    issues.push({
      severity: "fatal",
      code: "missing-required",
      message: `Row ${excelRow} has a blank task name.`,
      row: excelRow,
      taskId: id ?? undefined,
    });
  }
  if (!wbsCode) {
    issues.push({
      severity: "fatal",
      code: "missing-required",
      message: `Row ${excelRow} has a blank WBS code.`,
      row: excelRow,
      taskId: id ?? undefined,
    });
  }
  if (!taskType) {
    const present = textValue(cellAt(cells, columns.taskType));
    issues.push({
      severity: "fatal",
      code: present ? "invalid-task-type" : "missing-required",
      message: present
        ? `Row ${excelRow} task type "${present}" is not Summary, Task, or Milestone.`
        : `Row ${excelRow} has a blank task type.`,
      row: excelRow,
      taskId: id ?? undefined,
    });
  }
  if (!id || !taskName || !wbsCode || !taskType) {
    return { task: null, id, predecessors: null, issues };
  }

  const dates = resolveDates(excelRow, id, taskType, cells, columns, date1904);
  issues.push(...dates.issues);
  const progress = parseProgress(cellAt(cells, columns.progress));
  if (progress.invalid) {
    issues.push({
      severity: "warning",
      code: "invalid-progress",
      message: `Row ${excelRow} progress is not an integer from 0 to 100, or a percent-formatted value.`,
      row: excelRow,
      taskId: id,
    });
  }
  const status = parseStatus(cellAt(cells, columns.status), columns.status != null, excelRow, id);
  if (status.issue) issues.push(status.issue);
  const owner = parseLabel(cellAt(cells, columns.owner), columns.owner != null, "Unassigned", excelRow, id, "owner");
  if (owner.issue) issues.push(owner.issue);
  const workstream = parseLabel(
    cellAt(cells, columns.workstream),
    columns.workstream != null,
    "Unassigned",
    excelRow,
    id,
    "workstream",
  );
  if (workstream.issue) issues.push(workstream.issue);
  const sort = parseSortOrder(cellAt(cells, columns.sortOrder), excelRow, id);
  if (sort.issue) issues.push(sort.issue);
  const modified = parseModified(cellAt(cells, columns.modified), date1904, excelRow, id);
  if (modified.issue) issues.push(modified.issue);
  const itemUrl = parseItemUrl(cellAt(cells, columns.itemUrl), allowedHosts, excelRow, id);
  if (itemUrl.issue) issues.push(itemUrl.issue);

  const task: Task = {
    id,
    taskName,
    wbsCode,
    parentId,
    taskType,
    plannedStart: dates.start,
    plannedEnd: dates.end,
    progress: taskType === "Summary" ? null : progress.value,
    status: status.status,
    owner: owner.value,
    workstream: workstream.value,
    sortOrder: sort.value,
    priority: textValue(cellAt(cells, columns.priority)),
    predecessorIds: [],
    description: textValue(cellAt(cells, columns.description)) ?? "",
    modified: modified.value,
    itemUrl: itemUrl.value,
    scheduled: dates.scheduled,
    sourceRow: excelRow,
  };
  return {
    task,
    id,
    predecessors: textValue(cellAt(cells, columns.predecessorIds)),
    issues,
  };
}

function resolveDates(
  excelRow: number,
  id: string,
  taskType: TaskType,
  cells: CellValue[],
  columns: ColumnMap,
  date1904: boolean,
): { start: string | null; end: string | null; scheduled: boolean; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const start = readDate(cellAt(cells, columns.plannedStart), date1904);
  const end = readDate(cellAt(cells, columns.plannedEnd), date1904);
  if (taskType === "Summary") return { start: null, end: null, scheduled: false, issues };

  if (start.state === "bad") {
    issues.push(dateFatal(excelRow, id, "planned start"));
  }
  if (end.state === "bad") {
    issues.push(dateFatal(excelRow, id, "planned finish"));
  }
  if (start.state === "bad" || end.state === "bad") {
    return { start: null, end: null, scheduled: false, issues };
  }

  if (taskType === "Milestone") {
    if (start.iso && end.iso && start.iso !== end.iso) {
      issues.push({
        severity: "warning",
        code: "milestone-date-mismatch",
        message: `Row ${excelRow} milestone dates differ (${start.iso} and ${end.iso}). No bar was drawn.`,
        row: excelRow,
        taskId: id,
      });
      return { start: null, end: null, scheduled: false, issues };
    }
    const iso = start.iso ?? end.iso;
    if (!iso) {
      issues.push(blankDate(excelRow, id));
      return { start: null, end: null, scheduled: false, issues };
    }
    return { start: iso, end: iso, scheduled: true, issues };
  }

  if (!start.iso || !end.iso) {
    issues.push(blankDate(excelRow, id));
    return { start: null, end: null, scheduled: false, issues };
  }
  if (end.iso < start.iso) {
    issues.push({
      severity: "fatal",
      code: "unparseable-date",
      message: `Row ${excelRow} planned finish ${end.iso} is before planned start ${start.iso}.`,
      row: excelRow,
      taskId: id,
    });
    return { start: null, end: null, scheduled: false, issues };
  }
  return { start: start.iso, end: end.iso, scheduled: true, issues };
}

function resolvePredecessors(
  tasks: Task[],
  text: Map<string, string>,
  ids: Map<string, number>,
  issues: ImportIssue[],
): void {
  for (const task of tasks) {
    const raw = text.get(task.id);
    if (!raw) continue;
    const tokens = raw.split(PREDECESSOR_SEPARATOR).map((token) => token.trim()).filter(Boolean);
    const kept: string[] = [];
    for (const token of tokens) {
      if (ids.has(token) && token !== task.id) {
        kept.push(token);
        continue;
      }
      const dependencyToken = /(FS|SS|FF|SF)/i.test(token) || /[+-]\d/.test(token);
      issues.push({
        severity: "warning",
        code: dependencyToken ? "non-id-predecessor-token" : "unknown-predecessor",
        message: dependencyToken
          ? `Row ${task.sourceRow} predecessor "${token}" is not a plain task ID.`
          : `Row ${task.sourceRow} predecessor "${token}" does not match a task ID.`,
        row: task.sourceRow,
        taskId: task.id,
      });
    }
    task.predecessorIds = kept;
  }
}

function parseProgress(cell: CellValue | undefined): { value: number | null; invalid: boolean } {
  if (!cell || cell.kind === "empty") return { value: null, invalid: false };
  if (cell.kind === "number") {
    const percent = Boolean(cell.format?.includes("%"));
    return acceptProgress(percent ? cell.value * 100 : cell.value, !percent);
  }
  if (cell.kind === "text") {
    const trimmed = cell.value.trim();
    if (!trimmed) return { value: null, invalid: false };
    const percent = trimmed.endsWith("%");
    const numeric = Number(percent ? trimmed.slice(0, -1) : trimmed);
    return acceptProgress(numeric, !percent);
  }
  return { value: null, invalid: true };
}

function acceptProgress(value: number, requireInteger: boolean): { value: number | null; invalid: boolean } {
  if (!Number.isFinite(value) || value < 0 || value > 100) return { value: null, invalid: true };
  if (requireInteger && !Number.isInteger(value)) return { value: null, invalid: true };
  return { value: Math.round(value * 1e6) / 1e6, invalid: false };
}

function parseStatus(
  cell: CellValue | undefined,
  columnPresent: boolean,
  excelRow: number,
  id: string,
): { status: TaskStatus; issue?: ImportIssue } {
  if (!columnPresent) return { status: "Unknown" };
  const text = textValue(cell);
  if (!text) {
    return { status: "Unknown", issue: normalizedIssue(excelRow, id, "status", "Unknown") };
  }
  const known = KNOWN_STATUSES.find((status) => status.toLowerCase() === text.toLowerCase());
  if (!known) return { status: "Unknown", issue: normalizedIssue(excelRow, id, "status", "Unknown") };
  return { status: known };
}

function parseLabel(
  cell: CellValue | undefined,
  columnPresent: boolean,
  fallback: string,
  excelRow: number,
  id: string,
  field: "owner" | "workstream",
): { value: string; issue?: ImportIssue } {
  if (!columnPresent) return { value: fallback };
  const text = textValue(cell);
  if (!text) return { value: fallback, issue: normalizedIssue(excelRow, id, field, fallback) };
  return { value: text };
}

function parseSortOrder(
  cell: CellValue | undefined,
  excelRow: number,
  id: string,
): { value: number | null; issue?: ImportIssue } {
  if (!cell || cell.kind === "empty") return { value: null };
  if (cell.kind === "number" && Number.isFinite(cell.value)) return { value: cell.value };
  if (cell.kind === "text" && cell.value.trim()) {
    const numeric = Number(cell.value.trim());
    if (Number.isFinite(numeric)) return { value: numeric };
  } else if (cell.kind === "text") {
    return { value: null };
  }
  return {
    value: null,
    issue: {
      severity: "warning",
      code: "invalid-sort-order",
      message: `Row ${excelRow} sort order is not numeric and was ignored.`,
      row: excelRow,
      taskId: id,
    },
  };
}

function parseModified(
  cell: CellValue | undefined,
  date1904: boolean,
  excelRow: number,
  id: string,
): { value: string | null; issue?: ImportIssue } {
  if (!cell || cell.kind === "empty") return { value: null };
  if (cell.kind === "timestamp") return { value: cell.iso };
  if (cell.kind === "date") return { value: `${cell.iso}T00:00:00.000Z` };
  if (cell.kind === "text") {
    const trimmed = cell.value.trim();
    if (!trimmed) return { value: null };
    if (parseIsoDateOnly(trimmed.slice(0, 10)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(trimmed)) {
      return { value: trimmed };
    }
    const date = parseIsoDateOnly(trimmed);
    if (date && trimmed === date) return { value: `${date}T00:00:00.000Z` };
  }
  if (cell.kind === "number") {
    const iso = excelSerialToIso(cell.value, date1904);
    if (iso) return { value: `${iso}T00:00:00.000Z` };
  }
  return {
    value: null,
    issue: {
      severity: "warning",
      code: "invalid-modified",
      message: `Row ${excelRow} modified value is not a reliable timestamp and was ignored.`,
      row: excelRow,
      taskId: id,
    },
  };
}

function parseItemUrl(
  cell: CellValue | undefined,
  allowedHosts: readonly string[],
  excelRow: number,
  id: string,
): { value: string | null; issue?: ImportIssue } {
  const text = textValue(cell);
  if (!text) return { value: null };
  const safe = sanitizeItemUrl(text, allowedHosts);
  if (safe) return { value: safe };
  return {
    value: null,
    issue: {
      severity: "warning",
      code: "rejected-item-url",
      message: `Row ${excelRow} ItemURL is not an allowed HTTPS SharePoint link and was disabled.`,
      row: excelRow,
      taskId: id,
    },
  };
}

function readDate(cell: CellValue | undefined, date1904: boolean): { iso: string | null; state: "blank" | "ok" | "bad" } {
  if (!cell || cell.kind === "empty") return { iso: null, state: "blank" };
  if (cell.kind === "date") return { iso: cell.iso, state: "ok" };
  if (cell.kind === "timestamp") return { iso: cell.iso.slice(0, 10), state: "ok" };
  if (cell.kind === "fictional-date" || cell.kind === "error") return { iso: null, state: "bad" };
  if (cell.kind === "text") {
    const iso = parseIsoDateOnly(cell.value);
    if (iso) return { iso, state: "ok" };
    return cell.value.trim() ? { iso: null, state: "bad" } : { iso: null, state: "blank" };
  }
  if (cell.kind === "number") {
    const iso = excelSerialToIso(cell.value, date1904);
    return iso ? { iso, state: "ok" } : { iso: null, state: "bad" };
  }
  return { iso: null, state: "bad" };
}

function identity(cell: CellValue | undefined): string | null {
  if (!cell || cell.kind === "empty") return null;
  if (cell.kind === "number" && Number.isFinite(cell.value)) {
    return Number.isInteger(cell.value) ? String(cell.value) : String(cell.value);
  }
  if (cell.kind === "text") {
    const trimmed = cell.value.trim();
    return trimmed || null;
  }
  return null;
}

function textValue(cell: CellValue | undefined): string | null {
  if (!cell || cell.kind === "empty") return null;
  if (cell.kind === "text") {
    const trimmed = cell.value.trim();
    return trimmed || null;
  }
  if (cell.kind === "number" && Number.isFinite(cell.value)) return String(cell.value);
  if (cell.kind === "date") return cell.iso;
  return null;
}

function parseTaskType(cell: CellValue | undefined): TaskType | null {
  const text = textValue(cell);
  if (!text) return null;
  return TASK_TYPES.find((type) => type.toLowerCase() === text.toLowerCase()) ?? null;
}

function cellAt(cells: CellValue[], index: number | undefined): CellValue | undefined {
  if (index == null) return undefined;
  return cells[index];
}

function headerKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function warnIfColumnMissing(issues: ImportIssue[], columns: ColumnMap, field: Field, message: string): void {
  if (columns[field] == null) {
    issues.push({ severity: "warning", code: "normalized-blank-owner-status-workstream", message });
  }
}

function normalizedIssue(excelRow: number, id: string, field: string, fallback: string): ImportIssue {
  return {
    severity: "warning",
    code: "normalized-blank-owner-status-workstream",
    message: `Row ${excelRow} ${field} is blank or unrecognized and was set to ${fallback}.`,
    row: excelRow,
    taskId: id,
  };
}

function dateFatal(excelRow: number, id: string, label: string): ImportIssue {
  return {
    severity: "fatal",
    code: "unparseable-date",
    message: `Row ${excelRow} has an unreadable ${label}.`,
    row: excelRow,
    taskId: id,
  };
}

function blankDate(excelRow: number, id: string): ImportIssue {
  return {
    severity: "warning",
    code: "blank-dates",
    message: `Row ${excelRow} has no schedulable planned dates. No bar was drawn.`,
    row: excelRow,
    taskId: id,
  };
}

function paletteStore(
  explicit: ImportOptions["paletteStorage"],
): Pick<Storage, "getItem" | "setItem"> | null {
  if (explicit === null) return null;
  if (explicit) return explicit;
  if (typeof sessionStorage !== "undefined") return sessionStorage;
  return null;
}
