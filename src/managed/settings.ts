import { COLUMN_DEFS } from "../ui/grid";

export const SETTINGS_KEY = "spt-wbs:managed:settings:v1";
export const DEFAULT_COLUMNS = ["owner", "status", "finish"] as const;
export type Appearance = "light" | "dark" | "system";
export type ManagedPreferences = {
  timeZone: string;
  columns: string[];
  appearance: Appearance;
};
export type PreferenceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const OPTIONAL = COLUMN_DEFS.filter((item) => !item.fixed).map((item) => item.id);

export function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 120) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; }
  catch { return false; }
}

export function detectedTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return validTimeZone(zone) ? zone : "UTC";
  } catch { return "UTC"; }
}

export function defaultPreferences(): ManagedPreferences {
  return { timeZone: detectedTimeZone(), columns: [...DEFAULT_COLUMNS], appearance: "system" };
}

export function validateColumns(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) return [...DEFAULT_COLUMNS];
  // The v18 grid defines column order; Settings only controls visibility.
  return OPTIONAL.filter((id) => value.includes(id));
}

export function normalizePreferences(value: unknown): ManagedPreferences {
  const defaults = defaultPreferences();
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  const candidate = value as Partial<ManagedPreferences>;
  return {
    timeZone: validTimeZone(candidate.timeZone) ? candidate.timeZone : defaults.timeZone,
    columns: validateColumns(candidate.columns),
    appearance: candidate.appearance === "dark" || candidate.appearance === "light" ||
      candidate.appearance === "system" ? candidate.appearance : "system",
  };
}

export function loadPreferences(storage?: PreferenceStorage | null): ManagedPreferences {
  if (!storage) return defaultPreferences();
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return defaultPreferences();
    return normalizePreferences(JSON.parse(raw) as unknown);
  } catch {
    return defaultPreferences(); // private mode, disabled storage, or corrupt JSON
  }
}

export function persistPreferences(
  preferences: ManagedPreferences, storage?: PreferenceStorage | null,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(normalizePreferences(preferences)));
    return true;
  } catch {
    return false; // never block project use because browser storage failed
  }
}

export function supportedTimeZones(current: string): string[] {
  let zones: string[] = [];
  try { zones = Intl.supportedValuesOf("timeZone"); } catch { /* older browsers */ }
  return [...new Set(["UTC", detectedTimeZone(), current,
    "Asia/Tokyo", "America/New_York", "America/Los_Angeles", "Europe/London", ...zones])]
    .filter(validTimeZone).sort((a, b) => a.localeCompare(b));
}

export function effectiveAppearance(
  appearance: Appearance, prefersDark: boolean,
): "dark" | "light" {
  return appearance === "system" ? (prefersDark ? "dark" : "light") : appearance;
}
