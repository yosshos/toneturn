-- ToneTurn 0.10: rhythm lessons R1–R3 (and the 0.9 melodic matrix lessons).
alter table public.toneturn_lesson_results drop constraint if exists toneturn_lesson_results_lesson_id_check;
alter table public.toneturn_lesson_results add constraint toneturn_lesson_results_lesson_id_check
  check (lesson_id in ('bflat-two-homes', 'degrees-135', 'major-minor', 'cadences', 'sing-home-five', 'intervals', 'inversions',
                       'notes-degrees', 'sing-names', 'sing-degrees', 'rhythm-r1', 'rhythm-r2', 'rhythm-r3', 'placement', 'review', 'weekly-puzzle'));

-- Friends: "lessons completed" counts every path lesson.
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
    case when r.relation in ('me', 'friend') then (select count(distinct x.lesson_id) from public.toneturn_lesson_results x
      where x.user_id = r.uid and x.lesson_id in ('bflat-two-homes', 'degrees-135', 'major-minor', 'cadences', 'sing-home-five',
                                                  'intervals', 'inversions', 'notes-degrees', 'sing-names', 'sing-degrees', 'rhythm-r1', 'rhythm-r2', 'rhythm-r3'))::int end,
    case when r.relation in ('me', 'friend') then (select g.best from public.toneturn_game_bests g where g.user_id = r.uid and g.kind = 'melody') end,
    case when r.relation in ('me', 'friend') then (select g.best from public.toneturn_game_bests g where g.user_id = r.uid and g.kind = 'rhythm') end,
    case when r.relation in ('me', 'friend') then (select max(x.completed_at) from public.toneturn_lesson_results x where x.user_id = r.uid) end
  from rel r
  left join public.toneturn_profiles p on p.id = r.uid
  where r.uid is not null;
$$;
revoke execute on function public.toneturn_friends() from public, anon;
grant execute on function public.toneturn_friends() to authenticated;
