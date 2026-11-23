// Improvise › Scales › "The Barry Harris way" (docs/SPEC-RBI-ROTATION.md §6 track B, owner-approved name; BUILD-PLAN
// phase 8). The lead sheet with a thought chord over every chord ("think A♭m6"), the starting degree on each window,
// no mode names. A count-in + click + the now-cue on the sheet (timing-cue rule); after the take: thought-chord tones on
// the beat, half steps that resolve off the beat, the thought chord's identity notes, the starting degree / the landing.
// One phone screen; the keyboard is behind a button. Only content verified in docs/BARRY-HARRIS-THEORY.md (harrisTrack.ts).

import { useEffect, useMemo, useRef, useState } from 'react';
import { chartBacking, parseChart, transposeChart } from '../engine/charts';
import { buildHarrisSheet, DEGREE_WORD, degreePc, gradeHarris, harrisCellAt, HARRIS_TIERS, thoughtLabel, thoughtName, thoughtScale, thoughtTones, TIERS, type HarrisGrade, type HarrisTier, type HNote } from '../engine/harrisTrack';
import { improvTake, type ImprovTake } from '../engine/rotationSheet';
import { spansOfChart } from '../engine/ruleCards';
import { bookTake } from '../engine/vocab';
import type { VocabCtx } from './Charts';
import { LicksFound, type FoundUses } from './LicksFound';
import type { NoteEvent } from '../engine/lesson';
import type { Settings } from '../storage/progress';
import { midi } from '../speech/midi';
import { piano } from './services';
import { Icon } from './icons';
import { BeatDots } from './NewGameBits';
import { kName } from './encore/bits';
import '../newgames.css';
import '../rotation.css';

type Lang = 'en' | 'he';
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const TX = {
  en: { key: 'Key', tier: 'Tier', think: 'think', start: 'Start', stop: 'Stop', tempo: 'Tempo', keys: 'Keyboard', next: 'Next', onBeat: 'thought-chord tones on the beat', offBeat: 'off the beat: in the scale or a half step that resolves', identity: 'the thought chord heard', startDeg: 'started from the asked note', landing: 'landed on the 3rd of the V', none: 'Play a few notes over the chords to see the result.' },
  he: { key: 'סולם', tier: 'שלב', think: 'חשבו', start: 'להתחיל', stop: 'עצירה', tempo: 'טמפו', keys: 'מקלדת', next: 'הבא', onBeat: 'צלילי האקורד החשוב על הפעמה', offBeat: 'בין הפעמות: בסולם או חצי טון שנפתר', identity: 'האקורד שחשבתם נשמע', startDeg: 'פתחתם מהצליל שהתבקש', landing: 'נחתתם על הטרצה של ה־V', none: 'נגנו כמה צלילים מעל האקורדים כדי לראות את התוצאה.' },
};

/** The line above a chord: "think A♭m6" (and, on a V, which of Harris's names it is). */
function thinkText(c: { think: Parameters<typeof thoughtLabel>[0]; sym: string }, lang: Lang): { label: string; name: string | null } {
  return { label: thoughtLabel(c.think), name: c.think.name && c.think.name !== 'dominant' ? thoughtName[c.think.name][lang] : null };
}

export function HarrisWay({ settings, lang, dayKey, tier, onTier, onTake, vocab }: { settings: Settings; lang: Lang; dayKey: number; tier: HarrisTier; onTier?: (t: HarrisTier) => void; onTake?: (t: ImprovTake) => void; /** SPEC-LICKS-IN-IMPROV §3: the licks of mine in the take (booked; shown in the debrief). */ vocab?: VocabCtx }) {
  const tx = TX[lang];
  const he = lang === 'he';
  const sheet = useMemo(() => buildHarrisSheet(tier, dayKey), [tier, dayKey]);
  const def = TIERS[tier];
  const [bpm, setBpm] = useState(tier <= 2 ? 92 : 104);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState<number | null>(null);
  const [grade, setGrade] = useState<HarrisGrade | null>(null);
  const [found, setFound] = useState<FoundUses | null>(null);
  const [chorus, setChorus] = useState(0);
  const [showKeys, setShowKeys] = useState(midi.devices.length === 0);
  const ctl = useRef<AbortController | null>(null);
  const t0 = useRef(0);
  const notes = useRef<HNote[]>([]);
  const open = useRef(new Map<number, number>());
  const raf = useRef(0);
  const beatS = 60 / bpm;
  useEffect(() => (setGrade(null), setFound(null), setChorus(0)), [tier, dayKey]);
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
  const start = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setGrade(null);
    setFound(null);
    setChorus(0);
    setRunning(true);
    const text = sheet.tonic ? transposeChart(def.chart, sheet.tonic) : def.chart;
    const b = chartBacking(parseChart(text), 'swing', bpm, sheet.choruses);
    // the click on every beat under the band (the count-in comes from the backing)
    const total = sheet.bars * sheet.meter * sheet.choruses;
    const clicks: NoteEvent[] = Array.from({ length: total }, (_, k) => ({ midi: 96, start: (b.startBeat + k) * beatS, duration: 0.04, velocity: k % sheet.meter ? 0.16 : 0.26, perc: (k % sheet.meter ? 'click' : 'accent') as 'click' | 'accent' }));
    await piano.unlock();
    notes.current = [];
    open.current.clear();
    t0.current = performance.now() + 60 + b.startBeat * beatS * 1000;
    const tick = () => {
      const now = (performance.now() - t0.current) / 1000 / beatS;
      setBeat(now);
      const k = harrisCellAt(sheet, now);
      if (k >= 0) setChorus(sheet.cells[k].chorus);
      if (!c.signal.aborted) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    await piano.play([...b.events, ...clicks], b.length, c.signal).catch(() => {});
    cancelAnimationFrame(raf.current);
    const done = !c.signal.aborted;
    c.abort();
    setRunning(false);
    setBeat(null);
    t0.current = 0;
    if (!done) return;
    const g = gradeHarris(sheet, notes.current);
    setGrade(g);
    setChorus(0);
    onTake?.(improvTake('harris', { score: g.score, notes: g.notes, tier, bpm }));
    // the licks of mine in the line, over the same chart (SPEC-LICKS-IN-IMPROV §3: every improvisation take)
    const line = notes.current.map((n) => ({ beat: n.beat, midi: n.midi, dur: n.dur }));
    const r = bookTake(vocab, { notes: line, spans: spansOfChart(parseChart(text), sheet.meter, sheet.bars * sheet.choruses), meter: sheet.meter }, `harris-${Date.now().toString(36)}`);
    setFound(r && r.uses.length ? { ...r, notes: line, bpm } : null);
  };
  const stop = () => {
    ctl.current?.abort();
    setRunning(false);
    setBeat(null);
  };

  const now = beat === null ? -1 : harrisCellAt(sheet, beat);
  const nxI = beat === null ? 0 : sheet.cells.findIndex((c) => c.at > beat + 1e-6);
  const nx = nxI >= 0 ? sheet.cells[nxI] : null;
  const shown = now >= 0 ? sheet.cells[now] : (nx ?? sheet.cells[0]);
  const countNow = beat === null ? -1 : beat < 0 ? Math.max(0, Math.min(3, Math.floor(beat + 4))) : 4 + (Math.floor(beat) % sheet.meter);
  const bars = Array.from({ length: Math.min(8, sheet.bars) }, (_, i) => i);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <section className="rot hw" data-hw="1" data-hw-tier={tier}>
      <div className="rs-top">
        <span className="rs-key" data-hw-key={sheet.tonic}>
          {tx.key} <bdi dir="ltr">{kName(sheet.tonic)}</bdi>
        </span>
        <div className="seg rs-tiers" role="radiogroup" aria-label={tx.tier}>
          {HARRIS_TIERS.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tier === t} className={tier === t ? 'on' : ''} onClick={() => onTier?.(t)} disabled={running} aria-label={`${tx.tier} H-${t}: ${TIERS[t].title[lang]}`} title={TIERS[t].title[lang]} data-hw-tier-pick={t}>
              <bdi dir="ltr">H{t}</bdi>
            </button>
          ))}
        </div>
      </div>
      <p className="hw-title">
        <b>{def.title[lang]}</b>
      </p>
      <p className="field-hint hw-how">{def.how[lang]}</p>
      <div className="rs-sheet" dir="ltr" role="table" aria-label={he ? 'דף אקורדים' : 'Lead sheet'} data-hw-sheet={chorus}>
        {bars.map((b) => (
          <div className="rs-bar" role="row" key={b}>
            {sheet.cells.map((c, i) => {
              if (c.chorus !== chorus || c.bar !== b) return null;
              const t = thinkText(c, lang);
              const hit = grade?.hits[i];
              return (
                <div key={i} role="cell" className={`rs-cell hw-cell${i === now ? ' now' : ''}${hit === true ? ' hit' : hit === false ? ' miss' : ''}`} style={{ flexGrow: c.beats }} data-hw-cell={i} data-now={i === now ? '1' : undefined} data-think={t.label}>
                  <small className="rs-sub hw-think" title={t.name ?? undefined}>
                    {tx.think} <bdi dir="ltr">{t.label}</bdi>
                  </small>
                  <b className="rs-sym">
                    <bdi dir="ltr">{c.sym}</bdi>
                  </b>
                  {c.start ? (
                    <small className="hw-start" data-hw-start={c.start}>
                      {DEGREE_WORD[c.start][lang]} <bdi dir="ltr">({NAMES[degreePc(c.think, c.start)]})</bdi>
                    </small>
                  ) : t.name ? (
                    <small className="hw-start">{t.name}</small>
                  ) : (
                    <small className="hw-start" aria-hidden="true">
                      {' '}
                    </small>
                  )}
                  {hit != null && (
                    <span className="rs-hit">
                      <Icon k={hit ? 'check' : 'minus'} size={12} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="rs-under">
        {nx && running ? (
          <span className="rs-next" data-hw-next={thoughtLabel(nx.think)} aria-live="polite">
            <small>{tx.next}</small> <bdi dir="ltr">{nx.sym}</bdi> · {tx.think} <bdi dir="ltr">{thoughtLabel(nx.think)}</bdi>
          </span>
        ) : (
          <span />
        )}
        {sheet.choruses > 1 && !running && (
          <div className="seg rs-chorus" role="tablist" aria-label="Chorus">
            {Array.from({ length: sheet.choruses }, (_, k) => (
              <button key={k} role="tab" aria-selected={chorus === k} className={chorus === k ? 'on' : ''} onClick={() => setChorus(k)} aria-label={`${k + 1}`}>
                <bdi dir="ltr">{k + 1}</bdi>
              </button>
            ))}
          </div>
        )}
      </div>
      {running && <BeatDots countIn={4} beats={sheet.meter} now={countNow} />}
      {grade &&
        (grade.notes ? (
          <ul className="is-stats rs-stats" data-hw-result={Math.round(grade.score * 100)}>
            <li>
              <b>
                <bdi dir="ltr">{pct(grade.onBeat)}</bdi>
              </b>{' '}
              <small>{tx.onBeat}</small>
            </li>
            <li>
              <b>
                <bdi dir="ltr">{pct(grade.offBeat)}</bdi>
              </b>{' '}
              <small>{tx.offBeat}</small>
            </li>
            {grade.identity !== null && (
              <li>
                <b>
                  <bdi dir="ltr">{pct(grade.identity)}</bdi>
                </b>{' '}
                <small>{tx.identity}</small>
              </li>
            )}
            {grade.start !== null && (
              <li>
                <b>
                  <bdi dir="ltr">{pct(grade.start)}</bdi>
                </b>{' '}
                <small>{tx.startDeg}</small>
              </li>
            )}
            {grade.landing !== null && (
              <li>
                <b>
                  <bdi dir="ltr">{pct(grade.landing)}</bdi>
                </b>{' '}
                <small>{tx.landing}</small>
              </li>
            )}
          </ul>
        ) : (
          <p className="field-hint">{tx.none}</p>
        ))}
      {found && <LicksFound found={found} pool={vocab?.pool ?? []} lang={lang} meter={sheet.meter} />}
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
        <button className={`chip rs-keys-btn${showKeys ? ' on' : ''}`} onClick={() => setShowKeys((v) => !v)} aria-pressed={showKeys}>
          {tx.keys}
        </button>
        {running ? (
          <button className="btn primary" onClick={stop}>
            <Icon k="stop" /> {tx.stop}
          </button>
        ) : (
          <button className="btn primary" onClick={() => void start()} data-hw-go="1">
            <Icon k="play" /> {tx.start}
          </button>
        )}
      </div>
      {showKeys && <ThoughtKeys onKey={onScreenKey} tones={thoughtTones(shown.think)} scale={thoughtScale(shown.think)} />}
    </section>
  );
}

/** Two octaves from C4: the thought chord's tones accented, its scale dotted. */
function ThoughtKeys({ onKey, tones, scale }: { onKey: (m: number) => void; tones: number[]; scale: number[] }) {
  const keys = Array.from({ length: 25 }, (_, i) => 60 + i);
  const black = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  return (
    <div className="is-keys rs-keys" dir="ltr">
      {keys.map((m) => {
        const pc = m % 12;
        const mark = tones.includes(pc) ? 'colour' : scale.includes(pc) ? 'in' : '';
        return <button key={m} className={`is-key ${black(m) ? 'b' : 'w'} ${mark ? `rs-${mark} fam-major` : ''}`} onPointerDown={() => onKey(m)} aria-label={String(m)} />;
      })}
    </div>
  );
}
