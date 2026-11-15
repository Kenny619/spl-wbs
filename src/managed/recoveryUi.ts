import { inspectManagedSave, managedFileNames, type ManagedInspection } from "./directSave";

export function recoveryGuidance(report: ManagedInspection): string {
  switch (report.status) {
    case "READY":
      return "No incomplete managed transaction was found. This does not prove that the workbook is unchanged or unlocked; Reload and verify its contents before editing.";
    case "BEFORE_WRITE":
      return "A transaction started but the source still matches the staged predecessor. Stop and retain ALL files. Review the source, staging workbook, and pending record before any manual cleanup.";
    case "NEEDS_BACKUP":
      return "The source may contain the new save while its predecessor backup is incomplete. The staged predecessor is required for recovery. Do not retry Save, overwrite the backup, or delete any files.";
    case "BACKUP_VERIFIED":
      return "The source and predecessor backup have matching verified fingerprints, but cleanup is incomplete. Keep every file until the transaction is independently reconciled; do not automatically retry.";
    case "STOP":
      return "The source/recovery state is not trusted. Do not save, overwrite, delete or rename the source or any sidecars. Preserve evidence and perform a manual recovery review.";
  }
}

/**
 * Read-only diagnosis: does not remove sidecars, restore backups, perform Save,
 * or claim OS-level atomicity. User controls any later manual recovery action.
 */
export async function openManagedRecovery(
  doc: Document, dir: FileSystemDirectoryHandle, workbookName: string,
): Promise<void> {
  const report = await inspectManagedSave(dir, workbookName);
  const names = managedFileNames(workbookName);
  const dialog = doc.createElement("dialog");
  dialog.className = "managed-recovery";
  dialog.setAttribute("aria-label", "Inspect Save State");
  const heading = doc.createElement("h2");
  heading.textContent = "Inspect Save State · " + workbookName;
  const close = doc.createElement("button");
  close.type = "button";
  close.className = "managed-action";
  close.textContent = "Close";
  close.addEventListener("click", () => dialog.close());
  const line = (text: string, className?: string): HTMLElement => {
    const p = doc.createElement("p");
    p.textContent = text;
    if (className) p.className = className;
    return p;
  };
  dialog.append(heading, line("Inspection: " + report.status, "managed-recovery-state"),
    line(report.reason), line(recoveryGuidance(report), "managed-recovery-warning"));

  const title = doc.createElement("h3");
  title.textContent = "Relevant files and fingerprints";
  dialog.append(title);
  const list = doc.createElement("dl");
  list.className = "managed-recovery-files";
  for (const [kind, name] of Object.entries(names)) {
    const label = doc.createElement("dt");
    label.textContent = kind + " · " + name;
    const value = doc.createElement("dd");
    value.textContent = report.hashes[kind] ?? "Not present";
    list.append(label, value);
  }
  dialog.append(list, line(
    "Fingerprints describe the files at inspection time only. This view never changes the workbook or recovery files."
  ), close);
  doc.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
  close.focus();
}
