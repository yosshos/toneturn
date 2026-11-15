// STAGE C (docs/research/AUDIT-6-*.md): the advanced endings — the guitar above grade 8, drums past 1400, the voice's
// top ladder and the advanced ear gaps.
import { describe, expect, it } from 'vitest';
import { guitarCatalog, generateGuitar } from '../src/engine/drills/guitar';
import { generateDrums } from '../src/engine/drills/drums';
import { GUITAR_GRADE_UP, GUITAR_TOP_FAMILIES, walkLine } from '../src/engine/drills/guitarTop';
import { DRUM_TOP_DIFF, DRUM_TOP_FAMILIES, flipSt, gracedAt, linearLanes, openRoll, stickings, syncoLine } from '../src/engine/drills/drumTop';
import { eligible, guitarGradeBase, guitarPathDifficulty, PATH_CAP, stepCatalogue } from '../src/engine/path';
import { hasRubato } from '../src/engine/drills/rubato';
import { VOICE_TOP_DIFF, VOICE_TOP_FAMILIES, VOICE_TOP_LEVELS, keyedBase, partEvents, sessionKeyItem } from '../src/engine/voiceTop';
import { VOICE_FAMILIES, vocalLevelByRef, NEW_LEVEL_NAMES } from '../src/engine/voiceFamilies';
import { itemTargets } from '../src/engine/vocal';
import { voiceSong } from '../src/engine/voiceSongs';
import { VOICE_TOP_SONGS } from '../src/content/voiceTopSongs';
import { songNotes } from '../src/content/songbook';
import { TOPIC_GEN } from '../src/engine/topicKit';
import '../src/engine/topics';
import { accuracyFor } from '../src/engine/scoring';
import { gradePlace, type ChoiceQuestion, type PlaceQuestion } from '../src/engine/lesson';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES } from '../src/engine/badges';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import { shortName } from '../src/engine/pathNames';
import { strandsFor } from '../src/engine/drills/levelTest';
import { parseChart } from '../src/engine/charts';
import type { DrillSpec } from '../src/engine/drills/types';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const GUITAR = guitarCatalog();
const fam = (id: string) => GUITAR.find((f) => f.id === id)!;
const keysOf = (k: number[] | 'major' | 'minor') => (Array.isArray(k) ? k : []);

describe('guitar above grade 8', () => {
  it('the grade formula reaches diploma grades under PATH_CAP (9 ≈ 1680, 10 ≈ 1780, 11 ≈ 1880)', () => {
    expect(guitarGradeBase(0)).toBe(700);
    expect(guitarGradeBase(8)).toBe(1420);
    expect(guitarGradeBase(9)).toBe(1590);
    expect(guitarGradeBase(10)).toBe(1690);
    expect(guitarGradeBase(11)).toBe(1790);
    // The top rank of each diploma grade, the "≈" of the plan.
    expect(guitarGradeBase(9) + 80).toBe(1670);
    expect(guitarGradeBase(10) + 80).toBe(1770);
    expect(guitarGradeBase(11) + 80).toBe(1870);
    for (let g = 0; g < 11; g++) expect(guitarPathDifficulty('g-impro', g)).toBeLessThan(guitarPathDifficulty('g-fretting', g + 1));
    expect(guitarPathDifficulty('g-impro', 11)).toBeLessThanOrEqual(PATH_CAP);
  });

  it('the genuinely advanced levels move up to grades 9–11; the new families sit there too', () => {
    for (const [id, g] of Object.entries(GUITAR_GRADE_UP)) {
      const lv = GUITAR.flatMap((f) => f.levels).find((l) => l.id === id);
      expect(lv, id).toBeTruthy();
      expect(lv!.grade, id).toBe(g);
    }
    for (const id of GUITAR_TOP_FAMILIES) {
      const f = fam(id);
      expect(f.levels.length, id).toBeGreaterThanOrEqual(4);
      expect(f.levels.length, id).toBeLessThanOrEqual(13);
      for (const lv of f.levels) expect(lv.grade!, lv.id).toBeGreaterThanOrEqual(9);
      expect(Math.max(...f.levels.map((l) => l.grade!)), id).toBe(11);
    }
  });

  it('the guitar path now has a 1600–1900 band (it stopped at 1566)', () => {
    const steps = stepCatalogue().filter((s) => s.ladder?.instrument === 'guitar' && s.kind === 'tech');
    const top = steps.filter((s) => s.difficulty >= 1600);
    expect(top.length).toBeGreaterThan(40);
    expect(steps.filter((s) => s.difficulty >= 1800).length).toBeGreaterThanOrEqual(8);
    expect(Math.max(...steps.map((s) => s.difficulty))).toBeLessThanOrEqual(PATH_CAP);
  });

  it('every new item generates in all 12 keys, on the neck, and the pitched ones start in free time', () => {
    for (const id of GUITAR_TOP_FAMILIES)
      for (const lv of fam(id).levels) {
        expect(new Set(keysOf(lv.keys).map(mod12)).size, lv.id).toBe(12);
        for (const sp of lv.specs)
          for (const key of keysOf(lv.keys)) {
            const d = generateGuitar({ ...sp, key } as DrillSpec);
            expect(d.notes.length, `${lv.id} ${sp.kind} ${key}`).toBeGreaterThan(4);
            expect(d.spec.family).toBe(id);
            expect(d.itemId.startsWith(`${id}|`) || d.itemId.startsWith(id), d.itemId).toBe(true);
            for (const n of d.notes) {
              expect(n.fret!, `${lv.id} ${sp.kind} ${key}`).toBeGreaterThanOrEqual(0);
              expect(n.fret!, `${lv.id} ${sp.kind} ${key}`).toBeLessThanOrEqual(22);
            }
            if (!d.drums && !d.rubatoOnly) expect(hasRubato(d), `${lv.id} ${sp.kind}`).toBe(true);
          }
      }
  });

  it('item ids of the new families never collide with the families they reuse', () => {
    const ids = new Set<string>();
    for (const id of GUITAR_TOP_FAMILIES)
      for (const lv of fam(id).levels)
        for (const sp of lv.specs) {
          const d = generateGuitar({ ...sp, key: keysOf(lv.keys)[0] } as DrillSpec);
          expect(ids.has(d.itemId), d.itemId).toBe(false);
          ids.add(d.itemId);
          expect(d.itemId.includes('g-picking|') || d.itemId.startsWith('g-legato') || d.itemId.startsWith('g-harrisline'), d.itemId).toBe(false);
        }
  });

  it('a walking line: a root on every chord change, a half step into the next root', () => {
    const chords = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7').chords;
    const line = walkLine(chords, 16);
    expect(line.length).toBe(16);
    expect(mod12(line[0])).toBe(2);
    expect(mod12(line[4])).toBe(7);
    expect(mod12(line[8])).toBe(0);
    expect(Math.abs(line[3] - line[4])).toBe(1);
    expect(Math.abs(line[7] - line[8])).toBe(1);
  });

  it('the rubato ballad chorus is free time only; chord-melody arrangements run a whole head or more', () => {
    const ballad = fam('g-cmarr').levels.find((l) => l.specs[0].kind === 'ar-ballad')!;
    const d = generateGuitar({ ...ballad.specs[0], key: 5 } as DrillSpec);
    expect(d.rubatoOnly).toBe(true);
    const two = fam('g-cmarr').levels.find((l) => l.specs[0].kind === 'ar-two')!;
    const d2 = generateGuitar({ ...two.specs[0], key: 5 } as DrillSpec);
    const one = generateGuitar({ ...fam('g-cmarr').levels[1].specs[0], key: 5 } as DrillSpec);
    expect(d2.chart!.length).toBe(one.chart!.length * 2);
  });
});

describe('drums past 1400', () => {
  const DRUMS = GUITAR.filter((f) => (DRUM_TOP_FAMILIES as readonly string[]).includes(f.id));
  it('eight families, every level rated 1400–1900 and generating three variants', () => {
    expect(DRUMS.map((f) => f.id)).toEqual([...DRUM_TOP_FAMILIES]);
    for (const f of DRUMS) {
      expect(f.levels.length).toBeLessThanOrEqual(20);
      for (const lv of f.levels) {
        expect(DRUM_TOP_DIFF[lv.id], lv.id).toBeGreaterThanOrEqual(1400);
        expect(DRUM_TOP_DIFF[lv.id], lv.id).toBeLessThanOrEqual(PATH_CAP);
        expect(lv.specs.length).toBe(3);
        for (const sp of lv.specs) {
          const d = generateDrums({ ...sp, key: 0 } as DrillSpec);
          expect(d.notes.length, `${lv.id}:${sp.option}`).toBeGreaterThan(8);
          expect(d.drum!.tier, lv.id).toBe(3);
          expect(d.notes.every((n) => Number.isFinite(n.beat) && n.beat >= 0 && n.beat <= d.beats + 1e-6), lv.id).toBe(true);
          if ((lv as { mic?: boolean }).mic) expect(d.notes.every((n) => n.voice === 'snare'), `${lv.id} is single-surface`).toBe(true);
        }
      }
    }
  });

  it('the drums path now reaches 1900 with a real advanced band', () => {
    const steps = stepCatalogue().filter((s) => s.ladder?.instrument === 'drums');
    expect(steps.filter((s) => s.difficulty >= 1500).length).toBeGreaterThan(50);
    expect(steps.filter((s) => s.difficulty >= 1700).length).toBeGreaterThanOrEqual(15);
    for (const id of Object.keys(DRUM_TOP_DIFF)) expect(steps.find((s) => s.ladder!.ref === id)!.difficulty, id).toBe(DRUM_TOP_DIFF[id]);
  });

  it('the open rolls (PAS): doubles plus the release — 10, 11, 13, 15, 17', () => {
    const st = (n: number) => openRoll(n, 'R', 0).hits.map((h) => h.h).join('');
    expect(st(10)).toBe('RRLLRRLLRL');
    expect(st(11)).toBe('RRLLRRLLRRL');
    expect(st(13)).toBe('RRLLRRLLRRLLR');
    expect(st(15)).toBe('RRLLRRLLRRLLRRL');
    expect(st(17)).toBe('RRLLRRLLRRLLRRLLR');
    for (const n of [10, 11, 13, 15, 17]) {
      const r = openRoll(n, 'R', 0);
      expect(r.hits.length).toBe(n);
      expect(r.hits[r.hits.length - 1].acc).toBe(true);
      expect(r.hits.filter((h) => h.acc).length).toBe(1);
      // The release lands on an 8th, after the last double.
      const rel = r.hits[r.hits.length - 1].b;
      expect((rel * 2) % 1).toBe(0);
    }
    expect(openRoll(13, 'L', 4).hits.map((h) => h.h).join('')).toBe('LLRRLLRRLLRRL');
  });

  it('the triple paradiddle, pataflafla, ratamacues, flamacue and drags have their PAS stickings', () => {
    const tp = generateDrums({ family: 'd-pas', kind: '3:triplepara', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(tp.notes.slice(0, 16).map((n) => n.hand).join('')).toBe('RLRLRLRRLRLRLRLL');
    expect(tp.notes.filter((n) => n.accent).every((n) => (n.beat * 4) % 8 === 0)).toBe(true);
    expect(flipSt('RLRLRLRR')).toBe('LRLRLRLL');
    const pf = generateDrums({ family: 'd-pas', kind: '7:pataflafla', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(pf.notes.slice(0, 4).map((n) => `${n.grace ? 'f' : ''}${n.hand}`).join(' ')).toBe('fR L R fL');
    const dr = generateDrums({ family: 'd-pas', kind: '10:dblrat', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const fig = dr.notes.slice(0, 5);
    expect(fig.map((n) => `${n.grace ? 'd' : ''}${n.hand}${n.accent ? '>' : ''}`).join(' ')).toBe('dL dR L R L>');
    expect(fig[4].beat % 1).toBe(0);
    const tr = generateDrums({ family: 'd-pas', kind: '11:trirat', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(tr.notes.slice(0, 6).map((n) => `${n.grace ? 'd' : ''}${n.hand}${n.accent ? '>' : ''}`).join(' ')).toBe('dR dL dR L R L>');
    expect(gracedAt('fR>LRLfR', [0, 0.25, 0.5, 0.75, 1]).map((h) => `${h.grace ? 'f' : ''}${h.h}${h.acc ? '>' : ''}`).join(' ')).toBe('fR L> R L fR');
    const l25 = generateDrums({ family: 'd-pas', kind: '12:drags', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(l25.notes.slice(0, 3).map((n) => `${n.grace === 2 ? 'd' : ''}${n.hand}${n.accent ? '>' : ''}`).join(' ')).toBe('dR L R>');
    // Grace-note levels need MIDI; the rolls run on a pad too.
    const pas = GUITAR.find((f) => f.id === 'd-pas')!;
    expect(pas.levels.filter((l) => l.specs[0].kind.match(/pataflafla|flamacue|flammill|rat|drags/)).every((l) => !(l as { mic?: boolean }).mic)).toBe(true);
  });

  it('the buzz roll measures the hand pulse and writes tremolo slashes', () => {
    const d = generateDrums({ family: 'd-pas', kind: '1:buzz', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(d.notes.length).toBe(64);
    expect(d.drum!.trem!.length).toBe(16);
    expect(d.drum!.trem!.every((t) => t.slashes === 3)).toBe(true);
  });

  it('sticking permutations: every 4-note sticking, balanced 6- and 8-note stickings', () => {
    expect(stickings(4, false).length).toBe(14);
    expect(new Set(stickings(4, false)).size).toBe(14);
    expect(stickings(4, false)).not.toContain('RRRR');
    expect(stickings(4, false)).not.toContain('LLLL');
    const d = generateDrums({ family: 'd-stick', kind: '3:perm8', option: 1, key: 0, hands: 'RL', instrument: 'drums' });
    for (let b = 0; b < 4; b++) {
      const bar = d.notes.filter((n) => n.beat >= b * 4 && n.beat < b * 4 + 4).map((n) => n.hand).join('');
      expect(bar.length).toBe(16);
      expect([...bar].filter((c) => c === 'R').length).toBe(8);
      expect(bar.slice(0, 8)).toBe(bar.slice(8));
    }
  });

  it('linear funk never puts two limbs together; syncopation lines are our own cells', () => {
    for (const op of [0, 1, 2])
      for (const kind of ['2:ghost', '3:barks', '5:displace']) {
        const d = generateDrums({ family: 'd-linear', kind, option: op, key: 0, hands: 'RL', instrument: 'drums' });
        const beats = d.notes.map((n) => n.beat.toFixed(4));
        expect(new Set(beats).size, `${kind} ${op}`).toBe(beats.length);
        expect(d.goal.drum!.linear).toBeTruthy();
      }
    const l = linearLanes('khghShkghkghShgh');
    expect(l.h!.length).toBe(16);
    expect(syncoLine('x', 8).length).toBe(8);
  });

  it('soloing over a form: time bars written, solo bars free (at least a few hits a bar), landings on the next 1', () => {
    const d = generateDrums({ family: 'd-trade', kind: '1:blues4', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    const g = d.goal.drum!;
    expect(g.impro!.zones.length).toBe(3);
    expect(g.impro!.min).toBeGreaterThanOrEqual(12);
    expect(g.landing!.beats).toEqual([32, 64, 96]);
    for (const [a, b] of g.impro!.zones) expect(d.notes.filter((n) => n.beat >= a && n.beat < b).length).toBe(0);
    expect(d.band!.rests!.length).toBe(3);
    const solo = generateDrums({ family: 'd-trade', kind: '5:aaba', option: 0, key: 0, hands: 'RL', instrument: 'drums' });
    expect(solo.band!.rests).toBeUndefined();
    expect(solo.goal.drum!.landing!.beats.length).toBeGreaterThanOrEqual(5);
  });
});

describe('the voice top ladder', () => {
  it('eight families, every item rated above 1700, every level on the path at 1700–1900', () => {
    expect(VOICE_TOP_FAMILIES.length).toBe(8);
    for (const f of VOICE_TOP_FAMILIES) expect(VOICE_FAMILIES.some((x) => x.id === f.id), f.id).toBe(true);
    for (const lv of VOICE_TOP_LEVELS) {
      expect(NEW_LEVEL_NAMES[lv.level], `${lv.level} name`).toBeTruthy();
      expect(vocalLevelByRef(lv.level)).toBe(lv);
      for (const it of lv.items) expect(it.difficulty, it.id).toBeGreaterThan(1700);
    }
    const steps = stepCatalogue().filter((s) => s.kind === 'vocal');
    for (const [ref, d] of Object.entries(VOICE_TOP_DIFF)) {
      const s = steps.find((x) => x.ladder!.ref === ref)!;
      expect(s, ref).toBeTruthy();
      expect(s.difficulty).toBe(d);
      expect(d).toBeGreaterThanOrEqual(1700);
      expect(d).toBeLessThanOrEqual(PATH_CAP);
    }
    expect(steps.filter((s) => s.difficulty > 1700).length).toBeGreaterThanOrEqual(20);
  });

  it('key-relative items come round all 12 keys, kept inside the range by octaves', () => {
    const range = { low: 48, high: 72 };
    const keyed = VOICE_TOP_LEVELS.flatMap((l) => l.items).filter((it) => it.more?.key12);
    expect(keyed.length).toBeGreaterThan(20);
    for (const it of keyed) {
      const pcs = new Set<number>();
      for (let seed = 0; seed < 12; seed++) {
        const k = sessionKeyItem(it, seed, 2);
        const tg = itemTargets(k, range);
        pcs.add(mod12(tg[0]));
        expect(mod12(tg[0])).toBe(k.more!.key);
      }
      expect(pcs.size, it.id).toBe(12);
    }
    expect(keyedBase(60, 7, 0, 12, 48, 72)).toBe(55);
    expect(keyedBase(70, 2, 0, 12, 48, 72)).toBe(50);
  });

  it('dim, aug and dim7 arpeggios are the right shapes', () => {
    const a = VOICE_TOP_LEVELS.find((l) => l.level === 2201)!.items;
    expect(a[0].steps!.slice(0, 3)).toEqual([0, 3, 6]);
    expect(a[1].steps!.slice(0, 3)).toEqual([0, 4, 8]);
    const b = VOICE_TOP_LEVELS.find((l) => l.level === 2202)!.items;
    expect(b[0].steps!.slice(0, 4)).toEqual([0, 3, 6, 9]);
    expect(b[1].steps!.slice(0, 4)).toEqual([0, 3, 6, 10]);
  });

  it('the quick study reads, varies, then improvises the same tune; every new song parses and fills its bars', () => {
    for (const s of VOICE_TOP_SONGS) {
      expect(songNotes(s).length, s.id).toBeGreaterThan(5);
      expect(s.chart.split('|').length, s.id).toBe(s.melody.split('|').length);
      expect(voiceSong(s.id)).toBeTruthy();
    }
    for (const n of [2231, 2232, 2233]) {
      const items = vocalLevelByRef(n)!.items;
      expect(items.map((i) => i.kind)).toEqual(['song', 'song', 'scat']);
      expect(items[0].song!.read).toBe('band');
      expect(items[1].song!.interpret).toBe(true);
      expect(items[0].song!.id).toBe(items[1].song!.id);
    }
  });

  it('one part from the score: the other parts sound in time with the sung part', () => {
    for (const n of [2241, 2242, 2243])
      for (const it of vocalLevelByRef(n)!.items) {
        expect(it.kind).toBe('sight');
        for (const p of it.more!.parts!) {
          expect(p.steps.length).toBe(p.durs.length);
          expect(p.durs.reduce((a, b) => a + b, 0)).toBe(it.durs!.reduce((a, b) => a + b, 0));
        }
        const tg = itemTargets(sessionKeyItem(it, 3), { low: 48, high: 72 });
        const ev = partEvents(it, tg, 2, 0.5);
        expect(ev.length).toBe(it.more!.parts!.reduce((a, p) => a + p.steps.length, 0));
        expect(ev[0].start).toBe(2);
      }
    expect(vocalLevelByRef(2243)!.items[0].more!.parts!.length).toBe(2);
  });
});

describe('the advanced ear gaps', () => {
  const each = (topic: string, f: (q: PlaceQuestion | ChoiceQuestion, level: number, seed: number) => void) => {
    const T = TOPIC_GEN[topic];
    expect(T, topic).toBeTruthy();
    T.levels.forEach((_, i) => {
      for (let seed = 0; seed < 24; seed++) f(T.gen(seed, i + 1, `${topic}-${seed}`) as PlaceQuestion | ChoiceQuestion, i + 1, seed);
    });
  };
  it('three voices: the bass is the lowest, the top is given, every key comes up', () => {
    const keys = new Set<number>();
    each('three-voice', (q0) => {
      const q = q0 as PlaceQuestion;
      expect(q.kind).toBe('place');
      expect(q.staff!.clef).toBe('bass');
      for (let i = 0; i < q.target.length; i++) expect(q.target[i]).toBeLessThan(q.given!.midis[i]);
      expect(gradePlace(q, q.answer).score).toBe(1);
      expect(q.difficulty).toBeGreaterThanOrEqual(1650);
      keys.add(mod12(q.seed));
    });
    expect(keys.size).toBe(12);
  });
  it('one hearing: the phrase plays once (no replay), written on the staff', () => {
    each('one-hearing', (q0) => {
      const q = q0 as PlaceQuestion;
      expect(q.once).toBe(true);
      expect(q.target.length).toBeGreaterThanOrEqual(4);
      if (q.durs) expect(q.durs.length).toBe(q.target.length);
    });
  });
  it('describe the piece: one excerpt, several features, credit for each feature right', () => {
    each('features', (q0, level) => {
      const q = q0 as ChoiceQuestion;
      expect(q.kind).toBe('choice');
      expect(q.choices).toContain(q.answer);
      expect(q.choices.length).toBe(4);
      expect(q.answer.split('|').length).toBe([2, 3, 4, 5][level - 1]);
      for (const c of q.choices.filter((c) => c !== q.answer)) {
        expect(q.partial![c]).toBeGreaterThanOrEqual(0);
        expect(q.partial![c]).toBeLessThan(1);
        expect(accuracyFor(q, c)).toBe(q.partial![c]);
      }
      expect(accuracyFor(q, q.answer)).toBe(1);
    });
  });
});

describe('wiring', () => {
  const NEW_FAMS = [...GUITAR_TOP_FAMILIES, ...DRUM_TOP_FAMILIES, ...VOICE_TOP_FAMILIES.map((f) => f.id)];
  it('every new family and topic has its own symbol, drawn, used by nothing else', () => {
    for (const f of NEW_FAMS) {
      expect(FAMILY_GLYPH[f], f).toBeDefined();
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeDefined();
      expect(Object.entries(FAMILY_GLYPH).filter(([k, g]) => k !== f && g === FAMILY_GLYPH[f]).map(([k]) => k), f).toEqual([]);
    }
    for (const t of ['three-voice', 'one-hearing', 'features']) {
      expect(GLYPHS[TOPIC_GLYPH[t]], t).toBeDefined();
      expect(shortName(t, TOPIC_GEN[t].title, 'en').length).toBeLessThanOrEqual(18);
      expect(shortName(t, TOPIC_GEN[t].title, 'he').length).toBeLessThanOrEqual(18);
    }
  });
  it('badges: family milestones / titles for every new family, all titles unique', () => {
    const all = BADGES;
    const NEW = [...GUITAR_TOP_FAMILIES, ...DRUM_TOP_FAMILIES, ...VOICE_TOP_FAMILIES.map((x) => x.id)];
    const mine = all.filter((b) => NEW.some((f) => b.id.includes(`:${f}:`) || b.group === f));
    expect(mine.length).toBeGreaterThan(40);
    for (const b of mine) expect(all.filter((x) => x.name.en === b.name.en).length, b.name.en).toBe(1);
    for (const f of [...DRUM_TOP_FAMILIES, ...VOICE_TOP_FAMILIES.map((x) => x.id)]) expect(all.some((b) => b.group === f), f).toBe(true);
    for (const f of GUITAR_TOP_FAMILIES) expect(all.some((b) => b.id.includes(f)), f).toBe(true);
  });
  it('quick lessons for the new concepts, en + he', () => {
    for (const k of ['tech:g-speed', 'tech:g-fusion', 'tech:g-cmarr', 'tech:g-solojazz', 'tech:d-pas', 'tech:d-trade', 'vocal:2231', 'vocal:2241', 'topic:three-voice', 'topic:one-hearing', 'topic:features']) {
      const l = MINI_LESSONS[UNIT_LESSON[k]];
      expect(l, k).toBeTruthy();
      for (const s of l.steps) {
        expect(s.say.en.length).toBeGreaterThan(5);
        expect(s.say.he.length).toBeGreaterThan(5);
      }
    }
  });
  it('the level tests reach the new families', () => {
    const g = strandsFor('guitar', 'both').flatMap((s) => s.rungs);
    expect(g.some((r) => r.level === 'g-speed-1')).toBe(true);
    expect(g.some((r) => r.level === 'g-hlfast-1')).toBe(true);
    const d = strandsFor('drums', 'both').flatMap((s) => s.rungs);
    for (const id of ['d-pas-1', 'd-linear-1', 'd-chapin-1']) expect(d.some((r) => r.level === id), id).toBe(true);
  });
  it('the new families join their courses’ paths', () => {
    const steps = stepCatalogue();
    const inp = { leaveOut: [], packs: [], plays: ['drums'], track: 'hobby' as const, course: 'drums' as const, ladderFamilies: [...DRUM_TOP_FAMILIES] };
    expect(steps.filter((s) => s.kind === 'tech' && eligible(s, inp)).length).toBe(Object.keys(DRUM_TOP_DIFF).length);
  });
});
