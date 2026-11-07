-- ToneTurn / The 7th Sense — social version (docs/SPEC-SOCIAL.md §1–§5, §8).
-- NOT APPLIED YET (written 2026-11-07 without database access; review, then apply after
-- 20261121000000_toneturn_league_placement.sql). Safe to re-run.
--
-- Profile: nickname (unique, case-insensitive), country flag, picture (icon + colour or a photo in storage),
-- privacy jsonb, year of birth (young-player mode). Blocks, reports, duet streaks, nudges, friends' activity and
-- cheers. Every change goes through security-definer functions that check friendship, blocks and privacy.

-- ---------------------------------------------------------------- profile
alter table public.toneturn_profiles
  add column if not exists nickname text,
  add column if not exists nickname_changed_at timestamptz,
  add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$'),
  add column if not exists avatar_icon text check (avatar_icon is null or avatar_icon ~ '^[a-z]{2,16}$'),
  add column if not exists avatar_color text check (avatar_color is null or avatar_color ~ '^#[0-9a-f]{6}$'),
  add column if not exists avatar_photo boolean not null default false,
  add column if not exists privacy jsonb not null default '{"preset":"friends"}'::jsonb,
  add column if not exists birth_year int check (birth_year is null or birth_year between 1900 and 2100);

create unique index if not exists toneturn_profiles_nickname_lower on public.toneturn_profiles (lower(nickname)) where nickname is not null;
alter table public.toneturn_profiles drop constraint if exists toneturn_profiles_nickname_shape;
alter table public.toneturn_profiles add constraint toneturn_profiles_nickname_shape
  check (nickname is null or nickname ~ '^[A-Za-z][A-Za-z0-9_]{2,19}$');

-- Young-player mode (§8): under 13 (16 in the EU — the client passes eu; the server uses the stricter 16 when unknown).
create or replace function public.toneturn_is_young(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select extract(year from now())::int - birth_year - 1 < 13 from public.toneturn_profiles where id = p_user), false);
$$;
revoke execute on function public.toneturn_is_young(uuid) from public, anon, authenticated;

-- The effective setting for one privacy key, with the young-player caps.
create or replace function public.toneturn_privacy(p_user uuid, p_key text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  p jsonb;
  preset text;
  v text;
  young boolean := public.toneturn_is_young(p_user);
begin
  select privacy into p from public.toneturn_profiles where id = p_user;
  preset := coalesce(p ->> 'preset', 'friends');
  v := p ->> p_key;
  if v is null then
    v := case p_key
      when 'photo' then case preset when 'open' then 'everyone' when 'private' then 'none' else 'friends' end
      when 'onBoards' then case preset when 'private' then 'anonymous' else 'nickname' end
      when 'friendRequests' then case preset when 'private' then 'code' else 'everyone' end
      when 'challenges' then case preset when 'open' then 'everyone' when 'private' then 'none' else 'friends' end
      when 'nudges' then case preset when 'private' then 'none' else 'friends' end
      when 'quickMessages' then case preset when 'open' then 'everyone' when 'private' then 'none' else 'friends' end
      else null end;
  end if;
  if young then
    if p_key = 'photo' then v := 'none'; end if;
    if p_key = 'friendRequests' and v <> 'none' then v := 'code'; end if;
    if p_key in ('challenges', 'quickMessages') and v = 'everyone' then v := 'friends'; end if;
  end if;
  return v;
end $$;
revoke execute on function public.toneturn_privacy(uuid, text) from public, anon, authenticated;

create or replace function public.toneturn_are_friends(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.toneturn_friendships
    where status = 'accepted' and ((requester = p_a and addressee = p_b) or (requester = p_b and addressee = p_a))
  );
$$;
revoke execute on function public.toneturn_are_friends(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- blocks & reports
create table if not exists public.toneturn_blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.toneturn_blocks enable row level security;
drop policy if exists "blocks: own read" on public.toneturn_blocks;
create policy "blocks: own read" on public.toneturn_blocks for select to authenticated using ((select auth.uid()) = blocker);
revoke all on public.toneturn_blocks from anon;
revoke insert, update, delete, truncate on public.toneturn_blocks from authenticated;
grant select on public.toneturn_blocks to authenticated;

create or replace function public.toneturn_blocked_either(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.toneturn_blocks where (blocker = p_a and blocked = p_b) or (blocker = p_b and blocked = p_a));
$$;
revoke execute on function public.toneturn_blocked_either(uuid, uuid) from public, anon, authenticated;

create table if not exists public.toneturn_reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references auth.users (id) on delete cascade,
  reported uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('nickname', 'photo', 'message', 'cheating', 'other')),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now()
);
alter table public.toneturn_reports enable row level security;
revoke all on public.toneturn_reports from anon, authenticated;

-- ---------------------------------------------------------------- duet streaks
create table if not exists public.toneturn_duets (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  invited_by uuid not null references auth.users (id) on delete cascade,
  started_day date,
  best int not null default 0,
  repaired jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
alter table public.toneturn_duets enable row level security;
drop policy if exists "duets: partners read" on public.toneturn_duets;
create policy "duets: partners read" on public.toneturn_duets for select to authenticated using ((select auth.uid()) in (a, b));
revoke all on public.toneturn_duets from anon;
revoke insert, update, delete, truncate on public.toneturn_duets from authenticated;
grant select on public.toneturn_duets to authenticated;

-- ---------------------------------------------------------------- nudges
create table if not exists public.toneturn_nudges (
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  day date not null,
  message text not null check (message in ('practise', 'duet', 'miss', 'beat')),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  worked_at timestamptz,
  primary key (from_user, to_user, day)
);
alter table public.toneturn_nudges enable row level security;
drop policy if exists "nudges: involved read" on public.toneturn_nudges;
create policy "nudges: involved read" on public.toneturn_nudges for select to authenticated using ((select auth.uid()) in (from_user, to_user));
revoke all on public.toneturn_nudges from anon;
revoke insert, update, delete, truncate on public.toneturn_nudges from authenticated;
grant select on public.toneturn_nudges to authenticated;

-- ---------------------------------------------------------------- friends' activity & cheers
create table if not exists public.toneturn_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('unit', 'rank', 'badge', 'streak', 'duet', 'best')),
  payload jsonb not null default '{}'::jsonb check (length(payload::text) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists toneturn_activity_user on public.toneturn_activity (user_id, created_at desc);
alter table public.toneturn_activity enable row level security;
revoke all on public.toneturn_activity from anon, authenticated;

create table if not exists public.toneturn_cheers (
  activity_id bigint not null references public.toneturn_activity (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, from_user)
);
alter table public.toneturn_cheers enable row level security;
revoke all on public.toneturn_cheers from anon, authenticated;

-- ---------------------------------------------------------------- functions (the only way to write)

-- Set my profile. Nickname: shape + uniqueness (case-insensitive) + at most one change per 30 days after the first.
create or replace function public.toneturn_set_profile(
  p_nickname text default null, p_country text default null, p_icon text default null, p_color text default null,
  p_photo boolean default null, p_privacy jsonb default null, p_birth_year int default null)
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
    birth_year = coalesce(p_birth_year, birth_year)
  where id = me;
  if p_country = '' then update public.toneturn_profiles set country = null where id = me; end if;
end $$;

create or replace function public.toneturn_nickname_free(p_nickname text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.toneturn_profiles where lower(nickname) = lower(p_nickname) and id <> auth.uid());
$$;

-- Block / unblock: a block also ends the friendship and any duet, and hides both from each other.
create or replace function public.toneturn_block(p_user uuid, p_on boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or p_user = me then raise exception 'bad request'; end if;
  if p_on then
    insert into public.toneturn_blocks (blocker, blocked) values (me, p_user) on conflict do nothing;
    delete from public.toneturn_friendships where (requester = me and addressee = p_user) or (requester = p_user and addressee = me);
    update public.toneturn_duets set status = 'ended' where a = least(me, p_user) and b = greatest(me, p_user);
  else
    delete from public.toneturn_blocks where blocker = me and blocked = p_user;
  end if;
end $$;

create or replace function public.toneturn_report(p_user uuid, p_kind text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or p_user = me then raise exception 'bad request'; end if;
  if (select count(*) from public.toneturn_reports where reporter = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many reports today';
  end if;
  insert into public.toneturn_reports (reporter, reported, kind, note) values (me, p_user, p_kind, left(p_note, 500));
end $$;

-- Duets: invite (friends only, max 5 active or pending each), accept, end.
create or replace function public.toneturn_duet(p_friend uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  lo uuid := least(me, p_friend);
  hi uuid := greatest(me, p_friend);
  d record;
begin
  if me is null or p_friend = me then raise exception 'bad request'; end if;
  select * into d from public.toneturn_duets where a = lo and b = hi;
  if p_action = 'invite' then
    if not public.toneturn_are_friends(me, p_friend) or public.toneturn_blocked_either(me, p_friend) then raise exception 'not friends'; end if;
    if (select count(*) from public.toneturn_duets where me in (a, b) and status in ('pending', 'active')) >= 5 then raise exception 'max 5 duets'; end if;
    insert into public.toneturn_duets (a, b, status, invited_by) values (lo, hi, 'pending', me)
      on conflict (a, b) do update set status = 'pending', invited_by = me, started_day = null, created_at = now()
      where public.toneturn_duets.status = 'ended';
  elsif p_action = 'accept' then
    if d is null or d.status <> 'pending' or d.invited_by = me or d.created_at < now() - interval '7 days' then raise exception 'no invite'; end if;
    update public.toneturn_duets set status = 'active', started_day = null where a = lo and b = hi;
  elsif p_action = 'end' then
    update public.toneturn_duets set status = 'ended' where a = lo and b = hi;
  else
    raise exception 'bad action';
  end if;
end $$;

-- Nudge a friend who hasn't practised today: one per friend per day; respects their setting and blocks.
create or replace function public.toneturn_nudge(p_friend uuid, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  their_tz text;
  their_day date;
begin
  if me is null or p_friend = me then raise exception 'bad request'; end if;
  if not public.toneturn_are_friends(me, p_friend) or public.toneturn_blocked_either(me, p_friend) then raise exception 'not friends'; end if;
  if public.toneturn_privacy(p_friend, 'nudges') = 'none' then raise exception 'nudges off'; end if;
  select tz into their_tz from public.toneturn_profiles where id = p_friend;
  their_day := (now() at time zone coalesce(their_tz, 'UTC'))::date;
  if public.toneturn_practised_on(p_friend, their_day, coalesce(their_tz, 'UTC')) then raise exception 'already practised'; end if;
  if p_message = 'duet' and not exists (select 1 from public.toneturn_duets where a = least(me, p_friend) and b = greatest(me, p_friend) and status = 'active') then
    raise exception 'no duet';
  end if;
  insert into public.toneturn_nudges (from_user, to_user, day, message) values (me, p_friend, their_day, p_message);
end $$;

-- Tell my friends (in-app activity) and cheer a friend's post.
create or replace function public.toneturn_post_activity(p_kind text, p_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); id bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.toneturn_activity where user_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many posts today';
  end if;
  insert into public.toneturn_activity (user_id, kind, payload) values (me, p_kind, p_payload) returning toneturn_activity.id into id;
  return id;
end $$;

create or replace function public.toneturn_cheer(p_activity bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); owner uuid;
begin
  select user_id into owner from public.toneturn_activity where id = p_activity;
  if owner is null or me is null or owner = me then raise exception 'bad request'; end if;
  if not public.toneturn_are_friends(me, owner) or public.toneturn_blocked_either(me, owner) then raise exception 'not friends'; end if;
  insert into public.toneturn_cheers (activity_id, from_user) values (p_activity, me) on conflict do nothing;
end $$;

-- My friends' activity (last 14 days), with cheer counts and whether I cheered.
create or replace function public.toneturn_friends_activity()
returns table (id bigint, user_id uuid, nickname text, country text, kind text, payload jsonb, created_at timestamptz, cheers int, mine boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.user_id, p.nickname, p.country, a.kind, a.payload, a.created_at,
    (select count(*)::int from public.toneturn_cheers c where c.activity_id = a.id),
    exists (select 1 from public.toneturn_cheers c where c.activity_id = a.id and c.from_user = auth.uid())
  from public.toneturn_activity a
  join public.toneturn_profiles p on p.id = a.user_id
  where a.created_at > now() - interval '14 days'
    and (a.user_id = auth.uid() or (public.toneturn_are_friends(auth.uid(), a.user_id) and not public.toneturn_blocked_either(auth.uid(), a.user_id)))
  order by a.created_at desc
  limit 100;
$$;

revoke execute on function public.toneturn_set_profile(text, text, text, text, boolean, jsonb, int) from public, anon;
revoke execute on function public.toneturn_nickname_free(text) from public, anon;
revoke execute on function public.toneturn_block(uuid, boolean) from public, anon;
revoke execute on function public.toneturn_report(uuid, text, text) from public, anon;
revoke execute on function public.toneturn_duet(uuid, text) from public, anon;
revoke execute on function public.toneturn_nudge(uuid, text) from public, anon;
revoke execute on function public.toneturn_post_activity(text, jsonb) from public, anon;
revoke execute on function public.toneturn_cheer(bigint) from public, anon;
revoke execute on function public.toneturn_friends_activity() from public, anon;
grant execute on function public.toneturn_set_profile(text, text, text, text, boolean, jsonb, int) to authenticated;
grant execute on function public.toneturn_nickname_free(text) to authenticated;
grant execute on function public.toneturn_block(uuid, boolean) to authenticated;
grant execute on function public.toneturn_report(uuid, text, text) to authenticated;
grant execute on function public.toneturn_duet(uuid, text) to authenticated;
grant execute on function public.toneturn_nudge(uuid, text) to authenticated;
grant execute on function public.toneturn_post_activity(text, jsonb) to authenticated;
grant execute on function public.toneturn_cheer(bigint) to authenticated;
grant execute on function public.toneturn_friends_activity() to authenticated;

-- ---------------------------------------------------------------- avatar photos (storage)
-- Bucket "avatars" (private): each player writes only "<own uid>.webp"; reads go through signed URLs issued by an
-- edge function that checks the owner's photo setting (friends / everyone) and blocks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 200000, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;
drop policy if exists "avatars: own write" on storage.objects;
create policy "avatars: own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp' and not public.toneturn_is_young((select auth.uid())));
drop policy if exists "avatars: own update" on storage.objects;
create policy "avatars: own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp');
drop policy if exists "avatars: own delete" on storage.objects;
create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp');
