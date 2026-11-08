import type { ImportController } from "../data/importController";
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
  private readonly appearanceInputs: HTMLInputElement[] = [];
  private readonly scheme: MediaQueryList | null;

  constructor(
    private readonly doc: Document,
    private readonly controller: ImportController,
    navigate: (action: () => void) => void,
    private readonly openHistory: () => void,
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
    close.addEventListener("click", () => this.dialog.close());
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

  getTimeZone(): string { return this.preferences.timeZone; }
  getPreferences(): ManagedPreferences {
    return { ...this.preferences, columns: [...this.preferences.columns] };
  }

  open(): void {
    if (this.dialog.open) return;
    this.selector.value = this.preferences.timeZone;
    this.dialog.showModal();
    this.dialog.querySelector<HTMLButtonElement>(".managed-settings-head button")?.focus();
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
