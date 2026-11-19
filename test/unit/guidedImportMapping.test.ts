import { describe, expect, it } from "vitest";
import { planImportHeaders, previewMappedRows } from "../../src/managed/guidedImportMapping";

describe("C-IMPORT mapping-only preparation", () => {
  it("accepts Title as the only required input header", () => {
    expect(planImportHeaders(["Title"])).toEqual({
      columns: { Title: 0 }, unmapped: [], excluded: [], issues: [],
    });
  });
  it("recognizes supported aliases without altering source headers", () => {
    const headers = Object.freeze([" Task Name ", "WBS", "Start Date", "Finish Date", "Owner"]);
    expect(planImportHeaders(headers).columns).toEqual({
      Title: 0, WBSCode: 1, PlannedStart: 2, PlannedEnd: 3, AssignedTo: 4,
    });
  });
  it("blocks duplicate aliases even if one is the canonical name", () => {
    expect(planImportHeaders(["Title", "Activity"]).issues).toContainEqual({
      code: "ambiguous-field", field: "Title", columns: [0, 1],
    });
  });
  it("requires a title or an explicit mapping", () => {
    expect(planImportHeaders(["Label"]).issues).toContainEqual({ code: "missing-title", field: "Title" });
    expect(planImportHeaders(["Label"], [{ column: 0, field: "Title" }]).issues).toEqual([]);
  });
  it("permits an explicit exclusion to resolve a duplicate alias", () => {
    const result = planImportHeaders(["Title", "Activity"], [{ column: 1, field: null }]);
    expect(result.issues).toEqual([]);
    expect(result.excluded).toEqual([1]);
  });
  it("rejects an invalid or duplicate override", () => {
    const codes = planImportHeaders(["Title"], [
      { column: 1, field: "Workstream" }, { column: 0, field: "Title" },
      { column: 0, field: null },
    ]).issues.map(issue => issue.code);
    expect(codes).toEqual(["invalid-override", "duplicate-override"]);
  });
  it("preserves blank versus zero and all nonempty source rows", () => {
    const result = previewMappedRows(["Task", "Progress"], [
      { excelRow: 2, cells: ["A", 0] }, { excelRow: 3, cells: ["", null] },
      { excelRow: 4, cells: ["B", null] },
    ]);
    expect(result.mappingReady).toBe(true);
    expect(result.rows).toEqual([
      { excelRow: 2, values: { Title: "A", Progress: 0 } },
      { excelRow: 4, values: { Title: "B", Progress: null } },
    ]);
    expect(result.skippedBlankRows).toEqual([3]);
  });
  it("blocks populated unknown columns until explicitly reviewed", () => {
    const rows = [{ excelRow: 2, cells: ["A", 0] }];
    expect(previewMappedRows(["Title", "Other"], rows).issues).toContainEqual({
      code: "unmapped-data", row: 2, columns: [1],
    });
    expect(previewMappedRows(["Title", "Other"], rows, [{ column: 1, field: null }]).mappingReady).toBe(true);
  });
  it("keeps rows with blank title or trailing populated cells visible", () => {
    const result = previewMappedRows(["Title", "Owner"], [
      { excelRow: 2, cells: [null, "PM"] }, { excelRow: 3, cells: ["B", "", "extra"] },
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.issues.map(issue => issue.code)).toEqual(["empty-title", "extra-cell"]);
    expect(result.mappingReady).toBe(false);
  });
  it("rejects duplicate row identities and preserves opaque cell data", () => {
    const opaque = Object.freeze({ kind: "error" });
    const result = previewMappedRows(["Title"], [
      { excelRow: 2, cells: [opaque] }, { excelRow: 2, cells: ["B"] },
    ]);
    expect(result.rows[0].values.Title).toBe(opaque);
    expect(result.issues).toContainEqual({ code: "invalid-source-row", row: 2 });
  });
});
