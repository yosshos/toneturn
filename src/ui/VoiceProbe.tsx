// The voice placement probe (VOICE_CURRICULUM §8, about 2½ minutes): one held note, three echo phrases, four bars on
// the click, one phrase with the band and — only when those pass — a guide-tone line. It sets where each family
// starts on the path (the levels before it are ✓ by test and stay open to practise). Measured singing only.

import '../voicecourse.css';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { piano, SIMULATED } from './services';
import { captureTimed, songSpan } from './VoiceTimed';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { atRange, gradeTake, itemTargets, LADDER, synthHold, synthMelody, type VocalItem, type VoiceRange } from '../engine/vocal';
import type { SungFrame } from '../engine/sing';
import { probeStarts, SCAT_LEVELS, SONG_LEVELS, TIME_LEVELS, VOICE_FAMILIES, type ProbeScores } from '../engine/voiceFamilies';
import type { Settings } from '../storage/progress';

type Lang = 'he' | 'en';
const TX = {
  en: {
    title: 'Find my voice level',
    intro: 'About two and a half minutes: a held note, three short echoes, four bars on the click, a phrase with the band. Your path then starts where you are.',
    steps: { hold: 'Hold the note for five seconds.', echo: 'Listen, then sing it back.', time: '"Dah" on every click.', song: 'Sing the phrase with the band.', guide: 'Sing a 3rd or a 7th of each chord.' },
    sing: 'Sing',
    next: 'Next',
    done: 'Save and finish',
    starts: 'Your path starts here:',
    none: 'Every family starts at its first level — that is the right place to begin.',
    level: 'level {n}',
    score: 'Score',
    of: 'Step {i} of {n}',
  },
  he: {
    title: 'מציאת הרמה בשירה',
    intro: 'בערך שתיים וחצי דקות: צליל מוחזק, שלושה הדים קצרים, ארבע תיבות על הקליק, משפט עם הלהקה. המסלול שלכם יתחיל איפה שאתם נמצאים.',
    steps: { hold: 'החזיקו את הצליל חמש שניות.', echo: 'הקשיבו, ואז שירו בחזרה.', time: '"דה" על כל קליק.', song: 'שירו את המשפט עם הלהקה.', guide: 'שירו טרצה או ספטימה של כל אקורד.' },
    sing: 'לשיר',
    next: 'הבא',
    done: 'לשמור ולסיים',
    starts: 'המסלול שלכם מתחיל כאן:',
    none: 'כל משפחה מתחילה בשלב הראשון — זה המקום הנכון להתחיל בו.',
    level: 'שלב {n}',
    score: 'ציון',
    of: 'שלב {i} מתוך {n}',
  },
};

type StepId = 'hold' | 'echo' | 'time' | 'song' | 'guide';
interface Step {
  id: StepId;
  item: VocalItem;
}

/** The probe's items: real items of the families' levels. */
function probeSteps(): Step[] {
  return [
    { id: 'hold', item: { ...LADDER[0].items[1], reference: 'before' } },
    { id: 'echo', item: LADDER[6].items[0] },
    { id: 'echo', item: LADDER[6].items[1] },
    { id: 'echo', item: LADDER[6].items[2] },
    { id: 'time', item: TIME_LEVELS[0].items[0] },
    { id: 'song', item: SONG_LEVELS[0].items[1] },
    { id: 'guide', item: SCAT_LEVELS[1].items[0] },
  ];
}

export function VoiceProbe({ settings, range, onDone, onBack }: { settings: Settings; range: VoiceRange; onDone: (starts: Record<string, number>) => void; onBack: () => void }) {
  const lang: Lang = settings.uiLang === 'en' ? 'en' : 'he';
  const tx = TX[lang];
  const steps = useRef(probeSteps()).current;
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const scores = useRef<Partial<Record<StepId, number[]>>>({});
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => (ctl.current?.abort(), piano.stopAll()), []);
  const step = steps[i];
  const mean = (id: StepId) => {
    const xs = scores.current[id] ?? [];
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  };
  // The guide-tone line only when the earlier items passed (cautious ✓: never guess a jazz singer).
  const guideOpen = () => mean('echo') >= 0.75 && mean('song') >= 0.75 && mean('time') >= 0.75;

  const finish = () => {
    const s: ProbeScores = { hold: mean('hold'), echo: mean('echo'), time: mean('time'), song: mean('song'), ...(scores.current.guide ? { guide: mean('guide') } : {}) };
    setResult(probeStarts(s));
  };

  const sing = async () => {
    const c = new AbortController();
    ctl.current = c;
    setBusy(true);
    setScore(null);
    let sc = 0;
    if (step.item.kind === 'time' || step.item.kind === 'song' || step.item.kind === 'scat') {
      const { plan, span } = songSpan(step.item, range, null);
      const r = await captureTimed({ item: step.item, plan, span, range, tonicPc: ((atRange(range, 0.35) % 12) + 12) % 12, settings, headphones: false, guide: false, loop: null, signal: c.signal, stopped: { current: false }, onFrames: () => {}, onClock: () => {} });
      sc = r?.take.grade.score ?? 0;
    } else {
      sc = await untimed(step.item, range, c.signal);
    }
    scores.current[step.id] = [...(scores.current[step.id] ?? []), sc];
    setScore(sc);
    setBusy(false);
  };
  const next = () => {
    setScore(null);
    const n = i + 1;
    if (n >= steps.length || (steps[n].id === 'guide' && !guideOpen())) return finish();
    setI(n);
  };

  if (result) {
    const keys = Object.entries(result);
    return (
      <main className="panel-screen vocal vtimed">
        <header className="screen-head">
          <h1>{tx.title}</h1>
        </header>
        <p className="vocal-instr">{keys.length ? tx.starts : tx.none}</p>
        <ul className="vt-phrases">
          {keys.map(([f, n]) => (
            <li key={f} className="good">
              <span>{VOICE_FAMILIES.find((x) => x.id === f)?.title[lang]}</span>
              <b>{tx.level.replace('{n}', String(n))}</b>
            </li>
          ))}
        </ul>
        <button className="btn mega" onClick={() => onDone(result)}>
          {tx.done}
        </button>
      </main>
    );
  }
  return (
    <main className="panel-screen vocal vtimed">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (ctl.current?.abort(), onBack())} aria-label="←">
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx.title}</h1>
      </header>
      {i === 0 && score === null && !busy && <p className="field-hint">{tx.intro}</p>}
      <p className="field-hint">{tx.of.replace('{i}', String(i + 1)).replace('{n}', String(steps.length))}</p>
      <p className="vocal-instr">{tx.steps[step.id]}</p>
      {score !== null && (
        <section className="take-card" aria-live="polite">
          <div className="take-score">
            {tx.score}: <b>{Math.round(score * 100)}%</b>
          </div>
        </section>
      )}
      <div className="vocal-actions">
        {score === null ? (
          <button className={`btn mega ${busy ? 'ghost' : ''}`} disabled={busy} onClick={() => void sing()}>
            {busy ? '…' : <><Icon k="mic" /> {tx.sing}</>}
          </button>
        ) : (
          <button className="btn mega" onClick={next}>
            {tx.next} <span className="flip-rtl">→</span>
          </button>
        )}
      </div>
    </main>
  );
}

/** A held note or an echo phrase: the reference, then the take, graded like its level. */
async function untimed(item: VocalItem, range: VoiceRange, signal: AbortSignal): Promise<number> {
  await piano.unlock();
  const tg = itemTargets(item, range);
  const d = 0.55;
  const events = tg.map((m, k) => ({ midi: m, start: k * d, duration: tg.length > 1 ? d * 0.95 : 1.4, velocity: 0.7 }));
  await piano.play(events, tg.length > 1 ? tg.length * d + 0.4 : 1.6, signal).catch(() => {});
  if (signal.aborted) return 0;
  let frames: SungFrame[];
  if (SIMULATED) frames = tg.length > 1 ? synthMelody(tg) : synthHold(tg[0], { seconds: item.seconds + 0.3, jitter: 2 });
  else {
    const r = await new BrowserPitchCapture().sing({ signal, maxMs: (item.seconds + 4) * 1000, silenceMs: 6000, endSilenceMs: tg.length > 1 ? 900 : 700, hopMs: 20 });
    frames = r.kind === 'frames' ? r.frames : [];
  }
  const g = gradeTake(item, frames, range);
  return g.unclear ? 0 : g.score;
}
