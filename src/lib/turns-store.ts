const DB_NAME = "innolympics-turns";
const DB_VERSION = 1;
const STORE = "sessions";

export type Turn = {
  role: "user" | "ai";
  text: string;
  ts: number;
};

export type TurnsRecord = {
  id: string;
  turns: Turn[];
  durationMs: number;
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB op failed"));
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function putTurns(record: TurnsRecord): Promise<void> {
  await tx("readwrite", (s) => s.put(record));
}

export async function getTurns(id: string): Promise<TurnsRecord | undefined> {
  return tx<TurnsRecord | undefined>("readonly", (s) =>
    s.get(id) as IDBRequest<TurnsRecord | undefined>,
  );
}

export async function deleteTurns(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}
