import { DOMAIN_COLOR, Glyph } from './Glyph';
import { EchoArt } from './GameArt';
import { NotesView } from './NotesView';
import { TalkToggle } from './TalkToggle';
import type { PadSet } from '../engine/memory';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { displayNote } from '../engine/pitch';
import { PLAYER_COLORS } from '../engine/match';
import { MemoryGameController, type GameInput, type GameKind, type GameView, type RoundStat } from '../game/memoryGame';
import type { Match } from '../engine/match';
import { clearSlot, loadSlot, saveSlot } from '../storage/resume';
import type { Strings } from '../i18n/strings';
import { namingFor, type Progress, type Settings } from '../storage/progress';
import { MicIcon, Note, PermissionPanel } from './bits';
import { makeGameAdapters, piano, store } from './services';
import { calibrationOffset } from '../engine/memory';

export interface GameSetupValue {
  kind: GameKind;
  input: GameInput;
  players: string[];
  bpm: number;
  ladder?: boolean;
  swing?: boolean;
  pads?: PadSet;
  /** Beat Echo on a kit: kick-and-snare phrases, two pads. */
  drums?: boolean;
}

// ======================================================================= setup

export function GameSetup({
  t,
  initialKind,
  progress,
  onBack,
  onStart,
  settings,
  onSettings,
  onTrueFalse,
}: {
  t: Strings;
  initialKind: GameKind;
  progress: Progress;
  onBack: () => void;
  onTrueFalse?: () => void;
  onStart: (v: GameSetupValue) => void;
  settings: Settings;
  onSettings: (p: Partial<Settings>) => void;
}) {
  const [kind, setKind] = useState<GameKind>(initialKind);
  const [input, setInput] = useState<GameInput>(initialKind === 'melody' ? 'pads' : 'tap');
  const [count, setCount] = useState(1);
  const [ladder, setLadder] = useState(false);
  const [swing, setSwing] = useState(false);
  const [drums, setDrums] = useState(true);
  const [pads, setPads] = useState<PadSet>('basic');
  const resumeGame = loadSlot<{ setup: GameSetupValue; match: Match }>(`game:${kind}`);
  // (solo games only are ever saved)
  const [names, setNames] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('toneturn.players') ?? 'null') as string[] | null;
      if (saved?.length === 4) return saved;
    } catch {
      /* ignore */
    }
    return [1, 2, 3, 4].map((i) => `${t.playerN} ${i}`);
  });
  const [bpm, setBpm] = useState(90);
  const best = progress.games?.[kind] ?? 0;

  const pickKind = (k: GameKind) => {
    setKind(k);
    setInput(k === 'melody' ? 'pads' : 'tap');
  };
  const inputs: [GameInput, string][] = kind === 'melody' ? [['pads', t.inPads], ['sing', t.inSing]] : [['tap', t.inTap], ['knock', t.inKnock]];

  return (
    <main className="panel-screen game-setup">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.games}</h1>
      </header>

      <EchoArt kind={kind} />
      <div className="game-cards" role="radiogroup" aria-label={t.games}>
        {(['melody', 'rhythm'] as const).map((k) => (
          <button key={k} role="radio" aria-checked={kind === k} className={`game-card ${k} ${kind === k ? 'on' : ''}`} onClick={() => pickKind(k)}>
            <GameIcon kind={k} />
            <b>{k === 'melody' ? t.echoChain : t.beatEcho}</b>
            <small>{k === 'melody' ? t.echoChainBlurb : t.beatEchoBlurb}</small>
            {(progress.games?.[k] ?? 0) > 0 && (
              <span className="best-chip">
                {t.personalBest}: {progress.games?.[k]}
              </span>
            )}
          </button>
        ))}
      </div>
      {onTrueFalse && (
        <button className="game-card truefalse games-tf" onClick={onTrueFalse}>
          <span className="duel-icon" aria-hidden="true">
            ✓✗
          </span>
          <b>{t.trueFalse}</b>
          <small>{t.tfBlurb}</small>
        </button>
      )}

      <section className="set-card">
        <fieldset className="seg-field">
          <legend>{t.answerWith}</legend>
          <div className="seg" role="radiogroup" aria-label={t.answerWith}>
            {inputs.map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={input === v} className={input === v ? 'on' : ''} onClick={() => setInput(v)}>
                {(v === 'sing' || v === 'knock') && <MicIcon />} {l}
              </button>
            ))}
          </div>
          {input === 'knock' && <p className="field-hint">{t.knockHint}</p>}
          {kind === 'rhythm' && input === 'tap' && <Calibrate t={t} latency={settings.tapLatencyMs} onDone={(ms) => onSettings({ tapLatencyMs: ms })} />}
          {input === 'sing' && <p className="field-hint">{t.singHint}</p>}
        </fieldset>

        {kind === 'rhythm' && (
          <fieldset className="seg-field">
            <legend>{t.tempo}</legend>
            <div className="seg" role="radiogroup" aria-label={t.tempo}>
              {(
                [
                  [75, t.slow],
                  [90, t.medium],
                  [110, t.fast],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={bpm === v} className={bpm === v ? 'on' : ''} onClick={() => setBpm(v)}>
                  {l} <small dir="ltr">{v}</small>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="seg-field">
          <legend>{t.players}</legend>
          <div className="seg" role="radiogroup" aria-label={t.players}>
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={count === n} className={count === n ? 'on' : ''} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        {count > 1 && (
          <div className="name-list">
            {names.slice(0, count).map((n, i) => (
              <label key={i} className="name-row" style={{ ['--pc' as string]: PLAYER_COLORS[i] }}>
                <span className="dot" aria-hidden="true" />
                <input
                  value={n}
                  maxLength={16}
                  aria-label={`${t.playerN} ${i + 1}`}
                  onChange={(e) => setNames((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))}
                />
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="set-card">
        {kind === 'melody' && input === 'sing' && (
          <fieldset className="seg-field">
            <legend>{t.echoTolerance}</legend>
            <div className="seg" role="radiogroup" aria-label={t.echoTolerance}>
              {[35, 50, 80, 120].map((c) => (
                <button key={c} type="button" role="radio" aria-checked={(settings.echoTolerance ?? 80) === c} className={(settings.echoTolerance ?? 80) === c ? 'on' : ''} onClick={() => onSettings({ echoTolerance: c })}>
                  ±{c}¢
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <label className="toggle-row">
          <input type="checkbox" checked={ladder} onChange={(e) => setLadder(e.target.checked)} />
          <span>
            {t.tempoLadder}
            <small className="field-hint">{t.tempoLadderHint}</small>
          </span>
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={swing} onChange={(e) => setSwing(e.target.checked)} />
          <span>
            {t.swingFeel}
            <small className="field-hint">{t.swingFeelHint}</small>
          </span>
        </label>
        {kind === 'rhythm' && input === 'tap' && (
          <label className="toggle-row">
            <input type="checkbox" checked={drums} onChange={(e) => setDrums(e.target.checked)} data-drums-toggle />
            <span>
              {t.drumEcho}
              <small className="field-hint">{t.drumEchoHint}</small>
            </span>
          </label>
        )}
        {kind === 'melody' && (
          <fieldset className="seg-field">
            <legend>{t.padSet}</legend>
            <div className="seg" role="radiogroup" aria-label={t.padSet}>
              {(['basic', 'penta', 'full'] as const).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={pads === p} className={pads === p ? 'on' : ''} onClick={() => setPads(p)}>
                  {t.padSets[p]}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      {best > 0 && count === 1 && (
        <p className="field-hint">
          {t.personalBest}: {best} {kind === 'melody' ? t.notes : t.beats}
        </p>
      )}
      {resumeGame && (
        <button className="btn primary mega" data-resume-game="1" onClick={() => onStart(resumeGame.data.setup)}>
          {t.continueGame(resumeGame.data.match.players.map((p) => p.name).join(' · '))}
        </button>
      )}
      <button
        className={`btn ${resumeGame ? 'ghost' : 'primary mega'}`}
        onClick={() => {
          clearSlot(`game:${kind}`);
          const ps = names.slice(0, count).map((n, i) => n.trim() || `${t.playerN} ${i + 1}`);
          try {
            localStorage.setItem('toneturn.players', JSON.stringify(names));
          } catch {
            /* ignore */
          }
          onStart({ kind, input, players: count === 1 ? [ps[0] || t.playerN] : ps, bpm, ladder, swing, pads, drums: kind === 'rhythm' && input === 'tap' && drums });
        }}
      >
        {t.play}
      </button>
    </main>
  );
}

/** 0.61: the echo games in the note-head symbol set (echo = memory blue, beat echo = rhythm pink). */
export function GameIcon({ kind }: { kind: GameKind }) {
  return kind === 'melody' ? <Glyph kind="echo" color={DOMAIN_COLOR.ear} size={44} /> : <Glyph kind="rhythm" color={DOMAIN_COLOR.rhythm} size={44} />;
}

// ======================================================================= play


export function GameScreen({
  t,
  settings,
  setup,
  onExit,
  onChangePlayers,
  onProgress,
}: {
  t: Strings;
  settings: Settings;
  setup: GameSetupValue;
  onExit: () => void;
  onChangePlayers: () => void;
  onProgress: (p: Progress) => void;
}) {
  const ref = useRef<MemoryGameController | null>(null);
  // Left half-way, the same game (same setup) continues where it stopped (playtesting, 0.35.3).
  const slotKey = `game:${setup.kind}`;
  const saved = useMemo(() => {
    const v = loadSlot<{ setup: GameSetupValue; seed: number; match: Match; rounds: RoundStat[] }>(slotKey);
    return v && setup.players.length === 1 && JSON.stringify(v.data.setup) === JSON.stringify(setup) ? v : null;
  }, [slotKey, setup]);
  const seed = useMemo(() => saved?.data.seed ?? (Date.now() ^ (Math.random() * 1e9)) >>> 0, [saved]);
  if (!ref.current) {
    ref.current = new MemoryGameController(
      {
        kind: setup.kind,
        input: setup.input,
        players: setup.players,
        seed,
        lang: settings.outputLang,
        naming: namingFor(settings.naming, settings.outputLang),
        bpm: setup.bpm,
        ladder: setup.ladder,
        swing: setup.swing,
        pads: setup.pads,
        drums: setup.drums,
        tolCents: settings.echoTolerance ?? 80,
        latencyMs: settings.tapLatencyMs,
        voiceRange: settings.voiceRange,
      },
      makeGameAdapters(),
      {
        // Only solo games are saved: leaving a game against others means losing it (product owner).
        onTurn: (m, rounds) =>
          m.players.length === 1 &&
          saveSlot(slotKey, { title: setup.kind === 'melody' ? t.echoChain : t.beatEcho, route: 'games', done: m.log.length, total: 0, data: { setup, seed, match: m, rounds } }),
        onOver: (m, kind, rounds) => {
          clearSlot(slotKey);
          const best = Math.max(...m.players.map((p) => p.best));
          void (async () => {
            let p = await store.recordGameBest(kind, best);
            // Solo games rate the player's skill; shared-device games don't know who "you" are.
            if (m.players.length === 1) p = await store.recordGameRounds(kind, seed, rounds);
            onProgress(p);
          })();
        },
      },
      saved ? { match: saved.data.match, rounds: saved.data.rounds } : undefined,
    );
  }
  const c = ref.current;
  const v = useSyncExternalStore(c.subscribe, c.getView);
  const drums = !!setup.drums && v.input === 'tap';
  useEffect(() => {
    void c.start();
    return () => c.dispose();
  }, [c]);

  // Keyboard: Space / Enter tap the beat; 1–4 tap pads.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (v.kind === 'rhythm' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        c.tapBeat(e.timeStamp, 'k');
      }
      // Drum Echo: F / D / ← = kick, J / K / → = snare.
      if (v.kind === 'rhythm' && /^(KeyF|KeyD|ArrowLeft|KeyJ|KeyK|ArrowRight)$/.test(e.code)) {
        e.preventDefault();
        c.tapBeat(e.timeStamp, /^(KeyF|KeyD|ArrowLeft)$/.test(e.code) ? 'k' : 's');
      }
      if (v.kind === 'melody' && /^Digit[1-4]$/.test(e.code)) c.tapPad(Number(e.code.slice(5)) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c, v.kind]);

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const m = v.match;
  const cur = m.players[m.turn];
  const multi = m.players.length > 1;

  if (v.stage === 'over') return <Scoreboard t={t} v={v} onRematch={() => c.rematch()} onChangePlayers={onChangePlayers} onHome={onExit} />;

  return (
    <main className={`game kind-${v.kind} stage-${v.stage}`} style={{ ['--pc' as string]: cur.color }}>
      <header className="lesson-top">
        <button className="icon-btn" onClick={() => (v.stage === 'paused' ? onExit() : c.pause())} aria-label={v.stage === 'paused' ? t.exit : t.pause}>
          {v.stage === 'paused' ? '✕' : '❚❚'}
        </button>
        <div className="chain-count" aria-live="polite">
          <small>{t.chain}</small>
          <b>{m.length}</b>
        </div>
        <TalkToggle lang={lang} />
        <span className="game-name">{v.kind === 'melody' ? t.echoChain : t.beatEcho}</span>
      </header>

      {multi && (
        <ol className="player-chips">
          {m.players.map((p, i) => (
            <li key={i} className={`${i === m.turn ? 'now' : ''} ${p.alive ? '' : 'out'}`} style={{ ['--pc' as string]: p.color }}>
              <span className="dot" aria-hidden="true" />
              <span className="pname">{p.name}</span>
              <span className="ppts">
                {p.alive ? `${p.points} ${t.points}` : t.out}
              </span>
            </li>
          ))}
        </ol>
      )}

      {v.error ? (
        <PermissionPanel
          error={v.error}
          t={t}
          lang={lang}
          onRetry={() => c.retry()}
          onButtons={() => c.setInput(v.kind === 'melody' ? 'pads' : 'tap')}
        />
      ) : v.stage === 'paused' ? (
        <section className="paused-card">
          <h2>{t.paused}</h2>
          <button className="btn mega" onClick={() => c.resume()}>
            {t.resume}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {t.exit}
          </button>
        </section>
      ) : (
        <section className="game-stage">
          <div className={`turn-banner ${v.stage}`} aria-live="assertive">
            {v.stage === 'turn' && multi ? (
              <>
                <span className="dot" aria-hidden="true" /> {cur.name} · {t.yourTurnOf}
              </>
            ) : v.stage === 'demo' ? (
              t.listenNow
            ) : v.stage === 'respond' ? (
              t.goNow
            ) : (
              ' '
            )}
          </div>

          {v.kind === 'melody' && v.melody && (
            <>
              <div className="key-badge">
                <span className="house-dot" aria-hidden="true" /> <Note>{displayNote(v.melody.key, nm, lang)}</Note> {t.major}
              </div>
              <EchoStaff v={v} settings={settings} />
              {v.input === 'pads' && (
              <div className="pads neutral">
                {v.melody.pads.map((p, i) => (
                  <button
                    key={i}
                    className="pad"
                    disabled={!(v.stage === 'respond' && v.input === 'pads')}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      c.tapPad(i);
                    }}
                    aria-label={`${p.degree} ${displayNote(p.note, nm, lang)}`}
                  >
                    <b>{p.degree}</b>
                    <small>
                      <Note>{displayNote(p.note, nm, lang)}</Note>
                    </small>
                  </button>
                ))}
              </div>
              )}
              {v.input === 'sing' && v.stage === 'respond' && (
                <div className="listen mic-speech">
                  <span className="listen-ring" aria-hidden="true">
                    <MicIcon />
                  </span>
                  <span className="listen-text">
                    <b>{t.singing}</b>
                    <small>{t.singHint}</small>
                  </span>
                </div>
              )}
              <ChainStrip v={v} />
            </>
          )}

          {v.kind === 'rhythm' && (
            <>
              <div className={`beat-light ${v.beat?.accent ? 'accent' : ''}`} key={v.beat?.n ?? -1} aria-hidden="true" />
              <BeatGrid v={v} t={t} />
              {v.input === 'tap' && drums ? (
                <div className="drum-pads" dir="ltr">
                  {(['k', 's'] as const).map((d) => (
                    <button
                      key={d}
                      className={`tap-pad drum-pad ${d === 'k' ? 'kick' : 'snare'} ${v.stage === 'respond' ? 'live' : ''}`}
                      data-drum={d}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        c.tapBeat(e.timeStamp, d);
                      }}
                      aria-label={d === 'k' ? t.kick : t.snare}
                    >
                      <span className="drum-face" aria-hidden="true" />
                      <b>{d === 'k' ? t.kick : t.snare}</b>
                      <small>{d === 'k' ? 'F' : 'J'}</small>
                    </button>
                  ))}
                </div>
              ) : v.input === 'tap' ? (
                <button
                  className={`tap-pad big ${v.stage === 'respond' ? 'live' : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    c.tapBeat(e.timeStamp);
                  }}
                  aria-label={t.tapHere}
                >
                  {t.tapHere}
                </button>
              ) : (
                <div className={`listen ${v.stage === 'respond' ? 'mic-speech' : 'mic-capturing'}`}>
                  <span className="listen-ring" aria-hidden="true">
                    <MicIcon />
                  </span>
                  <span className="listen-text">
                    <b>{t.inKnock}</b>
                    <small>{t.knockHint}</small>
                  </span>
                </div>
              )}
              {v.input === 'tap' && <p className="hint">{drums ? t.drumKeyHint : t.tapKeyHint}</p>}
            </>
          )}

          <ResultLine v={v} t={t} />
          <p className="caption" aria-live="polite">
            {v.caption ?? ' '}
          </p>
        </section>
      )}
    </main>
  );
}

/** Melody progress: one dot per note; after a result, ✓ / ✗ / missed per note. */
function ChainStrip({ v }: { v: GameView }) {
  const r = v.result?.melody;
  return (
    <ol className="chain-strip" aria-label="sequence">
      {v.seq.map((p, i) => {
        const st = r ? r.notes[i]?.status : i < v.entered.length ? 'entered' : 'todo';
        return (
          <li key={i} className={`cs ${st}`} data-pad={p}>
            {r ? (st === 'ok' ? '✓' : st === 'wrong' ? '✗' : '·') : ''}
          </li>
        );
      })}
    </ol>
  );
}

/** Beat grid: the pattern's onsets on beats (shown during the demo and after the result). */
function BeatGrid({ v, t }: { v: GameView; t: Strings }) {
  const p = v.pattern;
  if (!p) return null;
  const show = v.stage === 'demo' || v.stage === 'result';
  const r = v.result?.rhythm;
  const beatMs = (60 / p.bpm) * 1000;
  return (
    <div className="beat-grid" style={{ ['--beats' as string]: p.beats }} dir="ltr" aria-hidden={!show}>
      {Array.from({ length: p.beats }).map((_, b) => (
        <span key={b} className="beat-cell" />
      ))}
      {show &&
        p.onsets.map((o, i) => {
          const h = r?.hits[i];
          const cls = !r ? '' : h?.offsetMs === null ? 'miss' : Math.abs(h!.offsetMs!) < 50 ? 'good' : 'ok';
          const dr = p.drums?.[i];
          return <span key={`o${i}`} className={`onset ${cls} ${dr === 'k' ? 'kick' : dr === 's' ? 'snare' : ''}`} style={{ left: `${(o / p.beats) * 100}%` }} />;
        })}
      {v.stage === 'result' &&
        v.taps.map((ms, i) => <span key={`t${i}`} className="tapmark" style={{ left: `${(ms / beatMs / p.beats) * 100}%` }} />)}
      {r && (
        <p className="grid-note">
          {r.meanOffsetMs !== null && Math.abs(r.meanOffsetMs) >= 25 && (
            <>
              {Math.abs(r.meanOffsetMs)} ms {r.meanOffsetMs < 0 ? t.early : t.late}
            </>
          )}
          {r.extra > 0 && (
            <>
              {' '}
              · {r.extra} {t.extraTaps}
            </>
          )}
          {r.hits.some((h) => h.offsetMs === null) && (
            <>
              {' '}
              · {r.hits.filter((h) => h.offsetMs === null).length} {t.missed}
            </>
          )}
        </p>
      )}
    </div>
  );
}

function ResultLine({ v, t }: { v: GameView; t: Strings }) {
  if (v.stage !== 'result' || !v.result) return <div className="feedback empty" />;
  const r = v.result;
  return (
    <div className={`feedback ${r.unclear ? 'unclear' : r.pass ? 'correct' : 'retry'}`} aria-live="assertive">
      <b>{r.unclear ? t.unclear : r.pass ? t.correct : t.notQuite.split('—')[0].trim()}</b>
    </div>
  );
}

function Scoreboard({ t, v, onRematch, onChangePlayers, onHome }: { t: Strings; v: GameView; onRematch: () => void; onChangePlayers: () => void; onHome: () => void }) {
  const m = v.match;
  const solo = m.players.length === 1;
  const ranked = m.players.map((p, i) => ({ ...p, i })).sort((a, b) => b.best - a.best || b.points - a.points);
  return (
    <main className="recap scoreboard">
      <p className="eyebrow">{v.kind === 'melody' ? t.echoChain : t.beatEcho}</p>
      <h1>{solo ? t.gameOver : m.winners.length > 1 ? t.tie : `${t.winner}: ${m.players[m.winners[0]].name}`}</h1>
      {solo ? (
        <p className="big-score">
          <small>{t.longest}</small>
          <b>{m.players[0].best}</b>
          <small>{v.kind === 'melody' ? t.notes : t.beats}</small>
        </p>
      ) : (
        <ol className="board">
          {ranked.map((p, k) => (
            <li key={p.i} className={m.winners.includes(p.i) ? 'win' : ''} style={{ ['--pc' as string]: p.color }}>
              <span className="rank">{k + 1}</span>
              <span className="dot" aria-hidden="true" />
              <span className="pname">{p.name}</span>
              <span className="pbest">
                {p.best} <small>{v.kind === 'melody' ? t.notes : t.beats}</small>
              </span>
              {m.winners.includes(p.i) && <span className="crown">{m.winners.length > 1 ? '=' : '★'}</span>}
            </li>
          ))}
        </ol>
      )}
      <div className="recap-actions">
        <button className="btn primary mega" onClick={onRematch}>
          {t.rematch}
        </button>
        <button className="btn" onClick={onChangePlayers}>
          {t.changePlayers}
        </button>
        <button className="btn ghost" onClick={onHome}>
          {t.home}
        </button>
      </div>
    </main>
  );
}

/** Tap along with 12 clicks; the median offset of taps 5–12 becomes the device's tap delay. */
function Calibrate({ t, latency, onDone }: { t: Strings; latency: number; onDone: (ms: number) => void }) {
  const [state, setState] = useState<'idle' | 'run' | 'done' | 'fail'>('idle');
  const [beat, setBeat] = useState(-1);
  const [result, setResult] = useState<number | null>(null);
  const taps = useRef<number[]>([]);
  const start = useRef<number | null>(null);
  const BPM = 100;
  const N = 12;

  const tap = (ms: number) => {
    if (state === 'run') taps.current.push(ms);
  };
  useEffect(() => {
    if (state !== 'run') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        tap(e.timeStamp);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const run = async () => {
    await piano.unlock();
    taps.current = [];
    setState('run');
    const b = 60 / BPM;
    const tl = { clicks: Array.from({ length: N }, (_, i) => ({ t: i * b, accent: i % 4 === 0 })), wood: [], responseAt: 0, responseEnd: N * b };
    const ac = new AbortController();
    try {
      const first = await piano.playTimeline(tl, ac.signal, (i) => setBeat(i), (perf) => (start.current = perf));
      const off = calibrationOffset(first, taps.current, BPM, 4);
      if (off === null) setState('fail');
      else {
        setResult(off);
        onDone(off);
        setState('done');
      }
    } catch {
      setState('fail');
    }
    setBeat(-1);
  };

  return (
    <div className="calibrate">
      <div className="row">
        <button className="btn small" onClick={() => void run()} disabled={state === 'run'}>
          {t.calibrate}
        </button>
        <span className="field-hint" dir="ltr">
          {t.latency}: {result ?? latency} ms
        </span>
      </div>
      {state === 'run' && (
        <>
          <p className="field-hint">{t.calibrating}</p>
          <button
            className={`tap-pad small live ${beat % 2 ? 'odd' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              tap(e.timeStamp);
            }}
          >
            {beat >= 0 ? beat + 1 : '·'}
          </button>
        </>
      )}
      {state === 'idle' && <p className="field-hint">{t.calibrateHint}</p>}
      {state === 'done' && (
        <p className="field-hint good">
          ✓ {t.calibrateDone} {result} ms
        </p>
      )}
      {state === 'fail' && <p className="field-hint warn">{t.calibrateFail}</p>}
    </div>
  );
}

/** The notes answered so far, on a staff, appearing one by one (playtest: no colour cues). */
function EchoStaff({ v, settings }: { v: GameView; settings: Settings }) {
  const g = v.melody!;
  const entered = v.entered.filter((x): x is number => x !== null).map((i) => g.pads[i].midi);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown > entered.length) setShown(entered.length);
    if (shown >= entered.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), 220);
    return () => clearTimeout(id);
  }, [shown, entered.length]);
  const notes = entered.slice(0, shown);
  return (
    <div className="echo-staff" aria-live="polite" key={notes.length}>
      <NotesView midis={notes} keyPc={g.key} settings={settings} />
    </div>
  );
}
