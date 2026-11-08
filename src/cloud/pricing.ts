// Pricing & plans (0.54, migration 20261126): public prices / sale / free-tier limit, my plan, and the owner's controls.
import { supabase } from './cloud';

export type PlanId = 'free' | 'plus' | 'teacher' | 'lifetime';
export interface Pricing {
  currency: string;
  plans: { id: 'plus' | 'teacher'; monthly: number; yearly: number }[];
  free: { limitOn: boolean; dailyMinutes: number };
  sale: { active: boolean; percent: number; until: string | null; text: { en: string; he: string } };
  checkout: Record<string, string>;
}
export interface MyPlan {
  plan: PlanId;
  until: string | null;
  source: string | null;
  admin: boolean;
}
export const DEFAULT_PRICING: Pricing = {
  currency: 'ILS',
  plans: [
    { id: 'plus', monthly: 29, yearly: 199 },
    { id: 'teacher', monthly: 59, yearly: 449 },
  ],
  free: { limitOn: false, dailyMinutes: 20 },
  sale: { active: false, percent: 0, until: null, text: { en: '', he: '' } },
  checkout: {},
};

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const sb = supabase();
  if (!sb) throw new Error('Cloud is not configured');
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function loadPricing(): Promise<Pricing> {
  try {
    const p = await rpc<Pricing | null>('toneturn_pricing');
    return { ...DEFAULT_PRICING, ...(p ?? {}) };
  } catch {
    return DEFAULT_PRICING;
  }
}
export async function myPlan(): Promise<MyPlan> {
  try {
    return await rpc<MyPlan>('toneturn_my_plan');
  } catch {
    return { plan: 'free', until: null, source: null, admin: false };
  }
}
export const savePricing = (p: Pricing) => rpc<void>('toneturn_pricing_set', { p_value: p });
export const grantPlan = (email: string, plan: PlanId, until: string | null, note: string) => rpc<boolean>('toneturn_grant_plan', { p_email: email, p_plan: plan, p_until: until, p_note: note });
export const listPlans = () => rpc<{ email: string; plan: PlanId; until: string | null; source: string; note: string | null; updated_at: string }[]>('toneturn_plans_list');

/** The sale applies now (active, and not past its end). */
export const saleNow = (p: Pricing, now = new Date()) => p.sale.active && p.sale.percent > 0 && (!p.sale.until || new Date(p.sale.until) > now);
/** A price after the sale, rounded to a whole unit. */
export const salePrice = (p: Pricing, price: number, now = new Date()) => (saleNow(p, now) ? Math.round(price * (1 - p.sale.percent / 100)) : price);
/** The free tier's cool-down: on, the player is on the free plan and not an admin, and today's minutes are used up. */
export const coolDown = (p: Pricing, plan: MyPlan | null, minutesToday: number) => p.free.limitOn && (!plan || (plan.plan === 'free' && !plan.admin)) && minutesToday >= p.free.dailyMinutes;
