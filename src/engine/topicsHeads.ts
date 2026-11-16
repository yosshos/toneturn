// Melody against harmony, by ear (docs/AUDIT-DEPTH-3.md C1 / C3): the ear twin of the head drills (headDrills.ts).
//   melody-fit  1 a chord, then a melody note on top: a chord tone, a tension, or a clash? (the reharm studio's rule)
//               2 a head's four bars, as written and then reharmonised: which device? (tritone sub, extra ii–V,
//                 backdoor, passing dim, line cliché — the same app reharm the drills play)
//               3 the same, but where: which bar did the reharm change?
//               4 (C1) a block under a melody note: the 6th chord or its diminished? (the 6-dim blocks of k-harm 9–12:
//                 the bar's chord as its 6th chord — Dm7 = F6, G7 → Dm6 — and the dim a half step under its root)
//               5 (#1) a head's phrase as a single line, in 6-dim blocks (close, the melody on top) or in drop-2 blocks?
// Pure, seeded generators like every topic. Only original heads are used (src/content/heads.ts servedHeads()).

import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { servedHeads } from '../content/heads';
import { headIn, harmEvents, HARM_STYLES, sixDimUnder } from './heads';
import { optimalPath, type VLGoal } from './drills/voiceLead';
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

// ---------------------------------------------------------------- level 4: 6th chord or dim under the note

const SIX_CHARTS = ['maj7', 'm7', '7'];
/** A close block (4 notes, the melody on top) of a 6th chord or a dim under a melody note, over the chart root. */
function blockStim(chartRoot: number, chartQ: string, melody: number, prelude: number | null): Stimulus[] {
  const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const c = parseChart(`${names[chartRoot]}${chartQ}`).chords[0];
  const out: Ev[] = [];
  const bass = 36 + mod12(chartRoot - 36);
  const block = (m: number, t: number, d: number) => {
    const u = sixDimUnder(m, c)!;
    const iv = u.q === 'dim7' ? [0, 3, 6, 9] : u.q === 'm6' ? [0, 3, 7, 9] : [0, 4, 7, 9];
    const tones = iv.map((i) => mod12(u.root + i)).filter((x) => x !== mod12(m));
    const below = tones.map((x) => m - (mod12(m - x) || 12)).sort((a, b) => a - b);
    for (const p of [...below, m]) out.push({ midi: p, start: t, duration: d, velocity: p === m ? 0.75 : 0.45 });
  };
  out.push({ midi: bass, start: 0, duration: prelude !== null ? 2.6 : 1.6, velocity: 0.5 });
  let t = 0;
  if (prelude !== null) {
    block(prelude, 0, 0.9);
    t = 1;
  }
  block(melody, t, 1.5);
  return [evs(out, t + 1.7)];
}

// ---------------------------------------------------------------- level 5: line, blocks or drop 2

/** A head's phrase in a texture: the melody over LH shells, 6-dim close blocks, or 6-dim drop-2 blocks. */
function textureStim(hi: ReturnType<typeof headIn>, phrase: number, texture: 'line' | 'blocks' | 'drop2'): Stimulus {
  const sec = 60 / 120;
  const b0 = phrase * 16;
  const out: Ev[] = [];
  const mel = hi.notes.filter((n) => n.beat >= b0 && n.beat < b0 + 16);
  if (texture === 'line') return phraseStim(hi.text, hi.notes, phrase * 4);
  const style = HARM_STYLES[texture === 'blocks' ? 'sixdim' : 'sixdrop2'];
  const ev = harmEvents(hi, phrase * 4, phrase * 4 + 4, style);
  const g: VLGoal = { chords: ev.map((e) => e.chord), at: ev.map((e) => e.note.beat - b0), type: style.type, tol: style.tol, lo: style.lo, hi: style.hi };
  const path = optimalPath(g);
  for (const n of mel) {
    const k = ev.findIndex((e) => e.note === n);
    const notes = k >= 0 && path[k] ? path[k] : [n.pitch];
    for (const m of notes) out.push({ midi: m, start: (n.beat - b0) * sec, duration: n.dur * sec * 0.95, velocity: m === n.pitch ? 0.75 : 0.42 });
  }
  for (const c of hi.chords.filter((x) => x.bar >= phrase * 4 && x.bar < phrase * 4 + 4)) out.push({ midi: 36 + mod12(c.root - 36), start: (c.bar * 4 + c.at - b0) * sec, duration: c.beats * sec * 0.9, velocity: 0.5 });
  return evs(out, 16 * sec + 0.5);
}
const TEXTURE_NAME: Names = {
  line: nm('A single line', 'קו בודד', 'single line', 'line'),
  blocks: nm('6-dim blocks (close)', 'בלוקים שש-מוקטן (צמודים)', 'blocks', 'block chords', 'locked hands'),
  drop2: nm('Drop-2 blocks', 'בלוקים בדרופ 2', 'drop two', 'drop 2'),
};

TOPIC_GEN['melody-fit'] = {
  title: { en: 'Melody against the chords', he: 'המנגינה מול האקורדים' },
  skill: 'cadences',
  levels: [
    { en: 'Chord tone, tension or clash?', he: 'צליל אקורד, מתח או התנגשות?' },
    { en: 'A head reharmonised: which device?', he: 'שיר בהרמון חדש: איזו תחבולה?' },
    { en: 'Which bar changed?', he: 'איזו תיבה השתנתה?' },
    { en: '6th chord or diminished under the note?', he: 'אקורד שש או מוקטן מתחת לצליל?' },
    { en: 'A line, blocks or drop 2?', he: 'קו, בלוקים או דרופ 2?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    if (level === 4) {
      const root = Math.floor(rnd() * 12);
      const q = pickR(rnd, SIX_CHARTS);
      const names0 = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
      const c = parseChart(`${names0[root]}${q}`).chords[0];
      const answer = pickR(rnd, ['six', 'dim']);
      const pool: number[] = [];
      for (let m = 70; m <= 81; m++) {
        const u = sixDimUnder(m, c);
        if (u && (u.q === 'dim7') === (answer === 'dim')) pool.push(m);
      }
      const melody = pickR(rnd, pool);
      // a 6th-chord block first (a chord tone a step away) sets the sound of the bar
      const pre = [melody - 1, melody + 1, melody - 2, melody + 2, melody - 3, melody + 3].find((m) => m !== melody && !!sixDimUnder(m, c) && sixDimUnder(m, c)!.q !== 'dim7') ?? null;
      const names: Names = { six: nm('The 6th chord', 'אקורד השש', 'sixth', 'six chord'), dim: nm('The diminished', 'המוקטן', 'diminished', 'dim') };
      return choiceQ({
        id, topic: 'melody-fit', level, seed, skill: 'chords', difficulty: 1450,
        ask: { en: 'Blocks under a melody: is the last note harmonised with the 6th chord or the diminished?', he: 'בלוקים מתחת למנגינה: הצליל האחרון מהורמן באקורד השש או במוקטן?' },
        names, answer, choices: ['six', 'dim'], stimulus: blockStim(root, q, melody, pre),
      });
    }
    if (level === 5) {
      const heads = servedHeads();
      const answer = pickR(rnd, ['line', 'blocks', 'drop2'] as const);
      for (let tries = 0; tries < 20; tries++) {
        const h = pickR(rnd, heads);
        const hi = headIn(h, Math.floor(rnd() * 12));
        const phrase = 0;
        if (harmEvents(hi, 0, 4, HARM_STYLES.sixdim).length < 3) continue;
        let stim: Stimulus;
        try {
          stim = textureStim(hi, phrase, answer);
        } catch {
          continue;
        }
        return choiceQ({
          id, topic: 'melody-fit', level, seed, skill: 'chords', difficulty: 1550,
          ask: { en: 'Four bars of a head. How is the melody set?', he: 'ארבע תיבות של שיר. איך המנגינה מעובדת?' },
          names: TEXTURE_NAME, answer, choices: ['line', 'blocks', 'drop2'], stimulus: [stim],
        });
      }
      throw new Error('melody-fit 5: no head to set');
    }
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
        id, topic: 'melody-fit', level, seed, skill: 'cadences', difficulty: 1480,
        ask: { en: 'Four bars as written, then reharmonised. Which device changed them?', he: 'ארבע תיבות כפי שנכתבו, ואז בהרמון חדש. איזו תחבולה שינתה אותן?' },
        names, answer: dev, choices, stimulus: [...stimulus, phraseStim(r.text, hi.notes, b0)],
      });
    }
    throw new Error('melody-fit: no phrase to reharmonise');
  },
};
TOPIC_TAGS['melody-fit'] = (l) => (l >= 4 ? tg(['chords', 'voicing', 0.7], ['cadences', 'reharm', 0.3]) : l >= 2 ? tg(['cadences', 'reharm', 0.8], ['chords', 'voicing', 0.2]) : tg(['cadences', 'reharm', 0.6], ['chords', 'voicing', 0.4]));
