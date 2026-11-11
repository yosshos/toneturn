-- ToneTurn / The 7th Sense — Groove-off: drum duels (docs/research/DRUMS_NICHE_PLAN.md §3, P2).
-- APPLIED 2026-11-11 (dry run first). The client also works without it: creating a 'groove'
-- duel fails on the kind check and the Groove-off screen falls back to a local challenge code.
--
-- A groove duel is an ordinary friend duel with kind 'groove'. Its keys are round markers ('r1' … 'r3'); a player's
-- answers are the measured points of each round (0 … 130, the client's drum analysis — the same trust as the game
-- boards), and the points are their sum. The tier rides in the seed as for every duel (gameTiers.tierSeed).
-- Safe to re-run.

alter table public.toneturn_duels drop constraint if exists toneturn_duels_kind_check;
alter table public.toneturn_duels add constraint toneturn_duels_kind_check
  check (kind in ('mixed', 'degrees', 'chords', 'intervals', 'modes', 'wrong-notes', 'truefalse', 'beat', 'jazz', 'groove'));

-- Measured points of a groove duel: each round's answer is its points, clamped to 0 … 130; anything else counts 0.
create or replace function public.toneturn_groove_points(p_answers text[])
returns int language plpgsql immutable set search_path = '' as $$
declare
  pts int := 0;
begin
  for i in 1 .. least(3, coalesce(array_length(p_answers, 1), 0)) loop
    if p_answers[i] ~ '^[0-9]{1,3}$' then
      pts := pts + least(130, greatest(0, p_answers[i]::int));
    end if;
  end loop;
  return pts;
end $$;
revoke execute on function public.toneturn_groove_points(text[]) from public, anon, authenticated;

create or replace function public.toneturn_duel_submit(p_id uuid, p_answers text[], p_times int[])
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  d public.toneturn_duels;
  pts int;
begin
  select * into d from public.toneturn_duels x where x.id = p_id for update;
  if d.id is null or me not in (d.challenger, d.opponent) then raise exception 'not your duel'; end if;
  pts := case when d.kind = 'groove' then public.toneturn_groove_points(p_answers) else public.toneturn_duel_points(d.keys, p_answers, p_times) end;
  if me = d.challenger and d.challenger_points is null then
    update public.toneturn_duels x set challenger_answers = p_answers, challenger_times = p_times, challenger_points = pts where x.id = p_id;
  elsif me = d.opponent and d.opponent_points is null then
    update public.toneturn_duels x set opponent_answers = p_answers, opponent_times = p_times, opponent_points = pts where x.id = p_id;
  else
    return null; -- already played
  end if;
  return pts;
end $$;
revoke execute on function public.toneturn_duel_submit(uuid, text[], int[]) from public, anon;
grant execute on function public.toneturn_duel_submit(uuid, text[], int[]) to authenticated;
