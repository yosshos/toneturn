// A/B compare (SPEC-PHRASE-STUDIO §6.6; screen docs/phrase-studio-preview slide 19): two takes of the same item (or any
// two), aligned by bars (or by onsets for free takes), both rolls stacked with the differences marked — tangerine lines
// for timing against the other take, pink for notes the other take does not have — "A ↔ B alternating" or "in a row",
// and one line of measured change: tempo, accuracy, timing spread. Below, the item's progress over time as a small
// chart (each point plays that take). One phone screen (320×720).

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import '../recordings2.css';
import { getTake, getTakeAudio, listHeads, takeTitle, takesOfItem, unpackNotes, type RecTake, type TakeHead } from '../storage/recordings';
import { alignTakes, compareDeltas, comparePlan, progressPoints, type Aligned, type CmpTake } from '../engine/recCompare';
import { piano } from './services';
import { Bidi, RIcon } from './Recordings';
import { takeTimeline } from './RecPlaylists';

type Lang = 'en' | 'he';
const N = ({ children }: { children: ReactNode }) => <bdi dir="ltr">{children}</bdi>;
const TX = {
  title: { en: 'Compare', he: 'השוואה' },
  alt: { en: 'A ↔ B alternating', he: 'A ↔ B לסירוגין' },
  row: { en: 'In a row', he: 'ברצף' },
  play: { en: 'Play both', he: 'לנגן את שניהם' },
  stop: { en: 'Stop', he: 'לעצור' },
  tempo: { en: 'Tempo', he: 'טמפו' },
  acc: { en: 'Accuracy', he: 'דיוק' },
  spread: { en: 'Timing spread', he: 'פיזור תזמון' },
  ms: { en: 'ms', he: 'מ״ש' },
  pick: { en: 'Compare with…', he: 'להשוות עם…' },
  same: { en: 'Takes of the same item', he: 'ניסיונות של אותו פריט' },
  any: { en: 'Recent takes', he: 'ניסיונות אחרונים' },
  progress: { en: 'Progress of this item', he: 'ההתקדמות של הפריט' },
  kept: { en: 'kept takes · tap a point to open it', he: 'ניסיונות שמורים · נגיעה בנקודה פותחת אותו' },
  aligned: { en: 'aligned by bars', he: 'מיושר לפי תיבות' },
  alignedOn: { en: 'aligned by onsets', he: 'מיושר לפי פתיחות' },
  back: { en: 'Back', he: 'חזרה' },
  missing: { en: 'This take is not on this device.', he: 'הניסיון הזה לא במכשיר.' },
};

const toCmp = (t: RecTake): CmpTake => ({ notes: unpackNotes(t.notes).map((n) => ({ pitch: n.pitch, on: n.on, off: n.off, vel: n.vel })), bpm: t.bpm, meter: t.meter, result: t.result ?? null, at: t.at });
const dm = (iso: string) => iso.slice(8, 10) + '.' + iso.slice(5, 7);
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

export function CompareScreen({ lang, a, b, onBack, onOpen }: { lang: Lang; a: string; b: string | null; onBack: () => void; onOpen: (id: string) => void }) {
  const [A, setA] = useState<RecTake | null | undefined>(undefined);
  const [B, setB] = useState<RecTake | null | undefined>(undefined);
  useEffect(() => void getTake(a).then(setA), [a]);
  useEffect(() => {
    if (b) void getTake(b).then(setB);
    else setB(null);
  }, [b]);
  const head = (sub?: ReactNode) => (
    <header className="screen-head rec-head">
      <button className="icon-btn" onClick={onBack} aria-label={TX.back[lang]}>
        <span className="flip-rtl">←</span>
      </button>
      <div className="rec-ptitle">
        <h1>{TX.title[lang]}</h1>
        {sub && <small>{sub}</small>}
      </div>
    </header>
  );
  if (A === undefined || (b && B === undefined)) return <main className="panel-screen recordings rec-compare" data-recordings="compare" />;
  if (!A)
    return (
      <main className="panel-screen recordings rec-compare" data-recordings="compare">
        {head()}
        <p className="rec-empty">{TX.missing[lang]}</p>
      </main>
    );
  if (!B) return <ComparePicker lang={lang} A={A} head={head(<Bidi text={takeTitle(A, lang)} />)} />;
  return <CompareBody lang={lang} A={A} B={B} head={head(<Bidi text={takeTitle(A, lang)} />)} onOpen={onOpen} />;
}

function ComparePicker({ lang, A, head }: { lang: Lang; A: RecTake; head: ReactNode }) {
  const [same, setSame] = useState<RecTake[]>([]);
  const [any, setAny] = useState<TakeHead[]>([]);
  useEffect(() => {
    if (A.itemId) void takesOfItem(A.itemId).then((ts) => setSame(ts.filter((t) => t.id !== A.id).reverse()));
    void listHeads({}).then((hs) => setAny(hs.filter((h) => h.id !== A.id && !h.deletedAt).slice(0, 20)));
  }, [A]);
  const go = (id: string) => (location.hash = `/recordings/compare/${encodeURIComponent(A.id)}~${encodeURIComponent(id)}`);
  const row = (t: Pick<TakeHead, 'id' | 'at' | 'title' | 'result'>) => (
    <li key={t.id}>
      <button className="rec-folder-row" onClick={() => go(t.id)} data-rec-cmp-pick={t.id}>
        <span className="grow">
          <Bidi text={takeTitle(t, lang)} />
        </span>
        <small>
          <N>{dm(t.at)}</N>
          {t.result?.bpm ? <N> · ♩{Math.round(t.result.bpm)}</N> : null}
        </small>
      </button>
    </li>
  );
  return (
    <main className="panel-screen recordings rec-compare" data-recordings="compare-pick">
      {head}
      <h2 className="rec-cmp-h">{TX.pick[lang]}</h2>
      {same.length > 0 && (
        <>
          <small className="rec-note">{TX.same[lang]}</small>
          <ul className="rec-history">{same.map(row)}</ul>
        </>
      )}
      <small className="rec-note">{TX.any[lang]}</small>
      <ul className="rec-history">{any.filter((h) => !same.some((s) => s.id === h.id)).map(row)}</ul>
    </main>
  );
}

/** One take's roll on the shared axis, with the differences to the other take marked. */
function RollSvg({ al, which, notes, lo, hi, playhead }: { al: Aligned; which: 'A' | 'B'; notes: { pitch: number }[]; lo: number; hi: number; playhead: number | null }) {
  const W = 320;
  const H = 64;
  const pos = which === 'A' ? al.posA : al.posB;
  const other = which === 'A' ? al.posB : al.posA;
  const m = which === 'A' ? al.matchA : al.matchB;
  const [s0, s1] = al.span;
  const x = (p: number) => ((p - s0) / Math.max(0.01, s1 - s0)) * W;
  const y = (pitch: number) => H - 6 - ((pitch - lo) / Math.max(1, hi - lo)) * (H - 12);
  const bars = al.barLen ? Array.from({ length: Math.max(0, Math.floor((s1 - Math.max(0, s0)) / al.barLen) + 1) }, (_, i) => i * al.barLen!) : [];
  return (
    <svg className="rec-cmp-roll" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={which} data-rec-cmp-roll={which} data-rec-cmp-wrong={m.filter((j) => j < 0).length}>
      <rect x="0" y="0" width={W} height={H} className="rec-cmp-bg" rx="6" />
      {bars.map((b) => (
        <line key={b} x1={x(b)} x2={x(b)} y1="0" y2={H} className="rec-cmp-bar" />
      ))}
      {notes.map((n, i) => {
        const j = m[i];
        const xx = x(pos[i]);
        const yy = y(n.pitch);
        return (
          <g key={i}>
            {j >= 0 && Math.abs(other[j] - pos[i]) > (al.barLen ? 0.06 : 0.025) && <line x1={xx} x2={x(other[j])} y1={yy} y2={yy} className="rec-cmp-dev" />}
            <rect x={xx - 1} y={yy - 3} width={5} height={6} rx={1.5} className={j < 0 ? 'rec-cmp-wrong' : 'rec-cmp-note'} />
          </g>
        );
      })}
      {playhead !== null && <line x1={x(playhead)} x2={x(playhead)} y1="0" y2={H} className="rec-cmp-now" />}
    </svg>
  );
}

function CompareBody({ lang, A, B, head, onOpen }: { lang: Lang; A: RecTake; B: RecTake; head: ReactNode; onOpen: (id: string) => void }) {
  const ca = useMemo(() => toCmp(A), [A]);
  const cb = useMemo(() => toCmp(B), [B]);
  const al = useMemo(() => alignTakes(ca, cb), [ca, cb]);
  const d = useMemo(() => compareDeltas(ca, cb, al), [ca, cb, al]);
  const sa = useMemo(() => [...ca.notes].sort((x, y) => x.on - y.on), [ca]);
  const sb = useMemo(() => [...cb.notes].sort((x, y) => x.on - y.on), [cb]);
  const all = [...sa, ...sb].map((n) => n.pitch);
  const lo = Math.min(...all, 60) - 1;
  const hi = Math.max(...all, 67) + 1;
  const [mode, setMode] = useState<'alt' | 'row'>('alt');
  const [playing, setPlaying] = useState<'A' | 'B' | null>(null);
  const [ph, setPh] = useState<number | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const [hist, setHist] = useState<RecTake[] | null>(null);
  useEffect(() => {
    if (A.itemId) void takesOfItem(A.itemId).then(setHist);
  }, [A.itemId]);
  const stop = () => {
    ctl.current?.abort();
    ctl.current = null;
    setPlaying(null);
    setPh(null);
  };
  useEffect(() => () => ctl.current?.abort(), []);
  const playOne = async (t: RecTake, which: 'A' | 'B', sig: AbortSignal) => {
    setPlaying(which);
    const pos = which === 'A' ? al.posA : al.posB;
    const [p0, p1] = [Math.min(...pos, 0), Math.max(...pos, 0.1)];
    const t0 = performance.now();
    const unit = al.barLen ? 60 / (t.bpm ?? 120) : 1;
    let raf = 0;
    const tick = () => {
      const s = (performance.now() - t0) / 1000;
      setPh(p0 + s / unit);
      if (!sig.aborted) raf = requestAnimationFrame(tick);
    };
    if (t.audioId) {
      const blob = await getTakeAudio(t.id);
      if (!blob || sig.aborted) return;
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      raf = requestAnimationFrame(tick);
      await new Promise<void>((res) => {
        el.onended = () => res();
        sig.addEventListener('abort', () => (el.pause(), res()), { once: true });
        void el.play().catch(() => res());
      });
      URL.revokeObjectURL(url);
    } else {
      await piano.unlock();
      const tl = takeTimeline(t, 'me');
      raf = requestAnimationFrame(tick);
      await piano.play(tl.events, Math.min(tl.seconds, (p1 - p0) * unit + 1), sig).catch(() => {});
    }
    cancelAnimationFrame(raf);
  };
  const playBoth = async () => {
    if (playing) return stop();
    const c = new AbortController();
    ctl.current = c;
    for (const seg of comparePlan(mode, [0, 0], [0, 0], 2)) {
      if (c.signal.aborted) break;
      await playOne(seg.take === 'A' ? A : B, seg.take, c.signal);
      if (!c.signal.aborted) await new Promise((r) => setTimeout(r, 450));
    }
    if (ctl.current === c) stop();
  };
  const line = (lbl: string, a: string, b: string, k: string) => (
    <div className="rec-kv" data-rec-cmp-delta={k}>
      <span>{lbl}</span>
      <b dir="ltr">
        {a} → {b}
      </b>
    </div>
  );
  const pts = hist ? progressPoints(hist.map((t) => ({ ...toCmp(t), id: t.id, at: t.at }))) : [];
  return (
    <main className="panel-screen recordings rec-compare" data-recordings="compare" data-rec-cmp-method={al.method}>
      {head}
      {(['A', 'B'] as const).map((w) => {
        const t = w === 'A' ? A : B;
        return (
          <div key={w} className={`rec-cmp-card ${playing === w ? 'on' : ''}`}>
            <div className="rec-cmp-row">
              <span className={`rec-pill ${w === 'B' ? 'ac' : ''}`}><N>{w}</N></span>
              <small className="grow">
                <N>{dm(t.at)}</N>
                {d.tempo[w === 'A' ? 0 : 1] ? <N> · ♩{d.tempo[w === 'A' ? 0 : 1]}</N> : null}
              </small>
              <button className="icon-btn small" onClick={() => (playing ? stop() : (() => {
                const c = new AbortController();
                ctl.current = c;
                void playOne(t, w, c.signal).then(() => ctl.current === c && stop());
              })())} aria-label={`${w}`} data-rec-cmp-play={w}>
                <RIcon k={playing === w ? 'pause' : 'play'} size={16} fill={playing !== w} />
              </button>
            </div>
            <RollSvg al={al} which={w} notes={w === 'A' ? sa : sb} lo={lo} hi={hi} playhead={playing === w ? ph : null} />
          </div>
        );
      })}
      <div className="rec-cmp-ctl">
        <div className="ps-seg" role="radiogroup" aria-label={TX.title[lang]}>
          {(['alt', 'row'] as const).map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)} data-rec-cmp-mode={m}>
              {m === 'alt' ? <Bidi text={TX.alt[lang]} /> : TX.row[lang]}
            </button>
          ))}
        </div>
        <button className="icon-btn rec-cmp-both" onClick={() => void playBoth()} aria-label={playing ? TX.stop[lang] : TX.play[lang]} data-rec-cmp-both="1">
          <RIcon k={playing ? 'pause' : 'play'} fill={!playing} />
        </button>
      </div>
      <div className="rec-cmp-kv">
        {line(TX.tempo[lang], d.tempo[0] ? `♩${d.tempo[0]}` : '—', d.tempo[1] ? `♩${d.tempo[1]}` : '—', 'tempo')}
        {line(TX.acc[lang], pct(d.acc[0]), pct(d.acc[1]), 'acc')}
        {line(`${TX.spread[lang]} (${TX.ms[lang]})`, d.spread[0] === null ? '—' : String(d.spread[0]), d.spread[1] === null ? '—' : String(d.spread[1]), 'spread')}
        <small className="rec-note">{al.method === 'bars' ? TX.aligned[lang] : TX.alignedOn[lang]}</small>
      </div>
      {pts.length >= 2 && <ProgressChart lang={lang} pts={pts} current={[A.id, B.id]} onOpen={onOpen} />}
    </main>
  );
}

/** Tempo of each kept take of an item over time (accuracy as the dot's fill); tap a point to open it. */
export function ProgressChart({ lang, pts, current = [], onOpen }: { lang: Lang; pts: { id: string; at: string; bpm: number | null; acc: number | null }[]; current?: string[]; onOpen: (id: string) => void }) {
  const W = 300;
  const H = 92;
  const ok = pts.filter((p) => p.bpm);
  if (ok.length < 2) return null;
  const lo = Math.min(...ok.map((p) => p.bpm!));
  const hi = Math.max(...ok.map((p) => p.bpm!), lo + 4);
  const x = (i: number) => 18 + (i / Math.max(1, ok.length - 1)) * (W - 36);
  const y = (b: number) => H - 20 - ((b - lo) / (hi - lo)) * (H - 36);
  return (
    <div className="rec-cmp-chart" data-rec-progress={ok.length}>
      <small className="rec-note">
        {TX.progress[lang]} · <N>{ok.length}</N> {TX.kept[lang]}
      </small>
      <svg viewBox={`0 0 ${W} ${H}`} className="rec-chart-svg" role="img" aria-label={TX.progress[lang]} direction="ltr">
        <rect x="1" y="1" width={W - 2} height={H - 2} rx="8" className="rec-cmp-bg" />
        <polyline points={ok.map((p, i) => `${x(i)},${y(p.bpm!)}`).join(' ')} className="rec-chart-line" />
        {ok.map((p, i) => (
          <circle key={p.id} cx={x(i)} cy={y(p.bpm!)} r={current.includes(p.id) ? 6 : 4.5} className={`rec-chart-dot ${p.acc !== null && p.acc >= 0.9 ? 'hi' : ''} ${current.includes(p.id) ? 'cur' : ''}`} onClick={() => onOpen(p.id)} role="button" aria-label={`${dm(p.at)} ♩${p.bpm}`} />
        ))}
        <text x={W - 10} y="14" textAnchor="end" className="rec-chart-t">
          ♩{hi}
        </text>
        <text x="12" y={H - 6} className="rec-chart-d">
          {dm(ok[0].at)}
        </text>
        <text x={W - 10} y={H - 6} textAnchor="end" className="rec-chart-d">
          {dm(ok[ok.length - 1].at)}
        </text>
      </svg>
    </div>
  );
}
