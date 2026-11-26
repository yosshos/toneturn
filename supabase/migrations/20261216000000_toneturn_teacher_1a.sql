-- ToneTurn: teacher environment, phase 1a (docs/SPEC-TEACHER-CLASS.he.md §4.1, §7; owner approved 2026-11-26). Safe to re-run.
--  · a class has a kind: 'studio' (private students, strangers to each other: no peer layer) or 'group'
--  · toneturn_teacher_students: one row per teacher and student (the name the student chose for the teacher, the
--    lesson day, status, the teacher's private note). Filled from class membership by a trigger.
--  · an assignment can be for one student (student_id), can be edited (updated_at) and archived (archived_at);
--    the 100 cap counts only assignments that are not archived
--  · joining needs a year of birth (owner Q6: no unknown age inside a class); the name for the teacher is asked then
--  · join codes can be replaced and can expire (a group code after 14 days by default, a studio code never)
--  · the class board is hidden by default (owner Q8), and always in a studio

alter table public.toneturn_classes add column if not exists kind text not null default 'group';
alter table public.toneturn_classes drop constraint if exists toneturn_classes_kind_check;
alter table public.toneturn_classes add constraint toneturn_classes_kind_check check (kind in ('studio', 'group'));
alter table public.toneturn_classes add column if not exists code_expires_at timestamptz;
alter table public.toneturn_classes alter column board_hidden set default true;
update public.toneturn_classes set board_hidden = true where board_hidden = false;

alter table public.toneturn_class_assignments add column if not exists student_id uuid references auth.users (id) on delete cascade;
alter table public.toneturn_class_assignments add column if not exists updated_at timestamptz;
alter table public.toneturn_class_assignments add column if not exists archived_at timestamptz;
create index if not exists toneturn_class_assignments_student on public.toneturn_class_assignments (student_id) where student_id is not null;

create table if not exists public.toneturn_teacher_students (
  teacher uuid not null references auth.users (id) on delete cascade,
  student uuid not null references auth.users (id) on delete cascade,
  name text check (char_length(name) <= 40),
  lesson_dow smallint check (lesson_dow between 0 and 6),
  status text not null default 'active' check (status in ('active', 'paused', 'left')),
  private_note text check (char_length(private_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (teacher, student)
);
alter table public.toneturn_teacher_students enable row level security;
revoke all on public.toneturn_teacher_students from public, anon, authenticated;

create or replace function public.toneturn_enroll_on_join()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.toneturn_teacher_students (teacher, student)
  select c.teacher, new.user_id from public.toneturn_classes c where c.id = new.class_id and c.teacher <> new.user_id
  on conflict (teacher, student) do update set status = 'active', updated_at = now()
    where public.toneturn_teacher_students.status = 'left';
  return null;
end $$;
drop trigger if exists toneturn_enroll_on_join on public.toneturn_class_members;
create trigger toneturn_enroll_on_join after insert on public.toneturn_class_members for each row execute function public.toneturn_enroll_on_join();

create or replace function public.toneturn_enroll_on_leave()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
begin
  select c.teacher into t from public.toneturn_classes c where c.id = old.class_id;
  if t is null then return null; end if;
  if not exists (select 1 from public.toneturn_class_members m join public.toneturn_classes c on c.id = m.class_id
                 where c.teacher = t and m.user_id = old.user_id) then
    update public.toneturn_teacher_students set status = 'left', updated_at = now() where teacher = t and student = old.user_id;
  end if;
  return null;
end $$;
drop trigger if exists toneturn_enroll_on_leave on public.toneturn_class_members;
create trigger toneturn_enroll_on_leave after delete on public.toneturn_class_members for each row execute function public.toneturn_enroll_on_leave();

insert into public.toneturn_teacher_students (teacher, student)
select distinct c.teacher, m.user_id from public.toneturn_class_members m join public.toneturn_classes c on c.id = m.class_id
where c.teacher <> m.user_id
on conflict do nothing;

-- the name a teacher sees: the one the student chose for the teacher, else the account name
create or replace function public.toneturn_student_name(p_teacher uuid, p_student uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select nullif(e.name, '') from public.toneturn_teacher_students e where e.teacher = p_teacher and e.student = p_student),
    (select nullif(p.display_name, '') from public.toneturn_profiles p where p.id = p_student),
    'Student');
$$;
revoke execute on function public.toneturn_student_name(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- create, join, codes

drop function if exists public.toneturn_class_create(text);
create or replace function public.toneturn_class_create(p_name text, p_kind text default 'group')
returns table (id uuid, code text) language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  k text := case when p_kind = 'studio' then 'studio' else 'group' end;
  c text;
  r public.toneturn_classes;
begin
  if me is null then raise exception 'sign in first'; end if;
  if (select count(*) from public.toneturn_classes x where x.teacher = me) >= 20 then raise exception 'too many classes'; end if;
  if k = 'studio' and exists (select 1 from public.toneturn_classes x where x.teacher = me and x.kind = 'studio') then raise exception 'one studio'; end if;
  loop
    c := public.toneturn_room_code();
    exit when not exists (select 1 from public.toneturn_classes x where x.code = c);
  end loop;
  insert into public.toneturn_classes (code, teacher, name, kind, board_hidden, code_expires_at)
  values (c, me, coalesce(nullif(left(regexp_replace(btrim(coalesce(p_name, '')), '[[:cntrl:]]', '', 'g'), 40), ''), case when k = 'studio' then 'Studio' else 'Class' end),
          k, true, case when k = 'group' then now() + interval '14 days' end)
  returning * into r;
  return query select r.id, r.code;
end $$;
revoke execute on function public.toneturn_class_create(text, text) from public, anon;
grant execute on function public.toneturn_class_create(text, text) to authenticated;

drop function if exists public.toneturn_class_join(text);
create or replace function public.toneturn_class_join(p_code text, p_name text default null, p_birth_year int default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  r public.toneturn_classes;
  v_by int;
  nm text := nullif(left(regexp_replace(btrim(coalesce(p_name, '')), '[[:cntrl:]]', '', 'g'), 40), '');
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into r from public.toneturn_classes x where x.code = upper(btrim(p_code));
  if r.id is null then raise exception 'class not found'; end if;
  if r.teacher = me then return r.id; end if;
  if exists (select 1 from public.toneturn_class_members m where m.class_id = r.id and m.user_id = me) then
    if nm is not null then update public.toneturn_teacher_students set name = nm, updated_at = now() where teacher = r.teacher and student = me; end if;
    return r.id;
  end if;
  if r.code_expires_at is not null and r.code_expires_at < now() then raise exception 'code expired'; end if;
  select p.birth_year into v_by from public.toneturn_profiles p where p.id = me;
  if v_by is null then
    if p_birth_year is null or p_birth_year < 1900 or p_birth_year > extract(year from now())::int then raise exception 'birth year needed'; end if;
    update public.toneturn_profiles set birth_year = p_birth_year where id = me;
  end if;
  if (select count(*) from public.toneturn_class_members m where m.class_id = r.id) >= 200 then raise exception 'class is full'; end if;
  insert into public.toneturn_class_members (class_id, user_id) values (r.id, me) on conflict do nothing;
  if nm is not null then update public.toneturn_teacher_students set name = nm, updated_at = now() where teacher = r.teacher and student = me; end if;
  return r.id;
end $$;
revoke execute on function public.toneturn_class_join(text, text, int) from public, anon;
grant execute on function public.toneturn_class_join(text, text, int) to authenticated;

-- a new code; p_expires: false = never expires, true = 14 days, null = by kind (group 14 days, studio never)
create or replace function public.toneturn_class_new_code(p_class uuid, p_expires boolean default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  k text;
  c text;
begin
  select x.kind into k from public.toneturn_classes x where x.id = p_class and x.teacher = me;
  if k is null then raise exception 'not your class'; end if;
  loop
    c := public.toneturn_room_code();
    exit when not exists (select 1 from public.toneturn_classes x where x.code = c);
  end loop;
  update public.toneturn_classes set code = c,
    code_expires_at = case when coalesce(p_expires, k = 'group') then now() + interval '14 days' end
  where id = p_class;
  return c;
end $$;
revoke execute on function public.toneturn_class_new_code(uuid, boolean) from public, anon;
grant execute on function public.toneturn_class_new_code(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------- the teacher's own row per student

create or replace function public.toneturn_teacher_set_student(p_student uuid, p_dow int default null, p_note text default null, p_status text default null, p_clear_dow boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  update public.toneturn_teacher_students e set
    lesson_dow = case when p_clear_dow then null when p_dow between 0 and 6 then p_dow else e.lesson_dow end,
    private_note = case when p_note is null then e.private_note else nullif(left(btrim(p_note), 2000), '') end,
    status = case when p_status in ('active', 'paused') then p_status else e.status end,
    updated_at = now()
  where e.teacher = me and e.student = p_student;
  if not found then raise exception 'not your student'; end if;
end $$;
revoke execute on function public.toneturn_teacher_set_student(uuid, int, text, text, boolean) from public, anon;
grant execute on function public.toneturn_teacher_set_student(uuid, int, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------- assignments

drop function if exists public.toneturn_class_assign_item(uuid, text, text, text, date, text, integer, text);
create or replace function public.toneturn_class_assign_item(p_class uuid, p_kind text, p_lesson text, p_ref text, p_due date, p_strict text, p_bpm integer, p_note text, p_student uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  aid uuid;
  lid text := case when p_kind = 'lesson' then p_lesson else p_kind end;
begin
  if not exists (select 1 from public.toneturn_classes c where c.id = p_class and c.teacher = me) then raise exception 'not your class'; end if;
  if p_student is not null and not exists (select 1 from public.toneturn_class_members m where m.class_id = p_class and m.user_id = p_student) then
    raise exception 'not in this class';
  end if;
  if (select count(*) from public.toneturn_class_assignments a where a.class_id = p_class and a.archived_at is null) >= 100 then raise exception 'too many assignments'; end if;
  insert into public.toneturn_class_assignments (class_id, lesson_id, due_on, kind, ref, strictness, target_bpm, note, student_id)
  values (p_class, lid, p_due, p_kind, nullif(p_ref, ''), coalesce(nullif(p_strict, ''), 'moderate'), p_bpm,
          nullif(left(regexp_replace(btrim(coalesce(p_note, '')), '[[:cntrl:]]', '', 'g'), 300), ''), p_student)
  returning id into aid;
  return aid;
end $$;
revoke execute on function public.toneturn_class_assign_item(uuid, text, text, text, date, text, integer, text, uuid) from public, anon;
grant execute on function public.toneturn_class_assign_item(uuid, text, text, text, date, text, integer, text, uuid) to authenticated;

-- edit everything but the kind (and the class / student); the student sees "updated"; no new push
create or replace function public.toneturn_class_assign_update(p_assignment uuid, p_ref text, p_due date, p_strict text, p_bpm integer, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.toneturn_class_assignments a set
    ref = case when p_ref is null then a.ref else nullif(p_ref, '') end,
    lesson_id = case when a.kind = 'lesson' and p_ref is not null and nullif(p_ref, '') is not null then p_ref else a.lesson_id end,
    due_on = p_due,
    strictness = coalesce(nullif(p_strict, ''), a.strictness),
    target_bpm = p_bpm,
    note = nullif(left(regexp_replace(btrim(coalesce(p_note, '')), '[[:cntrl:]]', '', 'g'), 300), ''),
    updated_at = now()
  where a.id = p_assignment and exists (select 1 from public.toneturn_classes c where c.id = a.class_id and c.teacher = (select auth.uid()));
  if not found then raise exception 'not your assignment'; end if;
end $$;
revoke execute on function public.toneturn_class_assign_update(uuid, text, date, text, integer, text) from public, anon;
grant execute on function public.toneturn_class_assign_update(uuid, text, date, text, integer, text) to authenticated;

create or replace function public.toneturn_class_archive(p_assignment uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.toneturn_class_assignments a set archived_at = case when p_on then now() end
  where a.id = p_assignment and exists (select 1 from public.toneturn_classes c where c.id = a.class_id and c.teacher = (select auth.uid()));
  if not found then raise exception 'not your assignment'; end if;
end $$;
revoke execute on function public.toneturn_class_archive(uuid, boolean) from public, anon;
grant execute on function public.toneturn_class_archive(uuid, boolean) to authenticated;

create or replace function public.toneturn_class_submit(p_assignment uuid, p_score real, p_minutes integer, p_metrics jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  sid uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  if not exists (
    select 1 from public.toneturn_class_assignments a join public.toneturn_class_members m on m.class_id = a.class_id
    where a.id = p_assignment and m.user_id = me and (a.student_id is null or a.student_id = me)) then raise exception 'not your assignment'; end if;
  if (select count(*) from public.toneturn_class_submissions s where s.assignment_id = p_assignment and s.user_id = me) >= 50 then
    raise exception 'too many submissions';
  end if;
  insert into public.toneturn_class_submissions (assignment_id, user_id, score, minutes, metrics)
  values (p_assignment, me, greatest(0, least(1, p_score)), greatest(0, least(600, coalesce(p_minutes, 0))), coalesce(p_metrics, '{}'::jsonb))
  returning id into sid;
  return sid;
end $$;

create or replace function public.toneturn_assignment_opts_for(p_ids uuid[])
returns table (assignment_id uuid, channel text, minutes integer, if_short text)
language sql stable security definer set search_path = '' as $$
  select o.assignment_id, o.channel, o.minutes, o.if_short
  from public.toneturn_assignment_opts o
  join public.toneturn_class_assignments a on a.id = o.assignment_id
  join public.toneturn_classes c on c.id = a.class_id
  where o.assignment_id = any (p_ids)
    and (c.teacher = (select auth.uid())
         or ((a.student_id is null or a.student_id = (select auth.uid()))
             and exists (select 1 from public.toneturn_class_members m where m.class_id = c.id and m.user_id = (select auth.uid()))));
$$;

create or replace function public.toneturn_my_assignments()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'sign in first'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'class', c.name, 'class_id', c.id, 'kind', a.kind, 'lesson_id', a.lesson_id, 'ref', a.ref, 'due_on', a.due_on,
      'strictness', a.strictness, 'target_bpm', a.target_bpm, 'note', a.note, 'created_at', a.created_at,
      'updated_at', a.updated_at, 'personal', a.student_id is not null,
      'submissions', coalesce((
        select jsonb_agg(jsonb_build_object('id', s.id, 'created_at', s.created_at, 'score', s.score, 'comment', s.comment, 'mark', s.mark) order by s.created_at desc)
        from public.toneturn_class_submissions s where s.assignment_id = a.id and s.user_id = me), '[]'::jsonb)
    ) order by a.due_on nulls last, a.created_at)
    from public.toneturn_class_assignments a
    join public.toneturn_classes c on c.id = a.class_id
    join public.toneturn_class_members m on m.class_id = c.id and m.user_id = me
    where a.archived_at is null and (a.student_id is null or a.student_id = me)), '[]'::jsonb);
end $$;

create or replace function public.toneturn_class_detail(p_class uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if not exists (select 1 from public.toneturn_classes c where c.id = p_class and c.teacher = me) then raise exception 'not your class'; end if;
  return jsonb_build_object(
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'kind', a.kind, 'lesson_id', a.lesson_id, 'ref', a.ref, 'due_on', a.due_on, 'strictness', a.strictness,
        'target_bpm', a.target_bpm, 'note', a.note, 'created_at', a.created_at, 'updated_at', a.updated_at,
        'archived_at', a.archived_at, 'student_id', a.student_id,
        'submissions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', s.id, 'user_id', s.user_id, 'name', public.toneturn_student_name(me, s.user_id), 'created_at', s.created_at,
            'score', s.score, 'minutes', s.minutes, 'metrics', s.metrics, 'comment', s.comment, 'mark', s.mark
          ) order by s.created_at desc)
          from public.toneturn_class_submissions s
          where s.assignment_id = a.id), '[]'::jsonb)
      ) order by a.created_at desc)
      from public.toneturn_class_assignments a where a.class_id = p_class), '[]'::jsonb),
    'minutes', coalesce((
      select jsonb_object_agg(x.user_id, x.m) from (
        select s.user_id, sum(s.minutes) as m from public.toneturn_class_submissions s
        join public.toneturn_class_assignments a on a.id = s.assignment_id
        where a.class_id = p_class and s.created_at >= now() - interval '7 days' group by s.user_id) x), '{}'::jsonb),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'name', public.toneturn_student_name(me, m.user_id),
        'lesson_dow', e.lesson_dow, 'status', coalesce(e.status, 'active'), 'private_note', e.private_note,
        'young', (p.birth_year is null or public.toneturn_is_young(m.user_id))
      ) order by public.toneturn_student_name(me, m.user_id))
      from public.toneturn_class_members m
      left join public.toneturn_teacher_students e on e.teacher = me and e.student = m.user_id
      left join public.toneturn_profiles p on p.id = m.user_id
      where m.class_id = p_class), '[]'::jsonb)
  );
end $$;

create or replace function public.toneturn_my_classes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'sign in first'; end if;
  return jsonb_build_object(
    'teaching', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'code', c.code, 'name', c.name, 'kind', c.kind, 'code_expires_at', c.code_expires_at,
        'assignments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'lesson_id', a.lesson_id, 'due_on', a.due_on, 'created_at', a.created_at, 'student_id', a.student_id,
            'done', (select count(*) from public.toneturn_class_members m
                     where m.class_id = c.id and (a.student_id is null or a.student_id = m.user_id)
                       and exists (select 1 from public.toneturn_lesson_results x
                       where x.user_id = m.user_id and x.lesson_id = a.lesson_id and x.completed_at >= a.created_at))
          ) order by a.created_at desc)
          from public.toneturn_class_assignments a where a.class_id = c.id and a.archived_at is null), '[]'::jsonb),
        'students', coalesce((
          select jsonb_agg(jsonb_build_object(
            'user_id', m.user_id,
            'name', public.toneturn_student_name(me, m.user_id),
            'rating', p.rating, 'rating_provisional', p.rating_provisional,
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
          ) order by public.toneturn_student_name(me, m.user_id))
          from public.toneturn_class_members m left join public.toneturn_profiles p on p.id = m.user_id
          where m.class_id = c.id), '[]'::jsonb)
      ) order by c.created_at)
      from public.toneturn_classes c where c.teacher = me), '[]'::jsonb),
    'member_of', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'kind', c.kind,
        'teacher', coalesce(nullif(tp.display_name, ''), 'Teacher'),
        'assignments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'lesson_id', a.lesson_id, 'due_on', a.due_on, 'created_at', a.created_at,
            'done', exists (select 1 from public.toneturn_lesson_results x where x.user_id = me and x.lesson_id = a.lesson_id and x.completed_at >= a.created_at)
          ) order by a.due_on nulls last, a.created_at)
          from public.toneturn_class_assignments a
          where a.class_id = c.id and a.archived_at is null and (a.student_id is null or a.student_id = me)), '[]'::jsonb)
      ) order by m.joined_at)
      from public.toneturn_class_members m
      join public.toneturn_classes c on c.id = m.class_id
      left join public.toneturn_profiles tp on tp.id = c.teacher
      where m.user_id = me), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------- the board: never peers in a studio

create or replace function public.toneturn_class_board(p_class uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c public.toneturn_classes;
  wk date := date_trunc('week', now() at time zone 'utc')::date;
  g public.toneturn_class_goals;
  teacher boolean;
  hid boolean;
begin
  select * into c from public.toneturn_classes x where x.id = p_class;
  if c.id is null or me is null then raise exception 'class not found'; end if;
  teacher := c.teacher = me;
  if not teacher and not exists (select 1 from public.toneturn_class_members m where m.class_id = p_class and m.user_id = me) then
    raise exception 'class not found';
  end if;
  hid := c.board_hidden or c.kind = 'studio';
  select * into g from public.toneturn_class_goals x where x.class_id = p_class and x.week <= wk order by x.week desc limit 1;
  return jsonb_build_object(
    'hidden', hid, 'teacher', teacher, 'kind', c.kind, 'week', wk, 'ends_at', (wk + 7)::timestamptz,
    'goal', case when g.class_id is null or (c.kind = 'studio' and not teacher) then null else jsonb_build_object('metric', g.metric, 'target', g.target,
      'progress', (select coalesce(sum(public.toneturn_week_measure(m.user_id, wk, g.metric)), 0) from public.toneturn_class_members m where m.class_id = p_class)) end,
    'rows', coalesce((
      select jsonb_agg(x order by (x ->> 'minutes')::int desc, x ->> 'name')
      from (
        select jsonb_build_object(
          'name', case when teacher then public.toneturn_student_name(me, m.user_id)
                       when public.toneturn_privacy(m.user_id, 'onBoards') = 'anonymous' and m.user_id <> me then 'Player' else public.toneturn_public_name(m.user_id) end,
          'minutes', public.toneturn_week_measure(m.user_id, wk, 'minutes'),
          'clean', public.toneturn_week_measure(m.user_id, wk, 'clean'),
          'days', (select count(distinct (r.completed_at at time zone coalesce(pr.tz, 'UTC'))::date)::int from public.toneturn_lesson_results r
                   where r.user_id = m.user_id and r.completed_at >= wk::timestamptz and r.completed_at < (wk + 7)::timestamptz and r.lesson_id not like 'log:%'),
          'me', m.user_id = me) as x
        from public.toneturn_class_members m
        left join public.toneturn_profiles pr on pr.id = m.user_id
        where m.class_id = p_class and (teacher or not hid or m.user_id = me)
      ) s), '[]'::jsonb)
  );
end $$;

create or replace function public.toneturn_class_set_median(p_class uuid, p_on boolean)
returns void language plpgsql security definer set search_path = 'public' as $$
begin
  update toneturn_classes set show_median = p_on and kind = 'group' where id = p_class and teacher = auth.uid();
  if not found then raise exception 'not your class'; end if;
end $$;

create or replace function public.toneturn_class_settings(p_class uuid, p_hidden boolean default null, p_metric text default null, p_target integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  wk date := date_trunc('week', now() at time zone 'utc')::date;
  k text;
begin
  select x.kind into k from public.toneturn_classes x where x.id = p_class and x.teacher = auth.uid();
  if k is null then raise exception 'teachers only'; end if;
  if p_hidden is not null then update public.toneturn_classes x set board_hidden = p_hidden or k = 'studio' where x.id = p_class; end if;
  if p_target is not null then
    if p_target = 0 then
      delete from public.toneturn_class_goals x where x.class_id = p_class;
    else
      if coalesce(p_metric, '') not in ('minutes', 'clean') then raise exception 'bad metric'; end if;
      insert into public.toneturn_class_goals (class_id, week, metric, target) values (p_class, wk, p_metric, greatest(10, least(100000, p_target)))
      on conflict (class_id, week) do update set metric = excluded.metric, target = excluded.target;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------- pushes follow the assignment's audience

create or replace function public.toneturn_class_push_on_assign()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.toneturn_class_push_queue (user_id, role, kind, class_id, assignment_id)
  select m.user_id, 'student', 'assign', new.class_id, new.id
  from public.toneturn_class_members m
  join public.toneturn_classes c on c.id = m.class_id
  where m.class_id = new.class_id and m.user_id <> c.teacher and (new.student_id is null or m.user_id = new.student_id);
  return null;
end $$;

create or replace function public.toneturn_class_due_reminders()
returns table (user_id uuid, tz text, lang text, quiet_from int, quiet_to int, birth_year int, notify jsonb, local_day date,
               sent jsonb, items jsonb, subs jsonb)
language sql stable security definer set search_path = '' as $$
  with stu as (
    select m.user_id, m.class_id, pr.privacy, pr.birth_year, sub.hour, sub.tz
    from public.toneturn_class_members m
    join public.toneturn_classes c on c.id = m.class_id and c.teacher <> m.user_id
    left join public.toneturn_profiles pr on pr.id = m.user_id
    join lateral (select x.hour, x.tz from public.toneturn_push_subscriptions x where x.user_id = m.user_id order by x.id desc limit 1) sub on true
  ),
  due as (
    select st.user_id, st.tz, st.privacy, st.birth_year,
      jsonb_agg(jsonb_build_object('assignment', a.id, 'akind', a.kind, 'ref', a.ref, 'due', a.due_on, 'minutes', o.minutes) order by a.created_at) as items
    from stu st
    join public.toneturn_class_assignments a on a.class_id = st.class_id
    left join public.toneturn_assignment_opts o on o.assignment_id = a.id
    where extract(hour from now() at time zone st.tz)::int = st.hour
      and a.due_on = (now() at time zone st.tz)::date + 1
      and a.archived_at is null
      and (a.student_id is null or a.student_id = st.user_id)
      and not exists (select 1 from public.toneturn_class_submissions s where s.assignment_id = a.id and s.user_id = st.user_id)
      and not exists (select 1 from public.toneturn_class_due_sent d where d.assignment_id = a.id and d.user_id = st.user_id)
      and not exists (select 1 from public.toneturn_class_push_queue q where q.assignment_id = a.id and q.user_id = st.user_id
                        and q.kind = 'assign' and q.sent_at > now() - interval '18 hours')
    group by st.user_id, st.tz, st.privacy, st.birth_year
  )
  select d.user_id, d.tz,
    coalesce((select x.lang from public.toneturn_push_subscriptions x where x.user_id = d.user_id order by x.id desc limit 1), 'en'),
    case when d.privacy ->> 'quietFrom' ~ '^[0-9]{1,2}$' then least(23, (d.privacy ->> 'quietFrom')::int) else 22 end,
    case when d.privacy ->> 'quietTo' ~ '^[0-9]{1,2}$' then least(23, (d.privacy ->> 'quietTo')::int) else 8 end,
    d.birth_year,
    coalesce(d.privacy -> 'notify', '{}'::jsonb),
    (now() at time zone d.tz)::date,
    coalesce((select jsonb_object_agg(l.role, l.n) from public.toneturn_class_push_log l
       where l.user_id = d.user_id and l.local_day = (now() at time zone d.tz)::date), '{}'::jsonb),
    d.items,
    (select jsonb_agg(jsonb_build_object('id', x.id, 'endpoint', x.endpoint, 'p256dh', x.p256dh, 'auth', x.auth))
       from public.toneturn_push_subscriptions x where x.user_id = d.user_id)
  from due d
  limit 500;
$$;
revoke execute on function public.toneturn_class_due_reminders() from public, anon, authenticated;
grant execute on function public.toneturn_class_due_reminders() to service_role;
