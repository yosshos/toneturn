// The daily progression puzzle (0.53): hear today's four chords, guess them in Roman numerals, six tries.
import { useEffect, useRef, useState } from 'react';
import { dailyPuzzle, MAX_GUESSES, PUZZLE_CHORDS, puzzlePoints, scoreGuess, shareText, solvedBy, type PChord, type Slot } from '../engine/progPuzzle';
import type { Settings } from '../storage/progress';
import { localDay } from '../storage/progress';
import { piano } from './services';

const DEG: Record<PChord, [number, 'maj' | 'min']> = { I: [0, 'maj'], ii: [2, 'min'], iii: [4, 'min'], IV: [5, 'maj'], V: [7, 'maj'], vi: [9, 'min'], bVII: [10, 'maj'] };
const label = (c: PChord) => c.replace('b', '♭');
function voice(key: number, c: PChord): number[] {
  const [d, q] = DEG[c];
  const root = key + d;
  const m = (n: number) => ((n % 12) + 12) % 12;
  const bass = 36 + m(root - 36);
  const third = q === 'maj' ? 4 : 3;
  return [bass, ...[0, third, 7].map((x) => 57 + m(root + x - 57)).sort((a, b) => a - b)];
}

const TX = {
  en: { title: 'Progression of the day', how: 'Four chords. Guess them in Roman numerals — six tries. Green: right chord, right place. Gold: in the progression, another place. Gray: not in it.', listen: 'Listen', mine: 'Play my guess', check: 'Check', clear: 'Clear', solved: 'Solved', out: 'The answer was', share: 'Share', copied: 'Copied', back: 'Back', next: 'A new progression tomorrow.' },
  he: { title: 'מהלך היום', how: 'ארבעה אקורדים. נחשו אותם בספרות רומיות — שישה ניסיונות. ירוק: האקורד הנכון במקום הנכון. זהב: במהלך, אבל במקום אחר. אפור: לא במהלך.', listen: 'להקשיב', mine: 'להשמיע את הניחוש', check: 'לבדוק', clear: 'לנקות', solved: 'נפתר', out: 'התשובה הייתה', share: 'לשתף', copied: 'הועתק', back: 'חזרה', next: 'מהלך חדש מחר.' },
};

export function ProgPuzzleScreen({ settings, onChange, onBack, onSolved }: { settings: Settings; onChange: (p: Partial<Settings>) => void; onBack: () => void; onSolved: (points: number) => void }) {
  const lang = settings.uiLang;
  const tx = TX[lang];
  const day = localDay(new Date());
  const pz = dailyPuzzle(day);
  const saved = settings.progPuzzle?.[day]?.rows ?? [];
  const [rows, setRows] = useState<PChord[][]>(saved as PChord[][]);
  const [cur, setCur] = useState<PChord[]>([]);
  const [copied, setCopied] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const scores: Slot[][] = rows.map((r) => scoreGuess(r, pz.chords));
  const done = solvedBy(scores) || rows.length >= MAX_GUESSES;

  const play = async (cs: PChord[]) => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    const ev = cs.flatMap((ch, i) => voice(pz.key, ch).map((m) => ({ midi: m, start: i * 0.95, duration: i === cs.length - 1 ? 1.6 : 0.9, velocity: m < 48 ? 0.55 : 0.45 })));
    await piano.play(ev, cs.length * 0.95 + 0.8, c.signal).catch(() => {});
  };
  const submit = () => {
    if (cur.length !== 4 || done) return;
    const next = [...rows, cur];
    setRows(next);
    setCur([]);
    onChange({ progPuzzle: { ...(settings.progPuzzle ?? {}), [day]: { rows: next } } });
    const sc = next.map((r) => scoreGuess(r, pz.chords));
    if (solvedBy(sc) || next.length >= MAX_GUESSES) onSolved(puzzlePoints(sc));
  };
  const share = async () => {
    const text = shareText(pz.n, scores, lang);
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      /* cancelled */
    }
  };
  return (
    <main className="panel-screen prog-puzzle" data-prog-puzzle={pz.n}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>
          {tx.title} <small dir="ltr">#{pz.n}</small>
        </h1>
      </header>
      <p className="field-hint">{tx.how}</p>
      <button className="btn primary" onClick={() => void play(pz.chords)} data-pp-listen="1">
        ▶ {tx.listen}
      </button>
      <div className="pp-grid" dir="ltr" aria-label={tx.title}>
        {Array.from({ length: MAX_GUESSES }, (_, r) => {
          const row = rows[r] ?? (r === rows.length && !done ? cur : []);
          return (
            <div key={r} className="pp-row">
              {Array.from({ length: 4 }, (_, k) => (
                <span key={k} className={`pp-cell ${scores[r]?.[k] ?? ''} ${row[k] ? 'filled' : ''}`}>
                  {row[k] ? label(row[k]) : ''}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      {!done ? (
        <>
          <div className="pp-keys" dir="ltr">
            {PUZZLE_CHORDS.map((c) => (
              <button key={c} className="btn ghost" disabled={cur.length >= 4} onClick={() => setCur([...cur, c])} data-pp-chord={c}>
                {label(c)}
              </button>
            ))}
          </div>
          <div className="pp-actions">
            <button className="btn ghost small" disabled={!cur.length} onClick={() => setCur(cur.slice(0, -1))} aria-label={tx.clear}>
              ⌫
            </button>
            <button className="btn ghost small" disabled={cur.length !== 4} onClick={() => void play(cur)}>
              {tx.mine}
            </button>
            <button className="btn primary small" disabled={cur.length !== 4} onClick={submit} data-pp-check="1">
              {tx.check}
            </button>
          </div>
        </>
      ) : (
        <section className="set-card pp-done" data-pp-done="1">
          <b>{solvedBy(scores) ? `${tx.solved} · ${rows.length}/${MAX_GUESSES}` : `${tx.out}: ${pz.chords.map(label).join(' – ')}`}</b>
          <div className="pp-actions">
            <button className="btn primary small" onClick={() => void share()}>
              {copied ? tx.copied : tx.share}
            </button>
            <button className="btn ghost small" onClick={() => void play(pz.chords)}>
              ▶ {tx.listen}
            </button>
          </div>
          <small className="field-hint">{tx.next}</small>
        </section>
      )}
    </main>
  );
}
