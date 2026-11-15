// Free comping by rule (Siskind, docs/research/SISKIND-SOLO-PIANO.md C3 final level; JPF Book 2 U6 "free comping"):
// the player chooses the comping rhythm; the take is graded by soloPiano.ts freeCompCheck — the density band, three
// different bar rhythms or more, no three identical bars in a row, anticipations that sound the next chord, and hits
// that are voicings of the chord. The written notes are only a model shown on the staff. Pure.

import type { Drill, PlayedNote, TakeMetrics } from './types';
import { freeCompCheck, type TChord } from '../soloPiano';

/** Played notes struck together (within 70 ms) are one comping hit; the hit's beat on the take's clock (swung "ands" at 2/3). */
export function compHitsOfTake(played: PlayedNote[], bpm: number): { beat: number; pcs: number[]; dev: number }[] {
  const beatMs = 60000 / bpm;
  const ps = [...played].sort((a, b) => a.on - b.on);
  const out: { at: number; pcs: number[] }[] = [];
  for (const p of ps) {
    const last = out[out.length - 1];
    if (last && p.on - last.at <= 70) last.pcs.push(p.pitch);
    else out.push({ at: p.on, pcs: [p.pitch] });
  }
  return out.map((h) => {
    const b = h.at / beatMs;
    const whole = Math.floor(b + 0.15);
    const f = b - whole;
    const beat = whole + (f >= 0.4 && f < 0.85 ? 0.5 : f >= 0.85 ? 1 : 0);
    // how far from the swung grid (the "and" at 2/3 of the beat)
    const grid = (Math.floor(beat) + (beat % 1 ? 2 / 3 : 0)) * beatMs;
    return { beat, pcs: h.pcs, dev: h.at - grid };
  });
}

export function analyzeFreeCompTake(drill: Drill, bpm: number, played: PlayedNote[]): TakeMetrics {
  const g = drill.goal.freeComp!;
  const cs: TChord[] = g.chords.map((c) => ({ ...c }));
  const hits = compHitsOfTake(played, bpm);
  const r = freeCompCheck(hits, cs, g.bars);
  // the time still counts: the hits' spread around the grid (SD), as steady as the written comping levels ask
  const devs = hits.map((h) => h.dev);
  const mu = devs.length ? devs.reduce((a, b) => a + b, 0) / devs.length : 0;
  const timingSD = devs.length >= 3 ? Math.sqrt(devs.reduce((a, b) => a + (b - mu) ** 2, 0) / devs.length) : null;
  const steady = timingSD === null || timingSD <= 25;
  const checks = [r.density, r.variety >= Math.min(3, g.bars), !r.repeats, r.anticipations.ok === r.anticipations.total, r.wrongHits <= Math.max(1, Math.floor(hits.length * 0.1))];
  const okN = checks.filter(Boolean).length;
  const accuracy = okN / checks.length;
  const verdict: TakeMetrics['verdict'] = r.ok && steady ? 'clean' : okN >= checks.length - 1 ? 'almost' : 'not';
  const why = r.ok && !steady
    ? { en: `Timing unsteady (SD ${Math.round(timingSD!)} ms) — lock the hits to the click.`, he: `תזמון לא יציב (סטיית תקן ${Math.round(timingSD!)} ms) — לנעול את המכות על הקליק.` }
    : r.ok
    ? { en: `Free comping: ${r.variety} rhythms, every rule kept.`, he: `ליווי חופשי: ${r.variety} מקצבים, כל הכללים נשמרו.` }
    : !r.density
      ? { en: 'Keep 1–4 hits in every bar.', he: 'בין 1 ל־4 מכות בכל תיבה.' }
      : r.variety < Math.min(3, g.bars)
        ? { en: `Only ${r.variety} rhythms — vary the bars (3 or more).`, he: `רק ${r.variety} מקצבים — לגוון את התיבות (3 לפחות).` }
        : r.repeats
          ? { en: 'Three identical bars in a row — change one.', he: 'שלוש תיבות זהות ברצף — לשנות אחת.' }
          : r.anticipations.ok < r.anticipations.total
            ? { en: 'An anticipation must sound the next chord.', he: 'הקדמה צריכה להשמיע את האקורד הבא.' }
            : { en: `${r.wrongHits} hits off the chord.`, he: `${r.wrongHits} מכות מחוץ לאקורד.` };
  return {
    bpm,
    nps: 0,
    accuracy,
    wrong: r.wrongHits,
    missing: 0,
    timingMean: null,
    timingSD,
    cvR: null,
    cvL: null,
    handsMean: null,
    handsAbs: null,
    chordSpread: null,
    velSD: null,
    velMean: null,
    bandHit: null,
    slope: null,
    r2: null,
    accentGap: null,
    kot: null,
    kdr: null,
    hesitations: 0,
    glitches: [],
    chordToneOnBeats: null,
    voiceLeading: null,
    perNote: [],
    verdict,
    why,
  };
}
