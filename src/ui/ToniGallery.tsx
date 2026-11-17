// Dev-only gallery of the Paper Toni (#/dev/toni): every state at 120 and 48 px, animated, on a light and a dark
// panel. Query: ?only=idle,wrong (states), &look=classic (the classic drawing, for comparison). "Replay" restarts the
// one-shot gestures. e2e/toniGallery.spec.ts screenshots it to docs/toni-shots/.
import { useEffect, useState } from 'react';
import { Toni, ToniClassic } from './Toni';
import { TONI_EXTRA_STATES, TONI_MOODS, ToniPaper, toBase, type ToniMood } from './ToniPaper';

const q = () => new URLSearchParams(location.hash.split('?')[1] ?? '');
const NAME: Record<ToniMood, string> = {
  idle: 'idle · רגיל',
  listen: 'listen · מקשיב',
  think: 'think · חושב',
  hint: 'hint · רמז',
  correct: 'correct · נכון',
  streak: 'streak · ברצף',
  wrong: 'wrong · עוד לא',
  close: 'close · כמעט',
  wow: 'wow · וואו',
  sleepy: 'sleepy · ישנוני',
  draw: 'draw · ברוך הבא',
  bye: 'bye · להתראות',
  proud: 'proud · גאה',
  focused: 'focused · מרוכז',
  encouraging: 'encouraging · מעודד',
  celebrating: 'celebrating · חוגג',
  curious: 'curious · סקרן',
};

export function ToniGallery() {
  const p = q();
  const only = (p.get('only') ?? '').split(',').filter(Boolean);
  const classic = p.get('look') === 'classic';
  const states = TONI_MOODS.filter((s) => !only.length || only.includes(s));
  const [run, setRun] = useState(0);
  useEffect(() => {
    const root = document.documentElement;
    if (!classic) root.dataset.look = 'studio';
    root.dataset.theme = 'light';
    root.lang = 'he';
  }, [classic]);
  const Fig = ({ s, size }: { s: ToniMood; size: number }) => (classic ? <ToniClassic state={toBase(s)} size={size} /> : <ToniPaper state={s} size={size} />);
  const panel = (theme: 'light' | 'dark') => (
    <section className={`tg-panel tg-${theme}`} data-theme={theme} key={`${theme}-${run}`}>
      <h2>{theme}</h2>
      <div className="tg-grid">
        {states.map((s) => (
          <figure key={s} className="tg-cell" data-state={s}>
            <div className="tg-art">
              <Fig s={s} size={120} />
              <Fig s={s} size={48} />
            </div>
            <figcaption>
              {NAME[s]}
              {TONI_EXTRA_STATES.includes(s as never) && <em> new</em>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
  return (
    <div className="tg" data-ready="1">
      <style>{CSS}</style>
      <header>
        <h1>Toni · {classic ? 'classic' : 'Paper'}</h1>
        <button type="button" onClick={() => setRun((n) => n + 1)}>
          Replay
        </button>
        {/* the gated Toni, as call sites use it: follows <html data-look> live */}
        <span className="tg-live">
          <Toni state="idle" size={48} />
        </span>
      </header>
      {panel('light')}
      {panel('dark')}
    </div>
  );
}

const CSS = `
body { margin: 0; background: #f4f0fb; font-family: Rubik, system-ui, sans-serif; }
.tg { padding: 16px; color: #1e1033; }
.tg header { display: flex; align-items: center; gap: 12px; }
.tg h1 { font-size: 20px; margin: 0; }
.tg h2 { font-size: 14px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; }
.tg button { font: inherit; padding: 6px 14px; border-radius: 10px; border: 0; background: #e7defe; color: #1e1033; cursor: pointer; }
.tg-panel { margin-top: 16px; padding: 16px; border-radius: 16px; }
.tg-light { background: #ffffff; color: #1e1033; }
.tg-dark { background: #241540; color: #ffffff; }
.tg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.tg-cell { margin: 0; padding: 10px 8px 8px; border-radius: 12px; background: rgba(127, 100, 200, 0.07); text-align: center; }
.tg-art { display: flex; align-items: flex-end; justify-content: center; gap: 14px; min-height: 132px; }
.tg-cell figcaption { font-size: 12px; margin-top: 6px; }
.tg-cell em { font-style: normal; font-size: 10px; padding: 1px 6px; border-radius: 99px; background: #3fe0c9; color: #0b3b35; }
`;
