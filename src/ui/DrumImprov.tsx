// Improvise on the kit (owner 2026-11-22, SPEC-PRACTICE-IA-3 §8): the drums course's Improvise place is fills, solos
// and trading fours — the existing measured levels of "Fills & landing" (d-fills) and "Soloing over a form" (d-trade).
// One list, each level opens its takes; its status is the one ladder word (closed = the level's items closed).

import { familyById, itemTargetBpm, levelDrills } from '../engine/drills/plan';
import { itemStatus, STATUS_WORD, unitStatus, type ItemStatus } from '../engine/drills/itemStatus';
import type { DrillSettings, ItemState } from '../engine/drills/types';
import type { LevelDef } from '../engine/drills/generate';
import { PlaceSpark } from './PlaceSpark';
import { Icon } from './icons';

export const DRUM_IMPROV_FAMILIES = ['d-trade', 'd-fills'] as const;

/** A level's status: its weakest item by the one rule (nothing played = new). */
function levelStatus(lv: LevelDef, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): ItemStatus {
  try {
    return unitStatus(levelDrills(lv, order).map((d) => itemStatus(items[d.itemId], d.startBpm, itemTargetBpm(d))));
  } catch {
    return 'new';
  }
}

export function DrumImprovScreen({ lang, items, order, onBack, onLevel }: { lang: 'he' | 'en'; items: Record<string, ItemState>; order: DrillSettings['keyOrder']; onBack: () => void; onLevel: (lv: LevelDef) => void }) {
  const he = lang === 'he';
  const fams = DRUM_IMPROV_FAMILIES.map((id) => familyById(id as never)).filter((f): f is NonNullable<typeof f> => !!f);
  return (
    <main className="panel-screen drum-improv" data-drum-improv="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <Icon k="back" />
        </button>
        <h1>{he ? 'אלתור על המערכת' : 'Improvise on the kit'}</h1>
        <PlaceSpark place="improv" course="drums" lang={lang} />
      </header>
      <p className="field-hint">{he ? 'מעברים, סולו וחילופי ארבע — נמדדים על המערכת שלכם.' : 'Fills, solos and trading fours — measured on your kit.'}</p>
      {fams.map((f) => (
        <section key={f.id} className="set-card di-fam" data-di-family={f.id}>
          <h2>{f.title[lang]}</h2>
          <ul className="rep-list">
            {f.levels.map((lv) => {
              const st = levelStatus(lv, items, order);
              return (
                <li key={lv.id}>
                  <button className={`rep-row st-${st}`} onClick={() => onLevel(lv)} data-di-level={lv.id}>
                    <span className="rep-row-text">
                      <b>{lv.title[lang]}</b>
                    </span>
                    <span className={`rep-mark st-${st}`} data-status={st}>
                      {st === 'new' ? '' : STATUS_WORD[st][lang]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
