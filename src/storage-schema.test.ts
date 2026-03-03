import { describe, expect, it } from 'vitest';
import {
  applyAppUserDataPayloads,
  readAppUserDataPayloads,
  readStorageJson,
  readStorageString,
  removeStorageValue,
  writeStorageJson,
  writeStorageString,
} from './storage-schema';
import {
  ACTIVE_PROFILE_KEY,
  APP_USER_DATA_STORAGE_KEYS,
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

describe('storage-schema', () => {
  it('reads and writes raw and json storage values through one gateway', () => {
    const storage = createStorage();

    writeStorageString(storage, ACTIVE_PROFILE_KEY, 'demo');
    writeStorageJson(storage, PROFILES_KEY, { demo: { trainingMode: 'melody' } });

    expect(readStorageString(storage, ACTIVE_PROFILE_KEY)).toBe('demo');
    expect(
      readStorageJson(
        storage,
        PROFILES_KEY,
        (value): value is { demo: { trainingMode: string } } =>
          !!value && typeof value === 'object' && 'demo' in value,
        {}
      )
    ).toEqual({ demo: { trainingMode: 'melody' } });

    removeStorageValue(storage, ACTIVE_PROFILE_KEY);
    expect(readStorageString(storage, ACTIVE_PROFILE_KEY)).toBeNull();
  });

  it('reads and reapplies app-owned payload snapshots across all registered keys', () => {
    const storage = createStorage({
      [PROFILES_KEY]: '{"demo":{}}',
      [ACTIVE_PROFILE_KEY]: 'demo',
    });

    const payloads = readAppUserDataPayloads(storage);
    expect(payloads[PROFILES_KEY]).toBe('{"demo":{}}');
    expect(payloads[ACTIVE_PROFILE_KEY]).toBe('demo');
    expect(Object.keys(payloads)).toEqual([...APP_USER_DATA_STORAGE_KEYS]);

    applyAppUserDataPayloads(storage, {
      ...payloads,
      [PROFILES_KEY]: '{"fresh":{}}',
      [ACTIVE_PROFILE_KEY]: null,
    });

    expect(storage.dump()[PROFILES_KEY]).toBe('{"fresh":{}}');
    expect(storage.dump()[ACTIVE_PROFILE_KEY]).toBeUndefined();
  });
});
