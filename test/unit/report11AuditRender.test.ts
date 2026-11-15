import { describe, expect, it } from "vitest";
import type { Report11Audit } from "../../src/managed/report11Audit";
import {
  escapeReportHtml, renderReport11AuditHtml, renderReport11AuditText,
  type Report11ExportInput,
} from "../../src/managed/report11AuditRender";

const SAVE = "adce1234-1234-4234-8234-123456789abc";
const source: Report11Audit = {
  distinctTasks: 2,
  logicalSaves: 1,
  fieldRows: 2,
  days: [{
    localDay: "2026-11-10",
    rows: [1, 2].map((n) => ({
      changeSetId: SAVE,
      timestampUTC: "2026-11-09T16:15:00.000Z",
      sourceRow: n + 1,
      currentWorkstream: n === 1 ? "Development" : "Security",
      historicalWbsCode: "1." + n,
      historicalTaskTitle: n === 1 ? "<img src=x onerror=alert(1)>" : "Case & Design",
      taskId: String(n),
      field: "Updates" as const,
      oldValue: n === 1 ? "Before" : "Value 2",
      newValue: n === 1 ? "<script>alert('malicious')</script>\ntext" : "After",
      source: "Web UI",
      appVersion: "1.1",
    })),
  }],
};
function input(changes: Partial<Report11ExportInput> = {}): Report11ExportInput {
  return {
    projectName: "North & <Launch>", title: "Detailed Change Audit",
    generatedAt: "2026-11-10T07:00:00.000Z", timeZone: "Asia/Tokyo",
    startDay: "2026-11-10", endDay: "2026-11-10",
    audit: source, includeFullValues: true, ...changes,
  };
}
describe("EMV-REPORT-1.1 offline audit renderer", () => {
  it("escapes untrusted workbook text and never introduces remote assets or scripts", () => {
    const html = renderReport11AuditHtml(input());
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;alert(&#39;malicious&#39;)&lt;/script&gt;");
    expect(html).toContain("North &amp; &lt;Launch&gt;");
    expect(html).not.toContain("<img ");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("http://");
    expect(html).not.toContain("https://");
    expect(html).toContain("connect-src &#39;none&#39;");
    expect(html).toContain("style=\"background:#e9f0f7");
    expect(html).toContain("white-space:pre-wrap");
  });

  it("keeps full shared Save ID in each audit row and exact source history identity", () => {
    const html = renderReport11AuditHtml(input());
    const text = renderReport11AuditText(input());
    expect(html.split(SAVE).length - 1).toBe(2);
    expect(text.split(SAVE).length - 1).toBe(2);
    expect(html).toContain("2026-11-10 · 2 field change(s)");
    expect(text).toContain("Historical task/WBS");
    expect(text).toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("WBS 1.1");
    expect(html).toContain("Field changes");
    expect(html).toContain(">2</strong>");
    expect(escapeReportHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("has the same six column positions for every daily table", () => {
    const extra: Report11Audit = { ...source, days: [
      ...source.days, { localDay: "2026-11-09", rows: source.days[0].rows.slice(0, 1) },
    ] };
    const html = renderReport11AuditHtml(input({ audit: extra }));
    expect(html.match(/<colgroup>/g)).toHaveLength(2);
    expect(html.match(/<th scope="col"/g)).toHaveLength(12);
    const group = /<colgroup>(.*?)<\/colgroup>/g;
    const matches = Array.from(html.matchAll(group));
    expect(matches).toHaveLength(2);
    expect(matches[0][1]).toBe(matches[1][1]);
  });

  it("refuses blank Project name rather than falling back to workbook filename", () => {
    expect(() => renderReport11AuditHtml(input({ projectName: " " })))
      .toThrow("Project name is required");
    expect(() => renderReport11AuditText(input({ projectName: "" })))
      .toThrow("Project name is required");
    expect(renderReport11AuditHtml(input())).not.toContain("Workbook:");
  });

  it("supports an empty audit without fabricating changes, and concise historical values", () => {
    const empty: Report11Audit = { days: [], fieldRows: 0, logicalSaves: 0, distinctTasks: 0 };
    expect(renderReport11AuditHtml(input({ audit: empty })))
      .toContain("No recorded changes in this period.");
    const huge: Report11Audit = { ...source, days: [{ ...source.days[0],
      rows: [{ ...source.days[0].rows[0], newValue: "x".repeat(220) }] }] };
    const short = renderReport11AuditText(input({ audit: huge, includeFullValues: false }));
    expect(short).toContain("x".repeat(140) + "…");
    expect(short).not.toContain("x".repeat(160));
    const full = renderReport11AuditText(input({ audit: huge, includeFullValues: true }));
    expect(full).toContain("x".repeat(220));
  });
});
