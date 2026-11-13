import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { inspectProjectData } from "../../src/managed/projectDataInspector";
import { projectWatchProjection } from "../../src/managed/watchProjection";
import { buildProjectDataCandidate } from "../../src/managed/projectDataCandidate";
import { saveManagedProjectDirect, sha256 } from "../../src/managed/directSave";

const FILE = "TimelineProject.xlsx";
const PROJECT = "bd95a399-257e-4b42-ac0e-fb6ee984c1aa";
const REASON = "7e4d09da-832e-4647-9202-8cbb8f8704d2";
const OTHER_REASON = "ed58f70a-126e-4dce-ace1-b578dc5c290e";
const TX0 = "c6dbf481-6868-48b7-b9b5-8726be2e2561";
const TX1 = "b013abb5-a99a-4c1d-9f43-74da7dbb0fd0";
const TX2 = "10ab74bf-112a-4b2e-b6d1-262a87783a98";
const TX3 = "16f24730-9df2-425b-9a94-b54b4f24c90d";
const T0 = "2026-11-12T00:00:00.000Z";
const T1 = "2026-11-12T01:00:00.000Z";
const T2 = "2026-11-12T02:00:00.000Z";
const T3 = "2026-11-12T03:00:00.000Z";

async function book(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return b;
}
async function legacy(): Promise<Uint8Array> {
  const b = new ExcelJS.Workbook();
  const w = b.addWorksheet("ProjectWBS");
  w.addRow(["ID", "Title", "WBSCode", "TaskType", "TaskStatus", "PlannedEnd"]);
  w.addRow([1, "Supplier inspection", "1", "Task", "In Progress", "2026-11-30"]);
  b.addWorksheet("CustomerCustom").addRow(["Owner", "Preserve customer value"]);
  return new Uint8Array(await b.xlsx.writeBuffer());
}
async function mutation(
  bytes: Uint8Array,
  edit: Parameters<typeof buildProjectDataCandidate>[0]["edit"],
  changeSetId: string, timestampUTC: string,
): Promise<Uint8Array> {
  const candidate = await buildProjectDataCandidate({
    source: bytes, edit, changeSetId, timestampUTC,
    actorLabel: "Unverified test actor", appVersion: "f6b-qa",
  });
  if (candidate.kind !== "candidate") throw new Error("Expected changed candidate");
  return candidate.bytes;
}
async function openReason(): Promise<Uint8Array> {
  const initialized = await mutation(await legacy(), {
    kind: "initialize", projectId: PROJECT, projectName: "Timeline QA",
  }, TX0, T0);
  return mutation(initialized, {
    kind: "add-watch-reason", reasonId: REASON, taskId: "1",
    title: "Open supplier risk", details: "Independent stakeholder observation",
  }, TX1, T1);
}
async function resolvedReason(): Promise<Uint8Array> {
  return mutation(await openReason(), {
    kind: "resolve-watch-reason", reasonId: REASON, resolutionNote: "Completed follow-up",
  }, TX2, T2);
}
async function corrupted(
  bytes: Uint8Array, field: "K2" | "L2", value: string,
): Promise<Uint8Array> {
  const b = await book(bytes);
  b.getWorksheet("WatchReasons")!.getCell(field).value = value;
  return new Uint8Array(await b.xlsx.writeBuffer());
}
const errors = async (bytes: Uint8Array) => {
  const inspection = inspectProjectData(await book(bytes));
  return inspection.kind === "incompatible" ? inspection.findings.map(f => f.code) : [];
};
const addAnother = {
  kind: "add-watch-reason" as const,
  reasonId: OTHER_REASON, taskId: "1", title: "Another risk",
};

describe("F6b — imported Watch timestamp chronology is fail-closed", () => {
  it("accepts valid writer-created Open and Resolved reason chronologies", async () => {
    const open = await openReason();
    const resolved = await resolvedReason();
    expect(inspectProjectData(await book(open)).kind).toBe("valid");
    expect(inspectProjectData(await book(resolved)).kind).toBe("valid");
    expect((await projectWatchProjection(open)).tasks[0].disposition).toBe("Under Watch");
    expect((await projectWatchProjection(resolved)).tasks[0].disposition).toBe("Unknown");
  });

  it("refuses externally changed ResolvedUTC earlier than OpenedUTC", async () => {
    const bad = await corrupted(await resolvedReason(), "L2", T0);
    expect(await errors(bad)).toContain("WATCH_TIME_ORDER");
    const p = await projectWatchProjection(bad);
    expect(p.workbookState).toBe("incompatible");
    expect(p.tasks).toEqual([]);
    await expect(mutation(bad, addAnother, TX3, T3))
      .rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
  });

  it("refuses LastReviewedUTC earlier than OpenedUTC for still Open reason", async () => {
    const bad = await corrupted(await openReason(), "K2", T0);
    expect(await errors(bad)).toContain("WATCH_TIME_ORDER");
    const p = await projectWatchProjection(bad);
    expect(p.workbookState).toBe("incompatible");
    expect(p.tasks).toEqual([]);
  });

  it("refuses LastReviewedUTC earlier than OpenedUTC for Resolved reason", async () => {
    const bad = await corrupted(await resolvedReason(), "K2", T0);
    expect(await errors(bad)).toContain("WATCH_TIME_ORDER");
  });

  it("accepts reviewed/resolved time equal to opening: zero-duration episode is valid", async () => {
    const b = await book(await resolvedReason());
    b.getWorksheet("WatchReasons")!.getCell("K2").value = T1;
    b.getWorksheet("WatchReasons")!.getCell("L2").value = T1;
    const equal = new Uint8Array(await b.xlsx.writeBuffer());
    expect(inspectProjectData(await book(equal)).kind).toBe("valid");
  });

  it("rejects tampered chronology before creating any stage/backup/audit sidecars", async () => {
    const bad = await corrupted(await resolvedReason(), "L2", T0);
    const original = Uint8Array.from(bad);
    const files = new Map<string, Uint8Array>([[FILE, bad]]);
    const directory = {
      async getFileHandle(name: string, options: { create?: boolean } = {}) {
        if (!files.has(name)) {
          if (!options.create) throw Object.assign(new Error("Missing"), { name: "NotFoundError" });
          files.set(name, new Uint8Array());
        }
        return {
          async getFile() { return { async arrayBuffer() { return Uint8Array.from(files.get(name)!).buffer; } }; },
          async createWritable() {
            let pending = new Uint8Array();
            return {
              async write(next: Uint8Array) { pending = Uint8Array.from(next); },
              async close() { files.set(name, pending); },
            };
          },
        };
      },
      async removeEntry(name: string) { files.delete(name); },
    } as unknown as FileSystemDirectoryHandle;
    await expect(saveManagedProjectDirect({
      directory, sourceName: FILE, loadedHash: await sha256(bad),
      edit: addAnother, changeSetId: TX3, timestampUTC: T3,
      actorLabel: "Unverified test actor", appVersion: "f6b-qa",
    })).rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    expect(files.size).toBe(1);
    expect(files.get(FILE)).toEqual(original);
    expect((await book(bad)).getWorksheet("ProjectAudit")!.rowCount).toBeGreaterThan(1);
    expect((await book(bad)).getWorksheet("CustomerCustom")!.getCell("B1").value)
      .toBe("Preserve customer value");
  });
});
