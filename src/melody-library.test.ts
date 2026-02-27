import { describe, expect, it, vi } from 'vitest';
import { instruments } from './instruments';
import {
  listMelodiesForInstrument,
  saveCustomAsciiTabMelody,
  saveCustomEventMelody,
  updateCustomAsciiTabMelody,
} from './melody-library';

function expectBuiltinMelodiesToBeComfortable(
  melodies: ReturnType<typeof listMelodiesForInstrument>,
  limits: { maxFret: number; maxConsecutiveFretJump: number; maxFretSpan: number }
) {
  melodies.forEach((melody) => {
    const frets = melody.events
      .flatMap((event) => event.notes)
      .map((step) => step.fret)
      .filter((fret): fret is number => fret !== null);
    expect(frets.length).toBeGreaterThan(0);
    expect(Math.max(...frets)).toBeLessThanOrEqual(limits.maxFret);
    expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(limits.maxFretSpan);

    for (let i = 1; i < frets.length; i++) {
      expect(Math.abs(frets[i] - frets[i - 1])).toBeLessThanOrEqual(limits.maxConsecutiveFretJump);
    }
  });
}

describe('melody-library builtins', () => {
  it('returns position-based built-in melodies for guitar', () => {
    const melodies = listMelodiesForInstrument(instruments.guitar).filter((m) => m.source === 'builtin');

    expect(melodies.length).toBeGreaterThanOrEqual(2);
    melodies.forEach((melody) => {
      expect(melody.events.length).toBeGreaterThan(0);
      melody.events.flatMap((event) => event.notes).forEach((step) => {
        expect(step.stringName).not.toBeNull();
        expect(step.fret).not.toBeNull();
      });
    });

    expectBuiltinMelodiesToBeComfortable(melodies, {
      maxFret: 10,
      maxConsecutiveFretJump: 4,
      maxFretSpan: 5,
    });
  });

  it('returns position-based built-in melodies for ukulele', () => {
    const melodies = listMelodiesForInstrument(instruments.ukulele).filter((m) => m.source === 'builtin');

    expect(melodies.length).toBeGreaterThanOrEqual(2);
    melodies.forEach((melody) => {
      expect(melody.events.length).toBeGreaterThan(0);
      melody.events.flatMap((event) => event.notes).forEach((step) => {
        expect(step.stringName).not.toBeNull();
        expect(step.fret).not.toBeNull();
      });
    });

    expectBuiltinMelodiesToBeComfortable(melodies, {
      maxFret: 3,
      maxConsecutiveFretJump: 3,
      maxFretSpan: 3,
    });
  });
});

describe('melody-library custom editing', () => {
  it('preserves ascii tab source on listed melodies for editing', () => {
    const guitarMelodies = listMelodiesForInstrument(instruments.guitar);
    expect(guitarMelodies.length).toBeGreaterThan(0);
    guitarMelodies.forEach((melody) => {
      expect(typeof melody.tabText).toBe('string');
      expect(melody.tabText?.trim().length).toBeGreaterThan(0);
    });
  });

  it('updates an existing custom melody in place', () => {
    const storageMap = new Map<string, string>();
    const localStorageStub = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageMap.set(key, String(value));
      },
      removeItem: (key: string) => {
        storageMap.delete(key);
      },
      clear: () => {
        storageMap.clear();
      },
    };
    vi.stubGlobal('localStorage', localStorageStub);
    try {
      localStorage.clear();

      const originalId = saveCustomAsciiTabMelody(
        'Test Melody',
        '1 string 0---2---',
        instruments.guitar
      );

      updateCustomAsciiTabMelody(originalId, 'Edited Melody', '1 string 3---5---', instruments.guitar);

      const customMelodies = listMelodiesForInstrument(instruments.guitar).filter(
        (melody) => melody.source === 'custom'
      );
      expect(customMelodies).toHaveLength(1);
      expect(customMelodies[0]?.id).toBe(originalId);
      expect(customMelodies[0]?.name).toBe('Edited Melody');
      expect(customMelodies[0]?.tabText).toContain('3---5---');
      const frets = customMelodies[0]?.events.flatMap((event) => event.notes.map((note) => note.fret)) ?? [];
      expect(frets).toContain(3);
      expect(frets).toContain(5);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('lists imported event-based custom melodies without ascii source', () => {
    const storageMap = new Map<string, string>();
    const localStorageStub = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageMap.set(key, String(value));
      },
      removeItem: (key: string) => {
        storageMap.delete(key);
      },
      clear: () => {
        storageMap.clear();
      },
    };
    vi.stubGlobal('localStorage', localStorageStub);
    try {
      localStorage.clear();

      const melodyId = saveCustomEventMelody(
        'Imported GP Melody',
        [
          {
            durationBeats: 1,
            notes: [{ note: 'C', stringName: 'A', fret: 3 }],
          },
          {
            durationBeats: 0.5,
            notes: [{ note: 'D', stringName: 'A', fret: 5 }],
          },
        ],
        instruments.guitar,
        {
          sourceFormat: 'gp5',
          sourceFileName: 'test.gp5',
          sourceTrackName: 'Lead',
        }
      );

      const customMelodies = listMelodiesForInstrument(instruments.guitar).filter(
        (melody) => melody.source === 'custom'
      );

      expect(customMelodies).toHaveLength(1);
      expect(customMelodies[0]?.id).toBe(melodyId);
      expect(customMelodies[0]?.tabText).toBeUndefined();
      expect(customMelodies[0]?.events).toHaveLength(2);
      expect(customMelodies[0]?.sourceFormat).toBe('gp5');
      expect(customMelodies[0]?.sourceTrackName).toBe('Lead');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('auto-resolves missing fret/string positions for stored event melodies', () => {
    const storageMap = new Map<string, string>();
    const localStorageStub = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageMap.set(key, String(value));
      },
      removeItem: (key: string) => {
        storageMap.delete(key);
      },
      clear: () => {
        storageMap.clear();
      },
    };
    vi.stubGlobal('localStorage', localStorageStub);
    try {
      localStorage.clear();

      saveCustomEventMelody(
        'Legacy Event Melody',
        [
          {
            durationBeats: 1,
            notes: [
              { note: 'E', stringName: null, fret: null },
              { note: 'E', stringName: null, fret: null },
            ],
          },
        ],
        instruments.guitar,
        {
          sourceFormat: 'midi',
          sourceFileName: 'legacy.mid',
        }
      );

      const customMelodies = listMelodiesForInstrument(instruments.guitar).filter(
        (melody) => melody.source === 'custom'
      );
      expect(customMelodies).toHaveLength(1);
      const notes = customMelodies[0]?.events[0]?.notes ?? [];
      expect(notes.length).toBe(2);
      notes.forEach((note) => {
        expect(note.stringName).not.toBeNull();
        expect(note.fret).not.toBeNull();
      });
      expect(new Set(notes.map((note) => note.stringName)).size).toBe(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
