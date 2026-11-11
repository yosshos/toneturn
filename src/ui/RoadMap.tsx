// The road-map strip (PROG_ENGINE §4, BASS_NICHE_PLAN J4): a drill with a form shows its sections as blocks, the bar
// being played lit, and a cue line one bar before each new section ("Bridge — in 4"). Pure view of drill.form and the
// take's beat; the measures stay in roadmap.ts (analyzeForm).

import { useMemo } from 'react';
import type { Drill } from '../engine/drills/types';
import { expandForm, type FormSection } from '../engine/drills/roadmap';
import { timeMapOf } from '../engine/drills/timeline';

type Lang = 'en' | 'he';
const NAME_HE: Record<string, string> = { Intro: 'פתיחה', Head: 'נושא', Walk: 'ווקינג', Blues: 'בלוז', Stops: 'עצירות', Swing: 'סווינג', 'Last A': 'A אחרון', Tag: 'טאג', End: 'סיום', Interlude: 'מעבר', Bridge: 'גשר', Solo: 'סולו', Vamp: 'וואמפ', Outro: 'סיום' };
const nameOf = (n: string, lang: Lang) => (lang === 'he' ? NAME_HE[n] ?? n : n);

/** What the player does in a section, in a few words (the section's own cue first). */
export function sectionCue(s: FormSection, lang: Lang): string {
  if (s.cue) return s.cue[lang];
  const he = lang === 'he';
  const bits: string[] = [];
  if (s.groove === 'stop' || s.band === 'stop') bits.push(he ? 'עצירות עם הלהקה' : 'stop-time hits');
  else if (s.band === 'tacet' || s.groove === '-') bits.push(he ? 'לבד' : 'alone');
  if (s.feel === '2') bits.push(he ? 'בשתיים' : 'in 2');
  else if (s.feel === '4') bits.push(he ? 'בארבע' : 'in 4');
  else if (s.feel === 'half') bits.push(he ? 'חצי טמפו' : 'half-time');
  if (s.groove === 'bossa') bits.push(he ? 'בוסה' : 'bossa');
  else if (s.groove === 'swing' && s.feel !== '2' && s.feel !== '4' && !bits.length) bits.push(he ? 'סווינג' : 'swing');
  return bits.join(' · ');
}

export function RoadMapStrip({ drill, beat, bpm, lang }: { drill: Drill; beat: number; bpm: number; lang: Lang }) {
  const spans = useMemo(() => (drill.form ? expandForm(drill.form, drill.pulse) : []), [drill]);
  if (!drill.form || !spans.length) return null;
  const sections = drill.form.sections;
  const bar = beat >= 0 ? timeMapOf(drill, bpm).barAt(beat).index : -1;
  const cur = spans.findIndex((s) => bar >= s.startBar && bar < s.startBar + s.bars);
  // The cue: before the take, the first section; while playing, the next section from one bar before it starts.
  const next = bar < 0 ? spans[0] : spans.find((s) => s.startBar === bar + 1);
  const cue = next ? `${nameOf(next.name, lang)}${sectionCue(sections[next.section], lang) ? ` — ${sectionCue(sections[next.section], lang)}` : ''}` : null;
  const he = lang === 'he';
  return (
    <figure className="roadmap" data-roadmap={spans.length} aria-label={he ? 'מפת הדרך של השיר' : 'Road map of the tune'}>
      <div className="rm-strip" dir="ltr">
        {spans.map((s, i) => (
          <div key={i} className={`rm-sec k-${s.kind} ${i === cur ? 'now' : i < cur ? 'past' : ''}`} style={{ flexGrow: s.bars }} data-rm-section={i}>
            <b>{nameOf(s.name, lang)}</b>
            <span className="rm-bars" aria-hidden="true">
              {Array.from({ length: s.bars }, (_, k) => (
                <i key={k} className={s.startBar + k === bar ? 'on' : s.startBar + k < bar ? 'done' : ''} />
              ))}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="rm-cue" aria-live="polite" data-rm-cue={next ? next.section : -1}>
        {cue ? (
          <>
            <small>{bar < 0 ? (he ? 'מתחילים' : 'First') : he ? 'עוד תיבה' : 'Next bar'}</small> {cue}
          </>
        ) : (
          <small>{cur >= 0 ? `${nameOf(spans[cur].name, lang)} · ${bar - spans[cur].startBar + 1}/${spans[cur].bars}` : ' '}</small>
        )}
      </figcaption>
    </figure>
  );
}
