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
