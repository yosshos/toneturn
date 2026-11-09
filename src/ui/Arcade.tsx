// 0.37 "night arcade" pieces (docs/ui-redesign.md): tab bar, level ring, what's-new gift, today's mission,
// domain tiles, the path as a winding road, and the Play hub.

import { DOMAIN_COLOR, Glyph, type GlyphKind } from './Glyph';
import { useCourse } from './courseContext';
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
import { GameIcon } from './Games';
import { RankCrest } from './Badges';
import { areaProgress, divFloor, divisionFor, MASTER_DIV, rankLabel, techniqueProgress, type RankProgress } from '../engine/ranks';
import { techniqueOf } from '../engine/rankBadges';
import type { GameKind } from '../game/memoryGame';

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

export function TabBar({ t, route, onGo, dot }: { t: Strings; route: TabId; onGo: (r: TabId) => void; /** Tabs that have something new. */ dot?: Partial<Record<TabId, boolean>> }) {
  const label: Record<TabId, string> = { home: t.tabHome, path: t.tabPath, skills: t.tabProgress, arcade: t.tabPlay, friends: t.tabFriends };
  return (
    <nav className="tabbar" aria-label={t.tabsLabel}>
      {TAB_ROUTES.map((r) => (
        <button key={r} className={`tab ${route === r ? 'on' : ''}`} aria-current={route === r ? 'page' : undefined} onClick={() => onGo(r)} data-tab={r}>
          <span className="tab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {TAB_ICONS[r]}
            </svg>
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
        {/* what is new: a plain line icon (0.52, mature language) */}
        <svg className="gift-icon" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="9" width="17" height="11.5" rx="2" />
          <path d="M2.5 9h19M12 9v11.5M12 9c-1.6-3.6-5.4-3.4-5-1 .3 1.6 3.4 1 5 1zM12 9c1.6-3.6 5.4-3.4 5-1-.3 1.6-3.4 1-5 1z" />
        </svg>
        {unseen && <span className="gift-dot" />}
      </button>
      {open && (
        <div className="gift-pop" role="dialog" aria-label={t.whatsNew}>
          <div className="gift-head">
            <b>{fill(t.newIn, { v: head.version })}</b>
            <button className="icon-btn small" aria-label={t.done} onClick={() => setOpen(false)}>
              ✕
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
              {t.allChanges} <span className="flip-rtl">→</span>
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
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" className="flip-rtl">
              <path d="M7 4.5 19 12 7 19.5z" fill="currentColor" />
            </svg>
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
  return (
    <section className="home-section domains" aria-label={t.domainsTitle}>
      <h2 className="home-h">{t.domainsTitle}</h2>
      <p className="field-hint">{t.domainsHint}</p>
      <div className="domain-grid">
        {DOMAINS.map((d) => {
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
            ✕
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
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
                        <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
                      </svg>
                    </button>
                  )}
                  <button className="icon-btn small as-play" onClick={() => onPractice(k)} aria-label={`${he ? 'לתרגל' : 'Play'}: ${t.skillNames[k]}`} title={he ? 'לתרגל' : 'Play'} data-play={k}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                      <path d="M7 4.5v15l13-7.5z" />
                    </svg>
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
                        {t.startLesson} <span className="flip-rtl">▶</span>
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
        const r = li.querySelector('.node-disc')!.getBoundingClientRect();
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
export const GAME_CATS: { id: GameCat; icon: string; en: string; he: string }[] = [
  { id: 'ear', icon: '👂', en: 'Ear & harmony', he: 'שמיעה והרמוניה' },
  { id: 'rhythm', icon: '🥁', en: 'Rhythm', he: 'קצב' },
  { id: 'memory', icon: '🧠', en: 'Memory', he: 'זיכרון' },
  { id: 'read', icon: '📖', en: 'Reading & theory', he: 'קריאה ותיאוריה' },
  { id: 'voice', icon: '🎤', en: 'Voice', he: 'קול' },
  { id: 'instrument', icon: '🎸', en: 'Instrument & sound', he: 'כלי וסאונד' },
  { id: 'social', icon: '⚔', en: 'Against others', he: 'מול אחרים' },
];
export const GAMES2: { id: 'drills' | 'highway' | 'flight' | 'melodypuzzle' | 'nametune' | 'tuneup' | 'pitchmemory' | 'rush-chord' | 'rush-note' | 'rush-fretboard' | 'rush-interval' | 'rush-keysig' | 'rush-progression' | 'peakhunter'; icon: string; hue: string; cat: GameCat; en: [string, string]; he: [string, string] }[] = [
  { id: 'rush-chord', icon: '🎹', hue: 'var(--hue-pitch)', cat: 'read', en: ['Chord Rush', 'Name chords on the neck, keys or staff — 60 seconds.'], he: ['מרוץ אקורדים', 'זהו אקורדים על הצוואר, הקלידים או החמשה — 60 שניות.'] },
  { id: 'rush-note', icon: '𝄞', hue: 'var(--hue-reading)', cat: 'read', en: ['Note Rush', 'Read notes off the staff as fast as you can.'], he: ['מרוץ תווים', 'קראו תווים מהחמשה הכי מהר שאפשר.'] },
  { id: 'rush-keysig', icon: '♯', hue: 'var(--hue-reading)', cat: 'read', en: ['Key Signature Rush', 'Sharps and flats → the key, fast.'], he: ['מרוץ סימני מפתח', 'דיאזים ובמולים → הסולם, מהר.'] },
  { id: 'rush-interval', icon: '↕', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Interval Sprint', 'Hear two notes, name the distance — beat the clock.'], he: ['ספרינט מרווחים', 'שומעים שני צלילים, קובעים את המרחק — נגד השעון.'] },
  { id: 'rush-progression', icon: '🕵', hue: 'var(--hue-pitch)', cat: 'ear', en: ['Progression Detective', 'Name the chords of what you hear. Three lives.'], he: ['בלש המהלכים', 'זהו את האקורדים של מה שאתם שומעים. שלושה חיים.'] },
  { id: 'rush-fretboard', icon: '🎸', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Fretboard Sprint', 'Find the note on the neck — 60 seconds.'], he: ['ספרינט צוואר', 'מצאו את התו על הצוואר — 60 שניות.'] },
  { id: 'peakhunter', icon: '🎛', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Peak Hunter', 'Find the boosted frequency.'], he: ['צייד הפיקים', 'מצאו את התדר שהוגבר.'] },
  { id: 'highway', icon: '🛣', hue: 'var(--hue-time)', cat: 'rhythm', en: ['Rhythm Highway', 'Tap the notes as they reach the line.'], he: ['כביש הקצב', 'הקישו על התווים כשהם מגיעים לקו.'] },
  { id: 'flight', icon: '🕊', hue: 'var(--hue-voice)', cat: 'voice', en: ['Voice Flight', 'Sing or play to fly through the gates.'], he: ['טיסת קול', 'שירו או נגנו כדי לעוף בין השערים.'] },
  { id: 'melodypuzzle', icon: '🧩', hue: 'var(--hue-memory)', cat: 'memory', en: ['Melody Puzzle', 'Put the notes of what you heard in order.'], he: ['פאזל מנגינה', 'סדרו את התווים של מה ששמעתם.'] },
  { id: 'nametune', icon: '🎶', hue: 'var(--hue-pitch)', cat: 'memory', en: ['Name That Tune', 'Hear the opening, pick the song — fast.'], he: ['זהו את השיר', 'שומעים את הפתיחה, בוחרים את השיר — מהר.'] },
  { id: 'drills', icon: '🎹', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Technique', 'Scales, Hanon, Barry Harris, voicings — with a tempo ladder and a MIDI analysis.'], he: ['טכניקה', 'סולמות, האנון, בארי האריס, וויסינגים — עם סולם טמפו וניתוח MIDI.'] },
  { id: 'tuneup', icon: '🎸', hue: 'var(--hue-instrument)', cat: 'instrument', en: ['Tune-up', 'Turn the peg until the beats disappear.'], he: ['כיוון', 'סובבו את המפתח עד שהפעימות נעלמות.'] },
  { id: 'pitchmemory', icon: '🎯', hue: 'var(--hue-creative)', cat: 'ear', en: ['Pitch Memory', 'Once a day: your note, from memory.'], he: ['זיכרון צליל', 'פעם ביום: הצליל שלכם, מהזיכרון.'] },
];

/** Practice tab hub (owner 2026-11-08): songs, technique and singing get their own place above the games, with the tools. */
export interface PracticeHub {
  songs: () => void;
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
  puzzle?: () => void;
  exams?: () => void;
  pieces?: () => void;
  mixer?: () => void;
}
const HUB_PATHS: Record<string, React.ReactNode> = {
  songs: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  drills: (
    <>
      <path d="M8 12h8" />
      <rect x="5" y="7" width="3" height="10" rx="1" />
      <rect x="16" y="7" width="3" height="10" rx="1" />
      <path d="M2.5 9.5v5M21.5 9.5v5" />
    </>
  ),
  lessons: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M9 8h7M9 11.5h5" />
    </>
  ),
  tuner: (
    <>
      <path d="M4.5 16a8 8 0 0 1 15 0" />
      <path d="M12 16l3.5-6.5" />
      <circle cx="12" cy="16" r="1.2" />
    </>
  ),
  metronome: (
    <>
      <path d="M8.5 3h7l4 18h-15z" />
      <path d="M12 16l4.5-9M6.5 16h11" />
    </>
  ),
  drone: (
    <>
      <path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0" />
    </>
  ),
  slowdown: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9.5 2.5h5" />
    </>
  ),
  improv: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <path d="M3 8c2-2 4-2 6 0" />
    </>
  ),
  puzzle: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  exams: (
    <>
      <path d="M7 3.5h8l3.5 3.5V20.5H7z" />
      <path d="M10 11l1.8 1.8L15 9.5M10 16.5h5" />
    </>
  ),
  groove: (
    <>
      <path d="M3 15c2 0 2-6 4.5-6S10 15 12 15s2.5-6 4.5-6S19 15 21 15" />
      <path d="M3 20h18" />
    </>
  ),
  charts: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M9 5v14M15 5v14M5.5 10h2M11 13h2M17 10h2" />
    </>
  ),
  log: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 8h8M8 12h5M14.5 16.5l1.5 1.5 3-3.5" />
    </>
  ),
  pieces: (
    <>
      <path d="M6 3.5h9l3.5 3.5v13.5H6z" />
      <path d="M9 9.5h6M9 13h6M9 16.5h3.5" />
    </>
  ),
  mixer: (
    <>
      <path d="M6 4v16M12 4v16M18 4v16" />
      <rect x="4" y="13" width="4" height="3" rx="1" />
      <rect x="10" y="7" width="4" height="3" rx="1" />
      <rect x="16" y="11" width="4" height="3" rx="1" />
    </>
  ),
  games: (
    <>
      <rect x="2.5" y="7" width="19" height="11" rx="5.5" />
      <path d="M7.5 10.5v4M5.5 12.5h4M15.5 11.5h0M18 13.5h0" />
    </>
  ),
};
const HubIcon = ({ k, size = 22 }: { k: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {HUB_PATHS[k]}
  </svg>
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
  puzzle: { en: 'Daily progression', he: 'מהלך היום' },
  exams: { en: 'Programs & exams', he: 'תכניות לימוד ומבחנים' },
  pieces: { en: 'My pieces', he: 'היצירות שלי' },
  mixer: { en: 'Mixer', he: 'מיקסר' },
  games: { en: ['Games', 'By type, topic and level'], he: ['משחקים', 'לפי סוג, נושא ורמה'] },
};

/** The Practice page (SPEC-IA-2, owner 2026-11-09): four groups by what you do — play, train, study — and the tools. */
export const PRACTICE_GROUPS: { id: 'play' | 'train' | 'study'; name: { en: string; he: string }; items: string[] }[] = [
  { id: 'play', name: { en: 'Play', he: 'לנגן' }, items: ['songs', 'pieces', 'charts'] },
  { id: 'train', name: { en: 'Train', he: 'להתאמן' }, items: ['drills', 'improv', 'games'] },
  { id: 'study', name: { en: 'Study', he: 'ללמוד' }, items: ['lessons', 'exams', 'puzzle'] },
];
/** What Practice shows in each course (0.61, SPEC-COURSES): only the course's own rows; tools are shared. */
export const COURSE_ROWS: Record<CourseId, string[]> = {
  ear: ['lessons', 'puzzle', 'games'],
  voice: ['drills', 'songs', 'games'],
  keys: ['drills', 'pieces', 'songs', 'games'],
  guitar: ['drills', 'songs', 'pieces', 'games'],
  bass: ['drills', 'songs', 'games'],
  jazz: ['charts', 'improv', 'games'],
  exam: ['exams', 'lessons', 'puzzle', 'games'],
};
/** The games list opens on the course's own category. */
export const COURSE_GAME_CAT: Record<CourseId, GameCat> = { ear: 'ear', voice: 'voice', keys: 'instrument', guitar: 'instrument', bass: 'instrument', jazz: 'ear', exam: 'read' };
const VOICE_TX: Record<string, { en: [string, string]; he: [string, string] }> = {
  drills: { en: ['Vocal technique', 'Range, breath, long tones, agility'], he: ['טכניקה קולית', 'מנעד, נשימה, צליל ארוך, גמישות'] },
  songs: { en: ['Sing along', 'Real songs in your key, with a guide voice'], he: ['שירה עם שירים', 'שירים אמיתיים בטונליות שלך, עם קול מוביל'] },
};
const ROW_TX: Record<string, { en: [string, string]; he: [string, string] }> = {
  songs: { en: ['Songs', 'Play and sing real songs — by the chords you know'], he: ['שירים', 'לנגן ולשיר שירים אמיתיים — לפי האקורדים שאתם מכירים'] },
  pieces: { en: ['My pieces', 'Bring a score; the coach takes you to tempo'], he: ['היצירות שלי', 'מעלים תווים; המאמן מביא אתכם לטמפו'] },
  charts: { en: ['Charts & lead sheets', 'Backing tracks, standards, import a lead sheet'], he: ['מהלכים ודפי אקורדים', 'ליווי, סטנדרטים, ייבוא דף אקורדים'] },
  drills: { en: ['Technique', 'Your instrument and your voice, level by level'], he: ['טכניקה', 'הכלי שלכם והקול שלכם, שלב אחר שלב'] },
  improv: { en: ['Improvise', 'Under rules, phrasing, trading fours'], he: ['אלתור', 'עם כללים, פרייזינג, חילופי ארבע'] },
  games: { en: ['Games', 'Ear, rhythm and memory games'], he: ['משחקים', 'משחקי שמיעה, קצב וזיכרון'] },
  lessons: { en: ['Lessons', 'Short theory lessons by topic'], he: ['שיעורים', 'שיעורי תיאוריה קצרים לפי נושא'] },
  exams: { en: ['Programs & exams', 'Bagrut and conservatory entrance, section by section'], he: ['תכניות לימוד ומבחנים', 'בגרות ומבחני כניסה לקונסרבטוריון, חלק אחר חלק'] },
  puzzle: { en: ['Progression of the day', 'One daily puzzle to solve and share'], he: ['מהלך היום', 'חידה יומית לפתור ולשתף'] },
};

/** Each game's note-head symbol and its category colour (0.61, SPEC-REDESIGN: no emoji). */
const GAME_GLYPH: Record<string, GlyphKind> = {
  melody: 'echo', rhythm: 'rhythm', truefalse: 'theory', ghost: 'ghost', duel: 'duel', daily: 'calendar', 'rush-chord': 'chords', 'rush-note': 'sight', 'rush-keysig': 'theory', 'rush-interval': 'intervals',
  'rush-progression': 'prog', 'rush-fretboard': 'guitar', peakhunter: 'eq', highway: 'rhythm', flight: 'sing', melodypuzzle: 'puzzle', nametune: 'name', drills: 'scales', tuneup: 'tune', pitchmemory: 'memory',
};
const CAT_COLOR: Record<string, string> = { ear: DOMAIN_COLOR.ear, rhythm: DOMAIN_COLOR.rhythm, memory: DOMAIN_COLOR.harmony, read: DOMAIN_COLOR.theory, voice: DOMAIN_COLOR.voice, instrument: DOMAIN_COLOR.play, social: '#EDE6F7' };

export function PlayScreen({ t, progress, onGame, onTrueFalse, onDuel, onOnline, onGhost, onDaily, onPuzzle, onGame2, lang = 'en', hub, status }: { status?: Partial<Record<string, string>>; t: Strings; progress: Progress; onGame: (k: GameKind) => void; onTrueFalse: () => void; onDuel: () => void; onOnline: () => void; onGhost: () => void; onDaily: () => void; onPuzzle: () => void; onGame2?: (id: (typeof GAMES2)[number]['id']) => void; lang?: 'he' | 'en'; hub?: PracticeHub }) {
  const course = useCourse().active;
  const rows = COURSE_ROWS[course];
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
  const cards: { key: string; hue: string; icon: React.ReactNode; title: string; blurb: string; extra?: React.ReactNode; onClick: () => void; cat?: GameCat }[] = [
    { key: 'melody', hue: 'var(--hue-memory)', icon: <GameIcon kind="melody" />, title: t.echoChain, blurb: t.echoChainBlurb, extra: best(progress.games?.melody), onClick: () => onGame('melody') },
    { key: 'rhythm', hue: 'var(--hue-time)', icon: <GameIcon kind="rhythm" />, title: t.beatEcho, blurb: t.beatEchoBlurb, extra: best(progress.games?.rhythm), onClick: () => onGame('rhythm') },
    { key: 'truefalse', hue: 'var(--hue-pitch)', icon: '✓✗', title: t.trueFalse, blurb: t.tfBlurb, extra: progress.tfBest && Object.keys(progress.tfBest).length ? best(Math.max(...Object.values(progress.tfBest))) : <span className="new-chip">{t.newChip}</span>, onClick: onTrueFalse },
    { key: 'ghost', hue: 'var(--hue-creative)', icon: '👻', title: t.ghostRace, blurb: t.ghostBlurb, onClick: onGhost },
    ...(onGame2 ? GAMES2.map((g) => ({ key: g.id, cat: g.cat, hue: g.hue, icon: g.icon, title: g[lang][0], blurb: g[lang][1], extra: progress.bests?.[g.id] ? best(progress.bests[g.id]) : <span className="new-chip">{t.newChip}</span>, onClick: () => onGame2(g.id) })) : []),
    { key: 'duel', hue: 'var(--hue-voice)', icon: '⚔', title: t.duel, blurb: t.duelBlurb, onClick: onDuel },
    { key: 'daily', hue: 'var(--hue-reading)', icon: '📅', title: t.dailyChallenge, blurb: daily ? `✓ ${t.dailyDone} · ${daily.points.toLocaleString()} ${t.points}` : t.dailyBlurb, onClick: onDaily },
  ];
  return (
    <main className="play-screen">
      {hub && games ? (
        <header className="screen-head">
          <button className="icon-btn" onClick={() => showGames(false)} aria-label={t.back}>
            <span className="flip-rtl">‹</span>
          </button>
          <h1>{HUB_TX.games[lang][0]}</h1>
        </header>
      ) : (
        <>
          <h1 className="screen-title">{t.playTitle}</h1>
          {!hub && <p className="field-hint">{t.playHint}</p>}
        </>
      )}
      {hub && !games && (
        <section className="practice-hub" data-practice-hub="1">
          {PRACTICE_GROUPS.filter((g) => g.items.some((k) => rows.includes(k))).map((g) => (
            <section key={g.id} className="hub-group" aria-label={g.name[lang]} data-hub-group={g.id} id={`practice-${g.id}`}>
              <h2 className="hub-group-h">{g.name[lang]}</h2>
              <div className="hub-rows">
                {g.items
                  .filter((k) => rows.includes(k) && (k === 'games' || hub[k as keyof PracticeHub]))
                  .map((k) => (
                    <button
                      key={k}
                      className="hub-row"
                      onClick={k === 'games' ? () => showGames(true) : course === 'voice' && k === 'drills' && hub.vocal ? hub.vocal : course === 'voice' && k === 'songs' && hub.singalong ? hub.singalong : (hub[k as keyof PracticeHub] as () => void)}
                      data-hub={k}
                    >
                      <span className="hub-icon">
                        <HubIcon k={k} />
                      </span>
                      <span className="hub-text">
                        <b>{(course === 'voice' && VOICE_TX[k] ? VOICE_TX[k] : ROW_TX[k])[lang][0]}</b>
                        <small>{(course === 'voice' && VOICE_TX[k] ? VOICE_TX[k] : ROW_TX[k])[lang][1]}</small>
                      </span>
                      {status?.[k] && (
                        <span className="hub-status" data-hub-status={k}>
                          {status[k]}
                        </span>
                      )}
                      <span className="hub-go flip-rtl" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          ))}
          <section className="hub-group" aria-label={HUB_TX.tools[lang]} data-hub-group="tools">
            <h2 className="hub-group-h">{HUB_TX.tools[lang]}</h2>
            <div className="hub-tools">
              {(['tuner', 'metronome', 'drone', 'groove', 'slowdown', 'mixer', 'log'] as const).filter((k) => hub[k]).map((k) => (
                <button key={k} className="hub-tool" onClick={hub[k]} data-hub={k}>
                  <HubIcon k={k} size={20} />
                  <span>{HUB_TX[k][lang]}</span>
                </button>
              ))}
            </div>
          </section>
        </section>
      )}
      {(!hub || games) && (
      <>
      <button className="play-hero plain" onClick={onPuzzle}>
        <span className="ph-icon" aria-hidden="true">
          <CatIcon k="puzzle" />
        </span>
        <span className="ph-text">
          <small>{puzzleStatus}</small>
          <b>{t.weeklyPuzzle}</b>
        </span>
        <span className="play-hero-go" aria-hidden="true">
          <span className="flip-rtl">›</span>
        </span>
      </button>
      <div className="play-cats" role="tablist" aria-label={lang === 'en' ? 'Game categories' : 'קטגוריות משחקים'}>
        <button role="tab" aria-selected={cat === 'all'} className={`chip ${cat === 'all' ? 'on' : ''}`} data-cat="all" onClick={() => pickCat('all')}>
          {lang === 'en' ? 'All' : 'הכול'}
        </button>
        {GAME_CATS.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={`chip ${cat === c.id ? 'on' : ''}`} data-cat={c.id} onClick={() => pickCat(c.id)}>
            {c[lang]}
          </button>
        ))}
      </div>
      {GAME_CATS.filter((c) => cat === 'all' || cat === c.id).map((gc) => {
        const list = cards.filter((c) => (c.cat ?? CAT_OF[c.key] ?? 'social') === gc.id);
        if (!list.length) return null;
        return (
          <section key={gc.id} className="play-section" aria-label={gc[lang]}>
            {cat === 'all' && (
              <h2 className="play-cat-h">
                {gc[lang]}
              </h2>
            )}
            <div className="play-grid">
              {list.map((c) => (
                <button key={c.key} className={`play-card game-card ${c.key}`} style={{ ['--hue' as string]: c.hue }} onClick={c.onClick}>
                  <span className="pc-icon" aria-hidden="true">
                    <Glyph kind={GAME_GLYPH[c.key] ?? 'contour'} color={CAT_COLOR[c.cat ?? CAT_OF[c.key] ?? 'social']} size={52} />
                  </span>
                  <b>{c.title}</b>
                  <small>{c.blurb}</small>
                  {c.extra}
                </button>
              ))}
            </div>
          </section>
        );
      })}
      <button className="live-card" onClick={onOnline}>
        <span className="live-icon" aria-hidden="true">
          <span className="live-ping" />
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="2" /><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" /></svg>
        </span>
        <span className="live-text">
          <b>{t.online}</b>
          <small>{t.onlineBlurb}</small>
        </span>
        <span className="live-go">{t.liveRoom}</span>
      </button>
      </>
      )}
    </main>
  );
}

/** Line icons for the Play tab (mature UI, 0.42): one per game category, plus the puzzle / duel / daily. */
const CAT_PATHS: Record<string, string> = {
  ear: 'M8 9a4 4 0 1 1 8 0c0 2.5-2 3.4-2.6 5.2-.5 1.6-1.3 3.3-3.4 3.3-1.4 0-2.4-.9-2.7-2M10.5 9a1.5 1.5 0 0 1 3 0',
  rhythm: 'M4 9.5c0-1.4 3.6-2.5 8-2.5s8 1.1 8 2.5v6c0 1.4-3.6 2.5-8 2.5s-8-1.1-8-2.5zM4 9.5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5M7 3.5l3.5 4M17 3.5l-3.5 4',
  memory: 'M4 6h5v5H4zM15 6h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z',
  read: 'M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8v13c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8zM12 6.3v13',
  voice: 'M9 4.5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v3.5',
  instrument: 'M14.5 3.5l6 6M17.5 6.5 11 13M11 13c-1.2-1.2-3.4-1-4.6.4-.9 1-.7 2.2-1.9 3-1.4.9-1.4 2.6-.2 3.8s2.9 1.2 3.8-.2c.8-1.2 2-1 3-1.9 1.4-1.2 1.6-3.4.4-4.6z',
  social: 'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM2.8 19.5c.6-3.1 3.1-5 6.2-5s5.6 1.9 6.2 5M16.3 5.8a3.2 3.2 0 0 1 0 6.3M17.4 14.7c2.2.5 3.6 2.2 3.9 4.8',
  duel: 'M5 19 14 10M14 10l2-5 3 3-5 2M19 19l-9-9M10 10 8 5 5 8l5 2M4 20l2-2M20 20l-2-2',
  daily: 'M4 6.5h16v13H4zM4 10.5h16M8 4v4M16 4v4',
  puzzle: 'M5 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H5v-3a2 2 0 1 0 0-4z',
};
function CatIcon({ k }: { k: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={CAT_PATHS[k] ?? CAT_PATHS.ear} />
    </svg>
  );
}
