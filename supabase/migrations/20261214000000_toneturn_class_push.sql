-- ToneTurn: class notifications, phase 1 (docs/SPEC-CLASS-NOTIFICATIONS.he.md v2, owner-approved 2026-11-26).
-- Additive; safe to re-run.
--  · A class push queue of its own (NEVER the social toneturn_push_queue: its functions send unknown kinds at once and
--    count them as cheers). Rows: a new assignment for each student (A1), the teacher's mark / comment on a
--    submission for its student (A3, one unsent row per submission, updated in place), a submission for the teacher's
--    daily digest (B1).
--  · A per-role daily counter (the caps: 3 a day for a student, 1 digest a day for a teacher), and the A2 due-reminder
--    log (one reminder per student and assignment).
--  · The edge function reads toneturn_class_push_due() / toneturn_class_due_reminders() and claims through
--    toneturn_class_push_claim() (service role only). No user can read or write the queue.
--  · Push subscriptions: last_seen, and toneturn_push_claim() — a device's endpoint moves to whoever is signed in
--    now (a shared device kept the previous user's pushes), refreshed on every app open.
--  · toneturn_due_reminders() also returns user_id (the evening reminder merges with a class due reminder).

-- ---------------------------------------------------------------- the queue
create table if not exists public.toneturn_class_push_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'teacher')),
  kind text not null check (kind in ('assign', 'feedback', 'submission')),
  class_id uuid not null references public.toneturn_classes (id) on delete cascade,
  assignment_id uuid not null references public.toneturn_class_assignments (id) on delete cascade,
  submission_id uuid references public.toneturn_class_submissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists toneturn_class_push_pending on public.toneturn_class_push_queue (user_id, created_at) where sent_at is null;
create unique index if not exists toneturn_class_push_feedback_once on public.toneturn_class_push_queue (submission_id) where sent_at is null and kind = 'feedback';
alter table public.toneturn_class_push_queue enable row level security;
revoke all on public.toneturn_class_push_queue from anon, authenticated;

create table if not exists public.toneturn_class_push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'teacher')),
  local_day date not null,
  n int not null default 0,
  primary key (user_id, role, local_day)
);
alter table public.toneturn_class_push_log enable row level security;
revoke all on public.toneturn_class_push_log from anon, authenticated;

create table if not exists public.toneturn_class_due_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  assignment_id uuid not null references public.toneturn_class_assignments (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, assignment_id)
);
alter table public.toneturn_class_due_sent enable row level security;
revoke all on public.toneturn_class_due_sent from anon, authenticated;

-- ---------------------------------------------------------------- triggers
-- A1: a new assignment → every student of the class.
create or replace function public.toneturn_class_push_on_assign()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.toneturn_class_push_queue (user_id, role, kind, class_id, assignment_id)
  select m.user_id, 'student', 'assign', new.class_id, new.id
  from public.toneturn_class_members m
  join public.toneturn_classes c on c.id = m.class_id
  where m.class_id = new.class_id and m.user_id <> c.teacher;
  return null;
end $$;
drop trigger if exists toneturn_class_push_assign on public.toneturn_class_assignments;
create trigger toneturn_class_push_assign after insert on public.toneturn_class_assignments
  for each row execute function public.toneturn_class_push_on_assign();

-- B1: a submission → the class's teacher (the daily digest counts them).
create or replace function public.toneturn_class_push_on_submit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.toneturn_class_push_queue (user_id, role, kind, class_id, assignment_id, submission_id)
  select c.teacher, 'teacher', 'submission', a.class_id, a.id, new.id
  from public.toneturn_class_assignments a
  join public.toneturn_classes c on c.id = a.class_id
  where a.id = new.assignment_id and c.teacher <> new.user_id;
  return null;
end $$;
drop trigger if exists toneturn_class_push_submit on public.toneturn_class_submissions;
create trigger toneturn_class_push_submit after insert on public.toneturn_class_submissions
  for each row execute function public.toneturn_class_push_on_submit();

-- A3: the teacher marked / commented a submission → its student. An unsent row is updated in place (an edit before
-- the push goes out); clearing both mark and comment drops the unsent row and sends nothing.
create or replace function public.toneturn_class_push_on_feedback()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_class uuid;
begin
  if new.comment is not distinct from old.comment and new.mark is not distinct from old.mark then return null; end if;
  if new.comment is null and new.mark is null then
    delete from public.toneturn_class_push_queue where submission_id = new.id and kind = 'feedback' and sent_at is null;
    return null;
  end if;
  select a.class_id into v_class from public.toneturn_class_assignments a where a.id = new.assignment_id;
  if v_class is null then return null; end if;
  update public.toneturn_class_push_queue set updated_at = now()
    where submission_id = new.id and kind = 'feedback' and sent_at is null;
  if not found then
    insert into public.toneturn_class_push_queue (user_id, role, kind, class_id, assignment_id, submission_id)
    values (new.user_id, 'student', 'feedback', v_class, new.assignment_id, new.id)
    on conflict do nothing;
  end if;
  return null;
end $$;
drop trigger if exists toneturn_class_push_feedback on public.toneturn_class_submissions;
create trigger toneturn_class_push_feedback after update of comment, mark on public.toneturn_class_submissions
  for each row execute function public.toneturn_class_push_on_feedback();

-- Leaving a class drops its unsent items for that student (a deleted class or assignment cascades).
create or replace function public.toneturn_class_push_on_leave()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.toneturn_class_push_queue where user_id = old.user_id and class_id = old.class_id and sent_at is null;
  return null;
end $$;
drop trigger if exists toneturn_class_push_leave on public.toneturn_class_members;
create trigger toneturn_class_push_leave after delete on public.toneturn_class_members
  for each row execute function public.toneturn_class_push_on_leave();

-- ---------------------------------------------------------------- for the edge function (service role)
-- Users with pending class items (last 48 h), with what the planner needs: time zone, language, quiet hours, year of
-- birth, notification switches, the teacher's digest hour, today's sent counts per role, the items, the devices.
create or replace function public.toneturn_class_push_due()
returns table (user_id uuid, tz text, lang text, quiet_from int, quiet_to int, birth_year int, notify jsonb, digest_hour int,
               sent jsonb, items jsonb, subs jsonb)
language sql stable security definer set search_path = '' as $$
  with pending as (
    select q.user_id,
      jsonb_agg(jsonb_build_object(
        'id', q.id, 'role', q.role, 'kind', q.kind, 'at', q.created_at, 'upd', q.updated_at,
        'class', q.class_id, 'student', s.user_id,
        'akind', a.kind, 'ref', a.ref, 'due', a.due_on, 'minutes', o.minutes,
        'ungraded', case when q.kind = 'submission' then (s.comment is null and s.mark is null) end
      ) order by q.id) as items
    from public.toneturn_class_push_queue q
    join public.toneturn_class_assignments a on a.id = q.assignment_id
    left join public.toneturn_assignment_opts o on o.assignment_id = a.id
    left join public.toneturn_class_submissions s on s.id = q.submission_id
    where q.sent_at is null and q.created_at > now() - interval '48 hours'
    group by q.user_id
  )
  select p.user_id,
    coalesce(pr.tz, 'UTC'),
    coalesce((select x.lang from public.toneturn_push_subscriptions x where x.user_id = p.user_id order by x.id desc limit 1), 'en'),
    case when pr.privacy ->> 'quietFrom' ~ '^[0-9]{1,2}$' then least(23, (pr.privacy ->> 'quietFrom')::int) else 22 end,
    case when pr.privacy ->> 'quietTo' ~ '^[0-9]{1,2}$' then least(23, (pr.privacy ->> 'quietTo')::int) else 8 end,
    pr.birth_year,
    coalesce(pr.privacy -> 'notify', '{}'::jsonb),
    case when pr.privacy ->> 'classDigestHour' ~ '^[0-9]{1,2}$' then least(23, (pr.privacy ->> 'classDigestHour')::int) else 18 end,
    coalesce((select jsonb_object_agg(l.role, l.n) from public.toneturn_class_push_log l
       where l.user_id = p.user_id and l.local_day = (now() at time zone coalesce(pr.tz, 'UTC'))::date), '{}'::jsonb),
    p.items,
    (select jsonb_agg(jsonb_build_object('id', x.id, 'endpoint', x.endpoint, 'p256dh', x.p256dh, 'auth', x.auth))
       from public.toneturn_push_subscriptions x where x.user_id = p.user_id)
  from pending p
  left join public.toneturn_profiles pr on pr.id = p.user_id
  limit 500;
$$;
revoke execute on function public.toneturn_class_push_due() from public, anon, authenticated;
grant execute on function public.toneturn_class_push_due() to service_role;

-- Claim one push for a user in a role today (false = the day's cap is reached) and mark the items sent. p_cap = 0
-- marks the items sent without a push (the switch is off, or the items are too old to be worth a push).
create or replace function public.toneturn_class_push_claim(p_user uuid, p_role text, p_day date, p_cap int, p_ids bigint[])
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_cap > 0 then
    insert into public.toneturn_class_push_log as l (user_id, role, local_day, n) values (p_user, p_role, p_day, 1)
    on conflict (user_id, role, local_day) do update set n = l.n + 1 where l.n < p_cap;
    if not found then return false; end if;
  end if;
  update public.toneturn_class_push_queue set sent_at = now() where user_id = p_user and id = any (p_ids) and sent_at is null;
  delete from public.toneturn_class_push_queue where created_at < now() - interval '14 days';
  delete from public.toneturn_class_push_log where local_day < current_date - 30;
  return true;
end $$;
revoke execute on function public.toneturn_class_push_claim(uuid, text, date, int, bigint[]) from public, anon, authenticated;
grant execute on function public.toneturn_class_push_claim(uuid, text, date, int, bigint[]) to service_role;

-- A2: students whose local reminder hour is now and who have an assignment due tomorrow (their zone) without a
-- submission and without a reminder yet — no streak needed. One row per student with the assignments.
create or replace function public.toneturn_class_due_reminders()
returns table (user_id uuid, tz text, lang text, quiet_from int, quiet_to int, birth_year int, notify jsonb, local_day date,
               sent jsonb, items jsonb, subs jsonb)
language sql stable security definer set search_path = '' as $$
  with stu as (
    select m.user_id, m.class_id, coalesce(pr.tz, 'UTC') as tz, pr.privacy, pr.birth_year,
      (select x.hour from public.toneturn_push_subscriptions x where x.user_id = m.user_id order by x.id desc limit 1) as hour
    from public.toneturn_class_members m
    join public.toneturn_classes c on c.id = m.class_id and c.teacher <> m.user_id
    left join public.toneturn_profiles pr on pr.id = m.user_id
  ),
  due as (
    select st.user_id, st.tz, st.privacy, st.birth_year,
      jsonb_agg(jsonb_build_object('assignment', a.id, 'akind', a.kind, 'ref', a.ref, 'due', a.due_on, 'minutes', o.minutes) order by a.created_at) as items
    from stu st
    join public.toneturn_class_assignments a on a.class_id = st.class_id
    left join public.toneturn_assignment_opts o on o.assignment_id = a.id
    where st.hour is not null
      and extract(hour from now() at time zone st.tz)::int = st.hour
      and a.due_on = (now() at time zone st.tz)::date + 1
      and not exists (select 1 from public.toneturn_class_submissions s where s.assignment_id = a.id and s.user_id = st.user_id)
      and not exists (select 1 from public.toneturn_class_due_sent d where d.assignment_id = a.id and d.user_id = st.user_id)
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

-- Record the A2 reminders (claimed against the student's daily cap; false = cap reached, nothing recorded).
create or replace function public.toneturn_class_due_claim(p_user uuid, p_day date, p_cap int, p_assignments uuid[])
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_cap > 0 then
    insert into public.toneturn_class_push_log as l (user_id, role, local_day, n) values (p_user, 'student', p_day, 1)
    on conflict (user_id, role, local_day) do update set n = l.n + 1 where l.n < p_cap;
    if not found then return false; end if;
  end if;
  insert into public.toneturn_class_due_sent (user_id, assignment_id)
  select p_user, x from unnest(p_assignments) x on conflict do nothing;
  return true;
end $$;
revoke execute on function public.toneturn_class_due_claim(uuid, date, int, uuid[]) from public, anon, authenticated;
grant execute on function public.toneturn_class_due_claim(uuid, date, int, uuid[]) to service_role;

-- ---------------------------------------------------------------- subscriptions: last_seen and claiming a device
alter table public.toneturn_push_subscriptions add column if not exists last_seen timestamptz;

-- The signed-in user takes this device's endpoint (insert, or move it from whoever had it), refreshed on app open.
create or replace function public.toneturn_push_claim(p_endpoint text, p_p256dh text, p_auth text, p_tz text, p_hour int, p_lang text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_endpoint is null or p_endpoint not like 'https://%' or char_length(p_endpoint) > 1000 then raise exception 'bad endpoint'; end if;
  if coalesce(char_length(p_p256dh), 0) not between 1 and 200 or coalesce(char_length(p_auth), 0) not between 1 and 100 then raise exception 'bad keys'; end if;
  insert into public.toneturn_push_subscriptions as s (user_id, endpoint, p256dh, auth, tz, hour, lang, last_seen)
  values (me, p_endpoint, p_p256dh, p_auth,
          case when p_tz ~ '^[A-Za-z0-9_+/-]{1,64}$' then p_tz else 'UTC' end,
          case when p_hour between 0 and 23 then p_hour else 19 end,
          case when p_lang in ('en', 'he') then p_lang else 'en' end, now())
  on conflict (endpoint) do update set
    user_id = me, p256dh = excluded.p256dh, auth = excluded.auth, tz = excluded.tz,
    hour = case when p_hour between 0 and 23 then p_hour when s.user_id = me then s.hour else excluded.hour end,
    lang = excluded.lang, last_seen = now(),
    last_sent_on = case when s.user_id = me then s.last_sent_on end;
end $$;
revoke execute on function public.toneturn_push_claim(text, text, text, text, int, text) from public, anon;
grant execute on function public.toneturn_push_claim(text, text, text, text, int, text) to authenticated;

-- ---------------------------------------------------------------- the evening reminder also names its user
drop function if exists public.toneturn_due_reminders();
create or replace function public.toneturn_due_reminders()
returns table (id bigint, endpoint text, p256dh text, auth text, lang text, streak int, local_day date, kind text, user_id uuid)
language sql stable security definer set search_path = '' as $$
  with subs as (
    select s.*, (now() at time zone s.tz)::date as today, extract(hour from now() at time zone s.tz)::int as hr,
           public.toneturn_streak(s.user_id, s.tz) as st
    from public.toneturn_push_subscriptions s
    where s.last_sent_on is null or s.last_sent_on < (now() at time zone s.tz)::date
  )
  select x.id, x.endpoint, x.p256dh, x.auth, x.lang, x.st, x.today,
         case
           when x.hr = 9 and exists (select 1 from public.toneturn_streak_days d where d.user_id = x.user_id and d.day = x.today - 1 and d.kind = 'freeze') then 'freeze_used'
           when x.hr = 22 then 'at_risk'
           else 'evening'
         end,
         x.user_id
  from subs x
  where x.st > 0
    and (
      (x.hr = 9 and exists (select 1 from public.toneturn_streak_days d where d.user_id = x.user_id and d.day = x.today - 1 and d.kind = 'freeze'))
      or (
        not public.toneturn_practised_on(x.user_id, x.today, x.tz)
        and ((x.hr = x.hour) or (x.hr = 22 and x.st >= 3 and x.hour <> 22))
      )
    );
$$;
revoke execute on function public.toneturn_due_reminders() from public, anon, authenticated;
grant execute on function public.toneturn_due_reminders() to service_role;
