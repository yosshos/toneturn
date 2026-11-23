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
// GUITAR-AUDIT: chord boxes, the tab's finger row, the neck's string names (Paper tones inside).
import './guitar.css';
// SPEC-STYLE-FOCUS: the style chips, the "My styles" strip, the taster and preference cards.
import './stylefocus.css';
import { App } from './ui/App';
import { BrandSplash } from './ui/brand/Splash';
// The studio layer (redesign stage 1): after every other stylesheet, including those App's modules import.
import './studio.css';
import { initPwa } from './pwa';
import { installPartner } from './partner';
import { installIconTaps } from './ui/paper/motion';
// Last: the studio screens and the studio game frame.
import './studio-screens.css';
import './studio-games.css';
import './studio-elements.css';
// The remaining screens and the sweep of the base sheets; last, so its by-hand rules win.
import './studio-rest.css';

// Service worker (app shell, updates, push) only in production builds.
initPwa(import.meta.env.PROD);

// A partner build (VITE_PARTNER) paints its tokens before the first render; the normal app: no-op.
installPartner();

// Icon micro-animations: pressing a control with an icon plays the icon's motion (one listener; off in exercises).
installIconTaps();

// Dev-only: the Paper icon gallery (#/dev/glyphs), outside the app shell.
if (import.meta.env.DEV && location.hash.startsWith('#/dev/glyphs')) {
  void import('./ui/paper/Gallery').then(({ PaperGallery }) => createRoot(document.getElementById('root')!).render(<PaperGallery />));
} else if (import.meta.env.DEV && location.hash.startsWith('#/dev/toni')) {
  // Dev-only: the Paper Toni gallery (#/dev/toni), every state animated, light and dark.
  void import('./ui/ToniGallery').then(({ ToniGallery }) => createRoot(document.getElementById('root')!).render(<ToniGallery />));
} else if (import.meta.env.DEV && location.hash.startsWith('#/dev/elements')) {
  // Dev-only: the studio design elements (#/dev/elements), for screenshots.
  void import('./ui/studio/ElementsGallery').then(({ ElementsGallery }) => createRoot(document.getElementById('root')!).render(<ElementsGallery />));
} else {
  // The opening animation is a sibling overlay: the app starts underneath, untouched.
  createRoot(document.getElementById('root')!).render(
    <>
      <App />
      <BrandSplash />
    </>,
  );
}
