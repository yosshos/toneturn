-- ToneTurn: teacher / class mode. A teacher creates a class with a join code; students join explicitly
-- (and can leave). The teacher sees a roster (lessons done, week XP, streak, per-skill first-try
-- accuracy over 30 days, last active) and assigns lessons with a due date; students see assignments.
-- All access goes through security-definer functions; the tables have no grants.
-- Run after 20261113000000_toneturn_lesson_ids.sql. Safe to re-run.

create table if not exists public.toneturn_classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  teacher uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.toneturn_class_members (
  class_id uuid not null references public.toneturn_classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create table if not exists public.toneturn_class_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.toneturn_classes (id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(lesson_id) <= 40),
  due_on date,
  created_at timestamptz not null default now()
);

alter table public.toneturn_classes enable row level security;
alter table public.toneturn_class_members enable row level security;
alter table public.toneturn_class_assignments enable row level security;
revoke all on public.toneturn_classes, public.toneturn_class_members, public.toneturn_class_assignments from anon, authenticated;

create or replace function public.toneturn_class_create(p_name text)
returns table (id uuid, code text) language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  c text;
  r public.toneturn_classes;
begin
  if me is null then raise exception 'sign in first'; end if;
  if (select count(*) from public.toneturn_classes x where x.teacher = me) >= 20 then raise exception 'too many classes'; end if;
  loop
    c := public.toneturn_room_code();
    exit when not exists (select 1 from public.toneturn_classes x where x.code = c);
  end loop;
  insert into public.toneturn_classes (code, teacher, name)
  values (c, me, coalesce(nullif(left(regexp_replace(btrim(coalesce(p_name, '')), '[[:cntrl:]]', '', 'g'), 40), ''), 'Class'))
  returning * into r;
  return query select r.id, r.code;
end $$;

create or replace function public.toneturn_class_join(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.toneturn_classes;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into r from public.toneturn_classes x where x.code = upper(btrim(p_code));
  if r.id is null then raise exception 'class not found'; end if;
  if r.teacher = me then return r.id; end if;
  if (select count(*) from public.toneturn_class_members m where m.class_id = r.id) >= 200 then raise exception 'class is full'; end if;
  insert into public.toneturn_class_members (class_id, user_id) values (r.id, me) on conflict do nothing;
  return r.id;
end $$;

create or replace function public.toneturn_class_leave(p_class uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.toneturn_class_members m where m.class_id = p_class and m.user_id = (select auth.uid());
$$;

/** Teacher: delete a class (members and assignments go with it). */
create or replace function public.toneturn_class_delete(p_class uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.toneturn_classes c where c.id = p_class and c.teacher = (select auth.uid());
$$;

create or replace function public.toneturn_class_assign(p_class uuid, p_lesson text, p_due date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  aid uuid;
begin
  if not exists (select 1 from public.toneturn_classes c where c.id = p_class and c.teacher = me) then raise exception 'not your class'; end if;
  if (select count(*) from public.toneturn_class_assignments a where a.class_id = p_class) >= 100 then raise exception 'too many assignments'; end if;
  insert into public.toneturn_class_assignments (class_id, lesson_id, due_on) values (p_class, p_lesson, p_due) returning id into aid;
  return aid;
end $$;

create or replace function public.toneturn_class_unassign(p_assignment uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.toneturn_class_assignments a
  where a.id = p_assignment and exists (select 1 from public.toneturn_classes c where c.id = a.class_id and c.teacher = (select auth.uid()));
$$;

/** Everything the signed-in user sees: classes they teach (with roster and assignments) and classes they are in. */
create or replace function public.toneturn_my_classes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'sign in first'; end if;
  return jsonb_build_object(
    'teaching', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'code', c.code, 'name', c.name,
        'assignments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'lesson_id', a.lesson_id, 'due_on', a.due_on, 'created_at', a.created_at,
            'done', (select count(*) from public.toneturn_class_members m
                     where m.class_id = c.id and exists (select 1 from public.toneturn_lesson_results x
                       where x.user_id = m.user_id and x.lesson_id = a.lesson_id and x.completed_at >= a.created_at))
          ) order by a.created_at desc)
          from public.toneturn_class_assignments a where a.class_id = c.id), '[]'::jsonb),
        'students', coalesce((
          select jsonb_agg(jsonb_build_object(
            'user_id', m.user_id,
            'name', coalesce(nullif(p.display_name, ''), 'Student'),
            'lessons_done', (select count(distinct x.lesson_id) from public.toneturn_lesson_results x
                             where x.user_id = m.user_id and x.lesson_id not in ('placement', 'review', 'weekly-puzzle', 'runs-workshop')),
            'week_xp', coalesce((select sum(x.xp) from public.toneturn_lesson_results x where x.user_id = m.user_id and x.completed_at >= now() - interval '7 days'), 0),
            'streak', public.toneturn_streak(m.user_id, coalesce(p.tz, 'UTC')),
            'last_active', (select max(x.completed_at) from public.toneturn_lesson_results x where x.user_id = m.user_id),
            'skills', coalesce((
              select jsonb_object_agg(s.skill, jsonb_build_object('n', s.n, 'correct', s.correct))
              from (
                select it->>'skill' as skill, count(*) as n, count(*) filter (where (it->>'correct')::boolean) as correct
                from public.toneturn_lesson_results x, jsonb_array_elements(coalesce(x.items, '[]'::jsonb)) it
                where x.user_id = m.user_id and x.completed_at >= now() - interval '30 days' and it ? 'skill'
                group by it->>'skill'
              ) s), '{}'::jsonb)
          ) order by p.display_name nulls last)
          from public.toneturn_class_members m left join public.toneturn_profiles p on p.id = m.user_id
          where m.class_id = c.id), '[]'::jsonb)
      ) order by c.created_at)
      from public.toneturn_classes c where c.teacher = me), '[]'::jsonb),
    'member_of', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name,
        'teacher', coalesce(nullif(tp.display_name, ''), 'Teacher'),
        'assignments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'lesson_id', a.lesson_id, 'due_on', a.due_on, 'created_at', a.created_at,
            'done', exists (select 1 from public.toneturn_lesson_results x where x.user_id = me and x.lesson_id = a.lesson_id and x.completed_at >= a.created_at)
          ) order by a.due_on nulls last, a.created_at)
          from public.toneturn_class_assignments a where a.class_id = c.id), '[]'::jsonb)
      ) order by m.joined_at)
      from public.toneturn_class_members m
      join public.toneturn_classes c on c.id = m.class_id
      left join public.toneturn_profiles tp on tp.id = c.teacher
      where m.user_id = me), '[]'::jsonb)
  );
end $$;

revoke execute on function public.toneturn_class_create(text) from public, anon;
revoke execute on function public.toneturn_class_join(text) from public, anon;
revoke execute on function public.toneturn_class_leave(uuid) from public, anon;
revoke execute on function public.toneturn_class_delete(uuid) from public, anon;
revoke execute on function public.toneturn_class_assign(uuid, text, date) from public, anon;
revoke execute on function public.toneturn_class_unassign(uuid) from public, anon;
revoke execute on function public.toneturn_my_classes() from public, anon;
grant execute on function public.toneturn_class_create(text) to authenticated;
grant execute on function public.toneturn_class_join(text) to authenticated;
grant execute on function public.toneturn_class_leave(uuid) to authenticated;
grant execute on function public.toneturn_class_delete(uuid) to authenticated;
grant execute on function public.toneturn_class_assign(uuid, text, date) to authenticated;
grant execute on function public.toneturn_class_unassign(uuid) to authenticated;
grant execute on function public.toneturn_my_classes() to authenticated;
