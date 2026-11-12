// DRUMS_NICHE_PLAN P2, the rest of the not-built list: mambo / songo / Mozambique (d-latin 8–10, teacher check
// pending), Rudiment Rush (two-zone sticking), the drum level from the ladder and the Groove-off duel, the crash choke.
import { describe, expect, it } from 'vitest';
import { drumFamilies, type DrumLevelDef } from '../src/engine/drills/drums';
import { levelDrills } from '../src/engine/drills/plan';
import { analyzeDrumTake, type DrumTakeHit } from '../src/engine/drills/drumAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import type { Drill, ItemState, TakeMetrics } from '../src/engine/drills/types';
import { LATIN_TEACHER_CHECK } from '../src/engine/drills/drumLatin2';
import { RUSH_TIERS, RUDIMENTS, rudimentHits, rushRound, scoreRush, stickingOf, zoneHand, zonesFor, zonesOf, ZONE_VOICE, type StickZones } from '../src/engine/rudimentRush';
import { DRUM_GAMES, drumRound, scoreRound } from '../src/engine/drumGames';
import { decodeGrooveCode, drumLevel, encodeGrooveCode, GROOVE_POOL, grooveOffRounds, grooveRunDetail, grooveWinner, LEVEL_FROM, newGrooveSeed, scoreGrooveRound, tempoReached } from '../src/engine/grooveOff';
import { chokeCheck, chokeOnsets, withChoke } from '../src/engine/drills/drumChoke';
import { DYN_NAMES, gameXp, GAME_XP_MAX, seedTier, tierSpec } from '../src/engine/gameTiers';
import { GAME_STEPS } from '../src/engine/path';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { NOTE_VOICE, VOICE_NOTE } from '../src/engine/drumKit';
import { generate } from '../src/engine/drills/generate';

const FAMS = drumFamilies();
const latin = FAMS.find((f) => f.id === 'd-latin')!;

function noise(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
/** A take playing the drill as written (jitter `sd` ms); `voiceOf` may swap what each note is played on. */
function take(d: Drill, bpm: number, sd = 0, seed = 5, voiceOf?: (n: Drill['notes'][number]) => DrumTakeHit['voice']): DrumTakeHit[] {
  const g = noise(seed);
  return d.notes.map((n) => ({ voice: voiceOf ? voiceOf(n) : n.voice!, on: expTimeMs(d, n.beat, bpm) + (sd ? g() * sd : 0), vel: n.ghost ? 34 : n.accent ? 116 : 78, hat: n.voice === 'hihat' ? 'closed' : null }));
}

describe('d-latin 8–10: mambo, songo, Mozambique (awaiting a teacher check)', () => {
  it('the family has 10 levels, numbered without gaps; 8–10 carry needsTeacherCheck, the rest do not', () => {
    expect(latin.levels.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const l of latin.levels as DrumLevelDef[]) expect(!!l.needsTeacherCheck, l.id).toBe(LATIN_TEACHER_CHECK.has(l.id));
    expect(latin.levels.slice(7).map((l) => l.title.en)).toEqual(['Mambo bell over the clave', 'Songo', 'Mozambique']);
  });
  it('every item generates on the kit (not mic), with the band, the teacher-check flag, notes inside their bars', () => {
    for (const lv of latin.levels.slice(7)) {
      const ds = levelDrills(lv, 'fifths-up');
      expect(ds.length, lv.id).toBe(3);
      expect(new Set(ds.map((d) => d.itemId)).size).toBe(3);
      for (const d of ds) {
        expect(d.drum?.teacherCheck, d.itemId).toBe(true);
        expect(d.drum?.mic).toBe(false);
        expect(d.band?.style).toBe('latin');
        expect(d.title.he.length).toBeGreaterThan(3);
        for (const n of d.notes) expect(n.beat + n.dur, `${d.itemId} @${n.beat}`).toBeLessThanOrEqual((Math.floor(n.beat / 4 + 1e-9) + 1) * 4 + 1e-6);
      }
    }
  });
  it('mambo: the bell on the ride over the son clave as a cross-stick; 3-2 swaps the bell\'s two bars', () => {
    const d0 = generate({ family: 'd-latin', kind: '8:mambo', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const bell = d0.notes.filter((n) => n.voice === 'ride' && n.beat < 8).map((n) => n.beat);
    expect(bell).toEqual([0, 1, 2, 2.5, 3.5, 4, 5, 5.5, 6.5, 7]);
    expect(d0.notes.filter((n) => n.voice === 'rim' && n.beat < 8).map((n) => n.beat)).toEqual([1, 2, 4, 5.5, 7]);
    const d2 = generate({ family: 'd-latin', kind: '8:mambo', option: 2, key: 0, hands: 'RL', instrument: 'drums' });
    expect(d2.notes.filter((n) => n.voice === 'ride' && n.beat < 4).map((n) => n.beat)).toEqual([0, 1, 1.5, 2.5, 3]);
  });
  it('Mozambique: linear hands — the bell and the snare never on the same 16th', () => {
    const d = generate({ family: 'd-latin', kind: '10:mozambique', option: 1, key: 0, hands: 'RL', instrument: 'drums' });
    const bell = new Set(d.notes.filter((n) => n.voice === 'ride').map((n) => n.beat));
    expect(d.notes.filter((n) => n.voice === 'snare').every((n) => !bell.has(n.beat))).toBe(true);
  });
  it('a take as written is clean, a sloppy one is not', () => {
    for (const lv of latin.levels.slice(7)) {
      const d = levelDrills(lv, 'fifths-up')[1];
      expect(analyzeDrumTake(d, d.startBpm, take(d, d.startBpm, 3)).verdict, d.itemId).toBe('clean');
      expect(analyzeDrumTake(d, d.startBpm, take(d, d.startBpm, 45, 9)).verdict, d.itemId).not.toBe('clean');
    }
  });
});

describe('Rudiment Rush', () => {
  it('is a drum game with tiers pp → ff, a path step, and a place in the drums course', () => {
    expect(DRUM_GAMES).toContain('rudiment-rush');
    const spec = tierSpec('rudiment-rush')!;
    expect(Object.keys(spec.tiers)).toEqual(DYN_NAMES);
    expect(GAME_STEPS['rudiment-rush']?.forPlays).toEqual(['drums']);
    expect(COURSE_GAMES.drums).toContain('rudiment-rush');
    expect(gameXp('rudiment-rush', 'ff', 400, { right: 5, wrong: 0 })).toBeLessThanOrEqual(GAME_XP_MAX);
  });
  it('every rudiment of every tier exists, and its two bars fill the grid with alternating zones', () => {
    for (const t of DYN_NAMES) for (const id of RUSH_TIERS[t].pool) expect(RUDIMENTS.some((r) => r.id === id), id).toBe(true);
    for (const rd of RUDIMENTS) {
      const hs = rudimentHits(rd, 'hat-snare');
      expect(hs.length, rd.id).toBeGreaterThan(5);
      for (const h of hs) expect(h.v).toBe(ZONE_VOICE['hat-snare'][h.h!]);
      for (const h of hs) expect(h.b + (h.d ?? 0), rd.id).toBeLessThanOrEqual(8 + 1e-6);
    }
    // The paradiddle: R L R R L R L L.
    const para = rudimentHits(RUDIMENTS.find((r) => r.id === 'para')!, 'pad').slice(0, 8).map((h) => h.h).join('');
    expect(para).toBe('RLRRLRLL');
  });
  it('the tempo rises one step per round passed; the round is seeded', () => {
    const a = rushRound('mp', 2, 77, 0, 'hat-snare');
    const b = rushRound('mp', 2, 77, 2, 'hat-snare');
    expect(b.bpm - a.bpm).toBe(2 * RUSH_TIERS.mp.step);
    expect(rushRound('mp', 2, 77, 0, 'hat-snare').rudiment.id).toBe(a.rudiment.id);
    // No rudiment twice in a row when the pool allows.
    for (let k = 1; k < 5; k++) expect(rushRound('p', k, 3, 0, 'pad').rudiment.id).not.toBe(rushRound('p', k - 1, 3, 0, 'pad').rudiment.id);
  });
  it('what each setup can measure: MIDI all zones, an acoustic kit hat-snare (toms when calibrated), a pad one surface', () => {
    expect(zonesFor('pad')).toEqual(['pad']);
    expect(zonesFor('acoustic')).toEqual(['hat-snare', 'pad']);
    expect(zonesFor('acoustic', true)).toContain('tom-snare');
    expect(zonesFor('midi')).toContain('head-rim');
    expect(zonesOf({ preset: 'gm', map: {}, zones: 'head-rim' }, 'acoustic')).toBe('hat-snare');
    expect(zonesOf({ preset: 'gm', map: {}, zones: 'tom-snare' }, 'midi')).toBe('tom-snare');
  });
  it('the surface names the hand: head vs rim, cymbal vs snare, tom vs snare', () => {
    expect(zoneHand('head-rim', VOICE_NOTE.snare)).toBe('R');
    expect(zoneHand('head-rim', VOICE_NOTE.rim)).toBe('L');
    expect(zoneHand('hat-snare', VOICE_NOTE.ride)).toBe('R');
    expect(zoneHand('hat-snare', VOICE_NOTE.snare)).toBe('L');
    expect(zoneHand('tom-snare', VOICE_NOTE.tom3)).toBe('R');
    expect(zoneHand('pad', VOICE_NOTE.snare)).toBe(null);
    expect(NOTE_VOICE[VOICE_NOTE.rim]).toBe('rim');
  });
  const zoneCases: StickZones[] = ['hat-snare', 'tom-snare', 'head-rim'];
  it.each(zoneCases)('%s: the right sticking passes, the hands swapped fail on sticking', (z) => {
    const r = drumRound('rudiment-rush', 'mp', 0, 11, { ups: 0, zones: z });
    const good = analyzeDrumTake(r.drill, r.bpm, take(r.drill, r.bpm, 3));
    const sGood = scoreRush(r.rush!, good, 'mp');
    expect(sGood.ok).toBe(true);
    expect(sGood.sticking?.share).toBe(1);
    const other = (n: Drill['notes'][number]) => ZONE_VOICE[z][n.hand === 'R' ? 'L' : 'R'];
    const bad = analyzeDrumTake(r.drill, r.bpm, take(r.drill, r.bpm, 3, 5, other));
    const sBad = scoreRush(r.rush!, bad, 'mp');
    expect(sBad.ok).toBe(false);
    expect(sBad.sticking!.share).toBeLessThan(0.5);
  });
  it('one pad: the sticking is not graded (self-check), the take still is', () => {
    const r = drumRound('rudiment-rush', 'p', 0, 4, { zones: 'pad' });
    expect(r.drill.drum?.mic).toBe(true);
    expect(r.drill.notes.every((n) => n.voice === 'snare')).toBe(true);
    const m = analyzeDrumTake(r.drill, r.bpm, take(r.drill, r.bpm, 2).map((h) => ({ ...h, voice: null })), { mic: true });
    const s = scoreRound(r, m);
    expect(s.ok).toBe(true);
    expect(stickingOf('pad', m.perNote)).toBe(null);
    expect(s.line.en).toContain('self-check');
  });
  it('points rise with the tempo', () => {
    const lo = drumRound('rudiment-rush', 'mf', 1, 9, { ups: 0, zones: 'hat-snare' });
    const hi = drumRound('rudiment-rush', 'mf', 1, 9, { ups: 3, zones: 'hat-snare' });
    const p = (r: typeof lo) => scoreRound(r, analyzeDrumTake(r.drill, r.bpm, take(r.drill, r.bpm, 2))).points;
    expect(p(hi)).toBeGreaterThan(p(lo));
  });
  it('hat-snare is offered on an acoustic kit by microphone', () => {
    expect(drumRound('rudiment-rush', 'pp', 0, 1, { zones: 'hat-snare' }).drill.drum?.acousticOk).toBe(true);
  });
});

describe('the drum level from the ladder, and the Groove-off duel', () => {
  const passed = (d: Drill): ItemState => ({ itemId: d.itemId, family: d.spec.family, key: 0, hands: 'RL', cleanBpm: 300, goalBpm: 300, streak: 3, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: 3, last: '2026-11-03', history: [], passLog: ['2026-11-01', '2026-11-02', '2026-11-03'].map((at) => ({ at, bpm: 300 })) });
  const doneItems = (ids: string[]) => {
    const out: Record<string, ItemState> = {};
    for (const id of ids) {
      const lv = FAMS.flatMap((f) => f.levels).find((l) => l.id === id)!;
      for (const d of levelDrills(lv, 'fifths-up')) out[d.itemId] = passed(d);
    }
    return out;
  };
  it('no measured takes: pp, nothing done; done groove levels raise the tier (measured only)', () => {
    const z = drumLevel({});
    expect(z).toMatchObject({ tier: 'pp', done: 0, toNext: LEVEL_FROM[1] });
    const two = drumLevel(doneItems(['d-rock-1', 'd-funk-2']));
    expect(two.tier).toBe('p');
    expect(two.top['d-funk']).toBe(2);
    // Technique families outside the grooves do not count.
    expect(drumLevel(doneItems(['d-rolls-1', 'd-rolls-2', 'd-strokes-1'])).done).toBe(0);
    const five = drumLevel(doneItems(['d-rock-1', 'd-rock-2', 'd-rock-3', 'd-shuffle-1', 'd-latin-1']));
    expect(five.tier).toBe('mp');
  });
  it('every pooled groove exists, is a measured kit take (no call to listen to, no teacher-check level)', () => {
    const ids = new Set(FAMS.flatMap((f) => f.levels.map((l) => l.id)));
    for (const t of DYN_NAMES)
      for (const id of GROOVE_POOL[t]) {
        expect(ids.has(id), id).toBe(true);
        expect(id.startsWith('d-latin-8') || id === 'd-latin-9' || id === 'd-latin-10').toBe(false);
      }
  });
  it('the same seed gives both players the same three rounds; the tier rides in the seed; tempo rises to the target', () => {
    const seed = newGrooveSeed('mf', 123456);
    expect(seedTier(seed)).toBe('mf');
    const a = grooveOffRounds(seed);
    const b = grooveOffRounds(seed);
    expect(a.map((r) => [r.levelId, r.drill.itemId, r.bpm])).toEqual(b.map((r) => [r.levelId, r.drill.itemId, r.bpm]));
    expect(a).toHaveLength(3);
    expect(new Set(a.map((r) => r.levelId)).size).toBe(3);
    for (const r of a) expect(GROOVE_POOL.mf).toContain(r.levelId);
    expect(a[2].bpm).toBeGreaterThanOrEqual(a[0].bpm);
    for (const r of a) expect(r.drill.listen).toBeUndefined();
  });
  it('a clean take scores more than a sloppy one; per-limb marks; the tempo reached', () => {
    const rs = grooveOffRounds(newGrooveSeed('p', 99));
    const ms = rs.map((r) => analyzeDrumTake(r.drill, r.bpm, take(r.drill, r.bpm, 3)));
    const good = rs.map((r, i) => scoreGrooveRound(r, ms[i]));
    for (const g of good) {
      expect(g.ok).toBe(true);
      expect(g.points).toBeGreaterThanOrEqual(100);
      expect(g.limbs.filter((l) => l.mark !== 'none').every((l) => l.mark === 'ok')).toBe(true);
    }
    const sloppy = scoreGrooveRound(rs[0], analyzeDrumTake(rs[0].drill, rs[0].bpm, take(rs[0].drill, rs[0].bpm, 60, 7)));
    expect(sloppy.points).toBeLessThan(good[0].points);
    expect(tempoReached(rs, good)).toBe(rs[2].bpm);
    expect(tempoReached(rs, [{ ok: true }, { ok: false }, { ok: false }])).toBe(rs[0].bpm);
    const sum = grooveRunDetail(newGrooveSeed('p', 99), good);
    expect(sum.detail).toMatchObject({ right: 3, wrong: 0, tier: 'p' });
  });
  it('the winner: higher total, then the higher tempo reached, else a tie', () => {
    expect(grooveWinner([100, 100, 100], [100, 90, 100])).toBe(1);
    expect(grooveWinner([0, 0, 0], [60, 0, 0])).toBe(-1);
    const rs = grooveOffRounds(newGrooveSeed('mp', 5));
    expect(grooveWinner([0, 0, 100], [100, 0, 0], rs)).toBe(rs[2].bpm > rs[0].bpm ? 1 : 0);
    expect(grooveWinner([50, 50, 50], [50, 50, 50], rs)).toBe(0);
  });
  it('the local challenge code round-trips; bad codes are refused', () => {
    const c = { seed: newGrooveSeed('ff', 424242), points: [130, 0, 77] };
    const s = encodeGrooveCode(c);
    expect(s).toMatch(/^GO1-[0-9A-Z]+-[0-9A-Z.]+$/);
    expect(decodeGrooveCode(s)).toEqual(c);
    expect(decodeGrooveCode(s.toLowerCase())).toEqual(c);
    expect(decodeGrooveCode('GO1-ZZ-1.2')).toBe(null);
    expect(decodeGrooveCode('hello')).toBe(null);
    expect(decodeGrooveCode('GO1-1-ZZ.0.0')).toBe(null);
  });
  it('Groove-off has its game tiers, rating tags and a card in the drums course', () => {
    expect(tierSpec('groove-off')?.clear).toBe('social');
    expect(COURSE_GAMES.drums).toContain('groove-off');
  });
});

describe('crash choke (d-fills 6)', () => {
  const d = generate({ family: 'd-fills', kind: '6:antic', option: 1, key: 0, hands: 'RL', instrument: 'drums' });
  const bpm = 80;
  const good = (): TakeMetrics => analyzeDrumTake(d, bpm, take(d, bpm, 2));
  it('the anticipation level asks for a choke on each crash, by the next 1', () => {
    expect(d.goal.drum?.choke?.beats).toEqual(d.goal.drum?.landing?.beats);
    expect(d.goal.drum?.choke?.by).toBe(0.5);
    expect(d.beats).toBe(33);
  });
  it('a kit that sends no choke is not measured and never fails for it', () => {
    const m = good();
    expect(chokeCheck(d, bpm, [])).toEqual({ ok: 0, of: 2, measured: false });
    expect(withChoke(m, d, bpm, []).verdict).toBe(m.verdict);
  });
  it('chokes in the window pass; a missed one keeps a clean take at almost', () => {
    const at = d.goal.drum!.choke!.beats.map((b) => expTimeMs(d, b + 0.3, bpm));
    expect(chokeCheck(d, bpm, at)).toEqual({ ok: 2, of: 2, measured: true });
    const m = good();
    expect(m.verdict).toBe('clean');
    expect(withChoke(m, d, bpm, at).verdict).toBe('clean');
    const late = withChoke(m, d, bpm, [at[0], expTimeMs(d, d.goal.drum!.choke!.beats[1] + 0.95, bpm)]);
    expect(late.verdict).toBe('almost');
    expect(late.drum?.choke).toEqual({ ok: 1, of: 2, measured: true });
  });
  it('a held edge (a stream of pressure messages) is one grab', () => {
    expect(chokeOnsets([1000, 1020, 1040, 1100, 1400, 1405])).toEqual([1000, 1400]);
  });
});
