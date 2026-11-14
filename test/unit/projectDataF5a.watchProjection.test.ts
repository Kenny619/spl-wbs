import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { projectWatchProjection, toManagedWatchView } from "../../src/managed/watchProjection";

const ID = {
  project: "bd95a399-257e-4b42-ac0e-fb6ee984c1aa",
  manual: "7e4d09da-832e-4647-9202-8cbb8f8704d2",
  second: "ed58f70a-126e-4dce-ace1-b578dc5c290e",
  automatic: "d0d36c0a-1e36-4c4a-8c45-67292839efaa",
  audit: "43f416bf-33f4-4a32-aa46-7e0945561faa",
  tx: "c6dbf481-6868-48b7-b9b5-8726be2e2561",
};
const OPENED = "2026-11-12T02:00:00.000Z";
const RESOLVED = "2026-11-12T03:00:00.000Z";
type Reason = {
  id: string; taskId?: string; origin?: "Manual" | "Automatic";
  state?: "Open" | "Resolved"; ruleCode?: string | null;
  title?: string;
};
async function make({
  extension = true, reasons = [] as Reason[], auditReasonIds = [] as string[],
  status = "Completed",
}: {
  extension?: boolean; reasons?: Reason[]; auditReasonIds?: string[]; status?: string;
} = {}): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  const wbs = book.addWorksheet("ProjectWBS");
  wbs.addRow(["ID", "Title", "WBSCode", "TaskType", "TaskStatus", "PlannedEnd"]);
  wbs.addRow([1, "Delivery", "1", "Task", status, "2026-11-23"]);
  wbs.addRow([2, "Validation", "2", "Task", "In Progress", "2026-11-24"]);
  if (extension) {
    const meta = book.addWorksheet("ProjectMeta");
    meta.addRow(["Key", "Value"]);
    meta.addRow(["ProjectID", ID.project]);
    meta.addRow(["ProjectName", "Shared Project Alpha"]);
    meta.addRow(["ProjectDataSchemaVersion", "0.1.2"]);
    book.addWorksheet("ProjectCalendar").addRow([
      "BlackoutID", "Enabled", "StartDate", "EndDate", "Label", "ModifiedUTC",
    ]);
    const watch = book.addWorksheet("WatchReasons");
    watch.addRow([
      "ReasonID", "TaskID", "Origin", "RuleCode", "State", "Title", "Details",
      "EvidenceRef", "OpenedUTC", "OpenedBy", "LastReviewedUTC",
      "ResolvedUTC", "ResolvedBy", "ResolutionNote",
    ]);
    for (const reason of reasons) {
      const resolved = reason.state === "Resolved";
      watch.addRow([
        reason.id, reason.taskId ?? "1", reason.origin ?? "Manual",
        reason.ruleCode ?? null, reason.state ?? "Open", reason.title ?? "Stakeholder dependency",
        "Recorded note; not independently verified", "Meeting note", OPENED, "Unverified editor",
        null, resolved ? RESOLVED : null, resolved ? "Unverified resolver" : null,
        resolved ? "Agreed mitigation completed" : null,
      ]);
    }
    book.addWorksheet("ProjectCommitments").addRow([
      "CommitmentID", "TaskID", "AcceptedFinishDate", "AcceptedUTC", "AcceptedBy",
      "PreviousCommitmentID", "Rationale", "EvidenceRef",
    ]);
    const audit = book.addWorksheet("ProjectAudit");
    audit.addRow([
      "EventID", "ChangeSetID", "TimestampUTC", "EntityType", "EntityID", "TaskID",
      "Action", "Field", "OldValue", "NewValue", "ActorLabel", "ActorProvenance",
      "Source", "AppVersion",
    ]);
    for (const [i, id] of auditReasonIds.entries()) {
      const reason = reasons.find(x => x.id === id);
      if (!reason) throw new Error("Unknown synthetic audit reason.");
      audit.addRow([
        i ? "f4a3052f-f1ad-47b2-810a-f6e9f7f453a0" : ID.audit, ID.tx, OPENED,
        "WatchReason", id, reason.taskId ?? "1", "Create", "State",
        "", reason.state ?? "Open", "Unverified editor", "UnverifiedLocal",
        "Web UI", "f5a-test",
      ]);
    }
  }
  return new Uint8Array(await book.xlsx.writeBuffer());
}
async function mutate(bytes: Uint8Array, f: (book: ExcelJS.Workbook) => void) {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  f(b);
  return new Uint8Array(await b.xlsx.writeBuffer());
}

describe("F5a: conservative read-only Watch projection from Excel source-of-truth", () => {
  it("legacy workbook cannot be Green: no shared Watch facts or authorized rules", async () => {
    const v = await projectWatchProjection(await make({ extension: false }));
    expect(v).toEqual({
      workbookState: "legacy", projectName: null, tasks: [], findings: [], schemaValidated: false,
    });
  });

  it("valid five-sheet workbook with zero reasons remains Unknown, never Green/Clear", async () => {
    const v = await projectWatchProjection(await make());
    expect(v).toMatchObject({
      workbookState: "valid", projectName: "Shared Project Alpha", schemaValidated: true,
    });
    expect(v.tasks.map(t => [t.taskId, t.disposition, t.automaticChecksVerified]))
      .toEqual([["1", "Unknown", false], ["2", "Unknown", false]]);
    expect(v.tasks.every(t => !t.commitmentVerified)).toBe(true);
  });

  it("one persisted Open Manual reason is recorded Under Watch independent of Completed status", async () => {
    const v = await projectWatchProjection(await make({
      reasons: [{ id: ID.manual, title: "Operational dependency" }],
      auditReasonIds: [ID.manual], status: "Completed",
    }));
    expect(v.tasks[0]).toMatchObject({
      taskId: "1", disposition: "Under Watch", automaticChecksVerified: false,
      commitmentVerified: false,
    });
    expect(v.tasks[0].openReasons).toHaveLength(1);
    expect(v.tasks[0].openReasons[0]).toMatchObject({
      reasonId: ID.manual, origin: "Manual", state: "Open",
      title: "Operational dependency", openedBy: "Unverified editor",
      hasRecordedProjectAudit: true,
    });
    expect(v.tasks[1].disposition).toBe("Unknown");
  });

  it("two independent Open reasons remain both visible; a resolved third retains history", async () => {
    const v = await projectWatchProjection(await make({
      reasons: [
        { id: ID.manual, title: "Supplier" },
        { id: ID.second, title: "Customer" },
        { id: ID.automatic, state: "Resolved", origin: "Automatic", ruleCode: "PROPOSED_RULE" },
      ], auditReasonIds: [ID.manual],
    }));
    expect(v.tasks[0].disposition).toBe("Under Watch");
    expect(v.tasks[0].openReasons.map(x => x.title)).toEqual(["Supplier", "Customer"]);
    expect(v.tasks[0].resolvedReasons).toHaveLength(1);
    expect(v.tasks[0].openReasons[1].hasRecordedProjectAudit).toBe(false);
    expect(v.tasks[0].resolvedReasons[0]).toMatchObject({
      state: "Resolved", resolvedUTC: RESOLVED,
      resolvedBy: "Unverified resolver", resolutionNote: "Agreed mitigation completed",
    });
  });

  it("resolved reasons alone cannot falsely prove Green while automatic checks remain undefined", async () => {
    const v = await projectWatchProjection(await make({
      reasons: [{ id: ID.manual, state: "Resolved" }],
      auditReasonIds: [ID.manual],
    }));
    expect(v.tasks[0].disposition).toBe("Unknown");
    expect(v.tasks[0].openReasons).toHaveLength(0);
    expect(v.tasks[0].resolvedReasons).toHaveLength(1);
  });

  it("an Open Automatic record is still shown but no unsupported risk rule is calculated", async () => {
    const v = await projectWatchProjection(await make({
      reasons: [{ id: ID.automatic, origin: "Automatic", ruleCode: "UNAPPROVED_RULE" }],
    }));
    expect(v.tasks[0].disposition).toBe("Under Watch");
    expect(v.tasks[0].openReasons[0]).toMatchObject({
      origin: "Automatic", ruleCode: "UNAPPROVED_RULE",
      hasRecordedProjectAudit: false,
    });
    expect(v.tasks[0].automaticChecksVerified).toBe(false);
  });

  it("TaskID grouping keeps different task's reason isolated, including number/string ID input", async () => {
    const v = await projectWatchProjection(await make({
      reasons: [{ id: ID.manual, taskId: "2" }],
    }));
    expect(v.tasks.map(x => [x.taskId, x.disposition, x.openReasons.length]))
      .toEqual([["1", "Unknown", 0], ["2", "Under Watch", 1]]);
  });

  it("invalid orphan reason fails closed: never count a made-up task as Under Watch", async () => {
    const v = await projectWatchProjection(await make({
      reasons: [{ id: ID.manual, taskId: "999" }],
    }));
    expect(v.workbookState).toBe("incompatible");
    expect(v.schemaValidated).toBe(false);
    expect(v.tasks).toEqual([]);
    expect(v.findings.some(x => x.code === "UNKNOWN_TASK")).toBe(true);
  });

  it("partial new extension is incompatible, never interpreted as zero risks", async () => {
    const bytes = await mutate(await make({ extension: false }), book => {
      book.addWorksheet("WatchReasons").addRow(["ReasonID", "TaskID"]);
    });
    const v = await projectWatchProjection(bytes);
    expect(v.workbookState).toBe("incompatible");
    expect(v.tasks).toEqual([]);
    expect(v.schemaValidated).toBe(false);
  });

  it("future version is unsupported, never an empty saved Watch registry", async () => {
    const bytes = await mutate(await make(), book => {
      book.getWorksheet("ProjectMeta")!.getCell("B4").value = "9.0.0";
    });
    const v = await projectWatchProjection(bytes);
    expect(v.workbookState).toBe("unsupported_future");
    expect(v.tasks).toEqual([]);
  });

  it("duplicate reason ID fails validation before any projection or implied clearance", async () => {
    const bytes = await make({ reasons: [
      { id: ID.manual }, { id: ID.manual, title: "Duplicate" },
    ] });
    const v = await projectWatchProjection(bytes);
    expect(v.workbookState).toBe("incompatible");
    expect(v.findings.some(x => x.code === "DUPLICATE_ID")).toBe(true);
    expect(v.tasks).toEqual([]);
  });

  it("repeated reads return the same result and do not change workbook bytes or audit rows", async () => {
    const source = await make({
      reasons: [{ id: ID.manual }], auditReasonIds: [ID.manual],
    });
    const copy = Uint8Array.from(source);
    const a = await projectWatchProjection(source);
    const b = await projectWatchProjection(source);
    expect(a).toEqual(b);
    expect(source).toEqual(copy);
    expect(a.tasks[0].openReasons).toHaveLength(1);
  });
});

describe("DES-012 managed Watch view adapter (read-only)", () => {
  it("exposes recorded open reasons, never infers Green, and preserves the workbook bytes", async () => {
    const bytes = await make({ reasons: [{ id: ID.manual }], auditReasonIds: [ID.manual] });
    const original = Uint8Array.from(bytes);
    const view = toManagedWatchView(await projectWatchProjection(bytes));
    expect(view.kind).toBe("ready");
    if (view.kind !== "ready") throw new Error("Expected valid workbook");
    expect(view.rows.find(x => x.taskId === "1")).toMatchObject({
      watchLabel: "Under Watch", openReasonCount: 1, recordedAuditCount: 1,
      automaticChecksVerified: false, commitmentVerified: false,
    });
    expect(view.rows.find(x => x.taskId === "2")).toMatchObject({
      watchLabel: "Unknown", openReasonCount: 0,
      automaticChecksVerified: false, commitmentVerified: false,
    });
    expect(bytes).toEqual(original);
  });

  it("fails closed for a legacy workbook rather than inventing a clear status", async () => {
    const view = toManagedWatchView(await projectWatchProjection(await make({ extension: false })));
    expect(view).toMatchObject({ kind: "unavailable", workbookState: "legacy" });
    expect("rows" in view).toBe(false);
  });

  it("fails closed for a structurally invalid extension", async () => {
    const bytes = await mutate(await make(), b => {
      b.getWorksheet("WatchReasons")!.getRow(1).getCell(1).value = "WrongIdentifier";
    });
    const view = toManagedWatchView(await projectWatchProjection(bytes));
    expect(view.kind).toBe("unavailable");
    expect("rows" in view).toBe(false);
  });
});
