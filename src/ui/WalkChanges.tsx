// Walk the Changes (0.76, bass): walk quarter notes over a chart — blues roots and fifths up to Giant Steps — with the
// piano comping and the click (on 2 and 4 from mp). Mic onsets (bass register) or MIDI; per beat: a note in time, and on
// the rule beats a note that keeps the tier's rule (root / fifth / chord tone / an approach into the next chord).

import { chartBeats, chordName, compVoicing, gradeWalk, takeSeed, walkChart, walkRule, walkTargets, type Played, type TakeSave, type WalkChart } from '../engine/instGames';
import type { NoteEvent } from '../engine/lesson';
import type { GameScreenProps } from './gameProps';
import { listenNotes, type Heard } from './instCapture';
import { piano } from './services';
import { TakeShell, type TakeCtx, type TakeGameCfg, type TakeOutcome, type TakePhase } from './TakeShell';

type Lang = 'he' | 'en';

/** Piano comping: each chord on its first beat (short), from t0 seconds. */
function compEvents(c: WalkChart, bpm: number, t0: number): NoteEvent[] {
  const beat = 60 / bpm;
  const ev: NoteEvent[] = [];
  let t = t0;
  for (const ch of c.chords) {
    for (const m of compVoicing(ch, 52)) ev.push({ midi: m, start: t, duration: Math.min(ch.beats, 2) * beat * 0.7, velocity: 0.42 });
    t += ch.beats * beat;
  }
  return ev;
}
function clicksFor(c: WalkChart, bpm: number, countIn: boolean) {
  const beat = 60 / bpm;
  const n = chartBeats(c);
  const jazz = c.level >= 3;
  const clicks: { t: number; accent: boolean; count?: boolean; soft?: boolean }[] = [];
  const off = countIn ? 4 : 0;
  if (countIn) for (let k = 0; k < 4; k++) clicks.push({ t: k * beat, accent: k === 0, count: true });
  for (let b = 0; b < n; b++) if (!jazz || b % 2 === 1) clicks.push({ t: (off + b) * beat, accent: false, soft: true });
  return { clicks, startAt: off * beat, endAt: (off + n) * beat };
}

function follow(signal: AbortSignal, origin: () => number, bpm: number, n: number, setCell: (i: number) => void) {
  const beat = 60000 / bpm;
  const id = window.setInterval(() => {
    const ms = performance.now() - origin();
    setCell(ms < -beat / 2 || ms > n * beat ? -1 : Math.max(0, Math.floor(ms / beat + 0.5)));
  }, 40);
  signal.addEventListener('abort', () => clearInterval(id), { once: true });
  return () => clearInterval(id);
}

async function hear(c: { item: WalkChart; save: TakeSave; signal: AbortSignal; setCell: (i: number) => void }) {
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  const k = clicksFor(c.item, c.save.bpm, false);
  // the chart once with its roots on the bass (a model line: roots on 1, fifths on 3)
  const beat = 60 / c.save.bpm;
  const ev = compEvents(c.item, c.save.bpm, 0.06);
  let t = 0.06;
  for (const ch of c.item.chords) {
    for (let b = 0; b < ch.beats; b++) ev.push({ midi: 28 + ((((ch.root - 4) % 12) + 12) % 12) + (b === 2 ? 7 : 0), start: t + b * beat, duration: beat * 0.85, velocity: 0.7, inst: 'bass' });
    t += ch.beats * beat;
  }
  let origin = performance.now() + 120;
  const end = follow(c.signal, () => origin, c.save.bpm, chartBeats(c.item), c.setCell);
  void piano.play(ev, k.endAt + 0.6, c.signal).catch(() => {});
  try {
    await piano.playTimeline({ clicks: k.clicks, wood: [], responseAt: 0, responseEnd: k.endAt + 0.3 }, c.signal, undefined, (perf) => {
      origin = perf;
    });
  } finally {
    end();
  }
}

async function take(c: TakeCtx<WalkChart>): Promise<TakeOutcome | 'mic-error' | null> {
  const { item, save, signal, settings, lang } = c;
  const heard: Heard[] = [];
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  if (c.input === 'mic') c.setPhase('open');
  const ok = await listenNotes(signal, c.input, settings, heard, { bass: true, maxMs: 60_000 });
  if (signal.aborted) return null;
  if (!ok) return 'mic-error';
  c.setPhase('play');
  const k = clicksFor(item, save.bpm, true);
  let origin = performance.now() + 120 + k.startAt * 1000;
  const end = follow(signal, () => origin, save.bpm, chartBeats(item), c.setCell);
  void piano.play(compEvents(item, save.bpm, k.startAt + 0.06), k.endAt + 0.8, signal).catch(() => {});
  try {
    await piano.playTimeline({ clicks: k.clicks, wood: [], responseAt: k.startAt, responseEnd: k.endAt + 0.4 }, signal, undefined, (perf) => {
      origin = perf;
    });
  } finally {
    end();
  }
  const played: Played[] = heard.map((h) => ({ ms: h.perf - origin - h.lat, midi: h.midi })).filter((p) => p.ms > -400);
  const g = gradeWalk(item, played, save.bpm);
  const L = lang === 'he';
  const parts = [`${L ? 'בזמן' : 'in time'} ${g.inTime}/${g.marks.length}`, `${L ? 'כללים' : 'rules kept'} ${Math.round(g.ruleKept * 100)}%`];
  if (g.meanOffsetMs !== null && Math.abs(g.meanOffsetMs) > 20) parts.push(`${Math.abs(g.meanOffsetMs)} ms ${g.meanOffsetMs > 0 ? (L ? 'מאחר' : 'late') : L ? 'מקדים' : 'early'}`);
  return { score: g.score, line: parts.join(' · '), marks: g.marks };
}

const RULE_TX: Record<string, { en: string; he: string }> = {
  root: { en: 'root', he: 'שורש' },
  fifth: { en: '5th', he: 'קווינטה' },
  tone: { en: 'chord tone', he: 'צליל אקורד' },
  approach: { en: 'approach', he: 'גישה' },
};

function WalkBoard({ item, save, phase, outcome, cell, lang }: { item: WalkChart; save: TakeSave; phase: TakePhase; outcome: TakeOutcome | null; cell: number; lang: Lang }) {
  const targets = walkTargets(item);
  const r = walkRule(item.level);
  let b = 0;
  return (
    <div className="inst-board">
      <p className="inst-meta">
        <span>{item.name[lang]}</span>
        <span>
          1 · {RULE_TX[r.first][lang]} — 3 · {RULE_TX[r.third][lang]}
          {r.approach ? ` — 4 · ${RULE_TX.approach[lang]}` : ''}
        </span>
      </p>
      <div className="walk-chart" dir="ltr">
        {item.chords.map((ch, ci) => {
          const from = b;
          b += ch.beats;
          return (
            <div key={ci} className="walk-chord" style={{ flexGrow: ch.beats }}>
              <b>{chordName(ch)}</b>
              <div className="walk-beats">
                {Array.from({ length: ch.beats }, (_, k) => {
                  const i = from + k;
                  const t = targets[i];
                  return <span key={k} className={`walk-beat ${t.rule ? 'rule' : ''} ${i === cell && (phase === 'play' || phase === 'hear') ? 'now' : ''} ${phase === 'review' ? (outcome?.marks?.[i] ?? '') : ''}`} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="g2-dim inst-tempo" dir="ltr">♩ = {save.bpm}</p>
    </div>
  );
}

const WALK: TakeGameCfg<WalkChart> = {
  game: 'walkchanges',
  className: 'walkchanges',
  tx: {
    title: { en: 'Walk the Changes', he: 'ללכת על המהלך' },
    blurb: { en: 'Walk quarter notes over the chart with the piano and the click. Each beat counts when it is in time; the marked beats must keep the rule. Four charts, three lives.', he: 'מנגנים קו רבעים מעל המהלך, עם הפסנתר והקליק. כל פעמה נספרת כשהיא בזמן; הפעמות המסומנות צריכות לשמור על הכלל. ארבעה מהלכים, שלושה חיים.' },
    unit: { en: 'Chart', he: 'מהלך' },
    play: { en: 'Walk it', he: 'לנגן' },
    playing: { en: 'Walk — after the count-in', he: 'מנגנים — אחרי הספירה' },
  },
  inputs: ['mic', 'midi'],
  defaultInput: () => 'mic',
  item: (s, i) => walkChart(takeSeed(s, i), s.level),
  hear: (c) => hear(c),
  take,
  board: (p) => <WalkBoard {...p} />,
};

export const WalkTheChanges = (p: GameScreenProps) => <TakeShell cfg={WALK} {...p} />;
