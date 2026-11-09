// My charts (SPEC-0.48 §P2): type chord symbols, get a backing track in a style, key and tempo — loop it and play
// along. Charts are kept in the settings (synced with the profile). Templates are free progressions, not songs.

import { Icon } from './icons';
import type { NoteEvent } from '../engine/lesson';
import { debrief } from '../engine/improvCoach';
import { useEffect, useMemo, useRef, useState } from 'react';
import { STANDARD_CHANGES, STANDARD_GROUPS, type StandardGroup } from '../engine/standards';
import { RHYTHMS, RHYTHM_NAME, STRIDES, VOICINGS, VOICING_NAME, chartKind, type ChartMode, type ChartVoicing, type CompRhythm } from '../engine/drills/chartDrills';
import { IMPROV_LEVELS } from '../engine/charts';
import { CHART_STYLES, CHART_TEMPLATES, STYLE_NAME, chartBacking, chordAtBeat, parseChart, transposeChart, type ChartStyle } from '../engine/charts';
import type { Settings } from '../storage/progress';
import { piano, SIMULATED } from './services';
import { framesFromNotes, improvReportBy, type ImprovReport } from '../engine/perform';
import { BleedGate } from '../engine/bleed';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { SungFrame } from '../engine/sing';
import { useHeadphones } from './Perform';
import { segmentNotes } from '../engine/memory';
import { midi } from '../speech/midi';
import { MODE_NAMES, type ModeId } from '../engine/modes';
import { BAR_SCALES, RULE_NAME, autoScale, challengeOf, checkRules, type PlayedNote, type RuleSet, type RulesReport } from '../engine/improvRules';
import { LeadSheetImport, RulesPanel } from './ImprovRules';
import { irealStyle, type LeadSheet } from '../engine/leadsheet';

export interface MyChart {
  id: string;
  title: string;
  text: string;
  style: ChartStyle;
  bpm: number;
  /** Improvising under rules (owner 2026-11-08): a scale per chart bar (absent = the chord's usual scale) and the rules. */
  scales?: Record<number, ModeId>;
  rules?: RuleSet;
  /** The tune from an imported lead sheet (b = beat, d = length in beats, m = MIDI): the head, played before the solo. */
  melody?: { b: number; d: number; m: number }[];
  /** An improvisation level this chart came from (best scores are kept per level). */
  level?: string;
}

const RX = {
  en: { rules: 'Rules', notes: 'Notes', intervals: 'Intervals', rhythm: 'Rhythm', free: 'Free', barScale: 'Scale for bar', auto: 'Auto', result: 'Rules kept', where: 'Bars with breaks are marked', midi: 'MIDI keyboard' },
  he: { rules: 'כללים', notes: 'צלילים', intervals: 'מרווחים', rhythm: 'קצב', free: 'חופשי', barScale: 'סולם לתיבה', auto: 'אוטומטי', result: 'עמידה בכללים', where: 'תיבות עם חריגות מסומנות', midi: 'מקלדת MIDI' },
};

const IMP = {
  en: { go: 'Improvise', hint: 'Sing or play one line over the chart (microphone). The first bar is for listening.', listen: 'Listen…', now: 'Now play!', score: 'Score', strong: 'Chord tones on strong beats', ending: 'Ends on a chord tone', rhythm: 'Rhythmic variety', range: 'Range (semitones)', approach: 'Half-step approaches', headphones: 'Headphones', tips: { strong: 'Land on a chord tone (1, 3, 5, 7) on beats 1 and 3.', ending: 'End on a note of the last chord.', rhythm: 'Mix long and short notes — and leave some space.', range: 'Use more of your range: climb and fall.', approach: 'Slide into chord tones from a half step above or below.' } },
  he: { go: 'לאלתר', hint: 'שירו או נגנו קו אחד מעל המהלך (מיקרופון). התיבה הראשונה להקשבה.', listen: 'מקשיבים…', now: 'עכשיו לנגן!', score: 'ציון', strong: 'צלילי אקורד בפעמות חזקות', ending: 'סיום על צליל אקורד', rhythm: 'גיוון קצבי', range: 'מנעד (חצאי טונים)', approach: 'גישות בחצי טון', headphones: 'אוזניות', tips: { strong: 'נחתו על צליל אקורד (1, 3, 5, 7) בפעמות 1 ו־3.', ending: 'סיימו על צליל של האקורד האחרון.', rhythm: 'ערבבו צלילים ארוכים וקצרים — והשאירו מקום.', range: 'השתמשו ביותר מנעד: לעלות ולרדת.', approach: 'החליקו לצלילי אקורד מחצי טון מעל או מתחת.' } },
};

const TX = {
  en: { title: 'Charts', mine: 'My charts', templates: 'Start from a progression', new: 'New chart', name: 'Name', chords: 'Chords — bars split by |, e.g. Dm7 G7 | Cmaj7 | %', bad: 'Not a chord:', play: 'Play', stop: 'Stop', save: 'Save', del: 'Delete', back: 'Back', key: 'Key', tempo: 'Tempo', drums: 'Drums', untitled: 'My chart', empty: 'No charts yet — start from a progression or a new chart.' },
  he: { title: 'מהלכי אקורדים', mine: 'המהלכים שלי', templates: 'להתחיל ממהלך מוכר', new: 'מהלך חדש', name: 'שם', chords: 'אקורדים — תיבות מופרדות ב־|, למשל Dm7 G7 | Cmaj7 | %', bad: 'לא אקורד:', play: 'לנגן', stop: 'עצירה', save: 'שמירה', del: 'מחיקה', back: 'חזרה', key: 'סולם', tempo: 'טמפו', drums: 'תופים', untitled: 'המהלך שלי', empty: 'עדיין אין מהלכים — התחילו ממהלך מוכר או ממהלך חדש.' },
};

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function ChartsScreen({ settings, onChange, onBack, onImprov, onDrill, onMixer, initial }: { settings: Settings; onChange: (p: Partial<Settings>) => void; onBack: () => void; onImprov?: (score: number, bpm: number, chords: number, level?: string, challenge?: string) => void; onDrill?: (kind: string, stride: boolean) => void; onMixer?: () => void; initial?: () => MyChart | null }) {
  const lang = settings.uiLang;
  const tx = TX[lang];
  const mine = settings.myCharts ?? [];
  const [open, setOpen] = useState<MyChart | null>(() => initial?.() ?? null);
  const addSheets = (sheets: LeadSheet[]) => {
    const made: MyChart[] = sheets.map((l) => ({ id: newId(), title: l.title === 'Untitled' ? tx.untitled : l.title, text: l.text, style: l.meter === 3 ? 'waltz' : l.style ? (irealStyle(l.style) as ChartStyle) : 'swing', bpm: l.bpm && l.bpm > 30 ? l.bpm : 120, ...(l.melody ? { melody: l.melody.map((n) => ({ b: n.beat, d: n.dur, m: n.midi })) } : {}) }));
    onChange({ myCharts: [...made, ...mine].slice(0, 120) });
    if (made.length === 1) setOpen(made[0]);
  };
  if (open)
    return (
      <ChartPlayer
        lang={lang}
        chart={open}
        saved={mine.some((c) => c.id === open.id)}
        onSave={(c) => {
          onChange({ myCharts: [c, ...mine.filter((x) => x.id !== c.id)].slice(0, 120) });
          setOpen(c);
        }}
        onDelete={() => {
          onChange({ myCharts: mine.filter((x) => x.id !== open.id) });
          setOpen(null);
        }}
        onBack={() => setOpen(null)}
        onImprov={onImprov}
        best={settings.challengeBest}
        onDrill={onDrill}
      />
    );
  return (
    <main className="panel-screen charts" data-charts="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx.title}</h1>
        {onMixer && (
          <button className="icon-btn" onClick={onMixer} aria-label={lang === 'he' ? 'מיקסר' : 'Mixer'} data-charts-mixer="1">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M6 4v16M12 4v16M18 4v16" />
              <rect x="4" y="13" width="4" height="3" rx="1" />
              <rect x="10" y="7" width="4" height="3" rx="1" />
              <rect x="16" y="11" width="4" height="3" rx="1" />
            </svg>
          </button>
        )}
      </header>
      <section className="set-card">
        <div className="ch-head">
          <h2>{tx.mine}</h2>
          <button className="btn small" data-chart-new="1" onClick={() => setOpen({ id: newId(), title: tx.untitled, text: '', style: 'swing', bpm: 110 })}>
            + {tx.new}
          </button>
        </div>
        {mine.length ? (
          <ul className="ch-list">
            {mine.map((c) => (
              <li key={c.id}>
                <button className="ch-row" onClick={() => setOpen(c)} data-chart-open={c.id}>
                  <b>{c.title}</b>
                  <small dir="ltr">{c.text.slice(0, 40)}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-hint">{tx.empty}</p>
        )}
      </section>
      <LeadSheetImport lang={lang} onAdd={addSheets} />
      <section className="set-card" data-improv-levels="1">
        <h2>{lang === 'he' ? 'אלתור — שלבים' : 'Improvise — levels'}</h2>
        <p className="field-hint">{lang === 'he' ? 'מהלכים שהולכים ונהיים קשים: מאקורד אחד ועד תחליפי טריטון, אלטרד וקולטריין. לכל שלב כללים מומלצים.' : 'Progressions that get harder: from one chord to tritone subs, altered dominants and Coltrane changes. Each level suggests rules.'}</p>
        <ol className="ch-list ch-levels">
          {IMPROV_LEVELS.map((l) => {
            const best = settings.improvBest?.[l.id];
            return (
              <li key={l.id}>
                <button
                  className="ch-row"
                  onClick={() => setOpen({ id: newId(), title: l.title[lang], text: l.text, style: l.style, bpm: l.bpm, rules: l.rules, level: l.id })}
                  data-improv-level={l.n}
                >
                  <span className="lv-n" dir="ltr">
                    {l.n}
                  </span>
                  <span className="lv-text">
                    <b>{l.title[lang]}</b>
                    <small>{l.focus[lang]}</small>
                  </span>
                  <small className={`lv-best ${best !== undefined && best >= 0.8 ? 'good' : ''}`} dir="ltr">
                    {best !== undefined ? `${Math.round(best * 100)}%` : ''}
                  </small>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="set-card" data-standards="1">
        <h2>{lang === 'he' ? 'מהלכים של סטנדרטים' : 'Standards’ changes'}</h2>
        <p className="field-hint">{lang === 'he' ? `${STANDARD_CHANGES.length} מהלכים מוכנים, רובם בצורה המלאה. כל סטנדרט אחר נכנס דרך ייבוא דף אקורדים (למשל רשימות של iReal Pro).` : `${STANDARD_CHANGES.length} ready changes, most as the whole form. Any other standard comes in through Import a lead sheet (for example an iReal Pro playlist).`}</p>
        {(Object.keys(STANDARD_GROUPS) as StandardGroup[]).map((g) => (
        <details key={g} className="std-group" open={g === 'blues' || g === 'swing'}>
        <summary>{STANDARD_GROUPS[g][lang]} <small dir="ltr">({STANDARD_CHANGES.filter((x) => x.group === g).length})</small></summary>
        <ul className="ch-list">
          {STANDARD_CHANGES.filter((x) => x.group === g).map((t) => (
            <li key={t.id}>
              <button className="ch-row" onClick={() => setOpen({ id: newId(), title: `${t.name} — ${t.part[lang]}`, text: t.text, style: t.style, bpm: t.bpm })} data-standard={t.id}>
                <b dir="ltr">{t.name}</b>
                <small>
                  {t.part[lang]} · {'★'.repeat(t.level)}
                </small>
              </button>
            </li>
          ))}
        </ul>
        </details>
        ))}
      </section>
      <section className="set-card">
        <h2>{tx.templates}</h2>
        <ul className="ch-list">
          {CHART_TEMPLATES.map((t) => (
            <li key={t.id}>
              <button className="ch-row" onClick={() => setOpen({ id: newId(), title: t.title[lang], text: t.text, style: t.style, bpm: t.bpm })} data-chart-template={t.id}>
                <b>{t.title[lang]}</b>
                <small>{STYLE_NAME[t.style][lang]}</small>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ChartPlayer({ lang, chart, saved, onSave, onDelete, onBack, onImprov, onDrill, best }: { best?: Record<string, number>; lang: 'en' | 'he'; chart: MyChart; saved: boolean; onSave: (c: MyChart) => void; onDelete: () => void; onBack: () => void; onImprov?: (score: number, bpm: number, chords: number, level?: string, challenge?: string) => void; onDrill?: (kind: string, stride: boolean) => void }) {
  const tx = TX[lang];
  const ix = IMP[lang];
  const [headphones, setHeadphones] = useHeadphones();
  const [improv, setImprov] = useState<'idle' | 'on'>('idle');
  const [report, setReport] = useState<ImprovReport | null>(null);
  const rx = RX[lang];
  const [rules, setRules] = useState<RuleSet>(chart.rules ?? { note: 'scale', interval: null, rhythm: null });
  const [scales, setScales] = useState<Record<number, ModeId>>(chart.scales ?? {});
  const [pickBar, setPickBar] = useState<number | null>(null);
  const [rulesRep, setRulesRep] = useState<RulesReport | null>(null);
  // Practise this progression at the piano: a voicing (or a stride left hand), a comping rhythm, comp or LH + RH improv.
  const [pv, setPv] = useState<ChartVoicing>('rootless');
  const [pr, setPr] = useState<CompRhythm>('charleston');
  const [pm, setPm] = useState<ChartMode>('comp');
  const [title, setTitle] = useState(chart.title);
  const [text, setText] = useState(chart.text);
  const [style, setStyle] = useState<ChartStyle>(chart.style);
  const [bpm, setBpm] = useState(chart.bpm);
  const [melody, setMelody] = useState(chart.melody ?? []);
  const [head, setHead] = useState(!!chart.melody?.length);
  /** The head's notes for a backing whose chart starts at beat `from` (played once, on the lead piano). */
  const headEvents = (from: number) => (head ? melody.map((n) => ({ midi: n.m, start: (from + n.b) * (60 / bpm), duration: Math.max(0.08, n.d * (60 / bpm) * 0.95), velocity: 0.74 })) : []);
  const [drums, setDrums] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const meter = style === 'waltz' ? 3 : 4;
  const parsed = useMemo(() => parseChart(text, meter), [text, meter]);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const dirty = title !== chart.title || text !== chart.text || style !== chart.style || bpm !== chart.bpm || JSON.stringify(rules) !== JSON.stringify(chart.rules ?? { note: 'scale', interval: null, rhythm: null }) || JSON.stringify(scales) !== JSON.stringify(chart.scales ?? {}) || !saved;

  const stop = () => {
    ctl.current?.abort();
    setPlaying(false);
    setBeat(-1);
  };
  // Listen back (0.56): the last take over the same band — MIDI notes replayed, or the microphone's sound itself.
  type Take = { events: NoteEvent[]; length: number; t0: number; notes?: PlayedNote[]; audio?: AudioBuffer; offset?: number };
  const lastTake = useRef<Take | null>(null);
  const [hasTake, setHasTake] = useState(false);
  const recorder = async () => {
    // iOS mutes the first microphone stream when a second one opens: no recording there (the pitch capture comes first)
    if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || typeof MediaRecorder === 'undefined') return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const rec = new MediaRecorder(stream);
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      const started = new Promise<number>((r) => (rec.onstart = () => r(performance.now())));
      rec.start();
      const at = await started;
      return {
        at,
        stop: () =>
          new Promise<Blob>((r) => {
            rec.onstop = () => {
              stream.getTracks().forEach((t) => t.stop());
              r(new Blob(parts, { type: rec.mimeType }));
            };
            rec.stop();
          }),
      };
    } catch {
      return null;
    }
  };
  const listenBack = async () => {
    const tk = lastTake.current;
    if (!tk) return;
    stop();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    setPlaying(true);
    const ctx = piano.context!;
    const events = tk.notes ? [...tk.events, ...tk.notes.map((n) => ({ midi: n.midi, start: tk.t0 + n.start, duration: Math.max(0.05, n.end - n.start), velocity: 0.78 }))] : tk.events;
    let src: AudioBufferSourceNode | null = null;
    if (tk.audio) {
      src = ctx.createBufferSource();
      src.buffer = tk.audio;
      const g = ctx.createGain();
      g.gain.value = 1.4;
      src.connect(g).connect(ctx.destination);
      // the backing starts 60 ms after this moment (piano.play); the recording began `offset` s after the backing
      src.start(Math.max(ctx.currentTime, ctx.currentTime + 0.06 + (tk.offset ?? 0)));
      c.signal.addEventListener('abort', () => src?.stop());
    }
    await piano.play(events, tk.length, c.signal).catch(() => {});
    src?.stop();
    setPlaying(false);
  };
  const play = async () => {
    stop();
    if (!parsed.chords.length) return;
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    setPlaying(true);
    const beatMs = 60000 / bpm;
    const loopBeats = parsed.bars * meter;
    // Two passes per render keeps each scheduled block short; keep going until Stop.
    let first = true;
    while (!c.signal.aborted) {
      const loops = Math.max(1, Math.ceil(32 / loopBeats));
      const b = chartBacking(parsed, style, bpm, loops, meter, { countIn: first, drums });
      if (first && head) b.events.push(...headEvents(b.startBeat));
      const t0 = performance.now() + 120;
      // A timer, not animation frames: it keeps running with the screen off or the tab in the background.
      const timer = setInterval(() => {
        if (c.signal.aborted) return clearInterval(timer);
        const x = (performance.now() - t0) / beatMs - b.startBeat;
        setBeat(x >= 0 ? Math.floor(x) % loopBeats : -1);
      }, 40);
      first = false;
      try {
        await piano.play(b.events, b.length - 0.4, c.signal);
      } catch {
        clearInterval(timer);
        break;
      }
      clearInterval(timer);
    }
  };
  // Improvise (SPEC-0.48): one pass through the chart (two if it is short) with the microphone; the first bar is for
  // listening (and teaches the bleed gate the backing's sound when there are no headphones).
  const goImprov = async () => {
    stop();
    if (!parsed.chords.length) return;
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    setReport(null);
    setImprov('on');
    setPlaying(true);
    const loops = parsed.bars * meter < 24 ? 2 : 1;
    const headBeats = head && melody.length ? parsed.bars * meter : 0;
    const b = chartBacking(parsed, style, bpm, loops + (headBeats ? 1 : 0), meter, { countIn: true, drums });
    if (headBeats) b.events.push(...headEvents(b.startBeat));
    const beatS = 60 / bpm;
    // with the head, the solo starts a chorus later; everything is timed from the solo's first beat
    const t0 = (b.startBeat + headBeats) * beatS;
    const listenFrom = t0 + meter * beatS;
    const loopBeats = parsed.bars * meter;
    const start = performance.now() + 120;
    const timer = setInterval(() => {
      if (c.signal.aborted) return clearInterval(timer);
      const x = (performance.now() - start) / 1000 / beatS - b.startBeat;
      setBeat(x >= 0 ? Math.floor(x) % loopBeats : -1);
    }, 40);
    let frames: SungFrame[] = [];
    const midiNotes: PlayedNote[] = [];
    const useMidi = midi.devices.length > 0;
    if (SIMULATED) {
      await new Promise((r) => setTimeout(r, 300));
    } else if (useMidi) {
      const open = new Map<number, number>();
      const t0perf = start + t0 * 1000;
      const off = midi.onNote((m, on, at) => {
        const t = (at - t0perf) / 1000;
        if (on) open.set(m, t);
        else if (open.has(m)) {
          midiNotes.push({ midi: m, start: open.get(m)!, end: t });
          open.delete(m);
        }
      });
      await piano.play(b.events, b.length, c.signal).catch(() => {});
      off();
      lastTake.current = { events: b.events, length: b.length, t0, notes: midiNotes };
      setHasTake(true);
    } else {
      const gate = headphones ? null : new BleedGate([...new Set(b.events.filter((e) => !e.perc).map((e) => e.midi))]);
      const buf: SungFrame[] = [];
      const rec = await recorder();
      const backingAt = piano.heardTime((piano.context?.currentTime ?? 0) + 0.06);
      void piano.play(b.events, b.length, c.signal).catch(() => {});
      const r = await new BrowserPitchCapture().sing({
        signal: c.signal,
        maxMs: b.length * 1000,
        silenceMs: 600_000,
        hopMs: 20,
        onFrame: (f) => {
          if (f.t < listenFrom) return gate?.calibrate(f);
          if (gate && f.t - listenFrom < 0.03) gate.finishCalibration();
          buf.push(gate ? gate.pass(f) : f);
        },
      });
      frames = r.kind === 'frames' ? buf : [];
      if (rec) {
        const blob = await rec.stop();
        try {
          const audio = await piano.context!.decodeAudioData(await blob.arrayBuffer());
          // the recording began this long after the backing was heard (a little input latency taken off)
          lastTake.current = { events: b.events, length: b.length, t0, audio, offset: (rec.at - backingAt) / 1000 - 0.04 };
          setHasTake(true);
        } catch {
          /* no playback for this take */
        }
      }
    }
    clearInterval(timer);
    const aborted = c.signal.aborted && !SIMULATED;
    setPlaying(false);
    setBeat(-1);
    setImprov('idle');
    if (aborted) return;
    const pcsAt = (bt: number) => {
      const ch = chordAtBeat(parsed, meter, bt);
      return ch ? ch.iv.map((x) => (ch.root + x) % 12) : [];
    };
    const shifted = frames.map((f) => ({ ...f, t: f.t - t0 }));
    // Notes for the rules: MIDI as played, or the microphone frames cut into notes. The listening bar does not count.
    const sung: PlayedNote[] = useMidi ? midiNotes : segmentNotes(shifted, { minSec: 0.07 }).map((n) => ({ start: n.start, end: n.end, midi: n.midi }));
    const judged = sung.filter((n) => n.start >= meter * beatS - 0.05);
    const rep = improvReportBy(useMidi ? framesFromNotes(midiNotes.filter((n) => n.start >= 0)) : shifted, pcsAt, bpm);
    setReport(rep);
    const anyRule = !!(rules.note || rules.interval || rules.rhythm || rules.shape);
    const rr = anyRule ? checkRules(judged, parsed, meter, bpm, rules, scales, parsed.bars * loops) : null;
    setRulesRep(rr);
    const score = rr && rr.notes >= 4 ? rr.score : rep.score;
    if ((rr?.notes ?? rep.notes) >= 3) onImprov?.(score, bpm, new Set(parsed.chords.map((x) => x.sym)).size, chart.level, rr && rr.notes >= 4 ? challengeOf(rules)?.id : undefined);
  };
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const cur = beat >= 0 ? chordAtBeat(parsed, meter, beat) : null;
  const curBar = beat >= 0 ? Math.floor(beat / meter) : -1;
  const barChords = Array.from({ length: parsed.bars }, (_, i) => parsed.chords.filter((c) => c.bar === i));
  return (
    <main className="panel-screen charts ch-play" data-chart-player="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (stop(), onBack())} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <input className="ch-title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 40))} aria-label={tx.name} />
      </header>
      <div className="ch-grid" dir="ltr" style={{ ['--cols' as string]: Math.min(4, Math.max(1, parsed.bars)) }}>
        {barChords.map((cs, i) => (
          <span
            key={i}
            className={`ch-bar ${i === curBar ? 'now' : ''} ${rulesRep && !playing && rulesRep.bars.some((x, j) => j % parsed.bars === i && x.breaks > 0) ? 'broke' : ''}`}
            data-bar={i}
            role={rules.note === 'scale' && !playing ? 'button' : undefined}
            tabIndex={rules.note === 'scale' && !playing ? 0 : undefined}
            onClick={() => rules.note === 'scale' && !playing && setPickBar(i)}
          >
            <span className="ch-chords">
              {cs.map((c, k) => (
                <b key={k} className={cur === c ? 'on' : ''}>
                  {c.sym}
                </b>
              ))}
            </span>
            {rules.note === 'scale' && cs[0] && (
              <small className={`ch-scale ${scales[i] ? 'set' : ''}`}>{scales[i] || cs.length === 1 ? MODE_NAMES[scales[i] ?? autoScale(cs[0].iv)][lang].replace(/ \(.*\)$/, '') : rx.auto}</small>
            )}
          </span>
        ))}
      </div>
      <textarea className="ch-text" dir="ltr" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={tx.chords} aria-label={tx.chords} data-chart-text="1" />
      {parsed.errors.length > 0 && (
        <p className="field-hint ch-err">
          {tx.bad} <span dir="ltr">{parsed.errors.join(' ')}</span>
        </p>
      )}
      <RulesPanel lang={lang} rules={rules} onRules={setRules} disabled={playing} best={best} />
      {pickBar !== null && (
        <div className="ch-scalepick" role="dialog" aria-label={`${rx.barScale} ${pickBar + 1}`} data-scale-pick={pickBar}>
          <div className="ch-sp-head">
            <b>
              {rx.barScale} {pickBar + 1}
            </b>
            <button className="icon-btn" onClick={() => setPickBar(null)} aria-label="✕">
              ✕
            </button>
          </div>
          <div className="chips wrap">
            <button
              className={`chip ${!scales[pickBar] ? 'on' : ''}`}
              onClick={() => {
                const n = { ...scales };
                delete n[pickBar];
                setScales(n);
                setPickBar(null);
              }}
            >
              {rx.auto}
            </button>
            {BAR_SCALES.map((m) => (
              <button key={m} className={`chip ${scales[pickBar] === m ? 'on' : ''}`} onClick={() => (setScales({ ...scales, [pickBar]: m }), setPickBar(null))} data-scale={m}>
                {MODE_NAMES[m][lang].replace(/ \(.*\)$/, '')}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="chips ch-styles" role="radiogroup">
        {CHART_STYLES.map((st) => (
          <button key={st} role="radio" aria-checked={style === st} className={`chip ${style === st ? 'on' : ''}`} onClick={() => setStyle(st)} data-chart-style={st}>
            {STYLE_NAME[st][lang]}
          </button>
        ))}
      </div>
      <div className="ch-ctrls">
        <span className="ch-step">
          <small>{tx.tempo}</small>
          <button className="icon-btn" onClick={() => setBpm((b) => Math.max(40, b - 4))} aria-label="−">
            −
          </button>
          <b dir="ltr">{bpm}</b>
          <button className="icon-btn" onClick={() => setBpm((b) => Math.min(260, b + 4))} aria-label="+">
            +
          </button>
        </span>
        <span className="ch-step">
          <small>{tx.key}</small>
          <button className="icon-btn" onClick={() => (setText((t) => transposeChart(t, -1)), setMelody((ms) => ms.map((n) => ({ ...n, m: n.m - 1 }))))} aria-label="♭" data-chart-down="1">
            ♭
          </button>
          <button className="icon-btn" onClick={() => (setText((t) => transposeChart(t, 1)), setMelody((ms) => ms.map((n) => ({ ...n, m: n.m + 1 }))))} aria-label="♯" data-chart-up="1">
            ♯
          </button>
        </span>
        <label className="ch-drums">
          <input type="checkbox" checked={drums} onChange={(e) => setDrums(e.target.checked)} /> {tx.drums}
        </label>
        {melody.length > 0 && (
          <label className="ch-drums" data-chart-head="1">
            <input type="checkbox" checked={head} onChange={(e) => setHead(e.target.checked)} /> {lang === 'he' ? 'מנגינה לפני הסולו' : 'Play the tune first'}
          </label>
        )}
      </div>
      {playing ? (
        <>
          {improv === 'on' && (
            <p className="vocal-cue" aria-live="assertive">
              {beat < meter ? ix.listen : ix.now}
            </p>
          )}
          <button className="btn mega" onClick={stop} data-chart-stop="1">
            ■ {tx.stop}
          </button>
        </>
      ) : (
        <div className="ch-go">
          <button className="btn mega" onClick={() => void play()} disabled={!parsed.chords.length} data-chart-play="1">
            ▶ {tx.play}
          </button>
          <button className="btn ghost" onClick={() => void goImprov()} disabled={!parsed.chords.length} data-chart-improv="1" title={ix.hint}>
            <Icon k="mic" /> {ix.go}
          </button>
        </div>
      )}
      {!playing && (
        <label className="ch-drums">
          <input type="checkbox" checked={headphones} onChange={(e) => setHeadphones(e.target.checked)} /> <Icon k="phones" /> {ix.headphones}
        </label>
      )}
      {hasTake && !playing && (
        <button className="btn ghost small ch-listen" onClick={() => void listenBack()} data-chart-listen="1">
          ▶ {lang === 'he' ? 'להאזין לסולו שלכם' : 'Listen to your solo'}
        </button>
      )}
      {rulesRep && !playing && (
        <div className="take-card ch-rules-result" aria-live="polite" data-rules-score={Math.round(rulesRep.score * 100)}>
          <div className="take-score">
            {rx.result}: <b>{pct(rulesRep.score)}</b>
          </div>
          <ul className="perf-report">
            {rulesRep.checks.map((c) => (
              <li key={c.rule}>
                {RULE_NAME[c.rule][lang]}: <b dir="ltr">{c.total ? `${c.ok}/${c.total}` : '—'}</b>
              </li>
            ))}
          </ul>
          {rulesRep.bars.some((x) => x.breaks) && <small className="field-hint">{rx.where}</small>}
          {(() => {
            const d = debrief(rulesRep, parsed, meter, rules, bpm);
            return (
              <div className="debrief" data-debrief={d.next.kind}>
                <p className="db-head">{d.headline[lang]}</p>
                {d.good && <p className="db-good">{d.good[lang]}</p>}
                {d.work && <p className="db-work">{d.work[lang]}</p>}
                {d.where && <p className="db-where">{d.where[lang]}</p>}
                <div className="db-next">
                  <small>{d.next.why[lang]}</small>
                  <button
                    className="btn small"
                    onClick={() => {
                      if (d.next.challenge) setRules(d.next.challenge.rules);
                      setBpm(d.next.bpm);
                      setRulesRep(null);
                      setReport(null);
                    }}
                    data-debrief-next="1"
                  >
                    {d.next.kind === 'harder' ? (lang === 'he' ? 'לאתגר הבא' : 'Next challenge') : d.next.kind === 'easier' ? (lang === 'he' ? 'צעד אחורה' : 'Step back') : lang === 'he' ? 'שוב' : 'Again'}
                    {d.next.bpm !== bpm ? ` · ${d.next.bpm} BPM` : ''}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {report && !playing && (
        <div className="take-card" aria-live="polite" data-chart-report={Math.round(report.score * 100)}>
          <div className="take-score">
            {ix.score}: <b>{pct(report.score)}</b>
          </div>
          <ul className="perf-report">
            <li>
              {ix.strong}: <b dir="ltr">{pct(report.strongChordTones)}</b>
            </li>
            <li>
              {ix.ending}: <b>{report.endsOnChordTone ? '✓' : '✗'}</b>
            </li>
            <li>
              {ix.rhythm}: <b dir="ltr">{report.rhythmicVariety}/4</b>
            </li>
            <li>
              {ix.range}: <b dir="ltr">{report.rangeSemis}</b>
            </li>
            <li>
              {ix.approach}: <b dir="ltr">{pct(report.chromaticApproaches)}</b>
            </li>
          </ul>
          {report.tips.slice(0, 2).map((k) => (
            <p key={k} className="take-tip">
              <Icon k="tip" /> {ix.tips[k]}
            </p>
          ))}
        </div>
      )}
      {onDrill && !playing && (
        <details className="ch-practise" data-chart-practise="1">
          <summary>{lang === 'he' ? 'לתרגל בפסנתר: וויסינג, קומפינג, סטרייד' : 'Practice at the piano: voicings, comping, stride'}</summary>
          <div className="ch-rules">
            <select value={pv} onChange={(e) => setPv(e.target.value as ChartVoicing)} aria-label="voicing" data-practise-voicing="1">
              <optgroup label={lang === 'he' ? 'וויסינג' : 'Voicings'}>
                {VOICINGS.map((v) => (
                  <option key={v} value={v}>
                    {VOICING_NAME[v][lang]}
                  </option>
                ))}
              </optgroup>
              <optgroup label={lang === 'he' ? 'סטרייד' : 'Stride'}>
                {STRIDES.map((v) => (
                  <option key={v} value={v}>
                    {VOICING_NAME[v][lang]}
                  </option>
                ))}
              </optgroup>
            </select>
            <select value={pr} onChange={(e) => setPr(e.target.value as CompRhythm)} disabled={pv.startsWith('stride')} aria-label="rhythm" data-practise-rhythm="1">
              {RHYTHMS.map((r) => (
                <option key={r} value={r}>
                  {RHYTHM_NAME[r][lang]}
                </option>
              ))}
            </select>
            <select value={pm} onChange={(e) => setPm(e.target.value as ChartMode)} aria-label="mode" data-practise-mode="1">
              <option value="comp">{lang === 'he' ? 'רק ליווי' : 'Comp only'}</option>
              <option value="improv">{lang === 'he' ? 'שמאל מלווה, ימין מאלתרת' : 'LH comps, RH improvises'}</option>
            </select>
          </div>
          <button className="btn" disabled={!parsed.chords.length || parsed.errors.length > 0} onClick={() => (stop(), onDrill(chartKind(`txt:${encodeURIComponent(`${title.trim()}\n${text}`)}`, pv, pv.startsWith('stride') ? 'whole' : pr, pm), pv.startsWith('stride')))} data-practise-go="1">
            {lang === 'he' ? 'להתחיל — הטמפו עולה כשנקי' : 'Start — the tempo climbs as it gets clean'}
          </button>
        </details>
      )}
      <div className="ch-save">
        {dirty && (
          <button className="btn ghost small" onClick={() => onSave({ ...chart, title: title.trim() || tx.untitled, text, style, bpm, rules, scales, ...(melody.length ? { melody } : {}) })} disabled={!parsed.chords.length} data-chart-save="1">
            {tx.save}
          </button>
        )}
        {saved && (
          <button className="btn ghost small" onClick={() => (stop(), onDelete())} data-chart-delete="1">
            {tx.del}
          </button>
        )}
      </div>
    </main>
  );
}
