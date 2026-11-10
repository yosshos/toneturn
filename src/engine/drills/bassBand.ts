// The harmony band under bass takes (BASS_VALIDATION §3: styles, standards, the bagrut solo / sight-read
// improvisation, riffs and pieces "with a band"). A drill that has drums AND a chord chart also gets the band's
// comping (band.ts), in the style its drum groove calls for, on the same beat grid as the take. Like the drums it
// plays only when the headphones gate is confirmed (or a MIDI bass): the mic must hear only the bass. Without
// headphones the take keeps the click, as before. The comping never changes what is measured.
//
// Pure: chart text, style choice and the hits in drill beats.

import type { Drill } from './types';
import { parseChart } from '../charts';
import { bandComping, hashOf, walkingBass, type BandStyle, type CompHit } from '../band';
import { chordAtBeat } from '../charts';
import { GROOVES } from '../grooves';

/** The comping style a drum groove calls for (the groove bank's own style, a few grooves by name). */
export function bandStyleOf(groove: string): BandStyle {
  if (groove === 'ballad-brush') return 'ballad';
  if (groove === 'jazz-waltz' || groove === 'waltz') return 'waltz';
  if (groove === 'bossa') return 'bossa';
  if (groove === 'reggae') return 'reggae';
  if (groove === 'half-time' || groove === 'purdie') return 'pop';
  const g = GROOVES.find((x) => x.id === groove);
  switch (g?.style) {
    case 'jazz':
      return 'swing';
    case 'rock':
      return 'rock';
    case 'pop':
    case 'ballad':
      return 'pop';
    case 'funk':
    case 'hiphop':
    case 'electronic':
      return 'funk';
    case 'latin':
      return 'latin';
    case 'blues':
      return 'shuffle';
    default:
      return 'hold';
  }
}

/** A drill's per-bar chart as chart text the parser reads: ♭ ♯ °7 spelled out, roadmap marks dropped, empty bars = %. */
export function chartText(chart: string[]): string {
  return chart
    .map((bar) => {
      const toks = bar
        .replace(/♭/g, 'b')
        .replace(/♯/g, '#')
        .replace(/°7/g, 'dim7')
        .replace(/°/g, 'dim')
        .split(/\s+/)
        .filter((t) => /^[A-G]/.test(t) && !/:$/.test(t));
      return toks.length ? toks.join(' ') : '%';
    })
    .join(' | ');
}

/** The band's comping hits for a drill (beats from beat 0 of the take), or none when it has no band. */
export function bandHits(drill: Pick<Drill, 'band' | 'chart' | 'meter' | 'beats' | 'itemId'>): CompHit[] {
  const rests = drill.band?.rests ?? [];
  return bandHits0(drill).filter((h) => !rests.some(([a, b]) => h.beat >= a - 1e-6 && h.beat < b - 1e-6));
}
function bandHits0(drill: Pick<Drill, 'band' | 'chart' | 'meter' | 'beats' | 'itemId'>): CompHit[] {
  if (!drill.band || !drill.chart?.length) return [];
  const meter = drill.meter || 4;
  // Leading empty bars (a groove before the changes) are rests for the band.
  const lead = drill.chart.findIndex((b) => /[A-G]/.test(b));
  if (lead < 0) return [];
  const p = parseChart(chartText(drill.chart.slice(lead)), meter);
  if (!p.chords.length) return [];
  const total = Math.min(p.bars * meter, drill.beats - lead * meter);
  return bandComping(p, meter, total, drill.band.style, hashOf(drill.itemId)).map((h) => ({ ...h, beat: h.beat + lead * meter }));
}

/**
 * Drums course (0.66): the band's bass line under a groove — the chord's root on every kick of the groove (the bass
 * locks with the kick: the band sound in reverse), held to the next kick; in swing / waltz a walking line. Beats from
 * beat 0 of the take; nothing in the band's rests.
 */
export function bandBass(drill: Pick<Drill, 'band' | 'chart' | 'meter' | 'beats' | 'itemId' | 'notes'>): { beat: number; midi: number; len: number; vel: number }[] {
  if (!drill.band?.bass || !drill.chart?.length) return [];
  const meter = drill.meter || 4;
  const p = parseChart(chartText(drill.chart), meter);
  if (!p.chords.length) return [];
  const total = Math.min(p.bars * meter, drill.beats);
  const rests = drill.band.rests ?? [];
  const resting = (b: number) => rests.some(([a, e]) => b >= a - 1e-6 && b < e - 1e-6);
  let out: { beat: number; midi: number; len: number; vel: number }[];
  if (drill.band.style === 'swing' || drill.band.style === 'waltz') {
    out = walkingBass(p, meter, total, hashOf(`${drill.itemId}:bass`)).map((n) => ({ beat: n.beat, midi: n.midi, len: n.ghost ? 0.3 : 0.9, vel: n.ghost ? 0.45 : 0.8 }));
  } else {
    const kicks = [...new Set(drill.notes.filter((n) => n.voice === 'kick' && n.beat < total - 1e-6).map((n) => n.beat))].sort((a, b) => a - b);
    out = kicks.map((b, i) => {
      const c = chordAtBeat(p, meter, b);
      const pcRoot = c ? c.bass : 9;
      const midi = 36 + ((pcRoot - 36) % 12 + 12) % 12;
      const next = kicks[i + 1] ?? total;
      return { beat: b, midi: midi > 45 ? midi - 12 : midi, len: Math.max(0.25, Math.min(2, next - b) * 0.9), vel: 0.8 };
    });
  }
  return out.filter((n) => !resting(n.beat));
}
