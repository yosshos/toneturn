// Plans (0.54): the player's plan, the prices (with the sale when one is on), and the way to upgrade; the owner's
// control panel (prices, sale, the free tier's daily limit, payment links, plans given by email); the cool-down sheet.
import { useEffect, useState } from 'react';
import { ReportsAdmin } from './Community';
import { grantPlan, listPlans, loadPricing, myPlan, saleNow, salePrice, savePricing, type MyPlan, type PlanId, type Pricing } from '../cloud/pricing';

type Lang = 'en' | 'he';
const PLAN_NAME: Record<PlanId, { en: string; he: string }> = {
  free: { en: 'Free', he: 'חינם' },
  plus: { en: 'Plus', he: 'פלוס' },
  teacher: { en: 'Teacher', he: 'מורה' },
  lifetime: { en: 'Lifetime', he: 'לכל החיים' },
};
const PLAN_WHAT: Record<'plus' | 'teacher', { en: string; he: string }> = {
  plus: { en: 'Unlimited practice, every topic and level, pieces, charts and the studio.', he: 'אימון ללא הגבלה, כל הנושאים והרמות, יצירות, מהלכים והסטודיו.' },
  teacher: { en: 'Everything in Plus, plus classes, assignments, the grading inbox and parent reports.', he: 'כל מה שבפלוס, ועוד כיתות, משימות, תיבת בדיקה ודוחות להורים.' },
};

export function PlansScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const he = lang === 'he';
  const [p, setP] = useState<Pricing | null>(null);
  const [mine, setMine] = useState<MyPlan | null>(null);
  const [yearly, setYearly] = useState(true);
  useEffect(() => {
    void loadPricing().then(setP);
    void myPlan().then(setMine);
  }, []);
  return (
    <main className="panel-screen plans" data-plans="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{he ? 'מנויים' : 'Plans'}</h1>
      </header>
      {mine && (
        <p className="field-hint" data-my-plan={mine.plan}>
          {he ? 'המנוי שלך' : 'Your plan'}: <b>{PLAN_NAME[mine.plan][lang]}</b>
          {mine.until ? ` · ${he ? 'עד' : 'until'} ${new Date(mine.until).toLocaleDateString(lang)}` : ''}
        </p>
      )}
      {p && saleNow(p) && (
        <p className="plans-sale" data-sale={p.sale.percent}>
          {p.sale.text[lang] || (he ? 'מבצע' : 'Sale')} · −{p.sale.percent}%{p.sale.until ? ` · ${he ? 'עד' : 'until'} ${new Date(p.sale.until).toLocaleDateString(lang)}` : ''}
        </p>
      )}
      <div className="seg plans-period" role="radiogroup">
        <button role="radio" aria-checked={!yearly} className={!yearly ? 'on' : ''} onClick={() => setYearly(false)}>
          {he ? 'חודשי' : 'Monthly'}
        </button>
        <button role="radio" aria-checked={yearly} className={yearly ? 'on' : ''} onClick={() => setYearly(true)}>
          {he ? 'שנתי' : 'Yearly'}
        </button>
      </div>
      <div className="plans-grid">
        {p?.plans.map((pl) => {
          const base = yearly ? pl.yearly : pl.monthly;
          const price = salePrice(p, base);
          const link = p.checkout[`${pl.id}_${yearly ? 'yearly' : 'monthly'}`];
          return (
            <article key={pl.id} className={`plan-card ${mine?.plan === pl.id ? 'current' : ''}`} data-plan={pl.id}>
              <h2>{PLAN_NAME[pl.id][lang]}</h2>
              <p className="plan-price" dir="ltr">
                {price !== base && <s>{base}</s>} {price} {p.currency}
                <small> / {yearly ? (he ? 'שנה' : 'year') : he ? 'חודש' : 'month'}</small>
              </p>
              <p className="field-hint">{PLAN_WHAT[pl.id][lang]}</p>
              {mine?.plan === pl.id ? (
                <span className="field-hint">{he ? 'המנוי הנוכחי' : 'Current plan'}</span>
              ) : link ? (
                <a className="btn primary small" href={link} target="_blank" rel="noopener noreferrer">
                  {he ? 'לשדרג' : 'Upgrade'}
                </a>
              ) : (
                <span className="field-hint">{he ? 'בקרוב' : 'Coming soon'}</span>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}

/** The owner's control panel (admins only; the server refuses everyone else). */
export function AdminScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const he = lang === 'he';
  const [p, setP] = useState<Pricing | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listPlans>>>([]);
  const [g, setG] = useState<{ email: string; plan: PlanId; until: string; note: string }>({ email: '', plan: 'plus', until: '', note: '' });
  const reload = () => void listPlans().then(setRows, () => {});
  useEffect(() => {
    void loadPricing().then(setP);
    reload();
  }, []);
  if (!p) return null;
  const set = (patch: Partial<Pricing>) => setP({ ...p, ...patch });
  const num = (v: string) => Math.max(0, Number(v) || 0);
  const save = async () => {
    try {
      await savePricing(p);
      setMsg(he ? 'נשמר' : 'Saved');
    } catch (e) {
      setMsg(String((e as Error).message));
    }
  };
  return (
    <main className="panel-screen admin" data-admin="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={he ? 'חזרה' : 'Back'}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{he ? 'ניהול מנויים ומחירים' : 'Plans & pricing'}</h1>
      </header>
      <section className="set-card">
        <h2>{he ? 'מחירים' : 'Prices'}</h2>
        <label className="field-row">
          <span>{he ? 'מטבע' : 'Currency'}</span>
          <input value={p.currency} maxLength={3} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} dir="ltr" />
        </label>
        {p.plans.map((pl, i) => (
          <div key={pl.id} className="admin-row">
            <b>{PLAN_NAME[pl.id][lang]}</b>
            <label>
              {he ? 'חודשי' : 'Monthly'}
              <input type="number" min={0} value={pl.monthly} onChange={(e) => set({ plans: p.plans.map((x, j) => (j === i ? { ...x, monthly: num(e.target.value) } : x)) })} dir="ltr" />
            </label>
            <label>
              {he ? 'שנתי' : 'Yearly'}
              <input type="number" min={0} value={pl.yearly} onChange={(e) => set({ plans: p.plans.map((x, j) => (j === i ? { ...x, yearly: num(e.target.value) } : x)) })} dir="ltr" />
            </label>
            <label>
              {he ? 'קישור תשלום חודשי' : 'Monthly payment link'}
              <input value={p.checkout[`${pl.id}_monthly`] ?? ''} onChange={(e) => set({ checkout: { ...p.checkout, [`${pl.id}_monthly`]: e.target.value.trim() } })} placeholder="https://…" dir="ltr" />
            </label>
            <label>
              {he ? 'קישור תשלום שנתי' : 'Yearly payment link'}
              <input value={p.checkout[`${pl.id}_yearly`] ?? ''} onChange={(e) => set({ checkout: { ...p.checkout, [`${pl.id}_yearly`]: e.target.value.trim() } })} placeholder="https://…" dir="ltr" />
            </label>
          </div>
        ))}
      </section>
      <section className="set-card">
        <h2>{he ? 'מבצע' : 'Sale'}</h2>
        <label className="toggle-row">
          <input type="checkbox" checked={p.sale.active} onChange={(e) => set({ sale: { ...p.sale, active: e.target.checked } })} data-admin-sale="1" />
          <span>{he ? 'מבצע פעיל' : 'Sale on'}</span>
        </label>
        <div className="admin-row">
          <label>
            {he ? 'הנחה %' : 'Discount %'}
            <input type="number" min={0} max={90} value={p.sale.percent} onChange={(e) => set({ sale: { ...p.sale, percent: Math.min(90, num(e.target.value)) } })} dir="ltr" />
          </label>
          <label>
            {he ? 'עד תאריך' : 'Until'}
            <input type="date" value={p.sale.until ? p.sale.until.slice(0, 10) : ''} onChange={(e) => set({ sale: { ...p.sale, until: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : null } })} />
          </label>
          <label>
            {he ? 'טקסט (עברית)' : 'Text (Hebrew)'}
            <input value={p.sale.text.he} maxLength={80} onChange={(e) => set({ sale: { ...p.sale, text: { ...p.sale.text, he: e.target.value } } })} />
          </label>
          <label>
            {he ? 'טקסט (אנגלית)' : 'Text (English)'}
            <input value={p.sale.text.en} maxLength={80} onChange={(e) => set({ sale: { ...p.sale, text: { ...p.sale.text, en: e.target.value } } })} dir="ltr" />
          </label>
        </div>
      </section>
      <section className="set-card">
        <h2>{he ? 'המסלול החינמי' : 'Free tier'}</h2>
        <label className="toggle-row">
          <input type="checkbox" checked={p.free.limitOn} onChange={(e) => set({ free: { ...p.free, limitOn: e.target.checked } })} data-admin-limit="1" />
          <span>{he ? 'להגביל דקות אימון ביום (אחריהן: הפסקה רגועה עד מחר)' : 'Limit daily practice minutes (then a calm cool-down until tomorrow)'}</span>
        </label>
        <label className="field-row">
          <span>{he ? 'דקות ביום' : 'Minutes a day'}</span>
          <input type="number" min={5} max={240} value={p.free.dailyMinutes} onChange={(e) => set({ free: { ...p.free, dailyMinutes: Math.max(5, num(e.target.value)) } })} dir="ltr" />
        </label>
      </section>
      <button className="btn primary" onClick={() => void save()} data-admin-save="1">
        {he ? 'לשמור' : 'Save'}
      </button>
      {msg && <p className="field-hint">{msg}</p>}
      <section className="set-card">
        <h2>{he ? 'לתת מנוי' : 'Give a plan'}</h2>
        <div className="admin-row">
          <label>
            {he ? 'אימייל' : 'Email'}
            <input type="email" value={g.email} onChange={(e) => setG({ ...g, email: e.target.value })} dir="ltr" />
          </label>
          <label>
            {he ? 'מנוי' : 'Plan'}
            <select value={g.plan} onChange={(e) => setG({ ...g, plan: e.target.value as PlanId })}>
              {(['plus', 'teacher', 'lifetime', 'free'] as PlanId[]).map((x) => (
                <option key={x} value={x}>
                  {PLAN_NAME[x][lang]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {he ? 'עד (ריק = ללא סוף)' : 'Until (empty = no end)'}
            <input type="date" value={g.until} onChange={(e) => setG({ ...g, until: e.target.value })} />
          </label>
          <label>
            {he ? 'הערה' : 'Note'}
            <input value={g.note} maxLength={200} onChange={(e) => setG({ ...g, note: e.target.value })} />
          </label>
        </div>
        <button
          className="btn ghost small"
          disabled={!g.email.includes('@')}
          onClick={() =>
            void grantPlan(g.email, g.plan, g.until ? new Date(g.until + 'T23:59:59').toISOString() : null, g.note).then(
              (ok) => {
                setMsg(ok ? (he ? 'ניתן' : 'Given') : he ? 'אין משתמש עם האימייל הזה' : 'No user with that email');
                reload();
              },
              (e) => setMsg(String((e as Error).message)),
            )
          }
        >
          {he ? 'לתת' : 'Give'}
        </button>
        {rows.length > 0 && (
          <div className="roster-wrap">
            <table className="roster">
              <thead>
                <tr>
                  <th>{he ? 'אימייל' : 'Email'}</th>
                  <th>{he ? 'מנוי' : 'Plan'}</th>
                  <th>{he ? 'עד' : 'Until'}</th>
                  <th>{he ? 'מקור' : 'Source'}</th>
                  <th>{he ? 'הערה' : 'Note'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.email}>
                    <td dir="ltr">{r.email}</td>
                    <td>{PLAN_NAME[r.plan][lang]}</td>
                    <td dir="ltr">{r.until ? new Date(r.until).toLocaleDateString(lang) : '—'}</td>
                    <td>{r.source}</td>
                    <td>{r.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ReportsAdmin lang={lang} />
    </main>
  );
}

/** The free tier's cool-down: calm, no ads — today's practice is done; tomorrow it opens again, or upgrade. */
export function CoolDownSheet({ lang, minutes, onPlans, onClose }: { lang: Lang; minutes: number; onPlans: () => void; onClose: () => void }) {
  const he = lang === 'he';
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} data-cooldown="1">
        <h2>{he ? 'סיימתם את האימון של היום' : 'That’s today’s practice'}</h2>
        <p>{he ? `${minutes} הדקות החינמיות של היום נוצלו. האוזן ממשיכה לעבוד גם במנוחה — נתראה מחר. רוצים להמשיך עכשיו? מנוי פלוס בלי הגבלה.` : `Today’s ${minutes} free minutes are used. The ear keeps working while it rests — see you tomorrow. Want to keep going now? Plus has no limit.`}</p>
        <div className="row">
          <button className="btn primary" onClick={onPlans}>
            {he ? 'למנויים' : 'See plans'}
          </button>
          <button className="btn ghost" onClick={onClose}>
            {he ? 'עד מחר' : 'Until tomorrow'}
          </button>
        </div>
      </div>
    </div>
  );
}
