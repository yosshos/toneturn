// Technique drills (spec AI): the hub (today's items, families, the technique map), a family's levels with the
// 12-key heat map, the run loop with the tempo ladder, drills settings, calibration and the drill creator.

import { SONGBOOK } from '../content/songbook';
import { COMMON_CHORDS, keyName as songKeyName, songFit } from '../engine/songChords';
import { recordTakeAnalysis } from '../storage/analysis';
import { checkRules } from '../engine/improvRules';
import { parseChart } from '../engine/charts';
import { PART_NAME, songDrill } from '../engine/drills/songDrills';
import { useMemo, useRef, useState } from 'react';
import { bassTuningOf, type Settings } from '../storage/progress';
import type { RatingEvent } from '../engine/rating';
import type { CustomDrill, Drill, DrillCalibration, DrillSettings, FamilyId, ItemState, PlayedNote, TakeMetrics } from '../engine/drills/types';
import { DEFAULT_DRILL_SETTINGS } from '../engine/drills/types';
import { keyName } from '../engine/drills/generate';
import type { FamilyDef, LevelDef } from '../engine/drills/generate';
import { applyTake, familyLevel, newItem, type LadderResult } from '../engine/drills/ladder';
import { customKeys, customToDrill } from '../engine/drills/custom';
import { DrillCreator } from './DrillCreator';
import { currentLevel, families as familiesOf, keyHeat, levelDone, levelStars, LEVEL_MAX_STARS, levelKeys, shownFamilies, specDrills, todayDrills, levelDrills, withBassTuning, itemTargetBpm } from '../engine/drills/plan';
import { generate, KEYS_EAR_PROBE } from '../engine/drills/generate';
import { GUITAR_PROBES, type GuitarLevelDef } from '../engine/drills/guitar';
import { BASS_PROBES, placeBass, probeSlot, type BassProbeResult } from '../engine/drills/bassProbes';
import { walkProbeReport } from '../engine/drills/bassAnalyze';
import { expTimeMs } from '../engine/drills/analyze';
import { isGuitarDrill } from '../engine/drills/events';
import { drillEvents, drillXp } from '../engine/drills/events';
import { bandOfBpm as tempoBandOf } from '../engine/drills/analyze';
import { ChartView, DrillStaff, DrillTab, DrillTake, EarCard, MarkLegend, TakeResult } from './DrillTake';
import { TranscribeWrite } from './BassWrite';
import { DrumWrite } from './DrumWrite';
import { withDrumWrite } from '../engine/drills/drumEar';
import { withWritten } from '../engine/drills/bassEar';
import { midi } from '../speech/midi';
import { inputLatency } from '../engine/latency';
import { LatencyCalibrate } from './LatencyCalibrate';
import { DrumSongCard } from './DrumSongCard';
import { DrumScore, KitCard, KitSetup } from './DrumViews';
import { drumMicOf, kitKind, type KitKind } from '../engine/drumKit';
import { drumProbes, GROOVE_REACH, placeDrums, type DrumProbeResult, type DrumSlot } from '../engine/drills/drums';
import { isDrumDrill } from '../engine/drills/events';

type Lang = 'he' | 'en';
const T = {
  en: {
    title: 'Technique', today: 'Today', start: 'Start', families: 'Drills', mine: 'My drills', create: 'Create a drill', settings: 'Drill settings', calib: 'Calibrate', level: 'Level', keys: 'Keys', done: 'done',
    role: { 'warm-up': 'Warm-up', weak: 'Work on', maintenance: 'Keep fresh', variant: 'Variation', new: 'New' } as Record<string, string>,
    noMidi: 'Connect a MIDI keyboard for the full analysis (velocity, hands, legato). The microphone works for pitch and timing.',
    fingering: 'Show fingering', order: 'Key order', cont: 'Continuous practice', contAcc: 'Accuracy to move on', emphasis: 'Style', inPath: 'Drills in my path', inWorkout: 'Drills in the daily workout',
    orders: { 'fifths-up': 'Circle of fifths ↑', 'fifths-down': 'Circle of fifths ↓', 'chromatic-up': 'Chromatic ↑', 'chromatic-down': 'Chromatic ↓', difficulty: 'Easiest first' } as Record<string, string>,
    conts: { off: 'Off', 'raise-tempo': 'Raise the tempo', 'next-key': 'Next key', 'next-drill': 'Next drill' } as Record<string, string>,
    emph: { both: 'Both', classical: 'Classical', jazz: 'Jazz' } as Record<string, string>,
    latency: 'Latency (ms)', softest: 'Play your softest note', loudest: 'Play your loudest note', range: 'Velocity range', save: 'Save', cancel: 'Cancel', del: 'Delete',
    name: 'Name', scale: 'Scale', pattern: 'Degrees (1 = tonic, 8 = octave, b3 / #4 for altered)', seq: 'Sequence steps up the scale', hands: 'Hands', record: 'Record on MIDI (in C)', recording: 'Playing… press stop when done', stop: 'Stop', preview: 'Preview in C',
    allKeys: 'Run through all keys', keyDone: 'All keys done!', backToLevel: 'Back',
    instrument: 'Instrument', insts: { piano: 'Piano', guitar: 'Guitar', bass: 'Bass', drums: 'Drums' } as Record<string, string>, gStyle: 'Style', gView: 'Show', gViews: { tab: 'Tab', staff: 'Notation', both: 'Both' } as Record<string, string>, picking: 'Show picking (↓ ↑, p i m a) instead of fingers',
    gStyles: { all: 'All', rock: 'Rock', blues: 'Blues', metal: 'Metal', pop: 'Pop', funk: 'Funk', country: 'Country', jazz: 'Jazz', classical: 'Classical', fingerstyle: 'Fingerstyle', flamenco: 'Flamenco', reggae: 'Reggae', latin: 'Latin' } as Record<string, string>,
    test: 'Find my technique level', testIntro: 'A few short takes: each clean one goes faster, until it stops being clean. This sets where every drill family starts and at what tempo.', testDone: 'Your technique level is set', skip: 'Skip', bestTempo: 'Clean up to',
  },
  he: {
    title: 'טכניקה', today: 'היום', start: 'להתחיל', families: 'תרגילים', mine: 'התרגילים שלי', create: 'ליצור תרגיל', settings: 'הגדרות תרגילים', calib: 'כיול', level: 'רמה', keys: 'סולמות', done: 'הושלם',
    role: { 'warm-up': 'חימום', weak: 'לחזק', maintenance: 'לשמור טרי', variant: 'וריאציה', new: 'חדש' } as Record<string, string>,
    noMidi: 'חברו מקלדת MIDI לניתוח המלא (עוצמה, ידיים, לגאטו). המיקרופון מספיק לגובה ולתזמון.',
    fingering: 'להציג אצבוע', order: 'סדר הסולמות', cont: 'תרגול רציף', contAcc: 'דיוק כדי להתקדם', emphasis: 'סגנון', inPath: 'תרגילים במסלול שלי', inWorkout: 'תרגילים באימון היומי',
    orders: { 'fifths-up': 'מעגל הקווינטות ↑', 'fifths-down': 'מעגל הקווינטות ↓', 'chromatic-up': 'כרומטי ↑', 'chromatic-down': 'כרומטי ↓', difficulty: 'מהקל לקשה' } as Record<string, string>,
    conts: { off: 'כבוי', 'raise-tempo': 'להעלות טמפו', 'next-key': 'לסולם הבא', 'next-drill': 'לתרגיל הבא' } as Record<string, string>,
    emph: { both: 'שניהם', classical: 'קלאסי', jazz: 'ג׳אז' } as Record<string, string>,
    latency: 'השהיה (מ״ש)', softest: 'נגנו את התו הכי שקט', loudest: 'נגנו את התו הכי חזק', range: 'טווח עוצמה', save: 'שמירה', cancel: 'ביטול', del: 'מחיקה',
    name: 'שם', scale: 'סולם', pattern: 'דרגות (1 = טוניקה, 8 = אוקטבה, b3 / #4 לשינויים)', seq: 'צעדי סקוונצה במעלה הסולם', hands: 'ידיים', record: 'להקליט ב-MIDI (בדו)', recording: 'מנגנים… לחצו עצירה בסוף', stop: 'עצירה', preview: 'תצוגה בדו',
    allKeys: 'לעבור בכל הסולמות', keyDone: 'כל הסולמות הושלמו!', backToLevel: 'חזרה',
    instrument: 'כלי', insts: { piano: 'פסנתר', guitar: 'גיטרה', bass: 'בס', drums: 'תופים' } as Record<string, string>, gStyle: 'סגנון', gView: 'תצוגה', gViews: { tab: 'טאבים', staff: 'תווים', both: 'שניהם' } as Record<string, string>, picking: 'להציג פריטה (↓ ↑, p i m a) במקום אצבעות',
    gStyles: { all: 'הכול', rock: 'רוק', blues: 'בלוז', metal: 'מטאל', pop: 'פופ', funk: 'פאנק', country: 'קאנטרי', jazz: 'ג׳אז', classical: 'קלאסי', fingerstyle: 'פינגרסטייל', flamenco: 'פלמנקו', reggae: 'רגאיי', latin: 'לטיני' } as Record<string, string>,
    test: 'למצוא את רמת הטכניקה שלי', testIntro: 'כמה נגינות קצרות: כל נגינה נקייה מהירה יותר, עד שהיא כבר לא נקייה. כך נקבע מאיפה כל משפחת תרגילים מתחילה ובאיזה טמפו.', testDone: 'רמת הטכניקה שלך נקבעה', skip: 'דילוג', bestTempo: 'נקי עד',
  },
};

const takeInfo = (d: Drill, m: TakeMetrics) => {
  const cvs = [m.cvR, m.cvL].filter((x): x is number => x !== null);
  return { verdict: m.verdict, hands: d.spec.hands, cv: cvs.length ? Math.max(...cvs) : null };
};
export const DEFAULT_CAL: DrillCalibration = { latencyMs: 0, velMin: 20, velMax: 120 };
/** The drill calibration with the input's calibrated delay (MIDI when a keyboard is connected, else the microphone). */
const calOf = (s: Settings): DrillCalibration => ({ ...DEFAULT_CAL, ...(s.drillCal ?? {}), latencyMs: inputLatency(s, midi.devices.length ? 'midi' : 'mic') });
const FAM_HUE: Partial<Record<FamilyId, string>> = { scales: 'var(--mint)', arpeggios: '#7c8cff', cadences: '#c38cff', fingers: 'var(--gold)', control: '#ff8a5c', advanced: '#ff6b9a', harris: '#5cd6ff', jazz: '#5cffb0', voicings: '#ffd15c', accomp: '#b0ff5c', 'k-ear': '#8fb8ff', 'k-sixdim': '#5cc2ff', 'k-bebop': '#4fe0a0', 'k-reharm': '#ffc04d', custom: '#e0e0ff' };
const HANDS_TX: Record<Lang, Record<string, string>> = { en: { R: 'RH', L: 'LH', RL: 'HT' }, he: { R: 'ימין', L: 'שמאל', RL: 'ביחד' } };

/** Drill settings with the instrument defaulting to the player's (guitar / bass players get guitar drills). */
export function drillSettingsOf(s: Pick<Settings, 'drills' | 'instrument'> & { activeCourse?: Settings['activeCourse'] }): DrillSettings {
  const inst = s.instrument === 'guitar' ? 'guitar' : s.instrument === 'bass' ? 'bass' : 'piano';
  // 0.64: an instrument course decides the technique instrument (keys → piano, guitar, bass), however the course was reached.
  const byCourse: DrillSettings['instrument'] | null = s.activeCourse === 'keys' ? 'piano' : s.activeCourse === 'guitar' ? 'guitar' : s.activeCourse === 'bass' ? 'bass' : s.activeCourse === 'drums' ? 'drums' : null;
  const out: DrillSettings = { ...DEFAULT_DRILL_SETTINGS, instrument: inst as DrillSettings['instrument'], ...(s.drills ?? {}) };
  return byCourse ? { ...out, instrument: byCourse } : out;
}

/**
 * A drill's notes: tab for guitar / bass (and / or notation by the setting), the staff for piano. Bass (0.64): reading
 * drills force notation (B10); free-choice drills show only the chord chart, with an opt-in model line (B3); ear drills
 * show what to do until the result (B11). `beat` = the running take's beat, for the moving window (B2).
 */
export function DrillScore({ drill, ds, result, beat = -1, lang = 'en' }: { drill: Drill; ds: DrillSettings; result?: TakeMetrics | null; beat?: number; lang?: Lang }) {
  const [model, setModel] = useState(false);
  // Ear drills (bass B11, the drummer's ear): what to do and which bars are yours, until the result.
  // The pianist's ear (PIANO_AUDIT §3) too: the answer stays hidden until the result.
  if (drill.show === 'none' && !result) return <EarCard drill={drill} beat={beat} lang={lang} />;
  // Drums (0.65): a percussion staff (reading always), or lanes by the setting.
  if (isDrumDrill(drill)) return <DrumScore drill={drill} view={drill.show === 'staff' ? 'staff' : (ds.drumView ?? 'staff')} result={result} beat={beat} lang={lang} />;
  if (!isGuitarDrill(drill)) return <DrillStaff drill={drill} fingering={ds.showFingering} result={result} />;
  if (drill.show === 'none' && !result) return <EarCard drill={drill} beat={beat} lang={lang} />;
  const view = drill.show === 'staff' ? 'staff' : (ds.guitarView ?? 'tab');
  const chartOnly = drill.show === 'chart' && !model;
  const upTo = chartOnly ? (drill.freeFrom ?? 0) : undefined;
  const written = upTo === undefined || upTo > 0;
  return (
    <>
      {written && view !== 'staff' && <DrillTab drill={drill} fingering={ds.showFingering} picking={!!ds.showPicking} result={result} beat={beat} upTo={upTo} />}
      {written && view !== 'tab' && <DrillStaff drill={drill} result={result} beat={beat} upTo={upTo} />}
      {chartOnly && <ChartView drill={drill} beat={beat} fromBeat={drill.freeFrom ?? 0} />}
      {drill.show === 'chart' && (
        <button className="link model-toggle" onClick={() => setModel(!model)} aria-pressed={model} data-model-line={model ? 'on' : 'off'}>
          {model ? (lang === 'he' ? 'להסתיר את קו הדוגמה' : 'Hide the model line') : lang === 'he' ? 'להציג קו לדוגמה' : 'Show a model line'}
        </button>
      )}
    </>
  );
}

export interface DrillsProps {
  lang: Lang;
  settings: Settings;
  onSettings: (p: Partial<Settings>) => void;
  items: Record<string, ItemState>;
  /** One take: the item's new state, its rated events and XP. */
  onTake: (state: ItemState, evs: RatingEvent[], xp: number, m?: { verdict: string; hands: string; cv: number | null }) => void;
  onBack: () => void;
  /** Start straight in a run (path step / workout block). */
  queue?: Drill[];
  /** Called when a queued run (path / workout) ends. */
  onQueueDone?: (takes: number, clean: number) => void;
  /** Open on the technique level test (after Find my level). */
  startTest?: boolean;
  onTestDone?: () => void;
  /** Open on the songbook (Practice → Songs, 0.44). */
  songs?: boolean;
  /** "Sing a song" on the songbook page. */
  onSing?: () => void;
  /** Voice is an instrument here too (owner 2026-11-08): opens vocal training. */
  onVoice?: () => void;
  /** My pieces — learn a whole piece from a score (SPEC-PIECE). */
  onPieces?: () => void;
}

type View = { k: 'test' } | { k: 'hub' } | { k: 'songs' } | { k: 'family'; f: FamilyDef } | { k: 'run'; queue: Drill[]; i: number; from: View } | { k: 'settings' } | { k: 'calib' } | { k: 'creator'; edit?: CustomDrill } | { k: 'kit'; then?: 'test'; start?: KitKind };

export function Drills({ lang, settings, onSettings, items, onTake, onBack, queue, onQueueDone, startTest, onTestDone, songs, onSing, onVoice, onPieces }: DrillsProps) {
  const tx = T[lang];
  const ds = drillSettingsOf(settings);
  const [view, setView] = useState<View>(startTest ? (ds.instrument === 'drums' && !settings.drumKit?.done ? { k: 'kit' } : { k: 'test' }) : queue?.length ? { k: 'run', queue, i: 0, from: { k: 'hub' } } : songs ? { k: 'songs' } : { k: 'hub' });
  // A 5- / 6-string or drop-D bass (Settings → tuning): the bass-course drills are placed on that neck.
  // B12 (0.64): the bass has its own tuning setting (Settings → bassTuning), apart from the guitar's.
  const bassTuning = bassTuningOf(settings);
  const runQueue = useMemo(() => (view.k === 'run' ? withBassTuning(view.queue, bassTuning) : []), [view, bassTuning]);
  const head = (title: string, back: () => void) => (
    <header className="screen-head">
      <button className="icon-btn" onClick={back} aria-label="Back">
        <span className="flip-rtl">‹</span>
      </button>
      <h1>{title}</h1>
    </header>
  );
  const setDs = (p: Partial<DrillSettings>) => onSettings({ drills: { ...ds, ...p } });

  if (view.k === 'run')
    return (
      <main className="drills-screen" data-drills="run">
        {head(view.queue[view.i]?.title[lang] ?? tx.title, () => (queue?.length ? onBack() : setView(view.from)))}
        <DrillRun
          lang={lang}
          ds={ds}
          headphones={settings.headphones}
          onHeadphones={(h) => onSettings({ headphones: h })}
          cal={calOf(settings)}
          queue={runQueue}
          kit={settings.drumKit}
          start={view.i}
          items={items}
          onTake={onTake}
          onEnd={(takes, clean) => (onQueueDone && queue?.length ? onQueueDone(takes, clean) : setView(view.from))}
        />
      </main>
    );
  if (view.k === 'songs')
    return (
      <main className="drills-screen songs-screen" data-drills="songs">
        {head(lang === 'he' ? 'שירים' : 'Songs', onBack)}
        <p className="field-hint">{lang === 'he' ? 'שירים מוכרים מנחלת הכלל: לנגן את המנגינה, את האקורדים או את שניהם — או לשיר.' : 'Well-known public-domain songs: play the melody, the chords or both — or sing.'}</p>
        {onPieces && (
          <button className="pc-entry" onClick={onPieces} data-pieces-open="1">
            <b>{lang === 'he' ? 'היצירות שלי' : 'My pieces'}</b>
            <small>{lang === 'he' ? 'העלו תווים (MusicXML / MIDI) — והאפליקציה תבנה תוכנית אימון עד הטמפו' : 'Bring a score (MusicXML / MIDI) — the app builds the practice plan up to tempo'}</small>
          </button>
        )}
        {onSing && (
          <button className="btn songs-sing" onClick={onSing} data-song-sing="1">
            {lang === 'he' ? 'לשיר שיר' : 'Sing a song'}
          </button>
        )}
        <SongList lang={lang} ds={ds} onRun={(q) => setView({ k: 'run', queue: q, i: 0, from: { k: 'songs' } })} known={settings.knownChords} onKnown={(k) => onSettings({ knownChords: k })} />
      </main>
    );
  if (view.k === 'test')
    return (
      <main className="drills-screen" data-drills="test">
        {head(tx.test, () => (startTest && onTestDone ? onTestDone() : setView({ k: 'hub' })))}
        <TechLevelTest
          lang={lang}
          ds={ds}
          cal={calOf(settings)}
          items={items}
          onTake={onTake}
          midiOctave={settings.midiOctave ?? 0}
          onOctave={(o) => onSettings({ midiOctave: o })}
          onBassTuning={(t) => onSettings({ bassTuning: t })}
          kit={settings.drumKit}
          onDone={(start) => {
            if (start) onSettings({ drillStart: { ...(settings.drillStart ?? {}), ...start } });
            if (startTest && onTestDone) onTestDone();
            else setView({ k: 'hub' });
          }}
        />
      </main>
    );
  if (view.k === 'kit')
    return (
      <main className="drills-screen" data-drills="kit">
        {head(lang === 'he' ? 'הגדרת המערכת' : 'Set up your kit', () => setView({ k: 'hub' }))}
        <KitSetup
          key={view.start ?? 'connect'}
          start={view.start}
          lang={lang}
          kit={settings.drumKit}
          latency={settings}
          onSave={(k) => onSettings({ drumKit: k, ...(k.mic ? {} : { midiInput: true }) })}
          onLatency={(p) => onSettings(p)}
          onDone={() => setView({ k: 'hub' })}
          onTest={() => setView({ k: 'test' })}
        />
      </main>
    );
  if (view.k === 'settings')
    return (
      <main className="drills-screen" data-drills="settings">
        {head(tx.settings, () => setView({ k: 'hub' }))}
        <DrillSettingsView lang={lang} ds={ds} onChange={setDs} onCalib={() => setView(ds.instrument === 'drums' ? { k: 'kit' } : { k: 'calib' })} />
      </main>
    );
  if (view.k === 'calib')
    return (
      <main className="drills-screen" data-drills="calib">
        {head(tx.calib, () => setView({ k: 'settings' }))}
        <LatencyCalibrate lang={lang} values={settings} onSave={(p) => onSettings(p)} sources={['midi', 'mic']} />
        <Calibration lang={lang} cal={calOf(settings)} onSave={(c) => (onSettings({ drillCal: c }), setView({ k: 'settings' }))} />
      </main>
    );
  if (view.k === 'creator')
    return (
      <main className="drills-screen" data-drills="creator">
        {head(tx.create, () => setView({ k: 'hub' }))}
        <DrillCreator
          lang={lang}
          edit={view.edit}
          instrument={ds.instrument === 'drums' ? 'piano' : (ds.instrument ?? 'piano')}
          settings={ds}
          onSave={(c) => {
            const list = (settings.customDrills ?? []).filter((x) => x.id !== c.id);
            onSettings({ customDrills: [...list, c] });
            setView({ k: 'hub' });
          }}
          onDelete={
            view.edit
              ? () => {
                  onSettings({ customDrills: (settings.customDrills ?? []).filter((x) => x.id !== view.edit!.id) });
                  setView({ k: 'hub' });
                }
              : undefined
          }
          onTry={(c) => setView({ k: 'run', queue: customKeys(c, ds.keyOrder).map((k) => customToDrill(c, k)), i: 0, from: { k: 'creator', edit: c } })}
        />
      </main>
    );
  if (view.k === 'family')
    return (
      <main className="drills-screen" data-drills="family">
        {head(view.f.title[lang], () => setView({ k: 'hub' }))}
        <FamilyView lang={lang} ds={ds} f={view.f} items={items} start={settings.drillStart?.[view.f.id]} onRun={(q, i) => setView({ k: 'run', queue: q, i, from: view })} />
      </main>
    );
  return (
    <Hub
      lang={lang}
      ds={ds}
      settings={settings}
      items={items}
      head={head(tx.title, onBack)}
      onFamily={(f) => setView({ k: 'family', f })}
      onRun={(q) => setView({ k: 'run', queue: q, i: 0, from: { k: 'hub' } })}
      onSettings={() => setView({ k: 'settings' })}
      onCreate={(edit) => setView({ k: 'creator', edit })}
      onTest={() => setView(ds.instrument === 'drums' && !settings.drumKit?.done ? { k: 'kit' } : { k: 'test' })}
      onInstrument={(i) => setDs({ instrument: i })}
      onVoice={onVoice}
      onKit={(start) => setView({ k: 'kit', start })}
      onKitSave={(k) => onSettings({ drumKit: k })}
    />
  );
}


/** Technique topics (owner 2026-11-08): the drills split and filtered like the games list. */
type DrillTopic = 'all' | 'scales' | 'chords' | 'hands' | 'time' | 'grooves' | 'styles' | 'reading' | 'ear' | 'upright' | 'songs' | 'mine';
const TOPIC_OF: Record<string, Exclude<DrillTopic, 'all' | 'songs' | 'mine'>> = {
  scales: 'scales', arpeggios: 'scales', 'g-scales': 'scales', 'g-arps': 'scales', 'g-reading': 'scales', 'g-bass': 'scales',
  cadences: 'chords', voicings: 'chords', accomp: 'chords', 'g-chords': 'chords', 'g-rhythm': 'chords',
  fingers: 'hands', control: 'hands', advanced: 'hands', 'g-fretting': 'hands', 'g-picking': 'hands', 'g-legato': 'hands', 'g-fingerstyle': 'hands',
  harris: 'styles', jazz: 'styles', 'k-sixdim': 'styles', 'k-bebop': 'styles', 'k-reharm': 'styles', 'g-lead': 'styles', 'g-flamenco': 'styles', 'g-jazz': 'styles', 'g-impro': 'styles',
  // Bass course (unlisted b-* families fall under hands: pluck, fret, length, legato, pick, slap). B17 (0.64): time and
  // pocket are their own topic, reading has one, the bass ear one, and the upright track is grouped on its own.
  'b-scale': 'scales', 'b-read': 'reading', 'b-posread': 'reading', 'b-impro': 'styles', 'b-swing': 'time', 'b-odd': 'time', 'b-poly': 'time', 'b-prog': 'styles', 'b-barry': 'styles', 'b-jform': 'styles', 'b-latin': 'styles', 'b-chord': 'chords', 'b-walk': 'chords', 'b-time': 'time', 'b-pocket': 'time', 'b-ghost': 'styles', 'b-styles': 'styles', 'b-ear': 'ear',
  // Drums (0.65): strokes, rudiments and paradiddles are hand technique; grooves and fills their own topic.
  'd-strokes': 'hands', 'd-rolls': 'hands', 'd-diddles': 'hands', 'd-time': 'time', 'd-rock': 'grooves', 'd-fills': 'grooves', 'd-read': 'reading',
  // Drums v2 families (DRUMS_AUDIT N1): styles (funk, shuffle, Middle-Eastern), coordination with the grooves.
  'd-funk': 'styles', 'd-shuffle': 'styles', 'd-mideast': 'styles', 'd-indep': 'grooves', 'd-feet': 'grooves',
  // Drums content (0.66): the drummer's ear has its own topic; jazz and Latin are styles.
  'd-ear': 'ear', 'd-jazz': 'styles', 'd-latin': 'styles',
  // DRUMS_NICHE_PLAN P1: songs with the grooves and fills, prog with the styles, counting with time, notation and song
  // form with reading.
  'd-song': 'grooves', 'd-prog': 'styles', 'd-count': 'time', 'd-notation': 'reading', 'd-form': 'reading',
  // PIANO_AUDIT §3: the pianist's ear has its own topic; piano sight-reading sits under reading.
  'k-ear': 'ear',
  'b-up-pos': 'upright', 'b-up-arco': 'upright', 'b-up-scales': 'upright', 'b-up-pizz': 'upright', 'b-up-walk': 'upright', 'b-up-read': 'upright',
};
const TOPIC_NAME: Record<DrillTopic, { en: string; he: string }> = {
  all: { en: 'All', he: 'הכול' },
  scales: { en: 'Scales & arpeggios', he: 'סולמות וארפג׳יו' },
  chords: { en: 'Chords & harmony', he: 'אקורדים והרמוניה' },
  hands: { en: 'Hand technique', he: 'טכניקת ידיים' },
  time: { en: 'Time & groove', he: 'זמן וגרוב' },
  grooves: { en: 'Grooves & fills', he: 'גרובים ומעברים' },
  styles: { en: 'Styles & jazz', he: 'סגנונות וג׳אז' },
  reading: { en: 'Reading & charts', he: 'קריאה וצ׳ארטים' },
  ear: { en: 'Bass ear', he: 'שמיעה לבסיסטים' },
  upright: { en: 'Upright bass', he: 'קונטרבס' },
  songs: { en: 'Songs', he: 'שירים' },
  mine: { en: 'My drills', he: 'התרגילים שלי' },
};

/** A topic's name; the drums course has no jazz under "styles" (DRUMS_AUDIT N1). */
const topicName = (k: DrillTopic, drums: boolean, piano = false): { en: string; he: string } =>
  drums && k === 'styles' ? { en: 'Styles', he: 'סגנונות' } : drums && k === 'ear' ? { en: 'Drummer’s ear', he: 'שמיעה למתופפים' } : piano && k === 'ear' ? { en: 'Pianist’s ear', he: 'שמיעה לפסנתרנים' } : piano && k === 'styles' ? { en: 'Jazz piano', he: 'פסנתר ג׳אז' } : TOPIC_NAME[k];

function Hub({ lang, ds, settings, items, head, onFamily, onRun, onSettings, onCreate, onTest, onInstrument, onVoice, onKit, onKitSave }: { onKit?: (start?: KitKind) => void; onKitSave?: (k: NonNullable<Settings['drumKit']>) => void; onVoice?: () => void; lang: Lang; ds: DrillSettings; settings: Settings; items: Record<string, ItemState>; head: React.ReactNode; onFamily: (f: FamilyDef) => void; onRun: (q: Drill[]) => void; onSettings: () => void; onCreate: (edit?: CustomDrill) => void; onTest: () => void; onInstrument: (i: 'piano' | 'guitar' | 'bass' | 'drums') => void }) {
  const tx = T[lang];
  // N10: the bass tuning hides the low-B levels on a bass without a low B.
  const bassTuning = bassTuningOf(settings);
  const drums = ds.instrument === 'drums';
  const drumMic = drums && drumMicOf(settings.drumKit);
  const today = useMemo(() => todayDrills({ ...ds, bassTuning, drumMic }, items, settings.drillStart ?? {}, settings.customDrills ?? []), [ds, bassTuning, drumMic, items, settings.drillStart, settings.customDrills]);
  const fams = shownFamilies({ ...ds, bassTuning, drumMic });
  const [topicRaw, setTopicState] = useState<DrillTopic>(() => {
    try {
      return (sessionStorage.getItem('toneturn.drilltopic') as DrillTopic | null) ?? 'all';
    } catch {
      return 'all';
    }
  });
  const setTopic = (x: DrillTopic) => {
    setTopicState(x);
    try {
      sessionStorage.setItem('toneturn.drilltopic', x);
    } catch {
      /* fine */
    }
  };
  const famTopics = (['scales', 'chords', 'hands', 'time', 'grooves', 'styles', 'reading', 'ear', 'upright'] as const).filter((k) => fams.some((f) => (TOPIC_OF[f.id] ?? 'hands') === k));
  // Drums: no songbook or drill creator (melody / chords) — the course's own families only.
  const topics: DrillTopic[] = drums ? ['all', ...famTopics] : ['all', ...famTopics, 'songs', 'mine'];
  const topic: DrillTopic = topics.includes(topicRaw) ? topicRaw : 'all';
  const piano = (ds.instrument ?? 'piano') === 'piano';
  const famCard = (f: FamilyDef) => {
    const lv = familyLevel(items, f.id);
    // Drums: no keys and no tempo bands — the level worked on of the family's levels, and a pip per level done.
    // Bass / guitar (final bass check): their families have 4–18 levels, not the piano's 7 — same card. Piano too
    // (PIANO_AUDIT I6: its families have 7–17 levels; "level 2.3 / 7" was the tempo band), with its key heat row.
    {
      const cur = currentLevel(f, items, ds.keyOrder, settings.drillStart?.[f.id]);
      return (
        <button key={f.id} className="drill-family" style={drums ? undefined : { ['--hue' as string]: FAM_HUE[f.id] }} onClick={() => onFamily(f)} data-family={f.id}>
          <b>{f.title[lang]}</b>
          <small>
            {tx.level} <span className="lvl">{f.levels.indexOf(cur) + 1}</span> / {f.levels.length}
          </small>
          <span className="level-pips" aria-hidden="true">
            {f.levels.map((l) => (
              <i key={l.id} className={levelDone(l, items, ds.keyOrder) ? 'on' : l.id === cur.id ? 'now' : ''} />
            ))}
          </span>
          {piano && lv > 0 && <HeatRow heat={keyHeat(f.id, items)} />}
        </button>
      );
    }
  };
  const show = (x: DrillTopic) => topic === 'all' || topic === x;
  return (
    <main className="drills-screen" data-drills="hub">
      {head}
      {/* 0.64 (owner): in an instrument course technique is that instrument's only — no switching to another one here. */}
      {!['keys', 'guitar', 'bass', 'drums'].includes(settings.activeCourse ?? 'ear') && (
      <div className="chips drill-inst" role="radiogroup" aria-label={tx.instrument}>
        {(['piano', 'guitar', 'bass', 'drums'] as const).map((i) => (
          <button key={i} role="radio" aria-checked={(ds.instrument ?? 'piano') === i} className={`chip ${(ds.instrument ?? 'piano') === i ? 'on' : ''}`} onClick={() => onInstrument(i)} data-inst={i}>
            {tx.insts[i]}
          </button>
        ))}
        {onVoice && (
          <button role="radio" aria-checked={false} className="chip" onClick={onVoice} data-inst="voice">
            {lang === 'he' ? 'קול' : 'Voice'}
          </button>
        )}
      </div>
      )}
      {!midi.devices.length && (ds.instrument ?? 'piano') === 'piano' && <p className="field-hint">{tx.noMidi}</p>}
      {drums && onKit && <KitCard kit={settings.drumKit} lang={lang} onSetup={onKit} onKit={onKitSave} />}
      {/* DRUMS_NICHE_PLAN d-song L8: drum your own song's form over a typed chord chart. */}
      {drums && <DrumSongCard lang={lang} onRun={onRun} />}
      {!settings.drillStart && !Object.keys(items).length && (
        <button className="btn primary" onClick={onTest} data-drills-test="1">
          {tx.test}
        </button>
      )}
      <div className="chips drill-topics" role="tablist" aria-label={lang === 'he' ? 'נושאים' : 'Topics'}>
        {topics.map((x) => (
          <button key={x} role="tab" aria-selected={topic === x} className={`chip ${topic === x ? 'on' : ''}`} onClick={() => setTopic(x)} data-topic={x}>
            {topicName(x, drums, (ds.instrument ?? 'piano') === 'piano')[lang]}
          </button>
        ))}
      </div>
      {topic === 'all' && (
      <section className="drill-today card" aria-label={tx.today}>
        <div className="drills-head">
          <h2>{tx.today}</h2>
          <button className="btn primary" onClick={() => onRun(today.map((t) => t.drill))} disabled={!today.length} data-drills-start="1">
            ▶ {tx.start}
          </button>
        </div>
        <ol className="drill-levels">
          {today.map((t) => (
            <li key={t.drill.itemId}>
              <button className="drill-level" onClick={() => onRun([t.drill])}>
                <span className="n">{tx.role[t.role]}</span>
                <span>{t.drill.title[lang]}</span>
                <span dir="ltr">♩{(items[t.drill.itemId] ?? newItem(t.drill)).goalBpm}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
      )}
      {famTopics.filter(show).map((k) => (
        <section key={k} className="drill-topic" data-drill-topic={k}>
          {topic === 'all' && <h2>{topicName(k, drums, (ds.instrument ?? 'piano') === 'piano')[lang]}</h2>}
          <div className="drill-families">{fams.filter((f) => (TOPIC_OF[f.id] ?? 'hands') === k).map(famCard)}</div>
        </section>
      ))}
      {/* Songs (owner 2026-11-07): public-domain songs to play — the melody, the chords, or both hands. */}
      {topic === 'all' && !drums && (
        <button className="drill-family drill-songs-link" onClick={() => setTopic('songs')} data-topic-link="songs">
          <b>{TOPIC_NAME.songs[lang]}</b>
          <small>{lang === 'he' ? `${SONGBOOK.length} שירים מוכרים — מנגינה ואקורדים` : `${SONGBOOK.length} well-known songs — melody and chords`}</small>
        </button>
      )}
      {topic === 'songs' && (
        <section className="drill-songs" data-drill-songs="1">
          <h2>{TOPIC_NAME.songs[lang]}</h2>
          <small className="field-hint">{lang === 'he' ? 'מנגינות ואקורדים משירים מוכרים (נחלת הכלל)' : 'Melodies and chords of well-known songs (public domain)'}</small>
          <SongList lang={lang} ds={ds} onRun={onRun} />
        </section>
      )}
      {show('mine') && !drums && (
        <>
          <h2>{tx.mine}</h2>
          <div className="drill-levels">
        {(settings.customDrills ?? []).filter((c) => (c.instrument ?? 'piano') === (ds.instrument ?? 'piano')).map((c) => (
          <div key={c.id} className="drill-level">
            <span className="n">✎</span>
            <button className="link" onClick={() => onCreate(c)}>
              {c.name}
            </button>
            <button className="btn small" onClick={() => onRun(customKeys(c, ds.keyOrder).map((k) => customToDrill(c, k)))}>
              ▶ {tx.allKeys}
            </button>
          </div>
        ))}
        <button className="btn ghost" onClick={() => onCreate()} data-drills-create="1">
          ＋ {tx.create}
        </button>
          </div>
        </>
      )}
      <div className="drill-actions">
        <button className="btn ghost" onClick={onSettings} data-drills-settings="1">
          {tx.settings}
        </button>
        {(settings.drillStart || Object.keys(items).length > 0) && (
          <button className="btn ghost" onClick={onTest}>
            {tx.test}
          </button>
        )}
      </div>
    </main>
  );
}

/** 12 small cells, one per key (C … B), shaded by the clean tempo reached; never colour-only (a number inside). */
export function HeatRow({ heat }: { heat: number[] }) {
  return (
    <div className="heat-row" style={{ ['--cols' as string]: 12, gridTemplateColumns: 'repeat(12, 1fr)' }} dir="ltr" aria-hidden>
      {heat.map((h, k) => (
        <span key={k} className={`heat-cell l${h}`} style={{ height: 10, fontSize: 0 }} />
      ))}
    </div>
  );
}

function FamilyView({ lang, ds, f, items, start, onRun }: { lang: Lang; ds: DrillSettings; f: FamilyDef; items: Record<string, ItemState>; start?: number; onRun: (q: Drill[], i: number) => void }) {
  const cur = currentLevel(f, items, ds.keyOrder, start);
  const [open, setOpen] = useState<string>(cur.id);
  return (
    <div className="drill-levels">
      {f.levels.map((l) => {
        const done = levelDone(l, items, ds.keyOrder);
        const stars = levelStars(l, items, ds.keyOrder);
        return (
          <div key={l.id} className="drill-level-block">
            <button className={`drill-level ${done ? 'done' : ''} ${l.id === cur.id ? 'current' : ''}`} onClick={() => setOpen(open === l.id ? '' : l.id)} aria-expanded={open === l.id} data-level={l.id}>
              <span className="n">{l.level}</span>
              <span>
                {l.title[lang]}
                <LevelMeta l={l} lang={lang} />
              </span>
              {/* 0.64 (owner): five stars — 3 = three keys at the target tempo (done, the next level opens), 4 = half, 5 = all. */}
              <span className="lvl-stars" aria-label={lang === 'he' ? `${stars} מתוך 5 כוכבים` : `${stars} of 5 stars`} data-level-stars={stars}>
                {Array.from({ length: LEVEL_MAX_STARS }, (_, k) => (
                  <i key={k} className={k < stars ? 'won' : ''} />
                ))}
              </span>
            </button>
            {open === l.id && <LevelGrid lang={lang} ds={ds} level={l} items={items} onRun={onRun} />}
          </div>
        );
      })}
    </div>
  );
}

/** Bass levels (0.64): the level's tempo (start → target) and its exam / bagrut tags (B14), small and quiet. */
const GRADE_HE: Record<string, string> = { 'session: playback': 'מיומנויות סשן: חיקוי', 'session: improvising': 'מיומנויות סשן: אלתור', 'walking core': 'ליבת הווקינג', reading: 'קריאה', 'time & groove': 'זמן וגרוב', transcription: 'תמלול', 'pieces with a band': 'יצירות עם להקה', '2-chorus solo': 'סולו של שני סבבים', 'sight-read improvisation': 'אלתור מקריאה ראשונה', improvisation: 'אלתור', ballad: 'בלדה', blues: 'בלוז' };
function LevelMeta({ l, lang }: { l: LevelDef; lang: Lang }) {
  const g = l as GuitarLevelDef;
  if (!g.tempo && !g.exam?.length) return null;
  return (
    <small className="level-meta" dir="ltr" data-level-exam={g.exam?.map((e) => `${e.board} ${e.grade}`).join(', ') || undefined}>
      {g.tempo && <span className="lm-tempo">♩ {g.tempo[0]}→{g.tempo[1]}</span>}
      {g.exam?.map((e) => (
        <span key={`${e.board}${e.grade}`} className="lm-exam">
          {e.board === 'Bagrut' && lang === 'he' ? 'בגרות' : e.board} {lang === 'he' ? (GRADE_HE[e.grade] ?? e.grade) : e.grade}
        </span>
      ))}
    </small>
  );
}

/** A guitar / bass variant's short name: its title without the key, tempo or progression parts. */
export function variantName(d: Drill | undefined, lang: Lang): string {
  if (!d) return '';
  return d.title[lang].split(' · ')[0];
}

function LevelGrid({ lang, ds, level, items, onRun }: { lang: Lang; ds: DrillSettings; level: LevelDef; items: Record<string, ItemState>; onRun: (q: Drill[], i: number) => void }) {
  const tx = T[lang];
  const keys = levelKeys(level, ds.keyOrder);
  if (ds.instrument === 'drums') {
    // Drums: no keys — the level's variants (stickings, grooves, fills), one cell each, shaded by the tempo reached.
    const row = levelDrills(level, ds.keyOrder);
    return (
      <div className="drill-opts">
        <button className="btn primary" onClick={() => onRun(row, 0)} data-level-start={level.id}>
          ▶ {lang === 'he' ? 'כל הווריאציות' : 'All variations'}
        </button>
        <div className="heat drum-variants">
          {row.map((d, i) => {
            const st = items[d.itemId];
            const lvl = !st || st.cleanBpm <= 0 ? 0 : st.cleanBpm >= st.goalBpm * 0.95 ? 3 : st.cleanBpm >= st.goalBpm * 0.8 ? 2 : 1;
            return (
              <button key={d.itemId} className={`heat-cell l${lvl}`} onClick={() => onRun(row, i)} title={d.title[lang]} aria-label={`${d.title[lang]} ${st?.cleanBpm ? `♩${st.cleanBpm}` : ''}`} data-variant={i + 1}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="drill-opts">
      <button className="btn primary" onClick={() => onRun(levelDrills(level, ds.keyOrder), 0)} data-level-start={level.id}>
        ▶ {tx.allKeys}
      </button>
      <div className="heat">
        {level.specs.map((s, si) => {
          const row = specDrills(level, si, ds.keyOrder);
          // Guitar / bass rows are variants, not hands: a caption names each one (the key cells follow).
          const piano = (ds.instrument ?? 'piano') === 'piano';
          return (
            <div key={si} className="heat-row" style={{ ['--cols' as string]: piano ? keys.length : row.length }}>
              {!piano && <small className="heat-cap">{variantName(row[0], lang)}</small>}
              <span title={row[0]?.title[lang]}>{piano ? HANDS_TX[lang][s.hands] : si + 1}</span>
              {row.map((d, i) => {
                const st = items[d.itemId];
                const lvl = !st || st.cleanBpm <= 0 ? 0 : st.cleanBpm >= st.goalBpm * 0.95 ? 3 : st.cleanBpm >= st.goalBpm * 0.8 ? 2 : 1;
                return (
                  <button key={d.itemId} className={`heat-cell l${lvl}`} onClick={() => onRun(row, i)} aria-label={`${d.title[lang]} ${st?.cleanBpm ? `♩${st.cleanBpm}` : ''}`}>
                    {keyName(d.spec.key, !!d.spec.minor).replace('b', '♭').replace('#', '♯')}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DrillRun({ lang, ds, cal, queue, start, items, onTake, onEnd, headphones, onHeadphones, kit }: { lang: Lang; ds: DrillSettings; cal: DrillCalibration; queue: Drill[]; start: number; items: Record<string, ItemState>; onTake: DrillsProps['onTake']; onEnd: (takes: number, clean: number) => void; headphones?: boolean; onHeadphones?: (h: boolean) => void; kit?: Settings['drumKit'] }) {
  const [beat, setBeat] = useState(-1);
  const tx = T[lang];
  const [i, setI] = useState(start);
  const drill = queue[i];
  const local = useRef<Record<string, ItemState>>({});
  const stateOf = (d: Drill) => local.current[d.itemId] ?? items[d.itemId] ?? newItem(d);
  const [bpm, setBpm] = useState(() => (drill ? stateOf(drill).goalBpm : 60));
  const [res, setRes] = useState<{ m: TakeMetrics; lad: LadderResult } | null>(null);
  // Left hand comps, right hand improvises (chart drills): the free right hand checked against each chord's scale.
  const [rh, setRh] = useState<{ ok: number; total: number } | null>(null);
  const session = useRef(Date.now().toString(36));
  const count = useRef({ takes: 0, clean: 0 });
  const [take, setTake] = useState(0);
  const [writing, setWriting] = useState<{ m: TakeMetrics; p: PlayedNote[] } | null>(null);
  if (!drill)
    return (
      <section className="drill-result v-clean">
        <h2>{tx.keyDone}</h2>
        <button className="btn primary" onClick={() => onEnd(count.current.takes, count.current.clean)}>
          {tx.backToLevel}
        </button>
      </section>
    );
  const go = (j: number) => {
    setRes(null);
    if (j >= queue.length) return onEnd(count.current.takes, count.current.clean);
    setI(j);
    setBpm(stateOf(queue[j]).goalBpm);
    setTake((t) => t + 1);
  };
  const done = (m: TakeMetrics, played: PlayedNote[]) => {
    void recordTakeAnalysis(drill, m, bpm);
    if (drill.freeAbove !== undefined && drill.chart?.length) {
      const free = played.filter((p) => p.pitch >= drill.freeAbove!).map((p) => ({ start: p.on / 1000, end: (p.off ?? p.on + 200) / 1000, midi: p.pitch }));
      const r = checkRules(free, parseChart(drill.chart.join(' | '), drill.meter), drill.meter, bpm, { note: 'scale', interval: null, rhythm: null });
      setRh(r.checks[0] && r.checks[0].total ? { ok: r.checks[0].ok, total: r.checks[0].total } : null);
    } else setRh(null);
    // BASS_AUDIT A4: a take counts toward the level only at the item's goal / the level's target tempo, never a "Slower" one.
    const st0 = stateOf(drill);
    const lad = applyTake(st0, m, bpm, new Date().toISOString(), ds, { targetBpm: itemTargetBpm(drill), slower: bpm < (st0.goalBpm ?? 0) * 0.99 });
    local.current[drill.itemId] = lad.state;
    const n = count.current.takes++;
    if (m.verdict === 'clean') count.current.clean++;
    onTake(lad.state, drillEvents(drill, m, new Date().toISOString(), session.current, n), drillXp(m), takeInfo(drill, m));
    setRes({ m, lad });
    if (lad.next.action === 'next-key' || lad.next.action === 'next-drill') {
      // Continuous: move on right after showing the result briefly.
      const j = lad.next.action === 'next-key' ? i + 1 : queue.findIndex((d, k) => k > i && d.spec.kind !== drill.spec.kind);
      window.setTimeout(() => go(j < 0 ? queue.length : j), 1400);
    } else if (lad.next.action === 'raise' && ds.continuous === 'raise-tempo') {
      window.setTimeout(() => (setRes(null), setBpm(lad.next.bpm), setTake((t) => t + 1)), 1400);
    } else setBpm(lad.next.bpm);
  };
  return (
    <div className="drill-run" data-drill={drill.itemId}>
      <p className="drill-goal">
        {i + 1} / {queue.length} · <span dir="ltr">{drill.pulse === 8 ? '♪' : '♩'} {bpm}</span>
      </p>
      <DrillScore drill={drill} ds={ds} result={res?.m} beat={res ? -1 : beat} lang={lang} />
      {res && <MarkLegend lang={lang} />}
      {!res && !writing && <DrillTake key={`${drill.itemId}:${take}`} drill={drill} bpm={bpm} lang={lang} cal={cal} onDone={(m, p) => (setBeat(-1), drill.write || drill.drumWrite ? setWriting({ m, p }) : done(m, p))} onBeat={setBeat} drumsOk={headphones} onDrums={onHeadphones} kit={kit} />}
      {/* Ear L7: write the line after playing it; the written grade joins the take's verdict. */}
      {!res && writing && !drill.drumWrite && <TranscribeWrite drill={drill} lang={lang} onDone={(g) => (setWriting(null), done(withWritten(writing.m, g), writing.p))} />}
      {!res && writing && drill.drumWrite && <DrumWrite drill={drill} lang={lang} onDone={(g) => (setWriting(null), done(withDrumWrite(writing.m, g, drill), writing.p))} />}
      {res && (
        <>
          <p className="drill-ladder">{res.lad.message[lang]}</p>
          {rh && (
            <p className="drill-rh" data-rh-scale={rh.ok}>
              {lang === 'he' ? 'יד ימין בתוך הסולם של כל אקורד' : 'Right hand inside each chord’s scale'}: <b dir="ltr">{rh.ok}/{rh.total}</b>
            </p>
          )}
          <TakeResult
            m={res.m}
            lang={lang}
            onAgain={() => (setRes(null), setTake((t) => t + 1))}
            onSlower={() => (setRes(null), setBpm((b) => Math.max(30, Math.round(b * 0.9))), setTake((t) => t + 1))}
            onNext={() => go(i + 1)}
          />
        </>
      )}
    </div>
  );
}

function DrillSettingsView({ lang, ds, onChange, onCalib }: { lang: Lang; ds: DrillSettings; onChange: (p: Partial<DrillSettings>) => void; onCalib: () => void }) {
  const tx = T[lang];
  const seg = <K extends keyof DrillSettings>(key: K, opts: Record<string, string>) => (
    <div className="chips" role="radiogroup">
      {Object.entries(opts).map(([v, label]) => (
        <button key={v} role="radio" aria-checked={ds[key] === v} className={`chip ${ds[key] === v ? 'on' : ''}`} onClick={() => onChange({ [key]: v } as Partial<DrillSettings>)}>
          {label}
        </button>
      ))}
    </div>
  );
  const toggle = (key: 'showFingering' | 'inPath' | 'inWorkout', label: string) => (
    <label className="row">
      <input type="checkbox" checked={ds[key]} onChange={(e) => onChange({ [key]: e.target.checked })} /> {label}
    </label>
  );
  if (ds.instrument === 'drums')
    return (
      <div className="drill-opts card">
        <div className="row">
          <span>{lang === 'he' ? 'תצוגה' : 'Show'}</span>
          <div className="chips" role="radiogroup">
            {(['staff', 'lanes'] as const).map((v) => (
              <button key={v} role="radio" aria-checked={(ds.drumView ?? 'staff') === v} className={`chip ${(ds.drumView ?? 'staff') === v ? 'on' : ''}`} onClick={() => onChange({ drumView: v })} data-drum-view-pick={v}>
                {v === 'staff' ? (lang === 'he' ? 'תווים' : 'Notation') : lang === 'he' ? 'מסלולים' : 'Lanes'}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <span>{tx.cont}</span>
          {seg('continuous', { off: tx.conts.off, 'raise-tempo': tx.conts['raise-tempo'], 'next-drill': tx.conts['next-drill'] })}
        </div>
        {toggle('inPath', tx.inPath)}
        {toggle('inWorkout', tx.inWorkout)}
        <button className="btn ghost" onClick={onCalib} data-kit-open="1">
          {lang === 'he' ? 'המערכת: מיפוי, עוצמות, השהיה' : 'Kit: mapping, velocity, latency'}
        </button>
      </div>
    );
  return (
    <div className="drill-opts card">
      {toggle('showFingering', tx.fingering)}
      <div className="row">
        <span>{tx.order}</span>
        {seg('keyOrder', tx.orders)}
      </div>
      <div className="row">
        <span>{tx.cont}</span>
        {seg('continuous', tx.conts)}
      </div>
      {ds.continuous !== 'off' && (
        <label className="row">
          <span>{tx.contAcc}</span>
          <input type="range" min={80} max={100} value={Math.round(ds.continuousAccuracy * 100)} onChange={(e) => onChange({ continuousAccuracy: Number(e.target.value) / 100 })} />
          <b dir="ltr">{Math.round(ds.continuousAccuracy * 100)}%</b>
        </label>
      )}
      {(ds.instrument ?? 'piano') === 'piano' ? (
        <div className="row">
          <span>{tx.emphasis}</span>
          {seg('emphasis', tx.emph)}
        </div>
      ) : (
        <>
          {ds.instrument === 'bass' && (
            // BASS_NICHE_PLAN: the jazz and prog families open by the player's track.
            <div className="row" data-bass-track="1">
              <span>{lang === 'he' ? 'מסלול' : 'Track'}</span>
              <div className="chips" role="radiogroup">
                {(['both', 'jazz', 'prog'] as const).map((v) => (
                  <button key={v} role="radio" aria-checked={(ds.bassTrack ?? 'both') === v} className={`chip ${(ds.bassTrack ?? 'both') === v ? 'on' : ''}`} onClick={() => onChange({ bassTrack: v })} data-bass-track-pick={v}>
                    {v === 'both' ? (lang === 'he' ? 'שניהם' : 'Both') : v === 'jazz' ? (lang === 'he' ? 'ג׳אז' : 'Jazz') : lang === 'he' ? 'פרוג' : 'Prog'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="row">
            <span>{tx.gStyle}</span>
            {seg('guitarStyle', tx.gStyles)}
          </div>
          <div className="row">
            <span>{tx.gView}</span>
            {seg('guitarView', tx.gViews)}
          </div>
          <label className="row">
            <input type="checkbox" checked={!!ds.showPicking} onChange={(e) => onChange({ showPicking: e.target.checked })} /> {tx.picking}
          </label>
        </>
      )}
      {ds.instrument === 'piano' && (
        // 0.67 (owner): a keyboard without MIDI — hide the levels the microphone can't measure.
        <label className="row" data-piano-mic-only="1">
          <input type="checkbox" checked={!!ds.pianoMicOnly} onChange={(e) => onChange({ pianoMicOnly: e.target.checked })} />{' '}
          {lang === 'he' ? 'מיקרופון בלבד (בלי MIDI): להסתיר שלבים שצריכים MIDI' : 'Microphone only (no MIDI): hide levels that need MIDI'}
        </label>
      )}
      {toggle('inPath', tx.inPath)}
      {toggle('inWorkout', tx.inWorkout)}
      <button className="btn ghost" onClick={onCalib}>
        {tx.calib}
      </button>
    </div>
  );
}

function Calibration({ lang, cal, onSave }: { lang: Lang; cal: DrillCalibration; onSave: (c: DrillCalibration) => void }) {
  const tx = T[lang];
  const [c, setC] = useState(cal);
  const [listen, setListen] = useState<'min' | 'max' | null>(null);
  const off = useRef<(() => void) | null>(null);
  const capture = (which: 'min' | 'max') => {
    off.current?.();
    setListen(which);
    off.current = midi.onNote((_m, on, _at, vel) => {
      if (!on) return;
      setC((x) => (which === 'min' ? { ...x, velMin: vel } : { ...x, velMax: vel }));
      setListen(null);
      off.current?.();
      off.current = null;
    });
  };
  return (
    <div className="drill-opts card">
      <div className="row">
        <span>{tx.range}</span>
        <b dir="ltr">
          {c.velMin} – {c.velMax}
        </b>
      </div>
      <div className="row">
        <button className={`btn ${listen === 'min' ? 'primary' : ''}`} onClick={() => capture('min')}>
          {tx.softest}
        </button>
        <button className={`btn ${listen === 'max' ? 'primary' : ''}`} onClick={() => capture('max')}>
          {tx.loudest}
        </button>
      </div>
      <button className="btn primary" onClick={() => (off.current?.(), onSave({ ...c, velMax: Math.max(c.velMax, c.velMin + 10) }))}>
        {tx.save}
      </button>
    </div>
  );
}

/** B6: what a bass placement take measured, for the decision rules (bassProbes.ts). Only measured values — no self-report. */
function bassMeasure(slot: NonNullable<ReturnType<typeof probeSlot>>, drill: Drill, m: TakeMetrics, played: PlayedNote[], bpm: number): BassProbeResult {
  const g = (m as TakeMetrics & { guitar?: { bass?: { kick?: { lock: number } | null; asym?: { ms: number } | null } } }).guitar?.bass;
  const out: BassProbeResult = { verdict: m.verdict };
  if (slot === 'lowest') {
    const ps = played.map((x) => x.pitch).filter((x) => x >= 18 && x <= 40).sort((a, b) => a - b);
    if (ps.length) out.lowest = ps[Math.floor(ps.length / 2)];
  }
  if (slot === 'pocket' && g?.kick) out.lock = g.kick.lock;
  if (slot === 'pluck' && g?.asym) out.asymMs = g.asym.ms;
  if (slot === 'ear') out.acc = m.accuracy;
  const rules = drill.goal.bass?.rules;
  if (slot === 'walk' && rules) {
    // The walking-rule report on what was played: one note per beat, the one nearest each beat. The chart's tones are
    // intervals (N2): walkProbeReport reads them as they are.
    const beats = rules.chart.reduce((a, c) => a + c.beats, 0);
    const half = 30000 / bpm;
    const line = Array.from({ length: beats }, (_, b) => {
      const t = expTimeMs(drill, b, bpm);
      const near = played.filter((x) => Math.abs(x.on - t) < half).sort((x, y) => Math.abs(x.on - t) - Math.abs(y.on - t))[0];
      return near ? near.pitch : -100;
    });
    Object.assign(out, walkProbeReport(rules.chart, line));
  }
  return out;
}

/** Technique section of Find my level (spec AI §13): a tempo staircase on a few probe drills → start level per family. */
function TechLevelTest({ lang, ds, cal, items, onTake, onDone, midiOctave, onOctave, onBassTuning, kit }: { lang: Lang; ds: DrillSettings; cal: DrillCalibration; items: Record<string, ItemState>; onTake: DrillsProps['onTake']; onDone: (start: Partial<Record<FamilyId, number>> | null) => void; midiOctave: number; onOctave: (o: number) => void; onBassTuning?: (t: string) => void; kit?: Settings['drumKit'] }) {
  const tx = T[lang];
  const inst = ds.instrument ?? 'piano';
  // Drums (DRUMS_CURRICULUM §5): the adaptive probe — single takes, a staircase for the hands; a failed easy step
  // skips the harder ones of its family. Mic mode (a practice pad) runs the single-surface steps.
  const drumMic = inst === 'drums' && (!!kit?.mic || !midi.devices.length);
  // An acoustic kit by microphone also runs the groove steps its microphone can measure.
  const drumAcoustic = drumMic && kitKind(kit) === 'acoustic';
  const drumRes = useRef<Partial<Record<DrumSlot, DrumProbeResult>>>({});
  // Bass (B6, 0.64): measured tasks with the doc's decision rules (bassProbes.ts), some a single take.
  const bassRes = useRef<Partial<Record<NonNullable<ReturnType<typeof probeSlot>>, BassProbeResult>>>({});
  const probes = useMemo(() => {
    if (inst === 'drums') return drumProbes(drumMic, drumAcoustic).map((p) => ({ id: p.slot as string, drill: generate(p.spec), seeds: [] as FamilyId[], once: p.mode === 'once', slot: null }));
    if (inst === 'bass') return BASS_PROBES.map((p) => ({ id: p.family, drill: generate(p.spec), seeds: p.seeds ?? [], once: p.mode === 'once', slot: probeSlot(p) }));
    if (inst !== 'piano') return GUITAR_PROBES.filter((p) => (p.instruments as string[]).includes(inst)).map((p) => ({ id: p.family, drill: generate(p.spec), seeds: p.seeds ?? [], once: false, slot: null }));
    // PIANO_JAZZ: a jazz player is also probed on a bebop line over ii–V–I (its tempo places the bebop lines).
    const fams: FamilyId[] = ds.emphasis === 'jazz' ? ['scales', 'harris', 'k-bebop'] : ds.emphasis === 'classical' ? ['scales', 'fingers'] : ['scales', 'fingers', 'harris'];
    const tempo = fams.map((id) => {
      const f = shownFamilies({ emphasis: 'both' }).find((x) => x.id === id)!;
      return { id: id as string, drill: specDrills(f.levels[0], 0, ds.keyOrder).find((d) => d.spec.key === 0) ?? specDrills(f.levels[0], 0, ds.keyOrder)[0], seeds: [] as FamilyId[], once: false, slot: null };
    });
    // PIANO_AUDIT I5: the pianist's ear is probed too — one take of three notes played back (ear L2); clean places it at L3.
    return [...tempo, { id: 'k-ear', drill: generate(KEYS_EAR_PROBE), seeds: [] as FamilyId[], once: true, slot: null }];
  }, [ds.emphasis, ds.keyOrder, inst, drumMic, drumAcoustic]);
  const [p, setP] = useState(0);
  const [bpm, setBpm] = useState(() => probes[0].drill.startBpm);
  const [best, setBest] = useState<Record<string, number>>({});
  const [tries, setTries] = useState(0);
  const [take, setTake] = useState(0);
  const [last, setLast] = useState<TakeMetrics | null>(null);
  const [started, setStarted] = useState(false);
  const session = useRef(`t${Date.now().toString(36)}`);
  const n = useRef(0);
  const finish = (b: Record<string, number>) => {
    const start: Partial<Record<FamilyId, number>> = {};
    if (inst === 'drums') {
      const r = { ...drumRes.current };
      if (b.hands) r.hands = { ...(r.hands ?? { verdict: 'clean' }), best: b.hands };
      return onDone(placeDrums(r, familiesOf('drums').map((f) => ({ id: f.id, levels: f.levels.length }))));
    }
    if (inst === 'bass') {
      const fams = familiesOf('bass').map((f) => ({ id: f.id, levels: f.levels.length }));
      const r = { ...bassRes.current };
      for (const s of ['scale', 'pluck'] as const) if (r[s] || b[s]) r[s] = { ...(r[s] ?? {}), best: b[s] ?? 0 };
      const placed = placeBass(r, fams);
      if (placed.tuning && onBassTuning) onBassTuning(placed.tuning);
      return onDone(placed.start);
    }
    if (inst !== 'piano') {
      // Guitar / bass: each probed family from its staircase; the rest one below the mean of the probed ones.
      const lv: Record<string, number> = {};
      for (const pr of probes) lv[pr.id] = b[pr.id] ? Math.max(1, tempoBandOf(pr.drill, b[pr.id]) - 1) : 1;
      const vals = Object.values(lv);
      // Bass (BASS_CURRICULUM §6): a probe also places the families it seeds.
      for (const pr of probes) for (const sd of pr.seeds) if (lv[sd] === undefined) lv[sd] = lv[pr.id];
      const meanLv = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 1;
      for (const fam of familiesOf(inst)) start[fam.id] = Math.max(1, Math.min(fam.levels.length, Math.round(lv[fam.id] ?? meanLv - 1)));
      return onDone(start);
    }
    const lvl = (id: FamilyId) => {
      const pr = probes.find((x) => x.id === id);
      if (!pr || !b[id]) return 1;
      return Math.max(1, tempoBandOf(pr.drill, b[id]) - 1);
    };
    const fams = shownFamilies({ emphasis: 'both' });
    const cap = (id: FamilyId, v: number) => Math.max(1, Math.min(fams.find((f) => f.id === id)?.levels.length ?? 1, Math.round(v)));
    const sc = lvl('scales');
    const fi = probes.some((x) => x.id === 'fingers') ? lvl('fingers') : sc;
    const ha = probes.some((x) => x.id === 'harris') ? lvl('harris') : Math.max(1, sc - 1);
    start.scales = cap('scales', sc);
    start.arpeggios = cap('arpeggios', sc - 1);
    start.control = cap('control', sc - 1);
    start.cadences = cap('cadences', sc - 1);
    start.fingers = cap('fingers', fi);
    start.advanced = cap('advanced', fi - 2);
    start.harris = cap('harris', ha);
    start.jazz = cap('jazz', ha - 1);
    start.voicings = cap('voicings', ha - 1);
    start.accomp = cap('accomp', ha - 1);
    start['k-ear'] = cap('k-ear', b['k-ear'] ? 3 : 1);
    // PIANO_JAZZ: the jazz-piano families from the Harris probe (and the bebop line, when a jazz player played it).
    start['k-sixdim'] = cap('k-sixdim', ha - 3);
    start['k-reharm'] = cap('k-reharm', ha - 3);
    start['k-bebop'] = cap('k-bebop', probes.some((x) => x.id === 'k-bebop') ? lvl('k-bebop') : ha - 2);
    onDone(start);
  };
  const failAt = useRef<number | null>(null);
  const bisected = useRef(false);
  const nextProbe = (b: Record<string, number>) => {
    failAt.current = null;
    bisected.current = false;
    // Drums: hands never clean → skip the doubles and the paradiddle (harder steps of the same families).
    let q = p + 1;
    // Groove reach (funk, shuffle) only after the basic groove was clean or almost.
    const skip = (id: string) => (!b.hands && (id === 'doubles' || id === 'diddle')) || (GROOVE_REACH.includes(id as DrumSlot) && (drumRes.current.groove?.verdict ?? 'not') === 'not');
    while (inst === 'drums' && q < probes.length && skip(probes[q].id)) q++;
    if (q >= probes.length) return finish(b);
    setP(q);
    setBpm(probes[q].drill.startBpm);
    setTries(0);
    setLast(null);
    setTake((t) => t + 1);
  };
  if (!started)
    return (
      <div className="drill-opts card">
        <p>{tx.testIntro}</p>
        <div className="drill-actions">
          <button className="btn primary" onClick={() => setStarted(true)} data-test-start="1">
            ▶ {tx.start}
          </button>
          <button className="btn ghost" onClick={() => onDone(null)}>
            {tx.skip}
          </button>
        </div>
      </div>
    );
  const pr = probes[p];
  const done = (m: TakeMetrics, played: PlayedNote[] = []) => {
    if (inst === 'drums') {
      const sds = (m.drum?.limbs ?? []).map((l) => l.sd).filter((x): x is number => x !== null);
      const prev = drumRes.current[pr.id as DrumSlot];
      // A staircase keeps its best verdict; single takes their one.
      if (!prev || m.verdict === 'clean' || prev.verdict !== 'clean') drumRes.current[pr.id as DrumSlot] = { verdict: m.verdict, sd: sds.length ? Math.max(...sds) : null, kit: pr.id === 'read' && !drumMic };
    }
    if (inst === 'bass' && pr.slot) bassRes.current[pr.slot] = { ...(bassRes.current[pr.slot] ?? {}), ...bassMeasure(pr.slot, pr.drill, m, played, bpm) };
    const st = items[pr.drill.itemId] ?? newItem(pr.drill);
    const lad = applyTake(st, m, bpm, new Date().toISOString(), ds, { targetBpm: itemTargetBpm(pr.drill) });
    onTake(lad.state, drillEvents(pr.drill, m, new Date().toISOString(), session.current, n.current++), drillXp(m), takeInfo(pr.drill, m));
    setLast(m);
    const t = tries + 1;
    setTries(t);
    // Accelerating staircase (SPEC-PLACEMENT §7): +15 %, +30 %, +60 % while clean; one bisect take after the first
    // miss; at most 4 takes per family. A first miss at the start tempo steps down once instead.
    const clean = m.verdict === 'clean';
    const key = pr.slot ?? pr.id;
    const b = clean ? { ...best, [key]: Math.max(best[key] ?? 0, bpm) } : best;
    if (clean) setBest(b);
    if (t >= 4 || pr.once) return nextProbe(b);
    const hi = clean ? null : bpm;
    if (clean && !failAt.current) {
      setBpm(Math.round(bpm * [1.15, 1.3, 1.6][Math.min(2, t - 1)]));
    } else if (!clean && !b[key]) {
      if (bpm <= 44 || failAt.current) return nextProbe(b);
      failAt.current = bpm;
      setBpm(Math.max(40, Math.round(bpm * 0.75)));
    } else {
      // Bisect once between the best clean tempo and the first miss, then stop.
      if (hi) failAt.current = hi;
      const lo = b[key] ?? bpm;
      if (bisected.current) return nextProbe(b);
      bisected.current = true;
      setBpm(Math.round((lo + (failAt.current ?? lo * 1.15)) / 2));
    }
    setTake((x) => x + 1);
  };
  return (
    <div className="drill-run" data-test-probe={pr.id}>
      <p className="drill-goal">
        {p + 1} / {probes.length} · {pr.drill.title[lang]} · <span dir="ltr">♩ {bpm}</span>
        {best[pr.slot ?? pr.id] ? (
          <>
            {' '}
            · {tx.bestTempo} <span dir="ltr">♩ {best[pr.slot ?? pr.id]}</span>
          </>
        ) : null}
      </p>
      {last && <p className="drill-why">{last.why[lang]}</p>}
      {last?.octaveShift !== undefined && <OctaveFix lang={lang} shift={last.octaveShift} current={midiOctave} onFix={onOctave} />}
      <DrillScore drill={pr.drill} ds={ds} result={last} />
      {last && <MarkLegend lang={lang} />}
      <DrillTake key={`${pr.slot ?? pr.id}:${take}`} drill={pr.drill} bpm={bpm} lang={lang} cal={cal} kit={kit} onDone={(m, played) => done(m, played)} />
      <button className="btn ghost" onClick={() => nextProbe(best)}>
        {tx.skip}
      </button>
    </div>
  );
}

/** The keyboard plays an octave off (small MIDI keyboards): one tap shifts it the right way (Settings → MIDI → octave). */
function OctaveFix({ lang, shift, current, onFix }: { lang: Lang; shift: number; current: number; onFix: (o: number) => void }) {
  const [done, setDone] = useState(false);
  const next = Math.max(-2, Math.min(2, current - Math.round(shift / 12)));
  if (done) return <p className="field-hint">{lang === 'he' ? 'המקלדת הוזזה — נסו שוב.' : 'Keyboard shifted — try again.'}</p>;
  return (
    <button className="btn primary small octave-fix" onClick={() => (onFix(next), setDone(true))} data-octave-fix={next}>
      {lang === 'he' ? `להזיז את המקלדת אוקטבה ${shift < 0 ? 'למעלה' : 'למטה'}` : `Shift my keyboard an octave ${shift < 0 ? 'up' : 'down'}`}
    </button>
  );
}

/** The songbook: each public-domain song with its playable parts for the player's instrument. */
function SongList({ lang, ds, onRun, known, onKnown }: { lang: Lang; ds: DrillSettings; onRun: (q: Drill[]) => void; known?: string[]; onKnown?: (k: string[]) => void }) {
  // Songs are melody / chords: drums have none (the drums course has no Songs row).
  const inst = ds.instrument === 'drums' ? 'piano' : (ds.instrument ?? 'piano');
  const parts = inst === 'piano' ? (['melody', 'chords', 'both'] as const) : inst === 'bass' ? (['melody'] as const) : (['melody', 'chords'] as const);
  // Songbook by the chords you know (0.53): pick your chords; each song shows the key that fits them, or the one new chord.
  const he = lang === 'he';
  const [pick, setPick] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const kn = new Set(known ?? []);
  const pool = COMMON_CHORDS[inst === 'guitar' || inst === 'bass' ? 'guitar' : 'piano'];
  const fits = SONGBOOK.map((sg) => ({ sg, fit: kn.size ? songFit(sg, kn) : null }));
  const shown = onlyMine && kn.size ? fits.filter((x) => x.fit?.kind === 'playable') : fits;
  return (
    <>
      {onKnown && (
        <div className="known-chords" data-known-chords="1">
          <div className="kc-row">
            <button className="btn ghost small" onClick={() => setPick(!pick)} aria-expanded={pick}>
              {he ? 'האקורדים שאני מכיר' : 'Chords I know'}
              {kn.size ? ` (${kn.size})` : ''}
            </button>
            {kn.size > 0 && (
              <label className="toggle-row">
                <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} data-only-mine="1" />
                <span>{he ? 'רק שירים שאני יכול לנגן' : 'Only songs I can play'}</span>
              </label>
            )}
          </div>
          {pick && (
            <div className="chips kc-chips" dir="ltr">
              {pool.map((c) => (
                <button key={c} className={`chip ${kn.has(c) ? 'on' : ''}`} aria-pressed={kn.has(c)} onClick={() => onKnown(kn.has(c) ? [...kn].filter((x) => x !== c) : [...kn, c])} data-known={c}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <ul className="song-drills">
        {shown.map(({ sg, fit }) => {
          const song = fit && fit.kind !== 'far' ? { ...sg, key: fit.key } : sg;
          return (
            <li key={sg.id}>
              <span className="sd-title">
                <b>{sg.title[lang]}</b>
                <small>
                  {sg.credit}
                  {fit?.kind === 'playable' && <span className="kc-fit ok"> · {he ? 'ניתן לנגן ב' : 'playable in '}{songKeyName(fit.key, !!sg.minor)}</span>}
                  {fit?.kind === 'one-new' && (
                    <span className="kc-fit new">
                      {' · '}
                      {he ? 'אקורד חדש אחד:' : 'one new chord:'} {fit.missing[0]} ({songKeyName(fit.key, !!sg.minor)})
                    </span>
                  )}
                </small>
              </span>
              <span className="sd-parts">
                {parts.map((p) => (
                  <button key={p} className="chip" data-song={sg.id} data-part={p} onClick={() => onRun([songDrill(song, p, inst)])}>
                    {PART_NAME[p][lang]}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
