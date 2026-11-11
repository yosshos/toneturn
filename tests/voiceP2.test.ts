// The voice course, second build (VOICE_CURRICULUM "Implemented (P2)"): quarter tones, reading over the band and
// lead sheets, my song, colla voce, the AABA chorus, blues call and response with falls, motif, embellishing,
// bebop accents, trading twos and fours, the rest reminder, and the sung licks' timing tolerance.
import { describe, expect, it } from 'vitest';
import { itemTargets, type VocalItem } from '../src/engine/vocal';
import { gradeMore, simulateMore } from '../src/engine/vocalMore';
import { MICRO_LEVELS, MY_SONG_LEVELS, READ_LEVELS, SCAT_P2_LEVELS, STANDARD_MORE_LEVELS, VOICE_FAMILIES, vocalLevelByRef, voiceItemTags, familyOfRef } from '../src/engine/voiceFamilies';
import { gradeMicro, synthDetached, Follower, gradeRubato, synthRubato, restAdvice, tradeTurns, synthTrade, tradeOpening, tradeReply, sungLine } from '../src/engine/voiceP2';
import { bopAccents, embellishment, gradeRubatoSong, gradeScat, gradeSong, motifCell, phraseFalls, scatCentre, scatChart, scatTurns, MOTIF_ANSWER_AT } from '../src/engine/voiceGrade';
import { sheetNotes, songBacking, songPlan, voiceSong, gradeSongTake } from '../src/engine/voiceSongs';
import { synthLine } from '../src/engine/voiceTime';
import { framesFromSamples, melodyFromFrames, mySongPlan } from '../src/engine/voiceMySong';
import { analyzeTake, expTimeMs, VOICE_TIMING } from '../src/engine/drills/analyze';
import { LICKS, lickDrill } from '../src/engine/licks';
import { stepCatalogue } from '../src/engine/path';
import type { SungFrame } from '../src/engine/sing';

const R = { low: 50, high: 74 };
const item = (lv: number, k = 0): VocalItem => vocalLevelByRef(lv)!.items[k];
const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

describe('P2 levels sit in their families (path, names, tags)', () => {
  const p2 = [704, 1903, 1904, 1308, 1408, 1409, 1410, 1507, 1508, 1509, 1510];
  it('every P2 level is in exactly one family and is a path step', () => {
    const steps = new Set(stepCatalogue().filter((s) => s.kind === 'vocal').map((s) => s.ladder!.ref));
    for (const n of p2) {
      expect(VOICE_FAMILIES.filter((f) => f.refs.includes(n)).length, String(n)).toBe(1);
      expect(steps.has(String(n)), String(n)).toBe(true);
    }
    expect(familyOfRef(704)!.id).toBe('v-pitch');
    expect(familyOfRef(1903)!.id).toBe('v-sight');
    expect(familyOfRef(1308)!.id).toBe('v-songs');
    expect(familyOfRef(1408)!.id).toBe('v-standards');
    expect(familyOfRef(1510)!.id).toBe('v-scat');
  });
  it('teaching order: motif and embellishing right after call and response; my song before the performance take', () => {
    const scat = VOICE_FAMILIES.find((f) => f.id === 'v-scat')!.refs;
    expect(scat.slice(0, 3)).toEqual([1501, 1507, 1508]);
    expect(scat[scat.length - 1]).toBe(1510);
    const songs = VOICE_FAMILIES.find((f) => f.id === 'v-songs')!.refs;
    expect(songs.slice(-2)).toEqual([1308, 1307]);
  });
  it('trading and the motif rate improvisation', () => {
    expect(voiceItemTags(1510, item(1510)).skill).toBe('improv');
    expect(voiceItemTags(1507, item(1507)).tags.some((t) => t.sub === 'improv/play')).toBe(true);
    expect(voiceItemTags(1904, item(1904)).skill).toBe('sight');
  });
});

describe('F2 L7 quarter tones', () => {
  it('a clean detached take of every item passes; a quarter tone sung on the piano key does not', () => {
    for (const it0 of MICRO_LEVELS[0].items) {
      const tg = itemTargets(it0, R);
      const g = gradeMore(it0, simulateMore(it0, tg)!, R);
      expect(g.score, it0.id).toBeGreaterThanOrEqual(MICRO_LEVELS[0].pass);
    }
    const rast = item(704, 1);
    const tg = itemTargets(rast, R);
    // E half-flat sung as E (50 ¢ off): the quarter tone is missed
    const sour = synthDetached(tg.map((m) => (Math.abs(m - Math.round(m)) > 0.2 ? m + 0.5 : m)));
    expect(gradeMicro(sour, tg).score).toBeLessThan(MICRO_LEVELS[0].pass);
    // 30 ¢ off everywhere fails the 15 ¢ rule
    expect(gradeMicro(synthDetached(tg, { cents: 30 }), tg).score).toBeLessThan(MICRO_LEVELS[0].pass);
  });
});

describe('F9 L8–L9 reading over the band and lead sheets', () => {
  it('ties merge into one sung note; the sheet keeps both tokens with the tie mark', () => {
    const s = voiceSong('lead-night-walk')!;
    const p = songPlan(s, R);
    const sheet = sheetNotes(s, p.tonic);
    const sung = sheet.filter((n) => !n.rest).length;
    const ties = sheet.filter((n) => n.tie).length;
    expect(ties).toBeGreaterThanOrEqual(3);
    expect(p.notes.length).toBe(sung - ties);
    // The tied A (beat 3 of bar 1 → bar 2) lasts three beats, swung or not.
    expect(p.notes[2].dur / p.beat).toBeCloseTo(3, 1);
  });
  it('every reading item: a clean take passes, half a step flat does not', () => {
    for (const l of READ_LEVELS)
      for (const it0 of l.items) {
        const s = voiceSong(it0.song!.id)!;
        const p = songPlan(s, R);
        const to = p.bars - 1;
        expect(gradeSong(it0, synthLine(p.notes), p, 0, to).grade.score, it0.id).toBeGreaterThanOrEqual(l.pass);
        expect(gradeSong(it0, synthLine(p.notes, { cents: -80 }), p, 0, to).grade.score, it0.id).toBeLessThan(l.pass);
      }
  });
});

describe('F13 L8 my song', () => {
  it('takes the melody out of a recording, phrase by phrase, and scores a take against it', async () => {
    const sr = 22050;
    const mel = [62, 64, 66, 67, 69, -1, -1, 69, 67, 66, 64, 62];
    const x = new Float32Array(Math.round(sr * mel.length * 0.4));
    mel.forEach((m, k) => {
      if (m < 0) return;
      for (let i = 0; i < sr * 0.36; i++) x[Math.round(k * 0.4 * sr) + i] = 0.3 * Math.sin((2 * Math.PI * midiHz(m) * i) / sr);
    });
    const fr = await framesFromSamples(x, sr, { yieldEvery: 100000 });
    const m = melodyFromFrames(fr)!;
    expect(m).not.toBeNull();
    expect(m.notes.length).toBe(10);
    expect(m.phrases).toBe(2);
    expect(Math.round(m.notes[0].midi)).toBe(62);
    const plan = mySongPlan(m, R);
    const g = gradeSongTake(synthLine(plan.notes), plan, { rhythm: true, need: 0.7 });
    expect(g.phrases.length).toBe(2);
    expect(g.score).toBeGreaterThan(0.85);
    expect(gradeSongTake(synthLine(plan.notes, { cents: 90 }), plan, { rhythm: true, need: 0.7 }).score).toBeLessThan(0.7);
    expect(MY_SONG_LEVELS[0].items[0].song!.mine).toBe(true);
  });
  it('no melody from silence', () => {
    expect(melodyFromFrames(Array.from({ length: 200 }, (_, k) => ({ t: k * 0.02, hz: null, confidence: 0, rms: 0.001 })))).toBeNull();
  });
});

describe('F14 L6 colla voce: the follower', () => {
  const s = voiceSong('slow-harbor')!;
  const p = songPlan(s, R);
  const tg = p.notes.map((n) => n.midi);
  it('follows a free-tempo take note by note, through a repeated pitch', () => {
    const secs = p.notes.map((n, i) => n.dur * (i % 2 ? 1.3 : 0.8));
    const fw = new Follower(tg);
    const hits: number[] = [];
    for (const f of synthRubato(tg, secs)) {
      const k = fw.push(f);
      if (k !== null) hits.push(k);
    }
    expect(hits).toEqual(tg.map((_, i) => i));
    const g = gradeRubato(synthRubato(tg, secs), tg, p.notes.map((n) => n.phrase));
    expect(g.follow).toBe(1);
    for (const ph of g.phrases) expect(ph.score).toBeGreaterThan(0.9);
  });
  it('a sour take is followed (the band still moves) but does not pass', () => {
    const it0 = STANDARD_MORE_LEVELS[0].items[0];
    const good = gradeRubatoSong(it0, synthRubato(tg, p.notes.map((n) => n.dur)), p, 0, p.bars - 1);
    expect(good.grade.score).toBeGreaterThanOrEqual(STANDARD_MORE_LEVELS[0].pass);
    const sour = gradeRubatoSong(it0, synthRubato(tg, p.notes.map((n) => n.dur), { cents: 60 }), p, 0, p.bars - 1);
    expect(sour.grade.score).toBeLessThan(STANDARD_MORE_LEVELS[0].pass);
  });
});

describe('F14 L9 the AABA chorus, F14 L10 call and response', () => {
  const s = voiceSong('lantern-street')!;
  const p = songPlan(s, R);
  it('32 bars, four sections; as written passes the written item', () => {
    expect(p.bars).toBe(32);
    expect(p.phrases.length).toBe(4);
    expect(gradeSong(item(1409, 0), synthLine(p.notes), p, 0, 31).grade.score).toBeGreaterThanOrEqual(0.72);
  });
  it('the interpreted item: the last A as written fails; anticipated by an eighth, it passes', () => {
    const it1 = item(1409, 1);
    expect(gradeSong(it1, synthLine(p.notes), p, 0, 31).grade.score).toBeLessThan(0.72);
    const moved = p.notes.map((n) => (n.phrase === 3 ? { ...n, start: n.start - p.beat / 2 } : n));
    const g = gradeSong(it1, synthLine(moved), p, 0, 31);
    expect(g.grade.score, JSON.stringify(g.grade.metrics.map((m) => [m.key, m.value]))).toBeGreaterThanOrEqual(0.72);
  });
  it('call and response: the band answers in the gaps; falls at the phrase ends are counted', () => {
    const c = voiceSong('call-and-answer')!;
    const cp = songPlan(c, R);
    const b = songBacking(cp);
    // the answer line sounds in bars 3–4 (after the lead of the count-in and the intro bar)
    const answer = b.events.filter((e) => !e.perc && e.velocity === 0.62);
    expect(answer.length).toBeGreaterThanOrEqual(10);
    const plain = synthLine(cp.notes);
    expect(phraseFalls(plain, cp, 0, 11).falls).toBe(0);
    const ends = cp.phrases.map((ph) => cp.notes[ph.notes[ph.notes.length - 1]]).map((n) => ({ end: n.start + n.dur, midi: n.midi }));
    const fell = plain.map((x) => {
      const e = ends.find((y) => x.t >= y.end - 0.3 && x.t < y.end);
      return e && x.hz ? { ...x, hz: midiHz(e.midi - (x.t - (e.end - 0.3)) * 10) } : x;
    });
    expect(phraseFalls(fell, cp, 0, 11)).toEqual({ falls: 3, phrases: 3 });
    expect(gradeSong(item(1410), fell, cp, 0, 11).grade.score).toBeGreaterThanOrEqual(0.7);
    expect(gradeSong(item(1410), plain, cp, 0, 11).grade.score).toBeLessThan(0.7);
  });
});

describe('F15 L3 embellishing, L7 bebop accents', () => {
  it('embellished: long notes kept and 20 % more notes; as written: nothing added', () => {
    const s = voiceSong('blue-window')!;
    const p = songPlan(s, R);
    const plain = synthLine(p.notes);
    expect(embellishment(plain, p, 0, 11).added).toBeLessThan(0.2);
    const emb = synthLine(p.notes.flatMap((n) => (n.dur >= p.beat * 0.99 ? [{ ...n, dur: n.dur / 2 }, { ...n, midi: n.midi + 2, start: n.start + n.dur / 2, dur: n.dur / 4 }, { ...n, start: n.start + (3 * n.dur) / 4, dur: n.dur / 4 }] : [n])));
    const e = embellishment(emb, p, 0, 11);
    expect(e.added).toBeGreaterThanOrEqual(0.2);
    expect(e.kept).toBeGreaterThanOrEqual(0.8);
    expect(gradeSong(item(1508, 1), emb, p, 0, 11).grade.score).toBeGreaterThanOrEqual(0.6);
    expect(gradeSong(item(1508, 1), plain, p, 0, 11).grade.score).toBeLessThan(0.6);
  });
  it('bebop: swung and the off-beats accented passes; even loudness does not', () => {
    const s = voiceSong('bop-line')!;
    const p = songPlan(s, R);
    const flat = synthLine(p.notes);
    const acc = flat.map((x) => ({ ...x, rms: x.hz && x.rms > 0.05 && (x.t / p.beat) % 1 > 0.55 && (x.t / p.beat) % 1 < 0.8 ? 0.2 : x.rms }));
    const b = bopAccents(acc, p, 0, p.bars - 1);
    expect(b.lift).toBeGreaterThanOrEqual(1.5);
    expect(b.ratio).toBeGreaterThan(1.4);
    expect(bopAccents(flat, p, 0, p.bars - 1).lift).toBeLessThan(1.5);
    expect(gradeSong(item(1509), acc, p, 0, p.bars - 1).grade.score).toBeGreaterThanOrEqual(0.65);
    expect(gradeSong(item(1509), flat, p, 0, p.bars - 1).grade.score).toBeLessThan(0.65);
  });
});

describe('F15 L2 motif, L10 trading', () => {
  const tonicPc = 0;
  it('the motif repeated and sequenced is two developments; unrelated notes are none', () => {
    const it0 = SCAT_P2_LEVELS[0].items[0];
    const beat = 60 / it0.scat!.bpm;
    const cell = motifCell(it0, scatCentre(tonicPc, undefined, 62));
    const play = (ns: { midi: number; beat: number; dur: number }[]) => synthLine(ns.map((n) => ({ midi: n.midi, start: n.beat * beat, dur: n.dur * beat * 0.8 })));
    const dev = play([...cell.map((n) => ({ ...n, beat: n.beat + MOTIF_ANSWER_AT })), ...cell.map((n) => ({ ...n, midi: n.midi + 2, beat: n.beat + 16 })), ...cell.map((n) => ({ ...n, beat: n.beat + 25 }))]);
    const g = gradeScat(it0, dev, tonicPc);
    expect(g.kinds!.length).toBeGreaterThanOrEqual(2);
    expect(g.grade.score).toBeGreaterThanOrEqual(SCAT_P2_LEVELS[0].pass);
    const other = play([9, 3, 11, 6, 1, 8, 4].map((x, k) => ({ midi: 60 + x, beat: MOTIF_ANSWER_AT + k * 1.5, dur: 1 })));
    expect(gradeScat(it0, other, tonicPc).grade.score).toBeLessThan(SCAT_P2_LEVELS[0].pass);
  });
  it('turns alternate, the app first; twos over a blues give three answers', () => {
    const tw = tradeTurns(12, 2);
    expect(tw.map((t) => t.who)).toEqual(['app', 'you', 'app', 'you', 'app', 'you']);
    expect(scatTurns(item(1510, 1)).length).toBe(6);
  });
  it('the app replies with the singer’s cell, inside its turn', () => {
    const sung = [{ beat: 0, dur: 0.5, midi: 64 }, { beat: 0.5, dur: 0.5, midi: 67 }, { beat: 1, dur: 1, midi: 69 }];
    const r = tradeReply(sung, 64, 8, () => []);
    expect(r.length).toBeGreaterThanOrEqual(3);
    expect(r.every((n) => n.beat < 8)).toBe(true);
    expect(r[1].midi - r[0].midi).toBe(3); // the cell's first interval, sequenced
    const ch = scatChart(item(1510), tonicPc);
    const open = tradeOpening(ch.pcsAt, 62, 0, 8);
    expect(open.length).toBeGreaterThan(6);
  });
  it('chord tones on the grid in every turn passes; silence in the turns does not', () => {
    for (const it0 of SCAT_P2_LEVELS[3].items) {
      const ch = scatChart(it0, tonicPc);
      const fr = synthTrade(scatTurns(it0), ch.pcsAt, it0.scat!.bpm, 62);
      const g = gradeScat(it0, fr, tonicPc);
      expect(g.grade.score, JSON.stringify(g.grade.metrics.map((m) => [m.key, m.value]))).toBeGreaterThanOrEqual(SCAT_P2_LEVELS[3].pass);
      expect(g.turns!.every((n) => n >= 3)).toBe(true);
    }
    const quiet: SungFrame[] = Array.from({ length: 500 }, (_, k) => ({ t: k * 0.02, hz: null, confidence: 0, rms: 0.001 }));
    expect(gradeScat(item(1510), quiet, tonicPc).grade.unclear).toBe(true);
  });
  it('sung notes as a line: swung eighths quantize to the written eighth', () => {
    const beat = 0.5;
    const fr = synthLine([{ midi: 60, start: 0, dur: 0.3 }, { midi: 62, start: beat * (2 / 3), dur: 0.15 }, { midi: 64, start: beat, dur: 0.3 }]);
    expect(sungLine(fr, beat, 0).map((n) => n.beat)).toEqual([0, 0.5, 1]);
  });
});

describe('vocal health: the rest reminder', () => {
  const now = new Date('2026-11-11T18:00:00Z');
  const at = (min: number) => new Date(now.getTime() - min * 60000).toISOString();
  it('suggests a break after about 30 sung minutes today', () => {
    expect(restAdvice([{ at: at(10), secs: 600 }, { at: at(5), secs: 900 }], now)).toMatchObject({ minutes: 25, suggest: false });
    expect(restAdvice([{ at: at(10), secs: 1200 }, { at: at(5), secs: 700 }], now)).toMatchObject({ minutes: 32, suggest: true });
    // yesterday does not count
    expect(restAdvice([{ at: '2026-11-10T10:00:00Z', secs: 4000 }], now).suggest).toBe(false);
  });
  it('or when the voice tires within the hour (stability ≥ 8 ¢ worse)', () => {
    const takes = [6, 6, 7, 9, 15, 16, 17].map((st, k) => ({ at: at(40 - k * 5), secs: 8, stability: st }));
    expect(restAdvice(takes, now)).toMatchObject({ tired: true, suggest: true });
    expect(restAdvice(takes.map((t) => ({ ...t, stability: 7 })), now).tired).toBe(false);
  });
});

describe('sung licks: the voice timing tolerance', () => {
  it('a sung take with ±35 ms onset spread passes as a voice, not with the instrument limits', () => {
    const l = LICKS[0];
    const d = lickDrill(l, 0, 'voice', { range: R });
    expect(d.sung).toBe(true);
    const bpm = 90;
    const jit = [0, 40, -35, 30, -40, 35, -30, 40, -25, 30, -40, 20];
    const played = d.notes.map((n, i) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm) + jit[i % jit.length], off: null, vel: 64 }));
    const asVoice = analyzeTake(d, bpm, played, undefined, { mic: true, voice: true });
    const asPiano = analyzeTake(d, bpm, played, undefined, { mic: true });
    expect(asVoice.timingSD!).toBeLessThanOrEqual(VOICE_TIMING.sd);
    expect(asVoice.verdict).toBe('clean');
    expect(asPiano.verdict).not.toBe('clean');
    // a really sloppy take still fails as a voice
    const sloppy = d.notes.map((n, i) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm) + (i % 2 ? 110 : -90), off: null, vel: 64 }));
    expect(analyzeTake(d, bpm, sloppy, undefined, { mic: true, voice: true }).verdict).not.toBe('clean');
  });
  it('instrument licks are unchanged (no sung flag)', () => {
    expect(lickDrill(LICKS[0], 0, 'piano').sung).toBeUndefined();
  });
});
