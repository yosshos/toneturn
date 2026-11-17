// The studio game frame (redesign 2026-11-17, src/studio-games.css): one cover and one HUD for every game that draws
// its header with G2Head. Pure presentation — nothing here touches a game's state, scoring or XP.
//  - useGameFrame marks the game's <main> (data-gframe, data-gphase setup/play/over, data-gcourse) so one stylesheet
//    can lay every game out the same way: thin HUD row, course-tinted stage, controls pinned to the bottom.
//  - CoverHero: the game's Paper glyph on a course-tinted panel, its name and one-line goal, and a "How to play"
//    toggle that shows the game's own full setup paragraph.
//  - HudSegs: a segmented progress bar read from the header's "n/m" counter.
import { Children, isValidElement, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';
import { GAMES2, GAME_GLYPH } from './Arcade';
import { PaperGlyph, type GlyphKind } from './Glyph';
import { useCourse } from './courseContext';
import { GAME_TITLES } from '../engine/gameBoard';
import { GAMES_TX } from '../i18n/gamesText';
import { Icon } from './icons';

type Lang = 'he' | 'en';
export const docLang = (): Lang => (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'he');

const ALIAS: Record<string, string> = { 'name-tune': 'nametune', 'tune-up': 'tuneup', 'melody-puzzle': 'melodypuzzle' };

/** A game id from its shown title (GAMES2 / GAME_TITLES in either language). */
function idFromTitle(title: string): string | null {
  const g = GAMES2.find((x) => x.en[0] === title || x.he[0] === title);
  if (g) return g.id;
  for (const [k, v] of Object.entries(GAME_TITLES)) if (v.en === title || v.he === title) return k;
  return null;
}

function phaseOf(main: HTMLElement): 'setup' | 'play' | 'over' {
  const p = main.dataset.phase;
  if (p === 'setup' || p === 'over') return p;
  if (p) return 'play';
  const c = main.className;
  if (/(^|\s)\S*(-setup|-intro)(\s|$)/.test(c) || /(^|\s)game-setup(\s|$)/.test(c)) return 'setup';
  if (/(^|\s)\S*(-over|-done)(\s|$)/.test(c) || /(^|\s)recap(\s|$)/.test(c)) return 'over';
  return 'play';
}

/** Marks the <main> around `ref` as a studio game frame; returns the game id it names (data-game) when known. */
export function useGameFrame(ref: RefObject<HTMLElement | null>, on: boolean): string | null {
  const { active } = useCourse();
  const [game, setGame] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!on) return;
    const main = ref.current?.closest('main');
    // not a game: the leaderboard screen shares G2Head
    if (!main || main.dataset.screen === 'gameboard') return;
    main.dataset.gframe = '1';
    main.dataset.gphase = phaseOf(main);
    main.dataset.gcourse = active;
    const g = main.dataset.game ? (ALIAS[main.dataset.game] ?? main.dataset.game) : null;
    if (g !== game) setGame(g);
  });
  return game;
}

/** The plain text of a React subtree (numbers and strings only). */
function textOf(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(n)) return textOf(n.props.children);
  return '';
}

/** Segmented progress read from a "n/m" counter among the header's children (none when there is no counter). */
export function HudSegs({ from, lang }: { from: ReactNode; lang: Lang }) {
  let m: RegExpMatchArray | null = null;
  Children.forEach(from, (c) => {
    m ??= textOf(c).match(/(\d+)\s*\/\s*(\d+)/);
  });
  if (!m) return null;
  const cur = Math.max(0, Number((m as RegExpMatchArray)[1]));
  const of = Math.max(1, Number((m as RegExpMatchArray)[2]));
  if (of > 24)
    return (
      <span className="gs-segs bar" role="progressbar" aria-label={GAMES_TX.progress[lang]} aria-valuemin={0} aria-valuemax={of} aria-valuenow={cur}>
        <i style={{ width: `${Math.min(100, (100 * cur) / of)}%` }} />
      </span>
    );
  return (
    <span className="gs-segs" role="progressbar" aria-label={GAMES_TX.progress[lang]} aria-valuemin={0} aria-valuemax={of} aria-valuenow={cur} dir="ltr" style={{ gridTemplateColumns: `repeat(${of}, 1fr)` }}>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i + 1 < cur ? 'd' : i + 1 === cur ? 'c' : ''} />
      ))}
    </span>
  );
}

/** The cover's top: glyph panel, name, one-line goal, "How to play" (shows the setup's own paragraph). */
export function CoverHero({ title, game, lang, frameRef }: { title: string; game: string | null; lang: Lang; frameRef: RefObject<HTMLElement | null> }) {
  const id = idFromTitle(title) ?? game;
  const entry = id ? GAMES2.find((x) => x.id === id) : undefined;
  const glyph: GlyphKind | undefined = id ? GAME_GLYPH[id] : undefined;
  const [how, setHow] = useState(false);
  useLayoutEffect(() => {
    const main = frameRef.current?.closest('main');
    if (main) main.dataset.howto = how ? '1' : '0';
  }, [how, frameRef]);
  return (
    <div className="gs-cover" data-gs-cover={id ?? ''}>
      <div className="gs-hero" aria-hidden="true">
        <svg className="gs-lines" viewBox="0 0 100 50" preserveAspectRatio="none">
          {[14, 20, 26, 32, 38].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} />
          ))}
        </svg>
        {glyph && <PaperGlyph kind={glyph} width={132} height={104} className="gs-glyph" />}
      </div>
      <div className="gs-title">
        <h2>{title}</h2>
        {entry && <p>{entry[lang][1]}</p>}
      </div>
      <button type="button" className="gs-howto" aria-expanded={how} onClick={() => setHow((v) => !v)} data-gs-howto>
        {how ? GAMES_TX.hideHowTo[lang] : GAMES_TX.howTo[lang]}
        <span className="gs-chev" aria-hidden="true">
          <Icon k="fwd" />
        </span>
      </button>
    </div>
  );
}
