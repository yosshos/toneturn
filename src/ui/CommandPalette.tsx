// Search everything (SPEC-DESKTOP §3.2, 0.53): Ctrl/⌘ K opens a palette — screens, every practice topic (in both
// languages), the songbook, tools and settings pages. Arrow keys move, Enter opens, Esc closes. Desktop staple; it also
// works on a tablet with a keyboard.
import { useEffect, useMemo, useRef, useState } from 'react';
import { TOPIC_GEN } from '../engine/topics';
import { SONGBOOK } from '../content/songbook';
import type { NavId } from './Sidebar';

type Lang = 'en' | 'he';
export type PaletteHit =
  | { kind: 'nav'; id: NavId; title: string; sub: string }
  | { kind: 'topic'; id: string; title: string; sub: string }
  | { kind: 'song'; id: string; title: string; sub: string }
  | { kind: 'settings'; id: string; title: string; sub: string };

const NAV: { id: NavId; en: string; he: string }[] = [
  { id: 'home', en: 'Today', he: 'היום' },
  { id: 'path', en: 'Path', he: 'מסלול' },
  { id: 'arcade', en: 'Practice', he: 'תרגול' },
  { id: 'repertoire', en: 'Repertoire', he: 'רפרטואר' },
  { id: 'songs', en: 'Songbook', he: 'שירון' },
  { id: 'drills', en: 'Technique', he: 'טכניקה' },
  { id: 'learned', en: 'Lessons', he: 'שיעורים' },
  { id: 'pieces', en: 'My pieces', he: 'היצירות שלי' },
  { id: 'charts', en: 'Chord charts', he: 'מהלכים' },
  { id: 'improv', en: 'Improvisation studio', he: 'סטודיו לאלתור' },
  { id: 'puzzle', en: 'Progression of the day', he: 'מהלך היום' },
  { id: 'exams', en: 'Exams: Bagrut & conservatory', he: 'מבחנים: בגרות וקונסרבטוריון' },
  { id: 'skills', en: 'Progress', he: 'התקדמות' },
  { id: 'insights', en: 'Insights', he: 'תובנות' },
  { id: 'achievements', en: 'Achievements', he: 'הישגים' },
  { id: 'friends', en: 'Community', he: 'קהילה' },
  { id: 'tuner', en: 'Tuner', he: 'טיונר' },
  { id: 'metronome', en: 'Metronome', he: 'מטרונום' },
  { id: 'drone', en: 'Drone', he: 'צליל רקע' },
  { id: 'groove', en: 'Groove trainer', he: 'מאמן גרוב' },
  { id: 'slowdown', en: 'Slow down', he: 'האטה' },
  { id: 'mixer', en: 'Mixer', he: 'מיקסר' },
  { id: 'log', en: 'Practice log', he: 'רישום אימון' },
  { id: 'placement', en: 'Find my level', he: 'בדיקת רמה' },
  { id: 'diagnostics', en: 'Mic & sound check', he: 'בדיקת מיקרופון וצליל' },
  { id: 'settings', en: 'Settings', he: 'הגדרות' },
];
const SETTINGS: { id: string; en: string; he: string }[] = [
  { id: 'account', en: 'Account & profile', he: 'חשבון ופרופיל' },
  { id: 'privacy', en: 'Privacy & friends', he: 'פרטיות וחברים' },
  { id: 'language', en: 'Language & voice', he: 'שפה וקול' },
  { id: 'learning', en: 'My path & learning', he: 'המסלול והלמידה שלי' },
  { id: 'instrument', en: 'My instrument', he: 'הכלי שלי' },
  { id: 'midi', en: 'MIDI keyboard', he: 'מקלדת MIDI' },
  { id: 'input', en: 'Microphone & timing', he: 'מיקרופון ותזמון' },
  { id: 'sound', en: 'Sound & output device', he: 'סאונד והתקן שמע' },
  { id: 'display', en: 'Display & accessibility', he: 'תצוגה ונגישות' },
];

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[֑-ׇ]/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ');

export function buildIndex(lang: Lang): (PaletteHit & { hay: string })[] {
  const other: Lang = lang === 'he' ? 'en' : 'he';
  const out: (PaletteHit & { hay: string })[] = [];
  for (const n of NAV) out.push({ kind: 'nav', id: n.id, title: n[lang], sub: lang === 'he' ? 'מסך' : 'Screen', hay: norm(`${n.en} ${n.he}`) });
  for (const st of SETTINGS) out.push({ kind: 'settings', id: st.id, title: st[lang], sub: lang === 'he' ? 'הגדרות' : 'Settings', hay: norm(`${st.en} ${st.he} settings הגדרות`) });
  for (const [id, T] of Object.entries(TOPIC_GEN)) {
    out.push({ kind: 'topic', id, title: T.title[lang], sub: T.levels.map((l) => l[lang]).slice(0, 3).join(' · '), hay: norm(`${T.title.en} ${T.title.he} ${T.levels.map((l) => `${l.en} ${l.he}`).join(' ')} ${id}`) });
  }
  for (const s of SONGBOOK) out.push({ kind: 'song', id: s.id, title: s.title[lang], sub: `${s.title[other]} · ${s.credit}`, hay: norm(`${s.title.en} ${s.title.he} ${s.credit}`) });
  return out;
}

/** Best matches first: every word must appear; a title that starts with the query ranks higher. */
export function searchIndex(index: (PaletteHit & { hay: string })[], q: string, max = 12): PaletteHit[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return index.filter((x) => x.kind === 'nav').slice(0, max);
  return index
    .filter((x) => words.every((w) => x.hay.includes(w)))
    .map((x) => ({ x, score: (norm(x.title).startsWith(words[0]) ? 0 : 1) + (x.kind === 'nav' ? 0 : x.kind === 'settings' ? 0.2 : x.kind === 'topic' ? 0.4 : 0.6) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, max)
    .map(({ x }) => x);
}

export function CommandPalette({ lang, onPick }: { lang: Lang; onPick: (h: PaletteHit) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildIndex(lang), [lang]);
  const hits = useMemo(() => searchIndex(index, q), [index, q]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQ('');
        setI(0);
      }
    };
    addEventListener('keydown', on);
    const openEv = () => (setOpen(true), setQ(''), setI(0));
    addEventListener('tt-open-search', openEv);
    return () => {
      removeEventListener('keydown', on);
      removeEventListener('tt-open-search', openEv);
    };
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
  }, [open]);
  if (!open) return null;
  const pick = (h: PaletteHit) => {
    setOpen(false);
    onPick(h);
  };
  const he = lang === 'he';
  const KIND: Record<PaletteHit['kind'], string> = he ? { nav: 'מסך', topic: 'נושא', song: 'שיר', settings: 'הגדרות' } : { nav: 'Screen', topic: 'Topic', song: 'Song', settings: 'Settings' };
  return (
    <div className="sheet-backdrop palette-backdrop" onClick={() => setOpen(false)}>
      <div className="sheet palette" role="dialog" aria-modal="true" aria-label={he ? 'חיפוש' : 'Search'} onClick={(e) => e.stopPropagation()} data-palette="1">
        <input
          ref={input}
          className="palette-input"
          value={q}
          placeholder={he ? 'חיפוש נושא, שיר, כלי או הגדרה…' : 'Search a topic, song, tool or setting…'}
          onChange={(e) => (setQ(e.target.value), setI(0))}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            else if (e.key === 'ArrowDown') (e.preventDefault(), setI((x) => Math.min(hits.length - 1, x + 1)));
            else if (e.key === 'ArrowUp') (e.preventDefault(), setI((x) => Math.max(0, x - 1)));
            else if (e.key === 'Enter' && hits[i]) pick(hits[i]);
          }}
          aria-activedescendant={hits[i] ? `pal-${i}` : undefined}
        />
        <ul className="palette-list" role="listbox">
          {hits.map((h, k) => (
            <li key={`${h.kind}:${h.id}`} id={`pal-${k}`} role="option" aria-selected={k === i} className={k === i ? 'on' : ''} onMouseEnter={() => setI(k)} onClick={() => pick(h)}>
              <span className="pal-kind">{KIND[h.kind]}</span>
              <span className="pal-text">
                <b>{h.title}</b>
                <small>{h.sub}</small>
              </span>
            </li>
          ))}
          {!hits.length && <li className="pal-empty">{he ? 'לא נמצא' : 'Nothing found'}</li>}
        </ul>
        <small className="palette-foot">{he ? '↑↓ לבחירה · Enter לפתיחה · Esc לסגירה' : '↑↓ to move · Enter to open · Esc to close'}</small>
      </div>
    </div>
  );
}
