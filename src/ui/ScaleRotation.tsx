// Improvise › Scales (BUILD-PLAN-2026-11 phase 5; docs/SPEC-RBI-ROTATION.md, track A at T1–3): the lead sheet in colour
// with the rotating scale over every chord, the half-bar subs a tier opens, the "next" chip, a count-in + click + the
// now-cue on the sheet, and after the take the colour coverage per chord. One phone screen; the keyboard is behind a
// button. The Barry Harris track is a separate thing (phase 8) and is not mixed in here.
import { useEffect, useMemo, useRef, useState } from 'react';
import { chartBacking, IMPROV_LEVELS, parseChart, transposeChart, type ChartStyle } from '../engine/charts';
import { STANDARD_CHANGES } from '../engine/standards';
import { buildRotationSheet, cellAt, cellNotes, FAM_NAME, FAM_TAG, gradeRotation, improvTake, nextCell, nextChange, rotationMeter, scaleShort, type ImprovTake, type RotationGrade, type RotationSheet, type SheetCell } from '../engine/rotationSheet';
import type { ModeStats, PlayedNote } from '../engine/rotation';
import type { NoteEvent } from '../engine/lesson';
import { bassTuningOf, courseInstrumentOf, type Settings } from '../storage/progress';
import { tuningById, type Tuning } from '../engine/fretboard';
import { neckPath, neckShapesFor, type NeckShape } from '../engine/rotationNeck';
import { RotationNeck } from './RotationNeck';
import type { MyChart } from './Charts';
import { midi } from '../speech/midi';
import { piano } from './services';
import { Icon } from './icons';
import { BeatDots } from './NewGameBits';
import { kName } from './encore/bits';
import '../newgames.css';
import '../rotation.css';

type Lang = 'en' | 'he';
/** The charts the rotation runs on (the improvisation levels in one key, moved to the key of the day). */
export const ROTATION_LEVELS = [4, 5, 6];

const TX = {
  en: { key: 'Key', tier: 'Tier', chart: 'Chart', next: 'Next', newScale: 'new scale', start: 'Start', stop: 'Stop', tempo: 'Tempo', keys: 'Keyboard', neck: 'Neck', inSet: 'in the scale', colour: 'colour coverage', strong: 'chord tones on 1 and 3', avoid: 'avoid notes held', chorus: 'Chorus', standards: 'Standards', levels: 'Progressions', none: 'Play a few notes over the chords to see the coverage.', plain: 'This time the plain scales: no colour notes to cover. The next take rotates in new ones.', colourWhy: 'A colour note is what the scale adds over the chord’s plain scale.', sameNotes: 'same notes as', otherBass: 'over a different bass', inBars: (n: number) => (n === 1 ? 'in 1 bar' : `in ${n} bars`), resolution: 'resolved by step into the new chord' },
  he: { key: 'סולם', tier: 'שלב', chart: 'מהלך', next: 'הבא', newScale: 'סולם חדש', start: 'להתחיל', stop: 'עצירה', tempo: 'טמפו', keys: 'מקלדת', neck: 'צוואר', inSet: 'בתוך הסולם', colour: 'כיסוי צבע', strong: 'צלילי אקורד ב־1 וב־3', avoid: 'צלילי הימנעות שהוחזקו', chorus: 'כורוס', standards: 'סטנדרטים', levels: 'מהלכים', none: 'נגנו כמה צלילים מעל האקורדים כדי לראות את הכיסוי.', plain: 'הפעם הסולמות הרגילים: אין צלילי צבע לכסות. בטייק הבא ייכנסו סולמות חדשים.', colourWhy: 'צליל צבע הוא מה שהסולם מוסיף על הסולם הרגיל של האקורד.', sameNotes: 'אותם צלילים כמו', otherBass: 'מעל בס אחר', inBars: (n: number) => (n === 1 ? 'בעוד תיבה' : `בעוד ${n} תיבות`), resolution: 'נפתרו בצעד אל האקורד החדש' },
};

/** A scale label: the family colour + its short tag, then the scale's root and name (note names isolated LTR). */
export function ScaleTag({ c, lang, full = true }: { c: Pick<SheetCell, 'fam' | 'mode' | 'rootName'>; lang: Lang; full?: boolean }) {
  return (
    <span className={`rs-scale fam-${c.fam}`} data-fam={c.fam} data-mode={c.mode}>
      <span className="rs-tag" title={FAM_NAME[c.fam][lang]}>
        {FAM_TAG[c.fam][lang]}
      </span>
      {full && (
        <span className="rs-name">
          <bdi dir="ltr">{c.rootName}</bdi> {scaleShort(c.mode, lang)}
        </span>
      )}
    </span>
  );
}

/** The lead sheet: 8 bars of one chorus (2 rows of 4), the chord large, the scale small above it, a sub above that. */
export function LeadSheet({ sheet, chorus, now, hits, lang, hidden = false }: { sheet: RotationSheet; chorus: number; now: number; hits?: (boolean | null)[]; lang: Lang; /** SPEC-EAR-AND-READING §3.4: from memory — the bars and the now-cue stay, the chords and scales are hidden. */ hidden?: boolean }) {
  const cur = now >= 0 ? sheet.cells[now] : null;
  const page = Math.floor((cur && cur.chorus === chorus ? cur.bar : 0) / 8);
  const bars = Array.from({ length: Math.min(8, sheet.bars - page * 8) }, (_, i) => page * 8 + i);
  return (
    <div className={`rs-sheet${hidden ? ' hidden-sheet' : ''}`} dir="ltr" role="table" aria-label={lang === 'he' ? 'דף אקורדים' : 'Lead sheet'} data-rs-sheet={chorus} data-rs-hidden={hidden ? '1' : undefined}>
      {bars.map((b) => (
        <div className="rs-bar" role="row" key={b} data-rs-bar={b}>
          {sheet.cells.map((c, i) =>
            c.chorus === chorus && c.bar === b ? (
              <div key={i} role="cell" className={`rs-cell ${hidden ? 'fam-none' : `fam-${c.fam}`}${i === now ? ' now' : ''}${hits?.[i] === true ? ' hit' : hits?.[i] === false ? ' miss' : ''}`} style={{ flexGrow: c.beats }} data-rs-cell={i} data-now={i === now ? '1' : undefined}>
                {hidden ? (
                  <b className="rs-sym" aria-label={lang === 'he' ? 'מהזיכרון' : 'from memory'}>
                    {'·'}
                  </b>
                ) : c.sub ? (
                  <small className="rs-sub" title={c.same ? `${c.sub.label[lang]} · ${TX[lang].sameNotes} ${c.same.rootName} ${scaleShort(c.same.mode, lang)}` : c.sub.label[lang]}>
                    <bdi dir="ltr">{c.sub.sym}</bdi>
                  </small>
                ) : (
                  <small className="rs-sub" aria-hidden="true">
                    {' '}
                  </small>
                )}
                {!hidden && (
                  <b className="rs-sym">
                    <bdi dir="ltr">{c.sym}</bdi>
                  </b>
                )}
                {!hidden && <ScaleTag c={c} lang={lang} />}
                {hits?.[i] != null && (
                  <span className="rs-hit" aria-label={hits[i] ? (lang === 'he' ? 'צליל צבע' : 'colour note') : lang === 'he' ? 'בלי צליל צבע' : 'no colour note'}>
                    <Icon k={hits[i] ? 'check' : 'minus'} size={12} />
                  </span>
                )}
              </div>
            ) : null,
          )}
        </div>
      ))}
    </div>
  );
}

/** One line of the chords with their scales (Phrase / Trade: the scales the take is graded against). */
export function ScaleStrip({ sheet, lang }: { sheet: RotationSheet; lang: Lang }) {
  const seen = new Set<string>();
  return (
    <div className="rs-strip" dir="ltr" data-rs-strip="1">
      {sheet.cells
        .filter((c) => c.chorus === 0)
        .filter((c) => {
          const k = `${c.sub?.sym ?? c.sym}|${c.mode}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .map((c, i) => (
          <span key={i} className={`rs-chip fam-${c.fam}`}>
            <bdi dir="ltr">{c.sub?.sym ?? c.sym}</bdi>
            <ScaleTag c={c} lang={lang} />
          </span>
        ))}
    </div>
  );
}

/** The grade of a take in four numbers (colour coverage first: the metric the rotation tests). */
export function RotationStats({ g, lang, tier = 1 }: { g: RotationGrade; lang: Lang; /** The resolution metric counts from T3 (SPEC-RBI-ROTATION §5). */ tier?: number }) {
  const tx = TX[lang];
  return (
    <ul className="is-stats rs-stats" data-rs-result="1">
      <li data-rs-colour={Math.round(g.m.colour * 100)}>
        <b>
          <bdi dir="ltr">{Math.round(g.m.colour * 100)}%</bdi>
        </b>{' '}
        <small>{tx.colour}</small>
      </li>
      <li>
        <b>
          <bdi dir="ltr">{Math.round(g.m.inSet * 100)}%</bdi>
        </b>{' '}
        <small>{tx.inSet}</small>
      </li>
      <li>
        <b>
          <bdi dir="ltr">{Math.round(g.m.strongCt * 100)}%</bdi>
        </b>{' '}
        <small>{tx.strong}</small>
      </li>
      <li>
        <b>
          <bdi dir="ltr">{g.m.avoidFaults}</bdi>
        </b>{' '}
        <small>{tx.avoid}</small>
      </li>
      {tier >= 3 && g.m.changes > 0 && (
        <li data-rs-resolution={Math.round(g.m.resolution * 100)}>
          <b>
            <bdi dir="ltr">{Math.round(g.m.resolution * 100)}%</bdi>
          </b>{' '}
          <small>{tx.resolution}</small>
        </li>
      )}
    </ul>
  );
}

/** Two octaves from C4, the active scale marked (in the scale: a dot; colour notes: the family colour; avoid notes:
 *  outlined). */
function MarkedKeys({ onKey, pcs, colour, avoid, fam }: { onKey: (m: number) => void; pcs: number[]; colour: number[]; avoid: number[]; fam: string }) {
  const keys = Array.from({ length: 25 }, (_, i) => 60 + i);
  const black = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  return (
    <div className="is-keys rs-keys" dir="ltr">
      {keys.map((m) => {
        const pc = m % 12;
        const mark = colour.includes(pc) ? 'colour' : pcs.includes(pc) ? 'in' : '';
        return <button key={m} className={`is-key ${black(m) ? 'b' : 'w'} ${mark ? `rs-${mark} fam-${fam}` : ''}${avoid.includes(pc) ? ' rs-avoid' : ''}`} onPointerDown={() => onKey(m)} aria-label={String(m)} />;
      })}
    </div>
  );
}

/** The neck the rotation draws for a guitar or bass player (their tuning; an old bass id in the guitar key falls back
 *  to standard), null for everyone else (the keyboard). */
export function rotationNeckTuning(s: Pick<Settings, 'instrument' | 'activeCourse' | 'tuning' | 'bassTuning'>): Tuning | null {
  const inst = courseInstrumentOf(s);
  if (inst === 'bass') return tuningById(bassTuningOf(s) ?? 'bass');
  if (inst !== 'guitar') return null;
  const t = tuningById(s.tuning);
  return t.instrument === 'guitar' ? t : tuningById('standard');
}

/** The "same notes as G altered" note shows only the first time the sub comes up on this device (SPEC-RBI-ROTATION §2). */
const SAME_SEEN = 'toneturn.rotation.sameNotesSeen';
export function sameNoteSeen(): boolean {
  try {
    return localStorage.getItem(SAME_SEEN) === '1';
  } catch {
    return false;
  }
}
export function markSameNoteSeen(): void {
  try {
    localStorage.setItem(SAME_SEEN, '1');
  } catch {
    /* storage blocked: the note may show again */
  }
}

export interface RotationChart {
  id: string;
  title: string;
  text: string;
  style: ChartStyle;
  bpm: number;
}

/** The charts on offer: a piece's chart (from Repertoire), the progressions in the key of the day, the standards. */
export function rotationCharts(lang: Lang, dayKey: number, piece?: MyChart | null): { group: 'piece' | 'levels' | 'standards'; c: RotationChart }[] {
  const out: { group: 'piece' | 'levels' | 'standards'; c: RotationChart }[] = [];
  if (piece) out.push({ group: 'piece', c: { id: 'piece:', title: piece.title, text: piece.text, style: piece.style, bpm: piece.bpm } });
  for (const n of ROTATION_LEVELS) {
    const L = IMPROV_LEVELS.find((x) => x.n === n);
    if (L) out.push({ group: 'levels', c: { id: `lv:${n}`, title: `${L.title[lang].replace(/ (in C|בדו)$/, '')} · ${kName(dayKey)}`, text: dayKey ? transposeChart(L.text, dayKey) : L.text, style: L.style, bpm: L.bpm } });
  }
  for (const s of STANDARD_CHANGES) out.push({ group: 'standards', c: { id: `std:${s.id}`, title: `${s.name} — ${s.part[lang]}`, text: s.text, style: s.style, bpm: s.bpm } });
  return out;
}

export function ScaleRotation({ settings, lang, tier, dayKey, piece, onTier, onTake, top }: { settings: Settings; lang: Lang; tier: 1 | 2 | 3; /** The key of the day (the key session's key of the week). */ dayKey: number; piece?: MyChart | null; onTier?: (t: 1 | 2 | 3) => void; /** Every take; `played` = the take's notes (beats from the chart's first beat) and its chart, for the lick detection at the take boundary (SPEC-LICKS-IN-IMPROV §3). */ onTake?: (t: ImprovTake & { inSet?: number }, played?: { notes: PlayedNote[]; chart: string; bars: number; bpm: number; /** Played with the lead sheet hidden (the "from memory" channel). */ memory?: boolean }) => void; /** Above the sheet (the workout's "today's lick" card). */ top?: React.ReactNode }) {
  const tx = TX[lang];
  const charts = useMemo(() => rotationCharts(lang, dayKey, piece), [lang, dayKey, piece]);
  const [src, setSrc] = useState(charts[0]?.c.id ?? 'lv:4');
  const chart = (charts.find((x) => x.c.id === src) ?? charts[0]).c;
  const [bpm, setBpm] = useState(Math.min(chart.bpm, tier === 1 ? 92 : tier === 2 ? 104 : 116));
  const stats: ModeStats = settings.rotationStats ?? {};
  // a waltz is laid out in 3/4 (the backing plays it in 3)
  const build = (seed: number) => buildRotationSheet(chart.text, { tier, stats, seed, meter: rotationMeter(chart.style) });
  // the sheet stays as played until the next take (its colour marks belong to it); the next take picks again by need
  // (a new seed, and the stats the last take moved)
  const [sheet, setSheet] = useState<RotationSheet | null>(() => build(1));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    setSheet(build(1));
    setGrade(null);
    setChorus(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.text, tier]);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState<number | null>(null);
  const [grade, setGrade] = useState<RotationGrade | null>(null);
  const [chorus, setChorus] = useState(0);
  // guitar and bass: the scale on the neck in the current position, shown from the start (SPEC-RBI-ROTATION §4)
  const neckTuning = useMemo(() => rotationNeckTuning(settings), [settings]);
  // the layout: the player's pick (kept on this device), else by screen width (a wide screen shows the whole neck)
  const wide = useWide();
  const [picked, setPicked] = useState<NeckShape | null>(readNeckShape);
  const shapes = neckTuning ? neckShapesFor(neckTuning) : [];
  const shape: NeckShape = picked && shapes.includes(picked) ? picked : wide ? 'full' : 'box';
  const pickShape = (s: NeckShape) => {
    setPicked(s);
    try {
      localStorage.setItem(NECK_SHAPE_KEY, s);
    } catch {
      /* private mode: the pick lasts this visit */
    }
  };
  const path = useMemo(() => (neckTuning && sheet ? neckPath(neckTuning, sheet, shape) : null), [neckTuning, sheet, shape]);
  const [showKeys, setShowKeys] = useState(midi.devices.length === 0 || !!neckTuning);
  // SPEC-EAR-AND-READING §3.4: the lead sheet off once the progression is known (memory); hidden while playing only
  const [memory, setMemory] = useState(false);
  // the tritone sub's "same notes" note: until it has been shown once in a take on this device
  const [sameSeen, setSameSeen] = useState(sameNoteSeen);
  const sameShown = useRef(false);
  const ctl = useRef<AbortController | null>(null);
  const t0 = useRef(0);
  const notes = useRef<PlayedNote[]>([]);
  const open = useRef(new Map<number, number>());
  const raf = useRef(0);
  const beatS = 60 / bpm;
  useEffect(
    () => () => {
      ctl.current?.abort();
      cancelAnimationFrame(raf.current);
    },
    [],
  );
  const noteOn = (m: number, at = performance.now()) => {
    if (!t0.current) return;
    const b = (at - t0.current) / 1000 / beatS;
    open.current.set(m, b);
    notes.current.push({ beat: b, dur: 0.25, midi: m });
  };
  const noteOff = (m: number, at = performance.now()) => {
    const b = open.current.get(m);
    if (b === undefined) return;
    open.current.delete(m);
    const n = [...notes.current].reverse().find((x) => x.midi === m && x.beat === b);
    if (n) n.dur = Math.max(0.05, (at - t0.current) / 1000 / beatS - b);
  };
  useEffect(() => midi.onNote((m, on, at) => (on ? noteOn(m, at) : noteOff(m, at))));
  const onScreenKey = (m: number) => {
    noteOn(m);
    if (settings.midiSound !== false) void piano.unlock().then(() => piano.play([{ midi: m, start: 0, duration: 0.35, velocity: 0.7 }], 0.4, new AbortController().signal).catch(() => {}));
    setTimeout(() => noteOff(m), 250);
  };

  const sheet0 = sheet;
  const start = async () => {
    const sheet = grade ? build((Date.now() >>> 10) % 9973 || 1) : sheet0;
    if (!sheet) return;
    if (grade) setSheet(sheet);
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setGrade(null);
    setChorus(0);
    setRunning(true);
    const p = parseChart(chart.text, sheet.meter);
    const b = chartBacking(p, chart.style, bpm, sheet.choruses, sheet.meter);
    // the click on every beat of the take, under the band (the count-in comes from the backing)
    const total = sheet.bars * sheet.meter * sheet.choruses;
    const clicks: NoteEvent[] = Array.from({ length: total }, (_, k) => ({ midi: 96, start: (b.startBeat + k) * beatS, duration: 0.04, velocity: k % sheet.meter ? 0.16 : 0.26, perc: (k % sheet.meter ? 'click' : 'accent') as 'click' | 'accent' }));
    await piano.unlock();
    notes.current = [];
    open.current.clear();
    t0.current = performance.now() + 60 + b.startBeat * beatS * 1000;
    const tick = () => {
      const now = (performance.now() - t0.current) / 1000 / beatS;
      setBeat(now);
      const k = cellAt(sheet, now);
      if (k >= 0) setChorus(sheet.cells[k].chorus);
      if (!c.signal.aborted) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    await piano.play([...b.events, ...clicks], b.length, c.signal).catch(() => {});
    cancelAnimationFrame(raf.current);
    if (sameShown.current) {
      markSameNoteSeen();
      setSameSeen(true);
    }
    const done = !c.signal.aborted;
    c.abort();
    setRunning(false);
    setBeat(null);
    t0.current = 0;
    if (!done) return;
    const g = gradeRotation(sheet, notes.current, stats, new Date().toISOString());
    setGrade(g);
    setChorus(0);
    // SPEC-PROGRESS-CHARTS §1: the take's in-scale share feeds the snapshot's in-scale rate
    onTake?.({ ...improvTake('rotation', { score: g.score, notes: notes.current.length, tier, bpm, stats: g.stats }), ...(notes.current.length ? { inSet: g.m.inSet } : {}) }, { notes: [...notes.current], chart: chart.text, bars: sheet.bars * sheet.choruses, bpm, memory });
  };
  const stop = () => {
    ctl.current?.abort();
    setRunning(false);
    setBeat(null);
  };

  if (!sheet) return null;
  const now = beat === null ? -1 : cellAt(sheet, beat);
  const nx = nextCell(sheet, beat ?? -1);
  // a new scale is announced 2 bars ahead at T1–2 and 1 bar ahead at T3 (SPEC-RBI-ROTATION §3); otherwise the chip
  // names the next chord
  const ch = beat === null ? null : nextChange(sheet, beat);
  const chip = ch ? { cell: ch.cell, changed: true, bars: ch.bars } : nx ? { cell: nx.cell, changed: nx.changed, bars: 0 } : null;
  const shown = now >= 0 ? sheet.cells[now] : nx?.cell ?? sheet.cells[0];
  // the tritone sub's note, the first time one comes up in the sheet (now or next): same notes as the V's altered
  const firstSame = sheet.cells.find((c) => c.same);
  const sameCell = !sameSeen && firstSame && beat !== null && (shown === firstSame || chip?.cell === firstSame) ? firstSame : null;
  if (sameCell) sameShown.current = true;
  const marks = cellNotes(shown, sheet);
  const box = path?.[sheet.cells.indexOf(shown)] ?? null;
  const nextBox = path && ch ? path[sheet.cells.indexOf(ch.cell)] ?? null : null;
  const fams = [...new Set(sheet.cells.map((c) => c.fam))];
  // the count-in is one bar of the meter (3 beats in a waltz), as the backing counts it
  const countNow = beat === null ? -1 : beat < 0 ? Math.max(0, Math.min(sheet.meter - 1, Math.floor(beat + sheet.meter))) : sheet.meter + (Math.floor(beat) % sheet.meter);
  return (
    <section className="rot" data-rs="1" data-rs-tier={tier}>
      <div className="rs-top">
        <span className="rs-key" data-rs-key={dayKey}>
          {tx.key} <bdi dir="ltr">{kName(sheet.tonic, sheet.minor)}</bdi>
        </span>
        <div className="seg rs-tiers" role="radiogroup" aria-label={tx.tier}>
          {([1, 2, 3] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tier === t} className={tier === t ? 'on' : ''} onClick={() => onTier?.(t)} disabled={running} aria-label={`${tx.tier} ${t}`} data-rs-tier-pick={t}>
              <bdi dir="ltr">T{t}</bdi>
            </button>
          ))}
        </div>
        <select className="rs-src" value={src} onChange={(e) => (setSrc(e.target.value), setGrade(null))} disabled={running} aria-label={tx.chart} data-rs-src="1">
          {charts.some((x) => x.group === 'piece') && <option value="piece:">{charts[0].c.title}</option>}
          <optgroup label={tx.levels}>
            {charts
              .filter((x) => x.group === 'levels')
              .map((x) => (
                <option key={x.c.id} value={x.c.id}>
                  {x.c.title}
                </option>
              ))}
          </optgroup>
          <optgroup label={tx.standards}>
            {charts
              .filter((x) => x.group === 'standards')
              .map((x) => (
                <option key={x.c.id} value={x.c.id}>
                  {x.c.title}
                </option>
              ))}
          </optgroup>
        </select>
      </div>
      {top}
      <LeadSheet sheet={sheet} chorus={chorus} now={now} hits={grade?.hits} lang={lang} hidden={memory && running} />
      <div className="rs-under">
        {chip ? (
          <span className={`rs-next${chip.changed ? ' changed' : ''}`} data-rs-next={chip.cell.mode} data-rs-next-bars={chip.bars || undefined} aria-live="polite">
            <small>{tx.next}</small> <bdi dir="ltr">{chip.cell.sub?.sym ?? chip.cell.sym}</bdi> <ScaleTag c={chip.cell} lang={lang} />
            {chip.changed && (
              <em className="rs-new">
                {tx.newScale}
                {chip.bars > 0 && ` · ${tx.inBars(chip.bars)}`}
              </em>
            )}
          </span>
        ) : (
          <span />
        )}
        {sameCell?.same ? (
          <small className="rs-same" data-rs-same={sameCell.same.mode}>
            <bdi dir="ltr">{sameCell.sub?.sym}</bdi>: {tx.sameNotes} <bdi dir="ltr">{sameCell.same.rootName}</bdi> {scaleShort(sameCell.same.mode, lang)}, {tx.otherBass}
          </small>
        ) : sheet.choruses > 1 && !running && (
          <div className="seg rs-chorus" role="tablist" aria-label={tx.chorus}>
            {Array.from({ length: sheet.choruses }, (_, k) => (
              <button key={k} role="tab" aria-selected={chorus === k} className={chorus === k ? 'on' : ''} onClick={() => setChorus(k)} aria-label={`${tx.chorus} ${k + 1}`}>
                <bdi dir="ltr">{k + 1}</bdi>
              </button>
            ))}
          </div>
        )}
      </div>
      {running ? <BeatDots countIn={sheet.meter} beats={sheet.meter} meter={sheet.meter} now={countNow} /> : (
        <p className="rs-legend" aria-label={lang === 'he' ? 'משפחות הסולמות' : 'Scale families'}>
          {fams.map((f) => (
            <span key={f} className={`rs-scale fam-${f}`}>
              <span className="rs-tag">{FAM_TAG[f][lang]}</span> <small>{FAM_NAME[f][lang]}</small>
            </span>
          ))}
        </p>
      )}
      {grade && (grade.m.colourSpans ? <RotationStats g={grade} lang={lang} tier={tier} /> : <p className="field-hint" data-rs-plain={grade.m.inSet > 0 ? '1' : undefined}>{grade.m.inSet > 0 ? tx.plain : tx.none}</p>)}
      <div className="rs-controls">
        <div className="ch-step" dir="ltr">
          <small>{tx.tempo}</small>
          <button className="icon-btn" onClick={() => setBpm((x) => Math.max(50, x - 6))} disabled={running} aria-label="−">
            <Icon k="minus" />
          </button>
          <b>{bpm}</b>
          <button className="icon-btn" onClick={() => setBpm((x) => Math.min(220, x + 6))} disabled={running} aria-label="+">
            <Icon k="plus" />
          </button>
        </div>
        <button className={`chip rs-keys-btn${showKeys ? ' on' : ''}`} onClick={() => setShowKeys((v) => !v)} aria-pressed={showKeys} data-rs-keys="1">
          {neckTuning ? tx.neck : tx.keys}
        </button>
        <button className={`chip rs-memory-btn${memory ? ' on' : ''}`} onClick={() => setMemory((v) => !v)} aria-pressed={memory} disabled={running} data-rs-memory="1">
          {lang === 'he' ? 'מהזיכרון' : 'From memory'}
        </button>
        {running ? (
          <button className="btn primary" onClick={stop}>
            <Icon k="stop" /> {tx.stop}
          </button>
        ) : (
          <button className="btn primary" onClick={() => void start()} data-rs-start="1">
            <Icon k="play" /> {tx.start}
          </button>
        )}
      </div>
      {showKeys && neckTuning && box ? (
        <RotationNeck tuning={neckTuning} leftHanded={settings.leftHanded} cur={box} next={nextBox} fam={shown.fam} nextFam={ch?.cell.fam} lang={lang} onTap={onScreenKey} shapes={shapes} onShape={pickShape} />
      ) : (
        showKeys && <MarkedKeys onKey={onScreenKey} pcs={marks.pcs} colour={marks.colour} avoid={marks.avoid} fam={shown.fam} />
      )}
    </section>
  );
}

const NECK_SHAPE_KEY = 'tt-rotation-neck-shape';
function readNeckShape(): NeckShape | null {
  try {
    const v = localStorage.getItem(NECK_SHAPE_KEY);
    return v === 'box' || v === '3nps' || v === 'full' ? v : null;
  } catch {
    return null;
  }
}
/** A screen wide enough for the whole neck (16 frets at a readable size). */
function useWide(): boolean {
  const q = '(min-width: 900px)';
  const [wide, setWide] = useState(() => window.matchMedia?.(q).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}
