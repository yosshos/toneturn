// DRUMS_NICHE_PLAN P1: d-song (songs and song forms), d-prog (prog / fusion), reading and theory on the kit (d-read 6–10,
// d-count, d-notation, d-form), with the drum rules the prog engine left open (linear coincidence, limb ratio,
// quintuplets) and the song measures (per section, fills, the dynamics arc, lost bars, drift).
import { describe, expect, it } from 'vitest';
import { drumFamilies, type DrumLevelDef } from '../src/engine/drills/drums';
import { analyzeDrumTake, DRUM_TIERS, type DrumTakeHit } from '../src/engine/drills/drumAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { levelDrills } from '../src/engine/drills/plan';
import { generate } from '../src/engine/drills/generate';
import { withProg } from '../src/engine/drills/progAnalyze';
import { timeMapOf } from '../src/engine/drills/timeline';
import { beamBeats } from '../src/engine/drumNotation';
import { parseTypedSong, ownSongKind } from '../src/engine/drills/drumSong';
import { VOICE_NOTE } from '../src/engine/drumKit';
import { drillEvents } from '../src/engine/drills/events';
import type { Drill, PlayedNote, TakeMetrics } from '../src/engine/drills/types';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { stepCatalogue } from '../src/engine/path';
import { BADGES } from '../src/engine/badges';
import { ACOUSTIC_LEVELS } from '../src/engine/drumAcoustic';

const NEW = ['d-song', 'd-prog', 'd-count', 'd-notation', 'd-form'];
const FAMS = drumFamilies();
const levels = (): DrumLevelDef[] => FAMS.flatMap((f) => (NEW.includes(f.id) ? f.levels : f.id === 'd-read' ? f.levels.filter((l) => l.level >= 6) : []));
const gen = (family: string, kind: string, option = 0) => generate({ family: family as never, kind, option, key: 0, hands: 'RL', instrument: 'drums' });

function noise(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
/** A take: jitter `sd` ms, velocities by mark / dynamic, swung skip notes at 65 % of their beat, graces 25 ms before. */
function take(d: Drill, bpm: number, sd = 0, seed = 3): DrumTakeHit[] {
  const g = noise(seed);
  const tm = timeMapOf(d, bpm);
  return d.notes.flatMap((n) => {
    const base = n.ghost ? 34 : n.accent ? 116 : n.dyn === 'p' ? 44 : n.dyn === 'f' ? 114 : 78;
    const j = sd ? g() * sd : 0;
    const b0 = Math.floor(n.beat + 1e-6);
    const on = n.swing ? tm.msAt(b0) + 0.65 * (tm.msAt(b0 + 1) - tm.msAt(b0)) : expTimeMs(d, n.beat, bpm);
    const graces: DrumTakeHit[] = Array.from({ length: n.grace ?? 0 }, (_, k) => ({ voice: n.voice!, on: on + j - 25 * ((n.grace ?? 0) - k), vel: 40 }));
    return [...graces, { voice: n.voice!, on: on + j, vel: Math.max(1, Math.min(127, Math.round(base + (sd ? g() * 2 : 0)))), open: n.voice === 'hhOpen' ? 1 : 0, hat: n.voice === 'hhOpen' ? 'open' : n.voice === 'hihat' ? 'closed' : null } as DrumTakeHit];
  });
}
const played = (hits: DrumTakeHit[]): PlayedNote[] => hits.map((h) => ({ pitch: VOICE_NOTE[h.voice ?? 'snare'], on: h.on, off: null, vel: h.vel }));
/** The take through the drum analysis and the prog measures, as DrillTake runs it. */
const judge = (d: Drill, bpm: number, hits: DrumTakeHit[]): TakeMetrics => withProg(analyzeDrumTake(d, bpm, hits), d, bpm, played(hits));

describe('the new families: catalogue, symbols, path, badges', () => {
  it('d-song 8, d-prog 10, d-count / d-notation / d-form 5, d-read to 10 — every item generates with notes inside the take', () => {
    const n = (id: string) => FAMS.find((f) => f.id === id)!.levels.length;
    expect([n('d-song'), n('d-prog'), n('d-count'), n('d-notation'), n('d-form'), n('d-read')]).toEqual([8, 10, 5, 5, 5, 10]);
    for (const lv of levels())
      for (const d of levelDrills(lv, 'fifths-up')) {
        expect(d.notes.length, d.itemId).toBeGreaterThan(3);
        for (const nn of d.notes) expect(nn.beat, d.itemId).toBeLessThan(d.beats + 1e-6);
      }
  });
  it('own glyph for every new family (drawn), unique on the drums path', () => {
    const gl = FAMS.map((f) => FAMILY_GLYPH[f.id]);
    for (const id of NEW) expect(GLYPHS[FAMILY_GLYPH[id]], id).toBeTruthy();
    expect(new Set(gl).size).toBe(gl.length);
  });
  it('every new level is a drums-course path step; badges per family', () => {
    const ids = new Set(stepCatalogue().map((s) => s.id));
    for (const lv of levels()) expect(ids.has(`tech:${lv.id}`), lv.id).toBe(true);
    for (const id of NEW) expect(BADGES.some((b) => b.id.startsWith(`tech:drums:${id}:`)), id).toBe(true);
  });
  it('no new level is offered on an acoustic kit before a real-kit check (conservative)', () => {
    for (const lv of levels()) expect(ACOUSTIC_LEVELS.has(lv.id), lv.id).toBe(false);
  });
  it('rating tags: songs and forms feed the steady beat, counting the meter, notation kit reading', () => {
    const m = analyzeDrumTake(gen('d-count', '3:78', 0), 180, take(gen('d-count', '3:78', 0), 180));
    const tags = (d: Drill) => drillEvents(d, m, '2026-11-11', 's', 0)[0].tags!.map((x) => x.sub);
    expect(tags(gen('d-count', '3:78', 0))).toContain('meter/odd');
    expect(tags(gen('d-notation', '1:key', 0))).toContain('rhythm-reading/drums');
    expect(tags(gen('d-song', '3:form', 0))).toContain('timing/steady');
    expect(tags(gen('d-prog', '1:odd', 0))).toContain('meter/odd');
  });
});

describe('synthetic take sweep (perfect and human) through the drum analysis + the prog measures', () => {
  it('a perfect take is clean at the start and the target tempo for every new item', () => {
    const bad: string[] = [];
    for (const lv of levels())
      for (const d of levelDrills(lv, 'fifths-up'))
        for (const bpm of lv.tempo!) {
          const m = judge(d, bpm, take(d, bpm));
          if (m.verdict !== 'clean') bad.push(`${d.itemId}@${bpm}: ${m.drum?.missed.join(',')} · ${m.why.en}`);
        }
    expect(bad).toEqual([]);
  });
  it('a steady human take (jitter = 45 % of the tier SD) is clean at the target tempo', () => {
    const bad: string[] = [];
    for (const lv of levels())
      for (const d of levelDrills(lv, 'fifths-up')) {
        const bpm = lv.tempo![1];
        for (const seed of [1, 2]) {
          const m = judge(d, bpm, take(d, bpm, 0.45 * DRUM_TIERS[d.drum!.tier].sd, seed));
          if (m.verdict !== 'clean') bad.push(`${d.itemId}@${bpm} s${seed}: ${m.drum?.missed.join(',')} · ${m.why.en}`);
        }
      }
    expect(bad).toEqual([]);
  });
  it('a sloppy take (2 × the tier SD) is never clean', () => {
    for (const lv of levels()) {
      const d = levelDrills(lv, 'fifths-up')[0];
      const m = judge(d, lv.tempo![0], take(d, lv.tempo![0], 2 * DRUM_TIERS[d.drum!.tier].sd, 9));
      expect(m.verdict, d.itemId).not.toBe('clean');
    }
  });
});

describe('d-song: measured per section', () => {
  const song = gen('d-song', '3:form', 0);
  it('the form is on the drill: sections, the band from the chart (chords only), landings at every section start', () => {
    expect(song.form?.sections.map((s) => s.name)).toEqual(['Intro', 'Verse', 'Pre-chorus', 'Chorus', 'Bridge', 'Chorus', 'Ending']);
    expect(song.band?.bass).toBe(true);
    expect(song.chart!.every((c) => /^[A-G]/.test(c) || c === '%')).toBe(true);
    expect(song.goal.drum!.landing!.beats.length).toBe(6);
    expect(song.goal.prog?.form).toEqual({ lost: 0 });
    expect(song.goal.drum?.song?.drift).toBe(0.02);
  });
  it('a skipped bar is caught as a lost bar (the "Why?" names it)', () => {
    const bpm = 90;
    const tm = timeMapOf(song, bpm);
    const barMs = tm.msAt(4) - tm.msAt(0);
    // Skip bar 6 (inside the verse): everything after it comes a bar early.
    const cut = tm.msAt(24);
    const hits = take(song, bpm).filter((h) => !(h.on >= cut && h.on < cut + barMs)).map((h) => (h.on >= cut + barMs ? { ...h, on: h.on - barMs } : h));
    const m = judge(song, bpm, hits);
    expect(m.verdict).toBe('not');
    expect(m.prog?.form?.lost.length).toBeGreaterThan(0);
    expect(m.why.en).toMatch(/Lost/);
  });
  it('a late chorus landing fails the landing rule', () => {
    const bpm = 90;
    const chorus = song.goal.drum!.landing!.beats[2];
    const hits = take(song, bpm).map((h, i) => (Math.abs(song.notes[i]?.beat - chorus) < 1e-6 && (h.voice === 'crash' || h.voice === 'kick') ? { ...h, on: h.on + 45 } : h));
    const m = judge(song, bpm, hits);
    expect(m.verdict).not.toBe('clean');
  });
  it('rushing into the chorus shows as tempo drift', () => {
    const bpm = 90;
    const tm = timeMapOf(song, bpm);
    const from = tm.msAt(song.form ? 2 * 4 + 4 * 4 : 0);
    const hits = take(song, bpm).map((h) => (h.on > from ? { ...h, on: from + (h.on - from) * 0.95 } : h));
    expect(judge(song, bpm, hits).verdict).not.toBe('clean');
  });
  it('a missing fill before a section is caught (fills played)', () => {
    const d = gen('d-song', '2:fills', 0);
    const zones = d.goal.drum!.song!.fills!;
    const hits = take(d, 90).filter((_, i) => !zones.some(([a, b]) => d.notes[i].beat >= a && d.notes[i].beat < b));
    const m = analyzeDrumTake(d, 90, hits);
    expect(m.drum!.missed).toContain('fills');
  });
  it('the dynamics arc: the same velocity everywhere fails, the written p / mf / f passes', () => {
    const d = gen('d-song', '6:dynamics', 0);
    expect(analyzeDrumTake(d, 80, take(d, 80)).verdict).toBe('clean');
    const flat = take(d, 80).map((h) => ({ ...h, vel: 80 }));
    const m = analyzeDrumTake(d, 80, flat);
    expect(m.drum!.missed.some((x) => x.startsWith('arc') || x === 'noVel')).toBe(true);
  });
  it('band hits: crash + kick on each written hit, a snare set-up before each', () => {
    const d = gen('d-song', '4:hits', 0);
    const hitsSec = d.form!.sections.find((s) => s.name === 'Hits')!;
    expect(hitsSec.hits!.length).toBeGreaterThan(2);
    expect(d.goal.drum!.song!.fills!.length).toBeGreaterThan(2);
  });
  it('road-map reading writes the signs (D.S. al Coda) and expands them in the take', () => {
    const d = gen('d-song', '5:roadmap', 0);
    expect(d.drum?.roadmap).toBe('written');
    expect(d.drum?.chartSigns?.some((x) => x.includes('D.S.'))).toBe(true);
    expect(d.form?.order).toEqual([0, 1, 1, 2, 1, 3, 4]);
  });
  it('your song: a typed chord-only chart becomes the form, the band and the tempo', () => {
    const typed = parseTypedSong('Verse 4: Am F C G\nChorus: F G C C\n= 96');
    expect(typed?.bpm).toBe(96);
    expect(typed?.sections.map((s) => [s.kind, s.bars])).toEqual([
      ['verse', 4],
      ['chorus', 4],
    ]);
    const d = generate({ family: 'd-song', kind: ownSongKind('Verse 4: Am F C G\nChorus: F G C C\n= 96'), option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(d.startBpm).toBe(96);
    expect(d.form?.sections.map((s) => s.name)).toEqual(['Verse', 'Chorus', 'Ending']);
    expect(d.chart?.slice(0, 4)).toEqual(['Am', 'F', 'C', 'G']);
    expect(parseTypedSong('nothing here')).toBeNull();
  });
});

describe('d-prog: the drum rules', () => {
  it('linear: two limbs together where one note is written fails; the written part passes', () => {
    const d = gen('d-prog', '7:linear', 0);
    expect(analyzeDrumTake(d, 80, take(d, 80)).verdict).toBe('clean');
    // Add a kick under every snare backbeat (a coincidence the part does not write).
    const extra = d.notes.filter((n) => n.voice === 'snare').map((n) => ({ voice: 'kick' as const, on: expTimeMs(d, n.beat, 80) + 4, vel: 80 }));
    const m = analyzeDrumTake(d, 80, [...take(d, 80), ...extra]);
    expect(m.drum!.missed).toContain('linear');
    expect(m.drum!.coincide).toBeGreaterThan(0);
  });
  it('polyrhythm: one limb drifting from the ratio fails the limb-ratio rule', () => {
    const d = gen('d-prog', '5:ratio', 0);
    expect(analyzeDrumTake(d, 70, take(d, 70)).verdict).toBe('clean');
    // The kick plays 3 % slower than the ride (the two limbs drift apart).
    const t0 = expTimeMs(d, 0, 70);
    const hits = take(d, 70).map((h) => (h.voice === 'kick' ? { ...h, on: t0 + (h.on - t0) * 1.06 } : h));
    expect(analyzeDrumTake(d, 70, hits).drum!.missed).toContain('poly');
  });
  it('metric modulation: the click follows the tempo map; a new tempo 2.5 % slow fails', () => {
    const d = gen('d-prog', '6:modulate', 0);
    expect(d.tempoMap).toEqual([{ bar: 4, ratio: 1.5 }]);
    const tm = timeMapOf(d, 80);
    expect(tm.bpmAt(16)).toBeCloseTo(120, 6);
    const from = tm.msAt(16);
    const hits = take(d, 80).map((h) => (h.on > from ? { ...h, on: from + (h.on - from) * 1.025 } : h));
    const m = judge(d, 80, hits);
    expect(m.verdict).not.toBe('clean');
    expect(m.drum?.missed.some((x) => x.startsWith('mod'))).toBe(true);
    expect(m.drum!.modErr![0]).toBeLessThan(-0.02);
  });
  it('quintuplets get a 5 over the beat, sextuplets a 6', () => {
    const q = gen('d-prog', '9:tuplets', 0);
    const beat0 = q.notes.filter((n) => n.beat < 1 - 1e-6).map((n) => ({ beat: n.beat, dur: n.dur }));
    expect(beamBeats(beat0)[0].tuplet?.n).toBe(5);
    const s6 = gen('d-prog', '9:tuplets', 1);
    expect(beamBeats(s6.notes.filter((n) => n.beat < 1 - 1e-6).map((n) => ({ beat: n.beat, dur: n.dur })))[0].tuplet?.n).toBe(6);
  });
  it('polymeter: the band doubles the cycle in unison and the cycle meets the bar line after N bars', () => {
    const d = gen('d-prog', '4:poly', 0);
    expect(d.unison?.line?.length).toBe(d.notes.filter((n) => n.voice === 'kick').length);
    expect(d.beats).toBe(28);
  });
  it('the prog song changes meter per section (7/8 riff, 4/4 chorus) and modulates the bridge', () => {
    const d = gen('d-prog', '10:song', 0);
    expect(d.pulse).toBe(8);
    expect(d.meters!.map((m) => `${m.meter.num}/${m.meter.den}`)).toEqual(['7/8', '4/4', '7/8', '4/4']);
    expect(d.tempoMap!.length).toBe(2);
    expect(d.unison?.inst).toBe('bass');
  });
  it('changing groupings: the accent on the hi-hat must follow the written group starts', () => {
    const d = gen('d-prog', '2:long', 3);
    expect(d.meters!.length).toBe(8);
    const wrong = take(d, 200).map((h, i) => (d.notes[i].voice === 'hihat' ? { ...h, vel: d.notes[i].accent ? 78 : i % 3 === 0 ? 116 : 78 } : h));
    expect(analyzeDrumTake(d, 200, wrong).drum!.missed).toContain('accentPos');
  });
});

describe('reading and theory on the kit', () => {
  it('6/8 or 3/4: the signature changes and the accents follow it', () => {
    const d = gen('d-count', '2:68', 0);
    const sigs = d.meters!.map((m) => `${m.meter.num}/${m.meter.den}`);
    expect(sigs).toContain('6/8');
    expect(sigs).toContain('3/4');
    // Accents in a 3/4 bar fall every two eighths, in 6/8 every three.
    const barNotes = (k: number) => d.notes.filter((n) => n.beat >= k * 6 && n.beat < k * 6 + 6 && n.accent).map((n) => n.beat - k * 6);
    expect([barNotes(0), barNotes(2)].map((x) => x.join(','))).toEqual(['0,3', '0,2,4']);
  });
  it('tremolo slashes: one written head, the strokes played', () => {
    const d = gen('d-notation', '4:trem', 1);
    expect(d.drum?.trem?.every((x) => x.slashes === 2)).toBe(true);
    expect(d.notes.length).toBe(64);
  });
  it('the 4-bar groove at sight gives 20 s to study it first', () => {
    expect(gen('d-read', '10:sight', 0).prep).toBe(20);
  });
  it('AABA swings the ride and lands each section', () => {
    const d = gen('d-form', '4:aaba', 0);
    expect(d.form?.order).toEqual([0, 0, 1, 0, 2]);
    expect(d.notes.some((n) => n.swing)).toBe(true);
    expect(d.goal.drum?.swing).toBeTruthy();
  });
});
