// "Getting to know you" (product owner): a short, playful questionnaire before finding the level. One question
// per card, big answers, back and skip always there. The answers set the track, note names, daily length, a
// clean view, the voice range (sung gently — never strained) and the player's own order of practice areas,
// which reorders the path (src/engine/intake.ts).

import { switchCourse } from '../engine/courses';
import { Icon } from './icons';
import { setTalk, talkOn } from '../speech/talk';
import { useEffect, useRef, useState } from 'react';
import { AREAS, intakeSettings, trackOf, voiceTypeOf, type Intake as IntakeT, type Level4, type Motivation } from '../engine/intake';
import { personalOrder } from '../engine/intake';
import { defaultPacks, GOAL_NAMES, GOALS, PACKS } from '../engine/path';
import type { DomainId } from '../engine/rating';
import { rangeFromGlide, type VoiceRange } from '../engine/vocal';
import type { SungFrame } from '../engine/sing';
import { hzToMidi } from '../engine/pitch';
import { LESSON_META } from '../game/content';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { SIMULATED, tts } from './services';
import { WebSpeechTranscriber } from '../speech/webspeech';
import { AREA_WORDS, MIX_WORDS, PLAY_WORDS, matchMany, matchOption, optionsSpoken, saidAny } from '../engine/intakeVoice';
import { noteLabel } from './Vocal';

type Step = 'hello' | 'music' | 'singing' | 'theory' | 'reading' | 'plays' | 'goal' | 'naming' | 'rank' | 'leave' | 'motivation' | 'minutes' | 'range' | 'plan';
const STEPS: Step[] = ['hello', 'music', 'singing', 'theory', 'reading', 'plays', 'goal', 'naming', 'rank', 'leave', 'motivation', 'minutes', 'range', 'plan'];

export interface IntakeResult {
  intake: IntakeT;
  patch: Partial<Settings>;
}

/** One narration switch for the whole app (speech/talk.ts): talking is the default. */
const loadTalk = talkOn;
const saveTalk = setTalk;

const DRAFT_KEY = 'toneturn.intake.draft.v1';
type Draft = { step: Step; a: Partial<IntakeT>; naming: 'solfege' | 'letter' | 'auto'; ranked: DomainId[]; mixed: boolean; range: VoiceRange | null; savedAt: number };
function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null;
    return d && Date.now() - d.savedAt < 7 * 24 * 3600 * 1000 ? d : null;
  } catch {
    return null;
  }
}
function saveDraft(d: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* private mode */
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* private mode */
  }
}

export function IntakeScreen({ t, settings, onDone, onSkip }: { t: Strings; settings: Settings; onDone: (r: IntakeResult, then: 'placement' | 'basics' | 'home') => void; onSkip: () => void }) {
  const q = t.intake;
  const lang = settings.uiLang;
  const prev = settings.intake as IntakeT | undefined;
  // Leaving half-way (back button, swipe back, reload) keeps the answers so far (playtesting, 0.35.2).
  const [draft] = useState(loadDraft);
  const [step, setStep] = useState<Step>(draft?.step && STEPS.includes(draft.step) ? draft.step : 'hello');
  const [a, setA] = useState<Partial<IntakeT>>(() => draft?.a ?? (prev ? { ...prev } : { plays: [] }));
  const [naming, setNaming] = useState<'solfege' | 'letter' | 'auto'>(draft?.naming ?? (settings.naming === 'solfege' || settings.naming === 'letter' ? settings.naming : 'auto'));
  const [ranked, setRanked] = useState<DomainId[]>(() => draft?.ranked ?? prev?.priorities ?? []);
  const [mixed, setMixed] = useState(draft?.mixed ?? (prev ? prev.priorities === null : false));
  const [range, setRange] = useState<VoiceRange | null>(draft?.range ?? settings.voiceRange ?? null);
  useEffect(() => {
    if (step === 'hello' && !Object.keys(a).some((k) => k !== 'plays')) return;
    saveDraft({ step, a, naming, ranked, mixed, range, savedAt: Date.now() });
  }, [step, a, naming, ranked, mixed, range]);
  const i = STEPS.indexOf(step);
  const go = (d: 1 | -1) => setStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, i + d))]);
  const pick = <K extends keyof IntakeT>(k: K, v: IntakeT[K]) => {
    setA((x) => ({ ...x, [k]: v }));
    window.setTimeout(() => go(1), 180);
  };
  const OPTS = {
    music: [
      { v: 0 as Level4, label: q.music0 },
      { v: 1 as Level4, label: q.music1 },
      { v: 2 as Level4, label: q.music2 },
      { v: 3 as Level4, label: q.music3 },
    ],
    singing: [
      { v: 0 as Level4, label: q.sing0 },
      { v: 1 as Level4, label: q.sing1 },
      { v: 2 as Level4, label: q.sing2 },
      { v: 3 as Level4, label: q.sing3 },
    ],
    theory: [
      { v: 0 as Level4, label: q.theory0 },
      { v: 1 as Level4, label: q.theory1 },
      { v: 2 as Level4, label: q.theory2 },
      { v: 3 as Level4, label: q.theory3 },
    ],
    reading: [
      { v: 0 as 0 | 1 | 2, label: q.read0 },
      { v: 1 as 0 | 1 | 2, label: q.read1 },
      { v: 2 as 0 | 1 | 2, label: q.read2 },
    ],
    motivation: [
      { v: 'learn' as Motivation, label: q.motLearn },
      { v: 'streaks' as Motivation, label: q.motStreaks },
      { v: 'collect' as Motivation, label: q.motCollect },
      { v: 'friends' as Motivation, label: q.motFriends },
    ],
    minutes: [
      { v: 5 as const, label: q.min5 },
      { v: 10 as const, label: q.min10 },
      { v: 20 as const, label: q.min20 },
    ],
  };
  const NAMING: ['solfege' | 'letter' | 'auto', string, string][] = [
    ['solfege', '', q.namingSolfege],
    ['letter', '', q.namingLetter],
    ['auto', '', q.namingUnsure],
  ];

  // ---- Talking (product owner): by default the narrator asks out loud and listens; "Reading" at the top turns it off.
  const [talk, setTalkState] = useState<boolean>(loadTalk);
  /** Speech needs a tap first (browsers): the conversation runs once the player tapped to start or continue. */
  const [live, setLive] = useState(false);
  const [ear, setEar] = useState<'off' | 'speaking' | 'listening'>('off');
  const [heard, setHeard] = useState('');
  const [noEars, setNoEars] = useState(false);
  const [used, setUsed] = useState(false);
  const sttRef = useRef<WebSpeechTranscriber | null>(null);
  const firstLine = useRef(true);
  const wake = () => {
    tts.unlock();
    setLive(true);
    setUsed(true);
  };
  const setTalk = (on: boolean) => {
    setTalkState(on);
    saveTalk(on);
    if (on) wake();
    else {
      setLive(false);
      tts.cancel();
      sttRef.current?.abort();
    }
  };
  const speechLang = lang === 'he' ? 'he-IL' : 'en-US';
  const clean = (x: string) => x.replace(/[^\p{L}\p{N}\s,.?!'’–:;-]/gu, '').replace(/\s+/g, ' ').trim();
  const track = trackOf({ music: (a.music ?? 0) as Level4, theory: (a.theory ?? 0) as Level4, reading: (a.reading ?? 0) as 0 | 1 | 2 });
  /** What the narrator says on a step, and how an answer is handled (true = understood). */
  const voiceSpec = (st: Step): { say: string; handle?: (alts: string[]) => boolean } | null => {
    const options = <V,>(question: string, list: { v: V; label: string }[], set: (v: V) => void) => ({
      say: `${question} ${optionsSpoken(list.map((o) => o.label), lang)}`,
      handle: (alts: string[]) => {
        const k = matchOption(alts, list.map((o) => o.label), lang);
        if (k === null) return false;
        set(list[k].v);
        return true;
      },
    });
    switch (st) {
      case 'music':
        return options(q.musicQ, OPTS.music, (v) => pick('music', v));
      case 'singing':
        return options(q.singQ, OPTS.singing, (v) => pick('singing', v));
      case 'theory':
        return options(q.theoryQ, OPTS.theory, (v) => pick('theory', v));
      case 'reading':
        return options(q.readQ, OPTS.reading, (v) => pick('reading', v));
      case 'motivation':
        return options(q.motQ, OPTS.motivation, (v) => pick('motivation', v));
      case 'minutes':
        return options(q.minQ, OPTS.minutes, (v) => pick('minutes', v));
      case 'naming':
        return options(q.namingQ, NAMING.map(([v, , label]) => ({ v, label })), (v) => {
          setNaming(v);
          window.setTimeout(() => go(1), 180);
        });
      case 'plays':
        return {
          say: `${q.playsQ} ${q.voicePlays}`,
          handle: (alts) => {
            const vocab = Object.fromEntries(Object.entries(PLAY_WORDS[lang]).map(([k, w]) => [k, [...w, q.plays[k]]])) as Record<string, string[]>;
            const found = matchMany(alts, vocab);
            if (!found.length) return false;
            const list = found.includes('none') && found.length > 1 ? found.filter((k) => k !== 'none') : found;
            setA((x) => ({ ...x, plays: list }));
            window.setTimeout(() => go(1), 600);
            return true;
          },
        };
      case 'rank':
        return {
          say: `${q.rankQ} ${q.voiceRank} ${AREAS.map((x) => q.areas[x]).join(', ')}.`,
          handle: (alts) => {
            if (saidAny(alts, MIX_WORDS[lang])) {
              setMixed(true);
              window.setTimeout(() => go(1), 600);
              return true;
            }
            const vocab = Object.fromEntries(AREAS.map((x) => [x, [...AREA_WORDS[lang][x], q.areas[x]]])) as Record<DomainId, string[]>;
            const found = matchMany(alts, vocab);
            if (!found.length) return false;
            setMixed(false);
            setRanked(found);
            window.setTimeout(() => go(1), 900);
            return true;
          },
        };
      case 'range':
        return { say: `${q.rangeTitle}. ${q.rangeText} ${q.voiceRange}` };
      case 'plan': {
        const choices: { v: 'placement' | 'basics' | 'home'; label: string }[] = [
          { v: 'placement', label: `${q.findLevel} ${q.voiceLevelWords}` },
          { v: 'basics', label: `${q.startBasics} ${q.voiceBasicsWords}` },
          { v: 'home', label: `${q.justLook} ${q.voiceLookWords}` },
        ];
        return {
          say: `${clean(q.planTitle[track])}. ${q.planText[track]} ${q.voicePlan}`,
          handle: (alts) => {
            const k = matchOption(alts, choices.map((c) => c.label), lang);
            if (k === null) return false;
            finish(choices[k].v);
            return true;
          },
        };
      }
      default:
        return null;
    }
  };
  useEffect(() => {
    if (!talk || !live) return;
    const spec = voiceSpec(step);
    if (!spec) return;
    const ctl = new AbortController();
    const sig = ctl.signal;
    if (!sttRef.current) sttRef.current = new WebSpeechTranscriber();
    const stt = sttRef.current;
    const intro = firstLine.current ? `${q.helloTitle}. ` : '';
    firstLine.current = false;
    void (async () => {
      try {
        setEar('speaking');
        await tts.speak(clean(intro + spec.say), lang, sig);
        if (!spec.handle || sig.aborted) return setEar('off');
        if (!stt.isSupported()) {
          setNoEars(true);
          return setEar('off');
        }
        for (let tries = 0; tries < 3 && !sig.aborted; tries++) {
          setEar('listening');
          setHeard('');
          const r = await stt.listen({ lang: speechLang, signal: sig, onInterim: setHeard });
          if (sig.aborted) return;
          if (r.kind === 'result') {
            setHeard(r.alternatives[0] ?? '');
            if (spec.handle(r.alternatives)) return setEar('off');
          }
          if (r.kind === 'error') {
            setNoEars(true);
            return setEar('off');
          }
          if (tries < 2) {
            setEar('speaking');
            await tts.speak(tries === 0 ? q.voiceAgain : q.voiceTap, lang, sig);
          }
        }
        setEar('off');
      } catch {
        if (!sig.aborted) setEar('off');
      }
    })();
    return () => {
      ctl.abort();
      tts.cancel();
      stt.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, talk, live]);

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
    goal: a.goal ?? 'general',
    leaveOut: a.leaveOut ?? [],
    packs: a.packs ?? defaultPacks(trackOf({ music: (a.music ?? 0) as Level4, theory: (a.theory ?? 0) as Level4, reading: (a.reading ?? 0) as 0 | 1 | 2 }), a.plays ?? [], a.goal ?? 'general'),
    noSing: !!a.noSing,
    noMic: !!a.noMic,
  });
  const finish = (then: 'placement' | 'basics' | 'home') => {
    const intake = full();
    const s = intakeSettings(intake);
    const patch: Partial<Settings> = { intake, track: s.track, cleanView: s.cleanView, miniLessons: s.miniLessons, ...(s.noteViews ? { noteViews: s.noteViews } : {}) };
    // The path (spec AF D2 / D4) and the instrument (spec AE §6.1).
    patch.goal = intake.goal;
    // 0.67: "Exam prep" is the Ear course in exam-prep mode (the Exams course is gone): turn it on and go to Ear.
    if (intake.goal === 'exam') Object.assign(patch, switchCourse(settings, 'ear'), { examPrep: true });
    else if (settings.goal === 'exam') patch.examPrep = false;
    patch.pathLeaveOut = intake.leaveOut;
    patch.pathPacks = intake.packs;
    patch.noSing = intake.noSing;
    patch.noMic = intake.noMic;
    const pl = intake.plays;
    if (pl.includes('guitar')) patch.instrument = 'guitar';
    else if (pl.includes('bass')) patch.instrument = 'bass';
    else if (pl.includes('keys')) patch.instrument = 'keys';
    else if (pl.includes('strings')) patch.instrument = 'strings';
    if (naming !== 'auto') patch.naming = naming;
    if (range) patch.voiceRange = range;
    if (used) patch.voiceConsent = true;
    try {
      localStorage.setItem('toneturn.workout.minutes', String(intake.minutes));
    } catch {
      /* private mode */
    }
    clearDraft();
    onDone({ intake, patch }, then);
  };

  const opts = <K extends 'music' | 'singing' | 'theory' | 'reading' | 'motivation' | 'minutes'>(k: K, list: { v: IntakeT[K]; label: string }[]) => (
    <div className="intake-opts" role="radiogroup">
      {list.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={a[k] === o.v} className={`intake-opt ${a[k] === o.v ? 'on' : ''}`} data-v={String(o.v)} onClick={() => pick(k, o.v)}>
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );

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
        <button className={`chip talk-toggle ${talk ? 'on' : ''}`} aria-pressed={talk} onClick={() => setTalk(!talk)} data-talk={talk ? 'on' : 'off'}>
          {talk ? `${q.talkOn}` : `${q.talkOff}`}
        </button>
        <button className="link small" onClick={onSkip} data-intake-skip="1">
          {q.skipAll}
        </button>
      </header>

      {talk && step !== 'hello' && !live && (
        <button className="btn intake-wake" onClick={wake} data-wake="1">
          <Icon k="mic" /> {q.voiceResume}
        </button>
      )}
      {talk && live && ear !== 'off' && (
        <p className={`intake-ear ${ear}`} aria-live="polite">
          {ear === 'listening' ? <><Icon k="mic" /> {q.voiceListening}</> : <Icon k="speaker" />} {heard && <i>“{heard}”</i>}
        </p>
      )}
      {talk && noEars && <p className="field-hint intake-noears">{q.voiceNoEars}</p>}
      <section className="intake-card" key={step}>
        {step === 'hello' && (
          <>
            <h1>{q.helloTitle}</h1>
            <p className="intake-text">{q.helloText}</p>
            <button
              className="btn mega"
              onClick={() => {
                if (talk) wake();
                go(1);
              }}
            >
              {talk ? <><Icon k="mic" /> {q.letsTalk}</> : q.letsGo}
            </button>
            {talk && <p className="field-hint">{q.voiceNote}</p>}
          </>
        )}
        {step === 'music' && (
          <>
            <h1>{q.musicQ}</h1>
            {opts('music', OPTS.music)}
          </>
        )}
        {step === 'singing' && (
          <>
            <h1>{q.singQ}</h1>
            {opts('singing', OPTS.singing)}
          </>
        )}
        {step === 'theory' && (
          <>
            <h1>{q.theoryQ}</h1>
            {opts('theory', OPTS.theory)}
          </>
        )}
        {step === 'reading' && (
          <>
            <h1>{q.readQ}</h1>
            {opts('reading', OPTS.reading)}
          </>
        )}
        {step === 'plays' && (
          <>
            <h1>{q.playsQ}</h1>
            <p className="intake-text">{q.playsHint}</p>
            <div className="intake-chips">
              {(['none', 'keys', 'guitar', 'bass', 'strings', 'winds', 'drums', 'voice', 'production'] as const).map((k) => {
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
        {step === 'goal' && (
          <>
            <h1>{q.goalQ}</h1>
            <p className="intake-text">{q.goalHint}</p>
            <div className="intake-opts" role="radiogroup">
              {GOALS.map((g) => (
                <button
                  key={g}
                  role="radio"
                  aria-checked={(a.goal ?? 'general') === g}
                  className={`intake-opt ${(a.goal ?? 'general') === g ? 'on' : ''}`}
                  data-goal={g}
                  onClick={() => {
                    setA((x) => ({ ...x, goal: g, packs: undefined }));
                    go(1);
                  }}
                >
                  <span>{GOAL_NAMES[g][lang]}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 'leave' && (
          <>
            <h1>{q.leaveQ}</h1>
            <p className="intake-text">{q.leaveHint}</p>
            <h2 className="intake-sub">{q.leaveAreas}</h2>
            <div className="intake-chips">
              {AREAS.map((ar) => {
                const out = (a.leaveOut ?? []).includes(ar);
                return (
                  <button key={ar} className={`chip ${out ? '' : 'on'}`} aria-pressed={!out} data-area={ar} onClick={() => setA((x) => ({ ...x, leaveOut: out ? (x.leaveOut ?? []).filter((y) => y !== ar) : [...(x.leaveOut ?? []), ar] }))}>
                    {t.domainNames[ar]}
                  </button>
                );
              })}
            </div>
            <h2 className="intake-sub">{q.leavePacks}</h2>
            <div className="intake-chips">
              {PACKS.map((pk) => {
                const cur = a.packs ?? defaultPacks(track, a.plays ?? [], a.goal ?? 'general');
                const on = cur.includes(pk);
                return (
                  <button key={pk} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} data-pack={pk} onClick={() => setA((x) => ({ ...x, packs: on ? cur.filter((y) => y !== pk) : [...cur, pk] }))}>
                    {q.packNames[pk]}
                  </button>
                );
              })}
            </div>
            <h2 className="intake-sub">{q.leaveModes}</h2>
            <div className="intake-chips">
              <button className={`chip ${a.noSing ? 'on' : ''}`} aria-pressed={!!a.noSing} data-mode="nosing" onClick={() => setA((x) => ({ ...x, noSing: !x.noSing }))}>
                <Icon k="mute" /> {q.noSing}
              </button>
              <button className={`chip ${a.noMic ? 'on' : ''}`} aria-pressed={!!a.noMic} data-mode="nomic" onClick={() => setA((x) => ({ ...x, noMic: !x.noMic }))}>
                <Icon k="mic" />✕ {q.noMic}
              </button>
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
              {NAMING.map(([v, , l]) => (
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
              <span><Icon k="dice" /> {q.rankMixed}</span>
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
            {opts('motivation', OPTS.motivation)}
          </>
        )}
        {step === 'minutes' && (
          <>
            <h1>{q.minQ}</h1>
            {opts('minutes', OPTS.minutes)}
          </>
        )}
        {step === 'range' && <RangeStep t={t} settings={settings} range={range} onRange={setRange} onNext={() => go(1)} />}
        {step === 'plan' && (
          <>
            <h1>{q.planTitle[track]}</h1>
            <p className="intake-text">{q.planText[track]}</p>
            <div className="plan-facts">
              {!mixed && ranked.length > 0 && (
                <p>
                  <b>{q.planOrder}</b> {[...ranked, ...AREAS.filter((x) => !ranked.includes(x))].map((x) => q.areas[x]).join(' · ')}
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
                <button className="btn primary" onClick={() => finish('basics')} data-plan="basics">
                  {q.startBasics}
                </button>
                <button className="btn ghost" onClick={() => finish('placement')} data-plan="placement">
                  {q.findLevelInstead}
                </button>
              </>
            ) : (
              <>
                <button className="btn primary" onClick={() => finish('placement')} data-plan="placement">
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
  /** Every frame heard so far (so "Stop" keeps what was sung), and whether the stop means "start over". */
  const seen = useRef<SungFrame[]>([]);
  const again = useRef(false);
  useEffect(() => () => ctl.current?.abort(), []);
  // Playtesting: stopping and trying again must be obvious while the siren records.
  const stop = () => ctl.current?.abort();
  const restart = () => {
    again.current = true;
    ctl.current?.abort();
  };
  const start = async (): Promise<void> => {
    seen.current = [];
    again.current = false;
    setOn(true);
    setUnclear(false);
    setLo(null);
    setHi(null);
    const c = new AbortController();
    ctl.current = c;
    const onFrame = (f: SungFrame) => {
      seen.current.push(f);
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
        got = r.kind === 'frames' ? r.frames : seen.current;
      } catch {
        got = seen.current; /* stopped, or no microphone */
      }
    }
    if (again.current) return start();
    setOn(false);
    const rg = rangeFromGlide(got);
    if (rg) onRange(rg);
    else setUnclear(true);
  };
  const live = on && lo !== null && hi !== null;
  return (
    <>
      <h1>{q.rangeTitle}</h1>
      <p className="intake-text">{q.rangeText}</p>
      <p className="safety" role="note">
        {q.rangeSafety}
      </p>
      <div className="range-live" aria-live="polite" dir="ltr">
        {live ? `${noteLabel(Math.round(lo!), settings)} … ${noteLabel(Math.round(hi!), settings)}` : now !== null ? noteLabel(Math.round(now), settings) : <Icon k="mic" />}
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
      {on ? (
        <>
          <p className="range-rec" aria-live="polite">
            <span className="rec-dot" aria-hidden="true" /> {q.rangeListening}
          </p>
          <div className="range-controls">
            <button className="btn mega" onClick={stop} data-range-stop="1">
              ⏹ {q.rangeStop}
            </button>
            <button className="btn ghost" onClick={restart} data-range-restart="1">
              ↻ {q.rangeRestart}
            </button>
          </div>
        </>
      ) : range ? (
        <div className="range-controls">
          <button className="btn mega" onClick={onNext} data-range-keep="1">
            ✓ {q.rangeKeep}
          </button>
          <button className="btn ghost" onClick={() => void start()} data-range-start="1">
            ↻ {q.rangeAgain}
          </button>
        </div>
      ) : (
        <div className="range-controls">
          <button className="btn mega" onClick={() => void start()} data-range-start="1">
            <Icon k="mic" /> {unclear ? q.rangeAgain : q.rangeStart}
          </button>
          <button className="btn ghost small" onClick={onNext} data-range-skip="1">
            {q.rangeLater}
          </button>
        </div>
      )}
    </>
  );
}

/** A questionnaire left half-way: how far it got (for the home screen's "continue" line). */
export function intakeDraftProgress(): { done: number; all: number } | null {
  const d = loadDraft();
  if (!d || !STEPS.includes(d.step)) return null;
  const done = STEPS.indexOf(d.step);
  return done > 0 && d.step !== 'plan' ? { done: done - 1, all: STEPS.length - 2 } : null;
}
