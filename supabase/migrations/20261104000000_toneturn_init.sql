-- ToneTurn cloud save: profiles + idempotent lesson results. Owner-only RLS.
-- Tables are prefixed toneturn_ so the app can share a Supabase project with other apps safely.


create table if not exists public.toneturn_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.toneturn_lesson_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Client-generated session id: a replayed completion cannot be stored (or rewarded) twice.
  session_id text not null check (char_length(session_id) between 4 and 64),
  lesson_id text not null check (lesson_id in ('bflat-two-homes', 'degrees-135', 'major-minor', 'cadences', 'sing-home-five')),
  lesson_version int not null check (lesson_version between 1 and 1000),
  first_try int not null check (first_try >= 0),
  total int not null check (total between 1 and 50),
  xp int not null check (xp >= 0),
  missed jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, session_id),
  -- Basic server-side plausibility: at most 15 XP per first-try answer.
  constraint first_try_le_total check (first_try <= total),
  constraint xp_plausible check (xp <= first_try * 15),
  constraint not_in_future check (completed_at <= now() + interval '5 minutes')
);

create index if not exists toneturn_lesson_results_user_completed on public.toneturn_lesson_results (user_id, completed_at);

alter table public.toneturn_profiles enable row level security;
alter table public.toneturn_lesson_results enable row level security;

create policy "own profile: read" on public.toneturn_profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile: insert" on public.toneturn_profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "own profile: update" on public.toneturn_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own results: read" on public.toneturn_lesson_results for select to authenticated using ((select auth.uid()) = user_id);
create policy "own results: insert" on public.toneturn_lesson_results for insert to authenticated with check ((select auth.uid()) = user_id);
-- No update / delete policies: results are append-only from the client.

grant select, insert, update on public.toneturn_profiles to authenticated;
grant select, insert on public.toneturn_lesson_results to authenticated;

create or replace function public.toneturn_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists toneturn_profiles_touch on public.toneturn_profiles;
create trigger toneturn_profiles_touch before update on public.toneturn_profiles
  for each row execute function public.toneturn_touch_updated_at();

-- Signed-out visitors get nothing; results are never updated or deleted from the client.
revoke all on public.toneturn_profiles from anon;
revoke all on public.toneturn_lesson_results from anon;
revoke update, delete, truncate on public.toneturn_lesson_results from authenticated;
revoke delete, truncate on public.toneturn_profiles from authenticated;
