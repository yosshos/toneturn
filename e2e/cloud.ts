import { existsSync, readFileSync } from 'node:fs';

// Some screens only ask to sign in when the build has the cloud config (VITE_SUPABASE_URL, from .env.local; without it
// they say "not available in this build"). A checkout without that file (an agent's worktree, CI without secrets)
// cannot run those checks: they skip with this reason instead of failing.

const fromFiles = (): string => {
  for (const f of ['.env.local', '.env']) {
    if (!existsSync(f)) continue;
    const m = /^VITE_SUPABASE_URL=(.+)$/m.exec(readFileSync(f, 'utf8'));
    if (m && m[1].trim()) return m[1].trim();
  }
  return '';
};

/** True when the dev server's build has a cloud URL. */
export const cloudConfigured = (): boolean => !!(process.env.VITE_SUPABASE_URL || fromFiles());

export const NO_CLOUD = 'needs the cloud config (VITE_SUPABASE_URL in .env.local); this checkout has none';
