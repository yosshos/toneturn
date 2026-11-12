// Chord Change Race (0.76, guitar): four chords, each strummed once right on its downbeat — open chords up to jazz
// changes two beats a chord. The microphone hears each strum (a loudness jump, chroma frames after it): the closed-set
// recognizer (chordFinder.judgeStrum) says whether it was the chord, the onset says how close to the beat it came.

import { changeChords, chordName, compVoicing, gradeChanges, slotOf, takeSeed, type Chord, type StrumHit, type TakeSave } from '../engine/instGames';
import { judgeStrum, type StrumFrame } from '../engine/chordFinder';
import type { NoteEvent } from '../engine/lesson';
import type { GameScreenProps } from './gameProps';
import { listenStrumsTimed } from './instCapture';
import { piano } from './services';
import { TakeShell, type TakeCtx, type TakeGameCfg, type TakeOutcome, type TakePhase } from './TakeShell';

type Lang = 'he' | 'en';
const beatsOf = (s: TakeSave) => (s.level >= 6 ? 2 : 4);

function clicks(cs: Chord[], bpm: number) {
  const beat = 60 / bpm;
  const out: { t: number; accent: boolean; count?: boolean; soft?: boolean }[] = [];
  for (let k = 0; k < 4; k++) out.push({ t: k * beat, accent: k === 0, count: true });
  let b = 0;
  for (const c of cs) {
    for (let k = 0; k < c.beats; k++) out.push({ t: (4 + b + k) * beat, accent: k === 0, soft: k !== 0 });
    b += c.beats;
  }
  return { clicks: out, startAt: 4 * beat, endAt: (4 + b) * beat };
}

function follow(signal: AbortSignal, origin: () => number, cs: Chord[], bpm: number, setCell: (i: number) => void) {
  const id = window.setInterval(() => {
    const ms = performance.now() - origin();
    setCell(ms < -150 ? -1 : slotOf(cs, ms, bpm));
  }, 40);
  signal.addEventListener('abort', () => clearInterval(id), { once: true });
  return () => clearInterval(id);
}

async function hear(c: { item: Chord[]; save: TakeSave; signal: AbortSignal; setCell: (i: number) => void }) {
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  const beat = 60 / c.save.bpm;
  const ev: NoteEvent[] = [];
  let t = 0.06;
  for (const ch of c.item) {
    // a strum: the voicing rolled low to high
    compVoicing(ch, 43).forEach((m, i) => ev.push({ midi: m, start: t + i * 0.025, duration: ch.beats * beat * 0.9, velocity: 0.55 }));
    t += ch.beats * beat;
  }
  let origin = performance.now() + 120;
  const end = follow(c.signal, () => origin, c.item, c.save.bpm, c.setCell);
  try {
    await piano.play(ev, t + 0.5, c.signal);
  } finally {
    end();
  }
}

async function take(c: TakeCtx<Chord[]>): Promise<TakeOutcome | 'mic-error' | null> {
  const { item, save, signal, settings, lang } = c;
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  c.setPhase('open');
  const raw: { perf: number; lat: number; frames: StrumFrame[] }[] = [];
  const ok = await listenStrumsTimed(signal, settings, (perf, lat, frames) => raw.push({ perf, lat, frames }), 60_000);
  if (signal.aborted) return null;
  if (!ok) return 'mic-error';
  c.setPhase('play');
  const k = clicks(item, save.bpm);
  let origin = performance.now() + 120 + k.startAt * 1000;
  const end = follow(signal, () => origin, item, save.bpm, c.setCell);
  try {
    await piano.playTimeline({ clicks: k.clicks, wood: [], responseAt: k.startAt, responseEnd: k.endAt + 0.6 }, signal, undefined, (perf) => {
      origin = perf;
    });
  } finally {
    end();
  }
  // let the last strum's frames arrive
  await new Promise((r) => setTimeout(r, 450));
  const hits: StrumHit[] = [];
  const seen = new Set<number>();
  for (const s of raw) {
    const ms = s.perf - s.lat - origin;
    const slot = slotOf(item, ms, save.bpm);
    if (slot < 0 || seen.has(slot)) continue;
    seen.add(slot);
    const v = judgeStrum(s.frames, { root: item[slot].root, quality: item[slot].quality });
    hits.push({ ms, verdict: v.verdict, chord: slot });
  }
  const g = gradeChanges(item, hits, save.bpm);
  const L = lang === 'he';
  const n = (x: string) => g.marks.filter((m) => m === x).length;
  const offs = g.offsets.filter((x): x is number => x !== null);
  const mean = offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : null;
  const parts = [`${n('hit')} ${L ? 'בדיוק בזמן' : 'on the beat'}`];
  if (n('late')) parts.push(`${n('late')} ${L ? 'לא בזמן' : 'off the beat'}`);
  if (n('wrong')) parts.push(`${n('wrong')} ${L ? 'אקורד אחר' : 'other chord'}`);
  if (n('unclear')) parts.push(`${n('unclear')} ${L ? 'לא ברור' : 'unclear'}`);
  if (n('miss')) parts.push(`${n('miss')} ${L ? 'חסרים' : 'missed'}`);
  if (mean !== null && Math.abs(mean) > 30) parts.push(`${Math.abs(mean)} ms ${mean > 0 ? (L ? 'מאחר' : 'late') : L ? 'מקדים' : 'early'}`);
  return { score: g.score, line: parts.join(' · '), marks: g.marks };
}

function ChangeBoard({ item, save, phase, outcome, cell, lang }: { item: Chord[]; save: TakeSave; phase: TakePhase; outcome: TakeOutcome | null; cell: number; lang: Lang }) {
  return (
    <div className="inst-board">
      <p className="inst-meta" dir="ltr">
        <span>
          {item[0]?.beats ?? 4} {lang === 'he' ? 'פעמות לאקורד' : 'beats a chord'}
        </span>
        <span>♩ = {save.bpm}</span>
      </p>
      <div className="inst-cells change-cells" dir="ltr">
        {item.map((ch, i) => (
          <span key={i} className={`inst-cell big ${(phase === 'play' || phase === 'hear') && i === cell ? 'now' : ''} ${phase === 'review' ? (outcome?.marks?.[i] ?? '') : ''}`}>
            <b>{chordName(ch)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

const RACE: TakeGameCfg<Chord[]> = {
  game: 'changerace',
  className: 'changerace',
  tx: {
    title: { en: 'Chord Change Race', he: 'מרוץ החלפות אקורדים' },
    blurb: { en: 'Four chords. After the count-in, strum each one once, right on its first beat — clean, every string. The microphone hears the chord and the timing. Four takes, three lives.', he: 'ארבעה אקורדים. אחרי הספירה פורטים כל אחד פעם אחת, בדיוק על הפעמה הראשונה שלו — נקי, כל המיתרים. המיקרופון שומע את האקורד ואת התזמון. ארבעה טייקים, שלושה חיים.' },
    unit: { en: 'Take', he: 'טייק' },
    play: { en: 'Strum the changes', he: 'לפרוט את המהלך' },
    playing: { en: 'Strum on each first beat', he: 'פורטים על כל פעמה ראשונה' },
  },
  inputs: ['mic'],
  defaultInput: () => 'mic',
  item: (s, i) => changeChords(takeSeed(s, i), s.level, beatsOf(s)),
  hear: (c) => hear(c),
  take,
  board: (p) => <ChangeBoard {...p} />,
};

export const ChordChangeRace = (p: GameScreenProps) => <TakeShell cfg={RACE} {...p} />;
