/** Stage C C-IMPORT-1.0: pure header mapping and row-accounting preview.
 * No filesystem, Excel writer, UI, history or storage integration.
 * Column indices are zero-based; source row numbers are supplied by the reader.
 */
export const IMPORT_FIELDS = [
  "Title", "ID", "WBSCode", "TaskType", "ParentTaskID", "ParentWBS",
  "PlannedStart", "PlannedEnd", "Progress", "TaskStatus", "AssignedTo",
  "Workstream", "PredecessorIDs", "PredecessorWBS", "Priority",
  "Description", "Updates", "SortOrder", "Modified", "ItemURL",
] as const;
export type ImportField = typeof IMPORT_FIELDS[number];
export type HeaderOverride = { column: number; field: ImportField | null };
export type MappingIssue = {
  code: "missing-title" | "ambiguous-field" | "invalid-override" |
    "duplicate-override" | "unmapped-data" | "empty-title" | "extra-cell" |
    "invalid-source-row";
  field?: ImportField;
  columns?: number[];
  row?: number;
};
const aliases: Record<ImportField, readonly string[]> = {
  Title: ["title", "task name", "task", "activity"],
  ID: ["id", "task id"],
  WBSCode: ["wbscode", "wbs code", "wbs"],
  TaskType: ["tasktype", "task type", "type"],
  ParentTaskID: ["parenttaskid", "parent task id", "parent id"],
  ParentWBS: ["parentwbs", "parent wbs", "parent wbs code"],
  PlannedStart: ["plannedstart", "planned start", "start", "start date"],
  PlannedEnd: ["plannedend", "planned end", "finish", "end", "finish date", "end date"],
  Progress: ["progress", "done", "% complete", "percent complete"],
  TaskStatus: ["taskstatus", "task status", "status"],
  AssignedTo: ["assignedto", "assigned to", "owner"],
  Workstream: ["workstream", "work stream"],
  PredecessorIDs: ["predecessorids", "predecessor ids", "predecessors"],
  PredecessorWBS: ["predecessorwbs", "predecessor wbs", "predecessor wbs codes"],
  Priority: ["priority"], Description: ["description"], Updates: ["updates"],
  SortOrder: ["sortorder", "sort order"], Modified: ["modified"],
  ItemURL: ["itemurl", "item url", "link to item", "url"],
};
const key = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const lookup = new Map<string, ImportField>();
for (const field of IMPORT_FIELDS) {
  for (const alias of aliases[field]) lookup.set(alias, field);
}
export type HeaderPlan = {
  columns: Partial<Record<ImportField, number>>;
  unmapped: number[];
  excluded: number[];
  issues: MappingIssue[];
};
export function planImportHeaders(
  headers: readonly string[], overrides: readonly HeaderOverride[] = [],
): HeaderPlan {
  const issues: MappingIssue[] = [];
  const explicit = new Map<number, ImportField | null>();
  const candidates = new Map<ImportField, number[]>();
  const unmapped: number[] = [];
  const excluded: number[] = [];
  for (const override of overrides) {
    const { column, field } = override;
    if (!Number.isSafeInteger(column) || column < 0 || column >= headers.length ||
        (field !== null && !IMPORT_FIELDS.includes(field))) {
      issues.push({ code: "invalid-override", columns: [column] }); continue;
    }
    if (explicit.has(column)) {
      issues.push({ code: "duplicate-override", columns: [column] }); continue;
    }
    explicit.set(column, field);
  }
  headers.forEach((header, column) => {
    const field = explicit.has(column) ? explicit.get(column) : lookup.get(key(header));
    if (field === null) { excluded.push(column); return; }
    if (field === undefined) { unmapped.push(column); return; }
    const group = candidates.get(field) ?? [];
    group.push(column);
    candidates.set(field, group);
  });
  const columns: HeaderPlan["columns"] = {};
  for (const field of IMPORT_FIELDS) {
    const group = candidates.get(field) ?? [];
    if (group.length === 1) columns[field] = group[0];
    else if (group.length > 1) issues.push({ code: "ambiguous-field", field, columns: group });
  }
  if (!candidates.has("Title")) issues.push({ code: "missing-title", field: "Title" });
  return { columns, unmapped, excluded, issues };
}

/** Input cells remain opaque here; normalization belongs to the next slice.
 * A reader must adapt its typed empty cells to null, and must not discard
 * error/formula/unsupported cells before this accounting pass.
 */
export type SourceRecord = { excelRow: number; cells: readonly unknown[] };
export type PreviewRow = { excelRow: number; values: Partial<Record<ImportField, unknown>> };
const blank = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === "string" && value.trim() === "");
export function previewMappedRows(headers: readonly string[], records: readonly SourceRecord[],
  overrides: readonly HeaderOverride[] = []) {
  const plan = planImportHeaders(headers, overrides);
  const issues = [...plan.issues];
  const rows: PreviewRow[] = [];
  const skippedBlankRows: number[] = [];
  const seen = new Set<number>();
  for (const record of records) {
    const { excelRow, cells } = record;
    if (!Number.isSafeInteger(excelRow) || excelRow < 2 || seen.has(excelRow)) {
      issues.push({ code: "invalid-source-row", row: excelRow });
    }
    seen.add(excelRow);
    if (Array.from(cells).every(blank)) { skippedBlankRows.push(excelRow); continue; }
    const values: PreviewRow["values"] = {};
    for (const field of IMPORT_FIELDS) {
      const col = plan.columns[field];
      if (col !== undefined) values[field] = cells[col];
    }
    if (plan.columns.Title !== undefined && blank(values.Title)) {
      issues.push({ code: "empty-title", field: "Title", row: excelRow });
    }
    for (const column of plan.unmapped) {
      if (!blank(cells[column])) issues.push({ code: "unmapped-data", row: excelRow, columns: [column] });
    }
    for (let col = headers.length; col < cells.length; col++) {
      if (!blank(cells[col])) issues.push({ code: "extra-cell", row: excelRow, columns: [col] });
    }
    rows.push({ excelRow, values });
  }
  return { plan, rows, skippedBlankRows, issues, mappingReady: issues.length === 0 };
}
