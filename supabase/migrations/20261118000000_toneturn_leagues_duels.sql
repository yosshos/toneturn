-- ToneTurn / Ninth Sense 0.27 — weekly leagues, asynchronous friend duels, the weekly puzzle online,
-- and "players at your level" aggregates (spec S.7, S.8, challenge modes 2–4, L.5).

-- ===================================================================== weekly leagues
-- Cohorts of up to 30 per tier, formed when a player first opens the league in a week (UTC weeks).
-- Tier: from last week's cohort result (top 5 up, bottom 5 down), or from the overall rating at first.
create table if not exists public.toneturn_leagues (
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,
  tier int not null check (tier between 1 and 5),
  cohort int not null,
  joined_at timestamptz not null default now(),
  primary key (user_id, week)
);
create index if not exists toneturn_leagues_cohort on public.toneturn_leagues (week, tier, cohort);
alter table public.toneturn_leagues enable row level security;
revoke all on public.toneturn_leagues from anon, authenticated;

create or replace function public.toneturn_week_xp(p_user uuid, p_week date)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(sum(x.xp), 0)::int from public.toneturn_lesson_results x
  where x.user_id = p_user and x.completed_at >= p_week::timestamptz and x.completed_at < (p_week + 7)::timestamptz;
$$;
revoke execute on function public.toneturn_week_xp(uuid, date) from public, anon, authenticated;

create or replace function public.toneturn_league()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  wk date := date_trunc('week', now() at time zone 'utc')::date;
  prev public.toneturn_leagues;
  mine public.toneturn_leagues;
  t int;
  c int;
  rk int;
  n int;
  r int;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into mine from public.toneturn_leagues l where l.user_id = me and l.week = wk;
  if mine.user_id is null then
    select * into prev from public.toneturn_leagues l where l.user_id = me and l.week = wk - 7;
    if prev.user_id is not null then
      select count(*) into n from public.toneturn_leagues l where l.week = prev.week and l.tier = prev.tier and l.cohort = prev.cohort;
      select 1 + count(*) into rk from public.toneturn_leagues l
        where l.week = prev.week and l.tier = prev.tier and l.cohort = prev.cohort
          and public.toneturn_week_xp(l.user_id, l.week) > public.toneturn_week_xp(me, prev.week);
      t := prev.tier + case when rk <= 5 and public.toneturn_week_xp(me, prev.week) > 0 then 1 when n >= 10 and rk > n - 5 then -1 else 0 end;
    else
      select coalesce(p.rating, 1000) into r from public.toneturn_profiles p where p.id = me;
      t := case when coalesce(r, 1000) < 1000 then 1 when r < 1150 then 2 when r < 1300 then 3 when r < 1450 then 4 else 5 end;
    end if;
    t := greatest(1, least(5, t));
    select l.cohort into c from public.toneturn_leagues l where l.week = wk and l.tier = t
      group by l.cohort having count(*) < 30 order by l.cohort limit 1;
    if c is null then
      select coalesce(max(l.cohort), 0) + 1 into c from public.toneturn_leagues l where l.week = wk and l.tier = t;
    end if;
    insert into public.toneturn_leagues (user_id, week, tier, cohort) values (me, wk, t, c) returning * into mine;
  end if;
  return jsonb_build_object(
    'week', wk, 'ends_at', (wk + 7)::timestamptz, 'tier', mine.tier, 'cohort', mine.cohort,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('name', coalesce(nullif(p.display_name, ''), 'Player'), 'xp', x.xp, 'me', x.user_id = me) order by x.xp desc, x.joined_at)
      from (
        select l.user_id, l.joined_at, public.toneturn_week_xp(l.user_id, wk) as xp
        from public.toneturn_leagues l where l.week = wk and l.tier = mine.tier and l.cohort = mine.cohort
      ) x left join public.toneturn_profiles p on p.id = x.user_id), '[]'::jsonb)
  );
end $$;
revoke execute on function public.toneturn_league() from public, anon;
grant execute on function public.toneturn_league() to authenticated;

-- ===================================================================== asynchronous friend duels
-- The challenger plays 3 questions; the friend plays the same set later. The server keeps the key and grades.
create table if not exists public.toneturn_duels (
  id uuid primary key default gen_random_uuid(),
  challenger uuid not null references auth.users (id) on delete cascade,
  opponent uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('mixed', 'degrees', 'chords', 'intervals', 'modes', 'wrong-notes', 'truefalse', 'beat')),
  seed bigint not null check (seed between 0 and 4294967295),
  rounds int not null default 3 check (rounds between 1 and 10),
  keys text[] not null,
  challenger_answers text[],
  challenger_times int[],
  challenger_points int,
  opponent_answers text[],
  opponent_times int[],
  opponent_points int,
  created_at timestamptz not null default now()
);
create index if not exists toneturn_duels_players on public.toneturn_duels (opponent, created_at desc);
create index if not exists toneturn_duels_challenger on public.toneturn_duels (challenger, created_at desc);
alter table public.toneturn_duels enable row level security;
revoke all on public.toneturn_duels from anon, authenticated;

create or replace function public.toneturn_duel_points(p_keys text[], p_answers text[], p_times int[])
returns int language plpgsql immutable set search_path = '' as $$
declare
  pts int := 0;
  streak int := 0;
  f numeric;
begin
  for i in 1 .. coalesce(array_length(p_keys, 1), 0) loop
    if p_answers[i] is not null and p_answers[i] = p_keys[i] and p_times[i] between 150 and 10000 then
      f := greatest(0, least(1, 1 - p_times[i]::numeric / 10000));
      pts := pts + round(1000 * (0.5 + 0.5 * f) * least(1.5, 1 + 0.1 * streak));
      streak := streak + 1;
    else
      streak := 0;
    end if;
  end loop;
  return pts;
end $$;

create or replace function public.toneturn_duel_create(p_opponent uuid, p_kind text, p_seed bigint, p_keys text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  v_id uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.toneturn_friendships f where f.status = 'accepted'
    and ((f.requester = me and f.addressee = p_opponent) or (f.addressee = me and f.requester = p_opponent))) then
    raise exception 'not friends';
  end if;
  if (select count(*) from public.toneturn_duels d where d.challenger = me and d.created_at > now() - interval '1 day') >= 30 then
    raise exception 'too many duels';
  end if;
  insert into public.toneturn_duels (challenger, opponent, kind, seed, rounds, keys)
  values (me, p_opponent, p_kind, p_seed, coalesce(array_length(p_keys, 1), 0), p_keys) returning toneturn_duels.id into v_id;
  return v_id;
end $$;

create or replace function public.toneturn_duel_submit(p_id uuid, p_answers text[], p_times int[])
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  d public.toneturn_duels;
  pts int;
begin
  select * into d from public.toneturn_duels x where x.id = p_id for update;
  if d.id is null or me not in (d.challenger, d.opponent) then raise exception 'not your duel'; end if;
  pts := public.toneturn_duel_points(d.keys, p_answers, p_times);
  if me = d.challenger and d.challenger_points is null then
    update public.toneturn_duels x set challenger_answers = p_answers, challenger_times = p_times, challenger_points = pts where x.id = p_id;
  elsif me = d.opponent and d.opponent_points is null then
    update public.toneturn_duels x set opponent_answers = p_answers, opponent_times = p_times, opponent_points = pts where x.id = p_id;
  else
    return null; -- already played
  end if;
  return pts;
end $$;

create or replace function public.toneturn_duels_mine()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'kind', d.kind, 'seed', d.seed, 'rounds', d.rounds, 'created_at', d.created_at,
    'i_challenged', d.challenger = auth.uid(),
    'other', coalesce(nullif(p.display_name, ''), 'Player'),
    'my_points', case when d.challenger = auth.uid() then d.challenger_points else d.opponent_points end,
    -- The other score is shown once I have played too.
    'their_points', case when (case when d.challenger = auth.uid() then d.challenger_points else d.opponent_points end) is null then null
                         else case when d.challenger = auth.uid() then d.opponent_points else d.challenger_points end end
  ) order by d.created_at desc), '[]'::jsonb)
  from (select * from public.toneturn_duels x where auth.uid() in (x.challenger, x.opponent) order by x.created_at desc limit 30) d
  left join public.toneturn_profiles p on p.id = case when d.challenger = auth.uid() then d.opponent else d.challenger end;
$$;

revoke execute on function public.toneturn_duel_points(text[], text[], int[]) from public, anon, authenticated;
revoke execute on function public.toneturn_duel_create(uuid, text, bigint, text[]) from public, anon;
revoke execute on function public.toneturn_duel_submit(uuid, text[], int[]) from public, anon;
revoke execute on function public.toneturn_duels_mine() from public, anon;
grant execute on function public.toneturn_duel_create(uuid, text, bigint, text[]) to authenticated;
grant execute on function public.toneturn_duel_submit(uuid, text[], int[]) to authenticated;
grant execute on function public.toneturn_duels_mine() to authenticated;

-- ===================================================================== weekly puzzle online + level stats
-- The puzzle is the same for everyone in a band (deterministic per week and band); results are reported
-- by the client (first scored try) and only feed aggregate statistics.
create table if not exists public.toneturn_puzzle_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  week text not null check (week ~ '^[0-9]{4}-W[0-9]{2}$'),
  band text not null check (band in ('beginner', 'developing', 'solid', 'advanced')),
  medal text not null check (medal in ('gold', 'silver', 'none')),
  time_ms int check (time_ms between 0 and 600000),
  created_at timestamptz not null default now(),
  primary key (user_id, week)
);
alter table public.toneturn_puzzle_results enable row level security;
revoke all on public.toneturn_puzzle_results from anon, authenticated;

create or replace function public.toneturn_puzzle_submit(p_week text, p_band text, p_medal text, p_time_ms int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'sign in first'; end if;
  insert into public.toneturn_puzzle_results (user_id, week, band, medal, time_ms)
  values ((select auth.uid()), p_week, p_band, p_medal, p_time_ms)
  on conflict (user_id, week) do nothing;
end $$;

create or replace function public.toneturn_puzzle_stats(p_week text, p_band text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'players', count(*),
    'gold', count(*) filter (where medal = 'gold'),
    'silver', count(*) filter (where medal = 'silver'),
    'median_ms', percentile_cont(0.5) within group (order by time_ms) filter (where medal <> 'none' and time_ms is not null)
  ) from public.toneturn_puzzle_results where week = p_week and band = p_band;
$$;

-- Daily challenge: how players at my level (overall rating ± 100) did today.
create or replace function public.toneturn_daily_peers(p_day date)
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (select coalesce((select rating from public.toneturn_profiles where id = auth.uid()), 1000) as r),
  peers as (
    select d.points, (select avg(t) from unnest(d.times) t where t is not null) as avg_ms
    from public.toneturn_daily_results d join public.toneturn_profiles p on p.id = d.user_id
    where d.day = p_day and abs(coalesce(p.rating, 1000) - (select r from me)) <= 100
  )
  select jsonb_build_object(
    'players', count(*),
    'median_points', percentile_cont(0.5) within group (order by points),
    'median_ms', percentile_cont(0.5) within group (order by avg_ms)
  ) from peers;
$$;

revoke execute on function public.toneturn_puzzle_submit(text, text, text, int) from public, anon;
revoke execute on function public.toneturn_puzzle_stats(text, text) from public, anon;
revoke execute on function public.toneturn_daily_peers(date) from public, anon;
grant execute on function public.toneturn_puzzle_submit(text, text, text, int) to authenticated;
grant execute on function public.toneturn_puzzle_stats(text, text) to authenticated;
grant execute on function public.toneturn_daily_peers(date) to authenticated;
