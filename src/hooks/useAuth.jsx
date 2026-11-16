// One auth listener shared through context. Accounts are optional: the app
// works on the device without one, and signing in adds cloud backup across
// devices and the server-side AI.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, getRedirectResult, onAuthStateChanged, sendEmailVerification,
  sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut,
  updateProfile,
} from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { auth, cloudEnabled, db } from '../firebase';
import { GOOGLE_WEB_CLIENT_ID } from '../config';
import { startSync } from '../lib/sync';
import { isNative } from '../lib/native';

const AuthContext = createContext({ user: null, loading: false, cloudEnabled: false });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(cloudEnabled);

  useEffect(() => {
    if (!auth) return undefined;
    if (!isNative) getRedirectResult(auth).then((res) => res?.user && saveAccount(res.user)).catch(() => {});
    return onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
  }, []);

  useEffect(() => (user?.uid ? startSync(user.uid) : undefined), [user?.uid]);

  const value = useMemo(() => ({ user, loading, cloudEnabled }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Name, email and dates of the account, kept beside its data. */
function saveAccount(user, extra = {}) {
  if (!db || !user) return Promise.resolve();
  const meta = {
    email: user.email || '',
    name: user.displayName || extra.name || '',
    provider: user.providerData?.[0]?.providerId || 'password',
    lastSignIn: Date.now(),
    ...extra,
  };
  return update(ref(db, `users/${user.uid}/account`), meta).catch(() => {});
}

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  saveAccount(cred.user);
  return cred.user;
}

/** Registration: the account, the person's name on it, and a verification email. */
export async function signUp(email, password, name = '') {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
  sendEmailVerification(cred.user).catch(() => {});
  saveAccount(cred.user, { name: name.trim(), created: Date.now() });
  return cred.user;
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());
export const resendVerification = () => (auth?.currentUser ? sendEmailVerification(auth.currentUser) : Promise.resolve());
export const logout = () => signOut(auth);

/**
 * Google sign-in. On the web: a popup, or a full-page redirect where popups
 * are blocked. In the Android app: the phone's own Google account picker
 * (Capgo Social Login), which needs the OAuth web client id in config.js and
 * the app's SHA-1 fingerprint registered in Firebase.
 */
export const canGoogle = cloudEnabled && (!isNative || Boolean(GOOGLE_WEB_CLIENT_ID));

let socialReady = false;
async function nativeGoogleIdToken() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  if (!socialReady) {
    await SocialLogin.initialize({ google: { webClientId: GOOGLE_WEB_CLIENT_ID } });
    socialReady = true;
  }
  const res = await SocialLogin.login({ provider: 'google', options: {} });
  const idToken = res?.result?.idToken || res?.idToken;
  if (!idToken) throw new Error('Google sign-in did not return a token.');
  return idToken;
}

export async function signInGoogle() {
  let cred;
  if (isNative) {
    cred = await signInWithCredential(auth, GoogleAuthProvider.credential(await nativeGoogleIdToken()));
  } else {
    const provider = new GoogleAuthProvider();
    try {
      cred = await signInWithPopup(auth, provider);
    } catch (e) {
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw e;
    }
  }
  saveAccount(cred.user);
  return cred.user;
}

/** A sign-in error in words, in both languages. */
export function authMessage(error, L) {
  const code = error?.code || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(code)) return L('Wrong email or password', 'البريد أو كلمة المرور غير صحيحة');
  if (/email-already-in-use/.test(code)) return L('This email already has an account. Sign in instead.', 'لهذا البريد حساب بالفعل. سجّل الدخول.');
  if (/weak-password/.test(code)) return L('Use at least 6 characters for the password', 'استخدم 6 أحرف على الأقل لكلمة المرور');
  if (/invalid-email|missing-email/.test(code)) return L('Check the email address', 'تحقق من عنوان البريد');
  if (/too-many-requests/.test(code)) return L('Too many tries. Wait a few minutes and try again.', 'محاولات كثيرة. انتظر بضع دقائق ثم حاول مجدداً.');
  if (/network-request-failed/.test(code)) return L('No connection. Check the internet and try again.', 'لا يوجد اتصال. تحقق من الإنترنت وحاول مجدداً.');
  if (/popup-closed|cancel/i.test(code) || /cancel/i.test(error?.message || '')) return L('Sign-in was cancelled', 'أُلغي تسجيل الدخول');
  if (/operation-not-allowed/.test(code)) return L('This sign-in method is not switched on in Firebase yet', 'طريقة الدخول هذه غير مفعّلة في Firebase بعد');
  if (/unauthorized-domain/.test(code)) return L('This website is not yet allowed to sign in (Firebase authorized domains)', 'هذا الموقع غير مسموح له بتسجيل الدخول بعد (النطاقات المصرح بها في Firebase)');
  return error?.message || L('Could not sign in', 'تعذر تسجيل الدخول');
}
