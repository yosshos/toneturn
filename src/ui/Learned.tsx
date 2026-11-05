// "Topics I learned" (spec X): every mini-lesson heard to the end, by area — with the ones still to
// discover shown as silhouettes. Any lesson can be replayed from here.

import { useState } from 'react';
import { MINI_LESSONS } from '../content/minilessons';
import type { AreaId, MiniLesson } from '../content/miniTypes';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { MiniLessonPlayer } from './MiniLesson';

export const AREAS: AreaId[] = ['ear', 'harmony', 'rhythm', 'theory', 'jazz', 'voice', 'world', 'play'];
const AREA_ICON: Record<AreaId, string> = { ear: '👂', harmony: '🎼', rhythm: '🥁', theory: '📖', jazz: '🎷', voice: '🎤', world: '🌍', play: '🎹' };

export function learnedCount(settings: Settings) {
  return Object.keys(settings.learned ?? {}).filter((id) => MINI_LESSONS[id]).length;
}

export function LearnedScreen({ t, settings, name, onLearned, onBack }: { t: Strings; settings: Settings; name: string | null; onLearned: (id: string) => void; onBack: () => void }) {
  const lang = settings.uiLang;
  const learned = settings.learned ?? {};
  const [open, setOpen] = useState<MiniLesson | null>(null);
  const all = Object.values(MINI_LESSONS);
  const total = all.length;
  const got = all.filter((l) => learned[l.id]).length;
  return (
    <main className="panel-screen learned">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>📚 {t.learnedTitle}</h1>
      </header>
      <section className="set-card learned-summary">
        <div className="learned-meter" aria-hidden="true">
          <span style={{ width: `${Math.round((got / Math.max(1, total)) * 100)}%` }} />
        </div>
        <p>
          <b dir="ltr">
            {got}/{total}
          </b>{' '}
          {t.learnedOf}
        </p>
        <p className="field-hint">{t.learnedHint}</p>
      </section>
      {AREAS.map((a) => {
        const ls = all.filter((l) => l.area === a);
        if (!ls.length) return null;
        const n = ls.filter((l) => learned[l.id]).length;
        return (
          <section key={a} className="set-card learned-area" data-area={a}>
            <h2>
              {AREA_ICON[a]} {t.areaNames[a]}{' '}
              <small dir="ltr">
                {n}/{ls.length}
              </small>
            </h2>
            <div className="learned-grid">
              {ls.map((l) => {
                const has = !!learned[l.id];
                return (
                  <button key={l.id} className={`learned-card ${has ? 'got' : 'todo'}`} data-learned-card={l.id} onClick={() => setOpen(l)}>
                    <span className="learned-emoji" aria-hidden="true">
                      {has ? l.emoji : '❔'}
                    </span>
                    <b>{l.title[lang]}</b>
                    {has ? <small>{l.takeaway[lang]}</small> : <small>{t.learnedListen}</small>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {open && (
        <MiniLessonPlayer
          t={t}
          settings={settings}
          lesson={open}
          name={name}
          onFinish={(heardAll) => {
            if (heardAll) onLearned(open.id);
            setOpen(null);
          }}
        />
      )}
    </main>
  );
}
