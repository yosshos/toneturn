// Presentation by mastery on the take screen (docs/SPEC-EAR-AND-READING.md §2.3, §8a; BUILD-PLAN-2026-11 phase 6): the
// notation an item shows — full, rhythm only, its name only, or nothing (from memory) — and "by ear" (the item is played,
// the notation stays hidden until a clean take). A "Show notes" button is always there while anything is hidden; a press
// is never penalised, it only records the take as "page, known". The bars and the now-cue stay on screen in every mode
// (timing cue always), so one phone screen holds the card, the bars and the take controls.

import { useEffect, useRef, useState } from 'react';
import type { Drill } from '../engine/drills/types';
import type { Fade } from '../engine/presentation';
import { ChordChart } from './ChordChart';
import type { ChartCell } from '../engine/drills/chartCells';
import { hearable, playDrill } from './HearDrill';
import { piano } from './services';
import { Icon } from './icons';

type Lang = 'he' | 'en';

const FADE_WORD: Record<Fade, { en: string; he: string }> = {
  full: { en: 'Notation', he: 'תווים' },
  rhythm: { en: 'Rhythm only', he: 'רק המקצב' },
  name: { en: 'By name', he: 'לפי השם' },
  none: { en: 'From memory', he: 'מהזיכרון' },
};

/** The bars of an item with the now-cue (the same chart the ear items use). */
function Bars({ drill, beat, lang }: { drill: Drill; beat: number; lang: Lang }) {
  const meter = drill.meter || 4;
  const bars = Math.max(1, Math.ceil(drill.beats / meter - 1e-6));
  return <ChordChart cells={Array.from({ length: bars }, (): ChartCell => ({ role: 'you' }))} meter={meter} beat={beat} lang={lang} size={bars > 8 ? 'compact' : 'full'} maxRows={2} attrs={{ 'data-faded-bars': bars }} />;
}

export function ShowNotesButton({ lang, onShow }: { lang: Lang; onShow: () => void }) {
  return (
    <button type="button" className="btn small ghost fs-show" onClick={onShow} data-show-notes="1">
      <Icon k="eye" size={16} /> {lang === 'he' ? 'להציג תווים' : 'Show notes'}
    </button>
  );
}

/**
 * The score as the item's presentation allows. `full` = the normal score (what DrillScore draws now); `rhythm` = the
 * same with the rhythm-only drill. In the review (`result`), the notation opens — except a by-ear item missed: it stays
 * hidden until a clean take (or "Show notes").
 */
export function FadedScore({ drill, fade, byEar, shown, onShow, beat, lang, bpm, full, rhythm, result, clean, counting, autoListen = true }: { drill: Drill; fade: Fade; byEar: boolean; shown: boolean; onShow: () => void; beat: number; lang: Lang; bpm: number; full: React.ReactNode; rhythm?: React.ReactNode; result?: boolean; clean?: boolean; /** The count-in is running: a listening playback stops. */ counting?: boolean; /** By ear: play the item once when the card opens. */ autoListen?: boolean }) {
  const he = lang === 'he';
  const [playing, setPlaying] = useState(false);
  const ac = useRef<AbortController | null>(null);
  const listen = async () => {
    ac.current?.abort();
    if (playing) return setPlaying(false);
    const a = new AbortController();
    ac.current = a;
    setPlaying(true);
    try {
      await piano.unlock();
      await playDrill(drill, bpm, a.signal);
    } catch {
      /* stopped */
    }
    if (ac.current === a) setPlaying(false);
  };
  const hiddenEar = byEar && !shown && !(result && clean);
  useEffect(() => {
    if (hiddenEar && !result && autoListen && hearable(drill)) void listen();
    return () => ac.current?.abort();
  }, [drill.itemId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (counting) ac.current?.abort();
  }, [counting]);
  if (shown || (!hiddenEar && (fade === 'full' || result))) return <>{full}</>;
  if (hiddenEar)
    return (
      <div className="ear-card fs-card" data-fade={fade} data-by-ear="1">
        <p className="fs-mode">
          <b>{he ? 'משמיעה' : 'By ear'}</b>
          <span>{result ? (he ? 'התווים ייפתחו אחרי נגינה נקייה' : 'The notation opens after a clean take') : he ? 'מקשיבים, ואז מנגנים — בלי תווים' : 'Listen, then play it — no notation'}</span>
        </p>
        <div className="fs-actions">
          {hearable(drill) && !result && (
            <button type="button" className={`btn small ${playing ? 'primary' : 'ghost'}`} onClick={() => void listen()} data-fs-listen="1" aria-pressed={playing}>
              <Icon k={playing ? 'stop' : 'play'} size={16} /> {he ? 'להקשיב' : 'Listen'}
            </button>
          )}
          <ShowNotesButton lang={lang} onShow={onShow} />
        </div>
        {!result && <Bars drill={drill} beat={beat} lang={lang} />}
      </div>
    );
  if (fade === 'rhythm' && rhythm)
    return (
      <div className="fs-rhythm" data-fade="rhythm">
        <p className="fs-mode">
          <b>{FADE_WORD.rhythm[lang]}</b>
          <span className="fs-name">{drill.title[lang]}</span>
          <ShowNotesButton lang={lang} onShow={onShow} />
        </p>
        {rhythm}
      </div>
    );
  return (
    <div className="ear-card fs-card" data-fade={fade}>
      <p className="fs-mode">
        <b>{FADE_WORD[fade][lang]}</b>
        <span className="fs-name">{drill.title[lang]}</span>
      </p>
      <div className="fs-actions">
        <ShowNotesButton lang={lang} onShow={onShow} />
      </div>
      <Bars drill={drill} beat={beat} lang={lang} />
    </div>
  );
}
