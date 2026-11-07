// Drill creator 2 (spec AI §12, owner request): build your own technique drill — tap it on a keyboard / fretboard,
// type degrees with rhythm, or record it on MIDI; choose hands, movement, keys, tempo, what is graded; preview and
// listen in any key; start from presets or a built-in drill; share as a short code. Pure logic in engine/drills/custom.ts.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import '../creator.css';
import type { CustomDrill, DrillSettings, DynamicsGoal, Hand, KeyOrder } from '../engine/drills/types';
import {
  CREATOR_SCALES,
  PRESETS,
  SCALE_NAMES,
  creatorScaleOf,
  customFromDrill,
  customKeys,
  customProblems,
  customToDrill,
  drillToEvents,
  guitarTonic,
  handsModeOf,
  handsOfMode,
  isGuitarCustom,
  parseRow,
  pitchToDegree,
  presetDrill,
  quantizePlayed,
  readShareCode,
  richOf,
  rootStringOf,
  rowToText,
  scaleInts,
  shareCode,
  splitRich,
  tuningOfCustom,
  undoLast,
  withScale,
  type CreatorScale,
  type HandsMode,
  type PlayedIn,
  type RichNote,
} from '../engine/drills/custom';
import { keyName, mod, rhBase } from '../engine/drills/generate';
import { families, specDrills } from '../engine/drills/plan';
import { DrillStaff, DrillTab } from './DrillTake';
import { piano } from './services';
import { midi } from '../speech/midi';

type Lang = 'he' | 'en';
type Inst = 'piano' | 'guitar' | 'bass';

export interface DrillCreatorProps {
  lang: Lang;
  /** The drill being edited (its id and createdAt are kept). */
  edit?: CustomDrill;
  onSave: (c: CustomDrill) => void;
  onDelete?: () => void;
  /** Run the drill through its keys now. */
  onTry: (c: CustomDrill) => void;
  /** Instrument of a NEW drill (default piano); an edited drill keeps its own. */
  instrument?: Inst;
  /** Drill settings used by the creator: key order (the "all 12" order), fingering, guitar view. */
  settings?: Partial<Pick<DrillSettings, 'keyOrder' | 'showFingering' | 'guitarView' | 'showPicking'>>;
}

const TX = {
  en: {
    name: 'Name',
    myDrill: 'My drill',
    startFrom: 'Start from…',
    presets: 'Templates',
    copyBuiltIn: 'Copy a built-in drill',
    cantCopy: 'That drill can’t be written as scale degrees.',
    pattern: 'Pattern',
    tap: 'Tap',
    type: 'Type',
    record: 'Record',
    rh: 'Right hand',
    lh: 'Left hand',
    tapHint: 'Tap notes in C (the tonic is marked). Pick the length first.',
    typeHint: '1 2 b3 #4 8 -2 · length /16 /8 /4 /2, t = triplet, . = dotted · r = rest · [1 3 5] = chord · > accent · \' staccato',
    typeHintG: ' · h hammer · p pull · b bend · ~ vibrato · pm palm mute · s slide',
    recHint: 'Play the pattern in C. Below middle C = left hand. Rhythm is snapped to the nearest 8th / 16th / triplet.',
    noMidi: 'Connect a MIDI keyboard to record.',
    recStart: '● Record',
    recStop: '■ Stop',
    recording: 'Recording…',
    grid: 'Snap to',
    grids: { auto: 'Auto', '8': '8ths', '16': '16ths', triplet: 'Triplets' } as Record<string, string>,
    undo: '↶ Undo',
    clear: 'Clear',
    rest: 'Rest',
    together: 'Chord',
    accent: '> Accent',
    stacc: '· Staccato',
    lengths: 'Length',
    techs: 'Technique',
    hands: 'Hands',
    handsModes: { R: 'Right', L: 'Left', octaves: 'Both, octaves', contrary: 'Both, contrary', independent: 'Both, own LH part' } as Record<string, string>,
    movement: 'Movement',
    seq: 'Repeat up the scale',
    times: 'times',
    step: 'Each time move',
    steps: { 1: 'a step', 2: 'a 3rd', 3: 'a 4th' } as Record<number, string>,
    dir: 'Direction',
    dirs: { up: 'Up', down: 'Down', updown: 'Up and back' } as Record<string, string>,
    octaves: 'Octaves',
    keys: 'Keys',
    allKeys: 'All 12',
    pickKeys: 'Choose',
    tonality: 'Tonality',
    major: 'Major',
    minor: 'Minor',
    scale: 'Scale',
    tempo: 'Tempo & grading',
    startBpm: 'Start ♩',
    goalBpm: 'Goal ♩',
    graded: 'Check',
    gEven: 'Evenness',
    gHands: 'Hands together',
    gDyn: 'Dynamics',
    dyn: 'Dynamics goal',
    dyns: { none: 'None', 'even-p': 'Even p', 'even-mf': 'Even mf', 'even-f': 'Even f', cresc: 'Crescendo' } as Record<string, string>,
    include: 'Include in',
    inToday: 'Today',
    inWorkout: 'Daily workout',
    inPath: 'My path',
    neck: 'On the neck',
    rootStr: 'Tonic on string',
    strings: 'Strings',
    stretch: 'Wide stretches',
    preview: 'Preview',
    inKey: 'in',
    listen: '▶ Listen',
    stopListen: '■ Stop',
    problems: 'To fix',
    unread: 'Can’t read',
    allGood: 'Ready — it works in every key.',
    share: 'Share',
    copyCode: 'Copy code',
    copied: 'Copied!',
    paste: 'Paste a drill code',
    importBtn: 'Load',
    loaded: 'Loaded.',
    tryAll: '▶ Run through the keys',
    save: 'Save',
    del: 'Delete',
    notes: 'notes',
    beats: 'beats',
  },
  he: {
    name: 'שם',
    myDrill: 'התרגיל שלי',
    startFrom: 'להתחיל מ…',
    presets: 'תבניות',
    copyBuiltIn: 'להעתיק תרגיל מובנה',
    cantCopy: 'אי אפשר לכתוב את התרגיל הזה כדרגות סולם.',
    pattern: 'תבנית',
    tap: 'הקשה',
    type: 'הקלדה',
    record: 'הקלטה',
    rh: 'יד ימין',
    lh: 'יד שמאל',
    tapHint: 'הקישו תווים בדו (הטוניקה מסומנת). בחרו קודם את האורך.',
    typeHint: '1 2 b3 #4 8 -2 · אורך /16 /8 /4 /2, t = טריולה, . = מנוקד · r = הפסק · [1 3 5] = אקורד · > הדגשה · \' סטקטו',
    typeHintG: ' · h האמר · p פול · b בנד · ~ ויברטו · pm השתקה · s סלייד',
    recHint: 'נגנו את התבנית בדו. מתחת לדו האמצעי = יד שמאל. הקצב מיושר לשמינית / שש-עשרית / טריולה הקרובה.',
    noMidi: 'חברו מקלדת MIDI כדי להקליט.',
    recStart: '● הקלטה',
    recStop: '■ עצירה',
    recording: 'מקליט…',
    grid: 'יישור ל',
    grids: { auto: 'אוטומטי', '8': 'שמיניות', '16': 'שש-עשריות', triplet: 'טריולות' } as Record<string, string>,
    undo: '↶ ביטול',
    clear: 'ניקוי',
    rest: 'הפסק',
    together: 'אקורד',
    accent: '> הדגשה',
    stacc: '· סטקטו',
    lengths: 'אורך',
    techs: 'טכניקה',
    hands: 'ידיים',
    handsModes: { R: 'ימין', L: 'שמאל', octaves: 'שתיהן, באוקטבות', contrary: 'שתיהן, תנועה נגדית', independent: 'שתיהן, תפקיד נפרד לשמאל' } as Record<string, string>,
    movement: 'תנועה',
    seq: 'לחזור במעלה הסולם',
    times: 'פעמים',
    step: 'בכל פעם לזוז',
    steps: { 1: 'צעד', 2: 'טרצה', 3: 'קוורטה' } as Record<number, string>,
    dir: 'כיוון',
    dirs: { up: 'למעלה', down: 'למטה', updown: 'למעלה וחזרה' } as Record<string, string>,
    octaves: 'אוקטבות',
    keys: 'סולמות',
    allKeys: 'כל ה-12',
    pickKeys: 'לבחור',
    tonality: 'טונליות',
    major: 'מז׳ור',
    minor: 'מינור',
    scale: 'סולם',
    tempo: 'טמפו ובדיקה',
    startBpm: '♩ התחלה',
    goalBpm: '♩ יעד',
    graded: 'לבדוק',
    gEven: 'אחידות',
    gHands: 'ידיים יחד',
    gDyn: 'דינמיקה',
    dyn: 'יעד דינמיקה',
    dyns: { none: 'בלי', 'even-p': 'p אחיד', 'even-mf': 'mf אחיד', 'even-f': 'f אחיד', cresc: 'קרשנדו' } as Record<string, string>,
    include: 'לכלול ב',
    inToday: 'היום',
    inWorkout: 'האימון היומי',
    inPath: 'המסלול שלי',
    neck: 'על הצוואר',
    rootStr: 'טוניקה על מיתר',
    strings: 'מיתרים',
    stretch: 'מתיחות רחבות',
    preview: 'תצוגה',
    inKey: 'ב',
    listen: '▶ להאזין',
    stopListen: '■ עצירה',
    problems: 'לתקן',
    unread: 'לא הצלחתי לקרוא',
    allGood: 'מוכן — עובד בכל הסולמות.',
    share: 'שיתוף',
    copyCode: 'להעתיק קוד',
    copied: 'הועתק!',
    paste: 'הדביקו קוד של תרגיל',
    importBtn: 'לטעון',
    loaded: 'נטען.',
    tryAll: '▶ לעבור בכל הסולמות',
    save: 'שמירה',
    del: 'מחיקה',
    notes: 'תווים',
    beats: 'פעמות',
  },
};

/** Note lengths offered for tapping (beats) and their symbols. */
const LENGTHS: { d: number; sym: string }[] = [
  { d: 0.25, sym: '𝅘𝅥𝅯' },
  { d: 0.5, sym: '♪' },
  { d: 1 / 3, sym: '♪³' },
  { d: 0.75, sym: '♪.' },
  { d: 1, sym: '♩' },
  { d: 1.5, sym: '♩.' },
  { d: 2, sym: '𝅗𝅥' },
];
const TECHS: { t: RichNote['tech']; sym: string }[] = [
  { t: undefined, sym: '—' },
  { t: 'hammer', sym: 'h' },
  { t: 'pull', sym: 'p' },
  { t: 'slide', sym: '/' },
  { t: 'bend', sym: 'b' },
  { t: 'vibrato', sym: '~' },
  { t: 'mute', sym: 'PM' },
];
const DYNS: (DynamicsGoal | 'none')[] = ['none', 'even-p', 'even-mf', 'even-f', 'cresc'];
const isBlack = (p: number) => [1, 3, 6, 8, 10].includes(mod(p, 12));
const degLabel = (d: { deg: number; alt: number } | null) => (d ? `${d.alt === -1 ? '♭' : d.alt === 1 ? '♯' : ''}${d.deg}` : '');

type Opts = Omit<CustomDrill, 'pattern' | 'marks' | 'lh' | 'lhMarks'>;

/** The editable state of a drill: options + the two rows as text. */
function initial(edit: CustomDrill | undefined, inst: Inst, lang: Lang): { o: Opts; rh: string; lh: string } {
  if (!edit) {
    const o: Opts = { id: `c${Date.now().toString(36)}`, name: '', scale: 'major', sequenceSteps: 2, hands: 'R', createdAt: new Date().toISOString(), v: 2, handsMode: 'R', direction: 'updown' };
    if (inst !== 'piano') o.instrument = inst;
    return { o, rh: '1/8 2 3 4 5 4 3 2', lh: '1/2 5' };
  }
  let src = edit;
  // A v1 pattern that mixes hands becomes a RH row + an independent LH row.
  if (handsModeOf(edit) === 'mixed') {
    const conv = customFromDrill(customToDrill({ ...edit, sequenceSteps: 0 }, 0), edit.id, edit.createdAt, edit.name);
    if (conv) src = { ...conv, sequenceSteps: edit.sequenceSteps, direction: 'updown', scale: edit.scale, startBpm: undefined, from: undefined };
  }
  const { pattern, marks, lh, lhMarks, ...rest } = src;
  const o: Opts = { ...rest, v: 2, handsMode: handsModeOf(src) as HandsMode, name: edit.name || TX[lang].myDrill };
  return { o, rh: rowToText(richOf(pattern, marks)), lh: lh ? rowToText(richOf(lh, lhMarks)) : '1/2 5' };
}

export function DrillCreator({ lang, edit, onSave, onDelete, onTry, instrument, settings }: DrillCreatorProps) {
  const tx = TX[lang];
  const init = useMemo(() => initial(edit, (edit?.instrument as Inst | undefined) ?? instrument ?? 'piano', lang), [edit, instrument, lang]);
  const [o, setO] = useState<Opts>(init.o);
  const [rhText, setRhText] = useState(init.rh);
  const [lhText, setLhText] = useState(init.lh);
  const [row, setRow] = useState<Hand>('R');
  const [entry, setEntry] = useState<'tap' | 'type' | 'record'>('tap');
  const [len, setLen] = useState(0.5);
  const [acc, setAcc] = useState(false);
  const [stac, setStac] = useState(false);
  const [chord, setChord] = useState(false);
  const [tech, setTech] = useState<RichNote['tech']>(undefined);
  const [msg, setMsg] = useState<string | null>(null);
  const order: KeyOrder = settings?.keyOrder ?? 'fifths-up';
  const set = (p: Partial<Opts>) => setO((x) => ({ ...x, ...p }));

  const guitar = isGuitarCustom(o);
  const mode: HandsMode = guitar ? 'R' : (o.handsMode ?? 'R');
  const indep = mode === 'independent';
  const sc = creatorScaleOf(o);
  const ints = scaleInts(sc);

  // The drill as it stands.
  const { c, bad } = useMemo(() => {
    const r = parseRow(rhText, mode === 'L' ? 'L' : 'R');
    const l = parseRow(lhText, 'L');
    const s = splitRich(r.notes);
    const d: CustomDrill = { ...o, name: o.name.trim() || tx.myDrill, hands: handsOfMode(mode), handsMode: mode, pattern: s.pattern, ...(s.marks ? { marks: s.marks } : {}) };
    if (indep) {
      const ls = splitRich(l.notes);
      d.lh = ls.pattern;
      if (ls.marks) d.lhMarks = ls.marks;
    }
    return { c: d, bad: [...r.bad, ...(indep ? l.bad : [])] };
  }, [o, rhText, lhText, mode, indep, tx.myDrill]);
  const problems = useMemo(() => customProblems(c), [c]);
  const ok = problems.length === 0;
  const keys = customKeys(c, order);
  const [pKey, setPKey] = useState<number>(() => customKeys(init.o, order)[0] ?? 0);
  const previewKey = keys.includes(pKey) ? pKey : (keys[0] ?? 0);
  const preview = useMemo(() => (ok ? customToDrill(c, previewKey) : null), [ok, c, previewKey]);

  // ── tapping ──
  const rowText = row === 'L' && indep ? lhText : rhText;
  const setRowText = (s: string) => (row === 'L' && indep ? setLhText(s) : setRhText(s));
  const rowHand: Hand = row === 'L' && indep ? 'L' : mode === 'L' ? 'L' : 'R';
  const rowTonic = guitar ? guitarTonic(c, 0) : row === 'L' && indep ? rhBase(0) - 12 : mode === 'L' ? rhBase(0) - 12 : rhBase(0);
  const tapAc = useRef<AbortController | null>(null);
  const sound = async (pitches: number[]) => {
    try {
      await piano.unlock();
      tapAc.current?.abort();
      const a = new AbortController();
      tapAc.current = a;
      await piano.play(
        pitches.map((p) => ({ midi: p, start: 0, duration: 0.45, velocity: 0.6 })),
        0.6,
        a.signal,
      );
    } catch {
      /* stopped / no audio */
    }
  };
  const tapPitch = (p: number) => {
    const d = pitchToDegree(p, rowTonic, ints, 'smart');
    if (!d) return;
    const notes = parseRow(rowText, rowHand).notes;
    const n: RichNote = { deg: d.deg, ...(d.alt ? { alt: d.alt } : {}), dur: len, hand: rowHand, ...(acc ? { acc: true } : {}), ...(stac ? { stac: true } : {}), ...(guitar && tech ? { tech, ...(tech === 'bend' ? { bend: 200 } : {}) } : {}) };
    const last = notes[notes.length - 1];
    if (chord && last && !last.rest) notes[notes.length - 1] = { ...last, dur: 0 };
    notes.push(n);
    setRowText(rowToText(notes));
    void sound([p]);
  };
  const tapRest = () => setRowText(rowToText([...parseRow(rowText, rowHand).notes, { deg: 1, dur: len, hand: rowHand, rest: true }]));
  const undo = () => setRowText(rowToText(undoLast(parseRow(rowText, rowHand).notes)));

  // ── recording ──
  const [rec, setRec] = useState(false);
  const [grid, setGrid] = useState<'auto' | '8' | '16' | 'triplet'>('auto');
  const recNotes = useRef<PlayedIn[]>([]);
  const off = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      off.current?.();
      tapAc.current?.abort();
      listenAc.current?.abort();
    },
    [],
  );
  const toggleRec = () => {
    if (rec) {
      off.current?.();
      off.current = null;
      setRec(false);
      const r = quantizePlayed(recNotes.current, { key: 0, scale: sc, grid, split: guitar ? undefined : 60 });
      if (guitar) {
        if (r.rh.length) setRhText(rowToText(r.rh.map((n) => ({ ...n, hand: 'R' }))));
      } else if (r.rh.length && r.lh.length) {
        set({ handsMode: 'independent' });
        setRhText(rowToText(r.rh));
        setLhText(rowToText(r.lh));
      } else if (r.lh.length) {
        set({ handsMode: 'L' });
        setRhText(rowToText(r.lh.map((n) => ({ ...n, hand: 'L' }))));
      } else if (r.rh.length) {
        if (mode === 'L' || mode === 'independent') set({ handsMode: 'R' });
        setRhText(rowToText(r.rh));
      }
      if (r.rh.length || r.lh.length) set({ startBpm: Math.max(30, Math.min(200, Math.round(r.bpm * 0.9))) });
      return;
    }
    recNotes.current = [];
    const open = new Map<number, PlayedIn>();
    setRec(true);
    off.current = midi.onNote((m, on, at, vel) => {
      if (on) {
        const n: PlayedIn = { pitch: m, on: at, off: null, vel };
        recNotes.current.push(n);
        open.set(m, n);
      } else {
        const n = open.get(m);
        if (n) n.off = at;
        open.delete(m);
      }
    });
  };

  // ── listening ──
  const [playing, setPlaying] = useState(false);
  const listenAc = useRef<AbortController | null>(null);
  const listen = async () => {
    if (playing) {
      listenAc.current?.abort();
      return;
    }
    if (!preview) return;
    try {
      await piano.unlock();
    } catch {
      return;
    }
    const a = new AbortController();
    listenAc.current = a;
    setPlaying(true);
    const { events, length } = drillToEvents(preview, preview.startBpm);
    try {
      await piano.play(events, length, a.signal);
    } catch {
      /* stopped */
    } finally {
      setPlaying(false);
    }
  };

  // ── templates / copies / share ──
  const load = (d: CustomDrill) => {
    const st = initial({ ...d, id: o.id, createdAt: o.createdAt }, (d.instrument as Inst | undefined) ?? 'piano', lang);
    setO(st.o);
    setRhText(st.rh);
    setLhText(st.lh);
    setRow('R');
  };
  const inst: Inst = (o.instrument as Inst | undefined) ?? 'piano';
  const fams = useMemo(() => families(inst), [inst]);
  const pickTemplate = (v: string) => {
    setMsg(null);
    if (v.startsWith('p:')) {
      const p = PRESETS.find((x) => x.id === v.slice(2));
      if (p) load(presetDrill(p, o.id, o.createdAt, inst, lang));
    } else if (v.startsWith('b:')) {
      const [fid, li] = v.slice(2).split('|');
      const lv = fams.find((f) => f.id === fid)?.levels[Number(li)];
      if (!lv) return;
      const all = specDrills(lv, 0, order);
      const d = all.find((x) => x.spec.key === (x.spec.minor ? 9 : 0)) ?? all[0];
      const copy = d ? customFromDrill(d, o.id, o.createdAt, d.title[lang].split(' · ')[0]) : null;
      if (copy) load(copy);
      else setMsg(tx.cantCopy);
    }
  };
  const [code, setCode] = useState('');
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const copyCode = async () => {
    const s = shareCode(c);
    try {
      await navigator.clipboard.writeText(s);
      setShareMsg(tx.copied);
    } catch {
      setCode(s);
    }
  };
  const importCode = () => {
    const r = readShareCode(code, o.id, o.createdAt);
    if ('error' in r) return setShareMsg(r.error[lang]);
    load(r.drill);
    setShareMsg(tx.loaded);
  };

  const chips = <T extends string | number>(opts: readonly T[], cur: T | undefined, label: (v: T) => string, on: (v: T) => void, attr?: string) => (
    <div className="chips" role="radiogroup">
      {opts.map((v) => (
        <button key={String(v)} type="button" role="radio" aria-checked={cur === v} className={`chip ${cur === v ? 'on' : ''}`} onClick={() => on(v)} {...(attr ? { [attr]: String(v) } : {})}>
          {label(v)}
        </button>
      ))}
    </div>
  );
  const check = (checked: boolean, label: string, on: (v: boolean) => void) => (
    <label className="dc-check">
      <input type="checkbox" checked={checked} onChange={(e) => on(e.target.checked)} /> {label}
    </label>
  );
  const twoHands = !guitar && mode !== 'R' && mode !== 'L';
  const tu = tuningOfCustom(o);
  const nStr = tu.open.length;
  const stringSet = o.strings?.length ? o.strings : tu.open.map((_, i) => i + 1);
  const rootChoices = guitar ? (inst === 'bass' ? [4, 3] : [6, 5, 4]) : [];

  return (
    <div className="dc drill-opts" data-creator="2">
      {/* ── name + start from ── */}
      <section className="card dc-sec">
        <label className="row">
          <span>{tx.name}</span>
          <input value={o.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} placeholder={tx.myDrill} data-creator-name="1" />
        </label>
        <label className="row">
          <span>{tx.startFrom}</span>
          <select value="" onChange={(e) => pickTemplate(e.target.value)} data-creator-template="1">
            <option value="">—</option>
            <optgroup label={tx.presets}>
              {PRESETS.filter((p) => !p.guitarOnly || guitar).map((p) => (
                <option key={p.id} value={`p:${p.id}`}>
                  {p.title[lang]}
                </option>
              ))}
            </optgroup>
            {fams.map((f) => (
              <optgroup key={f.id} label={`${tx.copyBuiltIn}: ${f.title[lang]}`}>
                {f.levels.map((l, i) => (
                  <option key={l.id} value={`b:${f.id}|${i}`}>
                    {l.level}. {l.title[lang]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {msg && <p className="field-hint warn">{msg}</p>}
      </section>

      {/* ── pattern ── */}
      <section className="card dc-sec" aria-label={tx.pattern}>
        <div className="dc-head">
          <h3>{tx.pattern}</h3>
          {chips(['tap', 'type', 'record'] as const, entry, (v) => tx[v], setEntry, 'data-creator-entry')}
        </div>
        {indep && chips(['R', 'L'] as const, row, (v) => (v === 'R' ? tx.rh : tx.lh), setRow, 'data-creator-row')}

        {entry === 'tap' && (
          <>
            <p className="field-hint">{tx.tapHint}</p>
            <div className="dc-tools">
              <div className="chips" role="radiogroup" aria-label={tx.lengths}>
                {LENGTHS.map((l) => (
                  <button key={l.d} type="button" role="radio" aria-checked={len === l.d} className={`chip dc-len ${len === l.d ? 'on' : ''}`} onClick={() => setLen(l.d)} title={String(+l.d.toFixed(3))}>
                    {l.sym}
                  </button>
                ))}
              </div>
              <div className="chips">
                <button type="button" className={`chip ${acc ? 'on' : ''}`} aria-pressed={acc} onClick={() => setAcc(!acc)}>
                  {tx.accent}
                </button>
                <button type="button" className={`chip ${stac ? 'on' : ''}`} aria-pressed={stac} onClick={() => setStac(!stac)}>
                  {tx.stacc}
                </button>
                <button type="button" className={`chip ${chord ? 'on' : ''}`} aria-pressed={chord} onClick={() => setChord(!chord)}>
                  ⫶ {tx.together}
                </button>
              </div>
              {guitar && (
                <div className="chips" role="radiogroup" aria-label={tx.techs}>
                  {TECHS.map((x) => (
                    <button key={x.sym} type="button" role="radio" aria-checked={tech === x.t} className={`chip ${tech === x.t ? 'on' : ''}`} onClick={() => setTech(x.t)}>
                      {x.sym}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {guitar ? <Fretboard c={c} ints={ints} tonic={rowTonic} onTap={tapPitch} /> : <Keyboard lo={row === 'L' && indep ? 36 : mode === 'L' ? 36 : 48} hi={row === 'L' && indep ? 72 : mode === 'L' ? 72 : 84} tonic={rowTonic} ints={ints} onTap={tapPitch} />}
            <div className="dc-tools">
              <button type="button" className="btn small ghost" onClick={tapRest} data-creator-rest="1">
                𝄽 {tx.rest}
              </button>
              <button type="button" className="btn small ghost" onClick={undo} disabled={!rowText.trim()} data-creator-undo="1">
                {tx.undo}
              </button>
              <button type="button" className="btn small ghost" onClick={() => setRowText('')} disabled={!rowText.trim()}>
                {tx.clear}
              </button>
            </div>
          </>
        )}
        {entry === 'record' && (
          <>
            <p className="field-hint">{midi.devices.length ? tx.recHint : tx.noMidi}</p>
            <div className="row">
              <span>{tx.grid}</span>
              {chips(['auto', '8', '16', 'triplet'] as const, grid, (v) => tx.grids[v], setGrid)}
            </div>
            <button type="button" className={`btn ${rec ? 'primary' : ''}`} onClick={toggleRec} disabled={!midi.devices.length && !rec} data-creator-record="1">
              {rec ? `${tx.recStop} — ${tx.recording}` : tx.recStart}
            </button>
          </>
        )}
        <label className="dc-text">
          <span>{indep ? tx.rh : tx.pattern}</span>
          <input value={rhText} onChange={(e) => setRhText(e.target.value)} dir="ltr" spellCheck={false} data-creator-degrees="1" />
        </label>
        {indep && (
          <label className="dc-text">
            <span>{tx.lh}</span>
            <input value={lhText} onChange={(e) => setLhText(e.target.value)} dir="ltr" spellCheck={false} data-creator-lh="1" />
          </label>
        )}
        {entry === 'type' && (
          <p className="field-hint dc-syntax" dir="ltr">
            {tx.typeHint}
            {guitar ? tx.typeHintG : ''}
          </p>
        )}
        {bad.length > 0 && (
          <p className="field-hint warn">
            {tx.unread}: <span dir="ltr">{bad.join(' ')}</span>
          </p>
        )}
      </section>

      {/* ── preview ── */}
      <section className="card dc-sec dc-preview" aria-label={tx.preview}>
        <div className="dc-head">
          <h3>
            {tx.preview} {tx.inKey}
          </h3>
          <select value={previewKey} onChange={(e) => setPKey(Number(e.target.value))} aria-label={tx.keys} data-creator-preview-key="1">
            {keys.map((k) => (
              <option key={k} value={k}>
                {keyName(k, !!o.minor)}
                {o.minor ? 'm' : ''}
              </option>
            ))}
          </select>
          <button type="button" className={`btn small ${playing ? 'primary' : ''}`} onClick={() => void listen()} disabled={!preview} data-creator-listen="1">
            {playing ? tx.stopListen : tx.listen}
          </button>
        </div>
        {preview && (
          <>
            {guitar && (settings?.guitarView ?? 'tab') !== 'staff' && <DrillTab drill={preview} fingering={!!settings?.showFingering} picking={!!settings?.showPicking} />}
            {(!guitar || (settings?.guitarView ?? 'tab') !== 'tab') && <DrillStaff drill={preview} />}
            <p className="dc-meta" dir="ltr">
              {preview.notes.length} {tx.notes} · {+preview.beats.toFixed(2)} {tx.beats} · ♩ {preview.startBpm}
              {c.goalBpm ? ` → ${c.goalBpm}` : ''}
            </p>
          </>
        )}
        {ok ? (
          <p className="field-hint good">✓ {tx.allGood}</p>
        ) : (
          <ul className="dc-problems" aria-label={tx.problems}>
            {problems.map((p, i) => (
              <li key={i}>{p[lang]}</li>
            ))}
          </ul>
        )}
      </section>

      {/* ── hands ── */}
      {!guitar && (
        <section className="card dc-sec">
          <h3>{tx.hands}</h3>
          {chips(['R', 'L', 'octaves', 'contrary', 'independent'] as const, mode, (v) => tx.handsModes[v], (v) => (set({ handsMode: v }), setRow('R')), 'data-creator-hands')}
        </section>
      )}

      {/* ── guitar / bass on the neck ── */}
      {guitar && (
        <section className="card dc-sec">
          <h3>{tx.neck}</h3>
          <div className="row">
            <span>{tx.rootStr}</span>
            {chips(rootChoices, rootStringOf(o), (v) => String(v), (v) => set({ rootString: v }))}
          </div>
          <div className="row">
            <span>{tx.strings}</span>
            <div className="chips">
              {Array.from({ length: nStr }, (_, i) => i + 1).map((s) => {
                const on = stringSet.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    className={`chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    onClick={() => {
                      const next = on ? stringSet.filter((x) => x !== s) : [...stringSet, s].sort((a, b) => a - b);
                      set({ strings: next.length === nStr ? undefined : next });
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          {check(!!o.stretch, tx.stretch, (v) => set({ stretch: v || undefined }))}
        </section>
      )}

      {/* ── movement ── */}
      <section className="card dc-sec">
        <h3>{tx.movement}</h3>
        <div className="row">
          <span>{tx.seq}</span>
          <div className="dc-stepper" dir="ltr">
            <button type="button" className="chip" onClick={() => set({ sequenceSteps: Math.max(0, o.sequenceSteps - 1) })} aria-label="−">
              −
            </button>
            <b data-creator-seq="1">{o.sequenceSteps}</b>
            <button type="button" className="chip" onClick={() => set({ sequenceSteps: Math.min(14, o.sequenceSteps + 1) })} aria-label="+">
              +
            </button>
          </div>
          <small>{tx.times}</small>
        </div>
        {o.sequenceSteps > 0 && (
          <div className="row">
            <span>{tx.step}</span>
            {chips([1, 2, 3] as const, o.step ?? 1, (v) => tx.steps[v], (v) => set({ step: v }))}
          </div>
        )}
        <div className="row">
          <span>{tx.dir}</span>
          {chips(['up', 'down', 'updown'] as const, o.direction ?? 'updown', (v) => tx.dirs[v], (v) => set({ direction: v }))}
        </div>
        <div className="row">
          <span>{tx.octaves}</span>
          {chips([1, 2, 3, 4] as const, o.octaves ?? 1, (v) => String(v), (v) => set({ octaves: v }))}
        </div>
      </section>

      {/* ── keys & scale ── */}
      <section className="card dc-sec">
        <h3>{tx.keys}</h3>
        <div className="row">
          <span>{tx.tonality}</span>
          {chips(['major', 'minor'] as const, o.minor ? 'minor' : 'major', (v) => tx[v], (v) =>
            setO((x) => {
              const minor = v === 'minor';
              const cur = creatorScaleOf(x);
              const next: CreatorScale = minor && ['major', 'mixolydian', 'lydian', 'bebop-dom', 'six-dim', 'harmonic-major'].includes(cur) ? 'natural' : !minor && ['natural', 'harmonic', 'melodic', 'dorian', 'phrygian'].includes(cur) ? 'major' : cur;
              return withScale({ ...x, minor: minor || undefined }, next);
            }),
          )}
        </div>
        <label className="row">
          <span>{tx.scale}</span>
          <select value={sc} onChange={(e) => setO((x) => withScale(x, e.target.value as CreatorScale))} data-creator-scale="1">
            {CREATOR_SCALES.map((s) => (
              <option key={s} value={s}>
                {SCALE_NAMES[s][lang]}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <span>{tx.keys}</span>
          {chips(['all', 'pick'] as const, o.keys ? 'pick' : 'all', (v) => (v === 'all' ? tx.allKeys : tx.pickKeys), (v) => set({ keys: v === 'all' ? undefined : (o.keys ?? [0]) }))}
        </div>
        {o.keys && (
          <div className="chips dc-keys" dir="ltr">
            {Array.from({ length: 12 }, (_, i) => mod((o.minor ? 9 : 0) + i, 12)).map((k) => {
              const on = o.keys!.includes(k);
              return (
                <button key={k} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => set({ keys: on ? o.keys!.filter((x) => x !== k) : [...o.keys!, k].sort((a, b) => a - b) })} data-key={k}>
                  {keyName(k, !!o.minor)}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── tempo & grading ── */}
      <details className="card dc-sec" open={!!(o.goalBpm || o.dynamics)}>
        <summary>
          <h3>{tx.tempo}</h3>
        </summary>
        <div className="row">
          <span>{tx.startBpm}</span>
          <input type="number" min={20} max={300} value={o.startBpm ?? preview?.startBpm ?? ''} onChange={(e) => set({ startBpm: e.target.value ? Number(e.target.value) : undefined })} data-creator-start-bpm="1" />
          <span>{tx.goalBpm}</span>
          <input type="number" min={20} max={300} value={o.goalBpm ?? ''} placeholder="—" onChange={(e) => set({ goalBpm: e.target.value ? Number(e.target.value) : undefined })} data-creator-goal-bpm="1" />
        </div>
        <div className="row">
          <span>{tx.dyn}</span>
          {chips(DYNS, o.dynamics ?? 'none', (v) => tx.dyns[v], (v) => set({ dynamics: v === 'none' ? undefined : (v as DynamicsGoal) }))}
        </div>
        <div className="row">
          <span>{tx.graded}</span>
          {check(o.grade?.evenness ?? true, tx.gEven, (v) => set({ grade: { ...o.grade, evenness: v } }))}
          {twoHands && check(o.grade?.hands ?? true, tx.gHands, (v) => set({ grade: { ...o.grade, hands: v } }))}
          {o.dynamics && check(o.grade?.dynamics ?? true, tx.gDyn, (v) => set({ grade: { ...o.grade, dynamics: v } }))}
        </div>
        <div className="row">
          <span>{tx.include}</span>
          {check(o.inToday !== false, tx.inToday, (v) => set({ inToday: v ? undefined : false }))}
          {check(o.inWorkout !== false, tx.inWorkout, (v) => set({ inWorkout: v ? undefined : false }))}
          {check(o.inPath !== false, tx.inPath, (v) => set({ inPath: v ? undefined : false }))}
        </div>
      </details>

      {/* ── share ── */}
      <details className="card dc-sec">
        <summary>
          <h3>{tx.share}</h3>
        </summary>
        <div className="row">
          <button type="button" className="btn small" onClick={() => void copyCode()} disabled={!ok} data-creator-share="1">
            ⧉ {tx.copyCode}
          </button>
        </div>
        <div className="row">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={tx.paste} dir="ltr" spellCheck={false} data-creator-code="1" />
          <button type="button" className="btn small ghost" onClick={importCode} disabled={!code.trim()}>
            {tx.importBtn}
          </button>
        </div>
        {shareMsg && <p className="field-hint">{shareMsg}</p>}
      </details>

      <div className="drill-actions dc-actions">
        <button type="button" className="btn" disabled={!ok} onClick={() => onTry(c)} data-creator-try="1">
          {tx.tryAll}
        </button>
        <button type="button" className="btn primary" disabled={!ok} onClick={() => onSave(c)} data-creator-save="1">
          {tx.save}
        </button>
        {onDelete && (
          <button type="button" className="btn ghost" onClick={onDelete}>
            {tx.del}
          </button>
        )}
      </div>
    </div>
  );
}

/** A small piano keyboard (lo..hi) with the tonic marked and scale degrees on the keys. */
function Keyboard({ lo, hi, tonic, ints, onTap }: { lo: number; hi: number; tonic: number; ints: number[]; onTap: (p: number) => void }) {
  const W = 30;
  const whites: number[] = [];
  for (let p = lo; p <= hi; p++) if (!isBlack(p)) whites.push(p);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Start scrolled to the tonic.
    const el = ref.current;
    const i = whites.indexOf(tonic);
    if (el && i >= 0) el.scrollLeft = Math.max(0, i * W - 2 * W);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tonic, lo]);
  const keys: ReactNode[] = [];
  let wi = 0;
  for (let p = lo; p <= hi; p++) {
    const d = pitchToDegree(p, tonic, ints, 'smart');
    const inScale = !!d && d.alt === 0;
    const cls = `dc-key ${isBlack(p) ? 'black' : 'white'} ${inScale ? 'in' : ''} ${p === tonic ? 'tonic' : ''}`;
    const style = isBlack(p) ? { left: wi * W - W * 0.32, width: W * 0.64 } : { left: wi * W, width: W };
    keys.push(
      <button key={p} type="button" className={cls} style={style} onClick={() => onTap(p)} aria-label={degLabel(d) || String(p)} data-pitch={p}>
        <span>{inScale ? degLabel(d) : ''}</span>
      </button>,
    );
    if (!isBlack(p)) wi++;
  }
  return (
    <div className="dc-kbd-wrap" ref={ref} dir="ltr">
      <div className="dc-kbd" style={{ width: whites.length * W }}>
        {keys}
      </div>
    </div>
  );
}

/** A fretboard window around the tonic (string 1 on top, as in tab), scale degrees on the frets. */
function Fretboard({ c, ints, tonic, onTap }: { c: CustomDrill; ints: number[]; tonic: number; onTap: (p: number) => void }) {
  const tu = tuningOfCustom(c);
  const rs = rootStringOf(c);
  const tf = tonic - tu.open[rs - 1];
  const lo = Math.max(0, tf - 3);
  const frets = Array.from({ length: 9 }, (_, i) => lo + i);
  return (
    <div className="dc-neck-wrap" dir="ltr">
      <div className="dc-neck" style={{ gridTemplateColumns: `24px repeat(${frets.length}, minmax(34px, 1fr))` }}>
        <span />
        {frets.map((f) => (
          <span key={f} className="dc-fretno">
            {f}
          </span>
        ))}
        {tu.open.map((open, i) => (
          <FretRow key={i} s={i + 1} open={open} frets={frets} tonic={tonic} ints={ints} onTap={onTap} allowed={!c.strings?.length || c.strings.includes(i + 1)} />
        ))}
      </div>
    </div>
  );
}
function FretRow({ s, open, frets, tonic, ints, onTap, allowed }: { s: number; open: number; frets: number[]; tonic: number; ints: number[]; onTap: (p: number) => void; allowed: boolean }) {
  return (
    <>
      <span className="dc-strno">{s}</span>
      {frets.map((f) => {
        const p = open + f;
        const d = pitchToDegree(p, tonic, ints, 'smart');
        const inScale = !!d && d.alt === 0;
        return (
          <button key={f} type="button" className={`dc-fret ${inScale ? 'in' : ''} ${mod(p - tonic, 12) === 0 ? 'tonic' : ''} ${allowed ? '' : 'off'}`} onClick={() => onTap(p)} aria-label={`${s}/${f} ${degLabel(d)}`} data-sf={`${s}-${f}`}>
            {inScale ? degLabel(d) : ''}
          </button>
        );
      })}
    </>
  );
}
