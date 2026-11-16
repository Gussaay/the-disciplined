import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { registerSW } from 'virtual:pwa-register';

import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { LangProvider } from './i18n';
import { ToastProvider } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#0F3D3E' }).catch(() => {});
  // A service worker must not run inside the native WebView (it would keep
  // serving the old bundle after an app update). Remove any left-overs.
  navigator.serviceWorker?.getRegistrations?.().then((regs) => regs.forEach((r) => r.unregister()));
} else {
  // The web app updates itself quietly: a new release is fetched in the
  // background and used from the next visit.
  registerSW({ immediate: true });
}

// BASE_URL is "/" on Firebase Hosting and in the Android app, and
// "/the-disciplined/" on GitHub Pages.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <LangProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </LangProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
