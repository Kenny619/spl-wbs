import ExcelJS from "exceljs";
import { EDITABLE_FIELDS, HISTORY_COLUMNS, type EditableField } from "./workbookCandidate";
import { ManagedWorkbookError } from "./preflight";

export type HistoryValue = string | number | null;
export type HistoryChange = {
  row: number;
  taskId: string;
  wbsCode: string;
  taskTitle: string;
  field: EditableField;
  oldValue: HistoryValue;
  newValue: HistoryValue;
  source: string;
  appVersion: string;
};
export type HistoryEvent = {
  changeSetId: string;
  timestampUTC: string;
  changes: HistoryChange[];
};
export type HistoryFilter = {
  taskId?: string;
  field?: EditableField | "";
  fromDate?: string;
  throughDate?: string;
  timeZone: string;
};

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function historyError(row: number, reason: string): never {
  throw new ManagedWorkbookError("INVALID_HISTORY", "UpdateHistory row " + row + ": " + reason);
}
function text(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value);
}
function historicalValue(cell: ExcelJS.Cell, row: number, column: string): HistoryValue {
  const value = cell.value;
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  historyError(row, "Unsupported value type in " + column);
}
function positionsFor(sheet: ExcelJS.Worksheet): Map<string, number> {
  const result = new Map<string, number>();
  const required = new Map<string, string>(HISTORY_COLUMNS.map((name) => [name.toLowerCase(), name]));
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, index) => {
    const name = required.get(text(cell).trim().toLowerCase());
    if (!name) return;
    if (result.has(name)) historyError(1, "duplicate required column " + name);
    result.set(name, index);
  });
  for (const name of HISTORY_COLUMNS) if (!result.has(name)) historyError(1, "missing required column " + name);
  return result;
}

/** Read persisted audit data only, without modifying workbook bytes or inferred task state. */
export async function readManagedHistory(data: Uint8Array | ArrayBuffer): Promise<HistoryEvent[]> {
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(data as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  } catch {
    throw new ManagedWorkbookError("UNREADABLE_HISTORY", "Unable to read the selected workbook's Change History.");
  }
  const sheet = book.worksheets.find((item) => item.name.toLowerCase() === "updatehistory");
  if (!sheet) return [];
  const columns = positionsFor(sheet);
  const groups = new Map<string, HistoryEvent>();
  for (let n = 2; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    if (!row.hasValues) continue;
    const value = (name: (typeof HISTORY_COLUMNS)[number]) => row.getCell(columns.get(name)!);
    const id = text(value("ChangeSetID")).trim();
    const timestamp = text(value("TimestampUTC")).trim();
    const taskId = text(value("TaskID")).trim();
    const wbsCode = text(value("WBSCode")).trim();
    const taskTitle = text(value("TaskTitle")).trim();
    const field = text(value("Field")).trim();
    const source = text(value("Source")).trim();
    const appVersion = text(value("AppVersion")).trim();
    if (!UUID.test(id)) historyError(n, "ChangeSetID is not a UUID");
    if (!UTC.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) {
      historyError(n, "TimestampUTC is not canonical UTC ISO");
    }
    if (!taskId || !wbsCode || !taskTitle || !source || !appVersion) {
      historyError(n, "required task identity, Source or AppVersion is blank");
    }
    if (!EDITABLE_FIELDS.includes(field as EditableField)) historyError(n, "unsupported Field " + field);
    const previous = groups.get(id);
    if (previous && previous.timestampUTC !== timestamp) {
      historyError(n, "inconsistent UTC time for ChangeSetID " + id);
    }
    const event = previous ?? { changeSetId: id, timestampUTC: timestamp, changes: [] };
    event.changes.push({
      row: n, taskId, wbsCode, taskTitle, field: field as EditableField,
      oldValue: historicalValue(value("OldValue"), n, "OldValue"),
      newValue: historicalValue(value("NewValue"), n, "NewValue"),
      source, appVersion,
    });
    groups.set(id, event);
  }
  return [...groups.values()].sort((a, b) =>
    b.timestampUTC.localeCompare(a.timestampUTC) || a.changeSetId.localeCompare(b.changeSetId));
}

function localDay(timestampUTC: string, timeZone: string): string {
  const tokens = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(timestampUTC));
  const read = (type: string) => tokens.find((part) => part.type === type)?.value ?? "";
  return read("year") + "-" + read("month") + "-" + read("day");
}

/** Filters are view-only: never alter workbook order, values, or transaction IDs. */
export function filterManagedHistory(events: readonly HistoryEvent[], filter: HistoryFilter): HistoryEvent[] {
  const output: HistoryEvent[] = [];
  for (const event of events) {
    const day = localDay(event.timestampUTC, filter.timeZone);
    if (filter.fromDate && day < filter.fromDate) continue;
    if (filter.throughDate && day > filter.throughDate) continue;
    const changes = event.changes.filter((change) =>
      (!filter.taskId || change.taskId === filter.taskId) &&
      (!filter.field || change.field === filter.field));
    if (changes.length) output.push({ ...event, changes });
  }
  return output;
}

export function historyDisplayTime(timestampUTC: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(timestampUTC));
}

export function historyValueLabel(field: EditableField, value: HistoryValue): string {
  if (value === null || value === "") return "—";
  if (field === "Progress") return String(value) + "%";
  return String(value);
}
