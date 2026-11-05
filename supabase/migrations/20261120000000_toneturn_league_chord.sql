-- ToneTurn / Ninth Sense 0.30 — the league ladder becomes a chord: Root, Third, Fifth, Seventh, Ninth,
-- ♯11, 13 (C E G B♭ D F♯ A = C13♯11, the chord of the overtone series). Tiers 1–5 keep their numbers.
-- The top is hard to reach and to keep (spec Y.2):
--   promote  : tiers 1–3 top 5 · tier 4 top 4 · tier 5 (Ninth) top 3 and ≥ 500 weekly XP · tier 6 (♯11) 1st and ≥ 900 XP
--   relegate : tiers 2–5 bottom 5 · tier 6 bottom 6 · tier 7 (13) bottom 8   (cohorts of 10 or more)
--   first placement from the overall rating, at most tier 4 (Seventh).
-- Safe to re-run.

alter table public.toneturn_leagues drop constraint if exists toneturn_leagues_tier_check;
alter table public.toneturn_leagues add constraint toneturn_leagues_tier_check check (tier between 1 and 7);

create or replace function public.toneturn_league_move(p_tier int, p_rank int, p_n int, p_xp int)
returns int language sql immutable set search_path = '' as $$
  select case
    when p_xp > 0 and p_tier < 7 and p_rank <= (case when p_tier <= 3 then 5 when p_tier = 4 then 4 when p_tier = 5 then 3 else 1 end)
         and p_xp >= (case when p_tier = 5 then 500 when p_tier = 6 then 900 else 1 end) then 1
    when p_n >= 10 and p_tier > 1 and p_rank > p_n - (case when p_tier <= 5 then 5 when p_tier = 6 then 6 else 8 end) then -1
    else 0 end;
$$;
revoke execute on function public.toneturn_league_move(int, int, int, int) from public, anon, authenticated;

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
  px int;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into mine from public.toneturn_leagues l where l.user_id = me and l.week = wk;
  if mine.user_id is null then
    select * into prev from public.toneturn_leagues l where l.user_id = me and l.week = wk - 7;
    if prev.user_id is not null then
      px := public.toneturn_week_xp(me, prev.week);
      select count(*) into n from public.toneturn_leagues l where l.week = prev.week and l.tier = prev.tier and l.cohort = prev.cohort;
      select 1 + count(*) into rk from public.toneturn_leagues l
        where l.week = prev.week and l.tier = prev.tier and l.cohort = prev.cohort
          and public.toneturn_week_xp(l.user_id, l.week) > px;
      t := prev.tier + public.toneturn_league_move(prev.tier, rk, n, px);
    else
      select coalesce(p.rating, 1000) into r from public.toneturn_profiles p where p.id = me;
      t := case when coalesce(r, 1000) < 1000 then 1 when r < 1150 then 2 when r < 1300 then 3 else 4 end;
    end if;
    t := greatest(1, least(7, t));
    select l.cohort into c from public.toneturn_leagues l where l.week = wk and l.tier = t
      group by l.cohort having count(*) < 30 order by l.cohort limit 1;
    if c is null then
      select coalesce(max(l.cohort), 0) + 1 into c from public.toneturn_leagues l where l.week = wk and l.tier = t;
    end if;
    insert into public.toneturn_leagues (user_id, week, tier, cohort) values (me, wk, t, c) returning * into mine;
  end if;
  return jsonb_build_object(
    'week', wk, 'ends_at', (wk + 7)::timestamptz, 'tier', mine.tier, 'cohort', mine.cohort,
    'best_tier', (select max(l.tier) from public.toneturn_leagues l where l.user_id = me),
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
