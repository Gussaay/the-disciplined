// A fingerprint of everything native in the Android app: the android/ project,
// capacitor.config.json and the exact versions of the Capacitor plugins.
// An over-the-air web bundle is installed only on an APK with the same
// fingerprint, so web code never runs on an APK that lacks a plugin it calls.
// Prints the first 16 hex characters of a SHA-256.
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const hash = createHash('sha256');
const files = execSync('git ls-files android capacitor.config.json', { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  // Written by `cap sync` and by CI (version numbers), not native changes.
  .filter((f) => !/android\/app\/build\.gradle$|capacitor\.(settings|build)\.gradle$|\/assets\/|\/res\/xml\/config\.xml$/.test(f))
  .sort();
for (const f of files) {
  hash.update(f);
  hash.update(readFileSync(f));
}
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const natives = Object.entries(lock.packages || {})
  .filter(([path]) => /^node_modules\/@(capacitor|capgo|capacitor-community)\//.test(path))
  .map(([path, info]) => `${path}@${info.version}`)
  .sort();
hash.update(natives.join('\n'));
// The parts of android/app/build.gradle that matter, without the version lines CI rewrites.
hash.update(readFileSync('android/app/build.gradle', 'utf8').replace(/^\s*version(Code|Name).*$/gm, ''));
process.stdout.write(hash.digest('hex').slice(0, 16));
