// Badges, area ranks and rank crests (docs/SPEC-STATS.md §9). Inline {en, he} text, logical CSS only (RTL-safe),
// numbers and roman numerals in LTR islands; a tier is always shown by shape + label, never by colour alone.

import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { BADGE_CAT_NAME, BADGE_CATS, badgeInCourse, badgeProgress, badgeStates, FAMILY_NAME, SKILL_NAME, type Badge, type BadgeFamily, type BadgeCat, type BadgeInput, type BadgeLog, type BadgeState } from '../engine/badges';
import {
  AREA_NAME,
  challengeFor,
  challengeProgress,
  rankLabel,
  RANK_AREAS,
  romanOfDiv,
  tierOfDiv,
  TIER_NAME,
  type AreaEvidence,
  type RankArea,
  type Ranks,
} from '../engine/ranks';
import type { SkillId } from '../engine/lesson';
import { shareCanvas } from './Stats';
import { AreaGlyph, BadgeArt } from './BadgeArt';
import { RankShield } from './studio/StudioArt';
import '../badges.css';
import { courseOf, type CourseId } from '../engine/courses';
import { Glyph } from './Glyph';
import { CourseLevelsRow } from './CourseLevels';

type Lang = 'he' | 'en';
type L = { en: string; he: string };
const N = ({ children }: { children: ReactNode }) => <bdi dir="ltr">{children}</bdi>;

const BX = {
  title: { en: 'Badges', he: 'תגים' },
  ranks: { en: 'Area ranks', he: 'דירוג לפי תחום' },
  closest: { en: 'Closest to unlock', he: 'הכי קרוב לפתיחה' },
  all: { en: 'All', he: 'הכול' },
  earned: { en: 'Earned', he: 'הושגו' },
  locked: { en: 'Locked', he: 'נעולים' },
  share: { en: 'Share', he: 'שיתוף' },
  unranked: { en: 'Unranked', he: 'ללא דירוג' },
  answers: { en: 'answers', he: 'תשובות' },
  challenge: { en: 'Challenge of the month', he: 'אתגר החודש' },
  challengeGoal: { en: 'Right answers in {a} this month', he: 'תשובות נכונות ב{a} החודש' },
  tierNames: [
    { en: 'Bronze', he: 'ארד' },
    { en: 'Silver', he: 'כסף' },
    { en: 'Gold', he: 'זהב' },
  ] as L[],
  earnedOn: { en: 'Earned', he: 'הושג' },
  thisCourse: { en: 'This course', he: 'הקורס הזה' },
  allCourses: { en: 'All courses', he: 'כל הקורסים' },
};

// ======================================================================= RankCrest

/** A tier crest: the Paper shield in the tier's colour (pips for III / II / I, a star for Master). */
export function RankCrest({ div, size = 44, lang }: { div: number | null | undefined; size?: number; lang: Lang }) {
  const ranked = div !== null && div !== undefined && div >= 0;
  const tier = ranked ? tierOfDiv(div) : null;
  return <RankShield tier={tier} pips={ranked ? romanOfDiv(div).length : 0} size={size} label={rankLabel(ranked ? div : null, lang)} />;
}

// ======================================================================= AreaRanks strip

export function AreaRanks({ ranks, lang, evidence, onOpen }: { ranks: Ranks | undefined; lang: Lang; evidence?: Partial<Record<RankArea, Pick<AreaEvidence, 'answers' | 'needAnswers'>>>; onOpen?: (a: RankArea) => void }) {
  return (
    <section className="set-card area-ranks" aria-label={BX.ranks[lang]}>
      <h2>{BX.ranks[lang]}</h2>
      <ul className="ar-row">
        {RANK_AREAS.map((a) => {
          const r = ranks?.[a];
          const ev = evidence?.[a];
          const body = (
            <>
              <RankCrest div={r?.div ?? null} lang={lang} />
              <span className="ar-name">
                <AreaGlyph area={a} size={14} /> {AREA_NAME[a][lang]}
              </span>
              <small className="ar-label">
                {r ? (
                  rankLabel(r.div, lang)
                ) : ev ? (
                  <>
                    <N>{`${Math.min(ev.answers, ev.needAnswers)}/${ev.needAnswers}`}</N> {BX.answers[lang]}
                  </>
                ) : (
                  BX.unranked[lang]
                )}
              </small>
            </>
          );
          return (
            <li key={a} className={`ar-cell ${r ? `tier-${tierOfDiv(r.div)}` : 'unranked'}`}>
              {onOpen ? (
                <button type="button" className="ar-btn" onClick={() => onOpen(a)}>
                  {body}
                </button>
              ) : (
                <div className="ar-btn">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ======================================================================= monthly challenge

export function ChallengeCard({ input, lang }: { input: Pick<BadgeInput, 'today' | 'statsDays'>; lang: Lang }) {
  const pr = challengeProgress(challengeFor(input.today.slice(0, 7)), input.statsDays);
  const a = AREA_NAME[pr.ch.area][lang];
  return (
    <section className="set-card bd-challenge">
      <h2>
        <AreaGlyph area={pr.ch.area} size={18} /> {BX.challenge[lang]}: {a}
      </h2>
      <p className="field-hint">{BX.challengeGoal[lang].replace('{a}', a)}</p>
      <ol className="bd-ch-tiers">
        {pr.ch.tiers.map((t, i) => (
          <li key={i} className={`${pr.tier > i ? 'got' : ''} tier-${(['bronze', 'silver', 'gold'] as const)[i]}`}>
            <span>{BX.tierNames[i][lang]}</span> <N>{t}</N> {pr.tier > i && <span aria-hidden="true">✓</span>}
          </li>
        ))}
      </ol>
      <span className="aw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={pr.next ?? pr.ch.tiers[2]} aria-valuenow={pr.value}>
        <span style={{ width: `${Math.round(100 * pr.p)}%` }} />
      </span>
      <small className="field-hint">
        <N>{`${pr.value} / ${pr.next ?? pr.ch.tiers[2]}`}</N>
      </small>
    </section>
  );
}

// ======================================================================= badge tile + share

/** The tile's rendered medal as an image (null when it cannot be drawn: then the share card is text only). */
function svgImage(svg: SVGSVGElement | null | undefined): Promise<HTMLImageElement | null> {
  if (!svg) return Promise.resolve(null);
  return new Promise((res) => {
    const c = svg.cloneNode(true) as SVGSVGElement;
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    c.setAttribute('width', '480');
    c.setAttribute('height', '480');
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(c))}`;
  });
}

async function shareBadge(b: Badge, lang: Lang, svg?: SVGSVGElement | null) {
  const img = await svgImage(svg);
  return shareCanvas(
    (ctx, w, h) => {
      ctx.textAlign = 'center';
      if (img) ctx.drawImage(img, w / 2 - 210, h / 2 - 400, 420, 420);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px system-ui, sans-serif';
      ctx.direction = lang === 'he' ? 'rtl' : 'ltr';
      ctx.fillText(b.name[lang], w / 2, h / 2 + 120, w - 120);
      ctx.font = '40px system-ui, sans-serif';
      ctx.fillStyle = '#c8c8e0';
      ctx.fillText(b.desc[lang], w / 2, h / 2 + 200, w - 120);
      if (b.tone) {
        ctx.fillText(TIER_NAME[b.tone][lang], w / 2, h / 2 + 270);
      }
    },
    `toneturn-badge-${b.id.replace(/[^a-z0-9-]/gi, '-')}.png`,
    b.name[lang],
  );
}

export function BadgeTile({ s, lang, onShare, showCourse = true }: { s: BadgeState; lang: Lang; onShare?: (b: Badge, svg?: SVGSVGElement | null) => void; /** The small course chip (per-course achievements, 0.65). */ showCourse?: boolean }) {
  const { badge: b, check, got } = s;
  return (
    <li className={`bd-tile ${got ? 'got' : 'locked'} ${b.tone ? `tier-${b.tone}` : ''}`}>
      <span className="bd-icon">
        <BadgeArt badge={b} earned={got} size={64} lang={lang} />
      </span>
      <b className="bd-name">{b.name[lang]}</b>
      {showCourse && b.course && b.course !== 'general' && (
        <small className="bd-course" data-badge-course={b.course}>
          <Glyph kind={courseOf(b.course).glyph} color={courseOf(b.course).color} size={18} />
          {courseOf(b.course).short[lang]}
        </small>
      )}
      <small className="bd-desc">{b.desc[lang]}</small>
      {b.tone && <small className="bd-tone">{TIER_NAME[b.tone][lang]}</small>}
      {!got && check.p > 0 && (
        <span className="aw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(100 * check.p)} aria-label={b.name[lang]}>
          <span style={{ width: `${Math.round(100 * check.p)}%` }} />
        </span>
      )}
      {!got && check.goal !== undefined && (
        <small className="field-hint">
          <N>{`${check.v ?? 0} / ${check.goal}`}</N>
        </small>
      )}
      {got && s.at && (
        <small className="field-hint">
          {BX.earnedOn[lang]} <N>{s.at.slice(0, 10)}</N>
        </small>
      )}
      {got && onShare && (
        <button type="button" className="chip bd-share" onClick={(e: MouseEvent<HTMLButtonElement>) => onShare(b, e.currentTarget.closest('li')?.querySelector<SVGSVGElement>('svg.badge-art'))}>
          {BX.share[lang]}
        </button>
      )}
    </li>
  );
}

// ======================================================================= Badges view

type Filter = 'all' | 'earned' | 'locked';
/** Categories with many badges are grouped (by skill / family / area) in collapsible sections. */
const GROUPED: BadgeCat[] = ['skill', 'sub', 'technique', 'area'];

export function BadgesView({ lang, input, log, evidence, onOpenArea, share = true, earnedOnly = false, course, courses }: { lang: Lang; input: BadgeInput; log?: BadgeLog; evidence?: Partial<Record<RankArea, Pick<AreaEvidence, 'answers' | 'needAnswers'>>>; onOpenArea?: (a: RankArea) => void; share?: boolean; /** Progress → Awards (owner 2026-11-07): only earned badges + the closest few; ranks and the challenge live on Overview. */ earnedOnly?: boolean; /** Per course (owner 2026-11-09): the active course's badges + general ones, with an "all courses" toggle. */ course?: CourseId; /** My courses: their levels in a row at the top. */ courses?: CourseId[] }) {
  const [allCourses, setAllCourses] = useState(false);
  const only = course && !allCourses ? course : null;
  const allStates = useMemo(() => badgeStates(input, log), [input, log]);
  const states = useMemo(() => (only ? allStates.filter((x) => badgeInCourse(x.badge, only)) : allStates), [allStates, only]);
  const close = useMemo(() => (only ? badgeProgress(input, 400, log).filter((x) => badgeInCourse(x.badge, only)).slice(0, 3) : badgeProgress(input, 3, log)), [input, log, only]);
  const [filter, setFilter] = useState<Filter>(earnedOnly ? 'earned' : 'all');
  const onShare = share ? (b: Badge, svg?: SVGSVGElement | null) => void shareBadge(b, lang, svg) : undefined;
  const shown = states.filter((s) => (filter === 'all' ? true : filter === 'earned' ? s.got : !s.got));
  const got = states.filter((s) => s.got).length;
  return (
    <div className="ps-view bd-view">
      {courses && courses.length > 0 && <CourseLevelsRow courses={courses} ratings={input.ratings ?? {}} lang={lang} active={course} />}
      {course && (
        <div className="bd-course-bar">
          <div className="seg small" role="radiogroup" aria-label={BX.title[lang]}>
            {[false, true].map((all) => (
              <button key={String(all)} type="button" role="radio" aria-checked={allCourses === all} className={allCourses === all ? 'on' : ''} onClick={() => setAllCourses(all)} data-badges-all={all ? '1' : '0'}>
                {all ? BX.allCourses[lang] : `${BX.thisCourse[lang]} · ${courseOf(course).short[lang]}`}
              </button>
            ))}
          </div>
        </div>
      )}
      {!earnedOnly && <AreaRanks ranks={input.ranks} lang={lang} evidence={evidence} onOpen={onOpenArea} />}
      {!earnedOnly && <ChallengeCard input={input} lang={lang} />}
      <p className="field-hint">
        {BX.title[lang]}: <N>{`${got} / ${states.length}`}</N>
      </p>
      {close.length > 0 && (
        <section className="set-card">
          <h2>{BX.closest[lang]}</h2>
          <ul className="bd-grid">
            {close.map((s) => (
              <BadgeTile key={s.badge.id} s={s} lang={lang} />
            ))}
          </ul>
        </section>
      )}
      {!earnedOnly && <div className="bd-filter" role="group">
        {(['all', 'earned', 'locked'] as Filter[]).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {BX[f][lang]}
          </button>
        ))}
      </div>}
      {BADGE_CATS.map((c) => {
        const xs = shown.filter((s) => s.badge.cat === c);
        if (!xs.length) return null;
        const total = states.filter((s) => s.badge.cat === c);
        const head = (
          <>
            {BADGE_CAT_NAME[c][lang]} <N>{`${total.filter((s) => s.got).length}/${total.length}`}</N>
          </>
        );
        if (!GROUPED.includes(c))
          return (
            <section key={c} className="set-card">
              <h2>{head}</h2>
              <ul className="bd-grid">
                {xs.map((s) => (
                  <BadgeTile key={s.badge.id} s={s} lang={lang} onShare={onShare} />
                ))}
              </ul>
            </section>
          );
        const groups = [...new Set(xs.map((s) => s.badge.group ?? ''))];
        return (
          <section key={c} className="set-card">
            <h2>{head}</h2>
            {groups.map((g) => {
              const gs = xs.filter((s) => (s.badge.group ?? '') === g);
              const n = gs.filter((s) => s.got).length;
              return (
                <details key={g} className="bd-group" open={c === 'area' && n > 0}>
                  <summary>
                    <BadgeArt badge={gs[0].badge} earned={n > 0} size={26} decorative className="bd-sum-art" /> {groupName(c, g, lang)} <N>{`${n}/${gs.length}`}</N>
                  </summary>
                  <ul className="bd-grid">
                    {gs.map((s) => (
                      <BadgeTile key={s.badge.id} s={s} lang={lang} onShare={onShare} />
                    ))}
                  </ul>
                </details>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

const GROUP_FALLBACK: L = { en: 'Specials', he: 'מיוחדים' };
function groupName(c: BadgeCat, g: string, lang: Lang): string {
  if (c === 'area') return AREA_NAME[g as RankArea]?.[lang] ?? g;
  if (c === 'technique') return FAMILY_NAME[g as BadgeFamily]?.[lang] ?? GROUP_FALLBACK[lang];
  return SKILL_NAME[g as SkillId]?.[lang] ?? GROUP_FALLBACK[lang];
}
