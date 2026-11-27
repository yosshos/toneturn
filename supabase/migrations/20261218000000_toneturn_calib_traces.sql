-- ToneTurn: calibration uploads (SPEC-PRACTICE-INTELLIGENCE §9, §9א; owner 2026-11-27). Safe to re-run.
-- Accounts marked here (by user id, set in the database only — never in the repo or the client) upload their take
-- traces (engine/drills/tendency.ts, the compact per-take timing summary) for calibrating P1's thresholds. Other
-- accounts upload nothing: the upload is a no-op for them. Neither table is readable from a client.

create table if not exists public.toneturn_calib_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- the main calibration account weighs more than a secondary one
  weight real not null default 1,
  created_at timestamptz not null default now()
);
alter table public.toneturn_calib_accounts enable row level security;

create table if not exists public.toneturn_calib_traces (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  at timestamptz not null,
  trace jsonb not null,
  uploaded_at timestamptz not null default now(),
  primary key (user_id, item_id, at)
);
alter table public.toneturn_calib_traces enable row level security;
create index if not exists toneturn_calib_traces_at on public.toneturn_calib_traces (user_id, at);

create or replace function public.toneturn_calib_enabled()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.toneturn_calib_accounts a where a.user_id = (select auth.uid()));
$$;

create or replace function public.toneturn_calib_upload(p_traces jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  n integer;
begin
  if me is null or not exists (select 1 from public.toneturn_calib_accounts a where a.user_id = me) then return 0; end if;
  if jsonb_typeof(p_traces) <> 'array' or jsonb_array_length(p_traces) > 300 then raise exception 'bad batch'; end if;
  insert into public.toneturn_calib_traces (user_id, item_id, at, trace)
  select me, left(t->>'id', 200), (t->>'at')::timestamptz, t
  from jsonb_array_elements(p_traces) t
  where jsonb_typeof(t) = 'object' and t ? 'id' and t ? 'at' and pg_column_size(t) < 16000
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.toneturn_calib_enabled() from public, anon;
revoke all on function public.toneturn_calib_upload(jsonb) from public, anon;
grant execute on function public.toneturn_calib_enabled() to authenticated;
grant execute on function public.toneturn_calib_upload(jsonb) to authenticated;
