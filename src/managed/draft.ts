import type { Task } from "../data/types";
import type { EditableField, EditChanges, EditValue } from "./workbookCandidate";

export type TaskDraft = Record<EditableField, EditValue>;

export function initialTaskDraft(task: Task): TaskDraft {
  return {
    Title: task.taskName,
    AssignedTo: task.owner === "Unassigned" ? null : task.owner,
    TaskStatus: task.status,
    Progress: task.taskType === "Summary" ? null : task.progress,
    PlannedStart: task.taskType === "Summary" ? null : task.plannedStart,
    PlannedEnd: task.taskType === "Summary" ? null : task.plannedEnd,
    Priority: task.priority,
    Description: task.description,
    Updates: "",
    Workstream: task.workstream === "Unassigned" ? null : task.workstream,
    WBSCode: task.wbsCode,
    ParentTaskID: task.parentId,
    TaskType: task.taskType,
  };
}

export function collectTaskChanges(initial: TaskDraft, draft: TaskDraft): EditChanges {
  const changes: EditChanges = {};
  for (const field of Object.keys(initial) as EditableField[]) {
    const next = draft[field];
    if (field === "Updates") {
      if (typeof next === "string" && next.trim()) changes.Updates = next;
    } else if (next !== initial[field]) {
      changes[field] = next;
    }
  }
  return changes;
}

export function hasTaskChanges(initial: TaskDraft, draft: TaskDraft): boolean {
  return Object.keys(collectTaskChanges(initial, draft)).length > 0;
}
