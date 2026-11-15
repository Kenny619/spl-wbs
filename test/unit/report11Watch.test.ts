import { describe, expect, it } from "vitest";
import { projectDataWorkbook } from "../fixtures/projectDataWorkbook";
import { importWorkbook } from "../../src/data/normalize";
import { projectWatchProjection } from "../../src/managed/watchProjection";
import { buildReport11Snapshot } from "../../src/managed/report11Snapshot";
import { renderReport11Text, renderReport11Html } from "../../src/managed/report11StakeholderRender";
import { bundledHolidayCalendar } from "../../src/calendar/jpHolidays";
import { copyReport11ForOutlook } from "../../src/managed/report11Clipboard";

describe("Report11 Manual Watch addendum 1 from real frozen five-sheet XLSX", () => {
  for (const mode of ["status", "progress"] as const) for (const state of ["Open", "Resolved", "malformed"] as const) {
    it(`${mode}/${state}: current attributed facts, local report name and safe HTML/plain/Outlook parity without writes`, async () => {
      const bytes = await projectDataWorkbook(state);
      const before = Buffer.from(bytes);
      const imported = await importWorkbook(bytes);
      if (!imported.ok) throw new Error("Invalid synthetic tasks");
      const snapshot = buildReport11Snapshot({
        mode, projectName: "Local report name", tasks: imported.tasks,
        history: [], historyAvailable: false, timeZone: "Asia/Tokyo",
        generatedAt: new Date("2026-11-14T00:00:00Z"), calendar: bundledHolidayCalendar(),
        startDay: "2026-11-01", endDay: "2026-11-14", watchProjection: await projectWatchProjection(bytes),
      });
      const text = renderReport11Text(snapshot), html = renderReport11Html(snapshot);
      expect(text).toContain("Project: Local report name");
      expect(text).not.toContain("Project: Synthetic shared project");
      expect(text).toContain("Current workbook records, not period-change evidence");
      if (state === "malformed") expect(text).toContain("Unknown / unverified: workbook Watch source unavailable");
      else {
        expect(text).toContain(state === "Open" ? "Under Watch · 1 Open / 0 Resolved" : "Unknown · 0 Open / 1 Resolved");
        expect(text).toContain("Supplier <img src=x onerror=alert(1)>");
        expect(html).toContain("Supplier &lt;img");
        expect(html).not.toContain("<img src=x");
        expect(text).toContain("Synthetic editor (unverified)");
      }
      const captured: Record<string, Blob>[] = [];
      class Item { constructor(public data: Record<string, Blob>) { captured.push(data); } }
      await copyReport11ForOutlook(html, text, { write: async () => {} }, Item as unknown as typeof ClipboardItem);
      expect(await captured[0]["text/plain"].text()).toBe(text);
      expect(await captured[0]["text/html"].text()).toBe(html);
      expect(bytes).toEqual(before);
      expect(snapshot.recordedProgress).toEqual([]);
      expect(snapshot.scheduleChanges).toEqual([]);
    });
  }
});
