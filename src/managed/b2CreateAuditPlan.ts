import { KNOWN_STATUSES, TASK_TYPES } from "../data/types";

/**
 * Stage C B2 — pure audit-planning helper. Produces NO workbook bytes and
 * cannot write to ProjectAudit, Change History, storage, or the active UI.
 *
 * The caller must supply fields/values from a verified normalized WBS row,
 * not merely the unsaved editor draft. Future versioned workbook code must
 * verify complete source-column coverage and audit/WBS equality on readback.
 */
export const B2_CREATE_FIELDS = [
  "ID", "Title", "WBSCode", "TaskType", "ParentTaskID", "TaskStatus",
  "PlannedStart", "PlannedEnd", "Progress", "AssignedTo", "Workstream",
  "PredecessorIDs", "Priority", "Description", "Updates", "SortOrder",
  "Modified", "ItemURL",
] as const;
export type B2CreateField = (typeof B2_CREATE_FIELDS)[number];
export type B2SnapshotValue = string | number | readonly string[] | null;
export type B2AuditRow = {
  EventID: string;
  ChangeSetID: string;
  TimestampUTC: string;
  EntityType: "Task";
  EntityID: string;
  TaskID: string;
  Action: "Create";
  Field: B2CreateField;
  OldValue: "";
  NewValue: string;
  ActorLabel: string;
  ActorProvenance: "UnverifiedLocal";
  Source: "Web UI";
  AppVersion: string;
};
export type B2AuditPlanInput = {
  taskId: string;
  changeSetId: string;
  timestampUTC: string;
  actorLabel: string;
  appVersion: string;
  /** Exact recognized field set physically present in the validated source WBS sheet. */
  fields: readonly B2CreateField[];
  /** Every field present above must have an explicit value, including null for blank. */
  values: Partial<Record<B2CreateField, B2SnapshotValue>>;
  /** Unique UUID for each field-level audit row, generated before planning. */
  eventIds: readonly string[];
};
export type B2AuditPlan =
  | { ok: true; rows: B2AuditRow[] }
  | { ok: false; errors: string[] };

const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F]/u;
const FORMULA = /^[=+\-@]/u;
const requiredFields = new Set<B2CreateField>(["ID", "Title", "WBSCode", "TaskType"]);
const dateFields = new Set<B2CreateField>(["PlannedStart", "PlannedEnd"]);
const numberFields = new Set<B2CreateField>(["Progress", "SortOrder"]);
const fieldsSet = new Set<string>(B2_CREATE_FIELDS);
const maxExcelCharacters = 32767;

function canonicalUTC(input: string): boolean {
  return UTC.test(input) && !Number.isNaN(Date.parse(input)) &&
    new Date(input).toISOString() === input;
}
function canonicalDay(input: string): boolean {
  return DAY.test(input) && !Number.isNaN(Date.parse(input + "T00:00:00Z")) &&
    new Date(input + "T00:00:00Z").toISOString().slice(0, 10) === input;
}
function safeText(value: string, allowEmpty: boolean, maxLength: number): boolean {
  return value.length <= maxLength && !CONTROL.test(value) &&
    (allowEmpty || Boolean(value.trim())) && !FORMULA.test(value.trimStart());
}

/**
 * Type-checks and serializes a normalized source value. Empty optional
 * *cells* are "", whereas absent optional *columns* are omitted entirely.
 * The output is data intended for a future verified transaction, not a Save.
 */
function serialize(field: B2CreateField, value: B2SnapshotValue, taskId: string): string | null {
  if (value === null) {
    return requiredFields.has(field) ? null : field === "PredecessorIDs" ? "[]" : "";
  }
  if (field === "PredecessorIDs") {
    if (!Array.isArray(value)) return null;
    const seen = new Set<string>();
    for (const id of value) {
      if (typeof id !== "string" || !id.trim() || id.trim() !== id ||
        CONTROL.test(id) || seen.has(id) || id === taskId) return null;
      seen.add(id);
    }
    const encoded = JSON.stringify(value);
    return encoded.length <= maxExcelCharacters ? encoded : null;
  }
  if (Array.isArray(value)) return null;
  if (numberFields.has(field)) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (field === "Progress" && (value < 0 || value > 100)) return null;
    return String(value);
  }
  if (typeof value !== "string") return null;
  if (dateFields.has(field) && value && !canonicalDay(value)) return null;
  if (field === "ID" && value !== taskId) return null;
  if (field === "TaskType" && !TASK_TYPES.some(type => type === value)) return null;
  if (field === "TaskStatus" && value &&
      !KNOWN_STATUSES.some(status => status === value)) return null;
  if (field === "ParentTaskID" && value === taskId) return null;
  if (!safeText(value, !requiredFields.has(field), maxExcelCharacters)) return null;
  return value;
}

export function planB2TaskCreateAudit(input: B2AuditPlanInput): B2AuditPlan {
  const errors: string[] = [];
  if (!UUID.test(input.taskId)) errors.push("New TaskID must be a UUID.");
  if (!UUID.test(input.changeSetId)) errors.push("ChangeSetID must be a UUID.");
  if (!canonicalUTC(input.timestampUTC)) errors.push("Canonical UTC timestamp is required.");
  if (!safeText(input.actorLabel, false, 160)) errors.push("Invalid actor label.");
  if (!safeText(input.appVersion, false, 100)) errors.push("Invalid app version.");

  const fields = input.fields;
  const present = new Set<string>();
  for (const field of fields) {
    if (!fieldsSet.has(field)) errors.push("Unsupported source field: " + String(field));
    if (present.has(field)) errors.push("Duplicate source field: " + String(field));
    present.add(field);
  }
  for (const field of requiredFields) {
    if (!present.has(field)) errors.push("Missing required source field: " + field);
  }
  for (const field of Object.keys(input.values)) {
    if (!present.has(field)) errors.push("Value without source column: " + field);
  }
  if (fields.length !== input.eventIds.length) errors.push("Exactly one EventID is required per source field.");
  const eventIds = new Set<string>();
  for (const id of input.eventIds) {
    if (!UUID.test(id)) errors.push("Invalid EventID.");
    if (eventIds.has(id.toLowerCase())) errors.push("Duplicate EventID.");
    eventIds.add(id.toLowerCase());
  }

  // Collect values without creating mutable workbook or storage side effects.
  const encoded = new Map<B2CreateField, string>();
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(input.values, field) ||
        input.values[field] === undefined) {
      errors.push("Missing explicit source value: " + field);
      continue;
    }
    if (!fieldsSet.has(field)) continue;
    const value = serialize(field, input.values[field]!, input.taskId);
    if (value === null) errors.push("Invalid source value: " + field);
    else encoded.set(field, value);
  }
  if (errors.length) return { ok: false, errors };
  const rows: B2AuditRow[] = fields.map((field, index) => ({
    EventID: input.eventIds[index],
    ChangeSetID: input.changeSetId,
    TimestampUTC: input.timestampUTC,
    EntityType: "Task",
    EntityID: input.taskId,
    TaskID: input.taskId,
    Action: "Create",
    Field: field,
    OldValue: "",
    NewValue: encoded.get(field)!,
    ActorLabel: input.actorLabel,
    ActorProvenance: "UnverifiedLocal",
    Source: "Web UI",
    AppVersion: input.appVersion,
  }));
  return { ok: true, rows };
}
