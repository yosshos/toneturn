// "Explain more" and the hint (docs/SPEC-AI.he.md §9): a sheet over the exercise with the AI teacher's answer to
// exactly this moment, and (explain) a few follow-up questions. The lesson pauses while it is open.

import { useEffect, useRef, useState } from 'react';
import { aiErrorText, askAi, type AiError } from '../cloud/ai';

type Turn = { role: 'user' | 'assistant'; text: string };
const MAX_FOLLOWUPS = 4;

const TX = {
  he: { explain: 'עוד הסבר', hint: 'רמז', loading: 'חושב…', ask: 'שאלת המשך', send: 'לשאול', close: 'סגירה', note: 'נכתב בעזרת בינה מלאכותית ועלול לטעות.', hintNote: 'שאלה שנעזרתם בה ברמז נחשבת "כמעט".', limit: 'אפשר להמשיך לתרגל — ההסבר כאן כשתצטרכו.' },
  en: { explain: 'Explain more', hint: 'Hint', loading: 'Thinking…', ask: 'Ask a follow-up', send: 'Ask', close: 'Close', note: 'Written with AI and may be wrong.', hintNote: 'A question you took a hint on counts as "almost".', limit: 'Keep practising — the explanation stays here when you need it.' },
};

export function AiExplain({ kind, lang, naming, context, jazz, onClose }: { kind: 'explain' | 'hint'; lang: 'he' | 'en'; naming?: string; context: Record<string, unknown>; jazz?: boolean; onClose: () => void }) {
  const tx = TX[lang];
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<AiError | null>(null);
  const [draft, setDraft] = useState('');
  const asked = turns.filter((t) => t.role === 'user').length;
  const run = async (follow: Turn[]) => {
    setBusy(true);
    setErr(null);
    const r = await askAi(kind, { lang, naming, context, jazz, followups: follow.length ? follow : undefined });
    setBusy(false);
    if ('error' in r) return setErr(r.error);
    setTurns([...follow, { role: 'assistant', text: r.text }]);
  };
  useEffect(() => {
    void run([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [turns, busy]);
  const send = () => {
    const q = draft.trim();
    if (!q || busy) return;
    setDraft('');
    const next: Turn[] = [...turns, { role: 'user', text: q }];
    setTurns(next);
    void run(next);
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet ai-sheet" role="dialog" aria-modal="true" aria-labelledby="ai-title" onClick={(e) => e.stopPropagation()} data-ai-sheet={kind}>
        <header className="ai-head">
          <h2 id="ai-title">{kind === 'hint' ? tx.hint : tx.explain}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={tx.close} data-ai-close="1">
            ✕
          </button>
        </header>
        <div className="ai-body" ref={box}>
          {turns.map((t, i) => (
            <div key={i} className={`ai-turn ${t.role}`} dir="auto" data-ai-turn={t.role}>
              {t.text.split(/\n{2,}/).map((p, k) => (
                <p key={k}>{p}</p>
              ))}
            </div>
          ))}
          {busy && (
            <p className="ai-loading" aria-live="polite">
              {tx.loading}
            </p>
          )}
          {err && (
            <p className="ai-error" role="status" data-ai-error={err}>
              {aiErrorText(err, lang)}
            </p>
          )}
        </div>
        {kind === 'explain' && !err && turns.length > 0 && asked < MAX_FOLLOWUPS && (
          <form
            className="ai-ask"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input dir="auto" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tx.ask} maxLength={300} aria-label={tx.ask} data-ai-input="1" />
            <button className="btn primary small" type="submit" disabled={busy || !draft.trim()} data-ai-send="1">
              {tx.send}
            </button>
          </form>
        )}
        {kind === 'explain' && asked >= MAX_FOLLOWUPS && <small className="field-hint">{tx.limit}</small>}
        <small className="field-hint ai-note">{kind === 'hint' ? tx.hintNote : tx.note}</small>
      </div>
    </div>
  );
}

/** A coach line from the AI (after a session, the weekly summary): loads once, quietly absent when unavailable. */
export function AiCoachLine({ kind, lang, naming, context, label, className = '' }: { kind: 'card' | 'weekly'; lang: 'he' | 'en'; naming?: string; context: Record<string, unknown> | null; label: string; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  const key = context ? JSON.stringify(context) : '';
  useEffect(() => {
    if (!context) return;
    let live = true;
    void askAi(kind, { lang, naming, context }).then((r) => live && setText('text' in r ? r.text : null));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, lang, key]);
  if (!text) return null;
  return (
    <div className={`ai-coach ${className}`} data-ai-coach={kind} dir="auto">
      <small className="ai-coach-label">{label}</small>
      {text.split(/\n{2,}/).map((p, k) => (
        <p key={k}>{p}</p>
      ))}
    </div>
  );
}
