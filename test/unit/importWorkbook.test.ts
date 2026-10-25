import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { SHAREPOINT_HOSTS } from "../../src/config/decisions";
import { importWorkbook, sanitizeItemUrl } from "../../src/data/normalize";
import { buildWorkbook, type FixtureValue } from "../fixtures/workbooks";

const HOSTS = ["contoso.sharepoint.com"];
const HEADERS = [
  "ID",
  "Task Name",
  "WBSCode",
  "ParentTaskID",
  "TaskType",
  "PlannedStart",
  "PlannedEnd",
  "Progress",
  "TaskStatus",
  "AssignedTo",
  "Workstream",
  "SortOrder",
  "PredecessorIDs",
  "Description",
  "Modified",
  "ItemURL",
];

function row(values: FixtureValue[]): FixtureValue[] {
  return values;
}

async function program() {
  return buildWorkbook({
    headers: HEADERS,
    rows: [
      row(["1", "Program", "1", null, "Summary", null, null, null, "At Risk", "P", "WS01", 1, null, null, { date: "2026-10-20" }, null]),
      row(["2", "Phase", "1.1", 1, "Summary", null, null, null, "In Progress", "P", "WS02", 1, null, null, null, null]),
      row(["3", "Leaf", "1.1.1", 2, "Task", { date: "2026-10-01" }, { date: "2026-10-10" }, { percent: 50 }, "In Progress", "A", "WS03", 1, "2", "Plain", { date: "2026-10-21" }, null]),
      row(["4", "Gate", "1.1.2", 2, "Milestone", { date: "2026-11-23" }, null, null, "Not Started", "B", "WS04", 2, "12FS, 999", null, null, null]),
      row(["5", "Finished late", "1.2", 1, "Task", { date: "2026-09-01" }, { date: "2026-09-15" }, 100, "Completed", "A", "WS05", 2, null, null, null, null]),
      row(["6", "Stopped", "1.3", 1, "Task", { date: "2026-09-01" }, { date: "2026-09-20" }, 0, "Cancelled", "C", "WS06", 3, null, null, null, null]),
      row(["7", "Late active", "1.4", 1, "Task", { date: "2026-09-20" }, { date: "2026-10-01" }, 10, "At Risk", "B", "WS07", 4, null, null, null, null]),
      row(["8", "Blocked span", "1.5", 1, "Task", { date: "2026-12-01" }, { date: "2027-01-15" }, 0, "Blocked", "A", "WS08", 5, null, null, null, "https://contoso.sharepoint.com/sites/p/Lists/WBS/DispForm.aspx?ID=8"]),
      row(["9", "Open", "1.6", 1, "Task", null, null, null, "Not Started", null, "WS09", 6, null, "<script>alert(1)</script>", null, "javascript:alert(1)"]),
      row(["10", "Fraction", "1.7", 1, "Task", { date: "2026-10-05" }, { formula: "DATE(1999,1,1)", result: { date: "2026-10-05" } }, 0.42, "In Progress", "D", "WS10", 7, null, null, null, "https://example.com/item"]),
      ...["WS11", "WS12", "WS13", "WS14", "WS15"].map((name, index) =>
        row([String(11 + index), name, `1.${8 + index}`, 1, "Task", { date: "2026-10-06" }, { date: "2026-10-06" }, 0, "Not Started", "E", name, 8 + index, null, null, null, null]),
      ),
    ],
  });
}

describe("workbook import", () => {
  it("imports a three-level schedule from serials, aliases, and cached formulas", async () => {
    const result = await importWorkbook(await program(), { allowedHosts: HOSTS, paletteStorage: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byId = new Map(result.tasks.map((task) => [task.id, task]));
    expect(byId.get("1")?.plannedStart).toBe("2026-09-01");
    expect(byId.get("1")?.plannedEnd).toBe("2027-01-15");
    expect(byId.get("1")?.status).toBe("At Risk");
    expect(byId.get("2")?.plannedStart).toBe("2026-10-01");
    expect(byId.get("2")?.plannedEnd).toBe("2026-11-23");
    expect(byId.get("3")?.progress).toBe(50);
    expect(byId.get("4")?.plannedStart).toBe("2026-11-23");
    expect(byId.get("4")?.predecessorIds).toEqual([]);
    expect(byId.get("9")?.description).toBe("<script>alert(1)</script>");
    expect(byId.get("9")?.owner).toBe("Unassigned");
    expect(byId.get("9")?.itemUrl).toBeNull();
    expect(byId.get("9")?.scheduled).toBe(false);
    expect(byId.get("8")?.itemUrl).toContain("contoso.sharepoint.com");
    expect(byId.get("10")?.progress).toBeNull();
    expect(byId.get("10")?.plannedEnd).toBe("2026-10-05");
    expect(result.expandedIds).toEqual(["1"]);
    expect(new Set(result.tasks.map((task) => task.workstream)).size).toBe(15);
    expect(Object.keys(result.palette)).toHaveLength(15);
    expect(result.latestModified).toBe("2026-10-21T00:00:00.000Z");
    expect(result.issues.some((issue) => issue.code === "non-id-predecessor-token")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "unknown-predecessor")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "rejected-item-url")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "invalid-progress")).toBe(true);
  });

  it("accepts alternate headers and one unnamed sheet", async () => {
    const buffer = await buildWorkbook({
      sheetName: "Sheet1",
      headers: ["ID", "Title", "WBS", "Type", "Start", "Finish", "Done", "Status", "Owner"],
      rows: [["7", "Charter", "1", "Task", "2026-10-25", "2026-10-26", 1, "in progress", "AO"]],
    });
    const result = await importWorkbook(buffer, { paletteStorage: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheetName).toBe("Sheet1");
    expect(result.tasks[0]).toMatchObject({
      id: "7",
      taskName: "Charter",
      plannedStart: "2026-10-25",
      progress: 1,
      status: "In Progress",
    });
    expect(result.issues.some((issue) => issue.code === "single-sheet-fallback")).toBe(true);
  });

  it("reads End and URL column names", async () => {
    const buffer = await buildWorkbook({
      headers: ["ID", "Title", "WBS", "TaskType", "Start", "End", "URL"],
      rows: [["1", "Kickoff", "1", "Task", { date: "2026-10-01" }, { date: "2026-10-03" }, "https://contoso.sharepoint.com/sites/p/item"]],
    });
    const allowed = await importWorkbook(buffer, { paletteStorage: null, allowedHosts: HOSTS });
    expect(allowed.ok).toBe(true);
    if (!allowed.ok) return;
    expect(allowed.tasks[0]).toMatchObject({
      plannedStart: "2026-10-01",
      plannedEnd: "2026-10-03",
      scheduled: true,
    });
    expect(allowed.tasks[0]?.itemUrl).toContain("contoso.sharepoint.com");
    const blocked = await importWorkbook(buffer, { paletteStorage: null, allowedHosts: [] });
    expect(blocked.ok).toBe(true);
    if (!blocked.ok) return;
    expect(blocked.tasks[0]?.itemUrl).toBeNull();
    expect(blocked.issues.some((issue) => issue.code === "rejected-item-url")).toBe(true);
  });

  it("rejects structural workbook errors and keeps the issues", async () => {
    const cases: Array<{ name: string; code: string; build: () => Promise<Uint8Array> }> = [
      {
        name: "ambiguous sheets",
        code: "ambiguous-workbook-sheet",
        build: () => buildWorkbook({ sheetName: "One", otherSheets: ["Two"], headers: ["ID"], rows: [] }),
      },
      {
        name: "missing header",
        code: "missing-required",
        build: () => buildWorkbook({ headers: ["ID", "Title"], rows: [["1", "A"]] }),
      },
      {
        name: "cycle",
        code: "cycle",
        build: () =>
          buildWorkbook({
            headers: ["ID", "Task Name", "WBSCode", "ParentTaskID", "TaskType"],
            rows: [
              ["1", "A", "1", 2, "Task"],
              ["2", "B", "2", 1, "Task"],
            ],
          }),
      },
      {
        name: "missing parent",
        code: "missing-parent",
        build: () =>
          buildWorkbook({
            headers: ["ID", "Task Name", "WBSCode", "ParentTaskID", "TaskType"],
            rows: [["1", "A", "1", 9, "Task"]],
          }),
      },
      {
        name: "duplicate id",
        code: "duplicate-id",
        build: () =>
          buildWorkbook({
            headers: ["ID", "Task Name", "WBSCode", "TaskType"],
            rows: [
              ["1", "A", "1", "Task"],
              ["1", "B", "2", "Task"],
            ],
          }),
      },
      {
        name: "duplicate wbs",
        code: "duplicate-wbs",
        build: () =>
          buildWorkbook({
            headers: ["ID", "Task Name", "WBSCode", "TaskType"],
            rows: [
              ["1", "A", "1", "Task"],
              ["2", "B", "1", "Task"],
            ],
          }),
      },
      {
        name: "finish before start",
        code: "unparseable-date",
        build: () =>
          buildWorkbook({
            headers: ["ID", "Task Name", "WBSCode", "TaskType", "Start", "Finish"],
            rows: [["1", "A", "1", "Task", { date: "2026-10-10" }, { date: "2026-10-01" }]],
          }),
      },
      {
        name: "localized date",
        code: "unparseable-date",
        build: () =>
          buildWorkbook({
            headers: ["ID", "Task Name", "WBSCode", "TaskType", "Start", "Finish"],
            rows: [["1", "A", "1", "Task", "10/11/2026", "2026-10-12"]],
          }),
      },
      {
        name: "fictional leap day",
        code: "unparseable-date",
        build: () =>
          buildWorkbook({
            headers: ["ID", "Task Name", "WBSCode", "TaskType", "Start", "Finish"],
            rows: [["1", "A", "1", "Task", { serial: 60 }, { serial: 61 }]],
          }),
      },
    ];
    for (const item of cases) {
      const result = await importWorkbook(await item.build(), { paletteStorage: null });
      expect(result.ok, item.name).toBe(false);
      if (result.ok) continue;
      expect(result.issues.some((issue) => issue.code === item.code), item.name).toBe(true);
    }
  });

  it("rejects corrupt bytes and web queries", async () => {
    const corrupt = await importWorkbook(new Uint8Array([1, 2, 3, 4]), { paletteStorage: null });
    const query = await importWorkbook(new TextEncoder().encode("WEB\n1\nhttps://example"), { paletteStorage: null });
    expect(corrupt.ok).toBe(false);
    expect(query.ok).toBe(false);
    if (!corrupt.ok) expect(corrupt.issues[0]?.code).toBe("unreadable-workbook");
    if (!query.ok) expect(query.issues[0]?.code).toBe("unreadable-workbook");
  });

  it("reads 1900 and 1904 serials, including date1904=\"true\"", async () => {
    const headers = ["ID", "Task Name", "WBSCode", "TaskType", "Start", "Finish"];
    const cases = [
      { date1904: false, dates: ["1900-01-01", "1900-02-28", "1900-03-01", "2026-11-23", "2028-02-29"] },
      { date1904: true, dates: ["1904-01-01", "2026-11-23", "2028-02-29"] },
    ];
    for (const item of cases) {
      const buffer = await buildWorkbook({
        date1904: item.date1904,
        headers,
        rows: item.dates.map((date, index) => [String(index + 1), date, String(index + 1), "Milestone", { date }, null]),
      });
      const result = await importWorkbook(buffer, { paletteStorage: null });
      expect(result.ok, `date1904=${item.date1904}`).toBe(true);
      if (!result.ok) continue;
      expect(result.tasks.map((task) => task.plannedStart)).toEqual(item.dates);
    }

    const original = await buildWorkbook({
      date1904: true,
      headers,
      rows: [["1", "Anchor", "1", "Milestone", { date: "2026-11-23" }, null]],
    });
    const zip = await JSZip.loadAsync(original);
    const xml = await zip.file("xl/workbook.xml")?.async("string");
    expect(xml).toContain('date1904="1"');
    zip.file("xl/workbook.xml", xml?.replace('date1904="1"', 'date1904="true"') ?? "");
    const rewritten = await zip.generateAsync({ type: "uint8array" });
    const result = await importWorkbook(rewritten, { paletteStorage: null });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tasks[0]?.plannedStart).toBe("2026-11-23");
  });

  it("warns when a milestone has two different dates and draws no bar", async () => {
    const result = await importWorkbook(
      await buildWorkbook({
        headers: ["ID", "Task Name", "WBSCode", "TaskType", "Start", "Finish"],
        rows: [["1", "Gate", "1", "Milestone", { date: "2026-11-23" }, { date: "2026-11-24" }]],
      }),
      { paletteStorage: null },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tasks[0]?.scheduled).toBe(false);
    expect(result.issues.some((issue) => issue.code === "milestone-date-mismatch")).toBe(true);
  });

  it("enables HTTPS links on the approved SharePoint host", () => {
    expect(sanitizeItemUrl("https://pmicloud.sharepoint.com/sites/p/Lists/WBS/DispForm.aspx?ID=1", SHAREPOINT_HOSTS)).toBe(
      "https://pmicloud.sharepoint.com/sites/p/Lists/WBS/DispForm.aspx?ID=1",
    );
    expect(sanitizeItemUrl("https://PMICLOUD.sharepoint.com/sites/p/item", SHAREPOINT_HOSTS)).toBe(
      "https://pmicloud.sharepoint.com/sites/p/item",
    );
    expect(sanitizeItemUrl("https://contoso.sharepoint.com/item", [])).toBeNull();
    expect(sanitizeItemUrl("http://pmicloud.sharepoint.com/sites/p/item", SHAREPOINT_HOSTS)).toBeNull();
    expect(sanitizeItemUrl("https://evil.pmicloud.sharepoint.com/item", SHAREPOINT_HOSTS)).toBeNull();
    expect(sanitizeItemUrl("https://pmicloud.sharepoint.com.evil.example/item", SHAREPOINT_HOSTS)).toBeNull();
    expect(sanitizeItemUrl("https://user:pass@pmicloud.sharepoint.com/item", SHAREPOINT_HOSTS)).toBeNull();
    expect(sanitizeItemUrl("javascript:alert(1)", HOSTS)).toBeNull();
  });
});
