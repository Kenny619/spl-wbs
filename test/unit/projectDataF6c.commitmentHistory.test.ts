import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { inspectProjectData } from "../../src/managed/projectDataInspector";
import { projectCommitmentProjection } from "../../src/managed/commitmentProjection";
import { saveManagedProjectDirect, sha256 } from "../../src/managed/directSave";

const IDs = {
  project: "bd95a399-257e-4b42-ac0e-fb6ee984c1aa",
  first: "7e4d09da-832e-4647-9202-8cbb8f8704d2",
  second: "ed58f70a-126e-4dce-ace1-b578dc5c290e",
  third: "10ab74bf-112a-4b2e-b6d1-262a87783a98",
  fourth: "d0d36c0a-1e36-4c4a-8c45-67292839efaa",
  audit: "43f416bf-33f4-4a32-aa46-7e0945561faa",
  tx: "c6dbf481-6868-48b7-b9b5-8726be2e2561",
};
const T1 = "2026-11-12T01:00:00.000Z";
const T2 = "2026-11-12T02:00:00.000Z";
const T3 = "2026-11-12T03:00:00.000Z";
const T4 = "2026-11-12T04:00:00.000Z";
type Input = {
  id: string; task?: string; time?: string;
  prior?: string | null; finish?: string; actor?: string;
};
const committed = (id = IDs.first, options: Partial<Input> = {}): Input => ({ id, ...options });

async function fixture(rows: Input[] = [], withExtension = true): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  const wbs = book.addWorksheet("ProjectWBS");
  wbs.addRow(["ID", "Title", "WBSCode", "TaskType", "TaskStatus", "PlannedEnd", "CustomerInfo"]);
  wbs.addRow([1, "Primary workstream", "1", "Task", "In Progress", "2026-12-01", "Preserve me"]);
  wbs.addRow([2, "Secondary workstream", "2", "Task", "Completed", "2026-12-02", "Other"]);
  book.addWorksheet("CustomerCustom").addRow(["Saved", "Customer record"]);
  if (withExtension) {
    const meta = book.addWorksheet("ProjectMeta");
    meta.addRow(["Key", "Value"]);
    meta.addRow(["ProjectID", IDs.project]);
    meta.addRow(["ProjectName", "Worldwide Operations"]);
    meta.addRow(["ProjectDataSchemaVersion", "0.1.2"]);
    book.addWorksheet("ProjectCalendar").addRow([
      "BlackoutID", "Enabled", "StartDate", "EndDate", "Label", "ModifiedUTC",
    ]);
    book.addWorksheet("WatchReasons").addRow([
      "ReasonID", "TaskID", "Origin", "RuleCode", "State", "Title", "Details",
      "EvidenceRef", "OpenedUTC", "OpenedBy", "LastReviewedUTC",
      "ResolvedUTC", "ResolvedBy", "ResolutionNote",
    ]);
    const commits = book.addWorksheet("ProjectCommitments");
    commits.addRow(["CommitmentID", "TaskID", "AcceptedFinishDate", "AcceptedUTC", "AcceptedBy",
      "PreviousCommitmentID", "Rationale", "EvidenceRef"]);
    for (const rec of rows) {
      commits.addRow([rec.id, rec.task ?? "1", rec.finish ?? "2026-12-01",
        rec.time ?? T1, rec.actor ?? "Unverified actor", rec.prior ?? null,
        "Stakeholder note only, not verified authorization", "Reference document"]);
    }
    const audit = book.addWorksheet("ProjectAudit");
    audit.addRow(["EventID", "ChangeSetID", "TimestampUTC", "EntityType", "EntityID", "TaskID",
      "Action", "Field", "OldValue", "NewValue", "ActorLabel", "ActorProvenance",
      "Source", "AppVersion"]);
    if (rows.length) {
      const first = rows[0];
      audit.addRow([IDs.audit, IDs.tx, first.time ?? T1,
        "Commitment", first.id, first.task ?? "1", "AcceptCommitment",
        "AcceptedFinishDate", "", first.finish ?? "2026-12-01",
        first.actor ?? "Unverified actor", "UnverifiedLocal", "Web UI", "f6c-fixture"]);
    }
  }
  return new Uint8Array(await book.xlsx.writeBuffer());
}
async function workbook(bytes: Uint8Array) {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  return b;
}
const findings = async (source: Uint8Array) => {
  const result = inspectProjectData(await workbook(source));
  return result.kind === "incompatible" ? result.findings.map(x => x.code) : [];
};

describe("F6c: conservative Excel-recorded commitment histories (NOT approval authority)", () => {
  it("keeps a true legacy workbook unconfigured with no invented acceptance", async () => {
    const projection = await projectCommitmentProjection(await fixture([], false));
    expect(projection).toEqual({
      workbookState: "legacy", projectName: null, tasks: [],
      findings: [], schemaValidated: false,
    });
  });

  it("valid five-sheet workbook without any commitment is Unconfirmed, not silently baseline", async () => {
    const projection = await projectCommitmentProjection(await fixture());
    expect(projection.workbookState).toBe("valid");
    expect(projection.projectName).toBe("Worldwide Operations");
    expect(projection.tasks.map(t => ({
      taskId: t.taskId, disposition: t.disposition,
      latest: t.latestRecorded, authorityVerified: t.acceptanceAuthorityVerified,
    }))).toEqual([
      { taskId: "1", disposition: "Unconfirmed", latest: null, authorityVerified: false },
      { taskId: "2", disposition: "Unconfirmed", latest: null, authorityVerified: false },
    ]);
  });

  it("one recorded commitment has a structural audit pointer but no authenticated authority", async () => {
    const data = await fixture([committed()]);
    const copy = Uint8Array.from(data);
    const projection = await projectCommitmentProjection(data);
    const record = projection.tasks[0].latestRecorded;
    expect(projection.workbookState).toBe("valid");
    expect(projection.tasks[0].disposition).toBe("Recorded (unverified)");
    expect(projection.tasks[0].acceptanceAuthorityVerified).toBe(false);
    expect(record).toMatchObject({
      commitmentId: IDs.first, acceptedUTC: T1,
      acceptedBy: "Unverified actor", acceptedFinishDate: "2026-12-01",
      previousCommitmentId: null, hasRecordedProjectAudit: true,
    });
    expect(projection.tasks[1].latestRecorded).toBeNull();
    expect(data).toEqual(copy);
  });

  it("two sequential revisions form a deterministically ordered immutable history", async () => {
    const data = await fixture([
      committed(IDs.first, { time: T1, finish: "2026-12-01" }),
      committed(IDs.second, {
        prior: IDs.first, time: T2, finish: "2026-12-05", actor: "Another unverified editor",
      }),
    ]);
    const projection = await projectCommitmentProjection(data);
    expect(projection.workbookState).toBe("valid");
    expect(projection.tasks[0].records.map(r => r.commitmentId)).toEqual([IDs.first, IDs.second]);
    expect(projection.tasks[0].latestRecorded).toMatchObject({
      commitmentId: IDs.second, previousCommitmentId: IDs.first,
      acceptedFinishDate: "2026-12-05", hasRecordedProjectAudit: false,
    });
    expect(projection.tasks[0].acceptanceAuthorityVerified).toBe(false);
  });

  it("task-specific commitments remain isolated; one task completion cannot approve another", async () => {
    const data = await fixture([
      committed(IDs.first, { task: "1", time: T1 }),
      committed(IDs.second, { task: "2", time: T2 }),
    ]);
    const projection = await projectCommitmentProjection(data);
    expect(projection.tasks[0].records.map(r => r.taskId)).toEqual(["1"]);
    expect(projection.tasks[1].records.map(r => r.taskId)).toEqual(["2"]);
    expect(projection.tasks.every(t => t.acceptanceAuthorityVerified === false)).toBe(true);
  });

  it("rejects competing first commitments for a single task rather than selecting an arbitrary latest", async () => {
    const data = await fixture([
      committed(IDs.first, { time: T1 }),
      committed(IDs.second, { time: T2 }),
    ]);
    expect(await findings(data)).toContain("MULTIPLE_COMMITMENT_ROOTS");
    const projection = await projectCommitmentProjection(data);
    expect(projection.workbookState).toBe("incompatible");
    expect(projection.tasks).toEqual([]);
  });

  it("rejects divergent successors referencing the same prior record", async () => {
    const data = await fixture([
      committed(IDs.first, { time: T1 }),
      committed(IDs.second, { prior: IDs.first, time: T2 }),
      committed(IDs.third, { prior: IDs.first, time: T3 }),
    ]);
    expect(await findings(data)).toContain("FORKED_COMMITMENT_CHAIN");
    expect((await projectCommitmentProjection(data)).tasks).toEqual([]);
  });

  it("refuses successor AcceptedUTC earlier or equal to predecessor AcceptedUTC", async () => {
    for (const when of [T1, "2026-11-12T00:00:00.000Z"]) {
      const data = await fixture([
        committed(IDs.first, { time: T1 }),
        committed(IDs.second, { prior: IDs.first, time: when }),
      ]);
      expect(await findings(data)).toContain("COMMITMENT_TIME_ORDER");
      expect((await projectCommitmentProjection(data)).workbookState).toBe("incompatible");
    }
  });

  it("rejects an orphan, cross-task predecessor or cyclic history without selecting baseline", async () => {
    const missing = await fixture([
      committed(IDs.first, { prior: IDs.fourth }),
    ]);
    expect(await findings(missing)).toContain("UNKNOWN_PRIOR");
    const crossTask = await fixture([
      committed(IDs.first, { task: "1", time: T1 }),
      committed(IDs.second, { task: "2", prior: IDs.first, time: T2 }),
    ]);
    expect(await findings(crossTask)).toContain("UNKNOWN_PRIOR");
    const cycle = await fixture([
      committed(IDs.first, { prior: IDs.second, time: T1 }),
      committed(IDs.second, { prior: IDs.first, time: T2 }),
    ]);
    expect(await findings(cycle)).toContain("COMMITMENT_CYCLE");
  });

  it("partial/future extension never implies zero recorded commitments or an accepted baseline", async () => {
    const b = await workbook(await fixture([], false));
    b.addWorksheet("ProjectCommitments").addRow(["CommitmentID", "TaskID"]);
    const partial = await projectCommitmentProjection(new Uint8Array(await b.xlsx.writeBuffer()));
    expect(partial.workbookState).toBe("incompatible");
    expect(partial.schemaValidated).toBe(false);
    expect(partial.tasks).toEqual([]);
    const futureBook = await workbook(await fixture());
    futureBook.getWorksheet("ProjectMeta")!.getCell("B4").value = "9.0.0";
    const future = await projectCommitmentProjection(new Uint8Array(await futureBook.xlsx.writeBuffer()));
    expect(future.workbookState).toBe("unsupported_future");
    expect(future.tasks).toEqual([]);
  });

  it("invalid imported commitment fork fails guarded project Save before source/stage/backup changes", async () => {
    const source = await fixture([
      committed(IDs.first, { time: T1 }),
      committed(IDs.second, { prior: IDs.first, time: T2 }),
      committed(IDs.third, { prior: IDs.first, time: T3 }),
    ]);
    const files = new Map<string, Uint8Array>([["Project.xlsx", source]]);
    const directory = {
      async getFileHandle(filename: string, options: { create?: boolean } = {}) {
        if (!files.has(filename)) {
          if (!options.create) throw Object.assign(new Error("missing"), { name: "NotFoundError" });
          files.set(filename, new Uint8Array());
        }
        return {
          async getFile() { return { async arrayBuffer() { return Uint8Array.from(files.get(filename)!).buffer; } }; },
          async createWritable() {
            let next = new Uint8Array();
            return {
              async write(data: Uint8Array) { next = Uint8Array.from(data); },
              async close() { files.set(filename, next); },
            };
          },
        };
      },
      async removeEntry(filename: string) { files.delete(filename); },
    } as unknown as FileSystemDirectoryHandle;
    const originalHash = await sha256(source);
    await expect(saveManagedProjectDirect({
      directory, sourceName: "Project.xlsx", loadedHash: originalHash,
      edit: {
        kind: "add-watch-reason",
        reasonId: IDs.fourth, taskId: "1", title: "Must not write",
      },
      changeSetId: IDs.tx, timestampUTC: T4,
      actorLabel: "Unverified actor", appVersion: "f6c-test",
    })).rejects.toMatchObject({ code: "INVALID_PROJECT_DATA" });
    expect(files.size).toBe(1);
    expect(files.get("Project.xlsx")).toEqual(source);
    expect(await sha256(files.get("Project.xlsx")!)).toBe(originalHash);
    expect((await workbook(source)).getWorksheet("CustomerCustom")!.getCell("B1").value)
      .toBe("Customer record");
  });

  // F6d: audit/entity references are not permission or identity verification.
  it("F6d rejects a commitment audit assigned to a different existing TaskID", async () => {
    const b = await workbook(await fixture([committed()]));
    b.getWorksheet("ProjectAudit")!.getCell("F2").value = "2";
    const data = new Uint8Array(await b.xlsx.writeBuffer());
    expect(await findings(data)).toContain("AUDIT_TASK_MISMATCH");
    const projection = await projectCommitmentProjection(data);
    expect(projection.workbookState).toBe("incompatible");
    expect(projection.tasks).toEqual([]);
  });

  it("F6d rejects a commitment audit pointing to a missing commitment ID", async () => {
    const b = await workbook(await fixture([committed()]));
    b.getWorksheet("ProjectAudit")!.getCell("E2").value = IDs.fourth;
    const data = new Uint8Array(await b.xlsx.writeBuffer());
    expect(await findings(data)).toContain("UNKNOWN_AUDIT_ENTITY");
    expect((await projectCommitmentProjection(data)).tasks).toEqual([]);
  });

  it("F6d rejects invented verified actor provenance instead of trusting it", async () => {
    const b = await workbook(await fixture([committed()]));
    b.getWorksheet("ProjectAudit")!.getCell("L2").value = "VerifiedSSO";
    const data = new Uint8Array(await b.xlsx.writeBuffer());
    expect(await findings(data)).toContain("BAD_PROVENANCE");
    const projection = await projectCommitmentProjection(data);
    expect(projection.schemaValidated).toBe(false);
  });

  it("F6d never upgrades an audit pointer with a non-accept action into authority", async () => {
    const b = await workbook(await fixture([committed()]));
    // Update is a syntactically allowed audit action; it is not an acceptance certificate.
    b.getWorksheet("ProjectAudit")!.getCell("G2").value = "Update";
    const projection = await projectCommitmentProjection(new Uint8Array(await b.xlsx.writeBuffer()));
    expect(projection.workbookState).toBe("valid");
    expect(projection.tasks[0].latestRecorded?.hasRecordedProjectAudit).toBe(true);
    expect(projection.tasks[0].acceptanceAuthorityVerified).toBe(false);
    expect(projection.tasks[0].disposition).toBe("Recorded (unverified)");
  });

  it("F6d treats even a mismatched unverified audit actor as a pointer, not permission", async () => {
    const b = await workbook(await fixture([committed()]));
    // ActorLabel is self-asserted; this cannot authenticate AcceptedBy.
    b.getWorksheet("ProjectAudit")!.getCell("K2").value = "Different self-reported editor";
    const projection = await projectCommitmentProjection(new Uint8Array(await b.xlsx.writeBuffer()));
    expect(projection.workbookState).toBe("valid");
    expect(projection.tasks[0].latestRecorded?.hasRecordedProjectAudit).toBe(true);
    expect(projection.tasks[0].latestRecorded?.acceptedBy).toBe("Unverified actor");
    expect(projection.tasks[0].acceptanceAuthorityVerified).toBe(false);
  });

  it("F6d rejects duplicate WBS TaskID across numeric and text Excel cell types", async () => {
    const b = await workbook(await fixture([committed()]));
    b.getWorksheet("ProjectWBS")!.addRow(["1", "Duplicated task", "1.1", "Task",
      "In Progress", "2026-12-06", "Cannot alias same ID"]);
    const data = new Uint8Array(await b.xlsx.writeBuffer());
    expect(await findings(data)).toContain("DUPLICATE_TASK_ID");
    const projection = await projectCommitmentProjection(data);
    expect(projection.workbookState).toBe("incompatible");
    expect(projection.tasks).toEqual([]);
  });

  it.each([
    ["LF", "Launch\nScope"],
    ["TAB", "Launch\tScope"],
    ["CR", "Launch\rScope"],
  ])("F6e rejects imported ProjectName with %s control character", async (_code, importedName) => {
    const b = await workbook(await fixture());
    b.getWorksheet("ProjectMeta")!.getCell("B3").value = importedName;
    const data = new Uint8Array(await b.xlsx.writeBuffer());
    expect(await findings(data)).toContain("BAD_PROJECT_NAME");
    const projection = await projectCommitmentProjection(data);
    expect(projection.workbookState).toBe("incompatible");
    expect(projection.tasks).toEqual([]);
    expect(projection.schemaValidated).toBe(false);
  });

  it("F6e rejects a decoded DEL in ProjectName without assuming ExcelJS retains it in XML", async () => {
    const b = await workbook(await fixture());
    b.getWorksheet("ProjectMeta")!.getCell("B3").value = "Launch\u007fScope";
    const inspected = inspectProjectData(b);
    expect(inspected.kind).toBe("incompatible");
    if (inspected.kind === "incompatible") {
      expect(inspected.findings.map(f => f.code)).toContain("BAD_PROJECT_NAME");
    }
    // The ExcelJS test writer strips DEL from an OOXML round trip. A real raw-XML
    // test would need its own byte-level fixture; don't call this a raw-ZIP proof.
    const reloaded = await workbook(new Uint8Array(await b.xlsx.writeBuffer()));
    expect(String(reloaded.getWorksheet("ProjectMeta")!.getCell("B3").value)).not.toContain("\u007f");
  });

  it("F6e preserves valid multiline Watch reason details during imported-name hardening", async () => {
    const b = await workbook(await fixture());
    b.getWorksheet("WatchReasons")!.addRow([
      IDs.fourth, "1", "Manual", null, "Open", "Dependency watch",
      "First line\nSecond line", "Risk register", T1, "Unverified actor",
      null, null, null, null,
    ]);
    const inspected = inspectProjectData(b);
    expect(inspected.kind).toBe("valid");
    const textCell = b.getWorksheet("WatchReasons")!.getCell("G2").value;
    expect(textCell).toBe("First line\nSecond line");
  });
});
