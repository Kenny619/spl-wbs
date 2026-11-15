import type { ProjectEdit } from "./projectDataCandidate";
import type { RecordedWatchReason, WatchProjection } from "./watchProjection";

export type WatchSaveOutcome = { kind: "saved" | "noop" | "blocked"; message: string };
type WatchDraft =
  | { kind: "add"; taskId: string; reasonId: string; title: string; details: string; evidenceRef: string }
  | { kind: "resolve"; taskId: string; reasonId: string; title: string; resolutionNote: string };
type WatchPanelDeps = {
  getProjection: () => WatchProjection | null;
  canEdit: () => boolean;
  isBusy: () => boolean;
  onSave: (edit: ProjectEdit) => Promise<WatchSaveOutcome>;
  rerender: () => void;
};
const make = <K extends keyof HTMLElementTagNameMap>(
  doc: Document, tag: K, className = "", value?: string,
): HTMLElementTagNameMap[K] => {
  const result = doc.createElement(tag);
  if (className) result.className = className;
  if (value !== undefined) result.textContent = value;
  return result;
};
const readableUTC = (value: string | null): string =>
  value ? value.replace("T", " ").replace(".000Z", " UTC") : "—";

/**
 * Draft managed-only Task Detail Watch inspector. Reason facts are read from
 * verified workbook bytes, not local state. Only input drafts are ephemeral;
 * Save commits via the same guarded project-data writer as Project Calendar.
 *
 * This is NOT the approved full Meeting Review, automatic rule engine,
 * trusted corporate actor, accepted commitment or a Green/Clear calculator.
 */
export class ManagedWatchPanel {
  private draft: WatchDraft | null = null;
  private saving = false;
  private message = "";
  constructor(private readonly doc: Document, private readonly deps: WatchPanelDeps) {}

  hasDraft(): boolean { return this.draft !== null; }
  cancel(): void {
    this.draft = null;
    this.message = "";
  }

  render(taskId: string): HTMLElement {
    if (this.draft && this.draft.taskId !== taskId) this.cancel();
    const host = make(this.doc, "section", "managed-watch");
    host.setAttribute("aria-label", "Recorded Under Watch reasons");
    const heading = make(this.doc, "div", "managed-watch-head");
    heading.append(make(this.doc, "h3", "", "Under Watch"));
    const projection = this.deps.getProjection();
    if (!projection || projection.workbookState !== "valid") {
      heading.append(make(this.doc, "span", "managed-watch-badge unknown", "Unknown"));
      host.append(heading, make(this.doc, "p", "managed-watch-note",
        projection?.workbookState === "legacy"
          ? "Watch not configured in this workbook. Initialize shared project data first."
          : "Watch information unavailable until a valid committed workbook is loaded."));
      return host;
    }
    const row = projection.tasks.find(x => x.taskId === taskId);
    if (!row) {
      heading.append(make(this.doc, "span", "managed-watch-badge unknown", "Unknown"));
      host.append(heading, make(this.doc, "p", "managed-watch-note",
        "Task has no validated Watch record. No clearance is inferred."));
      return host;
    }
    const open = row.openReasons;
    const resolved = row.resolvedReasons;
    heading.append(make(this.doc, "span",
      "managed-watch-badge " + (open.length ? "active" : "unknown"),
      open.length ? "Under Watch · " + open.length + " open" : "Unknown"));
    host.append(heading);
    host.append(make(this.doc, "p", "managed-watch-note",
      open.length
        ? "Recorded open reason" + (open.length === 1 ? "" : "s") +
          ". Automatic checks and accepted commitments are not verified."
        : "No recorded open reasons. Automatic checks are not yet verified; this is not Green or Clear."));

    for (const reason of open) host.append(this.reasonCard(reason, true));
    if (resolved.length) {
      const history = make(this.doc, "details", "managed-watch-history");
      history.append(make(this.doc, "summary", "", "Resolved history · " + resolved.length));
      for (const reason of resolved) history.append(this.reasonCard(reason, false));
      host.append(history);
    }
    const writable = this.deps.canEdit() && !this.deps.isBusy() && !this.saving;
    if (!this.draft) {
      const add = make(this.doc, "button", "managed-action managed-watch-add", "Add manual reason");
      add.type = "button";
      add.disabled = !writable;
      add.addEventListener("click", () => {
        if (!this.deps.canEdit() || this.deps.isBusy()) return;
        this.draft = { kind: "add", taskId, reasonId: crypto.randomUUID(),
          title: "", details: "", evidenceRef: "" };
        this.message = "";
        this.deps.rerender();
      });
      host.append(add);
      if (!writable) host.append(make(this.doc, "p", "managed-watch-note",
        "Watch editing requires a verified writable workbook and no pending task changes."));
    } else {
      host.append(this.editForm(taskId));
    }
    if (this.message) {
      const status = make(this.doc, "p", "managed-watch-feedback", this.message);
      status.setAttribute("role", "status");
      host.append(status);
    }
    return host;
  }

  private reasonCard(reason: RecordedWatchReason, isOpen: boolean): HTMLElement {
    const card = make(this.doc, "article", "managed-watch-reason");
    card.dataset.reasonId = reason.reasonId;
    const head = make(this.doc, "div", "managed-watch-reason-head");
    head.append(make(this.doc, "strong", "", reason.title));
    head.append(make(this.doc, "span", "managed-watch-origin",
      reason.origin === "Automatic" ? "Recorded automatic" : "Manual"));
    card.append(head);
    if (reason.details) card.append(make(this.doc, "p", "managed-watch-description", reason.details));
    if (reason.evidenceRef) card.append(make(this.doc, "p", "managed-watch-meta",
      "Recorded evidence reference · " + reason.evidenceRef));
    card.append(make(this.doc, "p", "managed-watch-meta",
      "Opened " + readableUTC(reason.openedUTC) + " · " + reason.openedBy + " (unverified)"));
    if (!isOpen) {
      card.append(make(this.doc, "p", "managed-watch-meta",
        "Resolved " + readableUTC(reason.resolvedUTC) + " · " +
        (reason.resolvedBy ?? "Unverified local editor") + " (unverified)"));
      if (reason.resolutionNote) card.append(make(this.doc, "p", "managed-watch-description",
        "Resolution · " + reason.resolutionNote));
    }
    card.append(make(this.doc, "small", "managed-watch-audit",
      reason.hasRecordedProjectAudit
        ? "Workbook audit reference recorded · identity not independently verified"
        : "No matching workbook audit reference · evidence not independently verified"));
    if (isOpen && reason.origin === "Manual" && !this.draft) {
      const resolve = make(this.doc, "button", "managed-action managed-watch-resolve",
        "Resolve this reason");
      resolve.type = "button";
      resolve.disabled = !this.deps.canEdit() || this.deps.isBusy() || this.saving;
      resolve.addEventListener("click", () => {
        if (!this.deps.canEdit() || this.deps.isBusy()) return;
        this.draft = { kind: "resolve", taskId: reason.taskId,
          reasonId: reason.reasonId, title: reason.title, resolutionNote: "" };
        this.message = "";
        this.deps.rerender();
      });
      card.append(resolve);
    }
    if (isOpen && reason.origin === "Automatic") {
      card.append(make(this.doc, "small", "managed-watch-note",
        "Automatic reason is read-only until its rule and clearance policy are approved."));
    }
    return card;
  }

  private editForm(taskId: string): HTMLElement {
    const draft = this.draft!;
    const form = make(this.doc, "div", "managed-watch-form");
    form.append(make(this.doc, "h4", "",
      draft.kind === "add" ? "New manual reason" : "Resolve · " + draft.title));
    const field = (label: string, value: string, max: number,
      onValue: (value: string) => void, required = false) => {
      const wrap = make(this.doc, "label", "managed-watch-field");
      wrap.append(make(this.doc, "span", "", label));
      const input = make(this.doc, max > 180 ? "textarea" : "input");
      input.setAttribute("aria-label", label);
      input.maxLength = max;
      input.value = value;
      input.required = required;
      input.disabled = this.saving || this.deps.isBusy();
      input.addEventListener("input", () => onValue(input.value));
      wrap.append(input);
      form.append(wrap);
    };
    if (draft.kind === "add") {
      field("Watch reason title", draft.title, 180, v => { draft.title = v; }, true);
      field("Watch reason details", draft.details, 2000, v => { draft.details = v; });
      field("Watch evidence reference", draft.evidenceRef, 500, v => { draft.evidenceRef = v; });
    } else {
      field("Watch resolution note", draft.resolutionNote, 2000, v => { draft.resolutionNote = v; });
    }
    form.append(make(this.doc, "p", "managed-watch-note",
      "Saved to shared Excel with a recorded unverified actor label; not an approval or Green decision."));
    const actions = make(this.doc, "div", "managed-actions");
    const save = make(this.doc, "button", "managed-action primary",
      draft.kind === "add" ? "Save manual reason" : "Confirm reason resolution");
    save.type = "button";
    save.disabled = this.saving || this.deps.isBusy() || !this.deps.canEdit();
    save.addEventListener("click", () => { void this.submit(taskId); });
    const cancel = make(this.doc, "button", "managed-action", "Cancel Watch edit");
    cancel.type = "button";
    cancel.disabled = this.saving || this.deps.isBusy();
    cancel.addEventListener("click", () => { this.cancel(); this.deps.rerender(); });
    actions.append(save, cancel);
    form.append(actions);
    return form;
  }

  private async submit(taskId: string): Promise<void> {
    const draft = this.draft;
    if (!draft || draft.taskId !== taskId || this.saving || !this.deps.canEdit()) return;
    if (draft.kind === "add" && !draft.title.trim()) {
      this.message = "Enter a reason title before saving.";
      this.deps.rerender();
      return;
    }
    const edit: ProjectEdit = draft.kind === "add"
      ? { kind: "add-watch-reason", reasonId: draft.reasonId,
          taskId: draft.taskId, title: draft.title,
          details: draft.details, evidenceRef: draft.evidenceRef }
      : { kind: "resolve-watch-reason", reasonId: draft.reasonId,
          resolutionNote: draft.resolutionNote };
    this.saving = true;
    this.message = "Verifying project workbook and predecessor backup…";
    this.deps.rerender();
    try {
      const result = await this.deps.onSave(edit);
      this.message = result.message;
      if (result.kind === "saved" || result.kind === "noop") this.draft = null;
    } catch (error) {
      this.message = "Watch Save not verified: " +
        (error instanceof Error ? error.message : "Unknown error");
    } finally {
      this.saving = false;
      this.deps.rerender();
    }
  }
}
