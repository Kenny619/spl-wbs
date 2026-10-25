import { afterEach, describe, expect, it, vi } from "vitest";
import { formatLoadedAt } from "../../src/app/state";
import { createImportController, type PaletteStorage } from "../../src/data/importController";
import { memoryHandleStore } from "../../src/data/fileHandleStore";
import { importWorkbook } from "../../src/data/normalize";
import { PALETTE_STORAGE_KEY } from "../../src/model/workstreamPalette";
import type { ImportResult, Task } from "../../src/data/types";
import { buildWorkbook } from "../fixtures/workbooks";

const NOW = new Date("2026-10-25T03:00:00.000Z");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("import controller", () => {
  it("reads a granted remembered workbook without requesting permission", async () => {
    const file = workbookFile("plan.xlsx", "good");
    const handle = fakeHandle("plan.xlsx", file, "granted");
    const store = memoryHandleStore();
    await store.save(handle);
    const controller = controllerWith(store, stubImport());
    await controller.start();
    const state = controller.getState();
    expect(state.status).toBe("ready");
    expect(state.taskCount).toBe(1);
    expect(state.remembered).toBe(true);
    expect(state.loadedAt).toBe(formatLoadedAt(NOW, "Asia/Tokyo"));
    expect(state.view.expandedIds).toEqual(["1"]);
    expect(state.view.zoom).toBe("week");
    expect(state.view.fitMode).toBe(true);
    expect(handle.calls).toEqual(["query", "file"]);
  });

  it("stops at reconnect when permission is still prompt", async () => {
    const handle = fakeHandle("plan.xlsx", workbookFile("plan.xlsx", "good"), "prompt");
    const store = memoryHandleStore();
    await store.save(handle);
    const controller = controllerWith(store, stubImport());
    await controller.start();
    expect(controller.getState().status).toBe("reconnect");
    expect(controller.getState().fileName).toBe("plan.xlsx");
    expect(controller.getState().tasks).toBeNull();
    expect(handle.calls).toEqual(["query"]);
    await controller.reconnect();
    expect(controller.getState().status).toBe("ready");
    expect(controller.getState().taskCount).toBe(1);
    expect(handle.calls).toEqual(["query", "request", "file"]);
  });

  it("stays on reconnect when permission is denied", async () => {
    const handle = fakeHandle("plan.xlsx", workbookFile("plan.xlsx", "good"), "denied");
    const store = memoryHandleStore();
    await store.save(handle);
    const controller = controllerWith(store, stubImport());
    await controller.start();
    await controller.reconnect();
    expect(controller.getState().status).toBe("reconnect");
    expect(controller.getState().tasks).toBeNull();
    expect(controller.getState().notice).toContain("Permission was not granted");
    expect(handle.calls).not.toContain("file");
  });

  it("loads from the file input without claiming a remembered file", async () => {
    const store = memoryHandleStore();
    const controller = controllerWith(store, stubImport(), undefined);
    expect(await controller.chooseWithPicker()).toBe("needs-input");
    await controller.chooseFile(workbookFile("local.xlsx", "good"));
    expect(controller.getState().status).toBe("ready");
    expect(controller.getState().remembered).toBe(false);
    expect(controller.getState().canReconnect).toBe(false);
    expect(await store.load()).toBeNull();
  });

  it("keeps the last good tasks and the previous handle when a change fails", async () => {
    const file = workbookFile("plan.xlsx", "good");
    const handle = fakeHandle("plan.xlsx", file, "granted");
    const store = memoryHandleStore();
    await store.save(handle);
    const imported = stubImport();
    const controller = controllerWith(store, imported);
    await controller.start();
    controller.patchView({ selectedId: "1", zoom: "day" });
    await controller.chooseFile(workbookFile("notes.iqy", "query"));
    const state = controller.getState();
    expect(state.status).toBe("ready");
    expect(state.taskCount).toBe(1);
    expect(state.fileName).toBe("plan.xlsx");
    expect(state.notice).toContain(".iqy");
    expect(state.view.zoom).toBe("day");
    expect(state.view.selectedId).toBe("1");
    expect(await store.load()).toBe(handle);
    await controller.reload();
    expect(controller.getState().taskCount).toBe(1);
    expect(controller.getState().view.zoom).toBe("day");
    expect(controller.getState().view.expandedIds).toEqual(["1"]);
  });

  it("keeps the last good tasks when a reload cannot be read", async () => {
    const files = [workbookFile("plan.xlsx", "good"), workbookFile("plan.xlsx", "bad")];
    let reads = 0;
    const handle = fakeHandle("plan.xlsx", async () => files[Math.min(reads++, files.length - 1)]!, "granted");
    const store = memoryHandleStore();
    await store.save(handle);
    const controller = controllerWith(store, stubImport());
    await controller.start();
    await controller.reload();
    expect(controller.getState().status).toBe("ready");
    expect(controller.getState().taskCount).toBe(1);
    expect(controller.getState().notice).toContain("previous workbook is still shown");
    expect(controller.getState().loadError?.[0]?.code).toBe("unreadable-workbook");
  });

  it("resets the view for a new file and preserves it for a reload", async () => {
    let pass = 0;
    const controller = controllerWith(memoryHandleStore(), async () => {
      pass += 1;
      return pass < 3 ? success(["1", "2"], ["1"]) : success(["2"], ["2"]);
    });
    await controller.chooseFile(workbookFile("one.xlsx", "one"));
    controller.patchView({ zoom: "month", selectedId: "9" });
    await controller.reload();
    expect(controller.getState().view.zoom).toBe("month");
    expect(controller.getState().view.expandedIds).toEqual(["1"]);
    expect(controller.getState().view.selectedId).toBeNull();
    await controller.chooseFile(workbookFile("two.xlsx", "two"));
    expect(controller.getState().fileName).toBe("two.xlsx");
    expect(controller.getState().view.zoom).toBe("week");
    expect(controller.getState().view.expandedIds).toEqual(["2"]);
    expect(controller.getState().view.selectedId).toBeNull();
  });

  it("forgets the handle, the tasks, and the palette", async () => {
    const items = new Map<string, string>();
    const paletteStorage: PaletteStorage = {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => items.set(key, value),
      removeItem: (key) => items.delete(key),
    };
    const bytes = await buildWorkbook({
      headers: ["ID", "Task Name", "WBSCode", "TaskType"],
      rows: [["1", "Kickoff", "1", "Summary"]],
    });
    const store = memoryHandleStore();
    const handle = fakeHandle("plan.xlsx", new File([fileBytes(bytes)], "plan.xlsx"), "granted");
    await store.save(handle);
    const controller = createImportController({
      store,
      importWorkbook,
      paletteStorage,
      now: () => NOW,
      timeZone: "Asia/Tokyo",
    });
    await controller.start();
    expect(controller.getState().taskCount).toBeGreaterThan(0);
    expect(items.has(PALETTE_STORAGE_KEY)).toBe(true);
    await controller.forget();
    expect(controller.getState().tasks).toBeNull();
    expect(controller.getState().status).toBe("empty");
    expect(await store.load()).toBeNull();
    expect(items.has(PALETTE_STORAGE_KEY)).toBe(false);
  });

  it("does not fetch while importing a workbook", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    const bytes = await buildWorkbook({
      headers: ["ID", "Task Name", "WBSCode", "TaskType", "PlannedStart", "PlannedEnd"],
      rows: [["1", "Kickoff", "1", "Task", { date: "2026-10-01" }, { date: "2026-10-02" }]],
    });
    const controller = createImportController({
      store: memoryHandleStore(),
      paletteStorage: null,
      now: () => NOW,
      timeZone: "Asia/Tokyo",
    });
    await controller.chooseFile(new File([fileBytes(bytes)], "phase-two.xlsx"));
    expect(controller.getState().status).toBe("ready");
    expect(controller.getState().taskCount).toBe(1);
    expect(controller.getState().latestModified).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("treats a dismissed or blocked picker as a local choice", async () => {
    const controller = controllerWith(
      memoryHandleStore(),
      stubImport(),
      async () => {
        throw Object.assign(new Error("dismissed"), { name: "AbortError" });
      },
    );
    expect(await controller.chooseWithPicker()).toBe("cancelled");
    expect(controller.getState().status).toBe("empty");
    const blocked = controllerWith(memoryHandleStore(), stubImport(), async () => {
      throw Object.assign(new Error("file origin"), { name: "SecurityError" });
    });
    expect(await blocked.chooseWithPicker()).toBe("needs-input");
    expect(blocked.getState().remembered).toBe(false);
  });
});

function controllerWith(
  store: ReturnType<typeof memoryHandleStore>,
  importWorkbook: (data: ArrayBuffer) => Promise<ImportResult>,
  showOpenFilePicker?: () => Promise<FileSystemFileHandle[]>,
) {
  return createImportController({
    store,
    importWorkbook,
    showOpenFilePicker,
    paletteStorage: null,
    now: () => NOW,
    timeZone: "Asia/Tokyo",
  });
}

function stubImport(): (data: ArrayBuffer) => Promise<ImportResult> {
  return async (data) => {
    const text = new TextDecoder().decode(data);
    if (text === "bad") {
      return {
        ok: false,
        issues: [{ severity: "fatal", code: "unreadable-workbook", message: "The workbook could not be read." }],
      };
    }
    return success(["1"], ["1"]);
  };
}

function success(ids: string[], expandedIds: string[]): ImportResult {
  return {
    ok: true,
    sheetName: "ProjectWBS",
    tasks: ids.map((id) => task(id)),
    issues: [],
    latestModified: "2026-10-21T00:00:00.000Z",
    palette: { WS: 0 },
    expandedIds,
  };
}

function task(id: string): Task {
  return {
    id,
    taskName: `Task ${id}`,
    wbsCode: id,
    parentId: null,
    taskType: "Task",
    plannedStart: "2026-10-01",
    plannedEnd: "2026-10-02",
    progress: 0,
    status: "Not Started",
    owner: "A",
    workstream: "WS",
    sortOrder: 1,
    priority: null,
    predecessorIds: [],
    description: "",
    modified: "2026-10-21T00:00:00.000Z",
    itemUrl: null,
    scheduled: true,
    sourceRow: 2,
  };
}

function fileBytes(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function workbookFile(name: string, payload: string): File {
  return new File([payload], name);
}

function fakeHandle(name: string, file: File | (() => Promise<File>), permission: PermissionState) {
  const calls: string[] = [];
  const handle = {
    name,
    kind: "file" as const,
    calls,
    async queryPermission() {
      calls.push("query");
      return permission;
    },
    async requestPermission() {
      calls.push("request");
      return permission === "prompt" ? "granted" : permission;
    },
    async getFile() {
      calls.push("file");
      return typeof file === "function" ? file() : file;
    },
  };
  return handle as unknown as FileSystemFileHandle & { calls: string[] };
}
