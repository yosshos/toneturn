// Encore's open items (SPEC-PHRASE-STUDIO v1 + v2): teacher phrases on guitar / bass / voice (instrument carried,
// progress and submissions per instrument), voice in key mastery, the sung pitch band (passCents), the quarters stage
// and Keep's bar span on pickup phrases, the folder .zip and the phrase's MusicXML.
import { describe, expect, it } from 'vitest';
import type { Lick, LickNote } from '../src/engine/licks';
import type { ItemState } from '../src/engine/drills/types';
import { assignmentOf, decodePhraseRef, encodePhraseRef, keyStrip, keySubmission, lickFromAssignment, pendingKeySubmissions, phraseInstOf, submissionKey } from '../src/engine/encore/assign';
import { barSpanBeats, finalHand, phraseDrill, phraseHasQuarters, phraseItemId, phrasePitches, phraseQuartersDrill } from '../src/engine/encore/phrase';
import { hasQuarters } from '../src/engine/drills/rubato';
import { emptyOutbox, enqueuePassed } from '../src/storage/phraseOutbox';
import { instrumentKeys, instrumentOf, phraseInstrument, instrumentName } from '../src/engine/analysis/keyMastery';
import { addGameKeyTakes, gameKeyFamily, isGameKeyFamily, keyTakesOf } from '../src/engine/gameKeys';
import { midiOfHz, sungMidi, sungTolOf } from '../src/engine/drills/sungPitch';
import { passCents } from '../src/engine/vocal';
import { crc32, uniqueNames, zipBytes } from '../src/engine/zip';
import { keyFifths, phraseMusicXml, spell, splitValues } from '../src/engine/encore/musicxml';
import { parseMusicXml } from '../src/engine/piece/score';
import { BEBOP2 } from './encoreFixtures';

const NOW = '2026-11-16T10:00:00.000Z';
const twoHand = (): Lick => ({
  id: 'enc-t',
  v: 3,
  ctx: 'free',
  level: 3,
  name: { en: 'Line', he: 'קו' },
  own: true,
  chords: [[2, 'm7', 4], [7, '7', 4]],
  notes: [0, 2, 4, 5, 7, 9, 11, 12].map((s, i) => [s, i, 1] as LickNote),
  lh: [[0, 0, 4], [7, 4, 4]],
  meter: 4,
  swing: 0.5,
  homeKey: 0,
  instrument: 'piano',
  playedBpm: 100,
});
const plan = { goalBpm: 120, keys: [0, 7] as number[], order: 'easiest' as const, hands: 'R-then-RL' as const, band: false };
const passedItem = (id: string, key: number, bpm: number): ItemState =>
  ({ itemId: id, family: 'licks', key, hands: 'R', goalBpm: bpm, streak: 0, fails: 0, last: '2026-11-11T11:00:00Z', history: [], cleanBpm: bpm, takes: 5, ewma: { cv: 0.05, sd: 20, vsd: 0, hands: 0, acc: 0.98 }, passLog: [{ at: '2026-11-10T10:00:00Z', bpm }, { at: '2026-11-11T10:00:00Z', bpm }, { at: '2026-11-11T11:00:00Z', bpm }] }) as ItemState;

describe('teacher phrases on guitar, bass and voice (§11)', () => {
  it('the teacher picks the instrument: off the piano one line, hands R; the code keeps the instrument', () => {
    for (const inst of ['guitar', 'bass', 'voice'] as const) {
      const a = assignmentOf(twoHand(), plan, { inst });
      expect(a.instrument).toBe(inst);
      expect(a.lh).toEqual([]);
      expect(a.rh).toEqual(twoHand().notes);
      expect(a.plan.hands).toBe('R');
      const back = decodePhraseRef(encodePhraseRef(a))!;
      expect(back.instrument).toBe(inst);
      expect(back.plan.hands).toBe('R');
    }
    // the piano keeps both hands
    expect(assignmentOf(twoHand(), plan).lh.length).toBe(2);
    // a left-hand-only phrase off the piano: the line an octave up
    const lhOnly = { ...twoHand(), notes: [], lh: [[0, 0, 1], [4, 1, 1]] as LickNote[] };
    expect(assignmentOf(lhOnly, plan, { inst: 'bass' }).rh).toEqual([[12, 0, 1], [16, 1, 1]]);
  });
  it("the student's phrase is on the assignment's instrument: one line, its own items, progress and submissions per instrument", () => {
    const a = assignmentOf(twoHand(), plan, { inst: 'guitar' });
    const l = lickFromAssignment(decodePhraseRef(encodePhraseRef(a))!, 'as1', 'Ronit', NOW);
    expect(phraseInstOf(l)).toBe('guitar');
    expect(l.lh).toBeUndefined();
    expect(finalHand(l)).toBe('R');
    // a key passed on the guitar (its item id carries the instrument) is submitted — with the instrument
    const id = phraseItemId(l, 'guitar', 7);
    expect(id).toBe(`lick:${l.id}:guitar:7`);
    const items = { [id]: passedItem(id, 7, 120) };
    const subs = pendingKeySubmissions(l, items, []);
    expect(subs.map((s) => s.key)).toEqual([7]);
    expect(subs[0].metrics.inst).toBe('guitar');
    expect(keySubmission(l, items, 7)!.metrics.inst).toBe('guitar');
    // the same key passed on the piano does not count for a guitar assignment
    const pid = phraseItemId(l, 'piano', 0);
    expect(pendingKeySubmissions(l, { [pid]: passedItem(pid, 0, 120) }, [])).toEqual([]);
    // the outbox queues each assignment on its own instrument
    const book = { own: [l] };
    const r = enqueuePassed(emptyOutbox(), book, items, NOW);
    expect(r.added.map((x) => [x.key, x.metrics.inst])).toEqual([[7, 'guitar']]);
  });
  it("the teacher's strip counts only the assignment's instrument (old submissions read piano)", () => {
    const subs = [
      { metrics: { kind: 'phrase', key: 0, bpm: 120, inst: 'voice' }, score: 0.9 },
      { metrics: { kind: 'phrase', key: 7, bpm: 120 }, score: 0.95 },
    ];
    expect(submissionKey(subs[1].metrics)!.inst).toBe('piano');
    expect([...keyStrip(subs, 'voice').keys()]).toEqual([0]);
    expect([...keyStrip(subs, 'piano').keys()]).toEqual([7]);
    expect([...keyStrip(subs).keys()].sort()).toEqual([0, 7]);
  });
  it('old piano assignments are unchanged (piano, both hands, piano items)', () => {
    const a = assignmentOf(twoHand(), plan);
    const l = lickFromAssignment(a, 'as2', 'T', NOW);
    expect(phraseInstOf(l)).toBe('piano');
    expect(l.lh?.length).toBe(2);
    expect(l.plan?.hands).toBe('R-then-RL');
  });
});

describe('voice in key mastery', () => {
  it('sung Encore phrase keys show on the key map as the voice', () => {
    const id = 'lick:enc-v1:voice:3';
    expect(phraseInstrument(id)).toBe('voice');
    const st = { ...passedItem(id, 3, 100), takes: 6 };
    const ks = instrumentKeys({ [id]: st }, Date.parse('2026-11-12T10:00:00Z'));
    const v = ks.find((k) => k.instrument === 'voice')!;
    expect(v).toBeDefined();
    expect(v.cells[3].status).not.toBe('untried');
    expect(ks.some((k) => k.instrument === 'piano')).toBe(false);
    expect(instrumentName('voice')).toEqual({ en: 'voice', he: 'קול' });
  });
  it("a sung key game's cells are the voice's (v- prefix)", () => {
    expect(gameKeyFamily('playback', 'voice')).toBe('v-game-playback');
    expect(isGameKeyFamily('v-game-playback')).toBe(true);
    expect(instrumentOf('v-game-playback' as never)).toBe('voice');
    expect(keyTakesOf({ keyInst: 'voice', keyTakes: [{ key: 2, acc: 90 }] })?.inst).toBe('voice');
    const cells = addGameKeyTakes(undefined, 'playback', 'voice', [{ key: 2, acc: 90 }, { key: 2, acc: 95 }, { key: 2, acc: 92 }], '2026-11-12T10:00:00Z');
    expect(instrumentKeys(cells, Date.parse('2026-11-12T10:00:00Z')).map((k) => k.instrument)).toEqual(['voice']);
  });
});

describe("the sung drill path uses the course's pass band (passCents), one capture stream", () => {
  const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
  it('a voice inside ±passCents of a written note is that note; outside, the nearest semitone', () => {
    expect(passCents()).toBe(65);
    expect(sungMidi(hz(62.55), [62])).toBe(62); // 55 ¢ sharp of D: D (rounding alone said D♯)
    expect(sungMidi(hz(61.4), [62])).toBe(62); // 60 ¢ flat
    expect(sungMidi(hz(62.7), [62])).toBe(63); // 70 ¢: outside the band
    expect(sungMidi(hz(62.62), [62], 60)).toBe(63); // a strict item (rating ≥ 1300): 60 ¢
    expect(sungMidi(hz(62.55), [60])).toBe(63); // not a written note: rounding as before
    expect(sungMidi(hz(74.4), [62])).toBe(74); // the octave is the singer's
    expect(sungMidi(hz(62.45), [62, 63])).toBe(62); // the nearest written note wins
    expect(Math.round(midiOfHz(440))).toBe(69);
  });
  it("a drill's band: its own (an Encore phrase's rating), else the course's middle one", () => {
    expect(sungTolOf({})).toBe(65);
    expect(sungTolOf({ sungTolCents: passCents(1400) })).toBe(60);
  });
});

describe('pickup phrases: the quarters stage and Keep (§7.2, §5.2)', () => {
  // a one-beat pickup of two eighths, then a bar of eighths (the e2e pickup phrase in eighths)
  const pk: Lick = {
    id: 'enc-pk',
    v: 3,
    ctx: 'free',
    level: 3,
    name: { en: 'Pickup', he: 'אנקרוזה' },
    own: true,
    chords: [],
    notes: [[-5, 0, 0.5], [-3, 0.5, 0.5], ...[0, 2, 4, 5, 7, 9, 11, 12].map((s, i) => [s, 1 + i * 0.5, 0.5] as LickNote)],
    meter: 4,
    pickup: 1,
    swing: 0.5,
    straight: true,
    homeKey: 0,
    instrument: 'piano',
    playedBpm: 100,
  };
  it('a pickup phrase now has the quarters stage', () => {
    const d = phraseDrill(pk, 0, 'R');
    expect(d.meters?.[0].meter.pickup).toBe(true);
    expect(hasQuarters(d)).toBe(false); // the generic rule refuses any meter change
    expect(phraseHasQuarters(d)).toBe(true);
  });
  it('the quarters drill keeps the pickup: the stretched lead-in ends on the bar line', () => {
    const q = phraseQuartersDrill(phraseDrill(pk, 0, 'R'));
    // two eighths → two quarters: a 2-beat pickup bar, the downbeat (C) on beat 2, one note a beat
    expect(q.meters?.[0].meter).toMatchObject({ num: 2, pickup: true });
    const c = q.notes.find((n) => n.pitch % 12 === 0)!;
    expect(c.beat).toBe(2);
    expect(q.notes.map((n) => n.beat)).toEqual(q.notes.map((_, i) => i));
    expect(q.meter).toBe(4);
    expect((q.beats - 2) % 4).toBe(0);
  });
  it('a lead-in that fills whole bars drops the pickup; a half-beat stretch gets rests before it', () => {
    const three: Lick = { ...pk, pickup: 2, notes: [[-5, 0, 0.5], [-3, 0.5, 0.5], [-1, 1, 0.5], [-2, 1.5, 0.5], ...pk.notes.slice(2).map(([s, b, d]) => [s, b + 1, d] as LickNote)] };
    const q = phraseQuartersDrill(phraseDrill(three, 0, 'R'));
    expect(q.meters).toBeUndefined();
    expect(q.notes.find((n) => n.pitch % 12 === 0)!.beat).toBe(4);
  });
  it("Keep sends the worst bar's real span (bar 0 = the pickup bar)", () => {
    expect(barSpanBeats(pk, 0)).toEqual({ from: 0, to: 1 });
    expect(barSpanBeats(pk, 1)).toEqual({ from: 1, to: 5 });
    expect(barSpanBeats(pk, 2)).toEqual({ from: 5, to: 9 });
    expect(barSpanBeats({ meter: 3 }, 2)).toEqual({ from: 6, to: 9 });
  });
});

describe('export: a folder as .zip, a phrase as MusicXML', () => {
  it('crc32 and a valid stored zip with UTF-8 names', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    const z = zipBytes([
      { name: 'שיר.mid', bytes: new Uint8Array([1, 2, 3]), date: new Date(2026, 10, 16, 10, 0, 0) },
      { name: 'b.wav', bytes: new Uint8Array(10) },
    ]);
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint16(6, true) & 0x0800).toBe(0x0800);
    const end = z.length - 22;
    expect(v.getUint32(end, true)).toBe(0x06054b50);
    expect(v.getUint16(end + 10, true)).toBe(2);
    const cdOff = v.getUint32(end + 16, true);
    expect(v.getUint32(cdOff, true)).toBe(0x02014b50);
    expect(v.getUint32(cdOff + 16, true)).toBe(crc32(new Uint8Array([1, 2, 3])));
    expect(uniqueNames(['a.wav', 'A.wav', 'a.wav', 'x'])).toEqual(['a.wav', 'A (2).wav', 'a (3).wav', 'x']);
  });
  it('written values, spelling and key signatures', () => {
    expect(splitValues(24).map((v) => v[1])).toEqual(['quarter']);
    expect(splitValues(36)[0]).toEqual([36, 'quarter', true, false]);
    expect(splitValues(8)[0][3]).toBe(true); // an eighth triplet
    expect(splitValues(30).reduce((a, v) => a + v[0], 0)).toBe(30);
    expect(keyFifths(5)).toBe(-1);
    expect(keyFifths(9, true)).toBe(0);
    expect(spell(61, -3)).toEqual({ step: 'D', alter: -1, octave: 4 });
    expect(spell(61, 2)).toEqual({ step: 'C', alter: 1, octave: 4 });
  });
  it('a two-hand phrase reads back with the same pitches and onsets', () => {
    const l = BEBOP2();
    const xml = phraseMusicXml(l, { key: 5 });
    const p = parseMusicXml(xml);
    const pp = phrasePitches(l, 5);
    const want = [...l.notes.map((n, i) => `${pp.rh[i]}@${n[1]}`), ...(l.lh ?? []).map((n, i) => `${pp.lh[i]}@${n[1]}`)].sort();
    const got = p.notes.map((n) => `${n.midi}@${Math.round(n.start * 1000) / 1000}`).sort();
    expect(got).toEqual(want);
    expect(p.fifths).toBe(-1);
    expect(p.tempo).toBe(l.plan!.goalBpm);
    expect(p.bars.length).toBe(4);
    expect(xml).toContain('<harmony>');
  });
  it('a pickup is an implicit short first measure; off the piano one staff in its clef', () => {
    const pk: Lick = { id: 'enc-p', v: 3, ctx: 'free', level: 3, name: { en: 'P', he: 'P' }, own: true, chords: [], notes: [[-5, 0, 1], [0, 1, 1], [2, 2, 1], [4, 3, 1], [5, 4, 2]], meter: 4, pickup: 1, swing: 0.5, homeKey: 0, instrument: 'guitar', playedBpm: 90 };
    const xml = phraseMusicXml(pk, { inst: 'guitar' });
    expect(xml).toContain('implicit="yes"');
    expect(xml).toContain('<clef-octave-change>-1</clef-octave-change>');
    const p = parseMusicXml(xml);
    expect(p.bars[0].beats).toBe(1);
    expect(p.notes.map((n) => n.start)).toEqual([0, 1, 2, 3, 4]);
  });
});
