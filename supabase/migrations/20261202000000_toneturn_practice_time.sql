-- AUDIT-5 #1 and #3: a lesson result's measured practice time and the player's note, so both reach a second device.
-- Additive only: two nullable columns, no change to existing rows or checks. NOT APPLIED — dry-run first.
-- After it is applied, set RESULT_EXTRAS_SYNCED = true in src/cloud/cloud.ts so the client reads and writes them.

alter table public.toneturn_lesson_results
  add column if not exists duration_ms integer check (duration_ms is null or duration_ms between 0 and 36000000),
  add column if not exists note text check (note is null or char_length(note) <= 500);
