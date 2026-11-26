-- ToneTurn: class notifications phase 1, review round 1 fixes (docs/SPEC-CLASS-NOTIFICATIONS.he.md). Safe to re-run.
--  · H1: the claim marks the items first and fails unless EVERY item was still unsent (two runs that read the same
--    rows can no longer both send, or spend two of the day's slots).
--  · H2: users without a device are not planned at all; a push whose every send failed is unclaimed (items back to
--    unsent, the day's count back down).
--  · M1: no A2 "due tomorrow" for an assignment whose A1 push went out in the last 18 hours.
--  · M2: A2 takes the time zone of the same subscription its hour comes from (as the evening reminder does).
--  · M3: an edit of a mark / comment within 12 hours of the reply's push sends nothing new.
--  · M5: the digest counts each student's work on an assignment once (items carry the assignment id).
--  · L2: toneturn_push_claim accepts only a real time zone name (a bad one would break every reminder query).
--  · L3: the oldest pending users first.

create or replace function public.toneturn_class_push_claim(p_user uuid, p_role text, p_day date, p_cap int, p_ids bigint[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  k int;
begin
  begin
    update public.toneturn_class_push_queue set sent_at = now() where user_id = p_user and id = any (p_ids) and sent_at is null;
    get diagnostics k = row_count;
    if k <> coalesce(cardinality(p_ids), 0) then raise exception 'claimed elsewhere'; end if;
    if p_cap > 0 then
      insert into public.toneturn_class_push_log as l (user_id, role, local_day, n) values (p_user, p_role, p_day, 1)
      on conflict (user_id, role, local_day) do update set n = l.n + 1 where l.n < p_cap;
      if not found then raise exception 'cap'; end if;
    end if;
  exception when others then
    return false;
  end;
  delete from public.toneturn_class_push_queue where created_at < now() - interval '14 days';
  delete from public.toneturn_class_push_log where local_day < current_date - 30;
  return true;
end $$;
revoke execute on function public.toneturn_class_push_claim(uuid, text, date, int, bigint[]) from public, anon, authenticated;
grant execute on function public.toneturn_class_push_claim(uuid, text, date, int, bigint[]) to service_role;

-- A push that reached no device: its items go back to unsent and the day's count back down.
create or replace function public.toneturn_class_push_unclaim(p_user uuid, p_role text, p_day date, p_ids bigint[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.toneturn_class_push_queue set sent_at = null where user_id = p_user and id = any (p_ids);
  update public.toneturn_class_push_log set n = greatest(0, n - 1) where user_id = p_user and role = p_role and local_day = p_day;
end $$;
revoke execute on function public.toneturn_class_push_unclaim(uuid, text, date, bigint[]) from public, anon, authenticated;
grant execute on function public.toneturn_class_push_unclaim(uuid, text, date, bigint[]) to service_role;

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
  if found then return null; end if;
  -- an edit soon after the reply's push went out: nothing new to say
  if exists (select 1 from public.toneturn_class_push_queue q where q.submission_id = new.id and q.kind = 'feedback' and q.sent_at > now() - interval '12 hours') then
    return null;
  end if;
  insert into public.toneturn_class_push_queue (user_id, role, kind, class_id, assignment_id, submission_id)
  values (new.user_id, 'student', 'feedback', v_class, new.assignment_id, new.id)
  on conflict do nothing;
  return null;
end $$;

create or replace function public.toneturn_class_push_due()
returns table (user_id uuid, tz text, lang text, quiet_from int, quiet_to int, birth_year int, notify jsonb, digest_hour int,
               sent jsonb, items jsonb, subs jsonb)
language sql stable security definer set search_path = '' as $$
  with pending as (
    select q.user_id, min(q.created_at) as first_at,
      jsonb_agg(jsonb_build_object(
        'id', q.id, 'role', q.role, 'kind', q.kind, 'at', q.created_at, 'upd', q.updated_at,
        'class', q.class_id, 'assignment', q.assignment_id, 'student', s.user_id,
        'akind', a.kind, 'ref', a.ref, 'due', a.due_on, 'minutes', o.minutes,
        'ungraded', case when q.kind = 'submission' then (s.comment is null and s.mark is null) end
      ) order by q.id) as items
    from public.toneturn_class_push_queue q
    join public.toneturn_class_assignments a on a.id = q.assignment_id
    left join public.toneturn_assignment_opts o on o.assignment_id = a.id
    left join public.toneturn_class_submissions s on s.id = q.submission_id
    where q.sent_at is null and q.created_at > now() - interval '48 hours'
      and exists (select 1 from public.toneturn_push_subscriptions x where x.user_id = q.user_id)
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
  order by p.first_at
  limit 500;
$$;
revoke execute on function public.toneturn_class_push_due() from public, anon, authenticated;
grant execute on function public.toneturn_class_push_due() to service_role;

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
      and not exists (select 1 from public.toneturn_class_submissions s where s.assignment_id = a.id and s.user_id = st.user_id)
      and not exists (select 1 from public.toneturn_class_due_sent d where d.assignment_id = a.id and d.user_id = st.user_id)
      -- the new-assignment push already said "due tomorrow" today
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

create or replace function public.toneturn_push_claim(p_endpoint text, p_p256dh text, p_auth text, p_tz text, p_hour int, p_lang text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  v_tz text := case when exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p_tz) then p_tz else 'UTC' end;
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_endpoint is null or p_endpoint not like 'https://%' or char_length(p_endpoint) > 1000 then raise exception 'bad endpoint'; end if;
  if coalesce(char_length(p_p256dh), 0) not between 1 and 200 or coalesce(char_length(p_auth), 0) not between 1 and 100 then raise exception 'bad keys'; end if;
  insert into public.toneturn_push_subscriptions as s (user_id, endpoint, p256dh, auth, tz, hour, lang, last_seen)
  values (me, p_endpoint, p_p256dh, p_auth, v_tz,
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
