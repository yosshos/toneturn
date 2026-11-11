import { describe, expect, it } from 'vitest';
import { TOPIC_GEN } from '../src/engine/topics';
import { makeLesson, type Answer, type Question } from '../src/engine/lesson';
import { FIXED_LESSONS } from '../src/speech/voice/lines';
import { answerShort, capItems, capWords, giveText } from '../src/game/content';
import { sessionInsight } from '../src/engine/coach';

// 0.69 (owner: a recap row of a 6-bar rhythm listed 24 words): every summary text — the recap row's answer, "your
// answer", the review hint, the coach's tricky pair — stays a few words, whatever the item's size (long sequences,
// sing-seq, name-seq, degree-seq, dictation, staff dictation, progressions, transcription, entered notes).

// (the dashes between note names and the closing "…" are not words)
const words = (s: string) => s.split(/\s+/).filter((w) => w && w !== '–' && w !== '…').length;
// describeShort: up to 4 groups ("dotted quarter ×3, …"), so a rhythm may take a dozen short words.
const MAX_WORDS = 14;
const MAX_CHARS = 72;

function* everyQuestion(): Generator<{ q: Question; where: string }> {
  for (const [topic, T] of Object.entries(TOPIC_GEN))
    for (let level = 1; level <= T.levels.length; level++)
      for (let seed = 1; seed <= 6; seed++) yield { q: T.gen(seed * 7919, level, 'x'), where: `${topic} L${level}` };
  for (const id of FIXED_LESSONS)
    for (let seed = 1; seed <= 4; seed++) for (const q of makeLesson(id, seed).questions) yield { q, where: id };
}

/** A wrong answer of the item's own shape (a longer one where the shape allows it). */
function wrongOf(q: Question): Answer {
  if (q.kind === 'place') return [...String(q.answer).split('.'), ...String(q.answer).split('.')].join('.');
  if (q.kind === 'degree-seq') return [...q.answer.split('-'), ...q.answer.split('-')].join('-');
  if (q.kind === 'name-seq') return [...q.answer.split('.'), ...q.answer.split('.')].join('.');
  const other = (q.choices as Answer[]).find((c) => String(c) !== String(q.answer));
  return other ?? q.answer;
}

describe('summary texts stay short', () => {
  it('caps', () => {
    expect(capItems(['1', '2', '3'])).toBe('1 2 3');
    expect(capItems('1 2 3 4 5 6 7 8'.split(' '))).toBe('1 2 3 4 5 6 …');
    expect(capWords('one two three')).toBe('one two three');
    expect(capWords('a b c d e f g h i j')).toBe('a b c d e f g h …');
  });

  it('every question kind: the recap answer, the given answer and the review hint are a few words', () => {
    const seen = new Set<string>();
    const bad: string[] = [];
    for (const { q, where } of everyQuestion()) {
      seen.add(q.kind);
      for (const lang of ['en', 'he'] as const) {
        const texts = [answerShort(q, q.answer, lang, 'letter'), answerShort(q, q.answer, lang, 'solfege'), giveText(q, wrongOf(q), lang, 'letter'), giveText(q, q.answer, lang, 'letter')];
        for (const t of texts) if (words(t) > MAX_WORDS || t.length > MAX_CHARS) bad.push(`${where} (${q.kind}, ${lang}): ${t}`);
      }
    }
    expect(bad.slice(0, 12)).toEqual([]);
    // the sweep reached the kinds that grow with the item
    for (const k of ['place', 'degree-seq', 'name-seq', 'sing-seq', 'rhythm-read', 'rhythm-dict', 'choice']) expect(seen, k).toContain(k);
  });

  it('entered notes read as note names, not raw keys', () => {
    for (const { q } of everyQuestion()) {
      if (q.kind !== 'place') continue;
      const t = answerShort(q, q.answer, 'en');
      expect(t, q.answer).not.toMatch(/\d{2}|:/);
    }
  });

  it("the coach's tricky pair is never a pair of whole sequences", () => {
    const q = makeLesson('note-sequences', 3).questions.find((x) => x.kind === 'degree-seq' || x.kind === 'name-seq')!;
    expect(q).toBeTruthy();
    const given = wrongOf(q);
    const ins = sessionInsight([q], [{ q: 0, given }, { q: 0, given }], 0, 1, 'en', null);
    expect(ins.kind).toBe('encourage');
    expect(words(ins.text)).toBeLessThan(25);
  });
});
