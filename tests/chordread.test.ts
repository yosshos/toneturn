import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { chordReadItem, chordName } from '../src/engine/topicsChordRead';
import { TOPIC_GEN, asChoice } from '../src/engine/topicKit';
import { TOPIC_TAGS } from '../src/engine/taxonomy';
import { questionTag, renderStimulus } from '../src/engine/lesson';
import { questionFromTag } from '../src/engine/adaptive';
import { parseNamedChoice } from '../src/engine/parser';
import { LESSONS, UNITS } from '../src/content/mini/chordread';

const T = TOPIC_GEN['chord-read'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Pitch class of a spelled name like "E♭", "F♯", "B". */
const pcOfName = (s: string) => mod12(LETTER_PC[s[0]] + (s.includes('♯') ? 1 : 0) - (s.includes('♭') ? 1 : 0) + (s.includes('𝄪') ? 2 : 0) - (s.includes('𝄫') ? 2 : 0));

describe('chord-read topic', () => {
  it('is registered with 7 levels and rising difficulty', () => {
    expect(T.levels).toHaveLength(7);
    const d = T.levels.map((_, i) => T.gen(5, i + 1, 'x').difficulty);
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThan(d[i - 1]);
    expect(d[0]).toBe(900);
    expect(d[6]).toBe(1550);
  });

  it('every item: 4 distinct options, answer among them, names in both languages, parseable, deterministic, rebuildable', () => {
    for (let level = 1; level <= 7; level++)
      for (let seed = 1; seed < 120; seed++) {
        const q = asChoice(T.gen(seed * 7919, level, 'x'));
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(q.answer);
        expect(q.show || q.diagram, `L${level} picture`).toBeTruthy();
        for (const c of q.choices) {
          expect(q.names[c].en && q.names[c].he).toBeTruthy();
          const p = parseNamedChoice(q.names[c].en, q.choices, q.names);
          expect(p.kind === 'answer' ? p.value : p, `L${level} "${c}"`).toBe(c);
          for (const s of q.names[c].say ?? []) {
            const ps = parseNamedChoice(s, q.choices, q.names);
            expect(ps.kind === 'answer' ? ps.value : ps, `L${level} say "${s}"`).toBe(c);
          }
          expect(renderStimulus(q.choiceStim![c]).length).toBeGreaterThan(0);
        }
        expect(T.gen(seed * 7919, level, 'x')).toEqual(q);
        expect(questionFromTag(questionTag(q), 1, 'r')!.answer).toBe(q.answer);
      }
  }, 30_000);

  it('the picture really shows the answer (pitch classes and the bass)', () => {
    for (let level = 1; level <= 7; level++)
      for (let seed = 1; seed < 80; seed++) {
        const q = asChoice(T.gen(seed * 104729, level, 'x'));
        const st = q.choiceStim![q.answer][0];
        expect(st.kind).toBe('chord');
        if (st.kind !== 'chord') continue;
        const midis = q.show?.midis ?? q.diagram?.midis ?? st.midis;
        const bass = Math.min(...midis);
        const [sym, slash] = q.answer.split('/');
        const root = pcOfName(sym.slice(0, /^[A-G][♭♯]/.test(sym) ? 2 : 1));
        if (slash) expect(mod12(bass), `L${level} ${q.answer}`).toBe(pcOfName(slash));
        else if (q.diagram?.kind !== 'neck' && q.diagram?.kind !== 'box') expect(mod12(bass), `L${level} ${q.answer}`).toBe(root);
        // the root is always present
        expect(midis.some((m) => mod12(m) === root), `L${level} ${q.answer}`).toBe(true);
      }
  });

  it('the staff only shows chords it spells right (the flat spelling matches the chord letters)', () => {
    for (let seed = 1; seed < 150; seed++) {
      const q = asChoice(T.gen(seed * 31, 2, 'x'));
      expect(q.show).toBeTruthy();
      expect(q.answer.startsWith('F♯')).toBe(false); // the staff spells pitch class 6 as G♭
    }
  });

  it('levels draw on their pictures', () => {
    const kinds = (l: number) => new Set(Array.from({ length: 60 }, (_, s) => { const q = asChoice(T.gen(s * 13 + 1, l, 'x')); return q.show ? 'staff' : q.diagram!.kind; }));
    expect([...kinds(1)]).toEqual(['keys']);
    expect([...kinds(2)]).toEqual(['staff']);
    expect([...kinds(4)]).toEqual(['staff']);
    expect(kinds(5)).toEqual(new Set(['box', 'neck']));
    expect([...kinds(6)]).toEqual(['keys']);
    expect(kinds(7).size).toBeGreaterThanOrEqual(3);
  });

  it('inversion level: slash chords, with the other inversions as options', () => {
    let slash = 0;
    for (let seed = 1; seed < 60; seed++) {
      const q = asChoice(T.gen(seed * 17, 4, 'x'));
      if (q.answer.includes('/')) slash++;
      const root = q.answer.split('/')[0];
      expect(q.choices.filter((c) => c.split('/')[0] === root).length).toBeGreaterThanOrEqual(2);
    }
    expect(slash).toBeGreaterThan(30);
  });

  it('picture filter (speed games) is respected at every level', () => {
    for (let level = 1; level <= 7; level++)
      for (let seed = 1; seed < 40; seed++) {
        expect(chordReadItem(seed, level, 'x', 'keys').diagram?.kind).toBe('keys');
        expect(chordReadItem(seed, level, 'x', 'staff').show).toBeTruthy();
        expect(['neck', 'box']).toContain(chordReadItem(seed, level, 'x', 'neck').diagram?.kind);
      }
  });

  it('names', () => {
    expect(chordName({ root: 0, q: 'maj', inv: 1 }).en).toBe('C/E');
    expect(chordName({ root: 9, q: 'min', inv: 1 }).en).toBe('Am/C');
    expect(chordName({ root: 11, q: 'dim', inv: 0 }).en).toBe('B°');
    expect(chordName({ root: 7, q: 'dom7', inv: 0 }).en).toBe('G7');
    expect(chordName({ root: 5, q: 'maj7', inv: 0 }).en).toBe('Fmaj7');
    expect(chordName({ root: 3, q: 'min', inv: 1 }).en).toBe('E♭m/G♭');
    expect(chordName({ root: 0, q: 'maj', inv: 0 }).he).toBe('דו מז׳ור');
  });

  it('tags: primary skill = chords, weights sum to 1', () => {
    const t = TOPIC_TAGS['chord-read'];
    for (let l = 1; l <= 7; l++) {
      const tags = typeof t === 'function' ? t(l) : t;
      expect(tags[0].skill).toBe('chords');
      expect(tags.reduce((a, x) => a + x.w, 0)).toBeCloseTo(1);
    }
    expect((t as (l: number) => { sub: string }[])(3)[0].sub).toBe('chords/seventh');
    expect((t as (l: number) => { sub: string }[])(4)[0].sub).toBe('chords/inversion');
  });

  it('has a quick lesson', () => {
    expect(UNITS['topic:chord-read']).toBe('chord-read');
    expect(LESSONS.find((l) => l.id === 'chord-read')).toBeTruthy();
  });
});
