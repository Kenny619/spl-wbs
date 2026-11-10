import { escapeReportHtml } from "./report11AuditRender";
import type { Report11ChangeRow, Report11Snapshot, Report11TaskRow } from "./report11Snapshot";

function headline(snapshot: Report11Snapshot): readonly [string, string, string] {
  const go = snapshot.goLive;
  const goLive = go.kind === "identified" ?
    go.days + " days" : go.kind === "past" ? "0 days (go-live date passed)" :
    go.kind === "ambiguous" ? "Ambiguous go-live" :
    go.kind === "unidentified" ? "Go-live not identified" : "Holiday coverage incomplete";
  const next = snapshot.nextMilestone;
  const milestone = next.kind === "identified" ?
    next.task.taskName + " · " + next.date + " · " + next.days + " days remaining" :
    next.kind === "none" ? "None" : "Holiday coverage incomplete";
  const red = snapshot.risks.filter((row) => row.tone === "red").length;
  const amber = snapshot.risks.filter((row) => row.tone === "amber").length;
  return [goLive, milestone, red + " red/blocked · " + amber + " amber/at risk"];
}
function group<T extends { workstream: string }>(items: readonly T[]): ReadonlyMap<string, readonly T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const array = map.get(item.workstream) ?? [];
    array.push(item);
    map.set(item.workstream, array);
  }
  return new Map([...map].sort(([a], [b]) => a.localeCompare(b)));
}
function taskText(items: readonly Report11TaskRow[]): string[] {
  if (!items.length) return ["None"];
  const lines: string[] = [];
  for (const [name, list] of group(items)) {
    lines.push(name);
    for (const item of list) lines.push("- " + item.name + " — " + item.status +
      (item.due ? " · Due " + item.due : "") + " · " + item.owner);
  }
  return lines;
}
function changeText(items: readonly Report11ChangeRow[]): string[] {
  if (!items.length) return ["No recorded changes in this category."];
  const lines: string[] = [];
  for (const [name, list] of group(items)) {
    lines.push(name);
    for (const item of list) lines.push("- " + item.historicalName +
      " (WBS " + item.historicalWbs + ") · " + item.field +
      ": " + String(item.oldValue ?? "(empty)") + " → " +
      String(item.newValue ?? "(empty)") + " · " + item.timestampUTC +
      " · Save " + item.changeSetId);
  }
  return lines;
}
export function renderReport11Text(s: Report11Snapshot): string {
  const [go, next, exception] = headline(s);
  const lines = [
    s.mode === "status" ? "LATEST STATUS" : "PROGRESS & RISKS UPDATE",
    "Project: " + s.projectName,
    s.period ? "Period: " + s.period.start + " to " + s.period.end :
      "As of: " + s.today,
    "Generated: " + s.generatedAt + " (" + s.timeZone + ")",
    "",
    "DAYS TO GO-LIVE: " + go,
    "UPCOMING MILESTONE: " + next,
    "CURRENT EXCEPTIONS: " + exception,
    "",
    "RISKS AND BLOCKERS",
    ...taskText(s.risks),
    ...(s.omittedRisks ? ["… " + s.omittedRisks + " additional risk tasks omitted by Top 10 selection."] : []),
  ];
  if (s.mode === "progress") {
    lines.push("", "RECORDED PROGRESS & ACCOMPLISHMENTS",
      ...(s.historyCoverage === "unavailable" ? ["History not available."] :
        changeText(s.recordedProgress)),
      "", "SCHEDULE CHANGES",
      ...(s.historyCoverage === "unavailable" ? ["History not available."] :
        changeText(s.scheduleChanges)));
  }
  lines.push("", "UPCOMING COMMITMENTS · 5 WORKING DAYS",
    ...(s.commitmentCoverage === "ready" ? taskText(s.commitments) :
      ["Holiday coverage incomplete; no exact upcoming horizon can be calculated."]),
    ...(s.omittedCommitments ? ["… " + s.omittedCommitments + " additional commitment tasks omitted by Top 10 selection."] : []));
  lines.push("", "Current task conditions are not historical period-change evidence.");
  return lines.join("\n");
}

const CSS = [
  "body{font-family:Arial,Helvetica,sans-serif;max-width:960px;margin:26px auto;color:#243950;background:#fff;padding:0 18px}",
  "h1{color:#193958;font-size:25px;margin-bottom:5px}",
  "h2{color:#234e72;font-size:15px;border-bottom:1px solid #d9e4ec;padding-bottom:6px}",
  "p{line-height:1.5}",
  ".sub{color:#5c7088;font-size:12px}",
  ".metrics{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}",
  ".metric{border:1px solid #d4e1ee;background:#f3f7fb;border-radius:6px;padding:12px;flex:1;min-width:155px}",
  ".metric strong{font-size:19px;display:block;margin:5px 0}",
  "table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:11px;margin:9px 0 17px}",
  "th{text-align:left;background:#e9f1f8;color:#355c80}",
  "td,th{padding:8px 9px;border-bottom:1px solid #e2e9f1;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}",
  "tr.red{background:#ffe9e8;border-left:5px solid #b93030}",
  "tr.amber{background:#fff2db;border-left:5px solid #b7821d}",
  ".empty{background:#f6f9fc;padding:14px;color:#6a7d8e}",
  "footer{color:#5b7083;border-top:1px solid #dde7ef;padding:12px 0;margin-top:22px;font-size:11px}",
  "@media print{body{max-width:none;margin:0}tr{break-inside:avoid}}",
].join("");
function esc(x: unknown): string { return escapeReportHtml(x); }
function tableRows(items: readonly Report11TaskRow[]): string {
  if (!items.length) return '<p class="empty">None</p>';
  return [...group(items)].map(([name, list]) =>
    '<h3 style="font-size:12px;color:#315b81">' + esc(name) + '</h3><table style="width:100%;table-layout:fixed;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px"><colgroup><col style=\"width:39%\"><col style=\"width:24%\"><col style=\"width:37%\"></colgroup>\' +
    '<thead><tr><th style="background:#e9f1f8;color:#355c80;padding:8px">Task</th><th style="background:#e9f1f8;color:#355c80;padding:8px">Status</th><th style="background:#e9f1f8;color:#355c80;padding:8px">Due / Owner</th></tr></thead><tbody>' +
    list.map((item) => '<tr' + (item.tone !== "neutral" ? ' class="' + item.tone + '" style="background:' + (item.tone === "red" ? "#ffe9e8" : "#fff2db") + ';border-left:5px solid '+(item.tone === "red" ? "#b93030" : "#b7821d")+'"' : "") +
      '><td style="padding:8px;border-bottom:1px solid #e2e9f1;vertical-align:top">' + esc(item.name) + '</td><td style="padding:8px;border-bottom:1px solid #e2e9f1;vertical-align:top">' + esc(item.status) +
      (item.tone !== "neutral" ? " · " + esc(item.tone.toUpperCase()) : "") +
      '</td><td style="padding:8px;border-bottom:1px solid #e2e9f1;vertical-align:top">' + esc(item.due ?? "Unscheduled") + ' · ' + esc(item.owner) + '</td></tr>').join("") +
    "</tbody></table>").join("");
}
function savedRows(items: readonly Report11ChangeRow[], unavailable: boolean): string {
  if (unavailable) return '<p class="empty">History not available.</p>';
  if (!items.length) return '<p class="empty">No recorded changes in this category.</p>';
  return [...group(items)].map(([name, list]) =>
    "<h3>" + esc(name) + "</h3><table><colgroup><col style=\"width:31%\"><col style=\"width:29%\"><col style=\"width:40%\"></colgroup>" +
    "<thead><tr><th>Historical task</th><th>Recorded field change</th><th>Saved event</th></tr></thead><tbody>" +
    list.map(item => "<tr><td>" + esc(item.historicalName) + " · WBS " +
      esc(item.historicalWbs) + "</td><td>" + esc(item.field) + ": " +
      esc(item.oldValue ?? "(empty)") + " → " + esc(item.newValue ?? "(empty)") +
      "</td><td>" + esc(item.timestampUTC) + "\n" + esc(item.changeSetId) + "</td></tr>").join("") +
    "</tbody></table>").join("");
}
export function renderReport11Html(s: Report11Snapshot): string {
  const [go, next, exception] = headline(s);
  const card = (label: string, value: string) =>
    '<div class="metric" style="display:inline-block;vertical-align:top;border:1px solid #d4e1ee;background:#f3f7fb;border-radius:5px;padding:12px;min-width:150px;margin:0 8px 8px 0"><span style="font-size:11px;color:#5b7083">' + esc(label) + '</span><strong style="display:block;font-size:19px;color:#193958;margin-top:5px">' + esc(value) + '</strong></div>';
  const intro = s.mode === "status" ? "Latest Status" : "Progress & Risks Update";
  const dates = s.period ? s.period.start + " to " + s.period.end : "As of " + s.today;
  const section = (label: string, html: string) => '<section><h2 style="font-family:Arial,sans-serif;font-size:15px;color:#234e72;border-bottom:1px solid #d9e4ec;padding-bottom:6px">' + esc(label) + "</h2>" + html + "</section>";
  const omission = (count: number) => count > 0 ? '<p class="sub">' + count + ' additional qualifying task(s) omitted by Top 10 selection.</p>' : '';
  const unavailable = s.historyCoverage === "unavailable";
  const body = '<header><h1>' + esc(intro) + '</h1><strong>' + esc(s.projectName) +
    '</strong><p class="sub">' + esc(dates) + " · " + esc(s.timeZone) +
    " · Generated " + esc(s.generatedAt) + '</p></header>' +
    '<div class="metrics">' + card("Days to go-live", go) +
    card("Upcoming milestone", next) + card("Risks and blockers", exception) + '</div>' +
    section("Risks and Blockers", tableRows(s.risks) + omission(s.omittedRisks)) +
    (s.mode === "progress" ?
      section("Recorded Progress & Accomplishments", savedRows(s.recordedProgress, unavailable)) +
      section("Schedule Changes", savedRows(s.scheduleChanges, unavailable)) : "") +
    section("Upcoming Commitments · 5 working days",
      s.commitmentCoverage === "ready" ? tableRows(s.commitments) + omission(s.omittedCommitments) :
      '<p class="empty">Holiday coverage incomplete; exact due horizon unavailable.</p>') +
    "<footer>Current status is not proof of change during the selected period. Report generated read-only.</footer>";
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src &#39;none&#39;; connect-src &#39;none&#39;; base-uri &#39;none&#39;">' +
    "<title>" + esc(intro) + " · " + esc(s.projectName) + "</title><style>" +
    CSS + "</style></head><body>" + body + "</body></html>";
}
