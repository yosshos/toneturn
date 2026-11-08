-- ToneTurn / The 7th Sense — duet streaks, the read side (SPEC-SOCIAL §3). After 20261123000000_toneturn_social_profiles.
-- toneturn_duets_view(): my duets (pending / active) with the friend's name, who invited whom, today's status for both,
-- and the shared streak: consecutive days (on my calendar) on which BOTH practised on their own local day, ending today
-- (when both already did) or yesterday. v1: no freezes / repairs inside the duet count yet.
-- Read-only (stable); safe to re-run.
-- APPLIED 2026-11-08 to the app project (with the owner's OK; rolled-back test: active duet, both practised 3 days, me today → streak 3, me ✓ them ✗).

create or replace function public.toneturn_duets_view()
returns table (friend uuid, name text, status text, invited_by_me boolean, expired boolean, streak integer, best integer, me_today boolean, them_today boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_tz text;
  their_tz text;
  today date;
  d record;
  day date;
  n integer;
  since date;
  other uuid;
begin
  if me is null then return; end if;
  select coalesce(p.tz, 'UTC') into my_tz from public.toneturn_profiles p where p.id = me;
  my_tz := coalesce(my_tz, 'UTC');
  today := (now() at time zone my_tz)::date;
  for d in
    select x.* from public.toneturn_duets x
    where me in (x.a, x.b) and x.status in ('pending', 'active')
    order by x.created_at
  loop
    other := case when d.a = me then d.b else d.a end;
    if public.toneturn_blocked_either(me, other) or not public.toneturn_are_friends(me, other) then continue; end if;
    select coalesce(p.tz, 'UTC') into their_tz from public.toneturn_profiles p where p.id = other;
    their_tz := coalesce(their_tz, 'UTC');
    friend := other;
    select coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), 'Player') into name from public.toneturn_profiles p where p.id = other;
    status := d.status;
    invited_by_me := d.invited_by = me;
    expired := d.status = 'pending' and d.created_at < now() - interval '7 days';
    me_today := public.toneturn_practised_on(me, today, my_tz);
    them_today := public.toneturn_practised_on(other, (now() at time zone their_tz)::date, their_tz);
    n := 0;
    if d.status = 'active' then
      since := (d.created_at at time zone my_tz)::date;
      day := case when me_today and them_today then today else today - 1 end;
      while day >= since and n < 1000
        and public.toneturn_practised_on(me, day, my_tz)
        and public.toneturn_practised_on(other, day, their_tz) loop
        n := n + 1;
        day := day - 1;
      end loop;
    end if;
    streak := n;
    best := greatest(d.best, n);
    return next;
  end loop;
end $$;
revoke execute on function public.toneturn_duets_view() from public, anon;
grant execute on function public.toneturn_duets_view() to authenticated;
