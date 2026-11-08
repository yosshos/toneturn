-- ToneTurn: the teacher loop (0.52, PLAN-ANALYSIS-AND-NEXT §8).
--  · Assignments of any kind: a path lesson (as before), a topic level, a technique drill, a chord chart with
--    improvisation rules, a piece — with a strictness, a target tempo and a note from the teacher.
--  · Submissions: when a student finishes an assigned item the app sends its result (score, minutes, the take's
--    metrics). The teacher's grading inbox lists them; the teacher answers with a short comment and a mark, which the
--    student sees on the assignment.
--  · Parent digest: a student (or the student's parent, signed in on the student's device) makes a private link; the
--    page shows the week: sessions, XP, streak, skills mastered, the latest teacher comments. Revocable.
-- All access goes through security-definer functions; the tables have no grants. Safe to re-run.

alter table public.toneturn_class_assignments
  add column if not exists kind text not null default 'lesson',
  add column if not exists ref text,
  add column if not exists strictness text not null default 'moderate',
  add column if not exists target_bpm int,
  add column if not exists note text;
do $$ begin
  alter table public.toneturn_class_assignments add constraint toneturn_assign_kind check (kind in ('lesson', 'topic', 'drill', 'chart', 'piece'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.toneturn_class_assignments add constraint toneturn_assign_strict check (strictness in ('lenient', 'moderate', 'strict'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.toneturn_class_assignments add constraint toneturn_assign_ref check (ref is null or char_length(ref) <= 2000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.toneturn_class_assignments add constraint toneturn_assign_bpm check (target_bpm is null or target_bpm between 20 and 400);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.toneturn_class_assignments add constraint toneturn_assign_note check (note is null or char_length(note) <= 300);
exception when duplicate_object then null; end $$;

create table if not exists public.toneturn_class_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.toneturn_class_assignments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  score real check (score is null or score between 0 and 1),
  minutes int not null default 0 check (minutes between 0 and 600),
  metrics jsonb not null default '{}'::jsonb check (pg_column_size(metrics) <= 4096),
  comment text check (comment is null or char_length(comment) <= 500),
  mark text check (mark is null or mark in ('great', 'good', 'again')),
  commented_at timestamptz
);
create index if not exists toneturn_submissions_by_assignment on public.toneturn_class_submissions (assignment_id, created_at desc);
create index if not exists toneturn_submissions_by_user on public.toneturn_class_submissions (user_id, created_at desc);

create table if not exists public.toneturn_digest_links (
  token text primary key check (char_length(token) between 20 and 64),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.toneturn_class_submissions enable row level security;
alter table public.toneturn_digest_links enable row level security;
revoke all on public.toneturn_class_submissions, public.toneturn_digest_links from anon, authenticated;

/** Teacher: assign any kind of item. lesson_id keeps its slug rule (a lesson id, or the kind for other kinds). */
create or replace function public.toneturn_class_assign_item(
  p_class uuid, p_kind text, p_lesson text, p_ref text, p_due date, p_strict text, p_bpm int, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  aid uuid;
  lid text := case when p_kind = 'lesson' then p_lesson else p_kind end;
begin
  if not exists (select 1 from public.toneturn_classes c where c.id = p_class and c.teacher = me) then raise exception 'not your class'; end if;
  if (select count(*) from public.toneturn_class_assignments a where a.class_id = p_class) >= 100 then raise exception 'too many assignments'; end if;
  insert into public.toneturn_class_assignments (class_id, lesson_id, due_on, kind, ref, strictness, target_bpm, note)
  values (p_class, lid, p_due, p_kind, nullif(p_ref, ''), coalesce(nullif(p_strict, ''), 'moderate'), p_bpm,
          nullif(left(regexp_replace(btrim(coalesce(p_note, '')), '[[:cntrl:]]', '', 'g'), 300), ''))
  returning id into aid;
  return aid;
end $$;

/** Student: send the result of an assigned item (a member of the assignment's class). At most 50 per assignment. */
create or replace function public.toneturn_class_submit(p_assignment uuid, p_score real, p_minutes int, p_metrics jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  sid uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  if not exists (
    select 1 from public.toneturn_class_assignments a join public.toneturn_class_members m on m.class_id = a.class_id
    where a.id = p_assignment and m.user_id = me) then raise exception 'not your assignment'; end if;
  if (select count(*) from public.toneturn_class_submissions s where s.assignment_id = p_assignment and s.user_id = me) >= 50 then
    raise exception 'too many submissions';
  end if;
  insert into public.toneturn_class_submissions (assignment_id, user_id, score, minutes, metrics)
  values (p_assignment, me, greatest(0, least(1, p_score)), greatest(0, least(600, coalesce(p_minutes, 0))), coalesce(p_metrics, '{}'::jsonb))
  returning id into sid;
  return sid;
end $$;

/** Teacher: comment on a submission (and mark it). */
create or replace function public.toneturn_class_comment(p_submission uuid, p_comment text, p_mark text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.toneturn_class_submissions s
  set comment = nullif(left(regexp_replace(btrim(coalesce(p_comment, '')), '[[:cntrl:]]', '', 'g'), 500), ''),
      mark = case when p_mark in ('great', 'good', 'again') then p_mark else null end,
      commented_at = now()
  where s.id = p_submission and exists (
    select 1 from public.toneturn_class_assignments a join public.toneturn_classes c on c.id = a.class_id
    where a.id = s.assignment_id and c.teacher = (select auth.uid()));
  if not found then raise exception 'not your student'; end if;
end $$;

/** Teacher: everything about one class — assignments with their submissions (inbox), and the heat-map rows. */
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
        'target_bpm', a.target_bpm, 'note', a.note, 'created_at', a.created_at,
        'submissions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', s.id, 'user_id', s.user_id, 'name', coalesce(nullif(p.display_name, ''), 'Student'), 'created_at', s.created_at,
            'score', s.score, 'minutes', s.minutes, 'metrics', s.metrics, 'comment', s.comment, 'mark', s.mark
          ) order by s.created_at desc)
          from public.toneturn_class_submissions s left join public.toneturn_profiles p on p.id = s.user_id
          where s.assignment_id = a.id), '[]'::jsonb)
      ) order by a.created_at desc)
      from public.toneturn_class_assignments a where a.class_id = p_class), '[]'::jsonb),
    'minutes', coalesce((
      select jsonb_object_agg(x.user_id, x.m) from (
        select s.user_id, sum(s.minutes) as m from public.toneturn_class_submissions s
        join public.toneturn_class_assignments a on a.id = s.assignment_id
        where a.class_id = p_class and s.created_at >= now() - interval '7 days' group by s.user_id) x), '{}'::jsonb)
  );
end $$;

/** Student: my assignments in all my classes, with my submissions and the teacher's comments. */
create or replace function public.toneturn_my_assignments()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'sign in first'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'class', c.name, 'kind', a.kind, 'lesson_id', a.lesson_id, 'ref', a.ref, 'due_on', a.due_on,
      'strictness', a.strictness, 'target_bpm', a.target_bpm, 'note', a.note, 'created_at', a.created_at,
      'submissions', coalesce((
        select jsonb_agg(jsonb_build_object('id', s.id, 'created_at', s.created_at, 'score', s.score, 'comment', s.comment, 'mark', s.mark) order by s.created_at desc)
        from public.toneturn_class_submissions s where s.assignment_id = a.id and s.user_id = me), '[]'::jsonb)
    ) order by a.due_on nulls last, a.created_at)
    from public.toneturn_class_assignments a
    join public.toneturn_classes c on c.id = a.class_id
    join public.toneturn_class_members m on m.class_id = c.id and m.user_id = me), '[]'::jsonb);
end $$;

/** A private parent link for the signed-in student (one per student; a new one replaces the old). */
create or replace function public.toneturn_digest_link_create()
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  t text := replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '/', '_'), '+', '-');
begin
  if me is null then raise exception 'sign in first'; end if;
  insert into public.toneturn_digest_links (token, user_id) values (t, me)
  on conflict (user_id) do update set token = excluded.token, created_at = now();
  return t;
end $$;

create or replace function public.toneturn_digest_link_revoke()
returns void language sql security definer set search_path = '' as $$
  delete from public.toneturn_digest_links d where d.user_id = (select auth.uid());
$$;

/** The parent digest: readable by anyone who holds the token (anon allowed), nothing else. */
create or replace function public.toneturn_digest(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid;
  tz text;
begin
  select d.user_id into u from public.toneturn_digest_links d where d.token = p_token;
  if u is null then return null; end if;
  select coalesce(p.tz, 'UTC') into tz from public.toneturn_profiles p where p.id = u;
  return jsonb_build_object(
    'name', coalesce((select nullif(p.display_name, '') from public.toneturn_profiles p where p.id = u), 'Student'),
    'streak', public.toneturn_streak(u, coalesce(tz, 'UTC')),
    'sessions', (select count(*) from public.toneturn_lesson_results x where x.user_id = u and x.completed_at >= now() - interval '7 days'),
    'xp', coalesce((select sum(x.xp) from public.toneturn_lesson_results x where x.user_id = u and x.completed_at >= now() - interval '7 days'), 0),
    'days', (select count(distinct (x.completed_at at time zone coalesce(tz, 'UTC'))::date) from public.toneturn_lesson_results x
             where x.user_id = u and x.completed_at >= now() - interval '7 days'),
    'minutes', coalesce((select sum(s.minutes) from public.toneturn_class_submissions s where s.user_id = u and s.created_at >= now() - interval '7 days'), 0),
    'mastered', coalesce((
      select jsonb_agg(z.skill order by z.skill) from (
        select it->>'skill' as skill
        from public.toneturn_lesson_results x, jsonb_array_elements(coalesce(x.items, '[]'::jsonb)) it
        where x.user_id = u and x.completed_at >= now() - interval '30 days' and it ? 'skill'
        group by it->>'skill'
        having count(*) >= 10 and count(*) filter (where (it->>'correct')::boolean) >= 0.85 * count(*)) z), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object('at', s.commented_at, 'comment', s.comment, 'mark', s.mark) order by s.commented_at desc)
      from (select * from public.toneturn_class_submissions s where s.user_id = u and s.comment is not null order by s.commented_at desc limit 3) s), '[]'::jsonb)
  );
end $$;

revoke all on function public.toneturn_class_assign_item(uuid, text, text, text, date, text, int, text) from public, anon;
revoke all on function public.toneturn_class_submit(uuid, real, int, jsonb) from public, anon;
revoke all on function public.toneturn_class_comment(uuid, text, text) from public, anon;
revoke all on function public.toneturn_class_detail(uuid) from public, anon;
revoke all on function public.toneturn_my_assignments() from public, anon;
revoke all on function public.toneturn_digest_link_create() from public, anon;
revoke all on function public.toneturn_digest_link_revoke() from public, anon;
grant execute on function public.toneturn_class_assign_item(uuid, text, text, text, date, text, int, text) to authenticated;
grant execute on function public.toneturn_class_submit(uuid, real, int, jsonb) to authenticated;
grant execute on function public.toneturn_class_comment(uuid, text, text) to authenticated;
grant execute on function public.toneturn_class_detail(uuid) to authenticated;
grant execute on function public.toneturn_my_assignments() to authenticated;
grant execute on function public.toneturn_digest_link_create() to authenticated;
grant execute on function public.toneturn_digest_link_revoke() to authenticated;
grant execute on function public.toneturn_digest(text) to anon, authenticated;
