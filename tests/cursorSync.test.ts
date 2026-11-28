import { describe, expect, it } from 'vitest';
import { catalog, generate } from '../src/engine/drills/generate';
import { expTimeMs } from '../src/engine/drills/analyze';
import { clickPlan, hasTimeline, staffLines } from '../src/engine/drills/timeline';
import { subDrill } from '../src/engine/drills/stages';
import { cursorBeatAt, glidePos, nowX, shareToPx } from '../src/engine/playhead';
import { lineItems, longerThan8Bars } from '../src/engine/staffItems';
import type { Drill, ExpNote } from '../src/engine/drills/types';

// Owner 2026-11-28 (D major, 2 octaves, hands together, key session): "the cursor moved faster than the notes … it must
// ALWAYS be on the note that should be playing now." The cursor is a chain — the audio clock → the written beat
// (cursorBeatAt, the grader's expTimeMs) → the drawn item on its line (staffItems + glidePos) → the head's x on screen
// (nowX + shareToPx). Each link is checked here over a matrix of drills, tempos, feels, meters and click modes; the
// screen link (letterboxed SVG) is also checked in a real browser (e2e/playheadHeads.spec.ts).

const qOf = (d: Drill) => (d.pulse === 8 ? 0.5 : 1);
const firstOfChord = (ns: ExpNote[]) => ns.filter((n, i) => n.chordId === undefined || ns.findIndex((m) => m.chordId === n.chordId) === i);

/** DrillStaff's lines (two bars a line, or one: a phone / a dense bar / hands together on a phone), as the score splits them. */
function staffOf(d: Drill, oneBar: boolean) {
  const qk = qOf(d);
  const meter = (d.meter || 4) * qk;
  const per = meter * (meter >= 6 || oneBar ? 1 : 2);
  const sl = hasTimeline(d) ? staffLines(d, 8) : null;
  const lineAtQ = (q: number) => {
    if (!sl) return Math.floor(q / per + 1e-6);
    const i = sl.findIndex((l) => q < l.to - 1e-6);
    return i < 0 ? sl.length - 1 : i;
  };
  const bounds = (li: number) => (sl ? { from: sl[li].from, to: sl[li].to } : { from: li * per, to: li * per + per });
  const barEndFor = (li: number) => (q: number) => {
    if (!sl) return Math.ceil(q / meter - 1e-6) * meter;
    const b = sl[li].bars.find((x) => q < x.from + x.len - 1e-6) ?? sl[li].bars[sl[li].bars.length - 1];
    return b.from + b.len;
  };
  return { qk, meter, per, sl, lineAtQ, bounds, barEndFor };
}

type Case = { label: string; d: Drill; bpm: number; oneBar: boolean };

/** Assert the chain for one drill at one tempo; returns the worst miss (items, ms) for the report. */
function check(c: Case): { items: number; ms: number } {
  const { d, bpm } = c;
  const st = staffOf(d, c.oneBar);
  const fail = (what: string) => {
    throw new Error(`${c.label} @♩${bpm}${c.oneBar ? ' (one bar a line)' : ''}: ${what}`);
  };
  // every note is drawn (a note past bar 8 of an unpaged item would never have its head on screen)
  const hidden = d.notes.filter((n) => !(d.chart || d.paged || longerThan8Bars(d) || n.beat * st.qk < st.meter * 8));
  if (hidden.length) fail(`${hidden.length} notes past bar 8 are not drawn (not paged)`);
  // the click grid and the take's zero are on the same time map as the cursor (whatever clicks are silent)
  const plan = clickPlan(d, bpm);
  for (let b = 0; b < Math.ceil(d.beats); b++) {
    const t = plan.clicks[plan.countIn + b]?.t;
    if (t === undefined) fail(`no click for beat ${b}`);
    const dev = (t! - plan.responseAt) * 1000 - expTimeMs(d, b, bpm);
    if (Math.abs(dev) > 0.01) fail(`click ${b} is ${dev.toFixed(2)} ms off the beat the cursor and the grader use`);
  }
  let worst = { items: 0, ms: 0 };
  const onsets = [...new Set(d.notes.map((n) => Math.round(n.beat * 1e6) / 1e6))].sort((a, b) => a - b);
  for (const hand of ['R', 'L'] as const) {
    const ns = d.notes.filter((n) => n.hand === hand);
    if (!ns.length) continue;
    const all = firstOfChord(ns);
    const lines = new Map<number, ExpNote[]>();
    for (const n of all) {
      const li = st.lineAtQ(n.beat * st.qk);
      if (!lines.has(li)) lines.set(li, []);
      lines.get(li)!.push(n);
    }
    const built = new Map<number, ReturnType<typeof lineItems>['items']>();
    for (const [li, xs] of lines) {
      const { from, to } = st.bounds(li);
      built.set(li, lineItems({ xs, all, ns, lineStart: from, lineEnd: to, barEnd: st.barEndFor(li), qk: st.qk, shift: 0 }).items);
    }
    /** The cursor at `ms` after beat 0: the line it is on and its fractional item there (DrillStaff's now-cue). */
    const at = (ms: number) => {
      const cur = cursorBeatAt(d, bpm, ms) * st.qk;
      const li = st.lineAtQ(cur);
      const items = built.get(li);
      const { from, to } = st.bounds(li);
      if (!items || !(cur >= from - 0.03 && cur < to - 0.03)) return { li, now: -1, items: items ?? [] };
      return { li, now: glidePos(items.map((x) => x.at), to, cur, 0), items };
    };
    const itemOf = (li: number, n: ExpNote) => built.get(li)!.findIndex((x) => x.n === n || (x.n?.chordId !== undefined && x.n.chordId === n.chordId));
    for (const n of all) {
      const li = st.lineAtQ(n.beat * st.qk);
      const k = itemOf(li, n);
      if (k < 0) fail(`note at beat ${n.beat} has no drawn item`);
      // at the moment the note sounds, the cursor stands on its head
      const due = expTimeMs(d, n.beat, bpm);
      const p = at(due);
      if (p.li !== li) fail(`at beat ${n.beat} the cursor is on line ${p.li}, the note on line ${li}`);
      const miss = Math.abs(p.now - k);
      worst = { items: Math.max(worst.items, miss), ms: worst.ms };
      if (miss > 1e-4) fail(`at beat ${n.beat} (${hand}) the cursor is on item ${p.now.toFixed(3)}, the note is item ${k}`);
      // half-way to the next onset (if this staff plays it, on the same line): half-way between the two heads
      const oi = onsets.findIndex((w) => Math.abs(w - n.beat) < 1e-6);
      const w2 = onsets[oi + 1];
      if (w2 === undefined) continue;
      const n2 = all.find((m) => Math.abs(m.beat - w2) < 1e-6);
      if (!n2 || st.lineAtQ(n2.beat * st.qk) !== li) continue;
      const k2 = itemOf(li, n2);
      const t2 = expTimeMs(d, w2, bpm);
      for (const u of [0.25, 0.5, 0.75]) {
        const q = at(due + u * (t2 - due));
        if (!(q.now >= k - 1e-9 && q.now <= k2 + 1e-9)) fail(`between beats ${n.beat} and ${w2} the cursor left the two heads (item ${q.now.toFixed(3)}, heads ${k}–${k2})`);
        if (k2 === k + 1) {
          // a straight glide from head to head in the notes' own time: the item fraction is the time fraction
          const off = Math.abs(q.now - k - u) * (t2 - due);
          worst = { items: worst.items, ms: Math.max(worst.ms, off) };
          if (off > 1) fail(`between beats ${n.beat} and ${w2} the cursor is ${off.toFixed(1)} ms off a straight glide`);
        }
      }
    }
  }
  return worst;
}

// ── the matrix ──────────────────────────────────────────────────────────────────────────────────────────────────────

const fams = catalog().filter((f) => f.id === 'scales' || f.id === 'arpeggios');
const TEMPOS = [40, 58, 83, 96, 118, 134, 160, 200];
const PERS = [1, 2, 3, 4];
type Feel = 'straight' | 'swing' | 'shuffle' | 'odd5' | 'odd7' | 'pulse8' | 'meters' | 'tempoMap';
const FEELS: Feel[] = ['straight', 'swing', 'shuffle', 'odd5', 'odd7', 'pulse8', 'meters', 'tempoMap'];
const CLICKS: Drill['click'][] = [undefined, '13', '24', 'one', 'and', 'fade', 'gap'];

function withFeel(d: Drill, f: Feel): Drill {
  // swing is a feel of 8ths: on a triplet grid a swung "and" (2/3) would land on the triplet's own note
  if ((f === 'swing' || f === 'shuffle') && d.notes.some((n) => Math.abs(n.beat * 2 - Math.round(n.beat * 2)) > 1e-6 && Math.abs(n.beat * 4 - Math.round(n.beat * 4)) > 1e-6)) return d;
  switch (f) {
    case 'straight':
      return d;
    case 'swing':
      return { ...d, spec: { ...d.spec, swing: true } };
    // a shuffle: swung 8ths over a triplet grid's long-short (the swung off-beat at 2/3) with the click on 2 and 4
    case 'shuffle':
      return { ...d, spec: { ...d.spec, swing: true }, click: '24' };
    case 'odd5':
      return { ...d, meter: 5 };
    case 'odd7':
      return { ...d, meter: 7 };
    // an eighth-note meter (7/8): the beat is the eighth, drawn at half a quarter
    case 'pulse8':
      return { ...d, meter: 7, pulse: 8 };
    // mixed meters (the prog timeline): 4/4, then 7/8 from bar 2, 3/4 from bar 4
    case 'meters':
      return { ...d, meters: [{ bar: 1, meter: { num: 7, den: 8 } }, { bar: 3, meter: { num: 3, den: 4 } }] };
    // a tempo map: half as fast again from bar 2 (metric modulation)
    case 'tempoMap':
      return { ...d, tempoMap: [{ bar: 1, ratio: 1.5 }] };
  }
}

/** Deterministic sampling over the matrix: every family level × spec, keys spread over all 12, every hand / octave / note value / feel / tempo / click mode reached. */
function cases(): Case[] {
  const out: Case[] = [];
  let s = 0;
  for (const f of fams)
    for (const l of f.levels)
      for (const tpl of l.specs)
        for (const hands of ['R', 'L', 'RL'] as const)
          for (const octaves of [1, 2] as const) {
            s++;
            const key = (s * 5) % 12;
            let d0: Drill;
            try {
              d0 = generate({ ...tpl, key, hands: tpl.hands === 'RL' || tpl.motion ? tpl.hands : hands, octaves: tpl.octaves && tpl.octaves > 2 ? tpl.octaves : octaves, tempo: 80 });
            } catch {
              continue;
            }
            if (!d0.notes.length) continue;
            const per = PERS[s % PERS.length];
            const feel = FEELS[(s * 3) % FEELS.length];
            const d = { ...withFeel(subDrill(d0, per), feel), click: CLICKS[s % CLICKS.length] ?? withFeel(d0, feel).click };
            // three tempos a drill, spread over ♩40–200
            for (const j of [0, 3, 5]) out.push({ label: `${l.id} ${d0.itemId} ×${per}/beat ${feel} click:${d.click ?? 'all'}`, d, bpm: TEMPOS[(s * 7 + j) % TEMPOS.length], oneBar: (s + j) % 2 === 0 });
          }
  return out;
}

describe('the cursor is on the note due now (owner 2026-11-28)', () => {
  it('the owner case: D major, 2 octaves, hands together, every note value of the key session, ♩40–200', () => {
    const d0 = generate({ family: 'scales', kind: 'scale', key: 2, hands: 'RL', octaves: 2, tempo: 80 });
    expect(d0.notes.some((n) => n.hand === 'L') && d0.notes.some((n) => n.hand === 'R')).toBe(true);
    for (const per of PERS)
      for (const bpm of [40, 60, 83, 96, 104, 112, 118, 126, 134, 160, 200])
        for (const oneBar of [false, true])
          for (const feel of ['straight', 'swing'] as const) {
            const w = check({ label: `D major HT 2 oct ×${per}/beat ${feel}`, d: withFeel(subDrill(d0, per), feel), bpm, oneBar });
            expect(w.items).toBeLessThan(1e-4);
            expect(w.ms).toBeLessThan(1);
          }
  });

  it('a key-session note value change keeps every onset on the beat grid (triplets → quarters: beat 28, not 28.0028)', () => {
    const l = fams.find((f) => f.id === 'scales')!.levels.flatMap((x) => x.specs).find((s) => s.perBeat === 3)!;
    const d = generate({ ...l, key: 8, hands: 'RL', octaves: 2, tempo: 60 });
    for (const per of [1, 2, 4]) {
      const k = 3 / per;
      const sd = subDrill(d, per);
      sd.notes.forEach((n, i) => expect(n.beat).toBeCloseTo(d.notes[i].beat * k, 9));
    }
    // (the generator writes beats to 6 places: 0.333333)
    expect(Math.max(...subDrill(d, 1).notes.map((n) => Math.abs(n.beat - Math.round(n.beat))))).toBeLessThan(1e-5);
  });

  it('every scale / arpeggio family sample: keys, hands, octaves, note values, feels, meters, tempo maps, click modes', () => {
    const cs = cases();
    expect(cs.length).toBeGreaterThan(3000);
    const seen = { feels: new Set<string>(), pers: new Set<number>(), keys: new Set<number>(), hands: new Set<string>() };
    for (const c of cs) {
      check(c);
      seen.keys.add(c.d.spec.key);
      seen.hands.add(c.d.spec.hands ?? 'R');
      seen.pers.add(c.d.spec.perBeat ?? 2);
      seen.feels.add(c.label.split(' ')[3]);
    }
    expect(seen.keys.size).toBe(12);
    expect([...seen.hands].sort()).toEqual(['L', 'R', 'RL']);
    expect(seen.feels.size).toBe(FEELS.length);
    expect(seen.pers.size).toBeGreaterThanOrEqual(4);
  });
});

describe('the cursor on screen sits on the drawn head, whatever the CSS does to the SVG', () => {
  // the staff of the owner's case on a wide screen: drawn 818 × 120, shown 1000 px wide but capped at 104 px high
  // (`max-height`): the browser keeps the aspect and centres the music (preserveAspectRatio meet)
  const W = 818;
  const H = 120;
  const box = { left: 200, width: 1000, height: 104 };
  const k = Math.min(box.width / W, box.height / H);
  const frame = { vb: { x: 0, y: 0, width: W, height: H }, ctm: { a: k, b: 0, c: 0, d: k, e: box.left + (box.width - W * k) / 2, f: 0 } };
  const heads = [120, 200, 280, 360, 440, 520, 600, 680].map((x) => x / W);
  it('maps a head share to the head drawn on screen (the letterbox counted)', () => {
    for (const h of heads) expect(shareToPx(h, frame, box.left)).toBeCloseTo(frame.ctm.e - box.left + h * W * k, 6);
  });
  it('the old share-of-the-box placement was off by tens of px at the ends (the reported drift)', () => {
    const oldPx = (x: number) => x * box.width;
    expect(Math.abs(oldPx(heads[0]) - shareToPx(heads[0], frame, box.left))).toBeGreaterThan(40);
    expect(Math.abs(oldPx(heads[7]) - shareToPx(heads[7], frame, box.left))).toBeGreaterThan(40);
  });
  it('the cursor between two heads is between them on screen, in proportion', () => {
    const xs = [...heads, 0.95];
    for (let i = 0; i < heads.length - 1; i++)
      for (const f of [0, 0.3, 0.5, 1]) {
        const px = shareToPx(nowX(xs, i + f)!, frame, box.left);
        const a = shareToPx(xs[i], frame, box.left);
        const b = shareToPx(xs[i + 1], frame, box.left);
        expect(px).toBeCloseTo(a + f * (b - a), 6);
      }
  });
  it('an unscaled SVG (no letterbox) is the plain share of its width', () => {
    const f1 = { vb: { x: 0, y: 0, width: 500, height: 120 }, ctm: { a: 1, b: 0, c: 0, d: 1, e: 30, f: 0 } };
    expect(shareToPx(0.5, f1, 10)).toBeCloseTo(270, 6);
  });
});
