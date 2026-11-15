import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { inspectProjectData, PROJECT_DATA_SHEETS } from "../../src/managed/projectDataInspector";

/**
 * Frozen-v0.1.2 structural acceptance guard (not an implementation or release signoff).
 *
 * Build an actual workbook FROM the owner-frozen machine contract, not from
 * copies of the implementation's private HEADERS constant. This fails if the
 * inspector's required headers drift away from the approved Excel schema.
 * Normal Watch/commitment transaction semantics remain covered by F2–F7.
 */
type FrozenColumn = string | { name: string; required: boolean; type: string };
type FrozenWorksheet = { name: string; headers: FrozenColumn[] };
type FrozenContract = {
  spec_id: string;
  version: string;
  status: string;
  worksheets: FrozenWorksheet[];
  implementation_authorized: boolean;
  merge_authorized: boolean;
  release_authorized: boolean;
};
const frozen = JSON.parse(readFileSync(resolve(
  process.cwd(), "docs/specifications/EMV_PROJECT_DATA_0_1_2_FROZEN.json",
), "utf8")) as FrozenContract;

const headers = (sheet: FrozenWorksheet) => sheet.headers.map(
  (column) => typeof column === "string" ? column : column.name,
);
function fromFrozenContract() {
  const book = new ExcelJS.Workbook();
  const wbs = book.addWorksheet("ProjectWBS");
  wbs.addRow(["ID", "Title", "WBSCode", "TaskType"]);
  wbs.addRow([1, "Synthetic contract-check task", "1", "Task"]);
  for (const sheet of frozen.worksheets) {
    const ws = book.addWorksheet(sheet.name);
    ws.addRow(headers(sheet));
    if (sheet.name === "ProjectMeta") {
      ws.addRow(["ProjectID", "bd95a399-257e-4b42-ac0e-fb6ee984c1aa"]);
      ws.addRow(["ProjectName", "Frozen Schema Contract Fixture"]);
      ws.addRow(["ProjectDataSchemaVersion", frozen.version]);
    }
  }
  return book;
}

describe("owner-frozen EMV-PROJECT-DATA-0.1.2 ↔ F7 inspector contract", () => {
  it("pins exactly the five approved additive sheets and all 44 required header names", () => {
    expect(frozen.spec_id).toBe("EMV-PROJECT-DATA-0.1.2");
    expect(frozen.version).toBe("0.1.2");
    expect(frozen.status).toBe("OWNER_FROZEN_BOUNDED_FIELD_AUDIT_CONTRACT");
    expect(frozen.worksheets.map(sheet => sheet.name)).toEqual([...PROJECT_DATA_SHEETS]);
    expect(frozen.worksheets.map(sheet => headers(sheet).length)).toEqual([2, 6, 14, 8, 14]);
    expect(frozen.worksheets.flatMap(headers)).toHaveLength(44);
    expect(frozen.implementation_authorized).toBe(false);
    expect(frozen.merge_authorized).toBe(false);
    expect(frozen.release_authorized).toBe(false);

    const project = frozen.worksheets.find(sheet => sheet.name === "ProjectMeta")!;
    expect(headers(project)).toEqual(["Key", "Value"]);
    const actor = frozen.worksheets.find(sheet => sheet.name === "ProjectAudit")!.headers.find(
      (column) => typeof column !== "string" && column.name === "ActorProvenance",
    );
    expect(actor).toMatchObject({ type: "enum_UnverifiedLocal_only_until_separately_approved" });
  });

  it("recognizes a real workbook generated from the frozen columns as structurally valid", async () => {
    const book = fromFrozenContract();
    expect(inspectProjectData(book)).toEqual({
      kind: "valid", projectName: "Frozen Schema Contract Fixture", schemaVersion: "0.1.2", findings: [],
    });
    // Assert the real XLSX reload path, not just the in-memory worksheet APIs.
    const bytes = new Uint8Array(await book.xlsx.writeBuffer());
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
    expect(inspectProjectData(reopened).kind).toBe("valid");
  });

  it("rejects a missing required frozen column rather than silently accepting drift", () => {
    const book = fromFrozenContract();
    book.getWorksheet("WatchReasons")!.getCell("A1").value = "InventedReasonIdentifier";
    const inspected = inspectProjectData(book);
    expect(inspected.kind).toBe("incompatible");
    if (inspected.kind === "incompatible") {
      expect(inspected.findings.some(f => f.sheet === "WatchReasons" &&
        f.code === "MISSING_HEADER" && f.field === "ReasonID")).toBe(true);
    }
  });

  it("does not interpret the unextended legacy workbook as already green/configured", () => {
    const book = new ExcelJS.Workbook();
    book.addWorksheet("ProjectWBS").addRow(["ID", "Title"]);
    expect(inspectProjectData(book)).toEqual({ kind: "legacy", projectName: null, findings: [] });
    expect(book.worksheets).toHaveLength(1); // No implicit extension migration on read.
  });
});
