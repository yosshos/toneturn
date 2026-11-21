// "Practice with me now" (owner 2026-11-16): a small live mark while a together session is open. My measured time
// counts from the moment the session became active on this device (the practice ledger — measured practice only);
// it beats to the server every 15 s and whenever the ledger changes. "Together" lights while both gained measured
// time within the same 10-minute window; when both have 5 measured minutes the duet streak counts the day.
// Never lose progress: the session lives in localStorage (tt.together), so a reload picks it up where it was.

import { useEffect, useRef, useState } from 'react';
import '../../gifts.css';
import { beatTogether, loadTogether, localDay, saveTogether, type TogetherLocal, type TogetherSession } from '../../cloud/gifts';
import { practisingTogether, TOGETHER_MIN_MS } from '../../engine/encore/gifts';
import { subscribePractice } from '../../storage/practice';
import { Bi, type Lang } from './bits';
import { GiftArt, measuredToday } from './Gifts';

const L = (lang: Lang, en: string, he: string) => (lang === 'he' ? he : en);
const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function TogetherChip({ lang }: { lang: Lang }) {
  const [loc, setLoc] = useState<TogetherLocal | null>(() => loadTogether());
  const [s, setS] = useState<TogetherSession | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    const on = () => setLoc(loadTogether());
    window.addEventListener('tt-together', on);
    window.addEventListener('storage', on);
    return () => {
      window.removeEventListener('tt-together', on);
      window.removeEventListener('storage', on);
    };
  }, []);
  useEffect(() => {
    if (!loc) return;
    let live = true;
    const beat = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const cur = loadTogether();
        if (!cur || cur.id !== loc.id) return;
        const now = measuredToday();
        // my time counts from the first beat that sees the session active (the inviter learns of the accept here)
        const mine = cur.base === null ? 0 : cur.day === localDay() ? now - cur.base : now;
        const r = await beatTogether(cur.id, mine);
        if (!live) return;
        if (r.status === 'active' && cur.base === null) saveTogether({ ...cur, base: now, day: localDay() });
        setS(r);
        if (r.status === 'done') {
          saveTogether(null);
          setNote(L(lang, 'Five measured minutes together — the duet streak counts today.', 'חמש דקות נמדדות יחד — הרצף הזוגי נספר היום.'));
          window.setTimeout(() => setNote(null), 8000);
        } else if (r.status === 'ended' || r.status === 'declined') {
          saveTogether(null);
          setNote(r.status === 'declined' ? L(lang, 'Not now — maybe later.', 'לא עכשיו — אולי אחר כך.') : L(lang, 'The invite has ended.', 'ההזמנה הסתיימה.'));
          window.setTimeout(() => setNote(null), 5000);
        }
      } catch {
        /* offline: the next beat */
      } finally {
        busy.current = false;
      }
    };
    void beat();
    const id = window.setInterval(() => void beat(), 15_000);
    let last = 0;
    const off = subscribePractice(() => {
      if (Date.now() - last > 5000) {
        last = Date.now();
        void beat();
      }
    });
    return () => {
      live = false;
      window.clearInterval(id);
      off();
    };
  }, [loc?.id, lang]);

  if (note)
    return (
      <div className="together-chip" role="status" data-together="note">
        <GiftArt kind="together" size={20} />
        <span>{note}</span>
      </div>
    );
  if (!loc) return null;
  const pending = !s || s.status === 'pending';
  const both = !!s && practisingTogether({ ms: s.meMs, activeAt: s.meActive }, { ms: s.themMs, activeAt: s.themActive }, Date.now());
  return (
    <div className={`together-chip ${both ? 'live' : ''}`} role="status" data-together={pending ? 'pending' : both ? 'live' : 'active'} data-together-ms={s?.meMs ?? 0}>
      <span className="dot" aria-hidden="true" />
      <span className="t-name">
        {pending ? L(lang, 'Waiting for ', 'ממתינים ל־') : both ? L(lang, 'Together with ', 'יחד עם ') : L(lang, 'With ', 'עם ')}
        <Bi text={loc.friendName} />
      </span>
      {!pending && s && (
        <bdi dir="ltr">
          {mmss(Math.min(s.meMs, TOGETHER_MIN_MS))}/{mmss(TOGETHER_MIN_MS)}
        </bdi>
      )}
      <button onClick={() => saveTogether(null)} aria-label={L(lang, 'Hide', 'הסתרה')}>
        ×
      </button>
    </div>
  );
}
