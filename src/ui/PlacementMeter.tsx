// Find my level: a difficulty meter at the side (product owner). The bar shows how far up this skill's
// ladder the player is; every step up animates, and a changing, personal line says what is happening
// ("That was easy for you — let's go up a level", "We found your edge", "Next: chords").

import { Icon } from './icons';
import { useEffect, useRef, useState } from 'react';
import { LADDERS, lessonSections } from '../engine/placement';
import type { SkillId } from '../engine/lesson';
import type { SessionState } from '../engine/session';
import type { Strings } from '../i18n/strings';

const SKILL_COLOR: Partial<Record<SkillId, string>> = {
  degrees: '#ffc94d', intervals: '#4ea8de', chords: '#a06cf0', cadences: '#2ec4b6', notes: '#ff8a3d', modes: '#ff4d8d',
  sequences: '#7af0d0', 'rhythm-dictation': '#ff6a4d', 'rhythm-reading': '#ffd166', theory: '#9bb7ff', singing: '#b8f27c', pitch: '#e9a5ff', tempo: '#ffb3c7', sight: '#a0e7ff',
  absolute: '#f0a35e', rhythm: '#ff9f80', improv: '#c3a6ff', technique: '#8fe3a8', agility: '#6fd3ff',
};
const parse = (id: string) => {
  const m = /^p:([a-z-]+):(\d+):(\d+)$/.exec(id);
  return m ? { skill: m[1] as SkillId, level: Number(m[2]) } : null;
};

type Move = 'start' | 'up' | 'up2' | 'edge' | 'next';

export function PlacementMeter({ s, t }: { s: SessionState; t: Strings }) {
  const q = s.lesson.questions[s.index];
  const cur = q ? parse(q.id) : null;
  const prev = s.index > 0 ? parse(s.lesson.questions[s.index - 1].id) : null;
  const [line, setLine] = useState<{ text: string; move: Move; key: number } | null>(null);
  const shown = useRef('');
  const skills = lessonSections(s.lesson);

  useEffect(() => {
    if (!cur || shown.current === q.id) return;
    shown.current = q.id;
    const name = t.skillNames[cur.skill] ?? cur.skill;
    let move: Move = 'start';
    if (prev && prev.skill !== cur.skill) move = 'next';
    else if (prev && cur.level >= prev.level + 2) move = 'up2';
    else if (prev && cur.level > prev.level) move = 'up';
    else if (prev) move = 'edge';
    const pool = t.placementLines[move];
    const text = pool[s.index % pool.length].replace('{skill}', name).replace('{prev}', prev ? (t.skillNames[prev.skill] ?? prev.skill) : '');
    setLine({ text, move, key: s.index });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  if (!cur) return null;
  const max = LADDERS[cur.skill]?.length ?? 1;
  const color = SKILL_COLOR[cur.skill] ?? '#ffc94d';
  const doneIdx = skills.indexOf(cur.skill);
  return (
    <>
      <aside className="placement-meter" style={{ ['--pm-color' as string]: color }} aria-label={`${t.skillNames[cur.skill]} · ${cur.level}/${max}`} data-pm-level={cur.level}>
        <small className="pm-top" dir="ltr">
          {cur.level}/{max}
        </small>
        <div className="pm-track">
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className={`pm-step ${i < cur.level ? 'on' : ''} ${i === cur.level - 1 ? 'now' : ''}`} />
          ))}
        </div>
        <div className="pm-skills" aria-hidden="true">
          {skills.map((k, i) => (
            <span key={k} className={i < doneIdx ? 'done' : i === doneIdx ? 'now' : ''} style={{ ['--c' as string]: SKILL_COLOR[k] ?? '#fff' }} />
          ))}
        </div>
      </aside>
      {line && (
        <p className={`pm-line ${line.move}`} key={line.key} role="status" data-pm-move={line.move}>
          {line.move === 'up' || line.move === 'up2' ? '↑ ' : line.move === 'next' ? <span className="flip-rtl">→ </span> : line.move === 'edge' ? <><Icon k="target" /> </> : <><Icon k="phones" /> </>}
          {line.text}
        </p>
      )}
    </>
  );
}
