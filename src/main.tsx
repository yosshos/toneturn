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
import { App } from './ui/App';
import { initPwa } from './pwa';

// Service worker (app shell, updates, push) only in production builds.
initPwa(import.meta.env.PROD);

createRoot(document.getElementById('root')!).render(<App />);
