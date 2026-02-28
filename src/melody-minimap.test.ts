import { describe, expect, it } from 'vitest';
import { buildMelodyMinimapLayout, resolveMelodyMinimapEventIndexFromRatio } from './melody-minimap';

describe('melody-minimap', () => {
  it('builds event spans and note rects across strings', () => {
    const layout = buildMelodyMinimapLayout(
      {
        events: [
          { notes: [{ note: 'E', stringName: 'e', fret: 0 }] },
          {
            notes: [
              { note: 'C', stringName: 'B', fret: 1 },
              { note: 'E', stringName: 'G', fret: 9 },
            ],
          },
          { notes: [{ note: 'G', stringName: 'D', fret: 5 }] },
        ],
      },
      ['e', 'B', 'G', 'D', 'A', 'E'],
      [1, 2, 1],
      1,
      { startIndex: 1, endIndex: 2 }
    );

    expect(layout.eventSegments).toHaveLength(3);
    expect(layout.eventSegments[0]?.startRatio).toBe(0);
    expect(layout.eventSegments[0]?.endRatio).toBe(0.25);
    expect(layout.eventSegments[1]?.isActive).toBe(true);
    expect(layout.eventSegments[1]?.isInStudyRange).toBe(true);
    expect(layout.rangeStartRatio).toBe(0.25);
    expect(layout.rangeEndRatio).toBe(1);
    expect(layout.activeRatio).toBe(0.5);
    expect(layout.noteRects).toEqual([
      expect.objectContaining({ eventIndex: 0, rowIndex: 0, finger: 0 }),
      expect.objectContaining({ eventIndex: 1, rowIndex: 1, finger: 1 }),
      expect.objectContaining({ eventIndex: 1, rowIndex: 2, finger: 4 }),
      expect.objectContaining({ eventIndex: 2, rowIndex: 3, finger: 4 }),
    ]);
  });

  it('falls back to a center row when string names are missing', () => {
    const layout = buildMelodyMinimapLayout(
      {
        events: [{ notes: [{ note: 'C', stringName: null, fret: null }] }],
      },
      ['e', 'B', 'G', 'D', 'A', 'E'],
      [1],
      null,
      null
    );

    expect(layout.noteRects[0]?.rowIndex).toBe(2);
  });

  it('resolves an event index from minimap ratio', () => {
    const layout = buildMelodyMinimapLayout(
      {
        events: [{ notes: [] }, { notes: [] }, { notes: [] }],
      },
      ['e', 'B', 'G', 'D', 'A', 'E'],
      [1, 2, 1],
      null,
      null
    );

    expect(resolveMelodyMinimapEventIndexFromRatio(layout.eventSegments, 0)).toBe(0);
    expect(resolveMelodyMinimapEventIndexFromRatio(layout.eventSegments, 0.45)).toBe(1);
    expect(resolveMelodyMinimapEventIndexFromRatio(layout.eventSegments, 0.99)).toBe(2);
  });
});
