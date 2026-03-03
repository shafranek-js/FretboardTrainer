import { describe, expect, it } from 'vitest';
import { buildScrollingTabPanelMetaText } from './scrolling-tab-panel-meta';
import type { ScrollingTabPanelModel } from './scrolling-tab-panel-model';

const model: ScrollingTabPanelModel = {
  events: [
    {
      index: 2,
      barIndex: 0,
      startTimeSec: 1.4,
      durationSec: 0.5,
      isChord: false,
      notes: [{ stringIndex: 0, stringName: 'e', fret: 0, note: 'E', performanceStatus: null }],
    },
    {
      index: 3,
      barIndex: 1,
      startTimeSec: 1.9,
      durationSec: 1,
      isChord: false,
      notes: [{ stringIndex: 1, stringName: 'B', fret: 1, note: 'C', performanceStatus: 'correct' }],
    },
  ],
  barMarkers: [
    { barIndex: 0, label: 'Bar 1', startTimeSec: 1.4 },
    { barIndex: 1, label: 'Bar 2', startTimeSec: 1.9 },
  ],
  totalDurationSec: 4.3,
  currentTimeSec: 2.1,
  activeEventIndex: 3,
  minDurationSec: 0.5,
  leadInSec: 1.4,
};

describe('scrolling-tab-panel-meta', () => {
  it('returns an empty meta string for runtime playback', () => {
    expect(
      buildScrollingTabPanelMetaText(model, {
        bpm: 96,
        studyRange: { startIndex: 2, endIndex: 3 },
        hasRuntimeCursor: true,
      })
    ).toBe('');
  });

  it('returns an empty meta string for static preview', () => {
    expect(
      buildScrollingTabPanelMetaText(
        {
          ...model,
          activeEventIndex: null,
        },
        {
          bpm: 84,
          studyRange: { startIndex: 2, endIndex: 3 },
          hasRuntimeCursor: false,
        }
      )
    ).toBe('');
  });
});
