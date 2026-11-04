-- ToneTurn 0.6: per-item results (for skill ratings across devices), new session types.

alter table public.toneturn_lesson_results
  add column if not exists items jsonb not null default '[]'::jsonb;

alter table public.toneturn_lesson_results drop constraint if exists toneturn_lesson_results_lesson_id_check;
alter table public.toneturn_lesson_results add constraint toneturn_lesson_results_lesson_id_check
  check (lesson_id in ('bflat-two-homes', 'degrees-135', 'major-minor', 'cadences', 'sing-home-five', 'placement', 'review', 'weekly-puzzle'));

-- At most 50 rated items per result, each a small object.
alter table public.toneturn_lesson_results drop constraint if exists toneturn_items_shape;
alter table public.toneturn_lesson_results add constraint toneturn_items_shape
  check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 50);

-- "Lessons completed" counts path lessons only (not placement / review / puzzle).
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
      where x.user_id = r.uid and x.lesson_id in ('bflat-two-homes', 'degrees-135', 'major-minor', 'cadences', 'sing-home-five'))::int end,
    case when r.relation in ('me', 'friend') then (select g.best from public.toneturn_game_bests g where g.user_id = r.uid and g.kind = 'melody') end,
    case when r.relation in ('me', 'friend') then (select g.best from public.toneturn_game_bests g where g.user_id = r.uid and g.kind = 'rhythm') end,
    case when r.relation in ('me', 'friend') then (select max(x.completed_at) from public.toneturn_lesson_results x where x.user_id = r.uid) end
  from rel r
  left join public.toneturn_profiles p on p.id = r.uid
  where r.uid is not null;
$$;
revoke execute on function public.toneturn_friends() from public, anon;
grant execute on function public.toneturn_friends() to authenticated;
