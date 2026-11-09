// Improvisation beyond notes (0.53): three exercises over a band.
//   Phrasing     — improvise over a chart under a phrasing rule (max density, two-bar phrases, a bar of rest);
//                  the result: phrases, space, density, arcs, and whether your opening idea came back developed.
//   Vary it      — a short phrase plays; play it back changed as asked (moved in time, ornamented, transposed, answered).
//   Trading 4s   — you play four bars, the app answers with your idea developed; three rounds.
// Input: a MIDI keyboard, or the on-screen keys.
import { useEffect, useRef, useState } from 'react';
import { chartBacking, IMPROV_LEVELS, parseChart } from '../engine/charts';
import { checkPhraseRule, developmentScore, judgeVariation, motifReturns, phraseToVary, phrasingReport, tradeAnswer, type PhraseRule, type PNote, type Variation } from '../engine/improvPhrasing';
import type { NoteEvent } from '../engine/lesson';
import type { Settings } from '../storage/progress';
import { midi } from '../speech/midi';
import { piano } from './services';
import { ChallengeList } from './ImprovRules';
import { STANDARD_CHANGES } from '../engine/standards';
import type { MyChart } from './Charts';

type Lang = 'en' | 'he';
type Mode = 'rules' | 'phrasing' | 'vary' | 'trade';
const TX = {
  en: {
    title: 'Improvisation studio', rules: 'Rules', rulesHow: 'Improvise over a chart under rules — every note is checked. Choose a chart, then a challenge; or set your own rules in the chart.', chartFrom: 'Chart to play over', levels: 'Improvisation levels', standards: 'Standards', mine: 'My charts', phrasing: 'Phrasing', vary: 'Vary it', trade: 'Trading fours', chart: 'Chart', rule: 'Rule', start: 'Start', stop: 'Stop', tempo: 'Tempo', back: 'Back',
    ruleNames: ['At most one note a beat', 'At most 2 notes a beat', 'Phrases of one bar', 'Phrases of two bars', 'Phrases of four bars', 'A bar of rest between phrases'],
    phrasingHow: 'Improvise over the band. Think in sentences: say something, then leave space. The rule shapes it.',
    varyHow: 'Listen to the phrase, then play it back changed as asked. Keep something of it — its shape or its rhythm.',
    tradeHow: 'You play four bars; the band and the app answer with your idea developed. Three rounds.',
    asks: { displace: 'Move it in time (start it on another beat)', ornament: 'Ornament it (add notes around it)', transpose: 'Move it to another pitch (same shape)', answer: 'Answer it (a reply that ends at home)' } as Record<Variation, string>,
    phrases: 'phrases', space: 'space', density: 'notes / beat', arcs: 'phrases that build', motif: 'Your opening idea came back', times: 'times', dev: 'development', listen: 'Listen', yourTurn: 'Your turn', keys: 'Play here if you have no MIDI keyboard',
    round: 'Round',
  },
  he: {
    title: 'סטודיו לאלתור', rules: 'אלתור עם כללים', rulesHow: 'מאלתרים מעל מהלך תחת כללים — כל צליל נבדק. בחרו מהלך ואז אתגר; או קבעו כללים משלכם בתוך המהלך.', chartFrom: 'מהלך לאלתר עליו', levels: 'שלבי אלתור', standards: 'סטנדרטים', mine: 'המהלכים שלי', phrasing: 'פרייזינג', vary: 'וריאציה', trade: 'חילופי ארבע', chart: 'מהלך', rule: 'חוק', start: 'להתחיל', stop: 'עצירה', tempo: 'טמפו', back: 'חזרה',
    ruleNames: ['לכל היותר צליל אחד לפעמה', 'לכל היותר 2 צלילים לפעמה', 'משפטים של תיבה אחת', 'משפטים של שתי תיבות', 'משפטים של ארבע תיבות', 'תיבה של שקט בין משפטים'],
    phrasingHow: 'אלתרו מעל הלהקה. חשבו במשפטים: להגיד משהו, ואז להשאיר מקום. החוק מעצב את זה.',
    varyHow: 'הקשיבו למשפט, ואז נגנו אותו בחזרה בשינוי שהתבקש. שמרו משהו ממנו — הצורה או הקצב.',
    tradeHow: 'אתם מנגנים ארבע תיבות; הלהקה והאפליקציה עונות עם הרעיון שלכם בפיתוח. שלושה סבבים.',
    asks: { displace: 'להזיז אותו בזמן (להתחיל על פעמה אחרת)', ornament: 'לקשט אותו (להוסיף צלילים סביבו)', transpose: 'להעביר לגובה אחר (אותה צורה)', answer: 'לענות לו (תשובה שמסתיימת בבית)' } as Record<Variation, string>,
    phrases: 'משפטים', space: 'שקט', density: 'צלילים לפעמה', arcs: 'משפטים שנבנים', motif: 'הרעיון הפותח חזר', times: 'פעמים', dev: 'פיתוח', listen: 'להקשיב', yourTurn: 'תורכם', keys: 'נגנו כאן אם אין מקלדת MIDI',
    round: 'סבב',
  },
};

const RULES: PhraseRule[] = [
  { kind: 'max-density', perBeat: 1 },
  { kind: 'max-density', perBeat: 2 },
  { kind: 'phrase-bars', bars: 1, meter: 4 },
  { kind: 'phrase-bars', bars: 2, meter: 4 },
  { kind: 'phrase-bars', bars: 4, meter: 4 },
  { kind: 'rest-bar', meter: 4 },
];

/** A two-octave strip of keys for players without a MIDI keyboard. */
function KeyStrip({ onKey }: { onKey: (m: number) => void }) {
  const keys = Array.from({ length: 25 }, (_, i) => 60 + i);
  const black = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  return (
    <div className="is-keys" dir="ltr">
      {keys.map((m) => (
        <button key={m} className={`is-key ${black(m) ? 'b' : 'w'}`} onPointerDown={() => onKey(m)} aria-label={String(m)} />
      ))}
    </div>
  );
}

export function ImprovStudioScreen({ settings, onBack, onOpenChart }: { settings: Settings; onBack: () => void; onOpenChart?: (c: MyChart) => void }) {
  const lang: Lang = settings.uiLang;
  const tx = TX[lang];
  const [mode, setMode] = useState<Mode>(onOpenChart ? 'rules' : 'phrasing');
  const [src, setSrc] = useState('lv:4');
  const [lv, setLv] = useState(IMPROV_LEVELS[3].n);
  const [rule, setRule] = useState(0);
  const [bpm, setBpm] = useState(96);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<React.ReactNode>(null);
  const [round, setRound] = useState(0);
  const [askIdx, setAskIdx] = useState(0);
  const ctl = useRef<AbortController | null>(null);
  const t0 = useRef(0);
  const notes = useRef<PNote[]>([]);
  const open = useRef(new Map<number, number>());
  const beatS = 60 / bpm;
  useEffect(() => () => ctl.current?.abort(), []);

  const noteOn = (m: number, at = performance.now()) => {
    if (!t0.current) return;
    const beat = (at - t0.current) / 1000 / beatS;
    open.current.set(m, beat);
    notes.current.push({ beat, dur: 0, midi: m });
  };
  const noteOff = (m: number, at = performance.now()) => {
    const b = open.current.get(m);
    if (b === undefined) return;
    open.current.delete(m);
    const n = [...notes.current].reverse().find((x) => x.midi === m && x.beat === b);
    if (n) n.dur = Math.max(0, (at - t0.current) / 1000 / beatS - b);
  };
  useEffect(() => midi.onNote((m, on, at) => (on ? noteOn(m, at) : noteOff(m, at))));
  const onScreenKey = (m: number) => {
    noteOn(m);
    if (settings.midiSound !== false) void piano.unlock().then(() => piano.play([{ midi: m, start: 0, duration: 0.35, velocity: 0.7 }], 0.4, new AbortController().signal).catch(() => {}));
    setTimeout(() => noteOff(m), 250);
  };

  /** Play events; t0 = when beat 0 (after `countBeats`) is heard. Resolves when done. */
  const run = async (events: NoteEvent[], length: number, countBeats: number) => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    notes.current = [];
    open.current.clear();
    t0.current = performance.now() + 60 + countBeats * beatS * 1000;
    await piano.play(events, length, c.signal).catch(() => {});
    return !c.signal.aborted;
  };

  const chartOf = () => {
    const L = IMPROV_LEVELS.find((x) => x.n === lv) ?? IMPROV_LEVELS[0];
    return { L, p: parseChart(L.text) };
  };

  const startPhrasing = async () => {
    setRunning(true);
    setResult(null);
    const { L, p } = chartOf();
    const b = chartBacking(p, L.style, bpm, 2);
    const total = p.bars * 4 * 2;
    const done = await run(b.events, b.length, b.startBeat);
    setRunning(false);
    if (!done) return;
    const played = notes.current.filter((n) => n.beat >= -0.25 && n.beat <= total);
    const rep = phrasingReport(played, total);
    const chk = checkPhraseRule(played, total, RULES[rule]);
    const mot = motifReturns(played);
    setResult(
      <div className="is-result" data-is-result="phrasing">
        <p className={chk.ok ? 'ok' : 'no'}>
          <b>{chk.ok ? '✓' : '✕'}</b> {chk.why[lang]}
        </p>
        <ul className="is-stats" dir="ltr">
          <li>
            <b>{rep.phrases}</b> <small>{tx.phrases}</small>
          </li>
          <li>
            <b>{Math.round(rep.space * 100)}%</b> <small>{tx.space}</small>
          </li>
          <li>
            <b>{rep.density.toFixed(1)}</b> <small>{tx.density}</small>
          </li>
          <li>
            <b>{rep.buildingArcs}</b> <small>{tx.arcs}</small>
          </li>
        </ul>
        <p className="field-hint">
          {tx.motif}: {mot.returns.length} {tx.times} · {tx.dev} {Math.round(developmentScore(mot.returns) * 100)}%
        </p>
      </div>,
    );
  };

  const VARS: Variation[] = ['displace', 'ornament', 'transpose', 'answer'];
  const startVary = async () => {
    setRunning(true);
    setResult(null);
    const given = phraseToVary((Date.now() >>> 8) + askIdx, 60);
    const count = [0, 1, 2, 3].map((k) => ({ midi: 96, start: k * beatS, duration: 0.05, velocity: k ? 0.3 : 0.5, perc: (k ? 'click' : 'accent') as 'click' | 'accent' }));
    const phraseEv = given.map((n) => ({ midi: n.midi, start: (4 + n.beat) * beatS, duration: n.dur * beatS, velocity: 0.7 }));
    // then two bars of clicks for the answer
    const answerClicks = Array.from({ length: 8 }, (_, k) => ({ midi: 96, start: (12 + k) * beatS, duration: 0.05, velocity: k % 4 ? 0.2 : 0.35, perc: (k % 4 ? 'click' : 'accent') as 'click' | 'accent' }));
    const done = await run([...count, ...phraseEv, ...answerClicks], 20 * beatS + 0.3, 0);
    setRunning(false);
    if (!done) return;
    const answer = notes.current.filter((n) => n.beat >= 11.5 && n.beat <= 20).map((n) => ({ ...n, beat: n.beat - 12 + 0 }));
    const givenAligned = given.map((n) => ({ ...n }));
    const v = judgeVariation(givenAligned, answer, VARS[askIdx % VARS.length]);
    setResult(
      <div className="is-result" data-is-result="vary">
        <p className={v.ok ? 'ok' : 'no'}>
          <b>{v.ok ? '✓' : '✕'}</b> {v.why[lang]}
        </p>
      </div>,
    );
    if (v.ok) setAskIdx((i) => i + 1);
  };

  const startTrade = async () => {
    setRunning(true);
    setResult(null);
    const { L, p } = chartOf();
    const four = { ...p, bars: Math.min(4, p.bars) };
    const scores: number[] = [];
    for (let r = 0; r < 3; r++) {
      setRound(r + 1);
      // the player's four bars over the band (with a count-in)
      const b = chartBacking(four, L.style, bpm, 1);
      if (!(await run(b.events, b.length, b.startBeat))) break;
      const mine = notes.current.filter((n) => n.beat >= -0.25 && n.beat < 16);
      scores.push(developmentScore(motifReturns(mine).returns));
      // the app's answer: the player's idea developed, over the band
      const ans = tradeAnswer(mine, 60, 0);
      const back = chartBacking(four, L.style, bpm, 1, 4, { countIn: false });
      const ev: NoteEvent[] = [...back.events, ...ans.map((n) => ({ midi: n.midi, start: n.beat * beatS, duration: Math.max(0.2, n.dur * beatS), velocity: 0.72 }))];
      if (!(await run(ev, back.length, 0))) break;
    }
    setRunning(false);
    setRound(0);
    if (scores.length)
      setResult(
        <div className="is-result" data-is-result="trade">
          <p>
            {tx.dev}: {scores.map((s) => `${Math.round(s * 100)}%`).join(' · ')}
          </p>
        </div>,
      );
  };

  const stop = () => {
    ctl.current?.abort();
    setRunning(false);
  };

  return (
    <main className="panel-screen improv-studio" data-improv-studio="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (stop(), onBack())} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx.title}</h1>
      </header>
      <div className="chips" role="tablist">
        {((onOpenChart ? ['rules', 'phrasing', 'vary', 'trade'] : ['phrasing', 'vary', 'trade']) as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => (stop(), setMode(m), setResult(null))} data-is-mode={m}>
            {tx[m]}
          </button>
        ))}
      </div>
      <p className="field-hint">{mode === 'rules' ? tx.rulesHow : mode === 'phrasing' ? tx.phrasingHow : mode === 'vary' ? tx.varyHow : tx.tradeHow}</p>
      {mode === 'rules' && onOpenChart && (
        <>
          <label className="field-row is-src">
            <span>{tx.chartFrom}</span>
            <select value={src} onChange={(e) => setSrc(e.target.value)} data-is-chart-src="1">
              <optgroup label={tx.levels}>
                {IMPROV_LEVELS.map((l) => (
                  <option key={l.id} value={`lv:${l.n}`}>
                    {l.n}. {l.title[lang]}
                  </option>
                ))}
              </optgroup>
              <optgroup label={tx.standards}>
                {STANDARD_CHANGES.map((s) => (
                  <option key={s.id} value={`std:${s.id}`}>
                    {s.name} — {s.part[lang]}
                  </option>
                ))}
              </optgroup>
              {(settings.myCharts ?? []).length > 0 && (
                <optgroup label={tx.mine}>
                  {(settings.myCharts ?? []).map((c) => (
                    <option key={c.id} value={`my:${c.id}`}>
                      {c.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <ChallengeList
            lang={lang}
            onPick={(ch) => {
              const id = `${Date.now()}`;
              const [kind, key] = [src.slice(0, src.indexOf(':')), src.slice(src.indexOf(':') + 1)];
              if (kind === 'my') {
                const c = (settings.myCharts ?? []).find((x) => x.id === key);
                if (c) return onOpenChart({ ...c, rules: ch.rules });
              }
              if (kind === 'std') {
                const s = STANDARD_CHANGES.find((x) => x.id === key) ?? STANDARD_CHANGES[0];
                return onOpenChart({ id, title: `${s.name} — ${ch.title[lang]}`, text: s.text, style: s.style, bpm: s.bpm, rules: ch.rules });
              }
              const L = IMPROV_LEVELS.find((x) => String(x.n) === key) ?? IMPROV_LEVELS[0];
              onOpenChart({ id, title: `${L.title[lang]} — ${ch.title[lang]}`, text: L.text, style: L.style, bpm: L.bpm, rules: ch.rules, level: L.id });
            }}
          />
        </>
      )}
      {mode !== 'vary' && mode !== 'rules' && (
        <label className="field-row">
          <span>{tx.chart}</span>
          <select value={lv} onChange={(e) => setLv(Number(e.target.value))} disabled={running}>
            {IMPROV_LEVELS.map((l) => (
              <option key={l.n} value={l.n}>
                {l.n}. {l.title[lang]}
              </option>
            ))}
          </select>
        </label>
      )}
      {mode === 'phrasing' && (
        <div className="chips" role="radiogroup" aria-label={tx.rule}>
          {RULES.map((r, i) => (
            <button key={i} role="radio" aria-checked={rule === i} className={`chip ${rule === i ? 'on' : ''}`} onClick={() => setRule(i)} disabled={running} data-is-rule={r.kind}>
              {tx.ruleNames[i]}
            </button>
          ))}
        </div>
      )}
      {mode === 'vary' && <p className="is-ask" data-is-ask={VARS[askIdx % VARS.length]}>{tx.asks[VARS[askIdx % VARS.length]]}</p>}
      {mode !== 'rules' && <div className="ch-step" dir="ltr">
        <small>{tx.tempo}</small>
        <button className="icon-btn" onClick={() => setBpm((b) => Math.max(50, b - 6))} disabled={running}>
          −
        </button>
        <b>{bpm}</b>
        <button className="icon-btn" onClick={() => setBpm((b) => Math.min(220, b + 6))} disabled={running}>
          +
        </button>
      </div>}
      {mode === 'rules' ? null : running ? (
        <button className="btn primary" onClick={stop}>
          ■ {tx.stop} {round ? `· ${tx.round} ${round}/3` : ''}
        </button>
      ) : (
        <button className="btn primary" onClick={() => void (mode === 'phrasing' ? startPhrasing() : mode === 'vary' ? startVary() : startTrade())} data-is-start="1">
          ▶ {tx.start}
        </button>
      )}
      {midi.devices.length === 0 && mode !== 'rules' && (
        <>
          <small className="field-hint">{tx.keys}</small>
          <KeyStrip onKey={onScreenKey} />
        </>
      )}
      {result}
    </main>
  );
}
