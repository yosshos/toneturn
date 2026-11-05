// Record and compare (spec S.2): with the player's opt-in, keep one short take per vocal exercise per
// week on this device (IndexedDB) — the best-scoring one — so "a month ago vs. now" can be played back.
// Never uploaded. Everything fails soft (private mode, no IndexedDB): the feature just stays empty.

export interface StoredTake {
  item: string;
  week: string;
  score: number;
  at: string;
  blob: Blob;
}

const DB = 'toneturn-takes';
const STORE = 'takes';

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Keep this take if it is the week's best for the item. */
export async function keepTake(t: StoredTake): Promise<boolean> {
  const db = await open();
  if (!db) return false;
  const key = `${t.item}|${t.week}`;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      const get = st.get(key);
      get.onsuccess = () => {
        const old = get.result as (StoredTake & { key: string }) | undefined;
        if (old && old.score >= t.score) return resolve(false);
        st.put({ ...t, key });
        tx.oncomplete = () => resolve(true);
      };
      get.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/** All kept takes, oldest first. */
export async function listTakes(): Promise<StoredTake[]> {
  const db = await open();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as StoredTake[]).sort((a, b) => a.at.localeCompare(b.at)));
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function clearTakes(): Promise<void> {
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Per item: the oldest and the newest kept take (only items with two different weeks). */
export function thenAndNow(all: StoredTake[]): { item: string; then: StoredTake; now: StoredTake }[] {
  const by = new Map<string, StoredTake[]>();
  for (const t of all) by.set(t.item, [...(by.get(t.item) ?? []), t]);
  return [...by.entries()]
    .map(([item, ts]) => ({ item, then: ts[0], now: ts[ts.length - 1] }))
    .filter((x) => x.then.week !== x.now.week);
}
