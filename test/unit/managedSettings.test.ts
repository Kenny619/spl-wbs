import { describe, expect, it } from "vitest";
import {
  SETTINGS_KEY, DEFAULT_COLUMNS, defaultPreferences, detectedTimeZone, effectiveAppearance,
  loadPreferences, normalizePreferences, persistPreferences, supportedTimeZones, validTimeZone,
  validateColumns,
} from "../../src/managed/settings";

class StorageStub {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
describe("Excel Managed frozen EMV-SET-1.0 preference contract", () => {
  it("defaults to detected browser timezone, v18 columns, System appearance", () => {
    expect(defaultPreferences()).toEqual({
      timeZone: detectedTimeZone(), columns: [...DEFAULT_COLUMNS], appearance: "system",
    });
    expect(validTimeZone("Asia/Tokyo")).toBe(true);
    expect(validTimeZone("UTC")).toBe(true);
    expect(validTimeZone("Not/A_Timezone")).toBe(false);
    expect(validTimeZone("")).toBe(false);
    expect(supportedTimeZones("Asia/Tokyo")).toContain("Asia/Tokyo");
  });
  it("persists preferences locally, reopens them, and does not store workbook content", () => {
    const storage = new StorageStub();
    const updated = {
      timeZone: "Asia/Tokyo", columns: ["status", "workstream"], appearance: "dark" as const,
    };
    expect(persistPreferences(updated, storage)).toBe(true);
    expect(loadPreferences(storage)).toEqual(updated);
    expect(JSON.parse(storage.getItem(SETTINGS_KEY)!)).toEqual(updated);
    expect(storage.getItem(SETTINGS_KEY)).not.toContain("ProjectWBS");
  });
  it("rejects corrupt storage and invalid timezone without breaking view", () => {
    const storage = new StorageStub();
    storage.setItem(SETTINGS_KEY, "{oops");
    expect(loadPreferences(storage)).toEqual(defaultPreferences());
    const bad = normalizePreferences({
      timeZone: "Invalid/Zone", columns: ["wbs", "status", "status", "evil-column"],
      appearance: "orange",
    });
    expect(bad.timeZone).toBe(detectedTimeZone());
    expect(bad.columns).toEqual(["status"]);
    expect(bad.appearance).toBe("system");
  });
  it("keeps existing fixed WBS/task fields off the visibility list and uses v18 column order", () => {
    expect(validateColumns(["type", "task", "owner", "wbs", "finish", "type"]))
      .toEqual(["owner", "finish", "type"]);
    expect(validateColumns(null)).toEqual([...DEFAULT_COLUMNS]);
    expect(validateColumns(["status", 12])).toEqual([...DEFAULT_COLUMNS]);
    expect(validateColumns([])).toEqual([]);
  });
  it("falls back when browser storage is inaccessible and avoids writes to workbook data", () => {
    const blocked = {
      getItem(): string | null { throw new DOMException("Security denied", "SecurityError"); },
      setItem(): void { throw new DOMException("Security denied", "SecurityError"); },
      removeItem(): void { throw new DOMException("Security denied", "SecurityError"); },
    };
    expect(loadPreferences(blocked)).toEqual(defaultPreferences());
    expect(persistPreferences(defaultPreferences(), blocked)).toBe(false);
    expect(loadPreferences(null)).toEqual(defaultPreferences());
  });
  it("System follows OS preference and explicit Light/Dark override it", () => {
    expect(effectiveAppearance("system", true)).toBe("dark");
    expect(effectiveAppearance("system", false)).toBe("light");
    expect(effectiveAppearance("light", true)).toBe("light");
    expect(effectiveAppearance("dark", false)).toBe("dark");
  });
});
