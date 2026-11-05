-- ToneTurn / Ninth Sense 0.30 — league placement fixes (spec Y.2):
--  * a player with no rating starts at Root (tier 1), as the client does;
--  * a player who skipped a week keeps their last league instead of being re-placed from the rating —
--    except the top leagues (the Ninth and up), which drop one step: they are earned in play.
-- Safe to re-run.

create or replace function public.toneturn_league()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  wk date := date_trunc('week', now() at time zone 'utc')::date;
  prev public.toneturn_leagues;
  last public.toneturn_leagues;
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
      select * into last from public.toneturn_leagues l where l.user_id = me and l.week < wk order by l.week desc limit 1;
      if last.user_id is not null then
        t := case when last.tier >= 5 then last.tier - 1 else last.tier end;
      else
        select p.rating into r from public.toneturn_profiles p where p.id = me;
        t := case when r is null or r < 1000 then 1 when r < 1150 then 2 when r < 1300 then 3 else 4 end;
      end if;
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
