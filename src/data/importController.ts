import { createViewState, formatLoadedAt, preserveView, type ViewState } from "../app/state";
import { SHAREPOINT_HOSTS } from "../config/decisions";
import { PALETTE_STORAGE_KEY } from "../model/workstreamPalette";
import { createHandleStore, type HandleStore } from "./fileHandleStore";
import { importWorkbook as importWorkbookFile, type ImportOptions } from "./normalize";
import type { ImportIssue, ImportResult, PaletteMap, Task } from "./types";

export type SessionStatus = "empty" | "ready" | "reconnect";

export type SessionState = {
  status: SessionStatus;
  fileName: string | null;
  sheetName: string | null;
  loadedAt: string | null;
  taskCount: number;
  tasks: readonly Task[] | null;
  issues: readonly ImportIssue[];
  loadError: readonly ImportIssue[] | null;
  notice: string | null;
  canReconnect: boolean;
  remembered: boolean;
  latestModified: string | null;
  palette: PaletteMap;
  view: ViewState;
};

export type PickerResult = "picked" | "needs-input" | "cancelled";

export type OpenFilePicker = () => Promise<FileSystemFileHandle[]>;

export type ImportController = {
  getState(): SessionState;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  chooseFile(file: File): Promise<void>;
  chooseWithPicker(): Promise<PickerResult>;
  reconnect(): Promise<void>;
  reload(): Promise<void>;
  forget(): Promise<void>;
  patchView(patch: Partial<ViewState>): void;
};

export type PaletteStorage = Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">>;

export type ControllerOptions = {
  store?: HandleStore;
  showOpenFilePicker?: OpenFilePicker;
  importWorkbook?: (data: ArrayBuffer, options?: ImportOptions) => Promise<ImportResult>;
  now?: () => Date;
  timeZone?: string;
  allowedHosts?: readonly string[];
  paletteStorage?: PaletteStorage | null;
};

export function createImportController(options: ControllerOptions = {}): ImportController {
  const store = options.store ?? createHandleStore();
  const importFile = options.importWorkbook ?? importWorkbookFile;
  const now = options.now ?? (() => new Date());
  const listeners = new Set<() => void>();
  let handle: FileSystemFileHandle | null = null;
  let currentFile: File | null = null;
  let persisted = false;
  let state = emptySession();

  const publish = (next: SessionState) => {
    state = next;
    for (const listener of listeners) listener();
  };

  const retain = (notice: string, loadError: readonly ImportIssue[] | null = null) => {
    publish({
      ...state,
      status: state.tasks ? "ready" : handle ? "reconnect" : "empty",
      notice,
      loadError,
      canReconnect: handle != null,
      remembered: persisted,
      fileName: state.tasks ? state.fileName : handle?.name ?? state.fileName,
    });
  };

  const readBytes = async (file: File, preserve: boolean): Promise<boolean> => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      const query = file.name.toLowerCase().endsWith(".iqy");
      retain(
        query
          ? "Web query (.iqy) files are not supported. Export the SharePoint list as an .xlsx workbook."
          : "Choose an .xlsx workbook exported from the SharePoint list.",
        [
          {
            severity: "fatal",
            code: "unreadable-workbook",
            message: `${file.name} is not an .xlsx workbook.`,
          },
        ],
      );
      return false;
    }
    let result: ImportResult;
    try {
      result = await importFile(await file.arrayBuffer(), {
        allowedHosts: options.allowedHosts ?? SHAREPOINT_HOSTS,
        paletteStorage: options.paletteStorage,
      });
    } catch {
      retain(
        state.tasks
          ? `Could not read ${file.name}. The previous workbook is still shown.`
          : `Could not read ${file.name}.`,
      );
      return false;
    }
    if (!result.ok) {
      const detail = result.issues[0]?.message ?? "The workbook could not be imported.";
      retain(
        state.tasks ? `Could not import ${file.name}. The previous workbook is still shown. ${detail}` : detail,
        result.issues,
      );
      return false;
    }
    currentFile = file;
    const view =
      preserve && state.tasks
        ? preserveView(
            state.view,
            result.tasks.map((task) => task.id),
          )
        : createViewState(result.expandedIds);
    publish({
      status: "ready",
      fileName: file.name,
      sheetName: result.sheetName,
      loadedAt: formatLoadedAt(now(), options.timeZone),
      taskCount: result.tasks.length,
      tasks: result.tasks,
      issues: result.issues,
      loadError: null,
      notice: null,
      canReconnect: handle != null,
      remembered: persisted,
      latestModified: result.latestModified,
      palette: result.palette,
      view,
    });
    return true;
  };

  const readHandle = async (next: FileSystemFileHandle, preserve: boolean): Promise<boolean> => {
    handle = next;
    let file: File;
    try {
      file = await next.getFile();
    } catch {
      retain(
        state.tasks
          ? `Could not read ${next.name}. The previous workbook is still shown.`
          : `Could not read ${next.name}.`,
      );
      return false;
    }
    return readBytes(file, preserve);
  };

  const restoreHandle = (previousHandle: FileSystemFileHandle | null, previousPersisted: boolean) => {
    handle = previousHandle;
    persisted = previousPersisted;
    publish({
      ...state,
      status: state.tasks ? "ready" : handle ? "reconnect" : "empty",
      canReconnect: handle != null,
      remembered: persisted,
      fileName: state.tasks ? state.fileName : handle?.name ?? null,
    });
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async start() {
      let remembered: FileSystemFileHandle | null = null;
      try {
        remembered = await store.load();
      } catch {
        publish({ ...emptySession(), notice: "A remembered workbook could not be opened. Choose a workbook." });
        return;
      }
      if (!remembered) {
        publish(emptySession());
        return;
      }
      handle = remembered;
      persisted = true;
      let permission: PermissionState;
      try {
        permission = await queryPermission(remembered);
      } catch {
        permission = "prompt";
      }
      if (permission !== "granted") {
        publish({
          ...emptySession(),
          status: "reconnect",
          fileName: remembered.name,
          canReconnect: true,
          remembered: true,
          notice: "Reconnect file to grant read permission. You can also choose a workbook.",
        });
        return;
      }
      await readHandle(remembered, false);
    },
    async chooseFile(file) {
      const previousHandle = handle;
      const previousPersisted = persisted;
      handle = null;
      persisted = false;
      const imported = await readBytes(file, false);
      if (!imported) {
        restoreHandle(previousHandle, previousPersisted);
        return;
      }
      try {
        await store.clear();
      } catch {
        // The chosen file stays loaded when persistence is unavailable.
      }
      publish({ ...state, canReconnect: false, remembered: false });
    },
    async chooseWithPicker() {
      if (!options.showOpenFilePicker) return "needs-input";
      let picked: FileSystemFileHandle;
      try {
        const [first] = await options.showOpenFilePicker();
        if (!first) return "needs-input";
        picked = first;
      } catch (error) {
        return isAbort(error) ? "cancelled" : "needs-input";
      }
      const previousHandle = handle;
      let previousPersisted = persisted;
      handle = picked;
      persisted = false;
      try {
        await store.save(picked);
        persisted = true;
      } catch {
        persisted = false;
      }
      let permission: PermissionState;
      try {
        permission = await queryPermission(picked);
      } catch {
        permission = "prompt";
      }
      if (permission !== "granted") {
        publish({
          ...state,
          status: state.tasks ? "ready" : "reconnect",
          fileName: state.fileName ?? picked.name,
          canReconnect: true,
          remembered: persisted,
          notice: "Reconnect file to grant read permission.",
        });
        return "picked";
      }
      const imported = await readHandle(picked, false);
      if (!imported) {
        try {
          if (previousHandle && previousPersisted) await store.save(previousHandle);
          else await store.clear();
        } catch {
          previousPersisted = false;
        }
        restoreHandle(previousHandle, previousPersisted);
      }
      return "picked";
    },
    async reconnect() {
      if (!handle) {
        retain("Choose a workbook.");
        return;
      }
      const ask = readable(handle).requestPermission;
      if (typeof ask !== "function") {
        retain("This browser cannot reopen the remembered workbook. Choose a workbook.");
        return;
      }
      let permission: PermissionState;
      try {
        permission = await ask.call(handle, { mode: "read" });
      } catch {
        permission = "denied";
      }
      if (permission !== "granted") {
        publish({
          ...state,
          status: state.tasks ? "ready" : "reconnect",
          canReconnect: true,
          remembered: persisted,
          notice: "Permission was not granted. Choose a workbook instead.",
        });
        return;
      }
      await readHandle(handle, false);
    },
    async reload() {
      if (handle) {
        let permission: PermissionState;
        try {
          permission = await queryPermission(handle);
        } catch {
          permission = "prompt";
        }
        if (permission !== "granted") {
          publish({
            ...state,
            status: state.tasks ? "ready" : "reconnect",
            canReconnect: true,
            remembered: persisted,
            notice: state.tasks
              ? "Reload needs permission. The previous workbook is still shown."
              : "Reconnect file to grant read permission.",
          });
          return;
        }
        await readHandle(handle, true);
        return;
      }
      if (!currentFile) {
        retain("Choose a workbook before reloading.");
        return;
      }
      await readBytes(currentFile, true);
    },
    async forget() {
      try {
        await store.clear();
      } catch {
        // The in-memory session is still discarded.
      }
      handle = null;
      currentFile = null;
      persisted = false;
      const storage = options.paletteStorage;
      if (storage?.removeItem) storage.removeItem(PALETTE_STORAGE_KEY);
      else if (options.paletteStorage === undefined && typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(PALETTE_STORAGE_KEY);
      }
      publish(emptySession());
    },
    patchView(patch) {
      publish({ ...state, view: { ...state.view, ...patch } });
    },
  };
}

function emptySession(): SessionState {
  return {
    status: "empty",
    fileName: null,
    sheetName: null,
    loadedAt: null,
    taskCount: 0,
    tasks: null,
    issues: [],
    loadError: null,
    notice: null,
    canReconnect: false,
    remembered: false,
    latestModified: null,
    palette: {},
    view: createViewState(),
  };
}

type ReadableHandle = FileSystemFileHandle & {
  queryPermission?: (descriptor?: { mode?: "read" }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: "read" }) => Promise<PermissionState>;
};

function readable(handle: FileSystemFileHandle): ReadableHandle {
  return handle as ReadableHandle;
}

async function queryPermission(handle: FileSystemFileHandle): Promise<PermissionState> {
  const ask = readable(handle).queryPermission;
  if (typeof ask !== "function") return "prompt";
  return ask.call(handle, { mode: "read" });
}

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error != null && "name" in error && error.name === "AbortError";
}
