import { describe, expect, it } from "vitest";
import { copyReport11ForOutlook } from "../../src/managed/report11Clipboard";

type ItemData = Record<string, Blob>;
class MockItem {
  constructor(readonly data: ItemData) {}
}
describe("EMV-REPORT-1.1 Outlook rich clipboard bridge", () => {
  it("writes paired HTML and exact plain text MIME under one gesture", async () => {
    const writes: MockItem[][] = [];
    const writer = { async write(items: MockItem[]) { writes.push(items); } };
    const html = "<!doctype html><html><body><p>Project A</p></body></html>";
    const text = "Project A\nRisk: Blocked";
    await copyReport11ForOutlook(html, text, writer as never, MockItem as never);
    expect(writes).toHaveLength(1);
    expect(Object.keys(writes[0][0].data).sort()).toEqual(["text/html", "text/plain"]);
    expect(await writes[0][0].data["text/html"].text()).toBe(html);
    expect(await writes[0][0].data["text/plain"].text()).toBe(text);
  });
  it("rejects unsupported permissions and never suggests sending an email", async () => {
    await expect(copyReport11ForOutlook("<p>Report</p>", "Report", null, null))
      .rejects.toThrow("Rich clipboard is unavailable");
    await expect(copyReport11ForOutlook(" ", "Report",
      { async write() {} }, MockItem as never)).rejects.toThrow("Generate a report");
    await expect(copyReport11ForOutlook("<p>Report</p>", "Report",
      { async write() { throw new Error("permission"); } }, MockItem as never))
      .rejects.toThrow("permission was denied");
  });
});
