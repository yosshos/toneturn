-- SPEC-CLIMB-SYNC §3 (owner 2026-11-26): the drill items (tempi, stages, history, ceilings) sync across the player's
-- devices. One row per item; the client merges (src/storage/drillMerge.ts). All access goes through security-definer
-- functions; the table has no grants. The epoch is the client's PROGRESS_EPOCH: a fresh start never brings old items
-- back. Additive; safe to re-run.

create table if not exists public.toneturn_drill_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null check (length(item_id) between 1 and 200),
  epoch text not null check (length(epoch) <= 40),
  state jsonb not null check (pg_column_size(state) <= 32768),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists toneturn_drill_items_since on public.toneturn_drill_items (user_id, epoch, updated_at);
alter table public.toneturn_drill_items enable row level security;
revoke all on public.toneturn_drill_items from anon, authenticated;

-- The player writes their own items: an array of up to 300 {id, state}; a row over the size limit is skipped.
create or replace function public.toneturn_drill_items_put(p_epoch text, p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_epoch is null or length(p_epoch) > 40 then raise exception 'bad epoch'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 300 then raise exception 'too many items'; end if;
  insert into toneturn_drill_items (user_id, item_id, epoch, state, updated_at)
  select auth.uid(), x ->> 'id', p_epoch, x -> 'state', now()
  from jsonb_array_elements(p_items) as x
  where jsonb_typeof(x -> 'state') = 'object'
    and length(coalesce(x ->> 'id', '')) between 1 and 200
    and pg_column_size(x -> 'state') <= 32768
  on conflict (user_id, item_id) do update set epoch = excluded.epoch, state = excluded.state, updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;

-- The player reads their own items of this epoch changed after a moment.
create or replace function public.toneturn_drill_items_get(p_epoch text, p_since timestamptz)
returns table (item_id text, state jsonb, updated_at timestamptz) language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  return query
    select d.item_id, d.state, d.updated_at from toneturn_drill_items d
    where d.user_id = auth.uid() and d.epoch = p_epoch and d.updated_at > coalesce(p_since, '-infinity'::timestamptz)
    order by d.updated_at;
end $$;

revoke all on function public.toneturn_drill_items_put(text, jsonb) from public, anon;
revoke all on function public.toneturn_drill_items_get(text, timestamptz) from public, anon;
grant execute on function public.toneturn_drill_items_put(text, jsonb) to authenticated;
grant execute on function public.toneturn_drill_items_get(text, timestamptz) to authenticated;
