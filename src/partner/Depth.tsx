// The depth page (docs/SPEC-PARTNER-PITCH.md §3.3): the scope in numbers, the method maps with links into the app,
// what the app measures (demo data), and — in a partner build — how it fits the partner's courses. First-class in a
// partner build; reachable from Settings in the normal app. Every number is computed from the live catalogues.
import { useMemo, type ReactNode } from 'react';
import { ACTIVE_PARTNER, copy, courseAllowed, type DepthLink, type PartnerConfig } from './index';
import { depthCounts, linkTitle, linksLevels, familyLevels, topicLevels, scaleMatrix, type InstrumentId } from './counts';
import { DEPTH_MAPS, SCALE_HE, SCALE_SHORT } from './depthMaps';
import { TEACHER_STATES, STATE_NAME, TeacherFrame } from './TeacherFrame';
import type { CourseId } from '../engine/courses';
import './depth.css';
import { Icon } from '../ui/icons';

type Lang = 'en' | 'he';
const L = (lang: Lang, en: string, he: string) => (lang === 'he' ? he : en);
const fmt = (n: number, lang: Lang) => n.toLocaleString(lang === 'he' ? 'he-IL' : 'en-US');

const INST: Record<InstrumentId, { en: string; he: string; course: CourseId | 'voice' }> = {
  piano: { en: 'Piano', he: 'פסנתר', course: 'keys' },
  guitar: { en: 'Guitar', he: 'גיטרה', course: 'guitar' },
  bass: { en: 'Bass', he: 'בס', course: 'bass' },
  drums: { en: 'Drums', he: 'תופים', course: 'drums' },
  voice: { en: 'Voice', he: 'שירה', course: 'voice' },
};
const MODE_NAME: Record<string, { en: string; he: string }> = {
  R: { en: 'RH', he: 'י״מ' },
  L: { en: 'LH', he: 'י״ש' },
  HT: { en: 'HT', he: 'יחד' },
  contrary: { en: 'Contr.', he: 'נגדי' },
};

function LinkChip({ link, lang, onOpen }: { link: DepthLink; lang: Lang; onOpen: (l: DepthLink) => void }) {
  const n = link.kind === 'family' ? familyLevels(link.id) : topicLevels(link.id);
  // Hidden until verified (verifiedContent.ts): a family / topic with nothing on show gets no chip.
  if (n === 0) return null;
  return (
    <button type="button" className={`dp-link ${link.kind}`} onClick={() => onOpen(link)} data-depth-link={`${link.kind}:${link.id}`}>
      <span className="dp-link-name">{linkTitle(link, lang)}</span>
      <span className="dp-link-n">{n}</span>
    </button>
  );
}

// ---------------------------------------------------------------- small charts (demo data)
const W = 160;
const H = 56;
function Bars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  const bw = W / values.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 12}`} className="dp-chart" aria-hidden="true">
      {values.map((v, i) => {
        const h = (v / max) * (H - 4);
        return <rect key={i} x={i * bw + 3} y={H - h} width={bw - 6} height={h} rx={3} fill={i === values.length - 1 ? 'var(--accent)' : 'var(--line-strong)'} />;
      })}
      {labels.map((l, i) => (
        <text key={i} x={i * bw + bw / 2} y={H + 10} textAnchor="middle" className="dp-ax">
          {l}
        </text>
      ))}
    </svg>
  );
}
function Line({ points, ref1, color = 'var(--accent)', steps = false }: { points: number[]; ref1?: number; color?: string; steps?: boolean }) {
  const max = Math.max(...points, ref1 ?? 0) * 1.05;
  const min = Math.min(...points) * 0.9;
  const x = (i: number) => (i / (points.length - 1)) * (W - 6) + 3;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * (H - 6) - 3;
  const d = points.map((v, i) => (i === 0 ? `M${x(i)} ${y(v)}` : steps ? `H${x(i)} V${y(v)}` : `L${x(i)} ${y(v)}`)).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dp-chart" aria-hidden="true">
      {ref1 !== undefined && <line x1={0} x2={W} y1={y(ref1)} y2={y(ref1)} stroke="var(--ink-dim)" strokeDasharray="3 3" strokeWidth={1} />}
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={3.5} fill={color} />
    </svg>
  );
}
const KEYS5 = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
function KeyRow({ values }: { values: number[] }) {
  return (
    <div className="dp-keys" aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} className="dp-key" style={{ ['--v' as string]: v }} data-weak={v < 0.45 ? '1' : undefined}>
          <bdi>{KEYS5[i]}</bdi>
        </span>
      ))}
    </div>
  );
}
function Quality({ clean, almost, not }: { clean: number; almost: number; not: number }) {
  return (
    <div className="dp-quality" aria-hidden="true">
      <i style={{ flex: clean, background: 'var(--ok)' }} />
      <i style={{ flex: almost, background: 'var(--near)' }} />
      <i style={{ flex: not, background: 'var(--bad)' }} />
    </div>
  );
}
function Phrases() {
  // Phrase lengths in bars and the rests between them (a 16-bar chorus).
  const ph = [
    [0, 3.5],
    [4, 6],
    [8, 11.5],
    [12, 15],
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dp-chart" aria-hidden="true">
      {Array.from({ length: 17 }, (_, i) => (
        <line key={i} x1={(i / 16) * (W - 6) + 3} x2={(i / 16) * (W - 6) + 3} y1={H - 10} y2={H - (i % 4 === 0 ? 2 : 6)} stroke="var(--line-strong)" />
      ))}
      {ph.map(([a, b], i) => {
        const x1 = (a / 16) * (W - 6) + 3;
        const x2 = (b / 16) * (W - 6) + 3;
        return <path key={i} d={`M${x1} ${H - 14} Q${(x1 + x2) / 2} ${8 + (i % 2) * 8} ${x2} ${H - 14}`} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" />;
      })}
    </svg>
  );
}

function Measure({ lang }: { lang: Lang }) {
  const days = lang === 'he' ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const cards: { id: string; title: string; line: string; chart: ReactNode }[] = [
    { id: 'time', title: L(lang, 'Practice time', 'זמן תרגול'), line: L(lang, 'Minutes a day, only measured playing counts', 'דקות ביום; נספרת רק נגינה מדודה'), chart: <Bars values={[12, 18, 0, 22, 15, 26, 31]} labels={days} /> },
    {
      id: 'quality',
      title: L(lang, 'Quality', 'איכות'),
      line: L(lang, 'Every note: clean, almost, or not; early and late in ms', 'כל צליל: נקי, כמעט או לא; מוקדם ומאוחר במילישניות'),
      chart: (
        <>
          <Quality clean={68} almost={22} not={10} />
          <div className="dp-legend">
            <span>
              <i style={{ background: 'var(--ok)' }} />
              {L(lang, 'Clean 68%', 'נקי 68%')}
            </span>
            <span>
              <i style={{ background: 'var(--near)' }} />
              {L(lang, 'Almost 22%', 'כמעט 22%')}
            </span>
            <span>
              <i style={{ background: 'var(--bad)' }} />
              {L(lang, 'Not 10%', 'לא 10%')}
            </span>
          </div>
        </>
      ),
    },
    { id: 'keys', title: L(lang, 'Per-key mastery', 'שליטה לפי סולם'), line: L(lang, 'Each skill in all 12 keys; weak keys come back first', 'כל מיומנות ב־12 הסולמות; החלשים חוזרים ראשונים'), chart: <KeyRow values={[0.95, 0.9, 0.85, 0.7, 0.55, 0.35, 0.3, 0.5, 0.62, 0.8, 0.88, 0.92]} /> },
    { id: 'ladder', title: L(lang, 'Tempo ladder', 'סולם טמפו'), line: L(lang, 'Rubato first, then up the ladder to the target tempo', 'קודם רובאטו, ואז במעלה הסולם עד טמפו היעד'), chart: <Line points={[60, 60, 66, 66, 72, 72, 72, 80, 88, 88, 96]} ref1={100} steps /> },
    { id: 'plateau', title: L(lang, 'Plateau and fade', 'מישור ודעיכה'), line: L(lang, 'Flags a stall, and skills that fade without review', 'מסמן תקיעות, ומיומנויות שדועכות בלי חזרה'), chart: <Line points={[40, 52, 61, 67, 70, 71, 71, 70, 71, 66, 61]} color="var(--near)" /> },
    { id: 'phrase', title: L(lang, 'Phrase organisation', 'ארגון משפטים'), line: L(lang, 'Phrase lengths, rests and where lines start in a chorus', 'אורכי משפטים, הפסקות ואיפה הקווים מתחילים בכורוס'), chart: <Phrases /> },
  ];
  return (
    <div className="dp-measure">
      {cards.map((c) => (
        <article key={c.id} className="dp-mcard" data-depth-measure={c.id}>
          <h3>{c.title}</h3>
          <div className="dp-mchart">{c.chart}</div>
          <p>{c.line}</p>
        </article>
      ))}
      <article className="dp-mcard dp-plan" data-depth-measure="plan">
        <h3>{L(lang, 'AI weekly plan', 'תוכנית שבועית (AI)')}</h3>
        <ol>
          <li>
            <b>{L(lang, 'Mon', 'ב׳')}</b> {L(lang, 'Harris scale in ', 'סולם האריס ב־')}
            <bdi>B</bdi>, <bdi>F♯</bdi> {L(lang, '(weakest keys)', '(הסולמות החלשים)')}
          </li>
          <li>
            <b>{L(lang, 'Wed', 'ד׳')}</b> {L(lang, 'Rootless ii–V, ', 'ii–V ללא שורש, ')}
            <bdi>72 → 88</bdi>
          </li>
          <li>
            <b>{L(lang, 'Fri', 'ו׳')}</b> {L(lang, 'Review: drop 2 before it fades', 'חזרה: דרופ 2 לפני שהוא דועך')}
          </li>
        </ol>
        <p>{L(lang, 'Written each week from the measured takes', 'נכתבת בכל שבוע מתוך הנגינות המדודות')}</p>
      </article>
    </div>
  );
}

export function DepthScreen({ lang, onBack, onOpen, partner = ACTIVE_PARTNER }: { lang: Lang; onBack: () => void; onOpen: (l: DepthLink) => void; partner?: PartnerConfig | null }) {
  const c = useMemo(() => depthCounts(), []);
  const matrix = useMemo(() => scaleMatrix(), []);
  // Maps start open on wide screens and folded on a phone (one tap each), so the page scans in under a minute.
  const wide = useMemo(() => typeof window !== 'undefined' && window.innerWidth >= 900, []);
  const maxLv = Math.max(...c.instruments.map((x) => x.levels));
  const pct = Math.round(c.twelveKeyShare * 100);
  const tiles: { id: string; n: string; label: string }[] = [
    { id: 'levels', n: fmt(c.levels, lang), label: L(lang, 'levels', 'שלבים') },
    { id: 'items', n: fmt(c.items, lang), label: L(lang, 'exercises', 'תרגילים') },
    { id: 'drills', n: fmt(c.drills, lang), label: L(lang, 'exercise × key drills', 'תרגילים × סולמות') },
    { id: 'topics', n: fmt(c.topics, lang), label: L(lang, 'ear and theory topics', 'נושאי שמיעה ותיאוריה') },
    { id: 'lessons', n: fmt(c.lessons, lang), label: L(lang, 'lessons', 'שיעורים') },
    { id: 'keys12', n: `${pct}%`, label: L(lang, 'of pitched levels in all 12 keys', 'מהשלבים המנוגנים בכל 12 הסולמות') },
    { id: 'instruments', n: fmt(c.instruments.length, lang), label: L(lang, 'instruments', 'כלים') },
    { id: 'cards', n: fmt(c.ruleCards, lang), label: L(lang, 'improvisation rule cards', 'כרטיסי כללים לאלתור') },
  ];
  const shown = (id: CourseId | 'voice') => !partner || (id !== 'voice' && courseAllowed(id, partner));
  return (
    <main className="panel-screen depth-page" data-depth="1" data-partner-build={partner ? partner.id : undefined}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={L(lang, 'Back', 'חזרה')}>
          <Icon k="back" />
        </button>
        <h1>{L(lang, 'What’s inside', 'מה יש בפנים')}</h1>
      </header>

      <section className="dp-hero">
        {partner && <p className="dp-eyebrow">{partner.tagline[lang]}</p>}
        <h2>{copy('depth.title', lang, { en: 'Depth you can measure', he: 'עומק שאפשר למדוד' }, partner)}</h2>
        <p>{L(lang, 'Every number below is counted from the app’s own catalogues, live.', 'כל מספר כאן נספר מהקטלוגים של האפליקציה עצמה, בזמן אמת.')}</p>
        {partner?.mascot === 'teacher-frame' && (
          <div className="dp-teacher">
            <TeacherFrame state="draw" size={72} lang={lang} />
            <div>
              <b>{L(lang, 'Your teacher here', 'המורה שלך כאן')}</b>
              <small>{L(lang, 'Each teacher can get a set of 12 reactions', 'לכל מורה אפשר סט של 12 תגובות')}</small>
            </div>
          </div>
        )}
      </section>

      <section className="dp-tiles" aria-label={L(lang, 'Counts', 'מספרים')}>
        {tiles.map((t) => (
          <div key={t.id} className="dp-tile" data-depth-count={t.id}>
            <b>{t.n}</b>
            <span>{t.label}</span>
          </div>
        ))}
      </section>

      <section className="dp-sec">
        <h2>{L(lang, 'Levels per instrument', 'שלבים לכל כלי')}</h2>
        <div className="dp-inst">
          {c.instruments.map((x) => {
            const on = shown(INST[x.id].course);
            return (
              <div key={x.id} className={`dp-inst-row ${on ? '' : 'dim'}`} data-depth-inst={x.id}>
                <span className="dp-inst-name">
                  {INST[x.id][lang]}
                  {!on && <small>{L(lang, 'also built', 'בנוי גם')}</small>}
                </span>
                <span className="dp-inst-bar">
                  <i style={{ width: `${(x.levels / maxLv) * 100}%` }} />
                </span>
                <span className="dp-inst-n">
                  {fmt(x.levels, lang)} <small>{L(lang, `· ${x.families} families`, `· ${x.families} משפחות`)}</small>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dp-sec">
        <h2>{L(lang, 'The maps', 'המפות')}</h2>
        <p className="dp-sub">{L(lang, 'Open a map, then tap a family or topic to practice it. The number is its levels.', 'פתחו מפה והקישו על משפחה או נושא כדי לתרגל. המספר הוא מספר השלבים.')}</p>
        <div className="dp-maps">
          {DEPTH_MAPS.map((m) => (
            <details key={m.id} className="dp-map" data-depth-map={m.id} open={wide}>
              <summary>
                <span className="dp-sum">
                  <h3>{m.title[lang]}</h3>
                  <span className="dp-map-n">{fmt(m.rows.reduce((n, r) => n + linksLevels(r.links), 0), lang)}</span>
                </span>
                <p className="dp-lead">{m.lead[lang]}</p>
              </summary>
              <ul>
                {m.rows.map((r, i) => (
                  <li key={i}>
                    <div className="dp-row-head">
                      <span>{r.name[lang]}</span>
                      {r.sources && (
                        <span className="dp-src">
                          {r.sources.map((s) => (
                            <i key={s}>{s}</i>
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="dp-links">
                      {r.links.map((l) => (
                        <LinkChip key={`${l.kind}:${l.id}`} link={l} lang={lang} onOpen={onOpen} />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <details className="dp-map" data-depth-map="scales" open={wide}>
            <summary>
              <span className="dp-sum">
                <h3>{L(lang, 'Scale matrix (piano)', 'מטריצת הסולמות (פסנתר)')}</h3>
                <span className="dp-map-n">
                  <bdi>
                    {matrix.covered}/{matrix.required}
                  </bdi>
                </span>
              </span>
              <p className="dp-lead">{L(lang, 'Every scale × each hand, together, contrary × 1, 2 and 4 octaves, in 12 keys.', 'כל סולם × כל יד, יחד, נגדי × 1, 2 ו־4 אוקטבות, ב־12 סולמות.')}</p>
            </summary>
            <table className="dp-matrix">
              <thead>
                <tr>
                  <th />
                  {matrix.rows[0]?.cells.map((x) => (
                    <th key={x.mode}>{MODE_NAME[x.mode][lang]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((r) => (
                  <tr key={r.type}>
                    <th title={lang === 'he' ? SCALE_HE[r.type] ?? r.en : r.en}>{lang === 'he' ? SCALE_HE[r.type] ?? r.en : SCALE_SHORT[r.type] ?? r.en}</th>
                    {r.cells.map((x) => (
                      <td key={x.mode} data-full={x.covered === x.required ? '1' : undefined} title={`${x.covered}/${x.required}`}>
                        <i style={{ ['--f' as string]: x.required ? x.covered / x.required : 0 }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="dp-links">
              <LinkChip link={{ kind: 'family', id: 'scales' }} lang={lang} onOpen={onOpen} />
            </div>
          </details>
        </div>
      </section>

      <section className="dp-sec">
        <h2>{L(lang, 'What we measure', 'מה אנחנו מודדים')}</h2>
        <p className="dp-sub">{L(lang, 'Demo data: how one player’s week reads.', 'נתוני הדגמה: כך נקרא שבוע של נגן אחד.')}</p>
        <Measure lang={lang} />
      </section>

      {partner && partner.courseMap.length > 0 && (
        <section className="dp-sec" data-depth-fits="1">
          <h2>{L(lang, 'Fits your courses', 'מתאים לקורסים שלכם')}</h2>
          <p className="dp-sub">{partner.courseMapNote[lang]}</p>
          <div className="dp-fit" role="table">
            <div className="dp-fit-row head" role="row">
              <span role="columnheader">{L(lang, 'Course or topic', 'קורס או נושא')}</span>
              <span role="columnheader">{L(lang, 'Practiced here as', 'מתורגל כאן כ־')}</span>
            </div>
            {partner.courseMap.map((r) => (
              <div key={r.course} className="dp-fit-row" role="row" data-depth-fit={r.course}>
                <span role="cell" className="dp-fit-course">
                  <bdi>{r.course}</bdi>
                  <small>{r.what[lang]}</small>
                </span>
                <span role="cell" className="dp-links">
                  {r.links.map((l) => (
                    <LinkChip key={`${l.kind}:${l.id}`} link={l} lang={lang} onOpen={onOpen} />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {partner?.mascot === 'teacher-frame' && (
        <section className="dp-sec" data-depth-mascots="1">
          <h2>{L(lang, 'Reactions, ready for your teachers', 'תגובות, מוכנות למורים שלכם')}</h2>
          <p className="dp-sub">{L(lang, 'Twelve states. Each one becomes a portrait of the teacher, with permission.', 'שנים־עשר מצבים. כל אחד יהפוך לדיוקן של המורה, באישור.')}</p>
          <div className="dp-states">
            {TEACHER_STATES.map((s) => (
              <figure key={s}>
                <TeacherFrame state={s} size={64} lang={lang} />
                <figcaption>{STATE_NAME[s][lang]}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

/** The partner build's Home card into the depth page. */
export function DepthCard({ lang, onOpen, partner = ACTIVE_PARTNER }: { lang: Lang; onOpen: () => void; partner?: PartnerConfig | null }) {
  if (!partner) return null;
  return (
    <button type="button" className="dp-card v2-card" onClick={onOpen} data-depth-card="1">
      <span>
        <small>{partner.tagline[lang]}</small>
        <b>{copy('depth.card', lang, { en: 'What is inside', he: 'מה יש בפנים' }, partner)}</b>
      </span>
      <span aria-hidden="true">
        <Icon k="fwd" />
      </span>
    </button>
  );
}
