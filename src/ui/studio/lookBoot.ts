// The studio look switch at startup: <html data-look="studio"> from ?look=studio or localStorage tt.look ('classic' turns
// it off). Leaves an attribute another module already set alone. Side-effect only; main.tsx calls it first.

export function bootStudioLook(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  let want: string | null = null;
  try {
    want = new URLSearchParams(location.search).get('look');
    if (want) localStorage.setItem('tt.look', want);
    else want = localStorage.getItem('tt.look');
  } catch {
    /* storage blocked */
  }
  if (want === 'studio') root.dataset.look = 'studio';
  else if (want === 'classic' && root.dataset.look === 'studio') delete root.dataset.look;
}
