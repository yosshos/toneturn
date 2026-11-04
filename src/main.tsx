import { createRoot } from 'react-dom/client';
import '@fontsource-variable/rubik';
import './styles.css';
import './games.css';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(<App />);

// App-shell service worker for offline loading (production builds only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
