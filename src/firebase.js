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

// The defaults are this app's own Firebase project ("disciplined-3e309"). A web
// config is an identifier, not a secret: access is decided by the sign-in and
// by database.rules.json. Set VITE_FIREBASE_* to point a build at another project.
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAsfaPSuxIwR2SoHJ8RBCRQiJ6q-PbNwEU',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'disciplined-3e309.firebaseapp.com',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://disciplined-3e309-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'disciplined-3e309',
  appId: env.VITE_FIREBASE_APP_ID || '1:180200171366:web:a2035d4abb48e69bf5caa7',
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
