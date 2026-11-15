// Melody against harmony, by ear (docs/AUDIT-DEPTH-3.md C1 / C3): the ear twin of the head drills (headDrills.ts).
//   melody-fit  1 a chord, then a melody note on top: a chord tone, a tension, or a clash? (the reharm studio's rule)
//               2 a head's four bars, as written and then reharmonised: which device? (tritone sub, extra ii–V,
//                 backdoor, passing dim, line cliché — the same app reharm the drills play)
//               3 the same, but where: which bar did the reharm change?
// Pure, seeded generators like every topic. Only original heads are used (src/content/heads.ts servedHeads()).

import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { servedHeads } from '../content/heads';
import { headIn } from './heads';
import { applyPlan, autoPlan, deviceBars, barsOf, roleOf, DEVICE_NAME, type Device, type Role } from './reharm';
import { parseChart } from './charts';
import { voice, type Voiced } from './drills/chartDrills';

type Names = ChoiceQuestion['names'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
type Ev = { midi: number; start: number; duration: number; velocity: number };
const evs = (e: Ev[], length: number): Stimulus => ({ kind: 'events', events: e, length });

// ---------------------------------------------------------------- level 1: chord tone, tension or clash

const QUALS: { iv: number[]; ch: number[]; ten: number[]; av: number[] }[] = [
  { iv: [0, 4, 7, 11], ch: [0, 4, 7, 11], ten: [2, 6, 9], av: [5, 1, 8] }, // maj7
  { iv: [0, 3, 7, 10], ch: [0, 3, 7, 10], ten: [2, 5, 9], av: [4, 11, 1] }, // m7
  { iv: [0, 4, 7, 10], ch: [0, 4, 7, 10], ten: [1, 2, 3, 6, 8, 9], av: [5, 11] }, // 7
];
const ROLE_NAME: Record<Role, ReturnType<typeof nm>> = {
  chord: nm('Chord tone', 'צליל אקורד', 'chord tone'),
  tension: nm('Tension', 'מתח', 'tension'),
  avoid: nm('Clash', 'התנגשות', 'clash', 'avoid note'),
};
function fitStim(root: number, iv: number[], top: number): Stimulus[] {
  const bass = 36 + mod12(root - 36);
  const chord = iv.map((i) => 55 + mod12(root + i - 55)).sort((a, b) => a - b);
  const e: Ev[] = [{ midi: bass, start: 0, duration: 2.4, velocity: 0.55 }, ...chord.map((m) => ({ midi: m, start: 0, duration: 2.4, velocity: 0.45 })), { midi: top, start: 0.6, duration: 1.8, velocity: 0.8 }];
  return [evs(e, 2.6)];
}

// ---------------------------------------------------------------- level 2: which device

const DEVS: Device[] = ['tritone', 'iiV', 'backdoor', 'pdim', 'cliche'];
/** Four bars of a head (from bar b0) as LH shells + the melody (♩ = 132). */
function phraseStim(text: string, notes: { pitch: number; beat: number; dur: number }[], b0: number): Stimulus {
  const sec = 60 / 132;
  const out: Ev[] = [];
  let prev: Voiced | null = null;
  for (const c of parseChart(text).chords.filter((x) => x.bar >= b0 && x.bar < b0 + 4)) {
    const v = voice(c, 'shell', prev);
    prev = v;
    for (const m of v.lh) out.push({ midi: m, start: (c.bar * 4 + c.at - b0 * 4) * sec, duration: c.beats * sec * 0.9, velocity: 0.5 });
  }
  for (const n of notes.filter((x) => x.beat >= b0 * 4 && x.beat < b0 * 4 + 16)) out.push({ midi: n.pitch, start: (n.beat - b0 * 4) * sec, duration: n.dur * sec * 0.95, velocity: 0.75 });
  return evs(out, 16 * sec + 0.5);
}

TOPIC_GEN['melody-fit'] = {
  title: { en: 'Melody against the chords', he: 'המנגינה מול האקורדים' },
  skill: 'cadences',
  levels: [
    { en: 'Chord tone, tension or clash?', he: 'צליל אקורד, מתח או התנגשות?' },
    { en: 'A head reharmonised: which device?', he: 'שיר בהרמון חדש: איזו תחבולה?' },
    { en: 'Which bar changed?', he: 'איזו תיבה השתנתה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    if (level <= 1) {
      const q = pickR(rnd, QUALS);
      const root = pickR(rnd, [0, 2, 3, 5, 7, 8, 10]);
      const answer: Role = pickR(rnd, ['chord', 'tension', 'avoid'] as Role[]);
      const deg = pickR(rnd, answer === 'chord' ? q.ch.slice(1) : answer === 'tension' ? q.ten : q.av);
      const top = 72 + mod12(root + deg - 72);
      // The rule the drills use decides the answer (roleOf), so the question can never disagree with the studio.
      const role = roleOf(top, { root, iv: q.iv });
      const names: Names = { chord: ROLE_NAME.chord, tension: ROLE_NAME.tension, avoid: ROLE_NAME.avoid };
      return choiceQ({
        id, topic: 'melody-fit', level, seed, skill: 'cadences', difficulty: 1320,
        ask: { en: 'A chord, then a melody note on top. How does the note sit?', he: 'אקורד, ואז צליל מנגינה מעליו. איך הצליל יושב?' },
        names, answer: role, choices: ['chord', 'tension', 'avoid'], stimulus: fitStim(root, q.iv, top),
      });
    }
    // Level 2: four bars of an original head, as written, then with one device the app's reharm can use there.
    const heads = servedHeads();
    for (let tries = 0; tries < 40; tries++) {
      const h = pickR(rnd, heads);
      const hi = headIn(h, h.home.key);
      const bars = barsOf(hi.text);
      const b0 = 4 * Math.floor(rnd() * Math.floor(bars.length / 4));
      const opts = DEVS.filter((d) => [0, 1, 2, 3].some((k) => b0 + k < bars.length && deviceBars(bars, b0 + k, d, hi.tonic)));
      if (!opts.length) continue;
      const dev = pickR(rnd, opts);
      const plan = autoPlan(hi.text, hi.tonic, [dev], hi.notes);
      const inPhrase = Object.keys(plan).map(Number).filter((b) => b >= b0 && b < b0 + 4);
      if (!inPhrase.length) continue;
      const only = Object.fromEntries(inPhrase.map((b) => [b, dev]));
      const r = applyPlan(hi.text, only, hi.tonic, hi.notes);
      if (r.conflicts.length) continue;
      const stimulus: Stimulus[] = [phraseStim(hi.text, hi.notes, b0), { kind: 'rest', duration: 0.6 }];
      if (level >= 3) {
        // One bar only: the first the plan changed in this phrase.
        const bar = inPhrase[0];
        const r1 = applyPlan(hi.text, { [bar]: dev }, hi.tonic, hi.notes);
        const names: Names = Object.fromEntries([0, 1, 2, 3].map((k) => [`b${k + 1}`, nm(`Bar ${k + 1}`, `תיבה ${k + 1}`, `bar ${k + 1}`)]));
        const span = r1.changed.filter((b) => b >= b0 && b < b0 + 4);
        if (span.length !== 1) continue;
        return choiceQ({
          id, topic: 'melody-fit', level, seed, skill: 'cadences', difficulty: 1640,
          ask: { en: 'Four bars as written, then with one bar reharmonised. Which bar changed?', he: 'ארבע תיבות כפי שנכתבו, ואז עם תיבה אחת בהרמון חדש. איזו תיבה השתנתה?' },
          names, answer: `b${span[0] - b0 + 1}`, choices: ['b1', 'b2', 'b3', 'b4'], stimulus: [...stimulus, phraseStim(r1.text, hi.notes, b0)],
        });
      }
      const choices = shuffleR(rnd, [dev, ...shuffleR(rnd, DEVS.filter((d) => d !== dev)).slice(0, 3)]);
      const names: Names = Object.fromEntries(choices.map((d) => [d, nm(DEVICE_NAME[d].en, DEVICE_NAME[d].he)]));
      return choiceQ({
        id, topic: 'melody-fit', level, seed, skill: 'cadences', difficulty: 1560,
        ask: { en: 'Four bars as written, then reharmonised. Which device changed them?', he: 'ארבע תיבות כפי שנכתבו, ואז בהרמון חדש. איזו תחבולה שינתה אותן?' },
        names, answer: dev, choices, stimulus: [...stimulus, phraseStim(r.text, hi.notes, b0)],
      });
    }
    throw new Error('melody-fit: no phrase to reharmonise');
  },
};
TOPIC_TAGS['melody-fit'] = (l) => (l >= 2 ? tg(['cadences', 'reharm', 0.8], ['chords', 'voicing', 0.2]) : tg(['cadences', 'reharm', 0.6], ['chords', 'voicing', 0.4]));
