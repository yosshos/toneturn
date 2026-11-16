-- ToneTurn / The 7th Sense — gifts between friends (owner decisions 2026-11-16): פרמטה (a streak freeze), הקדשת משפט
-- (dedicate an Encore phrase), תרגל איתי עכשיו (practise together now → the duet streak). Rules: src/engine/encore/gifts.ts.
-- AFTER 20261204000000_toneturn_phrase_challenges.sql (which now also carries the per-kind reactions).
--
-- NOT APPLIED BY THE AGENT — the owner dry-runs it first. Additive and safe to re-run. The client calls none of this
-- until the challenges flag is on (src/cloud/challenges.ts CHALLENGES_ON).
--
-- Limits (owner, 2026-11-16 — to keep anyone from being flooded):
--  · ONE gift (fermata OR dedication, combined) per sender per practice day: the sender must have measured practice
--    today (5 measured minutes — the server cannot see the device's practice clock, so the client sends today's measured
--    ms as its proof; a lesson / daily result on the server also counts) and the unique index on (from_user, day)
--    allows one gift that day. Today's allowance only — nothing accumulates.
--  · Practise-with-me invites: up to 3 a day per sender; an invite lives 30 minutes; a session ends after 2 hours.
--  · Anti-automation: gifts + invites, 60 an hour per sender (never met in normal use).
-- Friends only, never across a block, never to oneself. Young players (under 13, either side): no free-text note.
-- Every table is RLS-on with no direct grants: all access goes through the security-definer functions below.
-- Notifications: each gift / invite / completed dedication joins toneturn_push_queue (kinds 'gift', 'together',
-- 'dedication_done'); the social budget (one merged push a day, quiet hours) sends them under the "duets" setting.
-- The edge function's wording for these kinds lives in supabase/functions/_shared/socialPush.ts (redeploy
-- toneturn-streak-reminder after applying; until then they go out with the generic "news from your friends" line).

-- ===================================================================== tables

create table if not exists public.toneturn_gifts (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users (id) on delete cascade,
  to_user     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('fermata', 'dedication')),
  -- the sender's local day (the allowance is one gift per practice day)
  day         date not null,
  -- a dedication: the phrase as note data (the same compact code as a shared phrase), its title, an optional note
  ref         text check (ref is null or (ref like 'phrase1:%' and length(ref) <= 6000)),
  title       text check (title is null or length(title) <= 60),
  note        text check (note is null or length(note) <= 140),
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz,
  done_at     timestamptz,
  bonus_to_at   timestamptz,
  bonus_from_at timestamptz,
  check (from_user <> to_user),
  check (kind = 'fermata' or ref is not null)
);
create unique index if not exists toneturn_gifts_one_a_day on public.toneturn_gifts (from_user, day);
create index if not exists toneturn_gifts_to on public.toneturn_gifts (to_user, created_at desc);

create table if not exists public.toneturn_together (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users (id) on delete cascade,
  to_user     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  status      text not null default 'pending' check (status in ('pending', 'active', 'done', 'declined', 'ended')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  from_ms     int not null default 0,
  to_ms       int not null default 0,
  from_active timestamptz,
  to_active   timestamptz,
  done_at     timestamptz,
  check (from_user <> to_user)
);
create index if not exists toneturn_together_from on public.toneturn_together (from_user, created_at desc);
create index if not exists toneturn_together_to on public.toneturn_together (to_user, created_at desc);

-- Days a finished together session counted for a pair's duet streak (a < b).
create table if not exists public.toneturn_duet_days (
  a   uuid not null references auth.users (id) on delete cascade,
  b   uuid not null references auth.users (id) on delete cascade,
  day date not null,
  primary key (a, b, day),
  check (a < b)
);

alter table public.toneturn_gifts enable row level security;
alter table public.toneturn_together enable row level security;
alter table public.toneturn_duet_days enable row level security;
revoke all on public.toneturn_gifts, public.toneturn_together, public.toneturn_duet_days from anon, authenticated;

-- ===================================================================== helpers

-- My local day (the profile's time zone).
create or replace function public.toneturn_local_day(p_user uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select p.tz from public.toneturn_profiles p where p.id = p_user), 'UTC'))::date;
$$;
revoke execute on function public.toneturn_local_day(uuid) from public, anon, authenticated;

-- May these two exchange gifts? Friends, no block, not the same player.
create or replace function public.toneturn_may_gift(p_from uuid, p_to uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_from is not null and p_to is not null and p_from <> p_to
     and public.toneturn_are_friends(p_from, p_to) and not public.toneturn_blocked_either(p_from, p_to);
$$;
revoke execute on function public.toneturn_may_gift(uuid, uuid) from public, anon, authenticated;

-- The anti-automation bound: gifts + invites in the last hour.
create or replace function public.toneturn_gift_spam(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.toneturn_gifts g where g.from_user = p_user and g.created_at > now() - interval '1 hour')
       + (select count(*) from public.toneturn_together t where t.from_user = p_user and t.created_at > now() - interval '1 hour') >= 60;
$$;
revoke execute on function public.toneturn_gift_spam(uuid) from public, anon, authenticated;

create or replace function public.toneturn_gift_enqueue(p_user uuid, p_kind text, p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.toneturn_push_queue (user_id, kind, data) values (p_user, p_kind, p_data);
exception when others then
  null; -- a notification problem never blocks the gift
end $$;
revoke execute on function public.toneturn_gift_enqueue(uuid, text, jsonb) from public, anon, authenticated;

-- ===================================================================== gifts

-- Send today's gift. p_day = my local day on the device (must match the server's within a day, for time zones);
-- p_measured_ms = today's measured practice on the device (≥ 5 min), or a result on the server today.
create or replace function public.toneturn_gift_send(p_friend uuid, p_kind text, p_day date, p_measured_ms int,
  p_ref text default null, p_title text default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_day date := public.toneturn_local_day(me);
  v_id uuid;
  v_note text := nullif(left(regexp_replace(coalesce(p_note, ''), '\s+', ' ', 'g'), 140), '');
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_kind not in ('fermata', 'dedication') then raise exception 'bad kind'; end if;
  if not public.toneturn_may_gift(me, p_friend) then raise exception 'not friends'; end if;
  if p_day is null or abs(p_day - my_day) > 1 then raise exception 'bad day'; end if;
  if coalesce(p_measured_ms, 0) < 300000
     and not public.toneturn_practised_on(me, p_day, coalesce((select p.tz from public.toneturn_profiles p where p.id = me), 'UTC')) then
    raise exception 'practise first';
  end if;
  if exists (select 1 from public.toneturn_gifts g where g.from_user = me and g.day = p_day) then raise exception 'one gift a day'; end if;
  if public.toneturn_gift_spam(me) then raise exception 'slow down'; end if;
  if p_kind = 'dedication' and (p_ref is null or p_ref not like 'phrase1:%' or length(p_ref) > 6000) then raise exception 'bad phrase'; end if;
  if public.toneturn_is_young(me) or public.toneturn_is_young(p_friend) then v_note := null; end if;
  insert into public.toneturn_gifts (from_user, to_user, kind, day, ref, title, note)
  values (me, p_friend, p_kind, p_day,
          case when p_kind = 'dedication' then p_ref end,
          case when p_kind = 'dedication' then left(coalesce(nullif(trim(p_title), ''), 'Phrase'), 60) end,
          case when p_kind = 'dedication' then v_note end)
  returning id into v_id;
  perform public.toneturn_gift_enqueue(p_friend, 'gift', jsonb_build_object('from', public.toneturn_public_name(me), 'gift', p_kind));
  return v_id;
exception when unique_violation then
  raise exception 'one gift a day';
end $$;

-- The receiver took the gift into their app (a fermata into the streak, a dedication into the library).
create or replace function public.toneturn_gift_claim(p_gift uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.toneturn_gifts g set claimed_at = coalesce(g.claimed_at, now()) where g.id = p_gift and g.to_user = auth.uid();
end $$;

-- The receiver made the dedicated phrase "yours" (rank f, measured on the device). Tells the sender (feed + push).
create or replace function public.toneturn_dedication_done(p_gift uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  g record;
begin
  select * into g from public.toneturn_gifts x where x.id = p_gift and x.to_user = me and x.kind = 'dedication';
  if g.id is null then raise exception 'no dedication'; end if;
  if g.done_at is not null then return; end if;
  update public.toneturn_gifts x set done_at = now() where x.id = p_gift;
  if not public.toneturn_blocked_either(g.from_user, me) then
    perform public.toneturn_gift_enqueue(g.from_user, 'dedication_done', jsonb_build_object('from', public.toneturn_public_name(me), 'title', g.title));
  end if;
end $$;

-- The completion bonus, once per side (true = grant it now; the device adds DEDICATION_XP as personal XP).
create or replace function public.toneturn_dedication_bonus(p_gift uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  n int;
begin
  update public.toneturn_gifts x set bonus_to_at = now()
  where x.id = p_gift and x.kind = 'dedication' and x.done_at is not null and x.to_user = me and x.bonus_to_at is null;
  get diagnostics n = row_count;
  if n > 0 then return true; end if;
  update public.toneturn_gifts x set bonus_from_at = now()
  where x.id = p_gift and x.kind = 'dedication' and x.done_at is not null and x.from_user = me and x.bonus_from_at is null;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- ===================================================================== practise together

create or replace function public.toneturn_together_invite(p_friend uuid, p_day date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_id uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not public.toneturn_may_gift(me, p_friend) then raise exception 'not friends'; end if;
  if p_day is null or abs(p_day - public.toneturn_local_day(me)) > 1 then raise exception 'bad day'; end if;
  if (select count(*) from public.toneturn_together t where t.from_user = me and t.day = p_day) >= 3 then raise exception 'three invites a day'; end if;
  if public.toneturn_gift_spam(me) then raise exception 'slow down'; end if;
  -- one open invite / session per pair at a time
  update public.toneturn_together t set status = 'ended'
  where t.status in ('pending', 'active') and least(t.from_user, t.to_user) = least(me, p_friend) and greatest(t.from_user, t.to_user) = greatest(me, p_friend);
  insert into public.toneturn_together (from_user, to_user, day) values (me, p_friend, p_day) returning id into v_id;
  perform public.toneturn_gift_enqueue(p_friend, 'together', jsonb_build_object('from', public.toneturn_public_name(me)));
  return v_id;
end $$;

create or replace function public.toneturn_together_answer(p_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  t record;
begin
  select * into t from public.toneturn_together x where x.id = p_id and x.to_user = me;
  if t.id is null or t.status <> 'pending' or t.created_at < now() - interval '30 minutes' then raise exception 'no invite'; end if;
  if not public.toneturn_may_gift(t.from_user, me) then raise exception 'not friends'; end if;
  update public.toneturn_together x set status = case when p_accept then 'active' else 'declined' end,
    accepted_at = case when p_accept then now() end
  where x.id = p_id;
end $$;

-- My measured time since the session started (capped by the time since it started). Returns the session as the
-- client reads it; when both have 5 measured minutes the session is done: that day counts for the duet streak (a duet
-- starts as active if the pair had none — both chose to practise together).
create or replace function public.toneturn_together_beat(p_id uuid, p_ms int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  t record;
  cap int;
  lo uuid;
  hi uuid;
  ms int;
begin
  select * into t from public.toneturn_together x where x.id = p_id and me in (x.from_user, x.to_user);
  if t.id is null then raise exception 'no session'; end if;
  if t.status = 'pending' and t.created_at < now() - interval '30 minutes' then
    update public.toneturn_together x set status = 'ended' where x.id = p_id;
    t.status := 'ended';
  end if;
  if t.status = 'active' and t.accepted_at < now() - interval '2 hours' then
    update public.toneturn_together x set status = 'ended' where x.id = p_id;
    t.status := 'ended';
  end if;
  if t.status = 'active' then
    cap := greatest(0, floor(extract(epoch from (now() - t.accepted_at)) * 1000))::int;
    ms := least(greatest(coalesce(p_ms, 0), 0), cap);
    if me = t.from_user then
      update public.toneturn_together x set from_active = case when ms > x.from_ms then now() else x.from_active end, from_ms = greatest(x.from_ms, ms) where x.id = p_id;
    else
      update public.toneturn_together x set to_active = case when ms > x.to_ms then now() else x.to_active end, to_ms = greatest(x.to_ms, ms) where x.id = p_id;
    end if;
    select * into t from public.toneturn_together x where x.id = p_id;
    if t.from_ms >= 300000 and t.to_ms >= 300000 then
      lo := least(t.from_user, t.to_user);
      hi := greatest(t.from_user, t.to_user);
      update public.toneturn_together x set status = 'done', done_at = now() where x.id = p_id;
      insert into public.toneturn_duet_days (a, b, day) values (lo, hi, public.toneturn_local_day(me)) on conflict do nothing;
      insert into public.toneturn_duets (a, b, status, invited_by, started_day) values (lo, hi, 'active', t.from_user, public.toneturn_local_day(me))
        on conflict (a, b) do update set status = 'active' where public.toneturn_duets.status <> 'active';
      t.status := 'done';
    end if;
  end if;
  return jsonb_build_object(
    'id', t.id, 'status', t.status, 'mine', t.from_user = me,
    'friend', case when t.from_user = me then t.to_user else t.from_user end,
    'friend_name', public.toneturn_public_name(case when t.from_user = me then t.to_user else t.from_user end),
    'created_at', t.created_at, 'accepted_at', t.accepted_at,
    'me_ms', case when t.from_user = me then t.from_ms else t.to_ms end,
    'them_ms', case when t.from_user = me then t.to_ms else t.from_ms end,
    'me_active', case when t.from_user = me then t.from_active else t.to_active end,
    'them_active', case when t.from_user = me then t.to_active else t.from_active end);
end $$;

-- ===================================================================== the duet streak counts together days

-- As 20261124000000 (both practised on their own local day), plus: a day a together session finished counts for both.
create or replace function public.toneturn_duets_view()
returns table (friend uuid, name text, status text, invited_by_me boolean, expired boolean, streak integer, best integer, me_today boolean, them_today boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_tz text;
  their_tz text;
  today date;
  d record;
  v_day date;
  n integer;
  since date;
  other uuid;
  tog_today boolean;
begin
  if me is null then return; end if;
  select coalesce(p.tz, 'UTC') into my_tz from public.toneturn_profiles p where p.id = me;
  my_tz := coalesce(my_tz, 'UTC');
  today := (now() at time zone my_tz)::date;
  for d in
    select x.* from public.toneturn_duets x
    where me in (x.a, x.b) and x.status in ('pending', 'active')
    order by x.created_at
  loop
    other := case when d.a = me then d.b else d.a end;
    if public.toneturn_blocked_either(me, other) or not public.toneturn_are_friends(me, other) then continue; end if;
    select coalesce(p.tz, 'UTC') into their_tz from public.toneturn_profiles p where p.id = other;
    their_tz := coalesce(their_tz, 'UTC');
    friend := other;
    select coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), 'Player') into name from public.toneturn_profiles p where p.id = other;
    status := d.status;
    invited_by_me := d.invited_by = me;
    expired := d.status = 'pending' and d.created_at < now() - interval '7 days';
    tog_today := exists (select 1 from public.toneturn_duet_days x where x.a = d.a and x.b = d.b and x.day = today);
    me_today := tog_today or public.toneturn_practised_on(me, today, my_tz);
    them_today := tog_today or public.toneturn_practised_on(other, (now() at time zone their_tz)::date, their_tz);
    n := 0;
    if d.status = 'active' then
      since := least((d.created_at at time zone my_tz)::date, coalesce(d.started_day, today));
      v_day := case when me_today and them_today then today else today - 1 end;
      while v_day >= since and n < 1000
        and (exists (select 1 from public.toneturn_duet_days x where x.a = d.a and x.b = d.b and x.day = v_day)
             or (public.toneturn_practised_on(me, v_day, my_tz) and public.toneturn_practised_on(other, v_day, their_tz))) loop
        n := n + 1;
        v_day := v_day - 1;
      end loop;
    end if;
    streak := n;
    best := greatest(d.best, n);
    return next;
  end loop;
end $$;
revoke execute on function public.toneturn_duets_view() from public, anon;
grant execute on function public.toneturn_duets_view() to authenticated;

-- ===================================================================== the read side

-- Everything the gifts screen and the app's sync need, for my local day p_day:
--  today: gifts and invites I sent that day; friends: id, name, icon, colour, duet streak; received: gifts to me (60 days);
--  sent: my dedications (done or not; 60 days); sessions: invites / sessions involving me (last 2 hours).
create or replace function public.toneturn_gifts_view(p_day date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  duets jsonb;
begin
  if me is null then raise exception 'not signed in'; end if;
  select coalesce(jsonb_object_agg(v.friend::text, v.streak), '{}'::jsonb) into duets from public.toneturn_duets_view() v where v.status = 'active';
  return jsonb_build_object(
    'today', jsonb_build_object(
      'gifts', (select count(*) from public.toneturn_gifts g where g.from_user = me and g.day = p_day),
      'invites', (select count(*) from public.toneturn_together t where t.from_user = me and t.day = p_day)),
    'friends', coalesce((select jsonb_agg(jsonb_build_object(
        'id', f.other, 'name', public.toneturn_public_name(f.other),
        'icon', (select pr.avatar_icon from public.toneturn_profiles pr where pr.id = f.other),
        'color', (select pr.avatar_color from public.toneturn_profiles pr where pr.id = f.other),
        'young', public.toneturn_is_young(f.other),
        'duet', coalesce((duets ->> f.other::text)::int, 0)) order by public.toneturn_public_name(f.other))
      from (select case when fr.requester = me then fr.addressee else fr.requester end as other
            from public.toneturn_friendships fr where fr.status = 'accepted' and me in (fr.requester, fr.addressee)) f
      where not public.toneturn_blocked_either(me, f.other)), '[]'::jsonb),
    'received', coalesce((select jsonb_agg(jsonb_build_object(
        'id', g.id, 'kind', g.kind, 'from_id', g.from_user, 'from_name', public.toneturn_public_name(g.from_user),
        'title', g.title, 'ref', g.ref, 'note', g.note, 'created_at', g.created_at,
        'claimed', g.claimed_at is not null, 'done', g.done_at is not null, 'bonus', g.bonus_to_at is not null) order by g.created_at desc)
      from public.toneturn_gifts g
      where g.to_user = me and g.created_at > now() - interval '60 days' and not public.toneturn_blocked_either(me, g.from_user)), '[]'::jsonb),
    'sent', coalesce((select jsonb_agg(jsonb_build_object(
        'id', g.id, 'kind', g.kind, 'to_id', g.to_user, 'to_name', public.toneturn_public_name(g.to_user),
        'title', g.title, 'created_at', g.created_at, 'done', g.done_at is not null, 'bonus', g.bonus_from_at is not null) order by g.created_at desc)
      from public.toneturn_gifts g where g.from_user = me and g.created_at > now() - interval '60 days'), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'status', case when t.status = 'pending' and t.created_at < now() - interval '30 minutes' then 'ended' else t.status end,
        'mine', t.from_user = me,
        'friend', case when t.from_user = me then t.to_user else t.from_user end,
        'friend_name', public.toneturn_public_name(case when t.from_user = me then t.to_user else t.from_user end),
        'created_at', t.created_at, 'accepted_at', t.accepted_at,
        'me_ms', case when t.from_user = me then t.from_ms else t.to_ms end,
        'them_ms', case when t.from_user = me then t.to_ms else t.from_ms end,
        'me_active', case when t.from_user = me then t.from_active else t.to_active end,
        'them_active', case when t.from_user = me then t.to_active else t.from_active end) order by t.created_at desc)
      from public.toneturn_together t
      where me in (t.from_user, t.to_user) and t.created_at > now() - interval '2 hours'
        and not public.toneturn_blocked_either(t.from_user, t.to_user)), '[]'::jsonb));
end $$;

-- ===================================================================== notifications

alter table public.toneturn_push_queue drop constraint if exists toneturn_push_queue_kind_check;
alter table public.toneturn_push_queue add constraint toneturn_push_queue_kind_check
  check (kind in ('duel_new', 'duel_done', 'nudge', 'cheer', 'friend_req', 'quest', 'gift', 'together', 'dedication_done'));

-- As 20261130120000, with the gift kinds under the "duets" notification setting.
create or replace function public.toneturn_social_push_due()
returns table (user_id uuid, tz text, lang text, quiet_from int, quiet_to int, last_day date, items jsonb, subs jsonb)
language sql stable security definer set search_path = '' as $$
  with pending as (
    select q.user_id, jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'data', q.data, 'at', q.created_at) order by q.id) as items
    from public.toneturn_push_queue q
    where q.sent_at is null and q.created_at > now() - interval '36 hours'
      and public.toneturn_notify_on(q.user_id, case q.kind
        when 'nudge' then 'nudges' when 'friend_req' then 'requests' when 'duel_new' then 'challenges' when 'duel_done' then 'challenges'
        when 'quest' then 'duets' when 'gift' then 'duets' when 'together' then 'duets' when 'dedication_done' then 'duets' else 'cheers' end)
    group by q.user_id
  )
  select p.user_id,
    coalesce(pr.tz, 'UTC'),
    coalesce((select s.lang from public.toneturn_push_subscriptions s where s.user_id = p.user_id order by s.id desc limit 1), 'en'),
    case when pr.privacy ->> 'quietFrom' ~ '^[0-9]{1,2}$' then least(23, (pr.privacy ->> 'quietFrom')::int) else 22 end,
    case when pr.privacy ->> 'quietTo' ~ '^[0-9]{1,2}$' then least(23, (pr.privacy ->> 'quietTo')::int) else 8 end,
    (select max(l.local_day) from public.toneturn_push_log l where l.user_id = p.user_id and l.kind = 'social'),
    p.items,
    (select jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
       from public.toneturn_push_subscriptions s where s.user_id = p.user_id)
  from pending p
  left join public.toneturn_profiles pr on pr.id = p.user_id
  where exists (select 1 from public.toneturn_push_subscriptions s where s.user_id = p.user_id)
  limit 500;
$$;
revoke execute on function public.toneturn_social_push_due() from public, anon, authenticated;
grant execute on function public.toneturn_social_push_due() to service_role;

-- ===================================================================== grants

revoke all on function public.toneturn_gift_send(uuid, text, date, int, text, text, text) from public, anon;
revoke all on function public.toneturn_gift_claim(uuid) from public, anon;
revoke all on function public.toneturn_dedication_done(uuid) from public, anon;
revoke all on function public.toneturn_dedication_bonus(uuid) from public, anon;
revoke all on function public.toneturn_together_invite(uuid, date) from public, anon;
revoke all on function public.toneturn_together_answer(uuid, boolean) from public, anon;
revoke all on function public.toneturn_together_beat(uuid, int) from public, anon;
revoke all on function public.toneturn_gifts_view(date) from public, anon;
grant execute on function public.toneturn_gift_send(uuid, text, date, int, text, text, text) to authenticated;
grant execute on function public.toneturn_gift_claim(uuid) to authenticated;
grant execute on function public.toneturn_dedication_done(uuid) to authenticated;
grant execute on function public.toneturn_dedication_bonus(uuid) to authenticated;
grant execute on function public.toneturn_together_invite(uuid, date) to authenticated;
grant execute on function public.toneturn_together_answer(uuid, boolean) to authenticated;
grant execute on function public.toneturn_together_beat(uuid, int) to authenticated;
grant execute on function public.toneturn_gifts_view(date) to authenticated;
