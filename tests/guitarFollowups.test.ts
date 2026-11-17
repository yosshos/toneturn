// GUITAR-AUDIT follow-ups (2026-11-17): left-handed drill chord boxes, rhythm under the tab (T2), guitar checks on
// phrases and free-time takes (B5), MIDI guitar strings by channel + pitch bend (B7), hollow open strings in Chord Rush
// (N3), the calibration log and the named chord thresholds (B10).
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generate } from '../src/engine/drills/generate';
import { generateGuitar } from '../src/engine/drills/guitar';
import { expTimeMs } from '../src/engine/drills/analyze';
import { analyzeFree } from '../src/engine/drills/rubato';
import { analyzeGuitarTake, CHORD_CLEAR_MISS, CHORD_MIC_REPORT_SHARE, UNPITCHED, type GFrame } from '../src/engine/drills/guitarAnalyze';
import { analyzeGuitarFree, guitarFreeProgress } from '../src/engine/drills/guitarFree';
import { appendCalib, calibEntry, calibJson, calibThresholds, CALIB_KEY, CALIB_ON_KEY, logGuitarTake, readCalib, setCalibEnabled } from '../src/engine/drills/guitarCalib';
import { bendTrace, channelBase, placeMidiGuitar, stringOfChannel, type BendEvent, type ChannelNote } from '../src/engine/midiGuitar';
import { stemMark, tabRhythm } from '../src/engine/tabRhythm';
import { MidiInput } from '../src/speech/midi';
import { phraseDrill } from '../src/engine/encore/phrase';
import { noteAt, TUNINGS } from '../src/engine/fretboard';
import { addTake } from '../src/engine/analysis/model';
import { DrillScore, drillSettingsOf } from '../src/ui/Drills';
import { ChordPair, DiagramView } from '../src/ui/Instrument';
import { strummedChords } from '../src/ui/DrillTake';
import { DEFAULT_SETTINGS } from '../src/storage/progress';
import type { Drill, DrillSpec, ExpNote, PlayedNote } from '../src/engine/drills/types';
import { phrase } from './encoreFixtures';

const STD = TUNINGS[0].open;
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
/** The g-chords A / D one-minute pair (string 2 has the A chord's only C♯). */
const chordDrill = (): Drill => generate({ family: 'g-chords', kind: 'one-minute', key: 0, hands: 'R', option: 0, perBeat: 0.25 } as never);
const groups = (d: Drill) => [...new Set(d.notes.map((n) => n.beat))].sort((a, b) => a - b).map((b) => d.notes.filter((n) => n.beat === b));

// ───────────────────────────── 1. left-handed chord boxes in drills ─────────────────────────────

describe('left-handed players: the drill chord boxes mirror (the tab does not)', () => {
  it('drillSettingsOf carries the left-handed neck, derived from Settings, never from the stored drill settings', () => {
    expect(drillSettingsOf({ ...DEFAULT_SETTINGS, leftHanded: true }).leftHanded).toBe(true);
    expect(drillSettingsOf({ ...DEFAULT_SETTINGS, leftHanded: false, drills: { ...drillSettingsOf(DEFAULT_SETTINGS), leftHanded: true } }).leftHanded).toBe(false);
  });

  it('DrillScore draws the Now / Next boxes mirrored for a left-handed player', () => {
    const d = { ...chordDrill(), spec: { ...chordDrill().spec, instrument: 'guitar' as const } };
    const cs = strummedChords(d.notes);
    const html = (lh: boolean) => renderToStaticMarkup(createElement(DrillScore, { drill: d, ds: drillSettingsOf({ ...DEFAULT_SETTINGS, instrument: 'guitar', leftHanded: lh }), lang: 'en' }));
    const pair = (lh: boolean) => renderToStaticMarkup(createElement(ChordPair, { now: cs[0].box, next: cs.find((c) => c.sig !== cs[0].sig)!.box, nowName: cs[0].name, nextName: cs.find((c) => c.sig !== cs[0].sig)!.name, lang: 'en', leftHanded: lh }));
    expect(html(true)).toContain(pair(true));
    expect(html(false)).toContain(pair(false));
    expect(pair(true)).not.toBe(pair(false));
  });
});

// ───────────────────────────── 2. rhythm under the tab ─────────────────────────────

describe('rhythm under the tab (T2)', () => {
  it('durations → stems: whole none, half short, quarter, 8th, 16th, dotted, triplet', () => {
    expect(stemMark(4).kind).toBe(0);
    expect(stemMark(2)).toEqual({ kind: 1, dotted: false, triplet: false });
    expect(stemMark(3)).toEqual({ kind: 1, dotted: true, triplet: false });
    expect(stemMark(1).kind).toBe(2);
    expect(stemMark(1.5)).toEqual({ kind: 2, dotted: true, triplet: false });
    expect(stemMark(0.5).kind).toBe(3);
    expect(stemMark(0.25).kind).toBe(4);
    expect(stemMark(1 / 3)).toEqual({ kind: 3, dotted: false, triplet: true });
  });

  it('8ths beam in pairs per beat; quarters stay single', () => {
    const at = [0, 0.5, 1, 1.5, 2, 3];
    const r = tabRhythm(at, [0.5, 0.5, 0.5, 0.5, 1, 1]);
    expect(r.marks.map((m) => m.kind)).toEqual([3, 3, 3, 3, 2, 2]);
    expect(r.beams).toEqual([
      { from: 0, to: 1, level: 1 },
      { from: 2, to: 3, level: 1 },
    ]);
  });

  it('16ths get a second beam; a rest breaks the beam; a lone 8th keeps a flag (no beam)', () => {
    const r = tabRhythm([0, 0.25, 0.5, 0.75], [0.25, 0.25, 0.25, 0.25]);
    expect(r.beams).toEqual([
      { from: 0, to: 3, level: 1 },
      { from: 0, to: 3, level: 2 },
    ]);
    // 8th, 8th rest, 8th: no beam across the rest
    expect(tabRhythm([0, 1], [0.5, 0.5]).beams).toEqual([]);
    // dotted 8th + 16th: one 8th beam, a 16th stub
    const d = tabRhythm([0, 0.75], [0.75, 0.25]);
    expect(d.marks[0]).toMatchObject({ kind: 3, dotted: true });
    expect(d.beams).toEqual([
      { from: 0, to: 1, level: 1 },
      { from: 1, to: 1, level: 2 },
    ]);
  });

  it('triplet 8ths under one "3"; 6/8 beams in dotted-quarter groups', () => {
    const t = tabRhythm([0, 1 / 3, 2 / 3], [1 / 3, 1 / 3, 1 / 3]);
    expect(t.triplets).toEqual([[0, 2]]);
    const six = tabRhythm([0, 0.5, 1, 1.5, 2, 2.5], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5], 1.5);
    expect(six.beams.filter((b) => b.level === 1)).toEqual([
      { from: 0, to: 2, level: 1 },
      { from: 3, to: 5, level: 1 },
    ]);
  });

  it('a column never lasts past the next one (a long written note before a quick one is drawn as the gap)', () => {
    expect(tabRhythm([0, 0.5], [2, 0.5]).marks[0].kind).toBe(3);
  });
});

// ───────────────────────────── 3. Encore / phrase drills keep the guitar checks ─────────────────────────────

/** Mic frames: a pitch per expected onset (or none), loud for 300 ms after each onset, an optional chroma. */
function micFrames(onsets: { t: number; midi: number | null; chroma?: number[]; cents?: (dt: number) => number }[], end: number): GFrame[] {
  const out: GFrame[] = [];
  for (let t = 0; t < end; t += 10) {
    const o = [...onsets].reverse().find((x) => x.t <= t);
    if (!o || t - o.t > 400) {
      out.push({ t, hz: null, conf: 0, rms: 0.002 });
      continue;
    }
    const c = o.cents ? o.cents(t - o.t) : 0;
    out.push({ t, hz: o.midi === null ? null : hz(o.midi + c / 100), conf: o.midi === null ? 0 : 0.95, rms: 0.2 * Math.exp(-(t - o.t) / 600), ...(o.chroma ? { chroma: o.chroma } : {}) });
  }
  return out;
}

describe('Encore guitar phrases keep the guitar checks (B5)', () => {
  const lick = phrase('enc-g', '0 2 4 5 7 9 11 12');
  const d = phraseDrill(lick, 0, 'R', { inst: 'guitar' });

  it('the phrase drill is a guitar drill with tab positions', () => {
    expect(d.spec.instrument).toBe('guitar');
    expect(d.notes.every((n) => n.string && n.fret !== undefined)).toBe(true);
  });

  it('free time: an unpitched onset is never a right note (plain analyzeFree counted it wrong; the guitar take says "not heard clearly")', () => {
    const played: PlayedNote[] = d.notes.map((n, i) => ({ pitch: i === 2 || i === 5 ? UNPITCHED : n.pitch, on: 400 + i * 700, off: null, vel: 80 }));
    const g = analyzeGuitarFree(d, played);
    expect(g.perNote.filter((r) => r.ok).length).toBe(6);
    expect(g.guitar.unclear).toBe(2);
    expect(g.verdict).not.toBe('clean');
    expect(g.why.en).toMatch(/not heard clearly/);
    expect(g.wrong).toBe(0);
    expect(analyzeFree(d, played).wrong).toBe(2); // the old free grader called them wrong notes
  });

  it('free time: a clean take is clean, with no timing numbers', () => {
    const played: PlayedNote[] = d.notes.map((n, i) => ({ pitch: n.pitch, on: 300 + i * 650 + (i % 2) * 120, off: null, vel: 80 }));
    const g = analyzeGuitarFree(d, played);
    expect(g.verdict).toBe('clean');
    expect(g.bpm).toBe(0);
    expect(g.timingSD).toBeNull();
    expect(g.perNote.every((r, i) => r.exp === d.notes[i])).toBe(true);
  });

  it('free time: strummed chords by microphone (one pitch per strum + chroma) pass; a dead string is named', () => {
    const c = chordDrill();
    const gs = groups(c);
    const pcsOf = (g: ExpNote[]) => new Set(g.map((n) => n.pitch % 12));
    const chroma = (g: ExpNote[], low: number[] = []) => Array.from({ length: 12 }, (_, i) => (low.includes(i) ? 0.03 : pcsOf(g).has(i) ? 1 : 0.03));
    const ons = gs.map((g, i) => ({ t: 500 + i * 900, midi: g[0].pitch, chroma: chroma(g) }));
    const played = ons.map((o) => ({ pitch: o.midi, on: o.t, off: null, vel: 80 }));
    const frames = micFrames(ons, 500 + gs.length * 900 + 500);
    // the plain free grader fails every chord (one pitch of five heard)
    expect(analyzeFree(c, played).verdict).toBe('not');
    const ok = analyzeGuitarFree(c, played, frames);
    expect(ok.verdict).toBe('clean');
    // the A chord's C♯ (string 2) never rings
    const ons2 = gs.map((g, i) => ({ ...ons[i], chroma: chroma(g, g.some((n) => n.pitch === 61) ? [1] : []) }));
    const bad = analyzeGuitarFree(c, played, micFrames(ons2, 500 + gs.length * 900 + 500));
    expect(bad.verdict).not.toBe('clean');
    expect(bad.why.en).toMatch(/C♯ didn't sound/);
  });

  it('free time: a bend glide is the bend, not extra notes; an under-bent bend lowers the verdict', () => {
    const b = generate({ family: 'g-lead', kind: 'bend', key: 9, hands: 'R', option: 2 });
    const bentIdx = b.notes.findIndex((n) => n.technique === 'bend');
    const n = b.notes[bentIdx];
    const k = Math.round((n.bendCents ?? 200) / 100);
    const ons = b.notes.map((x, i) => ({ t: 400 + i * 800, midi: x.pitch, cents: i === bentIdx ? (dt: number) => Math.min(n.bendCents ?? 200, dt * 2) : undefined }));
    const played: PlayedNote[] = b.notes.map((x, i) => ({ pitch: x.pitch, on: ons[i].t, off: null, vel: 80 }));
    // the tracker's legato onsets along the bend
    for (let s = 1; s <= k; s++) played.push({ pitch: n.pitch + s, on: ons[bentIdx].t + 60 * s, off: null, vel: 60 });
    played.sort((a, c) => a.on - c.on);
    const g = analyzeGuitarFree(b, played, micFrames(ons, 400 + b.notes.length * 800 + 500));
    expect(g.wrong).toBe(0);
    expect(g.guitar.bends.length).toBeGreaterThan(0);
    const flat = ons.map((o, i) => (i === bentIdx ? { ...o, cents: (dt: number) => Math.min(110, dt * 2) } : o));
    const gf = analyzeGuitarFree(b, played, micFrames(flat, 400 + b.notes.length * 800 + 500));
    expect(gf.verdict).not.toBe('clean');
    expect(gf.why.en).toMatch(/Bend/);
  });

  it('the free-time now-cue moves on a chord heard as one pitch (or none)', () => {
    const c = chordDrill();
    const gs = groups(c);
    const played = gs.slice(0, 3).map((g, i) => ({ pitch: i === 1 ? UNPITCHED : g[2].pitch, on: 100 + i * 800, off: null, vel: 70 }));
    expect(guitarFreeProgress(c, played)).toBe(gs[3][0].beat);
  });

  it('phrases by ear (drill.phrase): an unpitched onset is no longer a right pitch', () => {
    const p = generateGuitar({ family: 'g-phrase', kind: 'ph-ct', key: 0, hands: 'R', option: 0 } as DrillSpec);
    expect(p.phrase).toBeDefined();
    const bpm = 90;
    const right: PlayedNote[] = p.notes.map((n) => ({ pitch: n.pitch, on: expTimeMs(p, n.beat, bpm), off: null, vel: 80 }));
    const all = analyzeGuitarTake(p, bpm, right);
    const blurred = right.map((x, i) => (i % 2 ? { ...x, pitch: UNPITCHED } : x));
    const m = analyzeGuitarTake(p, bpm, blurred);
    expect(m.phrase).toBeDefined();
    expect(m.perNote.filter((r) => r.ok).length).toBeLessThan(all.perNote.filter((r) => r.ok).length);
    expect(m.guitar.unclear).toBeGreaterThan(0);
    expect(m.accuracy).toBeLessThan(all.accuracy);
    expect(m.verdict).not.toBe('clean');
  });
});

// ───────────────────────────── 4. MIDI guitar ─────────────────────────────

describe('MIDI guitar: channels and pitch bend (B7)', () => {
  it('the input passes the channel; one pitch on two strings is two held notes', () => {
    const m = new MidiInput();
    const seen: string[] = [];
    m.onNote((n, on, _at, _v, ch) => seen.push(`${n}${on ? '+' : '-'}@${ch}`));
    m.message([0x91, 64, 90], 0); // string 2, fret 5 (channel 2)
    m.message([0x90, 64, 90], 1); // string 1 open (channel 1)
    expect(m.heldNotes()).toEqual([64, 64]);
    m.message([0x81, 64, 0], 2);
    expect(m.heldNotes()).toEqual([64]);
    expect(seen).toEqual(['64+@1', '64+@0', '64-@1']);
  });

  it('pitch bend → cents on the channel (range 2 by default, RPN 0 from the device wins)', () => {
    const m = new MidiInput();
    const got: [number, number][] = [];
    m.onBend((ch, c) => got.push([ch, c]));
    m.message([0xe2, 0x00, 0x60], 0); // +4096 / 8192 of 2 semitones = +100 cents on channel 3
    expect(got.at(-1)).toEqual([2, 100]);
    m.message([0xe2, 0x00, 0x40], 1); // centre
    expect(got.at(-1)).toEqual([2, 0]);
    // the device announces ±12 on channel 3 (CC101 0, CC100 0, CC6 12)
    m.message([0xb2, 101, 0], 2);
    m.message([0xb2, 100, 0], 3);
    m.message([0xb2, 6, 12], 4);
    m.message([0xe2, 0x00, 0x60], 5);
    expect(got.at(-1)).toEqual([2, 600]);
    expect(m.bendOf(2)).toBe(600);
    // the setting applies to channels that announced nothing
    m.setOptions({ bendRange: 24 });
    m.message([0xe0, 0x00, 0x60], 6);
    expect(got.at(-1)).toEqual([0, 1200]);
  });

  it('channel → string: 1–6, 2–7, auto from the take, none for one channel', () => {
    expect(stringOfChannel(0, 0, 6)).toBe(1);
    expect(stringOfChannel(5, 0, 6)).toBe(6);
    expect(stringOfChannel(6, 0, 6)).toBeNull();
    expect(stringOfChannel(6, 1, 6)).toBe(6);
    const e = (str: number, fret: number, ch: number) => ({ pitch: noteAt(TUNINGS[0], str, fret), ch });
    expect(channelBase('auto', [e(1, 0, 0), e(6, 0, 5)], STD)).toBe(0);
    expect(channelBase('auto', [e(1, 0, 1), e(6, 0, 6)], STD)).toBe(1);
    // channels 2–4 only, played as 1–6 (open D on channel 4): as 2–7 the D would sit on the G string at fret −5 → 1–6
    expect(channelBase('auto', [e(2, 1, 1), e(3, 2, 2), e(4, 0, 3)], STD)).toBe(0);
    // truly ambiguous (both mappings give playable frets): 1–6, the common default; the setting decides otherwise
    expect(channelBase('auto', [e(1, 1, 1), e(2, 2, 2), e(3, 0, 3)], STD)).toBe(0);
    expect(channelBase('auto', [{ pitch: 60, ch: 0 }, { pitch: 64, ch: 0 }], STD)).toBeNull();
    expect(channelBase('2-7', [], STD)).toBe(1);
    expect(channelBase('off', [e(1, 0, 0), e(6, 0, 5)], STD)).toBeNull();
  });

  /** A MIDI guitar strum: each written note on its string's channel (1–6), minus `drop` strings. */
  const midiStrum = (d: Drill, bpm: number, drop: (n: ExpNote) => boolean = () => false): ChannelNote[] =>
    d.notes.filter((n) => !drop(n)).map((n, k) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm) + (k % 6) * 3, off: null, vel: 80, ch: n.string! - 1 }));

  it('placed notes carry string and fret; a dead string is named by its string even when its pitch is doubled', () => {
    // a unison chord: E4 on string 2 (fret 5) and string 1 (open) — by pitch alone the dead one can't be told
    const notes: ExpNote[] = [];
    for (let b = 0; b < 8; b++) {
      for (const [s, f] of [[4, 2], [3, 1], [2, 5], [1, 0]] as const) notes.push({ pitch: noteAt(TUNINGS[0], s, f), beat: b, dur: 1, hand: 'R', string: s, fret: f, chordId: b });
    }
    const d: Drill = { ...chordDrill(), notes, beats: 8, itemId: 'unison', recognize: undefined };
    const bpm = 80;
    const take = midiStrum(d, bpm, (n) => n.string === 1 && n.beat % 2 === 0);
    const placed = placeMidiGuitar(take, 'auto', STD);
    expect(placed.base).toBe(0);
    expect(placed.played.every((p) => p.string !== undefined && p.fret !== undefined)).toBe(true);
    const m = analyzeGuitarTake(d, bpm, placed.played);
    expect(m.guitar.chordMiss?.missed).toBe(4);
    expect(m.why.en).toMatch(/string 1 \(E\)/);
    // the same take without strings (a converter in poly mode): the doubled E can't be told apart — no line
    const plain = analyzeGuitarTake(d, bpm, take.map(({ ch: _c, ...p }) => p));
    expect(plain.guitar.chordMiss?.missed).toBe(0);
  });

  it('notes on another string than the tab: advice only, the long-term place is the real one', () => {
    const d = phraseDrill(phrase('enc-s', '0 2 4 5 7 9 11 12'), 0, 'R', { inst: 'guitar' });
    const bpm = 80;
    const take: ChannelNote[] = d.notes.map((n) => {
      // played one string lower where it fits (fret + 5, or + 4 from G to B)
      const s = Math.min(6, n.string! + 1);
      return { pitch: n.pitch, on: expTimeMs(d, n.beat, bpm), off: null, vel: 80, ch: s - 1 };
    });
    const placed = placeMidiGuitar(take, '1-6', STD);
    const m = analyzeGuitarTake(d, bpm, placed.played);
    expect(m.verdict).toBe('clean');
    expect(m.guitar.strings?.exact).toBe(d.notes.length);
    expect(m.guitar.strings!.other).toBeGreaterThan(2);
    expect(m.guitar.advice?.some((a) => /another string/.test(a.en))).toBe(true);
    // the player model keys the place on the string really played
    const mod = addTake({ v: 1, stats: {}, takes: 0, updated: '' }, d, m, bpm, '2026-11-17');
    const p0 = placed.played[0];
    expect(Object.keys(mod.stats)).toContain(`gp:${p0.string}:${p0.fret}`);
  });

  it('pitch bend → a pitch trace; bends and vibrato are graded from it (no microphone)', () => {
    const b = generate({ family: 'g-lead', kind: 'bend', key: 9, hands: 'R', option: 2 });
    const bpm = 70;
    const notes: ChannelNote[] = b.notes.map((n) => ({ pitch: n.pitch, on: expTimeMs(b, n.beat, bpm), off: expTimeMs(b, n.beat + n.dur, bpm) - 5, vel: 90, ch: (n.string ?? 1) - 1 }));
    const bendsTo = (cents: number): BendEvent[] =>
      b.notes.flatMap((n, i) => {
        if (n.technique !== 'bend') return [];
        const t0 = notes[i].on;
        return [0, 1, 2, 3, 4, 5].map((k) => ({ ch: notes[i].ch, cents: Math.round((cents * Math.min(k, 4)) / 4), at: t0 + 20 * k })).concat([{ ch: notes[i].ch, cents: 0, at: notes[i].off! + 1 }]);
      });
    const good = analyzeGuitarTake(b, bpm, placeMidiGuitar(notes, '1-6', STD).played, undefined, [], { pitchTrace: bendTrace(notes, bendsTo(b.notes.find((n) => n.technique === 'bend')!.bendCents!)) });
    expect(good.guitar.bends.length).toBeGreaterThan(0);
    expect(good.guitar.bends.every((x) => x.verdict === 'clean')).toBe(true);
    expect(good.verdict).toBe('clean');
    const flat = analyzeGuitarTake(b, bpm, placeMidiGuitar(notes, '1-6', STD).played, undefined, [], { pitchTrace: bendTrace(notes, bendsTo(120)) });
    expect(flat.verdict).not.toBe('clean');
    expect(flat.why.en).toMatch(/Bend/);
    // without the trace (pitch bend ignored, as before) nothing about bends is said
    expect(analyzeGuitarTake(b, bpm, placeMidiGuitar(notes, '1-6', STD).played).guitar.bends).toEqual([]);
  });

  it('bendTrace: the latest held note, its channel bend (a pre-bend sent before the note counts)', () => {
    const tr = bendTrace([{ pitch: 64, on: 0, off: 100, vel: 100, ch: 0 }], [{ ch: 0, cents: 200, at: -50 }], { stepMs: 50 });
    expect(tr.map((p) => (p.hz ? Math.round(12 * Math.log2(p.hz / 440) + 69) : null))).toEqual([66, 66, null]);
  });
});

// ───────────────────────────── 5. Chord Rush: hollow open strings ─────────────────────────────

describe('Chord Rush neck pictures (N3)', () => {
  it('an open string is a hollow ring at the nut; fretted notes stay dots', () => {
    const html = renderToStaticMarkup(createElement(DiagramView, { d: { kind: 'neck', instrument: 'guitar', dots: [{ str: 1, fret: 0 }, { str: 2, fret: 1 }, { str: 3, fret: 0 }], baseFret: 0, frets: 5 }, settings: { ...DEFAULT_SETTINGS, tuning: 'standard' } }));
    expect(html.match(/ open-str"/g)?.length).toBe(2);
    expect(html).toContain('data-open-string="1"');
    expect(html).toContain('data-open-string="3"');
    expect(html).toContain('r="7.5"');
    expect(html.match(/r="10"/g)?.length).toBe(1);
  });
});

// ───────────────────────────── 6–7. calibration log, named thresholds ─────────────────────────────

describe('guitar calibration log (B10) and the chord thresholds', () => {
  it('the thresholds keep their values, named', () => {
    expect(CHORD_CLEAR_MISS).toBe(0.09);
    expect(CHORD_MIC_REPORT_SHARE).toBe(0.25);
    expect(calibThresholds()).toMatchObject({ chordClearMiss: 0.09, chordMicReportShare: 0.25 });
  });

  const micChordTake = () => {
    const c = chordDrill();
    const bpm = 60;
    const gs = groups(c);
    const ons = gs.map((g) => ({ t: expTimeMs(c, g[0].beat, bpm), midi: g[0].pitch, chroma: Array.from({ length: 12 }, (_, i) => (i === 1 && g.some((n) => n.pitch === 61) ? 0.05 : g.some((n) => n.pitch % 12 === i) ? 1 : 0.03)) }));
    const frames = micFrames(ons, expTimeMs(c, c.beats, bpm) + 400);
    const played = ons.map((o) => ({ pitch: o.midi, on: o.t, off: null, vel: 80 }));
    return { c, bpm, m: analyzeGuitarTake(c, bpm, played, undefined, frames) };
  };

  it('an entry keeps each strum’s chroma levels and the decision, bends, changes per minute', () => {
    const { c, bpm, m } = micChordTake();
    const e = calibEntry(c, bpm, m, { input: 'mic', at: 'T' });
    expect(e.strums.length).toBe(8);
    const a = e.strums.find((s) => s.missing.includes(61))!;
    expect(a.levels![1]).toBeCloseTo(0.05, 3);
    expect(a.told).toEqual([61]);
    expect(a.clear).toBe(true);
    expect(e.chord).toMatchObject({ checked: 8, missed: 4, clear: 4, reported: true });
    expect(e).toMatchObject({ input: 'mic', free: false, family: 'g-chords' });
    expect(e.thresholds.chordClearMiss).toBe(0.09);
    expect(typeof e.strumSpread === 'number' || e.strumSpread === null).toBe(true);
    expect('changesPerMin' in e).toBe(true);
  });

  it('the log is capped, exports as JSON, and is written only when turned on (device storage only)', () => {
    const { c, bpm, m } = micChordTake();
    const e = calibEntry(c, bpm, m, { input: 'mic', at: 'T' });
    const many = Array.from({ length: 5 }, () => e).reduce((l, x) => appendCalib(l, x, 3), [] as ReturnType<typeof readCalib>);
    expect(many.length).toBe(3);
    const j = JSON.parse(calibJson(many, { app: '0.x', at: 'T' }));
    expect(j).toMatchObject({ kind: 'toneturn-guitar-calibration', v: 1, app: '0.x' });
    expect(j.takes.length).toBe(3);
    // a stand-in localStorage
    const mem = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    try {
      logGuitarTake(c, bpm, m, { input: 'mic' });
      expect(mem.has(CALIB_KEY)).toBe(false);
      setCalibEnabled(true);
      expect(mem.get(CALIB_ON_KEY)).toBe('1');
      logGuitarTake(c, bpm, m, { input: 'mic' });
      logGuitarTake(c, bpm, m, { input: 'midi-strings' });
      expect(readCalib().map((x) => x.input)).toEqual(['mic', 'midi-strings']);
      setCalibEnabled(false);
      logGuitarTake(c, bpm, m, { input: 'mic' });
      expect(readCalib().length).toBe(2);
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});
