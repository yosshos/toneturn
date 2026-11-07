// Badges, area ranks and rank crests (docs/SPEC-STATS.md §9). Inline {en, he} text, logical CSS only (RTL-safe),
// numbers and roman numerals in LTR islands; a tier is always shown by shape + label, never by colour alone.

import { useId, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { BADGE_CAT_NAME, BADGE_CATS, badgeProgress, badgeStates, FAMILY_NAME, SKILL_NAME, type Badge, type BadgeFamily, type BadgeCat, type BadgeInput, type BadgeLog, type BadgeState } from '../engine/badges';
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
  type RankTier,
} from '../engine/ranks';
import type { SkillId } from '../engine/lesson';
import { shareCanvas } from './Stats';
import { AreaGlyph, BadgeArt, METALS } from './BadgeArt';
import '../badges.css';

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
};

// ======================================================================= RankCrest

/** Emblem per tier: the shape alone tells the tier (circle, rhombus, star, hexagon, gem, crown). */
function Emblem({ tier }: { tier: RankTier }) {
  switch (tier) {
    case 'bronze':
      return <circle cx="32" cy="27" r="11" />;
    case 'silver':
      return <path d="M32 14 L44 27 L32 40 L20 27 Z" />;
    case 'gold':
      return <path d="M32 13 L35.5 23 L46 23.4 L37.7 29.8 L40.6 40 L32 34 L23.4 40 L26.3 29.8 L18 23.4 L28.5 23 Z" />;
    case 'platinum':
      return <path d="M32 14 L43.3 20.5 L43.3 33.5 L32 40 L20.7 33.5 L20.7 20.5 Z" />;
    case 'diamond':
      return <path d="M22 20 L42 20 L47 26 L32 41 L17 26 Z M17 26 L47 26 M27 20 L32 41 M37 20 L32 41" />;
    case 'master':
      return <path d="M18 36 L18 19 L25 26 L32 15 L39 26 L46 19 L46 36 Z" />;
  }
}

/** A tier crest: a metal shield in the tier's metal (BadgeArt palette), the tier's emblem and the division numeral (III / II / I). */
export function RankCrest({ div, size = 44, lang }: { div: number | null | undefined; size?: number; lang: Lang }) {
  const ranked = div !== null && div !== undefined && div >= 0;
  const tier = ranked ? tierOfDiv(div) : null;
  const label = rankLabel(ranked ? div : null, lang);
  const uid = `rc${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const m = tier ? METALS[tier] : null;
  const shield = 'M32 3 L57 11 L57 32 C57 46 46 56 32 61 C18 56 7 46 7 32 L7 11 Z';
  return (
    <svg className={`rank-crest ${tier ? `rc-${tier} rc-metal` : 'rc-none'}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label}>
      <title>{label}</title>
      {m ? (
        <>
          <defs>
            <linearGradient id={`${uid}-m`} x1="0.15" y1="0" x2="0.85" y2="1">
              {m.stops.map((c, i) => (
                <stop key={i} offset={i / (m.stops.length - 1)} stopColor={c} />
              ))}
            </linearGradient>
            <radialGradient id={`${uid}-f`} cx="0.4" cy="0.3" r="0.85">
              <stop offset="0" stopColor="#2b2e5c" />
              <stop offset="1" stopColor="#15162e" />
            </radialGradient>
          </defs>
          <path d={shield} fill={`url(#${uid}-m)`} stroke={m.stops[3]} strokeWidth="1" />
          <path d={shield} transform="translate(32 32) scale(0.8) translate(-32 -32)" fill={`url(#${uid}-f)`} stroke={m.stops[0]} strokeWidth="1.4" />
          <g className="rc-emblem" fill={m.hi} stroke={m.hi}>
            <Emblem tier={tier!} />
          </g>
          {romanOfDiv(div!) && (
            <text className="rc-num" x="32" y="52" textAnchor="middle" direction="ltr" style={{ fill: m.hi }}>
              {romanOfDiv(div!)}
            </text>
          )}
          <ellipse cx="25" cy="17" rx="13" ry="4.5" fill="#fff" opacity="0.14" transform="rotate(-22 25 17)" />
        </>
      ) : (
        <>
          <path className="rc-shield" d={shield} />
          <text className="rc-num" x="32" y="38" textAnchor="middle">
            ?
          </text>
        </>
      )}
    </svg>
  );
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

export function BadgeTile({ s, lang, onShare }: { s: BadgeState; lang: Lang; onShare?: (b: Badge, svg?: SVGSVGElement | null) => void }) {
  const { badge: b, check, got } = s;
  return (
    <li className={`bd-tile ${got ? 'got' : 'locked'} ${b.tone ? `tier-${b.tone}` : ''}`}>
      <span className="bd-icon">
        <BadgeArt badge={b} earned={got} size={64} lang={lang} />
      </span>
      <b className="bd-name">{b.name[lang]}</b>
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

export function BadgesView({ lang, input, log, evidence, onOpenArea, share = true }: { lang: Lang; input: BadgeInput; log?: BadgeLog; evidence?: Partial<Record<RankArea, Pick<AreaEvidence, 'answers' | 'needAnswers'>>>; onOpenArea?: (a: RankArea) => void; share?: boolean }) {
  const states = useMemo(() => badgeStates(input, log), [input, log]);
  const close = useMemo(() => badgeProgress(input, 3, log), [input, log]);
  const [filter, setFilter] = useState<Filter>('all');
  const onShare = share ? (b: Badge, svg?: SVGSVGElement | null) => void shareBadge(b, lang, svg) : undefined;
  const shown = states.filter((s) => (filter === 'all' ? true : filter === 'earned' ? s.got : !s.got));
  const got = states.filter((s) => s.got).length;
  return (
    <div className="ps-view bd-view">
      <AreaRanks ranks={input.ranks} lang={lang} evidence={evidence} onOpen={onOpenArea} />
      <ChallengeCard input={input} lang={lang} />
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
      <div className="bd-filter" role="group">
        {(['all', 'earned', 'locked'] as Filter[]).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {BX[f][lang]}
          </button>
        ))}
      </div>
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
