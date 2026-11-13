import { addCalendarDays, todayInTimeZone } from "../calendar/dateOnly";
import { bundledHolidayCalendar, type HolidayCalendar } from "../calendar/jpHolidays";
import type { Task } from "../data/types";
import { readManagedHistoryWithPresence } from "./history";
import { buildReport11Audit } from "./report11Audit";
import {
  renderReport11AuditHtml, renderReport11AuditText, type Report11ExportInput,
} from "./report11AuditRender";
import { copyReport11ForOutlook } from "./report11Clipboard";
import { loadReportProjectName, saveReportProjectName } from "./report11ProjectName";
import { buildReport11Snapshot } from "./report11Snapshot";
import { renderReport11Html, renderReport11Text } from "./report11StakeholderRender";
import { reportUtcRange } from "./reports";

export type CommittedReportContext = {
  fileName: string | null;
  tasks: readonly Task[] | null;
  workbook: Uint8Array | null;
  timeZone: string;
  hasUnsavedDraft: boolean;
  /** Optional authoritative loaded calendar; bundled v17 calendar is fallback. */
  holidayCalendar?: HolidayCalendar;
};

/** All preview/clipboard/download representations are generated together once. */
type Report11Output = Readonly<{ text: string; html: string; mode: string }>;

export class ManagedReports {
  private readonly dialog: HTMLDialogElement;
  private readonly launch: HTMLButtonElement;
  private readonly status: HTMLParagraphElement;
  private readonly warning: HTMLParagraphElement;
  private readonly mode: HTMLSelectElement;
  private readonly range: HTMLDivElement;
  private readonly from: HTMLInputElement;
  private readonly through: HTMLInputElement;
  private readonly limit: HTMLSelectElement;
  private readonly full: HTMLInputElement;
  private readonly project: HTMLInputElement;
  private readonly preview: HTMLTextAreaElement;
  private readonly htmlPreview: HTMLIFrameElement;
  private readonly format: HTMLSelectElement;
  private readonly copy: HTMLButtonElement;
  private readonly download: HTMLButtonElement;
  private output: Report11Output | null = null;
  private currentIdentity: string | null = null;
  private busy = false;

  constructor(private readonly doc: Document, private readonly getContext: () => CommittedReportContext) {
    const make = <K extends keyof HTMLElementTagNameMap>(
      tag: K, label?: string, className?: string,
    ): HTMLElementTagNameMap[K] => {
      const node = doc.createElement(tag);
      if (label !== undefined) node.textContent = label;
      if (className) node.className = className;
      return node;
    };
    const field = (label: string, input: HTMLElement): HTMLLabelElement => {
      const box = make("label", undefined, "managed-report-field");
      box.append(make("span", label), input);
      return box;
    };

    this.launch = make("button", "Output Reports", "managed-action");
    this.launch.type = "button";
    this.launch.setAttribute("aria-label", "Output Reports");
    doc.querySelector(".top-actions")?.prepend(this.launch);
    this.launch.addEventListener("click", () => this.open());

    this.dialog = make("dialog", undefined, "managed-reports");
    this.dialog.setAttribute("aria-label", "Output Reports");
    (doc.querySelector(".main") ?? doc.body).append(this.dialog);
    this.dialog.addEventListener("close", () => {
      doc.body.classList.remove("spt-managed-report-open");
      this.launch.classList.remove("active");
      this.launch.removeAttribute("aria-current");
      doc.querySelector<HTMLElement>(".managed-main-nav [data-managed-view='schedule']")?.focus();
    });

    const head = make("div", undefined, "managed-reports-head");
    head.append(make("h2", "Output Reports")); // Fixed top navigation, no redundant Close.
    this.dialog.append(head);

    this.warning = make("p", "", "managed-report-warning");
    this.warning.setAttribute("role", "status");
    this.dialog.append(this.warning);

    const controls = make("div", undefined, "managed-reports-controls");
    this.mode = make("select");
    this.mode.setAttribute("aria-label", "Report mode");
    for (const [label, value] of [
      ["Latest Status", "status"],
      ["Progress & Risks Update", "progress"],
      ["Detailed Change Audit", "audit"],
    ] as const) {
      const option = make("option", label);
      option.value = value;
      this.mode.append(option);
    }
    this.mode.value = "progress";
    this.mode.addEventListener("change", () => this.updateMode());
    controls.append(field("Mode", this.mode));

    this.project = make("input");
    this.project.type = "text";
    this.project.maxLength = 180;
    this.project.placeholder = "Enter project name";
    this.project.setAttribute("aria-label", "Project name");
    controls.append(field("Project name", this.project));

    this.from = make("input");
    this.from.type = "date";
    this.from.setAttribute("aria-label", "Report start date");
    this.through = make("input");
    this.through.type = "date";
    this.through.setAttribute("aria-label", "Report end date");
    this.range = make("div", undefined, "managed-reports-period");
    this.range.append(make("div", "Reporting period", "report11-period-heading"));
    this.range.append(field("From (inclusive)", this.from), field("Through (inclusive)", this.through));
    controls.append(this.range);

    this.limit = make("select");
    this.limit.setAttribute("aria-label", "Report task limit");
    for (const [title, value] of [["All Tasks", "all"], ["Top 10", "top10"]] as const) {
      const option = make("option", title);
      option.value = value;
      this.limit.append(option);
    }
    this.limit.value = "all";
    controls.append(field("Task details", this.limit));

    const fullLabel = make("label", undefined, "managed-report-check");
    this.full = make("input");
    this.full.type = "checkbox";
    this.full.setAttribute("aria-label", "Include complete long old and new values");
    fullLabel.append(this.full, make("span", "Complete historical Description / Updates values"));
    controls.append(fullLabel);
    this.dialog.append(controls);

    const actions = make("div", undefined, "managed-reports-actions");
    const generate = make("button", "Generate / Refresh", "managed-action primary");
    generate.type = "button";
    generate.addEventListener("click", () => { void this.generate(); });

    this.format = make("select");
    this.format.setAttribute("aria-label", "Report format");
    for (const [title, value] of [["HTML", "html"], ["Plain text", "text"]] as const) {
      const option = make("option", title);
      option.value = value;
      this.format.append(option);
    }
    this.format.addEventListener("change", () => this.showFormat());

    this.copy = make("button", "Copy for Outlook", "managed-action");
    this.copy.type = "button";
    this.copy.disabled = true;
    this.copy.addEventListener("click", () => { void this.copyReport(); });

    this.download = make("button", "Download", "managed-action");
    this.download.type = "button";
    this.download.disabled = true;
    this.download.addEventListener("click", () => this.downloadReport());
    actions.append(generate, this.format, this.copy, this.download);
    this.dialog.append(actions);

    this.status = make("p", "Select Generate / Refresh to create a report snapshot.", "managed-report-status");
    this.status.setAttribute("role", "status");
    this.dialog.append(this.status);

    const label = make("label", undefined, "managed-report-preview");
    label.append(make("span", "Preview · plain text"));
    this.preview = make("textarea");
    this.preview.setAttribute("aria-label", "Report preview");
    this.preview.readOnly = true;
    this.preview.rows = 18;
    this.preview.spellcheck = false;
    label.append(this.preview);
    this.dialog.append(label);

    this.htmlPreview = make("iframe", undefined, "managed-report-html-preview");
    this.htmlPreview.title = "Formatted report preview";
    this.htmlPreview.setAttribute("sandbox", "");
    this.htmlPreview.setAttribute("aria-label", "Formatted report preview");
    this.htmlPreview.style.width = "100%";
    this.htmlPreview.style.minHeight = "640px";
    this.htmlPreview.style.border = "1px solid #c9d7e5";
    this.dialog.append(this.htmlPreview);

    // DES-012 Review08 is the sole current visual authority, INCLUDING Reports.
    // Reparent ONLY the existing live report controls/preview; original
    // reporting, clipboard, download and workbook snapshot handlers stay intact.
    this.dialog.classList.add("report11-studio", "report11-des012");
    const studio = make("div", undefined, "report11-layout");
    const sidebar = make("aside", undefined, "report11-builder");
    sidebar.setAttribute("aria-label", "Report builder");
    const intro = make("div", undefined, "report11-builder-intro");
    head.querySelector("h2")!.textContent = "Build a report";
    intro.append(head, make("p",
      "Choose the perspective, set your scope and preview a stakeholder-ready document.",
      "report11-intro-copy"));
    sidebar.append(intro);

    const modeArea = make("section", undefined, "report11-builder-section");
    // Review08 places the three report perspectives immediately below the intro.
    const modes = make("div", undefined, "report11-modes");
    for (const [value, title, description, symbol] of [
      ["status", "Latest Status", "Executive snapshot, key exceptions and upcoming commitments.", "◫"],
      ["progress", "Progress & Risks Update", "Recorded achievements, emerging concerns and schedule changes.", "↗"],
      ["audit", "Detailed Change Audit", "Time-stamped historical field changes with linked saves.", "≡"],
    ] as const) {
      const button = make("button", undefined, "report11-mode-card");
      button.type = "button";
      button.dataset.report11Mode = value;
      button.setAttribute("aria-pressed", "false");
      button.append(make("span", symbol, "report11-mode-icon"));
      const wording = make("span", undefined, "report11-mode-wording");
      wording.append(make("strong", title), make("small", description));
      button.append(wording);
      button.addEventListener("click", () => {
        this.mode.value = value;
        this.updateMode();
      });
      modes.append(button);
    }
    modeArea.append(modes);
    // Retain accessible native selector for keyboard and existing UAT scripts.
    const nativeMode = controls.querySelector("label")!;
    nativeMode.classList.add("report11-native-mode");
    // Visible mode cards are keyboard-accessible; do not create a hidden tab stop.
    this.mode.tabIndex = -1;
    nativeMode.setAttribute("title", "Report mode compatibility selector");
    modeArea.append(nativeMode);
    sidebar.append(modeArea);
    const inputSection = make("section", undefined, "report11-builder-section");
    inputSection.classList.add("report11-settings-section");
    inputSection.append(controls);
    sidebar.append(inputSection);
    const generateSection = make("div", undefined, "report11-generate-area");
    generate.textContent = "Generate / Refresh preview";
    generate.classList.add("report11-generate");
    generate.prepend(make("span", "↻", "report11-button-icon"));
    generateSection.append(generate, this.warning, this.status);
    sidebar.append(generateSection);
    sidebar.append(make("p",
      "Evidence principle · Saved changes and current risks are reported separately. No unsupported progress trends or mitigation actions are inferred.",
      "report11-evidence-note"));

    const workspace = make("section", undefined, "report11-workspace");
    workspace.setAttribute("aria-label", "Report document workspace");
    const panelHead = make("div", undefined, "report11-panel-head");
    const heading = make("div", undefined, "report11-heading");
    heading.append(make("h2", "Document preview", "report11-panel-title"));
    heading.append(make("p", "STATIC SNAPSHOT · Generate to apply current settings", "report11-panel-subtitle"));
    panelHead.append(heading);
    const toolbar = make("div", undefined, "report11-toolbar");
    const formatChoices = make("div", undefined, "report11-format-choices");
    formatChoices.setAttribute("role", "group");
    formatChoices.setAttribute("aria-label", "Preview format");
    for (const [value, title] of [["html", "HTML preview"], ["text", "Plain text"]] as const) {
      const button = make("button", title, "report11-format-choice");
      button.type = "button";
      button.dataset.report11Format = value;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        this.format.value = value;
        this.showFormat();
      });
      formatChoices.append(button);
    }
    toolbar.append(formatChoices);
    this.format.classList.add("report11-native-format");
    this.format.tabIndex = -1; // Visible HTML/plain buttons own keyboard focus.
    this.format.title = "Report format (keyboard selector)";
    toolbar.append(this.format, this.copy, this.download);
    panelHead.append(toolbar);
    workspace.append(panelHead);
    const meta = make("div", undefined, "report11-preview-top");
    meta.append(make("strong", "FIXED SNAPSHOT", "report11-fixed-pill"));
    meta.append(make("span", "Professional HTML preview · printable and offline", "report11-preview-description"));
    workspace.append(meta);
    const stage = make("div", undefined, "report11-paper-stage");
    const paper = make("div", undefined, "report11-paper-viewport");
    label.classList.add("report11-text-paper");
    paper.append(this.htmlPreview, label);
    stage.append(paper);
    workspace.append(stage);
    const bottom = make("div", undefined, "report11-bottom");
    bottom.append(make("span", "Committed workbook data only · No report-initiated writes"),
      make("span", "Use Generate / Refresh to apply new settings"));
    workspace.append(bottom);
    studio.append(sidebar, workspace);
    this.dialog.replaceChildren(studio);
    this.updateMode();
    this.showFormat();
  }

  getLaunchButton(): HTMLButtonElement { return this.launch; }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  open(): void {
    if (this.dialog.open) return;
    const context = this.getContext();
    const today = todayInTimeZone(new Date(), context.timeZone);
    if (!this.through.value) this.through.value = today;
    if (!this.from.value) this.from.value = addCalendarDays(today, -7);
    if (context.fileName !== this.currentIdentity) {
      this.currentIdentity = context.fileName;
      this.project.value = "";
      if (context.fileName) {
        let storage: Storage | null = null;
        try { storage = this.doc.defaultView?.localStorage ?? null; } catch { /* denied */ }
        this.project.value = loadReportProjectName(context.fileName, storage).projectName;
      }
    }
    this.refreshWarning();
    this.doc.body.classList.add("spt-managed-report-open");
    this.launch.classList.add("active");
    this.launch.setAttribute("aria-current", "page");
    this.dialog.show(); // Nonmodal: Schedule/Reports header navigation remains operable.
    (this.dialog.querySelector<HTMLButtonElement>(".report11-mode-card.active") ?? this.mode).focus();
  }

  private refreshWarning(): void {
    const context = this.getContext();
    this.warning.textContent = context.hasUnsavedDraft
      ? "Unsaved task edits exist. Reports use the last verified workbook only; your draft is excluded."
      : "Reports are read-only. Generating, copying and downloading never modifies Excel.";
  }

  private updateMode(): void {
    const dated = this.mode.value !== "status";
    this.range.hidden = !dated;
    this.full.parentElement!.hidden = this.mode.value !== "audit";
    this.limit.parentElement!.hidden = this.mode.value === "audit";
    this.dialog.querySelectorAll<HTMLButtonElement>("[data-report11-mode]").forEach((button) => {
      const active = button.dataset.report11Mode === this.mode.value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    // Keep the approved "Document preview" heading fixed when changing modes:
    // preview content remains the last GENERATED snapshot until Generate is clicked.
  }

  private showFormat(): void {
    const html = this.format.value === "html";
    this.htmlPreview.hidden = !html;
    this.preview.parentElement!.hidden = html;
    this.copy.textContent = html ? "Copy for Outlook" : "Copy Report";
    this.download.textContent = html ? "Download HTML" : "Download text";
    this.dialog.querySelectorAll<HTMLButtonElement>("[data-report11-format]").forEach((button) => {
      const active = button.dataset.report11Format === this.format.value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const description = this.dialog.querySelector<HTMLElement>(".report11-preview-description");
    if (description) description.textContent = html
      ? "Professional HTML preview · print-friendly, offline"
      : "Exact plain-text report preview · suitable for email and chat";
    // Display-only format change: neither report content nor timestamp changes.
    if (this.output) {
      this.preview.value = this.output.text;
      if (html) this.htmlPreview.srcdoc = this.output.html;
    }
  }

  private async generate(): Promise<void> {
    if (this.busy) return;
    this.refreshWarning();
    const source = this.getContext();
    if (!source.fileName || !source.tasks || !source.workbook) {
      this.status.textContent = "Choose and load a workbook before generating a report.";
      return;
    }
    const projectName = this.project.value.trim();
    if (!projectName) {
      this.status.textContent = "Enter a Project name before generating; workbook filename is not a report name.";
      this.project.focus();
      return;
    }
    this.busy = true;
    this.status.textContent = "Generating from the last verified workbook…";
    try {
      const generatedAt = new Date();
      const mode = this.mode.value;
      const timeZone = source.timeZone;
      let output: Report11Output;
      if (mode === "audit" || mode === "progress") {
        // Validates inclusive dates even when UpdateHistory is absent.
        reportUtcRange(this.from.value, this.through.value, timeZone);
      }
      if (mode === "audit") {
        const history = await readManagedHistoryWithPresence(source.workbook);
        const audit = buildReport11Audit(history.events, source.tasks,
          this.from.value, this.through.value, timeZone);
        const input: Report11ExportInput = {
          projectName, title: "Detailed Change Audit",
          generatedAt: generatedAt.toISOString(), timeZone,
          startDay: this.from.value, endDay: this.through.value,
          audit, includeFullValues: this.full.checked,
          historyPresent: history.present,
        };
        const html = renderReport11AuditHtml(input);
        const text = renderReport11AuditText(input);
        output = { html, text, mode };
      } else {
        const history = mode === "progress" ?
          await readManagedHistoryWithPresence(source.workbook) : null;
        const snapshot = buildReport11Snapshot({
          mode: mode === "status" ? "status" : "progress",
          projectName, tasks: source.tasks, history: history?.events ?? null,
          historyAvailable: history?.present ?? false,
          timeZone, generatedAt, calendar: source.holidayCalendar ?? bundledHolidayCalendar(),
          startDay: this.from.value, endDay: this.through.value,
          limit: this.limit.value === "top10" ? "top10" : "all",
        });
        output = { html: renderReport11Html(snapshot), text: renderReport11Text(snapshot), mode };
      }
      // Atomic output replacement: if generation fails, previous snapshot remains.
      this.output = Object.freeze(output);
      this.preview.value = output.text;
      this.htmlPreview.srcdoc = output.html;
      this.copy.disabled = false;
      this.download.disabled = false;
      this.showFormat();
      let storage: Storage | null = null;
      try { storage = this.doc.defaultView?.localStorage ?? null; } catch { /* denied */ }
      const persisted = saveReportProjectName(source.fileName, projectName, storage);
      this.status.textContent = "Generated " + mode +
        " snapshot from committed data. Content remains fixed until Generate / Refresh." +
        (persisted ? "" : " Project name remains available in this session; browser storage unavailable.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown report error.";
      this.status.textContent = "Report not generated: " + message +
        (this.output ? " Previous snapshot retained." : "");
    } finally { this.busy = false; }
  }

  private async copyReport(): Promise<void> {
    if (!this.output || this.busy) return;
    const output = this.output;
    const browser = this.doc.defaultView;
    try {
      if (this.format.value === "html") {
        const ClipboardItemConstructor = typeof ClipboardItem === "undefined" ? null : ClipboardItem;
        await copyReport11ForOutlook(
          output.html, output.text, browser?.navigator.clipboard,
          ClipboardItemConstructor ?? null,
        );
        this.status.textContent = "HTML and matching plain text copied. Paste into an Outlook HTML message.";
      } else if (browser?.navigator.clipboard?.writeText) {
        await browser.navigator.clipboard.writeText(output.text);
        this.status.textContent = "Exact plain-text preview copied.";
      } else {
        this.preview.parentElement!.hidden = false;
        this.preview.focus();
        this.preview.select();
        if (!this.doc.execCommand("copy")) throw new Error("Clipboard access was denied.");
        this.showFormat();
        this.status.textContent = "Exact plain-text preview copied.";
      }
    } catch (error) {
      this.status.textContent = "Copy failed: " +
        (error instanceof Error ? error.message : "Clipboard permission unavailable.") +
        " Use Download or manually copy the plain-text preview.";
    }
  }

  private downloadReport(): void {
    if (!this.output || this.busy) return;
    const isHtml = this.format.value === "html";
    const blob = new Blob([isHtml ? this.output.html : this.output.text],
      { type: isHtml ? "text/html;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = this.doc.createElement("a");
    anchor.href = url;
    anchor.download = this.output.mode + "-report." + (isHtml ? "html" : "txt");
    this.doc.body.append(anchor);
    try {
      anchor.click();
      this.status.textContent = "Report download requested; no workbook was changed.";
    } finally {
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  }
}
