// Improvisation beyond notes (0.53): three exercises over a band.
//   Phrasing     — improvise over a chart under a phrasing rule (max density, two-bar phrases, a bar of rest);
//                  the result: phrases, space, density, arcs, and whether your opening idea came back developed.
//   Vary it      — a short phrase plays; play it back changed as asked (moved in time, ornamented, transposed, answered).
//   Trading 4s   — you play four bars, the app answers with your idea developed; three rounds.
// Input: a MIDI keyboard, or the on-screen keys.
import { useEffect, useRef, useState } from 'react';
import { IMPROV_LEVELS, parseChart } from '../engine/charts';
import { styledBacking } from '../engine/styleBand';
import type { BandStyle } from '../engine/band';
import { checkPhraseRule, developmentScore, judgeVariation, motifReturns, phraseToVary, phrasingReport, tradeAnswer, type PhraseRule, type PNote, type Variation } from '../engine/improvPhrasing';
import type { NoteEvent } from '../engine/lesson';
import type { Settings } from '../storage/progress';
import { midi } from '../speech/midi';
import { piano } from './services';
import { ChallengeList } from './ImprovRules';
import { STANDARD_CHANGES } from '../engine/standards';
import { ListenOriginal } from './ListenOriginal';
import { keepChartTake } from './recKeep';
import type { MyChart, VocabCtx } from './Charts';
import { LicksFound, type FoundUses } from './LicksFound';
import { LICK_CARDS, takeUses, type LickCardId } from '../engine/vocab';
import { cardKept, checkCard, spansOfChart } from '../engine/ruleCards';
import { RULE_NAME } from '../engine/improvRules';
import type { ParsedChart } from '../engine/charts';
import type { Channel } from '../engine/drills/channel';
import { UseIt, lickInstrumentOf } from './LickTrainer';
import { lickById, type Lick } from '../engine/licks';
import { lickImprovChart, TODAYS_LICK_RULES } from '../engine/lickImprov';
import { kName } from './encore/bits';
import { isMinorLick } from '../engine/licks';
import type { RatingEvent } from '../engine/rating';
import { KeepButton } from './encore/bits';
import { keepPhrase } from '../engine/encore/takeSource';
import { Icon } from './icons';
import { ImprovLevelPage } from './ImprovLevelPage';
import { focusOf } from '../engine/styleFocus';
import { STYLE_CHART, STYLE_TEXT, type StyleId } from '../engine/styles';
import type { CourseId } from '../engine/courses';
import type { ChartStyle } from '../engine/charts';
import { ScaleRotation, ScaleStrip } from './ScaleRotation';
import { HarrisWay } from './HarrisWay';
import { harrisTierOf, type HarrisTier } from '../engine/harrisTrack';
import { buildRotationSheet, gradeRotation, improvTake, type ImprovTake, type RotationGrade } from '../engine/rotationSheet';
import type { ModeStats } from '../engine/rotation';

type Lang = 'en' | 'he';
type Mode = 'scales' | 'rules' | 'phrasing' | 'vary' | 'trade' | 'useit';
/** The segmented control's short labels (COURSE-FEEDBACK-UI §4.7: Rules / Phrase / Vary / Trade). */
const SEG: Record<'en' | 'he', Record<Mode, string>> = {
  en: { scales: 'Scales', rules: 'Rules', phrasing: 'Phrase', vary: 'Vary', trade: 'Trade', useit: 'Lick' },
  he: { scales: 'סולמות', rules: 'כללים', phrasing: 'משפט', vary: 'וריאציה', trade: 'חילופים', useit: 'ליק' },
};
const TX = {
  en: {
    title: 'Improvisation studio', scales: 'Scale rotation', scalesHow: 'Improvise over the chords with the scale written on each one. The scales change as you go; the colour notes are what each scale adds.', todayLick: "Today's lick", todayLickHow: 'Work it in once a chorus', inWorkout: "Part of today's workout", useIt: 'Improvise with it', covLine: 'Colour coverage', inSetLine: 'in the scale', useit: "Today's lick", useitHow: 'One of your licks, picked by need (due for review, or the newest). Improvise over a chart and work it in where the chart marks it — or over the band through four keys.', overChart: 'Over a chart', overBand: 'Over the band, four keys', picked: 'Picked for you', rules: 'Rules', rulesHow: 'Improvise over a chart under rules — every note is checked. Choose a chart, then a challenge; or set your own rules in the chart.', chartFrom: 'Chart to play over', levels: 'Improvisation levels', standards: 'Standards', mine: 'My charts', phrasing: 'Phrasing', vary: 'Vary it', trade: 'Trading fours', chart: 'Chart', rule: 'Rule', start: 'Start', stop: 'Stop', tempo: 'Tempo', back: 'Back',
    ruleNames: ['At most one note a beat', 'At most 2 notes a beat', 'Phrases of one bar', 'Phrases of two bars', 'Phrases of four bars', 'A bar of rest between phrases'],
    phrasingHow: 'Improvise over the band. Think in sentences: say something, then leave space. The rule shapes it.',
    varyHow: 'Listen to the phrase, then play it back changed as asked. Keep something of it — its shape or its rhythm.',
    tradeHow: 'You play four bars; the band and the app answer with your idea developed. Three rounds.',
    tradeEarHow: 'By ear: the band plays four bars with a phrase; you answer it in the next four — pick up its rhythm or its motif. Three rounds.',
    whoLeads: 'Who starts', iLead: 'I start', bandLeads: 'The band starts (by ear)', answered: 'answered the phrase', notAnswered: 'no answer to the phrase', lickRule: 'With a lick card', none: 'No lick card',
    asks: { displace: 'Move it in time (start it on another beat)', ornament: 'Ornament it (add notes around it)', transpose: 'Move it to another pitch (same shape)', answer: 'Answer it (a reply that ends at home)' } as Record<Variation, string>,
    phrases: 'phrases', space: 'space', density: 'notes / beat', arcs: 'phrases that build', motif: 'Your opening idea came back', times: 'times', dev: 'development', listen: 'Listen', yourTurn: 'Your turn', keys: 'Play here if you have no MIDI keyboard',
    round: 'Round',
  },
  he: {
    title: 'סטודיו לאלתור', scales: 'סבב סולמות', scalesHow: 'אלתרו מעל האקורדים בסולם שכתוב על כל אחד. הסולמות מתחלפים תוך כדי; צלילי הצבע הם מה שכל סולם מוסיף.', todayLick: 'הליק של היום', todayLickHow: 'שלבו אותו פעם בכל כורוס', inWorkout: 'חלק מהאימון של היום', useIt: 'לאלתר איתו', covLine: 'כיסוי צבע', inSetLine: 'בתוך הסולם', useit: 'הליק של היום', useitHow: 'אחד הליקים שלכם, לפי הצורך (חזרה שהגיע זמנה, או החדש ביותר). אלתרו על מהלך ושלבו אותו איפה שהמהלך מסמן — או מעל הלהקה בארבעה סולמות.', overChart: 'על מהלך', overBand: 'מעל הלהקה, ארבעה סולמות', picked: 'נבחר בשבילכם', rules: 'אלתור עם כללים', rulesHow: 'מאלתרים מעל מהלך תחת כללים — כל צליל נבדק. בחרו מהלך ואז אתגר; או קבעו כללים משלכם בתוך המהלך.', chartFrom: 'מהלך לאלתר עליו', levels: 'שלבי אלתור', standards: 'סטנדרטים', mine: 'המהלכים שלי', phrasing: 'פרייזינג', vary: 'וריאציה', trade: 'חילופי ארבע', chart: 'מהלך', rule: 'חוק', start: 'להתחיל', stop: 'עצירה', tempo: 'טמפו', back: 'חזרה',
    ruleNames: ['לכל היותר צליל אחד לפעמה', 'לכל היותר 2 צלילים לפעמה', 'משפטים של תיבה אחת', 'משפטים של שתי תיבות', 'משפטים של ארבע תיבות', 'תיבה של שקט בין משפטים'],
    phrasingHow: 'אלתרו מעל הלהקה. חשבו במשפטים: להגיד משהו, ואז להשאיר מקום. החוק מעצב את זה.',
    varyHow: 'הקשיבו למשפט, ואז נגנו אותו בחזרה בשינוי שהתבקש. שמרו משהו ממנו — הצורה או הקצב.',
    tradeHow: 'אתם מנגנים ארבע תיבות; הלהקה והאפליקציה עונות עם הרעיון שלכם בפיתוח. שלושה סבבים.',
    tradeEarHow: 'בשמיעה: הלהקה מנגנת ארבע תיבות עם משפט; אתם עונים לו בארבע הבאות — תפסו את הקצב או את המוטיב שלו. שלושה סבבים.',
    whoLeads: 'מי פותח', iLead: 'אני פותח', bandLeads: 'הלהקה פותחת (בשמיעה)', answered: 'עניתם למשפט', notAnswered: 'אין תשובה למשפט', lickRule: 'עם קלף ליק', none: 'בלי קלף ליק',
    asks: { displace: 'להזיז אותו בזמן (להתחיל על פעמה אחרת)', ornament: 'לקשט אותו (להוסיף צלילים סביבו)', transpose: 'להעביר לגובה אחר (אותה צורה)', answer: 'לענות לו (תשובה שמסתיימת בבית)' } as Record<Variation, string>,
    phrases: 'משפטים', space: 'שקט', density: 'צלילים לפעמה', arcs: 'משפטים שנבנים', motif: 'הרעיון הפותח חזר', times: 'פעמים', dev: 'פיתוח', listen: 'להקשיב', yourTurn: 'תורכם', keys: 'נגנו כאן אם אין מקלדת MIDI',
    round: 'סבב',
  },
};

const RULES: PhraseRule[] = [
  { kind: 'max-density', perBeat: 1 },
  { kind: 'max-density', perBeat: 2 },
  { kind: 'phrase-bars', bars: 1, meter: 4 },
  { kind: 'phrase-bars', bars: 2, meter: 4 },
  { kind: 'phrase-bars', bars: 4, meter: 4 },
  { kind: 'rest-bar', meter: 4 },
];

/** A two-octave strip of keys for players without a MIDI keyboard. */
function KeyStrip({ onKey }: { onKey: (m: number) => void }) {
  const keys = Array.from({ length: 25 }, (_, i) => 60 + i);
  const black = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
  return (
    <div className="is-keys" dir="ltr">
      {keys.map((m) => (
        <button key={m} className={`is-key ${black(m) ? 'b' : 'w'}`} onPointerDown={() => onKey(m)} aria-label={String(m)} />
      ))}
    </div>
  );
}

/** The chord tones (pitch classes) sounding at a beat of a parsed chart (4/4). */
function pcsAt(p: ParsedChart, beat: number): number[] {
  let cur = p.chords[0];
  for (const c of p.chords) if (c.bar * 4 + c.at <= beat + 1e-6) cur = c;
  return cur ? cur.iv.map((x) => (cur.root + x) % 12) : [0, 4, 7];
}
/**
 * The band's phrase for trading by ear (SPEC-EAR-AND-READING §3.4): a short motif (the Vary exercise's generator: four
 * to six scale notes, a clear rhythm) in bar 1, developed over bars 2–4 the way the band answers the player
 * (tradeAnswer: a step up, inverted, a step down), every note moved to the nearest chord tone of the chord under it.
 */
export function callPhrase(p: ParsedChart, seed: number): PNote[] {
  const tonic = 60 + (p.chords[0]?.root ?? 0);
  const motif = phraseToVary(seed, tonic).filter((n) => n.beat < 3.75);
  const line = [...motif, ...tradeAnswer(motif, tonic, 4).filter((n) => n.beat < 15)];
  return line.map((n) => {
    const pcs = pcsAt(p, n.beat);
    let best = n.midi;
    for (let d = 0; d <= 6; d++) {
      if (pcs.includes((((n.midi - d) % 12) + 12) % 12)) {
        best = n.midi - d;
        break;
      }
      if (pcs.includes((n.midi + d) % 12)) {
        best = n.midi + d;
        break;
      }
    }
    return { ...n, midi: best };
  });
}

/** The workout's improvisation block (SPEC-LICKS-IN-IMPROV §4): today's lick, over its chart in the key of the day. */
export function TodayLickCard({ lick, dayKey, lang, onOpen, workout = true }: { lick: Lick; dayKey: number; lang: Lang; onOpen?: (c: MyChart) => void; /** Opened from the workout (the card says so). */ workout?: boolean }) {
  const tx = TX[lang];
  const minor = isMinorLick(lick);
  return (
    <div className="is-lick-card" data-is-today-lick={lick.id}>
      <div>
        <small>
          {workout ? `${tx.inWorkout} · ` : ''}
          {tx.todayLick}
        </small>
        <b>
          {lick.name[lang]} · <bdi dir="ltr">{kName(dayKey, minor)}</bdi>
        </b>
        <small>{tx.todayLickHow}</small>
      </div>
      {onOpen && (
        <button
          className="btn ghost"
          data-is-today-lick-open="1"
          onClick={() => {
            const c = lickImprovChart(lick, dayKey);
            onOpen({ id: `lick-${lick.id}-${Date.now()}`, title: `${tx.todayLick}: ${lick.name[lang]} · ${kName(dayKey, minor)}`, text: c.text, style: c.style, bpm: c.bpm, rules: TODAYS_LICK_RULES, lick: lick.id });
          }}
        >
          {tx.useIt}
        </button>
      )}
    </div>
  );
}

export function ImprovStudioScreen({ settings, onBack, onOpenChart, onLickUsed, initialChart, title, vocab, tier = 1, dayKey = 0, onTier, onHarrisTier, onTake, workout = false, styleToday, onStyleMinutes }: { /** Phase 8: the Barry Harris way's tier (H-1…H-4), chosen by the player. */ onHarrisTier?: (t: HarrisTier) => void; /** SPEC-STYLE-FOCUS §4: the style the band plays first (today's workout share; default the main style). */ styleToday?: StyleId; /** Minutes improvised over a style's band (§9.4's time per style). */ onStyleMinutes?: (style: StyleId, minutes: number) => void; /** The scale-rotation tier (T1–3, rotationSheet.rbiTier). */ tier?: 1 | 2 | 3; /** The key of the day (the key session's key of the week). */ dayKey?: number; onTier?: (t: 1 | 2 | 3) => void; /** Every take as one rated result (XP, league, rating, the mode × function stats). */ onTake?: (t: ImprovTake & { /** SPEC-PROGRESS-CHARTS §1: the take's in-scale share (the snapshot's in-scale rate). */ inSet?: number }, /** How it was played (trading by ear: ear-fresh; else the lead sheet in view). */ channel?: Channel) => void; /** Opened from the workout's improvisation block: the scales first, with today's lick on top. */ workout?: boolean; /** The lick pool and today's lick (phase 4: the Lick mode is "today's lick"). */ vocab?: VocabCtx; settings: Settings; onBack: () => void; onOpenChart?: (c: MyChart) => void; /** "Use it" with one of my licks (SPEC-LICKS-TRANSCRIPTION): its rated event and XP. */ onLickUsed?: (evs: RatingEvent[], xp: number) => void; /** Opened from a piece (Repertoire's "Improvise on it"): the rules start on this chart. */ initialChart?: MyChart | null; /** Beside the title (the place's sparkline). */ title?: React.ReactNode }) {
  const lang: Lang = settings.uiLang;
  const tx = TX[lang];
  const [mode, setMode] = useState<Mode>(workout || !initialChart ? 'scales' : onOpenChart ? 'rules' : 'phrasing');
  // phase 8: the scales tab holds two tracks (A the scale rotation, B the Barry Harris way); A by default
  const [track, setTrack] = useState<'A' | 'B'>('A');
  // SPEC-STYLE-FOCUS §4: the band's default style is the main style (or today's style from the workout); the level's
  // own band is one tap away.
  const bandStyleId: StyleId = styleToday ?? focusOf(settings, (settings.activeCourse ?? 'keys') as CourseId).main;
  const styleBand: ChartStyle | BandStyle | null = STYLE_CHART[bandStyleId] ?? null;
  const [band, setBand] = useState<'level' | 'style'>(styleBand ? 'style' : 'level');
  const startedAt = useRef<number | null>(null);
  const [src, setSrc] = useState(initialChart ? 'piece:' : 'lv:4');
  const [lvPage, setLvPage] = useState<number | null>(null);
  const [lv, setLv] = useState(IMPROV_LEVELS[3].n);
  const [rule, setRule] = useState(0);
  const [bpm, setBpm] = useState(96);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<React.ReactNode>(null);
  const [round, setRound] = useState(0);
  const [askIdx, setAskIdx] = useState(0);
  // today's lick first, then the rest of the pool (any lick played at all); without a pool, the licks in "mine"
  const mineOld = (settings.lickBook?.mine ?? []).map((id) => lickById(id, settings.lickBook?.own ?? [])).filter((l): l is NonNullable<typeof l> => !!l);
  // the approach cells are detected in every take but are not "use it" licks
  const pool = (vocab?.pool.length ? vocab.pool : mineOld).filter((l) => !l.cell);
  const myLicks = vocab?.today ? [vocab.today, ...pool.filter((l) => l.id !== vocab.today!.id)] : pool;
  // SPEC-LICKS-IN-IMPROV §2: a lick card can ride along with the scale rotation (the take's notes are checked here, at
  // the take boundary); its result and the licks found in the last rotation take
  const [lickCard, setLickCard] = useState<LickCardId | ''>('');
  const [rotLicks, setRotLicks] = useState<{ found: FoundUses | null; card: { id: LickCardId; ok: number; total: number; kept: boolean } | null } | null>(null);
  // Trade (SPEC-EAR-AND-READING §3.4): the player starts (as before) or the band starts with a phrase, answered by ear
  const [lead, setLead] = useState<'me' | 'band'>('me');
  const [turn, setTurn] = useState<'band' | 'you' | null>(null);
  const [lickId, setLickId] = useState(myLicks[0]?.id ?? '');
  const ctl = useRef<AbortController | null>(null);
  const t0 = useRef(0);
  const notes = useRef<PNote[]>([]);
  const open = useRef(new Map<number, number>());
  const beatS = 60 / bpm;
  useEffect(() => () => ctl.current?.abort(), []);

  const noteOn = (m: number, at = performance.now()) => {
    if (!t0.current) return;
    const beat = (at - t0.current) / 1000 / beatS;
    open.current.set(m, beat);
    notes.current.push({ beat, dur: 0, midi: m });
  };
  const noteOff = (m: number, at = performance.now()) => {
    const b = open.current.get(m);
    if (b === undefined) return;
    open.current.delete(m);
    const n = [...notes.current].reverse().find((x) => x.midi === m && x.beat === b);
    if (n) n.dur = Math.max(0, (at - t0.current) / 1000 / beatS - b);
  };
  useEffect(() => midi.onNote((m, on, at) => (on ? noteOn(m, at) : noteOff(m, at))));
  const onScreenKey = (m: number) => {
    noteOn(m);
    if (settings.midiSound !== false) void piano.unlock().then(() => piano.play([{ midi: m, start: 0, duration: 0.35, velocity: 0.7 }], 0.4, new AbortController().signal).catch(() => {}));
    setTimeout(() => noteOff(m), 250);
  };

  /** Play events; t0 = when beat 0 (after `countBeats`) is heard. Resolves when done. */
  const run = async (events: NoteEvent[], length: number, countBeats: number) => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    notes.current = [];
    open.current.clear();
    t0.current = performance.now() + 60 + countBeats * beatS * 1000;
    await piano.play(events, length, c.signal).catch(() => {});
    return !c.signal.aborted;
  };

  const chartOf = () => {
    const L = IMPROV_LEVELS.find((x) => x.n === lv) ?? IMPROV_LEVELS[0];
    // the band: the player's style (any band style, styleBand.ts) or the level's own
    const bandStyle: ChartStyle | BandStyle = band === 'style' && styleBand ? styleBand : L.style;
    return { L, p: parseChart(L.text), bandStyle };
  };
  // §9.4: the time over a style's band counts for that style (the level's own band is jazz)
  useEffect(() => {
    if (running) {
      startedAt.current = Date.now();
      return;
    }
    if (startedAt.current === null) return;
    const min = (Date.now() - startedAt.current) / 60000;
    startedAt.current = null;
    if (min >= 0.25) onStyleMinutes?.(band === 'style' && styleBand ? bandStyleId : 'jazz', min);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  // Phrase / Trade are graded against the rotation's scales too (shown as a strip above Start): the same colour
  // coverage, and the take folds into the mode × function stats (SPEC-RBI-ROTATION §5, BUILD-PLAN phase 5).
  const stats: ModeStats = settings.rotationStats ?? {};
  const levelSheet = (() => {
    const { p } = chartOf();
    return mode === 'trade' ? buildRotationSheet({ ...p, bars: Math.min(4, p.bars), chords: p.chords.filter((c) => c.bar < 4) }, { tier, stats, choruses: 1 }) : buildRotationSheet(p, { tier, stats, choruses: 2 });
  })();
  /**
   * SPEC-LICKS-IN-IMPROV §3–4 at the take boundary: the licks of mine in the take's notes (beats from the chart's first
   * beat) over the chart — booked by the app (the usage log, "in my language", the review, XP) and shown in the debrief.
   */
  const bookLicks = (played: { beat: number; midi: number; dur?: number }[], p: ParsedChart, bars: number, takeBpm: number, session: string): FoundUses | null => {
    if (!vocab?.pool.length || played.length < 3) return null;
    const notesB = played.map((n) => ({ beat: n.beat, midi: Math.round(n.midi), dur: n.dur }));
    const r = takeUses({ pool: vocab.pool, closed: vocab.closed, notes: notesB, spans: spansOfChart(p, 4, bars), session, tol: vocab.tol, meter: 4 });
    if (r.uses.length) vocab.onUses?.(r.uses, r.xp);
    return { ...r, notes: notesB, bpm: takeBpm };
  };
  const lickCardOf = (id: LickCardId, played: { beat: number; midi: number; dur?: number }[], p: ParsedChart, bars: number, takeBpm: number) => {
    const c = checkCard(id, { notes: played.map((n) => ({ beat: n.beat, dur: n.dur ?? 0.25, midi: n.midi })), spans: spansOfChart(p, 4, bars), meter: 4, bpm: takeBpm, opt: { licks: vocab?.pool ?? [], ...(vocab?.today ? { today: vocab.today } : {}), ...(vocab?.closed ? { closedKeys: vocab.closed } : {}), ...(vocab?.tol ? { lickTol: vocab.tol } : {}) } });
    return { id, ok: c.ok, total: c.total, kept: cardKept(id, c) };
  };
  const CovLine = ({ g }: { g: RotationGrade }) =>
    g.m.colourSpans ? (
      <p className="is-cov" data-is-cov={Math.round(g.m.colour * 100)}>
        {tx.covLine} <bdi dir="ltr">{Math.round(g.m.colour * 100)}%</bdi> · {tx.inSetLine} <bdi dir="ltr">{Math.round(g.m.inSet * 100)}%</bdi>
      </p>
    ) : null;

  const startPhrasing = async () => {
    setRunning(true);
    setResult(null);
    const { L, p, bandStyle } = chartOf();
    const b = styledBacking(p, bandStyle, bpm, 2);
    const total = p.bars * 4 * 2;
    const done = await run(b.events, b.length, b.startBeat);
    setRunning(false);
    if (!done) return;
    const played = notes.current.filter((n) => n.beat >= -0.25 && n.beat <= total);
    const rep = phrasingReport(played, total);
    // My recordings (SPEC-PHRASE-STUDIO §6.1): the improvised notes, with the chart to play them back over the band.
    keepChartTake({ kind: 'improv', title: { en: `Phrasing · ${L.text.split('|')[0].trim()}`, he: `משפטים · ${L.text.split('|')[0].trim()}` }, notes: played.map((n) => ({ start: n.beat * beatS, end: (n.beat + Math.max(0.1, n.dur)) * beatS, midi: n.midi })), bpm, meter: 4, chart: L.text, style: L.style, loops: 2, source: midi.devices.length ? 'midi' : 'screen' });
    const chk = checkPhraseRule(played, total, RULES[rule]);
    const mot = motifReturns(played);
    const sh = buildRotationSheet(p, { tier, stats, choruses: 2 });
    const g = sh ? gradeRotation(sh, played, stats, new Date().toISOString()) : null;
    const phraseScore = (chk.ok ? 0.5 : 0.2) + 0.25 * developmentScore(mot.returns) + 0.25 * (g?.score ?? 0);
    onTake?.({ ...improvTake('phrasing', { score: phraseScore, notes: played.length, tier, bpm, stats: g?.stats }), ...(g && played.length ? { inSet: g.m.inSet } : {}) });
    const licksFound = bookLicks(played, p, p.bars * 2, bpm, `phrase-${Date.now().toString(36)}`);
    setResult(
      <div className="is-result" data-is-result="phrasing">
        <p className={chk.ok ? 'ok' : 'no'}>
          <Icon k={chk.ok ? 'check' : 'close'} size={14} /> {chk.why[lang]}
        </p>
        <ul className="is-stats" dir="ltr">
          <li>
            <b>{rep.phrases}</b> <small>{tx.phrases}</small>
          </li>
          <li>
            <b>{Math.round(rep.space * 100)}%</b> <small>{tx.space}</small>
          </li>
          <li>
            <b>{rep.density.toFixed(1)}</b> <small>{tx.density}</small>
          </li>
          <li>
            <b>{rep.buildingArcs}</b> <small>{tx.arcs}</small>
          </li>
        </ul>
        <p className="field-hint">
          {tx.motif}: {mot.returns.length} {tx.times} · {tx.dev} {Math.round(developmentScore(mot.returns) * 100)}%
        </p>
        {g && <CovLine g={g} />}
        {licksFound && licksFound.uses.length > 0 && <LicksFound found={licksFound} pool={vocab?.pool ?? []} lang={lang} />}
        {played.length >= 3 && (
          // Encore (SPEC-PHRASE-STUDIO §4.1): keep a phrase from this take.
          <KeepButton lang={lang} wide onKeep={() => keepPhrase({ kind: 'improv', instrument: 'piano', title: { en: `Improv over ${L.title.en}`, he: `אלתור על ${L.title.he}` }, source: midi.devices.length ? 'midi' : 'screen', notes: played.map((n) => ({ pitch: n.midi, on: n.beat * beatS * 1000, off: (n.beat + Math.max(0.1, n.dur)) * beatS * 1000, vel: 80 })), bpm, t0: 0, meter: 4, chart: L.text })} />
        )}
      </div>,
    );
  };

  const VARS: Variation[] = ['displace', 'ornament', 'transpose', 'answer'];
  const startVary = async () => {
    setRunning(true);
    setResult(null);
    const given = phraseToVary((Date.now() >>> 8) + askIdx, 60);
    const count = [0, 1, 2, 3].map((k) => ({ midi: 96, start: k * beatS, duration: 0.05, velocity: k ? 0.3 : 0.5, perc: (k ? 'click' : 'accent') as 'click' | 'accent' }));
    const phraseEv = given.map((n) => ({ midi: n.midi, start: (4 + n.beat) * beatS, duration: n.dur * beatS, velocity: 0.7 }));
    // then two bars of clicks for the answer
    const answerClicks = Array.from({ length: 8 }, (_, k) => ({ midi: 96, start: (12 + k) * beatS, duration: 0.05, velocity: k % 4 ? 0.2 : 0.35, perc: (k % 4 ? 'click' : 'accent') as 'click' | 'accent' }));
    const done = await run([...count, ...phraseEv, ...answerClicks], 20 * beatS + 0.3, 0);
    setRunning(false);
    if (!done) return;
    const answer = notes.current.filter((n) => n.beat >= 11.5 && n.beat <= 20).map((n) => ({ ...n, beat: n.beat - 12 + 0 }));
    const givenAligned = given.map((n) => ({ ...n }));
    const v = judgeVariation(givenAligned, answer, VARS[askIdx % VARS.length]);
    // Vary has no chords under it: a rated result without the scale stats
    onTake?.(improvTake('vary', { score: v.ok ? 1 : answer.length >= 3 ? 0.35 : 0, notes: answer.length, tier, bpm }));
    setResult(
      <div className="is-result" data-is-result="vary">
        <p className={v.ok ? 'ok' : 'no'}>
          <Icon k={v.ok ? 'check' : 'close'} size={14} /> {v.why[lang]}
        </p>
      </div>,
    );
    if (v.ok) setAskIdx((i) => i + 1);
  };

  const startTrade = async () => {
    setRunning(true);
    setResult(null);
    const { p, bandStyle } = chartOf();
    const four = { ...p, bars: Math.min(4, p.bars) };
    const scores: number[] = [];
    let tStats = stats;
    const grades: RotationGrade[] = [];
    const sh = buildRotationSheet(four, { tier, stats, choruses: 1 });
    let played = 0;
    const fourOnly = { ...four, chords: four.chords.filter((c) => c.bar < four.bars) };
    const allMine: PNote[] = [];
    let answeredN = 0;
    for (let r = 0; r < 3; r++) {
      setRound(r + 1);
      let call: PNote[] = [];
      if (lead === 'band') {
        // by ear (SPEC-EAR-AND-READING §3.4): the band's four bars carry a phrase first (with the count-in); the player
        // answers it in the next four
        setTurn('band');
        call = callPhrase(fourOnly, (Date.now() >>> 8) + r);
        const b0 = styledBacking(four, bandStyle, bpm, 1, { countIn: r === 0 });
        const ev0: NoteEvent[] = [...b0.events, ...call.map((n) => ({ midi: n.midi, start: (b0.startBeat + n.beat) * beatS, duration: Math.max(0.2, n.dur * beatS), velocity: 0.74 }))];
        if (!(await run(ev0, b0.length, b0.startBeat))) break;
      }
      // the player's four bars over the band (a count-in when the player starts)
      setTurn('you');
      const b = styledBacking(four, bandStyle, bpm, 1, { countIn: lead === 'me' });
      if (!(await run(b.events, b.length, b.startBeat))) break;
      const mine = notes.current.filter((n) => n.beat >= -0.25 && n.beat < 16);
      allMine.push(...mine.map((n) => ({ ...n, beat: n.beat + 16 * r })));
      if (lead === 'band') {
        // answered: the reply picks up the call's rhythm or its motif (judgeVariation: related)
        const v = judgeVariation(call.filter((n) => n.beat < 4), mine.filter((n) => n.beat < 4.5), 'answer');
        if (v.related) answeredN++;
        scores.push(v.related ? 1 : mine.length >= 3 ? 0.4 : 0);
      } else scores.push(developmentScore(motifReturns(mine).returns));
      played += mine.length;
      if (sh) {
        const g = gradeRotation(sh, mine, tStats, new Date().toISOString());
        tStats = g.stats;
        grades.push(g);
      }
      if (lead === 'me') {
        // the app's answer: the player's idea developed, over the band
        setTurn('band');
        const ans = tradeAnswer(mine, 60, 0);
        const back = styledBacking(four, bandStyle, bpm, 1, { countIn: false });
        const ev: NoteEvent[] = [...back.events, ...ans.map((n) => ({ midi: n.midi, start: n.beat * beatS, duration: Math.max(0.2, n.dur * beatS), velocity: 0.72 }))];
        if (!(await run(ev, back.length, 0))) break;
      }
    }
    setRunning(false);
    setRound(0);
    setTurn(null);
    const licksFound = bookLicks(allMine, fourOnly, four.bars * 3, bpm, `trade-${Date.now().toString(36)}`);
    // the rounds' colour coverage together (each round's spans pooled)
    const cov = grades.reduce((a, g) => ({ hit: a.hit + g.m.colour * g.m.colourSpans, n: a.n + g.m.colourSpans, inSet: a.inSet + g.m.inSet }), { hit: 0, n: 0, inSet: 0 });
    const pooled: RotationGrade | null = grades.length ? { ...grades[grades.length - 1], m: { ...grades[grades.length - 1].m, colour: cov.n ? cov.hit / cov.n : 0, colourSpans: cov.n, inSet: cov.inSet / grades.length }, stats: tStats } : null;
    if (scores.length) {
      const dev = scores.reduce((a, b) => a + b, 0) / scores.length;
      onTake?.({ ...improvTake('trade', { score: 0.5 * dev + 0.5 * (pooled ? 0.5 * pooled.m.colour + 0.5 * pooled.m.inSet : 0), notes: played, tier, bpm, stats: grades.length ? tStats : undefined }), ...(pooled ? { inSet: pooled.m.inSet } : {}) }, lead === 'band' ? 'ear-fresh' : undefined);
      setResult(
        <div className="is-result" data-is-result="trade">
          {lead === 'band' ? (
            <p className={answeredN >= 2 ? 'ok' : 'no'} data-is-answered={answeredN}>
              <Icon k={answeredN >= 2 ? 'check' : 'close'} size={14} /> {answeredN ? tx.answered : tx.notAnswered} · <bdi dir="ltr">{answeredN}/{scores.length}</bdi>
            </p>
          ) : (
            <p>
              {tx.dev}: <bdi dir="ltr">{scores.map((s) => `${Math.round(s * 100)}%`).join(' · ')}</bdi>
            </p>
          )}
          {pooled && <CovLine g={pooled} />}
          {licksFound && licksFound.uses.length > 0 && <LicksFound found={licksFound} pool={vocab?.pool ?? []} lang={lang} />}
        </div>,
      );
    }
  };

  const stop = () => {
    ctl.current?.abort();
    setRunning(false);
  };

  // SPEC-PATH-TODAY-PRACTICE §2: an improvisation level's item page (the ladder, the teacher's part, assign); its main
  // button comes back here with the level chosen
  const lvOpen = lvPage !== null ? IMPROV_LEVELS.find((x) => x.n === lvPage) : undefined;
  if (lvOpen)
    return (
      <ImprovLevelPage
        lang={lang}
        level={lvOpen}
        best={settings.improvBest?.[lvOpen.id]}
        wayIn={workout ? 'today' : 'practice'}
        onBack={() => setLvPage(null)}
        onPlay={() => {
          setLv(lvOpen.n);
          if (src.startsWith('lv:')) setSrc(`lv:${lvOpen.n}`);
          setLvPage(null);
        }}
      />
    );
  const lvPageBtn = (n: number) => (
    <button type="button" className="icon-btn is-lv-page" onClick={() => setLvPage(n)} disabled={running} aria-label={lang === 'he' ? 'הדף של השלב' : "The level's page"} title={lang === 'he' ? 'הדף של השלב' : "The level's page"} data-improv-open={n}>
      <Icon k="eye" size={18} />
    </button>
  );

  return (
    <main className="panel-screen improv-studio" data-improv-studio="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={() => (stop(), onBack())} aria-label={tx.back}>
          <Icon k="back" />
        </button>
        <h1>{tx.title}</h1>
        {title}
      </header>
      {/* COURSE-FEEDBACK-UI §4.7: the modes as one segmented control with short labels (fits 288 px); the full name is
          the button's accessible name. */}
      <div className="seg is-seg" role="tablist" aria-label={tx.title}>
        {(['scales', ...(onOpenChart ? ['rules', 'phrasing', 'vary', 'trade'] : ['phrasing', 'vary', 'trade']), ...(myLicks.length ? ['useit'] : [])] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} aria-label={tx[m]} title={tx[m]} className={mode === m ? 'on' : ''} onClick={() => (stop(), setMode(m), setResult(null))} data-is-mode={m}>
            {SEG[lang][m]}
          </button>
        ))}
      </div>
      {!(mode === 'scales' && track === 'B') && <p className="field-hint">{mode === 'scales' ? tx.scalesHow : mode === 'useit' ? tx.useitHow : mode === 'rules' ? tx.rulesHow : mode === 'phrasing' ? tx.phrasingHow : mode === 'vary' ? tx.varyHow : lead === 'band' ? tx.tradeEarHow : tx.tradeHow}</p>}
      {/* SPEC-LICKS-IN-IMPROV §5.1: today's lick at the top of Improvise's setup, always (not only from the workout) */}
      {vocab?.today && mode !== 'useit' && !(mode === 'scales' && track === 'B') && <TodayLickCard lick={vocab.today} dayKey={dayKey} lang={lang} onOpen={onOpenChart} workout={workout} />}
      {mode === 'trade' && (
        <div className="chips is-lead" role="radiogroup" aria-label={tx.whoLeads} data-is-lead={lead}>
          {(['me', 'band'] as const).map((w) => (
            <button key={w} type="button" role="radio" aria-checked={lead === w} className={`chip ${lead === w ? 'on' : ''}`} onClick={() => setLead(w)} disabled={running} data-is-lead-pick={w}>
              {w === 'me' ? tx.iLead : tx.bandLeads}
            </button>
          ))}
        </div>
      )}
      {mode === 'scales' && (
        // SPEC-RBI-ROTATION §6, §8.1 (owner): two tracks by name — "Scale rotation" (A) and "The Barry Harris way" (B)
        <div className="chips rs-track" role="radiogroup" aria-label={lang === 'he' ? 'מסלול' : 'Track'}>
          {(['A', 'B'] as const).map((tk) => (
            <button key={tk} type="button" role="radio" aria-checked={track === tk} className={`chip ${track === tk ? 'on' : ''}`} onClick={() => setTrack(tk)} data-rs-track={tk}>
              {tk === 'A' ? tx.scales : lang === 'he' ? 'הדרך של בארי האריס' : 'The Barry Harris way'}
            </button>
          ))}
        </div>
      )}
      {mode === 'scales' && track === 'B' && <HarrisWay settings={settings} lang={lang} dayKey={dayKey} tier={harrisTierOf(tier, settings.harrisTier)} onTier={onHarrisTier} onTake={onTake} />}
      {mode === 'scales' && track === 'A' && (
        <ScaleRotation
          settings={settings}
          lang={lang}
          tier={tier}
          dayKey={dayKey}
          piece={initialChart}
          onTier={onTier}
          onTake={(t, played) => {
            onTake?.(t);
            // the take boundary (SPEC-LICKS-IN-IMPROV §3): the licks in the rotation take, and the lick card riding along
            if (!played) return;
            const p = parseChart(played.chart);
            const found = bookLicks(played.notes, p, played.bars, played.bpm, `rot-${Date.now().toString(36)}`);
            setRotLicks({ found, card: lickCard ? lickCardOf(lickCard, played.notes, p, played.bars, played.bpm) : null });
          }}
          top={
            vocab?.pool.length ? (
              <label className="field-row is-lick-rule">
                <span>{tx.lickRule}</span>
                <select value={lickCard} onChange={(e) => (setLickCard(e.target.value as LickCardId | ''), setRotLicks(null))} data-is-lick-card="1">
                  <option value="">{tx.none}</option>
                  {LICK_CARDS.filter((id) => id !== 'todays-lick' || vocab.today).map((id) => (
                    <option key={id} value={id}>
                      {RULE_NAME[id][lang]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null
          }
        />
      )}
      {mode === 'scales' && track === 'A' && rotLicks && (
        <div className="is-result" data-is-result="rotation-licks">
          {rotLicks.card && (
            <p className={rotLicks.card.kept ? 'ok' : 'no'} data-is-lick-card-result={rotLicks.card.id}>
              <Icon k={rotLicks.card.kept ? 'check' : 'close'} size={14} /> {RULE_NAME[rotLicks.card.id][lang]}: <bdi dir="ltr">{rotLicks.card.total ? `${rotLicks.card.ok}/${rotLicks.card.total}` : '—'}</bdi>
            </p>
          )}
          {rotLicks.found && rotLicks.found.uses.length > 0 && <LicksFound found={rotLicks.found} pool={vocab?.pool ?? []} lang={lang} />}
        </div>
      )}
      {mode === 'rules' && onOpenChart && (
        <>
          <label className="field-row is-src">
            <span>{tx.chartFrom}</span>
            {src.startsWith('lv:') && lvPageBtn(Number(src.slice(3)))}
            <select value={src} onChange={(e) => setSrc(e.target.value)} data-is-chart-src="1">
              {initialChart && (
                <option value="piece:" data-is-piece="1">
                  {initialChart.title}
                </option>
              )}
              <optgroup label={tx.levels}>
                {IMPROV_LEVELS.map((l) => (
                  <option key={l.id} value={`lv:${l.n}`}>
                    {l.n}. {l.title[lang]}
                    {settings.improvBest?.[l.id] !== undefined ? ` · ${Math.round(settings.improvBest[l.id] * 100)}%` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label={tx.standards}>
                {STANDARD_CHANGES.map((s) => (
                  <option key={s.id} value={`std:${s.id}`}>
                    {s.name} — {s.part[lang]}
                  </option>
                ))}
              </optgroup>
              {(settings.myCharts ?? []).length > 0 && (
                <optgroup label={tx.mine}>
                  {(settings.myCharts ?? []).map((c) => (
                    <option key={c.id} value={`my:${c.id}`}>
                      {c.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          {src.startsWith('std:') && <ListenOriginal id={src.slice(4)} lang={lang} />}
          {/* Phase 3: Charts' improvisation levels live here — over the chart with its own suggested rules, no challenge
              (the level's best score is kept as before, improvBest). */}
          <button
            className="btn ghost is-free"
            data-is-free="1"
            onClick={() => {
              const id = `${Date.now()}`;
              const [kind, key] = [src.slice(0, src.indexOf(':')), src.slice(src.indexOf(':') + 1)];
              if (kind === 'piece' && initialChart) return onOpenChart(initialChart);
              if (kind === 'my') {
                const c = (settings.myCharts ?? []).find((x) => x.id === key);
                if (c) return onOpenChart(c);
              }
              if (kind === 'std') {
                const s = STANDARD_CHANGES.find((x) => x.id === key) ?? STANDARD_CHANGES[0];
                return onOpenChart({ id, title: `${s.name} — ${s.part[lang]}`, text: s.text, style: s.style, bpm: s.bpm, std: s.id });
              }
              const L = IMPROV_LEVELS.find((x) => String(x.n) === key) ?? IMPROV_LEVELS[0];
              onOpenChart({ id, title: L.title[lang], text: L.text, style: L.style, bpm: L.bpm, rules: L.rules, level: L.id });
            }}
          >
            {lang === 'he' ? 'לאלתר על המהלך, בלי אתגר' : 'Improvise over it, no challenge'}
          </button>
          <ChallengeList
            style={band === 'style' ? bandStyleId : undefined}
            best={settings.challengeBest}
            lang={lang}
            onPick={(ch) => {
              const id = `${Date.now()}`;
              const [kind, key] = [src.slice(0, src.indexOf(':')), src.slice(src.indexOf(':') + 1)];
              if (kind === 'piece' && initialChart) return onOpenChart({ ...initialChart, title: `${initialChart.title} — ${ch.title[lang]}`, rules: ch.rules });
              if (kind === 'my') {
                const c = (settings.myCharts ?? []).find((x) => x.id === key);
                if (c) return onOpenChart({ ...c, rules: ch.rules });
              }
              if (kind === 'std') {
                const s = STANDARD_CHANGES.find((x) => x.id === key) ?? STANDARD_CHANGES[0];
                return onOpenChart({ id, title: `${s.name} — ${ch.title[lang]}`, text: s.text, style: s.style, bpm: s.bpm, rules: ch.rules, std: s.id });
              }
              const L = IMPROV_LEVELS.find((x) => String(x.n) === key) ?? IMPROV_LEVELS[0];
              onOpenChart({ id, title: `${L.title[lang]} — ${ch.title[lang]}`, text: L.text, style: L.style, bpm: L.bpm, rules: ch.rules, level: L.id });
            }}
          />
        </>
      )}
      {mode === 'useit' && myLicks.length > 0 && (
        <>
          <label className="field-row">
            <span>{lickId === vocab?.today?.id ? tx.picked : tx.useit}</span>
            <select value={lickId} onChange={(e) => setLickId(e.target.value)} data-is-lick="1">
              {myLicks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name[lang]}
                </option>
              ))}
            </select>
          </label>
          {(() => {
            const l = myLicks.find((x) => x.id === lickId) ?? myLicks[0];
            const k = l.homeKey ?? 0;
            return (
              <>
              {onOpenChart && (
                <button
                  className="btn primary"
                  data-is-lick-chart={l.id}
                  onClick={() => {
                    const c = lickImprovChart(l, k);
                    onOpenChart({ id: `lick-${l.id}-${Date.now()}`, title: `${tx.useit}: ${l.name[lang]} · ${kName(k, isMinorLick(l))}`, text: c.text, style: c.style, bpm: c.bpm, rules: TODAYS_LICK_RULES, lick: l.id });
                  }}
                >
                  {tx.overChart}
                </button>
              )}
              <small className="field-hint">{tx.overBand}</small>
              <UseIt
                key={l.id}
                lang={lang}
                settings={settings}
                lick={l}
                inst={lickInstrumentOf(settings)}
                onResult={(ok, good) => onLickUsed?.([{ id: `g:useit:${l.id}:${Date.now().toString(36)}`, skill: 'improv', difficulty: Math.round(1000 + l.level * 120), correct: ok, score: Math.min(1, good / 2), tags: [{ skill: 'improv', sub: 'improv/vocab', w: 0.6 }, { skill: 'improv', sub: 'improv/play', w: 0.4 }], at: new Date().toISOString() }], ok ? 8 : good ? 3 : 1)}
              />
              </>
            );
          })()}
        </>
      )}
      {mode !== 'vary' && mode !== 'rules' && mode !== 'useit' && mode !== 'scales' && (
        <label className="field-row">
          <span>{tx.chart}</span>
          <select value={lv} onChange={(e) => setLv(Number(e.target.value))} disabled={running}>
            {IMPROV_LEVELS.map((l) => (
              <option key={l.n} value={l.n}>
                {l.n}. {l.title[lang]}
              </option>
            ))}
          </select>
          {lvPageBtn(lv)}
        </label>
      )}
      {(mode === 'phrasing' || mode === 'vary' || mode === 'trade') && styleBand && (
        <div className="chips is-band" role="radiogroup" aria-label={lang === 'he' ? 'הלהקה' : 'The band'} data-is-band={band === 'style' ? bandStyleId : 'level'}>
          <button role="radio" aria-checked={band === 'style'} className={`chip ${band === 'style' ? 'on' : ''}`} onClick={() => setBand('style')} disabled={running} data-is-band-pick="style">
            {lang === 'he' ? `להקה: ${STYLE_TEXT[bandStyleId].he}` : `Band: ${STYLE_TEXT[bandStyleId].en}`}
          </button>
          <button role="radio" aria-checked={band === 'level'} className={`chip ${band === 'level' ? 'on' : ''}`} onClick={() => setBand('level')} disabled={running} data-is-band-pick="level">
            {lang === 'he' ? 'הלהקה של השלב' : "The level's band"}
          </button>
        </div>
      )}
      {(mode === 'phrasing' || mode === 'trade') && levelSheet && <ScaleStrip sheet={levelSheet} lang={lang} />}
      {mode === 'phrasing' && (
        <div className="chips" role="radiogroup" aria-label={tx.rule}>
          {RULES.map((r, i) => (
            <button key={i} role="radio" aria-checked={rule === i} className={`chip ${rule === i ? 'on' : ''}`} onClick={() => setRule(i)} disabled={running} data-is-rule={r.kind}>
              {tx.ruleNames[i]}
            </button>
          ))}
        </div>
      )}
      {mode === 'vary' && <p className="is-ask" data-is-ask={VARS[askIdx % VARS.length]}>{tx.asks[VARS[askIdx % VARS.length]]}</p>}
      {mode !== 'rules' && mode !== 'useit' && mode !== 'scales' && <div className="ch-step" dir="ltr">
        <small>{tx.tempo}</small>
        <button className="icon-btn" onClick={() => setBpm((b) => Math.max(50, b - 6))} disabled={running} aria-label="−">
          <Icon k="minus" />
        </button>
        <b>{bpm}</b>
        <button className="icon-btn" onClick={() => setBpm((b) => Math.min(220, b + 6))} disabled={running} aria-label="+">
          <Icon k="plus" />
        </button>
      </div>}
      {mode === 'rules' || mode === 'useit' || mode === 'scales' ? null : running ? (
        <button className="btn primary" onClick={stop}>
          <Icon k="stop" /> {tx.stop} {round ? `· ${tx.round} ${round}/3` : ''}
          {turn && <span className="is-turn" data-is-turn={turn}> · {turn === 'band' ? tx.listen : tx.yourTurn}</span>}
        </button>
      ) : (
        <button className="btn primary" onClick={() => void (mode === 'phrasing' ? startPhrasing() : mode === 'vary' ? startVary() : startTrade())} data-is-start="1">
          <Icon k="play" /> {tx.start}
        </button>
      )}
      {midi.devices.length === 0 && mode !== 'rules' && mode !== 'useit' && mode !== 'scales' && (
        <>
          <small className="field-hint">{tx.keys}</small>
          <KeyStrip onKey={onScreenKey} />
        </>
      )}
      {result}
    </main>
  );
}
