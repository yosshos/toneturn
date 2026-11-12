// Insights (0.50, docs/PLAN-ANALYSIS-AND-NEXT.md): what the player model found — the Ear Index, technique findings
// (fingers, hands, keys, scales, leaps, tempo), the hand map and the key map, the groove fingerprint, the confusion map
// with "boss fights", and the trouble bars of the pieces. Every finding links to the exercise that trains it.

import { useEffect, useState } from 'react';
import { findings, type PlayerModel } from '../engine/analysis/model';
import { grooveFindings, type GrooveModel } from '../engine/analysis/groove';
import { earIndex, earIndexHistory } from '../engine/rating';
import { ratingsOf, type Progress } from '../storage/progress';
import { loadGroove, loadModel } from '../storage/analysis';
import { loadConfusions, topConfusions, type ConfusionMap } from '../storage/confusion';
import { loadPieces, type StoredPiece } from './Pieces';
import { troubleBars } from '../engine/piece/coach';
import { showsInsight } from '../engine/analysis/insightCards';
import type { CourseId } from '../engine/courses';

const TX = {
  en: {
    title: 'Insights', ear: 'Ear Index', earHint: 'One number for your ear — built from the hardest items you beat, never from time spent.', provisional: 'still settling',
    tech: 'Technique', hands: 'Hand map', handsHint: 'Each finger’s loudness against the hand’s average', keys: 'Key map', keysHint: 'Misses by key (darker = weaker)',
    groove: 'Groove fingerprint', grooveHint: 'Where your notes land against the beat (− early, + late), and how wide they spread',
    conf: 'Confusion map', confHint: 'The pairs you mix up most', boss: 'Practice this pair', trouble: 'Trouble bars', practise: 'Practice', none: 'Not enough data yet — keep practicing and this fills in.',
    early: 'early', late: 'late', back: 'Back', sub: { beat: 'Beats', '8': 'Eighths', '16': 'Sixteenths', trip: 'Triplets' } as Record<string, string>, bars: 'bars', weeks: 'Your timing by week', train: 'Train your groove',
  },
  he: {
    title: 'תובנות', ear: 'מדד האוזן', earHint: 'מספר אחד לאוזן שלכם — נבנה מהפריטים הקשים ביותר שעברתם, לא מזמן אימון.', provisional: 'עדיין מתייצב',
    tech: 'טכניקה', hands: 'מפת ידיים', handsHint: 'עוצמת כל אצבע ביחס לממוצע של היד', keys: 'מפת סולמות', keysHint: 'החטאות לפי סולם (כהה = חלש)',
    groove: 'טביעת הגרוב', grooveHint: 'איפה הצלילים שלכם נוחתים ביחס לפעמה (− מוקדם, + מאוחר), וכמה הם מתפזרים',
    conf: 'מפת בלבולים', confHint: 'הזוגות שאתם מבלבלים הכי הרבה', boss: 'לתרגל את הזוג', trouble: 'תיבות בעייתיות', practise: 'לתרגל', none: 'עוד אין מספיק נתונים — המשיכו להתאמן וזה יתמלא.',
    early: 'מוקדם', late: 'מאוחר', back: 'חזרה', sub: { beat: 'פעמות', '8': 'שמיניות', '16': 'שש־עשריות', trip: 'טריולות' } as Record<string, string>, bars: 'תיבות', weeks: 'התזמון שלכם לפי שבוע', train: 'לאמן את הגרוב',
  },
};
const KEYS_5THS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const KEY_N = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function InsightsScreen({ lang, progress, onBack, onTopic, onDrills, onPieces, onGroove, course = 'ear' }: { lang: 'en' | 'he'; progress: Progress; /** Only the active course's cards show (GUITAR_AUDIT P2). */ course?: CourseId; onBack: () => void; onTopic: (id: string, level: number) => void; onDrills: () => void; onPieces: () => void; onGroove?: () => void }) {
  const tx = TX[lang];
  const on = (c: Parameters<typeof showsInsight>[0]) => showsInsight(c, course);
  const [model, setModel] = useState<PlayerModel | null>(null);
  const [groove, setGroove] = useState<GrooveModel | null>(null);
  const [conf, setConf] = useState<ConfusionMap | null>(null);
  const [pieces, setPieces] = useState<StoredPiece[]>([]);
  useEffect(() => {
    void loadModel().then(setModel);
    void loadGroove().then(setGroove);
    void loadConfusions().then(setConf);
    void loadPieces().then(setPieces);
  }, []);
  const ratings = ratingsOf(progress);
  const ei = earIndex(ratings);
  const hist = earIndexHistory(progress.ratingEvents ?? []).slice(-30);
  const fs = model ? findings(model) : [];
  const gf = groove ? grooveFindings(groove) : [];
  const cps = conf ? topConfusions(conf) : [];
  const troubled = pieces.map((sp) => ({ sp, bars: troubleBars(sp.plan) })).filter((x) => x.bars.length);

  return (
    <main className="panel-screen insights" data-insights="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx.title}</h1>
      </header>

      {on('ear-index') && (
      <section className="set-card in-ear" data-ear-index={ei?.r ?? ''}>
        <div className="in-head">
          <h2>{tx.ear}</h2>
          <b className="in-big" dir="ltr">
            {ei ? ei.r : '—'}
          </b>
        </div>
        {ei?.provisional && <small className="field-hint">{tx.provisional}</small>}
        {hist.length > 1 && <Spark pts={hist.map((p) => p.r)} />}
        <small className="field-hint">{tx.earHint}</small>
      </section>
      )}

      {on('technique') && (
      <section className="set-card" data-findings="1">
        <h2>{tx.tech}</h2>
        {fs.length ? (
          <ul className="in-list">
            {fs.slice(0, 6).map((f) => (
              <li key={f.kind + f.ctx}>
                <span className="in-text">
                  <b>{f.text[lang]}</b>
                  <small>{f.prescribe.note[lang]}</small>
                </span>
                <button className="btn ghost small" onClick={() => (f.prescribe.topic ? onTopic(f.prescribe.topic, 1) : onDrills())} data-finding={f.kind}>
                  {tx.practise}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-hint">{tx.none}</p>
        )}
      </section>
      )}

      {model && on('hand-map') && <HandMap model={model} tx={tx} />}
      {model && on('key-map') && <KeyMap model={model} tx={tx} />}

      {on('groove') && (
      <section className="set-card" data-groove="1">
        <h2>{tx.groove}</h2>
        <small className="field-hint">{tx.grooveHint}</small>
        {groove && groove.taps >= 20 ? (
          <>
            <GrooveBars g={groove} tx={tx} />
            {gf.length > 0 && (
              <ul className="in-list">
                {gf.slice(0, 4).map((f) => (
                  <li key={f.kind + f.ctx}>
                    <span className="in-text">
                      <b>{f.text[lang]}</b>
                      <small>{f.practice[lang]}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <WeekLine g={groove} tx={tx} />
          </>
        ) : (
          <p className="field-hint">{tx.none}</p>
        )}
        {onGroove && (
          <button className="btn ghost" onClick={onGroove} data-open-groove="1">
            {tx.train}
          </button>
        )}
      </section>
      )}

      {on('confusions') && (
      <section className="set-card" data-confusions="1">
        <h2>{tx.conf}</h2>
        <small className="field-hint">{tx.confHint}</small>
        {cps.length ? (
          <ul className="in-list">
            {cps.map((c, i) => (
              <li key={i}>
                <span className="in-text">
                  <b>
                    {c.right[lang]} ⇄ {c.given[lang]}
                  </b>
                  <small dir="ltr">×{c.both}</small>
                </span>
                {c.gen && (
                  <button className="btn ghost small" onClick={() => onTopic(c.gen!.id, c.gen!.level)} data-boss={c.gen.id}>
                    {tx.boss}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-hint">{tx.none}</p>
        )}
      </section>
      )}

      {troubled.length > 0 && on('trouble-bars') && (
        <section className="set-card" data-trouble="1">
          <h2>{tx.trouble}</h2>
          <ul className="in-list">
            {troubled.map(({ sp, bars }) => (
              <li key={sp.id}>
                <span className="in-text">
                  <b dir="auto">{sp.piece.title}</b>
                  <small>
                    {tx.bars} {bars.map((b) => sp.piece.bars[b]?.number ?? b + 1).join(', ')}
                  </small>
                </span>
                <button className="btn ghost small" onClick={onPieces}>
                  {tx.practise}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Spark({ pts }: { pts: number[] }) {
  const lo = Math.min(...pts) - 10;
  const hi = Math.max(...pts) + 10;
  const W = 300;
  const H = 50;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * W).toFixed(1)},${(H - ((p - lo) / (hi - lo)) * H).toFixed(1)}`).join(' ');
  return (
    <svg className="in-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ direction: 'ltr' }}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function HandMap({ model, tx }: { model: PlayerModel; tx: (typeof TX)['en'] }) {
  const f = (h: string, n: number) => model.stats[`f:${h}${n}`];
  const any = [1, 2, 3, 4, 5].some((n) => (f('R', n)?.vn ?? 0) >= 10 || (f('L', n)?.vn ?? 0) >= 10);
  if (!any) return null;
  const cell = (h: string, n: number) => {
    const s = f(h, n);
    if (!s || s.vn < 10) return <span key={n} className="in-finger na">{n}</span>;
    const pct = Math.round((s.vMean - 1) * 100);
    const cls = pct <= -10 ? 'weak' : pct >= 10 ? 'strong' : 'ok';
    return (
      <span key={n} className={`in-finger ${cls}`} title={`${pct > 0 ? '+' : ''}${pct}%`}>
        {n}
        <small dir="ltr">
          {pct > 0 ? '+' : ''}
          {pct}%
        </small>
      </span>
    );
  };
  return (
    <section className="set-card" data-hand-map="1">
      <h2>{tx.hands}</h2>
      <small className="field-hint">{tx.handsHint}</small>
      <div className="in-hands" dir="ltr">
        <div className="in-hand">
          <b>L</b>
          {[5, 4, 3, 2, 1].map((n) => cell('L', n))}
        </div>
        <div className="in-hand">
          <b>R</b>
          {[1, 2, 3, 4, 5].map((n) => cell('R', n))}
        </div>
      </div>
    </section>
  );
}

function KeyMap({ model, tx }: { model: PlayerModel; tx: (typeof TX)['en'] }) {
  const ks = KEYS_5THS.map((pc) => ({ pc, s: model.stats[`k:${pc}`] })).filter((x) => x.s && x.s.n >= 15);
  if (ks.length < 3) return null;
  const max = Math.max(0.05, ...ks.map((x) => x.s!.err));
  return (
    <section className="set-card" data-key-map="1">
      <h2>{tx.keys}</h2>
      <small className="field-hint">{tx.keysHint}</small>
      {/* 0.61: the keys on the circle of fifths; the warmer and bigger the note head, the more mistakes there. */}
      <svg className="in-circle" viewBox="-130 -130 260 260" role="img" aria-label={tx.keys} style={{ direction: 'ltr' }}>
        <circle r={92} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.25} />
        {KEYS_5THS.map((pc, i) => {
          const s = model.stats[`k:${pc}`];
          const v = s && s.n >= 15 ? s.err / max : null;
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * 92;
          const y = Math.sin(a) * 92;
          const r = v === null ? 15 : 15 + v * 9;
          const fill = v === null ? 'var(--card-2)' : v > 0.66 ? '#FF5FA2' : v > 0.33 ? '#FFD43B' : '#12C9B4';
          return (
            <g key={pc} className={`in-ck ${v === null ? 'na' : ''}`}>
              <title>{v === null ? KEY_N[pc] : `${KEY_N[pc]} · ${Math.round(s!.err * 100)}%`}</title>
              <ellipse cx={x} cy={y} rx={r * 1.25} ry={r} transform={`rotate(-20 ${x} ${y})`} fill={fill} stroke="var(--ink-c)" strokeWidth={2.5} />
              <text x={x} y={y + 5} textAnchor="middle">
                {KEY_N[pc]}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function GrooveBars({ g, tx }: { g: GrooveModel; tx: (typeof TX)['en'] }) {
  const rows = ['beat', '8', '16', 'trip'].map((k) => ({ k, s: g.stats[`sub:${k}`] })).filter((x) => x.s && x.s.n >= 8);
  const R = 60; // ms shown each side
  return (
    <div className="in-groove" dir="ltr">
      {rows.map(({ k, s }) => {
        const m = Math.max(-R, Math.min(R, s!.mean));
        const sd = Math.min(R, Math.sqrt(s!.varr));
        return (
          <div key={k} className="in-g-row" data-groove-sub={k}>
            <span className="in-g-lab">{tx.sub[k]}</span>
            <span className="in-g-track">
              <i className="in-g-zero" />
              <i className="in-g-spread" style={{ left: `${50 + ((m - sd) / R) * 50}%`, width: `${(sd / R) * 100}%` }} />
              <i className="in-g-dot" style={{ left: `${50 + (m / R) * 50}%` }} />
            </span>
            <b>
              {m > 0 ? '+' : ''}
              {Math.round(m)}
            </b>
          </div>
        );
      })}
      <div className="in-g-axis">
        <span>← {tx.early}</span>
        <span>{tx.late} →</span>
      </div>
    </div>
  );
}

function WeekLine({ g, tx }: { g: GrooveModel; tx: (typeof TX)['en'] }) {
  const ws = Object.entries(g.weeks).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  if (ws.length < 2) return null;
  return (
    <div className="in-weeks">
      <small className="field-hint">{tx.weeks}</small>
      <Spark pts={ws.map(([, s]) => Math.sqrt(s.varr))} />
    </div>
  );
}
