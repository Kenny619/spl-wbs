export function formatPlanDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function progressLabel(value: number | null): string {
  return value == null ? "N/A" : `${value}%`;
}

export function statusClass(status: string): string {
  if (status === "Completed") return "done";
  if (status === "In Progress") return "progress";
  if (status === "At Risk") return "risk";
  if (status === "Blocked") return "blocked";
  return "todo";
}
