import "./managed.css";
import { boot } from "../main";
import type { ImportController } from "../data/importController";
import { KNOWN_STATUSES, TASK_TYPES, type Task } from "../data/types";
import { collectTaskChanges, hasTaskChanges, initialTaskDraft, type TaskDraft } from "./draft";
import { captureManagedSourceHash, inspectManagedSave, saveManagedAsCopy, saveManagedDirect, sha256 } from "./directSave";
import { preflightManagedWorkbook } from "./preflight";
import { openManagedHistory } from "./historyUi";
import { ManagedSettings } from "./settingsUi";
import { ManagedReports } from "./reportsUi";
import { mountManagedShell } from "./shell";
import { MANAGED_APP_VERSION as APP_VERSION } from "./version";
import { openManagedRecovery } from "./recoveryUi";
import type { EditableField, EditValue } from "./workbookCandidate";

type DirectoryWithEntries = FileSystemDirectoryHandle & {
  entries(): AsyncIterable<[string, FileSystemHandle]>;
};
type PickerHost = typeof globalThis & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};
const STORAGE_PREFIX = "spt-wbs:managed:lastWorkbook:";

const FIELDS: Array<{ field: EditableField; label: string; kind: "text" | "date" | "number" | "textarea" | "select" }> = [
  { field: "Title", label: "Task title", kind: "text" },
  { field: "AssignedTo", label: "Owner", kind: "text" },
  { field: "TaskStatus", label: "Status", kind: "select" },
  { field: "Progress", label: "Progress (%)", kind: "number" },
  { field: "PlannedStart", label: "Planned start", kind: "date" },
  { field: "PlannedEnd", label: "Planned finish", kind: "date" },
  { field: "Priority", label: "Priority", kind: "text" },
  { field: "Workstream", label: "Workstream", kind: "text" },
  { field: "WBSCode", label: "WBS code", kind: "text" },
  { field: "ParentTaskID", label: "Parent task", kind: "select" },
  { field: "TaskType", label: "Task type", kind: "select" },
  { field: "Description", label: "Description", kind: "textarea" },
  { field: "Updates", label: "Append update", kind: "textarea" },
];

function element<K extends keyof HTMLElementTagNameMap>(
  doc: Document, tag: K, className = "", content?: string,
): HTMLElementTagNameMap[K] {
  const result = doc.createElement(tag);
  if (className) result.className = className;
  if (content !== undefined) result.textContent = content;
  return result;
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected filesystem error occurred.";
}

export class ManagedEditor {
  private directory: FileSystemDirectoryHandle | null = null;
  private sourceName: string | null = null;
  private loadedHash: string | null = null;
  private loadedBytes: Uint8Array | null = null;
  private canWrite = false;
  private recoveryHold = false;
  private inspectionName: string | null = null;
  private names: string[] = [];
  private editing = false;
  private busy = false;
  private selectedId: string | null = null;
  private initial: TaskDraft | null = null;
  private draft: TaskDraft | null = null;
  private message = "";
  private pending: (() => void) | null = null;
  private readonly slot: HTMLDivElement;
  private readonly banner: HTMLDivElement;
  private readonly fileSelect: HTMLSelectElement;
  private readonly dialog: HTMLDialogElement;
  private readonly settings: ManagedSettings;
  private readonly reports: ManagedReports;

  constructor(private readonly doc: Document, private readonly controller: ImportController) {
    doc.body.classList.add("spt-managed");
    const topbar = doc.querySelector(".topbar");
    const actions = doc.querySelector(".top-actions");
    if (!topbar || !actions) throw new Error("Approved v18 layout is missing required UI regions.");
    this.banner = element(doc, "div", "managed-banner");
    this.banner.setAttribute("role", "status");
    topbar.after(this.banner);
    this.slot = element(doc, "div", "managed-editor");
    doc.getElementById("panel")?.append(this.slot);
    this.dialog = element(doc, "dialog", "managed-dialog");
    this.dialog.setAttribute("aria-label", "Unsaved changes");
    doc.body.append(this.dialog);
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.dialog.open) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.resolvePending(false);
      }
    }, { capture: true });

    const reconnect = doc.getElementById("reconnect");
    if (reconnect) reconnect.style.display = "none";
    const empty = doc.getElementById("emptyText");
    if (empty) empty.textContent = "Choose a local project folder, then select a workbook.";
    for (const [id, title] of [
      ["choose", "Choose project folder"], ["change", "Change folder"],
      ["reload", "Reload workbook"], ["forget", "Disconnect"],
    ]) {
      const item = doc.getElementById(id);
      if (item) item.textContent = title;
    }

    const wrap = element(doc, "div", "managed-chooser");
    const label = element(doc, "label", "", "Workbook ");
    this.fileSelect = element(doc, "select");
    this.fileSelect.setAttribute("aria-label", "Active Excel workbook");
    this.fileSelect.disabled = true;
    label.append(this.fileSelect);
    wrap.append(label);
    actions.prepend(wrap);
    const inspectButton = element(doc, "button", "managed-action", "Inspect Save State");
    inspectButton.type = "button";
    inspectButton.addEventListener("click", () => {
      if (!this.directory || !this.inspectionName) {
        this.message = "Select a project folder and workbook to inspect its save state.";
        this.render();
        return;
      }
      void openManagedRecovery(doc, this.directory, this.inspectionName).catch((error: unknown) => {
        this.message = "Save-state inspection unavailable: " + errorMessage(error) + ". No files were changed.";
        this.render();
      });
    });
    actions.prepend(inspectButton);
    this.fileSelect.addEventListener("change", () => {
      const next = this.fileSelect.value;
      this.fileSelect.value = this.sourceName ?? "";
      if (next && next !== this.sourceName) {
        this.guard(() => { void this.openWorkbook(next); });
      }
    });

    for (const id of ["choose", "change"]) doc.getElementById(id)?.addEventListener("click", () => {
      if (this.isDirty()) {
        this.guard(() => {
          this.message = "Changes resolved. Click Change folder again to choose a directory.";
          this.render();
        });
      } else void this.chooseFolder();
    });
    doc.getElementById("reload")?.addEventListener("click", () => {
      this.guard(() => { if (this.sourceName) void this.openWorkbook(this.sourceName); });
    });
    doc.getElementById("forget")?.addEventListener("click", () => {
      this.guard(() => {
        this.directory = null;
        this.sourceName = null;
        this.loadedHash = null;
        this.loadedBytes = null;
        this.inspectionName = null;
        this.recoveryHold = false;
        this.names = [];
        this.canWrite = false;
        this.clearDraft();
        this.message = "Disconnected; no workbook data was changed.";
        void this.controller.forget();
        this.render();
      });
    });

    const originalPatch = controller.patchView.bind(controller);
    controller.patchView = (patch) => {
      if (patch.selectedId !== undefined && patch.selectedId !== controller.getState().view.selectedId
        && this.isDirty()) {
        this.guard(() => originalPatch(patch));
        return;
      }
      originalPatch(patch);
    };
    this.settings = new ManagedSettings(
      doc, controller, (action) => this.guard(action),
      () => this.guard(() => { void this.showHistory(); }),
    );
    this.reports = new ManagedReports(doc, () => ({
      fileName: this.sourceName,
      tasks: this.busy ? null : this.controller.getState().tasks,
      workbook: this.loadedBytes,
      timeZone: this.settings.getTimeZone(),
      hasUnsavedDraft: this.isDirty(),
    }));
    mountManagedShell(doc, controller, this.reports, this.settings, (action) => this.guard(action));
    controller.subscribe(() => this.render());
    doc.defaultView?.addEventListener("beforeunload", (event) => {
      if (!this.isDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    });
    this.render();
  }

  private isDirty(): boolean {
    return this.initial !== null && this.draft !== null && hasTaskChanges(this.initial, this.draft);
  }
  private clearDraft(): void {
    this.selectedId = null;
    this.initial = null;
    this.draft = null;
    this.editing = false;
  }

  private guard(action: () => void): void {
    if (this.busy) return;
    if (!this.isDirty()) { action(); return; }
    this.pending = action;
    this.dialog.replaceChildren();
    this.dialog.append(
      element(this.doc, "h3", "", "Unsaved changes"),
      element(this.doc, "p", "", "Save changes, discard them or cancel navigation."),
    );
    const buttons = element(this.doc, "div", "managed-dialog-actions");
    const choice = (label: string, callback: () => void, primary = false) => {
      const button = element(this.doc, "button", "managed-action" + (primary ? " primary" : ""), label);
      button.type = "button";
      button.addEventListener("click", callback);
      buttons.append(button);
    };
    choice("Save", () => {
      void this.save().then((saved) => { if (saved) this.resolvePending(true); });
    }, true);
    choice("Discard", () => { this.clearDraft(); this.resolvePending(true); });
    choice("Cancel", () => this.resolvePending(false));
    this.dialog.append(buttons);
    this.dialog.showModal();
  }
  private resolvePending(proceed: boolean): void {
    this.dialog.close();
    const pending = this.pending;
    this.pending = null;
    if (proceed) pending?.();
    else this.render();
  }

  private async chooseFolder(): Promise<void> {
    const picker = (globalThis as PickerHost).showDirectoryPicker;
    if (typeof picker !== "function") {
      this.message = "Microsoft Edge folder access is required for editing.";
      this.render();
      return;
    }
    let dir: FileSystemDirectoryHandle;
    try { dir = await picker({ mode: "readwrite" }); }
    catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      this.message = "Folder selection failed: " + errorMessage(error);
      this.render();
      return;
    }
    const found: string[] = [];
    try {
      for await (const [name, handle] of (dir as DirectoryWithEntries).entries()) {
        if (handle.kind === "file" && /\.xlsx$/i.test(name) &&
          !/\.(backup|stage)\.xlsx$/i.test(name)) found.push(name);
      }
    } catch (error) {
      this.message = "Cannot read folder: " + errorMessage(error);
      this.render();
      return;
    }
    found.sort((a, b) => a.localeCompare(b));
    if (!found.length) {
      // A failed folder choice must not disconnect a previously verified file.
      this.message = "No eligible XLSX workbooks in " + dir.name +
        ". The previous active workbook was retained.";
      this.render();
      return;
    }
    let remembered: string | null = null;
    try { remembered = localStorage.getItem(STORAGE_PREFIX + dir.name); } catch { /* local-only best effort */ }
    await this.openWorkbook(remembered && found.includes(remembered) ? remembered : found[0], dir, found);
  }

  private async openWorkbook(
    name: string,
    targetDir: FileSystemDirectoryHandle | null = this.directory,
    targetNames: readonly string[] = this.names,
  ): Promise<void> {
    if (!targetDir || !targetNames.includes(name) || this.busy) return;
    // Keep the last verified workbook/directory/fingerprint untouched until
    // inspection, import and source hash all succeed for the new selection.
    this.busy = true;
    this.message = "Validating " + name + " before switching the active workbook…";
    this.render();
    try {
      const file = await (await targetDir.getFileHandle(name)).getFile();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const hash = await captureManagedSourceHash(targetDir, name);
      if (hash !== await sha256(bytes)) {
        throw new Error("Workbook changed while loading; reload before editing.");
      }
      const eligible = await preflightManagedWorkbook(bytes).then(() => true).catch(() => false);
      await this.controller.chooseFile(file);
      const loaded = this.controller.getState();
      if (!loaded.tasks || loaded.fileName !== name || loaded.loadError) {
        throw new Error("Workbook import failed; see the import errors.");
      }
      // Commit the new selection in one step, after its real import succeeds.
      this.directory = targetDir;
      this.names = [...targetNames];
      this.sourceName = name;
      this.inspectionName = name;
      this.loadedHash = hash;
      this.loadedBytes = bytes;
      this.canWrite = eligible;
      this.recoveryHold = false;
      this.clearDraft();
      try { localStorage.setItem(STORAGE_PREFIX + targetDir.name, name); } catch { /* best effort */ }
      this.message = eligible
        ? "Workbook ready. Select a task. Save only disposable copies in this development build."
        : "Viewing allowed, but Save blocked: this workbook uses unsupported Excel features.";
    } catch (error) {
      if (!this.directory && !this.sourceName) {
        // No last-good workbook exists. Keep this folder available to pick
        // another workbook, while preventing editing and direct Save.
        this.directory = targetDir;
        this.names = [...targetNames];
        this.inspectionName = name;
      }
      this.message = "Managed workbook unavailable: " + errorMessage(error) +
        (this.sourceName ? ". Previous verified workbook remains active." :
          ". Choose a different workbook in this folder.");
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async save(): Promise<boolean> {
    if (this.busy || this.recoveryHold || !this.directory || !this.sourceName || !this.loadedHash || !this.canWrite ||
      !this.initial || !this.draft || !this.selectedId) return false;
    const changes = collectTaskChanges(this.initial, this.draft);
    if (!Object.keys(changes).length) {
      this.clearDraft();
      this.message = "No changes; the workbook was not written.";
      this.render();
      return true;
    }
    if (!window.confirm("Development preview: this replaces the selected workbook. Use a disposable copy only. Continue?")) {
      return false;
    }
    const taskId = this.selectedId;
    this.busy = true;
    this.message = "Saving and verifying local XLSX and backup…";
    this.render();
    try {
      const result = await saveManagedDirect({
        directory: this.directory, sourceName: this.sourceName,
        loadedHash: this.loadedHash, taskId, changes, appVersion: APP_VERSION,
      });
      if (result.kind === "noop") {
        this.clearDraft();
        this.message = "No changes; no file write or history append.";
        return true;
      }
      const view = this.controller.getState().view;
      const file = await (await this.directory.getFileHandle(this.sourceName)).getFile();
      const verified = new Uint8Array(await file.arrayBuffer());
      if (await sha256(verified) !== result.sourceHash) {
        throw new Error("Source changed after Save confirmation; do not retry without inspection.");
      }
      await this.controller.chooseFile(file);
      const reloaded = this.controller.getState();
      if (!reloaded.tasks || reloaded.loadError) {
        this.message = "Workbook bytes saved, but screen refresh failed. Draft retained; inspect the workbook before retrying.";
        return false;
      }
      this.loadedHash = result.sourceHash;
      this.loadedBytes = verified;
      this.clearDraft();
      this.controller.patchView({ ...view, selectedId: taskId });
      this.message = "Verified Save: task and UpdateHistory persisted; predecessor backup retained.";
      return true;
    } catch (error) {
      if (this.directory && this.sourceName) {
        try {
          this.recoveryHold = (await inspectManagedSave(this.directory, this.sourceName)).status !== "READY";
        } catch { this.recoveryHold = true; } // Fail closed if diagnosis itself fails.
      }
      this.message = "Save NOT verified: " + errorMessage(error) +
        ". Draft retained. If the source changed externally, use Save As to make a copy from the last loaded version; Reload requires discarding edits.";
      return false;
    } finally {
      this.busy = false;
      this.render();
    }
  }


  /**
   * Safe Save As creates a new same-folder workbook from the loaded snapshot,
   * never from a potentially externally changed source. Target collisions
   * are rejected, and the current file stays active until readback and import.
   */
  private async showHistory(taskId?: string): Promise<void> {
    if (!this.loadedBytes) {
      this.message = "Choose a workbook to view Change History.";
      this.render();
      return;
    }
    const timeZone = this.settings.getTimeZone();
    try {
      await openManagedHistory(this.doc, this.loadedBytes, {
        taskId, timeZone, onSettings: () => this.guard(() => this.settings.open()),
      });
    } catch (error) {
      this.message = "Unable to open Change History: " + errorMessage(error);
      this.render();
    }
  }

  private async saveAs(otherFolder = false): Promise<boolean> {
    if (this.busy || !this.directory || !this.sourceName || !this.loadedHash ||
      !this.loadedBytes || !this.canWrite || !this.initial || !this.draft ||
      !this.selectedId) return false;
    // Call picker directly from the user click, before any prompt/await that
    // could consume Edge's transient user activation.
    let directory = this.directory;
    if (otherFolder) {
      const picker = (globalThis as PickerHost).showDirectoryPicker;
      if (typeof picker !== "function") {
        this.message = "This browser cannot select another folder for Save As.";
        this.render();
        return false;
      }
      try { directory = await picker({ mode: "readwrite" }); }
      catch (error) {
        if (error instanceof Error && error.name === "AbortError") return false;
        this.message = "Save As destination folder not selected: " + errorMessage(error);
        this.render();
        return false;
      }
    }
    const proposed = this.sourceName.replace(/\.xlsx$/i, "-copy.xlsx");
    const reply = window.prompt("Save As — NEW .xlsx name in destination folder \"" + directory.name + "\" (existing files cannot be overwritten):", proposed);
    if (reply === null) return false;
    const name = reply.trim();
    if (!/^[^\/\\]+\.xlsx$/i.test(name) || name.startsWith("~$") ||
      /\.(?:backup|stage)\.xlsx$/i.test(name)) {
      this.message = "Choose a new .xlsx filename without folders or recovery-file suffixes.";
      this.render();
      return false;
    }
    if (!window.confirm(
      "Save As creates a new workbook from the version last loaded in this app plus your pending edits. " +
      "It does NOT merge changes made in Excel or elsewhere. The original remains untouched. Destination folder: " + directory.name + ". Continue?"
    )) return false;

    const sourceName = this.sourceName;
    const snapshot = this.loadedBytes;
    const previousHash = this.loadedHash;
    const taskId = this.selectedId;
    const changes = collectTaskChanges(this.initial, this.draft);
    this.busy = true;
    this.message = "Writing a separate copy and verifying readback…";
    this.render();
    try {
      const saved = await saveManagedAsCopy({
        directory, sourceName, destinationName: name,
        loadedBytes: snapshot, loadedHash: previousHash, taskId, changes,
        appVersion: APP_VERSION,
      });
      // A writer may alter the file after close; verify this exact active copy.
      const file = await (await directory.getFileHandle(name)).getFile();
      const verified = new Uint8Array(await file.arrayBuffer());
      if (await sha256(verified) !== saved.destinationHash) {
        throw new Error("Save As destination changed after verification; original remains active.");
      }
      const view = this.controller.getState().view;
      await this.controller.chooseFile(file);
      const state = this.controller.getState();
      if (!state.tasks || state.fileName !== name || state.loadError) {
        throw new Error("Save As bytes were written, but the new workbook could not be reloaded; original remains active.");
      }
      // Newly verified copy is the active project, including its owning folder.
      this.directory = directory;
      this.sourceName = name;
      this.inspectionName = name;
      this.recoveryHold = false;
      this.loadedHash = saved.destinationHash;
      this.loadedBytes = verified;
      const targetNames = new Set<string>([name]);
      try {
        for await (const [foundName, handle] of (directory as DirectoryWithEntries).entries()) {
          if (handle.kind === "file" && /\.xlsx$/i.test(foundName) &&
              !/\.(backup|stage)\.xlsx$/i.test(foundName)) targetNames.add(foundName);
        }
      } catch { /* only the confirmed active destination is required */ }
      this.names = [...targetNames].sort((a, b) => a.localeCompare(b));
      this.clearDraft();
      this.controller.patchView({ ...view, selectedId: taskId });
      try { localStorage.setItem(STORAGE_PREFIX + directory.name, name); } catch { /* best effort */ }
      this.message = "Save As verified: " + name + " is now active in " + directory.name + ". Original " + sourceName +
        " was not modified; future direct Saves target " + name + " in the destination folder.";
      return true;
    } catch (error) {
      this.message = "Save As NOT confirmed: " + errorMessage(error) +
        ". The original remains the active source; pending edits retained. Inspect any destination staging files before retrying.";
      return false;
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private render(): void {
    this.banner.replaceChildren();
    const intro = element(this.doc, "span");
    intro.append(element(this.doc, "strong", "", "EXCEL MANAGED · DEVELOPMENT PREVIEW"));
    intro.append(this.doc.createTextNode("  ·  Approved v18 viewer · Use disposable XLSX copies"));
    const status = element(this.doc, "span", this.canWrite && !this.recoveryHold ? "" : "managed-alert",
      (this.recoveryHold ? "Save blocked — inspect recovery files. " : "") +
      (this.message || (this.sourceName ? "View only" : "Choose project folder")));
    this.banner.append(intro, status);

    this.fileSelect.replaceChildren();
    for (const name of this.names) {
      const option = element(this.doc, "option", "", name);
      option.value = name;
      this.fileSelect.append(option);
    }
    this.fileSelect.disabled = this.busy || !this.names.length;
    if (this.sourceName && this.names.includes(this.sourceName)) this.fileSelect.value = this.sourceName;
    const state = this.controller.getState();
    const meta = this.doc.getElementById("rangeMeta");
    if (meta && state.tasks) meta.textContent = "Planned project schedule · Excel Managed preview";

    const task = state.tasks?.find((t) => t.id === state.view.selectedId) ?? null;
    this.slot.replaceChildren();
    if (!task) {
      if (!this.isDirty()) this.clearDraft();
      this.doc.getElementById("detailContent")?.style.removeProperty("display");
      return;
    }
    if (this.selectedId !== task.id) {
      this.selectedId = task.id;
      this.initial = initialTaskDraft(task);
      this.draft = { ...this.initial };
      this.editing = false;
    }
    const details = this.doc.getElementById("detailContent");
    if (details) details.style.display = this.editing ? "none" : "";
    if (!this.editing) {
      const edit = element(this.doc, "button", "managed-action primary", "Edit task");
      edit.type = "button";
      edit.disabled = !this.canWrite || this.busy;
      edit.addEventListener("click", () => { this.editing = true; this.render(); });
      const actions = element(this.doc, "div", "managed-actions");
      actions.append(edit);
      const taskHistory = element(this.doc, "button", "managed-action", "Task history");
      taskHistory.type = "button";
      taskHistory.addEventListener("click", () => {
        this.guard(() => { void this.showHistory(task.id); });
      });
      actions.append(taskHistory);
      this.slot.append(actions);
      if (!this.canWrite) this.slot.append(element(this.doc, "p", "managed-editor-message",
        "Editing is blocked until this workbook passes the restricted XLSX compatibility check."));
      return;
    }
    this.renderForm(task);
  }

  private renderForm(task: Task): void {
    if (!this.initial || !this.draft) return;
    const draft = this.draft;
    this.slot.append(element(this.doc, "h3", "", "Edit task · " + task.wbsCode));
    const fields = element(this.doc, "div", "managed-fields");
    const saveButton = element(this.doc, "button", "managed-action primary", "Save to workbook");
    const indicator = element(this.doc, "span", "managed-editor-message", "No unsaved changes");
    for (const spec of FIELDS) {
      const { field, kind } = spec;
      const wrapper = element(this.doc, "label", "managed-field" + (kind === "textarea" ? " wide" : ""));
      wrapper.append(element(this.doc, "span", "", spec.label));
      const control = kind === "textarea" ? element(this.doc, "textarea") :
        kind === "select" ? element(this.doc, "select") : element(this.doc, "input");
      if (control instanceof HTMLInputElement) {
        control.type = kind === "date" ? "date" : kind === "number" ? "number" : "text";
        if (kind === "number") { control.min = "0"; control.max = "100"; control.step = "1"; }
      }
      if (control instanceof HTMLSelectElement) {
        const options = field === "TaskStatus"
          ? [...KNOWN_STATUSES, "Unknown"].map((name) => ({ value: name, name }))
          : field === "TaskType" ? TASK_TYPES.map((name) => ({ value: name, name }))
            : [{ value: "", name: "(Root)" }, ...(this.controller.getState().tasks ?? [])
                .filter((other) => other.id !== task.id)
                .map((other) => ({ value: other.id, name: other.wbsCode + " · " + other.taskName }))];
        for (const option of options) {
          const node = element(this.doc, "option", "", option.name);
          node.value = option.value;
          control.append(node);
        }
      }
      control.value = draft[field] === null ? "" : String(draft[field]);
      control.disabled = this.busy || (task.taskType === "Summary" &&
        (field === "Progress" || field === "PlannedStart" || field === "PlannedEnd"));
      control.addEventListener("input", () => {
        let value: EditValue;
        if (field === "Progress") value = control.value.trim() === "" ? null : Number(control.value);
        else if (field === "ParentTaskID") value = control.value || null;
        else value = control.value;
        draft[field] = value;
        saveButton.disabled = this.busy || this.recoveryHold || !this.isDirty();
        indicator.textContent = this.isDirty() ? "Unsaved changes" : "No unsaved changes";
      });
      wrapper.append(control);
      fields.append(wrapper);
    }
    this.slot.append(fields);
    const actions = element(this.doc, "div", "managed-actions");
    saveButton.type = "button";
    saveButton.disabled = this.busy || this.recoveryHold || !this.isDirty();
    saveButton.addEventListener("click", () => { void this.save(); });
    const saveAsButton = element(this.doc, "button", "managed-action", "Save As…");
    saveAsButton.type = "button";
    saveAsButton.disabled = this.busy;
    saveAsButton.addEventListener("click", () => { void this.saveAs(); });
    const saveOtherFolder = element(this.doc, "button", "managed-action", "Save As to folder…");
    saveOtherFolder.type = "button";
    saveOtherFolder.disabled = this.busy;
    saveOtherFolder.addEventListener("click", () => { void this.saveAs(true); });
    const discard = element(this.doc, "button", "managed-action", "Discard");
    discard.type = "button";
    discard.disabled = this.busy;
    discard.addEventListener("click", () => { this.clearDraft(); this.render(); });
    const report = element(this.doc, "button", "managed-action", "Output Reports");
    report.type = "button";
    report.disabled = this.busy;
    report.addEventListener("click", () => this.reports.open());
    actions.append(saveButton, saveAsButton, saveOtherFolder, discard, report, indicator);
    this.slot.append(actions);
  }
}

if (typeof document !== "undefined" && document.getElementById("gantt")) {
  const controller = boot(document, { managed: true });
  if (controller) new ManagedEditor(document, controller);
}
