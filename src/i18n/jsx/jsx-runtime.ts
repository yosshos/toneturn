// The app's JSX runtime (vite.config.ts jsxImportSource): React's own, with one step in front for the translated
// locales (src/i18n/translate.ts): on a DOM element, a text child and the readable attributes (aria-label, title,
// placeholder, alt…) pass through translate(). Components get their props untouched; their text is translated where it
// finally lands on an element. Hebrew and English never enter the step (active() is false).
import * as R from 'react/jsx-runtime';
// Reached through globalThis, not an import: the dev server pre-bundles a JSX runtime as a dependency, which would give
// it its own copy of the translator's state. src/i18n/translate.ts installs the hook.
type Hook = { on: boolean; t: (s: string) => string };
const hook = (): Hook | undefined => (globalThis as { __ttI18n?: Hook }).__ttI18n;
const active = () => !!hook()?.on;
const translate = (s: string) => hook()!.t(s);

export const Fragment = R.Fragment;
const ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'label'] as const;

const kids = (c: unknown): unknown => (typeof c === 'string' ? translate(c) : Array.isArray(c) ? (c.some((x) => typeof x === 'string') ? c.map((x) => (typeof x === 'string' ? translate(x) : x)) : c) : c);

export function tr(type: unknown, props: Record<string, unknown>): Record<string, unknown> {
  // translate="no" (the HTML attribute): a language's own name, a song title… stays as written
  if (typeof type !== 'string' || !active() || !props || props.translate === 'no') return props;
  let out: Record<string, unknown> | null = null;
  const set = (k: string, v: unknown) => {
    if (v === props[k]) return;
    out ??= { ...props };
    out[k] = v;
  };
  if ('children' in props) set('children', kids(props.children));
  for (const a of ATTRS) if (typeof props[a] === 'string') set(a, translate(props[a] as string));
  return out ?? props;
}

export function jsx(type: unknown, props: Record<string, unknown>, key?: string): unknown {
  return (R.jsx as (t: unknown, p: unknown, k?: string) => unknown)(type, tr(type, props), key);
}
export function jsxs(type: unknown, props: Record<string, unknown>, key?: string): unknown {
  return (R.jsxs as (t: unknown, p: unknown, k?: string) => unknown)(type, tr(type, props), key);
}
export type { JSX } from 'react/jsx-runtime';
