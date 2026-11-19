// 0.37 "night arcade" pieces (docs/ui-redesign.md): tab bar, level ring, what's-new gift, today's mission,
// domain tiles, the path as a winding road, and the Play hub.

import { COURSE_AREAS } from '../engine/courses';
import { RIcon } from './Recordings';
import { DOMAIN_COLOR, Glyph, type GlyphKind } from './Glyph';
import { PAPER } from './paper';
import { navArt } from './paper/art-core';
import { PaperSvg } from './paper/Paper';
import { useCourse } from './courseContext';
import { ExamPrepSwitch, JazzFocusSwitch } from './CourseSwitcher';
import { COURSE_GAMES, COURSE_ROWS, courseGames, courseRows } from './courseRows';
import { MS_TILE } from '../content/mySongText';
export { COURSE_GAMES, COURSE_ROWS, courseRows };
import type { CourseId } from '../engine/courses';
import { Icon } from './icons';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { levelOf } from '../engine/level';
import { DOMAINS, domainValue, weakestSkill, type DomainId } from '../engine/rating';
import type { SkillId, LessonId } from '../engine/lesson';
import { TOPICS } from '../engine/recommend';
import { personalOrder, type Intake } from '../engine/intake';
import { displayNote, pc } from '../engine/pitch';
import { LESSON_META } from '../game/content';
import type { Strings } from '../i18n/strings';
import { localDay, namingFor, ratingsOf, type Progress, type Settings } from '../storage/progress';
import { weekId } from '../engine/adaptive';
import { CHANGELOG } from '../version';
import { Changelog } from './Menu';
import { lessonStates, NodeIcon, starsFor, TOTALS } from './Home';
import { MicIcon, withNote } from './bits';
import { RankCrest } from './Badges';
import { areaProgress, divFloor, divisionFor, MASTER_DIV, rankLabel, techniqueProgress, type RankProgress } from '../engine/ranks';
import { techniqueOf } from '../engine/rankBadges';
import type { GameKind } from '../game/memoryGame';
import { tierCard, tierInfo, tierKey, tierSpec } from '../engine/gameTiers';
import { TierBadge } from './TierChips';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

export const DOMAIN_HUE: Record<DomainId, string> = {
  pitch: 'var(--hue-pitch)',
  time: 'var(--hue-time)',
  memory: 'var(--hue-memory)',
  voice: 'var(--hue-voice)',
  reading: 'var(--hue-reading)',
  creative: 'var(--hue-creative)',
  instrument: 'var(--hue-instrument)',
};
type TopicId = (typeof TOPICS)[number]['id'];
const TOPIC_HUE: Record<TopicId, string> = { degrees: 'var(--hue-reading)', harmony: 'var(--hue-pitch)', intervals: 'var(--hue-memory)', singing: 'var(--hue-voice)', rhythm: 'var(--hue-time)' };
const TOPIC_ICON: Record<TopicId, 'steps' | 'chord' | 'ear' | 'mic' | 'drum'> = { degrees: 'steps', harmony: 'chord', intervals: 'ear', singing: 'mic', rhythm: 'drum' };

/** Light haptics (where supported, never with reduced motion). */
export function buzz(kind: 'good' | 'bad') {
  if (document.documentElement.dataset.motion === 'reduced' || document.documentElement.dataset.haptics === 'off') return;
  try {
    navigator.vibrate?.(kind === 'good' ? 12 : [18, 40, 18]);
  } catch {
    /* not supported */
  }
}

// ---------------------------------------------------------------------------------------------- tab bar

export type TabId = 'home' | 'path' | 'skills' | 'arcade' | 'friends';
export const TAB_ROUTES: TabId[] = ['home', 'path', 'arcade', 'skills', 'friends']

export const TAB_ICONS: Record<TabId, React.ReactNode> = {
  // Today (SPEC-TODAY): a calendar page showing today's date.
  home: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
      <text x="12" y="18.2" textAnchor="middle" fontSize="8.4" fontWeight="800" fill="currentColor" stroke="none" fontFamily="Rubik, system-ui, sans-serif">
        {new Date().getDate()}
      </text>
    </>
  ),
  // 0.61: the path is a melody on a staff; Practice is two beamed notes.
  path: (
    <>
      <path d="M2 8h20M2 12h20M2 16h20" opacity=".45" />
      <ellipse cx="7" cy="16" rx="2.4" ry="1.8" fill="currentColor" stroke="none" />
      <ellipse cx="13" cy="12" rx="2.4" ry="1.8" fill="currentColor" stroke="none" />
      <ellipse cx="19" cy="8" rx="2.4" ry="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  skills: <path d="M5 21V12M12 21V4M19 21v-7" />,
  arcade: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
      <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="9" r="3.6" />
      <path d="M2.5 20c0-3.3 2.9-5.4 6.5-5.4s6.5 2.1 6.5 5.4M16.5 5.6a3.3 3.3 0 0 1 0 6.6M17.5 14.8c2.4.4 4 2.2 4 5.2" />
    </>
  ),
};

/** A nav icon in the Paper language (src/ui/paper), simplified cut: tab bar, sidebar. */
export function NavIcon({ id, size = 24 }: { id: TabId | 'tools' | 'achievements'; size?: number }) {
  const a = navArt(id);
  return a ? <PaperSvg art={a} cut="small" width={size} className="nav-pp" /> : null;
}

export function TabBar({ t, route, onGo, dot }: { t: Strings; route: TabId; onGo: (r: TabId) => void; /** Tabs that have something new. */ dot?: Partial<Record<TabId, boolean>> }) {
  const label: Record<TabId, string> = { home: t.tabHome, path: t.tabPath, skills: t.tabProgress, arcade: t.tabPlay, friends: t.tabFriends };
  return (
    <nav className="tabbar" aria-label={t.tabsLabel}>
      {TAB_ROUTES.map((r) => (
        <button key={r} className={`tab ${route === r ? 'on' : ''}`} aria-current={route === r ? 'page' : undefined} onClick={() => onGo(r)} data-tab={r}>
          <span className="tab-icon" aria-hidden="true">
            <NavIcon id={r} size={26} />
            {dot?.[r] && <span className="tab-dot" />}
          </span>
          <span className="tab-label">{label[r]}</span>
        </button>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------------------------- level

export function LevelRing({ xp, size = 46 }: { xp: number; size?: number }) {
  const lv = levelOf(xp);
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <span className="level-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 46 46" width={size} height={size} aria-hidden="true">
        <circle cx="23" cy="23" r={r} className="lr-bg" />
        <circle cx="23" cy="23" r={r} className="lr-fg" strokeDasharray={c} strokeDashoffset={c * (1 - lv.pct)} transform="rotate(-90 23 23)" />
      </svg>
      <b>{lv.level}</b>
    </span>
  );
}

export function greeting(t: Strings, now = new Date()) {
  const h = now.getHours();
  return h < 5 ? t.greetNight : h < 12 ? t.greetMorning : h < 17 ? t.greetAfternoon : h < 22 ? t.greetEvening : t.greetNight;
}

/** The player's card under the header: greeting, level ring and the bar to the next level. */
export function PlayerStrip({ t, xp, name, onOpen }: { t: Strings; xp: number; name: string | null; onOpen: () => void }) {
  const lv = levelOf(xp);
  return (
    <button className="player-strip" onClick={onOpen} aria-label={`${fill(t.levelN, { n: lv.level })} · ${fill(t.levelXp, { a: lv.into, b: lv.need })}`}>
      <LevelRing xp={xp} />
      <span className="ps-text">
        <b>
          {greeting(t)}
          {name ? `, ${name}` : ''}
        </b>
        <span className="ps-line">
          <span>{fill(t.levelN, { n: lv.level })}</span>
          <span className="ps-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(lv.pct * 100)}%` }} />
          </span>
          <small dir="ltr">{fill(t.levelXp, { a: lv.into, b: lv.need })}</small>
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------------------------- what's new

/** A small gift in the header instead of a big card after updates; a dot while something is unseen. */
export function WhatsNewButton({ t, lang, unseen, onSeen }: { t: Strings; lang: 'he' | 'en'; unseen: boolean; onSeen: () => void }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const head = CHANGELOG[0];
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', off);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', off);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="gift-wrap" ref={ref}>
      <button
        className={`icon-btn gift-btn ${unseen ? 'unseen' : ''}`}
        aria-label={`${t.whatsNew} ${head.version}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((x) => !x);
          setAll(false);
          if (unseen) onSeen();
        }}
      >
        {/* what is new: the Paper chrome gift (2026-11-16) */}
        <Icon k="gift" size={21} className="gift-icon" />
        {unseen && <span className="gift-dot" />}
      </button>
      {open && (
        <div className="gift-pop" role="dialog" aria-label={t.whatsNew}>
          <div className="gift-head">
            <b>{fill(t.newIn, { v: head.version })}</b>
            <button className="icon-btn small" aria-label={t.done} onClick={() => setOpen(false)}>
              <Icon k="close" />
            </button>
          </div>
          {all ? (
            <div className="gift-all">
              <Changelog lang={lang} entries={CHANGELOG.slice(0, 4)} />
            </div>
          ) : (
            <ul className="gift-list">
              {head[lang].slice(0, 3).map((line, i) => (
                <li key={i}>{line.length > 90 ? `${line.slice(0, 88).trimEnd()}…` : line}</li>
              ))}
            </ul>
          )}
          {!all && (
            <button className="link gift-more" onClick={() => setAll(true)}>
              {t.allChanges} <Icon k="fwd" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- mission

export function MissionCard({ t, settings, lessonId, anyDone, todayXp, goalXp, onStart, title, blurb }: { t: Strings; settings: Settings; lessonId: LessonId; anyDone: boolean; todayXp: number; goalXp: number; onStart: () => void; title?: string; blurb?: string }) {
  const lang = settings.uiLang;
  const base = LESSON_META[lessonId];
  // The next path step (spec AF D7) may be a topic level, a checkpoint …: its own title and line.
  const meta = title ? { ...base, title: { en: title, he: title }, blurb: { en: blurb ?? '', he: blurb ?? '' } } : base;
  const bb = displayNote(pc('Bb'), namingFor(settings.naming, lang), lang);
  const pct = Math.min(1, todayXp / goalXp);
  return (
    <section className="mission-card" aria-label={t.todaysMission}>
      <span className="mission-shine" aria-hidden="true" />
      <small className="mission-kicker">{t.todaysMission}</small>
      <h2 className="mission-title">{withNote(meta.title[lang], bb)}</h2>
      <p className="mission-blurb">{meta.blurb[lang]}</p>
      <div className="mission-row">
        <button className="mission-play" data-continue="1" onClick={onStart} aria-label={`${anyDone ? t.continue : t.practice}: ${meta.title[lang].replace(/\{[nk]\}/g, bb)}`}>
          {settings.mode === 'voice' ? (
            <MicIcon />
          ) : (
            <Icon k="play" size={26} />
          )}
        </button>
        <div className="mission-goal">
          <div className="mg-head">
            <span>{t.dailyGoal}</span>
            <b dir="ltr">
              {todayXp}/{goalXp} {t.xp}
            </b>
          </div>
          <span className="mg-bar" role="progressbar" aria-valuemin={0} aria-valuemax={goalXp} aria-valuenow={Math.min(todayXp, goalXp)} aria-label={t.dailyGoal}>
            <span style={{ width: `${Math.round(pct * 100)}%` }} />
          </span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------- domains

/** The line under an area's promotion bar: next rank, what locks it, or how far to the first rank. */
function rankHint(p: RankProgress, lang: 'en' | 'he'): string {
  const he = lang === 'he';
  if (p.toFirst) return he ? `${p.toFirst.answers}/${p.toFirst.need} תשובות לדירוג` : `${p.toFirst.answers}/${p.toFirst.need} answers to rank`;
  if (p.next === null) return he ? 'הדרגה העליונה' : 'Top rank';
  if (p.needAnswers) return he ? `${rankLabel(p.next, lang)}: עוד ${p.needAnswers} תשובות` : `${rankLabel(p.next, lang)}: ${p.needAnswers} more answers`;
  return `→ ${rankLabel(p.next, lang)}`;
}

export function DomainTiles({
  t,
  progress,
  onPractice,
  lang = 'en',
  onTechnique,
  onLearn,
}: {
  t: Strings;
  progress: Progress;
  onPractice: (k: SkillId) => void;
  lang?: 'en' | 'he';
  /** Adds the Technique tile (Progress tab). */
  onTechnique?: () => void;
  /** Progress tab (owner 2026-11-08): a tile opens the area sheet (sub-skills, ranks, Play / Learn) instead of playing. */
  onLearn?: { has: (k: SkillId) => boolean; open: (k: SkillId) => void };
}) {
  const ratings = ratingsOf(progress);
  const events = progress.ratingEvents ?? [];
  const weakest = weakestSkill(ratings);
  const [open, setOpen] = useState<DomainId | null>(null);
  // 0.64 (owner): only the active course's areas.
  const areas = COURSE_AREAS[useCourse().active];
  return (
    <section className="home-section domains" aria-label={t.domainsTitle}>
      <h2 className="home-h">{t.domainsTitle}</h2>
      <p className="field-hint">{t.domainsHint}</p>
      <div className="domain-grid">
        {DOMAINS.filter((d) => areas.includes(d.id)).map((d) => {
          const v = domainValue(ratings, d.id);
          const pick = weakestSkill(ratings, d.skills.filter((k) => k !== 'absolute'));
          const hot = d.skills.includes(weakest);
          const rp = areaProgress(ratings, events, d.id, progress.ranks?.[d.id]);
          const pct = Math.round(rp.frac * 100);
          return (
            <button key={d.id} className="domain-tile" style={{ ['--hue' as string]: DOMAIN_HUE[d.id] }} onClick={() => (onLearn ? setOpen(d.id) : onPractice(pick))} data-domain={d.id}>
              <span className="dt-top">
                {rp.div !== null ? (
                  <span className="dt-rank">
                    <RankCrest div={rp.div} size={30} lang={lang} />
                    <span className="dt-rank-name">{rankLabel(rp.div, lang)}</span>
                  </span>
                ) : (
                  <span className="dt-dot" aria-hidden="true" />
                )}
                {hot && <span className="hot-chip">{t.hotChip}</span>}
              </span>
              <b>{t.domainNames[d.id]}</b>
              <small>{t.skillNames[pick]}</small>
              <span className="dt-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={rankHint(rp, lang)}>
                <span style={{ width: v ? `${Math.max(4, pct)}%` : '0%' }} />
              </span>
              {v ? <small className="dt-next">{rankHint(rp, lang)}</small> : <small className="dt-none">{t.domainUnmeasured}</small>}
            </button>
          );
        })}
        {onTechnique &&
          (() => {
            // Technique (drills) has its own rank too (ranks.ts): same tile, opens the drills.
            const rp = techniqueProgress(techniqueOf(progress.drillItems), progress.ranks?.technique);
            const pct = Math.round(rp.frac * 100);
            const started = Object.values(progress.drillItems ?? {}).some((x) => x.takes > 0);
            return (
              <button className="domain-tile" style={{ ['--hue' as string]: 'var(--hue-instrument)' }} onClick={onTechnique} data-domain="technique">
                <span className="dt-top">
                  {rp.div !== null ? (
                    <span className="dt-rank">
                      <RankCrest div={rp.div} size={30} lang={lang} />
                      <span className="dt-rank-name">{rankLabel(rp.div, lang)}</span>
                    </span>
                  ) : (
                    <span className="dt-dot" aria-hidden="true" />
                  )}
                </span>
                <b>{lang === 'he' ? 'טכניקה' : 'Technique'}</b>
                <small>{lang === 'he' ? 'תרגילים טכניים' : 'Technique drills'}</small>
                <span className="dt-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={rankHint(rp, lang)}>
                  <span style={{ width: started ? `${Math.max(4, pct)}%` : '0%' }} />
                </span>
                {started ? <small className="dt-next">{rankHint(rp, lang)}</small> : <small className="dt-none">{t.domainUnmeasured}</small>}
              </button>
            );
          })()}
      </div>
      {open && onLearn && <AreaSheet t={t} lang={lang} progress={progress} area={open} onClose={() => setOpen(null)} onPractice={(k) => (setOpen(null), onPractice(k))} learn={onLearn} />}
    </section>
  );
}

/** One sub-skill's rank from its rating: the division and the bar to the next (never full below Master). */
function skillRank(r: number): { div: number; frac: number } {
  const div = divisionFor(r);
  if (div >= MASTER_DIV) return { div, frac: 1 };
  const lo = divFloor(div);
  return { div, frac: Math.max(0, Math.min(0.99, (r - lo) / (divFloor(div + 1) - lo))) };
}

/** The area sheet: the area's rank and bar, then every sub-skill with its rank, a bar, and small Play / Learn buttons. */
function AreaSheet({ t, lang, progress, area, onClose, onPractice, learn }: { t: Strings; lang: 'en' | 'he'; progress: Progress; area: DomainId; onClose: () => void; onPractice: (k: SkillId) => void; learn: { has: (k: SkillId) => boolean; open: (k: SkillId) => void } }) {
  const ratings = ratingsOf(progress);
  const d = DOMAINS.find((x) => x.id === area)!;
  const rp = areaProgress(ratings, progress.ratingEvents ?? [], area, progress.ranks?.[area]);
  const he = lang === 'he';
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet area-sheet" role="dialog" aria-modal="true" aria-labelledby="area-sheet-title" onClick={(e) => e.stopPropagation()} style={{ ['--hue' as string]: DOMAIN_HUE[area] }} data-area-sheet={area}>
        <div className="menu-head">
          <h2 id="area-sheet-title">
            <RankCrest div={rp.div} size={32} lang={lang} /> {t.domainNames[area]}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.back}>
            <Icon k="close" />
          </button>
        </div>
        <div className="as-head">
          <small>{rp.div !== null ? rankLabel(rp.div, lang) : t.domainUnmeasured}</small>
          <span className="dt-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(rp.frac * 100)} aria-label={rankHint(rp, lang)}>
            <span style={{ width: `${Math.max(rp.div === null && !rp.frac ? 0 : 4, Math.round(rp.frac * 100))}%` }} />
          </span>
          <small className="dt-next">{rankHint(rp, lang)}</small>
        </div>
        <ul className="as-skills">
          {d.skills.map((k) => {
            const sr = ratings[k];
            const measured = !!sr && sr.n > 0;
            const rk = measured ? skillRank(sr!.r) : null;
            return (
              <li key={k} className="as-skill" data-skill={k}>
                <div className="as-info">
                  <span className="as-name">
                    <b>{t.skillNames[k]}</b>
                    {rk && <RankCrest div={rk.div} size={20} lang={lang} />}
                  </span>
                  <span className="dt-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rk ? Math.round(rk.frac * 100) : 0} aria-label={t.skillNames[k]}>
                    <span style={{ width: rk ? `${Math.max(4, Math.round(rk.frac * 100))}%` : '0%' }} />
                  </span>
                  <small>{rk ? `${rankLabel(rk.div, lang)}${sr!.n < 10 ? '?' : ''}` : t.domainUnmeasured}</small>
                </div>
                <div className="as-btns">
                  {learn.has(k) && (
                    <button className="icon-btn small" onClick={() => learn.open(k)} aria-label={`${he ? 'ללמוד' : 'Learn'}: ${t.skillNames[k]}`} title={he ? 'ללמוד' : 'Learn'} data-learn={k}>
                      <Icon k="book" size={18} />
                    </button>
                  )}
                  <button className="icon-btn small as-play" onClick={() => onPractice(k)} aria-label={`${he ? 'לתרגל' : 'Play'}: ${t.skillNames[k]}`} title={he ? 'לתרגל' : 'Play'} data-play={k}>
                    <Icon k="play" size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- path

/** Horizontal position (0..100, from the reading start) of node i on the winding road. */
export const roadX = (i: number) => 50 + 28 * Math.sin(i * 0.95);

export function PathScreen({ t, settings, progress, onStart, onPlacement }: { t: Strings; settings: Settings; progress: Progress; onStart: (id: LessonId) => void; onPlacement: () => void }) {
  const lang = settings.uiLang;
  const bb = displayNote(pc('Bb'), namingFor(settings.naming, lang), lang);
  const order = personalOrder((settings.intake as Intake | null | undefined)?.priorities, settings.track);
  const states = lessonStates(progress, order);
  const done = order.filter((id) => states[id] === 'done').length;
  const topicOf = (id: LessonId): TopicId => TOPICS.find((tp) => tp.lessons.includes(id))?.id ?? 'degrees';
  // Units: runs of consecutive lessons on one topic.
  const units: { topic: TopicId; ids: LessonId[] }[] = [];
  for (const id of order) {
    const tp = topicOf(id);
    if (units.length && units[units.length - 1].topic === tp) units[units.length - 1].ids.push(id);
    else units.push({ topic: tp, ids: [id] });
  }
  const curRef = useRef<HTMLLIElement>(null);
  const roadRef = useRef<HTMLOListElement>(null);
  const road = useRoad(roadRef, `${lang}|${order.join()}|${done}`);
  useEffect(() => {
    curRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
  }, []);
  const topics = TOPICS.map((tp) => ({ id: tp.id, d: tp.lessons.filter((id) => (progress.lessons[id]?.completions ?? 0) > 0).length, n: tp.lessons.length }));
  let k = 0;
  return (
    <main className="path-screen">
      <header className="path-head">
        <div className="ph-row">
          <h1>{t.lessonPath}</h1>
          <span className="count-chip" dir="auto">
            {fill(t.pathCount, { d: done, n: order.length })}
          </span>
        </div>
        <ul className="path-topics" aria-label={t.topics}>
          {topics.map((tp) => (
            <li key={tp.id} data-topic={tp.id} style={{ ['--hue' as string]: TOPIC_HUE[tp.id] }}>
              <span className="pt-bar" role="progressbar" aria-valuemin={0} aria-valuemax={tp.n} aria-valuenow={tp.d} aria-label={t.topicNames[tp.id]}>
                <span style={{ width: `${(100 * tp.d) / tp.n}%` }} />
              </span>
              <small>{t.topicNames[tp.id]}</small>
            </li>
          ))}
        </ul>
      </header>
      <div className="road-wrap">
      {road && (
        <svg className="road-svg" width={road.w} height={road.h} viewBox={`0 0 ${road.w} ${road.h}`} aria-hidden="true">
          <path className="road-bed" d={road.d} />
          {road.doneD && <path className="road-done" d={road.doneD} />}
        </svg>
      )}
      <ol className="road" ref={roadRef}>
        {units.map((u, ui) => {
          const unitLocked = u.ids.every((id) => states[id] === 'locked');
          return [
            <li key={`u${ui}`} className={`unit-banner ${unitLocked ? 'locked' : ''}`} style={{ ['--hue' as string]: TOPIC_HUE[u.topic] }}>
              <span>
                <small>{fill(t.unitN, { n: ui + 1 })}</small>
                <b>{t.topicNames[u.topic]}</b>
                {unitLocked && <small className="unit-hint">{t.pathNextUnit}</small>}
              </span>
              <span className="unit-icon" aria-hidden="true">
                {unitLocked ? <Icon k="lock" size={20} /> : <NodeIcon kind={TOPIC_ICON[u.topic]} />}
              </span>
            </li>,
            ...u.ids.map((id) => {
              const i = k++;
              const st = states[id];
              const m = LESSON_META[id];
              const best = progress.lessons[id]?.best ?? 0;
              const stars = st === 'done' ? starsFor(best, TOTALS[id] ?? 1) : 0;
              const x = roadX(i);
              return (
                <li key={id} ref={st === 'current' ? curRef : undefined} className={`node ${st}`} style={{ ['--x' as string]: `${x}%`, ['--hue' as string]: TOPIC_HUE[u.topic] }}>
                  <button className="node-btn" disabled={st === 'locked'} onClick={() => onStart(id)} aria-label={`${i + 1}. ${m.title[lang].replace(/\{[nk]\}/g, bb)}`}>
                    {st === 'current' && (
                      <span className="start-bubble" aria-hidden="true">
                        {t.startLesson} <Icon k="play" />
                      </span>
                    )}
                    <span className="node-disc" aria-hidden="true">
                      {st === 'locked' ? <span className="lock"><Icon k="lock" /></span> : <NodeIcon kind={m.icon} />}
                    </span>
                    <span className="node-text">
                      {st === 'done' && (
                        <span className="mini-stars" aria-label={`${stars} ${t.stars}`}>
                          {[0, 1, 2].map((s) => (
                            <span key={s} className={s < stars ? 'won' : ''}>
                              ★
                            </span>
                          ))}
                        </span>
                      )}
                      <b>{withNote(m.title[lang], bb)}</b>
                    </span>
                  </button>
                </li>
              );
            }),
          ];
        })}
      </ol>
      </div>
      <p className="path-foot">
        <button className="link" onClick={onPlacement}>
          {t.findLevel}
        </button>
      </p>
    </main>
  );
}

/** One road through every lesson disc, measured after layout (so banners and wrapped titles never break it). */
export function useRoad(ref: React.RefObject<HTMLOListElement | null>, key: string) {
  const [road, setRoad] = useState<{ w: number; h: number; d: string; doneD: string | null } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const pts = Array.from(el.querySelectorAll<HTMLElement>('.node')).map((li) => {
        const r = (li.querySelector('.node-disc, .node-bar') ?? li).getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top, done: li.classList.contains('done') };
      });
      if (pts.length < 2) return setRoad(null);
      const seg = (a: (typeof pts)[number], b: (typeof pts)[number]) => {
        const dy = (b.y - a.y) / 2;
        return ` C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`;
      };
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) d += seg(pts[i - 1], pts[i]);
      // Lit up to the first lesson not done yet.
      const lastDone = pts.findIndex((p) => !p.done);
      const upto = lastDone === -1 ? pts.length - 1 : lastDone;
      let doneD: string | null = null;
      if (upto > 0) {
        doneD = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i <= upto; i++) doneD += seg(pts[i - 1], pts[i]);
      }
      setRoad({ w: box.width, h: box.height, d, doneD });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, key]);
  return road;
}

// ---------------------------------------------------------------------------------------------- play

/** The 0.38 games (spec AE §8): route, icon, hue and names. */
export type GameCat = 'ear' | 'rhythm' | 'memory' | 'read' | 'voice' | 'instrument' | 'social';
export const GAME_CATS: { id: GameCat; en: string; he: string }[] = [
  { id: 'ear', en: 'Ear & harmony', he: 'שמיעה והרמוניה' },
  { id: 'rhythm', en: 'Rhythm', he: 'קצב' },
  { id: 'memory', en: 'Memory', he: 'זיכרון' },
  { id: 'read', en: 'Reading & theory', he: 'קריאה ותיאוריה' },
  { id: 'voice', en: 'Voice', he: 'קול' },
  { id: 'instrument', en: 'Instrument & sound', he: 'כלי וסאונד' },
  { id: 'social', en: 'Against others', he: 'מול אחרים' },
];
export const GAMES2: { id: 'drills' | 'highway' | 'flight' | 'melodypuzzle' | 'nametune' | 'tuneup' | 'pitchmemory' | 'rush-chord' | 'rush-note' | 'rush-fretboard' | 'rush-interval' | 'rush-keysig' | 'rush-progression' | 'peakhunter' | 'rush-voicing' | 'rush-scale' | 'rush-standard' | 'reharm' | 'transcribe' | 'bhtime' | 'riffecho' | 'polylock' | 'land' | 'groove-echo' | 'odd-echo' | 'time-lock' | 'ghost-control' | 'rudiment-rush' | 'groove-off' | 'playback' | 'voicingsprint' | 'changerace' | 'walkchanges' | 'rootsear' | 'harmonyhold' | 'singinterval' | 'kitread' | 'namegroove' | 'guidetone' | 'call5432' | 'enclosure' | 'crossword' | 'holdnote' | 'bordercontrol' | 'whichbrother' | 'runcatcher' | 'compcaller' | 'elevator' | 'staffrunner' | 'rootcatch' | 'strumchange' | 'rebound' | 'singback' | 'thirdjump' | 'darkside' | 'whichpair' | 'euclid' | 'mirror' | 'tonnetz'; hue: string; cat: GameCat; en: [string, string]; he: [string, string] }[] = [
  { id: 'rush-chord', hue: 'var(--hue-pitch)', cat: 'read', en: ['Chord Rush', 'Name chords on the neck, keys or staff — 60 seconds.'], he: ['מרוץ אקורדים', 'זהו אקורדים על הצוואר, הקלידים או החמשה — 60 שניות.'] },
  { id: 'rush-note', hue: 'var(--hue-reading)', cat: 'read', en: ['Note Rush', 'Read notes off the staff as fast as you can.'], he: ['מרוץ תווים', 'קראו תווים מהחמשה הכי מהר שאפשר.'] },
  { id: 'rush-keysig', hue: 'var(--hue-reading)', cat: 'read', en: ['Key Signature Rush', 'Sharps and flats → the key, fast.'], he: ['מרוץ סימני מפתח', 'דיאזים ובמולים → הסולם, מהר.'] },
  { id: 'rush-interval', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Interval Sprint', 'Hear two notes, name the distance — beat the clock.'], he: ['ספרינט מרווחים', 'שומעים שני צלילים, קובעים את המרחק — נגד השעון.'] },
  { id: 'rush-progression', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Progression Detective', 'Name the chords of what you hear. Three lives.'], he: ['בלש המהלכים', 'זהו את האקורדים של מה שאתם שומעים. שלושה חיים.'] },
  { id: 'rush-fretboard', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Fretboard Sprint', 'Find the note on the neck — 60 seconds.'], he: ['ספרינט צוואר', 'מצאו את התו על הצוואר — 60 שניות.'] },
  { id: 'peakhunter', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Peak Hunter', 'Find the boosted frequency.'], he: ['צייד הפיקים', 'מצאו את התדר שהוגבר.'] },
  { id: 'highway', hue: 'var(--hue-time)', cat: 'rhythm', en: ['Rhythm Highway', 'Tap the notes as they reach the line.'], he: ['כביש הקצב', 'הקישו על התווים כשהם מגיעים לקו.'] },
  { id: 'flight', hue: 'var(--hue-voice)', cat: 'voice', en: ['Voice Flight', 'Sing or play to fly through the gates.'], he: ['טיסת קול', 'שירו או נגנו כדי לעוף בין השערים.'] },
  { id: 'melodypuzzle', hue: 'var(--hue-memory)', cat: 'memory', en: ['Melody Puzzle', 'Put the notes of what you heard in order.'], he: ['פאזל מנגינה', 'סדרו את התווים של מה ששמעתם.'] },
  { id: 'nametune', hue: 'var(--hue-pitch)', cat: 'memory', en: ['Name That Tune', 'Hear the opening, pick the song — fast.'], he: ['זהו את השיר', 'שומעים את הפתיחה, בוחרים את השיר — מהר.'] },
  { id: 'drills', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Technique', 'Scales, Hanon, Barry Harris, voicings — with a tempo ladder and a MIDI analysis.'], he: ['טכניקה', 'סולמות, האנון, בארי האריס, וויסינגים — עם סולם טמפו וניתוח MIDI.'] },
  { id: 'tuneup', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Tune-up', 'Turn the peg until the beats disappear.'], he: ['כיוון', 'סובבו את המפתח עד שהפעימות נעלמות.'] },
  { id: 'pitchmemory', hue: 'var(--hue-creative)', cat: 'ear', en: ['Pitch Memory', 'Once a day: your note, from memory.'], he: ['זיכרון צליל', 'פעם ביום: הצליל שלכם, מהזיכרון.'] },
  // 0.70: advanced games for jazz and complex music (open at mp).
  { id: 'rush-voicing', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Voicing Spy', 'Hear a chord, name its voicing: close, drop 2, rootless, quartal.'], he: ['מרגל הוויסינגים', 'שומעים אקורד, מזהים את הוויסינג: צפוף, דרופ 2, בלי שורש, קוורטלי.'] },
  { id: 'reharm', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Reharm Spotter', 'Original, then reharmonised: find the bar, name the substitution.'], he: ['גלאי ההרמוניה', 'המקור ואז ההרמוניה החדשה: מוצאים את התיבה, נותנים שם לתחליף.'] },
  { id: 'rush-standard', hue: 'var(--hue-pitch)', cat: 'memory', en: ['Name That Standard', 'Hear the changes, name the tune — 10 rounds.'], he: ['זהו את הסטנדרט', 'שומעים את המהלך, מזהים את השיר — 10 סיבובים.'] },
  { id: 'rush-scale', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Scale & Mode Rush', 'Hear a scale or mode, name it — 60 seconds.'], he: ['מרוץ סולמות ומודוסים', 'שומעים סולם או מודוס, נותנים שם — 60 שניות.'] },
  { id: 'transcribe', hue: 'var(--hue-memory)', cat: 'memory', en: ['Transcription Race', 'Hear a phrase, write it on the keys — fast and right.'], he: ['מרוץ התמלול', 'שומעים משפט, כותבים אותו על הקלידים — מהר ונכון.'] },
  { id: 'bhtime', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Barry Harris in Time', 'Play 8th-note lines over the changes — measured.'], he: ['בארי האריס בזמן', 'מנגנים קווי שמיניות מעל המהלך — במדידה.'] },
  { id: 'riffecho', hue: 'var(--hue-time)', cat: 'rhythm', en: ['Odd-Meter Riff Echo', 'Hear a riff in 5, 7 or 11 — play it back.'], he: ['הד ריפים במשקל אי־זוגי', 'שומעים ריף ב־5, 7 או 11 — מנגנים אותו בחזרה.'] },
  { id: 'polylock', hue: 'var(--hue-time)', cat: 'rhythm', en: ['Polyrhythm Lock', 'Two hands, two pulses: 3 against 2 up to 7 against 4.'], he: ['נעילת פולי־ריתם', 'שתי ידיים, שתי פעימות: 3 נגד 2 ועד 7 נגד 4.'] },
  // Drum games P1 (DRUMS_NICHE_PLAN §3): only in the drums course (COURSE_GAMES).
  { id: 'land', hue: 'var(--hue-time)', cat: 'instrument', en: ['Land It', 'A fill is called one bar ahead — play it, land crash + kick on 1.'], he: ['לנחות על 1', 'מעבר נקרא תיבה מראש — נגנו אותו ונחתו בקראש + קיק על 1.'] },
  { id: 'groove-echo', hue: 'var(--hue-time)', cat: 'rhythm', en: ['Groove Echo', 'Hear a groove, play it back on the kit.'], he: ['הד לגרוב', 'שומעים גרוב ומנגנים אותו בחזרה על המערכת.'] },
  { id: 'odd-echo', hue: 'var(--hue-time)', cat: 'rhythm', en: ['Odd-meter Echo', 'One bar of 7/8 or 9/8 — 2+2+3 or 3+2+2? Play it back.'], he: ['הד במשקל מוזר', 'תיבה של 7/8 או 9/8 — 2+2+3 או 3+2+2? נגנו אותה בחזרה.'] },
  // DRUMS_NICHE_PLAN P2: one surface (a pad by microphone too).
  { id: 'time-lock', hue: 'var(--hue-time)', cat: 'rhythm', en: ['Time Lock', 'The click drops out for longer each round — keep the time.'], he: ['נעילת זמן', 'הקליק נעלם לזמן ארוך יותר בכל סבב — שמרו על הזמן.'] },
  { id: 'ghost-control', hue: 'var(--hue-time)', cat: 'instrument', en: ['Ghost Control', 'Accents, normal strokes and ghost notes — each in its band.'], he: ['שליטה ברפאים', 'הדגשות, מכות רגילות ותווי רפאים — כל אחת בעוצמה שלה.'] },
  { id: 'rudiment-rush', hue: 'var(--hue-time)', cat: 'instrument', en: ['Rudiment Rush', 'Two clean bars of a rudiment — faster after every pass.'], he: ['מרוץ רודימנטים', 'שתי תיבות נקיות של רודימנט — מהר יותר אחרי כל מעבר.'] },
  { id: 'groove-off', hue: 'var(--hue-time)', cat: 'social', en: ['Groove-off', 'The same three grooves for you and a friend — measured, at your own time.'], he: ['קרב גרובים', 'אותם שלושה גרובים לכם ולחבר — במדידה, כל אחד בזמנו.'] },
  // 0.76: instrument, voice and drum games (GAMES_TIERS_PLAN §3), measured by MIDI or the microphone.
  { id: 'playback', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Play It Back', 'Hear a phrase, play it back on your instrument.'], he: ['לנגן בחזרה', 'שומעים משפט ומנגנים אותו בחזרה על הכלי שלכם.'] },
  { id: 'voicingsprint', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Voicing Sprint', 'A chord symbol appears — play the voicing. 60 seconds.'], he: ['ספרינט וויסינגים', 'מופיע סימן אקורד — מנגנים את הוויסינג. 60 שניות.'] },
  { id: 'changerace', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Chord Change Race', 'Strum each chord right on its beat.'], he: ['מרוץ החלפות אקורדים', 'פורטים כל אקורד בדיוק על הפעמה שלו.'] },
  { id: 'walkchanges', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Walk the Changes', 'Walk quarter notes over the chart — chord tones on 1 and 3.'], he: ['ללכת על המהלך', 'קו רבעים מעל המהלך — צלילי אקורד ב־1 וב־3.'] },
  { id: 'rootsear', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Roots by Ear', 'Hear the chords, play their roots.'], he: ['שורשים מהאוזן', 'שומעים את האקורדים ומנגנים את השורשים.'] },
  { id: 'harmonyhold', hue: 'var(--hue-voice)', cat: 'voice', en: ['Harmony Hold', 'Sing a chord tone while the chords move.'], he: ['להחזיק הרמוניה', 'שרים צליל של האקורד בזמן שהאקורדים זזים.'] },
  { id: 'singinterval', hue: 'var(--hue-voice)', cat: 'voice', en: ['Interval Sing', 'A note and an interval — sing the other note.'], he: ['ספרינט שירה', 'צליל ומרווח — שרים את הצליל השני.'] },
  { id: 'kitread', hue: 'var(--hue-reading)', cat: 'read', en: ['Kit Read Rush', 'Hear one bar, pick the written bar — fast.'], he: ['מרוץ קריאת תופים', 'שומעים תיבה ובוחרים את התיבה הכתובה — מהר.'] },
  { id: 'namegroove', hue: 'var(--hue-time)', cat: 'rhythm', en: ['Name That Groove', 'Hear a groove, name its style — 10 rounds.'], he: ['זהו את הגרוב', 'שומעים גרוב ומזהים את הסגנון — 10 סיבובים.'] },
  // AUDIT-GAMES §4.2 new games (2026-11-15).
  { id: 'bordercontrol', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Border Control', 'A key change by ear: stamp how it crossed and where it landed.'], he: ['ביקורת גבולות', 'מעבר סולם בשמיעה: חותמים איך עבר ולאן הגיע.'] },
  { id: 'whichbrother', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Which Brother?', 'The family of dominants: hear which one resolves, then play it.'], he: ['איזה אח?', 'משפחת הדומיננטות: שומעים איזה מהם נפתר, ואז מנגנים אותו.'] },
  { id: 'runcatcher', hue: 'var(--hue-voice)', cat: 'voice', en: ['Run Catcher', 'Hear a run, sing it back in time — faster after every clean catch.'], he: ['תופסים ראן', 'שומעים ראן ושרים אותו בחזרה בזמן — מהר יותר אחרי כל תפיסה נקייה.'] },
  { id: 'compcaller', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Comp Caller', 'Comp the called rhythm on the changes, switched on the bar.'], he: ['קורא הליווי', 'מלווים במקצב שנקרא על המהלך, ומחליפים על התיבה.'] },
  { id: 'elevator', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Elevator', 'Echols’s floors on the 6-dim scale: build the voicing, then play it.'], he: ['המעלית', 'הקומות של אקולס בסולם 6־דים: בונים את הוויסינג ומנגנים אותו.'] },
  // AUDIT-GAMES §4.2 new games.
  { id: 'guidetone', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Guide-Tone Runner', 'A 3rd or 7th on every change, in time. One miss ends the run.'], he: ['רץ הצלילים המנחים', 'טרצה או ספטימה על כל החלפה, בזמן. החטאה אחת מסיימת.'] },
  { id: 'call5432', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['5-4-3-2 Call', 'A number is called: play that Barry Harris phrase.'], he: ['קריאת 5-4-3-2', 'נקרא מספר: מנגנים את המשפט של בארי האריס.'] },
  { id: 'enclosure', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Enclosure Target', 'Enclose the chord tone, land it on the beat.'], he: ['מטרת הכיתור', 'מכתרים את צליל האקורד ונוחתים עליו בפעמה.'] },
  { id: 'crossword', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Changes Crossword', 'Hear the bars, fill root, quality and bass.'], he: ['תשבץ המהלכים', 'שומעים את התיבות וממלאים שורש, סוג ובס.'] },
  { id: 'holdnote', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Hold the Note', 'One note, many chords: which keep it? Fast.'], he: ['להחזיק את הצליל', 'צליל אחד, הרבה אקורדים: מי שומר עליו? מהר.'] },
  // AUDIT-7 hole #14: the beginner game per instrument.
  { id: 'staffrunner', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Staff Runner', 'Read the note at the marker, play it on its beat.'], he: ['רץ החמשה', 'קוראים את התו שבסמן ומנגנים אותו על הפעמה.'] },
  { id: 'rootcatch', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Root Catcher', 'Each chord’s root on beat 1, as the chords change.'], he: ['תופס השורשים', 'השורש של כל אקורד בפעמה 1, כשהאקורדים מתחלפים.'] },
  { id: 'strumchange', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Strum Changes', 'Strum the new chord right on beat 1.'], he: ['החלפות בפריטה', 'פורטים את האקורד החדש בדיוק בפעמה 1.'] },
  { id: 'rebound', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Rebound Ball', 'Even strokes on the click: every bounce the same height.'], he: ['הכדור הקופץ', 'מכות אחידות על הקליק: כל קפיצה באותו גובה.'] },
  { id: 'singback', hue: 'var(--hue-voice)', cat: 'voice', en: ['Sing It Back', 'Hear a short phrase, sing it back in the next bar.'], he: ['שרים בחזרה', 'שומעים משפט קצר ושרים אותו בחזרה בתיבה הבאה.'] },
  // HARMONY-REHARM still-open games.
  { id: 'thirdjump', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Third Jump', 'Jump a 3rd to the chord that keeps the glowing note.'], he: ['קפיצת טרצה', 'קופצים טרצה לאקורד ששומר על הצליל הזוהר.'] },
  { id: 'darkside', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Dark Side', 'Tap the borrowed chord the moment it comes, then name it.'], he: ['הצד האפל', 'מקישים על האקורד השאול ברגע שהוא מגיע, ונותנים לו שם.'] },
  // Triad pairs, deep.
  // Owner 2026-11-19: Euclidean rhythms on a circle.
  { id: 'euclid', hue: 'var(--hue-time)', cat: 'rhythm', en: ['Euclid', 'A circle of pulses loops: set the hits to match the rhythm, then tap it back.'], he: ['אוקלידס', 'מעגל של משבצות מסתובב: מסמנים את המכות לפי המקצב, ואז מקישים אותו בחזרה.'] },
  { id: 'whichpair', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Which Pair?', 'A chord sounds: pick, or play, the triad pair that fits it.'], he: ['איזה זוג?', 'אקורד נשמע: בוחרים, או מנגנים, את זוג המשולשים שמתאים לו.'] },
  // Negative harmony.
  { id: 'mirror', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Mirror', 'Tap the mirror of a note or chord around the key’s axis — fast.'], he: ['מראה', 'מקישים על ההשתקפות של צליל או אקורד סביב הציר — מהר.'] },
  // Symmetry unit.
  { id: 'tonnetz', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Tonnetz', 'Walk the triad grid with P, L, R to the target in the fewest moves.'], he: ['טונץ', 'הולכים ברשת המשולשים, צליל אחד זז בכל מהלך, אל היעד בכמה שפחות מהלכים.'] },
];

/** Practice tab hub (owner 2026-11-08): songs, technique and singing get their own place above the games, with the tools. */
export interface PracticeHub {
  songs: () => void;
  /** Repertoire (SPEC-REPERTOIRE): the road from simple tunes to standards, per course. */
  repertoire?: () => void;
  /** SPEC-JAZZ-FOLD: the jazz standards (the old Jazz course's repertoire) in Ear, while the jazz pack is open. */
  standards?: () => void;
  drills: () => void;
  /** Voice course (0.61): vocal technique and sing-along take the technique / songs rows. */
  vocal?: () => void;
  singalong?: () => void;
  lessons: () => void;
  tuner: () => void;
  metronome: () => void;
  drone: () => void;
  /** Log practice done away from the app (SPEC-0.48 §P1). */
  log?: () => void;
  /** My charts: typed chord charts with backing tracks (SPEC-0.48 §P2). */
  charts?: () => void;
  /** Slow down & loop your own audio (SPEC-0.48 §P3). */
  slowdown?: () => void;
  groove?: () => void;
  improv?: () => void;
  /** Licks in 12 keys and the transcription coach (SPEC-LICKS-TRANSCRIPTION). */
  licks?: () => void;
  /** Encore (SPEC-PHRASE-STUDIO): keep a phrase, make it yours in 12 keys. */
  encore?: () => void;
  /** Chord finder (guitar course, GUITAR_DEEPENING §6.3): strum → name, name → shapes. */
  chordfinder?: () => void;
  /** Chord & cadence builder (keys and guitar courses). */
  chordbuilder?: () => void;
  transcribe?: () => void;
  puzzle?: () => void;
  exams?: () => void;
  pieces?: () => void;
  mixer?: () => void;
  /** SPEC-MY-SONG: practise over your own recording, measured with the course's own machinery. */
  mysong?: () => void;
}
/** Practice-page cards and tools in the Paper language: each hub row → its glyph (a chrome note when a glyph is missing). */
const HUB_ART: Record<string, string> = {
  encore: 'encore', repertoire: 'repstep', standards: 'repstep', songs: 'songstrum', drills: 'scales', lessons: 'book', tuner: 'tune', metronome: 'tempo', drone: 'drone',
  slowdown: 'slow', licks: 'lick', transcribe: 'transcribe', improv: 'improv', puzzle: 'puzzle', exams: 'features', groove: 'groove', charts: 'roadmap',
  log: 'log', pieces: 'kclassic', chordfinder: 'chordbox', chordbuilder: 'keychord', mixer: 'mixer', mysong: 'record', games: 'games',
};
const HubIcon = ({ k, size = 22 }: { k: string; size?: number }) =>
  PAPER[HUB_ART[k]] ? (
    <PaperSvg art={PAPER[HUB_ART[k]]} cut={size <= 24 ? 'small' : 'full'} width={size} className="hub-pp" />
  ) : (
    <Icon k="quaver" size={size} />
  );
const HUB_TX = {
  songs: { en: ['Songs', 'Play and sing real songs'], he: ['שירים', 'לנגן ולשיר שירים אמיתיים'] },
  drills: { en: ['Technique', 'Your instrument and your voice'], he: ['טכניקה', 'הכלי שלכם והקול שלכם'] },
  lessons: { en: ['Lessons', 'Short theory lessons by topic'], he: ['שיעורים', 'שיעורי תיאוריה קצרים לפי נושא'] },
  tools: { en: 'Tools', he: 'כלים' },
  tuner: { en: 'Tuner', he: 'טיונר' },
  metronome: { en: 'Metronome', he: 'מטרונום' },
  drone: { en: 'Drone', he: 'צליל רקע' },
  log: { en: 'Log', he: 'רישום' },
  charts: { en: 'Charts', he: 'מהלכים' },
  slowdown: { en: 'Slow down', he: 'האטה' },
  groove: { en: 'Groove', he: 'גרוב' },
  improv: { en: 'Improvise', he: 'אלתור' },
  licks: { en: 'Licks', he: 'ליקים' },
  encore: { en: 'Encore', he: 'הדרן' },
  transcribe: { en: 'Transcribe', he: 'תמלול' },
  puzzle: { en: 'Daily progression', he: 'מהלך היום' },
  exams: { en: 'Programs & exams', he: 'תכניות לימוד ומבחנים' },
  pieces: { en: 'My pieces', he: 'היצירות שלי' },
  mixer: { en: 'Mixer', he: 'מיקסר' },
  chordfinder: { en: 'Chord finder', he: 'מאתר אקורדים' },
  chordbuilder: { en: 'Chord builder', he: 'בונה אקורדים' },
  games: { en: ['Games', 'By type, topic and level'], he: ['משחקים', 'לפי סוג, נושא ורמה'] },
};

/** The Practice page (SPEC-IA-2, owner 2026-11-09): four groups by what you do — play, train, study — and the tools. */
export const PRACTICE_GROUPS: { id: 'play' | 'train' | 'study'; name: { en: string; he: string }; items: string[] }[] = [
  { id: 'play', name: { en: 'Play', he: 'לנגן' }, items: ['repertoire', 'standards', 'songs', 'pieces', 'charts', 'mysong'] },
  { id: 'train', name: { en: 'Train', he: 'להתאמן' }, items: ['encore', 'drills', 'improv', 'licks', 'transcribe', 'games'] },
  { id: 'study', name: { en: 'Study', he: 'ללמוד' }, items: ['lessons', 'exams', 'puzzle'] },
];
/** An instrument course's own words on shared game cards (the shared text is the piano's: Hanon, Barry Harris, MIDI). */
const COURSE_BLURB: Partial<Record<CourseId, Record<string, { en: string; he: string }>>> = {
  guitar: { drills: { en: 'Scales, chords, picking and legato — measured on your guitar.', he: 'סולמות, אקורדים, פריטה ולגאטו — נמדדים בגיטרה שלכם.' } },
  bass: { drills: { en: 'Grooves, scales and walking lines — measured on your bass.', he: 'גרובים, סולמות וקווי הליכה — נמדדים בבס שלכם.' } },
};
/** The drums course's own words on shared game cards. */
const DRUMS_BLURB: Record<string, { en: string; he: string }> = {
  drills: { en: 'Strokes, rudiments, grooves and fills — measured on your kit.', he: 'מכות, רודימנטים, גרובים ומעברים — נמדדים על המערכת שלכם.' },
  highway: { en: 'Kit lanes: hi-hat, snare, kick, tom, cymbal.', he: 'מסלולים של מערכת: היי־האט, סנר, קיק, טום, מצילה.' },
};
/** The bass course's own words on shared game cards and rows (final bass check). */
const BASS_BLURB: Record<string, { en: string; he: string }> = {
  drills: { en: 'Plucking, groove, walking and reading — measured on your bass.', he: 'פריטה, גרוב, בס מהלך וקריאה — נמדדים על הבס שלכם.' },
  'rush-fretboard': { en: 'Find the note on the bass neck — 60 seconds.', he: 'מצאו את התו על צוואר הבס — 60 שניות.' },
  'rush-note': { en: 'Read bass-clef notes as fast as you can.', he: 'קראו תווים במפתח פה הכי מהר שאפשר.' },
  tuneup: { en: 'Tune the four bass strings by ear.', he: 'מכוונים את ארבעת מיתרי הבס בשמיעה.' },
};
const BASS_TX: Record<string, { en: [string, string]; he: [string, string] }> = {
  drills: { en: ['Technique', 'Plucking, groove, walking, reading'], he: ['טכניקה', 'פריטה, גרוב, בס מהלך וקריאה'] },
  songs: { en: ['Songs', 'Real tunes on the bass'], he: ['שירים', 'מנגינות אמיתיות על הבס'] },
};
/** The keys course's own words on its rows (PIANO_AUDIT I7: "your instrument" and "play and sing" were generic). */
const KEYS_TX: Record<string, { en: [string, string]; he: [string, string] }> = {
  drills: { en: ['Technique', 'Scales, chords, the ear — measured on the keys'], he: ['טכניקה', 'סולמות, אקורדים ושמיעה — במדידה על הקלידים'] },
  songs: { en: ['Songs', 'Real tunes on the keys, by their chords'], he: ['שירים', 'מנגינות אמיתיות על הקלידים, לפי האקורדים'] },
};
/** The instrument tile's symbol per course. */
const INSTRUMENT_TILE: Partial<Record<CourseId, GlyphKind>> = { drums: 'drums', bass: 'bass', guitar: 'guitar' };
/** The weekly puzzle and the live quiz rooms are ear & theory things. */
const COURSE_SOCIAL: CourseId[] = ['ear'];
/** Practice tiles (0.63): a colour per row, and the game kinds each course shows as their own tiles. */
const TILE_COLOR: Record<string, string> = { repertoire: '#12C9B4', standards: '#6D28D9', lessons: '#FF8A3D', puzzle: '#A78BFA', drills: '#FFD43B', songs: '#12C9B4', pieces: '#FF5FA2', charts: '#A78BFA', improv: '#6D28D9', exams: '#FF8A3D', licks: '#A78BFA', encore: '#6D28D9', transcribe: '#3AB8FF', mysong: '#FF8A3D' };
const COURSE_TILE_CATS: Partial<Record<CourseId, GameCat[]>> = { ear: ['ear', 'rhythm', 'memory', 'read'], voice: ['voice'], keys: ['instrument'], guitar: ['instrument'], bass: ['instrument'], drums: ['instrument', 'rhythm'] };
const CAT_GLYPH: Record<GameCat, GlyphKind> = { ear: 'intervals', rhythm: 'rhythm', memory: 'memory', read: 'sight', voice: 'sing', instrument: 'keys', social: 'duel' };
/** The games list opens on the course's own category. */
export const COURSE_GAME_CAT: Record<CourseId, GameCat> = { ear: 'ear', voice: 'voice', keys: 'instrument', guitar: 'instrument', bass: 'instrument', drums: 'instrument' };
const VOICE_TX: Record<string, { en: [string, string]; he: [string, string] }> = {
  drills: { en: ['Vocal technique', 'Range, breath, long tones, agility'], he: ['טכניקה קולית', 'מנעד, נשימה, צליל ארוך, גמישות'] },
  songs: { en: ['Sing along', 'Real songs in your key, with a guide voice'], he: ['שירה עם שירים', 'שירים אמיתיים בטונליות שלך, עם קול מוביל'] },
};
/** The drums course's own words on its rows (DRUMS_AUDIT I10). */
const DRUMS_TX: Record<string, { en: [string, string]; he: [string, string] }> = {
  drills: { en: ['Technique', 'Rudiments, grooves, fills'], he: ['טכניקה', 'רודימנטים, גרובים, מעברים'] },
  games: { en: ['Games', 'Rhythm games and the kit Highway'], he: ['משחקים', 'משחקי קצב והייווי למערכת'] },
};
/** Technique in an instrument course: the instrument only ("and your voice" is the voice course's). */
const INSTR_DRILLS_TX: { en: [string, string]; he: [string, string] } = { en: ['Technique', 'Your instrument, level by level — measured'], he: ['טכניקה', 'הכלי שלכם, שלב אחר שלב — במדידה'] };
const ROW_TX: Record<string, { en: [string, string]; he: [string, string] }> = {
  repertoire: { en: ['Repertoire', 'From simple tunes to standards'], he: ['רפרטואר', 'ממנגינות פשוטות לסטנדרטים'] },
  // SPEC-JAZZ-FOLD: the old Jazz course's repertoire, an Ear collection while the jazz pack is open.
  standards: { en: ['Jazz standards', 'The blues, ii–V–I and the standards'], he: ['סטנדרטים של ג׳אז', 'בלוז, ii–V–I והסטנדרטים'] },
  songs: { en: ['Songs', 'Play and sing real songs — by the chords you know'], he: ['שירים', 'לנגן ולשיר שירים אמיתיים — לפי האקורדים שאתם מכירים'] },
  pieces: { en: ['My pieces', 'Bring a score; the coach takes you to tempo'], he: ['היצירות שלי', 'מעלים תווים; המאמן מביא אתכם לטמפו'] },
  charts: { en: ['Charts & lead sheets', 'Backing tracks, standards, import a lead sheet'], he: ['מהלכים ודפי אקורדים', 'ליווי, סטנדרטים, ייבוא דף אקורדים'] },
  drills: { en: ['Technique', 'Your instrument and your voice, level by level'], he: ['טכניקה', 'הכלי שלכם והקול שלכם, שלב אחר שלב'] },
  improv: { en: ['Improvise', 'Under rules, phrasing, trading fours'], he: ['אלתור', 'עם כללים, פרייזינג, חילופי ארבע'] },
  licks: { en: ['Licks', 'Vocabulary in 12 keys, measured — then use it'], he: ['ליקים', 'אוצר מילים ב-12 סולמות, במדידה — ואז להשתמש'] },
  encore: { en: ['Encore — my phrases', 'Keep what you played, make it yours in 12 keys'], he: ['הדרן — המשפטים שלי', 'מה שניגנתם — שלכם, ב-12 סולמות'] },
  transcribe: { en: ['Transcribe', 'Hear it, play it back, write it, 12 keys'], he: ['תמלול', 'לשמוע, לנגן בחזרה, לכתוב, 12 סולמות'] },
  games: { en: ['Games', 'Ear, rhythm and memory games'], he: ['משחקים', 'משחקי שמיעה, קצב וזיכרון'] },
  lessons: { en: ['Lessons', 'Short theory lessons by topic'], he: ['שיעורים', 'שיעורי תיאוריה קצרים לפי נושא'] },
  exams: { en: ['Programs & exams', 'Bagrut and conservatory entrance, section by section'], he: ['תכניות לימוד ומבחנים', 'בגרות ומבחני כניסה לקונסרבטוריון, חלק אחר חלק'] },
  puzzle: { en: ['Progression of the day', 'One daily puzzle to solve and share'], he: ['מהלך היום', 'חידה יומית לפתור ולשתף'] },
};

/** The My song tile's words per course (SPEC-MY-SONG). */
const mySongTx = (c: CourseId): { en: [string, string]; he: [string, string] } => {
  const b = MS_TILE[c === 'drums' ? 'drums' : c === 'ear' ? 'ear' : c === 'voice' ? 'voice' : 'play'];
  return { en: ['My song', b.en], he: ['השיר שלי', b.he] };
};

/** Each game's note-head symbol and its category colour (0.61, SPEC-REDESIGN: no emoji). */
export const GAME_GLYPH: Record<string, GlyphKind> = {
  melody: 'echo', rhythm: 'rhythm', truefalse: 'theory', ghost: 'ghost', duel: 'duel', daily: 'calendar', 'rush-chord': 'chords', 'rush-note': 'sight', 'rush-keysig': 'theory', 'rush-interval': 'intervals',
  'rush-progression': 'prog', 'rush-fretboard': 'guitar', peakhunter: 'eq', highway: 'rhythm', flight: 'sing', melodypuzzle: 'puzzle', nametune: 'name', drills: 'scales', tuneup: 'tune', pitchmemory: 'memory', groove: 'groove',
  'rush-voicing': 'voicingspy', reharm: 'reharm', 'rush-standard': 'standard', 'rush-scale': 'scalerush', transcribe: 'transcribe', bhtime: 'bhtime', riffecho: 'riff', polylock: 'polylock',
  'rudiment-rush': 'rudrush', 'groove-off': 'grooveoff', land: 'landit', 'groove-echo': 'grooveecho', 'odd-echo': 'oddecho', 'time-lock': 'timelock', 'ghost-control': 'ghostctl',
  playback: 'playback', voicingsprint: 'vsprint', changerace: 'changerace', walkchanges: 'walkchanges', rootsear: 'rootsear', harmonyhold: 'harmonyhold', singinterval: 'singinterval', kitread: 'kitread', namegroove: 'namegroove',
  // AUDIT-GAMES §4.2 new games (2026-11-15).
  bordercontrol: 'bordercontrol', whichbrother: 'whichbrother', runcatcher: 'runcatcher', compcaller: 'compcaller', elevator: 'elevator',
  guidetone: 'guidetone', call5432: 'call5432', enclosure: 'enclosure', crossword: 'crossword', holdnote: 'holdnote',
  staffrunner: 'staffrunner', rootcatch: 'rootcatch', strumchange: 'strumchange', rebound: 'rebound', singback: 'singback',
  thirdjump: 'thirdjump', darkside: 'darkside', whichpair: 'whichpair', euclid: 'euclid', mirror: 'mirror',
};
const CAT_COLOR: Record<string, string> = { ear: DOMAIN_COLOR.ear, rhythm: DOMAIN_COLOR.rhythm, memory: DOMAIN_COLOR.harmony, read: DOMAIN_COLOR.theory, voice: DOMAIN_COLOR.voice, instrument: DOMAIN_COLOR.play, social: '#EDE6F7' };

export function PlayScreen({ t, progress, onGame, onTrueFalse, onDuel, onOnline, onGhost, onDaily, onPuzzle, onGame2, onBoard, lang = 'en', hub, status }: { onBoard?: () => void; status?: Partial<Record<string, string>>; t: Strings; progress: Progress; onGame: (k: GameKind) => void; onTrueFalse: () => void; onDuel: () => void; onOnline: () => void; onGhost: () => void; onDaily: () => void; onPuzzle: () => void; onGame2?: (id: (typeof GAMES2)[number]['id']) => void; lang?: 'he' | 'en'; hub?: PracticeHub }) {
  const { active: course, examPrep, setExamPrep, jazzOn, jazzFocus, setJazzFocus } = useCourse();
  const rows = courseRows(course, examPrep, jazzFocus ? 'focus' : jazzOn ? 'on' : 'off');
  // SPEC-JAZZ-FOLD: the jazz games only while the jazz pack is open in the course.
  const gamesHere = courseGames(course, jazzOn);
  // Status of the weekly puzzle and the daily challenge (moved here from the old Home tools, 0.41).
  const daily = progress.daily?.[localDay(new Date())];
  const pz = progress.puzzles?.[weekId(new Date())];
  const puzzleStatus = !pz ? t.puzzleNew : pz.medal === 'gold' ? t.puzzleGold : pz.medal === 'silver' ? t.puzzleSilver : t.puzzleTried;
  const best = (n: number | undefined) => (n ? <span className="best-chip">{t.personalBest}: {n}</span> : null);
  // Practice tab (owner 2026-11-08): the hub first; "Games" opens the games list (kept while you play a game and come back).
  const [games, setGames] = useState<boolean>(() => {
    try {
      return !hub || sessionStorage.getItem('toneturn.practice') === 'games';
    } catch {
      return !hub;
    }
  });
  const showGames = (on: boolean) => {
    setGames(on);
    try {
      sessionStorage.setItem('toneturn.practice', on ? 'games' : 'hub');
    } catch {
      /* fine */
    }
  };
  const [cat, setCat] = useState<GameCat | 'all'>(() => {
    try {
      return (sessionStorage.getItem('toneturn.playcat') as GameCat | 'all' | null) ?? COURSE_GAME_CAT[course];
    } catch {
      return COURSE_GAME_CAT[course];
    }
  });
  const pickCat = (c: GameCat | 'all') => {
    setCat(c);
    try {
      sessionStorage.setItem('toneturn.playcat', c);
    } catch {
      /* ignore */
    }
  };
  const CAT_OF: Record<string, GameCat> = { melody: 'memory', rhythm: 'rhythm', truefalse: 'read', ghost: 'social', duel: 'social', daily: 'social' };
  // "Your level · next" on every game card (GAMES_TIERS_PLAN §2.2); social sets use the course level instead.
  const { mine } = useCourse();
  const ratingsNow = ratingsOf(progress);
  const tierChip = (key: string) => {
    if (!tierSpec(key) || key === 'duel' || key === 'daily' || key === 'ghost') return null;
    const st = progress.gameTiers?.[tierKey(key)];
    const c = tierCard(tierInfo(key, ratingsNow, st, course, mine), st);
    return <TierBadge lang={lang} tier={c.tier} next={c.next} into={c.into} isNew={c.isNew} />;
  };
  const cards: { key: string; hue: string; title: string; blurb: string; extra?: React.ReactNode; onClick: () => void; cat?: GameCat }[] = [
    { key: 'melody', hue: 'var(--hue-memory)', title: t.echoChain, blurb: t.echoChainBlurb, extra: best(progress.games?.melody), onClick: () => onGame('melody') },
    { key: 'rhythm', hue: 'var(--hue-time)', title: t.beatEcho, blurb: t.beatEchoBlurb, extra: best(progress.games?.rhythm), onClick: () => onGame('rhythm') },
    { key: 'truefalse', hue: 'var(--hue-pitch)', title: t.trueFalse, blurb: t.tfBlurb, extra: progress.tfBest && Object.keys(progress.tfBest).length ? best(Math.max(...Object.values(progress.tfBest))) : <span className="new-chip">{t.newChip}</span>, onClick: onTrueFalse },
    { key: 'ghost', hue: 'var(--hue-creative)', title: t.ghostRace, blurb: t.ghostBlurb, onClick: onGhost },
    ...(onGame2 ? GAMES2.map((g) => ({ key: g.id, cat: g.cat, hue: g.hue, title: g[lang][0], blurb: course === 'drums' && DRUMS_BLURB[g.id] ? DRUMS_BLURB[g.id][lang] : course === 'bass' && BASS_BLURB[g.id] ? BASS_BLURB[g.id][lang] : (COURSE_BLURB[course]?.[g.id]?.[lang] ?? g[lang][1]), extra: progress.bests?.[g.id] ? best(progress.bests[g.id]) : <span className="new-chip">{t.newChip}</span>, onClick: () => onGame2(g.id) })) : []),
    // The groove trainer (fading click, pocket, swing) is a drums-course game too (0.65).
    ...(hub?.groove ? [{ key: 'groove', cat: 'rhythm' as GameCat, hue: 'var(--hue-time)', title: lang === 'he' ? 'מאמן הגרוב' : 'Groove trainer', blurb: lang === 'he' ? 'קליק שנעלם, כיס וסווינג — האם הזמן נשאר שלכם?' : 'A fading click, the pocket, swing — does the time stay yours?', onClick: hub.groove }] : []),
    { key: 'duel', hue: 'var(--hue-voice)', title: t.duel, blurb: t.duelBlurb, onClick: onDuel },
    { key: 'daily', hue: 'var(--hue-reading)', title: t.dailyChallenge, blurb: daily ? `✓ ${t.dailyDone} · ${daily.points.toLocaleString()} ${t.points}` : t.dailyBlurb, onClick: onDaily },
  ].filter((c) => gamesHere.includes(c.key));
  // A category remembered from another course that has no games here shows them all.
  const catNow: GameCat | 'all' = cat !== 'all' && !cards.some((x) => (x.cat ?? CAT_OF[x.key] ?? 'social') === cat) ? 'all' : cat;
  return (
    <main className="play-screen">
      {hub && games ? (
        <header className="screen-head">
          <button className="icon-btn" onClick={() => showGames(false)} aria-label={t.back}>
            <Icon k="back" />
          </button>
          <h1>{HUB_TX.games[lang][0]}</h1>
          {onBoard && (
            <button className="icon-btn" onClick={onBoard} aria-label={lang === 'he' ? 'לוח המשחקים' : 'Game board'} title={lang === 'he' ? 'לוח המשחקים' : 'Game board'} data-open-board>
              <Glyph kind="board" color="#EDE6F7" size={30} />
            </button>
          )}
        </header>
      ) : (
        <>
          <div className="pt-title-row">
            <h1 className="screen-title">{t.playTitle}</h1>
            {/* SPEC-PHRASE-STUDIO §17: My recordings, one tap from Practice. */}
            {hub && (
              <a className="icon-btn small pt-rec" href="#/recordings" aria-label={lang === 'he' ? 'ההקלטות שלי' : 'My recordings'} title={lang === 'he' ? 'ההקלטות שלי' : 'My recordings'} data-open-recordings="practice">
                <RIcon k="voice" />
              </a>
            )}
          </div>
          {!hub && <p className="field-hint">{t.playHint}</p>}
          {hub && course !== 'drums' && (
            <div className="exam-head-row">
              {course === 'ear' && <ExamPrepSwitch on={examPrep} lang={lang} onChange={setExamPrep} />}
              <JazzFocusSwitch on={jazzFocus} lang={lang} onChange={setJazzFocus} />
            </div>
          )}
        </>
      )}
      {hub && !games && (
        <section className="practice-hub v2-tiles" data-practice-hub="1">
          {/* 0.63 (design board PhonePractice): big colour tiles — the course's own rows, and its games split by kind —
              then the tools as round buttons. */}
          <div className="pt-grid">
            {rows
              .filter((k) => k !== 'games' && hub[k as keyof PracticeHub])
              .map((k) => {
                const tx = (k === 'mysong' ? mySongTx(course) : course === 'voice' && VOICE_TX[k] ? VOICE_TX[k] : course === 'drums' && DRUMS_TX[k] ? DRUMS_TX[k] : course === 'bass' && BASS_TX[k] ? BASS_TX[k] : course === 'keys' && KEYS_TX[k] ? KEYS_TX[k] : k === 'drills' && (course === 'keys' || course === 'guitar' || course === 'bass') ? INSTR_DRILLS_TX : ROW_TX[k])[lang];
                return (
                  <button
                    key={k}
                    className="pt-tile"
                    style={{ ['--tile' as string]: TILE_COLOR[k] ?? '#A78BFA' }}
                    onClick={course === 'voice' && k === 'drills' && hub.vocal ? hub.vocal : course === 'voice' && k === 'songs' && hub.singalong ? hub.singalong : (hub[k as keyof PracticeHub] as () => void)}
                    data-hub={k}
                  >
                    <span className="pt-icon">
                      <HubIcon k={k} size={34} />
                    </span>
                    <b>{tx[0]}</b>
                    <small>{status?.[k] ?? tx[1]}</small>
                  </button>
                );
              })}
            {rows.includes('games') &&
              (COURSE_TILE_CATS[course] ?? []).map((c) => {
                const gc = GAME_CATS.find((x) => x.id === c)!;
                return (
                  <button
                    key={c}
                    className="pt-tile"
                    style={{ ['--tile' as string]: CAT_COLOR[c] }}
                    onClick={() => {
                      pickCat(c);
                      showGames(true);
                    }}
                    data-hub-cat={c}
                  >
                    <span className="pt-icon">
                      <Glyph kind={c === 'instrument' && INSTRUMENT_TILE[course] ? INSTRUMENT_TILE[course]! : CAT_GLYPH[c]} color="#FFFFFF" size={44} />
                    </span>
                    <b>{gc[lang]}</b>
                    <small>{lang === 'he' ? 'משחקים ותרגילים' : 'Games and drills'}</small>
                  </button>
                );
              })}
            {rows.includes('games') && (
              <button className="pt-tile pt-all" style={{ ['--tile' as string]: '#FFFFFF' }} onClick={() => showGames(true)} data-hub="games">
                <span className="pt-icon">
                  <HubIcon k="games" size={34} />
                </span>
                <b>{ROW_TX.games[lang][0]}</b>
                <small>{lang === 'he' ? 'כל המשחקים' : 'All games'}</small>
              </button>
            )}
          </div>
          <section className="pt-tools" aria-label={HUB_TX.tools[lang]} data-hub-group="tools">
            <h2>{HUB_TX.tools[lang]}</h2>
            <div className="pt-tool-row">
              {(['tuner', 'chordfinder', 'chordbuilder', 'metronome', 'drone', 'groove', 'slowdown', 'mixer', 'log'] as const).filter((k) => hub[k] && !(course === 'drums' && (k === 'tuner' || k === 'drone'))).map((k) => (
                <button key={k} className="pt-tool" onClick={hub[k]} data-hub={k} aria-label={HUB_TX[k][lang]} title={HUB_TX[k][lang]}>
                  <HubIcon k={k} size={22} />
                  <small>{HUB_TX[k][lang]}</small>
                </button>
              ))}
            </div>
          </section>
        </section>
      )}
      {(!hub || games) && (
      <>
      {COURSE_SOCIAL.includes(course) && (
      <button className="play-hero plain" onClick={onPuzzle}>
        <span className="ph-icon" aria-hidden="true">
          <CatIcon k="puzzle" />
        </span>
        <span className="ph-text">
          <small>{puzzleStatus}</small>
          <b>{t.weeklyPuzzle}</b>
        </span>
        <span className="play-hero-go" aria-hidden="true">
          <Icon k="fwd" />
        </span>
      </button>
      )}
      <div className="play-cats" role="tablist" aria-label={lang === 'en' ? 'Game categories' : 'קטגוריות משחקים'}>
        <button role="tab" aria-selected={catNow === 'all'} className={`chip ${catNow === 'all' ? 'on' : ''}`} data-cat="all" onClick={() => pickCat('all')}>
          {lang === 'en' ? 'All' : 'הכול'}
        </button>
        {GAME_CATS.filter((c) => cards.some((x) => (x.cat ?? CAT_OF[x.key] ?? 'social') === c.id)).map((c) => (
          <button key={c.id} role="tab" aria-selected={catNow === c.id} className={`chip ${catNow === c.id ? 'on' : ''}`} data-cat={c.id} onClick={() => pickCat(c.id)}>
            {c[lang]}
          </button>
        ))}
      </div>
      {GAME_CATS.filter((c) => catNow === 'all' || catNow === c.id).map((gc) => {
        const list = cards.filter((c) => (c.cat ?? CAT_OF[c.key] ?? 'social') === gc.id);
        if (!list.length) return null;
        return (
          <section key={gc.id} className="play-section" aria-label={gc[lang]}>
            {catNow === 'all' && (
              <h2 className="play-cat-h">
                {gc[lang]}
              </h2>
            )}
            <div className="play-grid">
              {list.map((c) => (
                <button key={c.key} className={`play-card game-card ${c.key}`} style={{ ['--hue' as string]: c.hue }} onClick={c.onClick}>
                  <span className="pc-icon" aria-hidden="true">
                    <Glyph kind={course === 'drums' && c.key === 'drills' ? 'sticks' : course === 'bass' && c.key === 'drills' ? 'pluck' : course === 'bass' && c.key === 'rush-fretboard' ? 'fretboard' : (GAME_GLYPH[c.key] ?? 'contour')} color={CAT_COLOR[c.cat ?? CAT_OF[c.key] ?? 'social']} size={52} />
                  </span>
                  <b>{c.title}</b>
                  <small>{c.blurb}</small>
                  {c.extra}
                  {tierChip(c.key)}
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {COURSE_SOCIAL.includes(course) && (
      <button className="live-card" onClick={onOnline}>
        <span className="live-icon" aria-hidden="true">
          <span className="live-ping" />
          <Icon k="live" size={22} />
        </span>
        <span className="live-text">
          <b>{t.online}</b>
          <small>{t.onlineBlurb}</small>
        </span>
        <span className="live-go">{t.liveRoom}</span>
      </button>
      )}
      </>
      )}
    </main>
  );
}

/** The Play tab's category mark (only the daily puzzle is left): its Paper glyph. */
function CatIcon({ k }: { k: string }) {
  if (k === 'puzzle' && PAPER.puzzle) return <PaperSvg art={PAPER.puzzle} cut="small" width={24} />;
  return <Icon k="quaver" size={22} />;
}
