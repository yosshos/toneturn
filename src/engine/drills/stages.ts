// The key session, round 2 (owner 2026-11-25, docs/SPEC-KEY-SESSION-2.md §2–§5): one exercise (a rung) is a ladder of
// stages, each adding one difficulty — another hand, both hands, more octaves, contrary motion, then speed. This module
// builds the stages of a key's session (the scale A-1…A-8, the harmonised scale B-1…B-6, guitar and bass positions),
// lays the session out in visits (the scale → the next harmonised rung → one rotating block → the other rungs → the
// closing return to the scale's speed stage), and holds the tempo rules in notes per second (comfort, subdivision, the
// tier benchmarks). The coach walks it (keyCoach.ts). Pure.

import type { Drill, DrillSpec, ItemState } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { keyName } from './generate';
import { notesPerBeat } from './analyze';
import { hasQuarters } from './rubato';
import { levelKeys, specDrills, targetBpmOf } from './plan';
import { newItem } from './ladder';
import { keyLadderPicks, type KeyLadderOpts, type LadderRung } from './keyIndex';
import type { FacetGroup } from './keyFacet';
import type { PhraseId, T2 } from './coachPhrases';

export type StageKind = 'coord' | 'speed';
export type RungWhat = 'scale' | 'thirds' | 'triads' | 'sevenths' | 'other';

/** One stage of a rung in the key session (on the stage's LevelDef). */
export interface StageInfo {
  /** The rung the stage belongs to ('scale', 'k-sharm-3', …): the strip shows the rung's stages together. */
  rung: string;
  /** The rung's name for its end line ("C major scale"). */
  title: T2;
  /** What the rung is, for "Next: thirds." */
  what: RungWhat;
  /** The session's visit the stage is played in (0 the scale, 1 the harmonised rung, …). */
  visit: number;
  /** 'A-3', 'B-6', 'G-2'; 'run' = a rung without stages (one climb to its target). */
  code: string;
  /** Coordination / range (played at the comfort tempo, 2 clean or 1 easy) or speed (the climb to the target). */
  kind: StageKind;
  /** The strip's chip (short). */
  name: T2;
  /** The stage in a sentence, lower case ("both hands, two octaves"): the end-of-rung line and "we pick up …". */
  long: T2;
  /** The stage opens only after this stage of the rung has passed (A-7 after A-6). */
  after?: string;
  /** A stage that only adds range (owner 2026-11-25): it starts at k × the tempo reached on this stage, in the same note value. */
  from?: { code: string; k: number };
  /** The brief's line (taskBrief): what this stage asks for. */
  brief: T2;
  /** The coach's phrases when the stage begins ("Both hands." "One octave."). */
  say: PhraseId[];
  /** The player's tier (the benchmarks). */
  tier: number;
  /** Speed: the target in notes per second (absent: the level's own target tempo). */
  target?: number;
  /** The rung's placement probe (§4.2): played first by a fresh player at `nps`; clean and easy marks `easy` passed,
   *  clean marks `clean` passed. */
  probe?: { nps: number; easy: string[]; clean: string[] };
  /** The visit's share of the session's minutes (its budget). */
  share: number;
  /** The closing visit (§5.4): the scale's speed stage again, ending on a climb. */
  closing?: boolean;
  /** Played in quarters below 2 notes a second (the nps subdivision rule); false = the item's own note values. */
  sub: boolean;
}

// ───────────────────────────── tempo in notes per second (§3) ─────────────────────────────

/** The tier benchmarks (ABRSM scale speeds, tierBounds.ts): a comfort tempo never starts above its tier's. */
export const BENCH_NPS = [1.8, 2.0, 2.5, 3.3, 4.0, 4.8, 5.3, 5.9, 7.0];
/** The speed stage's target: the next grade's exam speed (EXAM_NPS.scales one grade up; T7+ the diploma speeds). */
export const SPEED_NPS = [2.2, 2.67, 3.47, 4.2, 5.07, 5.33, 5.87, 6.5, 7.5];
/** A fresh player's pulse: quarters at ♩60. */
export const FRESH_NPS = 1.0;
/** The placement probe's pulse (§4.2) — a player who reported more experience is probed a little faster. */
export const PROBE_NPS = 1.5;
/** The comfort tempo is the last clean one × this. */
export const COMFORT = 0.9;
/** No take is more than this much faster (notes per second) than the one before (§3.3). */
export const MAX_JUMP = 1.1;

const clampTier = (t: number) => Math.max(0, Math.min(8, Math.round(t)));
export const benchNps = (tier: number) => BENCH_NPS[clampTier(tier)];
export const speedNps = (tier: number) => SPEED_NPS[clampTier(tier)];
export const probeNps = (tier: number) => Math.max(PROBE_NPS, Math.round(0.6 * benchNps(tier) * 100) / 100);
const r2 = (x: number) => Math.round(x * 100) / 100;

/** The exercise kind ('scales:scale', 'k-sharm:hl-3b'): the probe runs once per kind, free time once per rung. */
export const kindOf = (d: Pick<Drill, 'spec'>): string => `${d.spec.family}:${d.spec.kind}`;
/**
 * The comfort tempo's kind (U6, owner 2026-11-25): the exercise kind, the hands and broken / together (the kind says
 * that: 3b broken, 3t double notes, tb blocks) — octaves and motion don't change it.
 */
export const comfortKey = (d: Pick<Drill, 'spec'>): string => `${d.spec.family}:${d.spec.kind}:${d.spec.hands}`;
const ofKind = (items: Record<string, ItemState>, kind: string) => Object.values(items).filter((x) => x.itemId.startsWith(`${kind}:`));
const ofComfort = (items: Record<string, ItemState>, key: string) =>
  Object.values(items).filter((x) => {
    const p = x.itemId.split(':');
    return `${p[0]}:${p[1]}:${p[3]}` === key;
  });
/** Played at all in any key (the probe runs once per kind). */
export const kindPlayed = (items: Record<string, ItemState>, kind: string): boolean => ofKind(items, kind).some((x) => x.takes > 0 || !!x.stages?.length);
/** Played clean at a pulse in any key. */
export const kindClean = (items: Record<string, ItemState>, kind: string): boolean => ofKind(items, kind).some((x) => x.cleanBpm > 0);

/**
 * The last clean speed on this kind of exercise (notes per second), in any key: the most recent item's last clean tempo
 * (its history), at the item's own notes per beat (`pb4` in the id = 16ths), else `npb`. 0 = never clean.
 */
export function lastCleanNps(items: Record<string, ItemState>, key: string, npb: number): number {
  const xs = ofComfort(items, key).filter((x) => x.cleanBpm > 0).sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''));
  const x = xs[0];
  if (!x) return 0;
  const pb = /:pb(\d)/.exec(x.itemId);
  const per = pb ? Number(pb[1]) : npb;
  const bpm = x.history?.length ? x.history[x.history.length - 1].bpm : x.cleanBpm;
  return (bpm * per) / 60;
}

/**
 * §3.2: the comfort tempo — the last clean speed on its comfort kind × 0.9, never above the item's target; fresh: `fresh`
 * (1.0 nps, or the scale's comfort this session for a harmonised rung), never above the tier benchmark. Owner 2026-11-26:
 * a player's own clean tempo is never held under the tier benchmark (it kept every session at ♪54 for three days).
 */
export function comfortNps(items: Record<string, ItemState>, key: string, npb: number, tier: number, target = Infinity, fresh = FRESH_NPS): number {
  const last = lastCleanNps(items, key, npb);
  return r2(last > 0 ? Math.min(target, Math.max(0.6, last * COMFORT)) : Math.min(fresh, benchNps(tier), target));
}

/**
 * Owner 2026-11-26: a stage passed in another key (any item of its comfort kind carries its code). A new key of a rung
 * known elsewhere opens with a check at the comfort tempo instead of every stage from the first one again.
 */
export function passedElsewhere(l: LevelDef, items: Record<string, ItemState>): boolean {
  const s = l.stage;
  if (!s) return false;
  const key = comfortKey(stageDrill(l, 0));
  return ofComfort(items, key).some((x) => !!x.stages?.includes(s.code));
}

/** The best clean speed on this comfort kind in any key (notes per second; 0 = never clean). */
export function bestCleanNps(items: Record<string, ItemState>, key: string, npb: number): number {
  let best = 0;
  for (const x of ofComfort(items, key)) {
    if (!(x.cleanBpm > 0)) continue;
    const pb = /:pb(\d)/.exec(x.itemId);
    best = Math.max(best, (x.cleanBpm * (pb ? Number(pb[1]) : npb)) / 60);
  }
  return best;
}

/** Owner 2026-11-26: the speed stage's target moves with the player — never under 10 % above their best clean speed on
 *  this kind in any key (the tier's target was reached on day one and the climb stopped there), up to the top tier's. */
export function stretchTarget(level: LevelDef, drill: Drill, items: Record<string, ItemState>): number {
  const own = targetNps(level, drill);
  const best = bestCleanNps(items, comfortKey(drill), notesPerBeat(drill));
  return r2(Math.max(own, Math.min(SPEED_NPS[SPEED_NPS.length - 1], best * MAX_JUMP)));
}

/** One metronome mark up from a pulse (notes per second at note value `per`), never more than 10 % (owner 2026-11-26: the
 *  challenge rises a little after every clean take, in every stage). */
export function markUp(nps: number, per: number): number {
  const bpm = (nps * 60) / per;
  const next = MAELZEL.find((m) => m > bpm + 0.5) ?? bpm * 1.03;
  return r2(Math.min((next * per) / 60, nps * (1 + stepCap(nps))));
}

/**
 * §3.3/§3.5: how a pulse in notes per second is played — the note value and its ♩. Quarters below 2 notes a second
 * (eighths at ♩60 from there), the item's own value once its ♩ reaches 60; ties go to the item's own value. Without
 * `sub` the item's own note value always; `noQuarters` (U7: a rung that reached eighths stays in them) never quarters.
 */
export function playOf(drill: Drill, nps: number, sub = true, noQuarters = false): { per: number; bpm: number } {
  const own = Math.max(0.25, notesPerBeat(drill));
  const cands = sub && hasQuarters(drill) ? [own, ...[4, 2, 1].filter((p) => p < own - 0.01 && Math.abs(own / p - Math.round(own / p)) < 0.01 && !(noQuarters && p === 1))] : [own];
  const dist = (p: number) => {
    const b = (nps * 60) / p;
    return b < 59.5 ? 59.5 - b : b > 120.5 ? b - 120.5 : 0;
  };
  const per = cands.reduce((best, p) => (dist(p) < dist(best) - 1e-9 ? p : best), cands[0]);
  return { per, bpm: Math.max(20, Math.round((nps * 60) / per)) };
}

/** The traditional metronome (Maelzel) marks: the speed stage's tempi sit on them. */
export const MAELZEL = [40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160, 168, 176, 184, 192, 200, 208];

/** A ♩ on the metronome marks (U11): the mark at or below it (below ♩40: itself, rounded). */
export function snapDown(bpm: number): number {
  let g = 0;
  for (const m of MAELZEL) if (m <= bpm + 1e-6) g = m;
  return g || Math.max(20, Math.round(bpm));
}
/** The nearest metronome mark (a tempo converted to another note value, for display). */
export function snapNear(bpm: number): number {
  if (bpm < MAELZEL[0] - 1) return Math.max(20, Math.round(bpm));
  return MAELZEL.reduce((b, m) => (Math.abs(m - bpm) < Math.abs(b - bpm) ? m : b), MAELZEL[0]);
}

/**
 * The largest tempo step at this speed (owner 2026-11-27: "clean at 60 - up 20 %; clean at 100 - not straight 20 %"):
 * 20 % up to 2 notes a second, falling smoothly with the speed - about 12 % at 3, 7 % at 5, 4 % at 8 nps (never under 3.5 %).
 * A perfect take earns all of it; how clean the take was (stepQuality) scales it (keyCoach gradedUp).
 */
export function stepCap(nps: number): number {
  return Math.max(0.035, Math.min(0.2, 0.2 * Math.pow(2 / Math.max(nps, 0.1), 1.16)));
}

/** The same notes at another note value (eighths → quarters, 16ths → eighths, eighths → triplet eighths): every onset moved. */
export function subDrill(drill: Drill, per: number): Drill {
  // notesPerBeat reads onsets rounded to 1e-4: triplets came out 3.0003 a beat, and every onset of a key-session take moved
  // by 0.01 % more per beat (28.0028 for beat 28), off the click grid and off the score's beat lines (owner 2026-11-28)
  const raw = notesPerBeat(drill);
  const own = Math.abs(raw - Math.round(raw)) < 0.01 ? Math.round(raw) : raw;
  if (Math.abs(per - own) < 0.01) return drill;
  const k = own / per;
  const beats = Math.ceil(drill.beats * k);
  // S12: a long form stretched into quarters is paged (every bar reachable, one phone screen, no scrolling box)
  return { ...drill, notes: drill.notes.map((n) => ({ ...n, beat: n.beat * k, dur: n.dur * k })), beats, spec: { ...drill.spec, perBeat: per }, ...(beats > (drill.meter || 4) * 8 ? { paged: true } : {}) };
}

/** A speed stage's target (notes per second): the stage's own, else the level's target tempo. */
export function targetNps(level: LevelDef, drill: Drill): number {
  const t = level.stage?.target;
  const own = (targetBpmOf(level, drill) * notesPerBeat(drill)) / 60;
  return r2(t ? t : own);
}

// ───────────────────────────── passed stages, per key (§4.3) ─────────────────────────────

const stageDrills = (l: LevelDef): Drill[] => l.specs.flatMap((_, k) => specDrills(l, k, 'fifths-up'));
/** The stage's drill for spec k (the stage's one key). */
export const stageDrill = (l: LevelDef, k: number): Drill => {
  const ds = specDrills(l, k, 'fifths-up');
  const key = levelKeys(l, 'fifths-up')[0];
  return ds.find((d) => d.spec.key === key) ?? ds[0];
};
/** A stage is passed in this key when every one of its items carries its code. 'run' never counts as passed. */
export function stagePassed(l: LevelDef, items: Record<string, ItemState>): boolean {
  const s = l.stage;
  if (!s || s.code === 'run' || s.closing) return false;
  return stageDrills(l).every((d) => !!items[d.itemId]?.stages?.includes(s.code));
}
/** The item with the stage's code added (saved like any item: it travels with the item, so it is per key). */
export function withStage(st: ItemState, code: string): ItemState {
  return st.stages?.includes(code) ? st : { ...st, stages: [...(st.stages ?? []), code] };
}
/** Every item of a stage marked passed (from the probe, or the stage just passed). */
export function markStage(l: LevelDef, items: Record<string, ItemState>): ItemState[] {
  const s = l.stage;
  if (!s) return [];
  return stageDrills(l).map((d) => withStage(items[d.itemId] ?? newItem(d), s.code));
}

// ───────────────────────────── the stages of a rung (§2) ─────────────────────────────

const T = (en: string, he: string): T2 => ({ en, he });
type StageDef = { code: string; specs: SpecTemplate[]; kind: StageKind; name: T2; long: T2; brief: T2; say: PhraseId[]; target?: number; probe?: StageInfo['probe']; after?: string; from?: StageInfo['from'] };
type Rung = { rung: string; title: T2; what: RungWhat; stages: StageDef[]; sub: boolean };

/** The piano scale (block A): right, left, both, two octaves, contrary, speed; 3–4 octaves once the speed stage passed, 16ths at T5+. */
function pianoScale(root: number, minor: boolean, tier: number): Rung {
  const base: Partial<SpecTemplate> = minor ? { minor: true, scale: 'harmonic' } : {};
  const sc = (o: Partial<SpecTemplate>): SpecTemplate => ({ family: 'scales', kind: 'scale', hands: 'R', ...base, ...o });
  const tonic = keyName(root, false);
  const name = keyName(root, minor);
  const title = minor ? T(`${name} harmonic minor scale`, `סולם ${name} מינור הרמוני`) : T(`${name} major scale`, `סולם ${name} מז׳ור`);
  const st: StageDef[] = [
    { code: 'A-1', specs: [sc({ hands: 'R', octaves: 1 })], kind: 'coord', name: T('Right', 'ימין'), long: T('right hand', 'יד ימין'), brief: T('Right hand, one octave.', 'יד ימין, אוקטבה אחת.'), say: ['right', 'oct1'] },
    { code: 'A-2', specs: [sc({ hands: 'L', octaves: 1 })], kind: 'coord', name: T('Left', 'שמאל'), long: T('left hand', 'יד שמאל'), brief: T('Left hand, one octave.', 'יד שמאל, אוקטבה אחת.'), say: ['left', 'oct1'] },
    { code: 'A-3', specs: [sc({ hands: 'RL', octaves: 1 })], kind: 'coord', name: T('Both', 'יחד'), long: T('both hands', 'שתי ידיים'), brief: T('Both hands, one octave apart.', 'שתי ידיים, אוקטבה זו מזו.'), say: ['both', 'oct1'], probe: { nps: probeNps(tier), easy: ['A-1', 'A-2', 'A-3'], clean: ['A-1', 'A-2'] } },
    { code: 'A-4', specs: [sc({ hands: 'RL', octaves: 2 })], kind: 'coord', name: T('2 oct', '2 אוק׳'), long: T('two octaves', 'שתי אוקטבות'), brief: T('Both hands, two octaves.', 'שתי ידיים, שתי אוקטבות.'), say: ['both', 'oct2'] },
    { code: 'A-5', specs: [sc({ hands: 'RL', octaves: 1, motion: 'contrary' }), sc({ hands: 'RL', octaves: 2, motion: 'contrary' })], kind: 'coord', name: T('Contrary', 'נגדית'), long: T('contrary motion', 'תנועה נגדית'), brief: T(`Contrary: both thumbs on ${tonic}, move apart and back. One octave, then two.`, `תנועה נגדית: שני האגודלים על ${tonic}, מתרחקים וחוזרים. אוקטבה, ואז שתיים.`), say: ['contrary'] },
    { code: 'A-6', specs: [sc({ hands: 'RL', octaves: 2 })], kind: 'speed', name: T('Speed', 'מהירות'), long: T('the speed', 'המהירות'), brief: T('The speed: both hands, two octaves. The tempo climbs.', 'המהירות: שתי ידיים, שתי אוקטבות. הטמפו עולה.'), say: ['speed'], target: speedNps(tier) },
    // A-7 opens once A-6 has passed its target (U1)
    { code: 'A-7', specs: [sc({ hands: 'RL', octaves: 3 }), sc({ hands: 'RL', octaves: 4 })], kind: 'coord', name: T('3–4 oct', '3–4 אוק׳'), long: T('three and four octaves', 'שלוש וארבע אוקטבות'), brief: T('Both hands, three octaves, then four.', 'שתי ידיים, שלוש אוקטבות ואז ארבע.'), say: ['both', 'oct3'], after: 'A-6', from: { code: 'A-6', k: 0.75 } },
  ];
  if (tier >= 5) st.push({ code: 'A-8', specs: [sc({ hands: 'RL', octaves: 4, perBeat: 4 })], kind: 'speed', name: T('16ths', 'שש־עשריות'), long: T('four octaves in sixteenths', 'ארבע אוקטבות בשש־עשריות'), brief: T('Four octaves in sixteenths. The tempo climbs.', 'ארבע אוקטבות בשש־עשריות. הטמפו עולה.'), say: ['sixteenths', 'oct4'], target: speedNps(tier), after: 'A-7' });
  return { rung: 'scale', title, what: 'scale', stages: st, sub: true };
}

const HARM: Record<string, { what: RungWhat; together: string; name: T2; tog: T2; togLong: T2 }> = {
  'hl-3b': { what: 'thirds', together: 'hl-3t', name: T('3rds', 'טרצות'), togLong: T('double thirds', 'טרצות כפולות'), tog: T('Thirds together as double notes, one octave: right hand, then left.', 'טרצות יחד כצלילים כפולים, אוקטבה אחת: יד ימין, ואז שמאל.') },
  'hl-ta': { what: 'triads', together: 'hl-tb', name: T('Triads', 'משולשים'), togLong: T('block triads', 'משולשים בבלוק'), tog: T('Triads as chords, one octave: right hand, then left.', 'משולשים כאקורדים, אוקטבה אחת: יד ימין, ואז שמאל.') },
  'hl-7a': { what: 'sevenths', together: 'hl-7b', name: T('7th chords', 'ספטאקורדים'), togLong: T('block seventh chords', 'ספטאקורדים בבלוק'), tog: T('Seventh chords as blocks, one octave: right hand, then left.', 'ספטאקורדים בבלוק, אוקטבה אחת: יד ימין, ואז שמאל.') },
};

/** The harmonised scale (block B), piano: each hand broken over one octave, then two; together (double notes / blocks); speed. */
function pianoHarm(lvl: LevelDef, tier: number): Rung | null {
  const b = lvl.specs[0] as SpecTemplate;
  const h = b && HARM[b.kind];
  if (!h || lvl.specs.length !== 1) return null;
  const s = (o: Partial<SpecTemplate>): SpecTemplate => ({ ...b, ...o });
  const lvTarget = lvl.tempo ? lvl.tempo[1] : 0;
  const nm = h.name;
  return {
    rung: lvl.id.replace(/^key-\d+-/, ''),
    title: lvl.title,
    what: h.what,
    sub: true,
    stages: [
      { code: 'B-1', specs: [s({ hands: 'R', octaves: 1 })], kind: 'coord', name: T('Right', 'ימין'), long: T('right hand, one octave', 'יד ימין, אוקטבה אחת'), brief: T(`${nm.en}, broken: right hand, one octave.`, `${nm.he}, שבורות: יד ימין, אוקטבה אחת.`), say: ['right', 'oct1'] },
      { code: 'B-2', specs: [s({ hands: 'L', octaves: 1 })], kind: 'coord', name: T('Left', 'שמאל'), long: T('left hand, one octave', 'יד שמאל, אוקטבה אחת'), brief: T(`${nm.en}, broken: left hand, one octave.`, `${nm.he}, שבורות: יד שמאל, אוקטבה אחת.`), say: ['left', 'oct1'] },
      { code: 'B-3', specs: [s({ hands: 'R' })], kind: 'coord', name: T('2 oct', '2 אוק׳'), long: T('right hand, two octaves', 'יד ימין, שתי אוקטבות'), brief: T(`${nm.en}: right hand, two octaves.`, `${nm.he}: יד ימין, שתי אוקטבות.`), say: ['right', 'oct2'], probe: { nps: probeNps(tier), easy: ['B-1', 'B-2', 'B-3'], clean: ['B-1', 'B-2'] } , from: { code: 'B-1', k: 0.9 } },
      { code: 'B-4', specs: [s({ hands: 'L' })], kind: 'coord', name: T('Left 2', 'שמאל 2'), long: T('left hand, two octaves', 'יד שמאל, שתי אוקטבות'), brief: T(`${nm.en}: left hand, two octaves.`, `${nm.he}: יד שמאל, שתי אוקטבות.`), say: ['left', 'oct2'] , from: { code: 'B-2', k: 0.9 } },
      { code: 'B-5', specs: [s({ kind: h.together, hands: 'R', octaves: 1 }), s({ kind: h.together, hands: 'L', octaves: 1 })], kind: 'coord', name: h.what === 'thirds' ? T('Double 3rds', 'טרצות כפולות') : T('Blocks', 'בלוקים'), long: h.togLong, brief: h.tog, say: [h.what === 'thirds' ? 'doubleThirds' : 'blockChords'] },
      { code: 'B-6', specs: [s({ hands: 'R' }), s({ hands: 'L' })], kind: 'speed', name: T('Speed', 'מהירות'), long: T('the speed', 'המהירות'), brief: T('The speed: two octaves, each hand. The tempo climbs.', 'המהירות: שתי אוקטבות, כל יד. הטמפו עולה.'), say: ['speed'], target: lvTarget ? Math.min(speedNps(tier), (lvTarget * 2) / 60) : speedNps(tier) },
    ],
  };
}

/** Guitar / bass (§2.3): positions in place of hands — one position, two joined, 3 per string, the whole neck, speed. */
function frettedScale(inst: 'guitar' | 'bass', fams: FamilyDef[], root: number, minor: boolean, tier: number): Rung | null {
  const spec = (fam: string, id: string, pick?: (sp: SpecTemplate) => boolean): SpecTemplate | null => {
    const l = fams.find((f) => f.id === fam)?.levels.find((x) => x.id === id);
    const sp = l ? (pick ? l.specs.find(pick) : l.specs[0]) : undefined;
    return sp ?? null;
  };
  const opt = (o: number) => (sp: SpecTemplate) => ((sp as { option?: number }).option ?? 0) === o;
  const name = keyName(root, minor);
  const title = minor ? T(`${name} harmonic minor scale`, `סולם ${name} מינור הרמוני`) : T(`${name} major scale`, `סולם ${name} מז׳ור`);
  const parts: [string, SpecTemplate | null, T2, T2, PhraseId[]][] =
    inst === 'guitar'
      ? minor
        ? [
            ['G-1', spec('g-scales', 'g-scales-13', opt(7)), T('Box', 'מצב'), T('One position: the box.', 'מצב אחד: התיבה.'), ['position']],
            ['G-2', spec('g-scales', 'g-scales-17'), T('Positions', 'מצבים'), T('The scale in all five positions.', 'הסולם בכל חמשת המצבים.'), ['positions']],
          ]
        : [
            ['G-1', spec('g-scales', 'g-scales-4'), T('Box', 'מצב'), T('One position: the box.', 'מצב אחד: התיבה.'), ['position']],
            ['G-2', spec('g-scales', 'g-scales-8'), T('Joined', 'מחוברים'), T('Positions joined: one scale across the shapes.', 'מצבים מחוברים: סולם אחד לאורך הצורות.'), ['positions']],
            ['G-3', spec('g-scales', 'g-scales-6'), T('3 per string', '3 במיתר'), T('Three notes per string.', 'שלושה צלילים במיתר.'), ['nps3']],
            ['G-4', spec('g-scales', 'g-scales-9'), T('Neck', 'צוואר'), T('Three notes per string across the whole neck.', 'שלושה צלילים במיתר לאורך כל הצוואר.'), ['neck']],
          ]
      : minor
        ? [
            ['G-1', spec('b-scale', 'b-scale-7', opt(6)), T('Position', 'מצב'), T('One position.', 'מצב אחד.'), ['position']],
            ['G-2', spec('b-scale', 'b-scale-12', opt(1)), T('2 oct', '2 אוק׳'), T('Two octaves, shifting position.', 'שתי אוקטבות, עם החלפת מצב.'), ['oct2']],
          ]
        : [
            ['G-1', spec('b-scale', 'b-scale-2'), T('Position', 'מצב'), T('One position.', 'מצב אחד.'), ['position']],
            ['G-2', spec('b-fret', 'b-fret-5'), T('2 oct', '2 אוק׳'), T('Two octaves, shifting position.', 'שתי אוקטבות, עם החלפת מצב.'), ['oct2']],
          ];
  const ok = parts.filter((p): p is [string, SpecTemplate, T2, T2, PhraseId[]] => !!p[1]);
  if (!ok.length) return null;
  // S12: the sentence names are the short stage names (no nested colons); the probe on the second position (§4.2)
  const LONG: Record<string, T2> = { position: T('one position', 'מצב אחד'), positions: T('positions joined', 'מצבים מחוברים'), nps3: T('three notes per string', 'שלושה צלילים במיתר'), neck: T('the whole neck', 'כל הצוואר'), oct2: T('two octaves', 'שתי אוקטבות') };
  const st: StageDef[] = ok.map(([code, sp, nm, brief, say], i) => ({ code, specs: [sp], kind: 'coord', name: nm, long: LONG[say[0]] ?? { en: nm.en.toLowerCase(), he: nm.he }, brief, say, ...(i === 1 ? { probe: { nps: probeNps(tier), easy: [ok[0][0], code], clean: [ok[0][0]] } } : {}) }));
  st.push({ code: 'G-S', specs: [ok[0][1]], kind: 'speed', name: T('Speed', 'מהירות'), long: T('the speed', 'המהירות'), brief: T('The speed: one position. The tempo climbs.', 'המהירות: מצב אחד. הטמפו עולה.'), say: ['speed'], target: speedNps(tier) });
  return { rung: 'scale', title, what: 'scale', stages: st, sub: true };
}

/** Guitar / bass harmonised rungs: broken in position over one octave (guitar 3rds and arpeggios), two, together, speed. */
function frettedHarm(inst: 'guitar' | 'bass', lvl: LevelDef, fams: FamilyDef[], tier: number): Rung | null {
  const b = lvl.specs[0] as SpecTemplate;
  if (!b || lvl.specs.length !== 1) return null;
  const s = (o: Partial<SpecTemplate>): SpecTemplate => ({ ...b, ...o });
  const h = HARM[b.kind];
  const what: RungWhat = h?.what ?? (/3rds|3/.test(lvl.title.en) ? 'thirds' : /7th/.test(lvl.title.en) ? 'sevenths' : 'other');
  const st: StageDef[] = [];
  if (inst === 'guitar' && h) {
    st.push({ code: 'B-1', specs: [s({ octaves: 1 })], kind: 'coord', name: T('1 oct', 'אוק׳'), long: T('one octave', 'אוקטבה אחת'), brief: T(`${h.name.en}, broken in position, one octave.`, `${h.name.he}, שבורות במצב, אוקטבה אחת.`), say: ['oct1'] });
    st.push({ code: 'B-3', specs: [s({})], kind: 'coord', name: T('2 oct', '2 אוק׳'), long: T('two octaves', 'שתי אוקטבות'), brief: T(`${h.name.en}, two octaves in position.`, `${h.name.he}, שתי אוקטבות במצב.`), say: ['oct2'] , from: { code: 'B-1', k: 0.9 } });
    if (b.kind === 'hl-3b' && fams.some((f) => f.id === 'g-harm' && f.levels.some((l) => l.specs.some((x) => x.kind === 'hl-3t'))))
      st.push({ code: 'B-5', specs: [s({ kind: 'hl-3t' })], kind: 'coord', name: T('Double stops', 'כפולים'), long: T('double stops', 'צלילים כפולים'), brief: T('Thirds as double stops.', 'טרצות כצלילים כפולים.'), say: ['doubleStops'] });
  } else st.push({ code: 'B-3', specs: [s({})], kind: 'coord', name: T('In position', 'במצב'), long: T('in position', 'במצב'), brief: T(`${lvl.title.en}.`, `${lvl.title.he}.`), say: ['position'] });
  st.push({ code: 'B-6', specs: [s({})], kind: 'speed', name: T('Speed', 'מהירות'), long: T('the speed', 'המהירות'), brief: T('The speed: the tempo climbs.', 'המהירות: הטמפו עולה.'), say: ['speed'], target: speedNps(tier) });
  return { rung: lvl.id.replace(/^key-\d+-/, ''), title: lvl.title, what, stages: st, sub: true };
}

// ───────────────────────────── the session's layout (§5) ─────────────────────────────

/** Visit shares of the session (minutes): the scale, the harmonised rung, the rotating block, each other rung. */
export const SHARE = { scale: 0.35, harm: 0.27, rot: 0.2, other: 0.12, closing: 0.1 } as const;
/** The closing visit's most minutes (§5.4). */
export const CLOSING_MIN = 3;
/** The rotation of the third visit (§5.3): licks, fingers and independence, cadences and voicings — one a day. */
export const ROTATION: LadderRung['block'][] = ['C', 'D', 'E'];

const levelOf = (root: number, rung: Rung, d: StageDef, visit: number, tier: number, share: number, closing = false): LevelDef => ({
  id: `key-${root}-${rung.rung}~${d.code}${closing ? '~closing' : ''}`,
  level: 0,
  title: rung.title,
  specs: d.specs,
  keys: [((root % 12) + 12) % 12],
  stage: { rung: rung.rung, title: rung.title, what: rung.what, visit, code: d.code, kind: d.kind, name: d.name, long: d.long, brief: d.brief, say: d.say, tier, share, sub: rung.sub, ...(d.after ? { after: d.after } : {}), ...(d.from ? { from: d.from } : {}), ...(d.target ? { target: r2(d.target) } : {}), ...(d.probe && !closing ? { probe: d.probe } : {}), ...(closing ? { closing: true } : {}) },
});

/** A rung without stages (licks, fingers, cadences …): one visit, one climb to its own target. */
function runLevel(l: LevelDef, visit: number, tier: number, share: number, minor = false): LevelDef {
  const what: RungWhat = 'other';
  // one key, one mode: "…, each hand: major, harmonic minor" loses the other mode's name
  const cut = (x: string, maj: RegExp, min: RegExp) => x.replace(minor ? min : maj, '').replace(/[,:]\s*$/, '');
  const title = { en: cut(l.title.en, /:\s*major(,\s*harmonic minor)?$/, /:\s*(major,\s*)?harmonic minor$/), he: cut(l.title.he, /:\s*מז׳ור(,\s*מינור הרמוני)?$/, /:\s*(מז׳ור,\s*)?מינור הרמוני$/) };
  return { ...l, title, stage: { rung: l.id.replace(/^key-\d+-/, ''), title, what, visit, code: 'run', kind: 'speed', name: T('Speed', 'מהירות'), long: T('the speed', 'המהירות'), brief: T(`${title.en}.`, `${title.he}.`), say: [], tier, share, sub: false } };
}

/** Day number (local), for the rotation. */
const dayNo = (now: number | string): number => {
  const d = new Date(typeof now === 'number' ? now : Date.parse(now));
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
};

/**
 * The key session as a coach ladder of stages (SPEC-KEY-SESSION-2 §5): visit 0 the scale's stages, visit 1 the next
 * harmonised rung (3rds → triads → 7ths, the first with a stage still open in this key), visit 2 one rung of the day's
 * rotating block (C licks, D fingers and independence, E cadences), then the other rungs the key ladder picks, and last
 * the closing visit — the scale's speed stage. Falls back to null (no group / no scale).
 */
export function keySessionLadder(fams: FamilyDef[], root: number, group: FacetGroup, tier: number, items: Record<string, ItemState> = {}, opts: KeyLadderOpts = {}): FamilyDef | null {
  const p = keyLadderPicks(fams, root, group, tier, items, opts);
  if (!p) return null;
  const inst = opts.instrument ?? 'piano';
  const minor = group === 'minor';
  const t = Math.max(0, tier);
  const now = opts.now ?? Date.now();
  const levels: LevelDef[] = [];
  let visit = 0;
  const push = (rung: Rung, share: number) => {
    for (const d of rung.stages) levels.push(levelOf(root, rung, d, visit, t, share));
    visit++;
  };
  // 0: the scale
  const scale = inst === 'piano' ? pianoScale(root, minor, t) : frettedScale(inst, fams, root, minor, t);
  if (scale) push(scale, SHARE.scale);
  else if (p.warm) levels.push(runLevel(p.warm, visit++, t, SHARE.scale, minor));
  const used = new Set<string>();
  // 1: the next harmonised rung (the spine, in teaching order): the first with a stage open in this key
  const spine = p.chosenR.filter((x) => x.rung.block === 'S' && !x.rung.mode);
  const harmOf = (lvl: LevelDef) => (inst === 'piano' ? pianoHarm(lvl, t) : frettedHarm(inst, lvl, fams, t));
  const staged = spine.map((x) => ({ x, r: harmOf(x.lvl) })).filter((y): y is { x: (typeof spine)[number]; r: Rung } => !!y.r);
  const open = staged.find(({ r }) => r.stages.some((d) => !stagePassed(levelOf(root, r, d, 0, t, 0), items)));
  const next = open ?? staged[0];
  if (next) {
    push(next.r, SHARE.harm);
    used.add(next.x.lvl.id);
  }
  // 2: one rung of the day's block in rotation
  const start = dayNo(now) % ROTATION.length;
  for (let k = 0; k < ROTATION.length; k++) {
    const blk = ROTATION[(start + k) % ROTATION.length];
    const r = p.chosenR.find((x) => x.rung.block === blk && !x.rung.mode && !used.has(x.lvl.id));
    if (r) {
      levels.push(runLevel(r.lvl, visit++, t, SHARE.rot, minor));
      used.add(r.lvl.id);
      break;
    }
  }
  // B1: a session longer than its plan goes on with the next harmonised rungs (triads after 3rds …) before more run rungs
  for (const y of staged) {
    if (used.has(y.x.lvl.id)) continue;
    push(y.r, SHARE.harm);
    used.add(y.x.lvl.id);
  }
  // 3…: the other rungs the ladder picked (long sessions reach them): not the spine, not contrary motion (A-5 now), not
  // the forms the B stages already play (U6: 3rds together, block triads, block 7ths in one hand = B-5)
  const covered = (l: LevelDef) => l.specs.every((sp) => sp.family === 'k-sharm' && (sp.kind === 'hl-3t' || sp.kind === 'hl-tb' || (sp.kind === 'hl-7b' && sp.hands === 'R')));
  for (const x of p.chosenR) {
    if (used.has(x.lvl.id) || x.rung.block === 'S' || (x.rung.block === 'A' && x.rung.id === 'scales-4' && !x.rung.tag) || (!x.rung.mode && covered(x.lvl))) continue;
    levels.push(runLevel(x.lvl, visit++, t, SHARE.other, minor));
  }
  // last: the closing visit (U1) — the scale's speed stage (resumed where it stopped, or a short review at the target),
  // or 3–4 octaves once the speed stage has passed
  if (scale) {
    const cl = scale.stages.filter((d) => d.code === 'A-6' || d.code === 'G-S' || d.code === 'A-7');
    for (const d of cl) levels.push(levelOf(root, scale, d, visit, t, SHARE.closing, true));
    if (cl.length) visit++;
  }
  levels.forEach((l, k) => (l.level = k + 1));
  if (levels.length < 2) return null;
  return { id: 'scales' as FamilyDef['id'], title: { en: 'Practice in the key', he: 'תרגול בסולם' }, style: 'both', levels };
}

/** The family is a key session of stages (the coach walks it with keyCoach.ts). */
export const isStaged = (fam: Pick<FamilyDef, 'levels'>): boolean => fam.levels.length > 0 && fam.levels.every((l) => !!l.stage);

/** The spec of a stage's item, with its key (tests and the trace). */
export const stageSpec = (l: LevelDef, k = 0): DrillSpec => ({ ...(l.specs[k] as SpecTemplate), key: levelKeys(l, 'fifths-up')[0] }) as DrillSpec;
