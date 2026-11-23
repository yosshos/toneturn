// The one status ladder (docs/BUILD-PLAN-2026-11.md D4, owner-approved 2026-11-22; SPEC-PATH-TODAY-PRACTICE §2, §4.2):
// new → learning → almost → closed (one key) → in all 12 keys → in my language → in the fingers. One ladder for
// technique levels, licks, Encore phrases, pieces and improvisation levels — each stopping where it makes sense:
//   technique  new … closed · all keys · in the fingers
//   lick       new … closed · 12 keys · in my language · in the fingers
//   piece      new … closed · in the fingers (memorised)
//   improv / topic / step   new … closed
// The base (new … closed) is itemStatus's rule (D1: closed = 3 clean takes at ≥ 95 % of the target on ≥ 2 days, a single
// take at the target = almost). For a unit across keys the base is its best key (a key's status = its weakest item):
// "closed" means closed in one key. Above closed the rungs are earned on their own (a lick can be in my language before
// all 12 keys are closed, even before one is) and each lit one shows; the word is the highest lit rung. "In the fingers" = passed from
// memory (a clean unaided take, channelPlan.memoryPassed) in every key the unit has. Stars stay internal (badges, XP,
// the path's mastery seal); the display is this ladder only. Pure.

import type { DrillSettings, ItemState } from './drills/types';
import type { LevelDef } from './drills/generate';
import { itemStatus, STATUS_ORDER, STATUS_WORD, unitStatus, type ItemStatus } from './drills/itemStatus';
import { levelDrills, targetBpmOf } from './drills/plan';
import { LICK_KEYS, lickItemId, lickTempos, type Lick, type LickInstrument } from './licks';

export type Rung = ItemStatus | 'keys12' | 'language' | 'fingers';
export type LadderKind = 'technique' | 'lick' | 'piece' | 'improv' | 'step';

export const RUNG_ORDER: Rung[] = ['new', 'learning', 'almost', 'closed', 'keys12', 'language', 'fingers'];

const RUNGS: Record<LadderKind, Rung[]> = {
  technique: ['new', 'learning', 'almost', 'closed', 'keys12', 'fingers'],
  lick: ['new', 'learning', 'almost', 'closed', 'keys12', 'language', 'fingers'],
  piece: ['new', 'learning', 'almost', 'closed', 'fingers'],
  improv: ['new', 'learning', 'almost', 'closed'],
  step: ['new', 'learning', 'almost', 'closed'],
};

export const RUNG_WORD: Record<Rung, { en: string; he: string }> = {
  ...STATUS_WORD,
  keys12: { en: 'All 12 keys', he: 'בכל 12 הסולמות' },
  language: { en: 'In my language', he: 'בשפה שלי' },
  fingers: { en: 'In the fingers', he: 'באצבעות' },
};
/** The short label under a rung (the item page's full ladder). */
export const RUNG_SHORT: Record<Rung, { en: string; he: string }> = {
  new: { en: 'New', he: 'חדש' },
  learning: { en: 'Learning', he: 'למידה' },
  almost: { en: 'Almost', he: 'כמעט' },
  closed: { en: 'Closed', he: 'סגור' },
  keys12: { en: '12 keys', he: 'כל 12' },
  language: { en: 'Language', he: 'בשפה' },
  fingers: { en: 'Fingers', he: 'באצבעות' },
};

export interface Ladder {
  kind: LadderKind;
  /** The rungs this kind of item has, in order. */
  rungs: Rung[];
  /** The rungs reached (the base up to its status, plus every upper rung earned). */
  lit: Rung[];
  /** The highest lit rung: the word shown. */
  top: Rung;
  /** "All keys" on a level with fewer than 12 keys (the rung's word then says so). */
  keys?: number;
}

/** A ladder from its base status and the upper rungs earned (those the kind has). */
export function ladderOf(kind: LadderKind, base: ItemStatus, up: { keys12?: boolean; language?: boolean; fingers?: boolean } = {}, keys?: number): Ladder {
  const rungs = RUNGS[kind];
  const lit: Rung[] = STATUS_ORDER.slice(0, STATUS_ORDER.indexOf(base) + 1);
  for (const r of ['keys12', 'language', 'fingers'] as const) if (up[r] && rungs.includes(r) && (base === 'closed' || r === 'language')) lit.push(r);
  return { kind, rungs, lit, top: lit[lit.length - 1], ...(keys !== undefined ? { keys } : {}) };
}

/** The word of a ladder's top rung ("All keys" on a level with fewer than 12). */
export function ladderWord(l: Ladder, lang: 'en' | 'he'): string {
  if (l.top === 'keys12' && l.keys !== undefined && l.keys < 12) return lang === 'he' ? 'בכל הסולמות' : 'All keys';
  return RUNG_WORD[l.top][lang];
}
export function rungLabel(l: Ladder, r: Rung, lang: 'en' | 'he'): string {
  if (r === 'keys12' && l.keys !== undefined && l.keys < 12) return lang === 'he' ? 'בכולם' : 'All keys';
  return RUNG_SHORT[r][lang];
}
/** The next rung to climb (null at the top). */
export function nextRung(l: Ladder): Rung | null {
  return l.rungs.find((r) => !l.lit.includes(r)) ?? null;
}

/** Passed from memory: a clean take with nothing shown (channelPlan.memoryPassed, kept here without the import cycle). */
const memoryPassed = (st: ItemState | undefined): boolean => (st?.channels?.unaided?.clean ?? 0) > 0;

interface KeyRow {
  status: ItemStatus;
  memory: boolean;
}
/** A unit over keys (a level, a lick): the base is its best key; keys12 = every key closed; fingers = memory in every key. */
export function keyedLadder(kind: 'technique' | 'lick', rows: KeyRow[], language = false): Ladder {
  if (!rows.length) return ladderOf(kind, 'new');
  const best = rows.reduce((m, r) => (STATUS_ORDER.indexOf(r.status) > STATUS_ORDER.indexOf(m) ? r.status : m), 'new' as ItemStatus);
  const allClosed = rows.every((r) => r.status === 'closed');
  return ladderOf(kind, best, { keys12: allClosed, language, fingers: allClosed && rows.every((r) => r.memory) }, kind === 'technique' ? rows.length : undefined);
}

/** A technique level's ladder: per key, its items' status (the weakest) and a memory pass on all of them. */
export function levelLadder(level: LevelDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): Ladder {
  const by = new Map<number, { sts: ItemStatus[]; mem: boolean }>();
  for (const d of levelDrills(level, order)) {
    const k = ((d.spec.key % 12) + 12) % 12;
    const st = items[d.itemId];
    const cur = by.get(k) ?? { sts: [], mem: true };
    cur.sts.push(itemStatus(st, d.startBpm, targetBpmOf(level, d)));
    cur.mem = cur.mem && memoryPassed(st);
    by.set(k, cur);
  }
  return keyedLadder('technique', [...by.values()].map((v) => ({ status: unitStatus(v.sts), memory: v.mem })));
}

/** A lick's ladder over its 12 keys on this instrument; "in my language" from the usage log (vocab.inMyLanguage). */
export function lickLadder(l: Lick, inst: LickInstrument, items: Record<string, ItemState>, inMyLanguage = false): Ladder {
  const t = lickTempos(l);
  return keyedLadder(
    'lick',
    LICK_KEYS.map((k) => {
      const st = items[lickItemId(l, inst, k)];
      return { status: itemStatus(st, t[0], t[3]), memory: memoryPassed(st) };
    }),
    inMyLanguage,
  );
}

/** A piece's ladder: its status (repLibrary.pieceStatus) and "in the fingers" once every memorising step is done. */
export function pieceLadder(status: ItemStatus, memorised: boolean): Ladder {
  return ladderOf('piece', status, { fingers: memorised });
}

/**
 * An improvisation level from its best score (Settings.improvBest, 0..1): learning once played, almost at 80 %, closed
 * at 90 %. (Only the best is kept per level, so "closed" here cannot read D1's two days.)
 */
export function improvLadder(best: number | undefined): Ladder {
  const base: ItemStatus = best === undefined ? 'new' : best >= 0.9 ? 'closed' : best >= 0.8 ? 'almost' : 'learning';
  return ladderOf('improv', base);
}

/**
 * A path step that is not a technique level (§4.2): from its stars on the path's scale (0–5) and whether it is opened —
 * not opened = new, opened = learning, 3–4 = almost, 5 = closed.
 */
export function stepLadder(opened: boolean, mstars: number): Ladder {
  const base: ItemStatus = !opened ? 'new' : mstars >= 5 ? 'closed' : mstars >= 3 ? 'almost' : 'learning';
  return ladderOf('step', base);
}
