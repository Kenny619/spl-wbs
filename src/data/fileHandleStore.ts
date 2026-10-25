const DB_NAME = "gantt-viewer";
const DB_VERSION = 1;
const STORE = "file-handle";
const KEY = "workbook";

export interface HandleStore {
  save(handle: FileSystemFileHandle): Promise<void>;
  load(): Promise<FileSystemFileHandle | null>;
  clear(): Promise<void>;
}

/** Remembers the handle only. Workbook rows are never written. */
export function createHandleStore(factory: IDBFactory | null = indexedDbFactory()): HandleStore {
  if (!factory) return memoryHandleStore();
  return {
    save: (handle) => put(factory, handle),
    load: () => get(factory),
    clear: () => remove(factory),
  };
}

export function memoryHandleStore(): HandleStore {
  let handle: FileSystemFileHandle | null = null;
  return {
    async save(next) {
      handle = next;
    },
    async load() {
      return handle;
    },
    async clear() {
      handle = null;
    },
  };
}

function indexedDbFactory(): IDBFactory | null {
  if (typeof indexedDB === "undefined") return null;
  return indexedDB;
}

async function put(factory: IDBFactory, handle: FileSystemFileHandle): Promise<void> {
  const db = await open(factory);
  await request(db, "readwrite", (store) => store.put(handle, KEY));
  db.close();
}

async function get(factory: IDBFactory): Promise<FileSystemFileHandle | null> {
  const db = await open(factory);
  const handle = await request<FileSystemFileHandle | undefined>(db, "readonly", (store) => store.get(KEY));
  db.close();
  return handle ?? null;
}

async function remove(factory: IDBFactory): Promise<void> {
  const db = await open(factory);
  await request(db, "readwrite", (store) => store.delete(KEY));
  db.close();
}

function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the file-handle database."));
  });
}

function request<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const pending = action(transaction.objectStore(STORE));
    pending.onsuccess = () => resolve(pending.result);
    pending.onerror = () => reject(pending.error ?? new Error("Could not update the remembered workbook."));
  });
}
