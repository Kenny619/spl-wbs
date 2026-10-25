export type Zoom = "day" | "week" | "month" | "quarter";

export type ViewState = {
  expandedIds: string[];
  search: string;
  statuses: string[];
  owners: string[];
  types: string[];
  workstreams: string[];
  hideInactive: boolean;
  columns: string[];
  zoom: Zoom;
  fitMode: boolean;
  showDependencies: boolean;
  selectedId: string | null;
};

export function createViewState(expandedIds: readonly string[] = []): ViewState {
  return {
    expandedIds: [...expandedIds],
    search: "",
    statuses: [],
    owners: [],
    types: [],
    workstreams: [],
    hideInactive: false,
    columns: ["owner", "status", "finish"],
    zoom: "week",
    fitMode: true,
    showDependencies: false,
    selectedId: null,
  };
}

export function preserveView(view: ViewState, ids: readonly string[]): ViewState {
  const present = new Set(ids);
  return {
    ...view,
    expandedIds: view.expandedIds.filter((id) => present.has(id)),
    selectedId: view.selectedId && present.has(view.selectedId) ? view.selectedId : null,
  };
}

export function formatLoadedAt(now: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
}

export function fileTitle(fileName: string): string {
  return fileName.replace(/\.xlsx$/i, "");
}
