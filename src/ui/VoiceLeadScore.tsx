// Voice-leading drills (k-vl, AUDIT-CONTENT-THEORY §ה.2) on one phone screen: the chord symbols (the one being played
// marked), the written first voicing (or the melody to keep on top), and after the take the voices as lanes — your
// voicings joined voice by voice, the smallest moves as hollow rings, the change that jumped marked.

import { useState } from 'react';
import type { Drill, TakeMetrics } from '../engine/drills/types';
import { chordSymbol, measuredOf, optimalPath, typeName } from '../engine/drills/voiceLead';
import { MINI_LESSONS } from '../content/minilessons';
import { VL_LEVEL_LESSON } from '../content/mini/voiceLead';
import { MiniLessonPlayer } from './MiniLesson';
import { STRINGS } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { NoteStaff } from './NoteViews';

type Lang = 'en' | 'he';
const keyPcOf = (sig: string) => (sig === 'C' ? null : { letter: sig[0] as 'C', acc: (sig.includes('b') ? -1 : sig.includes('#') ? 1 : 0) as -1 | 0 | 1 });
const MARK = { clean: '●', almost: '~', not: '✕' } as const;

export function VoiceLeadScore({ drill, result, beat = -1, lang }: { drill: Drill; result?: TakeMetrics | null; beat?: number; lang: Lang }) {
  const g = drill.goal.vl!;
  const syms = g.chords.map((c) => chordSymbol(c, g.flats));
  let cur = -1;
  if (beat >= 0 && !result) g.at.forEach((b, i) => (beat >= b - 1e-6 ? (cur = i) : null));
  const steps = result?.vl?.steps;
  const keyPc = keyPcOf(drill.keySig);
  const first = g.first ?? [];
  const melody = g.chords.every((c) => c.melody !== undefined) ? g.chords.map((c) => c.melody!) : null;
  const hi = first.filter((p) => p >= 57);
  const lo = first.filter((p) => p < 57);
  return (
    <div className="vl-score" data-vl-score={g.type}>
      <ol className="vl-chords" dir="ltr" aria-label={lang === 'he' ? 'אקורדים' : 'chords'}>
        {syms.map((s, i) => {
          const v = steps?.[i]?.verdict;
          return (
            <li key={i} className={`${i === cur ? 'now' : ''} ${v ? `v-${v}` : ''}`} data-vl-chord={i}>
              <b>{s}</b>
              {v && <span className="vl-mark" aria-label={v}>{MARK[v]}</span>}
            </li>
          );
        })}
      </ol>
      {result?.vl ? (
        <VoiceLanes drill={drill} result={result} lang={lang} />
      ) : (
        <div className="vl-start">
          <small className="vl-hint">
            {melody ? (lang === 'he' ? 'המנגינה למעלה בכל אקורד' : 'The melody on top of each chord') : lang === 'he' ? `מתחילים כאן, ואז ${typeName(g.type).he} הקרוב` : `Start here, then the nearest ${typeName(g.type).en}`}
          </small>
          {melody ? (
            <NoteStaff notes={melody} chord={false} keyPc={keyPc} durs={melody.map(() => 1)} />
          ) : (
            <div className="vl-first" dir="ltr">
              {hi.length > 0 && <NoteStaff notes={hi} chord keyPc={keyPc} clef="treble" />}
              {lo.length > 0 && <NoteStaff notes={lo} chord keyPc={keyPc} clef="bass" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The voices of the take as lanes: x = chord, y = pitch; your notes joined voice by voice, the smallest moves as rings. */
function VoiceLanes({ drill, result, lang }: { drill: Drill; result: TakeMetrics; lang: Lang }) {
  const g = drill.goal.vl!;
  const vl = result.vl!;
  const model = optimalPath(g).map((v) => measuredOf(v, g.type));
  const yours = vl.steps.map((s) => s.cls.voices);
  const all = [...model.flat(), ...yours.flat()];
  const pMin = Math.min(...all) - 2;
  const pMax = Math.max(...all) + 2;
  const W = 320;
  const H = 120;
  const n = g.chords.length;
  const x = (i: number) => 20 + (i * (W - 40)) / Math.max(1, n - 1);
  const y = (p: number) => H - 8 - ((p - pMin) / Math.max(1, pMax - pMin)) * (H - 16);
  return (
    <figure className="vl-lanes" data-vl-total={vl.total} data-vl-best={vl.best}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={lang === 'he' ? 'הקולות שלכם' : 'your voices'} style={{ direction: 'ltr' }}>
        {model.map((v, i) => v.map((p, k) => <circle key={`m${i}-${k}`} cx={x(i)} cy={y(p)} r={5} className="vl-model" />))}
        {yours.map((v, i) => {
          if (i === 0) return null;
          const prev = yours[i - 1];
          if (!prev.length || prev.length !== v.length) return null;
          const s = vl.steps[i];
          return v.map((p, k) => {
            const jumped = s.verdict !== 'clean' && s.jump && v.length - 1 - k === s.jump.voice && (s.excess ?? 0) > g.tol;
            return <line key={`l${i}-${k}`} x1={x(i - 1)} y1={y(prev[k])} x2={x(i)} y2={y(p)} className={`vl-line ${jumped ? 'jump' : ''}`} />;
          });
        })}
        {yours.map((v, i) => v.map((p, k) => <circle key={`y${i}-${k}`} cx={x(i)} cy={y(p)} r={3.2} className={`vl-you v-${vl.steps[i].verdict}`} />))}
      </svg>
      <figcaption className="vl-key">
        <span>● {lang === 'he' ? 'שלכם' : 'yours'}</span>
        <span>○ {lang === 'he' ? 'התנועה הקטנה' : 'smallest moves'}</span>
        <span dir="ltr">
          {vl.total} / {vl.best} {lang === 'he' ? 'חצאי טון' : 'semitones'}
        </span>
      </figcaption>
    </figure>
  );
}

/** The short lessons of the voice-leading levels, on the family page (one per level). */
export function VoiceLeadLessons({ family, settings }: { family: string; settings: Settings }) {
  const [open, setOpen] = useState<string | null>(null);
  const lang = settings.uiLang as Lang;
  const ids = Object.entries(VL_LEVEL_LESSON).filter(([lv]) => lv.startsWith(`${family}-`));
  if (!ids.length) return null;
  const lesson = open ? MINI_LESSONS[open] : null;
  return (
    <div className="vl-lessons" data-vl-lessons={family}>
      <small>{lang === 'he' ? 'שיעורים קצרים' : 'Quick lessons'}</small>
      <div className="vl-lesson-row">
        {[...new Set(ids.map(([, id]) => id))].map((id) => {
          const l = MINI_LESSONS[id];
          if (!l) return null;
          return (
            <button key={id} className="btn ghost small" onClick={() => setOpen(id)} data-family-lesson={id}>
              {l.title[lang]}
            </button>
          );
        })}
      </div>
      {lesson && <MiniLessonPlayer t={STRINGS[lang]} settings={settings} lesson={lesson} name={null} onFinish={() => setOpen(null)} />}
    </div>
  );
}
