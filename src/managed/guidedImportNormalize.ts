import { excelSerialToIso, parseIsoDateOnly } from "../calendar/dateOnly";
import { sanitizeItemUrl } from "../data/normalize";
import { SHAREPOINT_HOSTS } from "../config/decisions";
import { KNOWN_STATUSES, TASK_TYPES, type TaskType } from "../data/types";
import { type PreviewRow, type ImportField } from "./guidedImportMapping";

/** Non-writing normalization prototype. Do not connect to Save until
 * source reader, full field validation and B2 workbook contract are verified.
 * Inputs are scalar values or typed CellValue objects from a future adapter. */
type Scalar = string | number | null;
type Issue = {row: number; field: ImportField; code: string};
type Review = {
  row: number;
  field: "ID" | "WBSCode" | "TaskType" | "TaskStatus" | "ParentTaskID";
  reason: "generated" | "defaulted" | "inferred";
  value: string;
};
type Options = {date1904: boolean; progressScale?: "percent-points" | "fraction";
  generatedIds: Readonly<Record<number, string>>};
type Draft = {sourceRow: number; id: string; title: string; wbsCode: string;
  taskType: TaskType; parentId: string | null; predecessorIds: string[];
  plannedStart: string | null; plannedEnd: string | null; progress: number | null;
  status: string; owner: string; workstream: string;
  priority: string | null; description: string | null; updates: string | null;
  sortOrder: number | null; modified: string | null; itemUrl: string | null; original: PreviewRow["values"]};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeText = (s: string) => s.length <= 32767 && !/[\u0000-\u0008\u000B-\u001F\u007F]/.test(s)
  && !/^[=+\-@]/.test(s.trimStart());
function scalar(x: unknown): Scalar | undefined {
  if (x == null) return null;
  if (typeof x === "string") return x.trim() || null;
  if (typeof x === "number") return Number.isFinite(x) ? x : undefined;
  if (typeof x !== "object") return undefined;
  const c = x as Record<string, unknown>;
  if (c.kind === "empty") return null;
  if (c.kind === "text" && typeof c.value === "string") return c.value.trim() || null;
  if (c.kind === "number" && typeof c.value === "number" && Number.isFinite(c.value)) return c.value;
  if ((c.kind === "date" || c.kind === "timestamp") && typeof c.iso === "string") return c.iso;
  return undefined;
}
function identity(value: Scalar | undefined): string | null {
  if (typeof value === "number" && !Number.isSafeInteger(value)) return null;
  const s = value == null ? "" : String(value);
  return s && safeText(s) ? s : null;
}
function day(value: Scalar | undefined, date1904: boolean): string | null {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value > 2958465) return null;
    const result = excelSerialToIso(value, date1904);
    return result && /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
  }
  if (typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseIsoDateOnly(value)
    : /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(value) ? parseIsoDateOnly(value) : null;
}
function progress(value: Scalar | undefined, raw: unknown, scale: Options["progressScale"]): number | null {
  if (value == null) return null;
  let n: number;
  if (typeof value === "string" && /^\d+(?:\.\d+)?%$/.test(value)) {
    n = Number(value.slice(0,-1));
  } else {
    if (typeof value === "string" && !/^\d+(?:\.\d+)?$/.test(value)) return null;
    const format = raw && typeof raw === "object" ? (raw as {format?:unknown}).format : null;
    if (typeof format === "string" && format.includes("%") && typeof value === "number") n = value * 100;
    else if (scale) n = Number(value) * (scale === "fraction" ? 100 : 1);
    else return null;
  }
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 1e6) / 1e6 : null;
}
export function normalizeGuidedRows(rows: readonly PreviewRow[], opts: Options) {
  const issues: Issue[] = [];
  const drafts: Draft[] = [];
  const byId = new Map<string, Draft>(), byWbs = new Map<string, Draft>();
  const typed = new Map<number, Partial<Record<ImportField, Scalar | undefined>>>();
  const seenRows = new Set<number>();
  const allCodesAbsent = rows.every(r => !Object.prototype.hasOwnProperty.call(r.values, "WBSCode"));
  for (const row of rows) {
    const fail = (field: ImportField, code: string) => issues.push({row: row.excelRow, field, code});
    if (!Number.isSafeInteger(row.excelRow) || row.excelRow < 2 || seenRows.has(row.excelRow)) fail("ID","invalid-row");
    seenRows.add(row.excelRow);
    const values: Partial<Record<ImportField, Scalar | undefined>> = {};
    for (const field of Object.keys(row.values) as ImportField[]) {
      const value = scalar(row.values[field]);
      values[field] = value;
      if (value === undefined) fail(field,"unsupported-cell");
      if (typeof value === "string" && !safeText(value)) fail(field,"unsafe-text");
    }
    typed.set(row.excelRow, values);
    const title = typeof values.Title === "string" ? values.Title : "";
    if (!title || !safeText(title)) fail("Title","invalid-title");
    for (const field of ["AssignedTo", "Workstream"] as const) {
      if (values[field] != null && typeof values[field] !== "string") fail(field, "invalid-text");
    }
    const generated = values.ID == null;
    const id = generated ? opts.generatedIds[row.excelRow] ?? "" : identity(values.ID) ?? "";
    if (!id || (generated && !UUID.test(id))) fail("ID","invalid-id");
    const wbsCode = allCodesAbsent ? String(drafts.length+1) : identity(values.WBSCode) ?? "";
    if (!wbsCode || !/^[1-9]\d*(?:\.[1-9]\d*)*$/.test(wbsCode)) fail("WBSCode","invalid-wbs");
    const type = values.TaskType == null ? "Task" : TASK_TYPES.find(t => t.toLowerCase() === String(values.TaskType).toLowerCase());
    if (!type) fail("TaskType","unknown-type");
    const status = values.TaskStatus == null ? "Not Started" : KNOWN_STATUSES.find(s => s.toLowerCase() === String(values.TaskStatus).toLowerCase());
    if (!status) fail("TaskStatus","unknown-status");
    const start = day(values.PlannedStart, opts.date1904), end = day(values.PlannedEnd, opts.date1904);
    if (values.PlannedStart != null && !start) fail("PlannedStart","invalid-date");
    if (values.PlannedEnd != null && !end) fail("PlannedEnd","invalid-date");
    if (start && end && end < start) fail("PlannedEnd","reversed-dates");
    const p = progress(values.Progress, row.values.Progress, opts.progressScale);
    if (values.Progress != null && p === null) fail("Progress","ambiguous-or-invalid-progress");
    const optionalText = (field: "Priority" | "Description" | "Updates") => {
      const value = values[field];
      if (value == null) return null;
      if (typeof value !== "string" || !safeText(value)) {
        fail(field,"invalid-text"); return null;
      }
      return value;
    };
    const sortRaw = values.SortOrder;
    const sortOrder = typeof sortRaw === "number" ? sortRaw :
      typeof sortRaw === "string" && /^-?\d+(?:\.\d+)?$/.test(sortRaw) ? Number(sortRaw) : null;
    if (sortRaw != null && (sortOrder === null || !Number.isFinite(sortOrder))) fail("SortOrder","invalid-sort-order");
    const modifiedRaw = values.Modified;
    let modified: string | null = null;
    if (typeof modifiedRaw === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(modifiedRaw) &&
      Number.isFinite(Date.parse(modifiedRaw)) && new Date(modifiedRaw).toISOString() === modifiedRaw) {
      modified = modifiedRaw;
    } else if (modifiedRaw != null) fail("Modified","timestamp-review-required");
    const urlRaw = values.ItemURL;
    const itemUrl = typeof urlRaw === "string" ? sanitizeItemUrl(urlRaw,SHAREPOINT_HOSTS) : null;
    if (urlRaw != null && !itemUrl) fail("ItemURL","unsupported-item-url");
    const d: Draft = {sourceRow:row.excelRow,id,title,wbsCode,taskType:type ?? "Task",
      parentId:null,predecessorIds:[],plannedStart:start,plannedEnd:end,progress:p,
      status:status ?? "Not Started",owner:String(values.AssignedTo ?? ""),workstream:String(values.Workstream ?? ""),
      priority:optionalText("Priority"),description:optionalText("Description"),updates:optionalText("Updates"),
      sortOrder:sortOrder !== null && Number.isFinite(sortOrder) ? sortOrder : null,modified,itemUrl,original:{...row.values}};
    if (byId.has(id)) fail("ID","duplicate-id");
    else byId.set(id,d);
    if (!allCodesAbsent) {
      if (byWbs.has(wbsCode)) fail("WBSCode","duplicate-wbs");
      else byWbs.set(wbsCode,d);
    }
    drafts.push(d);
  }
  for (const d of drafts) {
    const v = typed.get(d.sourceRow)!;
    const fail = (field: ImportField, code: string) => issues.push({row:d.sourceRow,field,code});
    const explicitId = identity(v.ParentTaskID), explicitWbs = identity(v.ParentWBS);
    const prefix = d.wbsCode.includes(".") ? d.wbsCode.slice(0,d.wbsCode.lastIndexOf(".")) : null;
    const parentById = explicitId ? byId.get(explicitId) : undefined;
    const parentByWbs = explicitWbs ? byWbs.get(explicitWbs) : undefined;
    const parentByPrefix = prefix ? byWbs.get(prefix) : undefined;
    if (v.ParentTaskID != null && !parentById) fail("ParentTaskID","missing-parent");
    if (v.ParentWBS != null && !parentByWbs) fail("ParentWBS","missing-parent");
    if (prefix && !parentByPrefix) fail("WBSCode","missing-parent-prefix");
    const proposed = [parentById,parentByWbs,parentByPrefix].filter((p): p is Draft => !!p);
    if (new Set(proposed.map(p=>p.id)).size > 1) fail("ParentTaskID","conflicting-parent");
    const parent = proposed[0];
    if (parent) {
      if (parent.id === d.id) fail("ParentTaskID","self-parent");
      else {
        d.parentId = parent.id;
        if (typed.get(parent.sourceRow)?.TaskType == null) parent.taskType = "Summary";
        else if (parent.taskType !== "Summary") fail("ParentTaskID","parent-not-summary");
        if (!allCodesAbsent && parent.wbsCode !== prefix) fail("WBSCode","conflicting-parent-code");
      }
    }
    if (v.PredecessorIDs != null && v.PredecessorWBS != null) fail("PredecessorIDs","ambiguous-reference-mode");
    const useWbs = v.PredecessorWBS != null;
    const raw = useWbs ? v.PredecessorWBS : v.PredecessorIDs;
    if (raw != null) {
      for (const token of String(raw).split(/[;,]/).map(s=>s.trim())) {
        const found = (useWbs ? byWbs : byId).get(token);
        if (!found || found.id === d.id || d.predecessorIds.includes(found.id)) fail(useWbs?"PredecessorWBS":"PredecessorIDs","invalid-dependency");
        else d.predecessorIds.push(found.id);
      }
    }
  }
  // Iterative Kahn traversal avoids recursive stack failure on large imports.
  function cycleCheck(field: "ParentTaskID" | "PredecessorIDs", edges: (d: Draft)=>string[]) {
    const degree = new Map<string,number>(), outgoing = new Map<string,string[]>();
    for (const d of drafts) {degree.set(d.id,0); outgoing.set(d.id,[]);}
    for (const d of drafts) for (const e of edges(d)) if (degree.has(e)) {
      degree.set(d.id,(degree.get(d.id)??0)+1); outgoing.get(e)!.push(d.id);
    }
    const queue = [...degree].filter(([,n])=>n===0).map(([id])=>id);
    for(let i=0;i<queue.length;i++) for(const target of outgoing.get(queue[i])??[]) {
      const n=(degree.get(target)??0)-1; degree.set(target,n); if(n===0) queue.push(target);
    }
    for(const d of drafts) if((degree.get(d.id)??0)>0) issues.push({row:d.sourceRow,field,code:"cycle-or-dependent-on-cycle"});
  }
  cycleCheck("ParentTaskID",d=>d.parentId?[d.parentId]:[]);
  cycleCheck("PredecessorIDs",d=>d.predecessorIds);
  if (allCodesAbsent && issues.length === 0) {
    const children = new Map<string | null, Draft[]>();
    for (const draft of drafts) {
      const siblings = children.get(draft.parentId) ?? [];
      siblings.push(draft);
      children.set(draft.parentId, siblings);
    }
    const parents: (Draft | null)[] = [null];
    for (const parent of parents) {
      const siblings = children.get(parent?.id ?? null) ?? [];
      for (const [index, draft] of siblings.entries()) {
        const code = parent ? `${parent.wbsCode}.${index + 1}` : String(index + 1);
        if (code.length > 32767) {
          issues.push({row:draft.sourceRow,field:"WBSCode",code:"generated-code-too-long"});
          continue;
        }
        draft.wbsCode = code;
        parents.push(draft);
      }
    }
  }
  for (const d of drafts) {
    const fail = (field: ImportField, code: string) => issues.push({row:d.sourceRow,field,code});
    if (d.taskType === "Summary" && (d.plannedStart || d.plannedEnd || d.progress !== null)) fail("TaskType","summary-derived-values-require-review");
    if (d.taskType === "Task" && Boolean(d.plannedStart)!==Boolean(d.plannedEnd)) fail("PlannedEnd","incomplete-dates");
    if (d.taskType === "Milestone") {
      if (!d.plannedStart && !d.plannedEnd || d.plannedStart && d.plannedEnd && d.plannedStart !== d.plannedEnd) fail("PlannedEnd","invalid-milestone-date");
      else {d.plannedStart ??= d.plannedEnd; d.plannedEnd ??= d.plannedStart;}
    }
  }
  const review: Review[] = [];
  for (const draft of drafts) {
    const row = draft.sourceRow;
    const source = typed.get(row)!;
    if (source.ID == null) review.push({ row, field: "ID", reason: "generated", value: draft.id });
    if (allCodesAbsent) review.push({ row, field: "WBSCode", reason: "generated", value: draft.wbsCode });
    if (source.TaskStatus == null) review.push({ row, field: "TaskStatus", reason: "defaulted", value: draft.status });
    if (source.TaskType == null) {
      const reason = draft.taskType === "Summary" ? "inferred" : "defaulted";
      review.push({ row, field: "TaskType", reason, value: draft.taskType });
    }
    if (draft.parentId && source.ParentTaskID == null && source.ParentWBS == null) {
      review.push({ row, field: "ParentTaskID", reason: "inferred", value: draft.parentId });
    }
  }
  return {drafts,issues,review,coreValid:issues.length===0};
}
