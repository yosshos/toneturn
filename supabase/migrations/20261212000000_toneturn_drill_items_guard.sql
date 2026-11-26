-- SPEC-CLIMB-SYNC §3.1 (review 1): a push never overwrites a row the device hasn't seen. Each item carries `base`, the
-- row's updated_at as this device last saw it (null: never seen). The row is written only when it is absent, belongs to
-- an older epoch, or is not newer than `base`; the accepted rows come back with their new updated_at, and the client
-- pulls and merges the rest before pushing again. At most 5000 rows per player. Replaces toneturn_drill_items_put
-- from 20261211000000 (its return type changes). Safe to re-run.

drop function if exists public.toneturn_drill_items_put(text, jsonb);

create or replace function public.toneturn_drill_items_put(p_epoch text, p_items jsonb)
returns table (item_id text, updated_at timestamptz) language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_epoch is null or length(p_epoch) > 40 then raise exception 'bad epoch'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 300 then raise exception 'too many items'; end if;
  if (select count(*) from toneturn_drill_items d where d.user_id = auth.uid()) > 5000 then raise exception 'too many rows'; end if;
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
        where t.epoch <> excluded.epoch
           or t.updated_at <= coalesce((select x2.base from x as x2 where x2.id = t.item_id), '-infinity'::timestamptz)
      returning t.item_id, t.updated_at
    )
    select up.item_id, up.updated_at from up;
end $$;

revoke all on function public.toneturn_drill_items_put(text, jsonb) from public, anon;
grant execute on function public.toneturn_drill_items_put(text, jsonb) to authenticated;
