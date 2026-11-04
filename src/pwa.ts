// PWA shell state: install prompt, service-worker updates, push subscription. Small observable store.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** Browser offered installation (Chrome/Edge/Android). */
  canInstall: boolean;
  /** Running as an installed app. */
  installed: boolean;
  /** iOS Safari: install is manual via Share → Add to Home Screen. */
  iosManual: boolean;
  /** A new version is downloaded and waiting. */
  updateReady: boolean;
  checking: boolean;
  lastChecked: number | null;
  swSupported: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
let reg: ServiceWorkerRegistration | null = null;
/** Set only when the player chose "Update now"; first-time activation must not reload. */
let updateRequested = false;
const listeners = new Set<() => void>();

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

let state: PwaState = {
  canInstall: false,
  installed: typeof window !== 'undefined' && isStandalone(),
  iosManual: typeof window !== 'undefined' && isIos() && !isStandalone(),
  updateReady: false,
  checking: false,
  lastChecked: null,
  swSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
};

function set(p: Partial<PwaState>) {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}
export const pwa = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get: () => state,
};

export function initPwa(register: boolean) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    set({ canInstall: false, installed: true });
  });
  if (!register || !('serviceWorker' in navigator)) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !updateRequested) return;
    reloading = true;
    location.reload();
  });
  void navigator.serviceWorker.register('/sw.js').then((r) => {
    reg = r;
    const watch = (w: ServiceWorker | null) => {
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) set({ updateReady: true });
      });
    };
    if (r.waiting && navigator.serviceWorker.controller) set({ updateReady: true });
    watch(r.installing);
    r.addEventListener('updatefound', () => watch(r.installing));
    // Check again every hour while the app is open.
    setInterval(() => void checkForUpdate(), 60 * 60 * 1000);
  });
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  set({ canInstall: false });
  return outcome;
}

export async function checkForUpdate(): Promise<boolean> {
  if (!reg) return false;
  set({ checking: true });
  try {
    // update() can stay pending (slow network, worker still installing) — never leave the UI stuck.
    await Promise.race([reg.update(), new Promise((r) => setTimeout(r, 8000))]);
  } catch {
    /* offline */
  }
  // give the new worker a moment to install
  await new Promise((r) => setTimeout(r, 1500));
  const ready = !!reg.waiting;
  set({ checking: false, lastChecked: Date.now(), updateReady: ready || state.updateReady });
  return ready;
}

/** Activate the waiting version; the page reloads on controllerchange. Call only outside a lesson. */
export function applyUpdate() {
  if (!reg?.waiting) return;
  updateRequested = true;
  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
}

export const swRegistration = () => reg;
