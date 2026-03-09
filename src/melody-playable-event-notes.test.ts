import { describe, expect, it } from 'vitest';
import { getPlayableMelodyEventNotes } from './melody-playable-event-notes';

describe('melody-playable-event-notes', () => {
  it('merges fingered notes with any additional raw positioned notes', () => {
    const result = getPlayableMelodyEventNotes(
      {
        notes: [{ note: 'E', stringName: 'e', fret: 0 }],
      },
      [{ note: 'F', string: 'B', fret: 6, finger: 2 }]
    );

    expect(result).toEqual([
      { note: 'F', string: 'B', fret: 6, finger: 2 },
      { note: 'E', string: 'e', fret: 0, finger: undefined },
    ]);
  });

  it('falls back to raw event string and fret positions when fingering is empty', () => {
    const result = getPlayableMelodyEventNotes(
      {
        notes: [
          { note: 'E', stringName: 'e', fret: 0 },
          { note: 'G', stringName: 'B', fret: 8, finger: 3 },
          { note: 'A', stringName: null, fret: null },
        ],
      },
      []
    );

    expect(result).toEqual([
      { note: 'E', string: 'e', fret: 0, finger: undefined },
      { note: 'G', string: 'B', fret: 8, finger: 3 },
    ]);
  });

  it('merges partial fingering with raw positioned notes from the event', () => {
    const result = getPlayableMelodyEventNotes(
      {
        notes: [
          { note: 'C', stringName: 'A', fret: 3 },
          { note: 'E', stringName: 'D', fret: 2 },
        ],
      },
      [{ note: 'C', string: 'A', fret: 3, finger: 1 }]
    );

    expect(result).toEqual([
      { note: 'C', string: 'A', fret: 3, finger: 1 },
      { note: 'E', string: 'D', fret: 2, finger: undefined },
    ]);
  });
});
