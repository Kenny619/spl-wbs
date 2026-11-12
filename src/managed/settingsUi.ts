import type { ImportController } from "../data/importController";
import { sharedProjectDisplayName, type ProjectContext } from "./projectContext";
import { blackoutFromInput } from "../calendar/blackout";
import { parseIsoDateOnly } from "../calendar/dateOnly";
import type { ProjectEdit } from "./projectDataCandidate";

export type CalendarSaveOutcome = { kind: "saved" | "noop" | "blocked"; message: string };
import { MANAGED_APP_VERSION, MANAGED_APPROVED_UI_BASELINE } from "./version";
import {
  DEFAULT_COLUMNS, defaultPreferences, effectiveAppearance, loadPreferences,
  persistPreferences, supportedTimeZones, validateColumns, type ManagedPreferences,
  type PreferenceStorage,
} from "./settings";

/** Managed-only Settings workspace; uses existing v18 column checkboxes and handlers. */
export class ManagedSettings {
  private preferences: ManagedPreferences;
  private storage: PreferenceStorage | null = null;
  private readonly dialog: HTMLDialogElement;
  private readonly launch: HTMLButtonElement;
  private readonly selector: HTMLSelectElement;
  private readonly saveNote: HTMLParagraphElement;
  private readonly calendarInfo: HTMLParagraphElement;
  private readonly calendarEditor: HTMLDivElement;
  private readonly calendarEdit: HTMLButtonElement;
  private readonly calendarSave: HTMLButtonElement;
  private readonly calendarCancel: HTMLButtonElement;
  private readonly calendarFeedback: HTMLParagraphElement;
  private readonly calendarEnabled: HTMLInputElement;
  private readonly calendarStart: HTMLInputElement;
  private readonly calendarEnd: HTMLInputElement;
  private readonly calendarLabel: HTMLInputElement;
  private readonly calendarProjectName: HTMLInputElement;
  private readonly calendarProjectNameField: HTMLLabelElement;
  private calendarSaving = false;
  private readonly appearanceInputs: HTMLInputElement[] = [];
  private readonly scheme: MediaQueryList | null;

  constructor(
    private readonly doc: Document,
    private readonly controller: ImportController,
    navigate: (action: () => void) => void,
    private readonly openHistory: () => void = () => {},
    private readonly getProjectContext: () => ProjectContext | null = () => null,
    private readonly canEditProject: () => boolean = () => false,
    private readonly saveProjectCalendar: (edit: ProjectEdit) => Promise<CalendarSaveOutcome> =
      async () => ({ kind: "blocked", message: "Project Calendar Save is unavailable." }),
  ) {
    try { this.storage = doc.defaultView?.localStorage ?? null; } catch { /* unavailable */ }
    this.preferences = loadPreferences(this.storage);
    const media = doc.defaultView?.matchMedia?.("(prefers-color-scheme: dark)");
    this.scheme = media ?? null;
    this.scheme?.addEventListener?.("change", () => this.applyAppearance());
    const make = <K extends keyof HTMLElementTagNameMap>(
      tag: K, text?: string, cls?: string,
    ): HTMLElementTagNameMap[K] => {
      const node = doc.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (cls) node.className = cls;
      return node;
    };
    this.launch = make("button", "⚙ Settings", "managed-action");
    this.launch.type = "button";
    this.launch.setAttribute("aria-label", "Settings");
    doc.querySelector(".top-actions")?.prepend(this.launch);
    this.launch.addEventListener("click", () => navigate(() => this.open()));

    this.dialog = make("dialog", undefined, "managed-settings");
    this.dialog.setAttribute("aria-label", "Settings");
    doc.body.append(this.dialog);
    this.dialog.addEventListener("close", () => this.launch.focus());

    const header = make("div", undefined, "managed-settings-head");
    const heading = make("h2", "Settings");
    const close = make("button", "Close", "managed-action");
    close.type = "button";
    close.addEventListener("click", () => { if (!this.calendarSaving) this.dialog.close(); });
    this.dialog.addEventListener("cancel", (event) => {
      if (this.calendarSaving) event.preventDefault();
    });
    header.append(heading, close);
    this.dialog.append(header);
    const tabs = make("nav", undefined, "managed-drawer-tabs");
    tabs.setAttribute("aria-label", "Settings sections");
    const preferenceTab = make("button", "Preferences", "managed-action active");
    preferenceTab.type = "button";
    preferenceTab.setAttribute("aria-current", "page");
    const historyTab = make("button", "Change History", "managed-action");
    historyTab.type = "button";
    historyTab.addEventListener("click", () => {
      if (this.calendarSaving) return;
      this.dialog.close();
      // Opens the real workbook-backed History surface, with no synthetic records.
      this.openHistory();
    });
    tabs.append(preferenceTab, historyTab);
    this.dialog.append(tabs);
    const body = make("div", undefined, "managed-settings-body");
    this.dialog.append(body);

    const timeSection = make("section", undefined, "managed-settings-section");
    timeSection.append(make("h3", "Display timezone"));
    const explanation = make("p",
      "Only instant timestamps change. Task start/finish dates and saved UTC history are never shifted.",
      "managed-settings-hint");
    timeSection.append(explanation);
    const timezoneLabel = make("label", undefined, "managed-settings-label");
    timezoneLabel.append(make("span", "Timezone (IANA)"));
    this.selector = make("select");
    this.selector.setAttribute("aria-label", "Display timezone");
    for (const name of supportedTimeZones(this.preferences.timeZone)) {
      const option = make("option", name);
      option.value = name;
      this.selector.append(option);
    }
    this.selector.value = this.preferences.timeZone;
    this.selector.addEventListener("change", () => {
      this.preferences = { ...this.preferences, timeZone: this.selector.value };
      this.persist();
    });
    timezoneLabel.append(this.selector);
    timeSection.append(timezoneLabel);
    body.append(timeSection);

    const columns = make("section", undefined, "managed-settings-section");
    columns.append(make("h3", "Columns"), make("p",
      "Choose visible WBS fields. WBS and Task are always shown; the original column order is retained.",
      "managed-settings-hint"));
    const existing = doc.getElementById("columnOptions");
    if (!existing) throw new Error("Approved v18 Columns controls were not found.");
    // Move the *same* v18 controls (and their existing event handlers), not a fork.
    columns.append(existing);
    const oldToggle = doc.getElementById("columnToggle");
    if (oldToggle) oldToggle.style.display = "none";
    body.append(columns);

    const calendar = make("section", undefined, "managed-settings-section");
    calendar.append(make("h3", "Project Calendar"),
      make("p", "Shared Excel workbook settings. Personal display preferences remain on this device.",
        "managed-settings-hint"));
    this.calendarInfo = make("p", "Load a workbook to inspect its project blackout.",
      "managed-settings-hint");
    this.calendarInfo.setAttribute("aria-live", "polite");
    calendar.append(this.calendarInfo);
    this.calendarEdit = make("button", "Edit Project Calendar", "managed-action");
    this.calendarEdit.type = "button";
    this.calendarEdit.addEventListener("click", () => this.beginCalendarEdit());
    calendar.append(this.calendarEdit);

    this.calendarEditor = make("div", undefined, "managed-calendar-editor");
    this.calendarEditor.hidden = true;
    const labelField = (name: string, input: HTMLInputElement): HTMLLabelElement => {
      const field = make("label", undefined, "managed-settings-label");
      field.append(make("span", name), input);
      this.calendarEditor.append(field);
      return field;
    };
    this.calendarProjectName = make("input");
    this.calendarProjectName.type = "text";
    this.calendarProjectName.maxLength = 180;
    this.calendarProjectName.setAttribute("aria-label", "New shared project name");
    this.calendarProjectNameField = labelField("Project name (first initialization)", this.calendarProjectName);
    const enabledLabel = make("label", undefined, "managed-calendar-check");
    this.calendarEnabled = make("input");
    this.calendarEnabled.type = "checkbox";
    this.calendarEnabled.setAttribute("aria-label", "Enable project blackout");
    enabledLabel.append(this.calendarEnabled, make("span", "Enable project blackout"));
    this.calendarEditor.append(enabledLabel);
    this.calendarStart = make("input");
    this.calendarStart.type = "date";
    this.calendarStart.setAttribute("aria-label", "Blackout start");
    labelField("Start date", this.calendarStart);
    this.calendarEnd = make("input");
    this.calendarEnd.type = "date";
    this.calendarEnd.setAttribute("aria-label", "Blackout end");
    labelField("End date (inclusive)", this.calendarEnd);
    this.calendarLabel = make("input");
    this.calendarLabel.type = "text";
    this.calendarLabel.maxLength = 500;
    this.calendarLabel.setAttribute("aria-label", "Blackout description");
    labelField("Description (optional)", this.calendarLabel);
    this.calendarEnabled.addEventListener("change", () => this.syncCalendarInputs());
    const actions = make("div", undefined, "managed-actions");
    this.calendarSave = make("button", "Save to shared workbook", "managed-action primary");
    this.calendarSave.type = "button";
    this.calendarSave.addEventListener("click", () => { void this.commitCalendar(); });
    this.calendarCancel = make("button", "Cancel calendar edit", "managed-action");
    this.calendarCancel.type = "button";
    this.calendarCancel.addEventListener("click", () => {
      if (this.calendarSaving) return;
      this.calendarEditor.hidden = true;
      this.calendarEdit.hidden = false;
      this.calendarFeedback.textContent = "Calendar changes discarded. Shared workbook unchanged.";
    });
    actions.append(this.calendarSave, this.calendarCancel);
    this.calendarEditor.append(actions);
    this.calendarFeedback = make("p", "", "managed-settings-hint");
    this.calendarFeedback.setAttribute("role", "status");
    this.calendarEditor.append(this.calendarFeedback);
    calendar.append(this.calendarEditor);
    body.append(calendar);

    const appearance = make("section", undefined, "managed-settings-section");
    appearance.append(make("h3", "Appearance"));
    const radioGroup = make("fieldset", undefined, "managed-settings-appearance");
    radioGroup.append(make("legend", "Theme"));
    for (const [value, label] of [
      ["system", "System (match device)"],
      ["light", "Light"],
      ["dark", "Dark"],
    ] as const) {
      const option = make("label", undefined, "managed-settings-radio");
      const radio = make("input");
      radio.type = "radio";
      radio.name = "managed-appearance";
      radio.value = value;
      radio.checked = this.preferences.appearance === value;
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        this.preferences = { ...this.preferences, appearance: value };
        this.applyAppearance();
        this.persist();
      });
      this.appearanceInputs.push(radio);
      option.append(radio, make("span", label));
      radioGroup.append(option);
    }
    appearance.append(radioGroup);
    body.append(appearance);

    const about = make("section", undefined, "managed-settings-section");
    about.append(make("h3", "About this application"),
      make("p", "Managed development version: " + MANAGED_APP_VERSION, "managed-settings-hint"),
      make("p", "Approved read-only UI baseline: " + MANAGED_APPROVED_UI_BASELINE +
        ". This isolated managed UI adaptation is under development and is not released.", "managed-settings-hint"));
    body.append(about);

    const footer = make("div", undefined, "managed-settings-footer");
    const reset = make("button", "Reset to defaults", "managed-action");
    reset.type = "button";
    reset.addEventListener("click", () => {
      if (!doc.defaultView?.confirm("Reset timezone, columns and appearance to their defaults?")) return;
      this.preferences = defaultPreferences();
      this.selector.value = this.preferences.timeZone;
      for (const radio of this.appearanceInputs) radio.checked = radio.value === "system";
      // Preserve v18 reset parity: clear filters dependent on the restored columns.
      this.controller.patchView({
        columns: [...DEFAULT_COLUMNS], types: [], workstreams: [],
      });
      this.applyAppearance();
      this.persist();
    });
    this.saveNote = make("p", "Preferences are stored only in this browser/device.", "managed-settings-hint");
    footer.append(reset, this.saveNote);
    body.append(footer);

    // The importer recreates its ViewState on start() and workbook changes.
    // Persist column changes only when *the user* calls patchView(columns);
    // restore browser preferences when a newly imported ViewState is published.
    // This avoids interpreting a workbook-load default as a user preference.
    const originalPatch = controller.patchView.bind(controller);
    originalPatch({ columns: [...this.preferences.columns] });
    controller.patchView = (patch) => {
      if (patch.columns !== undefined) {
        this.preferences = { ...this.preferences, columns: validateColumns(patch.columns) };
        this.persist();
      }
      originalPatch(patch);
    };
    controller.subscribe(() => {
      const columnsNow = controller.getState().view.columns;
      if (JSON.stringify(columnsNow) !== JSON.stringify(this.preferences.columns)) {
        originalPatch({ columns: [...this.preferences.columns] });
      }
    });
    this.applyAppearance();
  }

  getLaunchButton(): HTMLButtonElement { return this.launch; }
  getTimeZone(): string { return this.preferences.timeZone; }
  getPreferences(): ManagedPreferences {
    return { ...this.preferences, columns: [...this.preferences.columns] };
  }

  open(): void {
    if (this.dialog.open) return;
    this.refreshProjectCalendar();
    this.selector.value = this.preferences.timeZone;
    this.dialog.showModal();
    this.dialog.querySelector<HTMLButtonElement>(".managed-settings-head button")?.focus();
  }

  private syncCalendarInputs(): void {
    const enabled = this.calendarEnabled.checked && !this.calendarSaving;
    for (const input of [this.calendarStart, this.calendarEnd, this.calendarLabel]) {
      input.disabled = !enabled;
    }
  }

  /** Always reflect the committed workbook, never unsaved form values. */
  refreshProjectCalendar(): void {
    const context = this.getProjectContext();
    if (!context) {
      this.calendarInfo.textContent = "Load a workbook to inspect project calendar data.";
    } else if (context.kind === "legacy") {
      this.calendarInfo.textContent =
        "Project name not configured · Project blackout not configured (legacy workbook).";
    } else if (context.kind !== "valid") {
      this.calendarInfo.textContent =
        "Project data unavailable: workbook extension is incompatible or unsupported.";
    } else {
      const range = context.blackout.enabled
        ? context.blackout.start + " – " + context.blackout.end
        : "No enabled blackout";
      this.calendarInfo.textContent =
        sharedProjectDisplayName(context) + " · Committed blackout: " + range;
    }
    this.calendarEdit.disabled = !this.canEditProject() ||
      !context || (context.kind !== "legacy" && context.kind !== "valid");
    this.calendarEdit.title = this.calendarEdit.disabled
      ? "Choose a writable, verified workbook to edit shared Calendar data." : "";
    this.calendarEdit.hidden = false;
    this.calendarEditor.hidden = true;
  }

  private beginCalendarEdit(): void {
    if (this.calendarSaving || !this.canEditProject()) return;
    const context = this.getProjectContext();
    if (!context || (context.kind !== "valid" && context.kind !== "legacy")) return;
    this.calendarProjectNameField.hidden = context.kind !== "legacy";
    this.calendarProjectName.value = "";
    this.calendarEnabled.checked = context.kind === "valid" && context.blackout.enabled;
    this.calendarStart.value = context.kind === "valid" ? context.blackout.start : "";
    this.calendarEnd.value = context.kind === "valid" ? context.blackout.end : "";
    this.calendarLabel.value = context.kind === "valid" ? context.blackoutLabel : "";
    this.calendarFeedback.textContent = "";
    this.calendarEdit.hidden = true;
    this.calendarEditor.hidden = false;
    this.syncCalendarInputs();
    if (context.kind === "legacy") this.calendarProjectName.focus();
    else this.calendarEnabled.focus();
  }

  private async commitCalendar(): Promise<void> {
    if (this.calendarSaving || !this.canEditProject()) return;
    const context = this.getProjectContext();
    if (!context || (context.kind !== "legacy" && context.kind !== "valid")) return;
    let blackout: { blackoutId: string; startDate: string; endDate: string; label: string } | undefined;
    if (this.calendarEnabled.checked) {
      const start = this.calendarStart.value;
      const end = this.calendarEnd.value;
      const validation = blackoutFromInput(true, start, end);
      if ("error" in validation || !parseIsoDateOnly(start) || !parseIsoDateOnly(end)) {
        this.calendarFeedback.textContent = "Enter a valid inclusive blackout date range.";
        return;
      }
      blackout = {
        blackoutId: context.kind === "valid" && context.blackoutId
          ? context.blackoutId : crypto.randomUUID(),
        startDate: start, endDate: end, label: this.calendarLabel.value,
      };
    }
    let edit: ProjectEdit;
    if (context.kind === "legacy") {
      const projectName = this.calendarProjectName.value.trim();
      if (!projectName) {
        this.calendarFeedback.textContent = "A shared project name is required for first initialization.";
        return;
      }
      edit = { kind: "initialize", projectId: crypto.randomUUID(), projectName, ...(blackout ? { blackout } : {}) };
    } else if (blackout) {
      edit = { kind: "set-blackout", blackout };
    } else if (context.blackout.enabled && context.blackoutId) {
      edit = { kind: "disable-blackout", blackoutId: context.blackoutId };
    } else {
      this.calendarFeedback.textContent = "No shared Calendar changes to save.";
      return;
    }

    this.calendarSaving = true;
    this.calendarSave.disabled = true;
    this.calendarCancel.disabled = true;
    this.calendarEdit.disabled = true;
    this.calendarEnabled.disabled = true;
    this.calendarProjectName.disabled = true;
    this.syncCalendarInputs();
    this.calendarFeedback.textContent = "Verifying shared workbook and saving…";
    try {
      const result = await this.saveProjectCalendar(edit);
      if (result.kind === "saved" || result.kind === "noop") {
        this.refreshProjectCalendar();
        this.calendarFeedback.textContent = result.message;
      } else {
        this.calendarFeedback.textContent = result.message;
      }
    } catch (error) {
      this.calendarFeedback.textContent =
        "Calendar Save not verified: " + (error instanceof Error ? error.message : "Unknown error");
    } finally {
      this.calendarSaving = false;
      this.calendarSave.disabled = false;
      this.calendarCancel.disabled = false;
      this.calendarEnabled.disabled = false;
      this.calendarProjectName.disabled = false;
      this.syncCalendarInputs();
    }
  }

  private applyAppearance(): void {
    this.doc.body.dataset.managedTheme = effectiveAppearance(
      this.preferences.appearance, !!this.scheme?.matches,
    );
    this.doc.body.dataset.managedAppearance = this.preferences.appearance;
  }

  private persist(): void {
    const saved = persistPreferences(this.preferences, this.storage);
    this.saveNote.textContent = saved
      ? "Preferences saved on this browser/device. The workbook is unchanged."
      : "Browser storage unavailable: preferences apply now but may reset after reload.";
  }
}
