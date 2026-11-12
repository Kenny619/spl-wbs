import ExcelJS from "exceljs";
import { HISTORY_COLUMNS } from "./workbookCandidate";
import { readManagedHistoryWithPresence } from "./history";
import { inspectProjectData } from "./projectDataInspector";
import { ManagedWorkbookError, preflightManagedWorkbook } from "./preflight";

/**
 * Validated in-memory ProjectData candidate (F3b/F5c). Shared guarded direct
 * Save is owned by directSave.ts. F5c adds MANUAL Watch reason mutations only:
 * no UI or automatic triggers, identity verification, or production rollout.
 * The sheet/field contract v0.1.2 is STILL PROPOSED, NOT FROZEN.
 */
const PROJECT_VERSION = "0.1.2";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL = /[\u0000-\u001f\u007f]/u;
const AUDIT_HEADERS = [
  "EventID", "ChangeSetID", "TimestampUTC", "EntityType", "EntityID",
  "TaskID", "Action", "Field", "OldValue", "NewValue",
  "ActorLabel", "ActorProvenance", "Source", "AppVersion",
] as const;
const CAL_HEADERS = [
  "BlackoutID", "Enabled", "StartDate", "EndDate", "Label", "ModifiedUTC",
] as const;
const WATCH_HEADERS = [
  "ReasonID", "TaskID", "Origin", "RuleCode", "State", "Title",
  "Details", "EvidenceRef", "OpenedUTC", "OpenedBy", "LastReviewedUTC",
  "ResolvedUTC", "ResolvedBy", "ResolutionNote",
] as const;
const COMMIT_HEADERS = [
  "CommitmentID", "TaskID", "AcceptedFinishDate", "AcceptedUTC",
  "AcceptedBy", "PreviousCommitmentID", "Rationale", "EvidenceRef",
] as const;
type Blackout = {
  blackoutId: string;
  startDate: string;
  endDate: string;
  label: string;
};
export type ProjectEdit =
  | { kind: "initialize"; projectId: string; projectName: string; blackout?: Blackout }
  | { kind: "rename"; projectName: string }
  | { kind: "set-blackout"; blackout: Blackout }
  | { kind: "disable-blackout"; blackoutId: string }
  | { kind: "add-watch-reason"; reasonId: string; taskId: string; title: string;
      details?: string; evidenceRef?: string }
  | { kind: "resolve-watch-reason"; reasonId: string; resolutionNote?: string };
export type ProjectCandidateInput = {
  source: Uint8Array | ArrayBuffer;
  edit: ProjectEdit;
  changeSetId: string;
  timestampUTC: string;
  actorLabel: string;
  appVersion: string;
};
export type ProjectCandidateResult =
  | { kind: "noop"; auditCount: 0 }
  | { kind: "candidate"; bytes: Uint8Array; auditCount: number; changeSetId: string; timestampUTC: string };

type AuditEntry = {
  entityType: "ProjectMeta" | "Blackout" | "WatchReason";
  entityId: string;
  taskId?: string;
  action: "Create" | "Update" | "Disable" | "Resolve";
  field: string;
  oldValue: string;
  newValue: string;
};
function error(code: string, message: string): never {
  throw new ManagedWorkbookError(code, message);
}
const text = (value: ExcelJS.CellValue): string | null =>
  typeof value === "string" ? value : null;
const dayOK = (x: string): boolean =>
  DAY.test(x) && !Number.isNaN(Date.parse(x + "T00:00:00Z")) &&
  new Date(x + "T00:00:00Z").toISOString().slice(0, 10) === x;
function safeText(value: string, name: string, limit: number, allowEmpty = false): void {
  if (typeof value !== "string" || CONTROL.test(value) ||
      value.length > limit || (!allowEmpty && !value.trim()) ||
      // Prevent spreadsheet injection in project-controlled human-readable fields.
      /^[=+\-@]/.test(value.trimStart())) {
    error("INVALID_PROJECT_VALUE", "Unsafe or invalid " + name + ".");
  }
}
function dateRange(value: Blackout): void {
  if (!UUID.test(value.blackoutId)) error("INVALID_PROJECT_VALUE", "BlackoutID must be a UUID.");
  if (!dayOK(value.startDate) || !dayOK(value.endDate) || value.endDate < value.startDate) {
    error("INVALID_PROJECT_VALUE", "Blackout dates must be a real ordered inclusive range.");
  }
  safeText(value.label, "blackout label", 500, true);
}
function headerColumns(sheet: ExcelJS.Worksheet, required: readonly string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const seen = new Set<string>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, index) => {
    if (typeof cell.value !== "string") error("INVALID_PROJECT_DATA", "Non-text header on " + sheet.name);
    const key = cell.value.trim().toLowerCase();
    if (seen.has(key)) error("INVALID_PROJECT_DATA", "Duplicate header on " + sheet.name);
    seen.add(key);
    const canonical = required.find(x => x.toLowerCase() === key);
    if (canonical) map[canonical] = index;
  });
  for (const key of required) if (!map[key]) {
    error("INVALID_PROJECT_DATA", "Missing " + key + " column on " + sheet.name);
  }
  return map;
}
function metaValue(sheet: ExcelJS.Worksheet, key: string): { row: ExcelJS.Row; value: string } {
  const headers = headerColumns(sheet, ["Key", "Value"]);
  for (let n = 2; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    if (text(row.getCell(headers.Key).value)?.trim().toLowerCase() === key.toLowerCase()) {
      const value = text(row.getCell(headers.Value).value);
      if (value === null) error("INVALID_PROJECT_DATA", "Invalid " + key + " metadata type.");
      return { row, value };
    }
  }
  return error("INVALID_PROJECT_DATA", "Missing " + key + " metadata key.");
}
function addHeader(book: ExcelJS.Workbook, name: string, header: readonly string[]): ExcelJS.Worksheet {
  const sheet = book.addWorksheet(name);
  sheet.addRow([...header]);
  return sheet;
}
function calendarActive(sheet: ExcelJS.Worksheet, c: Record<string, number>): ExcelJS.Row | null {
  let active: ExcelJS.Row | null = null;
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    if (!row.hasValues || row.getCell(c.Enabled).value !== true) continue;
    if (active) error("INVALID_PROJECT_DATA", "Multiple enabled project blackouts.");
    active = row;
  }
  return active;
}
function findBlackout(sheet: ExcelJS.Worksheet, c: Record<string, number>, id: string): ExcelJS.Row | null {
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    if (text(row.getCell(c.BlackoutID).value)?.toLowerCase() === id.toLowerCase()) return row;
  }
  return null;
}
function snapshot(sheet: ExcelJS.Worksheet): string {
  return JSON.stringify(sheet.getSheetValues());
}
/** Stable WBS identity, never WBSCode, task title or worksheet row number. */
function watchTaskId(value: ExcelJS.CellValue): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}
function watchRow(sheet: ExcelJS.Worksheet, c: Record<string, number>, id: string): ExcelJS.Row | null {
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    if (row.hasValues && text(row.getCell(c.ReasonID).value)?.toLowerCase() === id.toLowerCase()) {
      return row;
    }
  }
  return null;
}

export async function buildProjectDataCandidate(input: ProjectCandidateInput): Promise<ProjectCandidateResult> {
  if (!UUID.test(input.changeSetId) || !UTC.test(input.timestampUTC) ||
      Number.isNaN(Date.parse(input.timestampUTC)) ||
      new Date(input.timestampUTC).toISOString() !== input.timestampUTC) {
    error("INVALID_TRANSACTION", "A canonical transaction UUID and UTC timestamp are required.");
  }
  safeText(input.actorLabel, "actor label", 160);
  safeText(input.appVersion, "app version", 100);

  await preflightManagedWorkbook(input.source);
  // Existing task audit must remain valid, and its existing rows must never
  // be rewritten or fabricated when only project settings are changed.
  const taskHistory = await readManagedHistoryWithPresence(input.source);
  if (taskHistory.events.some(event => event.changeSetId.toLowerCase() === input.changeSetId.toLowerCase())) {
    error("DUPLICATE_CHANGESET", "The transaction ID was already committed in task Change History.");
  }
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(input.source as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  } catch {
    error("UNREADABLE_XLSX", "Cannot decode the project workbook.");
  }
  const initial = inspectProjectData(book);
  if (initial.kind === "incompatible" || initial.kind === "unsupported_future") {
    error("INVALID_PROJECT_DATA", "Refusing an invalid or unsupported project-data extension.");
  }
  if (initial.kind === "valid") {
    // Prevent two separately committed project Saves sharing one ChangeSetID,
    // even when a caller reuses the same valid UTC timestamp. ChangeSetID is
    // the logical Save identity, not merely a grouping label.
    const audit = book.getWorksheet("ProjectAudit")!;
    const columns = headerColumns(audit, AUDIT_HEADERS);
    for (let index = 2; index <= audit.rowCount; index++) {
      const row = audit.getRow(index);
      if (!row.hasValues) continue;
      if (text(row.getCell(columns.ChangeSetID).value)?.toLowerCase() === input.changeSetId.toLowerCase()) {
        error("DUPLICATE_CHANGESET", "The transaction ID was already committed in ProjectAudit.");
      }
    }
  }
  if (input.edit.kind === "initialize" && initial.kind !== "legacy") {
    error("PROJECT_ALREADY_INITIALIZED", "Project metadata already exists.");
  }
  if (input.edit.kind !== "initialize" && initial.kind === "legacy") {
    error("PROJECT_NOT_INITIALIZED", "An explicit project initialization is required.");
  }
  const wbsBefore = book.worksheets.find(x => x.name.toLowerCase() === "projectwbs");
  if (!wbsBefore) error("MISSING_SHEET", "ProjectWBS is required.");
  const wbsSnapshot = snapshot(wbsBefore);
  const existingHistory = book.worksheets.find(x => x.name.toLowerCase() === "updatehistory");
  const historySnapshot = existingHistory ? snapshot(existingHistory) : null;
  const nonTarget = book.worksheets.filter(x => ![
    "projectmeta", "projectcalendar", "watchreasons", "projectcommitments", "projectaudit", "updatehistory",
  ].includes(x.name.toLowerCase())).map(x => ({ name: x.name, cells: snapshot(x) }));

  const audit: AuditEntry[] = [];
  let meta: ExcelJS.Worksheet;
  let calendar: ExcelJS.Worksheet;
  let projectAudit: ExcelJS.Worksheet;
  if (input.edit.kind === "initialize") {
    const init = input.edit;
    if (!UUID.test(init.projectId)) error("INVALID_PROJECT_VALUE", "ProjectID must be UUID.");
    safeText(init.projectName, "ProjectName", 180);
    if (init.blackout) dateRange(init.blackout);
    meta = addHeader(book, "ProjectMeta", ["Key", "Value"]);
    for (const [key, val] of [
      ["ProjectID", init.projectId], ["ProjectName", init.projectName],
      ["ProjectDataSchemaVersion", PROJECT_VERSION],
    ]) {
      meta.addRow([key, val]);
      audit.push({ entityType: "ProjectMeta", entityId: key, field: key,
        action: "Create", oldValue: "", newValue: val });
    }
    calendar = addHeader(book, "ProjectCalendar", CAL_HEADERS);
    addHeader(book, "WatchReasons", WATCH_HEADERS);
    addHeader(book, "ProjectCommitments", COMMIT_HEADERS);
    projectAudit = addHeader(book, "ProjectAudit", AUDIT_HEADERS);
  } else {
    meta = book.getWorksheet("ProjectMeta")!;
    calendar = book.getWorksheet("ProjectCalendar")!;
    projectAudit = book.getWorksheet("ProjectAudit")!;
  }

  const edit = input.edit;
  if (edit.kind === "rename") {
    safeText(edit.projectName, "ProjectName", 180);
    const current = metaValue(meta, "ProjectName");
    if (current.value !== edit.projectName) {
      current.row.getCell(headerColumns(meta, ["Key", "Value"]).Value).value = edit.projectName;
      audit.push({ entityType: "ProjectMeta", entityId: "ProjectName", field: "ProjectName",
        action: "Update", oldValue: current.value, newValue: edit.projectName });
    }
  }
  if (edit.kind === "set-blackout" || (edit.kind === "initialize" && edit.blackout)) {
    const interval = edit.blackout!;
    dateRange(interval);
    const c = headerColumns(calendar, CAL_HEADERS);
    const active = calendarActive(calendar, c);
    const prior = findBlackout(calendar, c, interval.blackoutId);
    if (active && active !== prior) {
      error("BLACKOUT_CONFLICT", "Another blackout is enabled; edit or disable that interval first.");
    }
    const row = prior ?? calendar.addRow([]);
    const changes: { key: keyof Blackout | "Enabled"; column: string; value: string | boolean }[] = [
      { key: "blackoutId", column: "BlackoutID", value: interval.blackoutId },
      { key: "Enabled", column: "Enabled", value: true },
      { key: "startDate", column: "StartDate", value: interval.startDate },
      { key: "endDate", column: "EndDate", value: interval.endDate },
      { key: "label", column: "Label", value: interval.label },
    ];
    for (const item of changes) {
      const cell = row.getCell(c[item.column]);
      const old = cell.value;
      if ((old == null ? "" : String(old)) === String(item.value)) continue;
      cell.value = item.value;
      audit.push({
        entityType: "Blackout", entityId: interval.blackoutId,
        field: item.column, action: prior ? "Update" : "Create",
        oldValue: old == null ? "" : String(old), newValue: String(item.value),
      });
    }
    if (audit.some(x => x.entityType === "Blackout")) {
      const oldModifiedUTC = prior ? String(row.getCell(c.ModifiedUTC).value ?? "") : "";
      row.getCell(c.ModifiedUTC).value = input.timestampUTC;
      audit.push({ entityType: "Blackout", entityId: interval.blackoutId,
        field: "ModifiedUTC", action: prior ? "Update" : "Create",
        oldValue: oldModifiedUTC, newValue: input.timestampUTC });
    }
  }
  if (edit.kind === "disable-blackout") {
    if (!UUID.test(edit.blackoutId)) error("INVALID_PROJECT_VALUE", "BlackoutID is invalid.");
    const c = headerColumns(calendar, CAL_HEADERS);
    const row = findBlackout(calendar, c, edit.blackoutId);
    if (!row) error("UNKNOWN_BLACKOUT", "Cannot disable an unknown interval.");
    if (row.getCell(c.Enabled).value === true) {
      row.getCell(c.Enabled).value = false;
      audit.push({ entityType: "Blackout", entityId: edit.blackoutId, field: "Enabled",
        action: "Disable", oldValue: "true", newValue: "false" });
      const previous = String(row.getCell(c.ModifiedUTC).value ?? "");
      row.getCell(c.ModifiedUTC).value = input.timestampUTC;
      audit.push({ entityType: "Blackout", entityId: edit.blackoutId, field: "ModifiedUTC",
        action: "Disable", oldValue: previous, newValue: input.timestampUTC });
    }
  }
  // F5c bounded manual reason candidate: no automatic risk triggers, no
  // auto-clear, no accepted-commitment mutation, and no fabricated Green.
  if (edit.kind === "add-watch-reason" || edit.kind === "resolve-watch-reason") {
    const watch = book.getWorksheet("WatchReasons")!;
    const c = headerColumns(watch, WATCH_HEADERS);
    if (!UUID.test(edit.reasonId)) error("INVALID_PROJECT_VALUE", "ReasonID must be a UUID.");
    if (edit.kind === "add-watch-reason") {
      if (watchRow(watch, c, edit.reasonId)) {
        error("DUPLICATE_WATCH_REASON", "This reason identity already exists.");
      }
      // This check is intentionally independent of the task's TaskStatus or
      // finish dates: a manual stakeholder risk can exist on a Completed task.
      const wbs = book.worksheets.find(x => x.name.toLowerCase() === "projectwbs")!;
      const w = headerColumns(wbs, ["ID"]);
      const requested = edit.taskId.trim();
      if (!requested) error("UNKNOWN_TASK", "Watch reason needs an existing stable TaskID.");
      let found = false;
      for (let i = 2; i <= wbs.rowCount; i++) {
        const row = wbs.getRow(i);
        if (row.hasValues && watchTaskId(row.getCell(w.ID).value) === requested) {
          found = true;
          break;
        }
      }
      if (!found) error("UNKNOWN_TASK", "Watch reason TaskID does not exist in ProjectWBS.");
      safeText(edit.title, "Watch reason title", 180);
      safeText(edit.details ?? "", "Watch reason details", 2000, true);
      safeText(edit.evidenceRef ?? "", "Watch reason evidence", 500, true);
      const record: Record<(typeof WATCH_HEADERS)[number], string | null> = {
        ReasonID: edit.reasonId, TaskID: requested, Origin: "Manual",
        RuleCode: null, State: "Open", Title: edit.title,
        Details: edit.details ?? null, EvidenceRef: edit.evidenceRef ?? null,
        OpenedUTC: input.timestampUTC, OpenedBy: input.actorLabel,
        LastReviewedUTC: null, ResolvedUTC: null, ResolvedBy: null, ResolutionNote: null,
      };
      const row = watch.addRow([]);
      for (const name of WATCH_HEADERS) {
        const value = record[name];
        row.getCell(c[name]).value = value;
        if (value !== null) audit.push({
          entityType: "WatchReason", entityId: edit.reasonId,
          taskId: requested, field: name, action: "Create",
          oldValue: "", newValue: value,
        });
      }
    } else {
      const row = watchRow(watch, c, edit.reasonId);
      if (!row) error("UNKNOWN_WATCH_REASON", "Cannot resolve an unknown reason.");
      if (text(row.getCell(c.Origin).value) !== "Manual") {
        error("AUTO_RULE_UNAPPROVED", "Automatic reasons require an approved rule evaluator.");
      }
      if (text(row.getCell(c.State).value) !== "Open") {
        error("WATCH_ALREADY_RESOLVED", "The recorded reason is not Open.");
      }
      const taskId = watchTaskId(row.getCell(c.TaskID).value);
      if (!taskId) error("INVALID_PROJECT_DATA", "Watch reason has no stable TaskID.");
      const opened = text(row.getCell(c.OpenedUTC).value);
      if (!opened || input.timestampUTC < opened) {
        error("INVALID_TRANSACTION", "A reason cannot resolve before its opening time.");
      }
      const note = edit.resolutionNote ?? "";
      safeText(note, "Watch resolution note", 2000, true);
      const changes: { field: (typeof WATCH_HEADERS)[number]; value: string }[] = [
        { field: "State", value: "Resolved" },
        { field: "LastReviewedUTC", value: input.timestampUTC },
        { field: "ResolvedUTC", value: input.timestampUTC },
        { field: "ResolvedBy", value: input.actorLabel },
      ];
      if (note) changes.push({ field: "ResolutionNote", value: note });
      for (const item of changes) {
        const cell = row.getCell(c[item.field]);
        const oldValue = cell.value == null ? "" : String(cell.value);
        if (oldValue === item.value) continue;
        cell.value = item.value;
        audit.push({ entityType: "WatchReason", entityId: edit.reasonId,
          taskId, field: item.field, action: "Resolve",
          oldValue, newValue: item.value });
      }
    }
  }
  if (!audit.length) return { kind: "noop", auditCount: 0 };

  if (!existingHistory) addHeader(book, "UpdateHistory", HISTORY_COLUMNS);
  const c = headerColumns(projectAudit, AUDIT_HEADERS);
  for (const change of audit) {
    const row = projectAudit.addRow([]);
    const record: Record<(typeof AUDIT_HEADERS)[number], string | null> = {
      EventID: crypto.randomUUID(), ChangeSetID: input.changeSetId,
      TimestampUTC: input.timestampUTC, EntityType: change.entityType,
      EntityID: change.entityId, TaskID: change.taskId ?? null, Action: change.action,
      Field: change.field, OldValue: change.oldValue, NewValue: change.newValue,
      ActorLabel: input.actorLabel, ActorProvenance: "UnverifiedLocal",
      Source: "Web UI", AppVersion: input.appVersion,
    };
    for (const name of AUDIT_HEADERS) row.getCell(c[name]).value = record[name];
  }
  // The candidate must be safe before the existing guarded direct Save is
  // ever considered. Do not pass a partial or future extension downstream.
  const inspected = inspectProjectData(book);
  if (inspected.kind !== "valid") {
    error("INVALID_PROJECT_CANDIDATE", "Candidate domain validation failed: " +
      (inspected.findings[0]?.message ?? inspected.kind));
  }
  const bytes = new Uint8Array(await book.xlsx.writeBuffer());
  await preflightManagedWorkbook(bytes);
  const after = new ExcelJS.Workbook();
  await after.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  const roundtrip = inspectProjectData(after);
  if (roundtrip.kind !== "valid") error("READBACK_FAILED", "Serialized ProjectData is invalid.");
  if (roundtrip.projectName !== inspected.projectName) {
    error("READBACK_FAILED", "ProjectName changed during candidate readback.");
  }
  const newWBS = after.worksheets.find(x => x.name.toLowerCase() === "projectwbs");
  if (!newWBS || snapshot(newWBS) !== wbsSnapshot) {
    error("READBACK_FAILED", "ProjectWBS changed during project-only Save candidate.");
  }
  for (const original of nonTarget) {
    const sheet = after.worksheets.find(x => x.name === original.name);
    if (!sheet || snapshot(sheet) !== original.cells) {
      error("READBACK_FAILED", "Unrelated worksheet was modified: " + original.name);
    }
  }
  const history = after.worksheets.find(x => x.name.toLowerCase() === "updatehistory");
  if (!history || (historySnapshot !== null && snapshot(history) !== historySnapshot) ||
      (historySnapshot === null && history.rowCount !== 1)) {
    error("READBACK_FAILED", "Frozen UpdateHistory changed during project-only candidate.");
  }
  // Validate that only the authorized Watch sheet changed for F5c and its
  // independent audit was appended; do not rewrite metadata or commitments.
  if (edit.kind === "add-watch-reason" || edit.kind === "resolve-watch-reason") {
    for (const name of ["ProjectMeta", "ProjectCalendar", "ProjectCommitments"]) {
      const previous = book.getWorksheet(name)!;
      const roundTrip = after.getWorksheet(name)!;
      if (snapshot(previous) !== snapshot(roundTrip)) {
        error("READBACK_FAILED", "Unrelated project sheet changed: " + name);
      }
    }
  }
  const oldAudit = projectAudit.rowCount - audit.length;
  if (after.getWorksheet("ProjectAudit")!.rowCount !== oldAudit + audit.length) {
    error("READBACK_FAILED", "ProjectAudit rows changed during candidate readback.");
  }
  return { kind: "candidate", bytes, auditCount: audit.length,
    changeSetId: input.changeSetId, timestampUTC: input.timestampUTC };
}
