// Channels, visible (BUILD-PLAN-2026-11 phase 6; docs/SPEC-EAR-AND-READING.md §2, §3.1, §8, §8a). The glue between the
// pure channel model (drills/channel.ts, presentation.ts) and the screens:
// - presentation by mastery in a technique run: how much notation an item shows and whether it starts by ear, with the
//   weekly channel mix choosing page / ear / memory for known items, and the channel a take is recorded under;
// - the weekly mix kept in the settings (moved ≤ 5 points a week toward the profile's target);
// - the daily sight dose: one short NEW reading exercise a day in the key of the day (no demo → a sight take);
// - the level test's two channel checks: one phrase by ear, one exercise at sight (fresh items).
// Pure.

import type { Drill, DrillSettings, FamilyId, ItemState } from './drills/types';
import { channelProfile, defaultChannel, type Channel } from './drills/channel';
import { itemStatus, type ItemStatus } from './drills/itemStatus';
import { itemPass } from './drills/ladder';
import { generate } from './drills/generate';
import { weekOf } from './drills/keyIndex';
import { currentLevel, familyById, levelKeys } from './drills/plan';
import { FADES, nextChannel, presentation, START_MIX, strongOf, targetMix, weeklyMix, type Fade, type Mix, type Strong } from './presentation';

type Instrument = NonNullable<DrillSettings['instrument']>;

// ───────────────────────────── the self-ratings (course start) ─────────────────────────────

/** Settings.channelSelf[course]: the two 1–5 self-ratings asked when the player chooses an instrument (owner §8.3). */
export interface ChannelSelf {
  ear?: number;
  reading?: number;
}
/** The instrument courses that ask the two ratings. */
export const RATED_COURSES = ['keys', 'guitar', 'bass', 'drums'] as const;
export const courseOfInstrument = (inst: Instrument | undefined): (typeof RATED_COURSES)[number] => (inst === 'guitar' || inst === 'bass' || inst === 'drums' ? inst : 'keys');

/** The player's channel profile with the course's self-ratings as the prior. */
export function profileOf(items: Record<string, ItemState>, self?: ChannelSelf): { ear: number | null; reading: number | null } {
  return channelProfile(items, self ?? {});
}

// ───────────────────────────── presentation in a run ─────────────────────────────

/** Ear and reading families present themselves (ear = hidden until the result, reading = full notation, at sight). */
const OWN_PRESENTATION = new Set(['k-ear', 'k-phrase', 'g-ear', 'g-phrase', 'b-ear', 'b-phrase', 'k-read', 'g-reading', 'b-read', 'b-posread', 'b-up-read', 'd-read', 'd-ear']);

/**
 * Items whose notation may fade: written technique on a staff (not drums, songs, charts, improvised or sung items, and
 * not the ear / reading families, which measure exactly what fading would change).
 */
export function fadeable(d: Drill): boolean {
  const fam = String(d.spec.family);
  if (OWN_PRESENTATION.has(fam)) return false;
  if (d.show || d.sung || d.write || d.drumWrite || d.untimed || d.listen || d.phrase || d.goal.improv || d.goal.free || d.chart?.length || d.form) return false;
  if (fam.startsWith('d-') || d.spec.instrument === 'drums') return false;
  return d.notes.length > 0;
}

/** The pattern of an item: its id without the key (the same rung of the same level in another key). */
export function patternIdOf(itemId: string): string {
  const p = itemId.split(':');
  return p.length > 3 ? [p[0], p[1], ...p.slice(3)].join(':') : itemId;
}

const closedItem = (st: ItemState, fallbackTarget: number): boolean => itemPass(st, 0, st.targetBpm ?? fallbackTarget).target;

/** Keys (other than the item's own) where the same pattern is closed. */
export function patternKeys(d: Pick<Drill, 'itemId' | 'startBpm'> & { key?: number }, items: Record<string, ItemState>, targetBpm: number): number {
  const pid = patternIdOf(d.itemId);
  const keys = new Set<number>();
  for (const st of Object.values(items)) {
    if (st.itemId === d.itemId || patternIdOf(st.itemId) !== pid) continue;
    if (closedItem(st, targetBpm)) keys.add(((st.key % 12) + 12) % 12);
  }
  return keys.size;
}

/** Passed from memory: a clean take with nothing shown (the "unaided" channel). */
export const memoryPassed = (st: ItemState | undefined): boolean => (st?.channels?.unaided?.clean ?? 0) > 0;

/** The share of closed items also passed from memory ("in the fingers", SPEC-EAR-AND-READING §4). */
export function inFingersShare(items: Record<string, ItemState>): number {
  let closed = 0, mem = 0;
  for (const st of Object.values(items)) {
    if (!st.takes || !st.targetBpm || !closedItem(st, st.targetBpm)) continue;
    closed++;
    if (memoryPassed(st)) mem++;
  }
  return closed ? mem / closed : 0;
}

/** A deterministic draw in [0, 1) from a string (the mix's choice per item per day: stable across reloads). */
export function drawOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export interface RunPresentation {
  fade: Fade;
  byEar: boolean;
  /** Why: the item's stage, or the mix's channel for a known item. */
  why: 'off' | 'new' | 'learning' | 'known' | 'pattern' | 'memory' | 'mix-ear' | 'mix-memory';
  status: ItemStatus;
}

/**
 * What a technique item shows when a run reaches it (SPEC-EAR-AND-READING §8a), and — for a known item (closed here,
 * or the pattern closed in ≥ 3 keys) — the weekly mix's channel (nextChannel): ear plays it first with the notation
 * hidden, memory shows nothing, page keeps the mastery default.
 */
export function runPresentation(o: { drill: Drill; items: Record<string, ItemState>; targetBpm: number; strong: Strong; mix?: Mix | null; day: string; missedLast?: boolean; /** SPEC-PATH-TODAY-PRACTICE §4.4 / §5.2: a step or an assignment that requires a channel — it wins over the mix. */ force?: 'ear' | 'memory' }): RunPresentation {
  const st = o.items[o.drill.itemId];
  const status = itemStatus(st, o.drill.startBpm, o.targetBpm);
  if (!fadeable(o.drill)) return { fade: 'full', byEar: false, why: 'off', status };
  if (o.force === 'ear') return { fade: 'full', byEar: true, why: 'mix-ear', status };
  if (o.force === 'memory') return { fade: 'none', byEar: false, why: 'mix-memory', status };
  const pk = patternKeys(o.drill, o.items, o.targetBpm);
  const mem = memoryPassed(st);
  const missed = o.missedLast ?? (!!st && st.fails > 0);
  const base = presentation({ status, patternKeys: pk, memoryPassed: mem, missedLast: missed, strong: o.strong });
  const known = status === 'closed' || pk >= 3 || mem;
  if (!known) return { ...base, why: status === 'new' ? 'new' : 'learning', status };
  const ch = nextChannel(o.mix ?? START_MIX, o.strong, drawOf(`${o.drill.itemId}|${o.day}`));
  if (ch === 'memory') return { fade: missed ? 'name' : 'none', byEar: false, why: 'mix-memory', status };
  if (ch === 'ear') return { fade: base.fade, byEar: true, why: 'mix-ear', status };
  return { ...base, why: mem ? 'memory' : pk >= 3 ? 'pattern' : 'known', status };
}

/**
 * The channel a take is recorded under: notation shown in full (or the "show notes" button pressed) → the item's
 * default (page, known — or a reading family's sight take); by ear with the notation hidden → ear, known (a coached
 * take after a demo is never "fresh", BUILD-PLAN §0.2); rhythm only → page, known; a name or nothing → unaided.
 */
export function takeChannel(o: { drill: Drill; st: ItemState | undefined; fade: Fade; byEar: boolean; shown: boolean }): Channel {
  if (o.shown) return defaultChannel(o.drill, o.st);
  if (o.byEar) return 'ear-known';
  if (o.fade === 'full' || o.fade === 'rhythm') return defaultChannel(o.drill, o.st);
  return 'unaided';
}

/** One step more notation (after a miss), never past full. */
export const fadeBack = (f: Fade): Fade => FADES[Math.max(0, FADES.indexOf(f) - 1)];

/** The rhythm-only view of an item: every note on one line per hand (treble B4, bass D3), no key signature. */
export function rhythmDrill(d: Drill): Drill {
  const seen = new Set<string>();
  const notes = d.notes
    .map((n) => ({ ...n, pitch: n.hand === 'L' ? 50 : 71 }))
    .filter((n) => {
      const k = `${n.hand}|${n.beat}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  return { ...d, notes, keySig: 'C' };
}

// ───────────────────────────── the weekly mix ─────────────────────────────

/** Settings.channelMix: this week's mix and the week it was set for (moved once a week). */
export interface StoredMix {
  week: string;
  mix: Mix;
}

/** The week (its Monday) a local day falls in — the mix moves once per week. */
export const weekOfDay = (day: string): string => weekOf(`${day}T12:00:00Z`);

/** This week's mix: the stored one if it is this week's, else last week's moved toward the target (≤ 5 points). */
export function mixForWeek(stored: StoredMix | null | undefined, profile: { ear: number | null; reading: number | null }, inFingers: number, week: string): StoredMix {
  if (stored && stored.week === week) return stored;
  return { week, mix: weeklyMix(stored?.mix ?? null, targetMix(profile, inFingers)) };
}

/** The weekly mix as words: "by ear 64% · reading 26% · memory 10%". */
export function mixLine(mix: Mix, strong: Strong, lang: 'he' | 'en'): string {
  const name = (c: 'ear' | 'page' | 'memory') => (c === 'memory' ? (lang === 'he' ? 'מהזיכרון' : 'memory') : c === 'ear' ? (lang === 'he' ? 'משמיעה' : 'by ear') : lang === 'he' ? 'קריאה' : 'reading');
  const weak: 'ear' | 'page' = strong === 'ear' ? 'page' : 'ear';
  const p = (v: number) => `${Math.round(v * 100)}%`;
  return `${name(strong)} ${p(mix.strong)} · ${name(weak)} ${p(mix.weak)} · ${name('memory')} ${p(mix.memory)}`;
}

export { strongOf };

// ───────────────────────────── the daily sight dose and the level-test checks ─────────────────────────────

/** The reading family of an instrument (fresh reading material, SPEC-EAR-AND-READING §3.1). */
export const READING_FAMILY: Record<Instrument, FamilyId> = { piano: 'k-read', guitar: 'g-reading', bass: 'b-read', drums: 'd-read' } as Record<Instrument, FamilyId>;
/** The by-ear phrase family of an instrument (drums: none). */
export const EAR_FAMILY: Partial<Record<Instrument, FamilyId>> = { piano: 'k-phrase', guitar: 'g-phrase', bass: 'b-phrase' } as Partial<Record<Instrument, FamilyId>>;

const dayIndex = (day: string): number => Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400000) || 0;
const mod12 = (k: number) => ((k % 12) + 12) % 12;

/** The first item of a level (from `from`) whose state is empty — a spec × key not played yet, the key of `key` first. */
function unseenIn(fam: { levels: import('./drills/generate').LevelDef[] }, from: number, items: Record<string, ItemState>, order: DrillSettings['keyOrder'], key: number | null, salt: number): Drill | null {
  for (let li = from; li >= 0; li--) {
    const lv = fam.levels[li];
    const keys = levelKeys(lv, order);
    const ordered = key !== null && keys.includes(mod12(key)) ? [mod12(key), ...keys.filter((k) => k !== mod12(key))] : keys;
    const specs = lv.specs.map((_, i) => lv.specs[(i + salt) % lv.specs.length]);
    for (const k of ordered)
      for (const s of specs) {
        try {
          const d = generate({ ...s, key: k });
          if (!items[d.itemId]?.takes) return d;
        } catch {
          /* a spec that can't be generated here: next */
        }
      }
  }
  return null;
}

/**
 * Today's sight dose: one short NEW reading exercise in the key of the day, a level below the player's reading level
 * (sight-reading is set below the level placed into). The piano's graded reading is generated fresh every day (a new
 * seed); the other instruments take a reading item not played yet. Null when there is nothing new to read.
 */
export function sightDrill(o: { instrument: Instrument; items: Record<string, ItemState>; order: DrillSettings['keyOrder']; start?: number; key: number | null; day: string }): Drill | null {
  const fam = familyById(READING_FAMILY[o.instrument]);
  if (!fam || !fam.levels.length) return null;
  const cur = currentLevel(fam, o.items, o.order, o.start);
  const li = Math.max(0, fam.levels.indexOf(cur) - 1);
  const di = dayIndex(o.day);
  let d: Drill | null = null;
  if (o.instrument === 'piano') {
    const lv = fam.levels[li];
    const spec = lv.specs[di % lv.specs.length];
    const keys = levelKeys(lv, o.order);
    const key = o.key !== null && keys.includes(mod12(o.key)) ? mod12(o.key) : keys[di % keys.length];
    // a new seed every day: the option moves by an even step (its parity picks the metre of the quick study)
    try {
      d = generate({ ...spec, key, option: (spec.option ?? 0) + 2 * (50 + (di % 5000)) });
    } catch {
      d = null;
    }
    if (d && o.items[d.itemId]?.takes) d = null;
  }
  // (guitar / bass: no generator seed to move, so a reading item not played yet — none left: no dose)
  d ??= unseenIn(fam, li, o.items, o.order, o.key, di);
  if (!d) return null;
  return { ...d, title: { en: `Sight dose · ${cur.title.en}`, he: `קריאה יומית · ${cur.title.he}` } };
}

/** The level test's by-ear check: one phrase not heard before, a level below the placed level of the ear family. */
export function earCheckDrill(o: { instrument: Instrument; items: Record<string, ItemState>; order: DrillSettings['keyOrder']; level?: number; key: number; salt?: number }): Drill | null {
  const id = EAR_FAMILY[o.instrument];
  const fam = id ? familyById(id) : undefined;
  if (!fam || !fam.levels.length) return null;
  const li = Math.max(0, Math.min(fam.levels.length - 1, (o.level ?? 1) - 2));
  return unseenIn(fam, li, o.items, o.order, o.key, o.salt ?? 0);
}

/** The level test's sight check: one reading exercise not seen before, a level below the placed reading level. */
export function sightCheckDrill(o: { instrument: Instrument; items: Record<string, ItemState>; order: DrillSettings['keyOrder']; level?: number; key: number; day: string }): Drill | null {
  return sightDrill({ instrument: o.instrument, items: o.items, order: o.order, start: o.level, key: o.key, day: o.day });
}

/** Settings.sightDose: the day's pick, kept so the dose stays the same item all day (and "done" once played). */
export interface StoredSight {
  day: string;
  spec: Drill['spec'];
  title: { en: string; he: string };
}

/**
 * Today's sight dose: the kept pick when it is today's (regenerated from its spec), else a new pick to keep. `done` =
 * the item has a take (it had none when picked).
 */
export function sightForToday(stored: StoredSight | null | undefined, o: Parameters<typeof sightDrill>[0]): { drill: Drill; keep: StoredSight | null; done: boolean } | null {
  if (stored && stored.day === o.day) {
    try {
      const d = { ...generate(stored.spec), title: stored.title };
      return { drill: d, keep: null, done: (o.items[d.itemId]?.takes ?? 0) > 0 };
    } catch {
      /* the stored spec no longer generates: pick again */
    }
  }
  const d = sightDrill(o);
  if (!d) return null;
  return { drill: d, keep: { day: o.day, spec: d.spec, title: d.title }, done: false };
}
