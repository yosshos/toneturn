// Owner 2026-11-21: the melodies of the openers and of the repertoire road must fit sophisticated music — they swing.
// Children's songs stay in the songbook for absolute beginners and the Practice list, but are never opener sounds and
// never a repertoire step past the second. Our own jazz-idiom tunes must be sensible as exercises.
import { describe, expect, it } from 'vitest';
import { CHILDREN_SONG_IDS, SONGBOOK, songChords, songNotes, songRange } from '../src/content/songbook';
import { COURSE_OPENERS, JAZZ_LEG, UNIT_THEMES } from '../src/content/openers';
import { REPERTOIRE, repRefs } from '../src/engine/repertoire';
import { songDrill } from '../src/engine/drills/songDrills';
import { voiceSong } from '../src/engine/voiceSongs';

const OWN = SONGBOOK.filter((s) => s.own);

/** Every melodic line of the openers: Snd note lists (a rolled chord counts once) and the unit openers' lane passes. */
function openerLines(): { where: string; midis: number[] }[] {
  const out: { where: string; midis: number[] }[] = [];
  const walk = (v: unknown, where: string) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      // A lane pass: [{ m: [...], t }, …] — single notes make the line, a chord breaks it.
      if (v.length && v.every((e) => e && typeof e === 'object' && !Array.isArray(e) && 't' in e)) {
        let cur: number[] = [];
        for (const e of v as { m?: number[] }[]) {
          if (e.m?.length === 1) cur.push(e.m[0]);
          else {
            if (cur.length) out.push({ where, midis: cur });
            cur = [];
          }
        }
        if (cur.length) out.push({ where, midis: cur });
        return;
      }
      v.forEach((x, i) => walk(x, `${where}[${i}]`));
      return;
    }
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.n) && o.n.every((e) => Array.isArray(e) && typeof e[0] === 'number')) {
      const evs = (o.n as [number, number][]).slice().sort((a, b) => a[1] - b[1]);
      const midis: number[] = [];
      let last = -1;
      for (const [m, t] of evs) {
        if (last >= 0 && t - last < 0.05) continue;
        midis.push(m);
        last = t;
      }
      out.push({ where, midis });
    }
    for (const [k, x] of Object.entries(o)) if (k !== 'n') walk(x, `${where}.${k}`);
  };
  walk(COURSE_OPENERS, 'course');
  walk(JAZZ_LEG, 'jazz');
  walk(UNIT_THEMES, 'unit');
  return out;
}

const intervals = (ms: number[]) => ms.slice(1).map((m, i) => m - ms[i]);
const contains = (hay: number[], needle: number[]) => hay.some((_, i) => needle.every((x, j) => hay[i + j] === x));

describe('children’s songs are not the default material', () => {
  it('the list names real songbook songs', () => {
    for (const id of CHILDREN_SONG_IDS) expect(SONGBOOK.some((s) => s.id === id), id).toBe(true);
  });

  it('no repertoire step past the second is a children’s song', () => {
    for (const [course, items] of Object.entries(REPERTOIRE)) {
      items.forEach((it, i) => {
        if (i < 2) return;
        const ids = [...repRefs(it).songs, ...(it.ref?.kind === 'song' ? [it.ref.id] : [])];
        for (const id of ids) expect(CHILDREN_SONG_IDS, `${course} step ${i + 1}: ${it.id}`).not.toContain(id);
      });
    }
  });

  it('the first foundations of the instrument courses swing', () => {
    for (const c of ['keys', 'guitar', 'bass', 'voice'] as const) {
      const first = REPERTOIRE[c][0];
      const s = SONGBOOK.find((x) => x.id === first.ref?.id);
      expect(s?.feel, `${c}: ${first.id}`).toBe('swing');
    }
  });

  it('no opener sound quotes the opening of a children’s song', () => {
    const lines = openerLines();
    expect(lines.length).toBeGreaterThan(20);
    for (const id of CHILDREN_SONG_IDS) {
      const s = SONGBOOK.find((x) => x.id === id)!;
      const head = songNotes(s)
        .map((n) => n.semi)
        .filter((x): x is number => x !== null)
        .slice(0, 5);
      // The first four notes as intervals (Happy Birthday's "G G A G" is three of them); repeated notes alone are no quote.
      const needle = intervals(head.slice(0, 4));
      if (needle.every((x) => x === 0)) continue;
      for (const l of lines) expect(contains(intervals(l.midis), needle), `${l.where} quotes ${id}`).toBe(false);
    }
  });
});

describe('our own jazz-idiom tunes', () => {
  it('there are blues, minor blues, ii–V–I, riff and ballad tunes, with easy versions', () => {
    for (const id of ['low-road-blues', 'shade-tree', 'cellar-steps', 'homeward', 'ninth-street', 'rooftop-riff', 'last-light']) expect(OWN.map((s) => s.id)).toContain(id);
    expect(OWN.filter((s) => s.level === 1).length).toBeGreaterThanOrEqual(2);
    expect(OWN.some((s) => s.minor)).toBe(true);
    expect(OWN.some((s) => s.feel === 'ballad')).toBe(true);
  });

  it('every one has a sensible range, length and feel, and titles in both languages', () => {
    for (const s of OWN) {
      const notes = songNotes(s).filter((n) => n.semi !== null);
      const bars = s.melody.split('|').length;
      const [lo, hi] = songRange(s);
      expect(s.title.en.length, s.id).toBeGreaterThan(3);
      expect(s.title.he, s.id).toMatch(/[֐-׿]/);
      expect(s.feel, s.id).toBeDefined();
      expect([8, 12, 16], `${s.id} bars`).toContain(bars);
      expect(notes.length, `${s.id} notes`).toBeGreaterThanOrEqual(16);
      expect(notes.length, `${s.id} notes`).toBeLessThanOrEqual(110);
      expect(hi - lo, `${s.id} range`).toBeGreaterThanOrEqual(5);
      expect(hi - lo, `${s.id} range`).toBeLessThanOrEqual(s.level <= 1 ? 12 : 19);
      expect(songChords(s).length, `${s.id} chords`).toBeGreaterThanOrEqual(bars);
      // Easy versions: mostly steps (≤ a major 3rd), no leap past a 5th.
      if (s.level <= 1) {
        const iv = intervals(notes.map((n) => n.semi!)).map(Math.abs);
        expect(Math.max(...iv), `${s.id} leap`).toBeLessThanOrEqual(7);
        expect(iv.filter((x) => x <= 4).length / iv.length, `${s.id} steps`).toBeGreaterThanOrEqual(0.8);
      }
    }
  });

  it('play swung on the instrument and sing over the swing band', () => {
    for (const s of OWN) {
      expect(songDrill(s, 'melody').spec.swing, s.id).toBe(true);
      const v = voiceSong(s.id)!;
      expect(v.tier, s.id).toBe('own');
      expect(v.style, s.id).toBe(s.feel === 'ballad' ? 'ballad' : 'swing');
    }
    // A traditional song played swung keeps its own notes (When the Saints).
    expect(songDrill(SONGBOOK.find((s) => s.id === 'saints')!, 'melody').spec.swing).toBe(true);
  });
});
