// Firebase is optional. With no VITE_FIREBASE_* values the app runs entirely on
// the device; with them it adds accounts, cloud backup across devices and the
// server-side AI function (same services as the Easy Pedia app: Auth, Realtime
// Database, Functions, Hosting).
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const cloudEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);

export const app = cloudEnabled ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

// Inside the native WebView getAuth() loads the web popup iframe, which hangs
// in Capacitor, so only persistent stores are set up there.
function createAuth() {
  if (!app) return null;
  if (!Capacitor.isNativePlatform()) return getAuth(app);
  try {
    return initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = app ? getDatabase(app) : null;
export const functions = app ? getFunctions(app, env.VITE_FUNCTIONS_REGION || 'us-central1') : null;
