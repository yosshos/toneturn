// Teacher phrase assignments (SPEC-PHRASE-STUDIO §11; screens docs/phrase-studio-preview slides 14–15).
//  · #/teach/new/<classId> — the teacher's sheet: play it now on MIDI (auto start / stop) or pick one of my phrases,
//    trim to ≤ 16 bars, set the target tempo, keys (all / home only / some), hands, due date, strictness, the band,
//    a note; behind "More": start tempo, order, attach my audio (once the server has the bucket). One phone screen.
//  · #/teach/a/<assignmentId> — the student's assignment: the teacher's playing first, the locked fields with a lock,
//    progress in the required keys, the teacher's latest word, Continue → the Encore run in the next key.
//  · TeacherPhraseTodayCard — Today shows the assignment first while it is due.
// The sheet keeps its place after every change (owner rule: never lose progress).

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import '../encore.css';
import '../teachphrase.css';
import type { ItemState } from '../engine/drills/types';
import type { Lick, LickBook, LickInstrument } from '../engine/licks';
import { lickInstrumentOf } from './LickTrainer';
import type { Settings } from '../storage/progress';
import { midi } from '../speech/midi';
import { piano } from './services';
import { loadSlot, saveSlot, clearSlot } from '../storage/resume';
import { phrasesOf } from '../engine/encore/connect';
import { finalHand, handsOf, keyOrder, nextKey, passedKeys, phraseBars, planOf, twoHands } from '../engine/encore/phrase';
import { ladderStep } from '../engine/drills/ladder';
import type { RawNote } from '../engine/encore/takeSource';
import {
  assignmentOf,
  assignProblem,
  assignTitle,
  defaultAssignPlan,
  encodePhraseRef,
  MAX_TEACHER_BARS,
  phraseEvents,
  phraseFromPlaying,
  phraseInstOf,
  phraseSeconds,
  refBytes,
  requiredKeys,
  trimBars,
  type PhraseAssignPlan,
  type Strictness,
} from '../engine/encore/assign';
import { assignAudioUrl, assignItem, phraseRefLimit, PHRASE_ASSIGN_SYNCED, uploadAssignAudio } from '../cloud/teacher';
import { cachedTeacherPhrases, refreshTeacherPhrases, sentKeysOf, subscribeTeacherPhrases, type CachedPhraseAssign } from './teacherPhraseSync';
import { PianoRoll, type RollNote } from './encore/PianoRoll';
import { Bi, KeyB, Seg, Tempo, kName, type Lang } from './encore/bits';
import { Icon } from './icons';
import { intlTag } from '../i18n/translate';

const TX = {
  en: {
    newTitle: 'New assignment', phrase: 'Phrase', play: 'Play it now', mine: 'From my phrases', listen: 'Play when you like — it stops after 2.5 s of silence.',
    caught: 'Caught', bars: 'bars', barsLbl: 'Bars', hear: 'Listen', again: 'Record again', none: 'No phrases yet.', midiHint: 'Connect a MIDI keyboard and turn MIDI on in Settings.',
    goal: 'Target ♩', keys: 'Keys', all12: 'All 12', homeOnly: 'Home key', pick: 'Pick', hands: 'Hands', due: 'Due', strict: 'Strictness', lenient: 'Lenient', moderate: 'Moderate', strictS: 'Strict',
    band: 'With the band at the target', note: 'A note to the class', more: 'More options', less: 'Fewer options', start: 'Start ♩', order: 'Order', easiest: 'Easiest first', fourths: 'Cycle of 4ths', chromatic: 'Chromatic',
    audio: 'Attach my audio', audioLater: 'Audio can be attached after the server update.', assign: 'Assign', sent: 'Assigned.', size: 'note data', tooLong: 'Too long for the server now — trim to fewer bars.', maxBars: `Up to ${MAX_TEACHER_BARS} bars.`,
    R: 'Right hand', L: 'Left hand', RL: 'Hands together', 'R-then-RL': 'One hand, then together', close: 'Close',
    task: 'Assignment', fromTeacher: 'From the teacher', until: 'due', teachersPlaying: "The teacher's playing", progress: 'Progress', of: 'of', next: 'Next', said: 'Teacher', cont: 'Continue', done: 'Every key passed — sent to the teacher.',
    subs: 'Sent', missing: 'This assignment is not on this device yet.', refresh: 'Refresh', locked: 'set by the teacher', back: 'Back', stop: 'Stop',
    inst: 'Instrument', piano: 'Piano', guitar: 'Guitar', bass: 'Bass', voice: 'Voice', instHint: 'Each student plays it in their own position or range.',
  },
  he: {
    newTitle: 'משימה חדשה', phrase: 'משפט', play: 'לנגן עכשיו', mine: 'מהמשפטים שלי', listen: 'נגנו כשתרצו — נעצר אחרי 2.5 שניות של שקט.',
    caught: 'נקלט', bars: 'תיבות', barsLbl: 'תיבות', hear: 'להשמיע', again: 'לנגן שוב', none: 'עוד אין משפטים.', midiHint: 'חברו מקלדת MIDI והדליקו MIDI בהגדרות.',
    goal: 'טמפו יעד', keys: 'סולמות', all12: 'כל 12', homeOnly: 'רק הבית', pick: 'לבחור', hands: 'ידיים', due: 'עד', strict: 'קפדנות', lenient: 'מקלה', moderate: 'בינונית', strictS: 'קפדנית',
    band: 'ביעד עם הלהקה', note: 'הערה לכיתה', more: 'עוד אפשרויות', less: 'פחות אפשרויות', start: 'טמפו התחלה', order: 'סדר', easiest: 'קל קודם', fourths: 'מעגל הקוורטות', chromatic: 'כרומטי',
    audio: 'לצרף את השמע שלי', audioLater: 'צירוף שמע יתאפשר אחרי עדכון השרת.', assign: 'להטיל', sent: 'הוטל.', size: 'נתוני תווים', tooLong: 'ארוך מדי לשרת כרגע — קצרו לפחות תיבות.', maxBars: `עד ${MAX_TEACHER_BARS} תיבות.`,
    R: 'יד ימין', L: 'יד שמאל', RL: 'שתי ידיים', 'R-then-RL': 'יד אחת ואז יחד', close: 'סגירה',
    task: 'משימה', fromTeacher: 'מהמורה', until: 'עד', teachersPlaying: 'הנגינה של המורה', progress: 'ההתקדמות', of: 'מתוך', next: 'הבא', said: 'המורה', cont: 'להמשיך', done: 'כל הסולמות עברו — נשלח למורה.',
    subs: 'נשלחו', missing: 'המשימה עוד לא במכשיר הזה.', refresh: 'לרענן', locked: 'נקבע על ידי המורה', back: 'חזרה', stop: 'לעצור',
    inst: 'כלי', piano: 'פסנתר', guitar: 'גיטרה', bass: 'בס', voice: 'קול', instHint: 'כל תלמיד מנגן בפוזיציה או במנעד שלו.',
  },
};

const mod = (n: number) => ((n % 12) + 12) % 12;
const SILENCE_MS = 2500;

function LockGlyph() {
  return <Icon k="lock" size={11} className="tp-lock" />;
}
function PlayGlyph({ on }: { on: boolean }) {
  return <Icon k={on ? 'pause' : 'play'} size={16} />;
}
function AgainGlyph() {
  return <Icon k="again" size={16} />;
}

/** Roll notes of a phrase (beats from its first bar). */
const rollOf = (l: Pick<Lick, 'notes' | 'lh' | 'homeKey'>): RollNote[] => {
  const t = 60 + mod(l.homeKey ?? 0) - (mod(l.homeKey ?? 0) > 5 ? 12 : 0);
  return [...l.notes.map(([s, b, d]) => ({ midi: t + s, beat: b, dur: d, hand: 'R' as const })), ...(l.lh ?? []).map(([s, b, d]) => ({ midi: t - 12 + s, beat: b, dur: d, hand: 'L' as const }))];
};

/** Play events with the app's piano; returns a stop. */
function usePlayer() {
  const ctl = useRef<AbortController | null>(null);
  const [on, setOn] = useState(false);
  const stop = () => {
    ctl.current?.abort();
    ctl.current = null;
    setOn(false);
  };
  const play = async (evs: { midi: number; start: number; duration: number; velocity: number }[], secs: number) => {
    stop();
    const c = new AbortController();
    ctl.current = c;
    setOn(true);
    try {
      await piano.unlock();
      await piano.play(evs, secs + 0.3, c.signal);
    } catch {
      /* stopped */
    }
    if (ctl.current === c) stop();
  };
  useEffect(() => () => ctl.current?.abort(), []);
  return { on, play, stop };
}

// ───────────────────────────── the teacher's sheet ─────────────────────────────

interface SheetState {
  src: 'play' | 'mine';
  notes: RawNote[];
  pick: string;
  from: number;
  to: number;
  goal: number | null;
  keys: 'all' | 'home' | 'pick';
  picked: number[];
  hands: PhraseAssignPlan['hands'] | null;
  due: string;
  strict: Strictness;
  band: boolean;
  note: string;
  start: number | null;
  order: PhraseAssignPlan['order'];
  attach: boolean;
  /** The instrument the class plays it on (null = the phrase's own, else the teacher's course instrument). */
  inst?: LickInstrument | null;
}
const freshSheet = (): SheetState => ({ src: 'play', notes: [], pick: '', from: 0, to: MAX_TEACHER_BARS, goal: null, keys: 'all', picked: [], hands: null, due: '', strict: 'moderate', band: false, note: '', start: null, order: 'easiest', attach: false });

export function TeachPhraseSheet({ lang, classId, settings, onBack, onDone }: { lang: Lang; classId: string; settings: Settings; onBack: () => void; onDone?: () => void }) {
  const tx = TX[lang];
  const slotKey = `teach:phrase:${classId}`;
  const [s, setS] = useState<SheetState>(() => ({ ...freshSheet(), ...(loadSlot<SheetState>(slotKey)?.data ?? {}) }));
  const set = (p: Partial<SheetState>) =>
    setS((x) => {
      const n = { ...x, ...p };
      saveSlot(slotKey, { title: lang === 'he' ? 'משימה חדשה · משפט' : 'New assignment · phrase', route: `teach/new/${classId}`, done: 0, total: 1, data: n });
      return n;
    });
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const player = usePlayer();
  const mine = useMemo(() => phrasesOf(settings.lickBook), [settings.lickBook]);

  // ── recording on MIDI (auto start on the first note, auto stop after 2.5 s of silence) ──
  const [live, setLive] = useState<RawNote[]>([]);
  const t0 = useRef(0);
  const last = useRef(0);
  const held = useRef(new Map<number, RawNote>());
  const buf = useRef<RawNote[]>([]);
  const armed = s.src === 'play' && s.notes.length === 0;
  const mic = useRef<{ rec: MediaRecorder; chunks: Blob[]; stream: MediaStream } | null>(null);
  const audioBlob = useRef<Blob | null>(null);
  useEffect(() => {
    if (!armed) return;
    t0.current = 0;
    buf.current = [];
    held.current.clear();
    const off = midi.onNote((m, on, at, vel) => {
      if (on) {
        if (!t0.current) {
          t0.current = at;
          if (mic.current && mic.current.rec.state === 'inactive') mic.current.rec.start();
        }
        const n: RawNote = { pitch: m, on: at - t0.current, off: null, vel };
        buf.current.push(n);
        held.current.set(m, n);
      } else {
        const n = held.current.get(m);
        if (n) n.off = at - t0.current;
        held.current.delete(m);
      }
      last.current = at;
      setLive([...buf.current]);
    });
    const id = window.setInterval(() => {
      if (!t0.current) return;
      const t = performance.now();
      if ((held.current.size === 0 && t - last.current > SILENCE_MS) || t - t0.current > 120_000) {
        const ns = buf.current.map((n) => ({ ...n, off: n.off ?? t - t0.current }));
        t0.current = 0;
        if (mic.current?.rec.state === 'recording') mic.current.rec.stop();
        if (ns.length >= 3) set({ notes: ns, from: 0, to: MAX_TEACHER_BARS, goal: null, hands: null });
        buf.current = [];
        setLive([]);
      }
    }, 120);
    return () => (off(), window.clearInterval(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);
  // the teacher's audio (only once the server keeps it): a mic recorder that starts with the first note
  useEffect(() => {
    if (!s.attach || !PHRASE_ASSIGN_SYNCED || !armed || !navigator.mediaDevices?.getUserMedia) return;
    let live = true;
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (!live) return stream.getTracks().forEach((t) => t.stop());
      const chunks: Blob[] = [];
      let rec: MediaRecorder;
      try {
        rec = new MediaRecorder(stream, { audioBitsPerSecond: 48_000 });
      } catch {
        rec = new MediaRecorder(stream);
      }
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        audioBlob.current = chunks.length ? new Blob(chunks, { type: chunks[0].type }) : null;
        stream.getTracks().forEach((t) => t.stop());
      };
      mic.current = { rec, chunks, stream };
    });
    return () => {
      live = false;
      if (mic.current?.rec.state === 'inactive') mic.current.stream.getTracks().forEach((t) => t.stop());
    };
  }, [s.attach, armed]);

  // ── the phrase: caught from the notes, or one of mine; then the bars ──
  const caught = useMemo(() => (s.src === 'play' && s.notes.length >= 3 ? phraseFromPlaying(s.notes) : null), [s.src, s.notes]);
  const base: Lick | null = s.src === 'play' ? (caught?.l ?? null) : (mine.find((l) => l.id === s.pick) ?? mine[0] ?? null);
  const inst: LickInstrument = s.inst ?? (s.src === 'mine' && base?.instrument ? base.instrument : lickInstrumentOf(settings));
  const total = base ? phraseBars(base) : 0;
  const lo = Math.max(0, Math.min(s.from, Math.max(0, total - 1)));
  const hi = Math.max(lo + 1, Math.min(s.to, total, lo + MAX_TEACHER_BARS));
  const l = base ? trimBars(base, lo, hi) : null;
  const def = l ? defaultAssignPlan(l) : null;
  const goal = s.goal ?? def?.goalBpm ?? 100;
  const home = l?.homeKey ?? 0;
  // hands are a piano matter: off the piano the phrase is one line
  const two = l && inst === 'piano' ? twoHands(l) : false;
  const hands = two ? (s.hands ?? def?.hands ?? 'R-then-RL') : l && !l.notes.length ? 'L' : 'R';
  const keys: PhraseAssignPlan['keys'] = s.keys === 'all' ? 'all' : s.keys === 'home' ? [home] : s.picked.length ? s.picked : [home];
  const plan: PhraseAssignPlan = { goalBpm: goal, ...(s.start ? { startBpm: Math.min(s.start, goal) } : {}), keys, order: s.order, hands, band: s.band };
  const teacherName = settings.nickname?.trim() || undefined;
  const a = l ? assignmentOf(l, plan, { teacher: teacherName, lang, inst }) : null;
  const ref = a ? encodePhraseRef(a) : '';
  const problem = a ? assignProblem(a, phraseRefLimit()) : 'empty';

  const go = async () => {
    if (!a || problem) return;
    setBusy(true);
    setMsg(null);
    try {
      const audio = s.attach && audioBlob.current ? await uploadAssignAudio(classId, audioBlob.current).catch(() => null) : null;
      const finalRef = audio ? encodePhraseRef({ ...a, audio }) : ref;
      await assignItem({ classId, kind: 'phrase', ref: finalRef, dueOn: s.due || null, strictness: s.strict, targetBpm: goal, note: s.note.trim() || null });
      clearSlot(slotKey);
      setS(freshSheet());
      setMsg(tx.sent);
      // a teacher who is also in the class (or the dev mock) sees it at once
      void refreshTeacherPhrases().catch(() => {});
      onDone?.();
    } catch (e) {
      setMsg(/too long/.test(String(e)) ? tx.tooLong : String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };
  const stepGoal = (d: number) => set({ goal: Math.max(30, Math.min(400, goal + d * ladderStep(goal))) });
  const rollNotes: RollNote[] = armed ? live.map((n) => ({ midi: n.pitch, beat: n.on / 500, dur: Math.max(0.15, ((n.off ?? n.on + 250) - n.on) / 500) })) : l ? rollOf(l) : [];
  const rollTo = armed ? Math.max(8, ...rollNotes.map((n) => n.beat + n.dur)) : l ? phraseBars(l) * (l.meter ?? 4) : 8;

  return (
    <main className="panel-screen enc-screen tp-screen" data-teach="new" data-teach-problem={problem ?? ''} data-teach-bytes={ref ? refBytes(ref) : 0}>
      <header className="screen-head enc-head">
        <button className="icon-btn" onClick={() => (player.stop(), onBack())} aria-label={tx.close}>
          <span aria-hidden="true">×</span>
        </button>
        <h1>
          {tx.newTitle}
          <small className="enc-sub">{tx.phrase}</small>
        </h1>
      </header>
      <Seg value={s.src} label={tx.phrase} onChange={(k) => set({ src: k, from: 0, to: MAX_TEACHER_BARS, goal: null, hands: null })} options={[{ k: 'play', t: tx.play }, { k: 'mine', t: tx.mine }]} />
      <div className="enc-card tp-cap">
        {s.src === 'mine' &&
          (mine.length ? (
            <select className="tp-select" value={base?.id ?? ''} onChange={(e) => set({ pick: e.target.value, from: 0, to: MAX_TEACHER_BARS, goal: null, hands: null })} aria-label={tx.mine} data-teach-pick="1">
              {mine.map((p) => (
                <option key={p.id} value={p.id}>
                  {typeof p.name === 'string' ? p.name : p.name[lang]}
                </option>
              ))}
            </select>
          ) : (
            <p className="t3">{tx.none}</p>
          ))}
        <PianoRoll notes={rollNotes} from={0} to={rollTo} meter={l?.meter ?? 4} height={84} barNums={!armed} label={tx.phrase} />
        {armed ? (
          <p className="t3" data-teach-armed="1">
            <span className={`enc-recdot ${live.length ? 'on' : ''}`} aria-hidden="true" /> {tx.listen}
            {!midi.devices.length && <> {tx.midiHint}</>}
          </p>
        ) : l ? (
          <div className="row tp-caught" data-teach-caught={hi - lo}>
            <span className="t3 grow">
              {tx.caught}: <bdi dir="ltr">{hi - lo}</bdi> {tx.bars} · <KeyB k={home} minor={!!l.minor} /> · <Tempo bpm={caught?.bpm ?? l.playedBpm ?? goal} />
            </span>
            <button className="icon-btn small" onClick={() => (player.on ? player.stop() : void player.play(phraseEvents(assignmentOf(l, plan)), phraseSeconds(assignmentOf(l, plan))))} aria-label={tx.hear} data-teach-hear="1">
              <PlayGlyph on={player.on} />
            </button>
            {s.src === 'play' && (
              <button className="icon-btn small" onClick={() => (player.stop(), set({ notes: [] }))} aria-label={tx.again} data-teach-again="1">
                <AgainGlyph />
              </button>
            )}
          </div>
        ) : null}
        {l && total > 1 && (
          <div className="row tp-bars" dir="ltr">
            <small className="t3">{tx.barsLbl}</small>
            <Stepper value={lo + 1} min={1} max={hi} onChange={(v) => set({ from: v - 1, to: Math.max(hi, v) })} label={tx.barsLbl} />
            <span className="t3">–</span>
            <Stepper value={hi} min={lo + 1} max={Math.min(total, lo + MAX_TEACHER_BARS)} onChange={(v) => set({ from: lo, to: v })} label={tx.barsLbl} />
            <small className="tiny">{tx.maxBars}</small>
          </div>
        )}
      </div>

      <div className="enc-card tp-kv">
        <div className="tp-row" title={tx.instHint}>
          <span>{tx.inst}</span>
          <select value={inst} onChange={(e) => set({ inst: e.target.value as LickInstrument })} aria-label={tx.inst} data-teach-inst={inst}>
            {(['piano', 'guitar', 'bass', 'voice'] as const).map((k) => (
              <option key={k} value={k}>
                {tx[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="tp-row">
          <span>{tx.goal}</span>
          <span className="row" dir="ltr">
            <button className="icon-btn small" onClick={() => stepGoal(-1)} aria-label="−" data-teach-goal-minus="1">
              <Icon k="minus" />
            </button>
            <b data-teach-goal={goal}>♩{goal}</b>
            <button className="icon-btn small" onClick={() => stepGoal(1)} aria-label="+" data-teach-goal-plus="1">
              <Icon k="plus" />
            </button>
          </span>
        </div>
        <div className="tp-row">
          <span>{tx.keys}</span>
          <span className="row">
            {(['all', 'home', 'pick'] as const).map((k) => (
              <button key={k} className={`ch ${s.keys === k ? 'on' : ''}`} onClick={() => set({ keys: k, picked: k === 'pick' && !s.picked.length ? [home] : s.picked })} data-teach-keys={k}>
                {k === 'all' ? tx.all12 : k === 'home' ? <KeyB k={home} minor={!!l?.minor} /> : tx.pick}
              </button>
            ))}
          </span>
        </div>
        {s.keys === 'pick' && (
          <div className="tp-ring" dir="ltr" role="group" aria-label={tx.keys}>
            {[0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5].map((k) => {
              const on = s.picked.includes(k);
              return (
                <button key={k} className={`tp-k ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => set({ picked: on ? s.picked.filter((x) => x !== k) : [...s.picked, k] })} data-teach-key={k}>
                  {kName(k)}
                </button>
              );
            })}
          </div>
        )}
        {two && (
          <div className="tp-row">
            <span>{tx.hands}</span>
            <select value={hands} onChange={(e) => set({ hands: e.target.value as PhraseAssignPlan['hands'] })} aria-label={tx.hands}>
              {(['R-then-RL', 'RL', 'R', 'L'] as const).map((h) => (
                <option key={h} value={h}>
                  {tx[h]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="tp-row">
          <span>{tx.due}</span>
          <input type="date" value={s.due} onChange={(e) => set({ due: e.target.value })} aria-label={tx.due} data-teach-due="1" />
        </div>
        <div className="tp-row">
          <span>{tx.strict}</span>
          <Seg value={s.strict} label={tx.strict} onChange={(k) => set({ strict: k })} options={[{ k: 'lenient', t: tx.lenient }, { k: 'moderate', t: tx.moderate }, { k: 'strict', t: tx.strictS }]} />
        </div>
        <label className="tp-row">
          <span>{tx.band}</span>
          <input type="checkbox" className="enc-tog" checked={s.band} onChange={(e) => set({ band: e.target.checked })} data-teach-band="1" />
        </label>
        {more && (
          <>
            <div className="tp-row">
              <span>{tx.start}</span>
              <input type="number" min={30} max={goal} inputMode="numeric" dir="ltr" value={s.start ?? ''} placeholder={String(Math.round(goal * 0.6))} onChange={(e) => set({ start: e.target.value ? Number(e.target.value) : null })} aria-label={tx.start} />
            </div>
            <div className="tp-row">
              <span>{tx.order}</span>
              <select value={s.order} onChange={(e) => set({ order: e.target.value as PhraseAssignPlan['order'] })} aria-label={tx.order}>
                <option value="easiest">{tx.easiest}</option>
                <option value="fourths">{tx.fourths}</option>
                <option value="chromatic">{tx.chromatic}</option>
              </select>
            </div>
            <label className="tp-row">
              <span>{tx.audio}</span>
              <input type="checkbox" className="enc-tog" checked={s.attach && PHRASE_ASSIGN_SYNCED} disabled={!PHRASE_ASSIGN_SYNCED} onChange={(e) => set({ attach: e.target.checked })} />
            </label>
            {!PHRASE_ASSIGN_SYNCED && <small className="tiny">{tx.audioLater}</small>}
          </>
        )}
      </div>
      <input className="tp-note" value={s.note} maxLength={300} onChange={(e) => set({ note: e.target.value })} placeholder={tx.note} aria-label={tx.note} data-teach-note="1" />
      <div className="enc-foot">
        <div className="row">
          <button className="link tiny" onClick={() => setMore((x) => !x)} data-teach-more="1">
            {more ? tx.less : tx.more}
          </button>
          <span className="grow" />
          {ref && (
            <small className="tiny" data-teach-size="1">
              {tx.size} <bdi dir="ltr">{(refBytes(ref) / 1024).toFixed(1)} KB</bdi>
            </small>
          )}
        </div>
        {msg && (
          <p className="t3" role="status" data-teach-msg="1">
            {msg}
          </p>
        )}
        {problem === 'size' && <p className="t3">{tx.tooLong}</p>}
        <button className="btn primary enc-full" disabled={busy || !!problem} onClick={() => void go()} data-teach-assign="1">
          {tx.assign}
        </button>
      </div>
    </main>
  );
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <span className="tp-step" role="group" aria-label={label} dir="ltr">
      <button className="icon-btn small" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="−">
        <Icon k="minus" />
      </button>
      <b>{value}</b>
      <button className="icon-btn small" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="+">
        <Icon k="plus" />
      </button>
    </span>
  );
}

// ───────────────────────────── the student ─────────────────────────────

function useCached(): CachedPhraseAssign[] {
  const [list, setList] = useState(cachedTeacherPhrases);
  useEffect(() => subscribeTeacherPhrases(() => setList(cachedTeacherPhrases())), []);
  return list;
}
const dueText = (iso: string | null, lang: Lang) => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(intlTag(lang === 'he' ? 'he' : 'en', 'en-GB'), { weekday: 'short', day: 'numeric', month: 'numeric' });
};

/** Progress of a teacher phrase: required keys, passed among them, the next key. */
function progressOf(l: Lick | undefined, items: Record<string, ItemState>, sent: number[]) {
  if (!l) return null;
  const req = requiredKeys(l);
  const passed = new Set([...passedKeys(l, items, phraseInstOf(l), finalHand(l)), ...sent]);
  const done = req.filter((k) => passed.has(k));
  const order = keyOrder(l, planOf(l), phraseInstOf(l)).filter((k) => req.includes(k));
  const next = order.find((k) => !passed.has(k)) ?? nextKey(l, items, phraseInstOf(l));
  return { req, done, next, all: done.length >= req.length };
}

export function StudentPhraseAssignment({ lang, id, book, items, onBack }: { lang: Lang; id: string; book: LickBook | undefined; items: Record<string, ItemState>; onBack: () => void }) {
  const tx = TX[lang];
  const list = useCached();
  const c = list.find((x) => x.id === id);
  const l = book?.own?.find((x) => x.id === c?.phraseId);
  const player = usePlayer();
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => subscribeTeacherPhrases(() => setN((x) => x + 1)), []);
  const sent = useMemo(() => sentKeysOf(id), [id, n]);
  if (!c)
    return (
      <main className="panel-screen enc-screen tp-screen" data-teach="student" data-teach-missing="1">
        <header className="screen-head enc-head">
          <button className="icon-btn" onClick={onBack} aria-label={tx.back}>
            <Icon k="back" />
          </button>
          <h1>{tx.task}</h1>
        </header>
        <p className="t3">{tx.missing}</p>
        <button className="btn ghost small" onClick={() => void refreshTeacherPhrases().catch(() => {})}>
          {tx.refresh}
        </button>
      </main>
    );
  const a = c.a;
  const p = progressOf(l, items, sent);
  const hearTeacher = async () => {
    if (player.on) return player.stop();
    if (a.audio) {
      const url = await assignAudioUrl(a.audio).catch(() => null);
      if (url && audioEl.current) {
        audioEl.current.src = url;
        void audioEl.current.play().catch(() => {});
        return;
      }
    }
    void player.play(phraseEvents(a), phraseSeconds(a));
  };
  const said = c.said[0];
  const handsTxt = tx[a.plan.hands];
  const roll = rollOf({ notes: a.rh.length ? a.rh : a.lh.map(([s, b, d]) => [s - 12, b, d]), lh: a.rh.length ? a.lh : [], homeKey: a.homeKey });
  const beats = Math.max(a.meter, ...roll.map((r) => r.beat + r.dur));
  return (
    <main className="panel-screen enc-screen tp-screen" data-teach="student" data-teach-assignment={c.id}>
      <header className="screen-head enc-head">
        <button className="icon-btn" onClick={() => (player.stop(), onBack())} aria-label={tx.back}>
          <Icon k="back" />
        </button>
        <h1>
          {tx.task}
          {c.className && (
            <small className="enc-sub">
              <Bi text={c.className} />
            </small>
          )}
        </h1>
      </header>
      <div className="enc-card tp-from">
        <div className="row">
          <span className="enc-pill ac">{tx.fromTeacher}</span>
          <span className="grow" />
          {c.dueOn && (
            <small className="tiny">
              {tx.until} <bdi>{dueText(c.dueOn, lang)}</bdi>
            </small>
          )}
        </div>
        <b className="t2">
          <Bi text={assignTitle(a, lang)} />
          {a.teacher && (
            <>
              {' · '}
              <Bi text={a.teacher} />
            </>
          )}
        </b>
        <PianoRoll notes={roll} from={0} to={Math.ceil(beats / a.meter) * a.meter} meter={a.meter} height={70} barNums={false} label={tx.teachersPlaying} />
        <button className="btn small ghost tp-hear" onClick={() => void hearTeacher()} data-teach-hear-teacher="1">
          <PlayGlyph on={player.on} /> {tx.teachersPlaying}
        </button>
        <audio ref={audioEl} preload="none" />
      </div>
      <div className="row wrap tp-locks" title={tx.locked}>
        <span className="ch gh" data-locked="goal">
          <LockGlyph /> <Tempo bpm={a.plan.goalBpm} />
        </span>
        <span className="ch gh" data-locked="keys">
          <LockGlyph /> {a.plan.keys === 'all' ? tx.all12 : a.plan.keys.length === 1 ? <KeyB k={a.plan.keys[0]} minor={a.minor} /> : <bdi dir="ltr">{a.plan.keys.length}</bdi>}
        </span>
        {a.instrument !== 'piano' ? (
          <span className="ch gh" data-locked="inst">
            <LockGlyph /> {tx[a.instrument]}
          </span>
        ) : (
          <span className="ch gh" data-locked="hands">
            <LockGlyph /> {handsTxt}
          </span>
        )}
        <span className="ch gh">{c.strictness === 'lenient' ? tx.lenient : c.strictness === 'strict' ? tx.strictS : tx.moderate}</span>
      </div>
      {p && (
        <div className="enc-card tp-prog" data-teach-progress={`${p.done.length}/${p.req.length}`}>
          <div className="row">
            <span className="t2 grow">{tx.progress}</span>
            <span className="t3">
              <bdi dir="ltr">{p.done.length}</bdi> {tx.of} <bdi dir="ltr">{p.req.length}</bdi>
            </span>
          </div>
          <span className="tp-strip" dir="ltr" aria-hidden="true">
            {Array.from({ length: 12 }, (_, k) => (
              <i key={k} className={`${p.req.includes(k) ? 'req' : ''} ${p.done.includes(k) ? 'd' : ''} ${k === p.next && !p.all ? 'c' : ''}`} />
            ))}
          </span>
          <span className="t3">{p.all ? tx.done : <>{tx.next}: <KeyB k={p.next} minor={a.minor} /></>}</span>
        </div>
      )}
      {said && (
        <div className="enc-card-soft tp-said" data-teach-said="1">
          <div className="row">
            <span className="enc-pill">{tx.said}</span>
            <small className="tiny">
              <bdi dir="ltr">{new Date(said.at).toLocaleDateString(intlTag(lang === 'he' ? 'he' : 'en', 'en-GB'))}</bdi>
            </small>
          </div>
          {said.comment && (
            <span className="t2">
              <Bi text={said.comment} />
            </span>
          )}
        </div>
      )}
      {c.note && (
        <p className="t3">
          <Bi text={c.note} />
        </p>
      )}
      <div className="enc-foot">
        <button className="btn primary enc-full" disabled={!l} onClick={() => (player.stop(), (location.hash = `/encore/run/${l!.id}~${p?.next ?? a.homeKey}~${handsOf(l!)[0]}`))} data-teach-continue="1">
          {tx.cont}
          {p && !p.all && (
            <>
              {' — '}
              <KeyB k={p.next} minor={a.minor} />
            </>
          )}
        </button>
      </div>
    </main>
  );
}

/** Today: the teacher's phrase first while it is due ("From the teacher: ii–V in F · due Thu"). */
export function TeacherPhraseTodayCard({ lang, book, items, onOpen }: { lang: Lang; book: LickBook | undefined; items: Record<string, ItemState>; onOpen: (hash: string) => void }) {
  const tx = TX[lang];
  const list = useCached();
  const open = list
    .map((c) => ({ c, l: book?.own?.find((x) => x.id === c.phraseId), sent: sentKeysOf(c.id) }))
    .map((x) => ({ ...x, p: progressOf(x.l, items, x.sent) }))
    .filter((x) => !x.p?.all)
    .sort((x, y) => (x.c.dueOn ?? '9999').localeCompare(y.c.dueOn ?? '9999'));
  const first = open[0];
  if (!first) return null;
  const { c, p } = first;
  return (
    <button type="button" className="tc-card tc-encore tp-today" onClick={() => onOpen(`/teach/a/${c.id}`)} data-today-teacher={c.id}>
      <span className="enc-pill ac tp-pill">{tx.fromTeacher}</span>
      <span className="grow" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <b>
          <Bi text={assignTitle(c.a, lang)} />
        </b>
        <small className="tc-hint">
          {p ? (
            <>
              <bdi dir="ltr">{p.done.length}</bdi> {tx.of} <bdi dir="ltr">{p.req.length}</bdi>
            </>
          ) : null}
          {c.dueOn ? (
            <>
              {' · '}
              {tx.until} <bdi>{dueText(c.dueOn, lang)}</bdi>
            </>
          ) : null}
        </small>
      </span>
    </button>
  );
}

/** #/teach/new/<class> or #/teach/a/<assignment>. */
export function TeachScreen({ lang, settings, items, onBack }: { lang: Lang; settings: Settings; items: Record<string, ItemState>; onBack: () => void }): ReactNode {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const m = /^#\/teach\/(new|a)\/([^/?]+)/.exec(hash);
  if (m?.[1] === 'new') return <TeachPhraseSheet lang={lang} classId={decodeURIComponent(m[2])} settings={settings} onBack={onBack} />;
  if (m?.[1] === 'a') return <StudentPhraseAssignment lang={lang} id={decodeURIComponent(m[2])} book={settings.lickBook} items={items} onBack={onBack} />;
  return null;
}
