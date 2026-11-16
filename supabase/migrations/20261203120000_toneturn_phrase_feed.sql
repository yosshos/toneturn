-- Encore (SPEC-PHRASE-STUDIO §8.5): "the phrase is yours" in friends' activity. NOT RUN by the agent — the owner
-- dry-runs and applies it. Adds the 'phrase' kind to toneturn_activity (payload: grade, bpm, inst — never the phrase's
-- name or notes). toneturn_post_activity (20261130120000_toneturn_social_round.sql) is unchanged: it already skips young
-- players and "feed" off, returns the first post for the same payload within 14 days, and caps 20 posts a day.
--
-- After applying: build the client with VITE_PHRASE_FEED=1 (or set localStorage "tt.flag.phraseFeed" = "1" on a test
-- device) — until then the client never posts the kind (cloud/community.ts PHRASE_FEED).

alter table public.toneturn_activity drop constraint if exists toneturn_activity_kind_check;
alter table public.toneturn_activity add constraint toneturn_activity_kind_check
  check (kind in ('unit', 'rank', 'badge', 'streak', 'duet', 'best', 'level', 'standard', 'quest', 'phrase'));
