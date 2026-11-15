// Reharmonization and colour harmony by ear (docs/HARMONY-REHARM.md; research docs/research/REHARM-AND-COLOR.md
// Part C). Jazz & improv course (pack 'jazz'). Every stimulus is built from src/engine/commonTone.ts.
//   ct-degree      one note, many chords: the held note's degree, "F is the 3rd: which chord?", tensions, a chain,
//                  the chord that clashes                                                     1050–1800
//   mediants       chromatic mediants: which one, common tones, the film sound, Coltrane, P / L / R      1250–1800
//   pedal-ear      the bass stays or moves, tonic or dominant pedal, which chord over the pedal          1150–1550
//   approach-chord a half step above or below; in or out (side-slip)                                      1400–1600
//   counter-line   the held note stays, the bass walks: which chord, which degree                         1550–1650
//   modern-color   sus reharm, non-functional sequences, maj7♯5                                           1550–1750
//   func-color     functional or colour: pull or paint                                                    1350–1450
// And the levels added to existing topics: borrowed-ext 4–8 (modal interchange complete), planing 4 (the melody picks
// the chord), reharm-spot 5 (jazz deceptive resolutions).
// Compact questions; spelled chord names; enharmonics are the same note and never a decoy.

import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, eventsStim, notesStim, nm, type TopicDef } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { CT_Q, DEVICE_FAMILY, LADDER, COUNTER_LINE, counterLineNames, commonTones, doublyChromatic, holdsNote, mod12, plrBetween, P, L, R, rootName, spellHeld, triadName, triadPcs, type CtQ, type PLR, type Triad } from './commonTone';

type Names = ChoiceQuestion['names'];
type Ch = { midis: number[]; dur?: number };
const VEL = 0.5;
/** Chords in a row (seconds each), an optional held top note over all of them. */
function seq(chords: Ch[], each = 1, held?: number): Stimulus {
  const ev: { midi: number; start: number; duration: number; velocity: number }[] = [];
  let at = 0;
  for (const c of chords) {
    const d = (c.dur ?? 1) * each;
    for (const m of c.midis) ev.push({ midi: m, start: at, duration: d * 0.96, velocity: VEL });
    at += d;
  }
  if (held !== undefined) ev.push({ midi: held, start: 0, duration: at, velocity: 0.62 });
  return eventsStim(ev, at + 0.4);
}
const pin = (pc: number, lo: number): number => lo + mod12(pc - lo);
/** A chord voiced under a top pitch: up to three chord tones below it (close), the root in the bass. */
function under(root: number, q: CtQ, top: number, n = 3): number[] {
  const tones = [...new Set(CT_Q[q].ints.map((x) => mod12(root + x)))].filter((p) => p !== mod12(top));
  // prefer the 3rd and 7th (or the colour) in the voicing, then the 5th
  const pri = (p: number) => {
    const i = mod12(p - root);
    return i === 0 ? 9 : i === 7 ? 5 : 0;
  };
  const pick = tones.sort((a, b) => pri(a) - pri(b)).slice(0, n);
  const ps = pick.map((p) => top - 1 - mod12(top - 1 - p)).sort((a, b) => a - b);
  return [pin(root, 40), ...ps, top];
}
/** A triad voiced near a register (close position). */
const triV = (t: Triad, lo = 60): number[] => {
  const pcs = triadPcs(t);
  const r = pin(t.root, lo);
  return [r, ...pcs.slice(1).map((p) => r + mod12(p - r))].sort((a, b) => a - b);
};
/** The voice-led version of b after a (each voice to the nearest). */
function lead(a: number[], b: Triad): number[] {
  const pcs = triadPcs(b);
  const out = a.map((p) => {
    let best = p;
    let d = 99;
    for (const q of pcs)
      for (const o of [-12, 0, 12]) {
        const c = p - mod12(p - q) + o;
        if (Math.abs(c - p) < d) (d = Math.abs(c - p)), (best = c);
      }
    return best;
  });
  // make sure every pitch class is there
  const miss = pcs.filter((q) => !out.some((p) => mod12(p) === q));
  if (miss.length) out[out.length - 1] = out[out.length - 1] - mod12(out[out.length - 1] - miss[0]);
  return out.sort((x, y) => x - y);
}
const HELD_SET = [5, 0, 7, 10, 3, 2, 9];
const DEG_NAME: Record<string, { en: string; he: string }> = {
  '1': { en: 'Root', he: 'יסוד' }, '♭3': { en: '♭3', he: '♭3' }, '3': { en: '3rd', he: 'טרצה' }, '5': { en: '5th', he: 'קווינטה' }, '♭7': { en: '♭7', he: '♭7' }, maj7: { en: 'maj7', he: 'maj7' },
  '9': { en: '9', he: '9' }, '11': { en: '11', he: '11' }, '13': { en: '13', he: '13' }, '♭9': { en: '♭9', he: '♭9' }, '♯11': { en: '♯11', he: '♯11' }, '♭13': { en: '♭13', he: '♭13' }, '♯9': { en: '♯9', he: '♯9' }, '6': { en: '6', he: '6' },
};
const degId = (d: string) => 'd' + d.replace('♭', 'b').replace('♯', 's');

// ───────────────────────────── ct-degree ─────────────────────────────

TOPIC_GEN['ct-degree'] = {
  title: { en: 'One note, many chords', he: 'צליל אחד, הרבה אקורדים' },
  skill: 'cadences',
  levels: [
    { en: 'The note on top: root, 3rd or 5th?', he: 'הצליל למעלה: יסוד, טרצה או קווינטה?' },
    { en: 'The note is the 3rd: which chord?', he: 'הצליל הוא הטרצה: איזה אקורד?' },
    { en: 'Under a 7th chord: which degree?', he: 'מתחת לספטאקורד: איזו דרגה?' },
    { en: 'Tensions: which degree?', he: 'טנשנים: איזו דרגה?' },
    { en: 'Four chords, one note: which chain?', he: 'ארבעה אקורדים, צליל אחד: איזו שרשרת?' },
    { en: 'Which chord clashes with the note?', he: 'איזה אקורד מתנגש עם הצליל?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const h = level <= 2 ? pickR(rnd, [5, 5, 0]) : pickR(rnd, HELD_SET);
    const H = pin(h, 69);
    const hn = rootName(h, true);
    const base = { id, topic: 'ct-degree', level, seed, skill: 'cadences' as const };
    if (level === 1) {
      const [iv, q] = pickR(rnd, LADDER.triads);
      const ans = iv === 0 ? 'r1' : iv === 7 ? 'r5' : 'r3';
      const c = spellHeld(h - iv, q, h)!;
      const names: Names = { r1: nm('Root', 'יסוד', 'root'), r3: nm('3rd', 'טרצה', 'third'), r5: nm('5th', 'קווינטה', 'fifth') };
      return choiceQ({
        ...base, difficulty: 1050,
        ask: { en: `${hn} on top: root, 3rd or 5th?`, he: `${hn} למעלה: יסוד, טרצה או קווינטה?` },
        names, answer: ans, choices: ['r1', 'r3', 'r5'],
        stimulus: [seq([{ midis: under(c.root, q, H, 2) }], 1.6), notesStim([H], 0.6)],
      });
    }
    if (level === 2) {
      const pool = [...LADDER.triads, ...LADDER.sevenths];
      const pick = pickR(rnd, pool);
      const c = spellHeld(h - pick[0], pick[1], h)!;
      const others = shuffleR(rnd, pool.filter(([iv]) => mod12(iv) !== mod12(pick[0])))
        .map(([iv, q]) => spellHeld(h - iv, q, h)!)
        .filter((x, i, xs) => xs.findIndex((y) => y.root === x.root) === i && x.root !== c.root)
        .slice(0, 3);
      const all = shuffleR(rnd, [c, ...others]);
      const names: Names = Object.fromEntries(all.map((x) => [x.sym, nm(x.sym, x.sym)]));
      const dn = DEG_NAME[c.degree] ?? { en: c.degree, he: c.degree };
      return choiceQ({
        ...base, difficulty: 1200,
        ask: { en: `${hn} is the ${dn.en}: which chord?`, he: `${hn} הוא ${dn.he}: איזה אקורד?` },
        text: { en: `${hn} = ${c.degree}`, he: `${hn} = ${c.degree}` },
        names, answer: c.sym, choices: all.map((x) => x.sym),
        stimulus: [notesStim([H], 0.8)],
        choiceStim: Object.fromEntries(all.map((x) => [x.sym, [seq([{ midis: under(x.root, x.q, H) }], 1.6)]])),
      });
    }
    if (level === 3 || level === 4) {
      const pool = level === 3 ? LADDER.sevenths : LADDER.tensions;
      const [iv, q] = pickR(rnd, pool);
      const c = spellHeld(h - iv, q, h)!;
      const degs = [...new Set(pool.map(([i, qq]) => spellHeld(h - i, qq, h)!.degree))];
      const choices = shuffleR(rnd, [c.degree, ...shuffleR(rnd, degs.filter((d) => d !== c.degree)).slice(0, 3)]).map(degId);
      const names: Names = Object.fromEntries(degs.map((d) => [degId(d), nm(DEG_NAME[d]?.en ?? d, DEG_NAME[d]?.he ?? d)]));
      return choiceQ({
        ...base, difficulty: level === 3 ? 1350 : 1500,
        ask: { en: `${hn} stays on top. Which degree is it now?`, he: `${hn} נשאר למעלה. איזו דרגה הוא עכשיו?` },
        names, answer: degId(c.degree), choices,
        stimulus: [seq([{ midis: under(c.root, q, H) }], 1.8)],
      });
    }
    if (level === 5) {
      const CH: [number, CtQ][][] = [
        [[0, 'maj7'], [4, 'maj7'], [7, 'm6'], [10, '7sus4']],
        [[3, 'm7'], [2, '9'], [4, 'maj7'], [5, '7sus4']],
        [[10, 'm7'], [1, '7b9'], [9, '13'], [7, 'maj7']],
      ];
      const k = Math.floor(rnd() * 3);
      const nameOf = (ch: [number, CtQ][]) => ch.map(([iv, q]) => spellHeld(h - iv, q, h)!.sym).join(' – ');
      const play = (ch: [number, CtQ][]) => [seq(ch.map(([iv, q]) => ({ midis: under(spellHeld(h - iv, q, h)!.root, q, H) })), 1.3, H)];
      const names: Names = Object.fromEntries(CH.map((ch, i) => [`c${i}`, nm(nameOf(ch), nameOf(ch))]));
      return choiceQ({
        ...base, difficulty: 1650,
        ask: { en: `${hn} held over four chords. Which chain?`, he: `${hn} נשאר מעל ארבעה אקורדים. איזו שרשרת?` },
        names, answer: `c${k}`, choices: ['c0', 'c1', 'c2'],
        stimulus: play(CH[k]),
        choiceStim: Object.fromEntries(CH.map((ch, i) => [`c${i}`, play(ch)])),
      });
    }
    // Level 6: three chords hold the note, one clashes (an avoid note: the 11th of a major chord, a maj7 over …).
    const CLASH: [number, CtQ][] = [[5, 'maj7'], [10, 'maj7'], [1, 'maj7'], [8, 'm7']];
    const OK: [number, CtQ][] = [...LADDER.sevenths, ...LADDER.tensions.filter(([, q]) => q === '9' || q === '7sus4' || q === '13' || q === '7b9')];
    const bad = pickR(rnd, CLASH);
    const goods = shuffleR(rnd, OK).filter(([iv]) => mod12(iv) !== mod12(bad[0])).slice(0, 3);
    const all = shuffleR(rnd, [bad, ...goods]).map(([iv, q]) => ({ c: spellHeld(h - iv, q, h) ?? { root: mod12(h - iv), q, sym: rootName(h - iv) + CT_Q[q].sym, degree: '', rootName: '', held: hn }, q }));
    const ans = all.find((x) => !holdsNote(x.c.root, x.q, h))!;
    const names: Names = Object.fromEntries(all.map((x) => [x.c.sym, nm(x.c.sym, x.c.sym)]));
    return choiceQ({
      ...base, difficulty: 1800,
      ask: { en: `Harmonizing ${hn}: which chord clashes?`, he: `הרמון ל־${hn}: איזה אקורד מתנגש?` },
      names, answer: ans.c.sym, choices: all.map((x) => x.c.sym),
      stimulus: [notesStim([H], 0.8)],
      choiceStim: Object.fromEntries(all.map((x) => [x.c.sym, [seq([{ midis: under(x.c.root, x.q, H) }], 1.6)]])),
    });
  },
};
TOPIC_TAGS['ct-degree'] = tg(['cadences', 'reharm', 0.6], ['chords', 'extension', 0.4]);

// ───────────────────────────── mediants ─────────────────────────────

TOPIC_GEN['mediants'] = {
  title: { en: 'Chromatic mediants', he: 'מדיאנטות כרומטיות' },
  skill: 'cadences',
  levels: [
    { en: 'Which mediant?', he: 'איזו מדיאנטה?' },
    { en: 'One common tone, or none?', he: 'צליל משותף אחד, או אף אחד?' },
    { en: 'The film sound: which mediant 7th?', he: 'צליל הסרטים: איזה ספטאקורד מדיאנטה?' },
    { en: 'The Coltrane cycle: which augmented triad?', he: 'מעגל קולטריין: איזה משולש מוגדל?' },
    { en: 'P, L or R?', he: 'P, ‏L או R?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const kn = rootName(key);
    const I: Triad = { root: key, minor: false };
    const base = { id, topic: 'mediants', level, seed, skill: 'cadences' as const };
    const v0 = triV(I, 60);
    if (level === 1) {
      const ds = [4, 8, 9, 3];
      const d = pickR(rnd, ds);
      const ids = ds.map((x) => `m${x}`);
      const names: Names = Object.fromEntries(ds.map((x) => [`m${x}`, nm(rootName(key + x), rootName(key + x))]));
      const play = (x: number) => {
        const t2: Triad = { root: mod12(key + x), minor: false };
        const ct = commonTones(I, t2)[0];
        return [seq([{ midis: v0 }, { midis: lead(v0, t2) }, { midis: v0 }], 1.1), notesStim([pin(ct, 64)], 0.7)];
      };
      return choiceQ({
        ...base, difficulty: 1250,
        ask: { en: `${kn} → ? → ${kn}. Listen to the note that stays.`, he: `${kn} → ? → ${kn}. הקשיבו לצליל שנשאר.` },
        names, answer: `m${d}`, choices: ids, stimulus: play(d),
        choiceStim: Object.fromEntries(ds.map((x) => [`m${x}`, play(x)])),
      });
    }
    if (level === 2) {
      const none = rnd() < 0.5;
      const t2: Triad = none ? pickR(rnd, doublyChromatic(I)) : { root: mod12(key + pickR(rnd, [4, 8, 9, 3])), minor: false };
      const names: Names = { one: nm('One common tone', 'צליל משותף אחד', 'one'), none: nm('None (doubly chromatic)', 'אף אחד (כרומטי כפול)', 'none', 'zero') };
      return choiceQ({
        ...base, difficulty: 1400,
        ask: { en: `${kn} → ${triadName(t2)}: how many common tones?`, he: `${kn} → ${triadName(t2)}: כמה צלילים משותפים?` },
        text: { en: `${kn} → ${triadName(t2)}`, he: `${kn} → ${triadName(t2)}` },
        names, answer: commonTones(I, t2).length ? 'one' : 'none', choices: ['one', 'none'],
        stimulus: [seq([{ midis: v0 }, { midis: lead(v0, t2) }], 1.2)],
      });
    }
    if (level === 3) {
      const opts: [string, number][] = [['bVI', 8], ['III', 4], ['VI', 9], ['bIII', 3]];
      const [a] = pickR(rnd, opts);
      const names: Names = { bVI: nm('♭VImaj7', '♭VImaj7', 'flat six'), III: nm('IIImaj7', 'IIImaj7', 'three'), VI: nm('VImaj7', 'VImaj7', 'six'), bIII: nm('♭IIImaj7', '♭IIImaj7', 'flat three') };
      const maj7 = (r: number) => under(r, 'maj7', pin(r + 11, 70) > 76 ? pin(r + 11, 70) - 12 : pin(r + 11, 70), 3);
      const play = (d: number) => [seq([{ midis: maj7(key) }, { midis: maj7(key + d) }, { midis: maj7(key) }], 1.2)];
      return choiceQ({
        ...base, difficulty: 1550,
        ask: { en: `${kn}maj7 – ? – ${kn}maj7. Which mediant?`, he: `${kn}maj7 – ? – ${kn}maj7. איזו מדיאנטה?` },
        names, answer: a, choices: opts.map((o) => o[0]), stimulus: play(opts.find((o) => o[0] === a)![1]),
        choiceStim: Object.fromEntries(opts.map(([k, d]) => [k, play(d)])),
      });
    }
    if (level === 4) {
      // The roots C – A♭ – E (major-third mediants) spell an augmented triad; which one?
      const r = Math.floor(rnd() * 4);
      const augs = [0, 1, 2, 3].map((k) => [k, k + 4, k + 8].map((p) => mod12(p)));
      const aug = augs[mod12(key) % 4];
      void r;
      const nameAug = (a: number[]) => {
        const s = a.map((p) => rootName(p)).sort();
        return s.join(' ');
      };
      const ids = augs.map((_, i) => `a${i}`);
      const names: Names = Object.fromEntries(augs.map((a, i) => [`a${i}`, nm(nameAug(a), nameAug(a))]));
      const cyc = [key, key + 8, key + 4, key].map((p) => ({ midis: triV({ root: mod12(p), minor: false }, 57) }));
      return choiceQ({
        ...base, difficulty: 1650,
        ask: { en: `${kn} – ${rootName(key + 8)} – ${rootName(key + 4)}: the roots spell which augmented triad?`, he: `${kn} – ${rootName(key + 8)} – ${rootName(key + 4)}: היסודות יוצרים איזה משולש מוגדל?` },
        names, answer: ids[augs.indexOf(aug)], choices: ids,
        stimulus: [seq(cyc, 1)],
      });
    }
    // Level 5: which single move — P (parallel), L (leading-tone exchange), R (relative)?
    const k = pickR(rnd, ['P', 'L', 'R'] as PLR[]);
    const from: Triad = { root: key, minor: rnd() < 0.5 };
    const to = ({ P, L, R } as Record<PLR, (t: Triad) => Triad>)[k](from);
    const names: Names = { P: nm('P (parallel)', 'P (מקביל)', 'parallel', 'p'), L: nm('L (leading tone)', 'L (צליל מוביל)', 'leading', 'l'), R: nm('R (relative)', 'R (יחסי)', 'relative', 'r') };
    const v = triV(from, 60);
    void plrBetween;
    return choiceQ({
      ...base, difficulty: 1800,
      ask: { en: `${triadName(from)} → ${triadName(to)}: which move?`, he: `${triadName(from)} → ${triadName(to)}: איזו תנועה?` },
      text: { en: `${triadName(from)} → ${triadName(to)}`, he: `${triadName(from)} → ${triadName(to)}` },
      names, answer: k, choices: ['P', 'L', 'R'],
      stimulus: [seq([{ midis: v }, { midis: lead(v, to) }], 1.2)],
    });
  },
};
TOPIC_TAGS['mediants'] = tg(['cadences', 'chromatic', 0.7], ['theory', 'chromatic', 0.3]);

// ───────────────────────────── pedal-ear ─────────────────────────────

TOPIC_GEN['pedal-ear'] = {
  title: { en: 'Pedal point by ear', he: 'פדל בשמיעה' },
  skill: 'cadences',
  levels: [
    { en: 'Does the bass stay or move?', he: 'הבס נשאר או זז?' },
    { en: 'Tonic or dominant pedal?', he: 'פדל טוניקה או דומיננטה?' },
    { en: 'Which chord over the pedal?', he: 'איזה אקורד מעל הפדל?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const kn = rootName(key);
    const base = { id, topic: 'pedal-ear', level, seed, skill: 'cadences' as const };
    const tri = (d: number, minor = false) => triV({ root: mod12(key + d), minor }, 60);
    const prog = [0, 5, 7, 0];
    if (level === 1) {
      const stays = rnd() < 0.5;
      const mk = (st: boolean) => [seq(prog.map((d) => ({ midis: [st ? pin(key, 36) : pin(key + d, 36), ...tri(d)] })), 1)];
      const names: Names = { stay: nm('Stays (pedal)', 'נשאר (פדל)', 'stays', 'pedal'), move: nm('Moves', 'זז', 'moves') };
      return choiceQ({ ...base, difficulty: 1150, ask: { en: 'The bass: stays or moves?', he: 'הבס: נשאר או זז?' }, names, answer: stays ? 'stay' : 'move', choices: ['stay', 'move'], stimulus: mk(stays), choiceStim: { stay: mk(true), move: mk(false) } });
    }
    if (level === 2) {
      const dom = rnd() < 0.5;
      const mk = (d: boolean) => {
        const ped = pin(key + (d ? 7 : 0), 36);
        const ch = d ? [[2, true], [5, false], [8, false], [7, false]] : [[0, false], [5, false], [7, false], [0, false]];
        return [seq([...ch.map(([x, m]) => ({ midis: [ped, ...tri(x as number, m as boolean)] })), ...(d ? [{ midis: [pin(key, 36), ...tri(0)], dur: 1.5 }] : [])], 1)];
      };
      const names: Names = { ton: nm('Tonic pedal', 'פדל טוניקה', 'tonic'), dom: nm('Dominant pedal', 'פדל דומיננטה', 'dominant') };
      return choiceQ({ ...base, difficulty: 1350, ask: { en: `In ${kn}: tonic or dominant pedal?`, he: `ב־${kn}: פדל טוניקה או דומיננטה?` }, names, answer: dom ? 'dom' : 'ton', choices: ['ton', 'dom'], stimulus: mk(dom), choiceStim: { ton: mk(false), dom: mk(true) } });
    }
    // Level 3: over the dominant pedal — IV/V (V9sus4), ♭VI/V (V7♭9sus), ♭II/V, ii7/V.
    const opts: [string, number, boolean, string][] = [['IV', 5, false, '/'], ['bVI', 8, false, '/'], ['bII', 1, false, '/'], ['ii', 2, true, 'm/']];
    const [a] = pickR(rnd, opts);
    const g = pin(key + 7, 36);
    const play = (d: number, m: boolean) => [seq([{ midis: [g, ...tri(d, m)], dur: 1.6 }, { midis: [pin(key, 36), ...tri(0)], dur: 1.4 }], 1)];
    const names: Names = Object.fromEntries(opts.map(([k, d, , s]) => [k, nm(`${rootName(key + d)}${s}${rootName(key + 7)}`, `${rootName(key + d)}${s}${rootName(key + 7)}`)]));
    return choiceQ({
      ...base, difficulty: 1550,
      ask: { en: `Over a ${rootName(key + 7)} pedal, into ${kn}: which chord?`, he: `מעל פדל ${rootName(key + 7)}, אל ${kn}: איזה אקורד?` },
      names, answer: a, choices: opts.map((o) => o[0]), stimulus: play(opts.find((o) => o[0] === a)![1], opts.find((o) => o[0] === a)![2]),
      choiceStim: Object.fromEntries(opts.map(([k, d, m]) => [k, play(d, m)])),
    });
  },
};
TOPIC_TAGS['pedal-ear'] = tg(['cadences', 'reharm', 0.6], ['dictation', 'bass', 0.4]);

// ───────────────────────────── approach-chord ─────────────────────────────

TOPIC_GEN['approach-chord'] = {
  title: { en: 'Approach chords and side-slips', he: 'אקורדי גישה והחלקות הצידה' },
  skill: 'cadences',
  levels: [
    { en: 'From a half step above or below?', he: 'מחצי טון מעל או מתחת?' },
    { en: 'Planed approach, or a dominant?', he: 'גישה מקבילה, או דומיננטה?' },
    { en: 'In or out?', he: 'בפנים או בחוץ?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const kn = rootName(key);
    const base = { id, topic: 'approach-chord', level, seed, skill: 'cadences' as const };
    const maj7 = (r: number) => [pin(r, 40), ...[4, 7, 11, 14].map((x) => pin(key, 60) + mod12(r - key) + x - (mod12(r - key) > 6 ? 12 : 0))];
    if (level === 1) {
      const above = rnd() < 0.5;
      const play = (up: boolean) => [seq([{ midis: maj7(key + (up ? 1 : -1)), dur: 0.6 }, { midis: maj7(key), dur: 1.6 }], 1)];
      const names: Names = { up: nm(`From above (${rootName(key + 1)}maj7)`, `מלמעלה (${rootName(key + 1)}maj7)`, 'above'), down: nm(`From below (${rootName(key + 11)}maj7)`, `מלמטה (${rootName(key + 11)}maj7)`, 'below') };
      return choiceQ({ ...base, difficulty: 1400, ask: { en: `Into ${kn}maj7: from above or below?`, he: `אל ${kn}maj7: מלמעלה או מלמטה?` }, names, answer: above ? 'up' : 'down', choices: ['up', 'down'], stimulus: play(above), choiceStim: { up: play(true), down: play(false) } });
    }
    if (level === 2) {
      // The chord before Imaj7: its own voicing a half step up (planed), the V7, or the tritone sub ♭II7.
      const opts: [string, number[]][] = [
        ['planed', maj7(key + 1)],
        ['v7', [pin(key + 7, 40), ...[4, 9, 10, 14].map((x) => pin(key + 7, 55) + x)]],
        ['sub', [pin(key + 1, 40), ...[4, 9, 10, 14].map((x) => pin(key + 1, 55) + x)]],
      ];
      const a = pickR(rnd, opts);
      const play = (o: (typeof opts)[number]) => [seq([{ midis: o[1], dur: 0.8 }, { midis: maj7(key), dur: 1.6 }], 1)];
      const names: Names = { planed: nm(`Planed: ${rootName(key + 1)}maj7`, `מקביל: ${rootName(key + 1)}maj7`, 'planed'), v7: nm(`The V7: ${rootName(key + 7)}7`, `ה־V7: ${rootName(key + 7)}7`, 'dominant', 'five'), sub: nm(`Tritone sub: ${rootName(key + 1)}7`, `תחליף טריטון: ${rootName(key + 1)}7`, 'tritone') };
      return choiceQ({ ...base, difficulty: 1500, ask: { en: `Into ${kn}maj7: which chord came before?`, he: `אל ${kn}maj7: איזה אקורד בא לפני?` }, names, answer: a[0], choices: opts.map((o) => o[0]), stimulus: play(a), choiceStim: Object.fromEntries(opts.map((o) => [o[0], play(o)])) });
    }
    // Level 3: a ii–V vamp with (out) or without (in) a half-step side-slip of the ii.
    const out = rnd() < 0.5;
    const m7 = (r: number) => [pin(r, 38), ...[3, 7, 10, 14].map((x) => pin(r, 57) + x)];
    const dom = (r: number) => [pin(r, 38), ...[4, 9, 10, 14].map((x) => pin(r, 55) + x)];
    const mk = (o: boolean) => [seq([{ midis: m7(key + 2) }, { midis: dom(key + 7) }, { midis: o ? m7(key + 3) : m7(key + 2) }, { midis: dom(key + 7) }, { midis: m7(key + 2), dur: 1.5 }], 0.9)];
    const names: Names = { in: nm('In: ii–V all the way', 'בפנים: ii–V כל הזמן', 'in'), out: nm('Out: a side-slip', 'בחוץ: החלקה הצידה', 'out', 'side slip') };
    return choiceQ({ ...base, difficulty: 1600, ask: { en: `A ii–V vamp in ${kn}: in, or a side-slip?`, he: `וואמפ ii–V ב־${kn}: בפנים, או החלקה הצידה?` }, names, answer: out ? 'out' : 'in', choices: ['in', 'out'], stimulus: mk(out), choiceStim: { in: mk(false), out: mk(true) } });
  },
};
TOPIC_TAGS['approach-chord'] = tg(['cadences', 'reharm', 1]);

// ───────────────────────────── counter-line ─────────────────────────────

TOPIC_GEN['counter-line'] = {
  title: { en: 'The counter-line', he: 'הקו הנגדי' },
  skill: 'cadences',
  levels: [
    { en: 'The note stays, the bass moves: which chord?', he: 'הצליל נשאר, הבס זז: איזה אקורד?' },
    { en: 'Which bass note makes the chord?', he: 'איזה צליל בס יוצר את האקורד?' },
    { en: 'Which degree is the held note now?', he: 'איזו דרגה הצליל הנשאר עכשיו?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, [0, 5, 7, 10, 3, 2]);
    const H = pin(key, 67);
    const names6 = counterLineNames(key);
    const base = { id, topic: 'counter-line', level, seed, skill: 'cadences' as const };
    const k = 1 + Math.floor(rnd() * 5);
    const c = COUNTER_LINE[k];
    const voiced = (i: number) => {
      const cc = COUNTER_LINE[i];
      const root = mod12(key + cc.root);
      const tones = CT_Q[cc.q].ints.map((x) => mod12(root + x)).filter((p) => p !== mod12(H) && p !== mod12(key + cc.bass)).slice(0, 2);
      return [pin(key + cc.bass, 36), ...tones.map((p) => H - 1 - mod12(H - 1 - p)), H];
    };
    const walk = [seq(COUNTER_LINE.slice(0, k + 1).map((_, i) => ({ midis: voiced(i) })), 1)];
    if (level === 1) {
      const choices = shuffleR(rnd, [k, ...shuffleR(rnd, [1, 2, 3, 4, 5].filter((x) => x !== k)).slice(0, 3)]).map((i) => `c${i}`);
      const names: Names = Object.fromEntries([1, 2, 3, 4, 5].map((i) => [`c${i}`, nm(names6[i], names6[i])]));
      return choiceQ({
        ...base, difficulty: 1550,
        ask: { en: `${rootName(key)} stays on top, the bass walks down. The last chord?`, he: `${rootName(key)} נשאר למעלה, הבס יורד. האקורד האחרון?` },
        names, answer: `c${k}`, choices, stimulus: walk,
      });
    }
    if (level === 2) {
      // Written: the chord over the held note → its bass note (A♭maj7 under C → A♭).
      const bassNames = COUNTER_LINE.map((cc) => rootName(key + cc.bass));
      const choices = shuffleR(rnd, [k, ...shuffleR(rnd, [1, 2, 3, 4, 5].filter((x) => x !== k)).slice(0, 3)]).map((i) => `b${i}`);
      const names: Names = Object.fromEntries([1, 2, 3, 4, 5].map((i) => [`b${i}`, nm(bassNames[i], bassNames[i])]));
      return choiceQ({
        ...base, difficulty: 1600,
        ask: { en: `${rootName(key)} held on top. ${names6[k].split('/')[0]}: which bass note?`, he: `${rootName(key)} למעלה. ${names6[k].split('/')[0]}: איזה צליל בס?` },
        text: { en: names6[k].split('/')[0], he: names6[k].split('/')[0] },
        names, answer: `b${k}`, choices, stimulus: [notesStim([H], 0.8)],
        choiceStim: Object.fromEntries([1, 2, 3, 4, 5].map((i) => [`b${i}`, [seq([{ midis: voiced(i) }], 1.6)]])),
      });
    }
    const degs = ['1', '♭3', '3', '11'];
    const names: Names = { d1: nm('Root', 'יסוד', 'root'), db3: nm('♭3', '♭3', 'flat three'), d3: nm('3rd', 'טרצה', 'third'), d11: nm('11', '11', 'eleven') };
    return choiceQ({
      ...base, difficulty: 1650,
      ask: { en: `Over ${names6[k]}: which degree is ${rootName(key)}?`, he: `מעל ${names6[k]}: איזו דרגה ${rootName(key)}?` },
      text: { en: names6[k], he: names6[k] },
      names, answer: degId(c.degree), choices: degs.map(degId), stimulus: walk,
    });
  },
};
TOPIC_TAGS['counter-line'] = tg(['cadences', 'reharm', 0.6], ['dictation', 'bass', 0.4]);

// ───────────────────────────── modern-color ─────────────────────────────

TOPIC_GEN['modern-color'] = {
  title: { en: 'Modern colours: sus, maj7♯5', he: 'צבעים מודרניים: סאס, maj7♯5' },
  skill: 'cadences',
  levels: [
    { en: 'ii–V or the sus chord?', he: 'ii–V או אקורד הסאס?' },
    { en: 'Functional or not?', he: 'פונקציונלי או לא?' },
    { en: 'maj7 or maj7♯5?', he: 'maj7 או maj7♯5?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const kn = rootName(key);
    const base = { id, topic: 'modern-color', level, seed, skill: 'cadences' as const };
    const v = (r: number, q: CtQ, top: number) => under(mod12(r), q, pin(top, 67), 3);
    if (level === 1) {
      const sus = rnd() < 0.5;
      const mk = (s: boolean) => [seq(s ? [{ midis: [pin(key + 7, 40), ...[5, 9, 12, 16].map((x) => pin(key, 60) + x - 12 + 12)], dur: 2 }, { midis: v(key, 'maj7', key + 4), dur: 2 }] : [{ midis: v(key + 2, 'm7', key + 5) }, { midis: v(key + 7, '7', key + 5) }, { midis: v(key, 'maj7', key + 4), dur: 2 }], 0.9)];
      const names: Names = { iiv: nm('ii–V', 'ii–V', 'two five'), sus: nm(`${rootName(key + 5)}/${rootName(key + 7)} (sus)`, `${rootName(key + 5)}/${rootName(key + 7)} (סאס)`, 'sus') };
      return choiceQ({ ...base, difficulty: 1550, ask: { en: `Into ${kn}maj7: ii–V, or the sus chord?`, he: `אל ${kn}maj7: ii–V, או אקורד הסאס?` }, names, answer: sus ? 'sus' : 'iiv', choices: ['iiv', 'sus'], stimulus: mk(sus), choiceStim: { iiv: mk(false), sus: mk(true) } });
    }
    if (level === 2) {
      const func = rnd() < 0.5;
      const mk = (f: boolean) => [seq((f ? [[4, 'm7'], [9, '7'], [2, 'm7'], [7, '7']] : [[0, '7sus4'], [8, '7sus4'], [10, '7sus4'], [7, '7sus4']]).map(([d, q]) => ({ midis: v(key + (d as number), q as CtQ, key + (d as number) + 10) })), 1)];
      const names: Names = { func: nm('Functional: ii–Vs that pull', 'פונקציונלי: ii–V שמושכים', 'functional'), color: nm('Colour: sus chords that float', 'צבע: אקורדי סאס שמרחפים', 'colour', 'color') };
      return choiceQ({ ...base, difficulty: 1650, ask: { en: 'Do the chords pull, or float?', he: 'האקורדים מושכים, או מרחפים?' }, names, answer: func ? 'func' : 'color', choices: ['func', 'color'], stimulus: mk(func), choiceStim: { func: mk(true), color: mk(false) } });
    }
    const aug = rnd() < 0.5;
    const mk = (a: boolean) => [seq([{ midis: [pin(key, 40), ...[4, a ? 8 : 7, 11, 14].map((x) => pin(key, 60) + x)], dur: 2.2 }], 1)];
    const names: Names = { maj7: nm('maj7', 'maj7', 'major seven'), aug: nm('maj7♯5', 'maj7♯5', 'sharp five', 'augmented') };
    return choiceQ({ ...base, difficulty: 1750, ask: { en: `A tonic ${kn} chord: maj7 or maj7♯5?`, he: `אקורד טוניקה ${kn}: maj7 או maj7♯5?` }, names, answer: aug ? 'aug' : 'maj7', choices: ['maj7', 'aug'], stimulus: mk(aug), choiceStim: { maj7: mk(false), aug: mk(true) } });
  },
};
TOPIC_TAGS['modern-color'] = tg(['cadences', 'reharm', 0.6], ['chords', 'extension', 0.4]);

// ───────────────────────────── func-color ─────────────────────────────

/** A short demo of each device in C (bass + 3–4 notes per chord). */
const DEMO: Record<string, [number, CtQ][]> = {
  secondary: [[0, 'maj7'], [9, '7'], [2, 'm7'], [7, '7'], [0, 'maj7']],
  tritone: [[2, 'm7'], [1, '7'], [0, 'maj7']],
  iiV: [[0, 'maj7'], [4, 'm7'], [9, '7'], [2, 'm7']],
  backdoor: [[5, 'm7'], [10, '7'], [0, 'maj7']],
  pdim: [[0, 'maj7'], [1, 'dim7'], [2, 'm7']],
  mediant: [[0, 'maj7'], [8, 'maj7'], [0, 'maj7']],
  planing: [[0, 'maj7'], [2, 'maj7'], [4, 'maj7'], [2, 'maj7']],
  mi: [[0, 'maj7'], [5, 'm6'], [0, 'maj7']],
  pedal: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']],
  common: [[0, 'maj7'], [8, 'maj7'], [1, 'maj7'], [0, 'maj7']],
  slip: [[2, 'm7'], [3, 'm7'], [2, 'm7']],
};
TOPIC_GEN['func-color'] = {
  title: { en: 'Functional or colour?', he: 'פונקציונלי או צבע?' },
  skill: 'cadences',
  levels: [
    { en: 'Sort the device: pull or paint?', he: 'למיין את התחבולה: מושך או צובע?' },
    { en: 'By ear: pull or paint?', he: 'בשמיעה: מושך או צובע?' },
    { en: 'Which colour device?', he: 'איזו תחבולת צבע?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const play = (d: string) => [seq(DEMO[d].map(([x, q]) => ({ midis: d === 'pedal' ? [pin(key, 36), ...triV({ root: mod12(key + x), minor: false }, 60)] : under(mod12(key + x), q, pin(key + x + (q === 'M' ? 7 : 10), 67), 3) })), 0.9)];
    if (level === 3) {
      const ks = ['mediant', 'mi', 'planing', 'slip'];
      const a = pickR(rnd, ks);
      const names3: Names = Object.fromEntries(ks.map((k) => [k, nm(DEVICE_FAMILY.find((x) => x.id === k)!.name.en, DEVICE_FAMILY.find((x) => x.id === k)!.name.he)]));
      return choiceQ({ id, topic: 'func-color', level, seed, skill: 'cadences', difficulty: 1550, ask: { en: 'A colour reharm. Which device?', he: 'הרמון צבע. איזו תחבולה?' }, names: names3, answer: a, choices: ks, stimulus: play(a), choiceStim: Object.fromEntries(ks.map((k) => [k, play(k)])) });
    }
    const dv = pickR(rnd, DEVICE_FAMILY);
    const demo = DEMO[dv.id];
    const pedal = dv.id === 'pedal';
    const stim = [seq(demo.map(([d, q]) => ({ midis: pedal ? [pin(key, 36), ...triV({ root: mod12(key + d), minor: false }, 60)] : under(mod12(key + d), q, pin(key + d + (q === 'M' ? 7 : 10), 67), 3) })), 0.9)];
    const names: Names = { functional: nm('Functional: it pulls', 'פונקציונלי: מושך', 'functional', 'pull'), colour: nm('Colour: it paints', 'צבע: צובע', 'colour', 'color', 'paint') };
    return choiceQ({
      id, topic: 'func-color', level, seed, skill: 'cadences', difficulty: level === 1 ? 1350 : 1450,
      ask: level === 1 ? { en: `${dv.name.en}: functional or colour?`, he: `${dv.name.he}: פונקציונלי או צבע?` } : { en: 'Does it pull, or paint?', he: 'זה מושך, או צובע?' },
      ...(level === 1 ? { text: { en: dv.name.en, he: dv.name.he } } : {}),
      names, answer: dv.fam, choices: ['functional', 'colour'], stimulus: stim,
    });
  },
};
TOPIC_TAGS['func-color'] = tg(['cadences', 'reharm', 1]);

// ───────────────────────────── levels added to existing topics ─────────────────────────────

/** Add levels to a topic registered elsewhere (the old levels keep their numbers). */
function extend(topic: string, more: { en: string; he: string }[], gen: (seed: number, level: number, id: string) => ChoiceQuestion): void {
  const old = TOPIC_GEN[topic] as TopicDef | undefined;
  if (!old) return;
  const n = old.levels.length;
  TOPIC_GEN[topic] = { ...old, levels: [...old.levels, ...more], gen: (seed, level, id) => (level > n ? gen(seed, level - n, id) : old.gen(seed, level, id)) };
}
const jz = (key: number, r: number, q: CtQ): number[] => under(mod12(key + r), q, pin(key + r + (q === 'm6' ? 9 : q === 'M' || q === 'm' ? 7 : q === 'maj7' ? 11 : 10), 66), 3);

// modal-mix: modal interchange complete by ear (C.3): major or borrowed, ♭VI or ♭VII, minor plagal, iiø7, borrowing in
// minor. Its own topic: borrowed-ext (1450–1550) keeps its levels, and a topic's levels never get easier.
TOPIC_GEN['modal-mix'] = {
  title: { en: 'Modal interchange by ear', he: 'השאלה מודאלית בשמיעה' },
  skill: 'cadences',
  levels:
  [
    { en: 'Major or borrowed?', he: 'מז׳ורי או שאול?' },
    { en: '♭VI or ♭VII?', he: '♭VI או ♭VII?' },
    { en: 'Minor plagal: which chord before I?', he: 'פלגלית מינורית: איזה אקורד לפני I?' },
    { en: 'iiø7 or ii m7?', he: 'iiø7 או ii m7?' },
    { en: 'Borrowing in minor: which?', he: 'השאלה במינור: איזו?' },
  ],
  gen(seed, k, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const kn = rootName(key);
    const level = k;
    const base = { id, topic: 'modal-mix', level, seed, skill: 'cadences' as const };
    if (k === 1) {
      const borrowed = rnd() < 0.5;
      const mk = (b: boolean) => [seq([{ midis: jz(key, 0, 'M') }, { midis: jz(key, 5, 'M') }, { midis: jz(key, 5, b ? 'm' : 'M') }, { midis: jz(key, 0, 'M'), dur: 1.5 }], 0.9)];
      const names: Names = { major: nm('All major (IV)', 'הכל מז׳ורי (IV)', 'major'), borrowed: nm('Borrowed (iv)', 'שאול (iv)', 'borrowed', 'minor') };
      return choiceQ({ ...base, difficulty: 1100, ask: { en: `I – IV – ? – I in ${kn}: major, or borrowed?`, he: `I – IV – ? – I ב־${kn}: מז׳ורי, או שאול?` }, names, answer: borrowed ? 'borrowed' : 'major', choices: ['major', 'borrowed'], stimulus: mk(borrowed), choiceStim: { major: mk(false), borrowed: mk(true) } });
    }
    if (k === 2) {
      const six = rnd() < 0.5;
      const mk = (s: boolean) => [seq([{ midis: jz(key, 0, 'M') }, { midis: jz(key, s ? 8 : 10, 'M') }, { midis: jz(key, 0, 'M'), dur: 1.5 }], 1)];
      const names: Names = { six: nm('♭VI', '♭VI', 'flat six'), seven: nm('♭VII', '♭VII', 'flat seven') };
      return choiceQ({ ...base, difficulty: 1300, ask: { en: `I – ? – I in ${kn}: ♭VI or ♭VII?`, he: `I – ? – I ב־${kn}: ♭VI או ♭VII?` }, names, answer: six ? 'six' : 'seven', choices: ['six', 'seven'], stimulus: mk(six), choiceStim: { six: mk(true), seven: mk(false) } });
    }
    if (k === 3) {
      const opts: [string, number, CtQ, string][] = [['iv', 5, 'm', 'iv'], ['ivm6', 5, 'm6', 'ivm6'], ['bVI', 8, 'maj7', '♭VImaj7'], ['bVII7', 10, '7', '♭VII7'], ['bII', 1, 'maj7', '♭IImaj7']];
      const pick = shuffleR(rnd, opts).slice(0, 4);
      const a = pick[0];
      const mk = (o: [string, number, CtQ, string]) => [seq([{ midis: jz(key, 0, 'maj7') }, { midis: jz(key, o[1], o[2]) }, { midis: jz(key, 0, 'maj7'), dur: 1.6 }], 1)];
      const names: Names = Object.fromEntries(opts.map((o) => [o[0], nm(o[3], o[3])]));
      return choiceQ({ ...base, difficulty: 1450, ask: { en: `Straight to ${kn}maj7: which chord came before?`, he: `ישר אל ${kn}maj7: איזה אקורד בא לפני?` }, names, answer: a[0], choices: shuffleR(rnd, pick.map((o) => o[0])), stimulus: mk(a), choiceStim: Object.fromEntries(pick.map((o) => [o[0], mk(o)])) });
    }
    if (k === 4) {
      const hd = rnd() < 0.5;
      const mk = (h: boolean) => [seq([{ midis: jz(key, 2, h ? 'm7b5' : 'm7') }, { midis: jz(key, 7, h ? '7b9' : '7') }, { midis: jz(key, 0, 'maj7'), dur: 1.8 }], 1)];
      const names: Names = { hd: nm('iiø7 – V7♭9 (borrowed)', 'iiø7 – V7♭9 (שאול)', 'half diminished'), m7: nm('ii m7 – V7', 'ii m7 – V7', 'minor seven') };
      return choiceQ({ ...base, difficulty: 1550, ask: { en: `ii – V – ${kn}maj7: the minor's ii, or the major's?`, he: `ii – V – ${kn}maj7: ה־ii של המינור, או של המז׳ור?` }, names, answer: hd ? 'hd' : 'm7', choices: ['m7', 'hd'], stimulus: mk(hd), choiceStim: { m7: mk(false), hd: mk(true) } });
    }
    // k === 5: borrowing in minor — the Picardy third, the Dorian IV7, the Dorian ii m7.
    const opts: [string, [number, CtQ][], string, string][] = [
      ['picardy', [[2, 'm7b5'], [7, '7'], [0, 'M']], 'Picardy third (major I)', 'הטרצה הפיקרדית (I מז׳ורי)'],
      ['iv7', [[0, 'm6'], [5, '7'], [0, 'm6']], 'Dorian IV7', 'IV7 דורי'],
      ['iim7', [[0, 'm6'], [2, 'm7'], [7, '7'], [0, 'm6']], 'Dorian ii m7', 'ii m7 דורי'],
    ];
    const a = pickR(rnd, opts);
    const mk = (o: (typeof opts)[number]) => [seq(o[1].map(([d, q], i) => ({ midis: jz(key, d, q), dur: i === o[1].length - 1 ? 1.6 : 1 })), 1)];
    const names: Names = Object.fromEntries(opts.map((o) => [o[0], nm(o[2], o[3])]));
    return choiceQ({ ...base, difficulty: 1700, ask: { en: `In ${kn} minor: which borrowed colour?`, he: `ב־${kn} מינור: איזה צבע שאול?` }, names, answer: a[0], choices: opts.map((o) => o[0]), stimulus: mk(a), choiceStim: Object.fromEntries(opts.map((o) => [o[0], mk(o)])) });
  },
};
TOPIC_TAGS['modal-mix'] = tg(['cadences', 'chromatic', 1]);

// planing 4: the melody picks the chord — diatonic or exact planing under a 4-note line (C.5).
extend('planing', [{ en: 'The melody picks the chord: diatonic or exact?', he: 'המנגינה בוחרת את האקורד: דיאטוני או מדויק?' }], (seed, _k, id) => {
  const rnd = rng(seed);
  const key = Math.floor(rnd() * 12);
  const exact = rnd() < 0.5;
  const MAJ = [0, 2, 4, 5, 7, 9, 11];
  const degs = pickR(rnd, [[2, 1, 0, 5], [4, 3, 2, 1], [0, 1, 2, 4], [5, 4, 2, 0]]);
  const mk = (ex: boolean) => [
    seq(
      degs.map((d) => {
        const top = pin(key + MAJ[d], 70);
        // exact: the same maj7 drop-2 shape (root on top); diatonic: the scale's own 7th chord on that degree, top kept
        const [t3, t5, t7] = [2, 4, 6].map((x) => MAJ[(d + x) % 7]);
        const shape = ex ? [-13, -8, -5, 0] : [-(mod12(MAJ[d] - t7) + 12), -mod12(MAJ[d] - t3), -mod12(MAJ[d] - t5), 0];
        return { midis: shape.map((x) => top + x) };
      }),
      0.9,
    ),
  ];
  const names: Names = { dia: nm('Diatonic: chords of the key', 'דיאטוני: אקורדי הסולם', 'diatonic'), exact: nm('Exact: one shape', 'מדויק: צורה אחת', 'exact') };
  return choiceQ({ id, topic: 'planing', level: 4, seed, skill: 'cadences', difficulty: 1650, ask: { en: 'Under the melody: chords of the key, or one shape?', he: 'מתחת למנגינה: אקורדי הסולם, או צורה אחת?' }, names, answer: exact ? 'exact' : 'dia', choices: ['dia', 'exact'], stimulus: mk(exact), choiceStim: { dia: mk(false), exact: mk(true) } });
});

// reharm-spot 5: jazz deceptive resolutions (C.7) — V7 to anything but I.
extend('reharm-spot', [{ en: 'Deceptive: where does V7 go?', he: 'הטעיה: לאן הולך ה־V7?' }], (seed, _k, id) => {
  const rnd = rng(seed);
  const key = Math.floor(rnd() * 12);
  const kn = rootName(key);
  const T: [string, [number, CtQ][], string][] = [
    ['I', [[0, 'maj7']], 'Imaj7'],
    ['iii', [[4, 'm7']], 'iii m7'],
    ['bVI', [[8, 'maj7']], '♭VImaj7'],
    ['IV', [[5, 'maj7']], 'IVmaj7'],
    ['Vii', [[9, '7'], [2, 'm7']], 'VI7 → ii'],
  ];
  const pick = shuffleR(rnd, T).slice(0, 4);
  const a = pick[0];
  const mk = (o: (typeof T)[number]) => [seq([{ midis: jz(key, 2, 'm7') }, { midis: jz(key, 7, '7') }, ...o[1].map(([d, q]) => ({ midis: jz(key, d, q), dur: 1.4 }))], 0.9)];
  const names: Names = Object.fromEntries(T.map((o) => [o[0], nm(o[2], o[2])]));
  return choiceQ({ id, topic: 'reharm-spot', level: 5, seed, skill: 'cadences', difficulty: 1740, ask: { en: `ii – V7 in ${kn}, then where?`, he: `ii – V7 ב־${kn}, ואז לאן?` }, names, answer: a[0], choices: shuffleR(rnd, pick.map((o) => o[0])), stimulus: mk(a), choiceStim: Object.fromEntries(pick.map((o) => [o[0], mk(o)])) });
});
