// The voice course's "Find my level" (0.84): sections of the course's own families, adaptive, one take per step —
// the same rules as the playing tests (docs/SPEC-LEVEL-TEST.md). Each take runs in the real exercise screen (count-in,
// click and now-cue included); the screen only hands its score back.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { StrandState } from '../engine/drills/levelTest';
import type { VoiceRange } from '../engine/vocal';
import { savedVoiceStart, voiceStartState, voiceStrands, voiceStrandStart, voiceTake, type VoiceRung } from '../engine/voiceLevelTest';
import type { VoiceTestMode } from './VoiceTimed';
import { SIMULATED } from './services';

type Lang = 'he' | 'en';
const TX = {
  en: {
    title: 'Find my level',
    intro: 'About 10 minutes: a few short takes in each area. A good take moves you ahead; a miss simply moves the test on. Your voice path then starts where you are.',
    start: 'Start',
    resume: 'Continue — section {n}',
    over: 'Start over',
    later: 'Not now',
    section: 'Section',
    skipSection: 'Skip this section',
    done: 'Your voice path starts here',
    none: 'Every area starts at its first level — the right place to begin.',
    level: 'level {n}',
    save: 'Save and finish',
    clean: 'Passed — on to a harder one.',
    almost: 'Almost — one more take.',
    not: 'Measured — on to the next area.',
  },
  he: {
    title: 'מציאת הרמה',
    intro: 'כ-10 דקות: כמה ביצועים קצרים בכל תחום. ביצוע טוב מקדם אתכם, החטאה פשוט מעבירה את המבחן הלאה. מסלול השירה יתחיל איפה שאתם נמצאים.',
    start: 'להתחיל',
    resume: 'להמשיך — חלק {n}',
    over: 'להתחיל מחדש',
    later: 'לא עכשיו',
    section: 'חלק',
    skipSection: 'לדלג על החלק',
    done: 'מסלול השירה שלכם מתחיל כאן',
    none: 'כל תחום מתחיל בשלב הראשון — זה המקום הנכון להתחיל בו.',
    level: 'שלב {n}',
    save: 'לשמור ולסיים',
    clean: 'עבר — לשלב קשה יותר.',
    almost: 'כמעט — עוד ביצוע אחד.',
    not: 'נמדד — לתחום הבא.',
  },
};

/** Left half-way (Back, reload), the test continues at the same section and step (never lose progress). */
const SAVE_KEY = 'toneturn.voiceTest.v1';
interface Saved {
  families: string[];
  si: number;
  st: StrandState;
  starts: Record<string, number>;
  take: number;
}
const loadSaved = (families: string[]): Saved | null => {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as Saved | null;
    return v && v.families.join() === families.join() && v.si < families.length ? v : null;
  } catch {
    return null;
  }
};
const clearSaved = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* private mode */
  }
};
/** Ask for the microphone once, before the first take (no permission prompt in the middle of a take). */
const warmMic = async () => {
  if (SIMULATED || typeof navigator === 'undefined' || !navigator.mediaDevices) return;
  try {
    // Never wait long here: a prompt left open must not block the start.
    const st = await Promise.race([navigator.mediaDevices.getUserMedia({ audio: true }), new Promise<null>((r) => setTimeout(() => r(null), 8000))]);
    st?.getTracks().forEach((t) => t.stop());
  } catch {
    /* the take shows its own microphone message */
  }
};

export function VoiceLevelTest({
  lang,
  range,
  renderTake,
  onDone,
  onBack,
}: {
  lang: Lang;
  range: VoiceRange;
  /** The exercise screen for one step (VocalSession or TimedSession in test mode). */
  renderTake: (rung: VoiceRung, test: VoiceTestMode, key: string) => ReactNode;
  onDone: (starts: Record<string, number>) => void;
  onBack: () => void;
}) {
  const tx = TX[lang];
  const strands = useMemo(() => voiceStrands(range), [range]);
  const families = strands.map((x) => x.family);
  const [saved, setSaved] = useState(() => loadSaved(families));
  const [started, setStarted] = useState(false);
  const [si, setSi] = useState(0);
  const [st, setSt] = useState<StrandState>(() => voiceStartState(strands[0]));
  const [take, setTake] = useState(0);
  const [note, setNote] = useState<'clean' | 'almost' | 'not' | null>(null);
  const starts = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!started) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ families, si, st, starts: starts.current, take } satisfies Saved));
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, si, st, take]);
  const begin = (from: Saved | null) => {
    if (from) {
      setSi(from.si);
      setSt(from.st);
      starts.current = { ...from.starts };
      setTake(from.take + 1);
    } else clearSaved();
    setSaved(null);
    void warmMic().then(() => setStarted(true));
  };
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const strand = strands[si];
  const rung = strand && st.at >= 0 ? strand.rungs[st.at] : null;

  const finishStrand = (s: StrandState) => {
    const start = voiceStrandStart(strand, s);
    if (start) starts.current[strand.family] = start;
    const k = si + 1;
    if (k >= strands.length) {
      clearSaved();
      return setSummary({ ...starts.current });
    }
    setSi(k);
    setSt(voiceStartState(strands[k]));
    setTake((t) => t + 1);
  };
  const onTake = (score: number, pass: number) => {
    const s = voiceTake(st, strand, score, pass);
    setNote(s.last === 'clean' ? 'clean' : s.last === 'almost' && s.at === st.at ? 'almost' : 'not');
    if (s.at < 0) return finishStrand(s);
    setSt(s);
    setTake((t) => t + 1);
  };

  if (!strands.length) return null;
  if (!started)
    return (
      <main className="panel-screen vocal vtimed" data-voice-test="1">
        <header className="screen-head">
          <button className="icon-btn" onClick={onBack} aria-label="←">
            <span className="flip-rtl">←</span>
          </button>
          <h1>{tx.title}</h1>
        </header>
        <p className="vocal-instr">{tx.intro}</p>
        <ol className="lt-sections">
          {strands.map((x) => (
            <li key={x.family}>{x.title[lang]}</li>
          ))}
        </ol>
        <div className="vocal-actions">
          {saved ? (
            <>
              <button className="btn mega" onClick={() => begin(saved)} data-test-resume="1">
                ▶ {tx.resume.replace('{n}', String(saved.si + 1))}
              </button>
              <button className="btn ghost" onClick={() => begin(null)} data-test-start="1">
                {tx.over}
              </button>
            </>
          ) : (
            <button className="btn mega" onClick={() => begin(null)} data-test-start="1">
              ▶ {tx.start}
            </button>
          )}
          <button className="btn ghost" onClick={onBack}>
            {tx.later}
          </button>
        </div>
      </main>
    );
  if (summary) {
    const rows = strands.filter((x) => summary[x.family]);
    return (
      <main className="panel-screen vocal vtimed" data-level-test-done="1">
        <header className="screen-head">
          <h1>{tx.title}</h1>
        </header>
        <p className="vocal-instr">{rows.length ? tx.done : tx.none}</p>
        <ul className="vt-phrases">
          {rows.map((x) => (
            <li key={x.family} className="good">
              <span>{x.title[lang]}</span>
              <b>{tx.level.replace('{n}', String(summary[x.family]))}</b>
            </li>
          ))}
        </ul>
        <button
          className="btn mega"
          data-test-finish="1"
          onClick={() => onDone(Object.fromEntries(Object.entries(summary).map(([f, n]) => [f, savedVoiceStart(f, n)])))}
        >
          {tx.save}
        </button>
      </main>
    );
  }
  if (!rung) return null;
  const head = (
    <div className="vlt-head" data-test-strand={strand.family} data-test-probe={rung.level}>
      <ol className="vlt-steps" aria-label={`${tx.section} ${si + 1}/${strands.length}`}>
        {strands.map((x, k) => (
          <li key={x.family} className={k < si ? 'done' : k === si ? 'now' : ''} title={x.title[lang]} />
        ))}
      </ol>
      <p className="field-hint">
        {tx.section} {si + 1}/{strands.length} · <b>{strand.title[lang]}</b>
      </p>
      {note && <p className={`lt-verdict v-${note}`}>{tx[note]}</p>}
      <button className="link vlt-skip" onClick={() => (setNote(null), finishStrand(st))}>
        {tx.skipSection}
      </button>
    </div>
  );
  return <>{renderTake(rung, { title: tx.title, head, onTake, autoStart: note === 'almost' }, `${strand.family}:${take}`)}</>;
}
