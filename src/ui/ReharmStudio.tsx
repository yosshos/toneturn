// The reharm studio (docs/AUDIT-DEPTH-3.md C3): on the tune families' page (k-tune, g-tune, b-tune). Pick a head and a
// key, then a device per bar from the ones that fit there (tritone sub, extra ii–V, backdoor, passing dim, line cliché,
// Coltrane). Each change is checked against the melody at once (one short line per clash). Then play it: comp it
// (piano / guitar), walk it (bass), or the melody over the new chords — an ordinary drill (kind tn-own~<plan>), so it
// is measured and counts like any other take. Eight bars a page on the shared chord chart (COURSE-FEEDBACK-UI §4.7):
// tap a bar for its devices in a sheet. One phone screen.

import { useMemo, useState } from 'react';
import type { Drill, FamilyId } from '../engine/drills/types';
import { generate } from '../engine/drills/generate';
import { HEADS } from '../content/heads';
import { headIn } from '../engine/heads';
import { applicable, applyPlan, DEVICE_NAME, planCode, type Device, type Plan } from '../engine/reharm';
import { SERVED } from '../engine/drills/headDrills';
import { keyLabel } from '../engine/stdKey';
import { ChordChart } from './ChordChart';
import '../reharm.css';

type Lang = 'en' | 'he';
const FAMS: FamilyId[] = ['k-tune', 'g-tune', 'b-tune'];
const PER = 8;
const pretty = (s: string): string => s.replace(/([A-G])b/g, '$1♭').replace(/7b5/g, '7♭5').replace(/#/g, '♯');
const store = (k: string, v?: string): string | null => {
  try {
    if (v !== undefined) localStorage.setItem(k, v);
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

export function ReharmStudio({ family, lang, onRun }: { family: FamilyId; lang: Lang; onRun: (q: Drill[]) => void }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState<number>(() => {
    const v = Number(store('rh-studio:head'));
    return SERVED.includes(v) ? v : SERVED[0];
  });
  const [key, setKey] = useState<number>(() => HEADS[idx]?.home.key ?? 0);
  const [plan, setPlan] = useState<Plan>({});
  const [page, setPage] = useState(0);
  // The bar whose devices are open in the sheet.
  const [bar, setBar] = useState<number | null>(null);
  const hi = useMemo(() => headIn(HEADS[idx], key), [idx, key]);
  const r = useMemo(() => applyPlan(hi.text, plan, hi.tonic, hi.notes), [hi, plan]);
  if (!FAMS.includes(family)) return null;
  const L = (en: string, he: string) => (lang === 'he' ? he : en);
  const pages = Math.ceil(hi.bars.length / PER);
  const inst = family === 'g-tune' ? 'guitar' : family === 'b-tune' ? 'bass' : 'piano';
  const play = (mel: boolean) => {
    const kind = `${mel ? 'tn-ownmel' : 'tn-own'}~${planCode(plan)}`;
    const d = generate({ family, kind, key, hands: inst === 'piano' ? 'RL' : 'R', option: idx * 16, ...(inst === 'piano' ? {} : { instrument: inst }), ...(inst === 'bass' ? { perBeat: 1 } : {}), tempo: 60 });
    onRun([d]);
  };
  const choose = (bar: number, d: Device | null) => {
    const next = { ...plan };
    // A Coltrane sub takes two bars when it can: clear the bar it covers.
    delete next[bar];
    if (d) next[bar] = d;
    setPlan(next);
  };
  if (!open)
    return (
      <button className="btn ghost family-lesson" onClick={() => setOpen(true)} data-reharm-studio="open">
        {L('Reharm studio: your own reharm of a head', 'סטודיו הרמון: הרמון משלכם לשיר')}
      </button>
    );
  const first = page * PER;
  return (
    <section className="rh-studio" data-reharm-studio="panel">
      <div className="rh-top">
        <select
          aria-label={L('Head', 'שיר')}
          value={idx}
          onChange={(e) => {
            const v = Number(e.target.value);
            store('rh-studio:head', String(v));
            setIdx(v);
            setKey(HEADS[v].home.key);
            setPlan({});
            setPage(0);
          }}
        >
          {SERVED.map((i) => (
            <option key={i} value={i}>
              {HEADS[i].title[lang]}
            </option>
          ))}
        </select>
        <button className="icon-btn" aria-label={L('Close', 'סגירה')} onClick={() => setOpen(false)}>
          ×
        </button>
      </div>
      <div className="rh-nav">
        <select aria-label={L('Key', 'סולם')} value={key} onChange={(e) => (setKey(Number(e.target.value)), setPlan({}))} dir="ltr">
          {Array.from({ length: 12 }, (_, k) => (
            <option key={k} value={k}>
              {keyLabel({ key: k, minor: HEADS[idx].home.minor })}
            </option>
          ))}
        </select>
        <div className="tab-pager" dir="ltr">
          <button className="icon-btn" aria-label="Previous bars" disabled={page === 0} onClick={() => setPage(page - 1)}>
            ‹
          </button>
          <small>
            {first + 1}–{Math.min(hi.bars.length, first + PER)} / {hi.bars.length}
          </small>
          <button className="icon-btn" aria-label="Next bars" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
            ›
          </button>
        </div>
      </div>
      {/* COURSE-FEEDBACK-UI §4.7: the bars on the shared chord chart (four a row); a changed bar has a purple corner tab.
          Tap a bar: its devices open in a sheet (one screen, no chip rows under every bar). */}
      <ChordChart
        cells={hi.bars.slice(first, first + PER).map((_, j) => {
          const b = first + j;
          return { chord: r.bars[b], ...(r.changed.includes(b) ? { tab: { kind: 'changed' as const, rules: [] } } : {}) };
        })}
        first={first}
        meter={4}
        maxRows={2}
        lang={lang}
        onBar={(j) => setBar(first + j)}
        sel={bar !== null && bar >= first && bar < first + PER ? bar - first : null}
        attrs={{ 'data-rh-chart': hi.bars.length, 'data-rh-devices': hi.bars.slice(first, first + PER).map((_, j) => applicable(hi.text, first + j, hi.tonic).length).join(',') }}
      />
      {bar !== null && (
        <div className="sheet-backdrop" onClick={() => setBar(null)}>
          <div className="sheet rh-sheet" role="dialog" aria-modal="true" aria-label={`${L('Bar', 'תיבה')} ${bar + 1}`} onClick={(e) => e.stopPropagation()} data-rh-sheet={bar}>
            <div className="rh-sheet-head">
              <h2>
                <span>
                  {L('Bar', 'תיבה')} {bar + 1}
                </span>
                <bdi dir="ltr" className="rh-chords">
                  {pretty(r.bars[bar])}
                </bdi>
              </h2>
              <button className="icon-btn" aria-label={L('Close', 'סגירה')} onClick={() => setBar(null)} data-rh-sheet-close="1">
                ×
              </button>
            </div>
            {(() => {
              const opts = applicable(hi.text, bar, hi.tonic);
              const covered = r.changed.includes(bar) && plan[bar] === undefined;
              if (covered) return <p className="field-hint">{L('Changed by the device on the bar before.', 'שונתה בתחבולה של התיבה הקודמת.')}</p>;
              if (!opts.length) return <p className="field-hint">{L('No device fits this bar.', 'אין תחבולה שמתאימה לתיבה הזאת.')}</p>;
              return (
                <span className="rh-devs">
                  {opts.map((d) => (
                    <button key={d} className={`chip ${plan[bar] === d ? 'on' : ''}`} aria-pressed={plan[bar] === d} onClick={() => (choose(bar, plan[bar] === d ? null : d), setBar(null))} data-rh-device={d}>
                      {DEVICE_NAME[d][lang]}
                    </button>
                  ))}
                </span>
              );
            })()}
          </div>
        </div>
      )}
      <p className="rh-check" data-rh-conflicts={r.conflicts.length}>
        {r.conflicts.length ? r.conflicts[0].line[lang] + (r.conflicts.length > 1 ? L(` (+${r.conflicts.length - 1} more)`, ` (ועוד ${r.conflicts.length - 1})`) : '') : r.changed.length ? L('The melody fits every new chord.', 'המנגינה מתאימה לכל אקורד חדש.') : L('Pick a device on a bar.', 'בחרו תחבולה בתיבה.')}
      </p>
      <div className="rh-go">
        <button className="btn" disabled={!r.changed.length} onClick={() => play(false)} data-rh-play="comp">
          {inst === 'bass' ? L('Walk it', 'ווקינג עליו') : L('Comp it', 'ליווי')}
        </button>
        {inst !== 'bass' && (
          <button className="btn ghost" disabled={!r.changed.length} onClick={() => play(true)} data-rh-play="melody">
            {L('Melody over it', 'המנגינה מעליו')}
          </button>
        )}
      </div>
    </section>
  );
}
