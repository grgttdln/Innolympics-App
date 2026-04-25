const DB_NAME = "innolympics-audio";
const DB_VERSION = 1;
const STORE = "recordings";

export type AudioRecord = {
  id: string;
  blob: Blob;
  durationMs: number;
  language: string;
  createdAt: number;
  transcript?: string;
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

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
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

export async function putRecording(record: AudioRecord): Promise<void> {
  await tx("readwrite", (s) => s.put(record));
}

export async function getRecording(id: string): Promise<AudioRecord | undefined> {
  const result = await tx<AudioRecord | undefined>("readonly", (s) => s.get(id) as IDBRequest<AudioRecord | undefined>);
  return result;
}

export async function deleteRecording(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export async function updateTranscript(id: string, transcript: string): Promise<void> {
  const existing = await getRecording(id);
  if (!existing) return;
  await putRecording({ ...existing, transcript });
}
