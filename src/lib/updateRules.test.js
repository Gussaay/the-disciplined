import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundleFits, newerApk } from './updateRules.js';

test('a newer APK is offered only for a higher build number', () => {
  assert.equal(newerApk({ versionCode: 12 }, '11'), true);
  assert.equal(newerApk({ versionCode: 11 }, '11'), false);
  assert.equal(newerApk(null, '11'), false);
});

test('an over-the-air bundle installs only on the APK it was built for', () => {
  const m = { version: '1.0.20', url: 'https://x/b.zip', nativeHash: 'abc' };
  assert.equal(bundleFits(m, { running: '1.0.20', nativeHash: 'abc' }), 'current');
  assert.equal(bundleFits(m, { running: '1.0.19', nativeHash: 'abc' }), 'install');
  assert.equal(bundleFits(m, { running: '1.0.19', nativeHash: 'def' }), 'needs-apk');
  assert.equal(bundleFits(m, { running: '1.0.19', nativeHash: '' }), 'needs-apk');
  assert.equal(bundleFits(null, { running: '1.0.19', nativeHash: 'abc' }), 'none');
});
