// An improvisation level's item page (docs/SPEC-PATH-TODAY-PRACTICE.md §2): the same top as every item — the status
// ladder (from the level's best take), why today, the teacher's part and, for a teacher, assign — then what the level
// is about, its suggested rules, and the main button by the way in (Practise opens the chart player on the level).
// One phone screen, no emoji; chord symbols in <bdi dir="ltr">.

import type { ImprovLevel } from '../engine/charts';
import { improvLadder } from '../engine/statusLadder';
import type { ItemRef } from '../engine/itemAssign';
import { ItemHead } from './ItemHead';
import { useAssignFor, useTeaching } from './itemAssigns';
import type { WayIn } from './practiceRoutes';
import { Icon } from './icons';
import { BidiText } from './BidiText';

type Lang = 'he' | 'en';

const MAIN: Record<WayIn, { en: string; he: string }> = {
  practice: { en: 'Practise', he: 'לתרגל' },
  path: { en: 'Continue the step', he: 'להמשיך את הצעד' },
  today: { en: "Today's dose", he: 'המנה של היום' },
  teacher: { en: 'The assignment', he: 'המשימה' },
};

const RULE: Record<string, { en: string; he: string }> = {
  scale: { en: 'Notes of the scale', he: 'צלילי הסולם' },
  'chord-tones': { en: 'Chord tones', he: 'צלילי האקורד' },
  'guide-beats': { en: 'Guide tones on the beat', he: 'צלילים מנחים על הפעמה' },
  'target-3': { en: 'Land on the 3rd', he: 'לנחות על הטרצה' },
  steps: { en: 'Steps', he: 'צעדים' },
  thirds: { en: 'Thirds', he: 'טרצות' },
  eighths: { en: 'Eighths', he: 'שמיניות' },
  quarters: { en: 'Quarters', he: 'רבעים' },
  triplets: { en: 'Triplets', he: 'טריולות' },
};

export function ImprovLevelPage({ lang, level, best, wayIn = 'practice', why = null, onPlay, onBack }: { lang: Lang; level: ImprovLevel; best: number | undefined; wayIn?: WayIn; why?: { en: string; he: string } | null; onPlay: () => void; onBack: () => void }) {
  const he = lang === 'he';
  const item: ItemRef = { k: 'improv', n: level.n };
  const assigned = useAssignFor(item);
  const teaching = useTeaching();
  const rules = [level.rules.note, level.rules.interval, level.rules.rhythm].filter((r): r is NonNullable<typeof r> => !!r && !!RULE[r]);
  return (
    <main className="panel-screen charts improv-level" data-improv-page={level.n} data-way-in={wayIn}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
        </button>
        <h1>
          <BidiText text={level.title[lang]} />
        </h1>
      </header>
      <ItemHead
        lang={lang}
        ladder={improvLadder(best)}
        kicker={
          <>
            {he ? 'אלתור · שלב ' : 'Improvise · level '}
            <bdi dir="ltr">{level.n}</bdi>
            {best !== undefined && (
              <>
                {' · '}
                {he ? 'הטוב ביותר ' : 'best '}
                <bdi dir="ltr">{Math.round(best * 100)}%</bdi>
              </>
            )}
          </>
        }
        why={why}
        assigned={assigned}
        item={item}
        teaching={teaching}
        title={level.title[lang]}
      />
      <p className="field-hint">{level.focus[lang]}</p>
      <p className="ch-level-chart" dir="ltr">
        <bdi dir="ltr">{level.text}</bdi>
      </p>
      {rules.length > 0 && (
        <p className="field-hint" data-improv-rules={rules.join(',')}>
          {he ? 'כללים מומלצים: ' : 'Suggested rules: '}
          {rules.map((r) => RULE[r][lang]).join(' · ')}
        </p>
      )}
      <div className="ih-ways">
        <button className="btn primary ih-main" onClick={onPlay} data-item-main={wayIn} data-improv-play={level.n}>
          <span>{MAIN[wayIn][lang]}</span>
          <small>
            <bdi dir="ltr">♩{level.bpm}</bdi>
          </small>
        </button>
      </div>
    </main>
  );
}
