// Owner-approved 2026-11-19: three topics with their own mini-lessons (src/content/mini/postTonal.ts).
// - messiaen-modes (pack post-tonal, after set-classes): Messiaen's modes of limited transposition (postTonal.ts).
// - twelve-tone (pack post-tonal, after messiaen-modes): a row and its forms P, I, R, RI; Pn; the matrix.
// - euclid-rhythms (Ear course, rhythm by ear, after the tresillo and syncopation): Toussaint's E(k, n) (euclid.ts).
// Every number comes from the helpers, never typed in. Pure, seeded.

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, notesStim, eventsStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { MESSIAEN_MODES, inSomeTransposition, isValidRow, noteCount, patternPcs, rowForm, rowMatrix, selfMapAt, transpositionCount, type MessiaenMode, type RowForm } from './postTonal';
import { bjorklund, countOnsets, isRotation, necklaceKey, patternFrom, rotate, TOUSSAINT, type Pattern } from './euclid';

type Names = ChoiceQuestion['names'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const EN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const HE = ['דו', 'רה♭', 'רה', 'מי♭', 'מי', 'פה', 'סול♭', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'];
const num = (n: number) => nm(String(n), String(n), String(n));

// ======================================================================= Messiaen's modes

/** A mode up from `t` and back down (the scale heard). */
const modeScale = (m: MessiaenMode, t: number): Stimulus[] => {
  const pcs = patternPcs(MESSIAEN_MODES[m], 0).map((p) => t + p);
  const up = [...pcs, t + 12];
  return [notesStim(up, 0.26), notesStim(up.slice().reverse().slice(1), 0.26)];
};
const modeName = (m: MessiaenMode) =>
  m === 1 ? nm('Mode 1 (whole-tone)', 'מודוס 1 (טון שלם)', 'mode one', 'whole tone', 'מודוס אחת') : m === 2 ? nm('Mode 2 (octatonic)', 'מודוס 2 (אוקטטוני)', 'mode two', 'octatonic', 'diminished', 'מודוס שתיים') : nm(`Mode ${m}`, `מודוס ${m}`, `mode ${['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][m]}`);
/** The pattern written as its repeating block, e.g. "2 1 1 · 2 1 1 · 2 1 1". */
export function modeBlocks(m: MessiaenMode): string {
  const p = MESSIAEN_MODES[m];
  const reps = 12 / selfMapAt(p);
  const len = p.length / reps;
  return Array.from({ length: reps }, (_, r) => p.slice(r * len, (r + 1) * len).join(' ')).join(' · ');
}

TOPIC_GEN['messiaen-modes'] = {
  title: { en: 'Messiaen: modes of limited transposition', he: 'מסיאן: מודוסים בטרנספוזיציה מוגבלת' },
  skill: 'modes',
  levels: [
    { en: 'Why limited? Modes 1 and 2', he: 'למה מוגבלת? מודוסים 1 ו־2' },
    { en: 'By ear: mode 1, 2 or 3?', he: 'בשמיעה: מודוס 1, 2 או 3?' },
    { en: 'Modes 3–7: notes and transpositions', he: 'מודוסים 3–7: צלילים וטרנספוזיציות' },
    { en: 'By ear: a chord from mode 2 or 3', he: 'בשמיעה: אקורד ממודוס 2 או 3' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'messiaen-modes', level, seed, skill: 'modes' as const };
    if (level === 1) {
      const m = pickR(rnd, [1, 2] as MessiaenMode[]);
      const p = MESSIAEN_MODES[m];
      const t0 = Math.floor(rnd() * 7);
      const show = { midis: patternPcs(p, 0).map((x) => 60 + t0 + x).concat(72 + t0), key: null };
      const label = m === 1 ? { en: 'Mode 1 (whole-tone)', he: 'מודוס 1 (טון שלם)' } : { en: 'Mode 2 (diminished)', he: 'מודוס 2 (מוקטן)' };
      if (rnd() < 0.5) {
        const pool = m === 1 ? [2, 3, 6, 12] : [2, 3, 4, 12];
        return choiceQ({
          ...base, difficulty: m === 1 ? 1600 : 1640,
          ask: { en: `${label.en}: how many transpositions?`, he: `${label.he}: כמה טרנספוזיציות?` },
          names: Object.fromEntries(pool.map((n) => [String(n), num(n)])), answer: String(transpositionCount(p)), choices: pool.map(String), stimulus: [], show,
        });
      }
      const t = pickR(rnd, m === 1 ? [1, 2, 4, 6] : [1, 2, 3, 6]);
      const same = patternPcs(p, t).join() === patternPcs(p, 0).join();
      return choiceQ({
        ...base, difficulty: m === 1 ? 1600 : 1640,
        ask: { en: `${label.en} up ${t} semitone${t > 1 ? 's' : ''}: same notes?`, he: `${label.he} עולה ${t === 1 ? 'חצי טון' : `${t} חצאי טונים`}: אותם צלילים?` },
        names: { same: nm('The same notes', 'אותם צלילים', 'same', 'אותם'), new: nm('New notes', 'צלילים חדשים', 'new', 'different', 'חדשים') },
        answer: same ? 'same' : 'new', choices: ['same', 'new'], stimulus: [], show,
      });
    }
    if (level === 2) {
      const pool: MessiaenMode[] = [1, 2, 3];
      const answer = pickR(rnd, pool);
      const t = 55 + Math.floor(rnd() * 8);
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const m of pool) {
        names[`m${m}`] = modeName(m);
        choiceStim[`m${m}`] = modeScale(m, t);
      }
      return choiceQ({ ...base, difficulty: 1680, ask: { en: 'Which mode?', he: 'איזה מודוס?' }, names, answer: `m${answer}`, choices: pool.map((m) => `m${m}`), stimulus: modeScale(answer, t), choiceStim });
    }
    if (level === 3) {
      const m = pickR(rnd, [3, 4, 5, 6, 7] as MessiaenMode[]);
      const p = MESSIAEN_MODES[m];
      const askNotes = rnd() < 0.5;
      const pool = askNotes ? [6, 8, 9, 10] : [3, 4, 6, 12];
      const answer = askNotes ? noteCount(p) : transpositionCount(p);
      const t = Math.floor(rnd() * 12);
      return choiceQ({
        ...base, difficulty: askNotes ? 1740 : 1780,
        ask: askNotes ? { en: `Mode ${m} on ${EN[t]}: how many notes?`, he: `מודוס ${m} על ${HE[t]}: כמה צלילים?` } : { en: `Mode ${m} on ${EN[t]}: how many transpositions?`, he: `מודוס ${m} על ${HE[t]}: כמה טרנספוזיציות?` },
        text: { en: modeBlocks(m), he: modeBlocks(m) },
        names: Object.fromEntries(pool.map((n) => [String(n), num(n)])), answer: String(answer), choices: pool.map(String), stimulus: [],
      });
    }
    // level 4: four notes from one transposition of mode 2 or 3 that fit no transposition of the other mode
    for (let tries = 0; tries < 200; tries++) {
      const m = pickR(rnd, [2, 3] as MessiaenMode[]);
      const other: MessiaenMode = m === 2 ? 3 : 2;
      const t = Math.floor(rnd() * 12);
      const pcs = shuffleR(rnd, patternPcs(MESSIAEN_MODES[m], t)).slice(0, 4);
      if (inSomeTransposition(pcs, MESSIAEN_MODES[other])) continue;
      const voiced: number[] = [];
      for (const p of pcs.sort((a, b) => a - b)) {
        let x = 48 + mod12(p - 48);
        while (voiced.length && x <= voiced[voiced.length - 1]) x += 12;
        voiced.push(x);
      }
      const stim = (v: number[]): Stimulus[] => [chordStim(v, 1.6), { kind: 'chord', midis: v, duration: 1.6, arpeggio: true }];
      return choiceQ({
        ...base, difficulty: 1850,
        ask: { en: 'Which mode is the chord from?', he: 'מאיזה מודוס האקורד?' },
        names: { m2: modeName(2), m3: modeName(3) }, answer: `m${m}`, choices: ['m2', 'm3'], stimulus: stim(voiced),
        // both modes from the chord's own transposition note (the right one contains the chord)
        choiceStim: { m2: modeScale(2, 48 + mod12(t - 48)), m3: modeScale(3, 48 + mod12(t - 48)) },
      });
    }
    throw new Error('messiaen-modes: no chord found');
  },
};
TOPIC_TAGS['messiaen-modes'] = tg(['modes', 'scales', 0.6], ['chords', 'post-tonal', 0.4]);

// ======================================================================= twelve-tone rows

const FORM_NAMES: Record<Exclude<RowForm, 'P'> | 'Pn', ReturnType<typeof nm>> = {
  Pn: nm('Prime, moved (Pn)', 'המקור, מוזז (Pn)', 'prime', 'transposed', 'מקור'),
  I: nm('Inversion (I)', 'היפוך (I)', 'inversion', 'upside down', 'היפוך'),
  R: nm('Retrograde (R)', 'רטרוגרד (R)', 'retrograde', 'backwards', 'רטרוגרד'),
  RI: nm('Retrograde inversion (RI)', 'רטרוגרד של ההיפוך (RI)', 'retrograde inversion', 'רטרוגרד של ההיפוך'),
};
/** A 4-note cell around middle C whose four forms all differ (as sequences) and stay on the staff. */
function cell(rnd: () => number): number[] {
  for (;;) {
    const c = [62 + Math.floor(rnd() * 6)];
    while (c.length < 4) {
      const step = pickR(rnd, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
      const x = c[c.length - 1] + step;
      if (!c.some((y) => mod12(y) === mod12(x))) c.push(x);
    }
    const forms = cellForms(c, 3);
    const keys = Object.values(forms).map((f) => f.join());
    if (new Set(keys).size === 4 && Object.values(forms).every((f) => f.every((x) => x >= 55 && x <= 79))) return c;
  }
}
const cellForms = (c: number[], move: number): Record<'Pn' | 'I' | 'R' | 'RI', number[]> => ({ Pn: c.map((x) => x + move), I: rowForm(c, 'I'), R: rowForm(c, 'R'), RI: rowForm(c, 'RI') });

TOPIC_GEN['twelve-tone'] = {
  title: { en: 'Twelve-tone rows: P, I, R, RI', he: 'סדרות של 12 צלילים: P, I, R, RI' },
  skill: 'transpose',
  levels: [
    { en: 'On paper: which form?', he: 'בכתב: איזו צורה?' },
    { en: 'By ear: which form?', he: 'בשמיעה: איזו צורה?' },
    { en: 'A valid row?', he: 'סדרה תקינה?' },
    { en: 'The matrix: the missing note', he: 'המטריצה: הצליל החסר' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'twelve-tone', level, seed, skill: 'transpose' as const };
    const keys = ['Pn', 'I', 'R', 'RI'] as const;
    if (level <= 2) {
      const c = cell(rnd);
      const move = pickR(rnd, [-3, -2, 2, 3]);
      const forms = cellForms(c, move);
      // the moved prime must not land on another form
      if (Object.entries(forms).some(([k, f]) => k !== 'Pn' && f.join() === forms.Pn.join())) return TOPIC_GEN['twelve-tone'].gen(seed + 1, level, id);
      const answer = pickR(rnd, keys);
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const k of keys) {
        names[k] = FORM_NAMES[k];
        choiceStim[k] = [notesStim(c, 0.42), { kind: 'rest', duration: 0.5 }, notesStim(forms[k], 0.42)];
      }
      if (level === 1)
        return choiceQ({
          ...base, difficulty: 1700,
          ask: { en: 'Bar 2 is which form of bar 1?', he: 'תיבה 2 היא איזו צורה של תיבה 1?' },
          names, answer, choices: [...keys], stimulus: [], choiceStim,
          show: { midis: [...c, ...forms[answer]], key: null, durs: [1, 1, 1, 1, 1, 1, 1, 1], meter: 4 },
        });
      return choiceQ({
        ...base, difficulty: 1780,
        ask: { en: 'The cell, then which form?', he: 'התא, ואחריו איזו צורה?' },
        names, answer, choices: [...keys], stimulus: choiceStim[answer], choiceStim,
      });
    }
    if (level === 3) {
      const row = shuffleR(rnd, Array.from({ length: 12 }, (_, i) => i));
      const valid = rnd() < 0.5;
      if (!valid) {
        const i = 1 + Math.floor(rnd() * 11);
        let j = Math.floor(rnd() * 12);
        if (j === i) j = (j + 5) % 12;
        row[i] = row[j];
      }
      return choiceQ({
        ...base, difficulty: 1820,
        ask: { en: 'Each of the 12 notes once?', he: 'כל 12 הצלילים, כל אחד פעם אחת?' },
        names: { valid: nm('Yes, a valid row', 'כן, סדרה תקינה', 'yes', 'valid', 'כן'), invalid: nm('No, a note repeats', 'לא, צליל חוזר', 'no', 'invalid', 'לא') },
        answer: isValidRow(row) ? 'valid' : 'invalid', choices: ['valid', 'invalid'], stimulus: [],
        show: { midis: row.map((p) => 60 + p), key: null },
      });
    }
    // level 4: a 4-note cell's matrix — the row that starts on the k-th note of the first column, one note missing
    const c = cell(rnd).map(mod12);
    const M = rowMatrix(c);
    const r = 1 + Math.floor(rnd() * 3);
    const gap = 1 + Math.floor(rnd() * 3);
    const right = M[r][gap];
    const wrongs = [mod12(c[gap]), mod12(2 * c[0] - c[gap]), mod12(right + 1), mod12(right - 1), mod12(right + 2)].filter((x, i, a) => x !== right && a.indexOf(x) === i);
    const pool = shuffleR(rnd, [right, ...wrongs.slice(0, 3)]);
    const line = (xs: number[], L: string[], hole = -1) => xs.map((x, i) => (i === hole ? '?' : L[x])).join(' ');
    const col = M.map((row) => row[0]);
    return choiceQ({
      ...base, difficulty: 1900,
      ask: { en: `The row from ${EN[M[r][0]]}: which note is missing?`, he: `השורה שמתחילה ב${HE[M[r][0]]}: איזה צליל חסר?` },
      text: { en: `P: ${line(c, EN)}  ·  I: ${line(col, EN)}  ·  ${line(M[r], EN, gap)}`, he: `P: ${line(c, HE)}  ·  I: ${line(col, HE)}  ·  ${line(M[r], HE, gap)}` },
      names: Object.fromEntries(pool.map((p) => [`pc${p}`, nm(EN[p], HE[p], EN[p].replace('♭', ' flat'))])), answer: `pc${right}`, choices: pool.map((p) => `pc${p}`), stimulus: [],
    });
  },
};
TOPIC_TAGS['twelve-tone'] = tg(['transpose', 'melodic', 0.6], ['chords', 'post-tonal', 0.4]);

// ======================================================================= Euclidean rhythms

/** Cycles of a pattern: a soft click on every pulse (accent on pulse 1), a low drum on each onset. */
export function cycleStim(p: Pattern, pulse: number, cycles: number): Stimulus {
  const ev: NoteEvent[] = [];
  for (let c = 0; c < cycles; c++)
    [...p].forEach((ch, i) => {
      const t = (c * p.length + i) * pulse;
      ev.push({ midi: 96, start: t, duration: 0.04, velocity: i === 0 ? 0.32 : 0.16, perc: i === 0 ? 'accent' : 'click' });
      if (ch === 'x') ev.push({ midi: 45, start: t, duration: 0.14, velocity: 0.9, perc: 'kick' });
    });
  return eventsStim(ev, cycles * p.length * pulse + 0.2);
}
const pulseOf = (n: number) => (n >= 12 ? 0.17 : 0.22);
/** The same number of onsets, one moved a slot: uneven (not a rotation of E(k, n)). */
function clumped(rnd: () => number, k: number, n: number): Pattern {
  const e = bjorklund(k, n);
  for (let tries = 0; tries < 40; tries++) {
    const on = [...e].map((c, i) => (c === 'x' ? i : -1)).filter((i) => i > 0);
    const o = pickR(rnd, on);
    const to = o + (rnd() < 0.5 ? 1 : -1);
    if (to <= 0 || to >= n || e[to] === 'x') continue;
    const q = patternFrom(n, [...e].map((c, i) => (c === 'x' ? (i === o ? to : i) : -1)).filter((i) => i >= 0));
    if (!isRotation(q, e)) return q;
  }
  return 'x'.repeat(k) + '.'.repeat(n - k);
}
/** Pattern choices named Circle A, B, C, D in their shown order (the keys stay the patterns, drawn as circles). */
function circleNames(order: Pattern[]): Names {
  const he = ['א', 'ב', 'ג', 'ד'];
  return Object.fromEntries(order.map((o, i) => [o, nm(`Circle ${'ABCD'[i]}`, `מעגל ${he[i]}`, 'ABCD'[i], `circle ${'ABCD'[i]}`, `מעגל ${he[i]}`)]));
}
const L1: [number, number][] = [[3, 8], [5, 8], [2, 5], [3, 4], [4, 9], [3, 7]];
const L2: [number, number][] = [[3, 8], [5, 8], [4, 9], [5, 12], [7, 12], [2, 5]];

TOPIC_GEN['euclid-rhythms'] = {
  title: { en: 'Euclidean rhythms E(k, n)', he: 'מקצבים אוקלידיים E(k, n)' },
  skill: 'rhythm-dictation',
  levels: [
    { en: 'How many hits on the circle?', he: 'כמה מכות על המעגל?' },
    { en: 'Which circle did you hear?', he: 'איזה מעגל שמעתם?' },
    { en: 'Build E(k, n)', he: 'לבנות E(k, n)' },
    { en: 'A rotation of which?', he: 'רוטציה של מה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'euclid-rhythms', level, seed, skill: 'rhythm-dictation' as const };
    if (level === 1) {
      const [k, n] = pickR(rnd, L1);
      const p = bjorklund(k, n);
      const lo = Math.max(1, Math.min(k - 1, n - 3));
      const pool = [lo, lo + 1, lo + 2, lo + 3].filter((x) => x < n || x === k);
      return choiceQ({
        ...base, difficulty: 1350,
        ask: { en: `A circle of ${n}: how many hits?`, he: `מעגל של ${n}: כמה מכות?` },
        names: Object.fromEntries(pool.map((x) => [String(x), num(x)])), answer: String(k), choices: pool.map(String),
        stimulus: [cycleStim(p, pulseOf(n), 3)], cycle: { n },
      });
    }
    if (level === 2) {
      const [k, n] = pickR(rnd, L2);
      const p = bjorklund(k, n);
      const opts = shuffleR(rnd, [p, clumped(rnd, k, n), bjorklund(Math.max(1, k - 1), n), bjorklund(Math.min(n - 1, k + 1), n)].filter((x, i, a) => a.indexOf(x) === i));
      const names = circleNames(opts);
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const o of opts) choiceStim[o] = [cycleStim(o, pulseOf(n), 2)];
      return choiceQ({
        ...base, difficulty: 1420,
        ask: { en: 'Which circle did you hear?', he: 'איזה מעגל שמעתם?' },
        names, answer: p, choices: opts, stimulus: [cycleStim(p, pulseOf(n), 3)], choiceStim, cycle: { n, choices: true },
      });
    }
    if (level === 3) {
      const [k, n] = pickR(rnd, [...L1, [5, 12], [7, 12], [2, 7], [4, 7], [5, 9], [3, 10], [5, 7], [4, 11], [5, 11], [3, 5], [6, 9]] as [number, number][]);
      const answer = necklaceKey(bjorklund(k, n));
      const opts = [answer, necklaceKey(clumped(rnd, k, n)), necklaceKey('x'.repeat(k) + '.'.repeat(n - k))].filter((x, i, a) => a.indexOf(x) === i);
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const o of opts) choiceStim[o] = [cycleStim(o, pulseOf(n), 2)];
      return choiceQ({
        ...base, difficulty: 1480,
        ask: { en: `Spread ${k} hits evenly over ${n}`, he: `פזרו ${k} מכות באופן שווה על ${n}` },
        text: { en: `E(${k},${n}): ${k} hits · ${n} pulses`, he: `E(${k},${n}): ‏${k} מכות · ${n} משבצות` },
        names: circleNames(opts), answer, choices: opts, stimulus: [], choiceStim, cycle: { n, build: true, anyRotation: true },
      });
    }
    // level 4: the reference E(k, n) (or a Toussaint example), the choices: one real rotation and same-k look-alikes
    const ex = pickR(rnd, TOUSSAINT.filter((t) => t.n >= 5));
    const ref = ex.pattern;
    const n = ref.length;
    const k = countOnsets(ref);
    const rots = Array.from({ length: n - 1 }, (_, r) => rotate(ref, r + 1)).filter((q) => q !== ref && q[0] === 'x');
    const rot = ex.rotation && rnd() < 0.5 ? ex.rotation.pattern : pickR(rnd, rots);
    const decoys: Pattern[] = [];
    for (let tries = 0; tries < 60 && decoys.length < 2; tries++) {
      const d = clumped(rnd, k, n);
      const dr = rotate(d, [...d].findIndex((c, i) => c === 'x' && i > 0) % n);
      for (const x of [d, dr]) if (!isRotation(x, ref) && !decoys.includes(x) && decoys.length < 2) decoys.push(x);
    }
    const other = bjorklund(k + 1 < n ? k + 1 : k - 1, n);
    const opts = shuffleR(rnd, [rot, ...decoys, other].filter((x, i, a) => a.indexOf(x) === i && (x === rot || !isRotation(x, ref))));
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const o of opts) choiceStim[o] = [cycleStim(o, pulseOf(n), 2)];
    return choiceQ({
      ...base, difficulty: 1560,
      ask: { en: 'Which is a rotation of this circle?', he: 'מה מהם רוטציה של המעגל הזה?' },
      names: circleNames(opts), answer: rot, choices: opts, stimulus: [cycleStim(ref, pulseOf(n), 2)], choiceStim, cycle: { n, show: ref, choices: true },
    });
  },
};
TOPIC_TAGS['euclid-rhythms'] = (l: number) => (l === 4 ? tg(['rhythm-dictation', 'euclid', 0.6], ['transpose', 'displacement', 0.4]) : tg(['rhythm-dictation', 'euclid', 1]));
