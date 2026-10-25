/** Steps the divider by one keyboard notch inside the approved drag limits. */
export function gridWidthFromKey(current: number, key: string, min: number, max: number): number | null {
  const upper = Math.max(min, max);
  if (key === "ArrowRight") return Math.min(upper, current + 16);
  if (key === "ArrowLeft") return Math.max(min, current - 16);
  if (key === "Home") return min;
  if (key === "End") return upper;
  return null;
}

export function focusableIn(root: ParentNode): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea");
  return Array.from(nodes).filter((node) => !node.hasAttribute("disabled") && node.tabIndex >= 0);
}
