import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { prepareGuidedPreview, readGuidedSource } from "../../src/managed/guidedImportReader";

const ids = {
  2: "aaaaaaaa-0000-4000-8000-000000000002",
  3: "aaaaaaaa-0000-4000-8000-000000000003",
  4: "aaaaaaaa-0000-4000-8000-000000000004",
};

async function source(rows: ExcelJS.CellValue[][]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("External");
  worksheet.addRow(["Title", "ID", "Parent ID", "Predecessors"]);
  for (const row of rows) worksheet.addRow(row);
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
  const before = bytes.slice();
  const grid = await readGuidedSource(bytes);
  if (grid.kind !== "grid") throw new Error("Expected external workbook");
  expect(bytes).toEqual(before);
  return grid;
}

describe("guided import B2 identity projection", () => {
  it("reuses stable allocations and preserves raw source identity and relationship provenance", async () => {
    const grid = await source([["Parent", 12], ["First", "LEG-7", "12"], ["Last", null, 12, "LEG-7"]]);
    const preview = prepareGuidedPreview(grid, ids);
    expect(preview.targetIdentity).toEqual({
      ok: true,
      identities: [
        { sourceRow: 2, sourceId: { kind: "number", value: 12, format: null }, id: ids[2], parentId: null, predecessorIds: [] },
        { sourceRow: 3, sourceId: "LEG-7", id: ids[3], parentId: ids[2], predecessorIds: [] },
        { sourceRow: 4, sourceId: null, id: ids[4], parentId: ids[2], predecessorIds: [ids[3]] },
      ],
    });
    expect(prepareGuidedPreview(grid, ids).targetIdentity).toEqual(preview.targetIdentity);
    expect(preview.persistenceReady).toBe(false);
  });

  it("blocks numeric/text aliases, including equivalent UUIDs with different case", async () => {
    const aliases = await source([["First", 12], ["Second", "12"]]);
    expect(prepareGuidedPreview(aliases, ids)).toMatchObject({
      targetIdentity: null, normalized: { issues: [{ row: 3, field: "ID", code: "duplicate-id" }] },
    });
    const uuidAliases = await source([["First", ids[2]], ["Second", ids[2].toUpperCase()]]);
    expect(prepareGuidedPreview(uuidAliases, ids).targetIdentity).toEqual({
      ok: false, issues: [{ row: 3, code: "duplicate-source-id" }],
    });
  });

  it("rejects missing allocations and collisions with retained UUIDs regardless of row order", async () => {
    const grid = await source([["First", "old"], ["Second", ids[2].toUpperCase()]]);
    expect(prepareGuidedPreview(grid, {}).targetIdentity).toMatchObject({
      ok: false, issues: [{ row: 2, code: "invalid-target-id" }],
    });
    expect(prepareGuidedPreview(grid, ids).targetIdentity).toMatchObject({
      ok: false, issues: [{ row: 3, code: "duplicate-target-id" }],
    });
    expect(prepareGuidedPreview(grid, { 2: ids[3] }).targetIdentity).toMatchObject({
      ok: true, identities: [{ id: ids[3] }, { id: ids[2] }],
    });
  });
});
