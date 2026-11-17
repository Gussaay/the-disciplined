// Fingerprint (or face) on the phone, two uses:
//   - sign in with fingerprint: after an email sign-in the email and password
//     are kept in the Android keystore, readable only after the fingerprint
//     is checked;
//   - app lock: the app asks for the fingerprint when it opens or comes back
//     after a while.
// The website has neither; every function then reports "not available".
import { isNative } from './native';

const SERVER = 'the-disciplined';
let plugin = null;
async function bio() {
  if (!plugin) plugin = (await import('@capgo/capacitor-native-biometric')).NativeBiometric;
  return plugin;
}

/** True when the phone has a fingerprint (or face) set up. */
export async function biometricAvailable() {
  if (!isNative) return false;
  try {
    const r = await (await bio()).isAvailable({ useFallback: false });
    return Boolean(r?.isAvailable);
  } catch {
    return false;
  }
}

/** Asks for the fingerprint. Resolves when it matched, rejects otherwise. */
export async function verify(reason, title) {
  await (await bio()).verifyIdentity({
    reason, title, subtitle: '', description: reason, negativeButtonText: title ? undefined : 'Cancel', useFallback: true, maxAttempts: 5,
  });
}

export async function hasSavedLogin() {
  if (!isNative) return false;
  try {
    return Boolean((await (await bio()).isCredentialsSaved({ server: SERVER }))?.isSaved);
  } catch {
    return false;
  }
}

export async function saveLogin(email, password) {
  await (await bio()).setCredentials({ username: email, password, server: SERVER });
}

/** The saved email and password, after the fingerprint matched. */
export async function savedLogin(reason, title) {
  await verify(reason, title);
  return (await bio()).getCredentials({ server: SERVER });
}

export async function forgetLogin() {
  try {
    await (await bio()).deleteCredentials({ server: SERVER });
  } catch { /* nothing saved */ }
}
