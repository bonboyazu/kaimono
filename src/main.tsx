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

// 2本の指で広げる拡大を止める（iPhone は viewport の指定だけでは止まらない）
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
