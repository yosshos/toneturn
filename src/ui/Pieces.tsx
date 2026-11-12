// My pieces (SPEC-PIECE, phase B): bring a score (MusicXML or MIDI), set a target tempo, and the coach runs the
// practice — chunk by chunk, tempo step by tempo step, joining as it goes. Pieces live on this device (IndexedDB).

import { useEffect, useMemo, useRef, useState } from 'react';
import { recordTakeAnalysis } from '../storage/analysis';
import { unzipMxl } from '../engine/leadsheet';
import { parseMidi, parseMusicXml, type Piece } from '../engine/piece/score';
import { barMastery, initPlan, maintOf, nextTask, planProgress, recordRep, reviewDue, startDay, type CoachEvent, type PlanState, type Task } from '../engine/piece/coach';
import { barLabel, chunkDrill, repFromTake } from '../engine/piece/toDrill';
import type { TakeMetrics } from '../engine/drills/types';
import { indexedKV, memoryKV, type KV } from '../storage/kv';
import { localDay, type Settings } from '../storage/progress';
import { DrillTake, MarkLegend } from './DrillTake';
import { ScoreView } from './ScoreView';
import { WaitMode } from './WaitMode';
import type { NoteMark } from '../engine/noteMarks';
import { DEFAULT_CAL } from './Drills';
import { inputLatency } from '../engine/latency';
import { midi } from '../speech/midi';

export interface StoredPiece {
  id: string;
  piece: Piece;
  plan: PlanState;
  addedAt: string;
  /** Practice minutes per local day. */
  minutes: Record<string, number>;
}

const kv: KV = (() => {
  try {
    return typeof indexedDB !== 'undefined' ? indexedKV('toneturn-pieces', 'pieces') : memoryKV();
  } catch {
    return memoryKV();
  }
})();
export const loadPieces = async () => (await kv.get<StoredPiece[]>('all')) ?? [];
/** Learned pieces whose spaced review run is due on `day` (SPEC-PIECE §2.10; the workout adds a piece-review block). */
export const piecesDue = (ps: StoredPiece[], day: string) => ps.filter((sp) => reviewDue(sp.plan, day));
const savePieces = (ps: StoredPiece[]) => kv.set('all', ps);

const TX = {
  en: {
    title: 'My pieces', add: 'Add a piece', formats: 'MusicXML (.musicxml, .xml, .mxl) or MIDI (.mid). From MuseScore: File → Export → MusicXML.', none: 'No pieces yet.', bad: 'This file could not be read:',
    setup: 'Set up', target: 'Target tempo', chunk: 'Bars per chunk', backward: 'Start from the end', start: 'Start practicing', back: 'Back', del: 'Delete', progress: 'learned',
    bars: 'bars', tempo: '♩ =', loop: 'Fix this bar', seam: 'The join', join: 'Put it together', warm: 'Warm-up', burst: 'One burst at full tempo', spot: 'The hard spot', chunk1: 'Next part', trouble: 'The bar that keeps tripping you',
    done: 'You can play the whole piece at the target tempo.', again: 'Again', minutes: 'min today',
    review: 'Review run', reviewDue: 'Review due', nextReview: 'Next review',
  },
  he: {
    title: 'היצירות שלי', add: 'להוסיף יצירה', formats: 'MusicXML (‏.musicxml, ‏.xml, ‏.mxl) או MIDI (‏.mid). ממיוזסקור: קובץ ← ייצוא ← MusicXML.', none: 'עדיין אין יצירות.', bad: 'לא ניתן לקרוא את הקובץ:',
    setup: 'הגדרה', target: 'טמפו יעד', chunk: 'תיבות בכל קטע', backward: 'להתחיל מהסוף', start: 'להתחיל להתאמן', back: 'חזרה', del: 'מחיקה', progress: 'נלמד',
    bars: 'תיבות', tempo: '♩ =', loop: 'לתקן את התיבה הזו', seam: 'החיבור', join: 'לחבר הכול', warm: 'חימום', burst: 'פרץ אחד בטמפו המלא', spot: 'המקום הקשה', chunk1: 'החלק הבא', trouble: 'התיבה שחוזרת להכשיל',
    done: 'אתם מנגנים את כל היצירה בטמפו היעד.', again: 'שוב', minutes: 'דק׳ היום',
    review: 'ניגון חזרה', reviewDue: 'חזרה היום', nextReview: 'החזרה הבאה',
  },
};

/** The coach's words for what just happened (one line, the most important event). */
export function coachLine(evs: CoachEvent[], lang: 'en' | 'he', p: Piece, plan: PlanState): string | null {
  const he = lang === 'he';
  const range = (id: string) => {
    const c = plan.chunks.find((x) => x.id === id);
    return c ? barLabel(p, c.from, c.to, lang) : '';
  };
  const pick = ['reviewRun', 'pieceDone', 'fullRun', 'join', 'seam', 'newChunk', 'chunkDone', 'stepBack', 'slower', 'loopDone', 'stepUp', 'burst', 'rest', 'rotate'] as const;
  for (const k of pick) {
    const e = evs.find((x) => x.k === k);
    if (!e) continue;
    switch (e.k) {
      case 'reviewRun':
        if (!e.clean) return he ? 'הניגון נשבר — מחר עוד ניגון חזרה, והתיבות החלשות קודם.' : 'The run broke down — another review run tomorrow, weak bars first.';
        return he ? `ניגון חזרה נקי. החזרה הבאה בעוד ${e.days} ימים.` : `A clean review run. Next review in ${e.days} days.`;
      case 'pieceDone': return he ? 'היצירה נלמדה! שני ניגונים נקיים בטמפו, בשני ימים שונים.' : 'Piece learned: two clean full runs at tempo, on two different days.';
      case 'fullRun': return he ? 'ניגון מלא ונקי בטמפו היעד. עוד אחד ביום אחר — וסיימתם.' : 'A clean full run at target tempo. One more on another day and it is yours.';
      case 'join': return he ? `עכשיו מחברים: ${range(e.chunk)} ברצף.` : `Now put it together: ${range(e.chunk)} in one go.`;
      case 'seam': return he ? `עובדים על החיבור — סוף קטע אחד אל תחילת הבא.` : 'Work the join: the end of one part into the start of the next.';
      case 'newChunk': return he ? `מוסיפים קטע חדש: ${range(e.chunk)}.` : `Adding the next part: ${range(e.chunk)}.`;
      case 'chunkDone': return he ? `${range(e.chunk)} — בטמפו היעד ✓` : `${range(e.chunk)} — at target tempo ✓`;
      case 'stepBack': return he ? `נעצור רגע על ${barLabel(p, e.bar, e.bar, lang)}, לאט יותר (${e.tempo}), עד שתי פעמים נקי.` : `Let's fix ${barLabel(p, e.bar, e.bar, lang)} slower (${e.tempo}) — two clean times.`;
      case 'slower': return he ? `מורידים קצת את הטמפו ל־${e.tempo} — כדי לנגן נכון.` : `Easing the tempo to ${e.tempo} so it stays clean.`;
      case 'loopDone': return he ? 'מתוקן. חוזרים לקטע המלא.' : 'Fixed. Back to the whole part.';
      case 'stepUp': return he ? `שלוש פעמים נקי — עולים ל־${e.tempo}.` : `Three clean in a row — up to ${e.tempo}.`;
      case 'burst': return he ? 'עכשיו פרץ קצר אחד בטמפו המלא — רק התיבה הראשונה.' : 'Now one short burst at full tempo — just the first bar.';
      case 'rest': return he ? 'הדיוק יורד — זה זמן טוב להפסקה קצרה.' : 'Accuracy is slipping — a good moment for a short break.';
      case 'rotate': return he ? `מתחלפים: ${range(e.chunk)}.` : `Switching to ${range(e.chunk)}.`;
    }
  }
  return null;
}

export function PiecesScreen({ settings, onBack, onMinutes }: { settings: Settings; onBack: () => void; onMinutes: (minutes: number, cleanReps: number) => void }) {
  const lang = settings.uiLang;
  const tx = TX[lang];
  const [pieces, setPieces] = useState<StoredPiece[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ piece: Piece; target: number; size: number; backward: boolean } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    void loadPieces().then(setPieces);
  }, []);
  const update = (sp: StoredPiece) =>
    setPieces((ps) => {
      const next = (ps ?? []).map((x) => (x.id === sp.id ? sp : x));
      void savePieces(next);
      return next;
    });
  const importFile = async (f: File) => {
    setErr(null);
    try {
      const name = f.name.replace(/\.[^.]+$/, '');
      const bytes = new Uint8Array(await f.arrayBuffer());
      const zip = bytes[0] === 0x50 && bytes[1] === 0x4b; // .mxl is a zip
      const piece = /\.(mid|midi)$/i.test(f.name) ? parseMidi(bytes, name) : parseMusicXml(zip ? await unzipMxl(bytes) : new TextDecoder().decode(bytes));
      if (piece.title === 'Untitled') piece.title = name;
      if (!piece.notes.length) throw new Error('no notes');
      setSetup({ piece, target: Math.round(piece.tempo ?? 100), size: 4, backward: false });
    } catch (e) {
      setErr(`${tx.bad} ${f.name} — ${(e as Error).message}`);
    }
  };
  const begin = () => {
    if (!setup) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const sp: StoredPiece = { id, piece: setup.piece, plan: initPlan(setup.piece, { target: setup.target, chunkBars: setup.size, backward: setup.backward }, localDay(new Date())), addedAt: new Date().toISOString(), minutes: {} };
    const next = [sp, ...(pieces ?? [])];
    setPieces(next);
    void savePieces(next);
    setSetup(null);
    setOpen(id);
  };
  const cur = pieces?.find((p) => p.id === open);
  if (cur) return <PiecePractice settings={settings} sp={cur} onSave={update} onBack={() => setOpen(null)} onMinutes={onMinutes} />;

  if (setup)
    return (
      <main className="panel-screen pieces" data-piece-setup="1">
        <header className="screen-head">
          <button className="icon-btn" onClick={() => setSetup(null)} aria-label={tx.back}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{tx.setup}</h1>
        </header>
        <section className="set-card">
          <h2 dir="auto">{setup.piece.title}</h2>
          <p className="field-hint">
            {setup.piece.composer ? `${setup.piece.composer} · ` : ''}
            {setup.piece.bars.length} {tx.bars}
          </p>
          <label className="pc-field">
            <span>{tx.target}</span>
            <span className="ch-step" dir="ltr">
              <button className="icon-btn" onClick={() => setSetup({ ...setup, target: Math.max(30, setup.target - 4) })}>
                −
              </button>
              <b>{setup.target}</b>
              <button className="icon-btn" onClick={() => setSetup({ ...setup, target: Math.min(240, setup.target + 4) })}>
                +
              </button>
            </span>
          </label>
          <div className="pc-field">
            <span>{tx.chunk}</span>
            <span className="chips">
              {[2, 4, 8].map((n) => (
                <button key={n} className={`chip ${setup.size === n ? 'on' : ''}`} onClick={() => setSetup({ ...setup, size: n })}>
                  {n}
                </button>
              ))}
            </span>
          </div>
          <label className="pc-field">
            <span>{tx.backward}</span>
            <input type="checkbox" checked={setup.backward} onChange={(e) => setSetup({ ...setup, backward: e.target.checked })} />
          </label>
          <button className="btn mega" onClick={begin} data-piece-start="1">
            {tx.start}
          </button>
        </section>
      </main>
    );

  return (
    <main className="panel-screen pieces" data-pieces="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx.title}</h1>
      </header>
      <label className="btn pc-add">
        + {tx.add}
        <input type="file" accept=".musicxml,.xml,.mxl,.mid,.midi,application/vnd.recordare.musicxml,application/vnd.recordare.musicxml+xml,audio/midi" hidden onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])} data-piece-file="1" />
      </label>
      <p className="field-hint">{tx.formats}</p>
      {err && <p className="field-hint ch-err">{err}</p>}
      {pieces && !pieces.length && <p className="field-hint">{tx.none}</p>}
      <ul className="ch-list pc-list">
        {(pieces ?? []).map((sp) => {
          const pr = planProgress(sp.plan, sp.piece.bars.length);
          return (
            <li key={sp.id}>
              <button className="ch-row" onClick={() => setOpen(sp.id)} data-piece-open={sp.id}>
                <span className="pc-name">
                  <b dir="auto">{sp.piece.title}</b>
                  <span className="dt-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round(pr * 100)}%` }} />
                  </span>
                </span>
                {reviewDue(sp.plan, localDay(new Date())) ? (
                  <small className="pc-due" data-piece-due={sp.id}>
                    {tx.reviewDue}
                  </small>
                ) : (
                  <small dir="ltr">
                    {Math.round(pr * 100)}% {tx.progress}
                  </small>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function PiecePractice({ settings, sp, onSave, onBack, onMinutes }: { settings: Settings; sp: StoredPiece; onSave: (sp: StoredPiece) => void; onBack: () => void; onMinutes: (minutes: number, cleanReps: number) => void }) {
  const lang = settings.uiLang;
  const tx = TX[lang];
  const p = sp.piece;
  const [plan, setPlan] = useState<PlanState>(() => startDay(sp.plan, localDay(new Date())));
  const [line, setLine] = useState<string | null>(null);
  const [last, setLast] = useState<TakeMetrics | null>(null);
  const [lastTask, setLastTask] = useState<Task | null>(null);
  const t0 = useRef(Date.now());
  const clean = useRef(0);
  // score cursor: beat steps from the take, smoothed between beats
  const [cursor, setCursor] = useState<number | null>(null);
  const [marks, setMarks] = useState<Map<number, NoteMark> | undefined>(undefined);
  const [wait, setWait] = useState(false);
  const beatAt = useRef<{ beat: number; t: number } | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const b = beatAt.current;
      if (!b || !task) return;
      const beatMs = 60000 / task.tempo;
      setCursor(b.beat + Math.min(1, (performance.now() - b.t) / beatMs));
    }, 50);
    return () => clearInterval(id);
  });
  const task = nextTask(plan);
  const drill = useMemo(() => (task ? chunkDrill(p, sp.id, task.from, task.to, task.tempo) : null), [p, sp.id, task?.from, task?.to, task?.tempo]); // eslint-disable-line react-hooks/exhaustive-deps
  const mastery = useMemo(() => barMastery(plan, p.bars.length), [plan, p.bars.length]);
  const cal = { ...DEFAULT_CAL, ...(settings.drillCal ?? {}), latencyMs: inputLatency(settings, midi.devices.length ? 'midi' : 'mic') };
  const leave = () => {
    const min = Math.round((Date.now() - t0.current) / 60000);
    const day = localDay(new Date());
    onSave({ ...sp, plan, minutes: { ...sp.minutes, [day]: (sp.minutes[day] ?? 0) + min } });
    if (min >= 1) onMinutes(min, clean.current);
    onBack();
  };
  const onTake = (m: TakeMetrics) => {
    if (!task) return;
    if (drill) void recordTakeAnalysis(drill, m, task.tempo);
    const res = repFromTake(p, task.from, m);
    const r = recordRep(plan, task, res, new Date());
    if (r.state.log[r.state.log.length - 1]?.clean) clean.current++;
    setPlan(r.state);
    setLast(m);
    setLastTask(task);
    setLine(coachLine(r.events, lang, p, r.state));
    onSave({ ...sp, plan: r.state });
    beatAt.current = null;
    setCursor(null);
    // colour the notes of the take on the score
    const mk = new Map<number, NoteMark>();
    const s0 = p.bars[task.from]?.start ?? 0;
    for (const nr of m.perNote) {
      const abs = nr.exp.beat + s0;
      const idx = p.notes.findIndex((n) => n.midi === nr.exp.pitch && Math.abs(n.start - abs) < 1e-3);
      if (idx >= 0) mk.set(idx, nr.ok ? 'ok' : nr.played ? 'wrong' : 'missed');
    }
    setMarks(mk);
  };
  const kindLabel = (t: Task) => (t.kind === 'review' ? tx.review : t.kind === 'trouble' ? tx.trouble : t.kind === 'loop' ? tx.loop : t.kind === 'seam' ? tx.seam : t.kind === 'join' ? tx.join : t.kind === 'warm' ? tx.warm : t.kind === 'burst' ? tx.burst : t.kind === 'spot' ? tx.spot : tx.chunk1);
  return (
    <main className="panel-screen pieces pc-practice" data-piece-practice={sp.id}>
      <header className="screen-head">
        <button className="icon-btn" onClick={leave} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1 dir="auto">{p.title}</h1>
      </header>
      <div className="pc-heat" dir="ltr" aria-label={`${Math.round(planProgress(plan, p.bars.length) * 100)}% ${tx.progress}`}>
        {mastery.map((x, i) => (
          <span key={i} className={task && i >= task.from && i <= task.to ? 'now' : ''} style={{ ['--m' as string]: x }} title={p.bars[i].number} />
        ))}
      </div>
      {!task || !drill ? (
        <section className="set-card">
          {line && <p className="pc-coach">{line}</p>}
          <p>{tx.done}</p>
          {maintOf(plan) && (
            <p className="field-hint" data-next-review={maintOf(plan)!.due}>
              {tx.nextReview}: <span dir="ltr">{maintOf(plan)!.due}</span>
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="pc-task">
            <b>{kindLabel(task)}</b>
            <span dir="ltr">
              {barLabel(p, task.from, task.to, lang)} · {tx.tempo} {task.tempo}
              <small> / {plan.target}</small>
            </span>
          </div>
          {line && (
            <p className="pc-coach" aria-live="polite">
              {line}
            </p>
          )}
          <ScoreView
            piece={p}
            cursorBeat={cursor === null ? null : cursor + (p.bars[task.from]?.start ?? 0)}
            activeBar={cursor === null ? null : Math.min(task.to, p.bars.findIndex((b) => b.start + b.beats > cursor + (p.bars[task.from]?.start ?? 0)))}
            rangeFrom={task.from}
            rangeTo={task.to}
            marks={last && lastTask && lastTask.from === task.from && lastTask.to === task.to ? marks : undefined}
          />
          {last && <MarkLegend lang={lang} />}
          <label className="pc-wait">
            <input type="checkbox" checked={wait} onChange={(e) => (setWait(e.target.checked), setCursor(null))} data-wait-toggle="1" /> {lang === 'he' ? 'מצב המתנה (בלי טמפו)' : 'Wait mode (no tempo)'}
          </label>
          {wait ? (
            <WaitMode
              key={`w-${task.from}-${task.to}`}
              piece={p}
              from={task.from}
              to={task.to}
              lang={lang}
              onCursor={(b) => setCursor(b)}
              onMarks={setMarks}
              onDone={() => setCursor(null)}
            />
          ) : (
            <DrillTake
              key={`${task.chunk}-${task.kind}-${task.tempo}-${plan.log.length}`}
              drill={drill}
              bpm={task.tempo}
              lang={lang}
              cal={cal}
              onBeat={(b) => (beatAt.current = b >= 0 ? { beat: b, t: performance.now() } : null)}
              onDone={(m) => onTake(m)}
            />
          )}
        </>
      )}
    </main>
  );
}
