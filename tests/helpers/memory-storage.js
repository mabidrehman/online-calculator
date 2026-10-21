/**
 * Minimal in-memory Web Storage double. `failOn` makes chosen methods throw,
 * simulating private mode or a full quota.
 */
export function createMemoryStorage(initial = {}, { failOn = [] } = {}) {
  const data = new Map(Object.entries(initial));
  const guard = (method) => {
    if (failOn.includes(method)) throw new Error(`${method} failed (simulated)`);
  };
  return {
    getItem(key) {
      guard('getItem');
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      guard('setItem');
      data.set(key, String(value));
    },
    removeItem(key) {
      guard('removeItem');
      data.delete(key);
    },
    dump: () => Object.fromEntries(data),
  };
}
