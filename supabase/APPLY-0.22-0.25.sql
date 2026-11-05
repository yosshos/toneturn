-- Ninth Sense 0.22–0.25: paste this whole file into Supabase → SQL Editor → Run (safe to re-run).
-- 1) overall rating next to names (migration 20261115000000_toneturn_rating.sql)

-- Ninth Sense 0.22: overall rating next to every name (spec addendum L).
-- The client computes the overall rating (confidence-weighted mean of skill ratings) and reports it;
-- self-reported like game bests, range-checked. Friends, rooms, the daily board and class rosters return it.
-- Run after 20261114000000_toneturn_classes.sql. Safe to re-run.

alter table public.toneturn_profiles
  add column if not exists rating int check (rating between 100 and 3000),
  add column if not exists rating_provisional boolean not null default true,
  add column if not exists rating_peak int check (rating_peak between 100 and 3000),
  add column if not exists rating_at timestamptz;

create or replace function public.toneturn_report_rating(p_rating int, p_provisional boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_rating is null or p_rating < 100 or p_rating > 3000 then raise exception 'rating out of range'; end if;
  insert into public.toneturn_profiles (id) values (me) on conflict (id) do nothing;
  update public.toneturn_profiles p
  set rating = p_rating,
      rating_provisional = coalesce(p_provisional, true),
      rating_peak = case when coalesce(p_provisional, true) then p.rating_peak else greatest(coalesce(p.rating_peak, 0), p_rating) end,
      rating_at = now()
  where p.id = me;
end $$;
revoke execute on function public.toneturn_report_rating(int, boolean) from public, anon;
grant execute on function public.toneturn_report_rating(int, boolean) to authenticated;

-- Friends now return the rating (the return type changes, so drop first).
drop function if exists public.toneturn_friends();
create or replace function public.toneturn_friends()
returns table (
  user_id uuid, name text, relation text,
  week_xp int, total_xp int, streak int, lessons_done int,
  best_melody int, best_rhythm int, last_active timestamptz,
  rating int, rating_provisional boolean
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
    case when r.relation in ('me', 'friend') then (select count(distinct x.lesson_id) from public.toneturn_lesson_results x
      where x.user_id = r.uid and x.lesson_id not in ('placement', 'review', 'weekly-puzzle', 'runs-workshop'))::int end,
    case when r.relation in ('me', 'friend') then (select g.best from public.toneturn_game_bests g where g.user_id = r.uid and g.kind = 'melody') end,
    case when r.relation in ('me', 'friend') then (select g.best from public.toneturn_game_bests g where g.user_id = r.uid and g.kind = 'rhythm') end,
    case when r.relation in ('me', 'friend') then (select max(x.completed_at) from public.toneturn_lesson_results x where x.user_id = r.uid) end,
    p.rating,
    p.rating_provisional
  from rel r
  left join public.toneturn_profiles p on p.id = r.uid
  where r.uid is not null;
$$;
revoke execute on function public.toneturn_friends() from public, anon;
grant execute on function public.toneturn_friends() to authenticated;

create or replace function public.toneturn_room_state(p_room uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.toneturn_rooms;
  closed_upto int;
begin
  if not public.toneturn_is_room_member(p_room) then raise exception 'not in this room'; end if;
  select * into r from public.toneturn_rooms x where x.id = p_room;
  closed_upto := case when r.round_open then r.round - 1 else r.round end;
  return jsonb_build_object(
    'id', r.id, 'code', r.code, 'host', r.host, 'kind', r.kind, 'rounds', r.rounds, 'seed', r.seed,
    'window_ms', r.window_ms, 'state', r.state, 'round', r.round, 'round_open', r.round_open,
    'answered', r.answered, 'server_now', now(), 'round_started_at', r.round_started_at, 'round_closed_at', r.round_closed_at,
    'me', me,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id, 'nickname', p.nickname,
        'rating', (select pr.rating from public.toneturn_profiles pr where pr.id = p.user_id),
        'rating_provisional', (select pr.rating_provisional from public.toneturn_profiles pr where pr.id = p.user_id),
        'answered', exists (select 1 from public.toneturn_room_answers a where a.room_id = p_room and a.user_id = p.user_id and a.round = r.round)
      ) order by p.joined_at)
      from public.toneturn_room_players p where p.room_id = p_room), '[]'::jsonb),
    'results', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', k.round, 'key', k.answer,
        'answers', coalesce((
          select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'answer', a.answer, 'time_ms', a.time_ms, 'correct', a.correct, 'points', a.points))
          from public.toneturn_room_answers a where a.room_id = p_room and a.round = k.round), '[]'::jsonb)
      ) order by k.round)
      from public.toneturn_room_keys k where k.room_id = p_room and k.round <= closed_upto), '[]'::jsonb)
  );
end $$;

create or replace function public.toneturn_daily_board(p_day date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  mine public.toneturn_daily_results;
  n int;
  rk int;
begin
  if me is null then raise exception 'sign in first'; end if;
  select count(*) into n from public.toneturn_daily_results r where r.day = p_day;
  select * into mine from public.toneturn_daily_results r where r.day = p_day and r.user_id = me;
  if mine.user_id is not null then
    select 1 + count(*) into rk from public.toneturn_daily_results r where r.day = p_day and r.points > mine.points;
  end if;
  return jsonb_build_object(
    'day', p_day,
    'players', n,
    'me', case when mine.user_id is null then null else jsonb_build_object(
      'points', mine.points, 'correct', mine.correct, 'squares', mine.squares, 'rank', rk,
      'top_percent', ceil(100.0 * rk / greatest(n, 1))::int) end,
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', coalesce(nullif(p.display_name, ''), 'Player'), 'points', r.points, 'squares', r.squares, 'me', r.user_id = me,
        'rating', p.rating, 'rating_provisional', p.rating_provisional
      ) order by r.points desc, r.created_at)
      from public.toneturn_daily_results r
      left join public.toneturn_profiles p on p.id = r.user_id
      where r.day = p_day and (r.user_id = me or exists (
        select 1 from public.toneturn_friendships f
        where f.status = 'accepted' and ((f.requester = me and f.addressee = r.user_id) or (f.addressee = me and f.requester = r.user_id))
      ))), '[]'::jsonb)
  );
end $$;

create or replace function public.toneturn_my_classes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'sign in first'; end if;
  return jsonb_build_object(
    'teaching', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'code', c.code, 'name', c.name,
        'assignments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'lesson_id', a.lesson_id, 'due_on', a.due_on, 'created_at', a.created_at,
            'done', (select count(*) from public.toneturn_class_members m
                     where m.class_id = c.id and exists (select 1 from public.toneturn_lesson_results x
                       where x.user_id = m.user_id and x.lesson_id = a.lesson_id and x.completed_at >= a.created_at))
          ) order by a.created_at desc)
          from public.toneturn_class_assignments a where a.class_id = c.id), '[]'::jsonb),
        'students', coalesce((
          select jsonb_agg(jsonb_build_object(
            'user_id', m.user_id,
            'name', coalesce(nullif(p.display_name, ''), 'Student'),
            'rating', p.rating, 'rating_provisional', p.rating_provisional,
            'lessons_done', (select count(distinct x.lesson_id) from public.toneturn_lesson_results x
                             where x.user_id = m.user_id and x.lesson_id not in ('placement', 'review', 'weekly-puzzle', 'runs-workshop')),
            'week_xp', coalesce((select sum(x.xp) from public.toneturn_lesson_results x where x.user_id = m.user_id and x.completed_at >= now() - interval '7 days'), 0),
            'streak', public.toneturn_streak(m.user_id, coalesce(p.tz, 'UTC')),
            'last_active', (select max(x.completed_at) from public.toneturn_lesson_results x where x.user_id = m.user_id),
            'skills', coalesce((
              select jsonb_object_agg(s.skill, jsonb_build_object('n', s.n, 'correct', s.correct))
              from (
                select it->>'skill' as skill, count(*) as n, count(*) filter (where (it->>'correct')::boolean) as correct
                from public.toneturn_lesson_results x, jsonb_array_elements(coalesce(x.items, '[]'::jsonb)) it
                where x.user_id = m.user_id and x.completed_at >= now() - interval '30 days' and it ? 'skill'
                group by it->>'skill'
              ) s), '{}'::jsonb)
          ) order by p.display_name nulls last)
          from public.toneturn_class_members m left join public.toneturn_profiles p on p.id = m.user_id
          where m.class_id = c.id), '[]'::jsonb)
      ) order by c.created_at)
      from public.toneturn_classes c where c.teacher = me), '[]'::jsonb),
    'member_of', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name,
        'teacher', coalesce(nullif(tp.display_name, ''), 'Teacher'),
        'assignments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'lesson_id', a.lesson_id, 'due_on', a.due_on, 'created_at', a.created_at,
            'done', exists (select 1 from public.toneturn_lesson_results x where x.user_id = me and x.lesson_id = a.lesson_id and x.completed_at >= a.created_at)
          ) order by a.due_on nulls last, a.created_at)
          from public.toneturn_class_assignments a where a.class_id = c.id), '[]'::jsonb)
      ) order by m.joined_at)
      from public.toneturn_class_members m
      join public.toneturn_classes c on c.id = m.class_id
      left join public.toneturn_profiles tp on tp.id = c.teacher
      where m.user_id = me), '[]'::jsonb)
  );
end $$;

-- 2) streak 2.0 on the server (migration 20261116000000_toneturn_streak2.sql)

-- Ninth Sense 0.23: streak 2.0 on the server (spec addendum N.6).
-- Freeze and repair days (decided by the client from its practice history and purchases) are stored so
-- the server streak counts them as practised; the daily challenge counts too. The reminder function now
-- returns a message kind: the evening reminder, "streak at risk" at 22:00 local, and "freeze used" in the
-- morning — at most one push per day (last_sent_on).
-- Run after 20261115000000_toneturn_rating.sql. Safe to re-run.

create table if not exists public.toneturn_streak_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('freeze', 'repair')),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.toneturn_streak_days enable row level security;
revoke all on public.toneturn_streak_days from anon, authenticated;

/** Client reports its freeze / repair days (idempotent; only recent days are accepted). */
create or replace function public.toneturn_report_streak_days(p_days jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  d jsonb;
begin
  if me is null then raise exception 'sign in first'; end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 400 then raise exception 'bad days'; end if;
  for d in select * from jsonb_array_elements(p_days) loop
    if (d->>'kind') in ('freeze', 'repair') and (d->>'day')::date between current_date - 400 and current_date + 1 then
      insert into public.toneturn_streak_days (user_id, day, kind) values (me, (d->>'day')::date, d->>'kind')
      on conflict (user_id, day) do nothing;
    end if;
  end loop;
end $$;
revoke execute on function public.toneturn_report_streak_days(jsonb) from public, anon;
grant execute on function public.toneturn_report_streak_days(jsonb) to authenticated;

-- Streak: consecutive local days with a lesson, a daily challenge, a freeze or a repair, ending today or yesterday.
create or replace function public.toneturn_streak(p_user uuid, p_tz text)
returns int language sql stable security definer set search_path = '' as $$
  with days as (
    select (r.completed_at at time zone p_tz)::date as d from public.toneturn_lesson_results r where r.user_id = p_user
    union
    select x.day from public.toneturn_daily_results x where x.user_id = p_user
    union
    select s.day from public.toneturn_streak_days s where s.user_id = p_user
  ),
  today as (select (now() at time zone p_tz)::date as t),
  anchored as (
    select d, row_number() over (order by d desc) as rn from (select distinct d from days) u
    where d <= (select t from today)
  )
  select coalesce((
    select count(*)::int from anchored a
    where a.d = (select max(d) from anchored) - (a.rn - 1)::int
      and (select max(d) from anchored) >= (select t from today) - 1
  ), 0);
$$;
revoke execute on function public.toneturn_streak(uuid, text) from public, anon, authenticated;

create or replace function public.toneturn_practised_on(p_user uuid, p_day date, p_tz text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.toneturn_lesson_results r where r.user_id = p_user and (r.completed_at at time zone p_tz)::date = p_day)
      or exists (select 1 from public.toneturn_daily_results x where x.user_id = p_user and x.day = p_day);
$$;
revoke execute on function public.toneturn_practised_on(uuid, date, text) from public, anon, authenticated;

-- Reminders: one row per subscription that should get a push this hour, with the kind of message.
drop function if exists public.toneturn_due_reminders();
create or replace function public.toneturn_due_reminders()
returns table (id bigint, endpoint text, p256dh text, auth text, lang text, streak int, local_day date, kind text)
language sql stable security definer set search_path = '' as $$
  with subs as (
    select s.*, (now() at time zone s.tz)::date as today, extract(hour from now() at time zone s.tz)::int as hr,
           public.toneturn_streak(s.user_id, s.tz) as st
    from public.toneturn_push_subscriptions s
    where s.last_sent_on is null or s.last_sent_on < (now() at time zone s.tz)::date
  )
  select x.id, x.endpoint, x.p256dh, x.auth, x.lang, x.st, x.today,
         case
           -- morning after a freeze day: reassure
           when x.hr = 9 and exists (select 1 from public.toneturn_streak_days d where d.user_id = x.user_id and d.day = x.today - 1 and d.kind = 'freeze') then 'freeze_used'
           when x.hr = 22 then 'at_risk'
           else 'evening'
         end
  from subs x
  where x.st > 0
    and (
      (x.hr = 9 and exists (select 1 from public.toneturn_streak_days d where d.user_id = x.user_id and d.day = x.today - 1 and d.kind = 'freeze'))
      or (
        not public.toneturn_practised_on(x.user_id, x.today, x.tz)
        and ((x.hr = x.hour) or (x.hr = 22 and x.st >= 3 and x.hour <> 22))
      )
    );
$$;
revoke execute on function public.toneturn_due_reminders() from public, anon, authenticated;
grant execute on function public.toneturn_due_reminders() to service_role;
