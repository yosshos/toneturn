-- ToneTurn / The 7th Sense — the social round (docs/SPEC-SOCIAL.md §8 build order, docs/research/SOCIAL_REVIEW.md),
-- owner-approved 2026-11-12. After 20261129000000_toneturn_groove_duels.sql.
-- NOT APPLIED YET: the lead applies it after a dry run. The client works without it (each feature hides itself or
-- stays local when its RPC is missing). Safe to re-run.
--
--  1. Block & report: report reasons + status + context, "report + block" in one call, automatic actions
--     (3 distinct reporters → the nickname is reset to a generated one and the old one is banned; 2 → a photo is held
--     until review; 2 on one quick message → it is hidden), a blocked list, an admin queue with resolve actions.
--     Blocks now also stop duels (create), room joins and friend requests; my duels list hides blocked players.
--  2. Push budget: social items (nudges, cheers, friend requests, duels, quests) queue up and go out as ONE merged push
--     a day per player, outside quiet hours (privacy.quietFrom / quietTo, default 22–8 local), logged in
--     toneturn_push_log. The edge function toneturn-streak-reminder plans the push (supabase/functions/_shared/
--     socialPush.ts) — REDEPLOY IT after applying; until then social pushes simply wait (nothing is sent twice).
--  3. Friends' activity: more kinds (level, standard, quest), no feed for young players, the owner's "feed" setting.
--  4. Quick messages in duels and rooms: a fixed set of phrases, the receiver's setting decides what is shown.
--  5. Challenge links ("beat my score", duel invite by link): an opaque 8-character code; opening it adds a friend
--     request from the sender and, for a duel link, creates the duel.
--  6. Weekly friend quest (co-op, measured minutes or clean answers) and the class board + class goal for teachers.

-- ===================================================================== helpers

-- A notification type is on unless the player turned it off (privacy.notify.<key> = false).
create or replace function public.toneturn_notify_on(p_user uuid, p_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select (p.privacy -> 'notify' ->> p_key) <> 'false' from public.toneturn_profiles p where p.id = p_user), true);
$$;
revoke execute on function public.toneturn_notify_on(uuid, text) from public, anon, authenticated;

-- The name other players see: the nickname (never the Google name), "Player" when there is none.
create or replace function public.toneturn_public_name(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select nullif(p.nickname, '') from public.toneturn_profiles p where p.id = p_user), 'Player');
$$;
revoke execute on function public.toneturn_public_name(uuid) from public, anon, authenticated;

-- Measured practice in a UTC week: minutes ≈ answered items / 3 (the app's own estimate), clean = first-try correct
-- answers. Practice-log entries ("log:…", self-reported) never count.
create or replace function public.toneturn_week_measure(p_user uuid, p_week date, p_metric text)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(case p_metric
    when 'clean' then sum(r.first_try)
    else floor(sum(r.total) / 3.0) end, 0)::int
  from public.toneturn_lesson_results r
  where r.user_id = p_user and r.completed_at >= p_week::timestamptz and r.completed_at < (p_week + 7)::timestamptz
    and r.lesson_id not like 'log:%';
$$;
revoke execute on function public.toneturn_week_measure(uuid, date, text) from public, anon, authenticated;

-- ===================================================================== 1. block & report

alter table public.toneturn_reports
  add column if not exists status text not null default 'open',
  add column if not exists context jsonb not null default '{}'::jsonb,
  add column if not exists action text,
  add column if not exists resolved_by uuid references auth.users (id) on delete set null,
  add column if not exists resolved_at timestamptz;
alter table public.toneturn_reports drop constraint if exists toneturn_reports_kind_check;
alter table public.toneturn_reports add constraint toneturn_reports_kind_check
  check (kind in ('nickname', 'photo', 'message', 'cheating', 'young', 'other'));
alter table public.toneturn_reports drop constraint if exists toneturn_reports_status_check;
alter table public.toneturn_reports add constraint toneturn_reports_status_check check (status in ('open', 'upheld', 'dismissed'));
alter table public.toneturn_reports drop constraint if exists toneturn_reports_context_size;
alter table public.toneturn_reports add constraint toneturn_reports_context_size check (length(context::text) <= 500);
create index if not exists toneturn_reports_open on public.toneturn_reports (reported, kind) where status = 'open';

-- A photo held after reports stays hidden (whatever the app sends) until an admin clears it.
alter table public.toneturn_profiles add column if not exists photo_held boolean not null default false;

-- Nicknames taken away after reports can't be picked again.
create table if not exists public.toneturn_banned_nicknames (
  nick_lower text primary key,
  created_at timestamptz not null default now()
);
alter table public.toneturn_banned_nicknames add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.toneturn_banned_nicknames enable row level security;
revoke all on public.toneturn_banned_nicknames from anon, authenticated;

create or replace function public.toneturn_profile_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.photo_held then new.avatar_photo := false; end if;
  if new.nickname is not null and new.nickname is distinct from old.nickname
     and exists (select 1 from public.toneturn_banned_nicknames b where b.nick_lower = lower(new.nickname)) then
    raise exception 'nickname: not allowed';
  end if;
  return new;
end $$;
revoke execute on function public.toneturn_profile_guard() from public, anon, authenticated;
drop trigger if exists toneturn_profile_guard on public.toneturn_profiles;
create trigger toneturn_profile_guard before update on public.toneturn_profiles
  for each row execute function public.toneturn_profile_guard();

-- Reset a nickname to a generated one (PlayerNNNNN) and ban the old one; the player picks a new one in the app.
create or replace function public.toneturn_reset_nickname(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  old text;
  n text;
begin
  select nickname into old from public.toneturn_profiles where id = p_user;
  if old is null or old ~ '^Player[0-9]{5}$' then return; end if;
  insert into public.toneturn_banned_nicknames (nick_lower, user_id) values (lower(old), p_user) on conflict do nothing;
  loop
    n := 'Player' || lpad(floor(random() * 100000)::int::text, 5, '0');
    exit when not exists (select 1 from public.toneturn_profiles where lower(nickname) = lower(n));
  end loop;
  update public.toneturn_profiles set nickname = n, display_name = n, nickname_changed_at = null where id = p_user;
end $$;
revoke execute on function public.toneturn_reset_nickname(uuid) from public, anon, authenticated;

-- Report a player (optionally a quick message: p_context = {"ctx":"room"|"duel","msg":<id>}) and, in the same step,
-- block them. Returns 'ok', 'already' (an open report of mine on the same thing) or the automatic action taken.
create or replace function public.toneturn_report_v2(p_user uuid, p_kind text, p_note text default null, p_context jsonb default '{}'::jsonb, p_block boolean default true)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  ctx jsonb := coalesce(p_context, '{}'::jsonb);
  msg bigint := case when ctx ->> 'msg' ~ '^[0-9]{1,18}$' then (ctx ->> 'msg')::bigint end;
  n int;
  result text := 'ok';
begin
  if me is null or p_user is null or p_user = me then raise exception 'bad request'; end if;
  if p_kind not in ('nickname', 'photo', 'message', 'cheating', 'young', 'other') then raise exception 'bad kind'; end if;
  if (select count(*) from public.toneturn_reports where reporter = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many reports today';
  end if;
  if exists (select 1 from public.toneturn_reports r where r.reporter = me and r.reported = p_user and r.kind = p_kind and r.status = 'open'
             and (msg is null or r.context ->> 'msg' = msg::text)) then
    result := 'already';
  else
    insert into public.toneturn_reports (reporter, reported, kind, note, context)
    values (me, p_user, p_kind, left(p_note, 500), jsonb_build_object('ctx', left(ctx ->> 'ctx', 10), 'msg', msg));
    -- Automatic actions (SPEC-SOCIAL §8): counted on distinct reporters with open reports.
    if p_kind = 'nickname' then
      select count(distinct reporter) into n from public.toneturn_reports where reported = p_user and kind = 'nickname' and status = 'open';
      if n >= 3 then
        perform public.toneturn_reset_nickname(p_user);
        update public.toneturn_reports set action = 'auto:nickname-reset' where reported = p_user and kind = 'nickname' and status = 'open';
        result := 'nickname-reset';
      end if;
    elsif p_kind in ('photo', 'young') then
      select count(distinct reporter) into n from public.toneturn_reports where reported = p_user and kind in ('photo', 'young') and status = 'open';
      if n >= 2 then
        update public.toneturn_profiles set photo_held = true where id = p_user;
        update public.toneturn_reports set action = 'auto:photo-held' where reported = p_user and kind in ('photo', 'young') and status = 'open';
        result := 'photo-held';
      end if;
    elsif p_kind = 'message' and msg is not null then
      select count(distinct reporter) into n from public.toneturn_reports where kind = 'message' and status = 'open' and context ->> 'msg' = msg::text;
      if n >= 2 then
        update public.toneturn_quick_msgs set hidden = true where id = msg and from_user = p_user;
        update public.toneturn_reports set action = 'auto:message-hidden' where kind = 'message' and status = 'open' and context ->> 'msg' = msg::text;
        result := 'message-hidden';
      end if;
    end if;
  end if;
  if coalesce(p_block, false) then perform public.toneturn_block(p_user, true); end if;
  return result;
end $$;

-- The players I blocked (for Settings → Privacy → Blocked, with Unblock).
create or replace function public.toneturn_blocked_list()
returns table (user_id uuid, name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.blocked, public.toneturn_public_name(b.blocked), b.created_at
  from public.toneturn_blocks b where b.blocker = auth.uid() order by b.created_at desc limit 200;
$$;

-- Admin: open reports, newest first, with how many distinct players reported the same thing.
create or replace function public.toneturn_reports_open()
returns table (id bigint, created_at timestamptz, kind text, note text, context jsonb, action text,
  reporter_name text, reported uuid, reported_name text, reporters int, phrase text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.toneturn_is_admin() then raise exception 'admins only'; end if;
  return query
  select r.id, r.created_at, r.kind, r.note, r.context, r.action,
    public.toneturn_public_name(r.reporter), r.reported, public.toneturn_public_name(r.reported),
    (select count(distinct x.reporter)::int from public.toneturn_reports x where x.reported = r.reported and x.kind = r.kind and x.status = 'open'),
    (select q.phrase from public.toneturn_quick_msgs q where q.id = case when r.context ->> 'msg' ~ '^[0-9]{1,18}$' then (r.context ->> 'msg')::bigint end)
  from public.toneturn_reports r
  where r.status = 'open'
  order by r.created_at desc
  limit 200;
end $$;

-- Admin: resolve a report (and every open report on the same player and reason).
--   uphold  — keep / apply the action: a nickname is reset, a photo stays held, a message stays hidden.
--   dismiss — undo the automatic action: the photo comes back, the message is shown, the old nickname may be picked again.
create or replace function public.toneturn_report_resolve(p_id bigint, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.toneturn_reports;
  msg bigint;
begin
  if not public.toneturn_is_admin() then raise exception 'admins only'; end if;
  if p_decision not in ('uphold', 'dismiss') then raise exception 'bad decision'; end if;
  select * into r from public.toneturn_reports where id = p_id;
  if r.id is null then raise exception 'not found'; end if;
  msg := case when r.context ->> 'msg' ~ '^[0-9]{1,18}$' then (r.context ->> 'msg')::bigint end;
  if p_decision = 'uphold' then
    if r.kind = 'nickname' then perform public.toneturn_reset_nickname(r.reported); end if;
    if r.kind in ('photo', 'young') then update public.toneturn_profiles set photo_held = true where id = r.reported; end if;
    if r.kind = 'message' and msg is not null then update public.toneturn_quick_msgs set hidden = true where id = msg; end if;
  else
    if r.kind in ('photo', 'young') then update public.toneturn_profiles set photo_held = false where id = r.reported; end if;
    if r.kind = 'message' and msg is not null then update public.toneturn_quick_msgs set hidden = false where id = msg; end if;
    if r.kind = 'nickname' then
      -- The reset can't be undone (the player may have picked a new name), but their old name is free again.
      delete from public.toneturn_banned_nicknames b where b.user_id = r.reported;
    end if;
  end if;
  update public.toneturn_reports x set status = case when p_decision = 'uphold' then 'upheld' else 'dismissed' end,
    resolved_by = auth.uid(), resolved_at = now()
  where x.status = 'open' and x.reported = r.reported
    and (x.kind = r.kind or (r.kind in ('photo', 'young') and x.kind in ('photo', 'young')))
    and (msg is null or x.context ->> 'msg' = msg::text);
end $$;

-- Admin: un-ban a nickname taken away by mistake.
create or replace function public.toneturn_unban_nickname(p_nick text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.toneturn_is_admin() then raise exception 'admins only'; end if;
  delete from public.toneturn_banned_nicknames where nick_lower = lower(p_nick);
end $$;

-- Friend requests: blocked either way, or "no one" in the target's setting → not found; at most 10 requests a day.
create or replace function public.toneturn_add_friend(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  other uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select id into other from public.toneturn_profiles where friend_code = upper(trim(p_code));
  if other is null then return 'not_found'; end if;
  if other = me then return 'self'; end if;
  if public.toneturn_blocked_either(me, other) or public.toneturn_privacy(other, 'friendRequests') = 'none' then return 'not_found'; end if;
  if exists (select 1 from public.toneturn_friendships where status = 'accepted'
             and ((requester = me and addressee = other) or (requester = other and addressee = me))) then
    return 'already';
  end if;
  -- They already asked me → accept.
  update public.toneturn_friendships set status = 'accepted' where requester = other and addressee = me;
  if found then return 'accepted'; end if;
  if (select count(*) from public.toneturn_friendships where requester = me and status = 'pending' and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many requests today';
  end if;
  insert into public.toneturn_friendships (requester, addressee) values (me, other) on conflict do nothing;
  return 'requested';
end;
$$;

-- Duels: no duel across a block, nor with a friend whose "who can challenge me" is "no one".
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
  if public.toneturn_blocked_either(me, p_opponent) then raise exception 'not friends'; end if;
  if public.toneturn_privacy(p_opponent, 'challenges') = 'none' then raise exception 'challenges off'; end if;
  if (select count(*) from public.toneturn_duels d where d.challenger = me and d.created_at > now() - interval '1 day') >= 30 then
    raise exception 'too many duels';
  end if;
  insert into public.toneturn_duels (challenger, opponent, kind, seed, rounds, keys)
  values (me, p_opponent, p_kind, p_seed, coalesce(array_length(p_keys, 1), 0), p_keys) returning toneturn_duels.id into v_id;
  return v_id;
end $$;

-- My duels: blocked players disappear; the other player's id comes along (quick messages, report / block).
create or replace function public.toneturn_duels_mine()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'kind', d.kind, 'seed', d.seed, 'rounds', d.rounds, 'created_at', d.created_at,
    'i_challenged', d.challenger = auth.uid(),
    'other', coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), 'Player'),
    'other_id', case when d.challenger = auth.uid() then d.opponent else d.challenger end,
    'my_points', case when d.challenger = auth.uid() then d.challenger_points else d.opponent_points end,
    'their_points', case when (case when d.challenger = auth.uid() then d.challenger_points else d.opponent_points end) is null then null
                         else case when d.challenger = auth.uid() then d.opponent_points else d.challenger_points end end
  ) order by d.created_at desc), '[]'::jsonb)
  from (select * from public.toneturn_duels x where auth.uid() in (x.challenger, x.opponent)
          and not public.toneturn_blocked_either(x.challenger, x.opponent)
        order by x.created_at desc limit 30) d
  left join public.toneturn_profiles p on p.id = case when d.challenger = auth.uid() then d.opponent else d.challenger end;
$$;

-- Rooms: a player can't join a room where someone blocked them (or whom they blocked) — it looks like "not found".
create or replace function public.toneturn_room_join(p_code text, p_nick text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.toneturn_rooms;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into r from public.toneturn_rooms x where x.code = upper(btrim(p_code)) and x.created_at > now() - interval '6 hours' for update;
  if r.id is null then raise exception 'room not found'; end if;
  if exists (select 1 from public.toneturn_room_players p where p.room_id = r.id and p.user_id = me) then
    update public.toneturn_room_players p set nickname = public.toneturn_clean_nick(p_nick) where p.room_id = r.id and p.user_id = me;
    return r.id;
  end if;
  if exists (select 1 from public.toneturn_room_players p where p.room_id = r.id and public.toneturn_blocked_either(me, p.user_id)) then
    raise exception 'room not found';
  end if;
  if r.state <> 'lobby' then raise exception 'game already started'; end if;
  if r.players >= 20 then raise exception 'room is full'; end if;
  insert into public.toneturn_room_players (room_id, user_id, nickname) values (r.id, me, public.toneturn_clean_nick(p_nick));
  update public.toneturn_rooms x set players = x.players + 1 where x.id = r.id;
  return r.id;
end $$;

-- ===================================================================== 2. push budget

create table if not exists public.toneturn_push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_day date not null,
  kind text not null default 'social' check (kind in ('social')),
  items int not null default 0,
  sent_at timestamptz not null default now(),
  primary key (user_id, local_day, kind)
);
alter table public.toneturn_push_log enable row level security;
drop policy if exists "push log: own read" on public.toneturn_push_log;
create policy "push log: own read" on public.toneturn_push_log for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.toneturn_push_log from anon;
revoke insert, update, delete, truncate on public.toneturn_push_log from authenticated;
grant select on public.toneturn_push_log to authenticated;

alter table public.toneturn_push_queue drop constraint if exists toneturn_push_queue_kind_check;
alter table public.toneturn_push_queue add constraint toneturn_push_queue_kind_check
  check (kind in ('duel_new', 'duel_done', 'nudge', 'cheer', 'friend_req', 'quest'));
create index if not exists toneturn_push_queue_user on public.toneturn_push_queue (user_id) where sent_at is null;

-- Social items join the queue (the budget decides when they go out).
create or replace function public.toneturn_social_enqueue()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'toneturn_nudges' then
    insert into public.toneturn_push_queue (user_id, kind, data) values (new.to_user, 'nudge', jsonb_build_object('from', public.toneturn_public_name(new.from_user)));
  elsif tg_table_name = 'toneturn_cheers' then
    insert into public.toneturn_push_queue (user_id, kind, data)
    select a.user_id, 'cheer', jsonb_build_object('from', public.toneturn_public_name(new.from_user)) from public.toneturn_activity a where a.id = new.activity_id;
  elsif tg_table_name = 'toneturn_friendships' then
    if new.status = 'pending' and coalesce(current_setting('toneturn.quiet_request', true), '') <> '1' then
      insert into public.toneturn_push_queue (user_id, kind, data) values (new.addressee, 'friend_req', jsonb_build_object('from', public.toneturn_public_name(new.requester)));
    end if;
  end if;
  return new;
exception when others then
  return new; -- a notification problem never blocks the action
end $$;
revoke execute on function public.toneturn_social_enqueue() from public, anon, authenticated;
drop trigger if exists toneturn_nudge_enqueue on public.toneturn_nudges;
create trigger toneturn_nudge_enqueue after insert on public.toneturn_nudges for each row execute function public.toneturn_social_enqueue();
drop trigger if exists toneturn_cheer_enqueue on public.toneturn_cheers;
create trigger toneturn_cheer_enqueue after insert on public.toneturn_cheers for each row execute function public.toneturn_social_enqueue();
drop trigger if exists toneturn_friend_req_enqueue on public.toneturn_friendships;
create trigger toneturn_friend_req_enqueue after insert on public.toneturn_friendships for each row execute function public.toneturn_social_enqueue();

-- The old per-item sender: every queued kind is social now, so it returns nothing (an edge function that was not
-- redeployed sends no social push rather than one per item).
create or replace function public.toneturn_push_queue_due()
returns table (queue_id bigint, kind text, data jsonb, sub_id bigint, endpoint text, p256dh text, auth text, lang text)
language sql stable security definer set search_path = '' as $$
  select q.id, q.kind, q.data, s.id, s.endpoint, s.p256dh, s.auth, s.lang
  from public.toneturn_push_queue q
  join public.toneturn_push_subscriptions s on s.user_id = q.user_id
  where q.sent_at is null and q.created_at > now() - interval '2 days'
    and q.kind not in ('duel_new', 'duel_done', 'nudge', 'cheer', 'friend_req', 'quest')
  order by q.id
  limit 500;
$$;
revoke execute on function public.toneturn_push_queue_due() from public, anon, authenticated;
grant execute on function public.toneturn_push_queue_due() to service_role;

-- For the edge function (service role): players with pending social items (last 36 h, their notification settings
-- respected), their time zone, quiet hours, the last day a social push went out, and their devices.
create or replace function public.toneturn_social_push_due()
returns table (user_id uuid, tz text, lang text, quiet_from int, quiet_to int, last_day date, items jsonb, subs jsonb)
language sql stable security definer set search_path = '' as $$
  with pending as (
    select q.user_id, jsonb_agg(jsonb_build_object('id', q.id, 'kind', q.kind, 'data', q.data, 'at', q.created_at) order by q.id) as items
    from public.toneturn_push_queue q
    where q.sent_at is null and q.created_at > now() - interval '36 hours'
      and public.toneturn_notify_on(q.user_id, case q.kind
        when 'nudge' then 'nudges' when 'friend_req' then 'requests' when 'duel_new' then 'challenges' when 'duel_done' then 'challenges'
        when 'quest' then 'duets' else 'cheers' end)
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

-- Claim today's social push for a player (false = one already went out today) and mark the merged items sent.
create or replace function public.toneturn_social_push_claim(p_user uuid, p_day date, p_ids bigint[])
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.toneturn_push_log (user_id, local_day, kind, items)
  values (p_user, p_day, 'social', coalesce(array_length(p_ids, 1), 0))
  on conflict do nothing;
  if not found then return false; end if;
  update public.toneturn_push_queue set sent_at = now() where user_id = p_user and id = any (p_ids) and sent_at is null;
  delete from public.toneturn_push_queue where created_at < now() - interval '7 days';
  delete from public.toneturn_push_log where local_day < current_date - 30;
  return true;
end $$;
revoke execute on function public.toneturn_social_push_claim(uuid, date, bigint[]) from public, anon, authenticated;
grant execute on function public.toneturn_social_push_claim(uuid, date, bigint[]) to service_role;

-- ===================================================================== 3. friends' activity & cheers

alter table public.toneturn_activity drop constraint if exists toneturn_activity_kind_check;
alter table public.toneturn_activity add constraint toneturn_activity_kind_check
  check (kind in ('unit', 'rank', 'badge', 'streak', 'duet', 'best', 'level', 'standard', 'quest'));

-- Post a measured milestone (the app posts automatically). Not for young players, not when "feed" is off; the same
-- milestone twice in 14 days returns the first post.
create or replace function public.toneturn_post_activity(p_kind text, p_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_id bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  if public.toneturn_is_young(me) then raise exception 'young player'; end if;
  if coalesce((select p.privacy ->> 'feed' from public.toneturn_profiles p where p.id = me), 'true') = 'false' then raise exception 'feed off'; end if;
  select a.id into v_id from public.toneturn_activity a
  where a.user_id = me and a.kind = p_kind and a.payload = p_payload and a.created_at > now() - interval '14 days' limit 1;
  if v_id is not null then return v_id; end if;
  if (select count(*) from public.toneturn_activity where user_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many posts today';
  end if;
  insert into public.toneturn_activity (user_id, kind, payload) values (me, p_kind, p_payload) returning toneturn_activity.id into v_id;
  return v_id;
end $$;

create or replace function public.toneturn_cheer(p_activity bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); owner uuid;
begin
  select user_id into owner from public.toneturn_activity where id = p_activity;
  if owner is null or me is null or owner = me then raise exception 'bad request'; end if;
  if public.toneturn_is_young(me) then raise exception 'young player'; end if;
  if not public.toneturn_are_friends(me, owner) or public.toneturn_blocked_either(me, owner) then raise exception 'not friends'; end if;
  insert into public.toneturn_cheers (activity_id, from_user) values (p_activity, me) on conflict do nothing;
end $$;

-- My friends' activity (last 14 days) with picture fields, cheer counts and whether I cheered. Nothing for young
-- players; posts of a player who turned "feed" off disappear.
drop function if exists public.toneturn_friends_activity();
create function public.toneturn_friends_activity()
returns table (id bigint, user_id uuid, nickname text, country text, avatar_icon text, avatar_color text, kind text, payload jsonb,
  created_at timestamptz, cheers int, mine boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.user_id, coalesce(nullif(p.nickname, ''), 'Player'), p.country, p.avatar_icon, p.avatar_color, a.kind, a.payload, a.created_at,
    (select count(*)::int from public.toneturn_cheers c where c.activity_id = a.id),
    exists (select 1 from public.toneturn_cheers c where c.activity_id = a.id and c.from_user = auth.uid())
  from public.toneturn_activity a
  join public.toneturn_profiles p on p.id = a.user_id
  where a.created_at > now() - interval '14 days'
    and not public.toneturn_is_young(auth.uid())
    and coalesce(p.privacy ->> 'feed', 'true') <> 'false'
    and (a.user_id = auth.uid() or (public.toneturn_are_friends(auth.uid(), a.user_id) and not public.toneturn_blocked_either(auth.uid(), a.user_id)))
  order by a.created_at desc
  limit 60;
$$;

-- ===================================================================== 4. quick messages (duels, rooms)

create table if not exists public.toneturn_quick_msgs (
  id bigint generated always as identity primary key,
  ctx text not null check (ctx in ('room', 'duel')),
  ctx_id uuid not null,
  from_user uuid not null references auth.users (id) on delete cascade,
  phrase text not null check (phrase in ('gl', 'nice', 'gg', 'rematch', 'wow', 'thanks', 'oops', 'close')),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists toneturn_quick_msgs_ctx on public.toneturn_quick_msgs (ctx, ctx_id, id);
alter table public.toneturn_quick_msgs enable row level security;
revoke all on public.toneturn_quick_msgs from anon, authenticated;

create or replace function public.toneturn_quick_member(p_ctx text, p_id uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_ctx
    when 'room' then exists (select 1 from public.toneturn_room_players p where p.room_id = p_id and p.user_id = p_user)
    when 'duel' then exists (select 1 from public.toneturn_duels d where d.id = p_id and p_user in (d.challenger, d.opponent))
    else false end;
$$;
revoke execute on function public.toneturn_quick_member(text, uuid, uuid) from public, anon, authenticated;

-- Send a preset phrase: members only, not young players, not when my own setting is "off"; one every 3 s, 30 per game.
create or replace function public.toneturn_quick_send(p_ctx text, p_id uuid, p_phrase text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v_id bigint;
begin
  if me is null then raise exception 'sign in first'; end if;
  if public.toneturn_is_young(me) then raise exception 'young player'; end if;
  if public.toneturn_privacy(me, 'quickMessages') = 'none' then raise exception 'quick messages off'; end if;
  if not public.toneturn_quick_member(p_ctx, p_id, me) then raise exception 'not a member'; end if;
  if exists (select 1 from public.toneturn_quick_msgs q where q.from_user = me and q.created_at > now() - interval '3 seconds') then
    raise exception 'slow down';
  end if;
  if (select count(*) from public.toneturn_quick_msgs q where q.ctx = p_ctx and q.ctx_id = p_id and q.from_user = me) >= 30 then
    raise exception 'slow down';
  end if;
  insert into public.toneturn_quick_msgs (ctx, ctx_id, from_user, phrase) values (p_ctx, p_id, me, p_phrase) returning toneturn_quick_msgs.id into v_id;
  return v_id;
end $$;

-- The messages I may see in a game: mine, plus those my "quick messages" setting allows (everyone / friends / off),
-- never across a block, never hidden ones; none at all for young players.
create or replace function public.toneturn_quick_list(p_ctx text, p_id uuid, p_after bigint default 0)
returns table (id bigint, from_user uuid, name text, phrase text, created_at timestamptz, mine boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  v text;
begin
  if me is null or public.toneturn_is_young(me) or not public.toneturn_quick_member(p_ctx, p_id, me) then return; end if;
  v := public.toneturn_privacy(me, 'quickMessages');
  return query
  select q.id, q.from_user,
    coalesce(nullif(pr.nickname, ''), (select rp.nickname from public.toneturn_room_players rp where p_ctx = 'room' and rp.room_id = p_id and rp.user_id = q.from_user), 'Player'),
    q.phrase, q.created_at, q.from_user = me
  from public.toneturn_quick_msgs q
  left join public.toneturn_profiles pr on pr.id = q.from_user
  where q.ctx = p_ctx and q.ctx_id = p_id and q.id > coalesce(p_after, 0) and not q.hidden
    and (q.from_user = me or (
      not public.toneturn_blocked_either(me, q.from_user)
      and (v = 'everyone' or (v = 'friends' and public.toneturn_are_friends(me, q.from_user)))))
  order by q.id desc
  limit 30;
end $$;

-- ===================================================================== 5. challenge links

create table if not exists public.toneturn_challenges (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  owner uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('beat', 'duel')),
  game text check (game is null or game ~ '^[a-z0-9-]{2,30}$'),
  tier int check (tier is null or tier between 0 and 7),
  seed bigint check (seed is null or seed between 0 and 4294967295),
  score int check (score is null or score between 0 and 10000000),
  duel_kind text check (duel_kind is null or duel_kind ~ '^[a-z-]{2,20}$'),
  keys text[] check (keys is null or array_length(keys, 1) between 1 and 10),
  uses int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create index if not exists toneturn_challenges_owner on public.toneturn_challenges (owner, created_at desc);
create table if not exists public.toneturn_challenge_uses (
  code text not null references public.toneturn_challenges (code) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  duel_id uuid references public.toneturn_duels (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.toneturn_challenges enable row level security;
alter table public.toneturn_challenge_uses enable row level security;
revoke all on public.toneturn_challenges, public.toneturn_challenge_uses from anon, authenticated;

-- Make a link code: "beat my score" (game + tier + seed + score) or a duel invite (the duel's kind, seed and key).
-- Not for young players (no external sharing). At most 20 a day.
create or replace function public.toneturn_challenge_create(p_kind text, p_game text default null, p_tier int default null, p_seed bigint default null,
  p_score int default null, p_duel_kind text default null, p_keys text[] default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  if me is null then raise exception 'sign in first'; end if;
  if public.toneturn_is_young(me) then raise exception 'young player'; end if;
  if p_kind not in ('beat', 'duel') then raise exception 'bad kind'; end if;
  if p_kind = 'duel' and (p_duel_kind is null or p_seed is null or coalesce(array_length(p_keys, 1), 0) = 0) then raise exception 'bad duel'; end if;
  if p_kind = 'beat' and p_game is null then raise exception 'bad game'; end if;
  if (select count(*) from public.toneturn_challenges x where x.owner = me and x.created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many links today';
  end if;
  delete from public.toneturn_challenges x where x.expires_at < now() - interval '7 days';
  loop
    c := '';
    for i in 1..8 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.toneturn_challenges x where x.code = c);
  end loop;
  insert into public.toneturn_challenges (code, owner, kind, game, tier, seed, score, duel_kind, keys)
  values (c, me, p_kind, p_game, p_tier, p_seed, p_score, case when p_kind = 'duel' then p_duel_kind end, case when p_kind = 'duel' then p_keys end);
  return c;
end $$;

-- Open a link (signed in): what it is and who sent it (nickname only). The sender becomes a friend request to me
-- (unless we are friends already, either of us blocked the other, or their requests are "no one"); a duel link
-- creates the duel (once per player). Unknown / expired / blocked → null.
create or replace function public.toneturn_challenge_open(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c public.toneturn_challenges;
  u public.toneturn_challenge_uses;
  rel text := 'none';
  v_duel uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into c from public.toneturn_challenges x where x.code = upper(btrim(p_code)) and x.expires_at > now();
  if c.code is null then return null; end if;
  if c.owner = me then
    return jsonb_build_object('kind', c.kind, 'game', c.game, 'tier', c.tier, 'seed', c.seed, 'score', c.score, 'from', public.toneturn_public_name(me), 'self', true);
  end if;
  if public.toneturn_blocked_either(me, c.owner) then return null; end if;
  select * into u from public.toneturn_challenge_uses x where x.code = c.code and x.user_id = me;
  if u.code is null then
    if c.uses >= 50 then return null; end if;
    update public.toneturn_challenges x set uses = x.uses + 1 where x.code = c.code;
    if c.kind = 'duel' then
      insert into public.toneturn_duels (challenger, opponent, kind, seed, rounds, keys)
      values (c.owner, me, c.duel_kind, c.seed, array_length(c.keys, 1), c.keys) returning id into v_duel;
    end if;
    insert into public.toneturn_challenge_uses (code, user_id, duel_id) values (c.code, me, v_duel);
  else
    v_duel := u.duel_id;
  end if;
  if public.toneturn_are_friends(me, c.owner) then
    rel := 'friends';
  elsif exists (select 1 from public.toneturn_friendships f where (f.requester = me and f.addressee = c.owner) or (f.requester = c.owner and f.addressee = me)) then
    rel := 'requested';
  elsif public.toneturn_privacy(c.owner, 'friendRequests') <> 'none' then
    perform set_config('toneturn.quiet_request', '1', true);
    insert into public.toneturn_friendships (requester, addressee) values (c.owner, me) on conflict do nothing;
    perform set_config('toneturn.quiet_request', '', true);
    rel := 'requested';
  end if;
  return jsonb_build_object('kind', c.kind, 'game', c.game, 'tier', c.tier, 'seed', c.seed, 'score', c.score,
    'from', public.toneturn_public_name(c.owner), 'from_id', c.owner, 'friend', rel, 'duel', v_duel, 'self', false);
end $$;

-- ===================================================================== 6. weekly friend quest, class board & goal

create table if not exists public.toneturn_friend_quests (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  week date not null,
  metric text not null check (metric in ('minutes', 'clean')),
  target int not null check (target between 10 and 10000),
  status text not null default 'pending' check (status in ('pending', 'active')),
  invited_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b, week),
  check (a < b)
);
alter table public.toneturn_friend_quests enable row level security;
revoke all on public.toneturn_friend_quests from anon, authenticated;

-- Invite a friend to this week's quest (one per player per week), accept, or leave / decline.
create or replace function public.toneturn_quest(p_friend uuid, p_action text, p_metric text default 'minutes')
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  lo uuid := least(me, p_friend);
  hi uuid := greatest(me, p_friend);
  wk date := date_trunc('week', now() at time zone 'utc')::date;
  q public.toneturn_friend_quests;
begin
  if me is null or p_friend is null or p_friend = me then raise exception 'bad request'; end if;
  select * into q from public.toneturn_friend_quests x where x.a = lo and x.b = hi and x.week = wk;
  if p_action = 'invite' then
    if not public.toneturn_are_friends(me, p_friend) or public.toneturn_blocked_either(me, p_friend) then raise exception 'not friends'; end if;
    if p_metric not in ('minutes', 'clean') then raise exception 'bad metric'; end if;
    if exists (select 1 from public.toneturn_friend_quests x where x.week = wk and (me in (x.a, x.b) or p_friend in (x.a, x.b))) then
      raise exception 'one quest a week';
    end if;
    insert into public.toneturn_friend_quests (a, b, week, metric, target, invited_by)
    values (lo, hi, wk, p_metric, case p_metric when 'clean' then 150 else 60 end, me);
    begin
      insert into public.toneturn_push_queue (user_id, kind, data) values (p_friend, 'quest', jsonb_build_object('from', public.toneturn_public_name(me)));
    exception when others then null;
    end;
  elsif p_action = 'accept' then
    if q.a is null or q.status <> 'pending' or q.invited_by = me then raise exception 'no invite'; end if;
    update public.toneturn_friend_quests x set status = 'active' where x.a = lo and x.b = hi and x.week = wk;
  elsif p_action in ('decline', 'end') then
    delete from public.toneturn_friend_quests x where x.a = lo and x.b = hi and x.week = wk;
  else
    raise exception 'bad action';
  end if;
end $$;

-- This week's quest for me (or null): the friend, goal, both measured contributions, when it ends.
create or replace function public.toneturn_quest_view()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  wk date := date_trunc('week', now() at time zone 'utc')::date;
  q public.toneturn_friend_quests;
  other uuid;
begin
  if me is null then return null; end if;
  select * into q from public.toneturn_friend_quests x where x.week = wk and me in (x.a, x.b) limit 1;
  if q.a is null then return null; end if;
  other := case when q.a = me then q.b else q.a end;
  if public.toneturn_blocked_either(me, other) or not public.toneturn_are_friends(me, other) then return null; end if;
  return jsonb_build_object('friend', other, 'name', public.toneturn_public_name(other), 'metric', q.metric, 'target', q.target,
    'status', q.status, 'invited_by_me', q.invited_by = me, 'week', wk, 'ends_at', (wk + 7)::timestamptz,
    'mine', public.toneturn_week_measure(me, wk, q.metric), 'theirs', public.toneturn_week_measure(other, wk, q.metric));
end $$;

alter table public.toneturn_classes add column if not exists board_hidden boolean not null default false;
create table if not exists public.toneturn_class_goals (
  class_id uuid not null references public.toneturn_classes (id) on delete cascade,
  week date not null,
  metric text not null check (metric in ('minutes', 'clean')),
  target int not null check (target between 10 and 100000),
  primary key (class_id, week)
);
alter table public.toneturn_class_goals enable row level security;
revoke all on public.toneturn_class_goals from anon, authenticated;

-- The class board this week (teacher and members): nickname (or "Player" for anonymous-on-boards players), measured
-- minutes, clean answers and practice days; the class goal (the latest one set) with the whole class's progress.
-- When the teacher hides the board, students see only their own row and the goal.
create or replace function public.toneturn_class_board(p_class uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c public.toneturn_classes;
  wk date := date_trunc('week', now() at time zone 'utc')::date;
  g public.toneturn_class_goals;
  teacher boolean;
begin
  select * into c from public.toneturn_classes x where x.id = p_class;
  if c.id is null or me is null then raise exception 'class not found'; end if;
  teacher := c.teacher = me;
  if not teacher and not exists (select 1 from public.toneturn_class_members m where m.class_id = p_class and m.user_id = me) then
    raise exception 'class not found';
  end if;
  select * into g from public.toneturn_class_goals x where x.class_id = p_class and x.week <= wk order by x.week desc limit 1;
  return jsonb_build_object(
    'hidden', c.board_hidden, 'teacher', teacher, 'week', wk, 'ends_at', (wk + 7)::timestamptz,
    'goal', case when g.class_id is null then null else jsonb_build_object('metric', g.metric, 'target', g.target,
      'progress', (select coalesce(sum(public.toneturn_week_measure(m.user_id, wk, g.metric)), 0) from public.toneturn_class_members m where m.class_id = p_class)) end,
    'rows', coalesce((
      select jsonb_agg(x order by (x ->> 'minutes')::int desc, x ->> 'name')
      from (
        select jsonb_build_object(
          'name', case when public.toneturn_privacy(m.user_id, 'onBoards') = 'anonymous' and m.user_id <> me then 'Player' else public.toneturn_public_name(m.user_id) end,
          'minutes', public.toneturn_week_measure(m.user_id, wk, 'minutes'),
          'clean', public.toneturn_week_measure(m.user_id, wk, 'clean'),
          'days', (select count(distinct (r.completed_at at time zone coalesce(pr.tz, 'UTC'))::date)::int from public.toneturn_lesson_results r
                   where r.user_id = m.user_id and r.completed_at >= wk::timestamptz and r.completed_at < (wk + 7)::timestamptz and r.lesson_id not like 'log:%'),
          'me', m.user_id = me) as x
        from public.toneturn_class_members m
        left join public.toneturn_profiles pr on pr.id = m.user_id
        where m.class_id = p_class and (teacher or not c.board_hidden or m.user_id = me)
      ) s), '[]'::jsonb)
  );
end $$;

-- Teacher: hide / show the board, set this week's class goal (target 0 removes the goal from this week on).
create or replace function public.toneturn_class_settings(p_class uuid, p_hidden boolean default null, p_metric text default null, p_target int default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  wk date := date_trunc('week', now() at time zone 'utc')::date;
begin
  if not exists (select 1 from public.toneturn_classes x where x.id = p_class and x.teacher = auth.uid()) then raise exception 'teachers only'; end if;
  if p_hidden is not null then update public.toneturn_classes x set board_hidden = p_hidden where x.id = p_class; end if;
  if p_target is not null then
    if p_target = 0 then
      -- The latest goal carries over week to week, so "no goal" removes them all.
      delete from public.toneturn_class_goals x where x.class_id = p_class;
    else
      if coalesce(p_metric, '') not in ('minutes', 'clean') then raise exception 'bad metric'; end if;
      insert into public.toneturn_class_goals (class_id, week, metric, target) values (p_class, wk, p_metric, greatest(10, least(100000, p_target)))
      on conflict (class_id, week) do update set metric = excluded.metric, target = excluded.target;
    end if;
  end if;
end $$;

-- ===================================================================== grants

revoke execute on function public.toneturn_report_v2(uuid, text, text, jsonb, boolean) from public, anon;
revoke execute on function public.toneturn_blocked_list() from public, anon;
revoke execute on function public.toneturn_reports_open() from public, anon;
revoke execute on function public.toneturn_report_resolve(bigint, text) from public, anon;
revoke execute on function public.toneturn_unban_nickname(text) from public, anon;
revoke execute on function public.toneturn_add_friend(text) from public, anon;
revoke execute on function public.toneturn_duel_create(uuid, text, bigint, text[]) from public, anon;
revoke execute on function public.toneturn_duels_mine() from public, anon;
revoke execute on function public.toneturn_room_join(text, text) from public, anon;
revoke execute on function public.toneturn_post_activity(text, jsonb) from public, anon;
revoke execute on function public.toneturn_cheer(bigint) from public, anon;
revoke execute on function public.toneturn_friends_activity() from public, anon;
revoke execute on function public.toneturn_quick_send(text, uuid, text) from public, anon;
revoke execute on function public.toneturn_quick_list(text, uuid, bigint) from public, anon;
revoke execute on function public.toneturn_challenge_create(text, text, int, bigint, int, text, text[]) from public, anon;
revoke execute on function public.toneturn_challenge_open(text) from public, anon;
revoke execute on function public.toneturn_quest(uuid, text, text) from public, anon;
revoke execute on function public.toneturn_quest_view() from public, anon;
revoke execute on function public.toneturn_class_board(uuid) from public, anon;
revoke execute on function public.toneturn_class_settings(uuid, boolean, text, int) from public, anon;
grant execute on function public.toneturn_report_v2(uuid, text, text, jsonb, boolean) to authenticated;
grant execute on function public.toneturn_blocked_list() to authenticated;
grant execute on function public.toneturn_reports_open() to authenticated;
grant execute on function public.toneturn_report_resolve(bigint, text) to authenticated;
grant execute on function public.toneturn_unban_nickname(text) to authenticated;
grant execute on function public.toneturn_add_friend(text) to authenticated;
grant execute on function public.toneturn_duel_create(uuid, text, bigint, text[]) to authenticated;
grant execute on function public.toneturn_duels_mine() to authenticated;
grant execute on function public.toneturn_room_join(text, text) to authenticated;
grant execute on function public.toneturn_post_activity(text, jsonb) to authenticated;
grant execute on function public.toneturn_cheer(bigint) to authenticated;
grant execute on function public.toneturn_friends_activity() to authenticated;
grant execute on function public.toneturn_quick_send(text, uuid, text) to authenticated;
grant execute on function public.toneturn_quick_list(text, uuid, bigint) to authenticated;
grant execute on function public.toneturn_challenge_create(text, text, int, bigint, int, text, text[]) to authenticated;
grant execute on function public.toneturn_challenge_open(text) to authenticated;
grant execute on function public.toneturn_quest(uuid, text, text) to authenticated;
grant execute on function public.toneturn_quest_view() to authenticated;
grant execute on function public.toneturn_class_board(uuid) to authenticated;
grant execute on function public.toneturn_class_settings(uuid, boolean, text, int) to authenticated;
