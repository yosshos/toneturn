-- Run once in the SQL Editor AFTER deploying the toneturn-streak-reminder Edge Function.
-- Replace the CRON_SECRET placeholder in the vault line below with the same value as the function secret.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Keep the secret in Vault rather than in the job text.
select vault.create_secret('<CRON_SECRET>', 'toneturn_cron_secret');

select cron.schedule(
  'toneturn-streak-reminder',
  '0 * * * *', -- every hour on the hour; the function picks subscribers whose local reminder hour is now
  $$
  select net.http_post(
    url := 'https://jgmahngenrpqnvbvpztf.supabase.co/functions/v1/toneturn-streak-reminder',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'toneturn_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
