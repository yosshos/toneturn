import { asChoice } from '../src/engine/topicKit';
// Playtesting (0.36): someone who plays every day must not be able to answer from memory. Every practice topic
// produces many audibly different items (transposition + tempo on top of the generator's own choices).
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import '../src/engine/basics';
import { TOPIC_GEN, genTopic } from '../src/engine/topicKit';
import { renderStimulus } from '../src/engine/lesson';

// Written theory with a small fixed set of facts, and topics that are about absolute pitch or tempo.
const EXEMPT = new Set(['time-signatures', 'voice-leading', 'tempo', 'bh-keys',
  // 0.38: motor drills (repetition is the training; there is no answer to remember) …
  'click-subdivide', 'click-backbeat', 'gap-click', 'tempo-memory', 'poly-tap', 'drum-read', 'sight-tap',
  // … finite instrument geography (7 white keys, 12 frets a string) and fixed reference bands by design.
  'fret-notes', 'string-notes', 'fret-chords', 'fret-scales', 'key-notes', 'tone-hz']);
/** Single levels: tapping the Middle-Eastern cycles (a drill), and "what made it sadder" (4 fixed changes × the music). */
const EXEMPT_LEVEL = new Set(['eastern-rhythm L5', 'mood L4']);

describe('item variety', () => {
  it('every practice topic level yields at least 20 different items in 120 draws', () => {
    const thin: string[] = [];
    for (const [id, def] of Object.entries(TOPIC_GEN)) {
      if (EXEMPT.has(id)) continue;
      def.levels.forEach((_, i) => {
        const seen = new Set<string>();
        for (let s = 1; s <= 120; s++) {
          const q = genTopic(id, s * 7919 + 13, i + 1, 'x');
          const ev = renderStimulus(q.stimulus).events.map((e) => `${e.midi}@${e.start.toFixed(2)}`).join(',');
          // 0.38: what is tapped, placed, sung or processed counts too (rhythm, lanes, clicks, tempo goal, targets, fx).
          const x = q as unknown as Record<string, unknown>;
          const body = JSON.stringify([x.rhythm, x.lanes, x.clicks, x.tempoGoal, x.bpm, x.target, x.given, x.midis, x.prompt, x.interval, q.stimulus.filter((st) => st.kind === 'fx')]);
          seen.add(`${q.answer}|${JSON.stringify('show' in q ? (q.show ?? '') : '')}|${q.choices.join(',')}|${ev}|${'ask' in q ? q.ask.en : ''}|${body}`);
        }
        if (seen.size < 20 && !EXEMPT_LEVEL.has(`${id} L${i + 1}`)) thin.push(`${id} L${i + 1}: ${seen.size}`);
      });
    }
    expect(thin).toEqual([]);
  });

  it('variation keeps the answer and every option consistent (same shift for the question and the options)', () => {
    const q = asChoice(genTopic('polyrhythm', 12345, 1, 'x'));
    const again = genTopic('polyrhythm', 12345, 1, 'x');
    expect(again).toEqual(q); // deterministic per seed
    const a = renderStimulus(q.stimulus).events;
    const opt = renderStimulus(q.choiceStim![String(q.answer)]).events;
    // The right option sounds like the question, cycle for cycle (same tempo).
    const gap = (ev: typeof a) => ev[1].start - ev[0].start;
    expect(gap(opt)).toBeCloseTo(gap(a), 6);
  });
});
