// AUDIT-7 (docs/research/AUDIT-7-GAPS.md #1, #2, #5, #8, #9, #13): written theory from ABRSM grade 1, the jazz entry on
// guitar / bass / voice, ascending intervals first, the voice's first steps, improvising in pop, pop and theatre style,
// counterpoint in the Ear course — placement order, item correctness, grading, wiring.
import { describe, expect, it } from 'vitest';
import { eligible, stepCatalogue, VOCAL_PROGRAMS, PATH_CAP } from '../src/engine/path';
import { inCourse, JAZZ_LADDER_FAMILIES, PIANO_ONLY_JAZZ_TOPICS } from '../src/engine/courses';
import { TOPIC_GEN } from '../src/engine/topicKit';
import '../src/engine/topics';
import type { ChoiceQuestion } from '../src/engine/lesson';
import { NOTE_VALUE_POOL } from '../src/engine/topicsTheoryStart';
import { guitarCatalog, generateGuitar } from '../src/engine/drills/guitar';
import { BLUES_HEAD, BLUES_ROOTS } from '../src/engine/drills/guitarJazzStart';
import { levelDrills } from '../src/engine/drills/plan';
import { strandsFor } from '../src/engine/drills/levelTest';
import { techLevel } from '../src/engine/ladderFacts';
import { hasRubato } from '../src/engine/drills/rubato';
import type { DrillSpec } from '../src/engine/drills/types';
import { AUDIT7_VOICE_FAMILIES, AUDIT7_VOICE_LEVELS, FIRST_MORE_LEVELS, IMPRO_LEVELS, MAJOR_PENTA, POP_LEVELS, JAZZ_START_LEVELS } from '../src/engine/voiceAudit7';
import { AUDIT7_VOICE_PLACEMENT, AUDIT7_INSTRUMENT_PLACEMENT } from '../src/engine/audit7Placement';
import { NEW_LEVEL_NAMES, VOICE_FAMILIES, vocalLevelByRef, voiceItemTags, probeStarts } from '../src/engine/voiceFamilies';
import { itemTargets, passCents } from '../src/engine/vocal';
import { gradeScat, gradeTime } from '../src/engine/voiceGrade';
import { synthLine } from '../src/engine/voiceTime';
import { voiceSong } from '../src/engine/voiceSongs';
import { AUDIT7_SONGS } from '../src/content/voiceAudit7Songs';
import { songNotes } from '../src/content/songbook';
import { voiceStrands } from '../src/engine/voiceLevelTest';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES } from '../src/engine/badges';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { shortName } from '../src/engine/pathNames';
import { TOPIC_TAGS } from '../src/engine/taxonomy';
import { LADDERS } from '../src/engine/placement';
import { SCAT_INSTR, METRIC_NAMES } from '../src/content/voiceCourseText';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const cat = () => stepCatalogue();
const at = (id: string) => cat().find((s) => s.id === id)!.difficulty;
const q = (topic: string, level: number, seed: number) => TOPIC_GEN[topic].gen(seed, level, `${topic}-${seed}`) as ChoiceQuestion;

describe('#1 written theory from ABRSM grade 1', () => {
  it('key signatures and tonic triads sit at grades 1–2; note values and interval numbers open the theory path (750–870)', () => {
    expect(at('topic:key-signatures:1')).toBe(790);
    expect(at('topic:chord-spelling:1')).toBe(880);
    expect(at('topic:scale-spelling:1')).toBeLessThanOrEqual(820);
    for (const id of ['topic:note-values:1', 'topic:note-values:2', 'topic:note-values:3', 'topic:interval-number:1', 'topic:interval-number:2', 'topic:interval-number:3']) {
      expect(at(id), id).toBeGreaterThanOrEqual(750);
      expect(at(id), id).toBeLessThanOrEqual(900);
    }
    // the treble clef comes before what is read from the staff; interval quality (G4) after the numbers
    expect(at('topic:note-reading:1')).toBeLessThan(at('topic:scale-spelling:1'));
    expect(at('topic:interval-number:3')).toBeLessThan(at('topic:interval-spelling:1'));
    // every written topic still rises level by level
    for (const t of ['chord-spelling', 'note-reading', 'key-signatures', 'interval-number', 'note-values', 'intervals-all']) {
      const ds = cat().filter((s) => s.topic === t).sort((a, b) => a.level! - b.level!).map((s) => s.difficulty);
      expect([...ds].sort((a, b) => a - b), t).toEqual(ds);
    }
  });
  it('the new topics are Ear-course steps (not jazz, not an instrument)', () => {
    for (const t of ['note-values', 'interval-number']) {
      const ss = cat().filter((s) => s.topic === t);
      expect(ss.length).toBe(TOPIC_GEN[t].levels.length);
      for (const s of ss) expect(inCourse(s, 'ear'), s.id).toBe(true);
    }
  });
  it('note values: the answer is the symbol’s beats (♩ = 1); a group adds up', () => {
    const beats: Record<string, number> = Object.fromEntries([...NOTE_VALUE_POOL.notes, ...NOTE_VALUE_POOL.more].map((v) => [v.sym, v.beats]));
    for (let seed = 0; seed < 60; seed++) {
      for (const level of [1, 2]) {
        const x = q('note-values', level, seed);
        expect(x.choices).toContain(x.answer);
        expect(Number(x.answer.slice(1))).toBe(beats[x.text!.en]);
      }
      const g = q('note-values', 3, seed);
      const sum = g.text!.en.split(/\s+/).reduce((a, s) => a + beats[s], 0);
      expect(Number(g.answer.slice(1))).toBe(sum);
      expect(g.choices.length).toBe(4);
    }
  });
  it('interval numbers: counting letter names from the lower note on the staff, both included', () => {
    const MAJ = [0, 2, 4, 5, 7, 9, 11];
    const LET_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    for (let seed = 0; seed < 80; seed++)
      for (const level of [1, 2, 3]) {
        const x = q('interval-number', level, seed);
        const [a, b] = [...x.show!.midis].sort((m, n) => m - n);
        const tonic = LET_PC[x.show!.key!.letter] + x.show!.key!.acc;
        // both notes are in the key; the number = the scale steps between them + 1
        const step = (m: number) => Math.floor((m - tonic) / 12) * 7 + MAJ.indexOf(mod12(m - tonic));
        expect(MAJ).toContain(mod12(a - tonic));
        expect(MAJ).toContain(mod12(b - tonic));
        expect(x.answer).toBe(`n${step(b) - step(a) + 1}`);
        if (level === 1) {
          expect(mod12(a - tonic)).toBe(0);
          expect(x.show!.clef).toBe('treble');
        }
      }
  });
  it('tonic triads are major or minor in keys up to three sharps or flats; level 2 is diminished, augmented and the dominant 7th', () => {
    for (let seed = 0; seed < 40; seed++) {
      const t = q('chord-spelling', 1, seed);
      expect(t.text!.en).toMatch(/^[A-G][♭♯]?m?$/);
      const d = q('chord-spelling', 2, seed);
      expect(d.text!.en).toMatch(/[°+7]$/);
    }
  });
  it('the "find my level" theory ladder starts at grade 1 and rises', () => {
    const ds = LADDERS.theory!.map((r) => r.difficulty);
    expect(ds[0]).toBeLessThanOrEqual(790);
    expect([...ds].sort((x, y) => x - y)).toEqual(ds);
    for (const r of LADDERS.theory!) expect(r.make(3, 'x').difficulty).toBe(r.difficulty);
    const iv = LADDERS.intervals!.map((r) => r.difficulty);
    expect([...iv].sort((x, y) => x - y)).toEqual(iv);
  });
});

describe('#5 ascending intervals first', () => {
  it('intervals-all 1 (ascending) before intervals-down 1; all twelve up before all twelve down', () => {
    expect(at('topic:intervals-all:1')).toBeLessThan(at('topic:intervals-down:1'));
    expect(at('topic:intervals-all:2')).toBeLessThan(at('topic:intervals-down:5'));
  });
  it('levels 1–2 go up; level 4 asks up or down (no longer a copy of intervals-down)', () => {
    let up = 0;
    let down = 0;
    for (let seed = 0; seed < 60; seed++) {
      for (const level of [1, 2]) {
        const st = q('intervals-all', level, seed).stimulus[0] as { midis: number[] };
        expect(st.midis[1]).toBeGreaterThan(st.midis[0]);
      }
      const x = q('intervals-all', 4, seed);
      const st = x.stimulus[0] as { midis: number[] };
      expect(Math.abs(st.midis[1] - st.midis[0])).toBe(Number(x.answer.slice(1)));
      if (st.midis[1] > st.midis[0]) up++;
      else down++;
    }
    expect(up).toBeGreaterThan(10);
    expect(down).toBeGreaterThan(10);
  });
});

describe('#13 counterpoint in the Ear course', () => {
  it('no longer in a pack: every level is an Ear step, rising by species', () => {
    const ss = cat().filter((s) => s.topic === 'counterpoint');
    expect(ss.length).toBe(5);
    for (const s of ss) {
      expect(s.pack, s.id).toBeUndefined();
      expect(inCourse(s, 'ear'), s.id).toBe(true);
      expect(eligible(s, { leaveOut: [], packs: [], plays: [], track: 'student', course: 'ear' }), s.id).toBe(true);
    }
  });
});

describe('#2 the jazz entry for guitar, bass and voice', () => {
  const jazz = (plays: string[], fams: string[]) => cat().filter((s) => eligible(s, { leaveOut: [], packs: ['jazz'], plays, track: 'hobby', course: 'jazz', ladderFamilies: fams }));
  it('performed jazz steps below 1000 for each instrument', () => {
    const g = jazz(['guitar'], [...JAZZ_LADDER_FAMILIES]).filter((s) => s.difficulty < 1000 && s.ladder);
    const b = jazz(['bass'], [...JAZZ_LADDER_FAMILIES]).filter((s) => s.difficulty < 1000 && s.ladder);
    const v = jazz(['voice'], [...JAZZ_LADDER_FAMILIES]).filter((s) => s.difficulty < 1000 && s.ladder);
    expect(g.length).toBeGreaterThanOrEqual(5);
    expect(b.length).toBeGreaterThanOrEqual(5);
    expect(v.length).toBeGreaterThanOrEqual(4);
    expect(g.map((s) => s.id)).toEqual(expect.arrayContaining(['tech:g-jblues-1', 'tech:g-jblues-2', 'tech:g-jblues-3', 'tech:g-jblues-4']));
    expect(b.map((s) => s.id)).toContain('tech:b-walk-21');
    expect(v.map((s) => s.id)).toEqual(['vocal:2301', 'vocal:2302', 'vocal:2303', 'vocal:2304']);
  });
  it('the solo left hand and solo textures only for a player of the keys', () => {
    for (const t of PIANO_ONLY_JAZZ_TOPICS) {
      expect(jazz(['keys'], []).some((s) => s.topic === t), t).toBe(true);
      for (const p of [['guitar'], ['bass'], ['voice'], []]) expect(jazz(p, []).some((s) => s.topic === t), `${t} ${p}`).toBe(false);
    }
  });
  it('guitar: the head, shells, guide tones and the Charleston over the blues, in all 12 keys, rubato first', () => {
    for (const n of [1, 2, 3, 4]) {
      const lv = techLevel(`g-jblues-${n}`)!;
      expect(new Set(lv.keys as number[]).size, lv.id).toBe(12);
      expect(at(`tech:g-jblues-${n}`)).toBe(AUDIT7_INSTRUMENT_PLACEMENT[`g-jblues-${n}`]);
      for (const d of levelDrills(lv, 'fifths-up')) {
        expect(d.notes.length, d.itemId).toBeGreaterThan(0);
        expect(/[֐-׿]/.test(d.title.he)).toBe(true);
        expect(hasRubato(d), d.itemId).toBe(true);
      }
    }
    const spec = (kind: string, key: number, o: Partial<DrillSpec> = {}) => generateGuitar({ family: 'g-jblues', kind, key, hands: 'R', instrument: 'guitar', ...o } as DrillSpec);
    for (let key = 0; key < 12; key++) {
      // the head: the tonic plus the head's steps, rests left out
      const h = spec('blues-head', key);
      const steps = BLUES_HEAD.filter(([s]) => s !== null).map(([s]) => s as number);
      const t0 = h.notes[0].pitch - steps[0];
      expect(mod12(t0)).toBe(key);
      expect(h.notes.map((n) => n.pitch - t0)).toEqual(steps);
      // shells: root, 3rd and ♭7 of each bar's dominant seventh, four a bar
      const sh = spec('blues-shells', key);
      BLUES_ROOTS.forEach((r, bar) => {
        const pcs = new Set(sh.notes.filter((n) => n.beat === bar * 4).map((n) => mod12(n.pitch - key - r)));
        expect([...pcs].sort((a, b) => a - b), `${key} bar ${bar}`).toEqual([0, 4, 10]);
        expect(new Set(sh.notes.filter((n) => Math.floor(n.beat / 4) === bar).map((n) => n.beat)).size).toBe(4);
      });
      // guide tones: each half note the 3rd or 7th of its bar
      for (const option of [0, 1]) {
        const gt = spec('blues-guide', key, { option });
        expect(gt.notes.length).toBe(option ? 12 : 24);
        for (const n of gt.notes) expect([4, 10]).toContain(mod12(n.pitch - key - BLUES_ROOTS[Math.floor(n.beat / 4)]));
      }
      // the Charleston: chords on 1 and the "and" of 2
      const cp = spec('blues-comp', key, { swing: true });
      expect([...new Set(cp.notes.map((n) => n.beat % 4))].sort()).toEqual([0, 1.5]);
    }
  });
  it('bass: the first walking line over a blues — R, 3, 5, then a half step into the next root, all 12 keys', () => {
    const lv = techLevel('b-walk-21')!;
    expect(at('tech:b-walk-21')).toBeLessThan(1000);
    expect(at('tech:b-walk-21')).toBeGreaterThan(at('tech:b-walk-3'));
    const ds = levelDrills(lv, 'fifths-up');
    expect(new Set(ds.map((d) => d.spec.key)).size).toBe(12);
    for (const d of ds) {
      const bars = Array.from({ length: 12 }, (_, bar) => d.notes.filter((n) => n.beat >= bar * 4 && n.beat < bar * 4 + 4).map((n) => n.pitch));
      for (let bar = 0; bar < 12; bar++) {
        const [r, third, fifth, app] = bars[bar];
        expect(third - r).toBe(4);
        expect(fifth - r).toBe(7);
        if (bar < 11) expect(Math.abs(app - bars[bar + 1][0]), `${d.itemId} bar ${bar}`).toBe(1);
        else expect([1, 11], d.itemId).toContain(mod12(app - d.notes[d.notes.length - 1].pitch));
      }
    }
  });
});

describe('#8 #9 the voice: first steps, jazz entry, improvising in pop, pop and theatre style', () => {
  it('every new level is a family level with a name, on the path at its rating (≤ PATH_CAP), families rising', () => {
    const steps = cat().filter((s) => s.kind === 'vocal');
    for (const l of AUDIT7_VOICE_LEVELS) {
      expect(NEW_LEVEL_NAMES[l.level], `${l.level}`).toBeTruthy();
      expect(vocalLevelByRef(l.level)).toBe(l);
      const s = steps.find((x) => x.id === `vocal:${l.level}`)!;
      expect(s.difficulty).toBe(AUDIT7_VOICE_PLACEMENT[`vocal:${l.level}`]);
      expect(s.difficulty).toBeLessThanOrEqual(PATH_CAP);
      for (const it of l.items) expect(it.difficulty, it.id).toBeGreaterThan(0);
    }
    for (const f of [...AUDIT7_VOICE_FAMILIES.map((x) => x.id), 'v-first']) {
      const ds = VOICE_FAMILIES.find((x) => x.id === f)!.refs.map((n) => steps.find((s) => s.id === `vocal:${n}`)!.difficulty);
      expect([...ds].sort((a, b) => a - b), f).toEqual(ds);
    }
    // the bands the audit asked for
    expect(IMPRO_LEVELS.map((l) => AUDIT7_VOICE_PLACEMENT[`vocal:${l.level}`])).toEqual([900, 1000, 1100, 1250]);
    for (const l of POP_LEVELS) expect(AUDIT7_VOICE_PLACEMENT[`vocal:${l.level}`]).toBeGreaterThanOrEqual(1150);
    for (const l of POP_LEVELS) expect(AUDIT7_VOICE_PLACEMENT[`vocal:${l.level}`]).toBeLessThanOrEqual(1400);
    for (const l of [...FIRST_MORE_LEVELS, ...JAZZ_START_LEVELS]) expect(AUDIT7_VOICE_PLACEMENT[`vocal:${l.level}`]).toBeLessThan(1000);
  });
  it('the voice course’s beginner band (700–999) is no longer thin', () => {
    const v = cat().filter((s) => eligible(s, { leaveOut: [], packs: [], plays: ['voice'], track: 'hobby', course: 'voice', ladderFamilies: VOCAL_PROGRAMS.map((p) => p.id) }));
    expect(v.filter((s) => s.difficulty >= 700 && s.difficulty < 1000).length).toBeGreaterThanOrEqual(32);
    expect(v.some((s) => s.id === 'vocal:2311')).toBe(true);
  });
  it('key-relative melodies and riffs come round all 12 keys inside the range; belt-safe phrases stay below the top', () => {
    const range = { low: 48, high: 72 };
    const keyed = AUDIT7_VOICE_LEVELS.flatMap((l) => l.items).filter((it) => it.more?.key12);
    expect(keyed.length).toBeGreaterThan(8);
    for (const it of keyed) {
      const pcs = new Set<number>();
      for (let k = 0; k < 12; k++) {
        const tg = itemTargets({ ...it, more: { ...it.more, key: k } }, range);
        pcs.add(mod12(tg[0]));
        for (const m of tg) {
          expect(m).toBeGreaterThanOrEqual(range.low);
          expect(m).toBeLessThanOrEqual(range.high);
        }
      }
      expect(pcs.size, it.id).toBe(12);
    }
    for (const it of vocalLevelByRef(2322)!.items.filter((x) => x.kind === 'melody'))
      for (let k = 0; k < 12; k++) expect(Math.max(...itemTargets({ ...it, more: { ...it.more, key: k } }, range))).toBeLessThan(range.high);
  });
  it('the rhythm sung back on "da" and the scat calls: the copied rhythm passes, half of it does not', () => {
    for (const ref of [2105, 2301]) {
      const c = vocalLevelByRef(ref)!.items[0];
      const b = 60 / c.time!.bpm;
      expect(gradeTime(c, c.time!.hits.map((h) => h * b)).grade.score, `${ref}`).toBeGreaterThan(0.85);
      expect(gradeTime(c, c.time!.hits.filter((_, i) => i % 2 === 0).map((h) => h * b + 0.3 * b)).grade.score, `${ref}`).toBeLessThan(0.7);
    }
  });
  it('guide tones on a blues: within the course pass band (passCents) passes; roots do not', () => {
    const gi = vocalLevelByRef(2304)!.items[0];
    const b = 60 / gi.scat!.bpm;
    const tol = passCents(gi.difficulty);
    expect(tol).toBe(65);
    // C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 C7, two half notes a bar: E/B♭, A/E♭ …, sung 50 ¢ sharp (inside ±65 ¢)
    const third: Record<number, number> = { 0: 4, 5: 9, 7: 11 };
    const sev: Record<number, number> = { 0: 10, 5: 3, 7: 5 };
    const roots = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 0];
    const guide = roots.flatMap((r) => [third[r], sev[r]]);
    const line = (pcs: number[], cents: number) => synthLine(pcs.map((pc, k) => ({ midi: 60 + pc, start: k * 2 * b, dur: 2 * b * 0.9 })), { cents: () => cents });
    expect(gradeScat(gi, line(guide, 50), 0).grade.score).toBeGreaterThan(0.8);
    expect(gradeScat(gi, line(roots.flatMap((r) => [r, r]), 0), 0).grade.score).toBeLessThan(0.3);
  });
  it('the pentatonic: notes inside the scale on the beat pass; notes outside it fail', () => {
    const it0 = IMPRO_LEVELS.find((l) => l.level === 2313)!.items[0];
    expect(it0.scat!.mode).toBe('scale');
    expect(it0.scat!.scale).toEqual(MAJOR_PENTA);
    const b = 60 / it0.scat!.bpm;
    // C | Am | F | G | C | Am | F G | C — chord tones in the pentatonic on every beat (C/E/G, A/C/E, A/C, G/D)
    const good = [0, 4, 7, 4, 9, 0, 4, 0, 9, 0, 9, 0, 7, 2, 7, 2, 0, 4, 7, 4, 9, 0, 4, 0, 9, 0, 7, 2, 0, 4, 7, 0];
    const bad = good.map((pc) => (pc === 0 ? 1 : pc === 4 ? 5 : pc === 7 ? 6 : pc === 9 ? 10 : 11));
    const line = (pcs: number[]) => synthLine(pcs.map((pc, k) => ({ midi: 60 + pc, start: k * b, dur: b * 0.85 })));
    const g = gradeScat(it0, line(good), 0);
    expect(g.grade.score).toBeGreaterThan(0.8);
    expect(g.grade.metrics.find((m) => m.key === 'inScale')!.value).toBe(100);
    expect(gradeScat(it0, line(bad), 0).grade.score).toBeLessThan(0.5);
    // straight eighths are on the grid in a pop groove
    expect(g.grade.metrics.find((m) => m.key === 'onset')!.value).toBeLessThan(40);
  });
  it('the songs: the new blues head parses and fills its bars; every song a level names exists', () => {
    for (const s of AUDIT7_SONGS) {
      expect(s.melody.split('|').length).toBe(s.chart.split('|').length);
      expect(songNotes(s).length).toBeGreaterThan(10);
    }
    for (const l of AUDIT7_VOICE_LEVELS) for (const it of l.items) if (it.song) expect(voiceSong(it.song.id), `${it.id} ${it.song.id}`).toBeTruthy();
  });
  it('the placement probe stays cautious: a clear hold and echo pass the old first steps, the new ones stay to do', () => {
    expect(probeStarts({ hold: 0.9, echo: 0.9, time: 0.9, song: 0.9 })['v-first']).toBe(4);
  });
});

describe('wiring (everything connects)', () => {
  it('every new family and topic has its own drawn symbol, used by nothing else', () => {
    for (const f of AUDIT7_VOICE_FAMILIES.map((x) => x.id)) {
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeDefined();
      expect(Object.entries(FAMILY_GLYPH).filter(([k, g]) => k !== f && g === FAMILY_GLYPH[f]).map(([k]) => k), f).toEqual([]);
    }
    for (const t of ['note-values', 'interval-number']) {
      expect(GLYPHS[TOPIC_GLYPH[t]], t).toBeDefined();
      expect(Object.values(TOPIC_GLYPH).filter((g) => g === TOPIC_GLYPH[t]).length, t).toBe(1);
      expect(shortName(t, TOPIC_GEN[t].title, 'en').length).toBeLessThanOrEqual(18);
      expect(shortName(t, TOPIC_GEN[t].title, 'he').length).toBeLessThanOrEqual(18);
      expect(TOPIC_TAGS[t], t).toBeDefined();
    }
  });
  it('skill map, ratings and leagues: the new families rate real skills', () => {
    for (const l of AUDIT7_VOICE_LEVELS)
      for (const it of l.items) {
        const t = voiceItemTags(l.level, it);
        expect(t.tags.reduce((a, x) => a + x.w, 0), it.id).toBeCloseTo(1);
      }
    expect(voiceItemTags(2311, vocalLevelByRef(2311)!.items[0]).skill).toBe('improv');
    expect(voiceItemTags(2105, vocalLevelByRef(2105)!.items[0]).tags.some((x) => x.sub === 'timing/precision')).toBe(true);
  });
  it('badges for every new voice family, all titles unique', () => {
    for (const f of AUDIT7_VOICE_FAMILIES.map((x) => x.id)) expect(BADGES.some((b) => b.group === f), f).toBe(true);
    const mine = BADGES.filter((b) => AUDIT7_VOICE_FAMILIES.some((f) => b.group === f.id));
    for (const b of mine) expect(BADGES.filter((x) => x.name.en === b.name.en).length, b.name.en).toBe(1);
  });
  it('quick lessons open the new steps, en + he', () => {
    for (const k of ['topic:note-values', 'topic:interval-number', 'vocal:2104', 'vocal:2301', 'vocal:2311', 'vocal:2321', 'tech:g-jblues', 'tech:b-walk-21']) {
      const l = MINI_LESSONS[UNIT_LESSON[k]];
      expect(l, k).toBeTruthy();
      for (const s of l.steps) {
        expect(s.say.en.length).toBeGreaterThan(5);
        expect(/[֐-׿]/.test(s.say.he)).toBe(true);
      }
    }
  });
  it('the voice level test has sections for the blues start and pop style', () => {
    const fams = voiceStrands({ low: 48, high: 72 }).map((s) => s.family);
    expect(fams).toContain('v-jazz1');
    expect(fams).toContain('v-pop');
  });
  it('the scale take has its instruction and its metric name', () => {
    expect(SCAT_INSTR.scale.he.length).toBeGreaterThan(5);
    expect(METRIC_NAMES.inScale.he.length).toBeGreaterThan(3);
  });
  it('the guitar jazz entry is its own family (4 levels) the Jazz course teaches, with its glyph, badges and level-test step', () => {
    const g = guitarCatalog().find((f) => f.id === 'g-jblues')!;
    expect(g.levels.map((l) => l.level)).toEqual([1, 2, 3, 4]);
    expect(JAZZ_LADDER_FAMILIES).toEqual(expect.arrayContaining(['g-jblues', 'b-walk', 'v-jazz1']));
    expect(GLYPHS[FAMILY_GLYPH['g-jblues']]).toBeDefined();
    expect(Object.entries(FAMILY_GLYPH).filter(([k, x]) => k !== 'g-jblues' && x === FAMILY_GLYPH['g-jblues'])).toEqual([]);
    for (let l = 1; l <= 4; l++) expect(BADGES.some((b) => b.id === `tech:g-jblues:${l}`), `${l}`).toBe(true);
    expect(strandsFor('guitar', 'both').flatMap((s) => s.rungs.map((r) => r.level))).toContain('g-jblues-2');
  });
});
