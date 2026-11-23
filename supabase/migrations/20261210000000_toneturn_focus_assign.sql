-- ToneTurn: a teacher's style-focus suggestion as its own assignment kind (SPEC-STYLE-FOCUS §3). Additive; safe to re-run.
-- NOT APPLIED BY THE AGENT — the owner dry-runs it first. Until it is applied the client sends a focus suggestion as a
-- 'piece' assignment whose ref is "focus:<course>:<main>+<also>…" (≤ 60 chars) and reads it back as kind 'focus', so
-- the feature already works on today's server; after applying it, set FOCUS_ASSIGN_SYNCED = true in src/cloud/teacher.ts.
--  · Adds 'focus' to the assignment kind check. The ref limit stays 2000 (a focus ref is tiny); phrases keep 6000.

do $$ begin
  alter table public.toneturn_class_assignments drop constraint if exists toneturn_assign_kind;
  alter table public.toneturn_class_assignments add constraint toneturn_assign_kind
    check (kind in ('lesson', 'topic', 'drill', 'chart', 'piece', 'phrase', 'focus'));
end $$;
