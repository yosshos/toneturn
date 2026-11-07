// Profile (SPEC-SOCIAL §1): nickname (playful musical suggestions, offensive-word filter), country flag
// (suggested from the device), and a picture — an instrument icon on a colour, or a photo cropped into the circle
// like WhatsApp (drag to move, pinch / wheel / slider to zoom). Kept on the device; the server copy comes with the
// social version. Young players (age gate) can't upload a photo.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { checkNickname, NICK_WHY, suggestNicknames } from '../engine/nickname';
import { COUNTRY_CODES, countryName, deviceCountry } from '../engine/country';
import { effectivePrivacy } from '../engine/privacy';
import type { Settings } from '../storage/progress';

type Lang = 'en' | 'he';

/** A country's flag as emoji (regional indicators). */
export const flagEmoji = (code: string | null | undefined) => (code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '');

/** Instrument / music icons (line art, 24×24). */
export const PROFILE_ICONS: Record<string, ReactNode> = {
  guitar: (
    <g transform="rotate(38 12 12)">
      <path d="M12 9.3c-1.9 0-3.2 1.3-3.2 2.9 0 1 .5 1.6.3 2.1-.9.7-2.6 1.6-2.6 3.7 0 2.4 2.4 3.9 5.5 3.9s5.5-1.5 5.5-3.9c0-2.1-1.7-3-2.6-3.7-.2-.5.3-1.1.3-2.1 0-1.6-1.3-2.9-3.2-2.9z" />
      <circle cx="12" cy="16.4" r="1.4" />
      <path d="M12 4.5v10.5M10.6 20h2.8" />
      <rect x="10.7" y="1.2" width="2.6" height="3.4" rx=".7" />
    </g>
  ),
  electric: (
    <g transform="rotate(38 12 12)">
      <path d="M10.4 9.5 8.6 8.6c-.6 1.6-.2 3.4.6 4.9-1.5.8-2.8 2.1-2.8 4.2 0 2.5 2.5 4 5.6 4s5.6-1.5 5.6-4c0-1.9-1.1-3.1-2.3-3.9.4-1.2.4-2.6-.3-4.1l-1.6.9" />
      <path d="M12 4.5v15M10.2 15.5h3.6M10.2 17.8h3.6" />
      <path d="M10.8 1.2h2.4l.3 3.3h-3z" />
    </g>
  ),
  bass: (
    <g transform="rotate(38 12 12)">
      <path d="M10.6 11.6 9.3 11c-.5 1.2-.2 2.4.4 3.5-1.1.7-2 1.6-2 3.2 0 2 2 3.3 4.3 3.3s4.3-1.3 4.3-3.3c0-1.5-.8-2.4-1.7-3 .3-.9.3-1.9-.2-3l-1.3.6"/>
      <path d="M12 1.5v17M10.7 17.5h2.6" />
      <path d="M10.5 2.5h-1M10.5 4.5h-1M13.5 2.5h1M13.5 4.5h1" />
    </g>
  ),
  piano: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
      <path d="M7 6v7M12 6v7M17 6v7M5.5 13h3M10.5 13h3M15.5 13h3M7 13v5M12 13v5M17 13v5" />
    </>
  ),
  synth: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 11h19M6 11v8M10 11v8M14 11v8M18 11v8" />
      <circle cx="6.5" cy="8" r="1" />
      <circle cx="10" cy="8" r="1" />
      <path d="M14 8h4.5" />
    </>
  ),
  drums: (
    <>
      <ellipse cx="12" cy="9" rx="8" ry="3" />
      <path d="M4 9v6c0 1.7 3.6 3 8 3s8-1.3 8-3V9" />
      <path d="M6 3l4 5M18 3l-4 5" />
    </>
  ),
  violin: (
    <>
      <path d="M12 2v6" />
      <path d="M9 8c-2 1-2 3 0 4-2 1-3 2.5-2.5 4.5C7 19 9.5 21 12 21s5-2 5.5-4.5c.5-2-.5-3.5-2.5-4.5 2-1 2-3 0-4z" />
      <path d="M10.5 14h3M12 11v6" />
    </>
  ),
  trumpet: (
    <>
      <path d="M2.5 12h12l5-4v8l-5-4" />
      <path d="M6 12v3M9 12v3M12 12v3M5 15h8" />
    </>
  ),
  sax: (
    <>
      <path d="M14 2.5l2 2-6 6v6a4 4 0 0 0 8 0v-3" />
      <path d="M18 13.5h2.5" />
      <circle cx="12.5" cy="13" r=".7" />
      <circle cx="12.5" cy="16" r=".7" />
    </>
  ),
  flute: (
    <>
      <path d="M3 17.5 19 4" />
      <path d="M4.5 19 20.5 5.5" />
      <circle cx="9" cy="12.4" r=".7" />
      <circle cx="11.5" cy="10.3" r=".7" />
      <circle cx="14" cy="8.2" r=".7" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  note: (
    <>
      <path d="M9 18V5l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="15" r="2.5" />
    </>
  ),
  clef: (
    <>
      <path d="M12.5 21c1.7 0 2.5-1.2 2.3-2.6L12 3.5c-.3-1.5 1.8-2.2 2.6-.6.9 1.9-.5 4.2-2.6 5.8-2.5 1.9-4.5 3.6-4.5 6.3a4.4 4.4 0 0 0 8.8.2c0-2-1.6-3.2-3.4-3-1.7.2-2.6 1.6-2.2 3" />
      <circle cx="11.2" cy="19.5" r="1" />
    </>
  ),
  metronome: (
    <>
      <path d="M8.5 3h7l4 18h-15z" />
      <path d="M12 16l4.5-9" />
      <path d="M6.5 16h11" />
    </>
  ),
  fork: (
    <>
      <path d="M9 3v8a3 3 0 0 0 6 0V3M12 14v7" />
      <path d="M5 7c-1 1.5-1 3.5 0 5M19 7c1 1.5 1 3.5 0 5" />
    </>
  ),
  harp: (
    <>
      <path d="M5 21V4c5 0 8 3 8 7 0 3 3 4 6 4v6z" />
      <path d="M8 6.5v14.5M11 9v12M14 13v8M17 15v6" />
    </>
  ),
  vinyl: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
};
export const PROFILE_COLORS = ['#86dcbd', '#8e9cf0', '#f2b866', '#e891bd', '#eda07c', '#7fcfd6', '#b49bec', '#9ccc86'];

export function ProfileIcon({ k, size = 24 }: { k: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PROFILE_ICONS[k] ?? PROFILE_ICONS.note}
    </svg>
  );
}

/** The circle shown next to every name: a photo, or an icon on its colour, with the flag at its lower edge. */
export function Avatar({ s, size = 44 }: { s: Pick<Settings, 'avatarIcon' | 'avatarColor' | 'avatarPhoto' | 'country'>; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, ['--av' as string]: s.avatarColor ?? PROFILE_COLORS[0] }}>
      {s.avatarPhoto ? <img src={s.avatarPhoto} alt="" width={size} height={size} /> : <ProfileIcon k={s.avatarIcon ?? 'note'} size={Math.round(size * 0.58)} />}
      {s.country && (
        <span className="av-flag" aria-hidden="true" style={{ fontSize: Math.max(12, Math.round(size * 0.34)) }}>
          {flagEmoji(s.country)}
        </span>
      )}
    </span>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet profile-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="ps-sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="✕">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- nickname

export function NicknameSheet({ lang, current, onSave, onClose }: { lang: Lang; current?: string; onSave: (n: string) => void; onClose: () => void }) {
  const he = lang === 'he';
  const [seed, setSeed] = useState(() => Date.now());
  const ideas = useMemo(() => suggestNicknames(4, seed), [seed]);
  const [name, setName] = useState(current ?? '');
  const check = name ? checkNickname(name) : null;
  return (
    <Sheet title={he ? 'הכינוי שלך' : 'Your nickname'} onClose={onClose}>
      <p className="field-hint">{he ? 'בחרו אחד או כתבו משלכם — אותיות באנגלית, ספרות ו־_' : 'Pick one or type your own — English letters, digits and _'}</p>
      <div className="nick-ideas" role="group">
        {ideas.map((n) => (
          <button key={n} type="button" className={`chip ${name === n ? 'on' : ''}`} onClick={() => setName(n)} data-nick={n}>
            {n}
          </button>
        ))}
        <button type="button" className="chip" onClick={() => setSeed((x) => x + 1)} aria-label={he ? 'עוד הצעות' : 'More ideas'}>
          🎲
        </button>
      </div>
      <input className="nick-input" value={name} maxLength={20} dir="ltr" onChange={(e) => setName(e.target.value.trim())} placeholder="CodaFox42" aria-label={he ? 'כינוי' : 'Nickname'} />
      {check && !check.ok && (
        <p className="field-hint warn" role="status">
          {NICK_WHY[check.why][lang]}
        </p>
      )}
      <button className="btn primary" disabled={!check?.ok} onClick={() => (onSave(name), onClose())} data-nick-save="1">
        {he ? 'שמירה' : 'Save'}
      </button>
    </Sheet>
  );
}

// ---------------------------------------------------------------- country

export function CountrySheet({ lang, current, onSave, onClose }: { lang: Lang; current?: string | null; onSave: (c: string | null) => void; onClose: () => void }) {
  const he = lang === 'he';
  const [q, setQ] = useState('');
  const guess = useMemo(() => deviceCountry(), []);
  const all = useMemo(() => COUNTRY_CODES.map((c) => ({ c, n: countryName(c, lang) })).sort((a, b) => a.n.localeCompare(b.n, lang)), [lang]);
  const shown = all.filter((x) => !q || x.n.toLowerCase().includes(q.toLowerCase()) || x.c.toLowerCase() === q.toLowerCase());
  const pick = (c: string | null) => (onSave(c), onClose());
  return (
    <Sheet title={he ? 'מדינה ודגל' : 'Country & flag'} onClose={onClose}>
      {guess && guess !== current && (
        <button className="country-row suggested" onClick={() => pick(guess)}>
          <span className="cf">{flagEmoji(guess)}</span> {countryName(guess, lang)} <small>{he ? '· לפי המכשיר' : '· from your device'}</small>
        </button>
      )}
      <input className="nick-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={he ? 'חיפוש מדינה' : 'Search a country'} aria-label={he ? 'חיפוש מדינה' : 'Search a country'} />
      <div className="country-list">
        <button className={`country-row ${current === null ? 'on' : ''}`} onClick={() => pick(null)}>
          <span className="cf">—</span> {he ? 'בלי דגל' : 'No flag'}
        </button>
        {shown.map((x) => (
          <button key={x.c} className={`country-row ${current === x.c ? 'on' : ''}`} onClick={() => pick(x.c)} data-country={x.c}>
            <span className="cf">{flagEmoji(x.c)}</span> {x.n}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- picture (icon + colour, or a cropped photo)

export function PictureSheet({ lang, s, onSave, onClose }: { lang: Lang; s: Settings; onSave: (p: Partial<Settings>) => void; onClose: () => void }) {
  const he = lang === 'he';
  const [crop, setCrop] = useState<string | null>(null);
  const eff = effectivePrivacy(s.privacy, s.birthYear);
  const fileRef = useRef<HTMLInputElement>(null);
  if (crop) return <PhotoCrop lang={lang} src={crop} onCancel={() => setCrop(null)} onDone={(url) => (onSave({ avatarPhoto: url }), onClose())} />;
  return (
    <Sheet title={he ? 'התמונה שלך' : 'Your picture'} onClose={onClose}>
      <div className="icon-grid" role="radiogroup" aria-label={he ? 'אייקון' : 'Icon'}>
        {Object.keys(PROFILE_ICONS).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={!s.avatarPhoto && (s.avatarIcon ?? 'note') === k} className={`icon-opt ${!s.avatarPhoto && (s.avatarIcon ?? 'note') === k ? 'on' : ''}`} style={{ ['--av' as string]: s.avatarColor ?? PROFILE_COLORS[0] }} onClick={() => onSave({ avatarIcon: k, avatarPhoto: null })} data-icon={k}>
            <ProfileIcon k={k} size={26} />
          </button>
        ))}
      </div>
      <div className="color-row" role="radiogroup" aria-label={he ? 'צבע' : 'Colour'}>
        {PROFILE_COLORS.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={(s.avatarColor ?? PROFILE_COLORS[0]) === c} className={`color-opt ${(s.avatarColor ?? PROFILE_COLORS[0]) === c ? 'on' : ''}`} style={{ background: c }} onClick={() => onSave({ avatarColor: c })} aria-label={c} />
        ))}
      </div>
      {eff.canUploadPhoto ? (
        <>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => setCrop(String(r.result));
            r.readAsDataURL(f);
          }} />
          <button className="btn" onClick={() => fileRef.current?.click()} data-photo-upload="1">
            {he ? 'העלאת תמונה' : 'Upload a photo'}
          </button>
          {s.avatarPhoto && (
            <button className="btn ghost" onClick={() => onSave({ avatarPhoto: null })}>
              {he ? 'הסרת התמונה' : 'Remove the photo'}
            </button>
          )}
        </>
      ) : (
        <p className="field-hint">{he ? 'תמונה אישית זמינה מגיל 13.' : 'A personal photo is available from age 13.'}</p>
      )}
    </Sheet>
  );
}

/** Round crop like WhatsApp: drag to move, pinch / wheel / slider to zoom; keeps a 256 px WebP of the circle. */
export function PhotoCrop({ lang, src, onCancel, onDone }: { lang: Lang; src: string; onCancel: () => void; onDone: (dataUrl: string) => void }) {
  const he = lang === 'he';
  const V = 260; // viewport size (px)
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  useEffect(() => {
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = src;
  }, [src]);
  const base = img ? V / Math.min(img.width, img.height) : 1; // "cover" scale at zoom 1
  const scale = base * zoom;
  const clamp = (p: { x: number; y: number }, z = zoom) => {
    if (!img) return p;
    const w = img.width * base * z;
    const h = img.height * base * z;
    const mx = Math.max(0, (w - V) / 2);
    const my = Math.max(0, (h - V) / 2);
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  };
  const setZ = (z: number) => {
    const nz = Math.max(1, Math.min(4, z));
    setZoom(nz);
    setPos((p) => clamp(p, nz));
  };
  const done = () => {
    if (!img) return;
    const out = 256;
    const c = document.createElement('canvas');
    c.width = out;
    c.height = out;
    const ctx = c.getContext('2d')!;
    const k = out / V;
    const w = img.width * scale * k;
    const h = img.height * scale * k;
    ctx.drawImage(img, out / 2 - w / 2 + pos.x * k, out / 2 - h / 2 + pos.y * k, w, h);
    let url = c.toDataURL('image/webp', 0.85);
    if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', 0.85);
    onDone(url);
  };
  return (
    <Sheet title={he ? 'מיקום התמונה בעיגול' : 'Fit the photo in the circle'} onClose={onCancel}>
      <div
        className="crop-view"
        style={{ width: V, height: V }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
          }
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            setZ((pinch.current.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d);
          } else if (pointers.current.size === 1) {
            setPos((p) => clamp({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
        }}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onWheel={(e) => setZ(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
      >
        {img && <img src={src} alt="" draggable={false} style={{ width: img.width * scale, height: img.height * scale, transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }} />}
        <span className="crop-ring" aria-hidden="true" />
      </div>
      <label className="crop-zoom">
        <span>{he ? 'זום' : 'Zoom'}</span>
        <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZ(Number(e.target.value))} />
      </label>
      <div className="row">
        <button className="btn ghost" onClick={onCancel}>
          {he ? 'ביטול' : 'Cancel'}
        </button>
        <button className="btn primary grow" onClick={done} disabled={!img} data-crop-done="1">
          {he ? 'שימוש בתמונה' : 'Use this photo'}
        </button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- the profile card (Settings → Account, Today row)

export function ProfileCard({ lang, s, onChange }: { lang: Lang; s: Settings; onChange: (p: Partial<Settings>) => void }) {
  const he = lang === 'he';
  const [open, setOpen] = useState<null | 'nick' | 'flag' | 'pic'>(null);
  return (
    <section className="set-card profile-card" data-profile="1">
      <div className="pc-row">
        <button className="pc-avatar" onClick={() => setOpen('pic')} aria-label={he ? 'התמונה שלך' : 'Your picture'}>
          <Avatar s={s} size={56} />
        </button>
        <span className="pc-text">
          <b dir="ltr">{s.nickname ?? (he ? 'בלי כינוי עדיין' : 'No nickname yet')}</b>
          <small>{s.country ? countryName(s.country, lang) : he ? 'בלי דגל' : 'No flag'}</small>
        </span>
      </div>
      <div className="pc-actions">
        <button className="btn small" onClick={() => setOpen('nick')} data-open-nick="1">
          {s.nickname ? (he ? 'שינוי כינוי' : 'Change nickname') : he ? 'בחירת כינוי' : 'Choose a nickname'}
        </button>
        <button className="btn small" onClick={() => setOpen('flag')}>
          {he ? 'דגל' : 'Flag'}
        </button>
        <button className="btn small" onClick={() => setOpen('pic')}>
          {he ? 'תמונה' : 'Picture'}
        </button>
      </div>
      {open === 'nick' && <NicknameSheet lang={lang} current={s.nickname} onSave={(nickname) => onChange({ nickname })} onClose={() => setOpen(null)} />}
      {open === 'flag' && <CountrySheet lang={lang} current={s.country} onSave={(country) => onChange({ country })} onClose={() => setOpen(null)} />}
      {open === 'pic' && <PictureSheet lang={lang} s={s} onSave={onChange} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Today: a small row until the player has a nickname (their name on boards, friends and duets). */
export function NickPrompt({ lang, s, onChange }: { lang: Lang; s: Settings; onChange: (p: Partial<Settings>) => void }) {
  const he = lang === 'he';
  const [open, setOpen] = useState(false);
  if (s.nickname || s.hideNickPrompt) return null;
  return (
    <>
      <div className="today-nick-wrap" style={{ display: 'flex', gap: 6 }}>
        <button className="today-nick" onClick={() => setOpen(true)} data-nick-prompt="1">
          <Avatar s={s} size={32} />
          <span>
            {he ? 'בחירת כינוי' : 'Choose a nickname'}
            <br />
            <small>{he ? 'השם שלכם בטבלאות ואצל חברים' : 'Your name on boards and with friends'}</small>
          </span>
        </button>
        <button className="icon-btn" onClick={() => onChange({ hideNickPrompt: true })} aria-label={he ? 'לא עכשיו' : 'Not now'}>
          ✕
        </button>
      </div>
      {open && <NicknameSheet lang={lang} onSave={(nickname) => onChange({ nickname, country: s.country === undefined ? deviceCountry() : s.country })} onClose={() => setOpen(false)} />}
    </>
  );
}
