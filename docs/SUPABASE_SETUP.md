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
