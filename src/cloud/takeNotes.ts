// Encore v2 (SPEC-PHRASE-STUDIO §6.2, §18): the optional sync of a recording's NOTES between the player's own devices —
// never audio. The client of migration supabase/migrations/20261207000000_toneturn_take_notes.sql (NOT applied by the
// agent — the owner dry-runs it first).
//
// FLAG (off by default): nothing here calls the server unless
//   · the build has VITE_TAKE_NOTES_SYNC=1 (after the owner applied the migration), or
//   · localStorage "tt.flag.takeNotes" = "1" on one device (to try it),
// AND the player turned on Settings → My recordings → "Sync the notes of starred takes" (Settings.syncTakeNotes).
//
// What is sent: takes that are starred, in a folder or linked to a phrase, with notes (packed, base64) and the small
// metadata a second device needs to list and play them. A take that arrives from another device is stored with its
// notes and no audio ("fromCloud"). Changes merge three-way against what was last synced (a local signature per take):
// whichever side changed since then wins; a deletion moves the take to the bin on the other device (restorable).

import { supabase } from './cloud';
import { isProtected, type RecTake, type SyncedMeta } from '../storage/recordings';

export const TAKE_NOTES_MIGRATION = '20261207000000_toneturn_take_notes';
/** Rows a player may keep on the server (the migration's trigger enforces it). */
export const TAKE_NOTES_MAX = 300;
/** Packed notes larger than this (base64 chars) are not sent (≈ 8 000 notes). */
export const NOTES_B64_MAX = 65536;

const ls = {
  get(k: string): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: the next sync compares again */
    }
  },
};

/** The feature flag (see the header): OFF unless the build or this device turns it on. */
export const TAKE_NOTES_SYNC_ON = (): boolean => {
  try {
    if (import.meta.env.VITE_TAKE_NOTES_SYNC === '0') return false;
  } catch {
    /* no env in some test runners */
  }
  // On by default since the server table was applied (2026-11-17); "0" turns it off on one device.
  return ls.get('tt.flag.takeNotes') !== '0';
};

// ───────────────────────────── rows ─────────────────────────────

export interface TakeNotesRow {
  take_id: string;
  at: string;
  title: string;
  course: string | null;
  instrument: RecTake['instrument'];
  kind: RecTake['kind'];
  source: RecTake['source'];
  sung: boolean;
  duration_ms: number;
  bpm: number | null;
  meter: number | null;
  t0: number | null;
  chart: string | null;
  notes: string;
  star: boolean;
  folder: string | null;
  phrase_ids: string[];
  deleted_at: string | null;
  updated_at?: string;
}

export function b64(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
export function unb64(s: string): Uint8Array {
  try {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  } catch {
    return new Uint8Array(0);
  }
}
/** A title as one string on the server (a T2 title keeps both languages, joined by a tab). */
const titleOut = (t: RecTake['title']) => (typeof t === 'string' ? t : `${t.he}\t${t.en}`).slice(0, 200);
const titleIn = (s: string): RecTake['title'] => {
  const [he, en] = s.split('\t');
  return en !== undefined ? { he, en } : s;
};

/** The take as a row (null: nothing worth sending — no notes, or notes too large). */
export function toNotesRow(t: RecTake): TakeNotesRow | null {
  if (!t.notes?.byteLength) return null;
  const notes = b64(t.notes);
  if (notes.length > NOTES_B64_MAX) return null;
  return {
    take_id: t.id,
    at: t.at,
    title: titleOut(t.title),
    course: t.course ?? null,
    instrument: t.instrument,
    kind: t.kind,
    source: t.source,
    sung: !!t.sung,
    duration_ms: Math.max(0, Math.min(36e6, Math.round(t.durationMs || 0))),
    bpm: t.bpm ?? null,
    meter: t.meter ?? null,
    t0: t.t0 ?? null,
    chart: t.chart ? t.chart.slice(0, 2000) : null,
    notes,
    star: !!t.star,
    folder: t.folder ?? null,
    phrase_ids: (t.phraseIds ?? []).slice(0, 32),
    deleted_at: t.deletedAt ?? null,
  };
}
/** A row as a take (for a device that does not have it). */
export function fromNotesRow(r: TakeNotesRow): RecTake {
  return {
    id: r.take_id,
    sessionId: '',
    at: r.at,
    durationMs: r.duration_ms,
    course: (r.course as RecTake['course']) ?? null,
    instrument: r.instrument,
    kind: r.kind,
    title: titleIn(r.title),
    sung: r.sung,
    source: r.source,
    notes: unb64(r.notes),
    ...(r.bpm !== null ? { bpm: r.bpm } : {}),
    ...(r.meter !== null ? { meter: r.meter } : {}),
    ...(r.t0 !== null ? { t0: r.t0 } : {}),
    ...(r.chart ? { chart: r.chart } : {}),
    ...(r.star ? { star: true } : {}),
    ...(r.folder ? { folder: r.folder } : {}),
    ...(r.phrase_ids?.length ? { phraseIds: r.phrase_ids } : {}),
    ...(r.deleted_at ? { deletedAt: r.deleted_at } : {}),
    fromCloud: true,
  };
}

/** What can change after a take is made (the merge compares these). */
const metaOf = (x: { title: string; star: boolean; folder: string | null; phrase_ids: string[]; deleted_at: string | null }) => JSON.stringify([x.title, x.star, x.folder ?? '', [...x.phrase_ids].sort(), !!x.deleted_at]);
export const localSig = (t: RecTake): string => metaOf({ title: titleOut(t.title), star: !!t.star, folder: t.folder ?? null, phrase_ids: t.phraseIds ?? [], deleted_at: t.deletedAt ?? null });
export const rowSig = (r: TakeNotesRow): string => metaOf(r);
const metaFromRow = (r: TakeNotesRow): SyncedMeta => ({ title: titleIn(r.title), star: r.star, folder: r.folder ?? undefined, phraseIds: r.phrase_ids, deletedAt: r.deleted_at ?? undefined });

export interface SyncPlan {
  /** Rows to upsert (new protected takes, and takes changed here since the last sync — deletions included). */
  up: TakeNotesRow[];
  /** Takes this device lacks (from another device, not deleted there). */
  add: RecTake[];
  /** Another device's change to a take this device has (it changed only there since the last sync). */
  meta: { id: string; m: SyncedMeta }[];
  /** The signature per take after the sync (stored as the next base). */
  synced: Record<string, string>;
}

/**
 * The three-way merge (pure). `local`: every take here (bin included); `remote`: every row on the server; `base`: the
 * signatures at the last sync. A take first goes up when it is protected (starred / foldered / phrase-linked) and has
 * notes; after that its metadata follows either side — unstarring never deletes it elsewhere, only "delete" does.
 */
export function planSync(local: readonly RecTake[], remote: readonly TakeNotesRow[], base: Record<string, string>, room = TAKE_NOTES_MAX, now = new Date().toISOString()): SyncPlan {
  const up: TakeNotesRow[] = [];
  const add: RecTake[] = [];
  const meta: SyncPlan['meta'] = [];
  const synced: Record<string, string> = {};
  const R = new Map(remote.map((r) => [r.take_id, r]));
  const L = new Map(local.map((t) => [t.id, t]));
  let free = room - remote.length;
  for (const t of local) {
    const r = R.get(t.id);
    if (!r) {
      if (t.deletedAt || !isProtected(t) || free <= 0) continue;
      const row = toNotesRow(t);
      if (!row) continue;
      up.push(row);
      free--;
      synced[t.id] = localSig(t);
      continue;
    }
    const sl = localSig(t);
    const sr = rowSig(r);
    if (sl === sr) synced[t.id] = sl;
    else if (base[t.id] === undefined || sl !== base[t.id]) {
      // changed here (or never compared: this device wins once)
      const row = toNotesRow(t);
      if (row) {
        up.push(row);
        synced[t.id] = sl;
      }
    } else {
      meta.push({ id: t.id, m: metaFromRow(r) });
      synced[t.id] = sr;
    }
  }
  for (const r of remote) {
    if (L.has(r.take_id) || r.deleted_at) continue;
    if (base[r.take_id] !== undefined) {
      // synced here before and gone now (the bin was emptied): the deletion reaches the other devices
      const row = { ...r, deleted_at: now };
      delete row.updated_at;
      up.push(row);
      synced[r.take_id] = rowSig(row);
      continue;
    }
    add.push(fromNotesRow(r));
    synced[r.take_id] = rowSig(r);
  }
  return { up, add, meta, synced };
}

// ───────────────────────────── transport ─────────────────────────────

export interface TakeNotesBackend {
  list(): Promise<TakeNotesRow[]>;
  upsert(rows: TakeNotesRow[]): Promise<void>;
}
let backend: TakeNotesBackend | null = null;
/** Tests: answer with a fake server (null = back to Supabase). */
export function setTakeNotesBackend(b: TakeNotesBackend | null) {
  backend = b;
}
const COLS = 'take_id,at,title,course,instrument,kind,source,sung,duration_ms,bpm,meter,t0,chart,notes,star,folder,phrase_ids,deleted_at,updated_at';
function server(): TakeNotesBackend | null {
  if (backend) return backend;
  const sb = supabase();
  if (!sb) return null;
  return {
    async list() {
      const { data, error } = await sb.from('toneturn_take_notes').select(COLS).order('updated_at').limit(TAKE_NOTES_MAX);
      if (error) throw error;
      return (data ?? []) as unknown as TakeNotesRow[];
    },
    async upsert(rows) {
      const user = (await sb.auth.getUser()).data.user;
      if (!user) return;
      for (let i = 0; i < rows.length; i += 50) {
        const { error } = await sb.from('toneturn_take_notes').upsert(rows.slice(i, i + 50).map((r) => ({ ...r, user_id: user.id })), { onConflict: 'user_id,take_id' });
        if (error) throw error;
      }
    },
  };
}

const BASE_KEY = 'tt.takeNotes.synced';
const loadBase = (): Record<string, string> => {
  try {
    const v = JSON.parse(ls.get(BASE_KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

export interface TakeNotesIO {
  /** The takes to compare (storage/recordings syncCandidates): protected ones and the ids synced before. */
  local(known: ReadonlySet<string>): Promise<RecTake[]>;
  put(t: RecTake): Promise<boolean>;
  meta(id: string, m: SyncedMeta): Promise<unknown>;
}

/**
 * One sync round (the app calls it a moment after start and after changes, signed in). Returns what moved, or null when
 * it did not run (flag off, the player's switch off, no server). Errors leave the base as it was (the next round retries).
 */
export async function syncTakeNotes(on: boolean, io: TakeNotesIO): Promise<{ up: number; added: number; changed: number } | null> {
  if (!on || !TAKE_NOTES_SYNC_ON()) return null;
  const s = server();
  if (!s) return null;
  const remote = await s.list();
  const base = loadBase();
  const plan = planSync(await io.local(new Set(Object.keys(base))), remote, base);
  if (plan.up.length) await s.upsert(plan.up);
  let added = 0;
  for (const t of plan.add) if (await io.put(t)) added++;
  for (const x of plan.meta) await io.meta(x.id, x.m);
  ls.set(BASE_KEY, JSON.stringify(plan.synced));
  return { up: plan.up.length, added, changed: plan.meta.length };
}
