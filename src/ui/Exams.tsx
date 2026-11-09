// Bagrut & conservatory (0.54): one place for exam preparation. Each exam lists its sections (what is asked, how many
// items, the minutes); practise any section on its own, or sit the mock exam — all sections in order, timed — and get a
// readiness report by section afterwards (from the recap and the skill map). Data: src/content/bagrut.ts (research in
// docs/research/BAGRUT_AND_CONSERVATORY.md).
import { useState } from 'react';
import { EXAMS, type ExamDef } from '../content/bagrut';
import { genTopic, rng } from '../engine/topicKit';
import { TOPIC_GEN } from '../engine/topics';
import type { LessonDef, Question } from '../engine/lesson';

type Lang = 'en' | 'he';
const TX = {
  en: { title: 'Study programs & exams', hint: 'Practice for the music Bagrut and conservatory entrance exams: every section of the exam, on its own or as a timed mock exam.', bagrut: 'Music Bagrut', cons: 'Conservatories & academies', sections: 'sections', min: 'min', mock: 'Mock exam', practise: 'Practice', back: 'Back', items: 'items', source: 'Based on the published requirements; times are our estimate where none are published.' },
  he: { title: 'תכניות לימוד ומבחנים', hint: 'הכנה לבגרות במוזיקה ולמבחני הכניסה לקונסרבטוריונים ולאקדמיות: כל חלק של הבחינה, לבד או כמבחן דמה עם זמן.', bagrut: 'בגרות במוזיקה', cons: 'קונסרבטוריונים ואקדמיות', sections: 'חלקים', min: 'דק׳', mock: 'מבחן דמה', practise: 'תרגול', back: 'חזרה', items: 'פריטים', source: 'לפי הדרישות שפורסמו; הזמנים הם הערכה שלנו כשלא פורסמו.' },
};

/** The mock exam as one lesson: every section's items in order (generated fresh each time). */
export function mockExamLesson(exam: ExamDef, seed = Date.now()): LessonDef {
  const r = rng(seed);
  const questions: Question[] = [];
  for (const sec of exam.sections) {
    const T = TOPIC_GEN[sec.topic];
    if (!T) continue;
    for (let i = 0; i < sec.items; i++) questions.push(genTopic(sec.topic, Math.floor(r() * 2 ** 31), Math.min(sec.level, T.levels.length), `${exam.id}-${sec.id}-${i + 1}`) as Question);
  }
  return { id: 'topic', version: 1, skill: 'theory', scoring: { xpPerCorrect: 10, attemptLimit: 1 }, intro: [], questions } as LessonDef;
}

export function ExamsScreen({ lang, onBack, onPractise, onMock }: { lang: Lang; onBack: () => void; onPractise: (topic: string, level: number) => void; onMock: (exam: ExamDef) => void }) {
  const tx = TX[lang];
  const [open, setOpen] = useState<string | null>(null);
  const group = (kind: ExamDef['kind'], title: string) => (
    <section className="exam-group">
      <h2>{title}</h2>
      <div className="exam-grid">
        {EXAMS.filter((e) => e.kind === kind).map((e) => {
          const minutes = e.sections.reduce((a, s) => a + s.minutes, 0);
          const isOpen = open === e.id;
          return (
            <article key={e.id} className={`exam-card ${isOpen ? 'open' : ''}`} data-exam={e.id}>
              <button className="exam-head" onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen}>
                <b>{e.title[lang]}</b>
                <small>
                  {e.sections.length} {tx.sections} · {minutes} {tx.min}
                </small>
              </button>
              <p className="field-hint">{e.blurb[lang]}</p>
              {isOpen && (
                <ol className="exam-sections">
                  {e.sections.map((s) => (
                    <li key={s.id}>
                      <span>
                        {s.title[lang]}
                        <small>
                          {' '}
                          · {s.items} {tx.items} · {s.minutes} {tx.min}
                        </small>
                      </span>
                      <button className="btn ghost small" onClick={() => onPractise(s.topic, s.level)} data-exam-practise={s.id}>
                        {tx.practise}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <button className="btn primary small" onClick={() => onMock(e)} data-exam-mock={e.id}>
                {tx.mock} · {minutes} {tx.min}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
  return (
    <main className="panel-screen exams" data-exams="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx.title}</h1>
      </header>
      <p className="field-hint">{tx.hint}</p>
      {group('bagrut', tx.bagrut)}
      {group('conservatory', tx.cons)}
      <p className="field-hint">{tx.source}</p>
    </main>
  );
}
