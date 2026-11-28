import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retryImport } from './lazyRetry.js';

const fakeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
};

test('resolves on the first try without reloading', async () => {
  let reloads = 0;
  const mod = await retryImport(async () => ({ default: 1 }), { reload: () => { reloads += 1; }, storage: fakeStorage(), delay: 0 });
  assert.equal(mod.default, 1);
  assert.equal(reloads, 0);
});

test('retries a failing import until it succeeds', async () => {
  let calls = 0;
  const mod = await retryImport(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('chunk missing');
      return { default: 2 };
    },
    { reload: () => assert.fail('must not reload'), storage: fakeStorage(), delay: 0 },
  );
  assert.equal(mod.default, 2);
  assert.equal(calls, 3);
});

test('reloads once when the chunk keeps failing, then throws on the next visit', async () => {
  const storage = fakeStorage();
  let reloads = 0;
  let signal;
  const reloaded = new Promise((r) => { signal = r; });
  const pending = retryImport(
    async () => { throw new Error('chunk missing'); },
    { reload: () => { reloads += 1; signal(); }, storage, delay: 0 },
  );
  // The reload path never settles; wait until the reload actually fires.
  await reloaded;
  assert.equal(reloads, 1);
  assert.equal(storage.getItem('td~chunk-reload'), '1');
  void pending;
  // With the flag set (the reload already happened), the error surfaces.
  await assert.rejects(
    retryImport(async () => { throw new Error('chunk missing'); }, { reload: () => { reloads += 1; }, storage, delay: 0 }),
    /chunk missing/,
  );
  assert.equal(reloads, 1);
});

test('a successful load clears the reload flag', async () => {
  const storage = fakeStorage();
  storage.setItem('td~chunk-reload', '1');
  await retryImport(async () => ({ default: 3 }), { storage, delay: 0 });
  assert.equal(storage.getItem('td~chunk-reload'), null);
});
