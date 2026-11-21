import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { prepareProjectOnboarding } from "../../src/managed/projectOnboarding";
import { starterTemplateCatalog } from "../../src/managed/starterProjectTemplates";

const id = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;

describe("Stage C project onboarding preparation", () => {
  it("prepares a verified empty scratch workbook and routes it to native open", async () => {
    const scratch = await prepareProjectOnboarding({
      route: "scratch",
      project: {
        projectId: id(1), projectName: "Fictional project", changeSetId: id(2),
        timestampUTC: "2026-11-19T00:00:00.000Z", actorLabel: "Synthetic PM", appVersion: "test",
      },
    });
    if (scratch.route !== "scratch") throw new Error("Expected scratch candidate");
    expect(scratch.candidate).toMatchObject({ kind: "blank-candidate", taskCount: 0, schemaVersion: "0.1.2" });
    expect(await prepareProjectOnboarding({
      route: "import", source: scratch.candidate.bytes, sheet: "ProjectWBS", generatedIds: {},
    })).toEqual({ route: "import", result: { kind: "native-workbook" } });
  });

  it("returns one import draft per source item and preserves the original Excel bytes", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Source plan");
    sheet.addRow(["Title", "WBS", "Owner"]);
    sheet.addRow(["Delivery", "1", ""]);
    sheet.addRow(["Confirm scope", "1.1", "Synthetic owner"]);
    workbook.addWorksheet("Notes").addRow(["Unselected sheet"]);
    const source = new Uint8Array(await workbook.xlsx.writeBuffer());
    const original = source.slice();
    const request = { route: "import", source, generatedIds: { 2: id(1), 3: id(2) } } as const;
    expect(await prepareProjectOnboarding(request)).toEqual({
      route: "import", result: { kind: "choose-sheet", names: ["Source plan", "Notes"] },
    });
    const selected = await prepareProjectOnboarding({ ...request, sheet: "Source plan" });
    expect(selected).toMatchObject({
      route: "import",
      result: {
        kind: "preview", corePreviewValid: true, persistenceReady: false, sourceItemCount: 2,
        normalized: { drafts: [
          expect.objectContaining({ id: id(1), taskType: "Summary" }),
          expect.objectContaining({ id: id(2), parentId: id(1), owner: "Synthetic owner" }),
        ] },
      },
    });
    expect(source).toEqual(original);
  });

  it.each(starterTemplateCatalog)("prepares $name through the shared creator", async template => {
    let sequence = 0;
    const result = await prepareProjectOnboarding({
      route: "template", templateId: template.id, milestoneDate: "2026-12-20",
      generateId: () => id(++sequence),
    });
    if (result.route !== "template" || !result.preview.ok) throw new Error("Expected a valid template preview");
    expect(result.persistenceReady).toBe(false);
    const { drafts } = result.preview;
    expect(drafts).toHaveLength(template.itemCount);
    expect([...new Set(drafts.map(task => task.workstream))]).toEqual(template.workstreams);
    expect(new Set(drafts.map(task => task.id)).size).toBe(drafts.length);
    expect(new Set(drafts.map(task => task.wbsCode)).size).toBe(drafts.length);
    for (const [index, task] of drafts.entries()) {
      const earlier = drafts.slice(0, index);
      expect(task.sourceTaskStatus).toBe("Not Started");
      if (task.parentId) {
        const parent = earlier.find(row => row.id === task.parentId);
        expect(parent?.taskType).toBe("Summary");
        expect(task.wbsCode.startsWith(parent!.wbsCode + ".")).toBe(true);
      }
      for (const before of task.predecessorIds) expect(earlier.some(row => row.id === before)).toBe(true);
    }
    expect(drafts.some(task => task.parentId)).toBe(true);
    expect(drafts.some(task => task.predecessorIds.length)).toBe(true);
    if (template.requiresMilestoneDate) {
      expect(drafts.find(task => task.taskType === "Milestone")).toMatchObject({
        plannedStart: "2026-12-20", plannedEnd: "2026-12-20",
      });
    }
  });

  it("returns actionable errors for a missing milestone date or repeated generated ID", async () => {
    expect(await prepareProjectOnboarding({ route: "template", templateId: "milestone-led-delivery" }))
      .toMatchObject({ preview: { ok: false, item: "ready", errors: ["Milestone requires a date."] } });
    expect(await prepareProjectOnboarding({
      route: "template", templateId: "simple-project", generateId: () => id(1),
    })).toMatchObject({
      preview: { ok: false, item: "plan", errors: expect.arrayContaining(["TaskID already exists."]) },
    });
  });
});
