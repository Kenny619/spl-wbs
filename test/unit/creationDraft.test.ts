import { describe, expect, it } from "vitest";
import type { Task } from "../../src/data/types";
import { prepareNewEntity, suggestWbsCode } from "../../src/managed/creationDraft";

const NEW_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const existing = [
  { id: "summary-1", wbsCode: "3.2", parentId: null, taskType: "Summary" },
  { id: "task-2", wbsCode: "3.2.1", parentId: "summary-1", taskType: "Task" },
  { id: "root-1", wbsCode: "1", parentId: null, taskType: "Task" },
] as Task[];

describe("Stage C validation-only creator foundation", () => {
  it("prepares a new root Task without writing or synthesizing RAG", () => {
    const before = JSON.stringify(existing);
    const result = prepareNewEntity({ title: "Scope review", taskType: "Task" }, existing, NEW_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft).toMatchObject({
      id: NEW_ID, title: "Scope review", taskType: "Task",
      wbsCode: "2", parentId: null, sourceTaskStatus: "Not Started",
      plannedStart: null, plannedEnd: null, predecessorIds: [],
    });
    expect("rag" in result.draft).toBe(false);
    expect("watchReason" in result.draft).toBe(false);
    expect(JSON.stringify(existing)).toBe(before);
  });

  it("suggests unused WBS child codes without recoding existing rows", () => {
    expect(suggestWbsCode(existing, "3.2")).toBe("3.2.2");
    const result = prepareNewEntity({
      title: "New child", taskType: "Task", parentId: "summary-1",
    }, existing, NEW_ID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.draft.wbsCode).toBe("3.2.2");
  });

  it("rejects duplicate immutable ID and duplicate WBS across all rows", () => {
    const augmented = [...existing, {
      id: NEW_ID, wbsCode: "9", parentId: null, taskType: "Task" as const,
    }];
    const result = prepareNewEntity({
      title: "Collision", taskType: "Task", wbsCode: "3.2.1",
    }, augmented, NEW_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("TaskID already exists.");
      expect(result.errors).toContain("WBS code already exists.");
    }
  });

  it("requires a canonical generated UUID", () => {
    const result = prepareNewEntity({ title: "Invalid ID", taskType: "Task" }, [], "not-uuid");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("New TaskID must be a UUID.");
  });

  it("does not allow a non-Summary or unknown parent", () => {
    for (const parentId of ["task-2", "unknown"]) {
      const result = prepareNewEntity({
        title: "New child", taskType: "Task", parentId,
      }, existing, NEW_ID);
      expect(result.ok).toBe(false);
    }
  });

  it("canonicalizes a one-date Milestone and rejects conflicting dates", () => {
    const good = prepareNewEntity({
      title: "Go-live", taskType: "Milestone", plannedEnd: "2026-12-04",
    }, [], NEW_ID);
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.draft.plannedStart).toBe("2026-12-04");
      expect(good.draft.plannedEnd).toBe("2026-12-04");
    }
    const bad = prepareNewEntity({
      title: "Go-live", taskType: "Milestone",
      plannedStart: "2026-12-04", plannedEnd: "2026-12-05",
    }, [], NEW_ID);
    expect(bad.ok).toBe(false);
  });

  it("rejects partial Task dates, invalid calendar dates and authored Summary dates", () => {
    for (const input of [
      { title: "Work", taskType: "Task" as const, plannedStart: "2026-12-01" },
      { title: "Work", taskType: "Task" as const, plannedStart: "2026-02-30", plannedEnd: "2026-03-03" },
      { title: "Program", taskType: "Summary" as const, plannedStart: "2026-12-01" },
    ]) expect(prepareNewEntity(input, [], NEW_ID).ok).toBe(false);
  });

  it("accepts only existing, unique predecessor IDs", () => {
    const good = prepareNewEntity({
      title: "Dependent task", taskType: "Task",
      predecessorIds: ["task-2", "root-1"],
    }, existing, NEW_ID);
    expect(good.ok).toBe(true);
    const bad = prepareNewEntity({
      title: "Bad predecessor", taskType: "Task",
      predecessorIds: ["missing", "task-2", "task-2", NEW_ID],
    }, existing, NEW_ID);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors).toContain("Duplicate predecessor TaskID.");
      expect(bad.errors).toContain("Predecessor TaskID is invalid or missing.");
      expect(bad.errors).toContain("An item cannot depend on itself.");
    }
  });

  it("rejects spreadsheet formula prefixes and control characters", () => {
    for (const title of ["=2+2", "+SUM(A1:A2)", "@calc", "Line\nBreak", ""]) {
      expect(prepareNewEntity({ title, taskType: "Task" }, [], NEW_ID).ok).toBe(false);
    }
    expect(prepareNewEntity({
      title: "Safe", taskType: "Task", owner: "=evil",
    }, [], NEW_ID).ok).toBe(false);
  });

  it("keeps generated TaskID separate from source TaskStatus", () => {
    const created = prepareNewEntity({
      title: "Blocked predecessor is not manual RAG",
      taskType: "Task", predecessorIds: ["task-2"],
    }, existing, OTHER_ID);
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.draft.sourceTaskStatus).toBe("Not Started");
      expect(Object.keys(created.draft)).not.toContain("rag");
      expect(Object.keys(created.draft)).not.toContain("assessment");
    }
  });
});
