// Rhythm Highway (spec AE §8, §10.2 pitch lanes, §10.4 reduced motion / resume, R8 tap latency).
// Solo game: the host app persists `saved` (the last checkpoint) and records results.

import '../games3.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  backingTrack,
  hitWindows,
  highwaySong,
  judgeInput,
  KIT_LANE_NOTE,
  KIT_LANES,
  KIT_MAX_LEVEL,
  kitLaneOf,
  kitLayers,
  MIC_PITCH_LAG_MS,
  newRun,
  OnsetTracker,
  PITCH_MAX_LEVEL,
  rewind,
  sectionStartMs,
  sectionsDone,
  SONGS_PER_LEVEL,
  songId,
  summary,
  sweepMisses,
  type HighwayBests,
  type HighwayMode,
  type HighwayOptions,
  type HighwayRun,
  type HighwaySong,
  type HighwaySummary,
  type HitGrade,
} from '../engine/highway';
import { MAX_RHYTHM_LEVEL, type RhythmLevel } from '../engine/rhythm';
import { displayNote, type PitchClass } from '../engine/pitch';
import { courseInstrumentOf, namingFor, type Settings } from '../storage/progress';
import { midi as midiInput } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { piano } from './services';
import { TierChips } from './TierChips';
import { startTier, tierDef, type DynName, type TierInfo } from '../engine/gameTiers';

/** A tier sets the level of each song chip (its levels in turn), the tempo and the pitch lanes (GAMES_TIERS_PLAN). */
function withTier(o: HighwayOptions, t: DynName | undefined): HighwayOptions {
  const d = t ? tierDef('highway', t) : null;
  if (!t || !d) return o;
  const p = d.params ?? {};
  const lv = (o.mode === 'pitch' ? (p.pitch as number[]) : o.mode === 'kit' ? (p.kit as number[]) : d.levels) ?? [1];
  const level = lv[Math.max(0, Math.min(lv.length - 1, o.song - 1))] as RhythmLevel;
  const pct = o.tempoPct ?? 100;
  return { ...o, tier: t, level, bpm: Math.round((Number(p.bpm ?? o.bpm) * pct) / 500) * 5, ...(o.mode === 'pitch' ? { lanes: Number(p.lanes ?? 3) as 3 | 4 | 5 } : {}) };
}

/** Build-up layers passed per song (kit lanes, beginner levels): song id without its layer → highest layer passed. */
const LAYERS_KEY = 'toneturn.highway.layers.v1';
/** A layer counts as learned at this accuracy (any tempo): the next layer is offered. */
const LAYER_PASS = 85;
function loadLayers(): Record<string, number> {
  try {
    const x = JSON.parse(localStorage.getItem(LAYERS_KEY) ?? '{}');
    return x && typeof x === 'object' ? x : {};
  } catch {
    return {};
  }
}
const layerBase = (o: HighwayOptions) => songId({ ...o, kitLayer: undefined });
/** Kit lanes: the layer to play — the one kept if it fits the level, else the first not yet passed. */
function withLayer(o: HighwayOptions, keep: boolean): HighwayOptions {
  const n = o.mode === 'kit' ? kitLayers(o.level) : 0;
  if (!n) return o.kitLayer === undefined ? o : { ...o, kitLayer: undefined };
  const next = Math.min(n, (loadLayers()[layerBase(o)] ?? 0) + 1);
  return { ...o, kitLayer: keep && o.kitLayer && o.kitLayer <= n ? o.kitLayer : next };
}

type Lang = 'he' | 'en';
type Text = { en: string; he: string };

/** Kit lane names: the drum's own name, never an abbreviation, under a picture of the drum. */
const KIT_NAME: Record<(typeof KIT_LANES)[number], Text> = { hihat: { en: 'Hi-hat', he: 'היי־האט' }, snare: { en: 'Snare', he: 'סנר' }, kick: { en: 'Kick', he: 'קיק' }, tom: { en: 'Tom', he: 'טום' }, cymbal: { en: 'Crash', he: 'מצילה' } };
/** The sound an on-screen pad makes. */
const KIT_PERC = { hihat: 'hat', snare: 'snare', kick: 'kick', tom: 'tom-hi', cymbal: 'crash' } as const;
const CLICK_KEY = 'toneturn.highway.click';
const loadClick = () => {
  try {
    return localStorage.getItem(CLICK_KEY) !== '0';
  } catch {
    return true;
  }
};

/** Line drawings of each drum (24-unit box, stroke = currentColor). */
export function KitIcon({ lane }: { lane: (typeof KIT_LANES)[number] }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="kit-icon">
      {lane === 'hihat' && (
        <g {...p}>
          <ellipse cx="12" cy="7" rx="9" ry="2" />
          <ellipse cx="12" cy="10" rx="9" ry="2" />
          <path d="M12 12v10M8 22h8" />
        </g>
      )}
      {lane === 'snare' && (
        <g {...p}>
          <ellipse cx="12" cy="8" rx="9" ry="3" />
          <path d="M3 8v7c0 1.7 4 3 9 3s9-1.3 9-3V8M7 10.5v6M12 11v7M17 10.5v6" />
        </g>
      )}
      {lane === 'kick' && (
        <g {...p}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.5" />
        </g>
      )}
      {lane === 'tom' && (
        <g {...p}>
          <ellipse cx="12" cy="7" rx="7" ry="2.5" />
          <path d="M5 7v8c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V7M12 17.5V22" />
        </g>
      )}
      {lane === 'cymbal' && (
        <g {...p}>
          <path d="M2 10c3-2.5 17-2.5 20 0-3 1.6-17 1.6-20 0z" />
          <path d="M12 8V6M12 11v11M8 22h8" />
        </g>
      )}
    </svg>
  );
}

export interface HighwaySaved {
  v: 1;
  game: 'highway';
  opts: HighwayOptions;
  /** Resume from the start of this section. */
  section: number;
  run: HighwayRun;
}

export function isHighwaySaved(x: unknown): x is HighwaySaved {
  const s = x as HighwaySaved | null;
  return !!s && s.v === 1 && s.game === 'highway' && !!s.opts && typeof s.section === 'number' && Array.isArray(s.run?.grades);
}

const T = {
  title: { en: 'Rhythm Highway', he: 'כביש הקצב' },
  back: { en: 'Back', he: 'חזרה' },
  mode: { en: 'Play with', he: 'מנגנים עם' },
  tap: { en: 'Taps', he: 'הקשות' },
  kit: { en: 'Drum kit', he: 'מערכת תופים' },
  kitHint: { en: 'Hit each drum as its note reaches the line, on your e-kit or on the pads below.', he: 'הכו בכל תוף כשהתו שלו מגיע לקו: על התופים האלקטרוניים או על הפדים שלמטה.' },
  kitPlay: { en: 'Hit each drum as its note lands on the line.', he: 'הכו בכל תוף כשהתו שלו נוחת על הקו.' },
  padsPractice: { en: 'Screen pads are practice: the level opens on an e-kit.', he: 'פדים במסך הם תרגול: השלב נפתח על תופים אלקטרוניים.' },
  click: { en: 'Click', he: 'קליק' },
  clickOn: { en: 'On', he: 'פועל' },
  kitSound: { en: 'Drum sound', he: 'צליל התופים' },
  buildUp: { en: 'Build it up', he: 'בונים את השיר' },
  layer1: { en: 'Kick', he: 'קיק' },
  layer2: { en: '+ Snare', he: '+ סנר' },
  layer3: { en: '+ Hi-hat', he: '+ היי־האט' },
  layerAll: { en: 'Whole song', he: 'השיר המלא' },
  layerNext: { en: 'Next layer:', he: 'השכבה הבאה:' },
  layerNote: { en: 'Practice: the level opens on the whole song at full tempo.', he: 'תרגול: השלב נפתח על השיר המלא בטמפו המלא.' },
  linkChecking: { en: 'Looking for your kit…', he: 'מחפשים את התופים…' },
  linkUnsupported: { en: 'This browser cannot read MIDI (Safari / iPhone). Use Chrome or Edge on Android or a computer.', he: 'הדפדפן הזה לא קורא MIDI (ספארי / אייפון). השתמשו בכרום או אדג׳ באנדרואיד או במחשב.' },
  linkDenied: { en: 'MIDI access was blocked. Allow MIDI for this site in the browser settings.', he: 'הגישה ל-MIDI נחסמה. אשרו MIDI לאתר בהגדרות הדפדפן.' },
  linkNone: { en: 'No MIDI device found. Connect the kit (USB or Bluetooth MIDI), then hit a drum.', he: 'לא נמצא התקן MIDI. חברו את התופים (USB או MIDI בבלוטות׳), ואז הכו בתוף.' },
  linkOk: { en: 'Connected:', he: 'מחובר:' },
  linkHit: { en: 'Hit a drum to test', he: 'הכו בתוף לבדיקה' },
  fromKit: { en: 'Kit', he: 'תופים' },
  fromApp: { en: 'App', he: 'אפליקציה' },
  clickOff: { en: 'Off', he: 'כבוי' },
  fullTempo: { en: 'Full', he: 'מלא' },
  tempoNote: { en: 'The level opens at full tempo; slower is practice.', he: 'השלב נפתח בטמפו המלא; איטי יותר הוא תרגול.' },
  pitch: { en: 'My instrument', he: 'הכלי שלי' },
  level: { en: 'Rhythm level', he: 'רמת קצב' },
  song: { en: 'Song', he: 'שיר' },
  tempo: { en: 'Tempo', he: 'טמפו' },
  slow: { en: 'Slow', he: 'איטי' },
  medium: { en: 'Medium', he: 'בינוני' },
  fast: { en: 'Fast', he: 'מהיר' },
  lanes: { en: 'Lanes', he: 'מסלולים' },
  play: { en: 'Play', he: 'שחקו' },
  cont: { en: 'Continue from section', he: 'להמשיך מקטע' },
  best: { en: 'Best', he: 'שיא' },
  pitchHint: {
    en: 'Play each note on your instrument when it reaches the line. Headphones help: the microphone should hear only you.',
    he: 'נגנו כל תו על הכלי כשהוא מגיע לקו. עדיף אוזניות: המיקרופון צריך לשמוע רק אתכם.',
  },
  midiHint: { en: 'MIDI keyboard on: notes are read from the keys.', he: 'מקלדת MIDI פעילה: התווים נקראים מהקלידים.' },
  tapHint: { en: 'Tap, Space or Enter when a note reaches the line.', he: 'הקישו, רווח או Enter כשתו מגיע לקו.' },
  calibrate: {
    en: 'Tap delay not measured yet. Calibrate it once in Beat Echo for fair timing.',
    he: 'השהיית ההקשה עוד לא נמדדה. כיילו אותה פעם אחת בהד הקצב לתזמון הוגן.',
  },
  tapHere: { en: 'Tap', he: 'הקישו' },
  pause: { en: 'Pause', he: 'השהיה' },
  paused: { en: 'Paused', he: 'מושהה' },
  resume: { en: 'Resume from section', he: 'להמשיך מקטע' },
  exit: { en: 'Exit', he: 'יציאה' },
  combo: { en: 'Combo', he: 'רצף' },
  section: { en: 'Section', he: 'קטע' },
  perfect: { en: 'Perfect', he: 'מושלם' },
  good: { en: 'Good', he: 'טוב' },
  miss: { en: 'Miss', he: 'פספוס' },
  wrong: { en: 'Wrong note', he: 'תו אחר' },
  accuracy: { en: 'Accuracy', he: 'דיוק' },
  maxCombo: { en: 'Longest combo', he: 'הרצף הארוך' },
  fullCombo: { en: 'Full combo', he: 'רצף מלא' },
  newBest: { en: 'New best', he: 'שיא חדש' },
  again: { en: 'Play again', he: 'שוב' },
  next: { en: 'Next song', he: 'השיר הבא' },
  early: { en: 'early', he: 'מוקדם' },
  late: { en: 'late', he: 'מאוחר' },
  micError: { en: 'The microphone could not start. Allow it, or play with taps.', he: 'המיקרופון לא נפתח. אשרו אותו, או שחקו בהקשות.' },
  useTaps: { en: 'Play with taps', he: 'לשחק בהקשות' },
  retry: { en: 'Try again', he: 'לנסות שוב' },
  points: { en: 'points', he: 'נקודות' },
} satisfies Record<string, Text>;

const BEST_KEY = 'toneturn.highway.best.v1';
function loadBests(): HighwayBests {
  try {
    const v = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as HighwayBests;
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
function saveBest(id: string, acc: number): boolean {
  const b = loadBests();
  if ((b[id] ?? -1) >= acc) return false;
  b[id] = acc;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(b));
  } catch {
    /* storage blocked */
  }
  return true;
}

function useReducedMotion(settings: Settings) {
  return useMemo(() => {
    if (settings.reducedMotion !== null && settings.reducedMotion !== undefined) return settings.reducedMotion;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, [settings.reducedMotion]);
}

/** The key for pitch lanes: guitar / bass / strings in G, everything else in C. */
const laneKeyPc = (s: Settings) => (['guitar', 'bass', 'strings'].includes(courseInstrumentOf(s) ?? '') ? 7 : 0);
const PC_NAMES: PitchClass[] = [
  { letter: 'C', acc: 0 },
  { letter: 'C', acc: 1 },
  { letter: 'D', acc: 0 },
  { letter: 'E', acc: -1 },
  { letter: 'E', acc: 0 },
  { letter: 'F', acc: 0 },
  { letter: 'F', acc: 1 },
  { letter: 'G', acc: 0 },
  { letter: 'A', acc: -1 },
  { letter: 'A', acc: 0 },
  { letter: 'B', acc: -1 },
  { letter: 'B', acc: 0 },
];

type Stage = 'setup' | 'play' | 'paused' | 'over' | 'mic-error';

export function Highway({
  lang,
  settings,
  saved,
  onSave,
  onExit,
  onResult,
  tier: tierInfo,
  onKitSounds,
}: {
  /** Kit lanes: turn the app's own drum sound for each e-kit hit on / off (the kit card's "play drum sounds"). */
  onKitSounds?: (on: boolean) => void;
  lang: Lang;
  settings: Settings;
  saved: unknown | null;
  onSave: (state: unknown | null) => void;
  onExit: () => void;
  onResult: (r: { game: 'highway' | 'melody-puzzle'; score: number; detail?: unknown }) => void;
  tier?: TierInfo;
}) {
  const tx = (o: Text) => o[lang];
  const resumable = isHighwaySaved(saved) ? saved : null;
  const reduced = useReducedMotion(settings);
  const useMidi = !!settings.midiInput;
  // 0.65: in the drums course the highway has kit lanes (hi-hat, snare, kick, tom, cymbal) played on the e-kit.
  const drumsCourse = settings.activeCourse === 'drums';
  const MODES: HighwayMode[] = drumsCourse ? ['kit', 'tap'] : ['tap', 'pitch'];

  const [opts, setOpts] = useState<HighwayOptions>(
    // A run saved in another course may hold a mode this course doesn't offer (pitch in drums, kit elsewhere).
    () =>
      (resumable && MODES.includes(resumable.opts.mode) ? resumable.opts : resumable ? { ...resumable.opts, mode: MODES[0] } : null) ??
      withLayer(withTier({ mode: drumsCourse ? 'kit' : 'tap', level: 1, song: 1, bpm: 90, lanes: 3, keyPc: laneKeyPc(settings), ...(tierInfo ? { tempoPct: 60 } : {}) }, tierInfo ? startTier(tierInfo) : undefined), false),
  );
  const [clickOn, setClickOn] = useState(loadClick);
  // Kit lanes: what the browser sees of the e-kit (setup line) and the last hit it sent (play line), so a silent kit
  // shows why: no Web MIDI in this browser, no device, or notes the kit map doesn't name.
  const [kitLink, setKitLink] = useState<{ state: 'checking' | 'unsupported' | 'none' | 'ok' | 'denied'; devices: string[] }>({ state: 'checking', devices: [] });
  const lastHitRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (opts.mode !== 'kit') return;
    if (!midiInput.supported) {
      setKitLink({ state: 'unsupported', devices: [] });
      return;
    }
    let live = true;
    const read = () => live && setKitLink({ state: midiInput.devices.length ? 'ok' : 'none', devices: [...midiInput.devices] });
    midiInput.enable().then(read, () => live && setKitLink({ state: 'denied', devices: [] }));
    const off = midiInput.onState(read);
    // Any hit lights its pad and is named on the setup / play line, even outside a run.
    const offHit = midiInput.onHit((h) => {
      const lane = kitLaneOf(h.voice);
      const pad = lane === null ? null : padEls.current[lane];
      if (pad) {
        pad.classList.remove('hit');
        void pad.offsetWidth;
        pad.classList.add('hit');
      }
      if (lastHitRef.current) lastHitRef.current.textContent = `MIDI ${h.note} → ${lane === null ? (lang === 'he' ? 'לא ממופה' : 'not mapped') : KIT_NAME[KIT_LANES[lane]][lang]}`;
    });
    return () => {
      live = false;
      off();
      offHit();
    };
  }, [opts.mode, lang]);
  /** On-screen pads hit in this run (kit lanes): practice, not a measured take. */
  const padsRef = useRef(false);
  const noteEls = useRef<(HTMLDivElement | null)[]>([]);
  const padEls = useRef<(HTMLSpanElement | null)[]>([]);
  const song = useMemo(() => highwaySong(opts), [opts]);
  const [stage, setStage] = useState<Stage>('setup');
  const [run, setRun] = useState<HighwayRun>(() => newRun(song));
  const [section, setSection] = useState(0);
  const [flash, setFlash] = useState<{ text: string; cls: string; n: number } | null>(null);
  const [shake, setShake] = useState(0);
  const [result, setResult] = useState<{ sum: HighwaySummary; best: boolean } | null>(null);
  const [bests, setBests] = useState<HighwayBests>(loadBests);

  const runRef = useRef(run);
  const songRef = useRef<HighwaySong>(song);
  const originRef = useRef(0); // performance.now() of the song's beat 1
  const playingRef = useRef(false);
  const acRef = useRef<AbortController | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const checkpointRef = useRef<{ section: number; run: HighwayRun }>({ section: 0, run: newRun(song) });
  const curSectionRef = useRef(0);
  const flashN = useRef(0);

  const px = reduced ? 0.15 : 0.3; // px per ms of scroll
  const latency = opts.mode === 'tap' ? settings.tapLatencyMs || 0 : opts.mode === 'kit' ? (settings.midiLatencyMs ?? 0) : useMidi ? (settings.midiLatencyMs ?? 0) : (settings.micLatencyMs ?? MIC_PITCH_LAG_MS);

  const setBoth = (r: HighwayRun) => {
    runRef.current = r;
    setRun(r);
  };

  const showGrade = useCallback(
    (g: HitGrade | 'wrong', offset: number | null) => {
      flashN.current++;
      const label = g === 'wrong' ? tx(T.wrong) : tx(T[g]);
      const side = offset !== null && g === 'good' ? ` · ${tx(offset < 0 ? T.early : T.late)}` : '';
      setFlash({ text: label + side, cls: g, n: flashN.current });
      if ((g === 'miss' || g === 'wrong') && !reduced) setShake((x) => x + 1);
      if (navigator.vibrate && !reduced && document.documentElement.dataset.haptics !== 'off' && (g === 'miss' || g === 'wrong')) {
        try {
          navigator.vibrate(30);
        } catch {
          /* unsupported */
        }
      }
    },
    [lang, reduced],
  );

  const stopAudio = () => {
    playingRef.current = false;
    acRef.current?.abort();
    acRef.current = null;
  };
  useEffect(() => () => stopAudio(), []);

  const finish = useCallback(() => {
    const s = songRef.current;
    const swept = sweepMisses(s, runRef.current, s.lengthMs + 10_000, 0).run;
    setBoth(swept);
    const sum = summary(s, swept);
    // a practice tempo's score is not the song's best
    const best = (s.opts.tempoPct ?? 100) >= 100 ? saveBest(s.id, sum.accuracy) : false;
    const layers = s.opts.mode === 'kit' ? kitLayers(s.opts.level) : 0;
    if (layers && s.opts.kitLayer && sum.accuracy >= LAYER_PASS) {
      const all = loadLayers();
      const k = layerBase(s.opts);
      if ((all[k] ?? 0) < s.opts.kitLayer) {
        all[k] = s.opts.kitLayer;
        try {
          localStorage.setItem(LAYERS_KEY, JSON.stringify(all));
        } catch {
          /* not kept */
        }
      }
    }
    setBests(loadBests());
    setResult({ sum, best });
    stopAudio();
    setStage('over');
    onSave(null);
    onResult({
      game: 'highway',
      score: sum.accuracy,
      detail: { songId: s.id, mode: s.opts.mode, level: s.opts.level, bpm: s.opts.bpm, lanes: s.opts.lanes, newBest: best, ...sum, ...(s.opts.tier ? { tier: s.opts.tier } : {}), ...(s.opts.tempoPct !== undefined ? { tempoPct: s.opts.tempoPct } : {}), ...(padsRef.current ? { input: 'touch' } : {}), ...(layers && s.opts.kitLayer ? { layer: s.opts.kitLayer, layers } : {}) },
    });
  }, [onResult, onSave]);

  /** One input at `perf` ms (performance.now clock). */
  const input = useCallback(
    (perf: number, midi?: number | null, lat = latency) => {
      if (!playingRef.current) return;
      const s = songRef.current;
      const j = judgeInput(s, runRef.current, perf - originRef.current, lat, midi);
      setBoth(j.run);
      if (j.grade) showGrade(j.grade, j.offset);
      else if (j.wrongPitch) showGrade('wrong', null);
    },
    [latency, showGrade],
  );

  // rAF: scroll, misses, checkpoints.
  useEffect(() => {
    if (stage !== 'play') return;
    let id = 0;
    const tick = () => {
      const s = songRef.current;
      const songMs = performance.now() - originRef.current;
      if (stripRef.current) stripRef.current.style.transform = `translate3d(0, ${(songMs * px).toFixed(1)}px, 0)`;
      // Approach cues: a note swells and brightens over its last beat, and its lane's pad lights as it lands.
      if (s.opts.mode === 'kit' || s.laneMidis.length) {
        const t = songMs;
        const due = new Set<number>();
        for (let i = 0; i < s.notes.length; i++) {
          const n = s.notes[i];
          const el = noteEls.current[i];
          if (!el) continue;
          const d = n.ms - t;
          const near = d > s.beatMs * 1.5 || d < -200 ? '' : d > s.beatMs * 0.5 ? '1' : '2';
          if ((el.dataset.near ?? '') !== near) el.dataset.near = near;
          if (Math.abs(d) < 110) due.add(n.lane);
          if (d > s.beatMs * 2) break;
        }
        padEls.current.forEach((el, i) => {
          if (!el) return;
          const v = due.has(i) ? '1' : '';
          if ((el.dataset.due ?? '') !== v) el.dataset.due = v;
        });
      }
      if (playingRef.current) {
        const { run: r, missed } = sweepMisses(s, runRef.current, songMs, latency);
        if (missed.length) {
          setBoth(r);
          showGrade('miss', null);
        }
        // Checkpoint: a section is over when its notes are all judged and the next one has begun.
        const next = curSectionRef.current + 1;
        if (next < s.sections && songMs - latency > sectionStartMs(s, next) + hitWindows(s.opts.level, s.opts.bpm, s.opts.mode).good && sectionsDone(s, runRef.current, next)) {
          curSectionRef.current = next;
          setSection(next);
          const cp = { section: next, run: rewind(s, runRef.current, next) };
          checkpointRef.current = cp;
          onSave({ v: 1, game: 'highway', opts: s.opts, section: cp.section, run: cp.run } satisfies HighwaySaved);
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [stage, px, latency, showGrade, onSave]);

  // Keyboard taps.
  useEffect(() => {
    if (stage !== 'play' || opts.mode !== 'tap') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        input(e.timeStamp);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, opts.mode, input]);

  const start = async (fromSection: number, startRun: HighwayRun, s: HighwaySong = song) => {
    stopAudio();
    songRef.current = s;
    setBoth(startRun);
    curSectionRef.current = fromSection;
    setSection(fromSection);
    checkpointRef.current = { section: fromSection, run: startRun };
    setFlash(null);
    setResult(null);
    const ac = new AbortController();
    acRef.current = ac;
    try {
      await piano.unlock();
    } catch {
      /* audio may still start */
    }
    const pitch = s.opts.mode === 'pitch';
    const kitMode = s.opts.mode === 'kit';
    if (fromSection === 0) padsRef.current = false;
    // The metronome runs through the song (not into an open microphone, which would hear it).
    const bt = backingTrack(s, fromSection, { bass: !(pitch && !useMidi), drums: !kitMode, click: clickOn && !(pitch && !useMidi) });
    if (kitMode) piano.preloadKit();
    const offsetMs = sectionStartMs(s, fromSection);
    let unsub: (() => void) | null = null;

    if (kitMode) {
      try {
        await midiInput.enable();
      } catch {
        /* no MIDI: nothing will be heard */
      }
      // Each kit hit → its lane's note (the kit map names the pad); the pedal chick has no lane.
      unsub = midiInput.onHit((h) => {
        const lane = kitLaneOf(h.voice);
        input(h.at || performance.now(), lane === null ? -1 : KIT_LANE_NOTE[KIT_LANES[lane]], settings.midiLatencyMs ?? 0);
      });
      ac.signal.addEventListener('abort', () => unsub?.(), { once: true });
    } else if (pitch && useMidi) {
      try {
        await midiInput.enable();
      } catch {
        /* no MIDI: nothing will be heard */
      }
      unsub = midiInput.onNote((note, on, at) => on && input(at || performance.now(), note, 0));
      ac.signal.addEventListener('abort', () => unsub?.(), { once: true });
    } else if (pitch) {
      // Open the microphone first; the song starts once it is listening.
      const tracker = new OnsetTracker();
      let capStart = 0;
      const ok = await new Promise<boolean>((resolve) => {
        void new BrowserPitchCapture()
          .sing({
            signal: ac.signal,
            maxMs: s.lengthMs + 8000,
            silenceMs: s.lengthMs + 8000,
            endSilenceMs: 1e9,
            hopMs: 20,
            onCapturing: () => {
              capStart = performance.now();
              resolve(true);
            },
            onFrame: (f) => {
              const on = tracker.feed({ ms: capStart + f.t * 1000, hz: f.hz, confidence: f.confidence, rms: f.rms });
              if (on) input(on.ms, on.midi, MIC_PITCH_LAG_MS);
            },
          })
          .then((r) => {
            if (r.kind === 'error' || (r.kind === 'silence' && !capStart)) resolve(false);
          });
      });
      if (ac.signal.aborted) return;
      if (!ok) {
        stopAudio();
        setStage('mic-error');
        return;
      }
    }
    if (ac.signal.aborted) return;
    // Until the audio clock reports beat 1, estimate it (scheduling lead + count-in).
    originRef.current = performance.now() + 120 + bt.responseAt * 1000 - offsetMs;
    playingRef.current = true;
    setStage('play');
    const tl = { clicks: bt.clicks, wood: bt.kit.map((k) => k.t), drums: bt.kit.map((k) => k.d), responseAt: bt.responseAt, responseEnd: bt.responseEnd };
    const done = piano.playTimeline(tl, ac.signal, undefined, (perf) => {
      originRef.current = perf - offsetMs;
    });
    // Hats + bass: `play` schedules 60 ms ahead, `playTimeline` 120 ms — shift to line them up.
    void piano.play(bt.extras.map((e) => ({ ...e, start: e.start + 0.06 })), bt.responseEnd + 0.2, ac.signal).catch(() => {});
    try {
      await done;
    } catch {
      return; // paused / exited
    }
    if (acRef.current === ac) finish();
  };

  const pause = () => {
    stopAudio();
    setStage('paused');
  };
  const resumeFromCheckpoint = () => {
    const cp = checkpointRef.current;
    void start(cp.section, cp.run);
  };

  // ------------------------------------------------------------- render

  if (stage === 'setup') {
    const maxLevel = opts.mode === 'pitch' ? PITCH_MAX_LEVEL : opts.mode === 'kit' ? (KIT_MAX_LEVEL as RhythmLevel) : (MAX_RHYTHM_LEVEL as RhythmLevel);
    const set = (p: Partial<HighwayOptions>) =>
      setOpts((o) => {
        const n = { ...o, ...p };
        if (n.mode === 'pitch' && n.level > PITCH_MAX_LEVEL) n.level = PITCH_MAX_LEVEL;
        if (n.mode === 'kit' && n.level > KIT_MAX_LEVEL) n.level = KIT_MAX_LEVEL as RhythmLevel;
        // another song / level / mode starts at that song's next layer; tempo or click changes keep the layer
        return withLayer(n.tier ? withTier(n, n.tier) : n, p.kitLayer !== undefined || !('song' in p || 'tier' in p || 'mode' in p || 'level' in p));
      });
    return (
      <main className="panel-screen g3 hw-setup">
        <header className="screen-head">
          <button className="icon-btn" onClick={onExit} aria-label={tx(T.back)}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{tx(T.title)}</h1>
        </header>
        <section className="set-card">
          <fieldset className="seg-field">
            <legend>{tx(T.mode)}</legend>
            <div className="seg" role="radiogroup" aria-label={tx(T.mode)}>
              {MODES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={opts.mode === m} className={opts.mode === m ? 'on' : ''} onClick={() => set({ mode: m })} data-hw-mode={m}>
                  {tx(m === 'tap' ? T.tap : m === 'kit' ? T.kit : T.pitch)}
                </button>
              ))}
            </div>
            {/* kit lanes: the connection line below says what to do (one screen) */}
            {opts.mode !== 'kit' && <p className="field-hint">{opts.mode === 'tap' ? tx(T.tapHint) : useMidi ? tx(T.midiHint) : tx(T.pitchHint)}</p>}
            {opts.mode === 'tap' && !settings.tapLatencyMs && <p className="field-hint warn">{tx(T.calibrate)}</p>}
            {opts.mode === 'kit' && (
              <p className={`field-hint ${kitLink.state === 'ok' ? '' : kitLink.state === 'checking' ? '' : 'warn'}`} data-kit-link={kitLink.state}>
                {kitLink.state === 'ok' ? (
                  <>
                    {tx(T.linkOk)} <bdi>{kitLink.devices.join(', ')}</bdi> · <span ref={lastHitRef}>{tx(T.linkHit)}</span>
                  </>
                ) : (
                  tx(kitLink.state === 'checking' ? T.linkChecking : kitLink.state === 'unsupported' ? T.linkUnsupported : kitLink.state === 'denied' ? T.linkDenied : T.linkNone)
                )}
              </p>
            )}
          </fieldset>
          {tierInfo ? (
            <TierChips lang={lang} info={tierInfo} value={opts.tier ?? startTier(tierInfo)} onChange={(t) => set({ tier: t })} game="highway" />
          ) : (
          <fieldset className="seg-field">
            <legend>{tx(T.level)}</legend>
            <div className="g3-chips" role="radiogroup" aria-label={tx(T.level)}>
              {Array.from({ length: maxLevel }, (_, i) => (i + 1) as RhythmLevel).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={opts.level === l} className={`g3-chip ${opts.level === l ? 'on' : ''}`} onClick={() => set({ level: l })}>
                  <bdi dir="ltr">R{l}</bdi>
                </button>
              ))}
            </div>
          </fieldset>
          )}
          <fieldset className="seg-field">
            <legend>{tx(T.song)}</legend>
            <div className="g3-chips" role="radiogroup" aria-label={tx(T.song)}>
              {Array.from({ length: SONGS_PER_LEVEL }, (_, i) => i + 1).map((n) => {
                const b = bests[songId({ ...opts, song: n })];
                return (
                  <button key={n} type="button" role="radio" aria-checked={opts.song === n} className={`g3-chip song ${opts.song === n ? 'on' : ''}`} onClick={() => set({ song: n })}>
                    <b dir="ltr">{n}</b>
                    {b !== undefined && (
                      <small>
                        {tx(T.best)} <bdi dir="ltr">{b}%</bdi>
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {opts.mode === 'kit' && kitLayers(opts.level) > 0 && (
            <fieldset className="seg-field" data-hw-layers>
              <legend>{tx(T.buildUp)}</legend>
              <div className="seg" role="radiogroup" aria-label={tx(T.buildUp)}>
                {Array.from({ length: kitLayers(opts.level) }, (_, i) => i + 1).map((l) => {
                  const n = kitLayers(opts.level);
                  const passed = (loadLayers()[layerBase(opts)] ?? 0) >= l;
                  const on = opts.kitLayer === l;
                  return (
                    <button key={l} type="button" role="radio" aria-checked={on} className={on ? 'on' : ''} onClick={() => set({ kitLayer: l })} data-layer={l}>
                      {tx(l === n ? T.layerAll : l === 1 ? T.layer1 : l === 2 ? T.layer2 : T.layer3)}
                      {passed && <small aria-label="passed"> ✓</small>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          {tierInfo && (
            <fieldset className="seg-field" data-hw-tempo-pct>
              <legend>{tx(T.tempo)}</legend>
              <div className="seg" role="radiogroup" aria-label={tx(T.tempo)}>
                {(
                  [
                    [60, T.slow],
                    [80, T.medium],
                    [100, T.fullTempo],
                  ] as const
                ).map(([pc, l]) => {
                  const full = Number(tierDef('highway', opts.tier ?? startTier(tierInfo))?.params?.bpm ?? opts.bpm);
                  const on = (opts.tempoPct ?? 100) === pc;
                  return (
                    <button key={pc} type="button" role="radio" aria-checked={on} className={on ? 'on' : ''} onClick={() => set({ tempoPct: pc })}>
                      {tx(l)} <small dir="ltr">{Math.round((full * pc) / 500) * 5}</small>
                    </button>
                  );
                })}
              </div>
              {(opts.tempoPct ?? 100) < 100 || (opts.kitLayer && opts.kitLayer < kitLayers(opts.level)) ? <p className="field-hint">{tx(T.layerNote)}</p> : null}
            </fieldset>
          )}
          <div className="hw-two">
          {opts.mode === 'kit' && onKitSounds && settings.drumKit && !settings.drumKit.mic && (
            <fieldset className="seg-field" data-hw-kit-sound>
              <legend>{tx(T.kitSound)}</legend>
              <div className="seg" role="radiogroup" aria-label={tx(T.kitSound)}>
                {([false, true] as const).map((v) => (
                  <button key={String(v)} type="button" role="radio" aria-checked={!!settings.drumKit?.sounds === v} className={!!settings.drumKit?.sounds === v ? 'on' : ''} onClick={() => onKitSounds(v)}>
                    {tx(v ? T.fromApp : T.fromKit)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {opts.mode !== 'pitch' && (
            <fieldset className="seg-field">
              <legend>{tx(T.click)}</legend>
              <div className="seg" role="radiogroup" aria-label={tx(T.click)}>
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    role="radio"
                    aria-checked={clickOn === v}
                    className={clickOn === v ? 'on' : ''}
                    onClick={() => {
                      setClickOn(v);
                      try {
                        localStorage.setItem(CLICK_KEY, v ? '1' : '0');
                      } catch {
                        /* not kept */
                      }
                    }}
                  >
                    {tx(v ? T.clickOn : T.clickOff)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          </div>
          {!tierInfo && (
          <fieldset className="seg-field">
            <legend>{tx(T.tempo)}</legend>
            <div className="seg" role="radiogroup" aria-label={tx(T.tempo)}>
              {(
                [
                  [70, T.slow],
                  [90, T.medium],
                  [110, T.fast],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={opts.bpm === v} className={opts.bpm === v ? 'on' : ''} onClick={() => set({ bpm: v })}>
                  {tx(l)} <small dir="ltr">{v}</small>
                </button>
              ))}
            </div>
          </fieldset>
          )}
          {opts.mode === 'pitch' && !tierInfo && (
            <fieldset className="seg-field">
              <legend>{tx(T.lanes)}</legend>
              <div className="seg" role="radiogroup" aria-label={tx(T.lanes)}>
                {([3, 4, 5] as const).map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={opts.lanes === n} className={opts.lanes === n ? 'on' : ''} onClick={() => set({ lanes: n, keyPc: laneKeyPc(settings) })}>
                    <bdi dir="ltr">{n}</bdi>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </section>
        {resumable && (
          <button
            className="btn primary mega"
            data-resume-highway="1"
            onClick={() => {
              const s = highwaySong(resumable.opts);
              setOpts(resumable.opts);
              void start(resumable.section, resumable.run, s);
            }}
          >
            {tx(T.cont)} <bdi dir="ltr">{resumable.section + 1}</bdi>
          </button>
        )}
        <button
          className={`btn ${resumable ? 'ghost' : 'primary mega'}`}
          data-start-highway="1"
          onClick={() => {
            onSave(null);
            void start(0, newRun(song), song);
          }}
        >
          {tx(T.play)}
        </button>
      </main>
    );
  }

  if (stage === 'mic-error') {
    return (
      <main className="panel-screen g3">
        <section className="set-card g3-center">
          <p>{tx(T.micError)}</p>
          <button className="btn mega" onClick={() => resumeFromCheckpoint()}>
            {tx(T.retry)}
          </button>
          <button
            className="btn"
            onClick={() => {
              setOpts((o) => ({ ...o, mode: 'tap', level: o.level }));
              setStage('setup');
            }}
          >
            {tx(T.useTaps)}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {tx(T.exit)}
          </button>
        </section>
      </main>
    );
  }

  if (stage === 'over' && result) {
    const r = result.sum;
    return (
      <main className="recap g3 hw-over">
        <p className="eyebrow">
          {tx(T.title)} · <bdi dir="ltr">R{song.opts.level}</bdi> · {tx(T.song)} <bdi dir="ltr">{song.opts.song}</bdi>
        </p>
        <h1>{r.fullCombo ? tx(T.fullCombo) : result.best ? tx(T.newBest) : tx(T.accuracy)}</h1>
        <p className="big-score">
          <small>{tx(T.accuracy)}</small>
          <b dir="ltr">{r.accuracy}%</b>
        </p>
        <ul className="g3-stats">
          <li className="perfect">
            {tx(T.perfect)} <bdi dir="ltr">{r.perfect}</bdi>
          </li>
          <li className="good">
            {tx(T.good)} <bdi dir="ltr">{r.good}</bdi>
          </li>
          <li className="miss">
            {tx(T.miss)} <bdi dir="ltr">{r.miss}</bdi>
          </li>
          <li>
            {tx(T.maxCombo)} <bdi dir="ltr">{r.maxCombo}</bdi>
          </li>
          <li>
            <bdi dir="ltr">{r.points}</bdi> {tx(T.points)}
          </li>
          {r.meanOffsetMs !== null && Math.abs(r.meanOffsetMs) >= 20 && (
            <li>
              <bdi dir="ltr">{Math.abs(r.meanOffsetMs)} ms</bdi> {tx(r.meanOffsetMs < 0 ? T.early : T.late)}
            </li>
          )}
          <li>
            {tx(T.best)} <bdi dir="ltr">{bests[song.id] ?? r.accuracy}%</bdi>
          </li>
        </ul>
        <div className="recap-actions">
          {song.opts.mode === 'kit' && song.opts.kitLayer && song.opts.kitLayer < kitLayers(song.opts.level) && r.accuracy >= LAYER_PASS && (
            <button
              className="btn primary mega"
              data-next-layer="1"
              onClick={() => {
                const nl = song.opts.kitLayer! + 1;
                const o = { ...song.opts, kitLayer: nl };
                setOpts(o);
                const s2 = highwaySong(o);
                void start(0, newRun(s2), s2);
              }}
            >
              {tx(T.layerNext)} {tx(song.opts.kitLayer + 1 === kitLayers(song.opts.level) ? T.layerAll : song.opts.kitLayer + 1 === 2 ? T.layer2 : T.layer3)}
            </button>
          )}
          <button className={`btn ${song.opts.mode === 'kit' && song.opts.kitLayer && song.opts.kitLayer < kitLayers(song.opts.level) && r.accuracy >= LAYER_PASS ? '' : 'primary mega'}`} onClick={() => void start(0, newRun(song), song)}>
            {tx(T.again)}
          </button>
          {song.opts.song < SONGS_PER_LEVEL && (
            <button
              className="btn"
              onClick={() => {
                const o = withLayer(withTier({ ...song.opts, song: song.opts.song + 1, kitLayer: undefined }, song.opts.tier), false);
                setOpts(o);
                const s = highwaySong(o);
                void start(0, newRun(s), s);
              }}
            >
              {tx(T.next)}
            </button>
          )}
          <button className="btn ghost" onClick={() => setStage('setup')}>
            {tx(T.back)}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {tx(T.exit)}
          </button>
        </div>
      </main>
    );
  }

  // play / paused
  const s = songRef.current;
  const lanes = Math.max(1, s.laneMidis.length);
  const naming = namingFor(settings.naming, lang);
  const sum = summary(s, run);
  const judged = run.grades.filter((g) => g !== null).length;
  const accNow = judged ? Math.round((100 * (sum.perfect + 0.6 * sum.good)) / judged) : 100;
  const barMs = s.beatsPerBar * s.beatMs;

  return (
    <main className={`g3 hw-play ${reduced ? 'calm' : ''}`}>
      <header className="lesson-top hw-top">
        <button className="icon-btn" onClick={() => (stage === 'paused' ? onExit() : pause())} aria-label={stage === 'paused' ? tx(T.exit) : tx(T.pause)}>
          {stage === 'paused' ? '✕' : '❚❚'}
        </button>
        <div className="hw-stat" aria-live="off">
          <small>{tx(T.accuracy)}</small>
          <b dir="ltr">{accNow}%</b>
        </div>
        <div className="hw-stat combo">
          <small>{tx(T.combo)}</small>
          <b dir="ltr">{run.combo}</b>
        </div>
        <div className="hw-stat">
          <small>{tx(T.section)}</small>
          <b dir="ltr">
            {section + 1}/{s.sections}
          </b>
        </div>
        {s.meterLabel && (
          <div className="hw-stat" data-hw-meter>
            <small>{lang === 'he' ? 'משקל' : 'Meter'}</small>
            <b dir="ltr">{s.meterLabel}</b>
          </div>
        )}
      </header>

      {stage === 'paused' ? (
        <section className="paused-card">
          <h2>{tx(T.paused)}</h2>
          <button className="btn mega" onClick={resumeFromCheckpoint}>
            {tx(T.resume)} <bdi dir="ltr">{checkpointRef.current.section + 1}</bdi>
          </button>
          <button className="btn ghost" onClick={onExit}>
            {tx(T.exit)}
          </button>
        </section>
      ) : (
        <>
          {/* The road itself is physical (left = low lane) in both languages. */}
          <div
            className={`hw-road lanes-${lanes} ${shake && !reduced ? `shake-${shake % 2}` : ''}`}
            dir="ltr"
            style={{ ['--lanes' as string]: lanes }}
            onPointerDown={(e) => {
              if (opts.mode === 'kit') {
                // The road's columns are the drums: a tap plays that drum and counts as its hit (practice).
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                const lane = Math.max(0, Math.min(KIT_LANES.length - 1, Math.floor(((e.clientX - r.left) / r.width) * KIT_LANES.length)));
                padsRef.current = true;
                piano.liveDrum(KIT_PERC[KIT_LANES[lane]], 105);
                const pad = padEls.current[lane];
                if (pad) {
                  pad.dataset.hit = String(Number(pad.dataset.hit ?? 0) + 1);
                  pad.classList.remove('hit');
                  void pad.offsetWidth;
                  pad.classList.add('hit');
                }
                input(e.timeStamp, KIT_LANE_NOTE[KIT_LANES[lane]], settings.tapLatencyMs || 0);
                return;
              }
              if (opts.mode !== 'tap') return;
              e.preventDefault();
              input(e.timeStamp);
            }}
            role="application"
            aria-label={tx(T.title)}
          >
            {Array.from({ length: lanes }, (_, i) => (
              <div key={i} className="hw-lane" style={{ ['--i' as string]: i }} />
            ))}
            <div className="hw-strip" ref={stripRef}>
              {Array.from({ length: s.bars + 1 }, (_, b) => (
                <div key={`b${b}`} className={`hw-bar ${b % s.sectionBars === 0 ? 'sec' : ''}`} style={{ bottom: `${b * barMs * px}px` }} />
              ))}
              {s.notes.map((n, i) => {
                const g = run.grades[i];
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      noteEls.current[i] = el;
                    }}
                    className={`hw-note lane-${n.lane} ${s.opts.mode === 'kit' ? `kit-${KIT_LANES[n.lane]}` : ''} ${g ? `is-${g}` : ''}`}
                    style={{
                      bottom: `${n.ms * px}px`,
                      height: `${Math.max(14, Math.min(n.durMs * px, 90) * 0.35)}px`,
                      ['--i' as string]: n.lane,
                    }}
                  />
                );
              })}
            </div>
            <div className="hw-hitline" />
            {flash && (
              <div key={flash.n} className={`hw-flash ${flash.cls}`} aria-live="assertive">
                {flash.text}
              </div>
            )}
            {s.opts.mode === 'kit' && (
              <div className="hw-lane-labels kit" data-kit-lanes="1">
                {KIT_LANES.map((l, i) => (
                  <span
                    key={l}
                    className={`kit-pad kit-${l}`}
                    style={{ ['--i' as string]: i }}
                    ref={(el) => {
                      padEls.current[i] = el;
                    }}
                    onAnimationEnd={(e) => e.currentTarget.classList.remove('hit')}
                  >
                    <KitIcon lane={l} />
                    <b>{KIT_NAME[l][lang]}</b>
                  </span>
                ))}
              </div>
            )}
            {s.laneMidis.length > 0 && s.opts.mode !== 'kit' && (
              <div className="hw-lane-labels">
                {s.laneMidis.map((m, i) => (
                  <span key={i} style={{ ['--i' as string]: i }}>
                    <b>{s.laneDegrees[i]}</b>
                    <small>{displayNote(PC_NAMES[m % 12], naming, lang)}</small>
                  </span>
                ))}
              </div>
            )}
          </div>
          {opts.mode === 'tap' && (
            <button
              className="tap-pad big hw-pad live"
              onPointerDown={(e) => {
                e.preventDefault();
                input(e.timeStamp);
              }}
              aria-label={tx(T.tapHere)}
            >
              {tx(T.tapHere)}
            </button>
          )}
          <p className="hint">{opts.mode === 'tap' ? tx(T.tapHint) : opts.mode === 'kit' ? (kitLink.state === 'ok' ? <span ref={lastHitRef}>{tx(T.kitPlay)}</span> : tx(kitLink.state === 'unsupported' ? T.linkUnsupported : kitLink.state === 'denied' ? T.linkDenied : T.linkNone)) : tx(T.pitchHint)}</p>
        </>
      )}
    </main>
  );
}
