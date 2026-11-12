import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildManagedCandidate } from "../../src/managed/workbookCandidate";
import { captureManagedSourceHash, managedFileNames, saveManagedAsCopy, saveManagedDirect, sha256 } from "../../src/managed/directSave";
import { inspectProjectData } from "../../src/managed/projectDataInspector";

/** F3 synthetic-only guard proof. No project-data mutation or migration writer. */
const ID = "bf17c684-d896-423c-8a37-eb263e04dd21";
const BLACKOUT = "7e4d09da-832e-4647-9202-8cbb8f8704d2";
const TIME = "2026-11-12T02:00:00.000Z";
const NAME = "Plan.xlsx";
type FixtureKind = "legacy" | "valid" | "partial" | "future" | "invalid-name" | "invalid-blackout" | "orphan-watch";
const TRANSACTION = { appVersion: "f3-spike", changeSetId: ID, timestampUTC: TIME, taskId: "1" };

async function make(kind: FixtureKind): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  const tasks = book.addWorksheet("ProjectWBS");
  tasks.addRow(["ID", "Title", "WBSCode", "TaskType", "Progress", "TaskStatus", "PlannedStart", "PlannedEnd", "Updates"]);
  tasks.addRow([1, "Before", "1", "Task", 10, "In Progress", "2026-11-02", "2026-12-24", "Existing note"]);
  if (kind !== "legacy") {
    const meta = book.addWorksheet("ProjectMeta");
    meta.addRow(["Key", "Value"]);
    meta.addRow(["ProjectID", "bd95a399-257e-4b42-ac0e-fb6ee984c1aa"]);
    meta.addRow(["ProjectName", kind === "invalid-name" ? "" : "Tokyo & Global Launch"]);
    meta.addRow(["ProjectDataSchemaVersion", kind === "future" ? "9.0.0" : "0.1.2"]);
    if (kind !== "partial") {
      const cal = book.addWorksheet("ProjectCalendar");
      cal.addRow(["BlackoutID", "Enabled", "StartDate", "EndDate", "Label", "ModifiedUTC", "CustomField"]);
      cal.addRow([BLACKOUT, true, "2026-12-18", "2026-12-21", "Project closure", TIME, "retain me"]);
      if (kind === "invalid-blackout") cal.addRow(["ed58f70a-126e-4dce-ace1-b578dc5c290e", true, "2026-12-25", "2026-12-27", "", TIME, "also retain"]);
      const watch = book.addWorksheet("WatchReasons");
      watch.addRow(["ReasonID", "TaskID", "Origin", "RuleCode", "State", "Title", "Details", "EvidenceRef",
        "OpenedUTC", "OpenedBy", "LastReviewedUTC", "ResolvedUTC", "ResolvedBy", "ResolutionNote"]);
      if (kind === "orphan-watch") watch.addRow(["1b61cc8b-1882-40a0-980e-6923712a5a06", "999", "Manual", null, "Open",
        "Missing task", null, null, TIME, "Unverified", null, null, null, null]);
      book.addWorksheet("ProjectCommitments").addRow(["CommitmentID", "TaskID", "AcceptedFinishDate", "AcceptedUTC",
        "AcceptedBy", "PreviousCommitmentID", "Rationale", "EvidenceRef"]);
      book.addWorksheet("ProjectAudit").addRow(["EventID", "ChangeSetID", "TimestampUTC", "EntityType", "EntityID",
        "TaskID", "Action", "Field", "OldValue", "NewValue", "ActorLabel", "ActorProvenance", "Source", "AppVersion"]);
    }
  }
  return new Uint8Array(await book.xlsx.writeBuffer());
}
async function opened(bytes: Uint8Array) {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return b;
}

class Directory {
  readonly files = new Map<string, Uint8Array>();
  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    if (!this.files.has(name)) {
      if (!options.create) throw Object.assign(new Error("Missing"), { name: "NotFoundError" });
      this.files.set(name, new Uint8Array());
    }
    const parent = this;
    return {
      async getFile() { return { async arrayBuffer() { return Uint8Array.from(parent.files.get(name)!).buffer; } }; },
      async createWritable() {
        let pending = new Uint8Array();
        return {
          async write(bytes: Uint8Array) { pending = Uint8Array.from(bytes); },
          async close() { parent.files.set(name, pending); },
        };
      },
    };
  }
  async removeEntry(name: string) {
    if (!this.files.delete(name)) throw Object.assign(new Error("Missing"), { name: "NotFoundError" });
  }
  handle(): FileSystemDirectoryHandle { return this as unknown as FileSystemDirectoryHandle; }
}
async function dirWith(kind: FixtureKind) {
  const dir = new Directory();
  dir.files.set(NAME, await make(kind));
  return dir;
}
async function candidate(bytes: Uint8Array, title = "After") {
  return buildManagedCandidate({ ...TRANSACTION, source: bytes, changes: { Title: title } });
}

describe("F3: existing task Save paths protect ProjectData domain (synthetic-only)", () => {
  it("legacy v1 task edit remains allowed; no project sheet auto-created", async () => {
    const out = await candidate(await make("legacy"));
    expect(out.kind).toBe("candidate");
    if (out.kind !== "candidate") return;
    const b = await opened(out.bytes);
    expect(inspectProjectData(b).kind).toBe("legacy");
    expect(b.getWorksheet("ProjectMeta")).toBeUndefined();
    expect(b.getWorksheet("UpdateHistory")!.rowCount).toBe(2);
  });

  it("valid five-sheet workbook task edit survives before/after domain validation and retains custom fields", async () => {
    const before = await make("valid");
    const hash = await sha256(before);
    const out = await candidate(before);
    expect(out.kind).toBe("candidate");
    if (out.kind !== "candidate") return;
    const b = await opened(out.bytes);
    expect(inspectProjectData(b).kind).toBe("valid");
    expect(b.getWorksheet("ProjectWBS")!.getCell("B2").value).toBe("After");
    expect(b.getWorksheet("ProjectMeta")!.getCell("B3").value).toBe("Tokyo & Global Launch");
    expect(b.getWorksheet("ProjectCalendar")!.getCell("G2").value).toBe("retain me");
    expect(b.getWorksheet("UpdateHistory")!.rowCount).toBe(2);
    expect(b.getWorksheet("ProjectAudit")!.rowCount).toBe(1);
    expect(await sha256(before)).toBe(hash);
  });

  it("partial project extension blocks even a task-only no-op before candidate mutation", async () => {
    const source = await make("partial");
    await expect(candidate(source)).rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    await expect(candidate(source, "Before")).rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    const b = await opened(source);
    expect(b.getWorksheet("UpdateHistory")).toBeUndefined();
    expect(b.getWorksheet("ProjectCalendar")).toBeUndefined();
  });

  it("future extension never silently downgrades or writes through existing task editor", async () => {
    await expect(candidate(await make("future"))).rejects.toMatchObject({
      code: "UNSUPPORTED_PROJECT_DATA_VERSION",
    });
  });

  it("invalid ProjectName, conflicting enabled blackouts and Watch orphan each block task Save", async () => {
    for (const kind of ["invalid-name", "invalid-blackout", "orphan-watch"] as const) {
      await expect(candidate(await make(kind))).rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    }
  });

  it("direct Save refuses partial extension without staging, pending, backup or source mutation", async () => {
    const dir = await dirWith("partial");
    const before = Uint8Array.from(dir.files.get(NAME)!);
    await expect(saveManagedDirect({
      directory: dir.handle(), sourceName: NAME, loadedHash: await captureManagedSourceHash(dir.handle(), NAME),
      ...TRANSACTION, changes: { Title: "Never written" },
    })).rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    expect(dir.files.get(NAME)).toEqual(before);
    expect(dir.files.size).toBe(1);
    const names = managedFileNames(NAME);
    expect(dir.files.has(names.stage)).toBe(false);
    expect(dir.files.has(names.transaction)).toBe(false);
    expect(dir.files.has(names.backup)).toBe(false);
  });

  it("Save As with no task edits still blocks partial extension, creates no destination or stage", async () => {
    const dir = await dirWith("partial");
    const original = Uint8Array.from(dir.files.get(NAME)!);
    await expect(saveManagedAsCopy({
      directory: dir.handle(), sourceName: NAME, destinationName: "Unsafe-copy.xlsx",
      loadedBytes: original, loadedHash: await sha256(original),
      ...TRANSACTION, changes: {},
    })).rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    expect(dir.files.get(NAME)).toEqual(original);
    expect(dir.files.size).toBe(1);
    expect(dir.files.has("Unsafe-copy.xlsx")).toBe(false);
    expect(dir.files.has("Unsafe-copy.stage.xlsx")).toBe(false);
  });

  it("Save As with edits also blocks unsupported future schema before creating any destination", async () => {
    const dir = await dirWith("future");
    const original = Uint8Array.from(dir.files.get(NAME)!);
    await expect(saveManagedAsCopy({
      directory: dir.handle(), sourceName: NAME, destinationName: "Future-copy.xlsx",
      loadedBytes: original, loadedHash: await sha256(original),
      ...TRANSACTION, changes: { Title: "Never copied" },
    })).rejects.toMatchObject({ code: "UNSUPPORTED_PROJECT_DATA_VERSION" });
    expect(dir.files.size).toBe(1);
    expect(dir.files.get(NAME)).toEqual(original);
  });

  it("direct Save with valid extension verifies backup, source, and unchanged project facts", async () => {
    const dir = await dirWith("valid");
    const original = Uint8Array.from(dir.files.get(NAME)!);
    const loadedHash = await captureManagedSourceHash(dir.handle(), NAME);
    const out = await saveManagedDirect({
      directory: dir.handle(), sourceName: NAME, loadedHash, ...TRANSACTION,
      changes: { Title: "Verified" },
    });
    expect(out.kind).toBe("saved");
    if (out.kind !== "saved") return;
    const names = managedFileNames(NAME);
    expect(await sha256(dir.files.get(names.backup)!)).toBe(await sha256(original));
    const committed = await opened(dir.files.get(NAME)!);
    expect(inspectProjectData(committed).kind).toBe("valid");
    expect(committed.getWorksheet("ProjectMeta")!.getCell("B3").value).toBe("Tokyo & Global Launch");
    expect(committed.getWorksheet("ProjectCalendar")!.getCell("G2").value).toBe("retain me");
    expect(committed.getWorksheet("ProjectWBS")!.getCell("B2").value).toBe("Verified");
    expect(committed.getWorksheet("ProjectAudit")!.rowCount).toBe(1);
  });

  it("Save As of a valid unmodified project preserves all five sheets without inventing task history", async () => {
    const dir = await dirWith("valid");
    const original = Uint8Array.from(dir.files.get(NAME)!);
    const out = await saveManagedAsCopy({
      directory: dir.handle(), sourceName: NAME, destinationName: "Valid-copy.xlsx",
      loadedBytes: original, loadedHash: await sha256(original),
      ...TRANSACTION, changes: {},
    });
    expect(out.kind).toBe("saved-copy");
    expect(out.changeSetId).toBeNull();
    const copy = await opened(dir.files.get("Valid-copy.xlsx")!);
    expect(inspectProjectData(copy).kind).toBe("valid");
    expect(copy.getWorksheet("ProjectMeta")!.getCell("B3").value).toBe("Tokyo & Global Launch");
    expect(copy.getWorksheet("UpdateHistory")).toBeUndefined();
    expect(dir.files.get(NAME)).toEqual(original);
  });
});
