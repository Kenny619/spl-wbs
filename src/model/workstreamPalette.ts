import type { PaletteMap } from "../data/types";

/** Approved 15-slot order from the v1.3 UI spec. */
export const WORKSTREAM_PALETTE = [
  "#5A82C8",
  "#9277C7",
  "#319C91",
  "#D99D47",
  "#C57786",
  "#6E91A9",
  "#9A7EA7",
  "#719B82",
  "#B78A6D",
  "#7D85B3",
  "#A78D67",
  "#5F9B9B",
  "#A37E90",
  "#879B65",
  "#8C8FA1",
] as const;

export const PALETTE_STORAGE_KEY = "gantt-viewer.workstream-palette";

export function assignPalette(namesInFirstSeenOrder: readonly string[], previous: PaletteMap = {}): PaletteMap {
  const next: PaletteMap = { ...previous };
  const assigned = Object.values(previous);
  let cursor = assigned.length ? Math.max(...assigned) + 1 : 0;
  for (const name of namesInFirstSeenOrder) {
    if (Object.prototype.hasOwnProperty.call(next, name)) continue;
    next[name] = cursor % WORKSTREAM_PALETTE.length;
    cursor += 1;
  }
  return next;
}

export function paletteColor(map: PaletteMap, name: string): string {
  const slot = map[name] ?? 0;
  return WORKSTREAM_PALETTE[slot % WORKSTREAM_PALETTE.length];
}

export function loadPalette(storage: Pick<Storage, "getItem">): PaletteMap {
  const raw = storage.getItem(PALETTE_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { version?: number; slots?: unknown };
    if (parsed.version !== 1 || !parsed.slots || typeof parsed.slots !== "object") return {};
    const slots: PaletteMap = {};
    for (const [name, slot] of Object.entries(parsed.slots)) {
      if (typeof slot === "number" && Number.isInteger(slot) && slot >= 0) slots[name] = slot;
    }
    return slots;
  } catch {
    return {};
  }
}

export function savePalette(storage: Pick<Storage, "setItem">, map: PaletteMap): void {
  storage.setItem(PALETTE_STORAGE_KEY, JSON.stringify({ version: 1, slots: map }));
}
