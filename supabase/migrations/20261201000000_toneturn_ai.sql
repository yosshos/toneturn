-- The AI coach and "Explain more" (docs/SPEC-AI.he.md §9): a shared cache of first-turn explanations, and per-player
-- daily usage for the caps. Only the toneturn-ai edge function (service role) reads and writes them: RLS on, no policies.

create table if not exists public.toneturn_ai_cache (
  key text primary key,
  kind text not null,
  body jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.toneturn_ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null,
  n integer not null default 0,
  primary key (user_id, day, kind)
);

alter table public.toneturn_ai_cache enable row level security;
alter table public.toneturn_ai_usage enable row level security;
