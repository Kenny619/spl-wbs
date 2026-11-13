import ExcelJS from "exceljs";
import { inspectProjectData, type ProjectFinding } from "./projectDataInspector";

/**
 * Conservative, read-only projection of *recorded* commitment rows.
 *
 * The project workbook's integrity is validated before looking up any
 * commitment fact. "Recorded" never means an identity/acceptance authority
 * was verified: v0.1.2 actor and acceptance policy are still proposed.
 *
 * Does not calculate Green/Clear, accept a rebaseline, change task PlannedEnd,
 * auto-create any sheets, or write anything to Excel/localStorage.
 */
export type RecordedCommitment = {
  commitmentId: string;
  taskId: string;
  acceptedFinishDate: string;
  acceptedUTC: string;
  acceptedBy: string;
  previousCommitmentId: string | null;
  rationale: string | null;
  evidenceRef: string | null;
  /** Mere audit entity-reference presence, not an authenticated audit proof. */
  hasRecordedProjectAudit: boolean;
};

export type TaskCommitmentHistory = {
  taskId: string;
  /** Workbook rows ordered by increasing recorded UTC revision time. */
  records: RecordedCommitment[];
  /** A terminal recorded row; NOT automatically an authoritative baseline. */
  latestRecorded: RecordedCommitment | null;
  disposition: "Unconfirmed" | "Recorded (unverified)";
  acceptanceAuthorityVerified: false;
};

export type CommitmentProjection = {
  workbookState: "legacy" | "valid" | "incompatible" | "unsupported_future";
  projectName: string | null;
  tasks: TaskCommitmentHistory[];
  findings: ProjectFinding[];
  schemaValidated: boolean;
};

type Tab = { sheet: ExcelJS.Worksheet; cols: Record<string, number> };
const cellText = (v: ExcelJS.CellValue): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const taskId = (v: ExcelJS.CellValue): string | null => {
  if (typeof v === "number" && Number.isSafeInteger(v)) return String(v);
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
};

function table(book: ExcelJS.Workbook, sheetName: string): Tab {
  const sheet = book.worksheets.find(x => x.name.toLowerCase() === sheetName.toLowerCase());
  if (!sheet) throw new Error("Commitment projection needs a validated " + sheetName + " sheet.");
  const cols: Record<string, number> = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, index) => {
    if (typeof cell.value === "string") cols[cell.value.trim().toLowerCase()] = index;
  });
  return { sheet, cols };
}
const at = (tab: Tab, row: ExcelJS.Row, name: string): ExcelJS.CellValue =>
  row.getCell(tab.cols[name.toLowerCase()]).value;
const required = (tab: Tab, row: ExcelJS.Row, name: string): string =>
  String(at(tab, row, name) ?? "");
const optional = (tab: Tab, row: ExcelJS.Row, name: string): string | null =>
  cellText(at(tab, row, name));

export async function projectCommitmentProjection(
  source: Uint8Array | ArrayBuffer,
): Promise<CommitmentProjection> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(source as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  const inspection = inspectProjectData(book);
  if (inspection.kind !== "valid") {
    return {
      workbookState: inspection.kind,
      projectName: null,
      tasks: [],
      findings: inspection.findings,
      schemaValidated: false,
    };
  }
  const wbs = table(book, "ProjectWBS");
  const commitments = table(book, "ProjectCommitments");
  const audit = table(book, "ProjectAudit");
  const recordedAuditIds = new Set<string>();
  for (let i = 2; i <= audit.sheet.rowCount; i++) {
    const row = audit.sheet.getRow(i);
    if (!row.hasValues || required(audit, row, "EntityType") !== "Commitment") continue;
    const id = optional(audit, row, "EntityID");
    if (id) recordedAuditIds.add(id.toLowerCase());
  }

  const tasks = new Map<string, TaskCommitmentHistory>();
  for (let i = 2; i <= wbs.sheet.rowCount; i++) {
    const row = wbs.sheet.getRow(i);
    if (!row.hasValues) continue;
    const id = taskId(at(wbs, row, "ID"));
    if (!id) continue; // The shared inspector rules out malformed task IDs.
    tasks.set(id, {
      taskId: id, records: [], latestRecorded: null,
      disposition: "Unconfirmed", acceptanceAuthorityVerified: false,
    });
  }

  for (let i = 2; i <= commitments.sheet.rowCount; i++) {
    const row = commitments.sheet.getRow(i);
    if (!row.hasValues) continue;
    const id = taskId(at(commitments, row, "TaskID"));
    const target = id ? tasks.get(id) : null;
    if (!target) continue; // Cross-sheet references were validated above.
    const commitmentId = required(commitments, row, "CommitmentID");
    const record: RecordedCommitment = {
      commitmentId,
      taskId: id!,
      acceptedFinishDate: required(commitments, row, "AcceptedFinishDate"),
      acceptedUTC: required(commitments, row, "AcceptedUTC"),
      acceptedBy: required(commitments, row, "AcceptedBy"),
      previousCommitmentId: optional(commitments, row, "PreviousCommitmentID"),
      rationale: optional(commitments, row, "Rationale"),
      evidenceRef: optional(commitments, row, "EvidenceRef"),
      hasRecordedProjectAudit: recordedAuditIds.has(commitmentId.toLowerCase()),
    };
    target.records.push(record);
  }

  for (const task of tasks.values()) {
    // The inspector requires exactly one linear, strictly time-ordered chain
    // for each task; sorting by canonical UTC is then equivalent to traversal.
    task.records.sort((a, b) => a.acceptedUTC.localeCompare(b.acceptedUTC));
    if (task.records.length) {
      task.latestRecorded = task.records[task.records.length - 1];
      task.disposition = "Recorded (unverified)";
    }
  }

  return {
    workbookState: "valid",
    projectName: inspection.projectName,
    tasks: [...tasks.values()],
    findings: [],
    schemaValidated: true,
  };
}
