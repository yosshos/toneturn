// SPEC-CLIMB-SYNC §3.2: the drill sync's bookkeeping on this device (plain localStorage, survives a reload):
//   - dirty: the items saved here since they last reached the cloud, each with a version (a save during a push keeps it dirty);
//   - seen: per item, the cloud row's updated_at as this device last saw it (the push's `base`: the server refuses to
//     overwrite a row the device hasn't seen) — per scope (epoch | account);
//   - pulled: the newest row this device has pulled — per scope.
// Listeners hear every new dirty mark (the sync's debounce).

const DIRTY = 'toneturn.drillDirty.v1';
const PULLED = 'toneturn.drillPulled.v1';
const SEEN = 'toneturn.drillSeen.v1';

type Dirty = Record<string, number>;
const readJson = <T,>(k: string, dflt: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? 'null');
    return v ?? dflt;
  } catch {
    return dflt;
  }
};
const writeJson = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage full or blocked: the next save marks it again; a lost "seen" only means a refused push and a pull */
  }
};

const read = (): Dirty => {
  const v = readJson<unknown>(DIRTY, {});
  if (Array.isArray(v)) return Object.fromEntries(v.filter((x): x is string => typeof x === 'string').map((x) => [x, 1]));
  return v && typeof v === 'object' ? (v as Dirty) : {};
};

const listeners = new Set<() => void>();
export function onDrillDirty(f: () => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}

/** Items saved on this device: to be pushed. Each mark bumps the item's version. */
export function markDrillDirty(ids: string[]): void {
  if (!ids.length) return;
  const d = read();
  for (const id of ids) d[id] = (d[id] ?? 0) + 1;
  writeJson(DIRTY, d);
  for (const f of listeners) f();
}
/** The dirty items and their versions. */
export const drillDirty = (): Dirty => read();
/** Pushed (or dropped): clear these ids at the versions given (an item saved again meanwhile stays dirty). */
export function clearDrillDirty(pushed: Dirty): void {
  const d = read();
  for (const [id, v] of Object.entries(pushed)) if (d[id] !== undefined && d[id] <= v) delete d[id];
  writeJson(DIRTY, d);
}

/** The cloud row versions this device has seen, for a scope. */
export function drillSeen(scope: string): Record<string, string> {
  const v = readJson<{ scope?: string; m?: Record<string, string> } | null>(SEEN, null);
  return v && v.scope === scope && v.m && typeof v.m === 'object' ? v.m : {};
}
export function noteDrillSeen(scope: string, rows: { id: string; at: string }[]): void {
  if (!rows.length) return;
  const m = { ...drillSeen(scope) };
  for (const r of rows) if (!m[r.id] || r.at > m[r.id]) m[r.id] = r.at;
  writeJson(SEEN, { scope, m });
}

/** The last pull of this scope (ISO), or null: never pulled here (this device's first sync sends everything). */
export function drillPulledAt(scope: string): string | null {
  const v = readJson<{ epoch?: string; at?: string } | null>(PULLED, null);
  return v && v.epoch === scope && typeof v.at === 'string' ? v.at : null;
}
export function setDrillPulledAt(scope: string, at: string): void {
  writeJson(PULLED, { epoch: scope, at });
}
export function resetDrillSync(): void {
  try {
    for (const k of [DIRTY, PULLED, SEEN]) localStorage.removeItem(k);
  } catch {
    /* fine */
  }
}
