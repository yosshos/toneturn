import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog, generateGuitar } from '../src/engine/drills/guitar';
import { analyzeTake } from '../src/engine/drills/analyze';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { drillEvents, drillScore } from '../src/engine/drills/events';
import { keyMastery } from '../src/engine/analysis/keyMastery';
import { PHRASE_KEYS, PHRASE_REG, phraseOf } from '../src/engine/drills/phraseDrills';
import { ENCLOSURES, PHRASE_KINDS, PHRASE_OPTIONS, earPhrase } from '../src/engine/phraseEar';
import { VQ_DEF, leadIn, mod12 } from '../src/engine/bebopVocab';
import type { Drill, DrillSpec, PlayedNote } from '../src/engine/drills/types';

const FAMS = { piano: 'k-phrase', guitar: 'g-phrase', bass: 'b-phrase' } as const;
type Inst = keyof typeof FAMS;
const levelsOf = (inst: Inst) => (inst === 'piano' ? catalog() : guitarCatalog()).find((f) => f.id === FAMS[inst])!.levels;
const gen = (s: DrillSpec): Drill => (s.family === 'k-phrase' ? generate(s) : generateGuitar(s));
const specs = (inst: Inst) => levelsOf(inst).flatMap((lv) => lv.specs.flatMap((sp) => (lv.keys as number[]).map((key) => ({ ...sp, key }) as DrillSpec)));
const isInt = (b: number) => Math.abs(b - Math.round(b)) < 1e-6;

/** A take that plays the answer back exactly (ms from beat 0, straight 8ths) at `rate` × the tempo. */
function playBack(d: Drill, bpm: number, o: { rate?: number; wrong?: number[]; skip?: number[] } = {}): PlayedNote[] {
  const beatMs = 60000 / (bpm * (o.rate ?? 1));
  const at = d.phrase!.at;
  return d.notes
    .map((n, i) => ({ n, i }))
    .filter(({ i }) => !o.skip?.includes(i))
    .map(({ n, i }) => ({ pitch: n.pitch + (o.wrong?.includes(i) ? 1 : 0), on: (at + (n.beat - at)) * beatMs + 200, off: (n.beat + n.dur) * beatMs, vel: 80 }));
}

describe('phrases by ear: the ladder', () => {
  it('eight levels on each instrument, ~1200 to ~1900, every level in all 12 keys', () => {
    for (const inst of ['piano', 'guitar', 'bass'] as const) {
      const lv = levelsOf(inst);
      expect(lv.map((l) => l.id)).toEqual(PHRASE_KINDS.map((_, i) => `${FAMS[inst]}-${i + 1}`));
      for (const l of lv) {
        expect(new Set(l.keys as number[]).size, l.id).toBe(12);
        expect(l.title.en.length > 0 && /[֐-׿]/.test(l.title.he), l.id).toBe(true);
        expect(l.specs.length, l.id).toBe(PHRASE_OPTIONS[PHRASE_KINDS[l.level - 1]]);
      }
    }
  });

  for (const inst of ['piano', 'guitar', 'bass'] as const)
    it(`${inst}: every item in every key generates a call, then the hidden answer, inside the register`, () => {
      const [lo, hi] = PHRASE_REG[inst];
      for (const s of specs(inst)) {
        const d = gen(s);
        const tag = d.itemId;
        expect(d.show, tag).toBe('none');
        expect(d.phrase, tag).toBeDefined();
        expect(d.spec.key, tag).toBe(mod12(s.key));
        // The key is in the item id (key mastery).
        expect(d.itemId.split(':')[2], tag).toBe(String(mod12(s.key)));
        const at = d.phrase!.at;
        expect(at % 4, tag).toBe(0);
        expect(d.notes.every((n) => n.beat >= at - 1e-9), tag).toBe(true);
        expect(d.notes[0].beat, tag).toBeCloseTo(at, 6);
        for (const n of d.notes) expect(n.pitch >= lo && n.pitch <= hi, `${tag} ${n.pitch}`).toBe(true);
        // No two neighbouring notes repeat (the microphone hears each note).
        for (let i = 1; i < d.notes.length; i++) expect(d.notes[i].pitch, `${tag} @${i}`).not.toBe(d.notes[i - 1].pitch);
        // The call: every onset inside the window, a beat before the answer; the phrase's own notes are the answer's.
        const L = d.listen!;
        expect(L.windows).toEqual([[0, at - 1]]);
        for (const n of L.notes) expect(n.beat, tag).toBeLessThan(at - 1 + 1e-9);
        const mel = L.notes.filter((n) => n.vel === 0.8).map((n) => n.midi[0]);
        expect(mel, tag).toEqual(d.notes.map((n) => n.pitch));
        // A comp under it: the harmony is heard.
        expect(L.notes.some((n) => n.midi.length >= 2), tag).toBe(true);
        expect(d.chart!.length, tag).toBe(2 * (at / 4));
        if (inst !== 'piano') for (const n of d.notes) expect(n.string !== undefined && n.fret !== undefined && n.fret >= 0 && n.fret <= 20, tag).toBe(true);
      }
    });
});

describe('phrases by ear: the devices are in the phrases', () => {
  const all = (kind: string, f: (p: ReturnType<typeof earPhrase>, key: number, op: number) => void) => {
    for (let op = 0; op < PHRASE_OPTIONS[kind as keyof typeof PHRASE_OPTIONS]; op++)
      for (const key of PHRASE_KEYS)
        for (const inst of ['piano', 'guitar', 'bass'] as const) f(phraseOf({ family: FAMS[inst], kind, key, hands: 'R', option: op }, inst), key, op);
  };

  it('level 1: one bar of chord tones only', () => {
    all('ph-ct', (p) => {
      expect(p.notes.every((n) => n.ct)).toBe(true);
      expect(Math.max(...p.notes.map((n) => n.beat))).toBeLessThan(4);
    });
  });

  it('level 2: chromatic approach notes right before a chord tone on the beat', () => {
    all('ph-appr', (p) => {
      expect(p.devices.filter((x) => x.kind === 'approach').length).toBeGreaterThanOrEqual(2);
      for (const dv of p.devices) {
        const T = p.notes[dv.at];
        expect(isInt(T.beat)).toBe(true);
        expect(T.ct).toBe(true);
        const lead = leadIn(dv.id as never, T.p, [], 127);
        const before = p.notes.slice(dv.at - lead.length, dv.at).map((n) => n.p);
        if (dv.id === 'dominant') expect([T.p + 7, T.p - 5]).toContain(before[0]);
        else expect(before).toEqual(lead);
      }
    });
  });

  it('level 3: every enclosure type, each resolving to a chord tone on the beat', () => {
    const seen = new Set<string>();
    all('ph-encl', (p, _k, op) => {
      const encs = p.devices.filter((x) => x.kind === 'enclosure');
      expect(encs.length).toBeGreaterThanOrEqual(1);
      for (const dv of encs) {
        expect(dv.id).toBe(ENCLOSURES[op]);
        seen.add(dv.id);
        const T = p.notes[dv.at];
        expect(isInt(T.beat), `${dv.id} on the beat`).toBe(true);
        expect(T.ct).toBe(true);
        const n = dv.id === 'enc-bebop' ? 3 : dv.id === 'enc-delayed' ? 4 : 2;
        const before = p.notes.slice(dv.at - n, dv.at).map((x) => x.p);
        // Above and below the target, the last note a half step away.
        expect(before.some((x) => x > T.p) && before.some((x) => x < T.p)).toBe(true);
        expect(Math.abs(before[n - 1] - T.p)).toBe(1);
        // The lead-in notes run straight into the target (8ths, no gap).
        expect(T.beat - p.notes[dv.at - n].beat).toBeCloseTo(n * 0.5, 6);
      }
    });
    expect([...seen].sort()).toEqual([...ENCLOSURES].sort());
  });

  it('level 4: the bebop scale’s passing tone falls off the beat, chord tones on the beats', () => {
    all('ph-bebop', (p) => {
      const pass = p.devices.filter((x) => x.kind === 'passing');
      expect(pass.length).toBeGreaterThanOrEqual(1);
      for (const dv of pass) {
        expect(isInt(p.notes[dv.at].beat)).toBe(false);
        expect(Math.abs(p.notes[dv.at - 1].p - p.notes[dv.at].p)).toBe(1);
      }
      for (const n of p.notes) if (isInt(n.beat)) expect(n.ct, `${n.p} @${n.beat}`).toBe(true);
    });
  });

  it('level 5: a two-bar ii–V–I line, a guide tone on each change', () => {
    all('ph-251', (p) => {
      expect(p.chords.map((c) => c.beats)).toEqual([4, 4, 4]);
      for (const at of [4, 8]) {
        const n = p.notes.find((x) => Math.abs(x.beat - at) < 1e-6)!;
        const c = p.chords[at / 4];
        const g = [VQ_DEF[c.q].ct[1], VQ_DEF[c.q].ct[3]].map((x) => mod12(c.r + x));
        expect(g).toContain(mod12(n.p));
      }
    });
  });

  it('level 6: an altered tension on the V, resolving by a half step to a chord tone of I on beat 1', () => {
    const want = ['b9', '#9', 'b13'];
    all('ph-alt', (p, key, op) => {
      const alt = p.devices.filter((x) => x.kind === 'altered');
      expect(alt.length).toBeGreaterThanOrEqual(1);
      expect(alt.every((x) => x.id === want[op])).toBe(true);
      const last = p.notes[p.notes.length - 1];
      expect(last.beat).toBe(8);
      expect(Math.abs(last.p - p.notes[p.notes.length - 2].p)).toBe(1);
      expect([0, 4, 7, 11].map((x) => mod12(key + x))).toContain(mod12(last.p));
    });
  });

  it('levels 7 and 8: a 4-bar solo phrase and 8 bars over the blues / rhythm changes A, chord tones on the beats', () => {
    for (const [kind, bars] of [['ph-solo', 4], ['ph-form', 8]] as const)
      all(kind, (p) => {
        expect(p.chords.reduce((a, c) => a + c.beats, 0)).toBe(bars * 4);
        const beats = p.notes.filter((n) => isInt(n.beat));
        expect(beats.filter((n) => n.ct).length / beats.length).toBeGreaterThanOrEqual(0.9);
      });
  });
});

describe('phrases by ear: graded note by note with partial credit', () => {
  const s = (inst: Inst, kind: string, key = 2): DrillSpec => ({ family: FAMS[inst], kind, key, hands: 'R', option: 0, swing: true, ...(inst === 'piano' ? {} : { instrument: inst }) });
  const grade = (d: Drill, played: PlayedNote[], bpm: number) => (d.spec.family === 'k-phrase' ? analyzeTake(d, bpm, played) : analyzeGuitarTake(d, bpm, played));

  for (const inst of ['piano', 'guitar', 'bass'] as const)
    it(`${inst}: a clean playback is clean; a wrong note and a missed note cost only themselves`, () => {
      const d = gen(s(inst, 'ph-251'));
      const bpm = 90;
      const ok = grade(d, playBack(d, bpm), bpm);
      expect(ok.verdict).toBe('clean');
      expect(ok.accuracy).toBe(1);
      expect(ok.phrase!.pitchAcc).toBe(1);
      const n = d.notes.length;
      const one = grade(d, playBack(d, bpm, { wrong: [3] }), bpm);
      expect(one.verdict).not.toBe('clean');
      expect(one.accuracy).toBeCloseTo((n - 1) / n, 2);
      expect(one.perNote.filter((x) => !x.ok).length).toBe(1);
      const two = grade(d, playBack(d, bpm, { wrong: [3], skip: [7] }), bpm);
      expect(two.accuracy).toBeLessThan(one.accuracy);
      expect(two.accuracy).toBeGreaterThan(0.7);
      expect(two.missing).toBe(1);
      // Partial credit reaches the rating event too.
      expect(drillEvents(d, two, '2026-11-14T00:00:00Z', 's', 0)[0].score).toBeCloseTo(two.accuracy, 3);
      expect(drillScore(d, two)).toBeCloseTo(two.accuracy, 3);
    });

  it('rhythm counts on the player’s own pulse: steady and a little slower is still clean; scrambled time is not', () => {
    const d = gen(s('piano', 'ph-encl'));
    expect(analyzeTake(d, 90, playBack(d, 90, { rate: 0.85 })).verdict).toBe('clean');
    const shaky = playBack(d, 90).map((p, i) => ({ ...p, on: p.on + (i >= 5 ? 700 : 0) }));
    const m = analyzeTake(d, 90, shaky);
    expect(m.phrase!.pitchAcc).toBe(1);
    expect(m.phrase!.rhythmAcc).toBeLessThan(1);
    expect(m.accuracy).toBeLessThan(1);
    expect(m.accuracy).toBeGreaterThanOrEqual(0.6);
  });

  it('an answer an octave down (the bass, a sung line) is not a mistake; enharmonics are the same note', () => {
    const d = gen(s('piano', 'ph-bebop', 6));
    const low = playBack(d, 90).map((p) => ({ ...p, pitch: p.pitch - 12 }));
    expect(analyzeTake(d, 90, low).verdict).toBe('clean');
  });

  it('the phrase items feed key mastery, per key', () => {
    const items = PHRASE_KEYS.slice(0, 4).map((key, i) => {
      const d = gen(s('piano', 'ph-ct', key));
      return { itemId: d.itemId, family: 'k-phrase', key, takes: 4, cleanBpm: 80 + i, goalBpm: 80, targetBpm: 100, last: '2026-11-14T00:00:00Z', ewma: { acc: 0.9 } } as never;
    });
    const sk = keyMastery(items, '2026-11-14T00:00:00Z');
    const k = sk.find((x) => x.family === 'k-phrase')!;
    expect(k).toBeDefined();
    expect(PHRASE_KEYS.slice(0, 4).every((key) => k.cells[key].takes === 4)).toBe(true);
  });
});
