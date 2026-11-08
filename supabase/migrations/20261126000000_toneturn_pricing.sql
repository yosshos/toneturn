-- ToneTurn: pricing & payments control (0.54). The owner sets plans, prices, sales, the free tier's daily limit and the
-- payment links from an admin screen in the app; grants a plan to a user by email; everyone reads the public pricing
-- and their own plan. Payment providers (checkout links now, webhooks later) plug into toneturn_entitlements.
-- All access through security-definer functions; tables have no grants. Safe to re-run.

create table if not exists public.toneturn_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.toneturn_config (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  value jsonb not null check (pg_column_size(value) <= 16384),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create table if not exists public.toneturn_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('free', 'plus', 'teacher', 'lifetime')),
  until timestamptz,
  source text not null default 'grant' check (source in ('grant', 'checkout', 'promo')),
  note text check (note is null or char_length(note) <= 200),
  granted_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.toneturn_admins enable row level security;
alter table public.toneturn_config enable row level security;
alter table public.toneturn_entitlements enable row level security;
revoke all on public.toneturn_admins, public.toneturn_config, public.toneturn_entitlements from anon, authenticated;

-- The owner is the first admin.
insert into public.toneturn_admins (user_id)
select id from auth.users where lower(email) = 'yos.s@sitrin.co.il'
on conflict do nothing;

-- Default pricing: everything free until the owner turns the limit on.
insert into public.toneturn_config (key, value) values ('pricing', jsonb_build_object(
  'currency', 'ILS',
  'plans', jsonb_build_array(
    jsonb_build_object('id', 'plus', 'monthly', 29, 'yearly', 199),
    jsonb_build_object('id', 'teacher', 'monthly', 59, 'yearly', 449)
  ),
  'free', jsonb_build_object('limitOn', false, 'dailyMinutes', 20),
  'sale', jsonb_build_object('active', false, 'percent', 0, 'until', null, 'text', jsonb_build_object('en', '', 'he', '')),
  'checkout', jsonb_build_object('plus_monthly', '', 'plus_yearly', '', 'teacher_monthly', '', 'teacher_yearly', '')
)) on conflict (key) do nothing;

create or replace function public.toneturn_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.toneturn_admins a where a.user_id = (select auth.uid()));
$$;

/** Public pricing (anyone, signed in or not). */
create or replace function public.toneturn_pricing()
returns jsonb language sql stable security definer set search_path = '' as $$
  select value from public.toneturn_config where key = 'pricing';
$$;

/** Admin: replace the pricing (validated loosely; the app shapes it). */
create or replace function public.toneturn_pricing_set(p_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.toneturn_is_admin() then raise exception 'admins only'; end if;
  if jsonb_typeof(p_value) <> 'object' or not (p_value ? 'plans') or not (p_value ? 'free') then raise exception 'bad pricing'; end if;
  insert into public.toneturn_config (key, value, updated_at, updated_by) values ('pricing', p_value, now(), (select auth.uid()))
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
end $$;

/** My plan (free when nothing is set or it expired). */
create or replace function public.toneturn_my_plan()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_build_object('plan', e.plan, 'until', e.until, 'source', e.source)
    from public.toneturn_entitlements e
    where e.user_id = (select auth.uid()) and (e.until is null or e.until > now())
  ), jsonb_build_object('plan', 'free', 'until', null, 'source', null))
  || jsonb_build_object('admin', public.toneturn_is_admin());
$$;

/** Admin: give a plan to a user by email (until = null: no end). Returns false when no such user. */
create or replace function public.toneturn_grant_plan(p_email text, p_plan text, p_until timestamptz, p_note text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  u uuid;
begin
  if not public.toneturn_is_admin() then raise exception 'admins only'; end if;
  select id into u from auth.users where lower(email) = lower(btrim(p_email));
  if u is null then return false; end if;
  insert into public.toneturn_entitlements (user_id, plan, until, source, note, granted_by, updated_at)
  values (u, p_plan, p_until, 'grant', nullif(left(btrim(coalesce(p_note, '')), 200), ''), (select auth.uid()), now())
  on conflict (user_id) do update set plan = excluded.plan, until = excluded.until, source = 'grant', note = excluded.note, granted_by = excluded.granted_by, updated_at = now();
  return true;
end $$;

/** Admin: who has a plan. */
create or replace function public.toneturn_plans_list()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.toneturn_is_admin() then raise exception 'admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('email', u.email, 'plan', e.plan, 'until', e.until, 'source', e.source, 'note', e.note, 'updated_at', e.updated_at) order by e.updated_at desc)
    from public.toneturn_entitlements e join auth.users u on u.id = e.user_id), '[]'::jsonb);
end $$;

revoke all on function public.toneturn_is_admin() from public, anon;
revoke all on function public.toneturn_pricing_set(jsonb) from public, anon;
revoke all on function public.toneturn_my_plan() from public, anon;
revoke all on function public.toneturn_grant_plan(text, text, timestamptz, text) from public, anon;
revoke all on function public.toneturn_plans_list() from public, anon;
grant execute on function public.toneturn_pricing() to anon, authenticated;
grant execute on function public.toneturn_is_admin() to authenticated;
grant execute on function public.toneturn_pricing_set(jsonb) to authenticated;
grant execute on function public.toneturn_my_plan() to authenticated;
grant execute on function public.toneturn_grant_plan(text, text, timestamptz, text) to authenticated;
grant execute on function public.toneturn_plans_list() to authenticated;
