import { createRoot } from 'react-dom/client';
import '@fontsource-variable/rubik';
import '@fontsource/secular-one';
import '@fontsource/noto-music';
import './styles.css';
import './games.css';
import './menu.css';
import './features.css';
import './vocal.css';
import './tournament.css';
import './arcade.css';
import './stats.css';
import './games2.css';
import './path.css';
import './profile.css';
import './metronome.css';
import './motion.css';
import './peak.css';
import './drills.css';
import './themes.css';
import './desktop.css';
import './onboarding.css';
import './teacher.css';
import './mature.css';
import './desktop2.css';
import './v2.css';
import './drums.css';
import './coursestart.css';
import './pulse.css';
import './feedback.css';
import './feedback2.css';
import './practice.css';
import { App } from './ui/App';
// The studio look layer (redesign stage 1): after every other stylesheet, including those App's modules import.
import './studio.css';
import { applyStartupLook } from './ui/look';
import { initPwa } from './pwa';
import { installPartner } from './partner';
import { installIconTaps } from './ui/paper/motion';

// The look (classic / studio): index.html already painted it; this keeps it right if that snippet could not run.
applyStartupLook();

// Service worker (app shell, updates, push) only in production builds.
initPwa(import.meta.env.PROD);

// A partner build (VITE_PARTNER) paints its tokens before the first render; the normal app: no-op.
installPartner();

// Icon micro-animations: pressing a control with an icon plays the icon's motion (one listener; off in exercises).
installIconTaps();

// Dev-only: the Paper icon gallery (#/dev/glyphs), outside the app shell.
if (import.meta.env.DEV && location.hash.startsWith('#/dev/glyphs')) {
  void import('./ui/paper/Gallery').then(({ PaperGallery }) => createRoot(document.getElementById('root')!).render(<PaperGallery />));
} else {
  createRoot(document.getElementById('root')!).render(<App />);
}
