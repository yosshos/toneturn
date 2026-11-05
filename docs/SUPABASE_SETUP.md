# Supabase setup (manual, free project)

ToneTurn works fully without this. These steps turn on optional cloud save with Google sign-in.

## 1. Create the project
1. In the Supabase account with the new **Free** organization: **New project** → name `toneturn`, region **Frankfurt (eu-central-1)**, set a database password (keep it to yourself).
2. Wait until the project is ready.

## 2. Create the tables
1. Open **SQL Editor** → **New query**.
2. Paste the whole contents of [`supabase/migrations/20261104000000_toneturn_init.sql`](../supabase/migrations/20261104000000_toneturn_init.sql) and press **Run**. It should finish with "Success. No rows returned".
3. Optional check: **Advisors → Security Advisor** should show no errors for `toneturn_*` tables.

## 3. Send these two values (safe to share)
- **Project URL** — Project Settings → Data API (looks like `https://abcd1234.supabase.co`)
- **Publishable key** — Project Settings → API Keys (starts with `sb_publishable_`; the legacy `anon` key also works)

Never share the `service_role` / secret key or the database password.

## 4. Google sign-in
1. **Google Cloud Console** → APIs & Services → Credentials → **Create credentials → OAuth client ID** → type **Web application**.
   - If asked, configure the OAuth consent screen first (External, app name ToneTurn, your email).
   - **Authorized redirect URI**: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Copy the **Client ID** and **Client secret**.
3. Supabase → **Authentication → Sign In / Providers → Google** → enable, paste both, save.
4. Supabase → **Authentication → URL Configuration**:
   - Site URL: `http://localhost:5173` (change to the real domain when deployed)
   - Redirect URLs: add `http://localhost:5173` and `http://localhost:5173/**`

## 5. App config
Create `.env.local` in the project root (not committed):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Restart `npm run dev`. A **Sign in with Google** card appears on the home screen and in Settings.


---

# Part 2 — Friends and streak reminders (v0.5.0)

## 6. Run the second SQL file
SQL Editor → New query → paste all of [`supabase/migrations/20261105000000_toneturn_friends_push.sql`](../supabase/migrations/20261105000000_toneturn_friends_push.sql) → **Run**.
This adds friend codes, friend requests, self-reported game bests, push subscriptions, and the server functions that compute weekly XP and streaks. Friends works as soon as this has run.

## 7. Deploy the reminder function
1. Supabase → **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly `toneturn-streak-reminder`.
3. Replace the code with the contents of [`supabase/functions/toneturn-streak-reminder/index.ts`](../supabase/functions/toneturn-streak-reminder/index.ts) and **Deploy**.
4. In the function's settings turn **off** "Verify JWT" (the hourly job authenticates with a secret header instead).

## 8. Add the function secrets
Edge Functions → **Secrets** → add:

| Name | Value |
| --- | --- |
| `VAPID_PUBLIC_KEY` | `publicKey` from `.vapid.local.json` in the project folder |
| `VAPID_PRIVATE_KEY` | `privateKey` from `.vapid.local.json` (never share or commit it) |
| `VAPID_SUBJECT` | `mailto:` + your email, e.g. `mailto:you@example.com` |
| `CRON_SECRET` | any long random string you make up |

## 9. Schedule it hourly
SQL Editor → paste [`supabase/cron_streak_reminder.sql`](../supabase/cron_streak_reminder.sql), replace `<CRON_SECRET>` with the same value as above, **Run**.
Each hour the function sends a reminder to subscribers whose chosen local hour has come, who have a streak and haven't practised yet today.

## 10. Where push works
- Push needs the **production build** (service worker): `npm run build` then `npm run preview`, or the deployed site — not `npm run dev`.
- iPhone/iPad: only after installing to the Home Screen.


## Duel notifications (0.28, migration 19)

1. SQL Editor → run [`supabase/migrations/20261119000000_toneturn_duel_push.sql`](../supabase/migrations/20261119000000_toneturn_duel_push.sql). It needs `pg_net` and the Vault secret `toneturn_cron_secret`, both created for the streak reminders.
2. Edge Functions → `toneturn-streak-reminder` → replace the code with [`supabase/functions/toneturn-streak-reminder/index.ts`](../supabase/functions/toneturn-streak-reminder/index.ts) → **Deploy** (keep "Verify JWT" off; the function checks the cron secret).
3. Check: a duel where both friends allowed notifications — the friend gets "You were challenged" when you finish your round, and you get the result when they play.
