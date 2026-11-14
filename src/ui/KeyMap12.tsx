// The 12-key map of a skill (key mastery, owner 2026-11-14): the keys in circle-of-fifths order, always left to right
// (Hebrew too), shaded by mastery, a quiet marker under weak keys, a dashed outline for keys not played enough yet.
// With onKey every cell is a button that starts the skill in that key.

import { FIFTHS, KEY_LABEL, type KeyCell, type KeyStatus } from '../engine/analysis/keyMastery';

type Lang = 'he' | 'en';
const STATUS: Record<KeyStatus, { en: string; he: string }> = {
  untried: { en: 'not enough takes yet', he: 'עוד אין מספיק נגינות' },
  weak: { en: 'weak', he: 'חלש' },
  ok: { en: 'fine', he: 'בסדר' },
  strong: { en: 'strong', he: 'חזק' },
};

const empty = (key: number): KeyCell => ({ key, mastery: 0, status: 'untried', takes: 0, last: '', goalBpm: 0 });

export function KeyMap12({ cells, lang, label, onKey, compact, has }: { cells?: KeyCell[] | null; lang: Lang; label: string; onKey?: (key: number) => void; /** No names: a thin strip (family cards). */ compact?: boolean; /** Keys the skill can be played in (others are disabled). */ has?: (key: number) => boolean }) {
  const cs = cells ?? Array.from({ length: 12 }, (_, k) => empty(k));
  return (
    <div className={`km12 ${compact ? 'compact' : ''}`} dir="ltr" role={compact ? undefined : 'group'} aria-label={compact ? undefined : label} aria-hidden={compact ? true : undefined}>
      {FIFTHS.map((k) => {
        const c = cs[k] ?? empty(k);
        const name = KEY_LABEL[k];
        const title = c.status === 'untried' ? `${name} · ${STATUS.untried[lang]}` : `${name} · ${STATUS[c.status][lang]} · ${Math.round(c.mastery * 100)}%`;
        const cls = `km-cell st-${c.status}`;
        if (compact) return <span key={k} className={cls} data-key={k} data-key-status={c.status} />;
        if (!onKey)
          return (
            <span key={k} className={cls} title={title} data-key={k} data-key-status={c.status}>
              {name}
            </span>
          );
        const off = has ? !has(k) : false;
        return (
          <button key={k} type="button" className={cls} title={title} aria-label={title} disabled={off} onClick={() => onKey(k)} data-key={k} data-key-status={c.status}>
            {name}
          </button>
        );
      })}
    </div>
  );
}
