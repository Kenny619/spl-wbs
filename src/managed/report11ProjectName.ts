import type { PreferenceStorage } from "./settings";

/**
 * A report-specific preference namespace, separate from the frozen Settings
 * contract. Never store report contents or workbook bytes.
 */
export const REPORT11_PROJECT_PREF_PREFIX = "spt-wbs:managed:report11:project:v1:";

/**
 * A stable identity for a named workbook within the current browser origin.
 * The existing managed context supplies fileName but does not expose a full
 * file handle/path. Same-name independent workbooks can therefore collide.
 * The user must be able to override the displayed Project name in the UI.
 */
export function reportProjectPrefKey(workbookIdentity: string): string {
  const identity = workbookIdentity.trim();
  if (!identity) throw new Error("A workbook identity is required.");
  // Do not place a filename/path verbatim in browser storage keys.
  // Two 32-bit hashes plus original length reduce accidental collisions.
  let a = 2166136261, b = 0x9e3779b9;
  for (let i = 0; i < identity.length; i++) {
    const char = identity.charCodeAt(i);
    a = Math.imul(a ^ char, 16777619);
    b = Math.imul(b ^ char, 2246822519);
  }
  return REPORT11_PROJECT_PREF_PREFIX +
    (a >>> 0).toString(16).padStart(8, "0") + "-" +
    (b >>> 0).toString(16).padStart(8, "0") + "-" + identity.length;
}

export type ProjectNamePreference = Readonly<{ projectName: string; persisted: boolean }>;

export function loadReportProjectName(
  workbookIdentity: string, storage?: PreferenceStorage | null,
): ProjectNamePreference {
  if (!storage) return { projectName: "", persisted: false };
  try {
    const raw = storage.getItem(reportProjectPrefKey(workbookIdentity));
    if (!raw) return { projectName: "", persisted: false };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { projectName: "", persisted: false };
    }
    const projectName = (parsed as Record<string, unknown>).projectName;
    return typeof projectName === "string" && projectName.trim() && projectName.length <= 180
      ? { projectName: projectName.trim(), persisted: true }
      : { projectName: "", persisted: false };
  } catch {
    return { projectName: "", persisted: false };
  }
}

/**
 * Returns false on blocked or unavailable browser storage; report generation
 * may still use an explicitly entered in-memory name.
 */
export function saveReportProjectName(
  workbookIdentity: string, projectName: string,
  storage?: PreferenceStorage | null,
): boolean {
  if (!projectName.trim() || projectName.trim().length > 180 || !storage) return false;
  try {
    storage.setItem(reportProjectPrefKey(workbookIdentity),
      JSON.stringify({ projectName: projectName.trim() }));
    return true;
  } catch { return false; }
}
