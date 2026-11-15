// Sing-along (spec S.10): pick a public-domain song, sing it over a count-in while a note roll scrolls and
// your pitch is drawn on top; then a score per note. The song sits inside the player's range.

import { NotesView } from './NotesView';
import { sungMelodyRemarks } from '../engine/feedbackMelody';
import { melodyRemarkText } from '../game/content';
import { useEffect, useMemo, useRef, useState } from 'react';
import { gradeSingAlong, songTimeline, type SingAlongGrade } from '../engine/singalong';
import type { SungFrame } from '../engine/sing';
import { SONGS, type SongOpening } from '../engine/songs';
import { DEFAULT_RANGE } from '../engine/vocal';
import { pc } from '../engine/pitch';
import type { Strings } from '../i18n/strings';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import type { Settings } from '../storage/progress';
import { piano, SIMULATED } from './services';
import { noteLabel } from './Vocal';
import { loadClick, saveClick } from './PulseNotes';
import { Icon } from './icons';
import { LaneNote, SingLane } from './SingLane';
import { SingFeed } from './singFeed';
import { paceFrames, SIM_RT } from './simRt';
import { NoVoiceBanner } from './VoiceCheck';

const BPM = 84;
/** Usual major-key spelling for a tonic pitch class. */
const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function SingAlongScreen({ t, settings, onBack }: { t: Strings; settings: Settings; onBack: () => void }) {
  const [song, setSong] = useState<SongOpening | null>(null);
  const [phase, setPhase] = useState<'pick' | 'ready' | 'count' | 'singing' | 'done'>('pick');
  const [, setFrames] = useState<SungFrame[]>([]);
  const [, setNow] = useState(0);
  const [grade, setGrade] = useState<SingAlongGrade | null>(null);
  // Off by default: the guide plays the very notes being sung, so only with headphones can it stay out of the microphone.
  const [guide, setGuide] = useState(false);
  // The click keeps the beat under the whole song (not only the count-in), so the roll's cursor is never the only cue.
  const [clickOn, setClickOn] = useState(loadClick);
  const [remark, setRemark] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const feed = useMemo(() => new SingFeed(), []);
  useEffect(() => () => ctl.current?.abort(), []);
  const range = settings.voiceRange ?? DEFAULT_RANGE;
  const lang = settings.uiLang;
  const tl = song ? songTimeline(song, range, BPM) : null;
  const keyPc = tl ? pc(KEY_NAMES[((tl.tonic % 12) + 12) % 12]) : null;

  const run = async () => {
    if (!song || !tl) return;
    const c = new AbortController();
    ctl.current = c;
    setGrade(null);
    setFrames([]);
    feed.reset();
    await piano.unlock();
    setPhase('count');
    const beat = 60 / BPM;
    const clicks = [0, 1, 2, 3].map((k) => ({ midi: 0, start: k * beat, duration: 0.05, velocity: 0.8, perc: (k === 0 ? 'accent' : 'click') as 'accent' | 'click' }));
    await piano.play(clicks, 4 * beat, c.signal).catch(() => {});
    if (c.signal.aborted) return;
    setPhase('singing');
    const end = tl.notes[tl.notes.length - 1].start + tl.notes[tl.notes.length - 1].dur;
    if (clickOn) {
      const n = Math.ceil(end / beat) + 1;
      void piano.play(Array.from({ length: n }, (_, k) => ({ midi: 0, start: k * beat, duration: 0.05, velocity: k % 4 === 0 ? 0.55 : 0.38, perc: (k % 4 === 0 ? 'accent' : 'click') as 'accent' | 'click' })), n * beat, c.signal).catch(() => {});
    }
    if (guide) void piano.play(tl.notes.map((n) => ({ midi: n.midi, start: n.start, duration: n.dur * 0.92, velocity: 0.35 })), end + 0.2, c.signal).catch(() => {});
    const t0 = performance.now();
    feed.zeroWall = t0;
    const tick = setInterval(() => setNow((performance.now() - t0) / 1000), 50);
    let got: SungFrame[] = [];
    const buf: SungFrame[] = [];
    if (SIMULATED) {
      // A clean synthetic take, timed to the song.
      got = tl.notes.flatMap((n) => Array.from({ length: Math.floor(n.dur / 0.02) }, (_, k) => ({ t: n.start + k * 0.02, hz: 440 * 2 ** ((n.midi - 69) / 12), confidence: 0.95, rms: 0.08 })));
      if (SIM_RT) await paceFrames(got, t0, c.signal, (f) => feed.push(f));
      else await new Promise((r) => setTimeout(r, Math.min(3000, end * 1000)));
      setFrames(got);
    } else {
      const r = await new BrowserPitchCapture().sing({
        signal: c.signal,
        maxMs: (end + 1.5) * 1000,
        silenceMs: 4000,
        endSilenceMs: 1500,
        hopMs: 20,
        onFrame: (f) => {
          const g = { ...f, t: (performance.now() - t0) / 1000 };
          buf.push(g);
          feed.push(g);
        },
      });
      got = r.kind === 'frames' || r.kind === 'aborted' ? buf : [];
    }
    clearInterval(tick);
    piano.stopAll();
    setNow(end);
    setFrames(got);
    feed.load(got);
    setGrade(gradeSingAlong(got, tl.notes));
    const items = sungMelodyRemarks(got, tl.notes.map((n) => n.midi));
    setRemark(items.length ? melodyRemarkText(items, settings.uiLang) : null);
    setPhase('done');
    piano.cue('complete');
  };

  if (!song || !tl)
    return (
      <main className="panel-screen singalong">
        <header className="screen-head">
          <button className="icon-btn" onClick={onBack} aria-label={t.back}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{t.singAlongTitle}</h1>
        </header>
        <p className="field-hint">{t.singAlongHint}</p>
        <ul className="song-list">
          {SONGS.map((s) => (
            <li key={s.id}>
              <button
                className="tool-card"
                onClick={() => {
                  setSong(s);
                  setPhase('ready');
                }}
              >
                <b>{s.title[lang]}</b>
                <small>{s.source}</small>
              </button>
            </li>
          ))}
        </ul>
      </main>
    );

  return (
    <main className="panel-screen singalong">
      <header className="screen-head">
        <button
          className="icon-btn"
          onClick={() => {
            ctl.current?.abort();
            piano.stopAll();
            setSong(null);
            setPhase('pick');
          }}
          aria-label={t.back}
        >
          <span className="flip-rtl">←</span>
        </button>
        <h1>{song.title[lang]}</h1>
      </header>
      <p className="field-hint" dir="ltr">
        {noteLabel(tl.tonic, settings, keyPc)} · ♩ = {BPM}
      </p>
      <div className="sing-lane-wrap">
        <SingLane feed={feed} targets={tl.notes.map((n) => ({ midi: n.midi, start: n.start, dur: n.dur }))} mode="song" seconds={0} tol={35} live={phase === 'count' || phase === 'singing'} settings={settings} beat={60 / BPM} compact={phase === 'done'} label={song.title[lang]} />
        <LaneNote feed={feed} live={phase === 'singing'} settings={settings} />
        <NoVoiceBanner feed={feed} live={phase === 'singing'} from={tl.notes[0]?.start ?? 0} lang={lang === 'en' ? 'en' : 'he'} />
      </div>
      <NotesView midis={tl.notes.map((n) => n.midi)} keyPc={keyPc} settings={settings} />
      {phase === 'count' && <p className="vocal-cue vib">1 · 2 · 3 · 4</p>}
      {grade && (
        <section className="take-card" aria-live="polite">
          <div className="take-score">
            {t.vocalScore}: <b>{Math.round(grade.total * 100)}%</b>
          </div>
          {remark && <p className="take-remark">{remark}</p>}
          <ol className="sing-notes" dir="ltr">
            {grade.notes.map((g, i) => (
              <li key={i} className={g === null ? 'miss' : g >= 0.7 ? 'good' : g >= 0.4 ? 'fair' : 'weak'}>
                {noteLabel(tl.notes[i].midi, settings, keyPc).replace(/\d+$/, '')}
              </li>
            ))}
          </ol>
        </section>
      )}
      <label className="toggle-row">
        <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} />
        <span>
          {t.singAlongGuide}
          <small className="field-hint">{t.singAlongGuideHint}</small>
        </span>
      </label>
      <button className={`chip pn-click${clickOn ? ' on' : ''}`} aria-pressed={clickOn} disabled={phase === 'count' || phase === 'singing'} onClick={() => (setClickOn(!clickOn), saveClick(!clickOn))}>
        <Icon k="metronome" /> {lang === 'en' ? 'Click' : 'קליק'}
      </button>
      <div className="vocal-actions">
        <button className="btn primary mega" disabled={phase === 'count' || phase === 'singing'} onClick={() => void run()}>
          {phase === 'done' ? t.vocalRetry : settings.instrument && settings.instrument !== 'voice' ? t.playNow : t.vocalSing}
        </button>
      </div>
    </main>
  );
}
