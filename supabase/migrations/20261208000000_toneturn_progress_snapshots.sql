-- SPEC-PROGRESS-CHARTS §1, §4, §6 (owner 2026-11-22): the daily progress summary syncs so a teacher can chart their
-- students over time; the teacher may show students an anonymous class median (a switch, default off).
-- Only the summary (the snapshot JSON, a few KB) — never takes or recordings. All access goes through
-- security-definer functions; the table has no grants. Additive; safe to re-run. NOT APPLIED — dry-run first.

create table if not exists public.toneturn_progress_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  data jsonb not null check (pg_column_size(data) <= 16384),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.toneturn_progress_snapshots enable row level security;
revoke all on public.toneturn_progress_snapshots from anon, authenticated;

alter table public.toneturn_classes add column if not exists show_median boolean not null default false;

-- The player writes their own day (and keeps about 400 days).
create or replace function public.toneturn_snapshot_put(p_day date, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_day > current_date + 1 or p_day < current_date - 400 then raise exception 'bad day'; end if;
  insert into toneturn_progress_snapshots (user_id, day, data, updated_at)
  values (auth.uid(), p_day, p_data, now())
  on conflict (user_id, day) do update set data = excluded.data, updated_at = now();
  delete from toneturn_progress_snapshots where user_id = auth.uid() and day < current_date - 400;
end $$;

-- The teacher reads the snapshots of their class's members from a day on.
create or replace function public.toneturn_class_snapshots(p_class uuid, p_from date)
returns table (user_id uuid, day date, data jsonb) language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from toneturn_classes c where c.id = p_class and c.teacher = auth.uid()) then raise exception 'not your class'; end if;
  return query
    select s.user_id, s.day, s.data from toneturn_progress_snapshots s
    join toneturn_class_members m on m.user_id = s.user_id and m.class_id = p_class
    where s.day >= greatest(p_from, current_date - 400)
    order by s.user_id, s.day;
end $$;

-- The teacher's switch: show students the anonymous class median.
create or replace function public.toneturn_class_set_median(p_class uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update toneturn_classes set show_median = p_on where id = p_class and teacher = auth.uid();
  if not found then raise exception 'not your class'; end if;
end $$;

-- A member reads the class median per day (tempo index = the mean of a snapshot's tempo values; minutes = their sum),
-- only when the teacher turned it on; never names, never a single student's numbers (needs 3 or more students).
create or replace function public.toneturn_class_median(p_class uuid, p_from date)
returns table (day date, tempo real, minutes real, n int) language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from toneturn_classes c join toneturn_class_members m on m.class_id = c.id
                 where c.id = p_class and c.show_median and m.user_id = auth.uid()) then raise exception 'not available'; end if;
  return query
    with per as (
      select s.day, s.user_id,
             (select avg(v::text::real) from jsonb_each(s.data -> 'tempo') as t(k, v)) as tempo,
             (select coalesce(sum(v::text::real), 0) from jsonb_each(s.data -> 'minutes') as t(k, v)) as minutes
      from toneturn_progress_snapshots s
      join toneturn_class_members m on m.user_id = s.user_id and m.class_id = p_class
      where s.day >= greatest(p_from, current_date - 400)
    )
    select per.day,
           (percentile_cont(0.5) within group (order by per.tempo))::real,
           (percentile_cont(0.5) within group (order by per.minutes))::real,
           count(*)::int
    from per group by per.day having count(*) >= 3 order by per.day;
end $$;

revoke execute on function public.toneturn_snapshot_put(date, jsonb) from public, anon;
revoke execute on function public.toneturn_class_snapshots(uuid, date) from public, anon;
revoke execute on function public.toneturn_class_set_median(uuid, boolean) from public, anon;
revoke execute on function public.toneturn_class_median(uuid, date) from public, anon;
grant execute on function public.toneturn_snapshot_put(date, jsonb) to authenticated;
grant execute on function public.toneturn_class_snapshots(uuid, date) to authenticated;
grant execute on function public.toneturn_class_set_median(uuid, boolean) to authenticated;
grant execute on function public.toneturn_class_median(uuid, date) to authenticated;

-- The teacher reads the switch (the class settings show its state).
create or replace function public.toneturn_class_median_on(p_class uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select show_median from toneturn_classes where id = p_class and teacher = auth.uid()), false);
$$;
revoke execute on function public.toneturn_class_median_on(uuid) from public, anon;
grant execute on function public.toneturn_class_median_on(uuid) to authenticated;
