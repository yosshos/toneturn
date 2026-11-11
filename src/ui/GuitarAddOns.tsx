// The guitar add-ons (GUITAR_DEEPENING §5, owner 2026-11-11): four tick boxes on one screen. The core path (fretting,
// picking, chords, rhythm, scales, lead, reading, ear) is always on; each ticked add-on adds its families and levels.
// Used at the start of the guitar course (the Technique hub's first card), in the Technique settings and in Settings.
import type { GuitarAddOn } from '../engine/drills/types';
import { ADDON_DESC, ADDON_NAME, GUITAR_ADDONS } from '../engine/drills/guitarMeta';

type Lang = 'en' | 'he';

export function GuitarAddOnPicker({ value, onChange, lang, title = true }: { value: GuitarAddOn[]; onChange: (v: GuitarAddOn[]) => void; lang: Lang; title?: boolean }) {
  const toggle = (a: GuitarAddOn, on: boolean) => onChange(GUITAR_ADDONS.filter((x) => (x === a ? on : value.includes(x))));
  return (
    <fieldset className="g-addons" data-guitar-addons="1">
      {title && (
        <legend>
          {lang === 'he' ? 'תוספות לגיטרה' : 'Guitar add-ons'}
          <small>{lang === 'he' ? 'הבסיס תמיד פעיל: יד לוחצת, פריטה, אקורדים, קצב, סולמות, סולו, קריאה ושמיעה' : 'The core is always on: fretting, picking, chords, rhythm, scales, lead, reading and ear'}</small>
        </legend>
      )}
      {GUITAR_ADDONS.map((a) => (
        <label key={a} className="row g-addon">
          <input type="checkbox" checked={value.includes(a)} onChange={(e) => toggle(a, e.target.checked)} data-addon={a} />
          <span>
            <b>{ADDON_NAME[a][lang]}</b>
            <small>{ADDON_DESC[a][lang]}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
