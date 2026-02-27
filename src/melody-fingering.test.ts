import { describe, expect, it } from 'vitest';
import { buildMelodyFingeredEvents } from './melody-fingering';
import type { MelodyEvent } from './melody-library';

describe('melody-fingering', () => {
  it('assigns open string as finger 0 and first position note as finger 1', () => {
    const events: MelodyEvent[] = [
      { notes: [{ note: 'E', stringName: 'e', fret: 0 }] },
      { notes: [{ note: 'G', stringName: 'e', fret: 3 }] },
    ];

    const fingered = buildMelodyFingeredEvents(events);
    expect(fingered[0]).toEqual([{ note: 'E', string: 'e', fret: 0, finger: 0 }]);
    expect(fingered[1]).toEqual([{ note: 'G', string: 'e', fret: 3, finger: 1 }]);
  });

  it('keeps relative finger positions while hand shifts along the melody', () => {
    const events: MelodyEvent[] = [
      { notes: [{ note: 'B', stringName: 'A', fret: 2 }] },
      { notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
      { notes: [{ note: 'E', stringName: 'A', fret: 7 }] },
    ];

    const fingered = buildMelodyFingeredEvents(events);
    expect(fingered[0][0]?.finger).toBe(1);
    expect(fingered[1][0]?.finger).toBe(4);
    expect(fingered[2][0]?.finger).toBe(4);
  });

  it('assigns fingers for polyphonic event notes from one hand position', () => {
    const events: MelodyEvent[] = [
      {
        notes: [
          { note: 'C', stringName: 'A', fret: 3 },
          { note: 'E', stringName: 'D', fret: 2 },
          { note: 'G', stringName: 'G', fret: 0 },
        ],
      },
    ];

    const fingered = buildMelodyFingeredEvents(events);
    expect(fingered[0]).toEqual([
      { note: 'C', string: 'A', fret: 3, finger: 2 },
      { note: 'E', string: 'D', fret: 2, finger: 1 },
      { note: 'G', string: 'G', fret: 0, finger: 0 },
    ]);
  });
});
