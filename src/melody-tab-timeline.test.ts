import { describe, expect, it } from 'vitest';
import { buildMelodyTabTimelineViewModel } from './melody-tab-timeline-model';
import type { MelodyDefinition } from './melody-library';

const TEST_MELODY: MelodyDefinition = {
  id: 'test:melody',
  name: 'Test',
  source: 'custom',
  instrumentName: 'guitar',
  events: [
    {
      durationBeats: 1,
      notes: [{ note: 'E', stringName: 'E', fret: 0 }],
    },
    {
      durationBeats: 1,
      notes: [{ note: 'G', stringName: 'E', fret: 3 }],
    },
    {
      durationBeats: 1,
      notes: [
        { note: 'C', stringName: 'A', fret: 3 },
        { note: 'E', stringName: 'D', fret: 2 },
      ],
    },
  ],
};

describe('melody-tab-timeline', () => {
  it('builds timeline rows for each string with active column', () => {
    const model = buildMelodyTabTimelineViewModel(TEST_MELODY, ['e', 'B', 'G', 'D', 'A', 'E'], 1);
    expect(model.totalEvents).toBe(3);
    expect(model.activeEventIndex).toBe(1);
    expect(model.rows).toHaveLength(6);
    model.rows.forEach((row) => {
      expect(row.cells).toHaveLength(3);
    });

    const lowERow = model.rows.find((row) => row.stringName === 'E');
    expect(lowERow?.cells[0]?.notes[0]?.fret).toBe(0);
    expect(lowERow?.cells[1]?.isActive).toBe(true);
    expect(lowERow?.cells[1]?.notes[0]?.fret).toBe(3);
  });

  it('keeps polyphonic notes in the same event column on their strings', () => {
    const model = buildMelodyTabTimelineViewModel(TEST_MELODY, ['e', 'B', 'G', 'D', 'A', 'E'], 2);
    const aRow = model.rows.find((row) => row.stringName === 'A');
    const dRow = model.rows.find((row) => row.stringName === 'D');
    expect(aRow?.cells[2]?.notes).toEqual([{ note: 'C', stringName: 'A', fret: 3, finger: 2, noteIndex: 0 }]);
    expect(dRow?.cells[2]?.notes).toEqual([{ note: 'E', stringName: 'D', fret: 2, finger: 1, noteIndex: 1 }]);
  });

  it('marks the selected study range on timeline cells', () => {
    const model = buildMelodyTabTimelineViewModel(
      TEST_MELODY,
      ['e', 'B', 'G', 'D', 'A', 'E'],
      1,
      { startIndex: 1, endIndex: 2 }
    );
    const lowERow = model.rows.find((row) => row.stringName === 'E');

    expect(lowERow?.cells[0]?.isInStudyRange).toBe(false);
    expect(lowERow?.cells[1]?.isInStudyRange).toBe(true);
    expect(lowERow?.cells[1]?.isStudyRangeStart).toBe(true);
    expect(lowERow?.cells[2]?.isInStudyRange).toBe(true);
    expect(lowERow?.cells[2]?.isStudyRangeEnd).toBe(true);
  });
});
