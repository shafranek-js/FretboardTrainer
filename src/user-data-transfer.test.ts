import { describe, expect, it } from 'vitest';
import {
  buildAppUserDataSnapshot,
  formatAppUserDataSnapshotFileName,
  parseAppUserDataSnapshot,
  applyAppUserDataSnapshot,
} from './user-data-transfer';
import {
  ACTIVE_PROFILE_KEY,
  APP_USER_DATA_STORAGE_KEYS,
  CUSTOM_MELODY_STORAGE_KEY,
  PROFILES_KEY,
} from './app-storage-keys';

function createStorage(initial?: Record<string, string>) {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

describe('user-data-transfer', () => {
  it('builds a snapshot with all app-owned storage keys', () => {
    const storage = createStorage({
      [PROFILES_KEY]: '{"demo":{}}',
      [ACTIVE_PROFILE_KEY]: 'demo',
      [CUSTOM_MELODY_STORAGE_KEY]: '[{"id":"m1"}]',
    });

    const snapshot = buildAppUserDataSnapshot(storage, Date.UTC(2026, 2, 2, 12, 0, 0));

    expect(snapshot.type).toBe('fretflow-user-data');
    expect(snapshot.version).toBe(1);
    expect(Object.keys(snapshot.payloads)).toEqual([...APP_USER_DATA_STORAGE_KEYS]);
    expect(snapshot.payloads[PROFILES_KEY]).toBe('{"demo":{}}');
    expect(snapshot.payloads[ACTIVE_PROFILE_KEY]).toBe('demo');
    expect(snapshot.payloads[CUSTOM_MELODY_STORAGE_KEY]).toBe('[{"id":"m1"}]');
  });

  it('parses and applies a snapshot to storage', () => {
    const storage = createStorage({
      [PROFILES_KEY]: '{"old":{}}',
    });
    const snapshotText = JSON.stringify({
      type: 'fretflow-user-data',
      version: 1,
      exportedAtIso: '2026-03-02T12:00:00.000Z',
      payloads: Object.fromEntries(
        APP_USER_DATA_STORAGE_KEYS.map((key) => [key, key === PROFILES_KEY ? '{"new":{}}' : null])
      ),
    });

    const parsed = parseAppUserDataSnapshot(snapshotText);
    applyAppUserDataSnapshot(parsed, storage);

    expect(storage.dump()[PROFILES_KEY]).toBe('{"new":{}}');
    expect(storage.dump()[ACTIVE_PROFILE_KEY]).toBeUndefined();
  });

  it('rejects invalid snapshots', () => {
    expect(() => parseAppUserDataSnapshot('{"type":"wrong"}')).toThrow(
      'Selected file is not a supported FretFlow user data snapshot.'
    );
  });

  it('formats a stable export filename', () => {
    expect(formatAppUserDataSnapshotFileName(Date.UTC(2026, 2, 2, 12, 34, 56))).toContain(
      'fretflow-user-data-2026-03-02T12-34-56'
    );
  });
});
