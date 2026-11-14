// THEORY_PLAY (docs/AUDIT-CONTENT-THEORY.md §ז.2, TP-1…TP-5): the music is exact (triad pairs = their scale minus one
// named tone, pentatonic degrees, polychord labels from the notes, reharm validity), the topics generate and grade, the
// keys family and the guitar levels generate in every key and pass a steady human take, and everything is wired
// (path, symbols, badges, lessons, tags).
import { describe, expect, it } from 'vitest';
import {
  PENTS, SLOT_CHORDS, TP_SCALES, TRIAD_PAIRS, USTS, domClass, domColour, hexatonic, holdsMelody, mod12, pairTriads, pentDegrees, pentNotes, reharmValid, scalesHolding, slashKind, triadOf, ustPcs, voicingSets,
} from '../src/engine/theoryPlay';
import { TOPIC_GEN } from '../src/engine/topics';
import { gradePlace, type ChoiceQuestion, type PlaceQuestion } from '../src/engine/lesson';
import { catalog, generate } from '../src/engine/drills/generate';
import { analyzeTake, npsOf, tempoBand, thresholds } from '../src/engine/drills/analyze';
import { levelDrills, shownFamilies, targetBpmOf } from '../src/engine/drills/plan';
import { drillEvents } from '../src/engine/drills/events';
import { stepCatalogue } from '../src/engine/path';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES, badgeInCourse } from '../src/engine/badges';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { humanTake, steadySd } from './pianoTake';

const pc = (m: number) => mod12(m);
const TOPICS = ['triad-pairs', 'pent-super', 'polychords', 'reharm-own'];
const CAT = catalog();
const fam = () => CAT.find((f) => f.id === 'k-theory')!;

describe('the music is exact', () => {
  it('a triad pair is exactly its scale minus the one tone it names; the two triads share no note', () => {
    for (const p of TRIAD_PAIRS)
      for (let root = 0; root < 12; root++) {
        const [a, b] = pairTriads(p, root);
        expect(a.filter((x) => b.includes(x)), p.id).toEqual([]);
        const scale = TP_SCALES[p.scale].ints.map((x) => mod12(root + x));
        const want = scale.filter((x) => x !== mod12(root + p.missing)).sort((x, y) => x - y);
        expect(hexatonic(p, root), p.id).toEqual(want);
      }
    // The audit's example, spelled out: G♭ + A♭ over C7alt = C D♭ E♭ G♭ A♭ B♭ (the altered scale without its 3rd, E).
    expect(hexatonic(TRIAD_PAIRS.find((x) => x.id === 'altered')!, 0)).toEqual([0, 1, 3, 6, 8, 10]);
    // E♭ + F over Cm7 = dorian without the 9th; D + Em over Cmaj7♯11 = lydian without the root.
    expect(hexatonic(TRIAD_PAIRS.find((x) => x.id === 'dorian')!, 0)).toEqual([0, 3, 5, 7, 9, 10]);
    expect(hexatonic(TRIAD_PAIRS.find((x) => x.id === 'lydian')!, 0)).toEqual([2, 4, 6, 7, 9, 11]);
  });
  it('every pentatonic lies inside the chord scale it is named for, and its degrees are what the lesson says', () => {
    for (const p of PENTS) {
      const ints = pentNotes(p, 0);
      expect(ints.every((x) => TP_SCALES[p.scale].ints.includes(x)), p.id).toBe(true);
      // never the avoid tone: no natural 11 over maj7 or a dominant
      if (p.q !== 'm7') expect(ints.includes(5), p.id).toBe(false);
    }
    expect(pentDegrees(PENTS.find((x) => x.id === 'lydian')!)).toEqual(['9', '3', '♯11', '13', '7']);
    expect(pentDegrees(PENTS.find((x) => x.id === 'altered')!)).toEqual(['♯9', '♯11', '♭13', '♭7', '♭9']);
    expect(pentDegrees(PENTS.find((x) => x.id === 'dorian')!)).toEqual(['9', '11', '5', '13', '1']);
  });
  it('polychord labels follow from the notes: C/E inversion, D/C lydian, F/G sus — in every key', () => {
    for (let b = 0; b < 12; b++) {
      expect(slashKind(b - 4, false, b)).toBe('inversion');
      expect(slashKind(b - 7, false, b)).toBe('inversion');
      expect(slashKind(b + 2, false, b)).toBe('lydian');
      expect(slashKind(b - 2, false, b)).toBe('sus');
      // D/C: no C in the D triad, and it adds 9, ♯11, 13 over C; F/G: ♭7, 9, 11 over G.
      expect(triadOf(b + 2, false).map((x) => mod12(x - b))).toEqual([2, 6, 9]);
      expect(triadOf(b - 2, false).map((x) => mod12(x - b))).toEqual([10, 2, 5]);
    }
    expect(slashKind(3, false, 0)).toBe('other');
  });
  it('upper structures: natural / lydian dominant / altered match the scales that hold them', () => {
    for (const u of USTS.filter((x) => x.q === '7')) {
      const pcs = ustPcs(u, 0);
      const holds = scalesHolding(pcs, ['mixolydian', 'lydian-dom', 'altered', 'half-whole']);
      expect(holds.length, u.id).toBeGreaterThan(0);
      if (domClass(u) === 'altered') expect(holds.includes('mixolydian') || holds.includes('lydian-dom'), u.id).toBe(false);
      else expect(holds.includes('altered'), u.id).toBe(false);
    }
    const c = (id: string) => domColour(USTS.find((x) => x.id === id)!);
    expect([c('ii-dom'), c('vm-dom'), c('vim-dom'), c('bvi-dom')]).toEqual(['lydian-dom', 'natural', 'natural', 'altered']);
    expect(scalesHolding(ustPcs(USTS.find((x) => x.id === 'ii-dom')!, 0), ['mixolydian', 'lydian-dom', 'altered'])).toEqual(['lydian-dom']);
    expect(scalesHolding(ustPcs(USTS.find((x) => x.id === 'bvi-dom')!, 0), ['mixolydian', 'lydian-dom', 'altered', 'half-whole'])).toEqual(['altered']);
    // Over maj7 and m7: D/Cmaj7 = 9 ♯11 13 (lydian), F/Cm7 = 11 13 1 (dorian).
    expect(scalesHolding(ustPcs(USTS.find((x) => x.id === 'ii-maj')!, 0), ['ionian', 'lydian'])).toEqual(['lydian']);
    expect(scalesHolding(ustPcs(USTS.find((x) => x.id === 'iv-min')!, 0), ['dorian'])).toEqual(['dorian']);
  });
  it('reharm validity: the job (resolves where the old chord did) and the melody (chord tone or tension)', () => {
    // Melody C over G7 → C: G7 has it as the 11 (no), D♭7 as the major 7 (no), B♭7 as the 9 (yes).
    expect(reharmValid('dominant', { d: 7, q: '7' }, 0)).toBe(false);
    expect(reharmValid('dominant', { d: 1, q: '7' }, 0)).toBe(false);
    expect(reharmValid('dominant', { d: 10, q: '7' }, 0)).toBe(true);
    // D7 does not lead to C (it is V of V), whatever the melody.
    expect(reharmValid('dominant', { d: 2, q: '7' }, 2)).toBe(false);
    // Into ii: C♯°7 and any of its inversions (E°7, G°7, B♭°7), A7 and E♭7.
    for (const d of [1, 4, 7, 10]) expect(reharmValid('into-ii', { d, q: 'dim7' }, 4)).toBe(true);
    expect(reharmValid('into-ii', { d: 2, q: 'dim7' }, 5)).toBe(false);
    // Every accepted voicing holds the melody and the chord's 3rd and 7th.
    for (const slot of ['dominant', 'into-ii'] as const)
      for (const x of SLOT_CHORDS[slot])
        for (let m = 0; m < 12; m++) {
          if (!holdsMelody(x.c.d, x.c.q, m)) continue;
          for (const v of voicingSets(x.c, 5, m)) expect(v.includes(mod12(5 + m)), `${slot} ${x.device} ${m}`).toBe(true);
        }
  });
});

describe('the four topics', () => {
  it('generate at every level, fit one screen (≤ 5 choices, short asks), no enharmonic decoys, no emoji', () => {
    for (const t of TOPICS) {
      const T = TOPIC_GEN[t];
      for (let level = 1; level <= T.levels.length; level++)
        for (let seed = 1; seed <= 40; seed++) {
          const q = T.gen(seed, level, `x${seed}`) as ChoiceQuestion | PlaceQuestion;
          expect(q.ask.en.length, `${t} ${level}`).toBeLessThan(110);
          if (q.kind === 'choice') {
            expect(q.choices.length).toBeLessThanOrEqual(5);
            expect(q.choices).toContain(q.answer);
            const labels = q.choices.map((c) => q.names[c].en);
            expect(new Set(labels).size, `${t} ${level} ${labels}`).toBe(labels.length);
          } else {
            expect(q.kind).toBe('place');
            const p = q as PlaceQuestion;
            expect(gradePlace(p, p.answer).score).toBe(1);
          }
          expect(/\p{Extended_Pictographic}/u.test(JSON.stringify(q))).toBe(false);
        }
    }
  });
  it('triad-pairs 1: the answer is the chord’s own pair (C7alt → G♭ + A♭)', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const q = TOPIC_GEN['triad-pairs'].gen(seed, 1, 'x') as ChoiceQuestion;
      if (q.ask.en.startsWith('C7alt')) expect(q.names[q.answer].en).toBe('G♭ + A♭');
      if (q.ask.en.startsWith('Cm7')) expect(q.names[q.answer].en).toBe('E♭ + F');
      if (q.ask.en.startsWith('Cmaj7♯11')) expect(q.names[q.answer].en).toBe('D + Em');
    }
  });
  it('polychords: the label shown is the label of the notes played', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const q = TOPIC_GEN.polychords.gen(seed, 1, 'x') as ChoiceQuestion;
      const [tri, bass] = q.ask.en.split(':')[0].split('/');
      const name = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
      expect(slashKind(name.indexOf(tri), false, name.indexOf(bass))).toBe(q.answer);
    }
  });
  it('reharm-own: any valid voicing passes (pitch classes, any octave); a voicing without the melody or with the wrong job does not', () => {
    for (let seed = 1; seed <= 40; seed++)
      for (const level of [3, 4, 5]) {
        const q = TOPIC_GEN['reharm-own'].gen(seed, level, 'x') as PlaceQuestion;
        const mel = pc(q.given!.midis![0]);
        expect(q.match).toBe('pc');
        for (const k of [q.answer, ...(q.alts ?? [])]) {
          expect(k.split('.').map(Number)).toContain(mel);
          expect(gradePlace(q, k).score).toBe(1);
        }
        // The original V7 (G7 in C) with the melody is not an answer at level 5.
        if (level === 5) {
          const key = ['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B♭'].map((n) => q.ask.en.includes(`7 → ${n}maj7`) ? n : '').find(Boolean)!;
          const k = [0, 2, 3, 5, 7, 8, 10][['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B♭'].indexOf(key)];
          const g7 = [...new Set([k + 7, k + 7 + 4, k + 7 + 10, mel].map(pc))].sort((a, b) => a - b).join('.');
          expect(gradePlace(q, g7).score, q.ask.en).toBeLessThan(1);
        }
      }
  });
});

describe('k-theory: theory you play on the keys', () => {
  it('7 levels; every item generates in every key, on the keyboard, hands never crossing', () => {
    expect(fam().levels).toHaveLength(7);
    for (const lv of fam().levels)
      for (const sp of lv.specs)
        for (let key = 0; key < 12; key++) {
          const d = generate({ ...sp, key });
          expect(d.notes.length, d.itemId).toBeGreaterThan(0);
          expect(d.notes.every((n) => n.pitch >= 28 && n.pitch <= 98), d.itemId).toBe(true);
          for (const a of d.notes) for (const b of d.notes) if (a.hand === 'L' && b.hand === 'R' && Math.abs(a.beat - b.beat) < 1e-6) expect(a.pitch < b.pitch, `${d.itemId} b${a.beat}`).toBe(true);
          expect(d.chart?.length, d.itemId).toBeGreaterThan(0);
        }
  });
  it('the pentatonic line is only the pentatonic’s notes; the triad-pair line only the pair’s six', () => {
    for (let key = 0; key < 12; key++) {
      for (const [o, id] of (['inside-maj', 'lydian', 'dorian', 'altered'] as const).entries()) {
        const d = generate({ family: 'k-theory', kind: 'tp-pent', key, hands: 'R', option: o, swing: true });
        const want = pentNotes(PENTS.find((x) => x.id === id)!, key);
        expect(d.notes.every((n) => want.includes(pc(n.pitch))), `${id} ${key}`).toBe(true);
        expect(d.band?.style).toBe('swing');
      }
      for (const [o, p] of TRIAD_PAIRS.filter((x) => ['dorian', 'lydian', 'altered', 'lydian-dom', 'mixolydian'].includes(x.id)).map((x, i) => [i, x] as const)) {
        const id = ['dorian', 'lydian', 'altered', 'lydian-dom', 'mixolydian'][o];
        const pair = TRIAD_PAIRS.find((x) => x.id === id)!;
        void p;
        const six = hexatonic(pair, key);
        for (const kind of ['tp-pairs', 'tp-pairline']) {
          const d = generate({ family: 'k-theory', kind, key, hands: 'R', option: o, swing: kind === 'tp-pairline' });
          expect(new Set(d.notes.map((n) => pc(n.pitch))), `${kind} ${id} ${key}`).toEqual(new Set(six));
        }
        // In inversions: each chord is one of the two triads.
        const d = generate({ family: 'k-theory', kind: 'tp-pairs', key, hands: 'R', option: o });
        const [a, b] = pairTriads(pair, key);
        for (const cs of d.goal.chordSets ?? []) expect([a, b].some((t) => t.slice().sort((x, y) => x - y).join() === cs.required.join()), `${id} ${key}`).toBe(true);
      }
    }
  });
  it('upper structures: every chord is the shell plus the named triad; line clichés move one voice by a half step', () => {
    const d = generate({ family: 'k-theory', kind: 'tp-ust', key: 0, hands: 'RL', option: 0 });
    const rh = (id: number) => d.notes.filter((n) => n.chordId === id && n.hand === 'R').map((n) => pc(n.pitch)).sort((a, b) => a - b);
    const ids = [...new Set(d.notes.map((n) => n.chordId))];
    // G, D, Bm, D over Cmaj7.
    expect(ids.map((i) => rh(i!).join())).toEqual([[2, 7, 11], [2, 6, 9], [2, 6, 11], [2, 6, 9]].map((x) => x.join()));
    for (const op of [0, 1]) {
      const c = generate({ family: 'k-theory', kind: 'tp-cliche', key: 3, hands: 'RL', option: op });
      const chords = [...new Set(c.notes.filter((n) => n.hand === 'R').map((n) => n.chordId))].map((id) => c.notes.filter((n) => n.chordId === id && n.hand === 'R').map((n) => n.pitch).sort((a, b) => a - b));
      for (let i = 1; i < 4; i++) {
        const moved = chords[i].filter((p, k) => p !== chords[i - 1][k]);
        expect(moved, `op ${op} chord ${i}`).toHaveLength(1);
        expect(Math.abs(chords[i][0] - chords[i - 1][0])).toBe(1);
      }
    }
    // The reharmonised melody: the top note of every chord is the melody and each chord holds it.
    const m = generate({ family: 'k-theory', kind: 'tp-cliche', key: 0, hands: 'RL', option: 2 });
    const tops = [...new Set(m.notes.map((n) => n.chordId))].map((id) => Math.max(...m.notes.filter((n) => n.chordId === id).map((n) => n.pitch)));
    expect(tops.map(pc)).toEqual([4, 4, 5, 5, 4]);
  });
  it('a steady take is clean at the target tempo in every key; a sloppy one (2 × the SD limit) not; chords pass by microphone', () => {
    const bad: string[] = [];
    for (const lv of fam().levels)
      for (const d0 of levelDrills(lv, 'fifths-up'))
        for (const key of [0, 5, 10, 3]) {
          const d = generate({ ...d0.spec, key });
          const bpm = targetBpmOf(lv, d);
          const m = analyzeTake(d, bpm, humanTake(d, bpm, steadySd(d, bpm), 2));
          if (m.verdict !== 'clean') bad.push(`steady ${lv.id} ${d.itemId}@${bpm}: ${m.why.en}`);
          const sd = 2 * thresholds(tempoBand(npsOf(d, bpm))).sd;
          const onsets = new Set(d.notes.map((x) => x.beat)).size;
          const seeds = onsets < 6 ? [5, 6, 7, 8] : [5];
          const clean = seeds.filter((s) => analyzeTake(d, bpm, humanTake(d, bpm, sd, s)).verdict === 'clean').length;
          if (clean > (onsets < 6 ? 1 : 0)) bad.push(`sloppy ${lv.id} ${d.itemId}@${bpm} ×${clean}`);
        }
    expect(bad).toEqual([]);
    for (const id of ['k-theory-2', 'k-theory-4', 'k-theory-5']) {
      const lv = fam().levels.find((l) => l.id === id)!;
      const d = levelDrills(lv, 'fifths-up')[0];
      const bpm = targetBpmOf(lv, d);
      expect(analyzeTake(d, bpm, humanTake(d, bpm, 12, 2), undefined, { mic: true }).verdict, id).toBe('clean');
    }
  }, 120_000);
  it('a wrong note in a line or a chord never passes', () => {
    for (const [kind, hands, swing] of [['tp-pent', 'R', true], ['tp-pairs', 'R', false], ['tp-ust', 'RL', false]] as const) {
      const d = generate({ family: 'k-theory', kind, key: 2, hands, option: 1, swing });
      const take = humanTake(d, 80, 6, 3);
      const i = Math.floor(take.length / 2);
      const wrong = take.map((p, k) => (k === i ? { ...p, pitch: p.pitch + 1 } : p));
      expect(analyzeTake(d, 80, wrong).verdict, kind).not.toBe('clean');
    }
  });
});

describe('wiring', () => {
  it('jazz emphasis shows k-theory, classical hides it; its own path symbol; 7 badges in the keys course', () => {
    expect(shownFamilies({ emphasis: 'jazz' }).map((x) => x.id)).toContain('k-theory');
    expect(shownFamilies({ emphasis: 'classical' }).map((x) => x.id)).not.toContain('k-theory');
    expect(GLYPHS[FAMILY_GLYPH['k-theory']]).toBeDefined();
    expect(Object.entries(FAMILY_GLYPH).filter(([k, g]) => k !== 'k-theory' && g === FAMILY_GLYPH['k-theory'])).toEqual([]);
    const bs = BADGES.filter((b) => b.id.startsWith('tech:k-theory:'));
    expect(bs).toHaveLength(7);
    for (const b of bs) expect(badgeInCourse(b, 'keys'), b.id).toBe(true);
  });
  it('on the keys path from ~1400, after the rootless voicings and the first reharm level; topics on the jazz path at their level', () => {
    const diff = (id: string) => stepCatalogue().find((s) => s.id === id)!.difficulty;
    expect(diff('tech:k-theory-1')).toBeGreaterThanOrEqual(1380);
    expect(diff('tech:k-theory-1')).toBeGreaterThan(diff('tech:voicings-4'));
    expect(diff('tech:k-theory-1')).toBeGreaterThan(diff('tech:k-reharm-4'));
    expect(diff('tech:k-theory-4')).toBeLessThan(1700);
    expect(diff('topic:triad-pairs:1')).toBeGreaterThan(diff('topic:pent-super:1'));
    for (const t of TOPICS) {
      const s = stepCatalogue().find((x) => x.id === `topic:${t}:1`)!;
      expect(s.pack, t).toBe('jazz');
      expect(GLYPHS[TOPIC_GLYPH[t]], t).toBeDefined();
      expect(s.difficulty).toBeGreaterThanOrEqual(1400);
      expect(s.difficulty).toBeLessThanOrEqual(1700);
    }
  });
  it('a lesson for every topic and for the family; takes rate improvising, extensions and reharm', () => {
    for (const u of [...TOPICS.map((t) => `topic:${t}`), 'tech:k-theory']) {
      const l = MINI_LESSONS[UNIT_LESSON[u]];
      expect(l, u).toBeDefined();
      expect(/\p{Extended_Pictographic}/u.test(JSON.stringify(l).replace(/𝄞/g, ''))).toBe(false);
    }
    const tags = (kind: string, hands: 'R' | 'RL') => {
      const d = generate({ family: 'k-theory', kind, key: 0, hands, swing: kind !== 'tp-ust' && kind !== 'tp-cliche' });
      return drillEvents(d, analyzeTake(d, 80, humanTake(d, 80, 6, 1)), '2026-11-14T00:00:00Z', 's', 0).flatMap((e) => e.tags ?? []).map((t) => t.sub);
    };
    expect(tags('tp-pent', 'R')).toContain('improv/vocab');
    expect(tags('tp-ust', 'RL')).toContain('chords/extension');
    expect(tags('tp-cliche', 'RL')).toContain('cadences/reharm');
  });
});
