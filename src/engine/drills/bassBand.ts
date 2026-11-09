// The harmony band under bass takes (BASS_VALIDATION §3: styles, standards, the bagrut solo / sight-read
// improvisation, riffs and pieces "with a band"). A drill that has drums AND a chord chart also gets the band's
// comping (band.ts), in the style its drum groove calls for, on the same beat grid as the take. Like the drums it
// plays only when the headphones gate is confirmed (or a MIDI bass): the mic must hear only the bass. Without
// headphones the take keeps the click, as before. The comping never changes what is measured.
//
// Pure: chart text, style choice and the hits in drill beats.

import type { Drill } from './types';
import { parseChart } from '../charts';
import { bandComping, hashOf, type BandStyle, type CompHit } from '../band';
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
