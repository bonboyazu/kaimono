import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { checkForUpdate, setRegistration } from './data/appUpdate.ts';
import './ui/app.css';

registerSW({ immediate: true, onRegisteredSW: (_url, r) => setRegistration(r) });
// ホーム画面のアプリは閉じても裏に残るので、前に出るたびに新しい版を確かめる
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void checkForUpdate();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
