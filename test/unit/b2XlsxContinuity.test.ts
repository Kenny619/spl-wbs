import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { importWorkbook } from "../../src/data/normalize";
import { encodeCreateManifest, MANIFEST_FIELD, validateTaskContinuity } from "../../src/managed/b2ContinuityProof";
import { planB2TaskCreateAudit, type B2CreateField } from "../../src/managed/b2CreateAuditPlan";
import { inspectProjectData } from "../../src/managed/projectDataInspector";
import { buildManagedCandidate, HISTORY_COLUMNS } from "../../src/managed/workbookCandidate";
import { projectDataWorkbook } from "../fixtures/projectDataWorkbook";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const timestampUTC = "2026-11-19T00:00:00.000Z";
const appVersion = "synthetic-b2";
const fields = ["ID", "Title", "WBSCode", "TaskType", "Progress"] as const;
const auditColumns = [
  "EventID", "ChangeSetID", "TimestampUTC", "EntityType", "EntityID", "TaskID", "Action",
  "Field", "OldValue", "NewValue", "ActorLabel", "ActorProvenance", "Source", "AppVersion",
] as const;
type AuditRow = Parameters<typeof validateTaskContinuity>[0][number];
type HistoryRow = Parameters<typeof validateTaskContinuity>[1][number];

async function open(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return workbook;
}

function rows(sheet: ExcelJS.Worksheet) {
  return sheet.getRows(2, sheet.rowCount - 1) ?? [];
}

function record<K extends string>(row: ExcelJS.Row, columns: readonly K[]) {
  return Object.fromEntries(columns.map((column, index) => [
    column, String(row.getCell(index + 1).value ?? ""),
  ])) as Record<K, string>;
}

async function fixture() {
  const source = await projectDataWorkbook();
  const legacyEdit = await buildManagedCandidate({
    source, taskId: "501", changes: { Title: "Preserved legacy edit" },
    changeSetId: uuid(90), timestampUTC, appVersion,
  });
  if (legacyEdit.kind !== "candidate") throw new Error("Expected an accepted legacy edit");
  const workbook = await open(legacyEdit.bytes);
  const history = workbook.getWorksheet("UpdateHistory")!;
  const audit = workbook.getWorksheet("ProjectAudit")!;
  const wbs = workbook.getWorksheet("ProjectWBS")!;
  const legacyHistory = record(history.getRow(2), HISTORY_COLUMNS);
  const legacyAudit = record(audit.getRow(2), auditColumns);
  expect(inspectProjectData(workbook)).toMatchObject({ kind: "valid", schemaVersion: "0.1.2" });

  // Only the synthetic fixture models the proposed schema. The accepted writer
  // remains responsible for the legacy edit above and must refuse this version.
  workbook.getWorksheet("ProjectMeta")!.getRow(4).getCell(2).value = "0.1.3";
  const tasks = [uuid(1), uuid(2)];
  for (const [index, ID] of tasks.entries()) {
    const values = { ID, Title: `Task ${index + 1}`, WBSCode: String(index + 2), TaskType: "Task", Progress: null };
    const plan = planB2TaskCreateAudit({
      taskId: ID, changeSetId: uuid(3), timestampUTC, actorLabel: "Synthetic editor", appVersion,
      fields, values, eventIds: fields.map((_, field) => uuid(10 + index * 10 + field)),
    });
    if (!plan.ok) throw new Error(plan.errors.join(", "));
    const group: AuditRow[] = [...plan.rows, {
      ...plan.rows[0], EventID: uuid(15 + index * 10), Field: MANIFEST_FIELD,
      NewValue: encodeCreateManifest(fields, 1),
    }];
    for (const entry of group) audit.addRow(auditColumns.map(column => entry[column]));
    wbs.addRow(fields.map(field => values[field]));
  }

  function appendEdit(task: number, change: number, oldTitle: string, newTitle: string) {
    history.addRow([uuid(change), timestampUTC, tasks[task], String(task + 2), newTitle,
      "Title", oldTitle, newTitle, "Web UI", appVersion]);
    wbs.getRow(task + 3).getCell(2).value = newTitle;
  }
  appendEdit(0, 80, "Task 1", "First edit");
  appendEdit(1, 70, "Task 2", "Second task edit");
  appendEdit(0, 60, "First edit", "Final title");
  return { workbook, tasks, legacyHistory, legacyAudit };
}

function check(workbook: ExcelJS.Workbook, taskId: string) {
  const audit = rows(workbook.getWorksheet("ProjectAudit")!).map(row => record(row, auditColumns));
  const history = rows(workbook.getWorksheet("UpdateHistory")!).map(row => record(row, HISTORY_COLUMNS));
  const group = audit.filter(row => row.TaskID === taskId) as AuditRow[];
  const current = rows(workbook.getWorksheet("ProjectWBS")!).map(row => record(row, fields))
    .find(row => row.ID === taskId) as Partial<Record<B2CreateField, string>> | undefined;
  if (!current) throw new Error("Missing synthetic WBS row");
  return validateTaskContinuity(group, history as HistoryRow[], current);
}

describe("Stage C B2 synthetic XLSX continuity", () => {
  it("preserves the legacy prefix and replays two tasks from a shared Create transaction", async () => {
    const { workbook, tasks, legacyAudit, legacyHistory } = await fixture();
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    const reopened = await open(bytes);

    expect(record(reopened.getWorksheet("ProjectAudit")!.getRow(2), auditColumns)).toEqual(legacyAudit);
    expect(record(reopened.getWorksheet("UpdateHistory")!.getRow(2), HISTORY_COLUMNS)).toEqual(legacyHistory);
    expect(rows(reopened.getWorksheet("UpdateHistory")!).map(row => row.getCell(1).value))
      .toEqual([uuid(90), uuid(80), uuid(70), uuid(60)]);
    for (const taskId of tasks) expect(check(reopened, taskId)).toEqual({ ok: true, errors: [] });
    expect(await importWorkbook(bytes, { paletteStorage: null })).toMatchObject({
      ok: true, tasks: [expect.objectContaining({ taskName: "Preserved legacy edit" }),
        expect.objectContaining({ taskName: "Final title" }), expect.objectContaining({ taskName: "Second task edit" })],
    });
    await expect(buildManagedCandidate({
      source: bytes, taskId: tasks[0], changes: { Title: "Must refuse" }, appVersion,
    })).rejects.toMatchObject({ code: "UNSUPPORTED_PROJECT_DATA_VERSION" });
  });

  it.each([
    ["missing manifest", "manifest-count"],
    ["missing replay row", "invalid-transition"],
    ["reordered edits", "invalid-transition"],
  ])("rejects serialized %s", async (defect, error) => {
    const { workbook, tasks } = await fixture();
    const audit = workbook.getWorksheet("ProjectAudit")!;
    const history = workbook.getWorksheet("UpdateHistory")!;
    if (defect === "missing manifest") {
      audit.spliceRows(rows(audit).find(row => row.getCell(8).value === MANIFEST_FIELD)!.number, 1);
    } else if (defect === "missing replay row") {
      history.spliceRows(3, 1);
    } else {
      const first = history.getRow(3).values;
      history.getRow(3).values = history.getRow(5).values;
      history.getRow(5).values = first;
    }
    const reopened = await open(new Uint8Array(await workbook.xlsx.writeBuffer()));
    expect(check(reopened, tasks[0])).toMatchObject({ ok: false, errors: expect.arrayContaining([error]) });
  });
});
