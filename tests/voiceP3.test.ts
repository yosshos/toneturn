// The voice course, third pass (VOICE_CURRICULUM "Implemented (P3)"): colla voce then back on the bar with a groove
// that stretches to the singer (F14 L6), Lantern Street's rubato verse before the chorus (F14 L9), and the ear and
// first-song topics as sung levels (F10 L1 / L3 / L5, F13 L1) — placed in their families without renumbering.
import { describe, expect, it } from 'vitest';
import { gradeTake, itemTargets, type VocalItem } from '../src/engine/vocal';
import { EAR_P3_LEVELS, NEW_LEVEL_NAMES, SONG_ECHO_LEVELS, VOICE_FAMILIES, familyOfRef, vocalLevelByRef, voiceItemTags, voiceLevelUnlocked, voiceStartNow } from '../src/engine/voiceFamilies';
import { paceOf, reentryOffset, rejoinAt, stretchSegment, synthColla } from '../src/engine/voiceP2';
import { collaParts, gradeCollaSong } from '../src/engine/voiceGrade';
import { songPlan, voiceSong } from '../src/engine/voiceSongs';
import { synthLine } from '../src/engine/voiceTime';
import { earReference, earReplayNote, earShown, sessionEarItem } from '../src/engine/voiceEar';
import { stepCatalogue } from '../src/engine/path';
import { withLadderFacts } from '../src/engine/ladderFacts';
import type { NoteEvent } from '../src/engine/lesson';

const R = { low: 50, high: 74 };
const item = (lv: number, k = 0): VocalItem => vocalLevelByRef(lv)!.items[k];
const fam = (id: string) => VOICE_FAMILIES.find((f) => f.id === id)!;

describe('P3 levels sit where the plan puts them, old progress kept', () => {
  it('F10 L1 / L3 / L5 around the old ear levels, F13 L1 opens the songs; every one a path step with a name', () => {
    expect(fam('v-ear').refs).toEqual([1203, 8, 1204, 1201, 1205, 1202, 1206, 1207]);
    expect(fam('v-songs').refs[0]).toBe(1309);
    expect(fam('v-songs').refs.slice(1, 3)).toEqual([1301, 1302]);
    const steps = new Set(stepCatalogue().filter((s) => s.kind === 'vocal').map((s) => s.ladder!.ref));
    for (const n of [1203, 1204, 1205, 1309]) {
      expect(steps.has(String(n)), String(n)).toBe(true);
      expect(VOICE_FAMILIES.filter((f) => f.refs.includes(n)).length).toBe(1);
      expect(NEW_LEVEL_NAMES[n].he.length).toBeGreaterThan(2);
      expect(NEW_LEVEL_NAMES[n].en.length).toBeGreaterThan(2);
    }
  });
  it('nothing open before is locked: the old first levels stay open, an old level opens by its old predecessor', () => {
    expect(voiceLevelUnlocked(fam('v-songs'), 1301, [])).toBe(true);
    expect(voiceLevelUnlocked(fam('v-ear'), 8, [])).toBe(true);
    // 1201 came after 8; 1204 now sits between them
    expect(voiceLevelUnlocked(fam('v-ear'), 1201, [8])).toBe(true);
    expect(voiceLevelUnlocked(fam('v-ear'), 1201, [])).toBe(false);
    expect(voiceLevelUnlocked(fam('v-ear'), 1204, [8])).toBe(true);
    expect(voiceLevelUnlocked(fam('v-songs'), 1302, [])).toBe(false);
    expect(voiceLevelUnlocked(fam('v-songs'), 1302, [1301])).toBe(true);
  });
  it('a saved placement start counts the levels put in front: ✓ by test stays on the same old levels', () => {
    expect(voiceStartNow('v-songs', 3)).toBe(4);
    expect(voiceStartNow('v-songs', undefined)).toBe(1);
    expect(voiceStartNow('v-breath', 3)).toBe(3);
    const f = withLadderFacts({}, { families: ['v-songs', 'v-ear'], items: {}, order: 'fifths-up' as never, start: { 'v-songs': 3, 'v-ear': 2 } as never, vocalPassed: [], at: '2026-11-11T10:00:00Z' });
    for (const n of [1309, 1301, 1302, 1203, 8]) expect(f.tests?.[`vocal:${n}`], String(n)).toBeDefined();
    expect(f.tests?.['vocal:1303']).toBeUndefined();
    expect(f.tests?.['vocal:1204']).toBeUndefined();
  });
  it('rated as real sub-skills: intervals, the inner ear, songs', () => {
    expect(voiceItemTags(1204, item(1204)).tags.some((t) => t.sub === 'singing/intervals')).toBe(true);
    expect(voiceItemTags(1205, item(1205)).tags.some((t) => t.sub === 'sequences/inner')).toBe(true);
    expect(voiceItemTags(1309, item(1309)).tags.some((t) => t.sub === 'singing/songs')).toBe(true);
    expect(familyOfRef(1309)!.id).toBe('v-songs');
  });
});

describe('the ear items: what is played, what is shown, how they are graded', () => {
  const take = (it: VocalItem, shift = 0) => {
    const tg = itemTargets(it, R);
    const secs = it.noteSecs ?? tg.map(() => 0.6);
    let at = 0.3;
    const notes = tg.map((m, i) => {
      const n = { midi: m + (i === tg.length - 1 ? shift : 0), start: at, dur: Math.max(0.35, secs[i] * 0.95) };
      at += Math.max(0.4, secs[i]);
      return n;
    });
    return gradeTake(it, synthLine(notes), R);
  };
  it('a clean take of every item passes; the last note a semitone off fails', () => {
    for (const lv of [...EAR_P3_LEVELS, ...SONG_ECHO_LEVELS])
      for (const it of lv.items) {
        expect(take(it).score, it.id).toBeGreaterThanOrEqual(lv.pass);
        if (it.ear?.mode === 'interval') expect(take(it, 1).score, `${it.id} off`).toBeLessThan(lv.pass);
      }
    const all = [...EAR_P3_LEVELS, ...SONG_ECHO_LEVELS].flatMap((l) => l.items);
    expect(all.filter((it) => it.ear?.mode !== 'interval').some((it) => take(it, 1).score < take(it).score)).toBe(true);
  });
  it('intervals: only the given note is played and shown; audiation: the two bars before, never the bar to sing', () => {
    const iv = item(1204, 2);
    const tg = itemTargets(iv, R);
    const ref = earReference(iv, tg)!;
    expect(ref.events.map((e) => e.midi)).toEqual([tg[0]]);
    expect(earShown(iv, tg)).toEqual([tg[0]]);
    const au = item(1205);
    const at = itemTargets(au, R);
    const ar = earReference(au, at)!;
    expect(ar.events.length).toBe(2 * at.length);
    // the played bars climb by step into the sung bar; the sung bar is not among the last played notes
    expect(ar.events.slice(-at.length).map((e) => e.midi)).not.toEqual(at);
    expect(earShown(au, at)).toEqual([]);
    expect(earReplayNote(au, at)).toBe(ar.events[0].midi);
    // echoes keep their rhythm
    const ec = item(1203, 1);
    const er = earReference(ec, itemTargets(ec, R))!;
    expect(new Set(er.events.map((e) => Math.round(e.duration * 100))).size).toBeGreaterThan(1);
  });
  it('echo and audiation are fresh every session (seeded): same id, rhythm and difficulty band; clean takes pass', () => {
    for (const lv of [1203, 1205]) {
      const def = vocalLevelByRef(lv)!;
      for (const fixed of def.items) {
        const seen = new Set<string>();
        for (let seed = 1; seed <= 40; seed++) {
          const it = sessionEarItem(fixed, seed);
          expect(it.id).toBe(fixed.id);
          expect(sessionEarItem(fixed, seed).steps).toEqual(it.steps); // deterministic per seed
          const st = it.steps!;
          seen.add(st.join(','));
          expect(st.length).toBe(fixed.steps!.length);
          expect(st.every((x, i) => i === 0 || x !== st[i - 1]), `${it.id} ${seed}`).toBe(true);
          if (lv === 1203) {
            expect(it.noteSecs).toEqual(fixed.noteSecs);
            const leap = (xs: number[]) => Math.max(2, ...xs.slice(1).map((x, i) => Math.abs(x - xs[i])));
            expect(leap(st)).toBeLessThanOrEqual(leap(fixed.steps!));
            expect(Math.max(...st) - Math.min(...st)).toBeLessThanOrEqual(Math.max(...fixed.steps!) - Math.min(...fixed.steps!) + 2);
            expect([0, 12]).toContain(st[st.length - 1]);
          } else {
            expect(it.ear!.lead!.length).toBe(2 * st.length);
            expect(it.noteSecs![0]).toBeCloseTo(fixed.noteSecs![0], 5);
          }
          if (seed <= 5) expect(take(it).score, `${it.id} ${seed}`).toBeGreaterThanOrEqual(def.pass);
        }
        expect(seen.size, fixed.id).toBeGreaterThan(3);
      }
    }
    // intervals and the song echoes keep their own content
    expect(sessionEarItem(item(1204), 3)).toBe(item(1204));
    expect(sessionEarItem(item(1309), 3)).toBe(item(1309));
  });
  it('F13 L1 echoes the first phrase of public-domain songs, repeated notes joined (the echo is graded on pitch)', () => {
    const ids = SONG_ECHO_LEVELS[0].items.map((x) => x.ear?.song);
    expect(ids).toEqual(['jacques', 'mary', 'yonatan', 'london']);
    for (const it of SONG_ECHO_LEVELS[0].items) {
      const st = it.steps!;
      expect(st.every((x, i) => i === 0 || x !== st[i - 1]), it.id).toBe(true);
      expect(st.length).toBeGreaterThanOrEqual(6);
    }
    expect(item(1309).steps).toEqual([0, 2, 4, 0, 2, 4, 0]);
  });
});

describe('colla voce then back on the bar (F14 L6) and the rubato verse (F14 L9)', () => {
  it('the rejoin: the last free note held its written length, a count-in bar, then the downbeat', () => {
    expect(rejoinAt(10, 4, 1, 4)).toEqual({ count: 14, downbeat: 18 });
    expect(rejoinAt(10, 0.5, 0.5, 4)).toEqual({ count: 10.5, downbeat: 12.5 });
  });
  it("the band's groove stretches to the singer's pace (kept between half and twice the tempo)", () => {
    expect(paceOf(0.5, 2, 2, 0.5)).toBeCloseTo(0.75, 5);
    expect(paceOf(0.5, 10, 1, 0.5)).toBeCloseTo(0.75, 5); // clamped to 2× = 1.0, smoothed
    expect(paceOf(0.5, 0, 1, 0.5)).toBe(0.5);
    const ev = (start: number): NoteEvent => ({ midi: 40, start, duration: 0.4, velocity: 0.5 });
    const groove = [0, 1, 2, 3, 4].map((b) => ({ beat: b, ev: ev(b * 0.5) }));
    const seg = stretchSegment(groove, 1, 3, 1, 0.5, 0.2);
    expect(seg.map((e) => e.start)).toEqual([0.2, 1.2]);
    expect(seg[0].duration).toBeCloseTo(0.8, 5);
  });
  it('back on the bar: the onset nearest the written re-entry, none within a beat → null', () => {
    expect(reentryOffset([0.1, 4.05, 5], 4, 0.5)).toBeCloseTo(0.05, 5);
    expect(reentryOffset([1, 7], 4, 0.5)).toBeNull();
  });
  const run = (lv: number, k: number, o: { late?: number; cents?: number } = {}) => {
    const it = item(lv, k);
    const plan = songPlan(voiceSong(it.song!.id)!, R);
    const to = plan.bars - 1;
    const { free, tempo, lastBeats } = collaParts(plan, 0, to, it.song!.freeUntil!);
    const sc = synthColla(free.map((n) => ({ midi: n.midi, secs: n.dur * 1.2 })), tempo, lastBeats, plan.beat, plan.meter, o);
    return { res: gradeCollaSong(it, sc.frames, plan, 0, to, sc.rejoin), pass: vocalLevelByRef(lv)!.pass, beat: plan.beat };
  };
  it('1408: a free phrase then in time, back on the one → passes; a beat and a half late → fails; out of tune → fails', () => {
    for (const k of [0, 1]) {
      const ok = run(1408, k);
      expect(ok.res.follow).toBeGreaterThanOrEqual(0.8);
      expect(Math.abs(ok.res.reentry!)).toBeLessThan(0.1);
      expect(ok.res.grade.score, String(k)).toBeGreaterThanOrEqual(ok.pass);
      const late = run(1408, k, { late: ok.beat * 1.6 });
      expect(late.res.grade.score).toBeLessThan(late.pass);
      const sour = run(1408, k, { cents: 80 });
      expect(sour.res.grade.score).toBeLessThan(sour.pass);
    }
  });
  it('1409: the rubato verse (8 bars, colla voce) before the 32-bar chorus in time', () => {
    const s = voiceSong('lantern-street-verse')!;
    expect(s.tier).toBe('own');
    const plan = songPlan(s, R);
    expect(plan.bars).toBe(40);
    expect(plan.phrases.length).toBe(6);
    expect(item(1409).song!.freeUntil).toBe(2);
    expect(collaParts(plan, 0, 39, 2).split).toBe(8);
    const ok = run(1409, 0);
    expect(ok.res.song.phrases.length).toBe(6);
    expect(ok.res.grade.score).toBeGreaterThanOrEqual(ok.pass);
    // the never-finished verse: the chorus is not graded, the take cannot pass
    const it = item(1409);
    expect(gradeCollaSong(it, [], plan, 0, 39, null).grade.unclear).toBe(true);
  });
});
