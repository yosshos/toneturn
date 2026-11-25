// The stage strip (SPEC-KEY-SESSION-2 §6): a thin row above the music — the stages passed (a tick and their count), the
// current one marked, the next one, and how many more (S6: one line on a 375 px phone, no ellipsis) — and under it, on the
// speed stage, the tempo bar: ♩ now → the target in the note value being played (U9), the best of this visit marked,
// filling from the line's start side (right in Hebrew). A passed tick rises a little (none with reduced motion).
import { useRef } from 'react';
import type { StageView } from '../engine/drills/keyCoach';
import { UNIT } from '../engine/drills/coachPhrases';

type Lang = 'en' | 'he';

export function StageStrip({ view, lang }: { view: StageView; lang: Lang }) {
  const he = lang === 'he';
  const t = view.tempo;
  const all = view.stages;
  const nowAt = all.findIndex((s) => s.state === 'now');
  const done = all.filter((s) => s.state === 'done');
  const next = all.slice(nowAt + 1).filter((s) => s.state === 'todo');
  const more = Math.max(0, next.length - 1);
  // the tick rises only when a stage has just passed (not on every render)
  const prevDone = useRef(done.length);
  const rose = done.length > prevDone.current;
  prevDone.current = done.length;
  // the bar from the stage's start to its target
  const lo = t ? Math.min(t.startNps, t.nowNps) : 0;
  const pct = (x: number) => (t && t.targetNps > lo ? Math.max(0, Math.min(100, ((x - lo) / (t.targetNps - lo)) * 100)) : 100);
  const unit = t ? UNIT[t.per]?.[lang] : '';
  // the target in the note value it will be played at (eighths above ♩120 quarters, #9)
  const tUnit = t ? UNIT[t.targetPer]?.[lang] : '';
  return (
    <div className="stage-strip" data-stage-strip={all[nowAt]?.code ?? ''}>
      {all.length > 1 && (
        <ol className="ss-row" aria-label={he ? `שלב ${nowAt + 1} מתוך ${all.length}` : `Stage ${nowAt + 1} of ${all.length}`}>
          {done.length > 0 && (
            <li className="ss-chip done" data-stage-done={done.length} title={done.map((s) => s.name[lang]).join(' · ')}>
              <span className={`ss-tick ${rose ? 'rise' : ''}`} aria-hidden="true">✓</span>
              <span>{done.length === 1 ? done[0].name[lang] : he ? `${done.length} שלבים` : `${done.length} stages`}</span>
            </li>
          )}
          {nowAt >= 0 && (
            <li className="ss-chip now" data-stage={all[nowAt].code} data-stage-state="now" aria-current="step">
              <bdi>{nowAt + 1}</bdi> <span>{all[nowAt].name[lang]}</span>
            </li>
          )}
          {next[0] && (
            <li className="ss-chip todo" data-stage={next[0].code} data-stage-state="todo">
              {next[0].name[lang]}
            </li>
          )}
          {more > 0 && <li className="ss-chip more">+{more}</li>}
        </ol>
      )}
      {t && (
        <div className="ss-tempo" data-stage-tempo={t.now} role="img" aria-label={he ? `טמפו ♩${t.now} ${unit}, יעד ♩${t.target} ${tUnit}` : `Tempo ♩${t.now} ${unit}, target ♩${t.target} ${tUnit}`}>
          <span className="ss-now">
            <bdi dir="ltr">♩{t.now}</bdi> <small>{unit}</small>
          </span>
          <span className="ss-bar">
            <i className="ss-fill" style={{ width: `${pct(t.nowNps)}%` }} />
            {t.bestNps > 0 && <i className="ss-best" style={{ insetInlineStart: `${pct(t.bestNps)}%` }} title={he ? `הכי טוב ♩${t.best} ${unit}` : `Best ♩${t.best} ${unit}`} />}
          </span>
          <span className="ss-target">
            {he ? 'יעד' : 'target'} <bdi dir="ltr">♩{t.target}</bdi>
            {t.targetPer !== t.per && tUnit ? <small> {tUnit}</small> : null}
          </span>
        </div>
      )}
    </div>
  );
}
