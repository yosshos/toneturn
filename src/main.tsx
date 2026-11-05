import { createRoot } from 'react-dom/client';
import '@fontsource-variable/rubik';
import './styles.css';
import './games.css';
import './menu.css';
import './features.css';
import './vocal.css';
import './tournament.css';
import { App } from './ui/App';
import { initPwa } from './pwa';

// Service worker (app shell, updates, push) only in production builds.
initPwa(import.meta.env.PROD);

createRoot(document.getElementById('root')!).render(<App />);
