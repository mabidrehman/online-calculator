import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import { HISTORY_STORAGE_KEY, MAX_HISTORY_ENTRIES, createHistory } from '../../public/js/features/history.js';
import { createSafeStorage } from '../../public/js/shared/storage.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

function setup(initial = {}, options = {}) {
  const backend = createMemoryStorage(initial, options);
  const history = createHistory(createSafeStorage(() => backend));
  return { backend, history };
}

const stored = (entries) => ({ [HISTORY_STORAGE_KEY]: JSON.stringify(entries) });

describe('history', () => {
  beforeEach(() => mock.method(console, 'warn', () => {}));

  it('starts empty', () => assert.deepEqual(setup().history.getEntries(), []));

  it('adds entries newest first and persists them', () => {
    const { backend, history } = setup();
    history.add({ expression: '1+1', result: '2' });
    history.add({ expression: '2*3', result: '6' });
    const expected = [
      { expression: '2*3', result: '6' },
      { expression: '1+1', result: '2' },
    ];
    assert.deepEqual(history.getEntries(), expected);
    assert.deepEqual(JSON.parse(backend.dump()[HISTORY_STORAGE_KEY]), expected);
  });

  it('loads persisted entries', () => {
    const { history } = setup(stored([{ expression: '5-2', result: '3' }]));
    assert.deepEqual(history.getEntries(), [{ expression: '5-2', result: '3' }]);
  });

  it(`keeps at most ${MAX_HISTORY_ENTRIES} entries`, () => {
    const { history } = setup();
    for (let index = 0; index < MAX_HISTORY_ENTRIES + 10; index += 1) {
      history.add({ expression: `${index}+0`, result: String(index) });
    }
    const entries = history.getEntries();
    assert.equal(entries.length, MAX_HISTORY_ENTRIES);
    assert.equal(entries[0].result, String(MAX_HISTORY_ENTRIES + 9));
  });

  it('trims oversized stored history', () => {
    const many = Array.from({ length: 80 }, (_, index) => ({ expression: '1+1', result: String(index) }));
    assert.equal(setup(stored(many)).history.getEntries().length, MAX_HISTORY_ENTRIES);
  });

  it('clears entries and storage', () => {
    const { backend, history } = setup(stored([{ expression: '5-2', result: '3' }]));
    history.clear();
    assert.deepEqual(history.getEntries(), []);
    assert.equal(backend.dump()[HISTORY_STORAGE_KEY], undefined);
  });

  it('drops tampered entries (XSS payloads, wrong types) on load', () => {
    const { history } = setup(
      stored([
        { expression: '<img src=x onerror=alert(1)>', result: '1' },
        { expression: '1+1', result: '<script>' },
        { expression: 5, result: '5' },
        null,
        'text',
        { expression: '2+2', result: '4', extra: 'ignored' },
      ]),
    );
    assert.deepEqual(history.getEntries(), [{ expression: '2+2', result: '4' }]);
  });

  it('ignores stored data that is not a list', () => {
    assert.deepEqual(setup({ [HISTORY_STORAGE_KEY]: '{"a":1}' }).history.getEntries(), []);
    assert.deepEqual(setup({ [HISTORY_STORAGE_KEY]: 'not json' }).history.getEntries(), []);
  });

  it('refuses invalid entries', () => {
    const { history } = setup();
    assert.equal(history.add({ expression: '1+1', result: 'NaN' }), false);
    assert.equal(history.add(null), false);
    assert.deepEqual(history.getEntries(), []);
  });

  it('returns entries that cannot be mutated by callers', () => {
    const { history } = setup();
    history.add({ expression: '1+1', result: '2' });
    assert.throws(() => history.getEntries().push({}), TypeError);
    assert.throws(() => {
      history.getEntries()[0].result = 'hacked';
    }, TypeError);
  });

  it('keeps working in memory when storage writes fail', () => {
    const { history } = setup({}, { failOn: ['setItem', 'removeItem'] });
    assert.equal(history.add({ expression: '1+1', result: '2' }), true);
    assert.equal(history.getEntries().length, 1);
    history.clear();
    assert.deepEqual(history.getEntries(), []);
  });
});
