import { BUILTIN_MIDI_LIBRARY_SYNC_KEY } from './app-storage-keys';
import { instruments } from './instruments';
import {
  getCachedBuiltinMelodyCount,
  replaceBuiltinEventMelodies,
  type BuiltinEventMelodyInput,
} from './melody-library';
import {
  convertLoadedMidiTrackToImportedMelody,
  loadMidiFileFromBytes,
  normalizeMidiImportQuantize,
} from './midi-file-import';
import {
  convertLoadedMusescoreTrackToImportedMelody,
  loadMusescoreFileFromBytes,
} from './musescore-file-import';

const MIDI_LIBRARY_BASE_URL = 'https://raw.githubusercontent.com/shafranek-js/filestorage/main/MIDI';
const MIDI_LIBRARY_MANIFEST_URL = `${MIDI_LIBRARY_BASE_URL}/manifest.json`;
const FETCH_TIMEOUT_MS = 15000;
const IMPORTER_CACHE_SCHEMA_VERSION = 2;

interface RemoteMidiLibraryManifestEntry {
  id: string;
  name: string;
  instrumentName: 'guitar' | 'ukulele';
  fileName: string;
  sourceFormat?: 'midi' | 'mscx' | 'mscz';
  sourceTempoBpm?: number;
  sourceTimeSignature?: string;
  tabText?: string;
}

interface RemoteMidiLibraryManifest {
  version: number;
  generatedAtIso: string;
  melodies: RemoteMidiLibraryManifestEntry[];
}

let bootstrapPromise: Promise<void> | null = null;

function normalizeManifestEntry(value: unknown): RemoteMidiLibraryManifestEntry | null {
  if (!value || typeof value !== 'object') return null;
  const id = String((value as { id?: unknown }).id ?? '').trim();
  const name = String((value as { name?: unknown }).name ?? '').trim();
  const instrumentName = (value as { instrumentName?: unknown }).instrumentName;
  const fileName = String((value as { fileName?: unknown }).fileName ?? '').trim();
  const sourceFormat = (value as { sourceFormat?: unknown }).sourceFormat;
  const sourceTempoBpm = (value as { sourceTempoBpm?: unknown }).sourceTempoBpm;
  const sourceTimeSignature = (value as { sourceTimeSignature?: unknown }).sourceTimeSignature;
  const tabText = (value as { tabText?: unknown }).tabText;

  if (!id.startsWith('builtin:')) return null;
  if (!name) return null;
  if (instrumentName !== 'guitar' && instrumentName !== 'ukulele') return null;
  const normalizedFileName = fileName.toLowerCase();
  const hasSupportedExtension =
    normalizedFileName.endsWith('.mid') ||
    normalizedFileName.endsWith('.mscz') ||
    normalizedFileName.endsWith('.mscx');
  if (!fileName || !hasSupportedExtension) return null;
  const normalizedSourceFormat =
    sourceFormat === 'midi' || sourceFormat === 'mscz' || sourceFormat === 'mscx'
      ? sourceFormat
      : normalizedFileName.endsWith('.mscz')
        ? 'mscz'
        : normalizedFileName.endsWith('.mscx')
          ? 'mscx'
          : 'midi';

  return {
    id,
    name,
    instrumentName,
    fileName,
    sourceFormat: normalizedSourceFormat,
    sourceTempoBpm:
      typeof sourceTempoBpm === 'number' && Number.isFinite(sourceTempoBpm)
        ? Math.round(sourceTempoBpm)
        : undefined,
    sourceTimeSignature:
      typeof sourceTimeSignature === 'string' && sourceTimeSignature.trim().length > 0
        ? sourceTimeSignature.trim()
        : undefined,
    tabText: typeof tabText === 'string' && tabText.trim().length > 0 ? tabText : undefined,
  };
}

function normalizeManifest(value: unknown): RemoteMidiLibraryManifest | null {
  if (!value || typeof value !== 'object') return null;
  const version = (value as { version?: unknown }).version;
  const generatedAtIso = (value as { generatedAtIso?: unknown }).generatedAtIso;
  const melodiesRaw = (value as { melodies?: unknown }).melodies;
  if (typeof version !== 'number' || !Number.isFinite(version) || version < 1) return null;
  if (typeof generatedAtIso !== 'string' || generatedAtIso.trim().length === 0) return null;
  if (!Array.isArray(melodiesRaw)) return null;
  const melodies = melodiesRaw
    .map((entry) => normalizeManifestEntry(entry))
    .filter((entry): entry is RemoteMidiLibraryManifestEntry => entry !== null);
  if (melodies.length === 0) return null;
  return {
    version: Math.round(version),
    generatedAtIso: generatedAtIso.trim(),
    melodies,
  };
}

function buildManifestSyncFingerprint(manifest: Pick<RemoteMidiLibraryManifest, 'version' | 'generatedAtIso' | 'melodies'>) {
  return `${IMPORTER_CACHE_SCHEMA_VERSION}:${manifest.version}:${manifest.generatedAtIso}:${manifest.melodies.length}`;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json,application/octet-stream,*/*' },
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function loadRemoteManifest() {
  const response = await fetchWithTimeout(MIDI_LIBRARY_MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Manifest request failed with HTTP ${response.status}.`);
  }
  const parsed = normalizeManifest(await response.json());
  if (!parsed) {
    throw new Error('Remote MIDI library manifest is invalid.');
  }
  return parsed;
}

function resolveMelodyLibraryFileUrl(fileName: string) {
  return `${MIDI_LIBRARY_BASE_URL}/${encodeURIComponent(fileName)}`;
}

async function downloadLibraryFileBytes(fileName: string) {
  const response = await fetchWithTimeout(resolveMelodyLibraryFileUrl(fileName));
  if (!response.ok) {
    throw new Error(`Library file request failed for "${fileName}" with HTTP ${response.status}.`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function convertManifestEntryToBuiltin(entry: RemoteMidiLibraryManifestEntry): Promise<BuiltinEventMelodyInput> {
  const instrument = entry.instrumentName === 'ukulele' ? instruments.ukulele : instruments.guitar;
  const bytes = await downloadLibraryFileBytes(entry.fileName);
  let imported:
    | ReturnType<typeof convertLoadedMidiTrackToImportedMelody>
    | ReturnType<typeof convertLoadedMusescoreTrackToImportedMelody>;
  if (entry.sourceFormat === 'mscz' || entry.sourceFormat === 'mscx') {
    const loaded = await loadMusescoreFileFromBytes(bytes, entry.fileName, instrument);
    const fallbackTrackIndex = loaded.trackOptions[0]?.trackIndex ?? null;
    const trackIndex = loaded.defaultTrackIndex ?? fallbackTrackIndex;
    if (trackIndex === null) {
      throw new Error(`No playable track found in "${entry.fileName}".`);
    }
    imported = convertLoadedMusescoreTrackToImportedMelody(loaded, instrument, trackIndex, {
      quantize: normalizeMidiImportQuantize('off'),
    });
  } else {
    const loaded = await loadMidiFileFromBytes(bytes, entry.fileName);
    const fallbackTrackIndex = loaded.trackOptions[0]?.trackIndex ?? null;
    const trackIndex = loaded.defaultTrackIndex ?? fallbackTrackIndex;
    if (trackIndex === null) {
      throw new Error(`No playable track found in "${entry.fileName}".`);
    }
    imported = convertLoadedMidiTrackToImportedMelody(loaded, instrument, trackIndex, {
      quantize: normalizeMidiImportQuantize('off'),
    });
  }
  return {
    id: entry.id,
    name: entry.name,
    instrumentName: entry.instrumentName,
    events: imported.events,
    tabText: entry.tabText,
    sourceFormat: entry.sourceFormat,
    sourceFileName: entry.fileName,
    sourceTrackName: imported.metadata.trackName ?? undefined,
    sourceScoreTitle: imported.metadata.midiName ?? undefined,
    sourceTempoBpm: entry.sourceTempoBpm ?? imported.metadata.tempoBpm ?? undefined,
    sourceTimeSignature: entry.sourceTimeSignature ?? imported.metadata.timeSignatureText ?? undefined,
  };
}

async function runBuiltinMidiLibraryBootstrap() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || typeof fetch !== 'function') {
    return;
  }

  const manifest = await loadRemoteManifest();
  const nextSyncMarker = buildManifestSyncFingerprint(manifest);
  const cachedBuiltinCount = getCachedBuiltinMelodyCount();
  const previousSyncMarker = localStorage.getItem(BUILTIN_MIDI_LIBRARY_SYNC_KEY);
  if (cachedBuiltinCount > 0 && previousSyncMarker === nextSyncMarker) {
    return;
  }

  const converted: BuiltinEventMelodyInput[] = [];
  for (const entry of manifest.melodies) {
    converted.push(await convertManifestEntryToBuiltin(entry));
  }
  replaceBuiltinEventMelodies(converted);
  localStorage.setItem(BUILTIN_MIDI_LIBRARY_SYNC_KEY, nextSyncMarker);
}

export async function ensureBuiltinMidiLibraryLoaded() {
  if (!bootstrapPromise) {
    bootstrapPromise = runBuiltinMidiLibraryBootstrap().catch((error) => {
      console.warn('Failed to bootstrap remote built-in MIDI library:', error);
    });
  }
  await bootstrapPromise;
}
