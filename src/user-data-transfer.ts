import { APP_USER_DATA_STORAGE_KEYS, type AppUserDataStorageKey } from './app-storage-keys';
import { applyAppUserDataPayloads, readAppUserDataPayloads } from './storage-schema';

export interface AppUserDataSnapshot {
  type: 'fretflow-user-data';
  version: 1;
  exportedAtIso: string;
  payloads: Record<AppUserDataStorageKey, string | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function buildAppUserDataSnapshot(
  storage: Pick<Storage, 'getItem'>,
  exportedAtMs = Date.now()
): AppUserDataSnapshot {
  const payloads = readAppUserDataPayloads(storage);

  return {
    type: 'fretflow-user-data',
    version: 1,
    exportedAtIso: new Date(exportedAtMs).toISOString(),
    payloads,
  };
}

export function formatAppUserDataSnapshotFileName(exportedAtMs: number) {
  const iso = new Date(exportedAtMs).toISOString().replace(/[:.]/g, '-');
  return `fretflow-user-data-${iso}.json`;
}

export function parseAppUserDataSnapshot(text: string): AppUserDataSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Selected file is not valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new Error('Selected file does not contain a valid FretFlow user data snapshot.');
  }
  if (parsed.type !== 'fretflow-user-data' || parsed.version !== 1) {
    throw new Error('Selected file is not a supported FretFlow user data snapshot.');
  }
  if (typeof parsed.exportedAtIso !== 'string' || !parsed.exportedAtIso.trim()) {
    throw new Error('Selected file is missing export metadata.');
  }
  const exportedAtIso = parsed.exportedAtIso as string;
  if (!isRecord(parsed.payloads)) {
    throw new Error('Selected file is missing snapshot payloads.');
  }

  const payloads = {} as Record<AppUserDataStorageKey, string | null>;
  for (const key of APP_USER_DATA_STORAGE_KEYS) {
    const value = parsed.payloads[key];
    if (!(typeof value === 'string' || value === null)) {
      throw new Error(`Selected file contains an invalid payload for "${key}".`);
    }
    payloads[key] = value as string | null;
  }

  return {
    type: 'fretflow-user-data',
    version: 1,
    exportedAtIso,
    payloads,
  };
}

export function applyAppUserDataSnapshot(
  snapshot: AppUserDataSnapshot,
  storage: Pick<Storage, 'setItem' | 'removeItem'>
) {
  applyAppUserDataPayloads(storage, snapshot.payloads);
}
