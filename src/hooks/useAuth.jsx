// One auth listener shared through context. With no Firebase configured the
// app is in "device only" mode: `user` stays null and nothing is asked.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signOut,
} from 'firebase/auth';
import { auth, cloudEnabled } from '../firebase';
import { startSync } from '../lib/sync';
import { isNative } from '../lib/native';

const AuthContext = createContext({ user: null, loading: false, cloudEnabled: false });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(cloudEnabled);

  useEffect(() => {
    if (!auth) return undefined;
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

export const signIn = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);
export const signUp = (email, password) => createUserWithEmailAndPassword(auth, email.trim(), password);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());
export const logout = () => signOut(auth);
/** Google sign-in is offered on the web only (the popup cannot open inside the Android WebView). */
export const canGoogle = cloudEnabled && !isNative;
export const signInGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
