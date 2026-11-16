-- ToneTurn: teacher phrase assignments (Encore v2, SPEC-PHRASE-STUDIO §11, §12.3). Additive; safe to re-run.
-- NOT APPLIED BY THE AGENT — the owner dry-runs it first. Until it is applied the client sends a phrase as a 'piece'
-- assignment whose ref is the phrase code (≤ 2000 chars, no audio); after applying it, set PHRASE_ASSIGN_SYNCED = true
-- in src/cloud/teacher.ts.
--  · A new assignment kind 'phrase'. Its ref is the phrase code ("phrase1:" + JSON; notes packed as base64url, chords, plan),
--    ≤ 4 KB for 16 bars (§11.4); the ref limit grows to 6000 chars for phrases only (other kinds keep 2000).
--  · Submission metrics grow to 8 KB (a phrase submission may carry the student's best take as packed notes ≤ 4 KB).
--  · The teacher's audio of the phrase (optional, ≤ 30 s / 300 KB) in a private bucket "toneturn-assign-audio": the
--    path starts with the class id; the class's teacher writes, the teacher and the class's students read (signed URLs).
-- Grading stays as it is: the client grades phrase submissions automatically by the strictness and the teacher's
-- comment / mark (toneturn_class_comment) is the override (owner decision §20.9).

do $$ begin
  alter table public.toneturn_class_assignments drop constraint if exists toneturn_assign_kind;
  alter table public.toneturn_class_assignments add constraint toneturn_assign_kind
    check (kind in ('lesson', 'topic', 'drill', 'chart', 'piece', 'phrase'));
end $$;

do $$ begin
  alter table public.toneturn_class_assignments drop constraint if exists toneturn_assign_ref;
  alter table public.toneturn_class_assignments add constraint toneturn_assign_ref
    check (ref is null or char_length(ref) <= case when kind = 'phrase' then 6000 else 2000 end);
end $$;

do $$
declare c text;
begin
  -- the inline check on metrics (pg_column_size(metrics) <= 4096) from 20261125000000 has a generated name
  for c in
    select con.conname from pg_constraint con
    where con.conrelid = 'public.toneturn_class_submissions'::regclass and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%pg_column_size(metrics)%'
  loop
    execute format('alter table public.toneturn_class_submissions drop constraint %I', c);
  end loop;
  alter table public.toneturn_class_submissions add constraint toneturn_submission_metrics_size check (pg_column_size(metrics) <= 8192);
exception when duplicate_object then null;
end $$;

-- the teacher's audio
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('toneturn-assign-audio', 'toneturn-assign-audio', false, 300000, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/mpeg'])
on conflict (id) do nothing;

/** Whether the signed-in user teaches the class named by a storage path's first segment. */
create or replace function public.toneturn_teaches_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.toneturn_classes c
    where c.teacher = (select auth.uid()) and c.id::text = split_part(p_name, '/', 1));
$$;
/** Whether the signed-in user teaches or belongs to the class named by a storage path's first segment. */
create or replace function public.toneturn_in_path_class(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.toneturn_teaches_path(p_name) or exists (
    select 1 from public.toneturn_class_members m
    where m.user_id = (select auth.uid()) and m.class_id::text = split_part(p_name, '/', 1));
$$;
revoke all on function public.toneturn_teaches_path(text) from public, anon;
revoke all on function public.toneturn_in_path_class(text) from public, anon;
grant execute on function public.toneturn_teaches_path(text) to authenticated;
grant execute on function public.toneturn_in_path_class(text) to authenticated;

drop policy if exists "assign audio: teacher writes" on storage.objects;
create policy "assign audio: teacher writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'toneturn-assign-audio' and name ~ '^[0-9a-f-]{36}/[a-z0-9]{6,40}\.(webm|ogg|m4a)$' and public.toneturn_teaches_path(name));
drop policy if exists "assign audio: teacher deletes" on storage.objects;
create policy "assign audio: teacher deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'toneturn-assign-audio' and public.toneturn_teaches_path(name));
drop policy if exists "assign audio: class reads" on storage.objects;
create policy "assign audio: class reads" on storage.objects for select to authenticated
  using (bucket_id = 'toneturn-assign-audio' and public.toneturn_in_path_class(name));
