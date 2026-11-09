import { addCalendarDays, todayInTimeZone } from "../calendar/dateOnly";
import type { Task } from "../data/types";
import { readManagedHistory } from "./history";
import { generateLatestStatusReport, generateUpdateReport, type ReportLimit } from "./reports";

export type CommittedReportContext = {
  fileName: string | null;
  tasks: readonly Task[] | null;
  workbook: Uint8Array | null;
  timeZone: string;
  hasUnsavedDraft: boolean;
};

export class ManagedReports {
  private readonly dialog: HTMLDialogElement;
  private readonly launch: HTMLButtonElement;
  private readonly status: HTMLParagraphElement;
  private readonly preview: HTMLTextAreaElement;
  private readonly mode: HTMLSelectElement;
  private readonly range: HTMLDivElement;
  private readonly from: HTMLInputElement;
  private readonly through: HTMLInputElement;
  private readonly limit: HTMLSelectElement;
  private readonly full: HTMLInputElement;
  private readonly copy: HTMLButtonElement;
  private reportText = "";
  private busy = false;
  private readonly warning: HTMLParagraphElement;

  constructor(private readonly doc: Document, private readonly getContext: () => CommittedReportContext) {
    const make = <K extends keyof HTMLElementTagNameMap>(
      name: K, value?: string, className?: string,
    ): HTMLElementTagNameMap[K] => {
      const node = doc.createElement(name);
      if (value !== undefined) node.textContent = value;
      if (className) node.className = className;
      return node;
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
    const title = make("h2", "Output Reports");
    // Global Schedule / Reports navigation is permanently visible.
    // A second Close button is redundant in this nonmodal workspace.
    head.append(title);
    this.dialog.append(head);

    this.warning = make("p", "", "managed-report-warning");
    this.warning.setAttribute("role", "status");
    this.dialog.append(this.warning);
    const controls = make("div", undefined, "managed-reports-controls");
    const field = (title: string, input: HTMLElement): HTMLLabelElement => {
      const label = make("label", undefined, "managed-report-field");
      label.append(make("span", title), input);
      return label;
    };
    this.mode = make("select");
    this.mode.setAttribute("aria-label", "Report mode");
    for (const [name, value] of [
      ["Latest Status Report", "status"], ["Update Report", "updates"],
    ] as const) {
      const option = make("option", name);
      option.value = value;
      this.mode.append(option);
    }
    this.mode.addEventListener("change", () => this.updateMode());
    controls.append(field("Mode", this.mode));

    this.from = make("input");
    this.from.type = "date";
    this.from.setAttribute("aria-label", "Report start date");
    this.through = make("input");
    this.through.type = "date";
    this.through.setAttribute("aria-label", "Report end date");
    this.range = make("div", undefined, "managed-reports-period");
    this.range.append(field("From (inclusive)", this.from), field("Through (inclusive)", this.through));
    controls.append(this.range);

    this.limit = make("select");
    this.limit.setAttribute("aria-label", "Report task limit");
    for (const [title, value] of [["Top 10", "top10"], ["All", "all"]] as const) {
      const option = make("option", title);
      option.value = value;
      this.limit.append(option);
    }
    controls.append(field("Task listings", this.limit));
    const fullLabel = make("label", undefined, "managed-report-check");
    this.full = make("input");
    this.full.type = "checkbox";
    this.full.setAttribute("aria-label", "Include complete long old and new values");
    fullLabel.append(this.full, make("span", "Include complete Description / Updates values"));
    controls.append(fullLabel);
    this.dialog.append(controls);

    const actions = make("div", undefined, "managed-reports-actions");
    const generate = make("button", "Generate / Refresh", "managed-action primary");
    generate.type = "button";
    generate.addEventListener("click", () => { void this.generate(); });
    this.copy = make("button", "Copy Report", "managed-action");
    this.copy.type = "button";
    this.copy.disabled = true;
    this.copy.addEventListener("click", () => { void this.copyReport(); });
    actions.append(generate, this.copy);
    this.dialog.append(actions);
    this.status = make("p", "Select Generate / Refresh to create a report snapshot.", "managed-report-status");
    this.status.setAttribute("role", "status");
    this.dialog.append(this.status);

    const previewLabel = make("label", undefined, "managed-report-preview");
    previewLabel.append(make("span", "Preview · plain text"));
    this.preview = make("textarea");
    this.preview.setAttribute("aria-label", "Report preview");
    this.preview.readOnly = true;
    this.preview.rows = 18;
    this.preview.spellcheck = false;
    previewLabel.append(this.preview);
    this.dialog.append(previewLabel);
    this.updateMode();
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
    this.refreshWarning();
    this.doc.body.classList.add("spt-managed-report-open");
    this.launch.classList.add("active");
    this.launch.setAttribute("aria-current", "page");
    this.dialog.show(); // A nonmodal workspace, so global header navigation stays operable.
    this.mode.focus();
  }
  private refreshWarning(): void {
    const context = this.getContext();
    this.warning.textContent = context.hasUnsavedDraft
      ? "Unsaved task edits exist. Reports use the last verified workbook only; your draft will not be saved or included."
      : "Reports use only the last verified workbook. Generating and copying never modifies Excel.";
  }
  private updateMode(): void {
    const updates = this.mode.value === "updates";
    this.range.hidden = !updates;
    this.limit.parentElement!.hidden = updates;
    this.full.parentElement!.hidden = !updates;
  }
  private async generate(): Promise<void> {
    if (this.busy) return;
    this.refreshWarning();
    const source = this.getContext();
    if (!source.fileName || !source.tasks || !source.workbook) {
      this.status.textContent = "Choose and load a workbook before generating a report.";
      return;
    }
    this.busy = true;
    this.status.textContent = "Generating from committed workbook data…";
    try {
      const now = new Date();
      let output: string;
      if (this.mode.value === "status") {
        output = generateLatestStatusReport({
          fileName: source.fileName, tasks: source.tasks, timeZone: source.timeZone,
          generatedAt: now, limit: this.limit.value as ReportLimit,
        });
      } else {
        const history = await readManagedHistory(source.workbook);
        output = generateUpdateReport({
          fileName: source.fileName, tasks: source.tasks, timeZone: source.timeZone,
          generatedAt: now, startDay: this.from.value, endDay: this.through.value,
          history, includeFullValues: this.full.checked,
        });
      }
      // Replace only after the entire report is valid; any error leaves the
      // previously generated immutable preview available as a stale snapshot.
      this.reportText = output;
      this.preview.value = output;
      this.copy.disabled = false;
      this.status.textContent = "Report generated from " + source.fileName +
        ". Snapshot stays unchanged until Generate / Refresh is selected again.";
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unknown reporting error.";
      this.status.textContent = "Report not generated: " + description +
        (this.reportText ? " Previous snapshot retained." : "");
    } finally { this.busy = false; }
  }
  private async copyReport(): Promise<void> {
    if (!this.reportText || this.busy) return;
    try {
      if (!this.doc.defaultView?.navigator.clipboard?.writeText) {
        // Some supported file:// environments deny async Clipboard API;
        // try a genuine user-initiated textarea copy without modifying preview.
        this.preview.focus();
        this.preview.select();
        if (!this.doc.execCommand("copy")) throw new Error("Clipboard access was denied.");
      } else {
        await this.doc.defaultView.navigator.clipboard.writeText(this.reportText);
      }
      this.status.textContent = "Copied exactly " + this.reportText.length +
        " characters from the report preview.";
    } catch (error) {
      this.status.textContent = "Copy failed: " +
        (error instanceof Error ? error.message : "Clipboard permission unavailable.") +
        " Select the preview text to copy manually.";
    }
  }
}
