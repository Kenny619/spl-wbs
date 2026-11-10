import type { Report11Audit, Report11AuditRow } from "./report11Audit";

/**
 * EMV-REPORT-1.1 safe offline HTML and exact text audit renderers.
 * No workbook text is injected into an executable browser context.
 * Text and HTML share the same lossless day/row model.
 */
export function escapeReportHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

export type Report11ExportInput = Readonly<{
  projectName: string;
  title: string;
  generatedAt: string;
  timeZone: string;
  startDay: string;
  endDay: string;
  audit: Report11Audit;
  includeFullValues: boolean;
  historyPresent?: boolean;
}>;

function check(input: Report11ExportInput): void {
  if (!input.projectName.trim()) throw new Error("Project name is required to generate a report.");
  if (!Number.isFinite(Date.parse(input.generatedAt))) throw new Error("Invalid generated-at timestamp.");
  new Intl.DateTimeFormat("en-US", { timeZone: input.timeZone });
}

function display(value: string | number | null, full: boolean): string {
  const raw = value === null ? "(empty)" : String(value);
  return full || raw.length <= 140 ? raw : raw.slice(0, 140) + "…";
}

function rowFacts(row: Report11AuditRow, full: boolean): readonly string[] {
  return [
    row.changeSetId,
    row.timestampUTC,
    row.currentWorkstream,
    row.historicalTaskTitle + " (WBS " + row.historicalWbsCode + ")",
    row.field,
    display(row.oldValue, full),
    display(row.newValue, full),
  ];
}

export function renderReport11AuditText(input: Report11ExportInput): string {
  check(input);
  const lines = [
    input.title,
    "Project: " + input.projectName.trim(),
    "Period: " + input.startDay + " to " + input.endDay + " (inclusive)",
    "Generated: " + input.generatedAt + " (" + input.timeZone + ")",
    "Affected tasks: " + input.audit.distinctTasks,
    "Save events: " + input.audit.logicalSaves,
    "Field changes: " + input.audit.fieldRows,
  ];
  if (input.historyPresent === false) lines.push("", "History not available: UpdateHistory sheet is absent.");
  else if (!input.audit.days.length) lines.push("", "No recorded changes in this period.");
  for (const day of input.audit.days) {
    lines.push("", "DATE: " + day.localDay, "Save ID | Saved UTC | Workstream | Historical task/WBS | Field | Before | After");
    for (const row of day.rows) lines.push(rowFacts(row, input.includeFullValues).join(" | "));
  }
  lines.push("", "Audit events are recorded changes; they do not establish all work performed.");
  return lines.join("\n");
}

// Static, embedded CSS only: no external URLs, fonts, scripts, @import or remote content.
// Inline styling on table cells makes Copy for Outlook closer to the HTML preview.
const STYLES = [
  "body{font-family:Arial,Helvetica,sans-serif;color:#23374d;background:#fff;margin:32px}",
  "header{border-bottom:2px solid #264a71;padding-bottom:16px;margin-bottom:18px}",
  "h1{font-size:25px;color:#1b3857;margin:0 0 8px}",
  "h2{font-size:17px;color:#234567;margin:22px 0 8px}",
  ".muted{font-size:12px;color:#5b6e82;line-height:1.6}",
  ".metrics{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0 20px}",
  ".metric{border:1px solid #dce5ec;background:#f5f8fb;border-radius:5px;padding:12px;min-width:120px}",
  ".metric strong{display:block;font-size:20px}",
  "table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:11px}",
  "th,td{border-bottom:1px solid #e2e8ef;padding:8px 9px;text-align:left;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}",
  "th{background:#e9f0f7;color:#264b70}",
  "td.before{color:#934646}td.after{color:#21694b}",
  ".audit-day{break-inside:avoid-page;margin-bottom:20px}",
  ".empty{border:1px dashed #ccd8e4;background:#f7f9fc;padding:14px}",
  "footer{margin-top:25px;padding-top:12px;border-top:1px solid #dce5ee;color:#5c7082;font-size:11px}",
  "@media print{body{margin:12mm}.audit-day{break-inside:auto}tr{break-inside:avoid}}",
].join("");

const WIDTHS = ["17%", "15%", "20%", "14%", "17%", "17%"];
const HEADERS = ["Save ID / UTC time", "Workstream", "Task / WBS", "Field", "Before", "After"];

function tableRow(row: Report11AuditRow, full: boolean): string {
  const data = [
    row.changeSetId + "\n" + row.timestampUTC,
    row.currentWorkstream,
    row.historicalTaskTitle + "\nWBS " + row.historicalWbsCode,
    row.field,
    display(row.oldValue, full),
    display(row.newValue, full),
  ];
  return "<tr>" + data.map((value, index) =>
    '<td' + (index === 4 ? ' class="before"' : index === 5 ? ' class="after"' : "") +
      ' style="border-bottom:1px solid #e2e8ef;padding:8px 9px;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap;' +
      (index === 4 ? 'color:#934646;' : index === 5 ? 'color:#21694b;' : '') +
      '">' + escapeReportHtml(value) + "</td>").join("") + "</tr>";
}

function table(day: Report11Audit["days"][number], full: boolean): string {
  const widths = WIDTHS.map((width) => '<col style="width:' + width + '">').join("");
  const heads = HEADERS.map((text) =>
    '<th scope="col" style="background:#e9f0f7;color:#264b70;padding:8px 9px;border-bottom:1px solid #d6e1ec;text-align:left">' +
    escapeReportHtml(text) + "</th>").join("");
  return '<section class="audit-day"><h2>' + escapeReportHtml(day.localDay) +
    ' · ' + day.rows.length + ' field change(s)</h2><table><colgroup>' + widths +
    '</colgroup><thead><tr>' + heads + '</tr></thead><tbody>' +
    day.rows.map((row) => tableRow(row, full)).join("") +
    "</tbody></table></section>";
}

/** Entire output is an inert, fully offline HTML document. */
export function renderReport11AuditHtml(input: Report11ExportInput): string {
  check(input);
  const title = escapeReportHtml(input.title);
  const heading = escapeReportHtml(input.projectName.trim());
  const summary = escapeReportHtml(input.startDay + " to " + input.endDay +
    " · " + input.timeZone + " · Generated " + input.generatedAt);
  const metric = (label: string, number: number) =>
    '<div class="metric"><span>' + escapeReportHtml(label) + '</span><strong>' + number + '</strong></div>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src &#39;none&#39;; connect-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">' +
    '<title>' + title + ' · ' + heading + '</title><style>' + STYLES + '</style></head><body>' +
    '<header><h1>' + title + '</h1><strong>' + heading +
    '</strong><p class="muted">' + summary + '</p></header>' +
    '<section class="metrics">' + metric("Affected tasks", input.audit.distinctTasks) +
    metric("Save events", input.audit.logicalSaves) +
    metric("Field changes", input.audit.fieldRows) + '</section>' +
    (input.historyPresent === false ? '<p class="empty">History not available: UpdateHistory sheet is absent.</p>' :
      input.audit.days.length ? input.audit.days.map((day) => table(day, input.includeFullValues)).join("") :
      '<p class="empty">No recorded changes in this period.</p>') +
    '<footer>Read-only historical audit. Saved transitions do not prove all work performed.</footer>' +
    '</body></html>';
}
