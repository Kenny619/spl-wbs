import type ExcelJS from "exceljs";

/** READ-ONLY F2 proof against proposed 0.1.2; NOT wired into managed Save. */
export const PROJECT_DATA_SHEETS = [
  "ProjectMeta", "ProjectCalendar", "WatchReasons", "ProjectCommitments", "ProjectAudit",
] as const;
type SheetName = (typeof PROJECT_DATA_SHEETS)[number];
type Cell = ExcelJS.CellValue;
export type ProjectFinding = {
  code: string; sheet: string; row: number; field: string; message: string;
};
export type ProjectInspection =
  | { kind: "legacy"; projectName: null; findings: [] }
  | { kind: "valid"; projectName: string; schemaVersion: "0.1.2"; findings: [] }
  | { kind: "incompatible"; projectName: null; findings: ProjectFinding[] }
  | { kind: "unsupported_future"; projectName: null; schemaVersion: string; findings: ProjectFinding[] };
const HEADERS: Record<SheetName, readonly string[]> = {
  ProjectMeta: ["Key", "Value"],
  ProjectCalendar: ["BlackoutID", "Enabled", "StartDate", "EndDate", "Label", "ModifiedUTC"],
  WatchReasons: ["ReasonID", "TaskID", "Origin", "RuleCode", "State", "Title", "Details", "EvidenceRef",
    "OpenedUTC", "OpenedBy", "LastReviewedUTC", "ResolvedUTC", "ResolvedBy", "ResolutionNote"],
  ProjectCommitments: ["CommitmentID", "TaskID", "AcceptedFinishDate", "AcceptedUTC", "AcceptedBy",
    "PreviousCommitmentID", "Rationale", "EvidenceRef"],
  ProjectAudit: ["EventID", "ChangeSetID", "TimestampUTC", "EntityType", "EntityID", "TaskID",
    "Action", "Field", "OldValue", "NewValue", "ActorLabel", "ActorProvenance", "Source", "AppVersion"],
};
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F]/u;
const isText = (x: Cell): x is string => typeof x === "string" && !CONTROL.test(x);
const isUUID = (x: Cell) => typeof x === "string" && UUID.test(x);
const isUTC = (x: Cell) => typeof x === "string" && UTC.test(x) &&
  !Number.isNaN(Date.parse(x)) && new Date(x).toISOString() === x;
const isDay = (x: Cell) => typeof x === "string" && DAY.test(x) &&
  !Number.isNaN(Date.parse(x + "T00:00:00Z")) &&
  new Date(x + "T00:00:00Z").toISOString().slice(0, 10) === x;
const blank = (x: Cell) => x == null || x === "";
const taskKey = (x: Cell): string | null =>
  isText(x) ? x.trim() : typeof x === "number" && Number.isSafeInteger(x) ? String(x) : null;

type RowInfo = { sheet: ExcelJS.Worksheet; row: ExcelJS.Row; i: number; col: Record<string, number> };
const value = (r: RowInfo, name: string) => r.row.getCell(r.col[name]).value;

export function inspectProjectData(book: ExcelJS.Workbook): ProjectInspection {
  const findings: ProjectFinding[] = [];
  const note = (code: string, sheet: string, row: number, field: string, message: string) =>
    findings.push({ code, sheet, row, field, message });

  const matched = {} as Record<SheetName, ExcelJS.Worksheet | undefined>;
  let total = 0;
  for (const name of PROJECT_DATA_SHEETS) {
    const xs = book.worksheets.filter(x => x.name.toLowerCase() === name.toLowerCase());
    if (xs.length) total++;
    matched[name] = xs[0];
    if (xs.length > 1) note("DUPLICATE_SHEET", name, 0, "", "Multiple worksheet name variants.");
  }
  if (total === 0) return { kind: "legacy", projectName: null, findings: [] };
  for (const name of PROJECT_DATA_SHEETS) {
    if (!matched[name]) note("MISSING_SHEET", name, 0, "", "Partial project extension.");
  }
  if (findings.length) return { kind: "incompatible", projectName: null, findings };

  const sheets = matched as Record<SheetName, ExcelJS.Worksheet>;
  const columns = {} as Record<SheetName, Record<string, number>>;
  for (const name of PROJECT_DATA_SHEETS) {
    const seen = new Set<string>();
    const cols: Record<string, number> = {};
    sheets[name].getRow(1).eachCell({ includeEmpty: false }, (cell, index) => {
      const x = cell.value;
      if (!isText(x) || !x.trim()) {
        note("BAD_HEADER", name, 1, "", "Header must be nonblank text."); return;
      }
      const k = x.trim().toLowerCase();
      if (seen.has(k)) note("DUPLICATE_HEADER", name, 1, x, "Duplicate column.");
      seen.add(k);
      const expected = HEADERS[name].find(h => h.toLowerCase() === k);
      if (expected) cols[expected] = index;
    });
    for (const h of HEADERS[name]) {
      if (!cols[h]) note("MISSING_HEADER", name, 1, h, "Missing required column.");
    }
    columns[name] = cols;
  }
  if (findings.length) return { kind: "incompatible", projectName: null, findings };

  const rows = (name: SheetName): RowInfo[] => {
    const xs: RowInfo[] = [];
    const sheet = sheets[name];
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      if (row.hasValues) xs.push({ sheet, row, col: columns[name], i });
    }
    return xs;
  };
  const requiredText = (r: RowInfo, h: string): string | null => {
    const x = value(r, h);
    if (!isText(x) || !x.trim()) {
      note("BAD_TEXT", r.sheet.name, r.i, h, "Expected nonblank plain text."); return null;
    }
    return x;
  };
  const optionalText = (r: RowInfo, h: string) => {
    const x = value(r, h);
    if (!blank(x) && !isText(x)) note("BAD_TEXT", r.sheet.name, r.i, h, "Unsupported text cell.");
  };
  const requiredUUID = (r: RowInfo, h: string): string | null => {
    const x = value(r, h);
    if (!isUUID(x)) {
      note("BAD_UUID", r.sheet.name, r.i, h, "Expected UUID text."); return null;
    }
    return String(x).toLowerCase();
  };
  const date = (r: RowInfo, h: string) => {
    if (!isDay(value(r, h))) note("BAD_DATE", r.sheet.name, r.i, h, "Expected ISO YYYY-MM-DD date.");
  };
  const utc = (r: RowInfo, h: string) => {
    if (!isUTC(value(r, h))) note("BAD_UTC", r.sheet.name, r.i, h, "Expected canonical UTC timestamp.");
  };
  const unique = (set: Set<string>, id: string | null, r: RowInfo, field: string) => {
    if (id && set.has(id)) note("DUPLICATE_ID", r.sheet.name, r.i, field, "Duplicate identifier.");
    if (id) set.add(id);
  };

  const meta = new Map<string, string>();
  for (const r of rows("ProjectMeta")) {
    const key = requiredText(r, "Key"), data = requiredText(r, "Value");
    if (!key || data === null) continue;
    const lower = key.trim().toLowerCase();
    if (meta.has(lower)) note("DUPLICATE_META", r.sheet.name, r.i, "Key", "Repeated metadata key.");
    meta.set(lower, data);
  }
  const projectName = meta.get("projectname");
  if (!isUUID(meta.get("projectid") ?? null)) note("BAD_PROJECT_ID", "ProjectMeta", 0, "ProjectID", "Missing/invalid project UUID.");
  if (!projectName || Array.from(projectName).length > 180 || !projectName.trim()) {
    note("BAD_PROJECT_NAME", "ProjectMeta", 0, "ProjectName", "ProjectName is required, at most 180 characters.");
  }
  const version = meta.get("projectdataschemaversion") ?? "";
  if (version !== "0.1.2") {
    if (/^\d+\.\d+\.\d+$/.test(version)) {
      const [major, minor, patch] = version.split(".").map(Number);
      if ((major > 0 || minor > 1 || (minor === 1 && patch > 2)) && findings.length === 0) {
        return { kind: "unsupported_future", projectName: null, schemaVersion: version,
          findings: [{ code: "FUTURE_VERSION", sheet: "ProjectMeta", row: 0,
            field: "ProjectDataSchemaVersion", message: "Unsupported future extension version." }] };
      }
    }
    note("BAD_SCHEMA_VERSION", "ProjectMeta", 0, "ProjectDataSchemaVersion", "Unsupported or missing version.");
  }

  // Use the immutable ProjectWBS.ID column for all Watch/Commitment references.
  const taskIds = new Set<string>();
  const wbs = book.worksheets.find(s => s.name.toLowerCase() === "projectwbs");
  if (!wbs) note("MISSING_WBS", "ProjectWBS", 0, "ID", "ProjectWBS must exist.");
  else {
    let idCol = 0;
    wbs.getRow(1).eachCell({ includeEmpty: false }, (cell, i) => {
      if (isText(cell.value) && cell.value.trim().toLowerCase() === "id") {
        if (idCol) note("DUPLICATE_WBS_ID_HEADER", "ProjectWBS", 1, "ID", "Duplicate ID header.");
        idCol = i;
      }
    });
    if (!idCol) note("MISSING_WBS_ID", "ProjectWBS", 1, "ID", "Missing stable TaskID source.");
    else for (let i = 2; i <= wbs.rowCount; i++) {
      const row = wbs.getRow(i);
      if (!row.hasValues) continue;
      const id = taskKey(row.getCell(idCol).value);
      if (!id) note("BAD_TASK_ID", "ProjectWBS", i, "ID", "Invalid TaskID.");
      else if (taskIds.has(id)) note("DUPLICATE_TASK_ID", "ProjectWBS", i, "ID", "Duplicate TaskID.");
      else taskIds.add(id);
    }
  }
  const refTask = (r: RowInfo, required: boolean) => {
    const x = value(r, "TaskID");
    if (!required && blank(x)) return;
    const id = taskKey(x);
    if (!id || !taskIds.has(id)) note("UNKNOWN_TASK", r.sheet.name, r.i, "TaskID", "Task not in ProjectWBS.");
  };

  const blackoutIDs = new Set<string>();
  let active = 0;
  for (const r of rows("ProjectCalendar")) {
    unique(blackoutIDs, requiredUUID(r, "BlackoutID"), r, "BlackoutID");
    const enabled = value(r, "Enabled");
    if (typeof enabled !== "boolean") note("BAD_ENABLED", r.sheet.name, r.i, "Enabled", "Expected Boolean.");
    if (enabled === true) active++;
    date(r, "StartDate"); date(r, "EndDate"); utc(r, "ModifiedUTC");
    if (isDay(value(r, "StartDate")) && isDay(value(r, "EndDate")) &&
        String(value(r, "StartDate")) > String(value(r, "EndDate"))) {
      note("REVERSED_RANGE", r.sheet.name, r.i, "EndDate", "End precedes start.");
    }
    optionalText(r, "Label");
  }
  if (active > 1) note("MULTIPLE_ACTIVE_BLACKOUT", "ProjectCalendar", 0, "Enabled", "One active interval max.");

  const reasonIDs = new Set<string>();
  for (const r of rows("WatchReasons")) {
    unique(reasonIDs, requiredUUID(r, "ReasonID"), r, "ReasonID");
    refTask(r, true);
    const origin = requiredText(r, "Origin");
    const code = value(r, "RuleCode");
    if (!["Manual", "Automatic"].includes(origin ?? "")) note("BAD_ORIGIN", r.sheet.name, r.i, "Origin", "Invalid origin.");
    if (origin === "Manual" && !blank(code)) note("BAD_RULE", r.sheet.name, r.i, "RuleCode", "Manual reason has no auto code.");
    if (origin === "Automatic" && (!isText(code) || !code.trim())) note("MISSING_RULE", r.sheet.name, r.i, "RuleCode", "Auto rule required.");
    const state = requiredText(r, "State");
    if (!["Open", "Resolved"].includes(state ?? "")) note("BAD_STATE", r.sheet.name, r.i, "State", "Invalid reason state.");
    requiredText(r, "Title"); requiredText(r, "OpenedBy"); utc(r, "OpenedUTC");
    for (const x of ["Details", "EvidenceRef", "ResolutionNote"]) optionalText(r, x);
    const reviewed = value(r, "LastReviewedUTC");
    if (!blank(reviewed) && !isUTC(reviewed)) note("BAD_REVIEW_TIME", r.sheet.name, r.i, "LastReviewedUTC", "Invalid review time.");
    const resolved = value(r, "ResolvedUTC"), actor = value(r, "ResolvedBy");
    if (state === "Resolved") {
      if (!isUTC(resolved)) note("MISSING_RESOLUTION", r.sheet.name, r.i, "ResolvedUTC", "Missing UTC.");
      if (!isText(actor) || !actor.trim()) note("MISSING_RESOLVER", r.sheet.name, r.i, "ResolvedBy", "Missing actor.");
    } else if (!blank(resolved) || !blank(actor)) {
      note("OPEN_HAS_RESOLUTION", r.sheet.name, r.i, "State", "Open reason cannot be resolved.");
    }
  }

  const commitments = new Map<string, { taskId: string; previous: string | null }>();
  for (const r of rows("ProjectCommitments")) {
    const id = requiredUUID(r, "CommitmentID");
    if (id && commitments.has(id)) note("DUPLICATE_ID", r.sheet.name, r.i, "CommitmentID", "Duplicate commitment.");
    refTask(r, true); date(r, "AcceptedFinishDate"); utc(r, "AcceptedUTC");
    requiredText(r, "AcceptedBy"); optionalText(r, "Rationale"); optionalText(r, "EvidenceRef");
    const prior = value(r, "PreviousCommitmentID");
    if (!blank(prior) && !isUUID(prior)) note("BAD_PRIOR", r.sheet.name, r.i, "PreviousCommitmentID", "Invalid prior ID.");
    if (id) commitments.set(id, { taskId: taskKey(value(r, "TaskID")) ?? "",
      previous: isUUID(prior) ? String(prior).toLowerCase() : null });
  }
  for (const [id, c] of commitments) {
    if (c.previous && (!commitments.has(c.previous) || commitments.get(c.previous)?.taskId !== c.taskId)) {
      note("UNKNOWN_PRIOR", "ProjectCommitments", 0, "PreviousCommitmentID", "Prior commitment not found for " + id);
    }
    const seen = new Set<string>();
    let cursor: string | null = id;
    while (cursor) {
      if (seen.has(cursor)) { note("COMMITMENT_CYCLE", "ProjectCommitments", 0, "PreviousCommitmentID", "Commitment cycle."); break; }
      seen.add(cursor);
      cursor = commitments.get(cursor)?.previous ?? null;
    }
  }

  const events = new Set<string>();
  const times = new Map<string, string>();
  for (const r of rows("ProjectAudit")) {
    unique(events, requiredUUID(r, "EventID"), r, "EventID");
    const change = requiredUUID(r, "ChangeSetID");
    const stamp = value(r, "TimestampUTC"); utc(r, "TimestampUTC");
    if (change && isUTC(stamp)) {
      const before = times.get(change);
      if (before && before !== stamp) note("CHANGESET_TIME", r.sheet.name, r.i, "TimestampUTC", "Mismatched same-save timestamp.");
      else times.set(change, String(stamp));
    }
    const type = requiredText(r, "EntityType");
    if (!["ProjectMeta", "Blackout", "WatchReason", "Commitment"].includes(type ?? "")) note("BAD_ENTITY_TYPE", r.sheet.name, r.i, "EntityType", "Invalid audit entity.");
    const entityId = requiredText(r, "EntityID");
    if (entityId && type === "Blackout" && !blackoutIDs.has(entityId.toLowerCase())) note("UNKNOWN_AUDIT_ENTITY", r.sheet.name, r.i, "EntityID", "Missing blackout record.");
    if (entityId && type === "WatchReason" && !reasonIDs.has(entityId.toLowerCase())) note("UNKNOWN_AUDIT_ENTITY", r.sheet.name, r.i, "EntityID", "Missing reason.");
    if (entityId && type === "Commitment" && !commitments.has(entityId.toLowerCase())) note("UNKNOWN_AUDIT_ENTITY", r.sheet.name, r.i, "EntityID", "Missing commitment.");
    if (type === "ProjectMeta" || type === "Blackout") {
      if (!blank(value(r, "TaskID"))) note("FAKE_PROJECT_TASK", r.sheet.name, r.i, "TaskID", "Project event cannot invent task ID.");
    } else refTask(r, true);
    if (!["Create", "Update", "Resolve", "AcceptCommitment", "Disable"].includes(requiredText(r, "Action") ?? "")) {
      note("BAD_AUDIT_ACTION", r.sheet.name, r.i, "Action", "Unsupported action.");
    }
    requiredText(r, "Field"); optionalText(r, "OldValue"); optionalText(r, "NewValue");
    requiredText(r, "ActorLabel");
    if (value(r, "ActorProvenance") !== "UnverifiedLocal") note("BAD_PROVENANCE", r.sheet.name, r.i, "ActorProvenance", "Only UnverifiedLocal source currently defined.");
    if (value(r, "Source") !== "Web UI") note("BAD_SOURCE", r.sheet.name, r.i, "Source", "Source must be Web UI.");
    requiredText(r, "AppVersion");
  }
  if (findings.length) return { kind: "incompatible", projectName: null, findings };
  return { kind: "valid", schemaVersion: "0.1.2", projectName: projectName!, findings: [] };
}
