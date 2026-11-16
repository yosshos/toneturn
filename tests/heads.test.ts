// Heads (docs/AUDIT-DEPTH-3.md §1 #2–#4, C1, C3, C4): the melody library's licences, harmonising a melody (the melody on
// top, graded by voiceLead.ts), reharmonising with the melody checked, chord-melody on the guitar, the per-tune
// ladders, 12 keys.
import { describe, expect, it } from 'vitest';
import { HEADS, servedHeads } from '../src/content/heads';
import { chordUnder, harmEvents, headBars, headIn, HARM_STYLES, HARM_ORDER, parseMelody, registerHarmStyle, builtStyles } from '../src/engine/heads';
import { applicable, applyPlan, autoPlan, checkMelody, parsePlan, planCode, roleOf, DEVICES, type Plan } from '../src/engine/reharm';
import { catalog, generate } from '../src/engine/drills/generate';
import { guitarCatalog, generateGuitar, rng } from '../src/engine/drills/guitar';
import { classify, gradeVoicings, fitOnSet } from '../src/engine/drills/voiceLead';
import { analyzeVoiceLeadTake } from '../src/engine/drills/voiceLeadAnalyze';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { decodeHead, harmPlan, HEAD_KEYS, pianoHarmFamily, RH_SETS, SERVED, withApproaches } from '../src/engine/drills/headDrills';
import { stepCatalogue } from '../src/engine/path';
import { parseChart } from '../src/engine/charts';
import { tuningById } from '../src/engine/fretboard';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const pc = (n: number) => ((n % 12) + 12) % 12;
/** The owner's list (STANDARDS_LEGAL.md §2.1, PD worldwide): the only PD titles a head may carry. */
const PD_ALLOWED = ['Back Home Again in Indiana', 'Avalon', 'Rose Room', 'My Blue Heaven', 'Love Me or Leave Me', 'Mean to Me', "I'll Get By", 'If I Could Be with You',
  // 19th-century songs checked note for note against Mutopia "Public Domain" LilyPond files (AUDIT-DEPTH-3 §3, 2026-11-16)
  'Hard Times Come Again No More', "There's Music in the Air"];
const NOT_ALLOWED = /rhythm|body and soul|honeysuckle|misbehavin|st\.? louis|georgia|what is this thing/i;
const FAMS = ['k-harm', 'k-tune'];
const GFAMS = ['g-cmel', 'g-tune', 'b-tune'];
const pianoFams = () => catalog().filter((f) => FAMS.includes(f.id));
const guitarFams = () => guitarCatalog().filter((f) => GFAMS.includes(f.id));

function perfect(d: Drill, bpm: number): PlayedNote[] {
  const seen = new Set<string>();
  const out: PlayedNote[] = [];
  for (const n of d.notes) {
    const k = `${n.pitch}@${n.beat}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm), off: expTimeMs(d, n.beat + n.dur, bpm) - 20, vel: 70 });
  }
  return out.sort((a, b) => a.on - b.on);
}

describe('heads: the library and its licences', () => {
  it('every head is public domain worldwide or original', () => {
    for (const h of HEADS) expect(['pd-worldwide', 'original'], h.id).toContain(h.licence.kind);
  });
  it('PD heads: listed in STANDARDS_LEGAL §2.1, every composer died 1955 or earlier, published 1930 or earlier', () => {
    const pd = HEADS.filter((h) => h.licence.kind === 'pd-worldwide');
    expect(pd.length).toBeGreaterThanOrEqual(4);
    for (const h of pd) {
      if (h.licence.kind !== 'pd-worldwide') continue;
      expect(PD_ALLOWED, h.id).toContain(h.title.en);
      expect(h.licence.published, h.id).toBeLessThanOrEqual(1930);
      expect(h.licence.composers.length, h.id).toBeGreaterThan(0);
      for (const c of h.licence.composers) expect(c.died, `${h.id} ${c.name}`).toBeLessThanOrEqual(1955);
    }
  });
  it('no head carries a US-only or protected standard', () => {
    for (const h of HEADS) expect(NOT_ALLOWED.test(h.title.en), h.id).toBe(false);
  });
  it('4–6 originals in the standard forms: AABA, ABAC, blues, minor, ballad', () => {
    const orig = HEADS.filter((h) => h.licence.kind === 'original');
    expect(orig.length).toBeGreaterThanOrEqual(4);
    expect(orig.length).toBeLessThanOrEqual(6);
    expect(new Set(orig.map((h) => h.form))).toEqual(new Set(['AABA', 'ABAC', 'blues', 'minor', 'ballad']));
  });
  it('melodies: every bar 4 beats, as many bars as the chart, sections add up', () => {
    for (const h of HEADS) {
      expect(h.sections.reduce((a, s) => a + s.bars, 0), h.id).toBe(headBars(h));
      expect(parseChart(h.chords).errors, h.id).toEqual([]);
      if (!h.melody) continue;
      const p = parseMelody(h.melody);
      expect(p.errors, h.id).toEqual([]);
      expect(p.barBeats.length, h.id).toBe(headBars(h));
      p.barBeats.forEach((b, i) => expect(b, `${h.id} bar ${i + 1}`).toBeCloseTo(4, 6));
    }
  });
  it('a head waiting for the owner’s check (verify) is never served; served heads have a melody', () => {
    for (const h of servedHeads()) {
      expect(h.verify, h.id).toBeFalsy();
      expect(h.melody, h.id).toBeTruthy();
    }
    const unverified = HEADS.map((h, i) => (h.verify || !h.melody ? i : -1)).filter((i) => i >= 0);
    const options = [...pianoFams(), ...guitarFams()].flatMap((f) => f.levels.flatMap((l) => l.specs.map((s) => decodeHead(s.option).idx)));
    for (const i of unverified) expect(options, HEADS[i].id).not.toContain(i);
    expect(SERVED.length).toBeGreaterThanOrEqual(4);
  });
});

describe('harmonise a melody (C1): the melody on top, graded by voiceLead.ts', () => {
  const items = SERVED.flatMap((i) => ['shell', 'close', 'drop2', 'drop3'].map((st) => ({ kind: `hm-${st}`, option: i * 16 })));
  it('every item in every key: the model voicings grade clean, the melody is the top note of every chord', () => {
    for (const it of items)
      for (const key of HEAD_KEYS) {
        const d = generate({ family: 'k-harm', kind: it.kind, key, hands: 'RL', option: it.option });
        const g = d.goal.vl!;
        expect(g.chords.length, d.itemId).toBeGreaterThanOrEqual(2);
        const played = g.chords.map((_, k) => d.notes.filter((n) => n.chordId === k + 1).map((n) => n.pitch));
        played.forEach((p, k) => expect(Math.max(...p), `${d.itemId} #${k}`).toBe(g.chords[k].melody));
        const steps = gradeVoicings(played, g);
        expect(steps.map((s) => s.verdict), d.itemId).toEqual(steps.map(() => 'clean'));
      }
  });
  it('a perfect MIDI take is clean; the melody moved off the top is marked', () => {
    const d = generate({ family: 'k-harm', kind: 'hm-drop2', key: 5, hands: 'RL', option: SERVED[0] * 16 });
    expect(analyzeVoiceLeadTake(d, d.startBpm, perfect(d, d.startBpm)).verdict).toBe('clean');
    const g = d.goal.vl!;
    const first = d.notes.filter((n) => n.chordId === 1).map((n) => n.pitch);
    // The top voice an octave down: the melody note is no longer on top.
    const low = first.map((p) => (p === g.chords[0].melody ? p - 12 : p));
    expect(classify(low, g.chords[0], g).ok).toBe(false);
  });
  it('shells under the melody: the melody an extra voice above the 3rd and 7th; above it is wrong', () => {
    // F7 with the melody A (its 3rd) on top: LH F, then E♭ and A below the melody.
    const c = { root: 5, q: '7' as const, melody: 69 };
    const g = { type: 'guide' as const, bass: true, over: true };
    expect(classify([41, 57, 63, 69], c, g).kind).toBe('ok');
    expect(classify([41, 57, 63, 69 - 12], c, g).ok).toBe(false); // the melody not on top
    expect(classify([41, 63, 66, 69], c, g).kind).toBe('wrong'); // F♯ is not a guide tone of F7
  });
  it('chordUnder: a major chord as 6 under its root or 6th, maj7 under 3–5–7; a passing note gets none', () => {
    const Fmaj7 = { root: 5, iv: [0, 4, 7, 11] };
    expect(chordUnder(65, Fmaj7)).toBe('6');
    expect(chordUnder(69, Fmaj7)).toBe('maj7');
    expect(chordUnder(67, Fmaj7)).toBeNull();
    expect(chordUnder(70, { root: 0, iv: [0, 4, 7, 10] })).toBe('7');
  });
  it('styles plug in: a registered style becomes a level after the base ladder; todo hooks stay out', () => {
    expect(HARM_STYLES.sixdim.todo).toBe(true);
    expect(HARM_STYLES.borrow.todo).toBe(true);
    const before = pianoHarmFamily().levels.length;
    // 7 base levels + Siskind's shared hands (hm-shared, registered in heads.ts)
    expect(before).toBe(8);
    registerHarmStyle({ id: 'test-close', name: { en: 'Test', he: 'בדיקה' }, type: 'close', over: false, lo: 52, hi: 86, tol: 2 });
    try {
      const fam = pianoHarmFamily();
      expect(fam.levels.length).toBe(before + 1);
      expect(fam.levels[before].specs[0].kind).toBe('hm-test-close');
      const d = generate({ ...fam.levels[before].specs[0], key: 0 });
      expect(d.goal.vl!.type).toBe('close');
    } finally {
      delete HARM_STYLES['test-close'];
      HARM_ORDER.splice(HARM_ORDER.indexOf('test-close'), 1);
    }
    expect(builtStyles().map((s) => s.id)).toEqual(['shell', 'close', 'drop2', 'drop3', 'shared']);
  });
  it('harmEvents picks the notes on beats 1 and 3 and where a chord starts', () => {
    const hi = headIn(HEADS[SERVED[0]], 5);
    for (const e of harmEvents(hi, 0, 4, HARM_STYLES.close)) {
      const inBar = e.note.beat % 4;
      expect(inBar === 0 || inBar === 2 || Math.abs(e.chart.bar * 4 + e.chart.at - e.note.beat) < 1e-6).toBe(true);
    }
    expect(harmPlan({ family: 'k-harm', kind: 'hm-close', key: 5, hands: 'RL', option: SERVED[0] * 16 }).goal.chords.every((c) => c.melody !== undefined)).toBe(true);
  });
});

describe('reharmonise a head (C3): the melody checked against each new chord', () => {
  const C: { key: number } = { key: 0 };
  it('a tritone sub under the melody’s 3rd: B over D♭7 is its ♭7, a chord tone', () => {
    expect(roleOf(71, { root: 7, iv: [0, 4, 7, 10] })).toBe('chord');
    expect(roleOf(71, { root: 1, iv: [0, 4, 7, 10] })).toBe('chord');
    const r = applyPlan('Dm7 | G7 | Cmaj7 | Cmaj7', { 1: 'tritone' }, C, [{ pitch: 71, beat: 4, dur: 4 }]);
    expect(r.bars[1]).toBe('Db7');
    expect(r.conflicts).toEqual([]);
  });
  it('a clash is flagged with one short line: C over D♭7 is a major 7th on a dominant', () => {
    expect(roleOf(72, { root: 1, iv: [0, 4, 7, 10] })).toBe('avoid');
    const r = applyPlan('Dm7 | G7 | Cmaj7 | Cmaj7', { 1: 'tritone' }, C, [{ pitch: 72, beat: 4, dur: 4 }]);
    expect(r.conflicts.length).toBe(1);
    expect(r.conflicts[0].bar).toBe(1);
    expect(r.conflicts[0].line.en).toBe('Bar 2: C over D♭7 — the maj 7 on a dominant');
    expect(r.conflicts[0].line.he).toMatch(/^תיבה 2: /);
  });
  it('tensions: a 9th or 13th is fine, the 11th over a major chord clashes, ♭9 / ♯9 are fine on a dominant', () => {
    const maj = { root: 0, iv: [0, 4, 7, 11] };
    const dom = { root: 7, iv: [0, 4, 7, 10] };
    expect(roleOf(62, maj)).toBe('tension');
    expect(roleOf(69, maj)).toBe('tension');
    expect(roleOf(65, maj)).toBe('avoid');
    expect(roleOf(68, dom)).toBe('tension');
    expect(roleOf(70, dom)).toBe('tension');
    expect(roleOf(60, dom)).toBe('avoid');
    // Line cliché: the ♭7 over the m(maj7) clashes.
    expect(roleOf(70, { root: 0, iv: [0, 3, 7, 11] })).toBe('avoid');
  });
  it('each device where it applies: backdoor, extra ii–V, passing dim, line cliché, Coltrane', () => {
    expect(applyPlan('Cmaj7 | G7 | Cmaj7 | Cmaj7', { 1: 'backdoor' }, C).bars[1]).toBe('Fm7 Bb7');
    expect(applyPlan('Cmaj7 | G7 | Cmaj7 | Cmaj7', { 1: 'iiV' }, C).bars[1]).toBe('Dm7 G7');
    expect(applyPlan('Cmaj7 | Dm7 | G7 | Cmaj7', { 0: 'pdim' }, C).bars[0]).toBe('Cmaj7 C#dim7');
    expect(applyPlan('Am7 | Am7 | Dm7 | G7', { 0: 'cliche' }, C).bars[0]).toBe('Am Am(maj7) Am7 Am6');
    expect(applyPlan('Dm7 | G7 | Cmaj7 | Cmaj7', { 0: 'coltrane' }, C).bars.slice(0, 2)).toEqual(['Abmaj7 B7', 'Emaj7 G7']);
    expect(applyPlan('Dm7 G7 | Cmaj7', { 0: 'coltrane' }, C).bars[0]).toBe('Abmaj7 B7 Emaj7 G7');
    // Not where the context is missing.
    expect(applicable('Cmaj7 | Fmaj7', 0, C)).toEqual([]);
    expect(applyPlan('Cmaj7 | Fmaj7', { 0: 'tritone' }, C).skipped).toEqual([0]);
  });
  it('plan codes round-trip', () => {
    const p: Plan = { 3: 'tritone', 5: 'iiV', 12: 'coltrane' };
    expect(planCode(p)).toBe('3T5I12J');
    expect(parsePlan(planCode(p))).toEqual(p);
  });
  it('the preset reharms never clash with the melody, in every key, and change at least one bar', () => {
    for (const i of SERVED)
      for (const key of [HEADS[i].home.key, 6, 11]) {
        const hi = headIn(HEADS[i], key);
        for (const [kind, set] of Object.entries(RH_SETS)) {
          const r = applyPlan(hi.text, autoPlan(hi.text, hi.tonic, set, hi.notes), hi.tonic, hi.notes);
          expect(r.conflicts, `${HEADS[i].id} ${kind} ${key}`).toEqual([]);
          expect(parseChart(r.text).errors).toEqual([]);
          // Coltrane needs a ii–V into a major I; the borrowed set a major key with a IV, a held I or a V into I.
          if (kind !== 'tn-rh3' && kind !== 'tn-rh4') expect(r.changed.length, `${HEADS[i].id} ${kind}`).toBeGreaterThan(0);
        }
      }
  });
  it('checkMelody ignores short passing notes off the strong beats', () => {
    // F (the 11th of Cmaj7) as an eighth on the and of 1: free; on beat 3: a clash.
    expect(checkMelody([{ pitch: 65, beat: 0.5, dur: 0.5 }], 'Cmaj7', C)).toEqual([]);
    expect(checkMelody([{ pitch: 65, beat: 2, dur: 1 }], 'Cmaj7', C).length).toBe(1);
  });
  it('every device name is in the set the studio offers', () => {
    // HARMONY-REHARM §4: the borrowed devices (modal interchange) follow the functional ones.
    expect(DEVICES).toEqual(['tritone', 'iiV', 'backdoor', 'pdim', 'cliche', 'coltrane', 'minorIV', 'bVI', 'bVII', 'iiHalfDim', 'minorPlagal']);
  });
});

describe('chord-melody on the guitar (#4)', () => {
  const tu = tuningById('standard');
  it('the melody is the top note at every melody onset; drop-2 events fit the top string set', () => {
    for (const lv of guitarFams().find((f) => f.id === 'g-cmel')!.levels)
      for (const sp of lv.specs)
        for (const key of [0, 4, 8]) {
          const d = generateGuitar({ ...sp, key });
          const { head, phrase } = decodeHead(sp.option);
          const hi = headIn(head, key, 'guitar');
          const from = sp.kind === 'cm-chorus' ? 0 : phrase * 4;
          const to = sp.kind === 'cm-chorus' ? hi.bars.length : phrase * 4 + 4;
          const mel = hi.notes.filter((n) => n.beat >= from * 4 && n.beat < to * 4);
          for (const n of mel) {
            const at = d.notes.filter((x) => Math.abs(x.beat - (n.beat - from * 4)) < 1e-6);
            expect(Math.max(...at.map((x) => x.pitch)), `${d.itemId} @${n.beat}`).toBe(n.pitch);
            if ((sp.kind === 'cm-drop2' || sp.kind === 'cm-dim') && at.length === 4) {
              const set = [...at].sort((a, b) => a.pitch - b.pitch).map((x) => x.string!);
              expect(fitOnSet(at.map((x) => x.pitch), set, 'standard'), d.itemId).not.toBeNull();
            }
          }
          if (sp.kind !== 'cm-mel') expect(d.notes.some((x) => x.chordId !== undefined), d.itemId).toBe(true);
        }
  });
  it('chord tones are marked; a perfect take is clean', () => {
    const d = generateGuitar({ family: 'g-cmel', kind: 'cm-drop2', key: 7, hands: 'R', instrument: 'guitar', option: SERVED[0] * 16 });
    expect(d.notes.filter((n) => n.chordId !== undefined).every((n) => n.chordTone)).toBe(true);
    const bpm = d.startBpm;
    expect(analyzeGuitarTake(d, bpm, perfect(d, bpm)).verdict).toBe('clean');
    void tu;
  });
  it('bass walking with approaches: a half step into every chord change', () => {
    const tub = tuningById('bass');
    const d = generateGuitar({ family: 'b-tune', kind: 'tn-appr', key: 0, hands: 'R', instrument: 'bass', option: SERVED[0], perBeat: 1 });
    const chords = parseChart(d.chart!.join(' | ').replace(/♭/g, 'b').replace(/♯/g, '#')).chords.slice(1);
    let hits = 0;
    for (const c of chords) {
      const b = c.bar * 4 + c.at;
      const before = d.notes.find((n) => Math.abs(n.beat + n.dur - b) < 1e-6 && n.beat < b);
      const on = d.notes.find((n) => Math.abs(n.beat - b) < 1e-6);
      if (before && on && Math.abs(before.pitch - on.pitch) === 1) hits++;
    }
    expect(hits / chords.length).toBeGreaterThan(0.8);
    void withApproaches;
    void tub;
  });
});

describe('12 keys, the ladders and the path', () => {
  it('every level lists all 12 keys; items move to each key (tonic, chart and melody)', () => {
    const fams = [...pianoFams(), ...guitarFams()];
    expect(fams.map((f) => f.id).sort()).toEqual(['b-tune', 'g-cmel', 'g-tune', 'k-harm', 'k-tune']);
    for (const f of fams)
      for (const lv of f.levels) {
        expect([...(lv.keys as number[])].sort((a, b) => a - b), lv.id).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        const sp = lv.specs[0];
        const tonics = new Set<number>();
        for (const key of HEAD_KEYS) {
          const d = f.id.startsWith('k-') ? generate({ ...sp, key }) : generateGuitar({ ...sp, key });
          expect(d.tonic?.key, d.itemId).toBe(key);
          tonics.add(d.tonic!.key);
          expect(d.chart?.length, d.itemId).toBeGreaterThan(0);
          expect(d.notes.length, d.itemId).toBeGreaterThan(0);
        }
        expect(tonics.size, lv.id).toBe(12);
      }
  });
  it('a head in another key: the chart is spelled for it, the melody moves with it', () => {
    const h = HEADS[SERVED[0]];
    const a = headIn(h, h.home.key);
    const b = headIn(h, pc(h.home.key + 2));
    expect(b.bars[0]).not.toBe(a.bars[0]);
    expect(b.notes.map((n) => pc(n.pitch - a.notes[0].pitch))[0]).toBe(2);
    expect(headIn(h, 6).text).not.toMatch(/##|bb/);
  });
  it('counts: k-harm 8, k-tune 10, g-cmel 6, g-tune 9, b-tune 7 levels', () => {
    const n = (id: string) => [...pianoFams(), ...guitarFams()].find((f) => f.id === id)!.levels.length;
    expect([n('k-harm'), n('k-tune'), n('g-cmel'), n('g-tune'), n('b-tune')]).toEqual([8, 10, 6, 9, 7]);
  });
  it('the path places them by difficulty inside 1300–1800', () => {
    const steps = stepCatalogue().filter((s) => s.ladder && [...FAMS, ...GFAMS].includes(s.ladder.family));
    expect(steps.length).toBe(8 + 10 + 6 + 9 + 7);
    for (const s of steps) {
      expect(s.difficulty, s.id).toBeGreaterThanOrEqual(1300);
      expect(s.difficulty, s.id).toBeLessThanOrEqual(1800);
    }
  });
  it('titles fit: two short lines at most', () => {
    for (const f of [...pianoFams(), ...guitarFams()])
      for (const lv of f.levels) {
        const d = f.id.startsWith('k-') ? generate({ ...lv.specs[0], key: 6 }) : generateGuitar({ ...lv.specs[0], key: 6 });
        expect(d.title.en.length, d.title.en).toBeLessThanOrEqual(80);
        expect(/[֐-׿]/.test(d.title.he), d.title.he).toBe(true);
      }
  });
  it('rng is seeded (deterministic items)', () => {
    expect(rng('a')()).toBe(rng('a')());
  });
});

describe('melody against the chords, by ear (melody-fit)', () => {
  it('both levels generate for many seeds; the answer is offered and named', async () => {
    await import('../src/engine/topics');
    const { TOPIC_GEN } = await import('../src/engine/topicKit');
    for (let seed = 1; seed <= 60; seed++)
      for (const level of [1, 2, 3]) {
        const q = TOPIC_GEN['melody-fit'].gen(seed, level, `t${seed}`) as unknown as { choices: string[]; answer: string; names: Record<string, unknown> };
        expect(q.choices, `${seed}/${level}`).toContain(q.answer);
        for (const c of q.choices) expect(q.names[c], c).toBeTruthy();
      }
  });
});
