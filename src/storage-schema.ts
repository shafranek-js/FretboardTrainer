import { APP_USER_DATA_STORAGE_KEYS, type AppUserDataStorageKey } from './app-storage-keys';

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem' | 'removeItem'>;

function getStorageValue(storage: StorageReader, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function readStorageString(storage: StorageReader, key: string, fallback: string | null = null) {
  const value = getStorageValue(storage, key);
  return typeof value === 'string' ? value : fallback;
}

export function writeStorageString(storage: StorageWriter, key: string, value: string) {
  storage.setItem(key, value);
}

export function removeStorageValue(storage: StorageWriter, key: string) {
  storage.removeItem(key);
}

export function writeStorageJson(storage: StorageWriter, key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
}

export function readStorageJson<T>(
  storage: StorageReader,
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
  onInvalid?: (error: unknown) => void
) {
  const raw = getStorageValue(storage, key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isValid(parsed)) return parsed;
  } catch (error) {
    onInvalid?.(error);
    return fallback;
  }

  onInvalid?.(new Error(`Invalid payload for storage key "${key}".`));
  return fallback;
}

export function readAppUserDataPayloads(storage: StorageReader) {
  return Object.fromEntries(
    APP_USER_DATA_STORAGE_KEYS.map((key) => [key, getStorageValue(storage, key)])
  ) as Record<AppUserDataStorageKey, string | null>;
}

export function applyAppUserDataPayloads(
  storage: StorageWriter,
  payloads: Record<AppUserDataStorageKey, string | null>
) {
  for (const key of APP_USER_DATA_STORAGE_KEYS) {
    const value = payloads[key];
    if (value === null) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  }
}
