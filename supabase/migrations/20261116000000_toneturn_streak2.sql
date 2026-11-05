-- Ninth Sense 0.23: streak 2.0 on the server (spec addendum N.6).
-- Freeze and repair days (decided by the client from its practice history and purchases) are stored so
-- the server streak counts them as practised; the daily challenge counts too. The reminder function now
-- returns a message kind: the evening reminder, "streak at risk" at 22:00 local, and "freeze used" in the
-- morning — at most one push per day (last_sent_on).
-- Run after 20261115000000_toneturn_rating.sql. Safe to re-run.

create table if not exists public.toneturn_streak_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('freeze', 'repair')),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.toneturn_streak_days enable row level security;
revoke all on public.toneturn_streak_days from anon, authenticated;

/** Client reports its freeze / repair days (idempotent; only recent days are accepted). */
create or replace function public.toneturn_report_streak_days(p_days jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  d jsonb;
begin
  if me is null then raise exception 'sign in first'; end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) > 400 then raise exception 'bad days'; end if;
  for d in select * from jsonb_array_elements(p_days) loop
    if (d->>'kind') in ('freeze', 'repair') and (d->>'day')::date between current_date - 400 and current_date + 1 then
      insert into public.toneturn_streak_days (user_id, day, kind) values (me, (d->>'day')::date, d->>'kind')
      on conflict (user_id, day) do nothing;
    end if;
  end loop;
end $$;
revoke execute on function public.toneturn_report_streak_days(jsonb) from public, anon;
grant execute on function public.toneturn_report_streak_days(jsonb) to authenticated;

-- Streak: consecutive local days with a lesson, a daily challenge, a freeze or a repair, ending today or yesterday.
create or replace function public.toneturn_streak(p_user uuid, p_tz text)
returns int language sql stable security definer set search_path = '' as $$
  with days as (
    select (r.completed_at at time zone p_tz)::date as d from public.toneturn_lesson_results r where r.user_id = p_user
    union
    select x.day from public.toneturn_daily_results x where x.user_id = p_user
    union
    select s.day from public.toneturn_streak_days s where s.user_id = p_user
  ),
  today as (select (now() at time zone p_tz)::date as t),
  anchored as (
    select d, row_number() over (order by d desc) as rn from (select distinct d from days) u
    where d <= (select t from today)
  )
  select coalesce((
    select count(*)::int from anchored a
    where a.d = (select max(d) from anchored) - (a.rn - 1)::int
      and (select max(d) from anchored) >= (select t from today) - 1
  ), 0);
$$;
revoke execute on function public.toneturn_streak(uuid, text) from public, anon, authenticated;

create or replace function public.toneturn_practised_on(p_user uuid, p_day date, p_tz text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.toneturn_lesson_results r where r.user_id = p_user and (r.completed_at at time zone p_tz)::date = p_day)
      or exists (select 1 from public.toneturn_daily_results x where x.user_id = p_user and x.day = p_day);
$$;
revoke execute on function public.toneturn_practised_on(uuid, date, text) from public, anon, authenticated;

-- Reminders: one row per subscription that should get a push this hour, with the kind of message.
drop function if exists public.toneturn_due_reminders();
create or replace function public.toneturn_due_reminders()
returns table (id bigint, endpoint text, p256dh text, auth text, lang text, streak int, local_day date, kind text)
language sql stable security definer set search_path = '' as $$
  with subs as (
    select s.*, (now() at time zone s.tz)::date as today, extract(hour from now() at time zone s.tz)::int as hr,
           public.toneturn_streak(s.user_id, s.tz) as st
    from public.toneturn_push_subscriptions s
    where s.last_sent_on is null or s.last_sent_on < (now() at time zone s.tz)::date
  )
  select x.id, x.endpoint, x.p256dh, x.auth, x.lang, x.st, x.today,
         case
           -- morning after a freeze day: reassure
           when x.hr = 9 and exists (select 1 from public.toneturn_streak_days d where d.user_id = x.user_id and d.day = x.today - 1 and d.kind = 'freeze') then 'freeze_used'
           when x.hr = 22 then 'at_risk'
           else 'evening'
         end
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
