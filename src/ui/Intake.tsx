// "Getting to know you" (product owner): a short, playful questionnaire before finding the level. One question
// per card, big answers, back and skip always there. The answers set the track, note names, daily length, a
// clean view, the voice range (sung gently — never strained) and the player's own order of practice areas,
// which reorders the path (src/engine/intake.ts).

import { useEffect, useRef, useState } from 'react';
import { AREAS, intakeSettings, trackOf, voiceTypeOf, type Intake as IntakeT, type Level4, type Motivation } from '../engine/intake';
import { personalOrder } from '../engine/intake';
import type { DomainId } from '../engine/rating';
import { rangeFromGlide, type VoiceRange } from '../engine/vocal';
import type { SungFrame } from '../engine/sing';
import { hzToMidi } from '../engine/pitch';
import { LESSON_META } from '../game/content';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { SIMULATED } from './services';
import { noteLabel } from './Vocal';

type Step = 'hello' | 'music' | 'singing' | 'theory' | 'reading' | 'plays' | 'naming' | 'rank' | 'motivation' | 'minutes' | 'range' | 'plan';
const STEPS: Step[] = ['hello', 'music', 'singing', 'theory', 'reading', 'plays', 'naming', 'rank', 'motivation', 'minutes', 'range', 'plan'];
const AREA_ICON: Record<DomainId, string> = { pitch: '👂', time: '🥁', memory: '🧠', voice: '🎤', reading: '📖' };

export interface IntakeResult {
  intake: IntakeT;
  patch: Partial<Settings>;
}

export function IntakeScreen({ t, settings, onDone, onSkip }: { t: Strings; settings: Settings; onDone: (r: IntakeResult, then: 'placement' | 'basics' | 'home') => void; onSkip: () => void }) {
  const q = t.intake;
  const lang = settings.uiLang;
  const prev = settings.intake as IntakeT | undefined;
  const [step, setStep] = useState<Step>('hello');
  const [a, setA] = useState<Partial<IntakeT>>(() => (prev ? { ...prev } : { plays: [] }));
  const [naming, setNaming] = useState<'solfege' | 'letter' | 'auto'>(settings.naming === 'solfege' || settings.naming === 'letter' ? settings.naming : 'auto');
  const [ranked, setRanked] = useState<DomainId[]>(() => prev?.priorities ?? []);
  const [mixed, setMixed] = useState(prev ? prev.priorities === null : false);
  const [range, setRange] = useState<VoiceRange | null>(settings.voiceRange ?? null);
  const i = STEPS.indexOf(step);
  const go = (d: 1 | -1) => setStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, i + d))]);
  const pick = <K extends keyof IntakeT>(k: K, v: IntakeT[K]) => {
    setA((x) => ({ ...x, [k]: v }));
    window.setTimeout(() => go(1), 180);
  };

  const full = (): IntakeT => ({
    v: 1,
    at: new Date().toISOString(),
    music: (a.music ?? 0) as Level4,
    singing: (a.singing ?? 0) as Level4,
    theory: (a.theory ?? 0) as Level4,
    reading: (a.reading ?? 0) as 0 | 1 | 2,
    plays: a.plays ?? [],
    priorities: mixed || ranked.length < AREAS.length ? (mixed ? null : [...ranked, ...AREAS.filter((x) => !ranked.includes(x))]) : ranked,
    motivation: (a.motivation ?? 'learn') as Motivation,
    minutes: (a.minutes ?? 10) as 5 | 10 | 20,
  });
  const finish = (then: 'placement' | 'basics' | 'home') => {
    const intake = full();
    const s = intakeSettings(intake);
    const patch: Partial<Settings> = { intake, track: s.track, cleanView: s.cleanView, miniLessons: s.miniLessons };
    if (naming !== 'auto') patch.naming = naming;
    if (range) patch.voiceRange = range;
    try {
      localStorage.setItem('toneturn.workout.minutes', String(intake.minutes));
    } catch {
      /* private mode */
    }
    onDone({ intake, patch }, then);
  };

  const opts = <K extends 'music' | 'singing' | 'theory' | 'reading' | 'motivation' | 'minutes'>(k: K, list: { v: IntakeT[K]; emoji: string; label: string }[]) => (
    <div className="intake-opts" role="radiogroup">
      {list.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={a[k] === o.v} className={`intake-opt ${a[k] === o.v ? 'on' : ''}`} data-v={String(o.v)} onClick={() => pick(k, o.v)}>
          <span className="io-emoji" aria-hidden="true">
            {o.emoji}
          </span>
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );

  const track = trackOf({ music: (a.music ?? 0) as Level4, theory: (a.theory ?? 0) as Level4, reading: (a.reading ?? 0) as 0 | 1 | 2 });
  const order = personalOrder(mixed ? null : ranked.length ? [...ranked, ...AREAS.filter((x) => !ranked.includes(x))] : null, track);

  return (
    <main className={`intake step-${step}`} data-step={step}>
      <header className="intake-head">
        {i > 0 ? (
          <button className="icon-btn" onClick={() => go(-1)} aria-label={t.back}>
            <span className="flip-rtl">←</span>
          </button>
        ) : (
          <span />
        )}
        <div className="intake-dots" aria-label={`${i + 1}/${STEPS.length}`}>
          {STEPS.map((s, k) => (
            <span key={s} className={k < i ? 'done' : k === i ? 'now' : ''} />
          ))}
        </div>
        <button className="link small" onClick={onSkip} data-intake-skip="1">
          {q.skipAll}
        </button>
      </header>

      <section className="intake-card" key={step}>
        {step === 'hello' && (
          <>
            <p className="intake-big" aria-hidden="true">
              👋🎶
            </p>
            <h1>{q.helloTitle}</h1>
            <p className="intake-text">{q.helloText}</p>
            <button className="btn mega" onClick={() => go(1)}>
              {q.letsGo}
            </button>
          </>
        )}
        {step === 'music' && (
          <>
            <h1>{q.musicQ}</h1>
            {opts('music', [
              { v: 0, emoji: '🎧', label: q.music0 },
              { v: 1, emoji: '🎸', label: q.music1 },
              { v: 2, emoji: '🎼', label: q.music2 },
              { v: 3, emoji: '🎓', label: q.music3 },
            ])}
          </>
        )}
        {step === 'singing' && (
          <>
            <h1>{q.singQ}</h1>
            {opts('singing', [
              { v: 0, emoji: '🚿', label: q.sing0 },
              { v: 1, emoji: '📻', label: q.sing1 },
              { v: 2, emoji: '🎤', label: q.sing2 },
              { v: 3, emoji: '🌟', label: q.sing3 },
            ])}
          </>
        )}
        {step === 'theory' && (
          <>
            <h1>{q.theoryQ}</h1>
            {opts('theory', [
              { v: 0, emoji: '👽', label: q.theory0 },
              { v: 1, emoji: '🤔', label: q.theory1 },
              { v: 2, emoji: '🙂', label: q.theory2 },
              { v: 3, emoji: '😎', label: q.theory3 },
            ])}
          </>
        )}
        {step === 'reading' && (
          <>
            <h1>{q.readQ}</h1>
            {opts('reading', [
              { v: 0, emoji: '🐦', label: q.read0 },
              { v: 1, emoji: '☝️', label: q.read1 },
              { v: 2, emoji: '📖', label: q.read2 },
            ])}
          </>
        )}
        {step === 'plays' && (
          <>
            <h1>{q.playsQ}</h1>
            <p className="intake-text">{q.playsHint}</p>
            <div className="intake-chips">
              {(['none', 'keys', 'guitar', 'strings', 'winds', 'drums', 'voice'] as const).map((k) => {
                const on = (a.plays ?? []).includes(k);
                return (
                  <button
                    key={k}
                    className={`chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    data-play={k}
                    onClick={() =>
                      setA((x) => {
                        const cur = x.plays ?? [];
                        if (k === 'none') return { ...x, plays: on ? [] : ['none'] };
                        const nx = on ? cur.filter((y) => y !== k) : [...cur.filter((y) => y !== 'none'), k];
                        return { ...x, plays: nx };
                      })
                    }
                  >
                    {q.plays[k]}
                  </button>
                );
              })}
            </div>
            <button className="btn mega" onClick={() => go(1)}>
              {q.next}
            </button>
          </>
        )}
        {step === 'naming' && (
          <>
            <h1>{q.namingQ}</h1>
            <div className="intake-opts" role="radiogroup">
              {(
                [
                  ['solfege', '🎵', q.namingSolfege],
                  ['letter', '🔤', q.namingLetter],
                  ['auto', '🤷', q.namingUnsure],
                ] as const
              ).map(([v, e, l]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={naming === v}
                  className={`intake-opt ${naming === v ? 'on' : ''}`}
                  data-v={v}
                  onClick={() => {
                    setNaming(v);
                    window.setTimeout(() => go(1), 180);
                  }}
                >
                  <span className="io-emoji" aria-hidden="true">
                    {e}
                  </span>
                  <span>{l}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 'rank' && (
          <>
            <h1>{q.rankQ}</h1>
            <p className="intake-text">{q.rankHint}</p>
            <ol className="rank-list">
              {AREAS.map((ar) => {
                const r = ranked.indexOf(ar);
                return (
                  <li key={ar}>
                    <button
                      className={`rank-btn ${r >= 0 ? 'on' : ''}`}
                      data-area={ar}
                      disabled={mixed}
                      onClick={() => setRanked((x) => (x.includes(ar) ? x.filter((y) => y !== ar) : [...x, ar]))}
                    >
                      <span className="rank-n" aria-hidden="true">
                        {r >= 0 ? r + 1 : ''}
                      </span>
                      <span aria-hidden="true">{AREA_ICON[ar]}</span>
                      <span className="rank-text">
                        <b>{q.areas[ar]}</b>
                        <small>{q.areaHints[ar]}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <label className="toggle-row">
              <input type="checkbox" checked={mixed} onChange={(e) => setMixed(e.target.checked)} data-mixed="1" />
              <span>🎲 {q.rankMixed}</span>
            </label>
            <div className="intake-row">
              <button className="btn ghost small" onClick={() => setRanked([])} disabled={!ranked.length || mixed}>
                {q.rankReset}
              </button>
              <button className="btn mega" onClick={() => go(1)} disabled={!mixed && ranked.length === 0}>
                {q.next}
              </button>
            </div>
          </>
        )}
        {step === 'motivation' && (
          <>
            <h1>{q.motQ}</h1>
            {opts('motivation', [
              { v: 'learn', emoji: '🎯', label: q.motLearn },
              { v: 'streaks', emoji: '🔥', label: q.motStreaks },
              { v: 'collect', emoji: '🧢', label: q.motCollect },
              { v: 'friends', emoji: '🤝', label: q.motFriends },
            ])}
          </>
        )}
        {step === 'minutes' && (
          <>
            <h1>{q.minQ}</h1>
            {opts('minutes', [
              { v: 5, emoji: '☕', label: q.min5 },
              { v: 10, emoji: '🎧', label: q.min10 },
              { v: 20, emoji: '🎹', label: q.min20 },
            ])}
          </>
        )}
        {step === 'range' && <RangeStep t={t} settings={settings} range={range} onRange={setRange} onNext={() => go(1)} />}
        {step === 'plan' && (
          <>
            <p className="intake-big" aria-hidden="true">
              {track === 'explorer' ? '🌱' : track === 'hobby' ? '🎸' : track === 'student' ? '🎼' : '🎓'}
            </p>
            <h1>{q.planTitle[track]}</h1>
            <p className="intake-text">{q.planText[track]}</p>
            <div className="plan-facts">
              {!mixed && ranked.length > 0 && (
                <p>
                  <b>{q.planOrder}</b> {[...ranked, ...AREAS.filter((x) => !ranked.includes(x))].map((x) => `${AREA_ICON[x]} ${q.areas[x]}`).join(' · ')}
                </p>
              )}
              <p>
                <b>{q.planFirst}</b> {order.slice(0, 3).map((id) => LESSON_META[id].title[lang].replace(/\{[nk]\}/g, '')).join(' → ')}
              </p>
              {range && (
                <p>
                  <b>{q.planRange}</b> <span dir="ltr">{noteLabel(range.low, settings)} – {noteLabel(range.high, settings)}</span> ({q.voiceTypes[voiceTypeOf(range)]})
                </p>
              )}
              <p className="field-hint">{q.planChange}</p>
            </div>
            {track === 'explorer' || track === 'hobby' ? (
              <>
                <button className="btn mega" onClick={() => finish('basics')} data-plan="basics">
                  {q.startBasics}
                </button>
                <button className="btn ghost" onClick={() => finish('placement')} data-plan="placement">
                  {q.findLevelInstead}
                </button>
              </>
            ) : (
              <>
                <button className="btn mega" onClick={() => finish('placement')} data-plan="placement">
                  {q.findLevel}
                </button>
                <button className="btn ghost" onClick={() => finish('basics')} data-plan="basics">
                  {q.startBasicsInstead}
                </button>
              </>
            )}
            <button className="link small" onClick={() => finish('home')} data-plan="home">
              {q.justLook}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

/** Lowest to highest, as one gentle siren. Skippable; the result can be redone in Singing. */
function RangeStep({ t, settings, range, onRange, onNext }: { t: Strings; settings: Settings; range: VoiceRange | null; onRange: (r: VoiceRange | null) => void; onNext: () => void }) {
  const q = t.intake;
  const [on, setOn] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [lo, setLo] = useState<number | null>(null);
  const [hi, setHi] = useState<number | null>(null);
  const [unclear, setUnclear] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const start = async () => {
    setOn(true);
    setUnclear(false);
    setLo(null);
    setHi(null);
    const c = new AbortController();
    ctl.current = c;
    const onFrame = (f: SungFrame) => {
      if (f.hz && f.confidence > 0.85) {
        const m = hzToMidi(f.hz);
        setNow(m);
        setLo((x) => (x === null ? m : Math.min(x, m)));
        setHi((x) => (x === null ? m : Math.max(x, m)));
      }
    };
    let got: SungFrame[] = [];
    if (SIMULATED) {
      got = Array.from({ length: 300 }, (_, k) => ({ t: k / 30, hz: 440 * 2 ** ((48 + (24 * k) / 299 - 69) / 12), confidence: 0.95, rms: 0.1 }));
      got.forEach(onFrame);
    } else {
      try {
        const r = await new BrowserPitchCapture().sing({ signal: c.signal, maxMs: 14000, silenceMs: 6000, endSilenceMs: 1500, hopMs: 33, onFrame });
        if (r.kind === 'frames') got = r.frames;
      } catch {
        /* no microphone: unclear */
      }
    }
    setOn(false);
    const rg = rangeFromGlide(got);
    if (rg) onRange(rg);
    else setUnclear(true);
  };
  const live = on && lo !== null && hi !== null;
  return (
    <>
      <p className="intake-big" aria-hidden="true">
        🎢
      </p>
      <h1>{q.rangeTitle}</h1>
      <p className="intake-text">{q.rangeText}</p>
      <p className="safety" role="note">
        🛟 {q.rangeSafety}
      </p>
      <div className="range-live" aria-live="polite" dir="ltr">
        {live ? `${noteLabel(Math.round(lo!), settings)} … ${noteLabel(Math.round(hi!), settings)}` : now !== null ? noteLabel(Math.round(now), settings) : '🎤'}
      </div>
      {range && !on && (
        <p className="range-result" data-range="1">
          ✓ <span dir="ltr">{noteLabel(range.low, settings)} – {noteLabel(range.high, settings)}</span> · {q.voiceTypes[voiceTypeOf(range)]} <small>({q.roughGuess})</small>
        </p>
      )}
      {unclear && (
        <p className="form-error" role="alert">
          {t.vocalRangeUnclear}
        </p>
      )}
      <div className="intake-row">
        <button className="btn ghost small" onClick={onNext} data-range-skip="1">
          {range ? q.next : q.rangeLater}
        </button>
        <button className={`btn mega ${on ? 'ghost' : ''}`} disabled={on} onClick={() => void start()} data-range-start="1">
          {on ? q.rangeListening : range ? `↻ ${q.rangeAgain}` : `🎤 ${q.rangeStart}`}
        </button>
      </div>
    </>
  );
}
