// Solo jazz piano by ear (docs/research/SISKIND-SOLO-PIANO.md C1, C2, C3 "Ear counterparts"): the ear twins of the
// k-lh, k-tex and k-comp drills. Every stimulus is built by src/engine/soloPiano.ts, the same music the drills play; the
// melodies are the app's original heads only (src/content/heads.ts). Jazz & improv course (pack 'jazz').
//   lh-tex-ear       1 shell or 10th?  2 name the left hand (stride / shell stride / walking 10ths / bass in 2 /
//                    shuttle)  3 where's the anticipation? (which bar's bass comes early)
//   solo-tex-ear     name the texture: 1 melody + bass / shell stride / stride  2 RH shuttle / drape / closed position
//                    3 shared hands / repeated-quarter ballad / stop-start rubato
//   comp-rhythm-ear  which comping rhythm? 1 Charleston / reverse / Beat-3 Charleston  2 Count Basie / push-off /
//                    lead-in  3 Red Garland / two-bar pattern / anticipation

import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { servedHeads } from '../content/heads';
import { headIn, chordKind } from './heads';
import { bpShell, chordAt, guideShell, pitchIn, sharedVoicing, shellA, shuttle, SQI, stridePattern, thumbOf, walkingTenths, type LEv, type SQ, type TChord } from './soloPiano';

type Names = ChoiceQuestion['names'];
type Ev = { midi: number; start: number; duration: number; velocity: number };
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const evs = (e: Ev[], length: number): Stimulus => ({ kind: 'events', events: e, length });
/** Beat-timed notes → events at a tempo (swung "ands" at 2/3 of the beat; `rubato` stretches each onset a little). */
function render(notes: { beat: number; dur: number; ps: number[]; vel?: number }[], bpm: number, swing = true, rubato = 0, rnd?: () => number): Stimulus {
  const sec = 60 / bpm;
  const at = (b: number) => {
    const w = Math.floor(b + 1e-6);
    const f = b - w;
    return (w + (swing && Math.abs(f - 0.5) < 1e-6 ? 2 / 3 : f)) * sec;
  };
  let drift = 0;
  const out: Ev[] = [];
  let lastBeat = -1;
  for (const n of [...notes].sort((a, b) => a.beat - b.beat)) {
    if (rubato && rnd && n.beat !== lastBeat) drift += (rnd() - 0.3) * rubato * sec;
    lastBeat = n.beat;
    for (const p of n.ps) out.push({ midi: p, start: Math.max(0, at(n.beat) + drift), duration: Math.max(0.12, n.dur * sec * 0.92), velocity: n.vel ?? 0.6 });
  }
  const end = Math.max(...out.map((e) => e.start + e.duration));
  return evs(out, end + 0.4);
}
const lhNotes = (e: LEv[]) => e.map((x) => ({ beat: x.beat, dur: x.dur, ps: x.notes, vel: x.role === 'bass' ? 0.62 : 0.5 }));
const QUAL_OF = (iv: number[]): SQ => {
  const has = (x: number) => iv.some((i) => mod12(i) === x);
  const k = chordKind(iv);
  return k === 'maj' ? (has(9) && !has(11) ? '6' : 'maj7') : k === 'min' || k === 'mmaj' ? 'm7' : k === 'dom' ? '7' : k === 'half' ? 'm7b5' : 'dim7';
};
/** ii–V–I–VI in a key, a chord a bar. */
const loop = (key: number): TChord[] => [
  { root: mod12(key + 2), q: 'm7', beat: 0, beats: 4 },
  { root: mod12(key + 7), q: '7', beat: 4, beats: 4 },
  { root: mod12(key), q: 'maj7', beat: 8, beats: 4 },
  { root: mod12(key + 9), q: '7', beat: 12, beats: 4 },
];
/** A head's first phrase in a key: chords and melody (beats from 0). */
function phrase(rnd: () => number, key: number, ballad = false) {
  const hs = servedHeads().filter((h) => (ballad ? h.feel === 'ballad' : h.feel === 'swing'));
  const h = pickR(rnd, hs.length ? hs : servedHeads());
  const hi = headIn(h, key, 'piano');
  const cs: TChord[] = hi.chords.filter((c) => c.bar < 4).map((c) => ({ root: mod12(c.root), q: QUAL_OF(c.iv), beat: c.bar * 4 + c.at, beats: c.beats }));
  const mel = hi.notes.filter((n) => n.beat < 16);
  return { h, cs, mel };
}
const melNotes = (mel: { beat: number; dur: number; pitch: number }[]) => mel.map((m) => ({ beat: m.beat, dur: m.dur, ps: [m.pitch], vel: 0.78 }));

// ---------------------------------------------------------------- left-hand textures

const LH_NAME: Record<string, ReturnType<typeof nm>> = {
  stride: nm('Stride', 'סטרייד', 'stride'),
  sstride: nm('Shell stride', 'סטרייד שלדים', 'shell stride'),
  walk10: nm('Walking 10ths', 'דצימות הולכות', 'walking tenths', 'tenths'),
  two: nm('Bass in 2', 'בס בשתיים', 'bass in two', 'two feel'),
  shuttle: nm('Shuttle', 'שאטל', 'shuttle'),
};
function lhStim(kind: string, key: number): Stimulus {
  const cs = loop(key);
  if (kind === 'stride') return render(lhNotes(stridePattern(cs, 4, 'stride')), 120);
  if (kind === 'sstride') return render(lhNotes(stridePattern(cs, 4, 'shell-stride')), 120);
  if (kind === 'shuttle') return render(lhNotes(shuttle(cs, 4, 0)), 100);
  if (kind === 'walk10') return render(walkingTenths(key, [0, 1, 2, 3, 3, 4, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0]).map((ps, i) => ({ beat: i, dur: 1, ps })), 112);
  // bass in 2: the root on 1, the 5th on 3
  const out: { beat: number; dur: number; ps: number[] }[] = [];
  for (const c of cs) {
    out.push({ beat: c.beat, dur: 2, ps: [pitchIn(c.root, 33)] });
    out.push({ beat: c.beat + 2, dur: 2, ps: [pitchIn(c.root + SQI[c.q].fifth, 28)] });
  }
  return render(out, 120);
}

TOPIC_GEN['lh-tex-ear'] = {
  title: { en: 'The solo left hand by ear', he: 'יד שמאל של סולו בשמיעה' },
  skill: 'chords',
  levels: [
    { en: 'Shell or 10th?', he: 'שלד או דצימה?' },
    { en: 'Name the left hand', he: 'מה עושה יד שמאל?' },
    { en: 'Where is the anticipation?', he: 'איפה ההקדמה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const base = { id, topic: 'lh-tex-ear', level, seed, skill: 'chords' as const };
    if (level === 1) {
      // [PSJP-B] two-note shells: root + 3rd (close) or root + 10th (wide, lower bass)
      const cs = loop(key).slice(0, 3);
      const stim = (f: '3' | '10') => [render(cs.map((c) => ({ beat: c.beat, dur: 4, ps: bpShell(c, f) })), 90, false)];
      const ans = rnd() < 0.5 ? '3' : '10';
      const names: Names = { '3': nm('Root + 3rd', 'יסוד + טרצה', 'third', 'shell'), '10': nm('Root + 10th', 'יסוד + דצימה', 'tenth') };
      return choiceQ({ ...base, difficulty: 1000, ask: { en: 'A ii–V–I in two-note shells: the 3rd or the 10th?', he: 'ii–V–I בשלדים של שני צלילים: טרצה או דצימה?' }, names, answer: ans, choices: ['3', '10'], stimulus: stim(ans), choiceStim: { '3': stim('3'), '10': stim('10') } });
    }
    if (level === 2) {
      const ks = Object.keys(LH_NAME);
      const ans = pickR(rnd, ks);
      const choices = shuffleR(rnd, [ans, ...shuffleR(rnd, ks.filter((k) => k !== ans)).slice(0, 3)]);
      const names: Names = Object.fromEntries(choices.map((k) => [k, LH_NAME[k]]));
      const diff: Record<string, number> = { stride: 1100, two: 1150, sstride: 1250, walk10: 1400, shuttle: 1500 };
      return choiceQ({ ...base, difficulty: diff[ans], ask: { en: 'Four bars of left hand: which pattern?', he: 'ארבע תיבות של יד שמאל: איזו תבנית?' }, names, answer: ans, choices, stimulus: [lhStim(ans, key)], choiceStim: Object.fromEntries(choices.map((k) => [k, [lhStim(k, key)]])) });
    }
    // level 3: stride with the bass of one bar anticipated on the "and" of 4 before it [7SS] — which bar?
    const cs = loop(key);
    const bar = 1 + Math.floor(rnd() * 3);
    const plain = stridePattern(cs, 4, 'stride');
    const early = stridePattern(cs, 4, 'antic-bass').filter((e) => e.role === 'bass' && Math.abs(e.beat - (bar * 4 - 0.5)) < 1e-6);
    const notes = [...plain.filter((e) => !(e.role === 'bass' && Math.abs(e.beat - bar * 4) < 1e-6)), ...early];
    const names: Names = { b2: nm('Bar 2', 'תיבה 2', 'two', 'bar two'), b3: nm('Bar 3', 'תיבה 3', 'three', 'bar three'), b4: nm('Bar 4', 'תיבה 4', 'four', 'bar four') };
    return choiceQ({ ...base, difficulty: 1400, ask: { en: 'Stride: which bar’s bass comes early?', he: 'סטרייד: הבס של איזו תיבה מגיע מוקדם?' }, names, answer: `b${bar + 1}`, choices: ['b2', 'b3', 'b4'], stimulus: [render(lhNotes(notes), 108)] });
  },
};
TOPIC_TAGS['lh-tex-ear'] = tg(['chords', 'voicing', 1]);

// ---------------------------------------------------------------- solo-piano textures

const TEX_NAME: Record<string, ReturnType<typeof nm>> = {
  bass: nm('Melody + bass notes', 'מנגינה + בס', 'bass notes'),
  sstride: nm('Shell stride', 'סטרייד שלדים', 'shell stride'),
  stride: nm('Stride', 'סטרייד', 'stride'),
  shuttle: nm('RH shuttle', 'שאטל ביד ימין', 'shuttle'),
  drape: nm('RH drape', 'עטיפה ביד ימין', 'drape'),
  closed: nm('Closed position', 'מצב צמוד', 'closed', 'block chords'),
  shared: nm('Shared hands', 'שתי ידיים', 'shared hands'),
  repq: nm('Repeated quarters', 'רבעים חוזרים', 'repeated quarters'),
  stop: nm('Stop-start rubato', 'רובאטו עצור־וזז', 'rubato'),
};
function texStim(kind: string, p: ReturnType<typeof phrase>, rnd: () => number): Stimulus {
  const { cs, mel } = p;
  const m = melNotes(mel);
  if (kind === 'bass') return render([...m, ...cs.flatMap((c) => [0, 2].filter((b) => b < c.beats).map((b) => ({ beat: c.beat + b, dur: 2, ps: [pitchIn(c.root, 33)] })))], 112);
  if (kind === 'stride' || kind === 'sstride') return render([...m, ...lhNotes(stridePattern(cs, 4, kind === 'stride' ? 'stride' : 'shell-stride'))], 112);
  if (kind === 'shuttle' || kind === 'drape') {
    const two = cs.flatMap((c) => [0, 2].filter((b) => b < c.beats).map((b) => ({ beat: c.beat + b, dur: 2, ps: [b === 0 ? pitchIn(c.root, 33) : pitchIn(c.root + SQI[c.q].fifth, 28)] })));
    const rh = mel.flatMap((x) => {
      const c = chordAt(cs, x.beat);
      if (kind === 'drape') return [{ beat: x.beat, dur: x.dur, ps: [x.pitch, x.pitch - (mod12(x.pitch - (c.root + SQI[c.q].third)) || 12)], vel: 0.7 }];
      return x.dur >= 2 ? [{ beat: x.beat, dur: 1, ps: [x.pitch], vel: 0.78 }, { beat: x.beat + 1.5, dur: 0.5, ps: guideShell(c, null).map((q) => q + 12), vel: 0.5 }] : [{ beat: x.beat, dur: x.dur, ps: [x.pitch], vel: 0.78 }];
    });
    return render([...two, ...rh], 112);
  }
  if (kind === 'closed') {
    // RH four notes down from the melody (the chord's tones), LH the melody an octave lower
    return render(mel.map((x) => {
      const c = chordAt(cs, x.beat);
      const tones = [0, SQI[c.q].third, SQI[c.q].fifth, SQI[c.q].seventh].map((i) => mod12(c.root + i)).filter((q) => q !== mod12(x.pitch));
      const below = tones.map((q) => x.pitch - (mod12(x.pitch - q) || 12)).sort((a, b) => b - a).slice(0, 3);
      return { beat: x.beat, dur: x.dur, ps: [x.pitch, ...below, x.pitch - 12], vel: 0.62 };
    }), 112);
  }
  // ballads: shared voicings on each chord; repeated quarters on the LH thumb; stop-start = rubato, chord then melody
  const out: { beat: number; dur: number; ps: number[]; vel?: number }[] = [];
  let prev: number[] | null = null;
  for (const c of cs) {
    const first = mel.find((x) => Math.abs(x.beat - c.beat) < 1e-6);
    const v: number[] | null = first ? sharedVoicing(c, first.pitch - (first.pitch > 72 ? 12 : 0), prev) : null;
    const lo = v ?? shellA(c);
    prev = v ?? prev;
    out.push({ beat: c.beat, dur: c.beats, ps: lo, vel: 0.5 });
    if (kind === 'repq' && v) for (let b = c.beat + 1; b < c.beat + c.beats; b++) out.push({ beat: b, dur: 1, ps: [thumbOf(v)], vel: 0.42 });
  }
  const shift = mel.some((x) => x.pitch > 72) ? -12 : 0;
  return render([...out, ...mel.map((x) => ({ beat: x.beat, dur: x.dur, ps: [x.pitch + shift], vel: 0.78 }))], 60, false, kind === 'stop' ? 0.9 : 0, rnd);
}

TOPIC_GEN['solo-tex-ear'] = {
  title: { en: 'Solo-piano textures by ear', he: 'מרקמי פסנתר סולו בשמיעה' },
  skill: 'chords',
  levels: [
    { en: 'Bass, shell stride or stride?', he: 'בס, סטרייד שלדים או סטרייד?' },
    { en: 'Shuttle, drape or closed position?', he: 'שאטל, עטיפה או מצב צמוד?' },
    { en: 'Which ballad style?', he: 'איזה סגנון בלדה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const sets = [['bass', 'sstride', 'stride'], ['shuttle', 'drape', 'closed'], ['shared', 'repq', 'stop']];
    const set = sets[level - 1] ?? sets[0];
    const p = phrase(rnd, key, level === 3);
    const ans = pickR(rnd, set);
    const names: Names = Object.fromEntries(set.map((k) => [k, TEX_NAME[k]]));
    const diff = [1200, 1450, 1700][level - 1] ?? 1200;
    const s = (k: string) => [texStim(k, p, rng(seed + 7))];
    return choiceQ({ ...{ id, topic: 'solo-tex-ear', level, seed, skill: 'chords' as const }, difficulty: diff, ask: { en: `${p.h.title.en}: which texture?`, he: `${p.h.title.he}: איזה מרקם?` }, names, answer: ans, choices: shuffleR(rnd, set.slice()), stimulus: s(ans), choiceStim: Object.fromEntries(set.map((k) => [k, s(k)])) });
  },
};
TOPIC_TAGS['solo-tex-ear'] = tg(['chords', 'voicing', 1]);

// ---------------------------------------------------------------- comping rhythms

const RHY: Record<string, { name: ReturnType<typeof nm>; bars: { at: number; next?: boolean }[][] }> = {
  charleston: { name: nm('Charleston', 'צ׳רלסטון', 'charleston'), bars: [[{ at: 0 }, { at: 1.5 }]] },
  reverse: { name: nm('Reverse Charleston', 'צ׳רלסטון הפוך', 'reverse'), bars: [[{ at: 0.5 }, { at: 2 }]] },
  beat3: { name: nm('Beat-3 Charleston', 'צ׳רלסטון מ־3', 'beat three'), bars: [[{ at: 2 }, { at: 3.5 }]] },
  basie: { name: nm('Count Basie', 'קאונט בייסי', 'basie'), bars: [[{ at: 1 }, { at: 3 }]] },
  pushoff: { name: nm('Push-off', 'פוש־אוף', 'push off'), bars: [[{ at: 1 }, { at: 3 }, { at: 3.5 }]] },
  leadin: { name: nm('Lead-in', 'כניסה מקדימה', 'lead in'), bars: [[{ at: 0 }, { at: 3, next: true }]] },
  garland: { name: nm('Red Garland', 'רד גרלנד', 'garland'), bars: [[{ at: 1.5 }, { at: 3.5, next: true }]] },
  twobar: { name: nm('Two-bar pattern', 'תבנית דו־תיבתית', 'two bar'), bars: [[{ at: 0 }, { at: 1.5 }], [{ at: 0.5 }, { at: 2 }]] },
  anticip: { name: nm('Anticipation', 'הקדמה', 'anticipation'), bars: [[{ at: 0 }, { at: 3.5, next: true }]] },
};
function rhyStim(id: string, key: number): Stimulus {
  const cs = loop(key);
  const out: { beat: number; dur: number; ps: number[]; vel?: number }[] = [];
  let prev: number[] | null = null;
  const P = RHY[id].bars;
  for (let bar = 0; bar < 4; bar++)
    for (const h of P[bar % P.length]) {
      if (h.next && bar === 3) continue;
      const c = chordAt(cs, h.next ? (bar + 1) * 4 : bar * 4 + h.at);
      const v = guideShell(c, prev);
      prev = v;
      out.push({ beat: bar * 4 + h.at, dur: 0.5, ps: [...v, v[0] + 12 + (mod12(c.root + SQI[c.q].ninth - v[0]))], vel: 0.55 });
    }
  // a walking bass on the click (roots and 5ths, quarters) so the rhythm sits against the time
  for (const c of cs) [0, 1, 2, 3].forEach((b) => out.push({ beat: c.beat + b, dur: 1, ps: [b % 2 === 0 ? pitchIn(c.root, 33) : pitchIn(c.root + SQI[c.q].fifth, 28)], vel: 0.45 }));
  return render(out, 120);
}

TOPIC_GEN['comp-rhythm-ear'] = {
  title: { en: 'Comping rhythms by ear', he: 'מקצבי ליווי בשמיעה' },
  skill: 'rhythm-dictation',
  levels: [
    { en: 'Charleston, reverse or Beat-3?', he: 'צ׳רלסטון, הפוך או מ־3?' },
    { en: 'Basie, push-off or lead-in?', he: 'בייסי, פוש־אוף או כניסה מקדימה?' },
    { en: 'Red Garland, two-bar or anticipation?', he: 'רד גרלנד, דו־תיבתי או הקדמה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const sets = [['charleston', 'reverse', 'beat3'], ['basie', 'pushoff', 'leadin'], ['garland', 'twobar', 'anticip']];
    const set = sets[level - 1] ?? sets[0];
    const ans = pickR(rnd, set);
    const names: Names = Object.fromEntries(set.map((k) => [k, RHY[k].name]));
    return choiceQ({ ...{ id, topic: 'comp-rhythm-ear', level, seed, skill: 'rhythm-dictation' as const }, difficulty: [1000, 1200, 1400][level - 1] ?? 1000, ask: { en: 'Four bars of comping: which rhythm?', he: 'ארבע תיבות של ליווי: איזה מקצב?' }, names, answer: ans, choices: shuffleR(rnd, set.slice()), stimulus: [rhyStim(ans, key)], choiceStim: Object.fromEntries(set.map((k) => [k, [rhyStim(k, key)]])) });
  },
};
TOPIC_TAGS['comp-rhythm-ear'] = tg(['rhythm-dictation', 'syncopation', 1]);
