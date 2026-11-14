// Key mastery (docs/SPEC-AI.md §"Key mastery", owner 2026-11-14): every technique and jazz skill is practised in all 12
// keys. Per skill (a drill family, or a family's drill kind) and per key: a 0–1 mastery from the clean tempo against
// the item's target (or the skill's top tempo), the accuracy, and how recently it was played; and a status. A key with
// too few takes is "untried", never "weak" (the same rule as the profile: no judgement without enough measures).
// Plus a per-instrument summary across skills ("your weakest keys on piano: D♭, F♯, B"). Pure.

import type { FamilyId, ItemState } from '../drills/types';

export type KeyStatus = 'untried' | 'weak' | 'ok' | 'strong';
export type KeyInstrument = 'piano' | 'guitar' | 'bass';
type Bi = { en: string; he: string };

export interface KeyCell {
  /** Tonic pitch class 0–11. */
  key: number;
  /** 0..1 (0 when untried). */
  mastery: number;
  status: KeyStatus;
  takes: number;
  /** Latest take (ISO), '' if none. */
  last: string;
  /** Median goal tempo of the key's items (♩), for a suggestion. */
  goalBpm: number;
}

export interface SkillKeys {
  /** `family` or `family:kind`. */
  skill: string;
  family: FamilyId;
  kind?: string;
  /** Indexed by pitch class. */
  cells: KeyCell[];
  /** Weak keys, weakest first. */
  weak: number[];
  untried: number[];
  /** Keys with enough takes to judge. */
  tried: number;
}

export interface InstrumentKeys {
  instrument: KeyInstrument;
  /** Per key across the instrument's skills: mean mastery of the skills where the key was tried (0 = untried). */
  cells: KeyCell[];
  /** The weakest keys (at most 3), weakest first. */
  weakest: number[];
  /** Skills with at least one weak key, the one with most weak keys first. */
  skills: SkillKeys[];
}

/** Takes in a key (all its items of a skill) before it is judged. */
export const MIN_TAKES = 3;
/** Below this a tried key is weak. */
export const WEAK_BELOW = 0.5;
/** A tried key this far below the skill's median is weak too (relative weakness across the keys). */
export const WEAK_GAP = 0.2;
export const STRONG_FROM = 0.85;
/** Recency: a key not played for this many days keeps 0.6 + 0.4 × ½ of its mastery (never below 60 %). */
export const HALF_LIFE_DAYS = 30;
const DAY = 86400000;

/** Readable key names (tonic), the same in both languages; shown LTR. */
export const KEY_LABEL = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
/** The keys in circle-of-fifths order, the map's order. */
export const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

/** Families without keys, or whose instrument can't be told from the id. */
const NO_KEYS = (f: string) => f.startsWith('d-') || f === 'custom' || f === 'transcribe' || f === 'licks';

/** The instrument a family belongs to (by its id), or null for families without keys. */
export function instrumentOf(family: FamilyId): KeyInstrument | null {
  if (NO_KEYS(family)) return null;
  if (family.startsWith('b-') || family === 'g-bass') return 'bass';
  if (family.startsWith('g-')) return 'guitar';
  return 'piano';
}

/** The drill kind from an item id (family:kind:key:hands…). */
export const kindOf = (itemId: string): string => itemId.split(':')[1] ?? '';
/** An item id without its key: the same variant in every key. */
const variantOf = (itemId: string): string => {
  const p = itemId.split(':');
  return [p[0], p[1], ...p.slice(3)].join(':');
};

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);
const toTime = (t: number | string) => (typeof t === 'number' ? t : Date.parse(t));
const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Recency factor 0.6..1. */
export function recency(last: string, now: number | string): number {
  if (!last) return 0.6;
  const days = Math.max(0, (toTime(now) - Date.parse(last)) / DAY);
  return 0.6 + 0.4 * Math.pow(0.5, days / HALF_LIFE_DAYS);
}

/** Mastery of one item: clean tempo against its target (or `top`, the variant's best tempo in any key), accuracy, recency. */
export function itemMastery(st: ItemState, top: number, now: number | string): number {
  const ref = st.targetBpm && st.targetBpm > 0 ? st.targetBpm : Math.max(1, top);
  const tempo = st.cleanBpm > 0 ? clamp01(st.cleanBpm / ref) : 0;
  const acc = clamp01(st.ewma?.acc ?? 0);
  return clamp01((0.65 * tempo + 0.35 * acc) * recency(st.last, now));
}

export type SkillBy = 'family' | 'kind';

/** Key mastery of every skill with takes. `by: 'kind'` splits a family into its drill kinds (scale, arpeggio, ii–V …). */
export function keyMastery(items: Record<string, ItemState> | ItemState[], now: number | string = Date.now(), by: SkillBy = 'family'): SkillKeys[] {
  const list = (Array.isArray(items) ? items : Object.values(items)).filter((s) => s && s.takes > 0 && instrumentOf(s.family) !== null);
  // The variant's best clean tempo in any key (the reference when an item has no target).
  const top = new Map<string, number>();
  for (const s of list) top.set(variantOf(s.itemId), Math.max(top.get(variantOf(s.itemId)) ?? 0, s.cleanBpm));
  const groups = new Map<string, ItemState[]>();
  for (const s of list) {
    const skill = by === 'kind' ? `${s.family}:${kindOf(s.itemId)}` : s.family;
    const g = groups.get(skill);
    if (g) g.push(s);
    else groups.set(skill, [s]);
  }
  const out: SkillKeys[] = [];
  for (const [skill, ss] of groups) {
    const cells: KeyCell[] = Array.from({ length: 12 }, (_, key) => {
      const at = ss.filter((s) => ((s.key % 12) + 12) % 12 === key);
      const takes = at.reduce((a, s) => a + s.takes, 0);
      const last = at.reduce((a, s) => (s.last > a ? s.last : a), '');
      const goalBpm = Math.round(median(at.map((s) => s.goalBpm).filter((x) => x > 0)));
      if (takes < MIN_TAKES) return { key, mastery: 0, status: 'untried', takes, last, goalBpm };
      let w = 0;
      let sum = 0;
      for (const s of at) {
        const wt = Math.min(10, s.takes);
        w += wt;
        sum += wt * itemMastery(s, top.get(variantOf(s.itemId)) ?? s.cleanBpm, now);
      }
      return { key, mastery: w ? sum / w : 0, status: 'ok', takes, last, goalBpm };
    });
    const tried = cells.filter((c) => c.status !== 'untried');
    const med = median(tried.map((c) => c.mastery));
    for (const c of tried) c.status = c.mastery < WEAK_BELOW || (tried.length >= 3 && c.mastery < med - WEAK_GAP) ? 'weak' : c.mastery >= STRONG_FROM ? 'strong' : 'ok';
    const fam = ss[0].family;
    out.push({
      skill,
      family: fam,
      ...(by === 'kind' ? { kind: skill.slice(fam.length + 1) } : {}),
      cells,
      weak: cells.filter((c) => c.status === 'weak').sort((a, b) => a.mastery - b.mastery).map((c) => c.key),
      untried: cells.filter((c) => c.status === 'untried').map((c) => c.key),
      tried: tried.length,
    });
  }
  return out;
}

/** One skill's keys (a family), or null when nothing was played in it. */
export const skillKeysOf = (family: FamilyId, items: Record<string, ItemState>, now: number | string = Date.now()): SkillKeys | null =>
  keyMastery(Object.values(items).filter((s) => s.family === family), now)[0] ?? null;

/** Per instrument: the keys across skills, the weakest keys and the skills with weak keys. Instruments without a tried key are left out. */
export function instrumentKeys(items: Record<string, ItemState> | ItemState[], now: number | string = Date.now()): InstrumentKeys[] {
  const skills = keyMastery(items, now);
  const out: InstrumentKeys[] = [];
  for (const inst of ['piano', 'guitar', 'bass'] as const) {
    const ss = skills.filter((s) => instrumentOf(s.family) === inst && s.tried > 0);
    if (!ss.length) continue;
    const cells: KeyCell[] = Array.from({ length: 12 }, (_, key) => {
      const cs = ss.map((s) => s.cells[key]).filter((c) => c.status !== 'untried');
      const takes = ss.reduce((a, s) => a + s.cells[key].takes, 0);
      const last = ss.reduce((a, s) => (s.cells[key].last > a ? s.cells[key].last : a), '');
      if (!cs.length) return { key, mastery: 0, status: 'untried', takes, last, goalBpm: 0 };
      const mastery = cs.reduce((a, c) => a + c.mastery, 0) / cs.length;
      const weakIn = cs.filter((c) => c.status === 'weak').length;
      const status: KeyStatus = weakIn * 2 >= cs.length || mastery < WEAK_BELOW ? 'weak' : mastery >= STRONG_FROM ? 'strong' : 'ok';
      return { key, mastery, status, takes, last, goalBpm: Math.round(median(cs.map((c) => c.goalBpm).filter((x) => x > 0))) };
    });
    const weakest = cells.filter((c) => c.status === 'weak').sort((a, b) => a.mastery - b.mastery).slice(0, 3).map((c) => c.key);
    out.push({ instrument: inst, cells, weakest, skills: ss.filter((s) => s.weak.length > 0).sort((a, b) => b.weak.length - a.weak.length || a.skill.localeCompare(b.skill)) });
  }
  return out;
}

const INST: Record<KeyInstrument, Bi> = { piano: { en: 'piano', he: 'פסנתר' }, guitar: { en: 'guitar', he: 'גיטרה' }, bass: { en: 'bass', he: 'בס' } };
export const instrumentName = (i: KeyInstrument): Bi => INST[i];
export const keyList = (keys: number[]): string => keys.map((k) => KEY_LABEL[k]).join(', ');

/**
 * The short weak-keys line for the coach (profileDigest): per instrument its weakest keys, and the skill with most weak
 * keys with those keys and its goal tempo. Measured data only; '' when nothing is weak.
 */
export function weakKeysLine(insts: InstrumentKeys[], titleOf: (f: FamilyId) => string = (f) => f): string {
  const parts: string[] = [];
  for (const i of insts) {
    if (!i.weakest.length && !i.skills.length) continue;
    let p = `${i.instrument}: weakest ${i.weakest.length ? keyList(i.weakest) : '-'}`;
    const s = i.skills[0];
    if (s) {
      const ks = s.weak.slice(0, 3);
      const bpm = Math.round(median(ks.map((k) => s.cells[k].goalBpm).filter((x) => x > 0)));
      p += `; ${titleOf(s.family)} weak in ${keyList(ks)}${bpm ? ` (goal ♩${bpm})` : ''}`;
    }
    parts.push(p);
  }
  return parts.join(' | ').slice(0, 300);
}

/** Is this key a focus key of its skill: weak, or untried while other keys of the skill are known. */
export function focusRank(sk: SkillKeys | null | undefined, key: number): 0 | 1 | 2 {
  if (!sk || sk.tried === 0) return 2;
  const st = sk.cells[((key % 12) + 12) % 12].status;
  return st === 'weak' ? 0 : st === 'untried' ? 1 : 2;
}
