import { describe, expect, it } from "vitest";
import type { ManagedInspection } from "../../src/managed/directSave";
import { recoveryGuidance } from "../../src/managed/recoveryUi";

const report = (status: ManagedInspection["status"]): ManagedInspection => ({
  status, reason: "Synthetic inspection", hashes: {},
});
describe("Stage A fail-closed recovery guidance", () => {
  it("never advises automatic retry, cleanup, or rollback in uncertain states", () => {
    for (const status of ["BEFORE_WRITE", "NEEDS_BACKUP", "BACKUP_VERIFIED", "STOP"] as const) {
      const guidance = recoveryGuidance(report(status));
      expect(guidance).toMatch(/Stop|Do not|do not|Keep/i);
      expect(guidance).not.toMatch(/automatically restore|safe to retry|delete the stage/i);
    }
  });
  it("distinguishes a ready inspection from verified workbook integrity", () => {
    const guidance = recoveryGuidance(report("READY"));
    expect(guidance).toContain("does not prove");
    expect(guidance).toContain("Reload");
  });
  it("describes verified source and predecessor with incomplete cleanup", () => {
    const guidance = recoveryGuidance(report("BACKUP_VERIFIED"));
    expect(guidance).toContain("incomplete");
    expect(guidance).toContain("independently reconciled");
  });
});
