import { describe, expect, it } from "vitest";
import {
  loadReportProjectName, reportProjectPrefKey, saveReportProjectName,
} from "../../src/managed/report11ProjectName";
import type { PreferenceStorage } from "../../src/managed/settings";

function storage(): PreferenceStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem(key: string) { return data.get(key) ?? null; },
    setItem(key: string, value: string) { data.set(key, value); },
    removeItem(key: string) { data.delete(key); },
  };
}
describe("EMV-REPORT-1.1 Project name local preference", () => {
  it("never substitutes workbook filename for absent Project name", () => {
    const s = storage();
    expect(loadReportProjectName("Internal-Workbook.xlsx", s))
      .toEqual({ projectName: "", persisted: false });
    expect(loadReportProjectName("Internal-Workbook.xlsx", null))
      .toEqual({ projectName: "", persisted: false });
  });
  it("persists only an explicitly entered name in a separate scoped settings namespace", () => {
    const s = storage();
    expect(saveReportProjectName("Internal-Workbook.xlsx", "  Orion Launch  ", s)).toBe(true);
    expect(loadReportProjectName("Internal-Workbook.xlsx", s))
      .toEqual({ projectName: "Orion Launch", persisted: true });
    expect(loadReportProjectName("Another.xlsx", s).projectName).toBe("");
    const key = [...s.data.keys()][0];
    expect(key).not.toContain("Internal-Workbook.xlsx");
    expect(s.data.get(key)).toBe('{"projectName":"Orion Launch"}');
  });
  it("guards disabled storage, invalid JSON and excessively long/empty names", () => {
    const s = storage();
    expect(saveReportProjectName("A.xlsx", " ", s)).toBe(false);
    expect(saveReportProjectName("A.xlsx", "X".repeat(181), s)).toBe(false);
    s.data.set(reportProjectPrefKey("A.xlsx"), "{");
    expect(loadReportProjectName("A.xlsx", s).persisted).toBe(false);
    expect(() => reportProjectPrefKey(" ")).toThrow();
    const denied: PreferenceStorage = {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
      removeItem() { throw new Error("blocked"); },
    };
    expect(loadReportProjectName("A.xlsx", denied).projectName).toBe("");
    expect(saveReportProjectName("A.xlsx", "Orion", denied)).toBe(false);
  });
});
