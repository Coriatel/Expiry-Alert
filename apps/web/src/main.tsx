import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './i18n';
import './index.css';

// A new version used to wait until every window of the app was closed, which an
// installed app on Android rarely is. Switch to it the next time the app is put
// away, so an open form is never reloaded under the user.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const apply = () => {
      if (document.visibilityState === 'hidden') void updateSW(true);
    };
    apply();
    document.addEventListener('visibilitychange', apply);
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegistered(registration) {
    console.log('Service worker registered:', registration);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration?.update();
    });
  },
  onRegisterError(error) {
    console.error('Service worker registration error:', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
