import { FATAL_IMPORT_ERRORS, IMPORT_WARNINGS } from "../config/decisions";

export const TASK_TYPES = ["Summary", "Task", "Milestone"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const KNOWN_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "At Risk",
  "Blocked",
  "Cancelled",
] as const;

export type TaskStatus = (typeof KNOWN_STATUSES)[number] | "Unknown";

export type Task = {
  id: string;
  taskName: string;
  wbsCode: string;
  parentId: string | null;
  taskType: TaskType;
  plannedStart: string | null;
  plannedEnd: string | null;
  progress: number | null;
  status: TaskStatus;
  owner: string;
  workstream: string;
  sortOrder: number | null;
  priority: string | null;
  predecessorIds: string[];
  description: string;
  modified: string | null;
  itemUrl: string | null;
  scheduled: boolean;
  sourceRow: number;
};

export type IssueCode = (typeof FATAL_IMPORT_ERRORS)[number] | (typeof IMPORT_WARNINGS)[number];

export type ImportIssue = {
  severity: "fatal" | "warning";
  code: IssueCode;
  message: string;
  row?: number;
  taskId?: string;
};

export type PaletteMap = Record<string, number>;

export type ImportSuccess = {
  ok: true;
  sheetName: string;
  tasks: Task[];
  issues: ImportIssue[];
  latestModified: string | null;
  palette: PaletteMap;
  expandedIds: string[];
};

export type ImportFailure = {
  ok: false;
  issues: ImportIssue[];
};

export type ImportResult = ImportSuccess | ImportFailure;
