-- ToneTurn / The 7th Sense — game level tiers (docs/research/GAMES_TIERS_PLAN.md §5, owner-approved 2026-11-10).
-- NOT APPLIED YET: the owner applies migrations after a dry run. The client works without it:
--   * duels / rooms carry the tier in their 32-bit seed (top byte 0xE1…0xE5 = p…ff, anything else = pp), so the
--     tier columns below are GENERATED from the seed — no RPC signature changes;
--   * the daily challenge's soft band is the original set and keeps using the original RPCs; mid / loud call the
--     new *_band RPCs, which fail (and the result stays local) until this runs;
--   * the game boards (best per game × tier, friends first) are new; the client ignores their absence.
-- Also: the jazz question set ('jazz') for rooms and duels (EAR_THEORY_AUDIT: toneturn_rooms_kind_check).
-- Safe to re-run. After applying, seed the band keys: npm run daily-keys > supabase/seed/daily_keys.sql, run it.

-- ===================================================================== duels and rooms: tier from the seed

alter table public.toneturn_duels add column if not exists tier smallint
  generated always as (case when (seed >> 24) between 225 and 229 then ((seed >> 24) - 224)::smallint else 0::smallint end) stored;
alter table public.toneturn_rooms add column if not exists tier smallint
  generated always as (case when (seed >> 24) between 225 and 229 then ((seed >> 24) - 224)::smallint else 0::smallint end) stored;
comment on column public.toneturn_duels.tier is '0 pp, 1 p, 2 mp, 3 mf, 4 f, 5 ff (from the seed''s top byte; engine/gameTiers.ts tierSeed)';
comment on column public.toneturn_rooms.tier is '0 pp, 1 p, 2 mp, 3 mf, 4 f, 5 ff (from the seed''s top byte; engine/gameTiers.ts tierSeed)';

-- The jazz set.
alter table public.toneturn_rooms drop constraint if exists toneturn_rooms_kind_check;
alter table public.toneturn_rooms add constraint toneturn_rooms_kind_check
  check (kind in ('mixed', 'degrees', 'chords', 'intervals', 'modes', 'wrong-notes', 'truefalse', 'echo', 'beat', 'vocal-hold', 'jazz'));
alter table public.toneturn_duels drop constraint if exists toneturn_duels_kind_check;
alter table public.toneturn_duels add constraint toneturn_duels_kind_check
  check (kind in ('mixed', 'degrees', 'chords', 'intervals', 'modes', 'wrong-notes', 'truefalse', 'beat', 'jazz'));

-- ===================================================================== daily challenge: three bands

alter table public.toneturn_daily_keys add column if not exists band text not null default 'soft';
alter table public.toneturn_daily_results add column if not exists band text not null default 'soft';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'toneturn_daily_keys_band_check') then
    alter table public.toneturn_daily_keys add constraint toneturn_daily_keys_band_check check (band in ('soft', 'mid', 'loud'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'toneturn_daily_results_band_check') then
    alter table public.toneturn_daily_results add constraint toneturn_daily_results_band_check check (band in ('soft', 'mid', 'loud'));
  end if;
end $$;
alter table public.toneturn_daily_keys drop constraint if exists toneturn_daily_keys_pkey;
alter table public.toneturn_daily_keys add constraint toneturn_daily_keys_pkey primary key (day, band);
alter table public.toneturn_daily_results drop constraint if exists toneturn_daily_results_pkey;
alter table public.toneturn_daily_results add constraint toneturn_daily_results_pkey primary key (user_id, day, band);
drop index if exists public.toneturn_daily_results_day;
create index if not exists toneturn_daily_results_day_band on public.toneturn_daily_results (day, band, points desc);

create or replace function public.toneturn_daily_board_band(p_day date, p_band text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  mine public.toneturn_daily_results;
  n int;
  rk int;
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_band not in ('soft', 'mid', 'loud') then raise exception 'unknown band'; end if;
  select count(*) into n from public.toneturn_daily_results r where r.day = p_day and r.band = p_band;
  select * into mine from public.toneturn_daily_results r where r.day = p_day and r.band = p_band and r.user_id = me;
  if mine.user_id is not null then
    select 1 + count(*) into rk from public.toneturn_daily_results r where r.day = p_day and r.band = p_band and r.points > mine.points;
  end if;
  return jsonb_build_object(
    'day', p_day,
    'band', p_band,
    'players', n,
    'me', case when mine.user_id is null then null else jsonb_build_object(
      'points', mine.points, 'correct', mine.correct, 'squares', mine.squares, 'rank', rk,
      'top_percent', ceil(100.0 * rk / greatest(n, 1))::int) end,
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', coalesce(nullif(p.display_name, ''), 'Player'), 'points', r.points, 'squares', r.squares, 'me', r.user_id = me
      ) order by r.points desc, r.created_at)
      from public.toneturn_daily_results r
      left join public.toneturn_profiles p on p.id = r.user_id
      where r.day = p_day and r.band = p_band and (r.user_id = me or exists (
        select 1 from public.toneturn_friendships f
        where f.status = 'accepted' and ((f.requester = me and f.addressee = r.user_id) or (f.addressee = me and f.requester = r.user_id))
      ))), '[]'::jsonb)
  );
end $$;

-- First play of a day in a band counts (the client sends one play a day); later submissions return the board.
create or replace function public.toneturn_daily_submit_band(p_day date, p_band text, p_version int, p_answers text[], p_times int[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  k public.toneturn_daily_keys;
  ok boolean;
  streak int := 0;
  pts int := 0;
  total int := 0;
  n_ok int := 0;
  sq text := '';
  f numeric;
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_band not in ('soft', 'mid', 'loud') then raise exception 'unknown band'; end if;
  if p_day < (now() at time zone 'utc')::date - 1 or p_day > (now() at time zone 'utc')::date + 1 then raise exception 'not today'; end if;
  if exists (select 1 from public.toneturn_daily_results r where r.user_id = me and r.day = p_day and r.band = p_band) then
    return public.toneturn_daily_board_band(p_day, p_band);
  end if;
  select * into k from public.toneturn_daily_keys x where x.day = p_day and x.band = p_band;
  if k.day is null or k.version <> p_version then raise exception 'daily version mismatch'; end if;
  if coalesce(array_length(p_answers, 1), 0) <> 5 or coalesce(array_length(p_times, 1), 0) <> 5 then raise exception 'five answers expected'; end if;
  for i in 1..5 loop
    ok := p_answers[i] is not null and p_answers[i] = k.answers[i] and p_times[i] is not null and p_times[i] between 150 and 10000;
    if ok then
      f := greatest(0, least(1, 1 - p_times[i]::numeric / 10000));
      pts := round(1000 * (0.5 + 0.5 * f) * least(1.5, 1 + 0.1 * streak));
      total := total + pts;
      n_ok := n_ok + 1;
      streak := streak + 1;
      sq := sq || case when p_times[i] <= 2000 then '🟩' else '🟨' end;
    else
      streak := 0;
      sq := sq || '⬜';
    end if;
  end loop;
  insert into public.toneturn_daily_results (user_id, day, band, version, points, correct, squares, answers, times)
  values (me, p_day, p_band, p_version, total, n_ok, sq, (select array_agg(left(a, 32)) from unnest(p_answers) a), p_times);
  return public.toneturn_daily_board_band(p_day, p_band);
end $$;

-- The original RPCs are the soft band (clients before tiers, and the soft band of new clients).
create or replace function public.toneturn_daily_board(p_day date)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.toneturn_daily_board_band(p_day, 'soft');
$$;
create or replace function public.toneturn_daily_submit(p_day date, p_version int, p_answers text[], p_times int[])
returns jsonb language sql security definer set search_path = '' as $$
  select public.toneturn_daily_submit_band(p_day, 'soft', p_version, p_answers, p_times);
$$;

revoke execute on function public.toneturn_daily_board_band(date, text) from public, anon;
revoke execute on function public.toneturn_daily_submit_band(date, text, int, text[], int[]) from public, anon;
grant execute on function public.toneturn_daily_board_band(date, text) to authenticated;
grant execute on function public.toneturn_daily_submit_band(date, text, int, text[], int[]) to authenticated;

-- ===================================================================== game boards: best per game × tier per week

create table if not exists public.toneturn_game_tier_bests (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game text not null check (game ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(game) <= 32),
  tier smallint not null check (tier between 0 and 5),
  week date not null,
  best int not null check (best between 0 and 100000),
  updated_at timestamptz not null default now(),
  primary key (user_id, game, tier, week)
);
create index if not exists toneturn_game_tier_bests_board on public.toneturn_game_tier_bests (game, tier, week, best desc);
alter table public.toneturn_game_tier_bests enable row level security;
revoke all on public.toneturn_game_tier_bests from anon, authenticated;

-- Keep the better score of the week (UTC week starting Monday).
create or replace function public.toneturn_game_best_submit(p_game text, p_tier int, p_score int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  wk date := date_trunc('week', now() at time zone 'utc')::date;
begin
  if me is null then raise exception 'sign in first'; end if;
  insert into public.toneturn_game_tier_bests (user_id, game, tier, week, best)
  values (me, p_game, p_tier, wk, greatest(0, least(100000, p_score)))
  on conflict (user_id, game, tier, week) do update set best = greatest(public.toneturn_game_tier_bests.best, excluded.best), updated_at = now();
end $$;

-- Me and my friends at this game and tier this week, best first (no public global board yet: privacy first).
create or replace function public.toneturn_game_board(p_game text, p_tier int)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(p.display_name, ''), 'Player'), 'best', b.best, 'me', b.user_id = (select auth.uid()))
    order by b.best desc, b.updated_at), '[]'::jsonb)
  from public.toneturn_game_tier_bests b
  left join public.toneturn_profiles p on p.id = b.user_id
  where b.game = p_game and b.tier = p_tier and b.week = date_trunc('week', now() at time zone 'utc')::date
    and (b.user_id = (select auth.uid()) or exists (
      select 1 from public.toneturn_friendships f
      where f.status = 'accepted' and ((f.requester = (select auth.uid()) and f.addressee = b.user_id) or (f.addressee = (select auth.uid()) and f.requester = b.user_id))));
$$;

revoke execute on function public.toneturn_game_best_submit(text, int, int) from public, anon;
revoke execute on function public.toneturn_game_board(text, int) from public, anon;
grant execute on function public.toneturn_game_best_submit(text, int, int) to authenticated;
grant execute on function public.toneturn_game_board(text, int) to authenticated;
