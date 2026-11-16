// On the bandstand (AUDIT-DEPTH-3 #11, #12, C8): k-gig, g-gig, b-gig — intros and endings, the ballad ladder, the whole
// tune; every item in all 12 keys, voicings and progressions checked, the whole take graded section by section, and
// the wiring (path, glyphs, badges, events, lessons, level test, the ear topic).
import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { hasRubato } from '../src/engine/drills/rubato';
import { drillEvents } from '../src/engine/drills/events';
import { stepCatalogue } from '../src/engine/path';
import { BALLAD_CHART, DAMERON, GIG_KEYS, GIG_TUNES, WALKDOWN, B6B2_MAJ, TAG3, gigItem, pianoHits, tenthOf, tunePlan, tuneOpt } from '../src/engine/drills/gigDrills';
import { ruleCheck } from '../src/engine/improvRules';
import { RULE_CARDS, cardKept } from '../src/engine/ruleCards';
import { mod12, VQ_DEF } from '../src/engine/bebopVocab';
import { FAMILY_GLYPH, TOPIC_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES } from '../src/engine/badges';
import { MINI_LESSONS, lessonForUnit } from '../src/content/minilessons';
import { pianoStrands, guitarStrands, bassStrands } from '../src/engine/drills/levelTest';
import { TOPIC_GEN } from '../src/engine/topicKit';
import '../src/engine/topics';
import type { Drill, DrillSpec, PlayedNote } from '../src/engine/drills/types';

const HE = /[֐-׿]/;
const famOf = (id: string) => [...catalog(), ...guitarCatalog()].find((f) => f.id === id)!;
const allDrills = (id: string): Drill[] => famOf(id).levels.flatMap((lv) => levelDrills(lv, 'fifths-up'));
const playAt = (d: Drill, bpm: number, notes: { p: number; beat: number; dur: number }[]): PlayedNote[] =>
  notes.map((n) => ({ pitch: n.p, on: expTimeMs(d, n.beat, bpm), off: expTimeMs(d, n.beat + n.dur * 0.9, bpm), vel: 80 }));

describe('the families', () => {
  it('k-gig 12 levels, g-gig 8, b-gig 8; titles in English and Hebrew; every level in all 12 keys', () => {
    expect(famOf('k-gig').levels).toHaveLength(12);
    expect(famOf('g-gig').levels).toHaveLength(8);
    expect(famOf('b-gig').levels).toHaveLength(8);
    for (const id of ['k-gig', 'g-gig', 'b-gig']) {
      const f = famOf(id);
      expect(HE.test(f.title.he)).toBe(true);
      for (const lv of f.levels) {
        expect(HE.test(lv.title.he), lv.id).toBe(true);
        expect([...(lv.keys as number[])].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      }
    }
  });
  it('every item generates in every key, with notes, a chart and a title in both languages', () => {
    for (const id of ['k-gig', 'g-gig', 'b-gig']) {
      const ds = allDrills(id);
      expect(ds.length).toBeGreaterThan(12);
      for (const d of ds) {
        expect(d.notes.length, d.itemId).toBeGreaterThan(0);
        expect(Number.isFinite(d.beats) && d.beats > 0, d.itemId).toBe(true);
        expect(d.chart?.length, d.itemId).toBeGreaterThan(0);
        expect(HE.test(d.title.he), d.itemId).toBe(true);
        for (const n of d.notes) expect(Number.isFinite(n.pitch) && Number.isFinite(n.beat), d.itemId).toBe(true);
        if (id !== 'k-gig') for (const n of d.notes) expect(n.string !== undefined && n.fret !== undefined && n.fret >= 0 && n.fret <= 22, d.itemId).toBe(true);
      }
      // 12 keys of every item: each item id appears with each tonic
      const keys = new Set(ds.map((d) => mod12(d.spec.key)));
      expect(keys.size).toBe(12);
    }
  });
  it('ranges: piano 33–88 (k-tune’s shells reach A1), bass 28–55 sounding, guitar 40–88', () => {
    for (const d of allDrills('k-gig')) for (const n of d.notes) expect(n.pitch >= 33 && n.pitch <= 88, `${d.itemId} ${n.pitch}`).toBe(true);
    for (const d of allDrills('b-gig')) for (const n of d.notes) expect(n.pitch >= 28 && n.pitch <= 55, `${d.itemId} ${n.pitch}`).toBe(true);
    for (const d of allDrills('g-gig')) for (const n of d.notes) expect(n.pitch >= 40 && n.pitch <= 88, `${d.itemId} ${n.pitch}`).toBe(true);
  });
});

describe('intros and endings (#12)', () => {
  const roots = (ds: typeof DAMERON, k: number) => ds.map(([d]) => mod12(k + d));
  it('the progressions in all 12 keys: Dameron, ♭VI–♭II–I, the walk-down, the tag ×3', () => {
    for (const k of GIG_KEYS) {
      const dam = gigItem('gg-end', k, 3).chords;
      expect(dam.slice(0, 4).map((c) => c.r)).toEqual([0, 3, 8, 1].map((x) => mod12(k + x)));
      expect(dam.every((c) => c.q === 'maj7')).toBe(true);
      const b6 = gigItem('gg-end', k, 1).chords;
      expect(b6.map((c) => c.r)).toEqual(roots(B6B2_MAJ, k));
      expect(b6.slice(2).map((c) => c.q)).toEqual(['maj7', 'maj7', 'maj7']);
      const b67 = gigItem('gg-end', k, 2).chords;
      expect(b67.slice(2).map((c) => `${mod12(c.r - k)}${c.q}`)).toEqual(['87', '17', '0maj7']);
      const wd = gigItem('gg-end', k, 5).chords;
      expect(wd.map((c) => `${mod12(c.r - k)}${c.q}`)).toEqual(['4m7', '3dim7', '2m7', '77', '0maj7']);
      expect(WALKDOWN).toHaveLength(5);
      const tag = gigItem('gg-end', k, 0).chords;
      expect(tag).toHaveLength(13);
      expect(TAG3.slice(0, 12).map(([d]) => d)).toEqual([4, 9, 2, 7, 4, 9, 2, 7, 4, 9, 2, 7]);
      expect(tag[12].r).toBe(k);
    }
  });
  it('comping items voice every chord rootless with its 3rd and 7th; chord sets allow what they require', () => {
    for (const k of GIG_KEYS)
      for (const [kind, op] of [['gg-intro', 0], ['gg-intro', 2], ['gg-end', 1], ['gg-end', 3], ['gg-end', 5]] as const) {
        const it = gigItem(kind, k, op);
        for (const h of pianoHits(it)) {
          const pcs = h.lh.map(mod12);
          const ct = VQ_DEF[h.c.q].ct;
          expect(pcs, `${kind}:${op} ${k}`).toContain(mod12(h.c.r + ct[1]));
          if (h.c.q !== 'dim7') expect(pcs).toContain(mod12(h.c.r + ct[3]));
          expect(h.lh.length).toBeGreaterThanOrEqual(3);
        }
        const d = generate({ family: 'k-gig', kind, key: k, hands: 'L', option: op } as DrillSpec);
        for (const s of d.goal.chordSets!) for (const p of s.required) expect(s.allowed).toContain(p);
      }
  });
  it('lines put chord tones on the beats and start in free time; the ballad intro is always in free time', () => {
    for (const k of GIG_KEYS) {
      const d = generate({ family: 'k-gig', kind: 'gg-end', key: k, hands: 'R', option: 4 } as DrillSpec);
      expect(d.goal.chordTonesOnBeats).toBe(true);
      expect(hasRubato(d)).toBe(true);
      const intro = generate({ family: 'k-gig', kind: 'gg-intro', key: k, hands: 'RL', option: 3 } as DrillSpec);
      expect(intro.rubatoOnly).toBe(true);
    }
  });
  it('the bass walks each intro and ending: a root on each chord’s first beat', () => {
    const tu = { id: 'bass' } as never;
    void tu;
    for (const lv of famOf('b-gig').levels.slice(1, 4))
      for (const d of levelDrills(lv, 'fifths-up')) {
        const it = gigItem(d.spec.kind, d.spec.key, d.spec.option ?? 0);
        let at = 0;
        for (const c of it.chords) {
          const n = d.notes.find((x) => Math.abs(x.beat - at) < 1e-6);
          expect(n && mod12(n.pitch) === c.r, `${d.itemId} beat ${at}`).toBe(true);
          at += c.beats;
        }
      }
  });
});

describe('the ballad ladder (#11)', () => {
  it('"Evening Lamp" is 16 bars, two chords a bar (the I6 bars whole)', () => {
    expect(BALLAD_CHART.reduce((a, [, , b]) => a + b, 0)).toBe(64);
  });
  it('LH 10ths: the root in C2–B2 and its 3rd an octave up, in all 12 keys', () => {
    for (const k of GIG_KEYS)
      for (const c of gigItem('gg-b10', k, 2).chords) {
        const [r, ten] = tenthOf(c);
        expect(r >= 36 && r <= 47).toBe(true);
        expect(mod12(r)).toBe(c.r);
        expect(ten - r).toBe(12 + VQ_DEF[c.q].ct[1]);
      }
  });
  it('RH four notes: a rootless voicing (3rd and 7th inside) above the left hand, led smoothly', () => {
    for (const k of GIG_KEYS)
      for (const kind of ['gg-brh', 'gg-b2h']) {
        const hits = pianoHits(gigItem(kind, k, 2));
        hits.forEach((h, i) => {
          expect(h.rh).toHaveLength(4);
          expect(Math.min(...h.rh)).toBeGreaterThan(Math.max(...h.lh));
          const pcs = h.rh.map(mod12);
          const ct = VQ_DEF[h.c.q].ct;
          expect(pcs).toContain(mod12(h.c.r + ct[1]));
          expect(pcs).toContain(mod12(h.c.r + ct[3]));
          // ø7 and °7 keep the root as their 4th note (chartDrills roles: the m7♭5's "9th" is the root).
          if (h.c.q !== 'dim7' && h.c.q !== 'hd7') expect(pcs).not.toContain(mod12(h.c.r));
          expect(Math.max(...h.rh) - Math.min(...h.rh)).toBeLessThanOrEqual(12);
          if (i > 0) expect(Math.abs(h.rh[0] - hits[i - 1].rh[0])).toBeLessThanOrEqual(7);
        });
      }
  });
  it('the ballad items are straight 8ths, slow, and start in free time', () => {
    for (const lv of famOf('k-gig').levels.filter((l) => /Ballad|ballad/.test(l.title.en) && !/rubato/.test(l.title.en))) {
      expect(lv.tempo![0]).toBeLessThanOrEqual(50);
      for (const d of levelDrills(lv, 'fifths-up')) {
        expect(d.spec.swing).toBe(false);
        expect(hasRubato(d)).toBe(true);
      }
    }
  });
});

describe('the whole tune (C8)', () => {
  const sect = (tune: number, section: number, key: number) => generate({ family: 'k-gig', kind: 'gg-tune', key, hands: 'RL', option: tuneOpt(tune, section) } as DrillSpec);
  it('built on original heads only (heads.ts licence: original)', async () => {
    const { HEADS } = await import('../src/content/heads');
    for (const id of GIG_TUNES) expect(HEADS.find((h) => h.id === id)!.licence.kind).toBe('original');
  });
  it('the sections follow each other: intro (4 bars), head, solo chorus, head out, ending', () => {
    for (const tune of [0, 1])
      for (const k of GIG_KEYS) {
        const p = tunePlan(tune, k);
        expect(p.spans.map((s) => s.id)).toEqual(['intro', 'head', 'solo', 'out', 'ending']);
        for (let i = 1; i < 5; i++) expect(p.spans[i].from).toBe(p.spans[i - 1].to);
        expect(p.spans[0].to).toBe(16);
        expect(p.spans[1].to - p.spans[1].from).toBe(p.headBeats);
        const d = sect(tune, 0, k);
        expect(d.goal.sections!.map((s) => s.from)).toEqual(p.spans.map((s) => s.from));
        expect(d.goal.free!.windows).toEqual([[p.spans[2].from, p.spans[2].to]]);
        for (const s of d.goal.improv!.spans) expect(s.at >= p.spans[2].from && s.at < p.spans[2].to).toBe(true);
        expect(d.band).toBeDefined();
        expect(d.drums).toBeDefined();
        expect(hasRubato(d)).toBe(false);
        expect(d.beats).toBe(p.spans[4].to);
      }
  });
  it('the head is k-tune’s melody + shells, the same notes in the head and the head out', () => {
    for (const tune of [0, 1]) {
      const k = 7;
      const p = tunePlan(tune, k);
      const d = sect(tune, 0, k);
      const head = d.notes.filter((n) => n.beat >= p.spans[1].from && n.beat < p.spans[1].to).map((n) => `${n.pitch}@${(n.beat - p.spans[1].from).toFixed(3)}`);
      const out = d.notes.filter((n) => n.beat >= p.spans[3].from && n.beat < p.spans[3].to).map((n) => `${n.pitch}@${(n.beat - p.spans[3].from).toFixed(3)}`);
      expect(head.length).toBeGreaterThan(20);
      expect(out).toEqual(head);
      const alone = sect(tune, 2, k);
      expect(alone.notes.map((n) => `${n.pitch}@${n.beat.toFixed(3)}`)).toEqual(head);
      expect(hasRubato(alone)).toBe(true);
    }
  });
  it('the intro comps the tune’s last four bars; the ending is Basie in major, the iiø–V tag in minor', () => {
    for (const k of GIG_KEYS) {
      const blues = tunePlan(0, k);
      expect(blues.intro.map((c) => c.r)).toEqual(blues.hi.chords.filter((c) => c.bar >= blues.hi.bars.length - 4).map((c) => mod12(c.root)));
      const end = sect(0, 4, k);
      const tag = end.notes.filter((n) => n.hand === 'R' && n.chordId === undefined).sort((a, b) => a.beat - b.beat);
      expect(tag.map((n) => n.beat)).toEqual([9, 10, 11]);
      expect(tag.map((n) => mod12(n.pitch - blues.tonic))).toEqual([7, 8, 9]);
      const minor = tunePlan(1, k);
      expect(minor.minor).toBe(true);
      expect(minor.ending.map((c) => c.q)).toEqual(['hd7', '7b9', 'hd7', '7b9', 'hd7', '7b9', 'm6']);
    }
  });
  it('the solo chorus’s model keeps its cards (target-ct + inside; inside + quote the head)', () => {
    for (const tune of [0, 1])
      for (const k of GIG_KEYS) {
        const d = sect(tune, 3, k);
        const g = d.goal.improv!;
        const ctx = { notes: d.goal.free!.model.map((n) => ({ beat: n.beat, dur: n.dur, midi: n.pitch })), spans: g.spans, meter: 4, bpm: 100, opt: g.melody ? { melody: g.melody } : undefined };
        for (const c of g.cards) {
          expect(RULE_CARDS[c], c).toBeDefined();
          const r = ruleCheck(c, ctx);
          expect(cardKept(c, r), `${GIG_TUNES[tune]} ${k} ${c} ${r.ok}/${r.total}`).toBe(true);
        }
        expect(hasRubato(d)).toBe(false);
      }
  });
  it('a perfect take of the whole tune is clean; a missed intro is named in the Why', () => {
    for (const tune of [0, 1]) {
      const d = sect(tune, 0, 5);
      const bpm = 100;
      const lands = d.notes.filter((n) => n.land !== undefined);
      const written = d.notes.filter((n) => n.land === undefined).map((n) => ({ p: n.pitch, beat: n.beat, dur: n.dur }));
      // The improvised chorus: the model line, with the written landings (a chord tone) on their beats.
      const model = [...d.goal.free!.model.filter((n) => !lands.some((l) => Math.abs(l.beat - n.beat) < 1e-6)).map((n) => ({ p: n.pitch, beat: n.beat, dur: n.dur })), ...lands.map((n) => ({ p: n.pitch, beat: n.beat, dur: n.dur }))].sort((a, b) => a.beat - b.beat);
      const good = analyzeTake(d, bpm, playAt(d, bpm, [...written, ...model]));
      expect(good.verdict, good.why.en).toBe('clean');
      expect(good.sections!.map((s) => s.name.en)).toEqual(['Intro', 'Head', 'Solo chorus', 'Head out', 'Ending']);
      const noIntro = written.filter((n) => n.beat >= 16);
      const bad = analyzeTake(d, bpm, playAt(d, bpm, [...noIntro, ...model]));
      expect(bad.verdict).not.toBe('clean');
      expect(bad.sections![0].ok).toBe(0);
      expect(bad.why.en).toMatch(/Intro/);
      expect(bad.why.he).toMatch(/פתיחה/);
    }
  });
  it('guitar: chord-melody head, free chorus, Basie ending; bass: walked intro, head in two, walking chorus', () => {
    const gl = famOf('g-gig').levels;
    const gWhole = levelDrills(gl[5], 'fifths-up');
    for (const d of gWhole) {
      expect(d.goal.free?.windows).toHaveLength(1);
      expect(d.goal.sections).toHaveLength(5);
      expect(d.band).toBeDefined();
    }
    const bl = famOf('b-gig').levels;
    for (const d of levelDrills(bl[5], 'fifths-up')) {
      expect(d.goal.sections).toHaveLength(5);
      expect(d.drums).toBeDefined();
      const p = tunePlan(0, d.spec.key);
      // the head in two: half notes only
      const head = d.notes.filter((n) => n.beat >= p.spans[1].from && n.beat < p.spans[1].to);
      expect(head.every((n) => n.dur >= 2 - 1e-6)).toBe(true);
      // the walking chorus: quarters
      const walk = d.notes.filter((n) => n.beat >= p.spans[2].from && n.beat < p.spans[2].to - 4);
      expect(walk.every((n) => Math.abs(n.dur - 1) < 1e-6)).toBe(true);
    }
  });
});

describe('wiring (everything connects)', () => {
  it('path: k-gig and b-gig at their ratings (1300–1840), g-gig by grade; families rise', () => {
    const tech = stepCatalogue().filter((s) => s.kind === 'tech' && s.ladder && /^(k|g|b)-gig$/.test(s.ladder.family));
    expect(tech.length).toBe(28);
    const d = (id: string) => tech.find((s) => s.id === `tech:${id}`)!.difficulty;
    expect(d('k-gig-1')).toBe(1320);
    expect(d('k-gig-8')).toBe(1500);
    expect(d('k-gig-12')).toBe(1840);
    expect(d('b-gig-1')).toBe(1300);
    for (const fam of ['k-gig', 'g-gig', 'b-gig']) {
      const ds = tech.filter((s) => s.ladder!.family === fam).sort((a, b) => a.ladder!.level - b.ladder!.level).map((s) => s.difficulty);
      for (let i = 1; i < ds.length; i++) expect(ds[i], `${fam} ${i + 1}`).toBeGreaterThanOrEqual(ds[i - 1]);
      expect(Math.max(...ds)).toBeLessThanOrEqual(1900);
    }
  });
  it('glyphs: each family its own symbol; the ear topic its own mark', () => {
    for (const [f, g] of [['k-gig', 'kgig'], ['g-gig', 'ggig'], ['b-gig', 'bgig']]) {
      expect(FAMILY_GLYPH[f]).toBe(g);
      expect((GLYPHS as Record<string, unknown>)[g]).toBeDefined();
    }
    const used = Object.entries(FAMILY_GLYPH).filter(([, g]) => ['kgig', 'ggig', 'bgig'].includes(g));
    expect(used).toHaveLength(3);
    expect(TOPIC_GLYPH['intro-ending']).toBeDefined();
  });
  it('badges, XP skills, lessons and the level test reach the new families', () => {
    expect(BADGES.some((b) => b.id.includes('k-gig'))).toBe(true);
    expect(BADGES.some((b) => b.id.includes('g-gig'))).toBe(true);
    const sk = (kind: string, option = 0) => {
      const d = generate({ family: 'k-gig', kind, key: 0, hands: 'RL', option } as DrillSpec);
      const m = analyzeTake(d, 80, playAt(d, 80, d.notes.map((n) => ({ p: n.pitch, beat: n.beat, dur: n.dur }))));
      return drillEvents(d, m, new Date().toISOString(), 's', 0).flatMap((e) => (e.tags ?? []).map((x) => x.sub)).join(',');
    };
    expect(sk('gg-tune', tuneOpt(0, 0))).toMatch(/form\/song/);
    expect(sk('gg-b2h')).toMatch(/chords\/voicing/);
    expect(sk('gg-end', 3)).toMatch(/cadences\/progression/);
    for (const u of ['tech:k-gig-1', 'tech:k-gig-2', 'tech:k-gig-9', 'tech:g-gig-1', 'tech:b-gig-1', 'topic:intro-ending']) {
      const l = lessonForUnit(u);
      expect(l, u).toBeTruthy();
      expect(MINI_LESSONS[l!.id]?.id).toMatch(/^gig-/);
    }
    const places = (xs: { rungs: { places: Record<string, number> }[] }[]) => xs.flatMap((s) => s.rungs).some((r) => Object.keys(r.places).some((k) => /-gig$/.test(k)));
    expect(places(pianoStrands('jazz') as never)).toBe(true);
    expect(places(guitarStrands() as never)).toBe(true);
    expect(places(bassStrands() as never)).toBe(true);
  });
  it('the ear topic names intros and endings in three levels', () => {
    const tp = TOPIC_GEN['intro-ending'];
    expect(tp.levels).toHaveLength(3);
    for (let level = 1; level <= 3; level++)
      for (let seed = 1; seed <= 20; seed++) {
        const q = tp.gen(seed, level, `t${seed}`) as { choices: string[]; answer: string; stimulus: unknown[]; names: Record<string, { he: string }> };
        expect(q.choices).toContain(q.answer);
        expect(q.choices.length).toBeGreaterThanOrEqual(3);
        expect(q.stimulus.length).toBeGreaterThan(0);
        for (const c of q.choices) expect(HE.test(q.names[c].he) || /[♭I]/.test(q.names[c].he)).toBe(true);
      }
  });
});
