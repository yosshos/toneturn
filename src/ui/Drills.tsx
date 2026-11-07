// Technique drills (spec AI): the hub (today's items, families, the technique map), a family's levels with the
// 12-key heat map, the run loop with the tempo ladder, drills settings, calibration and the drill creator.

import { useMemo, useRef, useState } from 'react';
import type { Settings } from '../storage/progress';
import type { RatingEvent } from '../engine/rating';
import type { CustomDrill, Drill, DrillCalibration, DrillSettings, FamilyId, ItemState, PlayedNote, TakeMetrics } from '../engine/drills/types';
import { DEFAULT_DRILL_SETTINGS } from '../engine/drills/types';
import { keyName } from '../engine/drills/generate';
import type { FamilyDef, LevelDef } from '../engine/drills/generate';
import { applyTake, familyLevel, newItem, type LadderResult } from '../engine/drills/ladder';
import { customKeys, customToDrill } from '../engine/drills/custom';
import { DrillCreator } from './DrillCreator';
import { currentLevel, families as familiesOf, keyHeat, levelDone, levelKeys, shownFamilies, specDrills, todayDrills, levelDrills } from '../engine/drills/plan';
import { generate } from '../engine/drills/generate';
import { GUITAR_PROBES } from '../engine/drills/guitar';
import { isGuitarDrill } from '../engine/drills/events';
import { drillEvents, drillXp } from '../engine/drills/events';
import { bandOfBpm as tempoBandOf } from '../engine/drills/analyze';
import { DrillStaff, DrillTab, DrillTake, MarkLegend, TakeResult } from './DrillTake';
import { midi } from '../speech/midi';
import { inputLatency } from '../engine/latency';
import { LatencyCalibrate } from './LatencyCalibrate';

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
    instrument: 'Instrument', insts: { piano: 'Piano', guitar: 'Guitar', bass: 'Bass' } as Record<string, string>, gStyle: 'Style', gView: 'Show', gViews: { tab: 'Tab', staff: 'Notation', both: 'Both' } as Record<string, string>, picking: 'Show picking (↓ ↑, p i m a) instead of fingers',
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
    instrument: 'כלי', insts: { piano: 'פסנתר', guitar: 'גיטרה', bass: 'בס' } as Record<string, string>, gStyle: 'סגנון', gView: 'תצוגה', gViews: { tab: 'טאבים', staff: 'תווים', both: 'שניהם' } as Record<string, string>, picking: 'להציג פריטה (↓ ↑, p i m a) במקום אצבעות',
    gStyles: { all: 'הכול', rock: 'רוק', blues: 'בלוז', metal: 'מטאל', pop: 'פופ', funk: 'פאנק', country: 'קאנטרי', jazz: 'ג׳אז', classical: 'קלאסי', fingerstyle: 'פינגרסטייל', flamenco: 'פלמנקו', reggae: 'רגאיי', latin: 'לטיני' } as Record<string, string>,
    test: 'למצוא את רמת הטכניקה שלי', testIntro: 'כמה נגינות קצרות: כל נגינה נקייה מהירה יותר, עד שהיא כבר לא נקייה. כך נקבע מאיפה כל משפחת תרגילים מתחילה ובאיזה טמפו.', testDone: 'רמת הטכניקה שלך נקבעה', skip: 'דילוג', bestTempo: 'נקי עד',
  },
};

const takeInfo = (d: Drill, m: TakeMetrics) => {
  const cvs = [m.cvR, m.cvL].filter((x): x is number => x !== null);
  return { verdict: m.verdict, hands: d.spec.hands, cv: cvs.length ? Math.max(...cvs) : null };
};
const DEFAULT_CAL: DrillCalibration = { latencyMs: 0, velMin: 20, velMax: 120 };
/** The drill calibration with the input's calibrated delay (MIDI when a keyboard is connected, else the microphone). */
const calOf = (s: Settings): DrillCalibration => ({ ...DEFAULT_CAL, ...(s.drillCal ?? {}), latencyMs: inputLatency(s, midi.devices.length ? 'midi' : 'mic') });
const FAM_HUE: Partial<Record<FamilyId, string>> = { scales: 'var(--mint)', arpeggios: '#7c8cff', cadences: '#c38cff', fingers: 'var(--gold)', control: '#ff8a5c', advanced: '#ff6b9a', harris: '#5cd6ff', jazz: '#5cffb0', voicings: '#ffd15c', accomp: '#b0ff5c', custom: '#e0e0ff' };
const HANDS_TX: Record<Lang, Record<string, string>> = { en: { R: 'RH', L: 'LH', RL: 'HT' }, he: { R: 'ימין', L: 'שמאל', RL: 'ביחד' } };

/** Drill settings with the instrument defaulting to the player's (guitar / bass players get guitar drills). */
export function drillSettingsOf(s: Pick<Settings, 'drills' | 'instrument'>): DrillSettings {
  const inst = s.instrument === 'guitar' ? 'guitar' : s.instrument === 'bass' ? 'bass' : 'piano';
  return { ...DEFAULT_DRILL_SETTINGS, instrument: inst, ...(s.drills ?? {}) };
}

/** A drill's notes: tab for guitar / bass (and / or notation by the setting), the staff for piano. */
export function DrillScore({ drill, ds, result }: { drill: Drill; ds: DrillSettings; result?: TakeMetrics | null }) {
  if (!isGuitarDrill(drill)) return <DrillStaff drill={drill} fingering={ds.showFingering} result={result} />;
  const view = ds.guitarView ?? 'tab';
  return (
    <>
      {view !== 'staff' && <DrillTab drill={drill} fingering={ds.showFingering} picking={!!ds.showPicking} result={result} />}
      {view !== 'tab' && <DrillStaff drill={drill} result={result} />}
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
}

type View = { k: 'test' } | { k: 'hub' } | { k: 'family'; f: FamilyDef } | { k: 'run'; queue: Drill[]; i: number; from: View } | { k: 'settings' } | { k: 'calib' } | { k: 'creator'; edit?: CustomDrill };

export function Drills({ lang, settings, onSettings, items, onTake, onBack, queue, onQueueDone, startTest, onTestDone }: DrillsProps) {
  const tx = T[lang];
  const ds = drillSettingsOf(settings);
  const [view, setView] = useState<View>(startTest ? { k: 'test' } : queue?.length ? { k: 'run', queue, i: 0, from: { k: 'hub' } } : { k: 'hub' });
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
          cal={calOf(settings)}
          queue={view.queue}
          start={view.i}
          items={items}
          onTake={onTake}
          onEnd={(takes, clean) => (onQueueDone && queue?.length ? onQueueDone(takes, clean) : setView(view.from))}
        />
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
          onDone={(start) => {
            if (start) onSettings({ drillStart: { ...(settings.drillStart ?? {}), ...start } });
            if (startTest && onTestDone) onTestDone();
            else setView({ k: 'hub' });
          }}
        />
      </main>
    );
  if (view.k === 'settings')
    return (
      <main className="drills-screen" data-drills="settings">
        {head(tx.settings, () => setView({ k: 'hub' }))}
        <DrillSettingsView lang={lang} ds={ds} onChange={setDs} onCalib={() => setView({ k: 'calib' })} />
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
          instrument={ds.instrument ?? 'piano'}
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
      onTest={() => setView({ k: 'test' })}
      onInstrument={(i) => setDs({ instrument: i })}
    />
  );
}


function Hub({ lang, ds, settings, items, head, onFamily, onRun, onSettings, onCreate, onTest, onInstrument }: { lang: Lang; ds: DrillSettings; settings: Settings; items: Record<string, ItemState>; head: React.ReactNode; onFamily: (f: FamilyDef) => void; onRun: (q: Drill[]) => void; onSettings: () => void; onCreate: (edit?: CustomDrill) => void; onTest: () => void; onInstrument: (i: 'piano' | 'guitar' | 'bass') => void }) {
  const tx = T[lang];
  const today = useMemo(() => todayDrills(ds, items, settings.drillStart ?? {}, settings.customDrills ?? []), [ds, items, settings.drillStart, settings.customDrills]);
  const fams = shownFamilies(ds);
  return (
    <main className="drills-screen" data-drills="hub">
      {head}
      <div className="chips drill-inst" role="radiogroup" aria-label={tx.instrument}>
        {(['piano', 'guitar', 'bass'] as const).map((i) => (
          <button key={i} role="radio" aria-checked={(ds.instrument ?? 'piano') === i} className={`chip ${(ds.instrument ?? 'piano') === i ? 'on' : ''}`} onClick={() => onInstrument(i)} data-inst={i}>
            {tx.insts[i]}
          </button>
        ))}
      </div>
      {!midi.devices.length && (ds.instrument ?? 'piano') === 'piano' && <p className="field-hint">{tx.noMidi}</p>}
      {!settings.drillStart && !Object.keys(items).length && (
        <button className="btn primary mega" onClick={onTest} data-drills-test="1">
          🧭 {tx.test}
        </button>
      )}
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
      <h2>{tx.families}</h2>
      <div className="drill-families">
        {fams.map((f) => {
          const lv = familyLevel(items, f.id);
          return (
            <button key={f.id} className="drill-family" style={{ ['--hue' as string]: FAM_HUE[f.id] }} onClick={() => onFamily(f)} data-family={f.id}>
              <b>{f.title[lang]}</b>
              <small>
                {tx.level} <span className="lvl">{lv ? lv.toFixed(1) : '—'}</span> / 7
              </small>
              <HeatRow heat={keyHeat(f.id, items)} />
            </button>
          );
        })}
      </div>
      {(
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
          ⚙ {tx.settings}
        </button>
        {(settings.drillStart || Object.keys(items).length > 0) && (
          <button className="btn ghost" onClick={onTest}>
            🧭 {tx.test}
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
  const tx = T[lang];
  const cur = currentLevel(f, items, ds.keyOrder, start);
  const [open, setOpen] = useState<string>(cur.id);
  return (
    <div className="drill-levels">
      {f.levels.map((l) => {
        const done = levelDone(l, items, ds.keyOrder);
        return (
          <div key={l.id} className="drill-level-block">
            <button className={`drill-level ${done ? 'done' : ''} ${l.id === cur.id ? 'current' : ''}`} onClick={() => setOpen(open === l.id ? '' : l.id)} aria-expanded={open === l.id} data-level={l.id}>
              <span className="n">{l.level}</span>
              <span>{l.title[lang]}</span>
              <span>{done ? `✓ ${tx.done}` : l.id === cur.id ? '●' : ''}</span>
            </button>
            {open === l.id && <LevelGrid lang={lang} ds={ds} level={l} items={items} onRun={onRun} />}
          </div>
        );
      })}
    </div>
  );
}

function LevelGrid({ lang, ds, level, items, onRun }: { lang: Lang; ds: DrillSettings; level: LevelDef; items: Record<string, ItemState>; onRun: (q: Drill[], i: number) => void }) {
  const tx = T[lang];
  const keys = levelKeys(level, ds.keyOrder);
  return (
    <div className="drill-opts">
      <button className="btn primary" onClick={() => onRun(levelDrills(level, ds.keyOrder), 0)} data-level-start={level.id}>
        ▶ {tx.allKeys}
      </button>
      <div className="heat">
        {level.specs.map((s, si) => {
          const row = specDrills(level, si, ds.keyOrder);
          return (
            <div key={si} className="heat-row" style={{ ['--cols' as string]: keys.length }}>
              <span title={row[0]?.title[lang]}>{HANDS_TX[lang][s.hands]}</span>
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

function DrillRun({ lang, ds, cal, queue, start, items, onTake, onEnd }: { lang: Lang; ds: DrillSettings; cal: DrillCalibration; queue: Drill[]; start: number; items: Record<string, ItemState>; onTake: DrillsProps['onTake']; onEnd: (takes: number, clean: number) => void }) {
  const tx = T[lang];
  const [i, setI] = useState(start);
  const drill = queue[i];
  const local = useRef<Record<string, ItemState>>({});
  const stateOf = (d: Drill) => local.current[d.itemId] ?? items[d.itemId] ?? newItem(d);
  const [bpm, setBpm] = useState(() => (drill ? stateOf(drill).goalBpm : 60));
  const [res, setRes] = useState<{ m: TakeMetrics; lad: LadderResult } | null>(null);
  const session = useRef(Date.now().toString(36));
  const count = useRef({ takes: 0, clean: 0 });
  const [take, setTake] = useState(0);
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
  const done = (m: TakeMetrics, _played: PlayedNote[]) => {
    const lad = applyTake(stateOf(drill), m, bpm, new Date().toISOString(), ds);
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
        {i + 1} / {queue.length} · <span dir="ltr">♩ {bpm}</span>
      </p>
      <DrillScore drill={drill} ds={ds} result={res?.m} />
      {res && <MarkLegend lang={lang} />}
      {!res && <DrillTake key={`${drill.itemId}:${take}`} drill={drill} bpm={bpm} lang={lang} cal={cal} onDone={done} />}
      {res && (
        <>
          <p className="drill-ladder">{res.lad.message[lang]}</p>
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
      {toggle('inPath', tx.inPath)}
      {toggle('inWorkout', tx.inWorkout)}
      <button className="btn ghost" onClick={onCalib}>
        🎚 {tx.calib}
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

/** Technique section of Find my level (spec AI §13): a tempo staircase on a few probe drills → start level per family. */
function TechLevelTest({ lang, ds, cal, items, onTake, onDone }: { lang: Lang; ds: DrillSettings; cal: DrillCalibration; items: Record<string, ItemState>; onTake: DrillsProps['onTake']; onDone: (start: Partial<Record<FamilyId, number>> | null) => void }) {
  const tx = T[lang];
  const inst = ds.instrument ?? 'piano';
  const probes = useMemo(() => {
    if (inst !== 'piano') return GUITAR_PROBES.filter((p) => p.instruments.includes(inst)).map((p) => ({ id: p.family, drill: generate(p.spec) }));
    const fams: FamilyId[] = ds.emphasis === 'jazz' ? ['scales', 'harris'] : ds.emphasis === 'classical' ? ['scales', 'fingers'] : ['scales', 'fingers', 'harris'];
    return fams.map((id) => {
      const f = shownFamilies({ emphasis: 'both' }).find((x) => x.id === id)!;
      return { id, drill: specDrills(f.levels[0], 0, ds.keyOrder).find((d) => d.spec.key === 0) ?? specDrills(f.levels[0], 0, ds.keyOrder)[0] };
    });
  }, [ds.emphasis, ds.keyOrder, inst]);
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
    if (inst !== 'piano') {
      // Guitar / bass: each probed family from its staircase; the rest one below the mean of the probed ones.
      const lv: Record<string, number> = {};
      for (const pr of probes) lv[pr.id] = b[pr.id] ? Math.max(1, tempoBandOf(pr.drill, b[pr.id]) - 1) : 1;
      const vals = Object.values(lv);
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
    onDone(start);
  };
  const failAt = useRef<number | null>(null);
  const bisected = useRef(false);
  const nextProbe = (b: Record<string, number>) => {
    failAt.current = null;
    bisected.current = false;
    if (p + 1 >= probes.length) return finish(b);
    setP(p + 1);
    setBpm(probes[p + 1].drill.startBpm);
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
  const done = (m: TakeMetrics) => {
    const st = items[pr.drill.itemId] ?? newItem(pr.drill);
    const lad = applyTake(st, m, bpm, new Date().toISOString(), ds);
    onTake(lad.state, drillEvents(pr.drill, m, new Date().toISOString(), session.current, n.current++), drillXp(m), takeInfo(pr.drill, m));
    setLast(m);
    const t = tries + 1;
    setTries(t);
    // Accelerating staircase (SPEC-PLACEMENT §7): +15 %, +30 %, +60 % while clean; one bisect take after the first
    // miss; at most 4 takes per family. A first miss at the start tempo steps down once instead.
    const clean = m.verdict === 'clean';
    const b = clean ? { ...best, [pr.id]: bpm } : best;
    if (clean) setBest(b);
    if (t >= 4) return nextProbe(b);
    const hi = clean ? null : bpm;
    if (clean && !failAt.current) {
      setBpm(Math.round(bpm * [1.15, 1.3, 1.6][Math.min(2, t - 1)]));
    } else if (!clean && !b[pr.id]) {
      if (bpm <= 44 || failAt.current) return nextProbe(b);
      failAt.current = bpm;
      setBpm(Math.max(40, Math.round(bpm * 0.75)));
    } else {
      // Bisect once between the best clean tempo and the first miss, then stop.
      if (hi) failAt.current = hi;
      const lo = b[pr.id] ?? bpm;
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
        {best[pr.id] ? (
          <>
            {' '}
            · {tx.bestTempo} <span dir="ltr">♩ {best[pr.id]}</span>
          </>
        ) : null}
      </p>
      {last && <p className="drill-why">{last.why[lang]}</p>}
      <DrillScore drill={pr.drill} ds={ds} />
      <DrillTake key={`${pr.id}:${take}`} drill={pr.drill} bpm={bpm} lang={lang} cal={cal} onDone={(m) => done(m)} />
      <button className="btn ghost" onClick={() => nextProbe(best)}>
        {tx.skip}
      </button>
    </div>
  );
}
