// Tiny IndexedDB key/value store with an in-memory fallback (private mode, tests).

export interface KV {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

export function memoryKV(): KV {
  const m = new Map<string, unknown>();
  return {
    get: async <T,>(k: string) => structuredClone(m.get(k)) as T | undefined,
    set: async <T,>(k: string, v: T) => {
      m.set(k, structuredClone(v));
    },
  };
}

export function indexedKV(dbName = 'toneturn', store = 'kv'): KV {
  let dbp: Promise<IDBDatabase> | null = null;
  const open = () =>
    (dbp ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const r = fn(db.transaction(store, mode).objectStore(store));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  };
  return {
    get: <T,>(k: string) => tx<T | undefined>('readonly', (s) => s.get(k) as IDBRequest<T | undefined>),
    set: async <T,>(k: string, v: T) => {
      await tx('readwrite', (s) => s.put(v, k));
    },
  };
}

export function defaultKV(): KV {
  try {
    if (typeof indexedDB !== 'undefined') return indexedKV();
  } catch {
    /* fall through */
  }
  return memoryKV();
}
