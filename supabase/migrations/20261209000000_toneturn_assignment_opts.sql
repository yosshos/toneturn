-- SPEC-PATH-TODAY-PRACTICE §5.2 (owner 2026-11-22): an assignment's extra options — the channel the teacher requires
-- (free / from the page / by ear / from memory), minutes a day, and what happens when today's window is short (spread
-- until the due date / all today). A side table keyed by the assignment, so the existing assignment functions stay as
-- they are. All access through security-definer functions; no grants. Additive; safe to re-run. NOT APPLIED — dry-run.

create table if not exists public.toneturn_assignment_opts (
  assignment_id uuid primary key references public.toneturn_class_assignments (id) on delete cascade,
  channel text not null default 'free' check (channel in ('free', 'page', 'ear', 'memory')),
  minutes int check (minutes is null or minutes between 1 and 180),
  if_short text not null default 'spread' check (if_short in ('spread', 'today'))
);
alter table public.toneturn_assignment_opts enable row level security;
revoke all on public.toneturn_assignment_opts from anon, authenticated;

-- The teacher sets an assignment's options (their own class only).
create or replace function public.toneturn_assignment_set_opts(p_assignment uuid, p_channel text, p_minutes int, p_if_short text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.toneturn_class_assignments a join public.toneturn_classes c on c.id = a.class_id
                 where a.id = p_assignment and c.teacher = (select auth.uid())) then raise exception 'not your assignment'; end if;
  insert into public.toneturn_assignment_opts (assignment_id, channel, minutes, if_short)
  values (p_assignment, coalesce(nullif(p_channel, ''), 'free'), p_minutes, coalesce(nullif(p_if_short, ''), 'spread'))
  on conflict (assignment_id) do update set channel = excluded.channel, minutes = excluded.minutes, if_short = excluded.if_short;
end $$;

-- Read the options of assignments the caller teaches or is a member of.
create or replace function public.toneturn_assignment_opts_for(p_ids uuid[])
returns table (assignment_id uuid, channel text, minutes int, if_short text) language sql stable security definer set search_path = '' as $$
  select o.assignment_id, o.channel, o.minutes, o.if_short
  from public.toneturn_assignment_opts o
  join public.toneturn_class_assignments a on a.id = o.assignment_id
  join public.toneturn_classes c on c.id = a.class_id
  where o.assignment_id = any (p_ids)
    and (c.teacher = (select auth.uid())
         or exists (select 1 from public.toneturn_class_members m where m.class_id = c.id and m.user_id = (select auth.uid())));
$$;

revoke execute on function public.toneturn_assignment_set_opts(uuid, text, int, text) from public, anon;
revoke execute on function public.toneturn_assignment_opts_for(uuid[]) from public, anon;
grant execute on function public.toneturn_assignment_set_opts(uuid, text, int, text) to authenticated;
grant execute on function public.toneturn_assignment_opts_for(uuid[]) to authenticated;
