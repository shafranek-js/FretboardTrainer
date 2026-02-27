import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import { resolveMelodyEventPositions } from './melody-position-resolver';
import type { MelodyEvent } from './melody-library';

describe('melody-position-resolver', () => {
  it('fills missing note positions while preserving explicit positions', () => {
    const events: MelodyEvent[] = [
      {
        durationBeats: 1,
        notes: [
          { note: 'C', stringName: null, fret: null },
          { note: 'E', stringName: 'D', fret: 2 },
        ],
      },
      {
        durationBeats: 1,
        notes: [
          { note: 'G', stringName: null, fret: null },
          { note: 'A', stringName: null, fret: null },
        ],
      },
    ];

    const resolved = resolveMelodyEventPositions(events, instruments.guitar);

    expect(resolved.filledPositions).toBeGreaterThanOrEqual(3);
    expect(resolved.events[0]?.notes[1]).toEqual({ note: 'E', stringName: 'D', fret: 2 });
    resolved.events.forEach((event) => {
      event.notes.forEach((note) => {
        expect(note.stringName).not.toBeNull();
        expect(note.fret).not.toBeNull();
      });
    });
  });

  it('keeps duplicated pitch classes as distinct playable positions', () => {
    const events: MelodyEvent[] = [
      {
        durationBeats: 1,
        notes: [
          { note: 'E', stringName: null, fret: null },
          { note: 'E', stringName: null, fret: null },
          { note: 'G', stringName: null, fret: null },
        ],
      },
    ];

    const resolved = resolveMelodyEventPositions(events, instruments.guitar);
    const first = resolved.events[0];
    expect(first?.notes.length).toBe(3);
    const eNotes = first?.notes.filter((note) => note.note === 'E') ?? [];
    expect(eNotes).toHaveLength(2);
    expect(new Set(eNotes.map((note) => note.stringName)).size).toBe(2);
  });

  it('supports flat note names by normalizing to sharp pitch classes', () => {
    const events: MelodyEvent[] = [
      {
        durationBeats: 1,
        notes: [{ note: 'Bb', stringName: null, fret: null }],
      },
    ];

    const resolved = resolveMelodyEventPositions(events, instruments.guitar);
    expect(resolved.events[0]?.notes[0]?.note).toBe('A#');
    expect(resolved.events[0]?.notes[0]?.stringName).not.toBeNull();
    expect(resolved.events[0]?.notes[0]?.fret).not.toBeNull();
  });
});
