// Phrases by ear (phraseDrills.ts): a take graded note by note by the transcription coach's comparer
// (transcribe.ts comparePhrase) — the answer aligned to the phrase in order (a missed or an extra note costs only
// itself), pitch folded to the take's octave, rhythm judged on the player's own pulse (a steady, slightly slower
// answer is not wrong). The score is partial credit: notes found × (0.6 + 0.4 × in time) − extra notes. Pure.

import { comparePhrase, type HeardNote, type Phrase } from '../transcribe';
import type { Drill, NoteResult, PlayedNote, TakeMetrics } from './types';

/** The phrase a drill's answer is (beats from the answer's first bar). */
export function phraseOfDrill(drill: Drill, bpm: number): Phrase {
  const at = drill.phrase?.at ?? 0;
  return {
    id: drill.itemId,
    level: 5,
    key: drill.spec.key,
    minor: false,
    notes: drill.notes.map((n) => ({ midi: n.pitch, beat: n.beat - at, dur: n.dur })),
    chords: null,
    swing: !!drill.spec.swing,
    bpm,
    source: 'generated',
    title: drill.title,
  };
}

/** Grade a played answer (notes inside the call's bars already dropped by the take). */
export function analyzePhraseTake(drill: Drill, bpm: number, played: PlayedNote[]): TakeMetrics {
  const p = phraseOfDrill(drill, bpm);
  const heard: HeardNote[] = played.map((x) => ({ midi: x.pitch, start: x.on / 1000, end: x.off === null ? null : x.off / 1000 }));
  const back = new Map<HeardNote, PlayedNote>(heard.map((h, i) => [h, played[i]]));
  const r = comparePhrase(p, heard, bpm);
  const beatMs = 60000 / bpm;
  const perNote: NoteResult[] = r.notes.map((c, i) => ({
    exp: drill.notes[i],
    played: c.heard ? (back.get(c.heard) ?? null) : null,
    dev: c.beatErr === null ? null : Math.round(c.beatErr * beatMs),
    ok: c.verdict === 'ok',
  }));
  const wrong = r.notes.filter((c) => c.verdict === 'pitch').length + r.extra;
  const missing = r.notes.filter((c) => c.verdict === 'missing').length;
  const span = Math.max(1e-6, ...drill.notes.map((n) => n.beat + n.dur)) - Math.min(...drill.notes.map((n) => n.beat));
  return {
    bpm,
    nps: Math.round(((drill.notes.length / span) * bpm) / 60 * 100) / 100,
    accuracy: r.score,
    wrong,
    missing,
    timingMean: null,
    timingSD: null,
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
    perNote,
    verdict: r.verdict,
    // Coach tip: a wrong first note throws the whole phrase — find it against the chord first.
    why: r.first && r.first.i === 0 && r.first.what === 'pitch' ? { en: 'The first note is off: find it against the chord, then the rest.', he: 'הצליל הראשון לא נכון: מצאו אותו מול האקורד, ואז את השאר.' } : r.why,
    phrase: { pitchAcc: r.pitchAcc, rhythmAcc: r.rhythmAcc, score: r.score, tempo: r.tempo },
  };
}
