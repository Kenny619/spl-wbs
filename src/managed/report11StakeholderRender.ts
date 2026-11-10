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
  const red = snapshot.totalRedRisks;
  const amber = snapshot.totalAmberRisks;
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
  lines.push("", "UPCOMING COMMITMENTS · NEXT 5 DAYS",
    ...(s.commitmentCoverage === "ready" ? taskText(s.commitments) :
      ["Holiday coverage incomplete; no exact upcoming horizon can be calculated."]),
    ...(s.omittedCommitments ? ["… " + s.omittedCommitments + " additional commitment tasks omitted by Top 10 selection."] : []));
  lines.push("", "Current task conditions are not historical period-change evidence. Days exclude weekends and Japanese holidays.");
  return lines.join("\n");
}

// Review 02 paper design is embedded inside the exported document so
// the corporate-Edge preview, offline HTML file, print and Outlook clipboard
// all share ONE visual structure from the SAME canonical report snapshot.
const CSS = [
  "*{box-sizing:border-box}",
  "body{margin:0;padding:29px;background:#fff;color:#28364a;font:12px/1.5 Arial,Helvetica,sans-serif}",
  ".report-paper{max-width:960px;margin:0 auto;background:#fff}",
  ".report-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:2px solid #294b72;padding-bottom:20px}",
  ".report-label{color:#356f9f;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}",
  "h1{font-size:26px;line-height:1.15;letter-spacing:-.6px;margin:7px 0;color:#1a3049}",
  ".report-desc{font-size:12px;color:#64778d;line-height:1.5}",
  ".report-date{text-align:right;font-size:11px;color:#677b91;line-height:1.6}",
  ".report-date strong{display:block;color:#253b56}",
  ".metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:22px 0 15px}",
  ".metric{border:1px solid #dce6ef;background:#f6f9fd;border-radius:7px;padding:14px 12px;min-width:0}",
  ".metric.go-live{background:#eaf5fc;border:2px solid #4e8bb9}",
  ".metric.red{background:#ffebe9;border:2px solid #be3c36}",
  ".metric.amber{background:#fff3dd;border:2px solid #ca8b1f}",
  ".metric span{display:block;color:#62758b;font-size:9px;letter-spacing:.04em;text-transform:uppercase;font-weight:800}",
  ".metric strong{display:block;color:#1b3858;font-size:23px;letter-spacing:-.5px;margin:5px 0 3px}",
  ".metric.red strong{color:#a73936}.metric.amber strong{color:#9c6b1b}",
  ".metric em{display:block;font-size:10px;color:#71849a;font-style:normal;line-height:1.4}",
  ".summary-box{background:#f6f9fd;border:1px solid #d7e4f0;border-radius:7px;padding:13px 16px;margin:15px 0}",
  ".summary-box strong{display:block;font-size:13px;color:#203c5d}",
  ".summary-box p{margin:5px 0 0;color:#50677d;font-size:11px;line-height:1.6}",
  ".report-section{padding-top:18px}",
  ".section-title{border-bottom:1px solid #d9e3ee;padding-bottom:9px;display:flex;align-items:center;justify-content:space-between}",
  "h2{font-size:15px;color:#203c5d;margin:0}",
  ".count{color:#6e8298;background:#f0f4f9;border-radius:4px;padding:4px 7px;font-size:10px}",
  ".workstream{border:1px solid #dbe5ec;border-radius:7px;margin-top:9px;overflow:hidden}",
  ".workstream-head{background:#f4f8fc;color:#365a7c;padding:8px 12px;font-size:11px;font-weight:800;border-bottom:1px solid #e0e8f1}",
  ".compact-table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:10.5px}",
  ".compact-table td{padding:8px 10px;vertical-align:middle;border-bottom:1px solid #e6edf4;overflow-wrap:anywhere;white-space:pre-wrap}",
  ".compact-table tr:last-child td{border-bottom:0}",
  ".compact-table td:first-child{font-weight:700;color:#253c55}",
  ".compact-table tr.red{background:#ffedea;border-left:5px solid #bb3030}",
  ".compact-table tr.amber{background:#fff6e7;border-left:5px solid #c88b27}",
  ".tag{font-size:9px;padding:4px 6px;font-weight:800;border-radius:4px;display:inline-block}",
  ".tag.red{background:#ad2929;color:#fff}.tag.amber{background:#f0ae36;color:#382503}",
  ".empty{border:1px dashed #c9d7e6;background:#f7f9fc;color:#637a92;padding:15px;border-radius:6px}",
  ".evidence{border:1px solid #c9ddec;background:#eff6fc;color:#41627f;border-radius:6px;padding:12px 14px;margin-top:20px;font-size:11px}",
  ".sub{color:#64778d;font-size:10px;line-height:1.6}",
  "footer{border-top:1px solid #dfe7f0;color:#74869b;font-size:10px;line-height:1.6;margin-top:25px;padding-top:13px}",
  "@media(max-width:700px){body{padding:16px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.report-top{display:block}.report-date{text-align:left;margin-top:8px}}",
  "@media print{body{padding:0}.workstream,.metric,tr{break-inside:avoid}}",
].join("");

function esc(value: unknown): string { return escapeReportHtml(value); }
const CELL = 'padding:8px 10px;border-bottom:1px solid #e6edf4;vertical-align:middle;overflow-wrap:anywhere;white-space:pre-wrap;';
function statusTag(row: Report11TaskRow): string {
  if (row.tone === "neutral") return esc(row.status);
  const danger = row.tone === "red";
  const bg = danger ? "#ad2929" : "#f0ae36";
  const fg = danger ? "#ffffff" : "#382503";
  return '<span class="tag ' + row.tone +
    '" style="display:inline-block;border-radius:4px;padding:4px 6px;font-size:9px;font-weight:800;background:' +
    bg + ';color:' + fg + '">' + esc(row.tone.toUpperCase()) + '</span> ' + esc(row.status);
}
function groupSection<T extends {workstream: string}>(
  rows: readonly T[], renderer: (item:T)=>string,
): string {
  if (!rows.length) return '<div class="empty">No qualifying items.</div>';
  return [...group(rows)].map(([name, list]) =>
    '<div class="workstream" style="border:1px solid #dbe5ec;border-radius:7px;margin-top:9px;overflow:hidden">' +
    '<div class="workstream-head" style="background:#f4f8fc;color:#365a7c;font-size:11px;font-weight:800;padding:8px 12px">' +
    esc(name) + ' <span style="float:right">' + list.length + ' item(s)</span></div>' +
    '<table class="compact-table" style="border-collapse:collapse;table-layout:fixed;width:100%;font-size:10.5px"><tbody>' +
    list.map(renderer).join("") + '</tbody></table></div>').join("");
}
function taskRows(rows: readonly Report11TaskRow[]): string {
  return groupSection(rows, item => {
    const highlight = item.tone === "red" ? 'background:#ffedea;border-left:5px solid #bb3030;' :
      item.tone === "amber" ? 'background:#fff6e7;border-left:5px solid #c88b27;' : '';
    return '<tr class="' + item.tone + '" style="' + highlight + '">' +
      '<td style="' + CELL + 'width:37%;font-weight:700;color:#253c55">' + esc(item.name) + '</td>' +
      '<td style="' + CELL + 'width:25%">' + statusTag(item) + '</td>' +
      '<td style="' + CELL + 'width:38%">' + esc(item.due ?? "Unscheduled") + ' · ' + esc(item.owner) +
      '</td></tr>';
  });
}
function historyRows(rows: readonly Report11ChangeRow[], missing: boolean): string {
  if (missing) return '<div class="empty">History not available.</div>';
  if (!rows.length) return '<div class="empty">No recorded changes in this category.</div>';
  return groupSection(rows, item =>
    '<tr><td style="' + CELL + 'width:32%;font-weight:700">' +
    esc(item.historicalName) + ' · WBS ' + esc(item.historicalWbs) + '</td>' +
    '<td style="' + CELL + 'width:36%">' + esc(item.field) + ': ' +
    esc(item.oldValue ?? "(empty)") + ' → ' + esc(item.newValue ?? "(empty)") + '</td>' +
    '<td style="' + CELL + 'width:32%;font-size:9px;color:#688099">' +
    esc(item.timestampUTC) + ' · Save ' + esc(item.changeSetId) + '</td></tr>');
}
export function renderReport11Html(s: Report11Snapshot): string {
  const [days, milestone] = headline(s);
  const intro = s.mode === "status" ? "Latest Status" : "Progress & Risks Update";
  const dates = s.period ? s.period.start + " – " + s.period.end : "As of " + s.today;
  const card = (label:string, value:string|number, note:string, tone="") => {
    const bg=tone==="go-live"?"#eaf5fc":tone==="red"?"#ffebe9":tone==="amber"?"#fff3dd":"#f6f9fd";
    const border=tone==="go-live"?"#4e8bb9":tone==="red"?"#be3c36":tone==="amber"?"#ca8b1f":"#dce6ef";
    return '<div class="metric ' + tone + '" style="display:inline-block;vertical-align:top;box-sizing:border-box;background:' + bg +
      ';border:2px solid ' + border + ';border-radius:7px;padding:13px 12px;min-width:125px;margin:0 5px 7px 0">' +
      '<span style="display:block;color:#62758b;font-size:9px;font-weight:800;text-transform:uppercase">' +
      esc(label) + '</span><strong style="display:block;font-size:23px;color:' +
      (tone==="red"?"#a73936":tone==="amber"?"#9c6b1b":"#1b3858") + ';margin:5px 0">' + esc(value) +
      '</strong><em style="display:block;font-size:10px;font-style:normal;color:#71849a">' + esc(note) + '</em></div>';
  };
  const section = (name:string, html:string, count:number) =>
    '<section class="report-section"><div class="section-title"><h2>' + esc(name) +
    '</h2><span class="count">' + count + ' item(s)</span></div>' + html + '</section>';
  const omitted = (n:number) => n ? '<p class="sub">' + n +
    ' qualifying task(s) omitted by the selected Top 10 limit.</p>' : '';
  const missing = s.historyCoverage === "unavailable";
  const upcoming = s.nextMilestone.kind === "identified" ?
    s.nextMilestone.task.taskName + ' · ' + s.nextMilestone.date : "Next incomplete milestone";
  const goNote = (s.goLive.kind === "identified" || s.goLive.kind === "past") ?
    s.goLive.task.taskName + ' · ' + s.goLive.date : "Unique G5 / Release / Launch milestone required";
  const content =
    '<article class="report-paper">' +
    '<header class="report-top" style="display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #294b72;padding-bottom:20px">' +
    '<div><div class="report-label">SPT-WBS / Leadership reporting</div><h1>' + esc(intro) +
    '</h1><div class="report-desc">' + esc(s.projectName) + ' · ' +
    (s.mode === "status" ? "Current exceptions and near-term commitments" :
      "Recorded changes and current exceptions") + '</div></div>' +
    '<div class="report-date"><strong>' + esc(dates) + '</strong>Generated ' + esc(s.generatedAt) +
    '<div>' + esc(s.timeZone) + '</div></div></header>' +
    '<div class="metrics">' +
    card("Days to go-live", days, goNote, "go-live") +
    card("Upcoming milestone", milestone, upcoming) +
    card("Red / Blocked", s.totalRedRisks, "Current exception statuses", "red") +
    card("Amber / At Risk", s.totalAmberRisks, "Current exception statuses", "amber") +
    '</div>' +
    '<div class="summary-box"><strong>Executive snapshot</strong><p>' +
    'Current blocked and at-risk tasks are shown first. ' +
    (s.mode === "progress" ?
      'Progress and schedule changes below are evidenced by saved history; they are not inferred from current task dates.' :
      'Healthy in-progress task listings are intentionally omitted.') +
    '</p></div>' +
    section("Risks and Blockers", taskRows(s.risks) + omitted(s.omittedRisks), s.totalRedRisks + s.totalAmberRisks) +
    (s.mode === "progress" ?
      section("Recorded Progress and Accomplishments", historyRows(s.recordedProgress, missing), s.recordedProgress.length) +
      section("Schedule Changes", historyRows(s.scheduleChanges, missing), s.scheduleChanges.length) : "") +
    section("Upcoming Commitments · Next 5 days",
      (s.commitmentCoverage === "ready" ? taskRows(s.commitments) + omitted(s.omittedCommitments) :
      '<div class="empty">Holiday coverage incomplete; the exact due horizon is unavailable.</div>'),
      s.commitments.length + s.omittedCommitments) +
    '<div class="evidence"><strong>Evidence note:</strong> Current risks and commitments come from the committed workbook. ' +
    'Recorded changes come only from saved UpdateHistory. No unsupported historic trend or risk cause is inferred.</div>' +
    '<footer>SPT-WBS · Read-only stakeholder report · Day counts exclude weekends and Japanese holidays. ' +
    'Report generation never writes to the workbook.</footer></article>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src &#39;none&#39;; connect-src &#39;none&#39;; base-uri &#39;none&#39;">' +
    '<title>' + esc(intro) + ' · ' + esc(s.projectName) + '</title><style>' +
    CSS + '</style></head><body>' + content + '</body></html>';
}
