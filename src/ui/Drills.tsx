// Technique drills (spec AI): the hub (today's items, families, the technique map), a family's levels with the
// 12-key heat map, the run loop with the tempo ladder, drills settings, calibration and the drill creator.

import { KeysSoundButton } from './KeysSound';
import { SONGBOOK } from '../content/songbook';
import { COMMON_CHORDS, keyName as songKeyName, songFit } from '../engine/songChords';
import { recordTakeAnalysis } from '../storage/analysis';
import { CAL_PRESSES, calFromPresses, checkLevels, refineCal } from '../engine/drills/velCal';
import { MT } from '../i18n/measureText';
import { NOTE_BAND_NAME, PHRASE_BAND_NAME } from '../engine/phraseOrg';
import { refreshProfile } from '../storage/profile';
import { keyList, skillKeysOf, type KeyCell } from '../engine/analysis/keyMastery';
import { KeyMap12 } from './KeyMap12';
import { liveMarksOn, type LiveMarksPref, type LiveTake } from '../engine/drills/liveGrade';
import { chartCells, noteRoles, rulesKept } from '../engine/drills/chartCells';
import { ChordChart } from './ChordChart';
import { BACK_TO_RUBATO, hasRubato, QUARTERS_BPM, quartersDrill, RUBATO_CLEAN, rubatoStage, skipRubato, withStageTake, type RubatoStage } from '../engine/drills/rubato';
import { RubatoTake } from './RubatoTake';
import { hearable, playDrill } from './HearDrill';
import { useAnyNote } from './anyNote';
import { piano, tts } from './services';
import { announce, coachable, coachAfter, missLine, coachStage, coachStart, coachTake, rubatoDoneByCoach, summary as coachSummary, type CoachBackground, type CoachState, type CoachTake } from '../engine/drills/coach';
/** SPEC-COACH-2 §3: the course self-report ("some" / "a lot") or a level-test start past level 1 → past the basics. */
function coachBackground(settings: Settings, ds: DrillSettings, fam: FamilyId): CoachBackground {
  const inst = ds.instrument ?? 'piano';
  const course = inst === 'piano' ? 'keys' : inst;
  const report = (settings.courseStart as Record<string, { report?: string } | undefined> | undefined)?.[course]?.report;
  const from = settings.drillStart?.[fam];
  return { skilled: report === 'bit' || report === 'well', from };
}
const RUBATO_OFF = typeof navigator !== 'undefined' && navigator.webdriver && !new URLSearchParams(typeof location !== 'undefined' ? location.search : '').has('rubato');
import { levelRecord } from '../engine/drumRecords';
import { RULE_NAME } from '../engine/improvRules';
import { SoloChorusEditor } from './SoloChorus';
import { PART_NAME, songDrill } from '../engine/drills/songDrills';
import { useEffect, useMemo, useRef, useState } from 'react';
import { bassTuningOf, type Settings } from '../storage/progress';
import type { RatingEvent } from '../engine/rating';
import type { CustomDrill, Drill, DrillCalibration, DrillSettings, FamilyId, ItemState, KeyOrder, PlayedNote, TakeMetrics } from '../engine/drills/types';
import { DEFAULT_DRILL_SETTINGS } from '../engine/drills/types';
import { keyName } from '../engine/drills/generate';
import type { FamilyDef, LevelDef } from '../engine/drills/generate';
import { applyTake, drillKeyOf, drillMinorOf, familyLevel, newItem, type LadderResult } from '../engine/drills/ladder';
import { facetGroup } from '../engine/drills/keyFacet';
import { customKeys, customToDrill } from '../engine/drills/custom';
import { DrillCreator } from './DrillCreator';
import { currentLevel, families as familiesOf, levelDone, skillDrillsInKey, levelStars, LEVEL_MAX_STARS, levelKeys, shownFamilies, specDrills, todayDrills, levelDrills, withBassTuning, itemTargetBpm } from '../engine/drills/plan';
import { generate } from '../engine/drills/generate';
import { advance, finishPlaces, strandsFor, recordTake, startState, strandPlaces, testStart, type StrandId, type StrandState } from '../engine/drills/levelTest';
import { micUnmeasurable } from '../engine/drills/analyze';
import { pathPianoLevels } from '../engine/ladderFacts';
import { type GuitarLevelDef } from '../engine/drills/guitar';
import { guitarAddOnsOf } from '../engine/drills/guitarMeta';
import { GuitarAddOnPicker } from './GuitarAddOns';
import { FAMILY_LESSON } from '../content/mini/guitar';
import { MINI_LESSONS } from '../content/minilessons';
import { MiniLessonPlayer } from './MiniLesson';
import { STRINGS } from '../i18n/strings';
import { isGuitarDrill } from '../engine/drills/events';
import { drillEvents, drillXp } from '../engine/drills/events';
import { ChartView, DrillStaff, DrillTab, DrillTake, EarCard, MarkLegend } from './DrillTake';
import { BidiText, plainText } from './BidiText';
import { TakeReview } from './TakeReview'; // COURSE-FEEDBACK-UI slice 2: the one-screen review
import { hasFingering, shownDrill, type OwnFingerings } from '../engine/drills/ownFingering';
import { FingerKeys, OwnFingeringLink } from './OwnFingering';
import { NewBestTempo, newBestOf } from './studio/NewBestTempo';
import { syncOwnFingering } from '../storage/analysis';
import { ErrorMap, barMarks, worstBar } from './ErrorMap'; // slice 3: loop the spot
import { LOOP_PASSES, loopBpm, sliceDrill } from '../engine/drills/slice';
// Voice leading (AUDIT-CONTENT-THEORY §ה.2): the chord symbols + first voicing, the voices as lanes, the stage lessons.
import { VoiceLeadLessons, VoiceLeadScore } from './VoiceLeadScore';
import { ReharmStudio } from './ReharmStudio'; // AUDIT-DEPTH-3 C3: your own reharm of a head
import { TuneLadder } from './TuneLadder'; // AUDIT-DEPTH-3 C4: one tune, step by step
import { RoadMapStrip } from './RoadMap';
import { TranscribeWrite } from './BassWrite';
import { DrumWrite } from './DrumWrite';
import { withDrumWrite } from '../engine/drills/drumEar';
import { withWritten } from '../engine/drills/bassEar';
import { midi } from '../speech/midi';
import { guitarInputPref } from '../speech/guitarInput';
import { keepPhrase } from '../engine/encore/takeSource';
import { inputLatency } from '../engine/latency';
import { LatencyCalibrate } from './LatencyCalibrate';
import { DrumSongCard } from './DrumSongCard';
import { DrumScore, KitCard, KitSetup } from './DrumViews';
import { isJazzStep } from '../engine/courses';
import { jazzOpenIn } from '../engine/jazzFold';
import { drumMicOf, type KitKind } from '../engine/drumKit';
import { isDrumDrill } from '../engine/drills/events';
import { standardIdOfSpec, standardOfSpec } from '../engine/drills/standardRef';
import { ListenOriginal } from './ListenOriginal';
import { referenceOf } from '../content/references';
import { Icon } from './icons';
import { GROUP_NAME, KeyGrid, KeyPage, ViewSwitch, type PracticeView } from './PracticeKeys';
import { buildKeyIndex, keySession, pickWeekKey, weekOf, type KeyIndex } from '../engine/drills/keyIndex';
import { keysInOrder } from '../engine/drills/generate';
import { FAMILY_FACETS, type FacetGroup } from '../engine/drills/keyFacet';
/** Key-neutral families (rhythm, independence, mechanics): General technique under the key cards. */
const GENERAL_FAMILY = (id: string): boolean => FAMILY_FACETS[id]?.scope === 'neutral';

type Lang = 'he' | 'en';
const T = {
  en: {
    title: 'Technique', today: 'Today', start: 'Start', families: 'Drills', mine: 'My drills', create: 'Create a drill', settings: 'Drill settings', calib: 'Calibrate', level: 'Level', keys: 'Keys', done: 'done',
    role: { 'warm-up': 'Warm-up', weak: 'Work on', maintenance: 'Keep fresh', variant: 'Variation', new: 'New' } as Record<string, string>,
    noMidi: 'Connect a MIDI keyboard for the full analysis (velocity, hands, legato). The microphone works for pitch and timing.',
    fingering: 'Show fingering', order: 'Key order', cont: 'Continuous practice', contAcc: 'Accuracy to move on', emphasis: 'Style', inPath: 'Drills in my path', inWorkout: 'Drills in the daily workout',
    orders: { 'fifths-up': 'Circle of fifths ↑', 'fifths-down': 'Circle of fifths ↓', 'chromatic-up': 'Chromatic ↑', 'chromatic-down': 'Chromatic ↓', difficulty: 'Easiest first', fingering: 'By fingering' } as Record<string, string>,
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
    orders: { 'fifths-up': 'מעגל הקווינטות ↑', 'fifths-down': 'מעגל הקווינטות ↓', 'chromatic-up': 'כרומטי ↑', 'chromatic-down': 'כרומטי ↓', difficulty: 'מהקל לקשה', fingering: 'לפי אצבוע' } as Record<string, string>,
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
// B7: in the guitar / bass course with the microphone chosen over a connected MIDI device, the mic's latency applies.
const calOf = (s: Settings): DrillCalibration => ({ ...DEFAULT_CAL, ...(s.drillCal ?? {}), latencyMs: inputLatency(s, midi.devices.length && !((s.activeCourse === 'guitar' || s.activeCourse === 'bass') && guitarInputPref() === 'mic') ? 'midi' : 'mic') });
/** Family stripe colours: domain tokens only (COURSE-FEEDBACK-UI §3.3) — play lemon, harmony lilac, ear sky, theory tangerine, time pink, improvisation purple. */
const FAM_HUE: Partial<Record<FamilyId, string>> = { scales: 'var(--hue-instrument)', arpeggios: 'var(--hue-instrument)', fingers: 'var(--hue-instrument)', control: 'var(--hue-instrument)', advanced: 'var(--hue-instrument)', voicings: 'var(--hue-instrument)', 'k-keys': 'var(--hue-instrument)', 'k-indep': 'var(--hue-instrument)', 'k-lh': 'var(--hue-instrument)', 'k-tex': 'var(--hue-instrument)', custom: 'var(--hue-instrument)', cadences: 'var(--lilac)', harris: 'var(--lilac)', jazz: 'var(--lilac)', 'k-sixdim': 'var(--lilac)', 'k-bebop': 'var(--lilac)', 'k-reharm': 'var(--lilac)', 'k-vocab': 'var(--lilac)', 'k-harrisline': 'var(--lilac)', 'k-ctone': 'var(--lilac)', 'k-mediant': 'var(--lilac)', 'k-organ': 'var(--lilac)', 'k-vl': 'var(--lilac)', 'k-harm': 'var(--lilac)', 'k-tune': 'var(--lilac)', 'k-sharm': 'var(--lilac)', 'k-ctx': 'var(--lilac)', 'k-gig': 'var(--lilac)', 'k-ear': 'var(--hue-pitch)', 'k-phrase': 'var(--hue-pitch)', 'k-theory': 'var(--tangerine)', 'k-comp': 'var(--hue-time)', accomp: 'var(--hue-time)', 'k-solo': 'var(--purple)', 'k-impro': 'var(--purple)' , 'k-tpair': 'var(--tangerine)', 'g-tpair': 'var(--tangerine)', 'b-tpair': 'var(--tangerine)'};
const HANDS_TX: Record<Lang, Record<string, string>> = { en: { R: 'RH', L: 'LH', RL: 'HT' }, he: { R: 'ימין', L: 'שמאל', RL: 'ביחד' } };

/** Drill settings with the instrument defaulting to the player's (guitar / bass players get guitar drills). */
export function drillSettingsOf(s: Pick<Settings, 'drills' | 'instrument'> & { activeCourse?: Settings['activeCourse']; courses?: Settings['courses']; leftHanded?: boolean }): DrillSettings {
  const inst = s.instrument === 'guitar' ? 'guitar' : s.instrument === 'bass' ? 'bass' : 'piano';
  // 0.64: an instrument course decides the technique instrument (keys → piano, guitar, bass), however the course was reached.
  const byCourse: DrillSettings['instrument'] | null = s.activeCourse === 'keys' ? 'piano' : s.activeCourse === 'guitar' ? 'guitar' : s.activeCourse === 'bass' ? 'bass' : s.activeCourse === 'drums' ? 'drums' : null;
  const out0: DrillSettings = { ...DEFAULT_DRILL_SETTINGS, instrument: inst as DrillSettings['instrument'], ...(s.drills ?? {}) };
  // GUITAR_DEEPENING §5 (owner 2026-11-11): the guitar add-ons, migrated from the old single style when never set
  // (jazz pre-ticked for a player who also takes the Jazz course).
  // The left-handed neck (Settings → instrument) mirrors the drill's chord boxes too; never stored with the drill settings.
  const out: DrillSettings = { ...out0, guitarAddOns: guitarAddOnsOf(out0, s.courses), leftHanded: !!s.leftHanded };
  return byCourse ? { ...out, instrument: byCourse } : out;
}

/**
 * A drill's notes: tab for guitar / bass (and / or notation by the setting), the staff for piano. Bass (0.64): reading
 * drills force notation (B10); free-choice drills show only the chord chart, with an opt-in model line (B3); ear drills
 * show what to do until the result (B11). `beat` = the running take's beat, for the moving window (B2).
 */
export function DrillScore({ drill, ds, result, beat = -1, lang = 'en', bpm, live, loop, cue = false, prior, heard }: { drill: Drill; ds: DrillSettings; result?: TakeMetrics | null; beat?: number; lang?: Lang; /** The take's tempo (phrases by ear: the call's replay). */ bpm?: number; /** Slice 5: the running take's settled notes (live marks). */ live?: LiveTake | null; /** Slice 8: bars picked on the error map, hatched on a chart. */ loop?: [number, number] | null; /** Slice 5: the count-in is running — the first note head pulses once. */ cue?: boolean; /** Slice 5: the last take of this item, its ticks faded under the review's ("Last take"). */ prior?: TakeMetrics | null; /** Slice 8: the improvised notes heard so far (rule-card items) — note-role dots on the chart. */ heard?: { beat: number; midi: number }[] | null }) {
  const roles = useMemo(() => (heard && !result && drill.goal.improv ? noteRoles(drill, heard) : null), [heard, result, drill]);
  const [model, setModel] = useState(false);
  // Ear drills (bass B11, the drummer's ear): what to do and which bars are yours, until the result.
  // The pianist's ear (PIANO_AUDIT §3) too: the answer stays hidden until the result.
  if (drill.show === 'none' && !result) return <EarCard drill={drill} beat={beat} lang={lang} bpm={bpm} roles={roles} />;
  // Drums (0.65): a percussion staff (reading always), or lanes by the setting.
  if (isDrumDrill(drill)) return <DrumScore drill={drill} view={drill.show === 'staff' ? 'staff' : (ds.drumView ?? 'staff')} result={result} beat={beat} lang={lang} live={live} cue={cue} prior={prior} />;
  // PIANO_JAZZ P2: trading fours — after the result, a model line for your bars on request (it replaces the landings
  // staff, so the card still fits one screen).
  const tradeModel = !isGuitarDrill(drill) && result ? drill.goal.free?.model : undefined;
  // Slice 8: a rule-card take's result is the chart — a corner tab per bar (kept / the rules broken) and the note landed
  // on under each chord — in place of the landings staff; the model line stays one tap away.
  const ruleChart = result && drill.goal.improv && drill.chart?.length ? <ChordChart cells={chartCells(drill, result)} meter={drill.meter || 4} lang={lang} maxRows={4} size="compact" loop={loop} attrs={{ 'data-rule-chart': 1 }} /> : null;
  if (tradeModel?.length)
    return (
      <>
        {model ? <DrillStaff drill={{ ...drill, notes: tradeModel.map((n) => ({ pitch: n.pitch, beat: n.beat, dur: n.dur, hand: 'R' as const })) }} lang={lang} /> : (ruleChart ?? <DrillStaff drill={drill} fingering={ds.showFingering} result={result} lang={lang} />)}
        <button className="link model-toggle" onClick={() => setModel(!model)} aria-pressed={model} data-model-line={model ? 'on' : 'off'}>
          {model ? (lang === 'he' ? 'בחזרה לנחיתות שלכם' : 'Back to your landings') : lang === 'he' ? 'להציג קו לדוגמה' : 'Show a model line'}
        </button>
      </>
    );
  if (!isGuitarDrill(drill) && drill.goal.vl) return <VoiceLeadScore drill={drill} result={result} beat={beat} lang={lang} />;
  if (!isGuitarDrill(drill)) return <DrillStaff drill={drill} fingering={ds.showFingering} result={result} beat={beat} live={live} lang={lang} cue={cue} prior={prior} roles={roles} />;
  if (drill.show === 'none' && !result) return <EarCard drill={drill} beat={beat} lang={lang} bpm={bpm} roles={roles} />;
  // AUDIT-6 TAB reading: show 'tab' draws TAB only, whatever the player's view.
  const view = drill.show === 'staff' ? 'staff' : drill.show === 'tab' ? 'tab' : (ds.guitarView ?? 'tab');
  // The guitar trade (g-impro 7), like the piano's: after the result, a model line for your bars on request — in the
  // player's view (tab and / or staff), in place of the landings, so the card still fits one screen.
  const guitarModel = result ? drill.goal.free?.model : undefined;
  if (guitarModel?.length) {
    const md: Drill = { ...drill, notes: guitarModel.map((n) => ({ pitch: n.pitch, beat: n.beat, dur: n.dur, hand: 'R' as const, ...(n.string ? { string: n.string, fret: n.fret ?? 0 } : {}) })) };
    return (
      <>
        {model ? (
          <>
            {view !== 'staff' && <DrillTab leftHanded={ds.leftHanded} drill={md} lang={lang} />}
            {view !== 'tab' && <DrillStaff drill={md} />}
          </>
        ) : (
          (ruleChart ?? (
            <>
              {view !== 'staff' && <DrillTab leftHanded={ds.leftHanded} drill={drill} fingering={ds.showFingering} picking={!!ds.showPicking} result={result} lang={lang} />}
              {view !== 'tab' && <DrillStaff drill={drill} result={result} lang={lang} />}
            </>
          ))
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
      {written && view !== 'staff' && <DrillTab leftHanded={ds.leftHanded} drill={drill} fingering={ds.showFingering} picking={!!ds.showPicking} result={result} beat={beat} upTo={upTo} live={live} cue={cue} prior={prior} lang={lang} />}
      {written && view !== 'tab' && <DrillStaff drill={drill} result={result} beat={beat} upTo={upTo} live={live} lang={lang} cue={cue && view === 'staff'} prior={prior} roles={roles} />}
      {chartOnly && <ChartView drill={drill} beat={beat} fromBeat={drill.freeFrom ?? 0} result={result} loop={loop} lang={lang} compact={written} roles={roles} />}
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
  /** SPEC-PATH-ROLE §4: the queue is a checkpoint's technique part — every item starts at its level's target tempo. */
  atTarget?: boolean;
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

type View = { k: 'test' } | { k: 'hub' } | { k: 'songs' } | { k: 'family'; f: FamilyDef } | { k: 'run'; queue: Drill[]; i: number; from: View; /** The practice coach on this family (coach.ts). */ coach?: FamilyDef } | { k: 'settings' } | { k: 'calib' } | { k: 'creator'; edit?: CustomDrill } | { k: 'kit'; then?: 'test'; start?: KitKind } | { k: 'keypage'; root: number };

export function Drills({ lang, settings, onSettings, items, onTake, onBack, queue, onQueueDone, startTest, onTestDone, songs, onSing, onVoice, onPieces, atTarget }: DrillsProps) {
  const tx = T[lang];
  const ds = drillSettingsOf(settings);
  const [view, setView] = useState<View>(startTest ? (ds.instrument === 'drums' && !settings.drumKit?.done ? { k: 'kit' } : { k: 'test' }) : queue?.length ? { k: 'run', queue, i: 0, from: { k: 'hub' } } : songs ? { k: 'songs' } : { k: 'hub' });
  // A 5- / 6-string or drop-D bass (Settings → tuning): the bass-course drills are placed on that neck.
  // B12 (0.64): the bass has its own tuning setting (Settings → bassTuning), apart from the guitar's.
  const bassTuning = bassTuningOf(settings);
  const runQueue = useMemo(() => (view.k === 'run' ? withBassTuning(view.queue, bassTuning) : []), [view, bassTuning]);
  /** The item the run is on now (DrillRun reports it), for the header; reset with every new run. */
  const [runIdx, setRunIdx] = useState<number | null>(null);
  const [coachTitle, setCoachTitle] = useState<string | null>(null);
  // Practice by key (SPEC-PRACTICE-KEYS): the view and the scale-family tab, remembered on this device.
  const [pView, setPViewState] = useState<PracticeView>(() => lsGet('toneturn.practiceView') === 'key' ? 'key' : 'topic');
  const setPView = (v: PracticeView) => (setPViewState(v), lsSet('toneturn.practiceView', v));
  const [kGroup, setKGroupState] = useState<FacetGroup>(() => (lsGet('toneturn.keyGroup') as FacetGroup | null) ?? 'major');
  const setKGroup = (g: FacetGroup) => (setKGroupState(g), lsSet('toneturn.keyGroup', g));
  // the advanced tabs (melodic / harmonic-minor modes) for a player past the basics: the course answers or the level test
  const keysAdvanced = coachBackground(settings, ds, 'scales').skilled || Object.values(settings.drillStart ?? {}).some((x) => (x ?? 1) > 1);
  const keyIdx = useMemo(
    () => (ds.instrument === 'drums' || (pView !== 'key' && view.k !== 'keypage') ? null : buildKeyIndex(shownFamilies({ ...ds, bassTuning }), ds.keyOrder)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(ds), bassTuning, pView, view.k === 'keypage'],
  );
  useEffect(() => (setRunIdx(null), setCoachTitle(null)), [view]);
  const head = (title: string, back: () => void) => (
    <header className="screen-head">
      <button className="icon-btn" onClick={back} aria-label="Back">
        <Icon k="back" />
      </button>
      <h1 title={typeof title === 'string' ? plainText(title) : undefined}>{view.k === 'run' && typeof title === 'string' && title.includes(' · ') ? (<><span className="st-title"><BidiText text={title.slice(0, title.indexOf(' · '))} /></span><small className="st-sub"><BidiText text={title.slice(title.indexOf(' · ') + 3)} /></small></>) : typeof title === 'string' ? <BidiText text={title} /> : title}</h1>
      {settings.midiInput && settings.activeCourse !== 'drums' && <KeysSoundButton on={settings.midiSound !== false} toggle={() => onSettings({ midiSound: settings.midiSound === false, midiSoundAsked: true })} lang={lang === 'he' ? 'he' : 'en'} />}
    </header>
  );
  const setDs = (p: Partial<DrillSettings>) => onSettings({ drills: { ...ds, ...p } });

  if (view.k === 'run')
    return (
      <main className="drills-screen" data-drills="run">
        {head((view.coach ? (coachTitle ?? view.coach.title[lang]) : null) ?? runQueue[runIdx ?? view.i]?.title[lang] ?? view.queue[view.i]?.title[lang] ?? tx.title, () => (queue?.length ? onBack() : setView(view.from)))}
        <DrillRun
          key={view.coach ? `coach:${view.coach.id}` : 'run'}
          coach={view.coach}
          coachBg={view.coach ? coachBackground(settings, ds, view.coach.id) : undefined}
          onKeyOrder={(keyOrder) => setDs({ keyOrder })}
          onTitle={setCoachTitle}
          onIndex={setRunIdx}
          lang={lang}
          ds={ds}
          headphones={settings.headphones}
          onHeadphones={(h) => onSettings({ headphones: h })}
          cal={calOf(settings)}
          onCalRefine={(c) => onSettings({ drillCal: { ...(settings.drillCal ?? DEFAULT_CAL), velMin: c.velMin, velMax: c.velMax } })}
          queue={runQueue}
          kit={settings.drumKit}
          start={view.i}
          items={items}
          atTarget={atTarget}
          onTake={onTake}
          onEnd={(takes, clean) => (onQueueDone && queue?.length ? onQueueDone(takes, clean) : setView(view.from))}
          own={settings.ownFingering}
          onOwn={(ownFingering) => (onSettings({ ownFingering }), void syncOwnFingering(ownFingering))}
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
          noJazz={!!settings.activeCourse && !jazzOpenIn(settings, settings.activeCourse)}
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
  if (view.k === 'keypage' && keyIdx)
    return (
      <main className="drills-screen" data-drills="keypage">
        {head(keyPageTitle(view.root, kGroup, lang), () => setView({ k: 'hub' }))}
        <KeyPage idx={keyIdx} root={view.root} group={kGroup} items={items} lang={lang} ds={ds} onGroup={setKGroup} advanced={keysAdvanced} onOpenKey={(root, g) => (setKGroup(g), setView({ k: 'keypage', root }))} onRun={(q) => setView({ k: 'run', queue: q, i: 0, from: view })} />
      </main>
    );
  if (view.k === 'family')
    return (
      <main className="drills-screen" data-drills="family">
        {head(view.f.title[lang], () => setView({ k: 'hub' }))}
        <FamilyLesson family={view.f.id} settings={settings} />
        <VoiceLeadLessons family={view.f.id} settings={settings} />
        <ReharmStudio family={view.f.id} lang={lang} onRun={(q) => setView({ k: 'run', queue: q, i: 0, from: view })} />
        <TuneLadder family={view.f.id} lang={lang} items={items} onRun={(q) => setView({ k: 'run', queue: q, i: 0, from: view })} />
        {coachable(view.f, ds.keyOrder) && (
          <button className="coach-entry" onClick={() => setView({ k: 'run', queue: [], i: 0, from: view, coach: view.f })} data-coach-open={view.f.id}>
            <Icon k="play" size={20} />
            <span>
              <b>{lang === 'he' ? 'אימון רציף' : 'Continuous practice'}</b>
              <small>{lang === 'he' ? 'מתחיל איפה שאתם, עולה בקושי, וממשיך לבד בין נגינה לנגינה' : 'Starts where you are, climbs, and moves on by itself between takes'}</small>
            </span>
          </button>
        )}
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
      pView={pView}
      onPView={setPView}
      keyGrid={
        keyIdx ? (general: React.ReactNode) => <KeyGrid idx={keyIdx} items={items} lang={lang} ds={ds} group={kGroup} onGroup={setKGroup} advanced={keysAdvanced} weekRoot={weekKey(keyIdx, kGroup, items, ds)} onWeek={(root, g) => setView({ k: 'run', queue: keySession(keyIdx, root, g, items), i: 0, from: { k: 'hub' } })} onKey={(root) => setView({ k: 'keypage', root })} general={general} /> : null
      }
    />
  );
}

const lsGet = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* fine */
  }
};
/** The key of the week for this instrument and tab: picked once a week and kept on this device. */
function weekKey(idx: KeyIndex, g: FacetGroup, items: Record<string, ItemState>, ds: DrillSettings): number | null {
  const week = weekOf();
  const tag = `${week}|${ds.instrument ?? 'piano'}|${g}`;
  const kept = lsGet('toneturn.weekKey');
  if (kept?.startsWith(tag + '|')) return Number(kept.split('|')[3]);
  const r = pickWeekKey(idx, g, items, keysInOrder(ds.keyOrder, g === 'minor'));
  if (r !== null) lsSet('toneturn.weekKey', `${tag}|${r}`);
  return r;
}
/** "C major" / "C minor" / "C: melodic & harmonic minor modes" / "C: symmetric". */
function keyPageTitle(root: number, g: FacetGroup, lang: Lang): string {
  const he = lang === 'he';
  if (g === 'major') return he ? `${keyName(root)} מז׳ור` : `${keyName(root)} major`;
  if (g === 'minor') return he ? `${keyName(root, true)} מינור` : `${keyName(root, true)} minor`;
  return `${keyName(root)}: ${g === 'mmhm' ? (he ? 'מודים של מינור מלודי והרמוני' : 'melodic & harmonic minor modes') : he ? 'סימטריים' : 'symmetric'}`;
}


/** Technique topics (owner 2026-11-08): the drills split and filtered like the games list. */
type DrillTopic = 'all' | 'scales' | 'chords' | 'hands' | 'time' | 'grooves' | 'styles' | 'reading' | 'ear' | 'upright' | 'songs' | 'mine';
const TOPIC_OF: Record<string, Exclude<DrillTopic, 'all' | 'songs' | 'mine'>> = {
  scales: 'scales', arpeggios: 'scales', 'g-scales': 'scales', 'g-arps': 'scales', 'g-reading': 'scales', 'g-bass': 'scales',
  cadences: 'chords', voicings: 'chords', accomp: 'chords', 'g-chords': 'chords', 'g-rhythm': 'chords',
  // AUDIT-SCALES: hand independence; the harmonization ladder with the scales.
  'k-indep': 'hands', 'k-sharm': 'scales', 'g-harm': 'scales',
  fingers: 'hands', control: 'hands', advanced: 'hands', 'g-fretting': 'hands', 'g-picking': 'hands', 'g-legato': 'hands', 'g-fingerstyle': 'hands',
  harris: 'styles', jazz: 'styles', 'k-sixdim': 'styles', 'k-bebop': 'styles', 'k-reharm': 'styles', 'k-theory': 'styles', 'k-vocab': 'styles', 'k-solo': 'styles', 'k-ctx': 'styles', 'k-harrisline': 'styles', 'g-harrisline': 'styles', 'b-harrisline': 'styles', 'k-ctone': 'chords', 'k-mediant': 'chords', 'k-organ': 'styles', 'k-tpair': 'styles', 'g-tpair': 'styles', 'b-tpair': 'styles', 'g-ctone': 'chords', 'g-color': 'chords', 'b-counter': 'chords', 'g-lead': 'styles', 'g-flamenco': 'styles', 'g-jazz': 'styles', 'g-impro': 'styles',
  // Bass course (unlisted b-* families fall under hands: pluck, fret, length, legato, pick, slap). B17 (0.64): time and
  // pocket are their own topic, reading has one, the bass ear one, and the upright track is grouped on its own.
  'b-scale': 'scales', 'b-read': 'reading', 'b-posread': 'reading', 'b-impro': 'styles', 'b-swing': 'time', 'b-odd': 'time', 'b-poly': 'time', 'b-prog': 'styles', 'b-barry': 'styles', 'b-bebop': 'styles', 'b-jform': 'styles', 'b-latin': 'styles', 'b-std': 'chords', 'b-chord': 'chords', 'b-walk': 'chords', 'b-time': 'time', 'b-pocket': 'time', 'b-ghost': 'styles', 'b-styles': 'styles', 'b-ear': 'ear',
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
  // Phrases by ear: the ear topic on every instrument.
  'k-phrase': 'ear', 'g-phrase': 'ear', 'b-phrase': 'ear',
  // AUDIT-CONTENT-THEORY §ז.2: the first steps at the piano are hand technique.
  'k-first': 'hands',
  // AUDIT-6 Stage B: graded sight-reading under reading; the guitar, bass and drum first steps with the hands; riffs as styles.
  'k-read': 'reading', 'g-first': 'hands', 'b-first': 'hands', 'd-first': 'hands', 'g-riff': 'styles', 'g-jblues': 'styles',
  // GUITAR_DEEPENING: the guitarist's ear has the ear topic; Barry Harris and prog / fusion are styles.
  'g-ear': 'ear', 'g-harris': 'styles', 'g-theory': 'styles', 'g-bebop': 'styles', 'g-solo': 'styles', 'g-ctx': 'styles', 'b-solo': 'styles', 'b-ctx': 'styles', 'g-prog': 'styles',
  'k-vl': 'chords', 'g-vl': 'chords',
  // AUDIT-GAPS-2: key changes and turnarounds (harmony you play).
  'k-keys': 'chords', 'g-keys': 'chords', 'b-keys': 'chords',
  'k-cadlib': 'chords', 'g-cadlib': 'chords', 'b-cadlib': 'chords',
  // AUDIT-DEPTH-3: heads — harmonising and chord-melody are harmony you play; comping a head is a style.
  'k-harm': 'chords', 'g-cmel': 'chords', 'k-tune': 'styles', 'g-tune': 'styles', 'b-tune': 'styles',
  // Solo jazz piano (Siskind): the left hand and the comping vocabulary with chords, textures and improv habits as styles.
  'k-lh': 'chords', 'k-comp': 'chords', 'k-tex': 'styles', 'k-impro': 'styles',
  'b-up-pos': 'upright', 'b-up-arco': 'upright', 'b-up-scales': 'upright', 'b-up-pizz': 'upright', 'b-up-walk': 'upright', 'b-up-read': 'upright',
  // AUDIT-7: pop accompaniment with chords, pedalling with the hands, the classical pieces with songs' styles; bass riffs
  // and feels as styles.
  'k-pop': 'chords', 'k-pedal': 'hands', 'k-classic': 'styles', 'b-riff': 'styles', 'b-feel': 'styles',
  // AUDIT-DEPTH-3 #11, #12, C8: on the bandstand (intros, endings, the ballad, the whole tune) is a style.
  'k-gig': 'styles', 'g-gig': 'styles', 'b-gig': 'styles',
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
  ear: { en: 'Ear', he: 'שמיעה' },
  upright: { en: 'Upright bass', he: 'קונטרבס' },
  songs: { en: 'Songs', he: 'שירים' },
  mine: { en: 'My drills', he: 'התרגילים שלי' },
};

/** A topic's name; the drums course has no jazz under "styles" (DRUMS_AUDIT N1). */
const topicName = (k: DrillTopic, drums: boolean, piano = false): { en: string; he: string } =>
  drums && k === 'styles' ? { en: 'Styles', he: 'סגנונות' } : drums && k === 'ear' ? { en: 'Drummer’s ear', he: 'שמיעה למתופפים' } : piano && k === 'ear' ? { en: 'Pianist’s ear', he: 'שמיעה לפסנתרנים' } : piano && k === 'styles' ? { en: 'Jazz piano', he: 'פסנתר ג׳אז' } : TOPIC_NAME[k];

function Hub({ lang, ds, settings, items, head, onFamily, onRun, onSettings, onCreate, onTest, onInstrument, onVoice, onKit, onKitSave, onAddOns, pView, onPView, keyGrid }: { /** By topic / by key (SPEC-PRACTICE-KEYS). */ pView?: PracticeView; onPView?: (v: PracticeView) => void; keyGrid?: ((general: React.ReactNode) => React.ReactNode) | null; onAddOns?: (v: NonNullable<DrillSettings['guitarAddOns']>) => void; onKit?: (start?: KitKind) => void; onKitSave?: (k: NonNullable<Settings['drumKit']>) => void; onVoice?: () => void; lang: Lang; ds: DrillSettings; settings: Settings; items: Record<string, ItemState>; head: React.ReactNode; onFamily: (f: FamilyDef) => void; onRun: (q: Drill[]) => void; onSettings: () => void; onCreate: (edit?: CustomDrill) => void; onTest: () => void; onInstrument: (i: 'piano' | 'guitar' | 'bass' | 'drums') => void }) {
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
          {!drums && lv > 0 && <KeysCount cells={skillKeysOf(f.id, items)?.cells} lang={lang} />}
          {!drums && lv > 0 && <HeatRow cells={skillKeysOf(f.id, items)?.cells} />}
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
      {!drums && onPView && <ViewSwitch view={pView ?? 'topic'} onView={onPView} lang={lang} />}
      {!drums && pView === 'key' && keyGrid ? (
        keyGrid(<div className="drill-families">{fams.filter((f) => GENERAL_FAMILY(f.id)).map(famCard)}</div>)
      ) : (
      <>
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
            <Icon k="play" /> {tx.start}
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
              <Icon k="play" /> {tx.allKeys}
            </button>
          </div>
        ))}
        <button className="btn ghost" onClick={() => onCreate()} data-drills-create="1">
          <Icon k="plus" /> {tx.create}
        </button>
          </div>
        </>
      )}
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

/** Owner 2026-11-21: on a topic card, in how many of the 12 keys the skill is played well (fine or strong). */
function KeysCount({ cells, lang }: { cells?: KeyCell[] | null; lang: Lang }) {
  const n = (cells ?? []).filter((c) => c.status === 'ok' || c.status === 'strong').length;
  return <small data-keys-count={n}>{lang === 'he' ? `סולמות: ${n} / 12` : `Keys: ${n} / 12`}</small>;
}

/** The family card's key strip (key mastery): 12 thin cells in fifths order, a marker under weak keys. Piano, guitar and bass. */
export function HeatRow({ cells }: { cells?: KeyCell[] | null }) {
  return <KeyMap12 cells={cells} lang="en" label="" compact />;
}

/** A skill's 12-key map (key mastery): tap a key to practise the skill in it; weak keys named under the map. */
function SkillKeyMap({ lang, ds, f, items, start, onRun }: { lang: Lang; ds: DrillSettings; f: FamilyDef; items: Record<string, ItemState>; start?: number; onRun: (q: Drill[], i: number) => void }) {
  const sk = useMemo(() => skillKeysOf(f.id, items), [f.id, items]);
  const avail = useMemo(() => new Set(f.levels.flatMap((l) => levelKeys(l, ds.keyOrder))), [f, ds.keyOrder]);
  if (avail.size < 2) return null;
  const he = lang === 'he';
  const weak = sk?.weak ?? [];
  const line = weak.length ? (
    <>
      {he ? 'חלשים: ' : 'Weak: '}
      <bdi dir="ltr">{keyList(weak.slice(0, 4))}</bdi>
    </>
  ) : sk?.tried ? (
    he ? 'אין סולם חלש כרגע' : 'No weak key right now'
  ) : he ? (
    'עוד לא נמדד'
  ) : (
    'Not measured yet'
  );
  return (
    <div className="km-block" data-key-map-skill={f.id}>
      <div className="km-head">
        <b>{he ? 'סולמות' : 'Keys'}</b>
        <small>{line}</small>
      </div>
      <KeyMap12
        cells={sk?.cells}
        lang={lang}
        label={he ? `${f.title.he}: סולמות` : `${f.title.en}: keys`}
        has={(k) => avail.has(k)}
        onKey={(k) => {
          const q = skillDrillsInKey(f, items, ds.keyOrder, k, start);
          if (q.length) onRun(q, 0);
        }}
      />
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
  // SPEC-PRACTICE-KEYS §3: the family split by scale family (major · minor · melodic/harmonic modes · symmetric) where
  // it has more than one; a level shows under every group one of its items is in.
  const levelGroups = useMemo(() => new Map(f.levels.map((l) => [l.id, new Set(l.specs.flatMap((_, k) => specDrills(l, k, ds.keyOrder).slice(0, 1).map((d) => facetGroup(d))))])), [f, ds.keyOrder]);
  const famGroups = (['major', 'minor', 'mmhm', 'symmetric'] as FacetGroup[]).filter((g) => f.levels.some((l) => levelGroups.get(l.id)?.has(g)));
  const [grp, setGrp] = useState<FacetGroup | 'all'>('all');
  const levels = grp === 'all' ? f.levels : f.levels.filter((l) => levelGroups.get(l.id)?.has(grp));
  return (
    <div className="drill-levels">
      {ds.instrument !== 'drums' && <SkillKeyMap lang={lang} ds={ds} f={f} items={items} start={start} onRun={onRun} />}
      {famGroups.length > 1 && (
        <div className="chips key-groups" role="tablist" aria-label={lang === 'he' ? 'משפחת סולמות' : 'Scale family'}>
          {(['all', ...famGroups] as const).map((g) => (
            <button key={g} type="button" role="tab" aria-selected={grp === g} className={`chip ${grp === g ? 'on' : ''}`} onClick={() => setGrp(g)} data-family-group={g}>
              {g === 'all' ? (lang === 'he' ? 'הכל' : 'All') : GROUP_NAME[g][lang]}
            </button>
          ))}
        </div>
      )}
      {levels.map((l) => {
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
const GRADE_HE: Record<string, string> = { 'session: playback': 'מיומנויות סשן: חיקוי', 'session: improvising': 'מיומנויות סשן: אלתור', 'walking core': 'ליבת הבס המהלך', reading: 'קריאה', 'time & groove': 'זמן וגרוב', transcription: 'תמלול', 'pieces with a band': 'יצירות עם להקה', '2-chorus solo': 'סולו של שני סבבים', 'sight-read improvisation': 'אלתור מקריאה ראשונה', improvisation: 'אלתור', ballad: 'בלדה', blues: 'בלוז' };
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
          <Icon k="play" /> {lang === 'he' ? 'כל הווריאציות' : 'All variations'}
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
        <Icon k="play" /> {tx.allKeys}
      </button>
      <LevelRefs level={level} lang={lang} />
      <div className="heat" dir="ltr">
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
                    {keyName(drillKeyOf(d), drillMinorOf(d) || facetGroup(d) === 'minor').replace('b', '♭').replace('#', '♯')}
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

/** Chords heard by a microphone can't be followed note by note: those items keep the timed take. */
const micChordsOf = (d: Drill): boolean => !midi.devices.length && d.notes.some((n, k) => d.notes.some((o, j) => j !== k && Math.abs(o.beat - n.beat) < 1e-4));
/** No free-time step for this item: mic chords, a goal the microphone can't measure (loudness, pedal — it waits for a MIDI
 *  keyboard in the timed take), a checkpoint at target tempo, or automated runs (e2e) without ?rubato in the address. */
/** Automated runs (e2e) look at the review at length: hands-free there only with ?handsfree in the address. */
const HF_OFF = typeof navigator !== 'undefined' && navigator.webdriver && !new URLSearchParams(typeof location !== 'undefined' ? location.search : '').has('handsfree');
const noRubatoFor = (d: Drill, atTarget?: boolean): boolean => micChordsOf(d) || (!midi.devices.length && micUnmeasurable(d).length > 0) || RUBATO_OFF || !!atTarget;

function DrillRun({ lang, ds, cal, queue, start, items, onTake, onEnd, headphones, onHeadphones, kit, onIndex, atTarget, onCalRefine, own, onOwn, coach, coachBg, onKeyOrder, onTitle }: { /** The order of keys in a topic session (owner 2026-11-21: chromatic, or the circle of fifths up / down). */ onKeyOrder?: (o: KeyOrder) => void; /** SPEC-COACH-2 §3: where the player stands (self-report, level test) — the coach's start. */ coachBg?: CoachBackground; /** The practice coach (coach.ts): one family as a continuous, climbing, hands-free session; `queue` is unused. */ coach?: FamilyDef; /** The coach reports the item being played (the screen's title). */ onTitle?: (t: string) => void; /** "I use a different fingering": the player's own numbers per item, and the change. */ own?: OwnFingerings; onOwn?: (o: OwnFingerings) => void; /** B7: the velocity range widened from a real MIDI take. */ onCalRefine?: (c: DrillCalibration) => void; atTarget?: boolean; onIndex?: (i: number) => void; lang: Lang; ds: DrillSettings; cal: DrillCalibration; queue: Drill[]; start: number; items: Record<string, ItemState>; onTake: DrillsProps['onTake']; onEnd: (takes: number, clean: number) => void; headphones?: boolean; onHeadphones?: (h: boolean) => void; kit?: Settings['drumKit'] }) {
  const [beat, setBeat] = useState(-1);
  const tx = T[lang];
  const [i, setI] = useState(start);
  // The screen's header names the item being played (owner 2026-11-12: it kept the first item's title — "C major" over G).
  useEffect(() => onIndex?.(i), [i]); // eslint-disable-line react-hooks/exhaustive-deps
  // AUDIT-DEPTH-3 C6: a solo chorus rewritten in the editor replaces its item in the queue (same item id).
  const [edited, setEdited] = useState<Record<number, Drill>>({});
  const [chorusEd, setChorusEd] = useState(false);
  const local = useRef<Record<string, ItemState>>({});
  // The practice coach: its state, the take it asks for, its line after a take, pause, and the session's end.
  const coachRef = useRef<CoachState | null>(coach ? coachStart(coach, items, ds.keyOrder, Date.now(), coachBg) : null);
  const freeOk = (d: Drill) => !noRubatoFor(d, atTarget);
  const [cTake, setCTake] = useState<CoachTake | null>(() => (coach && coachRef.current ? coachTake(coach, coachRef.current, items, ds.keyOrder, freeOk) : null));
  const [cLine, setCLine] = useState<{ line: { en: string; he: string }; end: boolean; clean: boolean } | null>(null);
  const [cStarted, setCStarted] = useState(false);
  // The key order picked on the intro: the session is laid out again (before it starts only).
  useEffect(() => {
    if (!coach || cStarted) return;
    coachRef.current = coachStart(coach, items, ds.keyOrder, Date.now(), coachBg);
    setCTake(coachTake(coach, coachRef.current, items, ds.keyOrder, freeOk));
  }, [ds.keyOrder]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cPaused, setCPaused] = useState(false);
  const [cDemo, setCDemo] = useState(false);
  const cXp = useRef(0);
  const cTimer = useRef<number | null>(null);
  const cSpeech = useRef<AbortController | null>(null);
  useEffect(() => () => (cTimer.current && window.clearTimeout(cTimer.current), cSpeech.current?.abort()), []);
  const drill = coach ? cTake!.drill : (edited[i] ?? queue[i]);
  // Hands-free (owner 2026-11-21, app-wide): a list of items (a path step, the workout, a level) moves on by itself too —
  // after a take, one line (spoken / shown), then again / slower / the next stage / the next item, no button. Pause
  // holds it; any button of the review takes over. Singing and writing items keep their buttons.
  const hfOn = !coach && !!drill && !drill.sung && !drill.write && !drill.drumWrite && !HF_OFF;
  const hfMiss = useRef(0);
  const [hf, setHf] = useState<{ line: { en: string; he: string }; clean: boolean } | null>(null);
  const [hfPaused, setHfPaused] = useState(false);
  const hfTimer = useRef<number | null>(null);
  const hfSpeech = useRef<AbortController | null>(null);
  const hfAction = useRef<(() => void) | null>(null);
  const hfStop = () => {
    if (hfTimer.current) window.clearTimeout(hfTimer.current);
    hfTimer.current = null;
    hfSpeech.current?.abort();
    hfAction.current = null;
    setHf(null);
    setHfPaused(false);
  };
  useEffect(() => () => (hfTimer.current && window.clearTimeout(hfTimer.current), hfSpeech.current?.abort()), []);
  const hfSchedule = (line: { en: string; he: string }, clean: boolean, action: () => void) => {
    hfAction.current = action;
    setHf({ line, clean });
    hfSpeech.current?.abort();
    const sp = new AbortController();
    hfSpeech.current = sp;
    const t0 = performance.now();
    void tts
      .speak(line[lang], lang, sp.signal)
      .catch(() => {})
      .then(() => {
        if (sp.signal.aborted) return;
        hfTimer.current = window.setTimeout(() => {
          hfTimer.current = null;
          const a = hfAction.current;
          hfAction.current = null;
          setHf(null);
          a?.();
        }, Math.max(0, COACH_REVIEW_MS - (performance.now() - t0)) + 300);
      });
  };
  useEffect(() => void (coach && drill && onTitle?.(drill.title[lang])), [coach, drill, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const stateOf = (d: Drill) => local.current[d.itemId] ?? items[d.itemId] ?? newItem(d);
  // A checkpoint's technique part plays every item at its level's target tempo (SPEC-PATH-ROLE §4).
  const bpmOf = (d: Drill) => (atTarget ? itemTargetBpm(d) : stateOf(d).goalBpm);
  const [bpm, setBpm] = useState(() => (coach && cTake ? cTake.bpm : drill ? bpmOf(drill) : 60));
  const [res, setRes] = useState<{ m: TakeMetrics; lad: LadderResult } | null>(null);
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
  // Loop the spot (COURSE-FEEDBACK-UI slice 3): bars picked on the error map, played at −10 % until 2 clean passes.
  // Loop takes are practice: they never move the item's ladder or level.
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [loop, setLoop] = useState<{ from: number; to: number; passes: number } | null>(null);
  const [loopRes, setLoopRes] = useState<TakeMetrics | null>(null);
  // Slice 5: the running take's settled notes, drawn on the score while it is played (practice; calm = none).
  const [live, setLive] = useState<LiveTake | null>(null);
  // Slice 5: the count-in is running (the first head pulses); slice 8: the improvised notes heard (note-role dots).
  const [counting, setCounting] = useState(false);
  const [heard, setHeard] = useState<{ beat: number; midi: number }[] | null>(null);
  // Slice 5, take overlay: the previous take of the same item; "Last take" draws its ticks faded under this one's.
  const lastTake = useRef<{ id: string; m: TakeMetrics } | null>(null);
  const [prior, setPrior] = useState<TakeMetrics | null>(null);
  const [ghost, setGhost] = useState(false);
  // Encore (SPEC-PHRASE-STUDIO §4.1): the last take's notes, for "Keep this phrase".
  const lastPlayed = useRef<PlayedNote[]>([]);
  // The new-best-tempo moment, over the review; any tap closes it.
  const [best, setBest] = useState<{ bpm: number; prev: number; title: string } | null>(null);
  const bestPop = best ? <NewBestTempo lang={lang} bpm={best.bpm} prev={best.prev} title={best.title} onClose={() => setBest(null)} /> : null;
  useAnyNote(!drill, () => onEnd(count.current.takes, count.current.clean));
  // The coach's one press (start) and its end page: a note does it too.
  useAnyNote(!!coach && (!cStarted || !!cLine?.end), () => (cLine?.end ? onEnd(count.current.takes, count.current.clean) : document.querySelector<HTMLButtonElement>('[data-coach-start]')?.click()));
  // A review waiting (hands-free paused, or off): a note = Next.
  useAnyNote(!coach && !!drill && !!res && (!hf || hfPaused), () => go(i + 1));
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
    hfStop();
    hfMiss.current = 0;
    setRes(null);
    if (j >= queue.length) return onEnd(count.current.takes, count.current.clean);
    setI(j);
    setBpm(bpmOf(queue[j]));
    setAgain(false);
    setTake((t) => t + 1);
  };
  const done = (m: TakeMetrics, _played: PlayedNote[]) => {
    lastPlayed.current = _played;
    // MEASUREMENT-AUDIT B7: a real piano MIDI take refines the velocity range (only ever wider, a quarter step).
    if (onCalRefine && midi.devices.length && !isDrumDrill(drill) && drill.spec.instrument !== 'guitar' && drill.spec.instrument !== 'bass' && !drill.sung) {
      const r = refineCal(cal, _played.map((p) => p.vel));
      if (r) onCalRefine(r);
    }
    // The take also moves the player profile's timeline (SPEC-AI §8).
    void recordTakeAnalysis(drill, m, bpm, own).then(() => refreshProfile(undefined, undefined, { ...items, ...local.current })).catch(() => {});
    // BASS_AUDIT A4: a take counts toward the level only at the item's goal / the level's target tempo, never a "Slower" one.
    const st0 = stateOf(drill);
    const lad = applyTake(st0, m, bpm, new Date().toISOString(), ds, { targetBpm: itemTargetBpm(drill), slower: bpm < (st0.goalBpm ?? 0) * 0.99 });
    // Studio look: a ladder step cleared above the previous best tempo is the moment (one tap continues).
    const nb = newBestOf(st0.cleanBpm, lad.state.cleanBpm, m.verdict === 'clean');
    if (nb) setBest({ ...nb, title: drill.title[lang] });
    local.current[drill.itemId] = lad.state;
    const n = count.current.takes++;
    if (m.verdict === 'clean') count.current.clean++;
    onTake(lad.state, drillEvents(drill, m, new Date().toISOString(), session.current, n), drillXp(m), takeInfo(drill, m));
    setPrior(lastTake.current?.id === drill.itemId ? lastTake.current.m : null);
    lastTake.current = { id: drill.itemId, m };
    setSel(null);
    setRes({ m, lad });
    if (coach) return coachNext(m, drillXp(m));
    if (hfOn) {
      const nextD = queue[i + 1];
      const nextTx = nextD ? (lang === 'he' ? ` עכשיו: ${nextD.title.he}.` : ` Now: ${nextD.title.en}.`) : lang === 'he' ? ' זה הכול לרשימה.' : ' That is the list.';
      if (m.verdict === 'clean') {
        hfMiss.current = 0;
        if (lad.next.action === 'raise' && ds.continuous === 'raise-tempo')
          return hfSchedule({ he: `נקי. מהר יותר: ♩${lad.next.bpm}.`, en: `Clean. Faster: ♩${lad.next.bpm}.` }, true, () => (setRes(null), setBpm(lad.next.bpm), setAgain(true), setTake((t) => t + 1)));
        return hfSchedule({ he: `נקי.${nextTx}`, en: `Clean.${nextTx}` }, true, () => go(i + 1));
      }
      const n = ++hfMiss.current;
      const ml = missLine(m);
      if (n === 1) return hfSchedule({ he: `${ml.he} — שוב.`, en: `${ml.en} — again.` }, false, () => (setRes(null), setAgain(true), setTake((t) => t + 1)));
      if (n === 2) return hfSchedule({ he: `${ml.he}. לאט יותר.`, en: `${ml.en}. Slower.` }, false, () => (setRes(null), setAgain(true), setBpm((b) => Math.max(30, Math.round(b * 0.9))), setTake((t) => t + 1)));
      return hfSchedule({ he: `נחזור לזה אחר כך.${nextTx}`, en: `We'll come back to this.${nextTx}` }, false, () => go(i + 1));
    }
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
  const micChords = micChordsOf(drill);
  const noRubato = noRubatoFor(drill, atTarget);
  // Siskind's stop-start rubato ballad (Drill.rubatoOnly): always in free time — unless the microphone can't follow its chords.
  const rubatoOnly = !!drill.rubatoOnly && !micChords;
  const stage: RubatoStage | null = coach ? (noRubato ? null : (cTake?.stage ?? null)) : rubatoOnly ? 'free' : noRubato ? null : oneFree && hasRubato(drill) ? 'free' : rubatoStage(stateOf(drill), drill);
  // The coach after a take: its line (spoken / shown), then the next take starts by itself — no button (owner 2026-11-21).
  const coachNext = (m: TakeMetrics, xp: number) => {
    if (!coach || !coachRef.current || !cTake) return;
    cXp.current += xp;
    const after = { ...items, ...local.current };
    const nx = coachAfter(coach, coachRef.current, { ...cTake, stage }, m, after, ds.keyOrder, Date.now(), freeOk);
    coachRef.current = nx.state;
    setCLine({ line: nx.line, end: nx.end, clean: m.verdict === 'clean' });
    if (nx.end) return;
    cSpeech.current?.abort();
    const sp = new AbortController();
    cSpeech.current = sp;
    const t0 = performance.now();
    void tts
      .speak(nx.line[lang], lang, sp.signal)
      .catch(() => {})
      .then(() => {
        if (sp.signal.aborted) return;
        // The result stays on the score a moment (at least ~1.8 s), then the next take counts in.
        cTimer.current = window.setTimeout(() => coachGo(), Math.max(0, COACH_REVIEW_MS - (performance.now() - t0)) + 300);
      });
  };
  const coachGo = () => {
    if (!coach || !coachRef.current) return;
    cTimer.current = null;
    const t = coachTake(coach, coachRef.current, { ...items, ...local.current }, ds.keyOrder, freeOk);
    setCTake(t);
    setBpm(t.bpm);
    setRes(null);
    setStageRes(null);
    setCLine(null);
    setLive(null);
    setCDemo(t.demo && hearable(t.drill));
    setAgain(!(t.demo && hearable(t.drill)));
    setTake((k) => k + 1);
  };
  const takeDrill = stage === 'quarters' ? quartersDrill(drill) : drill;
  // Practice or calm (§4.1): live marks while the item is learned (free / quarters steps, its first clean takes at tempo).
  const liveOn = liveMarksOn(ds.liveMarks, { learningStep: stage !== null, cleanTakes: stateOf(drill).passLog?.length ?? (stateOf(drill).cleanBpm > 0 ? 2 : 0) });
  const stageDone = (m: TakeMetrics, st: RubatoStage) => {
    // A rubato-only item: the free take is the take (it counts; its target is its start tempo, off the ladder).
    if (rubatoOnly) return done({ ...m, bpm: bpm }, []);
    const before = stateOf(drill);
    let next = oneFree ? before : withStageTake(before, st, m);
    // The coach's shorter rubato for a further key (coach.ts coachStage): one clean free take, then its tempo.
    if (coach && cTake && st === 'free' && m.verdict === 'clean' && rubatoStage(next, drill) && !coachStage(cTake.level, cTake.spec, drill, { ...items, ...local.current, [drill.itemId]: next }, ds.keyOrder)) next = rubatoDoneByCoach(next, drill);
    local.current[drill.itemId] = next;
    count.current.takes++;
    // Measured practice: it shows on the profile and earns a little XP, but no rating events (no tempo was measured).
    if (st === 'quarters') void recordTakeAnalysis(takeDrill, m, QUARTERS_BPM, own).catch(() => {});
    onTake(next, [], Math.max(1, Math.floor(drillXp(m) / 2)), takeInfo(drill, m));
    setOneFree(false);
    setStageRes({ m, stage: st });
    if (coach) coachNext(m, Math.max(1, Math.floor(drillXp(m) / 2)));
    else if (hfOn) {
      const redo = () => (setStageRes(null), setAgain(true), setTake((t) => t + 1));
      if (m.verdict === 'clean') {
        hfMiss.current = 0;
        const ns = rubatoStage(next, drill);
        const line = ns === null ? { he: `נקי. עכשיו בטמפו: ♩${next.goalBpm}.`, en: `Clean. Now at tempo: ♩${next.goalBpm}.` } : ns === 'quarters' ? { he: 'נקי. עכשיו בזמן: ברבעים, ♩60.', en: 'Clean. Now in time: quarters at ♩60.' } : { he: 'נקי. עוד פעם אחת בלי קצב.', en: 'Clean. Once more in free time.' };
        return hfSchedule(line, true, redo);
      }
      const n = ++hfMiss.current;
      const ml = missLine(m);
      if (n < 3) return hfSchedule({ he: `${ml.he}. שוב, בלי למהר.`, en: `${ml.en}. Again, no rush.` }, false, redo);
      return hfSchedule({ he: 'נחזור לזה אחר כך.', en: "We'll come back to this." }, false, () => go(i + 1));
    }
  };
  // Piano fingering on the score: the review's "Other fingering?" and (the switch on) the next-key finger.
  const pianoFingered = !isGuitarDrill(drill) && !isDrumDrill(drill) && !drill.sung && hasFingering(drill);
  const fingerKeysOn = pianoFingered && ds.showFingering && stage !== 'free' && drill.show !== 'none';
  const freeN = Math.min(RUBATO_CLEAN, (stateOf(drill).rubato?.free ?? 0) + 1);
  const he = lang === 'he';
  const stageTx = rubatoOnly ? (he ? 'רובאטו: אקורד, עצירה, ואז המנגינה — בלי קצב' : 'Rubato: a chord, a stop, then the melody — no pulse') : stage === 'free' ? (he ? `בלי קצב — הצלילים בלבד (${freeN}/${RUBATO_CLEAN})` : `Free time — the notes only (${freeN}/${RUBATO_CLEAN})`) : stage === 'quarters' ? (he ? 'ברבעים, ♩60 — צליל על כל פעמה' : 'In quarters, ♩60 — a note on every beat') : null;
  // The hands-free bar over a review: the line, and pause / resume. Any other button of the review takes over.
  const hfBar = hf ? (
    <div className={`coach-bar ${hf.clean ? 'ok' : 'miss'}`} data-hf-bar="1">
      <p className="coach-line" aria-live="polite">
        {hf.line[lang]}
      </p>
      <span className="coach-btns">
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            if (hfPaused) {
              setHfPaused(false);
              const a = hfAction.current;
              hfAction.current = null;
              setHf(null);
              a?.();
            } else {
              setHfPaused(true);
              if (hfTimer.current) window.clearTimeout(hfTimer.current);
              hfTimer.current = null;
              hfSpeech.current?.abort();
            }
          }}
          aria-label={hfPaused ? (he ? 'להמשיך' : 'Resume') : he ? 'השהיה' : 'Pause'}
          data-hf-pause={hfPaused ? 'paused' : 'running'}
        >
          <Icon k={hfPaused ? 'play' : 'pause'} size={18} />
        </button>
      </span>
    </div>
  ) : null;
  const hfTakeOver = (e: React.MouseEvent) => {
    const b = (e.target as HTMLElement).closest('button');
    if (hf && b && !b.closest('[data-hf-bar]')) hfStop();
  };
  if (coach && cTake) {
    const cs = coachRef.current!;
    const stepTx = he ? `שלב ${cs.step + 1} מתוך ${cs.steps.length}` : `Step ${cs.step + 1} of ${cs.steps.length}`;
    const endNow = () => {
      if (cTimer.current) window.clearTimeout(cTimer.current);
      cSpeech.current?.abort();
      setCLine({ line: coachSummary(coach, cs, { he: '', en: '' }), end: true, clean: true });
    };
    // The session's end: what happened, the XP, and back.
    if (cLine?.end)
      return (
        <section className="drill-result v-clean coach-end" data-coach-end="1">
          <h2>{he ? 'סוף הסשן' : 'Session done'}</h2>
          <p>{cLine.line[lang].trim()}</p>
          <p className="coach-xp" data-coach-xp={cXp.current}>
            <bdi dir="ltr">+{cXp.current} XP</bdi>
          </p>
          <button className="btn primary" onClick={() => onEnd(count.current.takes, count.current.clean)} data-coach-back="1">
            {tx.backToLevel}
          </button>
        </section>
      );
    // Before the first take: the one press that starts the session.
    if (!cStarted)
      return (
        <section className="coach-intro" data-coach-intro="1">
          <p className="coach-step">
            {stepTx} · {cTake.level.title[lang]}
          </p>
          <h2>{cTake.kind === 'warmup' ? (he ? 'חימום' : 'Warm-up') : he ? 'אימון רציף' : 'Continuous practice'}</h2>
          <p>{announce(cTake, lang)}</p>
          <p className="muted">{he ? 'הידיים נשארות על הכלי: אחרי כל נגינה ממשיכים לבד, עם הערה קצרה. אפשר לעצור בכל רגע.' : 'Hands stay on the instrument: after each take the session moves on by itself, with a short note. Pause any time.'}</p>
          {onKeyOrder && (
            <div className="chips coach-order" role="radiogroup" aria-label={he ? 'סדר הסולמות' : 'Key order'}>
              {(['fifths-up', 'fifths-down', 'chromatic-up', 'chromatic-down', 'fingering'] as KeyOrder[]).map((o) => (
                <button key={o} type="button" role="radio" aria-checked={ds.keyOrder === o} className={`chip ${ds.keyOrder === o ? 'on' : ''}`} onClick={() => onKeyOrder(o)} data-coach-order={o}>
                  {tx.orders[o]}
                </button>
              ))}
            </div>
          )}
          <button
            className="btn mega primary"
            onClick={() => {
              void piano.unlock();
              setCStarted(true);
              const demo = cTake.demo && hearable(cTake.drill);
              setCDemo(demo);
              setAgain(!demo);
              setTake((k) => k + 1);
            }}
            data-coach-start="1"
          >
            <Icon k="play" /> {he ? 'מתחילים' : 'Start'}
          </button>
        </section>
      );
    const shownRes = res?.m ?? stageRes?.m ?? null;
    const bar = (
      <div className={`coach-bar ${cLine ? (cLine.clean ? 'ok' : 'miss') : ''}`} data-coach-bar="1">
        <p className="coach-line" aria-live="polite" data-coach-line={cLine ? '1' : '0'}>
          {cLine ? cLine.line[lang] : cDemo ? (he ? 'מקשיבים קודם…' : 'Listen first…') : announce({ ...cTake, stage }, lang)}
        </p>
        <span className="coach-meta">{stepTx}</span>
        <span className="coach-btns">
          {cLine && !cLine.end && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                if (cPaused) {
                  setCPaused(false);
                  coachGo();
                } else {
                  setCPaused(true);
                  if (cTimer.current) window.clearTimeout(cTimer.current);
                  cTimer.current = null;
                  cSpeech.current?.abort();
                }
              }}
              aria-label={cPaused ? (he ? 'להמשיך' : 'Resume') : he ? 'השהיה' : 'Pause'}
              data-coach-pause={cPaused ? 'paused' : 'running'}
            >
              <Icon k={cPaused ? 'play' : 'pause'} size={18} />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={endNow} aria-label={he ? 'לסיים את הסשן' : 'End session'} data-coach-stop="1">
            <Icon k="stop" size={18} />
          </button>
        </span>
      </div>
    );
    if (shownRes)
      return (
        <div className="drill-run coach-run" data-drill={drill.itemId} data-coach="result">
          {bar}
          <DrillScore drill={stageRes?.stage === 'quarters' ? quartersDrill(drill) : drill} ds={ds} result={shownRes} beat={-1} lang={lang} />
          {bestPop}
        </div>
      );
    if (cDemo)
      return (
        <div className="drill-run coach-run" data-drill={drill.itemId} data-coach="demo">
          {bar}
          <DrillScore drill={takeDrill} ds={ds} beat={beat} lang={lang} bpm={stage === 'quarters' ? QUARTERS_BPM : bpm} />
          <CoachDemo drill={takeDrill} bpm={stage === 'quarters' ? QUARTERS_BPM : cTake.bpm} lang={lang} onBeat={setBeat} onDone={() => (setBeat(-1), setCDemo(false), setAgain(true), setTake((k) => k + 1))} />
        </div>
      );
    return (
      <div className="drill-run coach-run" data-drill={drill.itemId} data-coach="take" data-coach-stage={stage ?? 'tempo'}>
        {bar}
        <DrillScore drill={shownDrill(takeDrill, own)} ds={ds} beat={beat} lang={lang} bpm={bpm} live={live} cue={counting} />
        {fingerKeysOn && <FingerKeys drill={shownDrill(takeDrill, own)} beat={beat} lang={lang} />}
        {stage === 'free' && <RubatoTake key={`${drill.itemId}:free:${take}`} autoStart={again} drill={drill} lang={lang} cal={cal} onDone={(m) => (setBeat(-1), stageDone(m, 'free'))} onBeat={setBeat} />}
        {stage === 'quarters' && <DrillTake key={`${drill.itemId}:q:${take}`} autoStart={again} drill={takeDrill} bpm={QUARTERS_BPM} lang={lang} cal={cal} onDone={(m) => (setBeat(-1), stageDone(m, 'quarters'))} onBeat={setBeat} drumsOk={headphones} onDrums={onHeadphones} kit={kit} liveMarks={liveOn} onLive={setLive} onCount={setCounting} />}
        {!stage && <DrillTake key={`${drill.itemId}:${take}`} autoStart={again} drill={drill} bpm={bpm} lang={lang} cal={cal} onDone={(m, p) => (setBeat(-1), done(m, p))} onBeat={setBeat} drumsOk={headphones} onDrums={onHeadphones} kit={kit} liveMarks={liveOn} onLive={setLive} onCount={setCounting} />}
      </div>
    );
  }
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
      <div className="drill-run" data-drill={drill.itemId} data-rubato-result={stageRes.stage} onClickCapture={hfTakeOver}>
        {hfBar}
        <DrillScore drill={stageRes.stage === 'quarters' ? quartersDrill(drill) : drill} ds={ds} result={stageRes.m} beat={-1} lang={lang} />
        <TakeReview drill={drill} cal={cal}
          m={stageRes.m}
          free={stageRes.stage === 'free'}
          next={line}
          lang={lang}
          onAgain={() => (setStageRes(null), setAgain(stageRes.m.verdict === 'clean' || stageRes.stage !== 'free'), setTake((t) => t + 1))}
          onSlower={() => (setStageRes(null), setTake((t) => t + 1))}
          onNext={() => (setStageRes(null), go(i + 1))}
        />
      </div>
    );
  }
  const exitLoop = () => (setLoop(null), setLoopRes(null), setRes(null), setAgain(false), setTake((t) => t + 1));
  if (loop) {
    const ld = sliceDrill(drill, loop.from, loop.to);
    const lb = loopBpm(bpm);
    const label = loop.from === loop.to ? `${loop.from + 1}` : `${loop.from + 1}–${loop.to + 1}`;
    const whole = he ? 'כל התרגיל' : 'Whole item';
    const passed = loop.passes >= LOOP_PASSES;
    return (
      <div className="drill-run" data-drill={drill.itemId} data-loop={label} data-loop-passes={loop.passes}>
        <p className="loop-bar" data-loop-bar="1">
          <b>{he ? 'לולאה' : 'Loop'}</b>
          <span>
            {loop.from === loop.to ? (he ? 'תיבה' : 'bar') : he ? 'תיבות' : 'bars'} <bdi dir="ltr">{label}</bdi> · <bdi dir="ltr">♩ {lb}</bdi>
          </span>
          <span className="loop-passes" aria-label={he ? `${loop.passes} מתוך ${LOOP_PASSES} נקיים` : `${loop.passes} of ${LOOP_PASSES} clean`}>
            {Array.from({ length: LOOP_PASSES }, (_, k) => (
              <i key={k} className={k < loop.passes ? 'on' : ''} />
            ))}
          </span>
          <button className="link" onClick={exitLoop} data-loop-exit="1">
            {whole}
          </button>
        </p>
        <DrillScore drill={ld} ds={ds} result={loopRes} beat={loopRes ? -1 : beat} lang={lang} bpm={lb} live={loopRes ? null : live} cue={!loopRes && counting} />
        {!loopRes && (
          <DrillTake
            key={`loop:${loop.from}-${loop.to}:${take}`}
            autoStart={again}
            drill={ld}
            bpm={lb}
            lang={lang}
            cal={cal}
            onDone={(m) => (setBeat(-1), setLoopRes(m), setLoop((l) => (l ? { ...l, passes: l.passes + (m.verdict === 'clean' ? 1 : 0) } : l)))}
            onBeat={setBeat}
            drumsOk={headphones}
            onDrums={onHeadphones}
            kit={kit}
            liveMarks={ds.liveMarks !== 'never'}
            onLive={setLive}
            onCount={setCounting}
          />
        )}
        {loopRes && (
          <TakeReview drill={drill} cal={cal}
            m={loopRes}
            lang={lang}
            next={passed ? (he ? `${LOOP_PASSES} נקיים — בחזרה לכל התרגיל` : `${LOOP_PASSES} clean — back to the whole item`) : he ? `נקי ${loop.passes}/${LOOP_PASSES} ב־♩ ${lb}` : `Clean ${loop.passes}/${LOOP_PASSES} at ♩ ${lb}`}
            onAgain={() => (setLoopRes(null), setAgain(true), setTake((t) => t + 1))}
            onNext={exitLoop}
            nextLabel={whole}
          />
        )}
      </div>
    );
  }
  // The error map of the last take (one cell a bar) and the bars Loop plays: the picked ones, or the worst bar.
  const bm = res ? barMarks(takeDrill, res.m) : [];
  const wb = worstBar(bm);
  const loopSel: [number, number] | null = sel ?? (wb !== null ? [wb, wb] : null);
  const pickBar = (i: number) => setSel((cur) => (cur && cur[0] === cur[1] && cur[0] !== i ? [Math.min(cur[0], i), Math.max(cur[0], i)] : [i, i]));
  return (
    <div className="drill-run" data-drill={drill.itemId} onClickCapture={hfTakeOver}>
      {res && hfBar}
      <div className="drill-goal tempo-ladder" data-tempo-step={stage ?? 'tempo'}>
        <span className="tl-count">
          <bdi dir="ltr">
            {i + 1}/{queue.length}
          </bdi>
        </span>
        {/* COURSE-FEEDBACK-UI §4.1: the tempo steps as chips — free → quarters → tempo (current ink, passed ✓). */}
        <ol className="tl-chips" aria-label={he ? 'שלבי טמפו' : 'tempo steps'}>
          {(rubatoOnly ? ['free'] : noRubato || !hasRubato(drill) ? ['tempo'] : ['free', 'quarters', 'tempo']).map((k, j, all) => {
            const cur = (stage ?? 'tempo') === k;
            const passed = all.indexOf(stage ?? 'tempo') > j;
            return (
              <li key={k} className={`tl-chip ${cur ? 'cur' : ''} ${passed ? 'passed' : ''}`} aria-current={cur ? 'step' : undefined} data-step={k}>
                {passed && <span aria-hidden="true">✓ </span>}
                {k === 'free' ? (
                  he ? (rubatoOnly ? 'רובאטו' : 'חופשי') : rubatoOnly ? 'Rubato' : 'Free'
                ) : (
                  <bdi dir="ltr">
                    {k === 'tempo' && drill.pulse === 8 ? '♪' : '♩'} {k === 'quarters' ? QUARTERS_BPM : bpm}
                  </bdi>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {drill.goal.improv?.cards.length ? (
        // Rule-card items: the rules on screen (they were only in the truncated title).
        <ul className="rule-chips" aria-label={he ? 'כללים' : 'rules'} data-rule-chips={drill.goal.improv.cards.length}>
          {drill.goal.improv.cards.map((c, k) => (
            <li key={c} data-rule-n={k + 1}>
              {/* Slice 8: the rule's number — the same number marks a bar that broke it on the chart. */}
              {drill.goal.improv!.cards.length > 1 && <i className="rc-n" aria-hidden="true">{k + 1}</i>}
              {(RULE_NAME as Record<string, { en: string; he: string }>)[c]?.[lang] ?? c}
            </li>
          ))}
        </ul>
      ) : null}
      {std && <ListenOriginal id={std.ref.id} lang={lang} practiceKey={std.key} compact />}
      {/* BASS_NICHE_PLAN J4: a drill with a form shows its road map (sections, the bar being played, a cue a bar ahead). */}
      {drill.form && <RoadMapStrip drill={drill} beat={res ? -1 : beat} bpm={bpm} lang={lang} />}
      {stageTx && !res && (
        <p className="drill-stage" data-rubato-stage={stage}>
          <b>{stageTx}</b>
          {!oneFree && !rubatoOnly && (
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
      <DrillScore drill={shownDrill(takeDrill, own)} ds={ds} result={res?.m} beat={res ? -1 : beat} lang={lang} bpm={bpm} live={res ? null : live} loop={res ? loopSel : null} cue={!res && counting} prior={res && ghost ? prior : null} heard={res ? null : heard} />
      {/* Studio look: the next key and its finger (small — the fingering is a recommendation), while a fingered piano item is played. */}
      {!res && !writing && fingerKeysOn && <FingerKeys drill={shownDrill(takeDrill, own)} beat={beat} lang={lang} />}
      {drill.spec.kind === 'sl-chorus' && !res && (
        <p className="drill-stage">
          <button className="btn small ghost" onClick={() => setChorusEd(true)} data-chorus-open="1">
            {he ? 'לכתוב את הכורוס' : 'Write your chorus'}
          </button>
        </p>
      )}
      {chorusEd && (
        <SoloChorusEditor
          lang={lang}
          inst={drill.spec.instrument === 'guitar' || drill.spec.instrument === 'bass' ? drill.spec.instrument : 'piano'}
          form={drill.spec.option ?? 0}
          keyPc={drill.spec.key}
          onClose={(saved) => {
            setChorusEd(false);
            if (saved) {
              setEdited((e) => ({ ...e, [i]: generate(drill.spec) }));
              setTake((t) => t + 1);
            }
          }}
        />
      )}
      {!res && !writing && stage === 'free' && <RubatoTake key={`${drill.itemId}:free:${take}`} autoStart={again} drill={drill} lang={lang} cal={cal} onDone={(m) => (setBeat(-1), stageDone(m, 'free'))} onBeat={setBeat} />}
      {!res && !writing && stage === 'quarters' && <DrillTake key={`${drill.itemId}:q:${take}`} autoStart={again} drill={takeDrill} bpm={QUARTERS_BPM} lang={lang} cal={cal} onDone={(m) => (setBeat(-1), stageDone(m, 'quarters'))} onBeat={setBeat} drumsOk={headphones} onDrums={onHeadphones} kit={kit} liveMarks={liveOn} onLive={setLive} onCount={setCounting} />}
      {!res && !writing && !stage && <DrillTake key={`${drill.itemId}:${take}`} autoStart={again} drill={drill} bpm={bpm} lang={lang} cal={cal} onDone={(m, p) => (setBeat(-1), drill.write || drill.drumWrite ? setWriting({ m, p }) : done(m, p))} onBeat={setBeat} drumsOk={headphones} onDrums={onHeadphones} kit={kit} liveMarks={liveOn} onLive={setLive} onCount={setCounting} onHeard={setHeard} />}
      {/* Ear L7: write the line after playing it; the written grade joins the take's verdict. */}
      {!res && writing && !drill.drumWrite && <TranscribeWrite drill={drill} lang={lang} onDone={(g) => (setWriting(null), done(withWritten(writing.m, g), writing.p))} />}
      {!res && writing && drill.drumWrite && <DrumWrite drill={drill} lang={lang} onDone={(g) => (setWriting(null), done(withDrumWrite(writing.m, g, drill), writing.p))} />}
      {res && (
        <>
          <ErrorMap marks={bm} sel={loopSel} onPick={pickBar} lang={lang} />
          <TakeReview drill={drill} cal={cal}
            m={res.m}
            lang={lang}
            next={res.lad.message[lang]}
            onLoop={loopSel && bm.length > 1 && !stage ? () => (setLoop({ from: loopSel[0], to: loopSel[1], passes: 0 }), setLoopRes(null), setAgain(true), setTake((t) => t + 1)) : undefined}
            loopLabel={loopSel ? (loopSel[0] === loopSel[1] ? `${loopSel[0] + 1}` : `${loopSel[0] + 1}–${loopSel[1] + 1}`) : undefined}
            onAgain={() => (setRes(null), setAgain(true), setTake((t) => t + 1))}
            onSlower={() => (setRes(null), setAgain(true), setBpm((b) => Math.max(30, Math.round(b * 0.9))), setTake((t) => t + 1))}
            onNext={() => go(i + 1)}
            lastTake={prior ? { on: ghost, onToggle: () => setGhost((g) => !g) } : undefined}
            fingering={onOwn && pianoFingered ? <OwnFingeringLink lang={lang} drill={drill} own={own} onChange={onOwn} /> : undefined}
            onKeep={lastPlayed.current.length >= 3 && !isDrumDrill(drill) ? () => keepPhrase({ kind: 'drill', instrument: drill.spec.instrument === 'guitar' || drill.spec.instrument === 'bass' ? drill.spec.instrument : 'piano', title: drill.title, source: midi.devices.length ? 'midi' : 'mic', notes: lastPlayed.current.map((p) => ({ pitch: p.pitch, on: p.on, off: p.off, vel: p.vel })), bpm: res.m.bpm || bpm, t0: 0, meter: drill.meter, graded: true, itemId: drill.itemId, ...(drill.chart?.length ? { chart: drill.chart.join(' | ') } : {}) }, loopSel ? { from: loopSel[0] * drill.meter, to: (loopSel[1] + 1) * drill.meter } : null) : undefined}
            onFree={hasRubato(drill) && !noRubato && res.m.accuracy < BACK_TO_RUBATO ? () => (setRes(null), setOneFree(true), setAgain(false), setTake((t) => t + 1)) : undefined}
          >
          {/* AUDIT-DEPTH-3 C5 + slice 8: the rule cards of an improvised take, one compact line. With the chart on screen:
              "Rules kept in 6/8 bars" (its corner tabs counted), then each rule by its number (the chips name them). */}
          {res.m.improv &&
            res.m.improv.length > 0 &&
            (() => {
              const rk = drill.goal.improv && drill.chart?.length ? rulesKept(chartCells(takeDrill, res.m)) : null;
              const cards = drill.goal.improv?.cards ?? [];
              return (
                <p className="drill-rh" data-improv-cards={res.m.improv.filter((c) => c.pass).length} {...(rk ? { 'data-rules-kept': `${rk.kept}/${rk.of}` } : {})}>
                  {rk && (
                    <span className="rules-kept">
                      {he ? 'הכללים נשמרו ב־' : 'Rules kept in '}
                      <bdi dir="ltr">
                        {rk.kept}/{rk.of}
                      </bdi>{' '}
                      {he ? 'תיבות' : 'bars'}
                    </span>
                  )}
                  {res.m.improv.map((c, k) => (
                    <span key={c.card} className={c.pass ? 'ok' : 'miss'} data-card={c.card} data-card-pass={c.pass ? '1' : '0'}>
                      {k > 0 || rk ? ' · ' : ''}
                      {rk && cards.length > 1 ? (
                        <i className="rc-n" aria-label={(RULE_NAME as Record<string, { en: string; he: string }>)[c.card]?.[lang] ?? c.card}>
                          {cards.indexOf(c.card) + 1}
                        </i>
                      ) : (
                        <>{(RULE_NAME as Record<string, { en: string; he: string }>)[c.card]?.[lang] ?? c.card} </>
                      )}
                      <b dir="ltr">
                        {c.ok}/{c.total}
                      </b>
                    </span>
                  ))}
                </p>
              );
            })()}
          {/* Siskind / MTNA rubric (phraseOrg.ts): phrasing and note choice of an improvised take, one line; the tip only at the two unacceptable ends. */}
          {res.m.phraseOrg && (
            <p className="drill-rh" data-phrase-band={res.m.phraseOrg.band} data-note-band={res.m.phraseOrg.noteBand ?? undefined}>
              <span className={res.m.phraseOrg.band === 'organized' || res.m.phraseOrg.band === 'varied' ? 'ok' : 'miss'}>
                {lang === 'he' ? 'משפטים' : 'Phrasing'}: {PHRASE_BAND_NAME[res.m.phraseOrg.band][lang]}
              </span>
              {res.m.phraseOrg.noteBand && (
                <span className={res.m.phraseOrg.noteBand === 'colourful' ? 'ok' : 'miss'}>
                  {' · '}
                  {lang === 'he' ? 'צלילים' : 'Notes'}: {NOTE_BAND_NAME[res.m.phraseOrg.noteBand][lang]}
                </span>
              )}
              {(res.m.phraseOrg.band === 'monotonous' || res.m.phraseOrg.band === 'random') && <small> — {res.m.phraseOrg.tip[lang]}</small>}
            </p>
          )}
          </TakeReview>
        </>
      )}
      {bestPop}
    </div>
  );
}

/** The coach's pause on the result before the next take counts in (plus the spoken line). */
const COACH_REVIEW_MS = 1800;

/** A new step: the coach plays it once (cursor running), then the take counts in. Skippable. */
function CoachDemo({ drill, bpm, lang, onBeat, onDone }: { drill: Drill; bpm: number; lang: Lang; onBeat: (b: number) => void; onDone: () => void }) {
  const fin = useRef(onDone);
  fin.current = onDone;
  const ac = useRef<AbortController | null>(null);
  const skip = useRef<() => void>(() => {});
  useEffect(() => {
    const a = new AbortController();
    ac.current = a;
    let done = false;
    const end = () => void (!done && ((done = true), window.clearTimeout(guard), fin.current()));
    // Skip ends the demo at once, whatever the sound is doing (0.110.2: it waited on a sound that never started).
    skip.current = () => (a.abort(), end());
    // And a demo that runs far past its length (no sound) ends by itself.
    const guard = window.setTimeout(end, (Math.max(drill.beats, 1) * 60) / Math.max(30, bpm) * 1000 + 4000);
    void playDrill(drill, bpm, a.signal, onBeat)
      .catch(() => {})
      .then(() => window.setTimeout(end, a.signal.aborted ? 0 : 500));
    return () => (a.abort(), window.clearTimeout(guard));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="drill-take coach-demo" data-coach-demo="1">
      <button type="button" className="link" onClick={() => skip.current()} data-coach-skip-demo="1">
        {lang === 'he' ? 'לדלג ולנגן' : 'Skip and play'}
      </button>
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
        <div className="row" data-live-marks-row="1">
          <span>{lang === 'he' ? 'סימונים בזמן הנגינה' : 'Live marks'}</span>
          <div className="chips" role="radiogroup">
            {(['always', 'learning', 'never'] as LiveMarksPref[]).map((v) => (
              <button key={v} role="radio" aria-checked={(ds.liveMarks ?? 'learning') === v} className={`chip ${(ds.liveMarks ?? 'learning') === v ? 'on' : ''}`} onClick={() => onChange({ liveMarks: v })} data-live-marks={v}>
                {v === 'always' ? (lang === 'he' ? 'תמיד' : 'Always') : v === 'learning' ? (lang === 'he' ? 'בזמן הלמידה' : 'While learning') : lang === 'he' ? 'אף פעם' : 'Never'}
              </button>
            ))}
          </div>
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
      <div className="row" data-live-marks-row="1">
        <span>{lang === 'he' ? 'סימונים בזמן הנגינה' : 'Live marks'}</span>
        <div className="chips" role="radiogroup">
          {(['always', 'learning', 'never'] as LiveMarksPref[]).map((v) => (
            <button key={v} role="radio" aria-checked={(ds.liveMarks ?? 'learning') === v} className={`chip ${(ds.liveMarks ?? 'learning') === v ? 'on' : ''}`} onClick={() => onChange({ liveMarks: v })} data-live-marks={v}>
              {v === 'always' ? (lang === 'he' ? 'תמיד' : 'Always') : v === 'learning' ? (lang === 'he' ? 'בזמן הלמידה' : 'While learning') : lang === 'he' ? 'אף פעם' : 'Never'}
            </button>
          ))}
        </div>
      </div>
      {toggle('inPath', tx.inPath)}
      {toggle('inWorkout', tx.inWorkout)}
      <label className="row" data-focus-weak-keys="1">
        <input type="checkbox" checked={ds.focusWeakKeys !== false} onChange={(e) => onChange({ focusWeakKeys: e.target.checked })} /> {lang === 'he' ? 'דגש על סולמות חלשים' : 'Focus on weak keys'}
      </label>
      <button className="btn ghost" onClick={onCalib}>
        {tx.calib}
      </button>
    </div>
  );
}

/**
 * MEASUREMENT-AUDIT B7: the velocity range from several presses at each end (their medians), then an optional p / mf /
 * f check that the three levels come out apart. One stray press no longer moves every band.
 */
function Calibration({ lang, cal, onSave }: { lang: Lang; cal: DrillCalibration; onSave: (c: DrillCalibration) => void }) {
  const tx = T[lang];
  const [c, setC] = useState(cal);
  const [listen, setListen] = useState<'min' | 'max' | 'p' | 'mf' | 'f' | null>(null);
  const [got, setGot] = useState<Record<'min' | 'max' | 'p' | 'mf' | 'f', number[]>>({ min: [], max: [], p: [], mf: [], f: [] });
  const off = useRef<(() => void) | null>(null);
  useEffect(() => () => off.current?.(), []);
  const capture = (which: 'min' | 'max' | 'p' | 'mf' | 'f') => {
    off.current?.();
    setListen(which);
    setGot((g) => ({ ...g, [which]: [] }));
    const vs: number[] = [];
    off.current = midi.onNote((_m, on, _at, vel) => {
      if (!on) return;
      vs.push(vel);
      setGot((g) => ({ ...g, [which]: [...vs] }));
      if (vs.length >= CAL_PRESSES) {
        setListen(null);
        off.current?.();
        off.current = null;
      }
    });
  };
  const range = calFromPresses(got.min, got.max);
  const cur = range ? { ...c, ...range } : c;
  if (range && (range.velMin !== c.velMin || range.velMax !== c.velMax)) setC(cur);
  const chk = got.p.length >= 3 && got.mf.length >= 3 && got.f.length >= 3 ? checkLevels(cur, got.p, got.mf, got.f) : null;
  return (
    <div className="drill-opts card" data-vel-cal="1">
      <div className="row">
        <span>{tx.range}</span>
        <b dir="ltr">
          {cur.velMin} – {cur.velMax}
        </b>
      </div>
      <p className="field-hint">{MT.velHow[lang]}</p>
      <div className="row">
        <button className={`btn ${listen === 'min' ? 'primary' : ''}`} onClick={() => capture('min')} data-cal-soft={got.min.length}>
          {tx.softest} <bdi dir="ltr">{got.min.length}/{CAL_PRESSES}</bdi>
        </button>
        <button className={`btn ${listen === 'max' ? 'primary' : ''}`} onClick={() => capture('max')} data-cal-loud={got.max.length}>
          {tx.loudest} <bdi dir="ltr">{got.max.length}/{CAL_PRESSES}</bdi>
        </button>
      </div>
      {range && (
        <>
          <p className="field-hint">{MT.velCheck[lang]}</p>
          <div className="row">
            {(['p', 'mf', 'f'] as const).map((l) => (
              <button key={l} className={`btn small ${listen === l ? 'primary' : 'ghost'}`} onClick={() => capture(l)} data-cal-level={l}>
                <bdi dir="ltr">
                  {l} {got[l].length}/{CAL_PRESSES}
                </bdi>
              </button>
            ))}
          </div>
          {chk && <p className={`field-hint ${chk.apart ? '' : 'warn'}`} data-cal-check={chk.apart ? 'ok' : 'bad'}>{(chk.apart ? MT.velCheckOk : MT.velCheckBad)[lang]}</p>}
        </>
      )}
      <button className="btn primary" onClick={() => (off.current?.(), onSave({ ...cur, velMax: Math.max(cur.velMax, cur.velMin + 10) }))}>
        {tx.save}
      </button>
    </div>
  );
}

type LevelTestProps = { lang: Lang; ds: DrillSettings; cal: DrillCalibration; items: Record<string, ItemState>; onTake: DrillsProps['onTake']; onDone: (start: Partial<Record<FamilyId, number>> | null) => void; midiOctave: number; onOctave: (o: number) => void; onBassTuning?: (t: string) => void; kit?: Settings['drumKit']; /** SPEC-JAZZ-FOLD: the jazz pack is closed in the course — no jazz sections or steps. */ noJazz?: boolean };
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
function SectionLevelTest({ lang, ds, cal, items, onTake, onDone, midiOctave, onOctave, kit, bassTuning, noJazz }: LevelTestProps & { bassTuning?: string }) {
  const tx = PIANO_TEST_TX[lang];
  const inst = ds.instrument ?? 'piano';
  const cat = useMemo(() => familiesOf(inst), [inst]);
  // Only steps this player's setup shows (guitar add-ons, the bass track and tuning, a practice pad or acoustic kit),
  // and on piano without MIDI only what a microphone can measure (loudness, release, pedal can never pass by mic).
  const strands = useMemo(() => {
    const byMic = !midi.devices.length;
    const drumMic = inst === 'drums' ? drumMicOf(kit) : undefined;
    const shown = new Set(shownFamilies({ ...ds, bassTuning, drumMic }).flatMap((f) => f.levels.map((l) => l.id)));
    // and every piano level the course path teaches (the jazz pianist's core scales and arpeggios, R8)
    if (inst === 'piano') for (const id of pathPianoLevels(ds)) shown.add(id);
    return strandsFor(inst, ds.emphasis, { mic: byMic && inst === 'piano', upright: bassTuning === 'upright' || bassTuning === 'bass-fretless' })
      .map((x) => ({
        ...x,
        rungs: x.rungs
          .map((r) => {
            const lv = cat.flatMap((f) => f.levels).find((l) => l.id === r.level);
            if (!lv || !shown.has(lv.id)) return null;
            // SPEC-JAZZ-FOLD: a beginner's test (jazz pack closed) asks no jazz levels.
            const fam = cat.find((f) => f.levels.some((l) => l.id === lv.id));
            if (noJazz && fam && isJazzStep({ ladder: { family: fam.id, ref: lv.id } as never })) return null;
            const key = Array.isArray(lv.keys) && !lv.keys.includes(r.key) ? lv.keys[0] : r.key;
            const d0 = withBassTuning([generate({ ...(lv.specs[r.spec ?? 0] ?? lv.specs[0]), key })], bassTuning)[0];
            // one phone screen: a long one-hand scale (the touch steps by microphone) shows two lines at a time
            const drill = inst === 'piano' && d0.notes.length > 16 && !d0.paged ? { ...d0, paged: true } : d0;
            if (inst === 'piano' && byMic && micUnmeasurable(drill).length) return null;
            return { ...r, drill, title: lv.title };
          })
          .filter((x): x is NonNullable<typeof x> => !!x),
      }))
      .filter((x) => x.rungs.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, inst, ds.emphasis, bassTuning, kit, noJazz]);
  const [started, setStarted] = useState(false);
  const [si, setSi] = useState(0);
  const [st, setSt] = useState<StrandState>(() => startState(strands[0]?.rungs.length ?? 0));
  const [last, setLast] = useState<TakeMetrics | null>(null);
  const [take, setTake] = useState(0);
  const [auto, setAuto] = useState(false);
  const placed = useRef<{ strand: StrandId; places: Partial<Record<FamilyId, number>> }[]>([]);
  const [summary, setSummary] = useState<Partial<Record<FamilyId, number>> | null>(null);
  // Owner's item 4: places the test inferred (not measured) are shown as such
  const [inferred, setInferred] = useState<FamilyId[]>([]);
  const session = useRef(`t${Date.now().toString(36)}`);
  const n = useRef(0);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const strand = strands[si];
  const rung = strand && st.at >= 0 ? strand.rungs[st.at] : null;
  const finishStrand = (s: StrandState) => {
    placed.current.push({ strand: strand.id, places: strandPlaces(strand, s) });
    const k = si + 1;
    if (k >= strands.length) {
      const fin = finishPlaces(placed.current, !midi.devices.length && inst === 'piano');
      setInferred(fin.inferred);
      return setSummary(testStart(inst, fin.places));
    }
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
            <Icon k="play" /> {tx.start}
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
              <li key={f.id} {...(inferred.includes(f.id) ? { 'data-inferred': '1', title: MT.inferredNote[lang] } : {})}>
                {f.title[lang]} · <b dir="ltr">{summary[f.id]}</b>
                {inferred.includes(f.id) && <span className="field-hint"> · {MT.inferred[lang]}</span>}
              </li>
            ))}
        </ul>
        {inferred.length > 0 && (
          <p className="field-hint" data-inferred-note="1">
            {MT.inferredNote[lang]}
          </p>
        )}
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
        {tx.section} {si + 1}/{strands.length} · <b>{strand.title[lang]}</b> · {rung.title[lang]}{inst === 'drums' ? '' : ` · ${keyName(drillKeyOf(rung.drill), drillMinorOf(rung.drill) || facetGroup(rung.drill) === 'minor')}`} · <span dir="ltr">♩ {rung.drill.startBpm}</span>
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
      {!last && <DrillTake hear={false} drill={drill} bpm={bpm} lang={lang} cal={cal} kit={kit} autoStart={autoStart} onBeat={setBeat} onDone={(m, played) => (setBeat(-1), onDone(m, played))} />}
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
