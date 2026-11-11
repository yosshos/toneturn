// "Truth or Bluff" (product owner; was "True or false?", spec addendum O): a statement about music appears —
// true, or a bluff? Pick the topics (theory without sound, or the interval trios, also by ear) and a level
// (easy / medium / hard) at the start. Solo 60-second run, a duel on one device, or online (a room with the
// same topics and level). After a wrong answer the reason is shown, so every miss teaches something.

import { Glyph, glyphForEmoji } from './Glyph';
import { useEffect, useMemo, useRef, useState } from 'react';
import { clearSlot, loadSlot, saveSlot } from '../storage/resume';
import { tfPoints, TF_PENALTY_MS, TF_RUN_MS } from '../engine/truefalse';
import { factDifficulty, factItem, FACT_TOPICS, SILENT_TOPICS, type Fact, type FactLevel, type FactTopic } from '../engine/theoryFacts';
import { mulberry32 } from '../engine/lesson';
import { displayNote, type Naming } from '../engine/pitch';
import type { RatingEvent } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { namingFor, type Progress, type Settings } from '../storage/progress';
import { piano, store } from './services';
import { TrioArt } from './TrioArt';
import { TierChips } from './TierChips';
import { startTier, tierDef, tierDifficulty, type DynName, type TierInfo } from '../engine/gameTiers';
import { PLAYER_COLORS } from '../engine/match';

type Mode = 'solo' | 'duel' | 'online';
const PICK_KEY = 'toneturn.tfTopics';

function savedTopics(): FactTopic[] {
  try {
    const v = JSON.parse(localStorage.getItem(PICK_KEY) ?? 'null') as FactTopic[] | null;
    if (Array.isArray(v) && v.length && v.every((x) => FACT_TOPICS.some((t) => t.id === x))) return v;
  } catch {
    /* private mode */
  }
  return SILENT_TOPICS.filter((x) => x !== 'trio');
}

/** `skip`: statements already played (continuing a saved run: the same statements follow). */
const TF_SOLO = 'tf:solo';
type SoloSave = { topics: FactTopic[]; level: FactLevel; seed: number; n: number; score: number; streak: number; left: number; events: RatingEvent[] };

function useFacts(topics: FactTopic[], level: FactLevel, seed: number, skip = 0) {
  const rnd = useMemo(() => mulberry32(seed), [seed]);
  const [n, setN] = useState(skip);
  const [fact, setFact] = useState<Fact>(() => {
    for (let k = 0; k < skip; k++) factItem(topics, level, rnd);
    return factItem(topics, level, rnd);
  });
  const next = () => {
    setFact(factItem(topics, level, rnd));
    setN((x) => x + 1);
  };
  return { fact, n, next };
}

/** Facts about a sound (by ear) play when they appear, and on Repeat. */
function playFact(f: Fact) {
  const midis = f.trio && f.topic === 'trio-ear' ? f.trio.midis : f.midis;
  if (!midis) return;
  const events = midis.map((m, i) => ({ midi: m, start: i * 0.6, duration: 0.55, velocity: 0.7 }));
  void piano.play(events, midis.length * 0.6 + 0.3, new AbortController().signal).catch(() => {});
}
const hasSound = (f: Fact) => !!f.midis || (!!f.trio && f.topic === 'trio-ear');

function Statement({ fact, n, nm, lang }: { fact: Fact; n: number; nm: Naming; lang: 'he' | 'en' }) {
  if (fact.trio) {
    const item = fact.trio;
    const ear = fact.topic === 'trio-ear';
    const name = (p: typeof item.trio.left) => (ear ? '?' : displayNote(p, item.level === 3 ? 'solfege' : nm, lang));
    return <TrioArt n={n} left={name(item.trio.left)} mid={name(item.trio.mid)} right={name(item.trio.right)} intervalLeft={item.shownLeft} intervalRight={item.shownRight} className="tf-art" />;
  }
  const topic = FACT_TOPICS.find((x) => x.id === fact.topic)!;
  return (
    <div className="tf-statement" key={n} data-topic={fact.topic}>
      <small className="tf-topic">
        <Glyph kind={glyphForEmoji(topic.emoji)} color="#FF8A3D" size={30} /> {topic.title[lang]}
      </small>
      <p className="tf-text">{fact.text[lang]}</p>
    </div>
  );
}

/** Why it was true or a bluff (after a wrong answer, and after each duel round). */
function Why({ fact, t, lang }: { fact: Fact; t: Strings; lang: 'he' | 'en' }) {
  if (fact.trio) return <p className="tf-why" dir="ltr">{fact.truth ? t.tfWasTrue : `${t.tfWasFalse}: ${fact.trio.trio.intervalLeft} · ${fact.trio.trio.intervalRight}`}</p>;
  return (
    <p className="tf-why">
      <b>{fact.truth ? t.tfWasTrue : t.tfWasBluff}</b> — {fact.why[lang]}
    </p>
  );
}

/** Topics (several) and a level: used by the game and by online rooms. */
export function FactPicker({ t, lang, topics, onTopics, level, onLevel, levelSlot }: { t: Strings; lang: 'he' | 'en'; topics: FactTopic[]; onTopics: (x: FactTopic[]) => void; level: FactLevel; onLevel: (l: FactLevel) => void; /** Level tiers replace the easy / medium / hard selector (GAMES_TIERS_PLAN). */ levelSlot?: React.ReactNode }) {
  const toggle = (id: FactTopic) => {
    const nx = topics.includes(id) ? topics.filter((x) => x !== id) : [...topics, id];
    if (nx.length) onTopics(nx);
  };
  const allSilent = SILENT_TOPICS.filter((x) => x !== 'trio');
  return (
    <>
      <fieldset className="seg-field">
        <legend>
          {t.tfTopics}{' '}
          <button type="button" className="link small" onClick={() => onTopics(allSilent)}>
            {t.tfAllTheory}
          </button>
        </legend>
        <div className="tf-topics" role="group" aria-label={t.tfTopics}>
          {FACT_TOPICS.map((x) => (
            <button key={x.id} type="button" className={`chip ${topics.includes(x.id) ? 'on' : ''}`} aria-pressed={topics.includes(x.id)} data-topic={x.id} onClick={() => toggle(x.id)}>
              {x.title[lang]}
              {x.sound && <small> · {t.tfSound}</small>}
            </button>
          ))}
        </div>
      </fieldset>
      {levelSlot ?? (
      <fieldset className="seg-field">
        <legend>{t.tfLevelLabel}</legend>
        <div className="seg" role="radiogroup" aria-label={t.tfLevelLabel}>
          {([1, 2, 3] as FactLevel[]).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={level === v} className={level === v ? 'on' : ''} onClick={() => onLevel(v)}>
              {[t.tfStage1, t.tfStage2, t.tfStage3][v - 1]}
            </button>
          ))}
        </div>
      </fieldset>
      )}
    </>
  );
}

export function TrueFalseScreen({
  t,
  settings,
  progress,
  onBack,
  onProgress,
  onOnline,
  tier: tierInfo,
}: {
  t: Strings;
  settings: Settings;
  progress: Progress;
  onBack: () => void;
  onProgress: (p: Progress) => void;
  onOnline: (topics: FactTopic[], level: FactLevel) => void;
  tier?: TierInfo;
}) {
  const lang = settings.uiLang;
  const [mode, setMode] = useState<Mode>('solo');
  const [topics, setTopicsRaw] = useState<FactTopic[]>(savedTopics);
  const [tier, setTierRaw] = useState<DynName>(() => (tierInfo ? startTier(tierInfo) : 'pp'));
  const levelOf = (x: DynName) => (tierDef('truefalse', x)?.levels?.[0] ?? 1) as FactLevel;
  const [level, setLevel] = useState<FactLevel>(() => (tierInfo ? levelOf(startTier(tierInfo)) : 1));
  const setTier = (x: DynName) => {
    setTierRaw(x);
    setLevel(levelOf(x));
  };
  const [run, setRun] = useState<number | null>(null);
  const setTopics = (x: FactTopic[]) => {
    setTopicsRaw(x);
    try {
      localStorage.setItem(PICK_KEY, JSON.stringify(x));
    } catch {
      /* private mode */
    }
  };
  const bestKey = `s${level}`;
  // Left half-way, a run continues where it stopped (playtesting, 0.35.3).
  const [resume, setResume] = useState<boolean>(false);
  const savedSolo = loadSlot<SoloSave>(TF_SOLO);
  if (run !== null)
    return mode === 'solo' ? (
      <SoloRun key={run} t={t} settings={settings} topics={tierInfo && tierDef('truefalse', tier)?.params?.jazz && topics.length && !topics.includes('jazz') ? [...topics, 'jazz'] : topics} level={level} tier={tierInfo ? tier : undefined} best={progress.tfBest?.[bestKey] ?? 0} bestKey={bestKey} resume={resume ? savedSolo?.data : undefined} onProgress={onProgress} onExit={() => setRun(null)} onAgain={() => (setResume(false), setRun((r) => (r ?? 0) + 1))} />
    ) : (
      <DuelRun key={run} t={t} settings={settings} topics={topics} level={level} onExit={() => setRun(null)} onAgain={() => setRun((r) => (r ?? 0) + 1)} />
    );
  const cont = mode === 'solo' ? savedSolo : null;
  return (
    <main className="panel-screen tf-setup">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.trueFalse}</h1>
      </header>
      <p className="field-hint">{t.tfHint}</p>
      <section className="set-card">
        <FactPicker t={t} lang={lang} topics={topics} onTopics={setTopics} level={level} onLevel={setLevel} levelSlot={tierInfo && mode === 'solo' ? <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game="truefalse" /> : undefined} />
        <fieldset className="seg-field">
          <legend>{t.players}</legend>
          <div className="seg" role="radiogroup" aria-label={t.players}>
            {(['solo', 'duel', 'online'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                {m === 'solo' ? t.tfSolo : m === 'duel' ? t.tfDuel : t.online}
              </button>
            ))}
          </div>
        </fieldset>
        {mode === 'solo' && <p className="field-hint">{progress.tfBest?.[bestKey] ? `${t.personalBest}: ${progress.tfBest[bestKey]}` : t.tfNoBest}</p>}
      </section>
      {cont && (
        <button
          className="btn primary mega"
          data-resume-tf="1"
          onClick={() => {
            void piano.unlock();
            setTopicsRaw(cont.data.topics);
            setLevel(cont.data.level);
            setResume(true);
            setRun(Date.now());
          }}
        >
          {cont.total > 0 ? t.continueAt(cont.done, cont.total) : `${t.resumeSession.go} · ${t.tfSavedRun(Math.ceil((cont.data as SoloSave).left / 1000), (cont.data as SoloSave).score)}`}
        </button>
      )}
      <button
        className={`btn ${cont ? 'ghost' : 'primary mega'}`}
        onClick={() => {
          void piano.unlock();
          if (mode === 'online') return onOnline(topics, level);
          if (mode === 'solo') clearSlot(TF_SOLO);
          setResume(false);
          setRun(Date.now());
        }}
      >
        {cont ? t.newGame : t.play}
      </button>
    </main>
  );
}

function SoloRun({ t, settings, topics, level, tier, best, bestKey, resume, onProgress, onExit, onAgain }: { t: Strings; settings: Settings; topics: FactTopic[]; level: FactLevel; tier?: DynName; best: number; bestKey: string; resume?: SoloSave; onProgress: (p: Progress) => void; onExit: () => void; onAgain: () => void }) {
  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const seed = useMemo(() => resume?.seed ?? (Date.now() ^ (Math.random() * 1e9)) >>> 0, [resume]);
  const { fact, n, next } = useFacts(topics, level, seed, resume?.n ?? 0);
  const [deadline, setDeadline] = useState(() => performance.now() + (resume?.left ?? TF_RUN_MS));
  const [now, setNow] = useState(performance.now());
  const [score, setScore] = useState(resume?.score ?? 0);
  const [streak, setStreak] = useState(resume?.streak ?? 0);
  const [flash, setFlash] = useState<null | { ok: boolean }>(null);
  const [over, setOver] = useState<null | { best: boolean }>(null);
  const events = useRef<RatingEvent[]>(resume?.events ?? []);
  const answered = useRef(resume?.events.length ?? 0);
  // Saved after each statement: the clock left, the score and streak, where the statements stood.
  useEffect(() => {
    if (over || n === 0) return;
    const leftNow = Math.max(0, deadline - performance.now());
    if (leftNow > 0) saveSlot<SoloSave>(TF_SOLO, { title: `${t.trueFalse} · ${t.tfSavedRun(Math.ceil(leftNow / 1000), score)}`, route: 'truefalse', done: 0, total: 0, data: { topics, level, seed, n, score, streak, left: leftNow, events: events.current } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  useEffect(() => {
    if (over) return;
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [over]);
  useEffect(() => {
    playFact(fact);
  }, [n, fact]);
  // The clock pauses while the reason for a miss is on screen (reading it is part of the game).
  const left = Math.max(0, deadline - now);
  useEffect(() => {
    if (left > 0 || over) return;
    clearSlot(TF_SOLO);
    void store.recordTrueFalse(bestKey, score, events.current).then(async ({ progress, best: isBest }) => {
      // A tiered run (GAMES_TIERS_PLAN): the tier's rule and the game's XP.
      if (tier) {
        const right = events.current.filter((e) => e.correct).length;
        progress = await store.recordTierRun('truefalse', tier, score, { right, wrong: events.current.length - right }, String(seed));
      }
      onProgress(progress);
      setOver({ best: isBest });
      piano.cue('complete');
    });
  }, [left, over, bestKey, score, onProgress]);

  const answer = (said: boolean) => {
    if (flash || over || left <= 0) return;
    const ok = said === fact.truth;
    events.current.push({ id: `g:tf:${seed}:${answered.current++}`, skill: fact.skill, difficulty: tier ? tierDifficulty(tier) : fact.trio ? 1000 + 100 * fact.trio.level : factDifficulty(level), correct: ok, at: new Date().toISOString() });
    if (ok) {
      setScore((s) => s + tfPoints(streak));
      setStreak((s) => s + 1);
      piano.cue('correct');
    } else {
      setStreak(0);
      setDeadline((d) => d - TF_PENALTY_MS);
      piano.cue('wrong');
    }
    setFlash({ ok });
    const pause = ok ? 350 : fact.trio ? 1300 : 2600;
    if (!ok) setDeadline((d) => d + pause);
    window.setTimeout(() => {
      setFlash(null);
      next();
    }, pause);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 't') answer(true);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'b') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (over)
    return (
      <main className="recap scoreboard">
        <p className="eyebrow">{t.trueFalse}</p>
        <h1>{t.gameOver}</h1>
        <p className="big-score">
          <b dir="ltr">{score}</b>
          <small>{over.best ? t.newPeak : `${t.personalBest}: ${Math.max(best, score)}`}</small>
        </p>
        <div className="recap-actions">
          <button className="btn primary mega" onClick={onAgain}>
            {t.rematch}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {t.home}
          </button>
        </div>
      </main>
    );

  return (
    <main className={`tf-play ${flash ? (flash.ok ? 'flash-ok' : 'flash-no') : ''}`}>
      <div className="tf-top">
        <button className="icon-btn" onClick={onExit} aria-label={t.exit}>
          ✕
        </button>
        <span className="tf-score" dir="ltr">
          {score}
          {streak >= 5 && <small> ×{tfPoints(streak)}</small>}
        </span>
        <span className="tf-time" dir="ltr">
          {Math.ceil(left / 1000)}s
        </span>
      </div>
      <div className="time-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (left / TF_RUN_MS) * 100)}%` }} />
      </div>
      <Statement fact={fact} n={n} nm={nm} lang={lang} />
      <p className="tf-ask">{fact.trio ? t.tfAskTrio : t.tfAsk}</p>
      {flash && !flash.ok && <Why fact={fact} t={t} lang={lang} />}
      <div className="tf-buttons">
        <button className="answer tone-mint tf-true" onPointerDown={(e) => (e.preventDefault(), answer(true))} disabled={!!flash}>
          <b>✓</b>
          <small>{t.tfTrue}</small>
        </button>
        <button className="answer tone-coral tf-false" onPointerDown={(e) => (e.preventDefault(), answer(false))} disabled={!!flash}>
          <b>✗</b>
          <small>{t.tfFalse}</small>
        </button>
      </div>
      {hasSound(fact) && (
        <button className="btn small" onClick={() => playFact(fact)}>
          ↻ {t.repeat}
        </button>
      )}
    </main>
  );
}

const DUEL_ROUNDS = 10;

function DuelRun({ t, settings, topics, level, onExit, onAgain }: { t: Strings; settings: Settings; topics: FactTopic[]; level: FactLevel; onExit: () => void; onAgain: () => void }) {
  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const seed = useMemo(() => (Date.now() ^ (Math.random() * 1e9)) >>> 0, []);
  const { fact, n, next } = useFacts(topics, level, seed);
  const [scores, setScores] = useState([0, 0]);
  const [locked, setLocked] = useState<[boolean, boolean]>([false, false]);
  const [winner, setWinner] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  // A duel is not saved: leaving a game against someone means losing it (product owner).
  useEffect(() => {
    playFact(fact);
  }, [n, fact]);
  const nextRound = () => {
    window.setTimeout(() => {
      setWinner(null);
      setLocked([false, false]);
      setRound((r) => r + 1);
      next();
    }, fact.trio ? 1500 : 2600);
  };
  const answer = (p: number, said: boolean) => {
    if (winner !== null || locked[p] || round >= DUEL_ROUNDS) return;
    if (said === fact.truth) {
      setWinner(p);
      setScores((s) => s.map((x, i) => (i === p ? x + 1 : x)));
      piano.cue('correct');
      nextRound();
    } else {
      const l: [boolean, boolean] = [...locked] as [boolean, boolean];
      l[p] = true;
      setLocked(l);
      piano.cue('wrong');
      if (l[0] && l[1]) {
        setWinner(-1);
        nextRound();
      }
    }
  };
  const names = [`${t.playerN} 1`, `${t.playerN} 2`];
  if (round >= DUEL_ROUNDS) {
    const w = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
    return (
      <main className="recap scoreboard">
        <p className="eyebrow">{t.trueFalse}</p>
        <h1>{w === null ? t.tie : `${t.winner}: ${names[w]}`}</h1>
        <ol className="board">
          {[0, 1].map((p) => (
            <li key={p} style={{ ['--pc' as string]: PLAYER_COLORS[p] }}>
              <span className="dot" aria-hidden="true" />
              <span className="pname">{names[p]}</span>
              <span className="pbest" dir="ltr">
                {scores[p]}
              </span>
            </li>
          ))}
        </ol>
        <div className="recap-actions">
          <button className="btn primary mega" onClick={onAgain}>
            {t.rematch}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {t.home}
          </button>
        </div>
      </main>
    );
  }
  const half = (p: number) => (
    <section className={`duel-half p${p} ${p === 0 ? 'flip' : ''} ${winner === p ? 'won' : ''}`} style={{ ['--pc' as string]: PLAYER_COLORS[p] }}>
      <div className="half-head">
        <span className="dot" aria-hidden="true" />
        <b>{names[p]}</b>
        <span className="half-score" dir="ltr">
          {scores[p]}
        </span>
      </div>
      {/* The statement faces each player (the top half is turned around). */}
      {!fact.trio && <p className="half-ask tf-half-text">{fact.text[lang]}</p>}
      <div className="tf-buttons">
        <button className="answer tone-mint" data-player={p} data-answer="true" disabled={locked[p] || winner !== null} onPointerDown={(e) => (e.preventDefault(), answer(p, true))}>
          <b>✓</b>
          <small>{t.tfTrue}</small>
        </button>
        <button className="answer tone-coral" data-player={p} data-answer="false" disabled={locked[p] || winner !== null} onPointerDown={(e) => (e.preventDefault(), answer(p, false))}>
          <b>✗</b>
          <small>{t.tfFalse}</small>
        </button>
      </div>
    </section>
  );
  return (
    <main className="tournament duel tf-duel">
      {half(0)}
      <section className="t-center">
        <div className="t-top">
          <button className="icon-btn" onClick={onExit} aria-label={t.exit}>
            ✕
          </button>
          <span className="t-round" dir="ltr">
            {round + 1}/{DUEL_ROUNDS}
          </span>
          {hasSound(fact) && (
            <button className="icon-btn" onClick={() => playFact(fact)} aria-label={t.repeat}>
              ↻
            </button>
          )}
        </div>
        {fact.trio ? <Statement fact={fact} n={n} nm={nm} lang={lang} /> : <small className="tf-topic">{FACT_TOPICS.find((x) => x.id === fact.topic)?.title[lang]}</small>}
        {winner !== null && <Why fact={fact} t={t} lang={lang} />}
      </section>
      {half(1)}
    </main>
  );
}
