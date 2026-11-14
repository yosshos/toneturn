// Technique drills (spec AI): the hub (today's items, families, the technique map), a family's levels with the
// 12-key heat map, the run loop with the tempo ladder, drills settings, calibration and the drill creator.

import { SONGBOOK } from '../content/songbook';
import { COMMON_CHORDS, keyName as songKeyName, songFit } from '../engine/songChords';
import { recordTakeAnalysis } from '../storage/analysis';
import { refreshProfile } from '../storage/profile';
import { BACK_TO_RUBATO, hasRubato, QUARTERS_BPM, quartersDrill, RUBATO_CLEAN, rubatoStage, skipRubato, withStageTake, type RubatoStage } from '../engine/drills/rubato';
import { RubatoTake } from './RubatoTake';
const RUBATO_OFF = typeof navigator !== 'undefined' && navigator.webdriver && !new URLSearchParams(typeof location !== 'undefined' ? location.search : '').has('rubato');
import { levelRecord } from '../engine/drumRecords';
import { checkRules } from '../engine/improvRules';
import { parseChart } from '../engine/charts';
import { PART_NAME, songDrill } from '../engine/drills/songDrills';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { generate } from '../engine/drills/generate';
import { advance, mergePlaces, strandsFor, recordTake, startState, strandPlaces, testStart, type StrandState } from '../engine/drills/levelTest';
import { micUnmeasurable } from '../engine/drills/analyze';
import { type GuitarLevelDef } from '../engine/drills/guitar';
import { guitarAddOnsOf } from '../engine/drills/guitarMeta';
import { GuitarAddOnPicker } from './GuitarAddOns';
import { FAMILY_LESSON } from '../content/mini/guitar';
import { MINI_LESSONS } from '../content/minilessons';
import { MiniLessonPlayer } from './MiniLesson';
import { STRINGS } from '../i18n/strings';
import { isGuitarDrill } from '../engine/drills/events';
import { drillEvents, drillXp } from '../engine/drills/events';
import { ChartView, DrillStaff, DrillTab, DrillTake, EarCard, MarkLegend, TakeResult } from './DrillTake';
// Voice leading (AUDIT-CONTENT-THEORY §ה.2): the chord symbols + first voicing, the voices as lanes, the stage lessons.
import { VoiceLeadLessons, VoiceLeadScore } from './VoiceLeadScore';
import { RoadMapStrip } from './RoadMap';
import { TranscribeWrite } from './BassWrite';
import { DrumWrite } from './DrumWrite';
import { withDrumWrite } from '../engine/drills/drumEar';
import { withWritten } from '../engine/drills/bassEar';
import { midi } from '../speech/midi';
import { inputLatency } from '../engine/latency';
import { LatencyCalibrate } from './LatencyCalibrate';
import { DrumSongCard } from './DrumSongCard';
import { DrumScore, KitCard, KitSetup } from './DrumViews';
import { drumMicOf, type KitKind } from '../engine/drumKit';
import { isDrumDrill } from '../engine/drills/events';
import { standardIdOfSpec, standardOfSpec } from '../engine/drills/standardRef';
import { ListenOriginal } from './ListenOriginal';
import { referenceOf } from '../content/references';

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
    test: 'Find my playing level', testIntro: 'Short takes, one per step: a clean take gets one faster try, a miss simply moves on to the next step. This sets where every drill family starts and at what tempo.', testDone: 'Your technique level is set', skip: 'Skip', bestTempo: 'Clean up to',
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
    test: 'בדיקת רמה בנגינה', testIntro: 'נגינות קצרות, אחת לכל שלב: נגינה נקייה מקבלת עוד ניסיון אחד מהיר יותר, וטעות פשוט עוברת לשלב הבא. כך נקבע מאיפה כל משפחת תרגילים מתחילה ובאיזה טמפו.', testDone: 'רמת הטכניקה שלך נקבעה', skip: 'דילוג', bestTempo: 'נקי עד',
  },
};

const takeInfo = (d: Drill, m: TakeMetrics) => {
  const cvs = [m.cvR, m.cvL].filter((x): x is number => x !== null);
  return { verdict: m.verdict, hands: d.spec.hands, cv: cvs.length ? Math.max(...cvs) : null };
};
export const DEFAULT_CAL: DrillCalibration = { latencyMs: 0, velMin: 20, velMax: 120 };
/** The drill calibration with the input's calibrated delay (MIDI when a keyboard is connected, else the microphone). */
const calOf = (s: Settings): DrillCalibration => ({ ...DEFAULT_CAL, ...(s.drillCal ?? {}), latencyMs: inputLatency(s, midi.devices.length ? 'midi' : 'mic') });
const FAM_HUE: Partial<Record<FamilyId, string>> = { scales: 'var(--mint)', arpeggios: '#7c8cff', cadences: '#c38cff', fingers: 'var(--gold)', control: '#ff8a5c', advanced: '#ff6b9a', harris: '#5cd6ff', jazz: '#5cffb0', voicings: '#ffd15c', accomp: '#b0ff5c', 'k-ear': '#8fb8ff', 'k-sixdim': '#5cc2ff', 'k-bebop': '#4fe0a0', 'k-reharm': '#ffc04d', 'k-theory': '#c9a0ff', custom: '#e0e0ff', 'k-vl': '#9fd0ff' };
const HANDS_TX: Record<Lang, Record<string, string>> = { en: { R: 'RH', L: 'LH', RL: 'HT' }, he: { R: 'ימין', L: 'שמאל', RL: 'ביחד' } };

/** Drill settings with the instrument defaulting to the player's (guitar / bass players get guitar drills). */
export function drillSettingsOf(s: Pick<Settings, 'drills' | 'instrument'> & { activeCourse?: Settings['activeCourse']; courses?: Settings['courses'] }): DrillSettings {
  const inst = s.instrument === 'guitar' ? 'guitar' : s.instrument === 'bass' ? 'bass' : 'piano';
  // 0.64: an instrument course decides the technique instrument (keys → piano, guitar, bass), however the course was reached.
  const byCourse: DrillSettings['instrument'] | null = s.activeCourse === 'keys' ? 'piano' : s.activeCourse === 'guitar' ? 'guitar' : s.activeCourse === 'bass' ? 'bass' : s.activeCourse === 'drums' ? 'drums' : null;
  const out0: DrillSettings = { ...DEFAULT_DRILL_SETTINGS, instrument: inst as DrillSettings['instrument'], ...(s.drills ?? {}) };
  // GUITAR_DEEPENING §5 (owner 2026-11-11): the guitar add-ons, migrated from the old single style when never set
  // (jazz pre-ticked for a player who also takes the Jazz course).
  const out: DrillSettings = { ...out0, guitarAddOns: guitarAddOnsOf(out0, s.courses) };
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
  // PIANO_JAZZ P2: trading fours — after the result, a model line for your bars on request (it replaces the landings
  // staff, so the card still fits one screen).
  const tradeModel = !isGuitarDrill(drill) && result ? drill.goal.free?.model : undefined;
  if (tradeModel?.length)
    return (
      <>
        {model ? <DrillStaff drill={{ ...drill, notes: tradeModel.map((n) => ({ pitch: n.pitch, beat: n.beat, dur: n.dur, hand: 'R' as const })) }} /> : <DrillStaff drill={drill} fingering={ds.showFingering} result={result} />}
        <button className="link model-toggle" onClick={() => setModel(!model)} aria-pressed={model} data-model-line={model ? 'on' : 'off'}>
          {model ? (lang === 'he' ? 'בחזרה לנחיתות שלכם' : 'Back to your landings') : lang === 'he' ? 'להציג קו לדוגמה' : 'Show a model line'}
        </button>
      </>
    );
  if (!isGuitarDrill(drill) && drill.goal.vl) return <VoiceLeadScore drill={drill} result={result} beat={beat} lang={lang} />;
  if (!isGuitarDrill(drill)) return <DrillStaff drill={drill} fingering={ds.showFingering} result={result} beat={beat} />;
  if (drill.show === 'none' && !result) return <EarCard drill={drill} beat={beat} lang={lang} />;
  const view = drill.show === 'staff' ? 'staff' : (ds.guitarView ?? 'tab');
  // The guitar trade (g-impro 7), like the piano's: after the result, a model line for your bars on request — in the
  // player's view (tab and / or staff), in place of the landings, so the card still fits one screen.
  const guitarModel = result ? drill.goal.free?.model : undefined;
  if (guitarModel?.length) {
    const md: Drill = { ...drill, notes: guitarModel.map((n) => ({ pitch: n.pitch, beat: n.beat, dur: n.dur, hand: 'R' as const, ...(n.string ? { string: n.string, fret: n.fret ?? 0 } : {}) })) };
    return (
      <>
        {model ? (
          <>
            {view !== 'staff' && <DrillTab drill={md} />}
            {view !== 'tab' && <DrillStaff drill={md} />}
          </>
        ) : (
          <>
            {view !== 'staff' && <DrillTab drill={drill} fingering={ds.showFingering} picking={!!ds.showPicking} result={result} />}
            {view !== 'tab' && <DrillStaff drill={drill} result={result} />}
          </>
        )}
        <button className="link model-toggle" onClick={() => setModel(!model)} aria-pressed={model} data-model-line={model ? 'on' : 'off'}>
          {model ? (lang === 'he' ? 'בחזרה לנחיתות שלכם' : 'Back to your landings') : lang === 'he' ? 'להציג קו לדוגמה' : 'Show a model line'}
        </button>
      </>
    );
  }
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
  /** The item the run is on now (DrillRun reports it), for the header; reset with every new run. */
  const [runIdx, setRunIdx] = useState<number | null>(null);
  useEffect(() => setRunIdx(null), [view]);
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
        {head(runQueue[runIdx ?? view.i]?.title[lang] ?? view.queue[view.i]?.title[lang] ?? tx.title, () => (queue?.length ? onBack() : setView(view.from)))}
        <DrillRun
          onIndex={setRunIdx}
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
          bassTuning={bassTuning}
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
        <FamilyLesson family={view.f.id} settings={settings} />
        <VoiceLeadLessons family={view.f.id} settings={settings} />
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
      onAddOns={(v) => setDs({ guitarAddOns: v })}
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
  harris: 'styles', jazz: 'styles', 'k-sixdim': 'styles', 'k-bebop': 'styles', 'k-reharm': 'styles', 'k-theory': 'styles', 'g-lead': 'styles', 'g-flamenco': 'styles', 'g-jazz': 'styles', 'g-impro': 'styles',
  // Bass course (unlisted b-* families fall under hands: pluck, fret, length, legato, pick, slap). B17 (0.64): time and
  // pocket are their own topic, reading has one, the bass ear one, and the upright track is grouped on its own.
  'b-scale': 'scales', 'b-read': 'reading', 'b-posread': 'reading', 'b-impro': 'styles', 'b-swing': 'time', 'b-odd': 'time', 'b-poly': 'time', 'b-prog': 'styles', 'b-barry': 'styles', 'b-jform': 'styles', 'b-latin': 'styles', 'b-std': 'chords', 'b-chord': 'chords', 'b-walk': 'chords', 'b-time': 'time', 'b-pocket': 'time', 'b-ghost': 'styles', 'b-styles': 'styles', 'b-ear': 'ear',
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
  // AUDIT-CONTENT-THEORY §ז.2: the first steps at the piano are hand technique.
  'k-first': 'hands',
  // GUITAR_DEEPENING: the guitarist's ear has the ear topic; Barry Harris and prog / fusion are styles.
  'g-ear': 'ear', 'g-harris': 'styles', 'g-theory': 'styles', 'g-prog': 'styles',
  'k-vl': 'chords', 'g-vl': 'chords',
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

function Hub({ lang, ds, settings, items, head, onFamily, onRun, onSettings, onCreate, onTest, onInstrument, onVoice, onKit, onKitSave, onAddOns }: { onAddOns?: (v: NonNullable<DrillSettings['guitarAddOns']>) => void; onKit?: (start?: KitKind) => void; onKitSave?: (k: NonNullable<Settings['drumKit']>) => void; onVoice?: () => void; lang: Lang; ds: DrillSettings; settings: Settings; items: Record<string, ItemState>; head: React.ReactNode; onFamily: (f: FamilyDef) => void; onRun: (q: Drill[]) => void; onSettings: () => void; onCreate: (edit?: CustomDrill) => void; onTest: () => void; onInstrument: (i: 'piano' | 'guitar' | 'bass' | 'drums') => void }) {
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
      {/* GUITAR_DEEPENING §5: the start of the guitar course — choose the add-ons once (they stay in the settings). */}
      {ds.instrument === 'guitar' && settings.drills?.guitarAddOns === undefined && onAddOns && (
        <div className="card g-addons-first" data-guitar-addons-first="1">
          <GuitarAddOnPicker value={guitarAddOnsOf(ds)} onChange={onAddOns} lang={lang} />
          <button className="btn" onClick={() => onAddOns(guitarAddOnsOf(ds))} data-addons-done="1">
            {lang === 'he' ? 'שמירה' : 'Save'}
          </button>
        </div>
      )}
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

/** GUITAR_DEEPENING: the quick lesson behind a new guitar family (ear, comping, Barry Harris, prog), opened on demand. */
function FamilyLesson({ family, settings }: { family: string; settings: Settings }) {
  const [open, setOpen] = useState(false);
  const id = FAMILY_LESSON[family];
  const lesson = id ? MINI_LESSONS[id] : undefined;
  if (!lesson) return null;
  const lang = settings.uiLang;
  return (
    <>
      <button className="btn ghost family-lesson" onClick={() => setOpen(true)} data-family-lesson={lesson.id}>
        {lang === 'he' ? 'שיעור קצר' : 'Quick lesson'}: {lesson.title[lang]}
      </button>
      {open && <MiniLessonPlayer t={STRINGS[lang]} settings={settings} lesson={lesson} name={null} onFinish={() => setOpen(false)} />}
    </>
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
      {g.tempo && <span className="lm-tempo">{g.sub?.startsWith('♪') ? '♪' : '♩'} {g.tempo[0]}→{g.tempo[1]}</span>}
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
    // The personal speed record (DRUMS_NICHE_PLAN): the level's fastest clean take, against its tempo.
    const rec = levelRecord(row, items, itemTargetBpm);
    return (
      <div className="drill-opts">
        <button className="btn primary" onClick={() => onRun(row, 0)} data-level-start={level.id}>
          ▶ {lang === 'he' ? 'כל הווריאציות' : 'All variations'}
        </button>
        <small className="field-hint drum-record" data-drum-record={rec?.bpm ?? 0}>
          {rec ? (
            <>
              {lang === 'he' ? 'שיא אישי' : 'Personal record'} <bdi dir="ltr">♩{rec.bpm}</bdi>
              {lang === 'he' ? ` · וריאציה ${rec.variant} · טמפו הרמה ` : ` · variation ${rec.variant} · level tempo `}
              <bdi dir="ltr">♩{rec.target}</bdi>
              {rec.day ? <> · <bdi dir="ltr">{rec.day}</bdi></> : null}
            </>
          ) : lang === 'he' ? (
            'שיא אישי: עוד אין ביצוע נקי.'
          ) : (
            'Personal record: no clean take yet.'
          )}
        </small>
        {row.some((d) => d.goal.drum?.splash) && (
          <small className="field-hint" data-splash-note="1">
            {lang === 'he' ? 'ספלאש מול צ׳יק נמדד ב-MIDI בלבד: לפי צליל הספלאש של הערכה או לפי פתיחת הפדל (CC4). ערכה שלא שולחת אף אחד מהם נמדדת רק על התזמון. במיקרופון זה לא נשמע באמינות.' : 'Splash vs chick is measured by MIDI only: the kit’s splash note or the pedal’s openness (CC4). A kit that sends neither is judged on timing only. A microphone can’t hear it reliably.'}
          </small>
        )}
        {(level as { needsTeacherCheck?: boolean }).needsTeacherCheck && (
          <small className="field-hint teacher-check" data-teacher-check="1">
            {lang === 'he' ? 'התבנית עוד לא נבדקה בידי מורה.' : 'Pattern not yet teacher-checked.'}
          </small>
        )}
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
      <LevelRefs level={level} lang={lang} />
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

/** The reference recordings of the standards a level is built on (owner 2026-11-11): one or two shown, more folded. */
function LevelRefs({ level, lang }: { level: LevelDef; lang: Lang }) {
  const ids = [...new Set(level.specs.map((s) => standardIdOfSpec(s)).filter((x): x is string => !!x && !!referenceOf(x)))];
  if (!ids.length) return null;
  if (ids.length <= 2)
    return (
      <div className="drill-refs" data-level-refs={ids.length}>
        {ids.map((id) => (
          <ListenOriginal key={id} id={id} lang={lang} />
        ))}
      </div>
    );
  return (
    <details className="drill-refs" data-level-refs={ids.length}>
      <summary>
        {lang === 'he' ? 'הקלטות מקור' : 'Original recordings'} <small dir="ltr">({ids.length})</small>
      </summary>
      {ids.map((id) => (
        <div key={id}>
          <p className="dr-tune" dir="ltr">
            {referenceOf(id)?.title}
          </p>
          <ListenOriginal id={id} lang={lang} compact />
        </div>
      ))}
    </details>
  );
}

function DrillRun({ lang, ds, cal, queue, start, items, onTake, onEnd, headphones, onHeadphones, kit, onIndex }: { onIndex?: (i: number) => void; lang: Lang; ds: DrillSettings; cal: DrillCalibration; queue: Drill[]; start: number; items: Record<string, ItemState>; onTake: DrillsProps['onTake']; onEnd: (takes: number, clean: number) => void; headphones?: boolean; onHeadphones?: (h: boolean) => void; kit?: Settings['drumKit'] }) {
  const [beat, setBeat] = useState(-1);
  const tx = T[lang];
  const [i, setI] = useState(start);
  // The screen's header names the item being played (owner 2026-11-12: it kept the first item's title — "C major" over G).
  useEffect(() => onIndex?.(i), [i]); // eslint-disable-line react-hooks/exhaustive-deps
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
  /** The next take is a repeat (Again / Slower / the next tempo): it starts at once. */
  const [again, setAgain] = useState(false);
  const [writing, setWriting] = useState<{ m: TakeMetrics; p: PlayedNote[] } | null>(null);
  // Rubato first (owner 2026-11-14): a new item is played in free time, then in quarters at ♩60, then at its tempo.
  // A free-time / quarter take is measured but never moves the ladder or the level. `oneFree`: a single free take
  // asked for after a badly missed timed take.
  const [oneFree, setOneFree] = useState(false);
  const [stageRes, setStageRes] = useState<{ m: TakeMetrics; stage: RubatoStage } | null>(null);
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
    setAgain(false);
    setTake((t) => t + 1);
  };
  const done = (m: TakeMetrics, played: PlayedNote[]) => {
    // The take also moves the player profile's timeline (SPEC-AI §8).
    void recordTakeAnalysis(drill, m, bpm).then(() => refreshProfile()).catch(() => {});
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
      window.setTimeout(() => (setRes(null), setBpm(lad.next.bpm), setAgain(true), setTake((t) => t + 1)), 1400);
    } else setBpm(lad.next.bpm);
  };
  const std = standardOfSpec(drill.spec);
  // Chords heard by a microphone can't be followed note by note: those items keep the timed take.
  const micChords = !midi.devices.length && drill.notes.some((n, k) => drill.notes.some((o, j) => j !== k && Math.abs(o.beat - n.beat) < 1e-4));
  // A goal the microphone can't measure (loudness, pedal) waits for a MIDI keyboard in the timed take; automated runs
  // (e2e) keep the timed take unless ?rubato is in the address (the brief page's rule).
  const noRubato = micChords || (!midi.devices.length && micUnmeasurable(drill).length > 0) || RUBATO_OFF;
  const stage: RubatoStage | null = noRubato ? null : oneFree && hasRubato(drill) ? 'free' : rubatoStage(stateOf(drill), drill);
  const takeDrill = stage === 'quarters' ? quartersDrill(drill) : drill;
  const stageDone = (m: TakeMetrics, st: RubatoStage) => {
    const before = stateOf(drill);
    const next = oneFree ? before : withStageTake(before, st, m);
    local.current[drill.itemId] = next;
    count.current.takes++;
    // Measured practice: it shows on the profile and earns a little XP, but no rating events (no tempo was measured).
    if (st === 'quarters') void recordTakeAnalysis(takeDrill, m, QUARTERS_BPM).catch(() => {});
    onTake(next, [], Math.max(1, Math.floor(drillXp(m) / 2)), takeInfo(drill, m));
    setOneFree(false);
    setStageRes({ m, stage: st });
  };
  const freeN = Math.min(RUBATO_CLEAN, (stateOf(drill).rubato?.free ?? 0) + 1);
  const he = lang === 'he';
  const stageTx = stage === 'free' ? (he ? `בלי קצב — הצלילים בלבד (${freeN}/${RUBATO_CLEAN})` : `Free time — the notes only (${freeN}/${RUBATO_CLEAN})`) : stage === 'quarters' ? (he ? 'ברבעים, ♩60 — צליל על כל פעמה' : 'In quarters, ♩60 — a note on every beat') : null;
  if (stageRes) {
    const nextStage = rubatoStage(stateOf(drill), drill);
    const line =
      stageRes.m.verdict !== 'clean'
        ? he
          ? 'בלי למהר — שוב.'
          : 'No rush — again.'
        : nextStage === null
          ? he
            ? `מוכנים לטמפו: ♩${stateOf(drill).goalBpm}.`
            : `Ready for tempo: ♩${stateOf(drill).goalBpm}.`
          : nextStage === 'quarters'
            ? he
              ? 'עכשיו בזמן: ברבעים, ♩60.'
              : 'Now in time: quarters at ♩60.'
            : he
              ? 'עוד פעם אחת נקייה בלי קצב.'
              : 'One more clean take in free time.';
    return (
      <div className="drill-run" data-drill={drill.itemId} data-rubato-result={stageRes.stage}>
        <DrillScore drill={stageRes.stage === 'quarters' ? quartersDrill(drill) : drill} ds={ds} result={stageRes.m} beat={-1} lang={lang} />
        <MarkLegend lang={lang} />
        <p className="drill-ladder">{line}</p>
        <TakeResult
          m={stageRes.m}
          free={stageRes.stage === 'free'}
          lang={lang}
          onAgain={() => (setStageRes(null), setAgain(stageRes.m.verdict === 'clean' || stageRes.stage !== 'free'), setTake((t) => t + 1))}
          onSlower={() => (setStageRes(null), setTake((t) => t + 1))}
          onNext={() => (setStageRes(null), go(i + 1))}
        />
      </div>
    );
  }
  return (
    <div className="drill-run" data-drill={drill.itemId}>
      <p className="drill-goal">
        {i + 1} / {queue.length}
        {stage !== 'free' && (
          <>
            {' · '}
            <span dir="ltr">
              {drill.pulse === 8 && stage !== 'quarters' ? '♪' : '♩'} {stage === 'quarters' ? QUARTERS_BPM : bpm}
            </span>
          </>
        )}
      </p>
      {std && <ListenOriginal id={std.ref.id} lang={lang} practiceKey={std.key} compact />}
      {/* BASS_NICHE_PLAN J4: a drill with a form shows its road map (sections, the bar being played, a cue a bar ahead). */}
      {drill.form && <RoadMapStrip drill={drill} beat={res ? -1 : beat} bpm={bpm} lang={lang} />}
      {stageTx && !res && (
        <p className="drill-stage" data-rubato-stage={stage}>
          <b>{stageTx}</b>
          {!oneFree && (
            <button
              className="link"
              onClick={() => {
                const next = skipRubato(stateOf(drill));
                local.current[drill.itemId] = next;
                onTake(next, [], 0);
                setTake((t) => t + 1);
              }}
              data-rubato-skip="1"
            >
              {he ? 'לדלג לטמפו' : 'Skip to tempo'}
            </button>
          )}
        </p>
      )}
      <DrillScore drill={takeDrill} ds={ds} result={res?.m} beat={res ? -1 : beat} lang={lang} />
      {res && <MarkLegend lang={lang} />}
      {!res && !writing && stage === 'free' && <RubatoTake key={`${drill.itemId}:free:${take}`} autoStart={again} drill={drill} lang={lang} cal={cal} onDone={(m) => (setBeat(-1), stageDone(m, 'free'))} onBeat={setBeat} />}
      {!res && !writing && stage === 'quarters' && <DrillTake key={`${drill.itemId}:q:${take}`} autoStart={again} drill={takeDrill} bpm={QUARTERS_BPM} lang={lang} cal={cal} onDone={(m) => (setBeat(-1), stageDone(m, 'quarters'))} onBeat={setBeat} drumsOk={headphones} onDrums={onHeadphones} kit={kit} />}
      {!res && !writing && !stage && <DrillTake key={`${drill.itemId}:${take}`} autoStart={again} drill={drill} bpm={bpm} lang={lang} cal={cal} onDone={(m, p) => (setBeat(-1), drill.write || drill.drumWrite ? setWriting({ m, p }) : done(m, p))} onBeat={setBeat} drumsOk={headphones} onDrums={onHeadphones} kit={kit} />}
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
            onAgain={() => (setRes(null), setAgain(true), setTake((t) => t + 1))}
            onSlower={() => (setRes(null), setAgain(true), setBpm((b) => Math.max(30, Math.round(b * 0.9))), setTake((t) => t + 1))}
            onNext={() => go(i + 1)}
            onFree={hasRubato(drill) && !noRubato && res.m.accuracy < BACK_TO_RUBATO ? () => (setRes(null), setOneFree(true), setAgain(false), setTake((t) => t + 1)) : undefined}
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
          {ds.instrument === 'guitar' ? (
            // GUITAR_DEEPENING §5: the guitar picks add-ons (the core is always on); the bass keeps its style filter.
            <GuitarAddOnPicker value={guitarAddOnsOf(ds)} onChange={(v) => onChange({ guitarAddOns: v })} lang={lang} />
          ) : (
            <div className="row">
              <span>{tx.gStyle}</span>
              {seg('guitarStyle', tx.gStyles)}
            </div>
          )}
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

type LevelTestProps = { lang: Lang; ds: DrillSettings; cal: DrillCalibration; items: Record<string, ItemState>; onTake: DrillsProps['onTake']; onDone: (start: Partial<Record<FamilyId, number>> | null) => void; midiOctave: number; onOctave: (o: number) => void; onBassTuning?: (t: string) => void; kit?: Settings['drumKit'] };
/** The playing level test: piano runs the section test (SPEC-LEVEL-TEST); the other instruments their probes. */
function TechLevelTest(p: LevelTestProps & { bassTuning?: string }) {
  return <SectionLevelTest {...p} />;
}

const PIANO_TEST_TX = {
  en: {
    intro: 'About 8 minutes, all on your instrument. One take per step at its own tempo — a clean take jumps ahead, a miss just moves on. Nobody is expected to play everything.',
    start: 'Start',
    skip: 'Skip the test',
    tooHard: 'Too hard — next',
    section: 'Section',
    clean: 'Clean — moving up',
    almost: 'Almost — one more try',
    not: 'Not yet — moving on',
    done: 'Your level is set',
    sumHead: 'Where you start',
    next: 'Done',
  },
  he: {
    intro: 'בערך 8 דקות, הכול על הכלי. נגינה אחת לכל שלב, בטמפו שלו — נגינה נקייה מקפיצה קדימה, טעות פשוט ממשיכה הלאה. אף אחד לא אמור לנגן הכול.',
    start: 'להתחיל',
    skip: 'לדלג על המבחן',
    tooHard: 'קשה מדי — הלאה',
    section: 'חלק',
    clean: 'נקי — עולים שלב',
    almost: 'כמעט — עוד ניסיון אחד',
    not: 'עוד לא — ממשיכים',
    done: 'הרמה שלך נקבעה',
    sumHead: 'מאיפה מתחילים',
    next: 'סיום',
  },
};

/** The playing level test: sections of real levels, adaptive, one take per step (docs/SPEC-LEVEL-TEST.md). */
function SectionLevelTest({ lang, ds, cal, items, onTake, onDone, midiOctave, onOctave, kit, bassTuning }: LevelTestProps & { bassTuning?: string }) {
  const tx = PIANO_TEST_TX[lang];
  const inst = ds.instrument ?? 'piano';
  const cat = useMemo(() => familiesOf(inst), [inst]);
  // Only steps this player's setup shows (guitar add-ons, the bass track and tuning, a practice pad or acoustic kit),
  // and on piano without MIDI only what a microphone can measure (loudness, release, pedal can never pass by mic).
  const strands = useMemo(() => {
    const byMic = !midi.devices.length;
    const drumMic = inst === 'drums' ? drumMicOf(kit) : undefined;
    const shown = new Set(shownFamilies({ ...ds, bassTuning, drumMic }).flatMap((f) => f.levels.map((l) => l.id)));
    return strandsFor(inst, ds.emphasis)
      .map((x) => ({
        ...x,
        rungs: x.rungs
          .map((r) => {
            const lv = cat.flatMap((f) => f.levels).find((l) => l.id === r.level);
            if (!lv || !shown.has(lv.id)) return null;
            const key = Array.isArray(lv.keys) && !lv.keys.includes(r.key) ? lv.keys[0] : r.key;
            const drill = withBassTuning([generate({ ...lv.specs[0], key })], bassTuning)[0];
            if (inst === 'piano' && byMic && micUnmeasurable(drill).length) return null;
            return { ...r, drill, title: lv.title };
          })
          .filter((x): x is NonNullable<typeof x> => !!x),
      }))
      .filter((x) => x.rungs.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, inst, ds.emphasis, bassTuning, kit]);
  const [started, setStarted] = useState(false);
  const [si, setSi] = useState(0);
  const [st, setSt] = useState<StrandState>(() => startState(strands[0]?.rungs.length ?? 0));
  const [last, setLast] = useState<TakeMetrics | null>(null);
  const [take, setTake] = useState(0);
  const [auto, setAuto] = useState(false);
  const placed = useRef<Partial<Record<FamilyId, number>>[]>([]);
  const [summary, setSummary] = useState<Partial<Record<FamilyId, number>> | null>(null);
  const session = useRef(`t${Date.now().toString(36)}`);
  const n = useRef(0);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const strand = strands[si];
  const rung = strand && st.at >= 0 ? strand.rungs[st.at] : null;
  const finishStrand = (s: StrandState) => {
    placed.current.push(strandPlaces(strand, s));
    const k = si + 1;
    if (k >= strands.length) return setSummary(testStart(inst, mergePlaces(...placed.current)));
    setSi(k);
    setSt(startState(strands[k].rungs.length));
    setLast(null);
    setAuto(false);
    setTake((t) => t + 1);
  };
  const step = (v: 'clean' | 'almost' | 'not') => {
    window.clearTimeout(timer.current);
    const s = advance(recordTake(st, v), strand.rungs.length);
    if (s.at < 0) return finishStrand(s);
    // The same step again ("almost") starts at once; a new step shows its music first.
    setAuto(s.at === st.at);
    setSt(s);
    setLast(null);
    setTake((t) => t + 1);
  };
  const done = (m: TakeMetrics) => {
    if (!rung) return;
    const d = rung.drill;
    const stt = items[d.itemId] ?? newItem(d);
    const lad = applyTake(stt, m, d.startBpm, new Date().toISOString(), ds, { targetBpm: itemTargetBpm(d) });
    onTake(lad.state, drillEvents(d, m, new Date().toISOString(), session.current, n.current++), drillXp(m), takeInfo(d, m));
    setLast(m);
    // Show the marks for a moment, then move on by itself (owner: a mistake should simply move the test on).
    timer.current = window.setTimeout(() => step(m.verdict), m.verdict === 'clean' ? 1600 : 2600);
  };
  if (!started)
    return (
      <div className="drill-opts card" data-level-test={inst}>
        <p>{tx.intro}</p>
        <ol className="lt-sections">
          {strands.map((x) => (
            <li key={x.id}>{x.title[lang]}</li>
          ))}
        </ol>
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
  if (summary)
    return (
      <div className="drill-opts card" data-level-test-done="1">
        <h2>{tx.done}</h2>
        <p className="field-hint">{tx.sumHead}</p>
        <ul className="lt-summary">
          {cat
            .filter((f) => (summary[f.id] ?? 1) > 1)
            .map((f) => (
              <li key={f.id}>
                {f.title[lang]} · <b dir="ltr">{summary[f.id]}</b>
              </li>
            ))}
        </ul>
        <button className="btn primary" onClick={() => onDone(summary)} data-test-finish="1">
          {tx.next}
        </button>
      </div>
    );
  if (!rung) return null;
  const verdictLine = last ? (last.verdict === 'clean' ? tx.clean : last.verdict === 'almost' && !st.retried.includes(st.at) ? tx.almost : tx.not) : null;
  return (
    <div className="drill-run" data-test-probe={rung.level} data-test-strand={strand.id}>
      <p className="drill-goal">
        {tx.section} {si + 1}/{strands.length} · <b>{strand.title[lang]}</b> · {rung.title[lang]}{inst === 'drums' ? '' : ` · ${keyName(rung.drill.spec.key, !!rung.drill.spec.minor)}`} · <span dir="ltr">♩ {rung.drill.startBpm}</span>
      </p>
      {last && (
        <p className={`drill-why lt-verdict v-${last.verdict}`} data-lt-verdict={last.verdict}>
          {verdictLine} · {last.why[lang]}
        </p>
      )}
      {last?.octaveShift !== undefined && <OctaveFix lang={lang} shift={last.octaveShift} current={midiOctave} onFix={onOctave} />}
      <ProbeTake key={`${strand.id}:${take}`} drill={rung.drill} ds={ds} last={last} bpm={rung.drill.startBpm} lang={lang} cal={cal} kit={kit} autoStart={auto} onDone={(m) => done(m)} />
      {!last && (
        <button className="btn ghost" onClick={() => step('not')} data-test-too-hard="1">
          {tx.tooHard}
        </button>
      )}
    </div>
  );
}

/** A placement probe's score and take, with the score's now-cue following the take. */
function ProbeTake({ drill, ds, last, bpm, lang, cal, kit, onDone, autoStart = false }: { autoStart?: boolean; drill: Drill; ds: DrillSettings; last: TakeMetrics | null; bpm: number; lang: Lang; cal: DrillCalibration; kit?: Settings['drumKit']; onDone: (m: TakeMetrics, played: PlayedNote[]) => void }) {
  const [beat, setBeat] = useState(-1);
  return (
    <>
      <DrillScore drill={drill} ds={ds} result={last} beat={last ? -1 : beat} lang={lang} />
      {last && <MarkLegend lang={lang} />}
      {!last && <DrillTake drill={drill} bpm={bpm} lang={lang} cal={cal} kit={kit} autoStart={autoStart} onBeat={setBeat} onDone={(m, played) => (setBeat(-1), onDone(m, played))} />}
    </>
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
