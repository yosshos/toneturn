// Harmony topics (spec U.1–U.4): extensions, voicings, progressions, form. Pure, seeded.

import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, notesStim, nm } from './topicKit';

const arp = (midis: number[], duration = 1.6): Stimulus => ({ kind: 'chord', midis, duration, arpeggio: true });
/** A chord heard twice: together, then broken upwards. */
const both = (midis: number[]): Stimulus[] => [chordStim(midis, 1.5), arp(midis, 1.8)];

function stims(map: Record<string, number[]>): Record<string, Stimulus[]> {
  const out: Record<string, Stimulus[]> = {};
  for (const [k, v] of Object.entries(map)) out[k] = both(v);
  return out;
}

// ---------------------------------------------------------------- U.1 extensions

TOPIC_GEN['extensions'] = {
  title: { en: 'Extensions and alterations', he: 'הרחבות ואלטרציות' },
  skill: 'chords',
  levels: [
    { en: '7, 9 or 13?', he: '7, 9 או 13?' },
    { en: 'Altered dominants', he: 'דומיננטים אלטרד' },
    { en: 'Major colours', he: 'צבעים של מז׳ור' },
    { en: 'sus4, 7sus4, add9, alt', he: 'sus4, 7sus4, add9, alt' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const r = 50 + Math.floor(rnd() * 7);
    let names: ChoiceQuestion['names'];
    let voicing: Record<string, number[]>;
    let ask: { en: string; he: string };
    if (level === 1) {
      const shell = [r - 12, r + 4, r + 10];
      voicing = { '7': [...shell, r + 12], '9': [...shell, r + 14], '13': [...shell, r + 21] };
      names = { '7': nm('7 only', 'רק 7', 'seven', 'plain', 'no extension', 'בלי הרחבה'), '9': nm('9', '9', 'nine', 'ninth', 'תשע'), '13': nm('13', '13', 'thirteen', 'thirteenth', 'שלוש עשרה') };
      ask = { en: 'Dominant 7 — what is on top?', he: 'דומיננט 7 — מה למעלה?' };
    } else if (level === 2) {
      const shell = [r - 12, r + 4, r + 10];
      voicing = { b9: [...shell, r + 13], s9: [...shell, r + 15], s11: [...shell, r + 18], b13: [...shell, r + 20] };
      names = {
        b9: nm('♭9', '♭9', 'flat nine', 'b9', 'minor ninth', 'במול 9'),
        s9: nm('♯9', '♯9', 'sharp nine', '#9', 'raised nine', 'דיאז 9'),
        s11: nm('♯11', '♯11', 'sharp eleven', '#11', 'flat five', 'b5', 'tritone', 'טריטון', 'דיאז 11'),
        b13: nm('♭13', '♭13', 'flat thirteen', 'b13', 'sharp five', '#5', 'augmented fifth', 'במול 13'),
      };
      ask = { en: 'Which alteration is on top of the dominant?', he: 'איזו אלטרציה למעלה בדומיננט?' };
    } else if (level === 4) {
      voicing = { sus4: [r - 12, r + 5, r + 7, r + 12], sus7: [r - 12, r + 5, r + 10, r + 14], add9: [r - 12, r + 4, r + 7, r + 14], alt: [r - 12, r + 4, r + 10, r + 15, r + 20] };
      names = {
        sus4: nm('sus4', 'sus4', 'suspended four', 'sus', 'סאס'),
        sus7: nm('7sus4', '7sus4', 'seven sus four', 'seven sus', 'dominant sus'),
        add9: nm('add9', 'add9', 'add nine', 'added ninth'),
        alt: nm('7alt (♯9 ♭13)', '7alt (♯9 ♭13)', 'alt', 'altered', 'seven alt', 'אלטרד'),
      };
      ask = { en: 'Which chord colour?', he: 'איזה צבע אקורד?' };
    } else {
      voicing = { maj7: [r - 12, r + 4, r + 7, r + 11], maj9: [r - 12, r + 4, r + 11, r + 14], lyd: [r - 12, r + 4, r + 11, r + 18], six9: [r - 12, r + 4, r + 9, r + 14] };
      names = {
        maj7: nm('Major 7', 'מז׳ור 7', 'maj7', 'major seven'),
        maj9: nm('Major 9', 'מז׳ור 9', 'maj9', 'major nine'),
        lyd: nm('Major 7 ♯11', 'מז׳ור 7 דיאז 11', 'lydian', 'sharp eleven', 'לידי'),
        six9: nm('6/9', '6/9', 'six nine', 'six over nine', 'שש תשע'),
      };
      ask = { en: 'Which major colour?', he: 'איזה צבע של מז׳ור?' };
    }
    const keys = Object.keys(voicing);
    const answer = pickR(rnd, keys);
    return choiceQ({ id, topic: 'extensions', level, seed, skill: 'chords', difficulty: 1250 + 120 * level, ask, names, answer, choices: keys, stimulus: both(voicing[answer]), choiceStim: stims(voicing) });
  },
};

// ---------------------------------------------------------------- U.2 voicings

TOPIC_GEN['voicings'] = {
  title: { en: 'Voicings and inversions', he: 'וויסינגים והיפוכים' },
  skill: 'chords',
  levels: [
    { en: 'Close, drop 2 or spread?', he: 'צפוף, Drop 2 או פרוש?' },
    { en: 'Which inversion?', he: 'איזה היפוך?' },
    { en: 'Jazz voicings', he: 'וויסינגים בג׳אז' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const r = 55 + Math.floor(rnd() * 6);
    let voicing: Record<string, number[]>;
    let names: ChoiceQuestion['names'];
    let ask: { en: string; he: string };
    if (level === 1) {
      const q = pickR(rnd, [[0, 4, 7, 11], [0, 3, 7, 10]]);
      voicing = { close: q.map((x) => r + x), drop2: [r + q[2] - 12, r, r + q[1], r + q[3]], spread: [r - 12, r + q[2], r + q[3], r + q[1] + 12] };
      names = { close: nm('Close', 'צפוף', 'close position', 'closed'), drop2: nm('Drop 2', 'Drop 2', 'drop two', 'דרופ 2'), spread: nm('Spread', 'פרוש', 'open', 'open position', 'פתוח') };
      ask = { en: 'How is the seventh chord spread?', he: 'איך פרוש אקורד הספטימה?' };
    } else if (level === 2) {
      voicing = { root: [r, r + 4, r + 7, r + 10], first: [r + 4, r + 7, r + 10, r + 12], second: [r - 5, r - 2, r, r + 4], third: [r - 2, r + 4, r + 7, r + 12] };
      names = {
        root: nm('Root position', 'מצב יסודי', 'root in the bass', 'root', 'יסודי'),
        first: nm('1st inversion', 'היפוך ראשון', 'first inversion', 'third in the bass', 'ראשון'),
        second: nm('2nd inversion', 'היפוך שני', 'second inversion', 'fifth in the bass', 'שני'),
        third: nm('3rd inversion', 'היפוך שלישי', 'third inversion', 'seventh in the bass', 'שלישי'),
      };
      ask = { en: 'Dominant 7 — which note is in the bass?', he: 'דומיננט 7 — איזה צליל בבס?' };
    } else {
      voicing = { shell: [r - 12, r - 8, r - 2], rootless: [r - 8, r - 3, r - 2, r + 2], quartal: [r - 12, r - 7, r - 2, r + 3, r + 7], ust: [r - 12, r - 8, r - 2, r + 2, r + 6, r + 9] };
      names = {
        shell: nm('Shell (1-3-7)', 'Shell (1-3-7)', 'shell', 'shell voicing', 'של וויסינג'),
        rootless: nm('Rootless', 'בלי שורש', 'rootless voicing', 'without root'),
        quartal: nm('Quartal (fourths)', 'קוורטלי (קוורטות)', 'quartal', 'fourths', 'so what', 'קוורטות'),
        ust: nm('Upper-structure triad', 'Upper structure', 'אפר סטרקצ׳ר', 'upper structure', 'triad on top', 'upper structure triad'),
      };
      ask = { en: 'Which kind of voicing?', he: 'איזה סוג וויסינג?' };
    }
    const keys = Object.keys(voicing);
    const answer = pickR(rnd, keys);
    return choiceQ({ id, topic: 'voicings', level, seed, skill: 'chords', difficulty: 1250 + 120 * level, ask, names, answer, choices: keys, stimulus: both(voicing[answer]), choiceStim: stims(voicing) });
  },
};

// ---------------------------------------------------------------- U.3 progressions

const Q = { maj: [0, 4, 7], min: [0, 3, 7], dom7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], hd: [0, 3, 6, 10], b9: [0, 4, 10, 13], m6: [0, 3, 7, 9] };
type Ch = [number, keyof typeof Q];

/** Voice a progression: the root in the bass, the other tones in the octave above middle C's neighbourhood. */
function voiceProg(key: number, chords: Ch[], each = 0.9): Stimulus[] {
  return chords.map(([deg, q], i) => {
    const root = key + deg;
    const bass = 36 + ((((root - 36) % 12) + 12) % 12);
    const upper = Q[q].slice(1).map((x) => 57 + ((((root + x - 57) % 12) + 12) % 12)).sort((a, b) => a - b);
    return chordStim([bass, ...upper], i === chords.length - 1 ? each * 1.6 : each);
  });
}

const PROGS: Record<number, Record<string, { chords: Ch[]; name: ReturnType<typeof nm> }>> = {
  1: {
    axis: { chords: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], name: nm('I–V–vi–IV', 'I–V–vi–IV', 'one five six four', 'axis') },
    sad: { chords: [[9, 'min'], [5, 'maj'], [0, 'maj'], [7, 'maj']], name: nm('vi–IV–I–V', 'vi–IV–I–V', 'six four one five') },
    doowop: { chords: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']], name: nm('I–vi–IV–V', 'I–vi–IV–V', 'one six four five', 'doo wop', 'fifties') },
    basic: { chords: [[0, 'maj'], [5, 'maj'], [7, 'maj'], [0, 'maj']], name: nm('I–IV–V–I', 'I–IV–V–I', 'one four five one') },
  },
  2: {
    iiVI: { chords: [[2, 'm7'], [7, 'dom7'], [0, 'maj7']], name: nm('Major ii–V–I', 'ii–V–I מז׳ורי', 'two five one', 'major two five one') },
    minor: { chords: [[2, 'hd'], [7, 'b9'], [0, 'm6']], name: nm('Minor ii–V–i', 'ii–V–i מינורי', 'minor two five one', 'minor two five') },
    turn: { chords: [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, 'dom7'], [0, 'maj7']], name: nm('Turnaround I–vi–ii–V', 'טרנאראונד I–vi–ii–V', 'turnaround', 'one six two five', 'טרנאראונד') },
    tritone: { chords: [[2, 'm7'], [1, 'dom7'], [0, 'maj7']], name: nm('Tritone sub ii–♭II7–I', 'תחליף טריטון ii–♭II7–I', 'tritone sub', 'tritone substitution', 'תחליף טריטון') },
  },
  3: {
    mario: { chords: [[0, 'maj'], [8, 'maj'], [10, 'maj'], [0, 'maj']], name: nm('I–♭VI–♭VII–I', 'I–♭VI–♭VII–I', 'flat six flat seven', 'aeolian cadence', 'mario cadence') },
    minorIV: { chords: [[0, 'maj'], [5, 'maj'], [5, 'min'], [0, 'maj']], name: nm('I–IV–iv–I', 'I–IV–iv–I', 'minor four', 'minor plagal', 'מינור 4') },
    backdoor: { chords: [[5, 'm7'], [10, 'dom7'], [0, 'maj7']], name: nm('Backdoor iv7–♭VII7–I', 'Backdoor iv7–♭VII7–I', 'backdoor', 'back door', 'בקדור') },
    flatIII: { chords: [[0, 'maj'], [3, 'maj'], [5, 'maj'], [0, 'maj']], name: nm('I–♭III–IV–I', 'I–♭III–IV–I', 'flat three', 'במול 3') },
    secdom: { chords: [[0, 'maj'], [4, 'dom7'], [9, 'min']], name: nm('Secondary dominant I–III7–vi', 'דומיננטה משנית I–III7–vi', 'secondary dominant', 'five of six', 'דומיננטה משנית') },
    bluesTurn: { chords: [[0, 'dom7'], [9, 'dom7'], [2, 'm7'], [7, 'dom7']], name: nm('Blues turnaround I7–VI7–ii7–V7', 'טרנאראונד בלוז I7–VI7–ii7–V7', 'blues turnaround', 'טרנאראונד בלוז') },
  },
};

TOPIC_GEN['progressions'] = {
  title: { en: 'Chord progressions', he: 'מהלכי אקורדים' },
  skill: 'cadences',
  levels: [
    { en: 'Pop progressions', he: 'מהלכי פופ' },
    { en: 'Jazz progressions', he: 'מהלכי ג׳אז' },
    { en: 'Borrowed chords, secondary dominants, blues', he: 'אקורדים שאולים, דומיננטות משניות, בלוז' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const set = PROGS[Math.min(3, level)];
    const key = Math.floor(rnd() * 12);
    const keys = Object.keys(set);
    const answer = pickR(rnd, keys);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of keys) {
      names[k] = set[k].name;
      choiceStim[k] = voiceProg(key, set[k].chords);
    }
    return choiceQ({
      id, topic: 'progressions', level, seed, skill: 'cadences', difficulty: 1200 + 130 * level,
      ask: { en: 'Which progression?', he: 'איזה מהלך?' },
      names, answer, choices: shuffleR(rnd, keys), stimulus: voiceProg(key, set[answer].chords), choiceStim,
    });
  },
};

// ---------------------------------------------------------------- U.4 form

const MAJ = [0, 2, 4, 5, 7, 9, 11, 12, 14];
/** Distinct 5-note motifs in a key: contour and register differ. */
function motifs(rnd: () => number, key: number, n: number): number[][] {
  const out: number[][] = [];
  while (out.length < n) {
    const start = pickR(rnd, out.length === 1 ? [4, 5, 6] : [0, 1, 2]);
    let d = start;
    const m = [d];
    for (let k = 1; k < 5; k++) {
      d = Math.max(0, Math.min(8, d + pickR(rnd, [-2, -1, 1, 1, 2])));
      m.push(d);
    }
    const mid = m.map((x) => key + MAJ[x]);
    if (!out.some((o) => o.join() === mid.join())) out.push(mid);
  }
  return out;
}

TOPIC_GEN['form'] = {
  title: { en: 'Form', he: 'מבנה' },
  skill: 'sequences',
  levels: [
    { en: 'Same, varied or new?', he: 'אותו דבר, וריאציה או חדש?' },
    { en: 'Phrase form', he: 'מבנה משפטים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = 57 + Math.floor(rnd() * 6);
    const [A, B, C] = motifs(rnd, key, 3);
    const gap: Stimulus = { kind: 'rest', duration: 0.55 };
    if (level === 1) {
      const varied = A.slice(0, 3).concat(A[3] + (A[3] > key + 4 ? -3 : 3), A[4] === key ? key + 7 : key);
      const second: Record<string, number[]> = { same: A, varied, contrast: B };
      const answer = pickR(rnd, ['same', 'varied', 'contrast']);
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const k of Object.keys(second)) choiceStim[k] = [notesStim(A, 0.3), gap, notesStim(second[k], 0.3)];
      return choiceQ({
        id, topic: 'form', level, seed, skill: 'sequences', difficulty: 1150,
        ask: { en: 'Two phrases: is the second the same, a variation, or something new?', he: 'שני משפטים: השני זהה, וריאציה, או משהו חדש?' },
        names: { same: nm('The same (A A)', 'זהה (A A)', 'same', 'repeat', 'זהה'), varied: nm("A variation (A A')", "וריאציה (A A')", 'variation', 'varied', 'וריאציה'), contrast: nm('Something new (A B)', 'משהו חדש (A B)', 'new', 'contrast', 'different', 'חדש') },
        answer, choices: ['same', 'varied', 'contrast'], stimulus: choiceStim[answer], choiceStim,
      });
    }
    const M: Record<string, number[]> = { A, B, C };
    const forms = ['AABA', 'ABAB', 'AABB', 'ABAC'];
    const play = (f: string): Stimulus[] => f.split('').flatMap((ch, i) => (i ? [gap, notesStim(M[ch], 0.26)] : [notesStim(M[ch], 0.26)]));
    const answer = pickR(rnd, forms);
    const names: ChoiceQuestion['names'] = {
      AABA: nm('A A B A', 'A A B A', 'AABA', 'song form', 'thirty two bar'),
      ABAB: nm('A B A B', 'A B A B', 'ABAB', 'verse chorus'),
      AABB: nm('A A B B', 'A A B B', 'AABB', 'binary'),
      ABAC: nm('A B A C', 'A B A C', 'ABAC'),
    };
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const f of forms) choiceStim[f] = play(f);
    return choiceQ({ id, topic: 'form', level, seed, skill: 'sequences', difficulty: 1350, ask: { en: 'Four phrases — which form?', he: 'ארבעה משפטים — איזה מבנה?' }, names, answer, choices: forms, stimulus: play(answer), choiceStim });
  },
};
