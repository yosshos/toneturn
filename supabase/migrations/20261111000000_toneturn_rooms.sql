-- ToneTurn: online tournament rooms (spec addendum I).
-- Same item for every player at the same moment. The server holds the answer key, grades answers,
-- checks plausibility and computes points (spec J tournament points). Clients only see results of
-- closed rounds. Realtime: members receive UPDATEs of their room row (state, round, answered count).
-- Run after 20261110000000_toneturn_rhythm_lessons.sql. Safe to re-run.

create table if not exists public.toneturn_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('mixed', 'degrees', 'chords', 'intervals')),
  rounds int not null check (rounds between 3 and 20),
  seed bigint not null check (seed between 0 and 4294967295),
  window_ms int not null default 10000 check (window_ms between 3000 and 30000),
  state text not null default 'lobby' check (state in ('lobby', 'playing', 'over')),
  round int not null default -1,
  round_open boolean not null default false,
  round_started_at timestamptz,
  round_closed_at timestamptz,
  answered int not null default 0,
  players int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists toneturn_rooms_created on public.toneturn_rooms (created_at);

-- Answer key: no grants, no policies — readable only by the functions below.
create table if not exists public.toneturn_room_keys (
  room_id uuid not null references public.toneturn_rooms (id) on delete cascade,
  round int not null,
  answer text not null,
  primary key (room_id, round)
);

create table if not exists public.toneturn_room_players (
  room_id uuid not null references public.toneturn_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 16),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.toneturn_room_answers (
  room_id uuid not null references public.toneturn_rooms (id) on delete cascade,
  round int not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  answer text,
  time_ms int,
  correct boolean not null,
  points int not null,
  answered_at timestamptz not null default now(),
  primary key (room_id, round, user_id)
);

alter table public.toneturn_rooms enable row level security;
alter table public.toneturn_room_keys enable row level security;
alter table public.toneturn_room_players enable row level security;
alter table public.toneturn_room_answers enable row level security;

create or replace function public.toneturn_is_room_member(p_room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.toneturn_room_players p where p.room_id = p_room and p.user_id = (select auth.uid()));
$$;

-- Members may read their room row (needed for Realtime postgres_changes). Everything else goes through functions.
drop policy if exists "rooms: members read" on public.toneturn_rooms;
create policy "rooms: members read" on public.toneturn_rooms for select to authenticated using (public.toneturn_is_room_member(id));
revoke all on public.toneturn_rooms, public.toneturn_room_keys, public.toneturn_room_players, public.toneturn_room_answers from anon, authenticated;
grant select on public.toneturn_rooms to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'toneturn_rooms') then
    alter publication supabase_realtime add table public.toneturn_rooms;
  end if;
end $$;

-- ---------------------------------------------------------------- functions

create or replace function public.toneturn_room_code()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.toneturn_rooms r where r.code = c);
  end loop;
  return c;
end $$;

create or replace function public.toneturn_clean_nick(p_nick text)
returns text language sql immutable set search_path = '' as $$
  select coalesce(nullif(left(regexp_replace(btrim(coalesce(p_nick, '')), '[[:cntrl:]]', '', 'g'), 16), ''), 'Player');
$$;

-- Host creates a room; the client generated the item set from (kind, rounds, seed) and sends only the answers.
create or replace function public.toneturn_room_create(p_kind text, p_rounds int, p_seed bigint, p_keys text[], p_nick text)
returns table (id uuid, code text) language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.toneturn_rooms;
begin
  if me is null then raise exception 'sign in first'; end if;
  if coalesce(array_length(p_keys, 1), 0) <> p_rounds then raise exception 'answer key does not match rounds'; end if;
  if (select count(*) from public.toneturn_rooms x where x.host = me and x.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too many rooms';
  end if;
  -- Old rooms are not needed after a day.
  delete from public.toneturn_rooms x where x.created_at < now() - interval '1 day';
  insert into public.toneturn_rooms (code, host, kind, rounds, seed, players)
  values (public.toneturn_room_code(), me, p_kind, p_rounds, p_seed, 1) returning * into r;
  insert into public.toneturn_room_keys (room_id, round, answer)
  select r.id, k.ord - 1, k.a from unnest(p_keys) with ordinality as k(a, ord);
  insert into public.toneturn_room_players (room_id, user_id, nickname) values (r.id, me, public.toneturn_clean_nick(p_nick));
  return query select r.id, r.code;
end $$;

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
  if r.state <> 'lobby' then raise exception 'game already started'; end if;
  if r.players >= 20 then raise exception 'room is full'; end if;
  insert into public.toneturn_room_players (room_id, user_id, nickname) values (r.id, me, public.toneturn_clean_nick(p_nick));
  update public.toneturn_rooms x set players = x.players + 1 where x.id = r.id;
  return r.id;
end $$;

-- Room snapshot for a member: room, players with totals, and results of closed rounds (with the key).
create or replace function public.toneturn_room_state(p_room uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.toneturn_rooms;
  closed_upto int;
begin
  if not public.toneturn_is_room_member(p_room) then raise exception 'not in this room'; end if;
  select * into r from public.toneturn_rooms x where x.id = p_room;
  closed_upto := case when r.round_open then r.round - 1 else r.round end;
  return jsonb_build_object(
    'id', r.id, 'code', r.code, 'host', r.host, 'kind', r.kind, 'rounds', r.rounds, 'seed', r.seed,
    'window_ms', r.window_ms, 'state', r.state, 'round', r.round, 'round_open', r.round_open,
    'answered', r.answered, 'server_now', now(), 'round_started_at', r.round_started_at, 'round_closed_at', r.round_closed_at,
    'me', me,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id, 'nickname', p.nickname,
        'answered', exists (select 1 from public.toneturn_room_answers a where a.room_id = p_room and a.user_id = p.user_id and a.round = r.round)
      ) order by p.joined_at)
      from public.toneturn_room_players p where p.room_id = p_room), '[]'::jsonb),
    'results', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', k.round, 'key', k.answer,
        'answers', coalesce((
          select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'answer', a.answer, 'time_ms', a.time_ms, 'correct', a.correct, 'points', a.points))
          from public.toneturn_room_answers a where a.room_id = p_room and a.round = k.round), '[]'::jsonb)
      ) order by k.round)
      from public.toneturn_room_keys k where k.room_id = p_room and k.round <= closed_upto), '[]'::jsonb)
  );
end $$;

-- Host opens the next round (any member may if the host has been silent for 20 s after a closed round).
create or replace function public.toneturn_room_start_round(p_room uuid, p_round int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.toneturn_rooms;
begin
  if not public.toneturn_is_room_member(p_room) then raise exception 'not in this room'; end if;
  select * into r from public.toneturn_rooms x where x.id = p_room for update;
  if r.round_open or p_round <> r.round + 1 or p_round >= r.rounds or r.state = 'over' then return; end if; -- already started / stale: idempotent
  if me <> r.host and (r.round_closed_at is null or r.round_closed_at > now() - interval '20 seconds') then raise exception 'only the host can start'; end if;
  update public.toneturn_rooms x
  set state = 'playing', round = p_round, round_open = true, round_started_at = now(), round_closed_at = null, answered = 0
  where x.id = p_room;
end $$;

create or replace function public.toneturn_room_close(p_room uuid, p_round int, p_force boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.toneturn_rooms;
begin
  if not public.toneturn_is_room_member(p_room) then raise exception 'not in this room'; end if;
  select * into r from public.toneturn_rooms x where x.id = p_room for update;
  if not r.round_open or r.round <> p_round then return; end if;
  -- Normal close: everyone answered. Forced close: host after its window, or anyone well after the deadline.
  if r.answered < r.players then
    if not p_force then return; end if;
    if me <> r.host and r.round_started_at > now() - make_interval(secs => (r.window_ms + 25000) / 1000.0) then return; end if;
    if me = r.host and r.round_started_at > now() - make_interval(secs => (r.window_ms) / 1000.0) then return; end if;
  end if;
  update public.toneturn_rooms x
  set round_open = false, round_closed_at = now(), state = case when p_round >= r.rounds - 1 then 'over' else 'playing' end
  where x.id = p_room;
end $$;

-- One answer per player per round; graded here. time_ms is measured on the device from the end of its playback.
create or replace function public.toneturn_room_answer(p_room uuid, p_round int, p_answer text, p_time_ms int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.toneturn_rooms;
  k text;
  ok boolean;
  streak int := 0;
  pts int := 0;
  f numeric;
begin
  if not public.toneturn_is_room_member(p_room) then raise exception 'not in this room'; end if;
  select * into r from public.toneturn_rooms x where x.id = p_room for update;
  if not r.round_open or r.round <> p_round then return; end if; -- too late: no answer
  if exists (select 1 from public.toneturn_room_answers a where a.room_id = p_room and a.round = p_round and a.user_id = me) then return; end if;
  select answer into k from public.toneturn_room_keys where room_id = p_room and round = p_round;
  -- Plausibility: human reaction (>= 150 ms) inside the window; and not later than the round could last on any device
  -- (3 s countdown + up to 10 s of sound + window + 5 s slack).
  ok := p_answer is not null and p_answer = k
        and p_time_ms is not null and p_time_ms between 150 and r.window_ms
        and now() <= r.round_started_at + make_interval(secs => (r.window_ms + 18000) / 1000.0);
  if ok then
    -- Consecutive correct rounds right before this one; a miss or a missing answer breaks it.
    while streak < p_round and exists (
      select 1 from public.toneturn_room_answers a
      where a.room_id = p_room and a.user_id = me and a.round = p_round - streak - 1 and a.correct
    ) loop
      streak := streak + 1;
    end loop;
    f := greatest(0, least(1, 1 - p_time_ms::numeric / r.window_ms));
    pts := round(1000 * (0.5 + 0.5 * f) * least(1.5, 1 + 0.1 * streak));
  end if;
  insert into public.toneturn_room_answers (room_id, round, user_id, answer, time_ms, correct, points)
  values (p_room, p_round, me, left(p_answer, 32), p_time_ms, ok, pts);
  update public.toneturn_rooms x set answered = x.answered + 1 where x.id = p_room;
  if r.answered + 1 >= r.players then
    update public.toneturn_rooms x
    set round_open = false, round_closed_at = now(), state = case when p_round >= r.rounds - 1 then 'over' else 'playing' end
    where x.id = p_room;
  end if;
end $$;

revoke execute on function public.toneturn_is_room_member(uuid) from public, anon;
revoke execute on function public.toneturn_room_code() from public, anon, authenticated;
revoke execute on function public.toneturn_clean_nick(text) from public, anon, authenticated;
revoke execute on function public.toneturn_room_create(text, int, bigint, text[], text) from public, anon;
revoke execute on function public.toneturn_room_join(text, text) from public, anon;
revoke execute on function public.toneturn_room_state(uuid) from public, anon;
revoke execute on function public.toneturn_room_start_round(uuid, int) from public, anon;
revoke execute on function public.toneturn_room_close(uuid, int, boolean) from public, anon;
revoke execute on function public.toneturn_room_answer(uuid, int, text, int) from public, anon;
grant execute on function public.toneturn_is_room_member(uuid) to authenticated;
grant execute on function public.toneturn_room_create(text, int, bigint, text[], text) to authenticated;
grant execute on function public.toneturn_room_join(text, text) to authenticated;
grant execute on function public.toneturn_room_state(uuid) to authenticated;
grant execute on function public.toneturn_room_start_round(uuid, int) to authenticated;
grant execute on function public.toneturn_room_close(uuid, int, boolean) to authenticated;
grant execute on function public.toneturn_room_answer(uuid, int, text, int) to authenticated;
