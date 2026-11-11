// "Listen to the original" (owner 2026-11-11): a standard's reference recordings as small link buttons — Spotify and
// YouTube, opened in a new tab / the app — with artist · year · key. Links out only; nothing is embedded or played here.
// When the recording's key differs from the practice key: a one-line note and, where the chart can transpose, a
// "practise in X" button.
import { keyLabel, keyName, referenceOf, sameKey, type RecKey, type Recording, type StandardRef } from '../content/references';

type Lang = 'en' | 'he';

const TX = {
  en: { tune: 'Listen to the original', form: 'A famous tune on this form', spotify: 'Spotify', youtube: 'YouTube', inKey: 'This recording is in ', youIn: 'you practise in ', practise: 'Practise in ', unsure: 'key not confirmed' },
  he: { tune: 'להאזנה למקור', form: 'שיר מפורסם על הצורה הזאת', spotify: 'Spotify', youtube: 'YouTube', inKey: 'ההקלטה הזאת ב־', youIn: 'מתרגלים ב־', practise: 'לתרגל ב־', unsure: 'הסולם לא מאומת' },
};

/** Monochrome line marks in the app's icon style (24×24, currentColor) — generic, not the brands' logos. */
function SpotifyMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.5c2.5-.7 5.2-.4 7.2.7M8.6 15.3c1.9-.5 3.8-.3 5.4.5" />
    </svg>
  );
}
function YouTubeMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.2v5.6l4.8-2.8z" />
    </svg>
  );
}

/** The two link buttons for one recording. */
export function ListenLinks({ title, r, lang }: { title: string; r: Recording; lang: Lang }) {
  const tx = TX[lang];
  const who = `${title} — ${r.artist}`;
  return (
    <span className="lo-links">
      <a className="lo-btn" href={r.spotify} target="_blank" rel="noopener noreferrer" aria-label={`${tx.spotify}: ${who}`} title={`${tx.spotify}: ${who}`} data-listen-spotify="1">
        <SpotifyMark />
      </a>
      <a className="lo-btn" href={r.youtube} target="_blank" rel="noopener noreferrer" aria-label={`${tx.youtube}: ${who}`} title={`${tx.youtube}: ${who}`} data-listen-youtube="1">
        <YouTubeMark />
      </a>
    </span>
  );
}

const recLine = (r: Recording, lang: Lang) => `${r.artist} · ${r.year} · ${keyLabel(r.key, lang)}${r.sure === 'uncertain' ? ' (?)' : ''}`;

/**
 * The row: label, then one line per recording (links + artist · year · key). `compact` shows only the first recording
 * on one line (run screens). `practiceKey` = the key the player practises in now; `onPractiseIn` transposes to a pitch class.
 */
export function ListenOriginal({ id, lang, practiceKey, onPractiseIn, compact }: { id: string | null | undefined; lang: Lang; practiceKey?: RecKey; onPractiseIn?: (pc: number) => void; compact?: boolean }) {
  const ref = referenceOf(id);
  if (!ref) return null;
  return <ListenRow ref_={ref} lang={lang} practiceKey={practiceKey} onPractiseIn={onPractiseIn} compact={compact} />;
}

function ListenRow({ ref_: ref, lang, practiceKey, onPractiseIn, compact }: { ref_: StandardRef; lang: Lang; practiceKey?: RecKey; onPractiseIn?: (pc: number) => void; compact?: boolean }) {
  const tx = TX[lang];
  const recs = compact ? ref.recordings.slice(0, 1) : ref.recordings;
  const first = ref.recordings[0];
  const pk = practiceKey ?? ref.appKey;
  const differs = !!first && !sameKey(first.key, pk);
  return (
    <div className={`listen-orig ${compact ? 'compact' : ''}`} data-listen={ref.id}>
      {!compact && (
        <small className="lo-label">
          {ref.kind === 'form' ? tx.form : tx.tune}
          {ref.kind === 'form' && (
            <>
              : <b dir="ltr">{ref.title}</b>
            </>
          )}
        </small>
      )}
      {recs.map((r, i) => (
        <div key={i} className="lo-rec">
          <ListenLinks title={ref.title} r={r} lang={lang} />
          <small className="lo-meta" dir="ltr">
            {compact && ref.kind === 'form' ? `${ref.title} · ` : ''}
            {recLine(r, lang)}
          </small>
        </div>
      ))}
      {!compact && recs.some((r) => r.note) && (
        <small className="lo-note">{recs.find((r) => r.note)?.note?.[lang]}</small>
      )}
      {differs && first && (
        <div className="lo-key" data-listen-key-differs="1">
          <small>
            {tx.inKey}
            <b dir="ltr">{keyLabel(first.key, lang)}</b>
            {!compact && (
              <>
                {' · '}
                {tx.youIn}
                <b dir="ltr">{keyLabel(pk, lang)}</b>
              </>
            )}
          </small>
          {onPractiseIn && (
            <button className="btn small lo-practise" onClick={() => onPractiseIn(first.key.pc)} data-listen-practise={first.key.pc}>
              {tx.practise}
              <span dir="ltr">{keyName(first.key.pc)}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Links only (no text): the small icon pair for a list row. */
export function ListenIcons({ id, lang }: { id: string; lang: Lang }) {
  const ref = referenceOf(id);
  const r = ref?.recordings[0];
  if (!ref || !r) return null;
  return <ListenLinks title={ref.title} r={r} lang={lang} />;
}
