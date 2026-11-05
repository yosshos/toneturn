-- ToneTurn / Ninth Sense 0.28 — push notifications for asynchronous friend duels.
-- Run after 20261118000000_toneturn_leagues_duels.sql. Safe to re-run.
--  * A queue of one-off notifications, filled by a trigger on toneturn_duels:
--      duel_new  — the challenger has played their round: "<name> challenged you"
--      duel_done — both have played: tell the one who played first the result
--  * The trigger also pokes the existing Edge Function (pg_net, the cron secret from Vault) so the push goes
--    out within seconds; the hourly cron run sends anything left over. A notification problem never blocks a duel.

create table if not exists public.toneturn_push_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('duel_new', 'duel_done')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists toneturn_push_queue_pending on public.toneturn_push_queue (created_at) where sent_at is null;
alter table public.toneturn_push_queue enable row level security;
revoke all on public.toneturn_push_queue from anon, authenticated;

create or replace function public.toneturn_duel_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_from uuid;
  v_to uuid;
  v_name text;
begin
  -- The challenger finished their round (the opponent has not played yet): invite the opponent.
  if new.challenger_points is not null and old.challenger_points is null and new.opponent_points is null then
    select nullif(trim(p.display_name), '') into v_name from public.toneturn_profiles p where p.id = new.challenger;
    insert into public.toneturn_push_queue (user_id, kind, data)
    values (new.opponent, 'duel_new', jsonb_build_object('from', coalesce(v_name, ''), 'duel', new.id));
  -- Both have played now: tell the one who played first.
  elsif new.challenger_points is not null and new.opponent_points is not null
        and (old.challenger_points is null or old.opponent_points is null) then
    if old.opponent_points is null then
      v_to := new.challenger; v_from := new.opponent;
    else
      v_to := new.opponent; v_from := new.challenger;
    end if;
    select nullif(trim(p.display_name), '') into v_name from public.toneturn_profiles p where p.id = v_from;
    insert into public.toneturn_push_queue (user_id, kind, data)
    values (v_to, 'duel_done', jsonb_build_object(
      'from', coalesce(v_name, ''),
      'duel', new.id,
      'mine', case when v_to = new.challenger then new.challenger_points else new.opponent_points end,
      'theirs', case when v_to = new.challenger then new.opponent_points else new.challenger_points end));
  else
    return new;
  end if;
  -- Send now (best effort; the hourly run is the fallback).
  begin
    perform net.http_post(
      url := 'https://jgmahngenrpqnvbvpztf.supabase.co/functions/v1/toneturn-streak-reminder',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-cron-secret', (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'toneturn_cron_secret')),
      body := '{"queue": true}'::jsonb);
  exception when others then null;
  end;
  return new;
end $$;
revoke execute on function public.toneturn_duel_notify() from public, anon, authenticated;

drop trigger if exists toneturn_duel_notify on public.toneturn_duels;
create trigger toneturn_duel_notify after update of challenger_points, opponent_points on public.toneturn_duels
  for each row execute function public.toneturn_duel_notify();

-- For the Edge Function (service role only): pending notifications with every device of the recipient.
create or replace function public.toneturn_push_queue_due()
returns table (queue_id bigint, kind text, data jsonb, sub_id bigint, endpoint text, p256dh text, auth text, lang text)
language sql stable security definer set search_path = '' as $$
  select q.id, q.kind, q.data, s.id, s.endpoint, s.p256dh, s.auth, s.lang
  from public.toneturn_push_queue q
  join public.toneturn_push_subscriptions s on s.user_id = q.user_id
  where q.sent_at is null and q.created_at > now() - interval '2 days'
  order by q.id
  limit 500;
$$;
revoke execute on function public.toneturn_push_queue_due() from public, anon, authenticated;
grant execute on function public.toneturn_push_queue_due() to service_role;
