// SPEC-STYLE-FOCUS §4 / §9.1: a chart backed by any band style — the chart band's own styles (charts.ts chartBacking:
// swing, pop, rock, bossa, ballad, waltz) or the band engine's Brazilian and Afro-Cuban styles (band.ts: samba, baião,
// cha-cha, mambo, bolero, songo, 6/8), so Improvise and the style taster play the player's style over any chart.
// Pure: the events of a backing (the count-in, the comping, the bass, a light percussion line).

import type { NoteEvent } from './lesson';
import { bandComping, hashOf, tumbaoBass, type BandStyle } from './band';
import { chartBacking, chordAtBeat, type Backing, type ChartStyle, type ParsedChart } from './charts';

const CHART_STYLES: string[] = ['swing', 'pop', 'rock', 'bossa', 'ballad', 'waltz'];
/** Afro-Cuban styles: the tumbao bass and the son clave (3-2). */
const CLAVE_STYLES: string[] = ['chacha', 'mambo', 'songo', 'latin', 'bolero'];

/** A backing for `loops` times through the chart in any band style. */
export function styledBacking(p: ParsedChart, style: ChartStyle | BandStyle, bpm: number, loops: number, o: { countIn?: boolean } = {}): Backing {
  if (CHART_STYLES.includes(style)) return chartBacking(p, style as ChartStyle, bpm, loops, 4, o);
  const st = style as BandStyle;
  const meter = st === 'afro68' ? 6 : 4;
  const beat = (60 / bpm) * (st === 'afro68' ? 0.5 : 1);
  const startBeat = o.countIn === false ? 0 : meter;
  const ev: NoteEvent[] = [];
  for (let k = 0; k < startBeat; k++) ev.push({ midi: k === 0 ? 96 : 91, start: k * beat, duration: 0.05, velocity: 0.5, perc: k === 0 ? 'accent' : 'click' });
  const len = p.bars * meter;
  const total = len * loops;
  const at = (b: number) => (startBeat + b) * beat;
  const seed = hashOf(`${st}|${p.bars}|${bpm}`);
  for (let l = 0; l < loops; l++) {
    // the band's comping in the style
    for (const h of bandComping(p, meter, len, st, seed + l)) for (const m of h.notes) ev.push({ midi: m, start: at(h.beat + l * len), duration: Math.max(0.08, h.len * beat * 0.9), velocity: h.vel * 0.6, inst: 'piano' });
    // the bass: the tumbao on the Afro-Cuban styles, else the root on 1 and the 5th / root on 3 (samba, baião, 6/8)
    if (CLAVE_STYLES.includes(st)) for (const b of tumbaoBass(p, meter, len)) ev.push({ midi: b.midi, start: at(b.beat + l * len), duration: beat * 0.9, velocity: b.ghost ? 0.45 : 0.78, inst: 'bass' });
    else
      for (let b = 0; b < len; b += meter / 2) {
        const c = chordAtBeat(p, meter, b);
        if (!c) continue;
        const pc = b % meter === 0 ? c.bass : (c.root + 7) % 12;
        let midi = 36 + (((pc - 36) % 12) + 12) % 12;
        if (midi > 45) midi -= 12;
        ev.push({ midi, start: at(b + l * len), duration: beat * (meter / 2) * 0.85, velocity: 0.78, inst: 'bass' });
      }
  }
  // a light percussion line: the son clave 3-2 (two bars) on the Afro-Cuban styles, a shaker in 8ths / 16ths otherwise
  const CLAVE = [0, 1.5, 3, 5, 6];
  for (let b = 0; b < total; b += 0.5) {
    const sub = st === 'samba' || st === 'baiao' ? 0.25 : 0.5;
    for (let s = 0; s < 0.5; s += sub) ev.push({ midi: 60, start: at(b + s), duration: 0.05, velocity: (b + s) % 1 === 0 ? 0.32 : 0.2, perc: 'hat' });
  }
  if (CLAVE_STYLES.includes(st)) for (let b = 0; b < total; b += 8) for (const c of CLAVE) if (b + c < total) ev.push({ midi: 60, start: at(b + c), duration: 0.05, velocity: 0.5, perc: 'rim' });
  for (let b = 0; b < total; b += meter / 2) ev.push({ midi: 36, start: at(b), duration: 0.08, velocity: b % meter === 0 ? 0.55 : 0.4, perc: 'kick' });
  return { events: ev.sort((a, b) => a.start - b.start), length: (startBeat + total) * beat + 0.4, startBeat };
}
