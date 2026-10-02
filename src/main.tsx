import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initDisableZoom } from './utils/disableZoom';

initDisableZoom();

try {
  const raw = localStorage.getItem('sleetpos_settings_v1');
  if (raw) {
    const s = JSON.parse(raw);
    if (s.themeMode === 'light') {
      document.documentElement.classList.add('light');
    }
  }
} catch {}

createRoot(document.getElementById('root')!).render(<App />);
