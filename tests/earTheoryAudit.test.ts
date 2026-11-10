// EAR_THEORY_AUDIT (docs/research/EAR_THEORY_AUDIT.md): guards for every generated item of the Ear & theory and the
// Jazz & improv courses, and the fixes found by the audit.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { genTopic, TOPIC_GEN, asChoice, pcNameKey } from '../src/engine/topicKit';
import { courseInput } from '../src/engine/courses';
import { eligible, stepCatalogue, type PathInput } from '../src/engine/path';
import type { ChoiceQuestion } from '../src/engine/lesson';
import { GAME_STEP_GLYPH, LESSON_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { LESSON_MARK, TOPIC_MARK } from '../src/ui/stepMarks';

describe('every step of the ear and jazz paths has its own symbol', () => {
  for (const c of ['ear', 'jazz'] as const) {
    it(`${c}: drawn, and no two kinds of step share one (nor a unit game's)`, () => {
      const seen = new Map<string, string>();
      for (const s of stepCatalogue().filter((x) => eligible(x, courseInput(base, c)))) {
        if (!s.topic && !s.lesson) continue;
        const g = s.topic ? TOPIC_GLYPH[s.topic] : LESSON_GLYPH[s.lesson!];
        const who = s.topic ? `topic ${s.topic}` : `lesson ${s.lesson}`;
        expect(g, who).toBeDefined();
        expect(GLYPHS[g], `${who}: ${g}`).toBeDefined();
        // what the eye sees: the mark's text, or the drawn symbol
        const look = g.startsWith('m:lesson:') ? `text ${LESSON_MARK[g.slice(9)]}` : g.startsWith('m:') ? `text ${TOPIC_MARK[g.slice(2)]}` : g;
        const prev = seen.get(look);
        if (prev && prev !== who) throw new Error(`${who} and ${prev} share ${look}`);
        seen.set(look, who);
      }
      for (const game of Object.values(GAME_STEP_GLYPH)) expect(seen.has(game), `game symbol ${game} ↔ ${seen.get(game)}`).toBe(false);
      expect(seen.size).toBeGreaterThan(c === 'ear' ? 90 : 30);
    });
  }
});

const base: PathInput = {
  track: 'pro', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [],
  packs: ['jazz', 'maqam', 'absolute', 'production', 'post-tonal'], plays: [], minutes: 10, ratings: {}, events: [],
  facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-10T10:00:00Z'),
};
const courseTopicLevels = (c: 'ear' | 'jazz') => {
  const out = new Set<string>();
  for (const s of stepCatalogue()) if (s.topic && eligible(s, courseInput(base, c))) out.add(`${s.topic}:${s.level}`);
  return [...out];
};
/** Emoji, but not the music symbols (♩ ♪ ♭ ♮ ♯) or text arrows. */
const EMOJI = /(?![♩-♯←-⇿])\p{Extended_Pictographic}/u;
// Keys of these levels are opaque ids over shuffled choices (s0 is always right, but the buttons are shuffled).
const OPAQUE = new Set(['two-voice:2', 'two-voice:3', 'bh-six-over:1', 'bh-six-over:2', 'bh-six-over:3', 'bh-convert-2:2']);

describe('every item of the ear and jazz courses is well formed', () => {
  for (const c of ['ear', 'jazz'] as const) {
    it(`${c}: answer offered, labels unique in both languages, no emoji, the answer varies`, () => {
      for (const tl of courseTopicLevels(c)) {
        const [t, l] = tl.split(':');
        const answers = new Set<string>();
        let choiceItems = 0;
        for (let seed = 1; seed <= 40; seed++) {
          const q = genTopic(t, seed * 7919, +l, 'x');
          expect(Number.isFinite(q.difficulty), tl).toBe(true);
          if (q.kind !== 'choice') continue;
          choiceItems++;
          answers.add(q.answer);
          expect(q.choices, tl).toContain(q.answer);
          expect(new Set(q.choices).size, tl).toBe(q.choices.length);
          const en = q.choices.map((k) => q.names[k]?.en);
          const he = q.choices.map((k) => q.names[k]?.he);
          expect(en.every(Boolean) && he.every(Boolean), `${tl} names`).toBe(true);
          expect(new Set(en).size, `${tl} en labels ${en.join(' | ')}`).toBe(en.length);
          expect(new Set(he).size, `${tl} he labels ${he.join(' | ')}`).toBe(he.length);
          expect(EMOJI.test([q.ask.en, q.ask.he, ...en, ...he].join(' ')), `${tl} emoji`).toBe(false);
          expect(q.stimulus.length || q.show || q.text || q.chart || q.diagram, `${tl} nothing to hear or see`).toBeTruthy();
        }
        if (choiceItems >= 20 && !OPAQUE.has(tl)) expect(answers.size, `${tl}: the same answer every time`).toBeGreaterThan(1);
      }
    });
  }
});

describe('audit fixes', () => {
  it('figure-out 1: the tune no longer always ends on 1', () => {
    const ends = new Set(Array.from({ length: 40 }, (_, s) => asChoice(TOPIC_GEN['figure-out'].gen(s * 13, 1, 'x')).answer));
    expect(ends.size).toBeGreaterThan(1);
  });
  it('reharm-swap 2: the changed chord is not always chord 2', () => {
    const at = new Set(Array.from({ length: 60 }, (_, s) => asChoice(TOPIC_GEN['reharm-swap'].gen(s * 17, 2, 'x')).answer));
    expect(at.size).toBeGreaterThan(2);
  });
  it('bh-six-over 3: the candidates play in the buttons’ order, so the right one is not always heard first', () => {
    let firstIsRight = 0;
    for (let s = 1; s <= 40; s++) {
      const q = asChoice(TOPIC_GEN['bh-six-over'].gen(s * 11, 3, 'x'));
      if (q.choices[0] === q.answer) firstIsRight++;
      const markers = q.stimulus.filter((x) => x.kind === 'marker');
      expect(markers.length).toBe(4);
    }
    expect(firstIsRight).toBeLessThan(25);
  });
  it('voice leading is spelled in the key (G major: F♯ leads to G)', () => {
    for (let s = 1; s <= 80; s++) {
      const q = asChoice(TOPIC_GEN['voice-leading'].gen(s, 1, 'x'));
      if (q.ask.en.startsWith('In G major')) expect(q.ask.en).toContain('F♯');
      if (q.ask.en.startsWith('In D major')) expect(q.ask.en).toContain('C♯');
      expect(q.ask.en).not.toMatch(/G♭ in V|D♭ in V/);
    }
    expect(pcNameKey(6, 2)).toBe('F♯');
    expect(pcNameKey(10, 5)).toBe('B♭');
    expect(pcNameKey(5, 6)).toBe('E♯');
  });
  it('Nashville numbers in a sharp key use sharps', () => {
    for (let s = 1; s <= 120; s++) {
      const q = asChoice(TOPIC_GEN['nashville'].gen(s, 2, 'x'));
      const m = /in (D|A|E|G) major/.exec(q.ask.en);
      if (m) expect(q.names[q.answer].en, q.ask.en).not.toMatch(/[A-G]♭/);
    }
  });
  it('chord-read writes minor chords on C♯ and G♯ with sharps', () => {
    for (let s = 1; s <= 300; s++) {
      for (const l of [1, 3, 7]) {
        const q = genTopic('chord-read', s, l, 'x') as ChoiceQuestion;
        for (const k of q.choices) expect(q.names[k].en).not.toMatch(/^(D♭m(?!aj)|A♭m(?!aj)|D♭°|A♭°)/);
      }
    }
  });
  it('circle of fifths: one sharp is singular in Hebrew', () => {
    const labels = Array.from({ length: 80 }, (_, s) => asChoice(TOPIC_GEN['circle-fifths'].gen(s, 1, 'x'))).flatMap((q) => Object.values(q.names).map((n) => n.he));
    expect(labels.some((h) => /^1 /.test(h))).toBe(false);
  });
  it('the progression games name IVmaj7 as such (not "IV7", a dominant)', () => {
    for (let s = 1; s <= 60; s++) {
      for (const l of [2, 3]) {
        const q = asChoice(TOPIC_GEN['next-chord'].gen(s, l, 'x'));
        expect(Object.values(q.names).map((n) => n.en)).not.toContain('IV7');
      }
    }
  });
});
