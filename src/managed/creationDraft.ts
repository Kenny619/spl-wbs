import { TASK_TYPES, type Task, type TaskType } from "../data/types";

/**
 * Stage C #23 validation-only spike. No Excel write, history event, PM RAG change
 * or UI action is performed here. It is intentionally NOT connected to Save.
 * Creation audit/schema contract remains a separate Product Owner gate.
 */
export type NewEntityInput = {
  title: string;
  taskType: TaskType;
  parentId?: string | null;
  wbsCode?: string | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  predecessorIds?: readonly string[];
  owner?: string;
  workstream?: string;
};

export type CreationDraft = {
  id: string;
  title: string;
  taskType: TaskType;
  wbsCode: string;
  parentId: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  predecessorIds: string[];
  owner: string;
  workstream: string;
  sourceTaskStatus: "Not Started";
};

export type CreationValidation =
  | { ok: true; draft: CreationDraft }
  | { ok: false; errors: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL = /[\u0000-\u001f\u007f]/u;
const FORMULA = /^[=+\-@]/u;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function safeLabel(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && !CONTROL.test(value) && !FORMULA.test(trimmed);
}

function validDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Return an unused WBS code without modifying any existing WBS row. */
export function suggestWbsCode(existing: readonly Pick<Task, "wbsCode" | "parentId">[],
  parentCode: string | null): string {
  const prefix = parentCode ? parentCode + "." : "";
  const used = new Set(existing.map(task => task.wbsCode.trim()));
  let sequence = 1;
  while (used.has(prefix + sequence)) sequence++;
  return prefix + sequence;
}

/** Validate a draft against the entire verified workbook, never a filtered view. */
export function prepareNewEntity(input: NewEntityInput,
  existing: readonly Pick<Task, "id" | "wbsCode" | "parentId" | "taskType">[],
  generatedId: string): CreationValidation {
  const errors: string[] = [];
  const id = generatedId.trim();
  if (!UUID.test(id)) errors.push("New TaskID must be a UUID.");
  if (existing.some(task => task.id === id)) errors.push("TaskID already exists.");

  const title = input.title.trim();
  if (!safeLabel(input.title)) errors.push("Title is required and must be safe plain text.");
  if (!TASK_TYPES.includes(input.taskType)) errors.push("Unsupported task type.");

  const parentId = input.parentId?.trim() || null;
  const parent = parentId ? existing.find(task => task.id === parentId) : undefined;
  if (parentId && !parent) errors.push("Parent TaskID was not found.");
  if (parent && parent.taskType !== "Summary") errors.push("Parent must be a Summary.");
  if (parentId === id) errors.push("An item cannot parent itself.");

  const wbsCode = (input.wbsCode?.trim() || suggestWbsCode(existing, parent?.wbsCode ?? null));
  if (!safeLabel(wbsCode)) errors.push("WBS code is required and must be safe text.");
  if (existing.some(task => task.wbsCode === wbsCode)) errors.push("WBS code already exists.");

  let start = input.plannedStart?.trim() || null;
  let end = input.plannedEnd?.trim() || null;
  if (start && !validDay(start)) errors.push("Invalid planned start date.");
  if (end && !validDay(end)) errors.push("Invalid planned finish date.");
  if (input.taskType === "Summary") {
    if (start || end) errors.push("Summary dates are derived, not authored.");
  } else if (input.taskType === "Milestone") {
    if (!start && !end) errors.push("Milestone requires a date.");
    if (start && end && start !== end) errors.push("Milestone start and finish must match.");
    if (start && !end) end = start;
    if (end && !start) start = end;
  } else if (Boolean(start) !== Boolean(end)) {
    errors.push("Task start and finish must both be filled or both blank.");
  }
  if (start && end && end < start) errors.push("Finish cannot precede start.");

  const predecessorIds = (input.predecessorIds ?? []).map(s => s.trim());
  const seen = new Set<string>();
  for (const predecessor of predecessorIds) {
    if (!predecessor || !existing.some(task => task.id === predecessor)) {
      errors.push("Predecessor TaskID is invalid or missing.");
    }
    if (predecessor === id) errors.push("An item cannot depend on itself.");
    if (seen.has(predecessor)) errors.push("Duplicate predecessor TaskID.");
    seen.add(predecessor);
  }

  const owner = input.owner?.trim() ?? "";
  const workstream = input.workstream?.trim() ?? "";
  if (owner && !safeLabel(owner)) errors.push("Unsafe owner.");
  if (workstream && !safeLabel(workstream)) errors.push("Unsafe workstream.");

  if (errors.length) return { ok: false, errors };
  return { ok: true, draft: {
    id, title, taskType: input.taskType, wbsCode, parentId,
    plannedStart: start, plannedEnd: end, predecessorIds,
    owner, workstream, sourceTaskStatus: "Not Started",
  } };
}
