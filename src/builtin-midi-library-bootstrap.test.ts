import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILTIN_MIDI_LIBRARY_SYNC_KEY } from './app-storage-keys';

const melodyLibraryMocks = vi.hoisted(() => ({
  getCachedBuiltinMelodyCount: vi.fn(() => 0),
  replaceBuiltinEventMelodies: vi.fn(),
}));

const midiImportMocks = vi.hoisted(() => ({
  loadMidiFileFromBytes: vi.fn(async () => ({
    sourceFileName: 'test.mid',
    midiName: null,
    tempoBpm: 120,
    tempoChangesCount: 1,
    timeSignatureText: '4/4',
    keySignatureText: null,
    trackOptions: [{ trackIndex: 0 }],
    defaultTrackIndex: 0,
    midi: {},
  })),
  convertLoadedMidiTrackToImportedMelody: vi.fn(() => ({
    suggestedName: 'Imported',
    events: [{ durationBeats: 1, notes: [{ note: 'E', stringName: 'e', fret: 0 }] }],
    warnings: [],
    metadata: {
      sourceFormat: 'midi' as const,
      sourceFileName: 'test.mid',
      midiName: 'Test MIDI',
      trackName: 'Track 1',
      tempoBpm: 120,
      timeSignatureText: '4/4',
    },
  })),
  normalizeMidiImportQuantize: vi.fn(() => 'off'),
}));

const musescoreImportMocks = vi.hoisted(() => ({
  loadMusescoreFileFromBytes: vi.fn(async () => ({
    sourceFileName: 'test.mscz',
    sourceFormat: 'mscz' as const,
    midiName: 'Test Score',
    tempoBpm: 110,
    tempoChangesCount: 1,
    timeSignatureText: '3/4',
    keySignatureText: null,
    trackOptions: [{ trackIndex: 0 }],
    defaultTrackIndex: 0,
    tracks: [],
    midi: null,
  })),
  convertLoadedMusescoreTrackToImportedMelody: vi.fn(() => ({
    suggestedName: 'Imported MuseScore',
    events: [{ durationBeats: 1, notes: [{ note: 'A', stringName: 'e', fret: 5 }] }],
    warnings: [],
    metadata: {
      sourceFormat: 'mscz' as const,
      sourceFileName: 'test.mscz',
      midiName: 'Test Score',
      trackName: 'Staff 1',
      tempoBpm: 110,
      timeSignatureText: '3/4',
    },
  })),
}));

vi.mock('./melody-library', () => melodyLibraryMocks);
vi.mock('./midi-file-import', () => midiImportMocks);
vi.mock('./musescore-file-import', () => musescoreImportMocks);
vi.mock('./instruments', () => ({
  instruments: {
    guitar: { name: 'guitar' },
    ukulele: { name: 'ukulele' },
  },
}));

describe('builtin-midi-library-bootstrap', () => {
  function createLocalStorageStub() {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, String(value));
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
      clear: () => {
        values.clear();
      },
      key: (index: number) => Array.from(values.keys())[index] ?? null,
      get length() {
        return values.size;
      },
    };
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });
    vi.stubGlobal('localStorage', createLocalStorageStub());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('checks manifest and skips MIDI downloads when sync marker is unchanged', async () => {
    melodyLibraryMocks.getCachedBuiltinMelodyCount.mockReturnValue(4);
    localStorage.setItem(BUILTIN_MIDI_LIBRARY_SYNC_KEY, '3:1:2026-03-06T00:00:00.000Z:1');
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        version: 1,
        generatedAtIso: '2026-03-06T00:00:00.000Z',
        melodies: [
          {
            id: 'builtin:guitar:test',
            name: 'Test',
            instrumentName: 'guitar',
            fileName: 'builtin_guitar_test.mid',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { ensureBuiltinMidiLibraryLoaded } = await import('./builtin-midi-library-bootstrap');
    await ensureBuiltinMidiLibraryLoaded();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(melodyLibraryMocks.replaceBuiltinEventMelodies).not.toHaveBeenCalled();
  });

  it('downloads manifest and MIDI files on first run and caches the result', async () => {
    melodyLibraryMocks.getCachedBuiltinMelodyCount.mockReturnValue(0);
    const manifest = {
      version: 1,
      generatedAtIso: '2026-03-06T00:00:00.000Z',
      melodies: [
        {
          id: 'builtin:guitar:test',
          name: 'Test',
          instrumentName: 'guitar',
          fileName: 'builtin_guitar_test.mid',
          sourceTempoBpm: 123,
          sourceTimeSignature: '3/4',
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => manifest,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([77, 84, 104, 100]).buffer,
      });
    vi.stubGlobal('fetch', fetchMock);

    const { ensureBuiltinMidiLibraryLoaded } = await import('./builtin-midi-library-bootstrap');
    await ensureBuiltinMidiLibraryLoaded();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(melodyLibraryMocks.replaceBuiltinEventMelodies).toHaveBeenCalledTimes(1);
    expect(melodyLibraryMocks.replaceBuiltinEventMelodies).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'builtin:guitar:test',
        name: 'Test',
        instrumentName: 'guitar',
        sourceFileName: 'builtin_guitar_test.mid',
        sourceTempoBpm: 123,
        sourceTimeSignature: '3/4',
      }),
    ]);
    expect((globalThis.localStorage as Storage).getItem(BUILTIN_MIDI_LIBRARY_SYNC_KEY)).toBe(
      '3:1:2026-03-06T00:00:00.000Z:1'
    );
  });

  it('refreshes cached built-ins when manifest fingerprint changes', async () => {
    melodyLibraryMocks.getCachedBuiltinMelodyCount.mockReturnValue(9);
    localStorage.setItem(BUILTIN_MIDI_LIBRARY_SYNC_KEY, '1:2026-03-05T00:00:00.000Z:1');
    const manifest = {
      version: 2,
      generatedAtIso: '2026-03-06T09:00:00.000Z',
      melodies: [
        {
          id: 'builtin:guitar:test2',
          name: 'Test 2',
          instrumentName: 'guitar',
          fileName: 'builtin_guitar_test2.mid',
          sourceTempoBpm: 140,
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => manifest,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([77, 84, 104, 100]).buffer,
      });
    vi.stubGlobal('fetch', fetchMock);

    const { ensureBuiltinMidiLibraryLoaded } = await import('./builtin-midi-library-bootstrap');
    await ensureBuiltinMidiLibraryLoaded();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(melodyLibraryMocks.replaceBuiltinEventMelodies).toHaveBeenCalledTimes(1);
    expect((globalThis.localStorage as Storage).getItem(BUILTIN_MIDI_LIBRARY_SYNC_KEY)).toBe(
      '3:2:2026-03-06T09:00:00.000Z:1'
    );
  });

  it('supports loading built-ins from MSCZ entries in manifest', async () => {
    melodyLibraryMocks.getCachedBuiltinMelodyCount.mockReturnValue(0);
    const manifest = {
      version: 3,
      generatedAtIso: '2026-03-06T10:00:00.000Z',
      melodies: [
        {
          id: 'builtin:guitar:fur_elise_tab',
          name: 'Fur Elise (Tab)',
          instrumentName: 'guitar',
          fileName: 'Fur elise (tab).mscz',
          sourceFormat: 'mscz',
          sourceTempoBpm: 120,
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => manifest,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([80, 75, 3, 4]).buffer,
      });
    vi.stubGlobal('fetch', fetchMock);

    const { ensureBuiltinMidiLibraryLoaded } = await import('./builtin-midi-library-bootstrap');
    await ensureBuiltinMidiLibraryLoaded();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(musescoreImportMocks.loadMusescoreFileFromBytes).toHaveBeenCalledTimes(1);
    expect(musescoreImportMocks.convertLoadedMusescoreTrackToImportedMelody).toHaveBeenCalledTimes(1);
    expect(melodyLibraryMocks.replaceBuiltinEventMelodies).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'builtin:guitar:fur_elise_tab',
        sourceFileName: 'Fur elise (tab).mscz',
        sourceFormat: 'mscz',
      }),
    ]);
  });
});
