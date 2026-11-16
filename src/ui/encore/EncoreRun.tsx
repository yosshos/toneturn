// The practice run of a phrase (SPEC-PHRASE-STUDIO §7.2, §8.1–8.3) on the drills engine: free time, quarters, then the
// tempo ladder with count-in, click and the now-cue (DrillTake), live marks on the notes, one-line feedback
// (TakeReview), the worst bar looped at 90 %, the ladder strip of this key. Each take is measured and handed to the
// app (XP with the phrase's own difficulty and daily cap, the rating event, the diary).

import { useRef, useState } from 'react';
import type { Drill, ItemState, PlayedNote, TakeMetrics } from '../../engine/drills/types';
import { applyTake, newItem, type LadderResult } from '../../engine/drills/ladder';
import { hasQuarters, quartersDrill, QUARTERS_BPM, skipRubato, withStageTake } from '../../engine/drills/rubato';
import { loopBpm, sliceDrill } from '../../engine/drills/slice';
import type { RatingEvent } from '../../engine/rating';
import type { Lick, LickBook, LickInstrument } from '../../engine/licks';
import type { Settings } from '../../storage/progress';
import { finalHand, keyOrder, keyStage, keyStartBpm, phraseDrill, phraseNeck, phraseRungs, planOf, type Hand } from '../../engine/encore/phrase';
import { midi } from '../../speech/midi';
import { phraseTake, type TakeOutcome } from '../../engine/encore/connect';
import { DrillTake } from '../DrillTake';
import { RubatoTake } from '../RubatoTake';
import { TakeReview } from '../TakeReview';
import { DrillScore, drillSettingsOf } from '../Drills';
import { calOf } from '../LickTrainer';
import { barMarks, worstBar } from '../ErrorMap';
import { KeyB, Tempo, type Lang } from './bits';
import type { LiveTake } from '../../engine/drills/liveGrade';
import { keepPhrase } from '../../engine/encore/takeSource';
import { badge } from '../../engine/encore/difficulty';
import { postPhraseYours } from '../../cloud/community';

export type EncoreTakeFn = (st: ItemState, evs: RatingEvent[], xp: number, m: { verdict: string; hands: string; cv: number | null }) => void;

export function EncoreRun({
  lang,
  settings,
  l,
  keyPc,
  hand: hand0,
  items,
  inst = 'piano',
  onTake,
  onBook,
  onYours,
  onNextKey,
}: {
  lang: Lang;
  settings: Settings;
  l: Lick;
  keyPc: number;
  hand?: Hand;
  items: Record<string, ItemState>;
  inst?: LickInstrument;
  onTake: EncoreTakeFn;
  onBook: (b: LickBook) => void;
  onYours: () => void;
  onNextKey: (key: number, hand: Hand) => void;
  onClose?: () => void;
}) {
  const he = lang === 'he';
  const hand = hand0 ?? finalHand(l);
  const ds = drillSettingsOf(settings);
  const cal = calOf(settings);
  const local = useRef<Record<string, ItemState>>({});
  const all = (): Record<string, ItemState> => ({ ...items, ...local.current });
  const drill: Drill = phraseDrill(l, keyPc, hand, { inst, startBpm: keyStartBpm(l, all(), keyPc, inst, hand), band: planOf(l).band });
  const stateOf = () => local.current[drill.itemId] ?? items[drill.itemId] ?? newItem(drill);
  const plan = planOf(l);
  const [bpm, setBpm] = useState(() => Math.max(drill.startBpm, Math.min(plan.goalBpm, stateOf().goalBpm || drill.startBpm)));
  const [res, setRes] = useState<{ m: TakeMetrics; lad: LadderResult | null; out: TakeOutcome; stage: 'free' | 'quarters' | 'tempo'; line: string } | null>(null);
  const [take, setTake] = useState(0);
  const [again, setAgain] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [live, setLive] = useState<LiveTake | null>(null);
  const [counting, setCounting] = useState(false);
  const [loop, setLoop] = useState<{ bar: number; res: TakeMetrics | null } | null>(null);
  const session = useRef(Date.now().toString(36));
  const n = useRef(0);
  const played = useRef<PlayedNote[]>([]);
  const book = useRef<LickBook | undefined>(settings.lickBook);
  const stage = keyStage(l, all(), keyPc, inst, hand, hasQuarters(drill));
  const takeDrill = stage === 'quarters' ? quartersDrill(drill) : drill;
  const order = keyOrder(l, plan, inst);
  const ki = order.indexOf(keyPc);
  const rungs = phraseRungs({ startBpm: drill.startBpm, goalBpm: plan.goalBpm });

  const settle = (m: TakeMetrics, st: 'free' | 'quarters' | 'tempo', usedBpm: number, p: PlayedNote[]) => {
    played.current = p;
    const before = all();
    const st0 = stateOf();
    let lad: LadderResult | null = null;
    let next: ItemState;
    if (st === 'tempo') {
      lad = applyTake(st0, m, usedBpm, new Date().toISOString(), ds, { targetBpm: plan.goalBpm, slower: usedBpm < (st0.goalBpm ?? 0) * 0.99 });
      next = lad.state;
    } else next = withStageTake(st0, st, m);
    local.current[drill.itemId] = next;
    const after = { ...before, [drill.itemId]: next };
    const out = phraseTake({ l, key: keyPc, hand, inst, stage: st, m, bpm: usedBpm, before, after, book: book.current, now: new Date().toISOString(), sessionId: session.current, index: n.current++ });
    book.current = out.book;
    onTake(next, out.events, out.xp, { verdict: m.verdict, hands: hand, cv: null });
    onBook(out.book);
    const line =
      st === 'tempo'
        ? lad!.message[lang]
        : m.verdict !== 'clean'
          ? he
            ? 'בלי למהר — שוב.'
            : 'No rush — again.'
          : keyStage(l, after, keyPc, inst, hand, hasQuarters(drill)) === 'quarters'
            ? he
              ? 'עכשיו בזמן: ברבעים, ♩60.'
              : 'Now in time: quarters at ♩60.'
            : keyStage(l, after, keyPc, inst, hand, hasQuarters(drill)) === null
              ? he
                ? `מוכנים לטמפו: ♩${next.goalBpm || drill.startBpm}.`
                : `Ready for tempo: ♩${next.goalBpm || drill.startBpm}.`
              : he
                ? 'עוד פעם אחת נקייה בלי קצב.'
                : 'One more clean take in free time.';
    setRes({ m, lad, out, stage: st, line: out.bonus || out.completion ? `${line} +${out.bonus + out.completion} XP` : line });
    if (lad) setBpm(Math.max(drill.startBpm, Math.min(plan.goalBpm, lad.next.bpm)));
    if (out.yours) {
      // friends' activity (flagged until the server migration is applied: postPhraseYours)
      const b = badge(l, inst);
      void postPhraseYours(l.id, { grade: b.grade, bpm: plan.goalBpm, inst }).catch(() => {});
      window.setTimeout(onYours, 900);
    }
  };

  const head = (
    <div className="enc-run-head" data-run-key={keyPc} data-run-hand={hand}>
      <span className="ch on enc-key">
        <KeyB k={keyPc} minor={!!l.minor} />
      </span>
      <span className="ch" data-stage={stage ?? 'tempo'}>
        {stage === 'free' ? (he ? 'בלי קצב' : 'Free time') : stage === 'quarters' ? <Tempo bpm={QUARTERS_BPM} /> : (
          <bdi dir="ltr">
            ♩{bpm} → {plan.goalBpm}
          </bdi>
        )}
      </span>
      {(inst === 'guitar' || inst === 'bass') && (
        <span className="ch gh" data-run-pos={phraseNeck(l, keyPc, inst).pos}>
          {phraseNeck(l, keyPc, inst).pos ? <>{he ? 'פוז׳' : 'pos.'} <bdi dir="ltr">{phraseNeck(l, keyPc, inst).pos}</bdi></> : he ? 'פתוחה' : 'open'}
        </span>
      )}
      {inst === 'piano' && (hand !== 'R' || l.lh?.length) ? <span className="ch gh">{hand === 'R' ? (he ? 'יד ימין' : 'RH') : hand === 'L' ? (he ? 'יד שמאל' : 'LH') : he ? 'שתי ידיים' : 'Hands'}</span> : null}
      <span className="grow" />
      <small className="tiny">
        {he ? 'סולם' : 'Key'} <bdi dir="ltr">{ki + 1}</bdi> {he ? 'מתוך' : 'of'} <bdi dir="ltr">{order.length}</bdi>
      </small>
    </div>
  );
  const strip = (
    <ol className="enc-ladder" dir="ltr" aria-label={he ? 'שלבי טמפו' : 'tempo steps'} data-ladder-rungs={rungs.length}>
      {rungs.map((r) => {
        const best = Math.max(stateOf().cleanBpm ?? 0, ...(stateOf().passLog ?? []).map((x) => x.bpm));
        const done = best >= r * 0.95;
        const cur = !stage && !done && r <= bpm + 1 && rungs.filter((x) => x <= bpm + 1).pop() === r;
        return (
          <li key={r} className={`${done ? 'done' : ''} ${cur ? 'cur' : ''}`}>
            <bdi dir="ltr">{r}</bdi>
          </li>
        );
      })}
    </ol>
  );

  if (loop) {
    const ld = sliceDrill(drill, loop.bar, loop.bar);
    const lb = loopBpm(bpm);
    return (
      <div className="drill-run enc-run" data-drill={drill.itemId} data-loop={loop.bar + 1}>
        {head}
        <p className="loop-bar">
          <b>{he ? 'לולאה' : 'Loop'}</b> {he ? 'תיבה' : 'bar'} <bdi dir="ltr">{loop.bar + 1}</bdi> · <Tempo bpm={lb} />
          <button className="link" onClick={() => (setLoop(null), setTake((t) => t + 1))}>
            {he ? 'כל המשפט' : 'Whole phrase'}
          </button>
        </p>
        <DrillScore drill={ld} ds={ds} result={loop.res} beat={loop.res ? -1 : beat} lang={lang} bpm={lb} live={loop.res ? null : live} cue={!loop.res && counting} />
        {!loop.res ? (
          <DrillTake key={`loop:${take}`} autoStart drill={ld} bpm={lb} lang={lang} cal={cal} onDone={(m) => (setBeat(-1), setLoop({ ...loop, res: m }))} onBeat={setBeat} liveMarks onLive={setLive} onCount={setCounting} drumsOk={settings.headphones} />
        ) : (
          <TakeReview m={loop.res} lang={lang} onAgain={() => (setLoop({ ...loop, res: null }), setTake((t) => t + 1))} onNext={() => (setLoop(null), setTake((t) => t + 1))} nextLabel={he ? 'כל המשפט' : 'Whole phrase'} />
        )}
      </div>
    );
  }

  const bm = res && res.stage === 'tempo' ? barMarks(takeDrill, res.m) : [];
  const wb = worstBar(bm);
  const nextAfter = () => {
    const a = all();
    const keys = keyOrder(l, plan, inst);
    // the next key not passed; else stay
    const idx = keys.indexOf(keyPc);
    const rest = [...keys.slice(idx + 1), ...keys.slice(0, idx)];
    const nk = rest.find((k) => (a[phraseDrill(l, k, hand, { inst }).itemId]?.passLog?.length ?? 0) < 3) ?? rest[0] ?? keyPc;
    onNextKey(nk, hand);
  };
  return (
    <div className="drill-run enc-run" data-drill={drill.itemId} data-run-stage={stage ?? 'tempo'}>
      {head}
      <DrillScore drill={takeDrill} ds={ds} result={res?.m} beat={res ? -1 : beat} lang={lang} bpm={stage === 'quarters' ? QUARTERS_BPM : bpm} live={res ? null : live} cue={!res && counting} loop={res && wb !== null ? [wb, wb] : null} />
      {!res && !stage && strip}
      {!res && stage && (
        <p className="drill-stage enc-stage" data-rubato-stage={stage}>
          <b>{stage === 'free' ? (he ? 'בלי קצב — הצלילים בלבד' : 'Free time — the notes only') : he ? 'ברבעים, ♩60' : 'Quarters at ♩60'}</b>
          <button
            className="link"
            onClick={() => {
              const next = skipRubato(stateOf());
              local.current[drill.itemId] = next;
              onTake(next, [], 0, { verdict: 'skip', hands: hand, cv: null });
              setTake((t) => t + 1);
            }}
            data-rubato-skip="1"
          >
            {he ? 'לדלג לטמפו' : 'Skip to tempo'}
          </button>
        </p>
      )}
      {!res && stage === 'free' && <RubatoTake key={`free:${take}`} autoStart={again} drill={drill} lang={lang} cal={cal} onDone={(m, p) => (setBeat(-1), settle(m, 'free', 0, p))} onBeat={setBeat} />}
      {!res && stage === 'quarters' && <DrillTake key={`q:${take}`} autoStart={again} drill={takeDrill} bpm={QUARTERS_BPM} lang={lang} cal={cal} onDone={(m, p) => (setBeat(-1), settle(m, 'quarters', QUARTERS_BPM, p))} onBeat={setBeat} liveMarks onLive={setLive} onCount={setCounting} drumsOk={settings.headphones} />}
      {!res && !stage && <DrillTake key={`t:${take}`} autoStart={again} drill={drill} bpm={bpm} lang={lang} cal={cal} onDone={(m, p) => (setBeat(-1), settle(m, 'tempo', bpm, p))} onBeat={setBeat} liveMarks={ds.liveMarks !== 'never'} onLive={setLive} onCount={setCounting} drumsOk={settings.headphones} />}
      {res && (
        <TakeReview
          m={res.m}
          lang={lang}
          free={res.stage === 'free'}
          next={res.line}
          onAgain={() => (setRes(null), setAgain(true), setTake((t) => t + 1))}
          onSlower={res.stage === 'tempo' ? () => (setRes(null), setAgain(true), setBpm((b) => Math.max(30, Math.round(b * 0.9))), setTake((t) => t + 1)) : undefined}
          onLoop={res.stage === 'tempo' && wb !== null && bm.length > 1 ? () => setLoop({ bar: wb, res: null }) : undefined}
          loopLabel={wb !== null ? `${wb + 1}` : undefined}
          onNext={nextAfter}
          onKeep={
            played.current.length >= 3 && res.stage === 'tempo'
              ? () => keepPhrase({ kind: 'phrase', instrument: inst, title: l.name, source: midi.devices.length && inst === 'piano' ? 'midi' : 'mic', notes: played.current.map((p) => ({ pitch: p.pitch, on: p.on, off: p.off, vel: p.vel })), bpm: res.m.bpm || bpm, t0: 0, meter: drill.meter, graded: true, itemId: drill.itemId, ...(drill.chart ? { chart: drill.chart.join(' | ') } : {}) }, wb !== null ? { from: wb * drill.meter, to: (wb + 1) * drill.meter } : null)
              : undefined
          }
        >
          {res.line && <p className="enc-after" data-after-line="1">{res.line}</p>}
        </TakeReview>
      )}
    </div>
  );
}
