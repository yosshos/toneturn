-- ToneTurn: the optional sync of a recording's NOTES across the player's own devices (SPEC-PHRASE-STUDIO §6.2 "לסנכרן
-- תווים", §18 v2 "optional sync of notes"). Additive; safe to re-run. NOT APPLIED BY THE AGENT — the owner dry-runs it.
-- After applying it, the client is still off until VITE_TAKE_NOTES_SYNC=1 at build time (or the localStorage flag
-- "tt.flag.takeNotes" = "1" on one device), and then only for a player who turned on the switch in Settings → My
-- recordings. See src/cloud/takeNotes.ts.
--  · Owner-only rows: nobody else can read them (no friends, no class, no admin path).
--  · Never audio: the row holds the packed notes (base64, ~6 bytes a note; ≤ 64 KB ≈ 8 000 notes) and the small
--    metadata a second device needs to list and play the take (title, date, instrument, tempo, meter, chart, star,
--    folder, linked phrases). Only starred / foldered / phrase-linked takes are sent (the client chooses).
--  · ≤ 300 rows per player (a trigger refuses more); a deleted take is a tombstone (deleted_at) so other devices drop it.

create table if not exists public.toneturn_take_notes (
  user_id     uuid not null references auth.users (id) on delete cascade,
  take_id     text not null check (char_length(take_id) between 1 and 80),
  at          timestamptz not null,
  title       text not null check (char_length(title) <= 200),
  course      text check (course is null or char_length(course) <= 24),
  instrument  text not null check (instrument in ('piano', 'guitar', 'bass', 'voice', 'drums')),
  kind        text not null check (char_length(kind) <= 24),
  source      text not null check (source in ('midi', 'mic', 'screen')),
  sung        boolean not null default false,
  duration_ms integer not null default 0 check (duration_ms between 0 and 36000000),
  bpm         real check (bpm is null or (bpm > 0 and bpm <= 1000)),
  meter       smallint check (meter is null or meter between 1 and 16),
  t0          real,
  chart       text check (chart is null or char_length(chart) <= 2000),
  notes       text not null check (char_length(notes) <= 65536),
  star        boolean not null default false,
  folder      text check (folder is null or char_length(folder) <= 60),
  phrase_ids  text[] not null default '{}' check (cardinality(phrase_ids) <= 32),
  deleted_at  timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, take_id)
);
create index if not exists toneturn_take_notes_updated on public.toneturn_take_notes (user_id, updated_at);

alter table public.toneturn_take_notes enable row level security;
revoke all on public.toneturn_take_notes from anon;
grant select, insert, update, delete on public.toneturn_take_notes to authenticated;

drop policy if exists "take notes: own read" on public.toneturn_take_notes;
create policy "take notes: own read" on public.toneturn_take_notes for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "take notes: own insert" on public.toneturn_take_notes;
create policy "take notes: own insert" on public.toneturn_take_notes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "take notes: own update" on public.toneturn_take_notes;
create policy "take notes: own update" on public.toneturn_take_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "take notes: own delete" on public.toneturn_take_notes;
create policy "take notes: own delete" on public.toneturn_take_notes for delete to authenticated using ((select auth.uid()) = user_id);

-- at most 300 rows a player (tombstones included; the client purges tombstones older than 30 days)
create or replace function public.toneturn_take_notes_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- an upsert of a row that exists is an update (BEFORE INSERT fires before the conflict check)
  if exists (select 1 from public.toneturn_take_notes t where t.user_id = new.user_id and t.take_id = new.take_id) then
    return new;
  end if;
  if (select count(*) from public.toneturn_take_notes t where t.user_id = new.user_id) >= 300 then
    raise exception 'take notes: limit reached' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.toneturn_take_notes_cap() from public, anon, authenticated;
drop trigger if exists toneturn_take_notes_cap on public.toneturn_take_notes;
create trigger toneturn_take_notes_cap before insert on public.toneturn_take_notes
  for each row execute function public.toneturn_take_notes_cap();

-- the server's clock decides updated_at (the client's "since" cursor reads it back)
create or replace function public.toneturn_take_notes_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists toneturn_take_notes_touch on public.toneturn_take_notes;
create trigger toneturn_take_notes_touch before insert or update on public.toneturn_take_notes
  for each row execute function public.toneturn_take_notes_touch();
