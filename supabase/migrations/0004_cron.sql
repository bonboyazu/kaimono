-- 毎朝のセールの通知：15分おきに daily-sale-push を呼ぶ
-- URL と secret key は Vault（project_url・secret_key）から読む
select cron.schedule(
  'daily-sale-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'project_url'), '/')
      || '/functions/v1/daily-sale-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
