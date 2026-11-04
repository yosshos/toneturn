-- ToneTurn 0.8: scoring model J — partial XP for retries / revealed items, speed bonus up to 3.
-- Plausibility: at most 20 XP per item (15 base for singing + 3 speed bonus, with margin).
alter table public.toneturn_lesson_results drop constraint if exists xp_plausible;
alter table public.toneturn_lesson_results add constraint xp_plausible check (xp <= total * 20);
