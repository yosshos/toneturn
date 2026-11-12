// Rudiment Rush (DRUMS_NICHE_PLAN §3, P2): a rudiment is shown (name, sticking, notation); play two clean bars; every
// passed round raises the tempo. Five rounds a run, tiers pp → ff (gameTiers.ts).
//
// Sticking. One pad cannot tell the right hand from the left, so the sticking is graded only in a TWO-ZONE mode: each
// hand plays its own surface, and the surface the kit reports names the hand. What can be measured, per setup:
//   * MIDI (e-kit or pad controller): R on the hi-hat and L on the snare ('hat-snare'), R on the floor tom and L on the
//     snare ('tom-snare'), or R on the snare head and L on the rim ('head-rim' — only kits that send the rim / cross-
//     stick as its own note, GM 37; most do, some send a rimshot on the head's note and cannot);
//   * an acoustic kit by microphone: 'hat-snare' only — the microphone tells a cymbal from a drum (drumAcoustic.ts),
//     not the head from the rim, and the toms only when calibrated;
//   * a practice pad by microphone: 'pad' — one surface; the sticking is shown and is a self-check, never graded.
// Flams and drags stay out: their grace note is the OTHER hand, so in two zones it lands on the other surface, which the
// grace-note matching (same drum, ≤ 50 ms) does not take.
// Pure. The round is a measured drum take (a Drill through DrillTake → analyzeDrumTake); scoring reads its TakeMetrics.

import type { Drill, DrillSpec, DrumVoice, NoteResult, TakeMetrics } from './drills/types';
import { finish, rnd, type DH } from './drills/drums';
import { classOf, NOTE_VOICE, type KitProfile } from './drumKit';
import { tierIndex, type DynName } from './gameTiers';

type Bi = { en: string; he: string };
const t = (en: string, he: string): Bi => ({ en, he });

export type StickZones = 'pad' | 'hat-snare' | 'tom-snare' | 'head-rim';
export const STICK_ZONES: StickZones[] = ['hat-snare', 'tom-snare', 'head-rim', 'pad'];
/** The voice each hand plays in a zone mode ('pad': both on the snare). */
export const ZONE_VOICE: Record<StickZones, { R: DrumVoice; L: DrumVoice }> = {
  pad: { R: 'snare', L: 'snare' },
  'hat-snare': { R: 'hihat', L: 'snare' },
  'tom-snare': { R: 'tom3', L: 'snare' },
  'head-rim': { R: 'snare', L: 'rim' },
};
export const ZONE_NAME: Record<StickZones, Bi> = {
  'hat-snare': t('Right hand hi-hat, left hand snare', 'יד ימין היי־האט, יד שמאל סנר'),
  'tom-snare': t('Right hand floor tom, left hand snare', 'יד ימין טום רצפה, יד שמאל סנר'),
  'head-rim': t('Right hand snare head, left hand rim', 'יד ימין עור הסנר, יד שמאל השפה'),
  pad: t('One surface: sticking is a self-check', 'משטח אחד: הסטיקינג בבדיקה עצמית'),
};

/** The zone modes a setup can measure (the kit card's choice: MIDI, an acoustic kit by mic, a practice pad by mic). */
export function zonesFor(kind: 'midi' | 'acoustic' | 'pad', acousticToms = false): StickZones[] {
  if (kind === 'pad') return ['pad'];
  if (kind === 'acoustic') return acousticToms ? ['hat-snare', 'tom-snare', 'pad'] : ['hat-snare', 'pad'];
  return STICK_ZONES;
}
/** The player's zone mode: the kit's saved choice when this setup can measure it, else the setup's first. */
export function zonesOf(kit: KitProfile | undefined | null, kind: 'midi' | 'acoustic' | 'pad'): StickZones {
  const ok = zonesFor(kind, !!kit?.acoustic?.tpl.tom);
  const saved = kit?.zones;
  return saved && ok.includes(saved) ? saved : ok[0];
}

/** A rudiment: its sticking on a grid (r / l a stroke, R / L an accented stroke, . a rest), `sub` steps a beat. */
export interface Rudiment {
  id: string;
  name: Bi;
  pattern: string;
  sub: 2 | 3 | 4;
}
const RUD: Record<string, Rudiment> = {
  singles8: { id: 'singles8', name: t('Single strokes, 8ths', 'מכות בודדות, שמיניות'), pattern: 'rl', sub: 2 },
  doubles8: { id: 'doubles8', name: t('Double strokes, 8ths', 'מכות כפולות, שמיניות'), pattern: 'rrll', sub: 2 },
  singles16: { id: 'singles16', name: t('Single strokes, 16ths', 'מכות בודדות, שש־עשריות'), pattern: 'rl', sub: 4 },
  doubles16: { id: 'doubles16', name: t('Double strokes, 16ths', 'מכות כפולות, שש־עשריות'), pattern: 'rrll', sub: 4 },
  para: { id: 'para', name: t('Single paradiddle', 'פאראדידל'), pattern: 'rlrrlrll', sub: 4 },
  paraAcc: { id: 'paraAcc', name: t('Paradiddle, accented', 'פאראדידל עם הדגשות'), pattern: 'RlrrLrll', sub: 4 },
  inverted: { id: 'inverted', name: t('Inverted paradiddle', 'פאראדידל הפוך'), pattern: 'rllrlrrl', sub: 4 },
  reverse: { id: 'reverse', name: t('Reverse paradiddle', 'פאראדידל מהסוף'), pattern: 'rrlrllrl', sub: 4 },
  doublePara: { id: 'doublePara', name: t('Double paradiddle (triplets)', 'פאראדידל כפול (טריולות)'), pattern: 'RlrlrrLrlrll', sub: 3 },
  paraDiddle: { id: 'paraDiddle', name: t('Paradiddle-diddle (triplets)', 'פאראדידל־דידל (טריולות)'), pattern: 'Rlrrll', sub: 3 },
  triple: { id: 'triple', name: t('Triple strokes (triplets)', 'מכות משולשות (טריולות)'), pattern: 'rrrlll', sub: 3 },
  five: { id: 'five', name: t('Five-stroke roll', 'גלגול של 5 מכות'), pattern: 'rrllR...llrrL...', sub: 4 },
  six: { id: 'six', name: t('Six-stroke roll', 'גלגול של 6 מכות'), pattern: 'RllrrL..', sub: 4 },
  seven: { id: 'seven', name: t('Seven-stroke roll', 'גלגול של 7 מכות'), pattern: 'llrrllR.', sub: 4 },
  nine: { id: 'nine', name: t('Nine-stroke roll', 'גלגול של 9 מכות'), pattern: 'rrllrrllR.......', sub: 4 },
  triplePara: { id: 'triplePara', name: t('Triple paradiddle', 'פאראדידל משולש'), pattern: 'RlrlrlrrLrlrlrll', sub: 4 },
};
export const RUDIMENTS: Rudiment[] = Object.values(RUD);

/** The rudiments, start tempo and tempo step of each tier. */
export const RUSH_TIERS: Record<DynName, { pool: string[]; bpm: number; step: number }> = {
  pp: { pool: ['singles8', 'doubles8'], bpm: 60, step: 6 },
  p: { pool: ['singles16', 'doubles16', 'para'], bpm: 66, step: 6 },
  mp: { pool: ['paraAcc', 'inverted', 'reverse', 'doublePara'], bpm: 70, step: 5 },
  mf: { pool: ['paraDiddle', 'triple', 'five', 'six'], bpm: 72, step: 5 },
  f: { pool: ['seven', 'nine', 'triplePara', 'doublePara'], bpm: 80, step: 5 },
  ff: { pool: ['paraAcc', 'inverted', 'doublePara', 'paraDiddle', 'six', 'seven', 'triplePara'], bpm: 90, step: 6 },
};
/** Sticking right needed to pass a round in a two-zone mode. */
export const STICK_PASS = 0.9;

/** The two bars of a rudiment as hits, each hand on its zone's surface. */
export function rudimentHits(rd: Rudiment, zones: StickZones, bars = 2): DH[] {
  const steps = bars * 4 * rd.sub;
  const step = 1 / rd.sub;
  const out: DH[] = [];
  for (let i = 0; i < steps; i++) {
    const c = rd.pattern[i % rd.pattern.length];
    if (c === '.') continue;
    const h = c.toUpperCase() as 'R' | 'L';
    // Written length: to the next stroke (a roll's accented release is longer), at most to the beat's end.
    let nx = i + 1;
    while (nx < steps && rd.pattern[nx % rd.pattern.length] === '.') nx++;
    const b = i * step;
    const end = Math.min(nx * step, Math.floor(b + 1e-9) + 1);
    out.push({ b, v: ZONE_VOICE[zones][h], h, d: Math.round((end - b) * 1e6) / 1e6, ...(c === 'R' || c === 'L' ? { acc: true } : {}) });
  }
  return out;
}

export interface RushRound {
  rudiment: Rudiment;
  zones: StickZones;
  drill: Drill;
  bpm: number;
}

/**
 * One round: the rudiment is seeded per round (no repeat of the previous round's when the pool allows), its tempo is
 * the tier's start + one step per round passed so far (`ups`).
 */
export function rushRound(tier: DynName, round: number, seed: number, ups: number, zones: StickZones): RushRound {
  const T = RUSH_TIERS[tier];
  const pick = (k: number) => {
    const r = rnd(`rush:${tier}:${k}:${seed}`);
    return T.pool[Math.floor(r() * T.pool.length)];
  };
  let id = pick(0);
  for (let k = 1; k <= round; k++) {
    const prev = id;
    id = pick(k);
    if (T.pool.length > 1 && id === prev) id = T.pool[(T.pool.indexOf(id) + 1) % T.pool.length];
  }
  const rd = RUD[id];
  const bpm = T.bpm + T.step * Math.max(0, ups);
  const pad = zones === 'pad';
  const spec: DrillSpec = { family: 'd-diddles', kind: `game:rudiment-rush:${tier}:${round}:${seed >>> 0}`, key: 0, hands: 'RL', instrument: 'drums' };
  const d = finish(spec, rudimentHits(rd, zones), {
    title: t(`Rudiment Rush · ${rd.name.en}`, `מרוץ רודימנטים · ${rd.name.he}`),
    bpm,
    bars: 2,
    mic: pad,
    show: 'staff',
    ...(rd.pattern.match(/[RL]/) ? { goal: { accentPos: 0.85 } } : {}),
  });
  const ti = tierIndex(tier);
  const drill: Drill = { ...d, drum: { tier: ti <= 1 ? 1 : ti <= 3 ? 2 : 3, mic: pad, sticking: true, ...(zones === 'hat-snare' ? { acousticOk: true } : {}) } };
  return { rudiment: rd, zones, drill, bpm };
}

/** The hand a played note's surface names in a zone mode (null: not one of the two surfaces). */
export function zoneHand(zones: StickZones, pitch: number): 'R' | 'L' | null {
  const v = NOTE_VOICE[pitch];
  if (!v || zones === 'pad') return null;
  if (zones === 'head-rim') return v === 'snare' ? 'R' : v === 'rim' ? 'L' : null;
  const c = classOf(v);
  if (c === 'snare') return 'L';
  // Hat zone: an acoustic microphone hears hat, ride and crash as one cymbal.
  if (zones === 'hat-snare') return c === 'hat' || c === 'ride' || c === 'crash' ? 'R' : null;
  return c === 'tom' ? 'R' : null;
}

/** Sticking measured in a two-zone mode: notes played on the right hand's surface / notes played (null on one pad). */
export function stickingOf(zones: StickZones, perNote: NoteResult[]): { right: number; of: number; share: number } | null {
  if (zones === 'pad') return null;
  const played = perNote.filter((p) => p.played);
  const right = played.filter((p) => zoneHand(zones, p.played!.pitch) === p.exp.hand).length;
  return { right, of: played.length, share: played.length ? right / played.length : 0 };
}

export interface RushScore {
  ok: boolean;
  points: number;
  line: Bi;
  sticking: { right: number; of: number; share: number } | null;
}

/** A round passes when the take is not "not yet" and, in two zones, ≥ 90 % of the strokes were on the right hand's surface. Points rise with the tempo. */
export function scoreRush(r: RushRound, m: TakeMetrics, tier: DynName): RushScore {
  const st = stickingOf(r.zones, m.perNote);
  const stickOk = !st || (st.of > 0 && st.share >= STICK_PASS);
  const ok = m.verdict !== 'not' && stickOk;
  const base = m.verdict === 'clean' ? 100 : m.verdict === 'almost' ? 70 : 0;
  const points = ok ? Math.round(base * (r.bpm / RUSH_TIERS[tier].bpm)) : 0;
  const stLine = st ? t(`sticking ${st.right}/${st.of}`, `סטיקינג ${st.right}/${st.of}`) : t('sticking: self-check', 'סטיקינג: בדיקה עצמית');
  const line = !stickOk && st
    ? t(`Sticking ${st.right}/${st.of}: each hand on its own surface (${Math.round(STICK_PASS * 100)} %).`, `סטיקינג ${st.right}/${st.of}: כל יד על המשטח שלה (${Math.round(STICK_PASS * 100)}%).`)
    : ok
      ? t(`♩${r.bpm} · ${stLine.en}. Faster next round.`, `♩${r.bpm} · ${stLine.he}. הסבב הבא מהיר יותר.`)
      : m.why;
  return { ok, points, line, sticking: st };
}
