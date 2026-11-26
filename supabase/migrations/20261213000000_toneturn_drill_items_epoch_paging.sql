-- SPEC-CLIMB-SYNC §5, review 2:
--   - a push from an OLDER epoch (a cached old build after a fresh start) never replaces a newer-epoch row; a newer epoch
--     replaces an older one; the same epoch needs `base` (unchanged). Epochs are ISO dates, so text order is time order.
--   - the player's rows of older epochs are deleted on a put of a newer epoch; the 5000-row limit counts this epoch only.
--   - the pull pages: rows after a (updated_at, item_id) cursor, at most p_limit (≤ 1000) per call.
-- Replaces both functions (new signatures for the get). Safe to re-run.

drop function if exists public.toneturn_drill_items_put(text, jsonb);
drop function if exists public.toneturn_drill_items_get(text, timestamptz);
drop function if exists public.toneturn_drill_items_get(text, timestamptz, text, int);

create or replace function public.toneturn_drill_items_put(p_epoch text, p_items jsonb)
returns table (item_id text, updated_at timestamptz) language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_epoch is null or length(p_epoch) > 40 then raise exception 'bad epoch'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 300 then raise exception 'too many items'; end if;
  delete from toneturn_drill_items d where d.user_id = auth.uid() and d.epoch < p_epoch;
  if (select count(*) from toneturn_drill_items d where d.user_id = auth.uid() and d.epoch = p_epoch) > 5000 then raise exception 'too many rows'; end if;
  return query
    with x as (
      select distinct on (e ->> 'id') e ->> 'id' as id, e -> 'state' as st, nullif(e ->> 'base', '')::timestamptz as base
      from jsonb_array_elements(p_items) as e
      where jsonb_typeof(e -> 'state') = 'object'
        and length(coalesce(e ->> 'id', '')) between 1 and 200
        and pg_column_size(e -> 'state') <= 32768
    ), up as (
      insert into toneturn_drill_items as t (user_id, item_id, epoch, state, updated_at)
      select auth.uid(), x.id, p_epoch, x.st, clock_timestamp() from x
      on conflict (user_id, item_id) do update set epoch = excluded.epoch, state = excluded.state, updated_at = excluded.updated_at
        where t.epoch < excluded.epoch
           or (t.epoch = excluded.epoch
               and t.updated_at <= coalesce((select x2.base from x as x2 where x2.id = t.item_id), '-infinity'::timestamptz))
      returning t.item_id, t.updated_at
    )
    select up.item_id, up.updated_at from up;
end $$;

-- The player's rows of this epoch after a cursor: updated after p_since, or at p_since with a larger item id.
create or replace function public.toneturn_drill_items_get(p_epoch text, p_since timestamptz, p_after text default null, p_limit int default 500)
returns table (item_id text, state jsonb, updated_at timestamptz) language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  return query
    select d.item_id, d.state, d.updated_at from toneturn_drill_items d
    where d.user_id = auth.uid() and d.epoch = p_epoch
      and (p_since is null
           or d.updated_at > p_since
           or (p_after is not null and d.updated_at = p_since and d.item_id > p_after))
    order by d.updated_at, d.item_id
    limit greatest(1, least(coalesce(p_limit, 500), 1000));
end $$;

revoke all on function public.toneturn_drill_items_put(text, jsonb) from public, anon;
revoke all on function public.toneturn_drill_items_get(text, timestamptz, text, int) from public, anon;
grant execute on function public.toneturn_drill_items_put(text, jsonb) to authenticated;
grant execute on function public.toneturn_drill_items_get(text, timestamptz, text, int) to authenticated;
