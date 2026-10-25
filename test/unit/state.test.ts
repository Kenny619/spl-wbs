import { describe, expect, it } from "vitest";
import { createViewState, fileTitle, formatLoadedAt, preserveView } from "../../src/app/state";

describe("view state", () => {
  it("starts from the approved week view with the schedule fitted", () => {
    const view = createViewState(["1"]);
    expect(view.expandedIds).toEqual(["1"]);
    expect(view.zoom).toBe("week");
    expect(view.fitMode).toBe(true);
    expect(view.columns).toEqual(["owner", "status", "finish"]);
    expect(view.showDependencies).toBe(false);
    expect(view.hideInactive).toBe(false);
    expect(view.selectedId).toBeNull();
  });

  it("keeps the current view and drops a selection that left the file", () => {
    const view = createViewState(["1", "9"]);
    view.zoom = "day";
    view.statuses = ["Blocked"];
    view.selectedId = "9";
    const next = preserveView(view, ["1", "2"]);
    expect(next.expandedIds).toEqual(["1"]);
    expect(next.zoom).toBe("day");
    expect(next.statuses).toEqual(["Blocked"]);
    expect(next.selectedId).toBeNull();
    expect(next.fitMode).toBe(true);
  });

  it("formats the loaded time in the requested zone and titles the file", () => {
    expect(formatLoadedAt(new Date("2026-10-25T03:00:00.000Z"), "Asia/Tokyo")).toBe("Oct 25, 2026, 12:00 PM");
    expect(fileTitle("Phase Two.XLSX")).toBe("Phase Two");
  });
});
