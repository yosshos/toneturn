-- ToneTurn / The 7th Sense — Encore v3: community challenges ("אתגר הדרן", docs/SPEC-PHRASE-STUDIO.md §12 / §11.1–11.8,
-- owner decisions §20.7 community from 13 / public audio from 16, §20.8 the sharer's own playing ≤ 20 s, §20.12 the app
-- picks the weekly featured phrase and the owner can replace it). After 20261203120000_toneturn_phrase_feed.sql.
--
-- NOT APPLIED BY THE AGENT — the owner dry-runs it first. Additive and safe to re-run. The client calls none of this
-- until the flag is on (src/cloud/challenges.ts CHALLENGES_ON): after applying, build with VITE_ENCORE_CHALLENGES=1
-- (or set localStorage "tt.flag.challenges" = "1" on one device to try it first).
--
-- The model (measured mastery — no likes, no follower counts, no play counts):
--  · toneturn_shared_phrases: a phrase as note data (the same compact code as a teacher assignment, ≤ 6000 chars) +
--    its challenge plan; visibility friends (default) / class / public; status live / held (reports) / removed.
--  · toneturn_phrase_results: one row per player and phrase — keys at the target, best clean tempo, accuracy, input,
--    a digest of the best take — sent by the device from measured takes only; the server re-checks plausibility.
--    Flagged rows (a sequencer-like MIDI take, a device shared between accounts, reports, an admin) stay off boards.
--  · toneturn_phrase_reactions: the musicians' reactions (owner 2026-11-16, replacing the single "bravo"):
--    'encore' ("הדרן!") and the compliments 'groove' (גרוב), 'tone' (צליל), 'idea' (רעיון) — each at most once per
--    viewer and phrase, never on one's own phrase, counted per kind back to the sharer only (never a public count) —
--    and 'learned' (automatic when a player reaches the target in every needed key).
--  · toneturn_phrase_reports: 'copied' (2 distinct → the phrase is held), 'implausible' (3 distinct → the row is
--    hidden), 'other'; the admin review list restores or removes.
--  · toneturn_phrase_featured: the phrase of the week (the app's pick on first read of the week; the owner replaces it).
--  · toneturn_phrase_beats: "beat my tempo" links (8 opaque characters, 14 days).
--  · toneturn_phrase_devices: device tags seen per phrase (a random per-device tag, nothing personal).
--  · Storage bucket "toneturn-phrase-clips" (private, ≤ 400 KB, audio only): <owner>/<phrase>.<ext>; read through
--    signed URLs by whoever may see the phrase (visitors without an account: public phrases of sharers aged 16+).
-- Every table is RLS-on with no direct grants (like the social-round tables): all access goes through the
-- security-definer functions below, which apply blocks, friendships, classes and the age rules.

-- ===================================================================== helpers

-- Age from the year of birth (end-of-year rounding, like the client): null when unknown.
create or replace function public.toneturn_age(p_user uuid)
returns int language sql stable security definer set search_path = '' as $$
  select case when p.birth_year is null then null else extract(year from now())::int - p.birth_year - 1 end
  from public.toneturn_profiles p where p.id = p_user;
$$;
revoke execute on function public.toneturn_age(uuid) from public, anon, authenticated;

-- In the class (its teacher or a member).
create or replace function public.toneturn_in_class(p_class uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_class is not null and (
    exists (select 1 from public.toneturn_classes c where c.id = p_class and c.teacher = p_user)
    or exists (select 1 from public.toneturn_class_members m where m.class_id = p_class and m.user_id = p_user));
$$;
revoke execute on function public.toneturn_in_class(uuid, uuid) from public, anon, authenticated;

-- ===================================================================== tables

create table if not exists public.toneturn_shared_phrases (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  code        text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  title       text not null check (char_length(title) between 1 and 60),
  instrument  text not null check (instrument in ('piano', 'guitar', 'bass', 'voice')),
  level       smallint not null check (level between 1 and 5),
  style       text check (style is null or style in ('bebop', 'blues', 'barry', 'modal', 'gospel', 'rock', 'classical', 'latin', 'pop', 'voice')),
  context     text not null default '' check (char_length(context) <= 40),
  home_key    smallint not null check (home_key between 0 and 11),
  ref         text not null check (ref like 'phrase1:%' and char_length(ref) <= 6000),
  opb         real not null check (opb > 0 and opb <= 16),
  needed      smallint not null default 12 check (needed between 1 and 12),
  goal_bpm    smallint not null check (goal_bpm between 20 and 400),
  grade       smallint check (grade is null or grade between 0 and 20),
  audio_path  text check (audio_path is null or char_length(audio_path) <= 120),
  visibility  text not null default 'friends' check (visibility in ('friends', 'class', 'public')),
  class_id    uuid references public.toneturn_classes (id) on delete set null,
  status      text not null default 'live' check (status in ('live', 'held', 'removed')),
  attested_at timestamptz not null,
  created_at  timestamptz not null default now(),
  check (visibility <> 'class' or class_id is not null)
);
create index if not exists toneturn_shared_phrases_owner on public.toneturn_shared_phrases (owner_id, created_at desc);
create index if not exists toneturn_shared_phrases_public on public.toneturn_shared_phrases (created_at desc) where visibility = 'public' and status = 'live';

create table if not exists public.toneturn_phrase_results (
  phrase_id   uuid not null references public.toneturn_shared_phrases (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  keys_clean  smallint not null default 0 check (keys_clean between 0 and 12),
  best_bpm    smallint not null check (best_bpm between 20 and 400),
  best_acc    real not null check (best_acc between 0 and 1),
  source      text not null check (source in ('midi', 'mic', 'screen')),
  digest      text check (digest is null or digest ~ '^[0-9a-f]{0,32}$'),
  takes       int not null default 0 check (takes between 0 and 100000),
  days        smallint not null default 0 check (days between 0 and 3660),
  flagged     boolean not null default false,
  flag_reason text check (flag_reason is null or flag_reason in ('machine', 'device', 'reports', 'admin')),
  first_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (phrase_id, user_id)
);
create index if not exists toneturn_phrase_results_user on public.toneturn_phrase_results (user_id);

create table if not exists public.toneturn_phrase_devices (
  phrase_id uuid not null references public.toneturn_shared_phrases (id) on delete cascade,
  device    text not null check (device ~ '^[a-z0-9]{12,32}$'),
  user_id   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (phrase_id, device, user_id)
);

create table if not exists public.toneturn_phrase_reactions (
  phrase_id  uuid not null references public.toneturn_shared_phrases (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('encore', 'groove', 'tone', 'idea', 'learned')),
  created_at timestamptz not null default now(),
  primary key (phrase_id, user_id, kind)
);
create index if not exists toneturn_phrase_reactions_learned on public.toneturn_phrase_reactions (created_at) where kind = 'learned';

create table if not exists public.toneturn_phrase_reports (
  id          bigint generated always as identity primary key,
  phrase_id   uuid not null references public.toneturn_shared_phrases (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete cascade, -- null = the phrase itself; else that board row
  reporter    uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('copied', 'implausible', 'other')),
  note        text check (note is null or char_length(note) <= 300),
  status      text not null default 'open' check (status in ('open', 'upheld', 'dismissed')),
  created_at  timestamptz not null default now(),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz
);
create index if not exists toneturn_phrase_reports_open on public.toneturn_phrase_reports (phrase_id, user_id, kind) where status = 'open';
create unique index if not exists toneturn_phrase_reports_once on public.toneturn_phrase_reports (phrase_id, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), reporter) where status = 'open';

create table if not exists public.toneturn_phrase_featured (
  week       date primary key,
  phrase_id  uuid not null references public.toneturn_shared_phrases (id) on delete cascade,
  chosen_by  text not null default 'app' check (chosen_by in ('app', 'owner')),
  created_at timestamptz not null default now()
);

create table if not exists public.toneturn_phrase_beats (
  code       text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  phrase_id  uuid not null references public.toneturn_shared_phrases (id) on delete cascade,
  owner      uuid not null references auth.users (id) on delete cascade,
  bpm        smallint not null,
  keys       smallint not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

alter table public.toneturn_shared_phrases enable row level security;
alter table public.toneturn_phrase_results enable row level security;
alter table public.toneturn_phrase_devices enable row level security;
alter table public.toneturn_phrase_reactions enable row level security;
alter table public.toneturn_phrase_reports enable row level security;
alter table public.toneturn_phrase_featured enable row level security;
alter table public.toneturn_phrase_beats enable row level security;
revoke all on public.toneturn_shared_phrases, public.toneturn_phrase_results, public.toneturn_phrase_devices,
  public.toneturn_phrase_reactions, public.toneturn_phrase_reports, public.toneturn_phrase_featured,
  public.toneturn_phrase_beats from anon, authenticated;

-- ===================================================================== visibility

-- May this viewer see the phrase? Owner always (even held); otherwise live, not blocked, and: public → 13+ (or age
-- unknown, like the rest of the social features; young players see friends and class only); friends → a friend;
-- class → in the class.
create or replace function public.toneturn_phrase_visible(p_phrase uuid, p_viewer uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  p public.toneturn_shared_phrases;
begin
  select * into p from public.toneturn_shared_phrases x where x.id = p_phrase;
  if p.id is null or p_viewer is null then return false; end if;
  if p.owner_id = p_viewer then return p.status <> 'removed'; end if;
  if p.status <> 'live' or public.toneturn_blocked_either(p.owner_id, p_viewer) then return false; end if;
  return case p.visibility
    when 'public' then not public.toneturn_is_young(p_viewer) or public.toneturn_are_friends(p.owner_id, p_viewer) or public.toneturn_in_class(p.class_id, p_viewer)
    when 'friends' then public.toneturn_are_friends(p.owner_id, p_viewer)
    else public.toneturn_in_class(p.class_id, p_viewer) end;
end $$;
revoke execute on function public.toneturn_phrase_visible(uuid, uuid) from public, anon, authenticated;

-- The week's Monday (UTC), like engine/encore/community.ts weekStart.
create or replace function public.toneturn_week_monday()
returns date language sql stable set search_path = '' as $$
  select (date_trunc('week', (now() at time zone 'utc')))::date;
$$;

-- One phrase as the client reads it (src/cloud/challenges.ts phraseFromRaw). Never the owner's id to visitors.
create or replace function public.toneturn_phrase_json(p public.toneturn_shared_phrases, p_viewer uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'code', p.code,
    'owner_id', case when p_viewer is null then null else p.owner_id end,
    'owner_name', public.toneturn_public_name(p.owner_id),
    'owner_icon', (select pr.avatar_icon from public.toneturn_profiles pr where pr.id = p.owner_id),
    'owner_color', (select pr.avatar_color from public.toneturn_profiles pr where pr.id = p.owner_id),
    'mine', p.owner_id = p_viewer,
    'friend', p_viewer is not null and public.toneturn_are_friends(p.owner_id, p_viewer),
    'title', p.title, 'instrument', p.instrument, 'level', p.level, 'style', p.style, 'context', p.context,
    'home_key', p.home_key, 'ref', p.ref, 'opb', p.opb, 'needed', p.needed, 'goal_bpm', p.goal_bpm, 'grade', p.grade,
    'has_audio', p.audio_path is not null and (p_viewer is not null or coalesce(public.toneturn_age(p.owner_id), 0) >= 16),
    'visibility', p.visibility, 'status', p.status, 'created_at', p.created_at,
    'reached', (select count(*) from public.toneturn_phrase_results r where r.phrase_id = p.id and not r.flagged and r.keys_clean >= p.needed),
    'learned_week', (select count(*) from public.toneturn_phrase_reactions x where x.phrase_id = p.id and x.kind = 'learned' and x.created_at > now() - interval '7 days'),
    'featured', exists (select 1 from public.toneturn_phrase_featured f where f.week = public.toneturn_week_monday() and f.phrase_id = p.id),
    'my_reactions', case when p_viewer is null then '[]'::jsonb else coalesce((select jsonb_agg(x.kind order by x.kind) from public.toneturn_phrase_reactions x
                      where x.phrase_id = p.id and x.user_id = p_viewer and x.kind in ('encore', 'groove', 'tone', 'idea')), '[]'::jsonb) end,
    -- per-kind counts: the sharer only
    'reactions', case when p.owner_id = p_viewer then (select jsonb_build_object(
                      'encore', count(*) filter (where x.kind = 'encore'), 'groove', count(*) filter (where x.kind = 'groove'),
                      'tone', count(*) filter (where x.kind = 'tone'), 'idea', count(*) filter (where x.kind = 'idea'))
                    from public.toneturn_phrase_reactions x where x.phrase_id = p.id) end
  );
$$;
revoke execute on function public.toneturn_phrase_json(public.toneturn_shared_phrases, uuid) from public, anon, authenticated;

-- ===================================================================== sharing

-- Share a phrase. Rules: signed in; attested (the client only sends after the tick); title / data limits; class shares
-- only into a class I belong to; public from 13 (age must be known); audio from 13, public audio from 16; ten a day.
create or replace function public.toneturn_phrase_share(
  p_title text, p_instrument text, p_level int, p_style text, p_context text, p_home_key int, p_ref text,
  p_opb real, p_needed int, p_goal_bpm int, p_grade int, p_visibility text, p_class uuid default null, p_audio boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  age int := public.toneturn_age(me);
  c text;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_id uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  if p_visibility not in ('friends', 'class', 'public') then raise exception 'bad visibility'; end if;
  if p_visibility = 'public' and (age is null or age < 13) then raise exception 'community from 13'; end if;
  if coalesce(p_audio, false) and (age is null or age < case when p_visibility = 'public' then 16 else 13 end) then raise exception 'audio: age'; end if;
  if p_visibility = 'class' and not public.toneturn_in_class(p_class, me) then raise exception 'class: not yours'; end if;
  if (select count(*) from public.toneturn_shared_phrases x where x.owner_id = me and x.created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many shares today';
  end if;
  loop
    c := '';
    for i in 1..8 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.toneturn_shared_phrases x where x.code = c);
  end loop;
  insert into public.toneturn_shared_phrases (owner_id, code, title, instrument, level, style, context, home_key, ref, opb,
    needed, goal_bpm, grade, visibility, class_id, attested_at)
  values (me, c, btrim(regexp_replace(left(coalesce(p_title, ''), 60), '[[:cntrl:]]', '', 'g')), p_instrument,
    greatest(1, least(5, coalesce(p_level, 1))), nullif(p_style, ''), left(regexp_replace(coalesce(p_context, ''), '[[:cntrl:]]', '', 'g'), 40),
    ((coalesce(p_home_key, 0) % 12) + 12) % 12, p_ref, p_opb, greatest(1, least(12, coalesce(p_needed, 12))), p_goal_bpm,
    p_grade, p_visibility, case when p_visibility = 'class' then p_class end, now())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'code', c);
end $$;

-- The clip's path once uploaded (<owner>/<phrase>.<ext>); the age rule again.
create or replace function public.toneturn_phrase_set_audio(p_phrase uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.toneturn_shared_phrases;
  age int := public.toneturn_age(me);
begin
  select * into p from public.toneturn_shared_phrases x where x.id = p_phrase and x.owner_id = me;
  if p.id is null then raise exception 'not yours'; end if;
  if p_path is not null and p_path !~ ('^' || me::text || '/' || p.id::text || '\.(webm|ogg|m4a)$') then raise exception 'bad path'; end if;
  if p_path is not null and (age is null or age < case when p.visibility = 'public' then 16 else 13 end) then raise exception 'audio: age'; end if;
  update public.toneturn_shared_phrases x set audio_path = p_path where x.id = p.id;
end $$;

-- The clip's storage path for a viewer who may hear it (null otherwise). Visitors: public phrases of sharers 16+.
create or replace function public.toneturn_phrase_audio_path(p_phrase uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.toneturn_shared_phrases;
begin
  select * into p from public.toneturn_shared_phrases x where x.id = p_phrase;
  if p.id is null or p.audio_path is null then return null; end if;
  if me is null then
    return case when p.visibility = 'public' and p.status = 'live' and coalesce(public.toneturn_age(p.owner_id), 0) >= 16 then p.audio_path end;
  end if;
  return case when public.toneturn_phrase_visible(p.id, me) then p.audio_path end;
end $$;

create or replace function public.toneturn_phrase_get(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.toneturn_shared_phrases;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into p from public.toneturn_shared_phrases x where x.code = upper(btrim(p_code));
  if p.id is null or p.status = 'removed' or (p.status = 'held' and p.owner_id <> me) then return null; end if;
  if public.toneturn_blocked_either(p.owner_id, me) then return null; end if;
  if not public.toneturn_phrase_visible(p.id, me) then
    return case when p.visibility in ('friends', 'class') then jsonb_build_object('locked', p.visibility, 'owner_name', public.toneturn_public_name(p.owner_id)) end;
  end if;
  return public.toneturn_phrase_json(p, me);
end $$;

-- The public link for visitors without an account: public + live only, nickname only, no owner id.
create or replace function public.toneturn_phrase_public(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  p public.toneturn_shared_phrases;
begin
  select * into p from public.toneturn_shared_phrases x where x.code = upper(btrim(p_code)) and x.visibility = 'public' and x.status = 'live';
  if p.id is null then return null; end if;
  return public.toneturn_phrase_json(p, null);
end $$;

-- ===================================================================== the board and results

-- Rows ranked by keys at the target, then the best clean tempo, then accuracy, then who got there first. 'friends':
-- me, the creator and my friends; 'all': everyone (not for young players). Flagged rows only for their own player.
-- "Anonymous on boards" players appear as 'Player'. The featured phrase's board counts this week only (it resets).
create or replace function public.toneturn_phrase_board(p_phrase uuid, p_scope text default 'friends')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.toneturn_shared_phrases;
  feat boolean;
  wk date := public.toneturn_week_monday();
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into p from public.toneturn_shared_phrases x where x.id = p_phrase;
  if p.id is null or not public.toneturn_phrase_visible(p.id, me) then raise exception 'not visible'; end if;
  feat := exists (select 1 from public.toneturn_phrase_featured f where f.week = wk and f.phrase_id = p.id);
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.keys desc, t.best_bpm desc, t.best_acc desc, t.updated_at)
    from (
      select r.user_id, r.keys_clean as keys, r.best_bpm, r.best_acc, r.source, r.updated_at,
        r.user_id = me as me, r.user_id = p.owner_id as creator, r.flagged,
        case when r.user_id <> me and public.toneturn_privacy(r.user_id, 'onBoards') = 'anonymous' then 'Player' else public.toneturn_public_name(r.user_id) end as name,
        (select pr.avatar_icon from public.toneturn_profiles pr where pr.id = r.user_id) as icon
      from public.toneturn_phrase_results r
      where r.phrase_id = p.id
        and (not r.flagged or r.user_id = me)
        and not public.toneturn_blocked_either(r.user_id, me)
        and (p_scope = 'all' and not public.toneturn_is_young(me)
             or r.user_id in (me, p.owner_id) or public.toneturn_are_friends(r.user_id, me))
        and (not feat or r.user_id = p.owner_id or r.updated_at >= wk::timestamptz)
      order by r.keys_clean desc, r.best_bpm desc, r.best_acc desc, r.updated_at
      limit 60
    ) t), '[]'::jsonb);
end $$;

-- My result (from measured takes on my device). Plausibility as engine/encore/community.ts implausible(): tempo range,
-- note rate at the tempo ≤ the instrument's ceiling + 10 % (piano 16, guitar 14, bass 12, voice 8 notes/s), keys ≤
-- needed, 3 takes per key, 2 days for any key, keys only at ≥ 95 % of the target, a rise of at most 3 keys + one per 10
-- minutes since my last result, takes at most 10 + 6 a minute since then. A sequencer-like take or a device already
-- seen for another account keeps the row off boards. Reaching every needed key adds 'learned' (once).
create or replace function public.toneturn_phrase_result(p_phrase uuid, p_keys int, p_best_bpm int, p_acc real, p_source text,
  p_digest text default null, p_takes int default 0, p_days int default 0, p_machine boolean default false, p_device text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.toneturn_shared_phrases;
  prev public.toneturn_phrase_results;
  ceil real;
  mins real;
  bad text[] := '{}';
  dup boolean := false;
  flag boolean;
  why text;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into p from public.toneturn_shared_phrases x where x.id = p_phrase;
  if p.id is null or not public.toneturn_phrase_visible(p.id, me) then raise exception 'not visible'; end if;
  if p_source not in ('midi', 'mic', 'screen') then raise exception 'bad source'; end if;
  if (select count(*) from public.toneturn_phrase_results r where r.user_id = me and r.updated_at > now() - interval '1 minute') >= 20 then
    raise exception 'slow down';
  end if;
  select * into prev from public.toneturn_phrase_results r where r.phrase_id = p.id and r.user_id = me;
  ceil := case p.instrument when 'guitar' then 14 when 'bass' then 12 when 'voice' then 8 else 16 end;
  if p_best_bpm is null or p_best_bpm < 20 or p_best_bpm > 400 then bad := bad || 'tempo-range'; end if;
  if p.opb * coalesce(p_best_bpm, 0) / 60.0 > ceil * 1.1 then bad := bad || 'note-rate'; end if;
  if p_keys is null or p_keys < 0 or p_keys > greatest(1, p.needed) then bad := bad || 'keys-range'; end if;
  if coalesce(p_keys, 0) * 3 > coalesce(p_takes, 0) then bad := bad || 'keys-takes'; end if;
  if coalesce(p_keys, 0) > 0 and coalesce(p_days, 0) < 2 then bad := bad || 'keys-days'; end if;
  if coalesce(p_keys, 0) > 0 and p_best_bpm < 0.95 * p.goal_bpm then bad := bad || 'keys-tempo'; end if;
  if p_acc is null or p_acc < 0 or p_acc > 1 then bad := bad || 'acc-range'; end if;
  if prev.phrase_id is not null then
    mins := extract(epoch from now() - prev.updated_at) / 60.0;
    if p_keys - prev.keys_clean > 3 + floor(mins / 10) then bad := bad || 'too-fast-rise'; end if;
    if coalesce(p_takes, 0) - prev.takes > 10 + 6 * mins then bad := bad || 'takes-rate'; end if;
  end if;
  if array_length(bad, 1) > 0 then return 'implausible:' || array_to_string(bad, ','); end if;
  if p_device ~ '^[a-z0-9]{12,32}$' then
    dup := exists (select 1 from public.toneturn_phrase_devices d where d.phrase_id = p.id and d.device = p_device and d.user_id <> me);
    insert into public.toneturn_phrase_devices (phrase_id, device, user_id) values (p.id, p_device, me) on conflict do nothing;
  end if;
  -- a sequencer-like take is judged on every post; device / reports / admin flags stay until an admin clears them
  why := case when coalesce(p_machine, false) then 'machine' when dup then 'device'
              when prev.flagged and prev.flag_reason <> 'machine' then prev.flag_reason end;
  flag := why is not null;
  insert into public.toneturn_phrase_results as r (phrase_id, user_id, keys_clean, best_bpm, best_acc, source, digest, takes, days, flagged, flag_reason)
  values (p.id, me, p_keys, p_best_bpm, p_acc, p_source, nullif(left(p_digest, 32), ''), coalesce(p_takes, 0), coalesce(p_days, 0), flag, why)
  on conflict (phrase_id, user_id) do update set keys_clean = excluded.keys_clean, best_bpm = excluded.best_bpm, best_acc = excluded.best_acc,
    source = excluded.source, digest = excluded.digest, takes = excluded.takes, days = excluded.days, flagged = excluded.flagged,
    flag_reason = excluded.flag_reason, updated_at = now();
  if not flag and p_keys >= p.needed and p.owner_id <> me then
    insert into public.toneturn_phrase_reactions (phrase_id, user_id, kind) values (p.id, me, 'learned') on conflict do nothing;
  end if;
  return case when flag then 'flagged' else 'ok' end;
end $$;

-- A reaction: "הדרן!" ('encore') or a compliment ('groove', 'tone', 'idea'). One tap each, at most once per viewer and
-- phrase (the primary key), taken back with p_on = false; not on my own phrase; the counts go to the sharer only.
-- Anti-automation only: 60 reactions an hour per player (never met in normal use).
create or replace function public.toneturn_phrase_react(p_phrase uuid, p_kind text, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if p_kind not in ('encore', 'groove', 'tone', 'idea') then raise exception 'bad kind'; end if;
  if me is null or not public.toneturn_phrase_visible(p_phrase, me) then raise exception 'not visible'; end if;
  if exists (select 1 from public.toneturn_shared_phrases x where x.id = p_phrase and x.owner_id = me) then raise exception 'not your own'; end if;
  if p_on then
    if (select count(*) from public.toneturn_phrase_reactions x where x.user_id = me and x.kind <> 'learned' and x.created_at > now() - interval '1 hour') >= 60 then
      raise exception 'slow down';
    end if;
    insert into public.toneturn_phrase_reactions (phrase_id, user_id, kind) values (p_phrase, me, p_kind) on conflict do nothing;
  else
    delete from public.toneturn_phrase_reactions x where x.phrase_id = p_phrase and x.user_id = me and x.kind = p_kind;
  end if;
end $$;

-- ===================================================================== reports & review

-- Report a phrase (p_user null) or a board row. 2 distinct 'copied' → the phrase is held pending review; 3 distinct
-- 'implausible' on a row → the row is hidden (flagged 'reports'). Ten reports a day per reporter.
create or replace function public.toneturn_phrase_report(p_phrase uuid, p_user uuid, p_kind text, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  n int;
  result text := 'ok';
begin
  if me is null or not public.toneturn_phrase_visible(p_phrase, me) then raise exception 'not visible'; end if;
  if p_kind not in ('copied', 'implausible', 'other') then raise exception 'bad kind'; end if;
  if p_user = me then raise exception 'bad request'; end if;
  if (select count(*) from public.toneturn_phrase_reports r where r.reporter = me and r.created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many reports today';
  end if;
  if exists (select 1 from public.toneturn_phrase_reports r where r.phrase_id = p_phrase and r.user_id is not distinct from p_user and r.reporter = me and r.status = 'open') then
    return 'already';
  end if;
  insert into public.toneturn_phrase_reports (phrase_id, user_id, reporter, kind, note) values (p_phrase, p_user, me, p_kind, left(p_note, 300));
  if p_user is null and p_kind = 'copied' then
    select count(distinct reporter) into n from public.toneturn_phrase_reports r where r.phrase_id = p_phrase and r.user_id is null and r.kind = 'copied' and r.status = 'open';
    if n >= 2 then
      update public.toneturn_shared_phrases x set status = 'held' where x.id = p_phrase and x.status = 'live';
      result := 'held';
    end if;
  elsif p_user is not null and p_kind = 'implausible' then
    select count(distinct reporter) into n from public.toneturn_phrase_reports r where r.phrase_id = p_phrase and r.user_id = p_user and r.kind = 'implausible' and r.status = 'open';
    if n >= 3 then
      update public.toneturn_phrase_results r set flagged = true, flag_reason = 'reports' where r.phrase_id = p_phrase and r.user_id = p_user;
      result := 'row-hidden';
    end if;
  end if;
  return result;
end $$;

-- Admin: what waits for review (open reports grouped by phrase / row, held phrases), with the row's facts and digest.
create or replace function public.toneturn_phrase_reviews()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.toneturn_is_admin() then raise exception 'admins only'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.last desc)
    from (
      select case when g.user_id is null then 'phrase' else 'row' end as kind, g.phrase_id, p.code, p.title,
        public.toneturn_public_name(p.owner_id) as owner_name, g.user_id,
        case when g.user_id is not null then public.toneturn_public_name(g.user_id) end as user_name,
        (select jsonb_agg(jsonb_build_object('kind', k.kind, 'n', k.n)) from (
          select r.kind, count(*) as n from public.toneturn_phrase_reports r
          where r.phrase_id = g.phrase_id and r.user_id is not distinct from g.user_id and r.status = 'open' group by r.kind) k) as reports,
        case when g.user_id is null then p.status
             else case when (select x.flagged from public.toneturn_phrase_results x where x.phrase_id = g.phrase_id and x.user_id = g.user_id) then 'hidden' else 'live' end end as status,
        case when g.user_id is not null then (select jsonb_build_object('keys', x.keys_clean, 'best_bpm', x.best_bpm, 'best_acc', x.best_acc, 'source', x.source, 'digest', x.digest)
          from public.toneturn_phrase_results x where x.phrase_id = g.phrase_id and x.user_id = g.user_id) end as facts,
        g.last
      from (select r.phrase_id, r.user_id, max(r.created_at) as last from public.toneturn_phrase_reports r where r.status = 'open' group by r.phrase_id, r.user_id) g
      join public.toneturn_shared_phrases p on p.id = g.phrase_id
      limit 200
    ) t), '[]'::jsonb);
end $$;

-- Admin: restore (dismiss the reports) or remove (uphold: a phrase goes, a row stays hidden).
create or replace function public.toneturn_phrase_review(p_kind text, p_phrase uuid, p_user uuid, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  keep boolean := p_decision = 'restore';
begin
  if not public.toneturn_is_admin() then raise exception 'admins only'; end if;
  if p_decision not in ('restore', 'remove') or p_kind not in ('phrase', 'row') then raise exception 'bad request'; end if;
  if p_kind = 'phrase' then
    update public.toneturn_shared_phrases x set status = case when keep then 'live' else 'removed' end where x.id = p_phrase;
  else
    update public.toneturn_phrase_results r set flagged = not keep, flag_reason = case when keep then null else 'admin' end
    where r.phrase_id = p_phrase and r.user_id = p_user;
  end if;
  update public.toneturn_phrase_reports r set status = case when keep then 'dismissed' else 'upheld' end,
    resolved_by = auth.uid(), resolved_at = now()
  where r.phrase_id = p_phrase and r.user_id is not distinct from (case when p_kind = 'row' then p_user end) and r.status = 'open';
end $$;

-- ===================================================================== gallery & featured

-- The week's phrase: the owner's choice, else the app's pick on the first read of the week (a public live phrase of a
-- sharer 13+, most 'learned' in 7 days, then most players at the target, then the newest; not last week's).
create or replace function public.toneturn_phrase_featured_now()
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  wk date := public.toneturn_week_monday();
  v uuid;
  last uuid;
begin
  select f.phrase_id into v from public.toneturn_phrase_featured f
    join public.toneturn_shared_phrases p on p.id = f.phrase_id and p.status = 'live'
    where f.week = wk;
  if v is not null then return v; end if;
  select f.phrase_id into last from public.toneturn_phrase_featured f where f.week < wk order by f.week desc limit 1;
  select p.id into v from public.toneturn_shared_phrases p
  where p.visibility = 'public' and p.status = 'live' and p.id is distinct from last and coalesce(public.toneturn_age(p.owner_id), 0) >= 13
  order by (select count(*) from public.toneturn_phrase_reactions x where x.phrase_id = p.id and x.kind = 'learned' and x.created_at > now() - interval '7 days') desc,
    (select count(*) from public.toneturn_phrase_results r where r.phrase_id = p.id and not r.flagged and r.keys_clean >= p.needed) desc,
    p.created_at desc
  limit 1;
  if v is not null then
    insert into public.toneturn_phrase_featured (week, phrase_id, chosen_by) values (wk, v, 'app')
    on conflict (week) do update set phrase_id = excluded.phrase_id where public.toneturn_phrase_featured.chosen_by = 'app';
  end if;
  return v;
end $$;
revoke execute on function public.toneturn_phrase_featured_now() from public, anon, authenticated;

-- The gallery: a finite page — the featured phrase, up to 10 from friends (newest), up to 10 rising (most 'learned
-- it' in 7 days). Filters: instrument, level band, style. Young players: friends (and class) only.
create or replace function public.toneturn_phrase_gallery(p_instrument text default null, p_level_min int default null, p_level_max int default null, p_style text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  young boolean;
  feat uuid;
  fp public.toneturn_shared_phrases;
begin
  if me is null then raise exception 'sign in first'; end if;
  young := public.toneturn_is_young(me);
  feat := public.toneturn_phrase_featured_now();
  select * into fp from public.toneturn_shared_phrases x where x.id = feat;
  return jsonb_build_object(
    'featured', case when not young and fp.id is not null and public.toneturn_phrase_visible(fp.id, me) then public.toneturn_phrase_json(fp, me) end,
    'featured_by', (select f.chosen_by from public.toneturn_phrase_featured f where f.week = public.toneturn_week_monday()),
    'friends', coalesce((
      select jsonb_agg(public.toneturn_phrase_json(p, me) order by p.created_at desc)
      from (select x.* from public.toneturn_shared_phrases x
            where x.status = 'live' and x.owner_id <> me and public.toneturn_are_friends(x.owner_id, me)
              and public.toneturn_phrase_visible(x.id, me)
              and (p_instrument is null or x.instrument = p_instrument) and (p_level_min is null or x.level >= p_level_min)
              and (p_level_max is null or x.level <= p_level_max) and (p_style is null or x.style = p_style)
            order by x.created_at desc limit 10) p), '[]'::jsonb),
    'rising', case when young then '[]'::jsonb else coalesce((
      select jsonb_agg(public.toneturn_phrase_json(p, me) order by p.n desc)
      from (select x.*, (select count(*) from public.toneturn_phrase_reactions r where r.phrase_id = x.id and r.kind = 'learned' and r.created_at > now() - interval '7 days') as n
            from public.toneturn_shared_phrases x
            where x.visibility = 'public' and x.status = 'live' and x.owner_id <> me and x.id is distinct from feat
              and not public.toneturn_blocked_either(x.owner_id, me)
              and (p_instrument is null or x.instrument = p_instrument) and (p_level_min is null or x.level >= p_level_min)
              and (p_level_max is null or x.level <= p_level_max) and (p_style is null or x.style = p_style)
            ) p
      where p.n > 0
      order by p.n desc limit 10), '[]'::jsonb) end);
end $$;

-- Owner / admin: replace this week's featured phrase (a public, live phrase).
create or replace function public.toneturn_phrase_feature(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v uuid;
begin
  if not public.toneturn_is_admin() then raise exception 'admins only'; end if;
  select x.id into v from public.toneturn_shared_phrases x where x.code = upper(btrim(p_code)) and x.visibility = 'public' and x.status = 'live';
  if v is null then raise exception 'no such public phrase'; end if;
  insert into public.toneturn_phrase_featured (week, phrase_id, chosen_by) values (public.toneturn_week_monday(), v, 'owner')
  on conflict (week) do update set phrase_id = excluded.phrase_id, chosen_by = 'owner', created_at = now();
end $$;

-- ===================================================================== mine, delete, beat links

create or replace function public.toneturn_phrase_mine()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in first'; end if;
  return coalesce((select jsonb_agg(public.toneturn_phrase_json(x, me) order by x.created_at desc)
    from public.toneturn_shared_phrases x where x.owner_id = me and x.status <> 'removed'), '[]'::jsonb);
end $$;

-- Stop sharing: the phrase, its board, reactions and links go (cascade); the clip file is deleted by the client.
create or replace function public.toneturn_phrase_delete(p_phrase uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.toneturn_shared_phrases x where x.id = p_phrase and x.owner_id = auth.uid();
end $$;

-- "Beat my tempo": a link fixed at my (unflagged) row's tempo and keys. Twenty a day.
create or replace function public.toneturn_phrase_beat_create(p_phrase uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  r public.toneturn_phrase_results;
  c text;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if me is null or public.toneturn_is_young(me) then raise exception 'not allowed'; end if;
  select * into r from public.toneturn_phrase_results x where x.phrase_id = p_phrase and x.user_id = me and not x.flagged;
  if r.phrase_id is null then return null; end if;
  if (select count(*) from public.toneturn_phrase_beats b where b.owner = me and b.created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many links today';
  end if;
  loop
    c := '';
    for i in 1..8 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.toneturn_phrase_beats b where b.code = c);
  end loop;
  insert into public.toneturn_phrase_beats (code, phrase_id, owner, bpm, keys) values (c, p_phrase, me, r.best_bpm, r.keys_clean);
  return c;
end $$;

create or replace function public.toneturn_phrase_beat_open(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b public.toneturn_phrase_beats;
begin
  if me is null then raise exception 'sign in first'; end if;
  select * into b from public.toneturn_phrase_beats x where x.code = upper(btrim(p_code)) and x.expires_at > now();
  if b.code is null or public.toneturn_blocked_either(b.owner, me) or not public.toneturn_phrase_visible(b.phrase_id, me) then return null; end if;
  return jsonb_build_object('from', public.toneturn_public_name(b.owner), 'bpm', b.bpm, 'keys', b.keys);
end $$;

-- ===================================================================== grants

revoke all on function public.toneturn_phrase_share(text, text, int, text, text, int, text, real, int, int, int, text, uuid, boolean) from public, anon;
revoke all on function public.toneturn_phrase_set_audio(uuid, text) from public, anon;
revoke all on function public.toneturn_phrase_get(text) from public, anon;
revoke all on function public.toneturn_phrase_board(uuid, text) from public, anon;
revoke all on function public.toneturn_phrase_result(uuid, int, int, real, text, text, int, int, boolean, text) from public, anon;
revoke all on function public.toneturn_phrase_react(uuid, text, boolean) from public, anon;
revoke all on function public.toneturn_phrase_report(uuid, uuid, text, text) from public, anon;
revoke all on function public.toneturn_phrase_reviews() from public, anon;
revoke all on function public.toneturn_phrase_review(text, uuid, uuid, text) from public, anon;
revoke all on function public.toneturn_phrase_gallery(text, int, int, text) from public, anon;
revoke all on function public.toneturn_phrase_feature(text) from public, anon;
revoke all on function public.toneturn_phrase_mine() from public, anon;
revoke all on function public.toneturn_phrase_delete(uuid) from public, anon;
revoke all on function public.toneturn_phrase_beat_create(uuid) from public, anon;
revoke all on function public.toneturn_phrase_beat_open(text) from public, anon;
grant execute on function public.toneturn_phrase_share(text, text, int, text, text, int, text, real, int, int, int, text, uuid, boolean) to authenticated;
grant execute on function public.toneturn_phrase_set_audio(uuid, text) to authenticated;
grant execute on function public.toneturn_phrase_get(text) to authenticated;
grant execute on function public.toneturn_phrase_board(uuid, text) to authenticated;
grant execute on function public.toneturn_phrase_result(uuid, int, int, real, text, text, int, int, boolean, text) to authenticated;
grant execute on function public.toneturn_phrase_react(uuid, text, boolean) to authenticated;
grant execute on function public.toneturn_phrase_report(uuid, uuid, text, text) to authenticated;
grant execute on function public.toneturn_phrase_reviews() to authenticated;
grant execute on function public.toneturn_phrase_review(text, uuid, uuid, text) to authenticated;
grant execute on function public.toneturn_phrase_gallery(text, int, int, text) to authenticated;
grant execute on function public.toneturn_phrase_feature(text) to authenticated;
grant execute on function public.toneturn_phrase_mine() to authenticated;
grant execute on function public.toneturn_phrase_delete(uuid) to authenticated;
grant execute on function public.toneturn_phrase_beat_create(uuid) to authenticated;
grant execute on function public.toneturn_phrase_beat_open(text) to authenticated;
-- the public link and its clip work without an account
revoke all on function public.toneturn_phrase_public(text) from public;
revoke all on function public.toneturn_phrase_audio_path(uuid) from public;
grant execute on function public.toneturn_phrase_public(text) to anon, authenticated;
grant execute on function public.toneturn_phrase_audio_path(uuid) to anon, authenticated;
revoke all on function public.toneturn_week_monday() from public;
grant execute on function public.toneturn_week_monday() to anon, authenticated;

-- ===================================================================== the clips bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('toneturn-phrase-clips', 'toneturn-phrase-clips', false, 400000, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/mpeg'])
on conflict (id) do nothing;

-- Writable by the sharer into their own folder, only for a phrase they own: <owner>/<phrase>.<ext>.
create or replace function public.toneturn_clip_writable(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|ogg|m4a)$'
    and split_part(p_name, '/', 1) = (select auth.uid())::text
    and exists (select 1 from public.toneturn_shared_phrases x
                where x.owner_id = (select auth.uid()) and x.id::text = split_part(split_part(p_name, '/', 2), '.', 1));
$$;
-- Readable by whoever may hear the phrase (toneturn_phrase_audio_path's rule).
create or replace function public.toneturn_clip_readable(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.toneturn_shared_phrases x
    where x.audio_path = p_name and (
      ((select auth.uid()) is not null and public.toneturn_phrase_visible(x.id, (select auth.uid())))
      or (x.visibility = 'public' and x.status = 'live' and coalesce(public.toneturn_age(x.owner_id), 0) >= 16)));
$$;
revoke all on function public.toneturn_clip_writable(text) from public, anon;
revoke all on function public.toneturn_clip_readable(text) from public;
grant execute on function public.toneturn_clip_writable(text) to authenticated;
grant execute on function public.toneturn_clip_readable(text) to anon, authenticated;

drop policy if exists "phrase clips: sharer writes" on storage.objects;
create policy "phrase clips: sharer writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'toneturn-phrase-clips' and public.toneturn_clip_writable(name));
drop policy if exists "phrase clips: sharer updates" on storage.objects;
create policy "phrase clips: sharer updates" on storage.objects for update to authenticated
  using (bucket_id = 'toneturn-phrase-clips' and public.toneturn_clip_writable(name))
  with check (bucket_id = 'toneturn-phrase-clips' and public.toneturn_clip_writable(name));
drop policy if exists "phrase clips: sharer deletes" on storage.objects;
create policy "phrase clips: sharer deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'toneturn-phrase-clips' and split_part(name, '/', 1) = (select auth.uid())::text);
drop policy if exists "phrase clips: who may hear reads" on storage.objects;
create policy "phrase clips: who may hear reads" on storage.objects for select to anon, authenticated
  using (bucket_id = 'toneturn-phrase-clips' and public.toneturn_clip_readable(name));
