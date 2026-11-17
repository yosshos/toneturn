// The opening animation (owner, 2026-11-17: concept B "from sound to note", with C's landing burst).
//   1. a free sound wave draws across the screen, then settles into the five staff lines;
//   2. the 7 is written: top stroke, stem, then the note head pops (with a burst of light);
//   3. the three sound bars light up one by one, with the three slogan words;
//   4. the wordmark.
// About 2.1 s, then a 0.3 s fade (2.4 s in all). A tap or any key skips it. It overlays the app in its own subtree,
// so it never blocks or delays startup. When it shows: ./splashDecision.ts. Styles: src/splash.css.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BRAND_TEXT } from '../../i18n/brandText';
import { wordmark } from '../../partner';
import { MARK, PALETTES, barLine } from './mark';
import { decideSplash, readSplashEnv, readSplashPrefs, splashLang, writeSplashDay } from './splashDecision';
import '../../splash.css';

/** When the full animation starts to fade, and the reduced-motion hold (ms). */
export const SPLASH_FULL_MS = 2100;
export const SPLASH_STILL_MS = 600;
const FADE_MS = 300;
const SKIP_FADE_MS = 180;

const P = PALETTES.paper;
const H = MARK.head;
const STAFF_Y = [330, 346, 362, 378, 394];
// The mark is centred on the staff's middle line, 1.65x.
const LOGO_AT = 'translate(195 362) scale(1.65) translate(-47 -60)';
/** The burst rings start where the note head lands (the head's centre after LOGO_AT). */
const BURST = [195 + (MARK.head.cx - 47) * 1.65, 362 + (MARK.head.cy - 60) * 1.65].map((v) => +v.toFixed(1));
const WAVE =
  'M36 362 ' +
  Array.from({ length: 12 }, (_, i) => {
    const amp = (i % 2 === 0 ? -38 : 38) * (1 - Math.abs(i - 6) / 7.5);
    return `Q${36 + i * 26 + 13} ${(362 + amp).toFixed(1)} ${36 + (i + 1) * 26} 362`;
  }).join(' ');

function DrawnSeven({ color }: { color: string }) {
  return (
    <>
      <path className="bsp-top" pathLength={1} d={MARK.top} fill="none" stroke={color} strokeWidth={MARK.stroke} strokeLinecap="round" />
      <path className="bsp-stem" pathLength={1} d={MARK.stem} fill="none" stroke={color} strokeWidth={MARK.stroke} strokeLinecap="round" />
      <g className="bsp-head">
        <ellipse cx={H.cx} cy={H.cy} rx={H.rx} ry={H.ry} transform={`rotate(${H.rotate} ${H.cx} ${H.cy})`} fill={color} />
      </g>
    </>
  );
}

/** The splash picture itself (also used by the docs frames). */
export function SplashArt({ lang, mode = 'full' }: { lang: 'he' | 'en'; mode?: 'full' | 'still' }) {
  const tx = BRAND_TEXT[lang];
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const name = wordmark(lang);
  return (
    <svg className={`bsp-art bsp-${mode}`} viewBox="0 190 390 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path className="bsp-wave" pathLength={1} d={WAVE} fill="none" stroke={P.bars} strokeWidth="4" strokeLinecap="round" />
      <g className="bsp-staff">
        {STAFF_Y.map((y, i) => (
          <line key={y} className={`bsp-sl bsp-s${i}`} x1="36" x2="354" y1={y} y2={y} />
        ))}
      </g>
      <circle className="bsp-burst" cx={BURST[0]} cy={BURST[1]} r="40" fill="none" stroke={P.fill} strokeWidth="3" />
      <circle className="bsp-burst bsp-burst2" cx={BURST[0]} cy={BURST[1]} r="40" fill="none" stroke={P.bars} strokeWidth="2" />
      <g transform={LOGO_AT}>
        <g className="bsp-bars">
          {MARK.bars.map((b, i) => {
            const e = barLine(b, MARK.barEdgeDy);
            const f = barLine(b);
            return (
              <g key={i} className={`bsp-bar bsp-b${i}`}>
                <line x1={e.x} y1={e.y1} x2={e.x} y2={e.y2} stroke={P.barsEdge} strokeWidth={MARK.barStroke} strokeLinecap="round" />
                <line x1={f.x} y1={f.y1} x2={f.x} y2={f.y2} stroke={P.bars} strokeWidth={MARK.barStroke} strokeLinecap="round" />
              </g>
            );
          })}
        </g>
        <g transform={`translate(0 ${MARK.edgeDy})`}>
          <DrawnSeven color={P.edge} />
        </g>
        <DrawnSeven color={P.fill} />
      </g>
      <g className="bsp-word" direction={dir}>
        <text className={`bsp-wm${name.length > 16 ? ' long' : ''}`} x="195" y="520">
          {name}
        </text>
        <text className="bsp-sg" x="195" y="556">
          {tx.slogan.map((w, i) => (
            <tspan key={w} className={`bsp-w${i}`}>
              {i ? ` ${w}` : w}
            </tspan>
          ))}
        </text>
      </g>
    </svg>
  );
}

/** Mounted next to <App/>; decides once, at mount, whether to show (see splashDecision.ts). */
export function BrandSplash() {
  const [plan, setPlan] = useState<{ mode: 'full' | 'still'; lang: 'he' | 'en' } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const skipRef = useRef<() => void>(() => {});

  // Layout effect: after the app's own first layout pass, before the first paint.
  useLayoutEffect(() => {
    let env, d;
    try {
      env = readSplashEnv();
      d = decideSplash(env);
    } catch {
      return; // never let the opening break startup
    }
    if (!d.show) return;
    writeSplashDay(env.today);
    setPlan({ mode: d.mode, lang: splashLang(location.search, readSplashPrefs(), navigator.language || '') });
  }, []);

  useEffect(() => {
    if (!plan) return;
    const ids = new Set<number>();
    const later = (fn: () => void, ms: number) => ids.add(window.setTimeout(fn, ms));
    const clear = () => {
      ids.forEach(clearTimeout);
      ids.clear();
    };
    const hold = plan.mode === 'still' ? SPLASH_STILL_MS : SPLASH_FULL_MS;
    later(() => setLeaving(true), hold);
    later(() => setPlan(null), hold + FADE_MS);
    let skipped = false;
    const skip = () => {
      if (skipped) return;
      skipped = true;
      clear();
      setLeaving(true);
      // Stays (fading) a moment, so the tap's click lands on the splash, not on the app underneath.
      later(() => setPlan(null), SKIP_FADE_MS);
    };
    skipRef.current = skip;
    window.addEventListener('keydown', skip);
    return () => {
      window.removeEventListener('keydown', skip);
      clear();
    };
  }, [plan]);

  if (!plan) return null;
  return (
    <div
      className={`bsp${leaving ? ' bsp-leaving' : ''}`}
      role="img"
      aria-label={BRAND_TEXT[plan.lang].splashLabel}
      lang={plan.lang}
      data-brand-splash={plan.mode}
      onPointerDown={() => skipRef.current()}
    >
      <SplashArt lang={plan.lang} mode={plan.mode} />
    </div>
  );
}
