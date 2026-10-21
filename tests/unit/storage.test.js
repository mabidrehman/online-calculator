import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import { createSafeStorage } from '../../public/js/shared/storage.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

describe('createSafeStorage', () => {
  beforeEach(() => mock.method(console, 'warn', () => {}));

  it('reads and writes strings', () => {
    const storage = createSafeStorage(() => createMemoryStorage());
    assert.equal(storage.setItem('k', 'v'), true);
    assert.equal(storage.getItem('k'), 'v');
    storage.removeItem('k');
    assert.equal(storage.getItem('k'), null);
  });

  it('round-trips JSON', () => {
    const storage = createSafeStorage(() => createMemoryStorage());
    storage.writeJson('k', [{ a: 1 }]);
    assert.deepEqual(storage.readJson('k', null), [{ a: 1 }]);
  });

  it('returns the fallback for missing keys', () => {
    const storage = createSafeStorage(() => createMemoryStorage());
    assert.deepEqual(storage.readJson('missing', []), []);
  });

  it('returns the fallback and warns on corrupt JSON', () => {
    const storage = createSafeStorage(() => createMemoryStorage({ k: '{not json' }));
    assert.deepEqual(storage.readJson('k', []), []);
    assert.equal(console.warn.mock.callCount(), 1);
  });

  it('degrades gracefully when storage access throws (blocked cookies)', () => {
    const storage = createSafeStorage(() => {
      throw new Error('SecurityError');
    });
    assert.equal(storage.getItem('k'), null);
    assert.equal(storage.setItem('k', 'v'), false);
    assert.doesNotThrow(() => storage.removeItem('k'));
    assert.deepEqual(storage.readJson('k', 'fallback'), 'fallback');
    assert.equal(console.warn.mock.callCount(), 1);
  });

  it('degrades gracefully when storage is missing', () => {
    const storage = createSafeStorage(() => undefined);
    assert.equal(storage.setItem('k', 'v'), false);
  });

  it('handles failing operations (quota exceeded, private mode)', () => {
    const backend = createMemoryStorage({}, { failOn: ['getItem', 'setItem', 'removeItem'] });
    const storage = createSafeStorage(() => backend);
    assert.equal(storage.setItem('k', 'v'), false);
    assert.equal(storage.getItem('k'), null);
    assert.doesNotThrow(() => storage.removeItem('k'));
    assert.equal(console.warn.mock.callCount(), 3);
  });
});
