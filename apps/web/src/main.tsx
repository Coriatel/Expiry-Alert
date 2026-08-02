import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './i18n';
import './index.css';

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegistered(registration) {
    console.log('Service worker registered:', registration);
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
