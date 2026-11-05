-- ToneTurn / Ninth Sense 0.27 — live rooms for every game (spec R, "Kahoot-style").
--  * More room kinds: modes by ear, spot the wrong note, true-or-false, Echo Chain / Beat Echo elimination
--    rounds, and vocal holds ("who holds steadiest").
--  * A per-room answer window (memory and vocal rounds need longer than 10 s).
--  * Big-screen mode: the host device only shows the question, plays the sound and the leaderboard; it is a
--    spectator (not counted, cannot answer). Players answer on their phones.
--  * Vocal holds are measured on the singer's device; the answer carries the score ("v:<0..100>") and the
--    server turns it into points (no speed bonus — steadiness is the point).

alter table public.toneturn_rooms drop constraint if exists toneturn_rooms_kind_check;
alter table public.toneturn_rooms add constraint toneturn_rooms_kind_check
  check (kind in ('mixed', 'degrees', 'chords', 'intervals', 'modes', 'wrong-notes', 'truefalse', 'echo', 'beat', 'vocal-hold'));
alter table public.toneturn_rooms drop constraint if exists toneturn_rooms_window_ms_check;
alter table public.toneturn_rooms add constraint toneturn_rooms_window_ms_check check (window_ms between 3000 and 60000);
alter table public.toneturn_rooms add column if not exists host_screen boolean not null default false;
alter table public.toneturn_room_players add column if not exists spectator boolean not null default false;

create or replace function public.toneturn_room_create_v2(p_kind text, p_rounds int, p_seed bigint, p_keys text[], p_nick text, p_window_ms int, p_host_screen boolean)
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
  delete from public.toneturn_rooms x where x.created_at < now() - interval '1 day';
  insert into public.toneturn_rooms (code, host, kind, rounds, seed, players, window_ms, host_screen)
  values (public.toneturn_room_code(), me, p_kind, p_rounds, p_seed, case when p_host_screen then 0 else 1 end,
          greatest(3000, least(60000, coalesce(p_window_ms, 10000))), coalesce(p_host_screen, false))
  returning * into r;
  insert into public.toneturn_room_keys (room_id, round, answer)
  select r.id, k.ord - 1, k.a from unnest(p_keys) with ordinality as k(a, ord);
  insert into public.toneturn_room_players (room_id, user_id, nickname, spectator)
  values (r.id, me, public.toneturn_clean_nick(p_nick), coalesce(p_host_screen, false));
  return query select r.id, r.code;
end $$;

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
    'host_screen', r.host_screen,
    'me', me,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id, 'nickname', p.nickname, 'spectator', p.spectator,
        'rating', (select pr.rating from public.toneturn_profiles pr where pr.id = p.user_id),
        'rating_provisional', (select pr.rating_provisional from public.toneturn_profiles pr where pr.id = p.user_id),
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
  vs int;
begin
  if not public.toneturn_is_room_member(p_room) then raise exception 'not in this room'; end if;
  if exists (select 1 from public.toneturn_room_players p where p.room_id = p_room and p.user_id = me and p.spectator) then return; end if;
  select * into r from public.toneturn_rooms x where x.id = p_room for update;
  if not r.round_open or r.round <> p_round then return; end if;
  if exists (select 1 from public.toneturn_room_answers a where a.room_id = p_room and a.round = p_round and a.user_id = me) then return; end if;
  select answer into k from public.toneturn_room_keys where room_id = p_room and round = p_round;
  if r.kind = 'vocal-hold' then
    -- "v:<score 0..100>" measured on the singer's device; a pass is 60 or more.
    vs := case when p_answer ~ '^v:[0-9]{1,3}$' then least(100, substring(p_answer from 3)::int) else null end;
    ok := vs is not null and vs >= 60
          and p_time_ms is not null and p_time_ms between 150 and r.window_ms
          and now() <= r.round_started_at + make_interval(secs => (r.window_ms + 18000) / 1000.0);
    pts := case when vs is not null and p_time_ms between 150 and r.window_ms then vs * 10 else 0 end;
  else
    ok := p_answer is not null and p_answer = k
          and p_time_ms is not null and p_time_ms between 150 and r.window_ms
          and now() <= r.round_started_at + make_interval(secs => (r.window_ms + 18000) / 1000.0);
    if ok then
      while streak < p_round and exists (
        select 1 from public.toneturn_room_answers a
        where a.room_id = p_room and a.user_id = me and a.round = p_round - streak - 1 and a.correct
      ) loop
        streak := streak + 1;
      end loop;
      f := greatest(0, least(1, 1 - p_time_ms::numeric / r.window_ms));
      pts := round(1000 * (0.5 + 0.5 * f) * least(1.5, 1 + 0.1 * streak));
    end if;
  end if;
  insert into public.toneturn_room_answers (room_id, round, user_id, answer, time_ms, correct, points)
  values (p_room, p_round, me, left(p_answer, 40), p_time_ms, ok, pts);
  update public.toneturn_rooms x set answered = x.answered + 1 where x.id = p_room;
  if r.answered + 1 >= r.players then
    update public.toneturn_rooms x
    set round_open = false, round_closed_at = now(), state = case when p_round >= r.rounds - 1 then 'over' else 'playing' end
    where x.id = p_room;
  end if;
end $$;

revoke execute on function public.toneturn_room_create_v2(text, int, bigint, text[], text, int, boolean) from public, anon;
grant execute on function public.toneturn_room_create_v2(text, int, bigint, text[], text, int, boolean) to authenticated;
