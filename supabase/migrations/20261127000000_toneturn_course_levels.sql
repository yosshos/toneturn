-- ToneTurn / The 7th Sense — friends compared per course (owner 2026-11-09, community per course).
-- After 20261126000000_toneturn_pricing.sql. NOT APPLIED YET: the lead dry-runs and applies it. Safe to re-run.
--
-- 1) toneturn_profiles.course_levels jsonb: my level in each of my courses, e.g. {"bass":"mf","ear":"f"}
--    (keys = course ids, values = the pp … ff dynamics the app shows). Written only through toneturn_set_profile.
-- 2) toneturn_set_profile gains p_course_levels jsonb default null (null = leave as is). The old 7-argument version
--    is dropped in the same migration (one transaction) so a call without the new argument still resolves to exactly one function
--    (older apps keep working; newer apps retry without the argument against an older server).
-- 3) toneturn_friends() also returns course_levels — for me and accepted friends only (null for pending rows),
--    blocked players stay hidden exactly as before.


-- ---------------------------------------------------------------- column
alter table public.toneturn_profiles
  add column if not exists course_levels jsonb not null default '{}'::jsonb;
alter table public.toneturn_profiles drop constraint if exists toneturn_profiles_course_levels_shape;
alter table public.toneturn_profiles add constraint toneturn_profiles_course_levels_shape
  check (jsonb_typeof(course_levels) = 'object' and pg_column_size(course_levels) <= 512);

-- Keep only known courses with known levels (anything else is dropped, never stored).
create or replace function public.toneturn_clean_course_levels(p jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(p) = 'object' then p else '{}'::jsonb end) e
  where e.key in ('ear', 'voice', 'keys', 'guitar', 'bass', 'jazz', 'exam')
    and jsonb_typeof(e.value) = 'string'
    and (e.value #>> '{}') in ('pp', 'p', 'mp', 'mf', 'f', 'ff');
$$;
revoke execute on function public.toneturn_clean_course_levels(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- set profile (+ course levels)
drop function if exists public.toneturn_set_profile(text, text, text, text, boolean, jsonb, int);
create or replace function public.toneturn_set_profile(
  p_nickname text default null, p_country text default null, p_icon text default null, p_color text default null,
  p_photo boolean default null, p_privacy jsonb default null, p_birth_year int default null,
  p_course_levels jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  cur record;
begin
  if me is null then raise exception 'not signed in'; end if;
  select nickname, nickname_changed_at into cur from public.toneturn_profiles where id = me;
  if p_nickname is not null and p_nickname is distinct from cur.nickname then
    if cur.nickname is not null and cur.nickname_changed_at > now() - interval '30 days' then
      raise exception 'nickname: once per 30 days';
    end if;
    if exists (select 1 from public.toneturn_profiles where lower(nickname) = lower(p_nickname) and id <> me) then
      raise exception 'nickname: taken';
    end if;
    update public.toneturn_profiles set nickname = p_nickname, display_name = p_nickname,
      nickname_changed_at = case when cur.nickname is null then null else now() end where id = me;
  end if;
  update public.toneturn_profiles set
    country = coalesce(nullif(p_country, ''), country),
    avatar_icon = coalesce(p_icon, avatar_icon),
    avatar_color = coalesce(p_color, avatar_color),
    avatar_photo = coalesce(p_photo, avatar_photo) and not public.toneturn_is_young(me),
    privacy = coalesce(p_privacy, privacy),
    birth_year = coalesce(p_birth_year, birth_year),
    course_levels = case when p_course_levels is null then course_levels else public.toneturn_clean_course_levels(p_course_levels) end
  where id = me;
  if p_country = '' then update public.toneturn_profiles set country = null where id = me; end if;
end $$;
revoke execute on function public.toneturn_set_profile(text, text, text, text, boolean, jsonb, int, jsonb) from public, anon;
grant execute on function public.toneturn_set_profile(text, text, text, text, boolean, jsonb, int, jsonb) to authenticated;

-- ---------------------------------------------------------------- friends list (+ course levels)
drop function if exists public.toneturn_friends();
create function public.toneturn_friends()
returns table (user_id uuid, name text, relation text, week_xp integer, total_xp integer, streak integer, lessons_done integer,
  best_melody integer, best_rhythm integer, last_active timestamptz, rating integer, rating_provisional boolean,
  country text, avatar_icon text, avatar_color text, has_photo boolean, course_levels jsonb)
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
    coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), 'Player'),
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
    p.rating_provisional,
    p.country,
    p.avatar_icon,
    p.avatar_color,
    coalesce(p.avatar_photo, false) and (
      r.relation = 'me'
      or (r.relation = 'friend' and public.toneturn_privacy(r.uid, 'photo') in ('friends', 'everyone'))
      or (r.relation in ('incoming', 'outgoing') and public.toneturn_privacy(r.uid, 'photo') = 'everyone')),
    case when r.relation in ('me', 'friend') then coalesce(p.course_levels, '{}'::jsonb) end
  from rel r
  left join public.toneturn_profiles p on p.id = r.uid
  where r.uid is not null
    and (r.relation = 'me' or not public.toneturn_blocked_either((select id from me), r.uid));
$$;
revoke execute on function public.toneturn_friends() from public, anon;
grant execute on function public.toneturn_friends() to authenticated;
