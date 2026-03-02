import { describe, expect, it, vi } from 'vitest';
import { parseAsciiTabToMelodyEvents } from './ascii-tab-melody-parser';
import { instruments } from './instruments';
import { getMelodyEventPlaybackDurationMs } from './melody-timeline-duration';
import {
  listMelodiesForInstrument,
  saveCustomAsciiTabMelody,
  saveCustomEventMelody,
  updateCustomEventMelody,
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

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
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
      maxFret: 15,
      maxConsecutiveFretJump: 9,
      maxFretSpan: 15,
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
      maxFret: 5,
      maxConsecutiveFretJump: 5,
      maxFretSpan: 5,
    });
  });

  it('makes built-in melody playback tempo follow bpm', () => {
    const melodies = [
      ...listMelodiesForInstrument(instruments.guitar).filter((m) => m.source === 'builtin'),
      ...listMelodiesForInstrument(instruments.ukulele).filter((m) => m.source === 'builtin'),
    ];

    melodies.forEach((melody) => {
      const firstEvent = melody.events[0];
      expect(firstEvent).toBeDefined();
      expect(getMelodyEventPlaybackDurationMs(firstEvent!, 60, melody)).toBeGreaterThan(
        getMelodyEventPlaybackDurationMs(firstEvent!, 120, melody)
      );
    });
  });

  it('stores explicit beat durations for built-in melodies', () => {
    const melodies = [
      ...listMelodiesForInstrument(instruments.guitar).filter((m) => m.source === 'builtin'),
      ...listMelodiesForInstrument(instruments.ukulele).filter((m) => m.source === 'builtin'),
    ];

    melodies.forEach((melody) => {
      expect(melody.events.every((event) => typeof event.durationBeats === 'number')).toBe(true);
    });
  });

  it('assigns source tempos to built-in melodies', () => {
    const melodies = [
      ...listMelodiesForInstrument(instruments.guitar).filter((m) => m.source === 'builtin'),
      ...listMelodiesForInstrument(instruments.ukulele).filter((m) => m.source === 'builtin'),
    ];

    melodies.forEach((melody) => {
      expect(melody.sourceTempoBpm).toBeTypeOf('number');
      expect(melody.sourceTempoBpm).toBeGreaterThanOrEqual(40);
      expect(melody.sourceTempoBpm).toBeLessThanOrEqual(220);
    });
  });

  it('includes Mo Li Hua in the built-in guitar melody library', () => {
    const melody = listMelodiesForInstrument(instruments.guitar).find(
      (entry) => entry.id === 'builtin:guitar:mo_li_hua'
    );

    expect(melody).toBeDefined();
    expect(melody?.name).toBe('Mo Li Hua');
    expect(melody?.events.length).toBeGreaterThan(0);
    expect(melody?.tabText).toContain('e|--------------------2---2-------');
  });

  it('includes Romanza Anonimo in the built-in guitar melody library', () => {
    const melody = listMelodiesForInstrument(instruments.guitar).find(
      (entry) => entry.id === 'builtin:guitar:romanza_anonimo'
    );

    expect(melody).toBeDefined();
    expect(melody?.name).toBe('Romanza Anonimo');
    expect(melody?.events.length).toBeGreaterThan(0);
    expect(melody?.tabText).toContain('e|--------------------------------|--------------------------------|--------------------------------|--------------------------------|----------------2-----------2---');
  });

  it('includes Greensleeves in the built-in guitar melody library', () => {
    const melody = listMelodiesForInstrument(instruments.guitar).find(
      (entry) => entry.id === 'builtin:guitar:greensleeves'
    );

    expect(melody).toBeDefined();
    expect(melody?.name).toBe('Greensleeves');
    expect(melody?.events.length).toBeGreaterThan(0);
    expect(melody?.tabText).toContain('e|--------------------------------|0-----------1---0---------------');
  });

  it('includes Scarborough Fair in the built-in guitar melody library', () => {
    const melody = listMelodiesForInstrument(instruments.guitar).find(
      (entry) => entry.id === 'builtin:guitar:scarborough_fair'
    );

    expect(melody).toBeDefined();
    expect(melody?.name).toBe('Scarborough Fair');
    expect(melody?.events.length).toBeGreaterThan(0);
    expect(melody?.tabText).toContain('e|------------5-------5---0-------|1---0-------------------5---8---');
  });

  it('includes Fur Elise in the built-in guitar melody library', () => {
    const melody = listMelodiesForInstrument(instruments.guitar).find(
      (entry) => entry.id === 'builtin:guitar:fur_elise'
    );

    expect(melody).toBeDefined();
    expect(melody?.name).toBe('Fur Elise');
    expect(melody?.events.length).toBeGreaterThan(0);
    expect(melody?.tabText).toContain('e|0-------0-------0---------------');
  });

  it('ships a full Ode to Joy theme instead of the old intro-length fragment', () => {
    const odeMelodies = [
      listMelodiesForInstrument(instruments.guitar).find((melody) => melody.id === 'builtin:guitar:ode_to_joy_intro'),
      listMelodiesForInstrument(instruments.ukulele).find((melody) => melody.id === 'builtin:ukulele:ode_to_joy_intro'),
    ].filter(isPresent);

    odeMelodies.forEach((melody) => {
      expect(melody.events.length).toBeGreaterThan(50);
    });
  });

  it('uses varied note lengths in twinkle built-ins instead of a flat grid', () => {
    const twinkles = [
      listMelodiesForInstrument(instruments.guitar).find((melody) => melody.id === 'builtin:guitar:twinkle_phrase'),
      listMelodiesForInstrument(instruments.ukulele).find((melody) => melody.id === 'builtin:ukulele:twinkle_phrase'),
    ].filter(isPresent);

    twinkles.forEach((melody) => {
      const durations = melody.events.map((event) => event.durationBeats);
      expect(durations.some((duration) => duration === 2)).toBe(true);
      expect(new Set(durations).size).toBeGreaterThan(1);
    });
  });

  it('keeps built-in ASCII source parseable for duplication/editing', () => {
    const builtins = [
      ...listMelodiesForInstrument(instruments.guitar).filter((m) => m.source === 'builtin'),
      ...listMelodiesForInstrument(instruments.ukulele).filter((m) => m.source === 'builtin'),
    ];

    builtins.forEach((melody) => {
      const instrument = melody.instrumentName === 'guitar' ? instruments.guitar : instruments.ukulele;
      expect(() => parseAsciiTabToMelodyEvents(melody.tabText ?? '', instrument)).not.toThrow();
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

  it('rejects event melodies without any notes', () => {
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

      expect(() =>
        saveCustomEventMelody(
          'Empty Melody',
          [{ durationBeats: 1, notes: [] }],
          instruments.guitar,
          { sourceFormat: 'midi' }
        )
      ).toThrow('Imported melody must contain at least one note.');

      const melodyId = saveCustomEventMelody(
        'Editable Melody',
        [{ durationBeats: 1, notes: [{ note: 'E', stringName: 'e', fret: 0 }] }],
        instruments.guitar,
        { sourceFormat: 'gp5' }
      );

      expect(() =>
        updateCustomEventMelody(
          melodyId,
          'Editable Melody',
          [{ durationBeats: 1, notes: [] }],
          instruments.guitar,
          { sourceFormat: 'gp5' }
        )
      ).toThrow('Edited melody must contain at least one note.');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

