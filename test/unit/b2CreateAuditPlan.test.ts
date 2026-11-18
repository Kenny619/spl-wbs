import { describe, expect, it } from "vitest";
import { planB2TaskCreateAudit, type B2AuditPlanInput } from "../../src/managed/b2CreateAuditPlan";

const taskId = "11111111-1111-4111-8111-111111111111";
const changeSetId = "22222222-2222-4222-8222-222222222222";
const eventId = (i: number) => "33333333-3333-4333-8333-" + i.toString(16).padStart(12, "0");

function base(overrides: Partial<B2AuditPlanInput> = {}): B2AuditPlanInput {
  const fields = ["ID", "Title", "WBSCode", "TaskType", "ParentTaskID",
    "Progress", "PredecessorIDs"] as const;
  return {
    taskId, changeSetId,
    timestampUTC: "2026-11-18T05:00:01.000Z",
    actorLabel: "Local PM", appVersion: "1.2.0-dev",
    fields, eventIds: fields.map((_, i) => eventId(i)),
    values: {
      ID: taskId, Title: "Review launch", WBSCode: "3.2.4", TaskType: "Task",
      ParentTaskID: "legacy-parent", Progress: 0, PredecessorIDs: ["42", "legacy-Z"],
    },
    ...overrides,
  };
}

describe("Stage C B2 — non-writing Task/Create audit planner", () => {
  it("creates one typed row per physically present source column and one logical transaction", () => {
    const input = base();
    const frozen = JSON.stringify(input);
    const result = planB2TaskCreateAudit(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(input.fields.length);
    expect(new Set(result.rows.map(x => x.EventID)).size).toBe(input.fields.length);
    expect(new Set(result.rows.map(x => x.ChangeSetID))).toEqual(new Set([changeSetId]));
    expect(new Set(result.rows.map(x => x.TimestampUTC))).toEqual(new Set([input.timestampUTC]));
    expect(result.rows.every(x => x.Action === "Create" && x.EntityType === "Task" &&
      x.EntityID === taskId && x.TaskID === taskId && x.ActorProvenance === "UnverifiedLocal" &&
      x.Source === "Web UI" && x.OldValue === "")).toBe(true);
    expect(result.rows.find(x => x.Field === "PredecessorIDs")?.NewValue)
      .toBe('["42","legacy-Z"]');
    expect(result.rows.find(x => x.Field === "Progress")?.NewValue).toBe("0");
    expect(JSON.stringify(input)).toBe(frozen);
    expect("rag" in result.rows[0]).toBe(false);
  });

  it("does not invent optional columns absent from the workbook", () => {
    const input = base({
      fields: ["ID", "Title", "WBSCode", "TaskType"],
      values: { ID: taskId, Title: "Simple", WBSCode: "5", TaskType: "Task" },
      eventIds: [0, 1, 2, 3].map(eventId),
    });
    const result = planB2TaskCreateAudit(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows.map(x => x.Field)).toEqual(input.fields);
      expect(result.rows.find(x => x.Field === "PredecessorIDs")).toBeUndefined();
    }
  });

  it("serializes present blank optional cell distinctly from numeric zero", () => {
    const input = base({values: {
      ID: taskId, Title: "Blank parent", WBSCode: "5", TaskType: "Task",
      ParentTaskID: null, Progress: 0, PredecessorIDs: [],
    }});
    const result = planB2TaskCreateAudit(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows.find(x => x.Field === "ParentTaskID")?.NewValue).toBe("");
    expect(result.rows.find(x => x.Field === "Progress")?.NewValue).toBe("0");
    expect(result.rows.find(x => x.Field === "PredecessorIDs")?.NewValue).toBe("[]");
  });

  it("rejects missing or extra fields and values instead of truncating audit evidence", () => {
    const missing = base({ values: { ID: taskId, WBSCode: "5", TaskType: "Task" } });
    const a = planB2TaskCreateAudit(missing);
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.errors).toContain("Missing explicit source value: Title");
    const extra = planB2TaskCreateAudit(base({ values: {
      ID: taskId, Title: "Test", WBSCode: "5", TaskType: "Task",
      ParentTaskID: null, Progress: 0, PredecessorIDs: [], Workstream: "A",
    }}));
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.errors).toContain("Value without source column: Workstream");
  });

  it("rejects an invalid event ID, repeated event ID, wrong count or repeated field", () => {
    const a = planB2TaskCreateAudit(base({ eventIds: [eventId(0)] }));
    expect(a.ok).toBe(false);
    const b = planB2TaskCreateAudit(base({
      eventIds: [0, 1, 2, 3, 4, 5, 5].map(eventId),
    }));
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.errors).toContain("Duplicate EventID.");
    const c = planB2TaskCreateAudit(base({
      fields: ["ID","Title","WBSCode","TaskType","ParentTaskID","Progress","Progress"],
    }));
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.errors).toContain("Duplicate source field: Progress");
  });

  it("rejects inconsistent ID or incorrect transaction metadata", () => {
    for (const changes of [
      { taskId: "not-uuid" }, { changeSetId: "not-uuid" },
      { timestampUTC: "2026-11-18T05:00:01Z" }, { actorLabel: "=CMD()" },
      { appVersion: "" },
    ]) expect(planB2TaskCreateAudit(base(changes)).ok).toBe(false);
    const mismatch = planB2TaskCreateAudit(base({ values: {
      ID: "different", Title: "Task", WBSCode: "5", TaskType: "Task",
      ParentTaskID: null, Progress: 0, PredecessorIDs: [],
    }}));
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.errors).toContain("Invalid source value: ID");
  });

  it("rejects invalid predecessors, duplicates and self-reference before audit planning", () => {
    for (const predecessors of [["42", "42"], ["42", taskId], [" "], ["\u0000"]]) {
      const b = base();
      const result = planB2TaskCreateAudit({
        ...b, values: {...b.values, PredecessorIDs: predecessors},
      });
      expect(result.ok).toBe(false);
    }
  });

  it("rejects spreadsheet-formula prefixes, invalid dates and invalid progress", () => {
    for (const title of ["=1+2", "@command", "+SUM(1)", "-SUM(1)", "Invalid\u0001"]) {
      const b = base();
      expect(planB2TaskCreateAudit({
        ...b, values: {...b.values, Title: title},
      }).ok).toBe(false);
    }
    for (const progress of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
      const b = base();
      expect(planB2TaskCreateAudit({
        ...b, values: {...b.values, Progress: progress},
      }).ok).toBe(false);
    }
    const b = base();
    const badDate = planB2TaskCreateAudit({
      ...b, fields: [...b.fields, "PlannedStart"],
      eventIds: [...b.eventIds, eventId(7)],
      values: {...b.values, PlannedStart: "2026-02-30"},
    });
    expect(badDate.ok).toBe(false);
    const goodDate = planB2TaskCreateAudit({
      ...b, fields: [...b.fields, "PlannedStart"],
      eventIds: [...b.eventIds, eventId(7)],
      values: {...b.values, PlannedStart: "2026-12-01"},
    });
    expect(goodDate.ok).toBe(true);
  });

  it("accepts distinct Task/Summary/Milestone types with no fabricated health assessment", () => {
    for (const taskType of ["Task", "Summary", "Milestone"] as const) {
      const b = base();
      const result = planB2TaskCreateAudit({
        ...b, values: {...b.values, TaskType: taskType},
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.rows.find(x => x.Field === "TaskType")?.NewValue).toBe(taskType);
        expect(result.rows.every(x => x.Action === "Create")).toBe(true);
      }
    }
  });

  it("rejects oversized field values before any possible XLSX I/O", () => {
    const b = base();
    const result = planB2TaskCreateAudit({
      ...b, values: {...b.values, Title: "X".repeat(33000)},
    });
    expect(result.ok).toBe(false);
  });
});
