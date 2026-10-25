import { describe, expect, it } from "vitest";
import { createHandleStore, memoryHandleStore } from "../../src/data/fileHandleStore";

describe("file handle store", () => {
  it("keeps a handle in memory without task rows", async () => {
    const store = memoryHandleStore();
    const handle = { name: "plan.xlsx" } as FileSystemFileHandle;
    await store.save(handle);
    expect(await store.load()).toBe(handle);
    expect(JSON.stringify(await store.load())).not.toContain("taskName");
    await store.clear();
    expect(await store.load()).toBeNull();
  });

  it("uses memory when IndexedDB is unavailable", async () => {
    const store = createHandleStore(null);
    const handle = { name: "plan.xlsx" } as FileSystemFileHandle;
    await store.save(handle);
    expect(await store.load()).toBe(handle);
  });

  it("writes only the handle into IndexedDB", async () => {
    const records = new Map<IDBValidKey, unknown>();
    const opened: string[] = [];
    let ready = false;
    const storeApi = {
      put(value: unknown, key: IDBValidKey) {
        records.set(key, value);
        return done(undefined);
      },
      get(key: IDBValidKey) {
        return done(records.get(key));
      },
      delete(key: IDBValidKey) {
        records.delete(key);
        return done(undefined);
      },
    };
    const db = {
      objectStoreNames: { contains: (name: string) => name === "file-handle" && ready },
      createObjectStore(name: string) {
        if (name === "file-handle") ready = true;
      },
      transaction() {
        return { objectStore: () => storeApi };
      },
      close() {},
    };
    const factory = {
      open(name: string) {
        opened.push(name);
        const request = {
          result: db,
          error: null,
          onsuccess: null as ((event: Event) => void) | null,
          onerror: null as ((event: Event) => void) | null,
          onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
        };
        queueMicrotask(() => {
          if (!ready) request.onupgradeneeded?.({} as IDBVersionChangeEvent);
          queueMicrotask(() => request.onsuccess?.({} as Event));
        });
        return request;
      },
    };
    const store = createHandleStore(factory as unknown as IDBFactory);
    const handle = { name: "plan.xlsx" } as FileSystemFileHandle;
    await store.save(handle);
    expect(opened).toEqual(["gantt-viewer"]);
    expect(records.get("workbook")).toBe(handle);
    expect(JSON.stringify(records.get("workbook"))).not.toContain("taskName");
    expect(await store.load()).toBe(handle);
    await store.clear();
    expect(records.has("workbook")).toBe(false);
    expect(await store.load()).toBeNull();
  });
});

function done(result: unknown): IDBRequest {
  const request = {
    result,
    error: null,
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
  };
  queueMicrotask(() => request.onsuccess?.({} as Event));
  return request as unknown as IDBRequest;
}
