// The compact kit staff (moved out of KitRead.tsx so the mini-lesson player can draw a groove without the game):
// x heads for cymbals, stems up for the hands, down for the feet, ghosts in brackets, accents, flams / drags, triplets.
import '../kitread.css';
import type { KitBar } from '../engine/kitRead';


/** Staff positions (y of the note head): lines at 30 38 46 54 62. */
const POS: Record<string, { y: number; x?: boolean; down?: boolean }> = {
  c: { y: 22, x: true },
  h: { y: 26, x: true },
  r: { y: 30, x: true },
  t1: { y: 34 },
  s: { y: 42 },
  rm: { y: 42, x: true },
  t3: { y: 50 },
  k: { y: 58, down: true },
  p: { y: 66, x: true, down: true },
};
const W = 330;
const LEFT = 30;

/** One bar on a five-line kit staff: x heads for cymbals, stems up for the hands, down for the feet, beams per group. */
export function KitStaff({ bar, label }: { bar: KitBar; label?: string }) {
  const step = (W - LEFT - 8) / bar.steps;
  const xOf = (i: number) => LEFT + (i + 0.5) * step;
  const els: React.ReactNode[] = [];
  const voices = (down: boolean) => Object.entries(bar.lanes).filter(([l, v]) => v && POS[l] && !!POS[l].down === down) as [string, string][];
  // heads
  for (const down of [false, true]) {
    for (const [l, pat] of voices(down)) {
      [...pat].forEach((c, i) => {
        if (c === '.') return;
        const p = POS[l];
        const x = xOf(i);
        if (p.x) els.push(<path key={`${l}${i}`} d={`M${x - 3.5} ${p.y - 3.5}l7 7M${x + 3.5} ${p.y - 3.5}l-7 7`} className="ks-x" />);
        else els.push(<ellipse key={`${l}${i}`} cx={x} cy={p.y} rx={4.6} ry={3.4} transform={`rotate(-20 ${x} ${p.y})`} className={c === 'g' ? 'ks-ghost' : 'ks-head'} />);
        if (c === 'g') els.push(<text key={`g${l}${i}`} x={x} y={p.y + 3.5} className="ks-paren" textAnchor="middle">( )</text>);
        if (c === 'o') els.push(<circle key={`o${l}${i}`} cx={x} cy={12} r={2.6} className="ks-open" />);
        if (c === 'X') els.push(<path key={`a${l}${i}`} d={`M${x - 4} ${down ? 74 : 14}l8 2.5-8 2.5`} className="ks-acc" />);
      });
    }
  }
  // graces (flam = one small head, drag = two) before snare hits
  for (const [k, g] of Object.entries(bar.grace ?? {})) {
    const x = xOf(Number(k));
    for (let j = 1; j <= g; j++) els.push(<ellipse key={`gr${k}${j}`} cx={x - 4 - j * 5} cy={42} rx={2.6} ry={2} className="ks-head" />);
    els.push(<path key={`gs${k}`} d={`M${x - 4 - g * 5 + 2} 42V30`} className="ks-stem thin" />);
  }
  // stems and beams per group
  for (const down of [false, true]) {
    const onsets: { i: number; ys: number[] }[] = [];
    for (let i = 0; i < bar.steps; i++) {
      const ys = voices(down).filter(([, pat]) => pat[i] && pat[i] !== '.').map(([l]) => POS[l].y);
      if (ys.length) onsets.push({ i, ys });
    }
    const tip = down ? 82 : 6;
    let g0 = 0;
    for (const g of bar.groups) {
      const inG = onsets.filter((o) => o.i >= g0 && o.i < g0 + g);
      inG.forEach((o, k) => {
        const x = xOf(o.i) + (down ? -4 : 4);
        const from = down ? Math.min(...o.ys) : Math.max(...o.ys);
        els.push(<path key={`st${down}${o.i}`} d={`M${x} ${from}V${tip}`} className="ks-stem" />);
        const next = inG[k + 1]?.i ?? g0 + g;
        const dur = next - o.i; // steps
        const sixteenth = bar.sub === 4 && dur === 1;
        if (inG.length === 1) {
          // a lone note: flags by its length (none for a beat or longer)
          const beats = dur / bar.sub;
          const flags = beats >= 1 ? 0 : sixteenth ? 2 : 1;
          for (let f = 0; f < flags; f++) els.push(<path key={`fl${down}${o.i}${f}`} d={down ? `M${x} ${tip - f * 5}q7 -4 6 -12` : `M${x} ${tip + f * 5}q7 4 6 12`} className="ks-stem" />);
          if (bar.sub === 2 && dur === 3) els.push(<circle key={`dot${down}${o.i}`} cx={xOf(o.i) + 8} cy={down ? 58 : 42} r={1.4} className="ks-dotm" />);
        } else if (sixteenth) {
          const nx = inG[k + 1] ? xOf(inG[k + 1].i) + (down ? -4 : 4) : x - 6;
          const y = down ? tip - 5 : tip + 5;
          els.push(<path key={`b2${down}${o.i}`} d={`M${x} ${y}H${inG[k + 1] ? nx : x - 6}`} className="ks-beam" />);
        }
      });
      if (inG.length >= 2) {
        const a = xOf(inG[0].i) + (down ? -4 : 4);
        const b = xOf(inG[inG.length - 1].i) + (down ? -4 : 4);
        els.push(<path key={`bm${down}${g0}`} d={`M${a} ${tip}H${b}`} className="ks-beam" />);
        if (bar.sub === 3 && !down && g === 3) els.push(<text key={`tr${g0}`} x={(a + b) / 2} y={tip - 0.5} className="ks-trip" textAnchor="middle">3</text>);
      }
      g0 += g;
    }
  }
  return (
    <svg className="ks" viewBox={`0 0 ${W} 88`} role="img" aria-label={label} direction="ltr">
      {[30, 38, 46, 54, 62].map((y) => (
        <path key={y} d={`M4 ${y}H${W - 4}`} className="ks-line" />
      ))}
      <path d={`M${W - 4} 30V62M4 30V62`} className="ks-line" />
      <text x={16} y={44} className="ks-sig" textAnchor="middle">{bar.num}</text>
      <text x={16} y={60} className="ks-sig" textAnchor="middle">{bar.den}</text>
      {els}
    </svg>
  );
}

