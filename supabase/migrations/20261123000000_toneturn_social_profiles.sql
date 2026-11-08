-- ToneTurn / The 7th Sense — social profiles on the boards (SPEC-SOCIAL §1, §2). After 20261122000000_toneturn_social.
-- APPLIED 2026-11-08 to the app project (with the owner's OK).
-- 1) toneturn_friends() also returns each row's country, icon, colour and whether a photo may be shown to me;
--    blocked players disappear from each other's lists.
-- 2) Storage read rule for "avatars": my own photo, or a friend's photo when their photo setting allows it.
-- Safe to re-run.

drop function if exists public.toneturn_friends();
create function public.toneturn_friends()
returns table (user_id uuid, name text, relation text, week_xp integer, total_xp integer, streak integer, lessons_done integer,
  best_melody integer, best_rhythm integer, last_active timestamptz, rating integer, rating_provisional boolean,
  country text, avatar_icon text, avatar_color text, has_photo boolean)
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
      or (r.relation in ('incoming', 'outgoing') and public.toneturn_privacy(r.uid, 'photo') = 'everyone'))
  from rel r
  left join public.toneturn_profiles p on p.id = r.uid
  where r.uid is not null
    and (r.relation = 'me' or not public.toneturn_blocked_either((select id from me), r.uid));
$$;
revoke execute on function public.toneturn_friends() from public, anon;
grant execute on function public.toneturn_friends() to authenticated;

-- May I see this player's photo? (me, or a friend whose photo setting allows it; never across a block)
create or replace function public.toneturn_photo_visible(p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_owner = auth.uid()
    or (public.toneturn_are_friends(auth.uid(), p_owner)
        and not public.toneturn_blocked_either(auth.uid(), p_owner)
        and public.toneturn_privacy(p_owner, 'photo') in ('friends', 'everyone')
        and coalesce((select avatar_photo from public.toneturn_profiles where id = p_owner), false));
$$;
revoke execute on function public.toneturn_photo_visible(uuid) from public, anon;
grant execute on function public.toneturn_photo_visible(uuid) to authenticated;

drop policy if exists "avatars: read" on storage.objects;
create policy "avatars: read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars'
    and name ~ '^[0-9a-f-]{36}\.webp$'
    and public.toneturn_photo_visible(split_part(name, '.', 1)::uuid));
