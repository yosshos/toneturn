-- ToneTurn: friends (codes, requests, stats), game bests, push subscriptions for streak reminders.
-- Run after 20261104000000_toneturn_init.sql. Safe to re-run.

-- ---------------------------------------------------------------- profile additions
alter table public.toneturn_profiles
  add column if not exists friend_code text unique,
  add column if not exists tz text not null default 'UTC',
  add column if not exists reminder_hour int not null default 19 check (reminder_hour between 0 and 23);

-- ---------------------------------------------------------------- friendships
create table if not exists public.toneturn_friendships (
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
alter table public.toneturn_friendships enable row level security;
-- Read-only for the two people involved; all changes go through the functions below.
drop policy if exists "friendships: involved can read" on public.toneturn_friendships;
create policy "friendships: involved can read" on public.toneturn_friendships for select to authenticated
  using ((select auth.uid()) in (requester, addressee));
revoke all on public.toneturn_friendships from anon;
revoke insert, update, delete, truncate on public.toneturn_friendships from authenticated;
grant select on public.toneturn_friendships to authenticated;

-- ---------------------------------------------------------------- game bests (self-reported)
create table if not exists public.toneturn_game_bests (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('melody', 'rhythm')),
  best int not null check (best between 0 and 200),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table public.toneturn_game_bests enable row level security;
drop policy if exists "game bests: own read" on public.toneturn_game_bests;
create policy "game bests: own read" on public.toneturn_game_bests for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.toneturn_game_bests from anon;
revoke insert, update, delete, truncate on public.toneturn_game_bests from authenticated;
grant select on public.toneturn_game_bests to authenticated;

-- ---------------------------------------------------------------- push subscriptions
create table if not exists public.toneturn_push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  tz text not null default 'UTC',
  hour int not null default 19 check (hour between 0 and 23),
  lang text not null default 'en' check (lang in ('en', 'he')),
  last_sent_on date,
  created_at timestamptz not null default now()
);
alter table public.toneturn_push_subscriptions enable row level security;
drop policy if exists "push: own read" on public.toneturn_push_subscriptions;
drop policy if exists "push: own insert" on public.toneturn_push_subscriptions;
drop policy if exists "push: own update" on public.toneturn_push_subscriptions;
drop policy if exists "push: own delete" on public.toneturn_push_subscriptions;
create policy "push: own read" on public.toneturn_push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "push: own insert" on public.toneturn_push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "push: own update" on public.toneturn_push_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "push: own delete" on public.toneturn_push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.toneturn_push_subscriptions from anon;
grant select, insert, update, delete on public.toneturn_push_subscriptions to authenticated;

-- ---------------------------------------------------------------- helpers

-- Current streak in a time zone: consecutive local days with a completed lesson, ending today or yesterday.
create or replace function public.toneturn_streak(p_user uuid, p_tz text)
returns int language sql stable security definer set search_path = '' as $$
  with days as (
    select distinct (r.completed_at at time zone p_tz)::date as d
    from public.toneturn_lesson_results r where r.user_id = p_user
  ),
  today as (select (now() at time zone p_tz)::date as t),
  anchored as (
    select d, row_number() over (order by d desc) as rn from days
    where d <= (select t from today)
  )
  select coalesce((
    select count(*)::int from anchored a
    where a.d = (select max(d) from anchored) - (a.rn - 1)::int
      and (select max(d) from anchored) >= (select t from today) - 1
  ), 0);
$$;

-- 6-character friend code without look-alike characters.
create or replace function public.toneturn_new_code()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.toneturn_profiles where friend_code = c);
  end loop;
  return c;
end;
$$;

-- Ensure my profile exists (with a friend code); optionally update name / time zone / reminder hour.
create or replace function public.toneturn_my_profile(p_name text default null, p_tz text default null, p_hour int default null)
returns table (friend_code text, display_name text, tz text, reminder_hour int)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  insert into public.toneturn_profiles (id, friend_code) values (me, public.toneturn_new_code())
    on conflict (id) do nothing;
  update public.toneturn_profiles p set
    friend_code = coalesce(p.friend_code, public.toneturn_new_code()),
    display_name = coalesce(nullif(left(trim(p_name), 40), ''), p.display_name),
    tz = case when p_tz is not null and exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then p_tz else p.tz end,
    reminder_hour = coalesce(case when p_hour between 0 and 23 then p_hour end, p.reminder_hour)
  where p.id = me;
  return query select p.friend_code, p.display_name, p.tz, p.reminder_hour from public.toneturn_profiles p where p.id = me;
end;
$$;

create or replace function public.toneturn_add_friend(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  other uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select id into other from public.toneturn_profiles where friend_code = upper(trim(p_code));
  if other is null then return 'not_found'; end if;
  if other = me then return 'self'; end if;
  if exists (select 1 from public.toneturn_friendships where status = 'accepted'
             and ((requester = me and addressee = other) or (requester = other and addressee = me))) then
    return 'already';
  end if;
  -- They already asked me → accept.
  update public.toneturn_friendships set status = 'accepted' where requester = other and addressee = me;
  if found then return 'accepted'; end if;
  insert into public.toneturn_friendships (requester, addressee) values (me, other) on conflict do nothing;
  return 'requested';
end;
$$;

create or replace function public.toneturn_respond_friend(p_other uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_accept then
    update public.toneturn_friendships set status = 'accepted' where requester = p_other and addressee = auth.uid();
  else
    delete from public.toneturn_friendships where requester = p_other and addressee = auth.uid() and status = 'pending';
  end if;
end;
$$;

create or replace function public.toneturn_remove_friend(p_other uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.toneturn_friendships
  where (requester = auth.uid() and addressee = p_other) or (requester = p_other and addressee = auth.uid());
$$;

create or replace function public.toneturn_report_game_best(p_kind text, p_best int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_kind not in ('melody', 'rhythm') or p_best < 0 or p_best > 200 then raise exception 'bad input'; end if;
  insert into public.toneturn_game_bests (user_id, kind, best) values (auth.uid(), p_kind, p_best)
    on conflict (user_id, kind) do update set best = greatest(public.toneturn_game_bests.best, excluded.best), updated_at = now()
    returning best into v;
  return v;
end;
$$;

-- Me + friends with stats (accepted only), and pending requests (name only).
create or replace function public.toneturn_friends()
returns table (
  user_id uuid, name text, relation text,
  week_xp int, total_xp int, streak int, lessons_done int,
  best_melody int, best_rhythm int, last_active timestamptz
)
language sql stable security definer set search_path = '' as $$
  with me as (
    select auth.uid() as id, coalesce((select tz from public.toneturn_profiles where id = auth.uid()), 'UTC') as tz
  ),
  rel as (
    select (select id from me) as uid, 'me'::text as relation
    union all
    select case when f.requester = (select id from me) then f.addressee else f.requester end,
           case when f.status = 'accepted' then 'friend'
                when f.requester = (select id from me) then 'outgoing' else 'incoming' end
    from public.toneturn_friendships f
    where (select id from me) in (f.requester, f.addressee)
  ),
  week_start as (
    select (date_trunc('week', now() at time zone (select tz from me)) at time zone (select tz from me)) as ws
  )
  select
    r.uid,
    coalesce(nullif(p.display_name, ''), 'Player'),
    r.relation,
    case when r.relation in ('me', 'friend') then coalesce((select sum(x.xp) from public.toneturn_lesson_results x where x.user_id = r.uid and x.completed_at >= (select ws from week_start)), 0)::int end,
    case when r.relation in ('me', 'friend') then coalesce((select sum(x.xp) from public.toneturn_lesson_results x where x.user_id = r.uid), 0)::int end,
    case when r.relation in ('me', 'friend') then public.toneturn_streak(r.uid, coalesce(p.tz, 'UTC')) end,
    case when r.relation in ('me', 'friend') then (select count(distinct x.lesson_id) from public.toneturn_lesson_results x where x.user_id = r.uid)::int end,
    case when r.relation in ('me', 'friend') then (select g.best from public.toneturn_game_bests g where g.user_id = r.uid and g.kind = 'melody') end,
    case when r.relation in ('me', 'friend') then (select g.best from public.toneturn_game_bests g where g.user_id = r.uid and g.kind = 'rhythm') end,
    case when r.relation in ('me', 'friend') then (select max(x.completed_at) from public.toneturn_lesson_results x where x.user_id = r.uid) end
  from rel r
  left join public.toneturn_profiles p on p.id = r.uid
  where r.uid is not null;
$$;

-- Subscriptions due for a reminder right now (called by the Edge Function with the service role).
create or replace function public.toneturn_due_reminders()
returns table (id bigint, endpoint text, p256dh text, auth text, lang text, streak int, local_day date)
language sql stable security definer set search_path = '' as $$
  select s.id, s.endpoint, s.p256dh, s.auth, s.lang,
         public.toneturn_streak(s.user_id, s.tz),
         (now() at time zone s.tz)::date
  from public.toneturn_push_subscriptions s
  where extract(hour from now() at time zone s.tz)::int = s.hour
    and (s.last_sent_on is null or s.last_sent_on < (now() at time zone s.tz)::date)
    -- not practised yet today (local)
    and not exists (
      select 1 from public.toneturn_lesson_results r
      where r.user_id = s.user_id and (r.completed_at at time zone s.tz)::date = (now() at time zone s.tz)::date
    )
    -- has a streak to protect (practised yesterday)
    and public.toneturn_streak(s.user_id, s.tz) > 0;
$$;

revoke execute on function public.toneturn_due_reminders() from public, anon, authenticated;
grant execute on function public.toneturn_due_reminders() to service_role;
revoke execute on function public.toneturn_streak(uuid, text) from public, anon, authenticated;
revoke execute on function public.toneturn_new_code() from public, anon, authenticated;
revoke execute on function public.toneturn_my_profile(text, text, int) from public, anon;
revoke execute on function public.toneturn_add_friend(text) from public, anon;
revoke execute on function public.toneturn_respond_friend(uuid, boolean) from public, anon;
revoke execute on function public.toneturn_remove_friend(uuid) from public, anon;
revoke execute on function public.toneturn_report_game_best(text, int) from public, anon;
revoke execute on function public.toneturn_friends() from public, anon;
grant execute on function public.toneturn_my_profile(text, text, int) to authenticated;
grant execute on function public.toneturn_add_friend(text) to authenticated;
grant execute on function public.toneturn_respond_friend(uuid, boolean) to authenticated;
grant execute on function public.toneturn_remove_friend(uuid) to authenticated;
grant execute on function public.toneturn_report_game_best(text, int) to authenticated;
grant execute on function public.toneturn_friends() to authenticated;
