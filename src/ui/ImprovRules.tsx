// Improvising under rules — the shared UI (owner 2026-11-09: "the highlight of the app; there are too few options"):
// the four rule families as pickers, the challenge library (ready rule sets with the idea behind each, by level),
// a random challenge, and the lead-sheet import that brings any tune's chords in.
import { STYLE_TEXT, type StyleId } from '../engine/styles';
import { useEffect, useRef, useState } from 'react';
import { CHALLENGES, CHALLENGE_GROUPS, EXTRA_RULES, INTERVAL_RULES, NOTE_RULES, RHYTHM_RULES, RULE_NAME, SHAPE_RULES, VOCAB_RULES, activeRules, challengeOf, randomChallenge, type Challenge, type RuleSet } from '../engine/improvRules';
import { readLeadSheet, type LeadSheet } from '../engine/leadsheet';
import { Icon } from './icons';
import { STANDARD_CHANGES } from '../engine/standards';
import { IMPROV_LEVELS } from '../engine/charts';

type Lang = 'en' | 'he';
const T = {
  en: { rules: 'Rules', notes: 'Notes', intervals: 'Intervals', rhythm: 'Rhythm', shape: 'Phrases', vocab: 'Vocabulary', extra: 'Touch',  free: 'free', library: 'Challenges', random: 'Random challenge', close: 'Close', custom: 'Your own mix', level: 'Level' },
  he: { rules: 'כללים', notes: 'צלילים', intervals: 'מרווחים', rhythm: 'קצב', shape: 'משפטים', vocab: 'אוצר מילים', extra: 'מגע',  free: 'חופשי', library: 'אתגרים', random: 'אתגר אקראי', close: 'סגירה', custom: 'שילוב משלכם', level: 'רמה' },
};

/** A challenge's level as 5 waveform bars (the v2 progress motif, 14 px tall; COURSE-FEEDBACK-UI §4.7). */
const WAVE = [5, 8, 11, 14, 10];
const dots = (n: number) => (
  <svg className="ir-wave" viewBox="0 0 30 14" role="img" aria-label={`${n}/5`} data-level={n}>
    {WAVE.map((h, k) => (
      <rect key={k} x={k * 6 + 0.5} y={14 - h} width={4.5} height={h - 0.5} rx={1.2} className={k < n ? 'on' : ''} />
    ))}
  </svg>
);

/** The four rule pickers, the active rules explained, and the way into the challenge library. */
export function RulesPanel({ lang, rules, onRules, disabled, best }: { lang: Lang; rules: RuleSet; onRules: (r: RuleSet) => void; disabled?: boolean; best?: Record<string, number> }) {
  const t = T[lang];
  const [lib, setLib] = useState(false);
  const ch = challengeOf(rules);
  const active = activeRules(rules);
  const pick = <K extends keyof RuleSet>(k: K, list: readonly string[], label: string) => (
    <label className="ir-pick">
      <span>{label}</span>
      <select value={(rules[k] as string | null | undefined) ?? ''} disabled={disabled} onChange={(e) => onRules({ ...rules, [k]: e.target.value || null })} data-rule={k === 'shape' ? 'shape' : k}>
        <option value="">{t.free}</option>
        {list.map((r) => (
          <option key={r} value={r}>
            {RULE_NAME[r as keyof typeof RULE_NAME][lang]}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="ir-panel" aria-label={t.rules} data-rules-panel="1">
      <div className="ir-head">
        <b>{ch ? ch.title[lang] : active.length ? t.custom : t.rules}</b>
        <span className="ir-actions">
          <button className="btn small ghost" onClick={() => setLib(true)} disabled={disabled} data-challenges-open="1">
            {t.library} <small dir="ltr">({CHALLENGES.length})</small>
          </button>
          <button className="icon-btn" onClick={() => onRules(randomChallenge().rules)} disabled={disabled} aria-label={t.random} title={t.random} data-challenge-random="1">
            <Icon k="dice" />
          </button>
        </span>
      </div>
      {ch && <p className="ir-idea">{ch.idea[lang]}</p>}
      <div className="ir-picks">
        {pick('note', NOTE_RULES, t.notes)}
        {pick('interval', INTERVAL_RULES, t.intervals)}
        {pick('rhythm', RHYTHM_RULES, t.rhythm)}
        {pick('shape', SHAPE_RULES, t.shape)}
        {pick('vocab', VOCAB_RULES, t.vocab)}
        {pick('extra', EXTRA_RULES, t.extra)}
      </div>
      {active.length > 0 && (
        <ul className="ir-how">
          {active.map((r) => (
            <li key={r}>
              <b>{RULE_NAME[r][lang]}</b> — {RULE_NAME[r].how[lang]}
            </li>
          ))}
        </ul>
      )}
      {lib && <ChallengeLibrary lang={lang} current={ch?.id} best={best} onPick={(c) => (onRules(c.rules), setLib(false))} onClose={() => setLib(false)} />}
    </section>
  );
}

/** The challenge library as a dialog (a centered window on a computer). */
export function ChallengeLibrary({ lang, current, onPick, onClose, best }: { lang: Lang; current?: string; onPick: (c: Challenge) => void; onClose: () => void; best?: Record<string, number> }) {
  const t = T[lang];
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), onClose());
    addEventListener('keydown', k, true);
    return () => removeEventListener('keydown', k, true);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet ir-library" role="dialog" aria-modal="true" aria-label={t.library} onClick={(e) => e.stopPropagation()} data-challenge-library="1">
        <div className="menu-head">
          <h2>{t.library}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            <Icon k="close" />
          </button>
        </div>
        <ChallengeList lang={lang} current={current} onPick={onPick} best={best} />
      </div>
    </div>
  );
}

/** All challenges, grouped. */
export function ChallengeList({ lang, current, onPick, best, style }: { lang: Lang; current?: string; onPick: (c: Challenge) => void; best?: Record<string, number>; /** SPEC-STYLE-FOCUS §4: the band's style — its challenges (the clave, the samba phrase) come first; other styles' last. */ style?: StyleId }) {
  const groups = Object.keys(CHALLENGE_GROUPS) as Challenge['group'][];
  const mine = !!style && CHALLENGES.some((c) => c.style === style);
  const order = mine ? ['styles' as const, ...groups.filter((g) => g !== 'styles')] : groups;
  const inGroup = (g: Challenge['group']) => CHALLENGES.filter((c) => c.group === g).sort((x, y) => (g === 'styles' ? Number(y.style === style) - Number(x.style === style) : 0));
  return (
    <div className="ir-groups">
      {order.map((g) => (
        <section key={g} className="ir-group" data-challenge-group={g}>
          <h3 className="menu-group-h">{g === 'styles' && mine && style ? `${CHALLENGE_GROUPS[g][lang]} · ${STYLE_TEXT[style][lang]}` : CHALLENGE_GROUPS[g][lang]}</h3>
          <ul className="ch-list ir-list">
            {inGroup(g).map((c) => (
              <li key={c.id}>
                <button className={`ch-row ir-row ${current === c.id ? 'on' : ''}`} onClick={() => onPick(c)} data-challenge={c.id}>
                  <span className="lv-text">
                    <b>{c.title[lang]}</b>
                    <small>{c.idea[lang]}</small>
                  </span>
                  {best?.[c.id] !== undefined && (
                    <small className={`ir-best ${best[c.id] >= 0.85 ? 'good' : ''}`} dir="ltr" data-challenge-best={c.id}>
                      {Math.round(best[c.id] * 100)}%
                    </small>
                  )}
                  {dots(c.level)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const IMP = {
  en: {
    title: 'Import a lead sheet',
    file: 'Choose a file',
    paste: 'or paste an iReal Pro link or chords',
    add: 'Add',
    formats: 'MusicXML or .mxl (MuseScore, Sibelius, Finale, Dorico, iReal Pro export), an iReal Pro link or playlist page, or chord text / ChordPro. Only the chords are used.',
    bad: 'Could not read it:',
    simplified: 'Simplified:',
    added: 'Added to My charts:',
    which: 'Songs in this playlist — choose the ones to add',
    addSel: 'Add selected',
  },
  he: {
    title: 'ייבוא דף אקורדים',
    file: 'בחירת קובץ',
    paste: 'או להדביק קישור של iReal Pro או אקורדים',
    add: 'הוספה',
    formats: 'MusicXML או ‎.mxl (מ־MuseScore, ‏Sibelius, ‏Finale, ‏Dorico או ייצוא של iReal Pro), קישור או דף רשימה של iReal Pro, או טקסט אקורדים / ChordPro. נלקחים רק האקורדים.',
    bad: 'לא הצלחנו לקרוא:',
    simplified: 'פושטו:',
    added: 'נוסף להמהלכים שלי:',
    which: 'שירים ברשימה — בחרו מה להוסיף',
    addSel: 'להוסיף את הנבחרים',
  },
};

/** Bring lead sheets in — a file or pasted text. Calls `onAdd` with the sheets to save. */
export function LeadSheetImport({ lang, onAdd }: { lang: Lang; onAdd: (sheets: LeadSheet[]) => void }) {
  const t = IMP[lang];
  const [paste, setPaste] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [many, setMany] = useState<{ list: LeadSheet[]; on: Set<number> } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const take = (list: LeadSheet[]) => {
    if (list.length > 1) return setMany({ list, on: new Set(list.map((_, i) => i)) });
    onAdd(list);
    const simp = list.flatMap((l) => l.simplified);
    setNote(`${t.added} ${list.map((l) => l.title).join(', ')}${simp.length ? ` · ${t.simplified} ${simp.slice(0, 6).join(', ')}` : ''}`);
  };
  const run = async (src: { name: string; bytes: Uint8Array } | { text: string }, label: string) => {
    setErr(null);
    setNote(null);
    try {
      take(await readLeadSheet(src));
    } catch (e) {
      setErr(`${t.bad} ${label} — ${(e as Error).message}`);
    }
  };
  return (
    <section className="set-card ls-import" data-leadsheet="1">
      <h2>{t.title}</h2>
      <p className="field-hint">{t.formats}</p>
      <div className="ls-row">
        <button className="btn small" onClick={() => fileRef.current?.click()} data-leadsheet-file-btn="1">
          {t.file}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".musicxml,.xml,.mxl,.html,.htm,.txt,.pro,.cho,.chopro,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml,text/plain,text/html"
          hidden
          data-leadsheet-file="1"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void f.arrayBuffer().then((b) => run({ name: f.name, bytes: new Uint8Array(b) }, f.name));
          }}
        />
      </div>
      <div className="ls-row">
        <textarea className="ch-text" dir="ltr" rows={2} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t.paste} aria-label={t.paste} data-leadsheet-paste="1" />
        <button className="btn small ghost" disabled={!paste.trim()} onClick={() => void run({ text: paste }, '').then(() => setPaste(''))} data-leadsheet-add="1">
          {t.add}
        </button>
      </div>
      {err && <p className="field-hint ch-err">{err}</p>}
      {note && (
        <p className="field-hint" data-leadsheet-done="1">
          {note}
        </p>
      )}
      {many && (
        <div className="ls-many">
          <p className="field-hint">{t.which}</p>
          <ul className="ls-list">
            {many.list.map((l, i) => (
              <li key={i}>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={many.on.has(i)}
                    onChange={(e) => {
                      const on = new Set(many.on);
                      if (e.target.checked) on.add(i);
                      else on.delete(i);
                      setMany({ ...many, on });
                    }}
                  />
                  <span dir="auto">{l.title}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            className="btn small"
            disabled={!many.on.size}
            onClick={() => {
              const list = many.list.filter((_, i) => many.on.has(i));
              setMany(null);
              if (list.length === 1) return take(list);
              onAdd(list.slice(0, 60));
              setNote(`${t.added} ${Math.min(60, list.length)}`);
            }}
            data-leadsheet-add-many="1"
          >
            {t.addSel}
          </button>
        </div>
      )}
    </section>
  );
}

/** A teacher's "improvise under rules" assignment: ref = "rules:<challenge id>@<lv:N | std:id>". */
export function rulesRef(challenge: string, src: string): string {
  return `rules:${challenge}@${src}`;
}
export function chartOfRulesRef(ref: string, lang: Lang): { id: string; title: string; text: string; style: import('../engine/charts').ChartStyle; bpm: number; rules: RuleSet; level?: string; std?: string } | null {
  const m = /^rules:([\w-]+)@(lv|std):([\w-]+)$/.exec(ref);
  if (!m) return null;
  const ch = CHALLENGES.find((c) => c.id === m[1]);
  if (!ch) return null;
  const id = `assign-${Date.now()}`;
  if (m[2] === 'std') {
    const s = STANDARD_CHANGES.find((x) => x.id === m[3]);
    return s ? { id, title: `${s.name} — ${ch.title[lang]}`, text: s.text, style: s.style, bpm: s.bpm, rules: ch.rules, std: s.id } : null;
  }
  const L = IMPROV_LEVELS.find((x) => String(x.n) === m[3]);
  return L ? { id, title: `${L.title[lang]} — ${ch.title[lang]}`, text: L.text, style: L.style, bpm: L.bpm, rules: ch.rules, level: L.id } : null;
}
export const rulesRefTitle = (ref: string, lang: Lang) => {
  const c = chartOfRulesRef(ref, lang);
  return c ? c.title : ref;
};
