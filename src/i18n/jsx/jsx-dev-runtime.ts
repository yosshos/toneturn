// Dev build of src/i18n/jsx/jsx-runtime.ts (same step in front of React's jsxDEV).
import * as R from 'react/jsx-dev-runtime';
import { tr } from './jsx-runtime';

export const Fragment = R.Fragment;
export function jsxDEV(type: unknown, props: Record<string, unknown>, key: string | undefined, isStatic: boolean, source?: unknown, self?: unknown): unknown {
  return (R.jsxDEV as (...a: unknown[]) => unknown)(type, tr(type, props), key, isStatic, source, self);
}
export type { JSX } from 'react/jsx-dev-runtime';
