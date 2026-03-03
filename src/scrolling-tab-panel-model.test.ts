import { describe, expect, it } from 'vitest';
import { buildScrollingTabPanelModel } from './scrolling-tab-panel-model';
import type { MelodyDefinition } from './melody-library';

const melody: MelodyDefinition = {
  id: 'test',
  name: 'Test Melody',
  source: 'custom',
  instrumentName: 'guitar',
  events: [
    {
      durationBeats: 1,
      barIndex: 0,
      notes: [{ note: 'E', stringName: 'e', fret: 0 }],
    },
    {
      durationBeats: 2,
      barIndex: 0,
      notes: [{ note: 'G', stringName: 'B', fret: 8 }],
    },
    {
      durationBeats: 1,
      barIndex: 1,
      notes: [
        { note: 'C', stringName: 'B', fret: 1 },
        { note: 'E', stringName: 'e', fret: 0 },
      ],
    },
  ],
};

describe('scrolling-tab-panel-model', () => {
  it('builds timed events with a lead-in and note positions', () => {
    const model = buildScrollingTabPanelModel({
      melody,
      stringOrder: ['e', 'B', 'G', 'D', 'A', 'E'],
      bpm: 120,
      studyRange: { startIndex: 0, endIndex: 2 },
      activeEventIndex: null,
      leadInSec: 1,
    });

    expect(model.events).toHaveLength(3);
    expect(model.events[0]?.startTimeSec).toBe(1);
    expect(model.events[1]?.startTimeSec).toBe(1.5);
    expect(model.events[2]?.startTimeSec).toBe(2.5);
    expect(model.events[2]?.isChord).toBe(true);
    expect(model.events[2]?.notes.map((note) => note.noteIndex)).toEqual([1, 0]);
    expect(model.events[2]?.notes.map((note) => note.stringIndex)).toEqual([0, 1]);
    expect(model.stringNames).toEqual(['e', 'B', 'G', 'D', 'A', 'E']);
    expect(model.barMarkers).toEqual([
      { barIndex: 0, label: 'Bar 1', startTimeSec: 1 },
      { barIndex: 1, label: 'Bar 2', startTimeSec: 2.5 },
    ]);
    expect(model.currentTimeSec).toBe(0);
  });

  it('anchors current time to the active event inside the visible study range', () => {
    const model = buildScrollingTabPanelModel({
      melody,
      stringOrder: ['e', 'B', 'G', 'D', 'A', 'E'],
      bpm: 120,
      studyRange: { startIndex: 1, endIndex: 2 },
      activeEventIndex: 2,
      leadInSec: 1.25,
    });

    expect(model.events).toHaveLength(2);
    expect(model.events[0]?.index).toBe(1);
    expect(model.events[1]?.index).toBe(2);
    expect(model.activeEventIndex).toBe(2);
    expect(model.currentTimeSec).toBe(model.events[1]?.startTimeSec);
  });

  it('maps performance feedback statuses onto matching rendered notes', () => {
    const model = buildScrollingTabPanelModel({
      melody,
      stringOrder: ['e', 'B', 'G', 'D', 'A', 'E'],
      bpm: 120,
      studyRange: { startIndex: 0, endIndex: 2 },
      activeEventIndex: 2,
      performanceFeedbackByEvent: {
        0: [{ note: 'E', stringName: 'e', fret: 0, status: 'correct' }],
        2: [
          { note: 'C', stringName: 'B', fret: 1, status: 'wrong' },
          { note: 'E', stringName: 'e', fret: 0, status: 'missed' },
        ],
      },
    });

    expect(model.events[0]?.notes[0]?.performanceStatus).toBe('correct');
    expect(model.events[2]?.notes[0]?.performanceStatus).toBe('missed');
    expect(model.events[2]?.notes[1]?.performanceStatus).toBe('wrong');
  });
});
