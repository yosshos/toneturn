-- Class notifications (SPEC-CLASS-NOTIFICATIONS, migration 20261214000000): every 5 minutes, only the class path of
-- the toneturn-streak-reminder Edge Function (merged student pushes once a burst settles; the teacher's digest hour).
-- The hourly job keeps running everything else. Applied 2026-11-26.
select cron.schedule(
  'toneturn-class-push',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://jgmahngenrpqnvbvpztf.supabase.co/functions/v1/toneturn-streak-reminder',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'toneturn_cron_secret')
    ),
    body := '{"class": true}'::jsonb
  );
  $$
);
