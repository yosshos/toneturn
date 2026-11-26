-- ToneTurn: teacher phase 1a, review round 1 fixes (docs/SPEC-TEACHER-CLASS.he.md §10). Safe to re-run.
--  · M1: a studio has no peer layer, also for shared phrases: only its teacher shares "with the class" there, and a
--    student's line shared there (by an old client) is seen only by its owner and the teacher
--  · M4: the teacher's "young" flag uses the server's own age rule (toneturn_is_young)
--  · L5: archiving drops the assignment's unsent pushes, and an archived assignment takes no new submissions
--  · L6: the old lesson-only assign counts only live assignments toward the cap
--  · L8: deleting a class marks its students "left" with the teacher when they have no other class of theirs

create or replace function public.toneturn_phrase_studio_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.visibility = 'class' and new.class_id is not null and exists (
    select 1 from public.toneturn_classes c where c.id = new.class_id and c.kind = 'studio' and c.teacher <> new.owner_id) then
    raise exception 'class: studio';
  end if;
  return new;
end $$;
drop trigger if exists toneturn_phrase_studio_guard on public.toneturn_shared_phrases;
create trigger toneturn_phrase_studio_guard before insert or update of visibility, class_id on public.toneturn_shared_phrases
for each row execute function public.toneturn_phrase_studio_guard();

create or replace function public.toneturn_phrase_visible(p_phrase uuid, p_viewer uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  p public.toneturn_shared_phrases;
  studio_peer boolean;
begin
  select * into p from public.toneturn_shared_phrases x where x.id = p_phrase;
  if p.id is null or p_viewer is null then return false; end if;
  if p.owner_id = p_viewer then return p.status <> 'removed'; end if;
  if p.status <> 'live' or public.toneturn_blocked_either(p.owner_id, p_viewer) then return false; end if;
  -- in a studio, classmates are strangers: only the teacher and the teacher's own lines cross between them
  studio_peer := exists (select 1 from public.toneturn_classes c where c.id = p.class_id and c.kind = 'studio'
                         and c.teacher <> p_viewer and c.teacher <> p.owner_id);
  return case p.visibility
    when 'public' then not public.toneturn_is_young(p_viewer) or public.toneturn_are_friends(p.owner_id, p_viewer) or (public.toneturn_in_class(p.class_id, p_viewer) and not studio_peer)
    when 'friends' then public.toneturn_are_friends(p.owner_id, p_viewer)
    else public.toneturn_in_class(p.class_id, p_viewer) and not studio_peer end;
end $$;

create or replace function public.toneturn_class_archive(p_assignment uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.toneturn_class_assignments a set archived_at = case when p_on then now() end
  where a.id = p_assignment and exists (select 1 from public.toneturn_classes c where c.id = a.class_id and c.teacher = (select auth.uid()));
  if not found then raise exception 'not your assignment'; end if;
  if p_on then
    delete from public.toneturn_class_push_queue q where q.assignment_id = p_assignment and q.sent_at is null;
  end if;
end $$;

create or replace function public.toneturn_class_submit(p_assignment uuid, p_score real, p_minutes integer, p_metrics jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  sid uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  if not exists (
    select 1 from public.toneturn_class_assignments a join public.toneturn_class_members m on m.class_id = a.class_id
    where a.id = p_assignment and m.user_id = me and a.archived_at is null and (a.student_id is null or a.student_id = me)) then raise exception 'not your assignment'; end if;
  if (select count(*) from public.toneturn_class_submissions s where s.assignment_id = p_assignment and s.user_id = me) >= 50 then
    raise exception 'too many submissions';
  end if;
  insert into public.toneturn_class_submissions (assignment_id, user_id, score, minutes, metrics)
  values (p_assignment, me, greatest(0, least(1, p_score)), greatest(0, least(600, coalesce(p_minutes, 0))), coalesce(p_metrics, '{}'::jsonb))
  returning id into sid;
  return sid;
end $$;

create or replace function public.toneturn_class_assign(p_class uuid, p_lesson text, p_due date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  aid uuid;
begin
  if not exists (select 1 from public.toneturn_classes c where c.id = p_class and c.teacher = me) then raise exception 'not your class'; end if;
  if (select count(*) from public.toneturn_class_assignments a where a.class_id = p_class and a.archived_at is null) >= 100 then raise exception 'too many assignments'; end if;
  insert into public.toneturn_class_assignments (class_id, lesson_id, due_on) values (p_class, p_lesson, p_due) returning id into aid;
  return aid;
end $$;

create or replace function public.toneturn_enroll_on_class_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.toneturn_teacher_students e set status = 'left', updated_at = now()
  where e.teacher = old.teacher
    and e.student in (select m.user_id from public.toneturn_class_members m where m.class_id = old.id)
    and not exists (select 1 from public.toneturn_class_members m join public.toneturn_classes c on c.id = m.class_id
                    where c.teacher = old.teacher and c.id <> old.id and m.user_id = e.student);
  return old;
end $$;
drop trigger if exists toneturn_enroll_on_class_delete on public.toneturn_classes;
create trigger toneturn_enroll_on_class_delete before delete on public.toneturn_classes for each row execute function public.toneturn_enroll_on_class_delete();

-- class_detail: the "young" flag by the server's own rule (unknown age counts as young here, §6.4)
do $$
declare
  d text := pg_get_functiondef('public.toneturn_class_detail(uuid)'::regprocedure);
begin
  if position('''young'', (p.birth_year is null' in d) > 0 then
    d := replace(d, '''young'', (p.birth_year is null or p.birth_year > extract(year from now())::int - 13)',
                    '''young'', (p.birth_year is null or public.toneturn_is_young(m.user_id))');
    execute d;
  end if;
end $$;
