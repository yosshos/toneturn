// Dev-only gallery of the Paper icon language (#/dev/glyphs): every glyph in its three cuts on light and dark cards,
// the nav in the bar, path nodes, course icons and the badges. Query: ?only=a,b (names or prefixes ending in *),
// &sec=glyphs|nav|badges (default all), &theme=light|dark. e2e/paperGallery.spec.ts screenshots it.
import { useEffect, useRef, useState } from 'react';
import { BADGES } from '../../engine/badges';
import { COURSES } from '../../engine/courses';
import { BadgeArt } from '../BadgeArt';
import { GLYPHS } from '../Glyph';
import { Flame } from '../Streak';
import { PAPER } from './index';
import { navArt } from './art-core';
import { motionsOf, playIcon, useAmbient } from './motion';
import { PaperSvg } from './Paper';

const q = () => new URLSearchParams(location.hash.split('?')[1] ?? '');
const NAV = ['home', 'path', 'arcade', 'skills', 'friends', 'tools', 'achievements'];
/** The motion review set (sec=motion): one icon per motion of the vocabulary, and the nav. */
export const MOTION_SET = ['keys', 'guitar', 'bass', 'drums', 'sing', 'ear', 'tempo', 'encore', 'fire', 'record', 'echo', 'mixer', 'slow', 'sight', 'scales', 'cymbal', 'book', 'swingtime'];

/** Tap a cell: every icon in it plays (all cuts). */
const playAll = (el: Element, kind: 'tap' | 'event' = 'tap') => el.querySelectorAll('svg.pp, svg.badge-art, svg.flame').forEach((s) => playIcon(s, kind));

export function PaperGallery() {
  const p = q();
  const theme = p.get('theme') === 'dark' ? 'dark' : 'light';
  const sec = p.get('sec') ?? 'all';
  const only = (p.get('only') ?? '').split(',').filter(Boolean);
  const match = (k: string) => !only.length || only.some((o) => (o.endsWith('*') ? k.startsWith(o.slice(0, -1)) : k === o));
  const [auto, setAuto] = useState(p.get('play') === 'all');
  const [ev, setEv] = useState(false);
  const flameRef = useRef<HTMLSpanElement>(null);
  const nodeRef = useRef<HTMLSpanElement>(null);
  useAmbient(flameRef, 'flicker', true);
  useAmbient(nodeRef, 'breathe', true);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = 'he';
  }, [theme]);
  // "Play all": every icon on screen plays, again every 2.4 s.
  useEffect(() => {
    if (!auto) return;
    const go = () => document.querySelectorAll('.pg [data-play]').forEach((c) => playAll(c, ev ? 'event' : 'tap'));
    go();
    const id = window.setInterval(go, 2400);
    return () => window.clearInterval(id);
  }, [auto, ev]);
  const tap = (e: React.MouseEvent) => {
    const c = (e.target as Element).closest('[data-play]');
    if (c) playAll(c, ev ? 'event' : 'tap');
  };
  const names = Object.keys(GLYPHS).filter((k) => !k.startsWith('m:') || only.length).filter(match);
  const marks = Object.keys(GLYPHS).filter((k) => k.startsWith('m:') && !only.length);
  const missing = Object.keys(GLYPHS).filter((k) => !PAPER[k]);
  const extra = Object.keys(PAPER).filter((k) => !GLYPHS[k] && match(k));
  return (
    <div className="pg" data-ready="1" onClick={tap}>
      <style>{CSS}</style>
      <h1>Paper · {theme}</h1>
      <div className="pg-ctl">
        <button type="button" className={auto ? 'on' : ''} aria-pressed={auto} onClick={() => setAuto((x) => !x)} data-play-all="1">
          {auto ? 'Stop' : 'Play all'}
        </button>
        <button type="button" className={ev ? 'on' : ''} aria-pressed={ev} onClick={() => setEv((x) => !x)} data-play-event="1">
          {ev ? 'Event motion' : 'Tap motion'}
        </button>
        <small>Tap any icon to play its motion.</small>
      </div>
      {missing.length > 0 && <p className="pg-miss">no Paper drawing yet ({missing.length}): {missing.join(' ')}</p>}
      {(sec === 'all' || sec === 'motion') && (
        <section>
          <h2>motion</h2>
          <div className="pg-motion">
            {MOTION_SET.filter((k) => PAPER[k] && match(k)).map((k) => (
              <figure key={k} className="pg-mcell" data-play="1" data-glyph={k}>
                <PaperSvg art={PAPER[k]} cut="badge" width={96} />
                <figcaption>
                  {k} · {motionsOf(PAPER[k]).join(' · ')}
                </figcaption>
              </figure>
            ))}
            <figure className="pg-mcell" data-play="1" data-glyph="flame">
              <Flame lit size={60} />
              <figcaption>streak flame · flicker</figcaption>
            </figure>
          </div>
          <div className="pg-row pg-amb">
            <span ref={flameRef} className="pg-cell">
              <Flame lit size={26} />
              <small>ambient: flame</small>
            </span>
            <span ref={nodeRef} className="pg-cell pp-on-lemon">
              <span className="pg-disc node-disc" style={{ background: 'var(--lemon)' }}>
                <PaperSvg art={PAPER.keys} width={30} height={27} />
              </span>
              <small>ambient: now node</small>
            </span>
          </div>
        </section>
      )}
      {(sec === 'all' || sec === 'nav') && (
        <section>
          <h2>nav · courses · path nodes</h2>
          <div className="tabbar pg-bar">
            {NAV.map((id, i) => (
              <span key={id} className={`tab ${i === 1 ? 'on' : ''}`} data-play="1">
                <PaperSvg art={navArt(id, 16)!} cut="small" width={26} />
                <small>{id}</small>
              </span>
            ))}
          </div>
          <div className="pg-row">
            {COURSES.map((c) => (
              <span key={c.id} className="pg-cell" data-play="1">
                {PAPER[c.glyph] && <PaperSvg art={PAPER[c.glyph]} width={48} />}
                <small>{c.id}</small>
              </span>
            ))}
            {PAPER.encore && (
              <span className="pg-cell" data-play="1">
                <PaperSvg art={PAPER.encore} width={48} />
              </span>
            )}
          </div>
          <div className="pg-row">
            {(
              [
                ['pp-on-lemon', 'var(--lemon)', 'current'],
                ['pp-on-purple', 'var(--purple)', 'done'],
                ['', 'var(--card)', 'open'],
              ] as const
            ).map(([cls, bg, st]) =>
              ['keys', 'ear', 'drums', 'bebop'].map((k) => (
                <span key={st + k} className={`pg-cell ${cls}`} data-play="1">
                  <span className="pg-disc" style={{ background: bg }}>
                    <PaperSvg art={PAPER[k]} width={30} height={27} />
                  </span>
                  <small>{st}</small>
                </span>
              )),
            )}
          </div>
        </section>
      )}
      {(sec === 'all' || sec === 'glyphs') && (
        <section>
          <h2>glyphs ({names.length + extra.length})</h2>
          <div className="pg-grid">
            {[...names, ...extra].map((k) =>
              PAPER[k] ? (
                <figure key={k} className="pg-tile" data-glyph={k} data-play="1" data-motion={motionsOf(PAPER[k]).join(' ')}>
                  <div className="pg-sizes">
                    <PaperSvg art={PAPER[k]} cut="small" width={24} />
                    <PaperSvg art={PAPER[k]} cut="full" width={48} />
                    <PaperSvg art={PAPER[k]} cut="badge" width={88} />
                  </div>
                  <figcaption>
                    {k} <span className="pg-m">{motionsOf(PAPER[k]).join(' · ')}</span>
                  </figcaption>
                </figure>
              ) : (
                <figure key={k} className="pg-tile pg-old" data-glyph={k}>
                  <svg viewBox="-30 -27 60 54" width={60} height={54}>
                    {GLYPHS[k]}
                  </svg>
                  <figcaption>{k} (old)</figcaption>
                </figure>
              ),
            )}
          </div>
          {marks.length > 0 && (
            <div className="pg-row pg-marks">
              {marks.map(
                (k) =>
                  PAPER[k] && (
                    <span key={k} data-play="1">
                      <PaperSvg art={PAPER[k]} width={40} />
                    </span>
                  ),
              )}
            </div>
          )}
        </section>
      )}
      {(sec === 'all' || sec === 'badges') && (
        <section>
          <h2>badges</h2>
          <div className="pg-row">
            {BADGES.filter((b) => match(b.id)).map((b, i) => (
              <span key={b.id} data-play="1">
                <BadgeArt badge={b} earned={i % 7 !== 3} size={72} />
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const CSS = `
.pg { padding: 16px; background: var(--bg); color: var(--ink); min-height: 100vh; font: 13px var(--font); }
.pg h1 { font: 400 22px var(--display); margin: 0 0 8px; }
.pg h2 { font-size: 15px; margin: 18px 0 8px; }
.pg-miss { color: var(--bad); word-break: break-word; }
.pg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr)); gap: 10px; }
.pg-tile { margin: 0; background: var(--card); border: 2px solid var(--line-strong); border-radius: 16px; padding: 10px 8px 6px; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
.pg-sizes { display: flex; align-items: flex-end; gap: 10px; }
.pg-tile figcaption { font-weight: 700; font-size: 12px; overflow-wrap: anywhere; }
.pg-old { outline: 3px dashed var(--bad); }
.pg-m { display: block; font-weight: 400; color: var(--ink-3, #6b6480); }
.pg-ctl { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 8px; }
.pg-ctl button { font: 700 13px var(--font); padding: 6px 12px; border-radius: 10px; border: 2px solid var(--line-strong); background: var(--card); color: var(--ink); }
.pg-ctl button.on { background: var(--ink); color: var(--card); }
.pg-motion { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 10px; }
.pg-mcell { margin: 0; background: var(--card); border: 2px solid var(--line-strong); border-radius: 16px; padding: 12px 6px 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; min-width: 0; }
.pg-mcell figcaption { font-size: 11px; text-align: center; overflow-wrap: anywhere; }
.pg-amb { margin-top: 10px; }
[data-play] { cursor: pointer; }
.pg-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; background: var(--card); border-radius: 16px; padding: 10px; }
.pg-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.pg-bar { position: static !important; display: flex; justify-content: space-around; max-width: 560px; }
.pg-bar .tab { display: flex; flex-direction: column; align-items: center; padding: 6px 8px; min-height: 0 !important; }
.pg-disc { width: 72px; height: 54px; border-radius: 50%; transform: rotate(-14deg); display: grid; place-items: center; border: 3px solid var(--outline); }
.pg-disc > svg { transform: rotate(14deg); }
`;
