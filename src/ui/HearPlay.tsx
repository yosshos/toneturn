// Hear it, play it (0.76): Play It Back (keys — a note, a tune, a bass line, a phrase with its rhythm) and Roots by Ear
// (bass — a progression comped without bass, play its roots). Measured by MIDI or the microphone's pitch onsets; the
// notes are graded in order by pitch class, and on the rhythm tiers by their place in the bar after a count-in.

import { gradeSequence, hearEvents, playbackItem, rootsItem, chordName, takeSeed, type HearItem, type Played, type TakeSave } from '../engine/instGames';
import type { GameScreenProps } from './gameProps';
import { listenNotes, type Heard } from './instCapture';
import { midiName } from './Instrument';
import { piano } from './services';
import { TakeShell, type TakeCtx, type TakeGameCfg, type TakeOutcome, type TakePhase } from './TakeShell';

type Lang = 'he' | 'en';
const PC = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const KEY_HE = ['דו', 'דו דיאז', 'רה', 'מי במול', 'מי', 'פה', 'פה דיאז', 'סול', 'לה במול', 'לה', 'סי במול', 'סי'];

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const id = window.setTimeout(res, ms);
    signal.addEventListener('abort', () => (clearTimeout(id), rej(new Error('aborted'))), { once: true });
  });

async function hearItem(c: { item: HearItem; save: TakeSave; signal: AbortSignal }) {
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  const { events, end } = hearEvents(c.item, c.save.bpm, 0.05, c.item.game === 'rootsear' || c.item.level === 4);
  await piano.play(events, end + 0.4, c.signal);
}

/** One measured take: free (play when ready, ends after the last note) or, on rhythm items, after a count-in. */
async function takeItem(c: TakeCtx<HearItem>): Promise<TakeOutcome | 'mic-error' | null> {
  const { item, save, signal, settings, lang } = c;
  const heard: Heard[] = [];
  const bass = item.game === 'rootsear';
  try {
    await piano.unlock();
  } catch {
    /* audio may still start */
  }
  if (c.input === 'mic') c.setPhase('open');
  const ok = await listenNotes(signal, c.input, settings, heard, { bass, maxMs: 40_000 });
  if (signal.aborted) return null;
  if (!ok) return 'mic-error';
  let played: Played[];
  if (item.rhythm) {
    const beat = 60 / save.bpm;
    const last = item.notes[item.notes.length - 1];
    const len = last.at + last.len;
    const clicks = [0, 1, 2, 3].map((k) => ({ t: k * beat, accent: k === 0, count: true }));
    for (let b = 0; b < Math.ceil(len) + 1; b++) clicks.push({ t: (4 + b) * beat, accent: false, count: false });
    let origin = performance.now() + 120 + 4 * beat * 1000;
    c.setPhase('play');
    await piano.playTimeline({ clicks: clicks.map((k) => ({ ...k, soft: !k.count })), wood: [], responseAt: 4 * beat, responseEnd: (4 + len + 1.5) * beat }, signal, undefined, (perf) => {
      origin = perf;
    });
    played = heard.map((h) => ({ ms: h.perf - origin - h.lat, midi: h.midi })).filter((p) => p.ms > -300);
  } else {
    c.setPhase('play');
    // free time: done when every note has come and nothing new for 1.2 s, or 2.5 s after the last note, or 20 s
    const t0 = performance.now();
    for (;;) {
      await wait(100, signal);
      const now = performance.now();
      const lastAt = heard.length ? heard[heard.length - 1].perf : t0;
      if (heard.length >= item.notes.length && now - lastAt > 1200) break;
      if (heard.length && now - lastAt > 2500) break;
      if (now - t0 > 20_000) break;
      c.setCell(Math.min(item.notes.length - 1, heard.length));
    }
    played = heard.map((h) => ({ ms: h.perf - t0, midi: h.midi }));
  }
  const g = gradeSequence(item, played, save.bpm);
  const n = (k: string) => g.marks.filter((m) => m === k).length;
  const L = lang === 'he';
  const parts = [`${n('hit')} ${L ? 'נכונים' : 'right'}`, `${n('pitch')} ${L ? 'תו שגוי' : 'wrong note'}`, `${n('miss')} ${L ? 'חסרים' : 'missed'}`];
  if (g.extra) parts.push(`${g.extra} ${L ? 'מיותרים' : 'extra'}`);
  if (g.rhythm !== null) parts.push(`${L ? 'בזמן' : 'in time'} ${Math.round(g.rhythm * 100)}%`);
  return { score: g.score, line: parts.join(' · '), marks: g.marks };
}

function HearBoard({ item, phase, outcome, cell, lang }: { item: HearItem; save: TakeSave; phase: TakePhase; outcome: TakeOutcome | null; cell: number; lang: Lang }) {
  const reveal = phase === 'review';
  const key = lang === 'he' ? `${KEY_HE[item.key]} מז׳ור` : `${PC[item.key]} major`;
  const cells = item.game === 'rootsear' && item.chords ? item.chords.map((ch, i) => ({ top: reveal ? chordName(ch) : '?', sub: reveal ? PC[((item.notes[i].midi % 12) + 12) % 12] : '' })) : item.notes.map((n) => ({ top: reveal ? midiName(n.midi) : '?', sub: '' }));
  return (
    <div className="inst-board">
      <p className="inst-meta" dir="ltr">
        {item.game === 'playback' && <span>{key}</span>}
        <span>
          {cells.length} {item.game === 'rootsear' ? (lang === 'he' ? 'אקורדים' : 'chords') : lang === 'he' ? 'צלילים' : 'notes'}
        </span>
        {item.rhythm && <span>♩ {item.swing ? (lang === 'he' ? 'סווינג' : 'swing') : lang === 'he' ? 'במקצב' : 'in rhythm'}</span>}
      </p>
      <div className="inst-cells" dir="ltr">
        {cells.map((x, i) => (
          <span key={i} className={`inst-cell ${phase === 'play' && i === cell ? 'now' : ''} ${reveal ? (outcome?.marks?.[i] ?? '') : ''}`}>
            <b>{x.top}</b>
            {x.sub && <small>{x.sub}</small>}
          </span>
        ))}
      </div>
    </div>
  );
}

const PLAYBACK: TakeGameCfg<HearItem> = {
  game: 'playback',
  className: 'playback',
  tx: {
    title: { en: 'Play It Back', he: 'לנגן בחזרה' },
    blurb: { en: 'The key sounds, then a phrase. Play it back on your keyboard (MIDI) or piano (microphone). From f, after a count-in and in its rhythm. Six phrases, three lives.', he: 'הסולם נשמע, ואחריו משפט. נגנו אותו בחזרה על הקלידים (MIDI) או על הפסנתר (מיקרופון). מ־f — אחרי ספירה ובמקצב שלו. שישה משפטים, שלושה חיים.' },
    unit: { en: 'Phrase', he: 'משפט' },
    play: { en: 'Play it back', he: 'לנגן בחזרה' },
    playing: { en: 'Your turn — play it', he: 'תורכם — נגנו' },
  },
  inputs: ['midi', 'mic'],
  defaultInput: () => 'midi',
  item: (s, i) => playbackItem(takeSeed(s, i), s.level),
  hear: (c) => hearItem(c),
  take: takeItem,
  board: (p) => <HearBoard {...p} />,
};

const ROOTS: TakeGameCfg<HearItem> = {
  game: 'rootsear',
  className: 'rootsear',
  tx: {
    title: { en: 'Roots by Ear', he: 'שורשים מהאוזן' },
    blurb: { en: 'A progression on the piano, no bass. Play its roots on the bass, one per chord, in order. Eight progressions, three lives.', he: 'מהלך בפסנתר, בלי בס. נגנו את השורשים שלו בבס, אחד לכל אקורד, לפי הסדר. שמונה מהלכים, שלושה חיים.' },
    unit: { en: 'Progression', he: 'מהלך' },
    play: { en: 'Play the roots', he: 'לנגן את השורשים' },
    playing: { en: 'Your turn — the roots, in order', he: 'תורכם — השורשים, לפי הסדר' },
  },
  inputs: ['mic', 'midi'],
  defaultInput: () => 'mic',
  item: (s, i) => rootsItem(takeSeed(s, i), s.level),
  hear: (c) => hearItem(c),
  take: takeItem,
  board: (p) => <HearBoard {...p} />,
};

export const PlayItBack = (p: GameScreenProps) => <TakeShell cfg={PLAYBACK} {...p} />;
export const RootsByEar = (p: GameScreenProps) => <TakeShell cfg={ROOTS} {...p} />;
