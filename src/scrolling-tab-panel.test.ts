import { describe, expect, it } from 'vitest';
import { buildScrollingTabPanelStructuralKey, getPerformanceFeedbackSignature } from './scrolling-tab-panel-render-key';
import type { MelodyDefinition } from './melody-library';

const melody: MelodyDefinition = {
  id: 'test:melody',
  name: 'Test Melody',
  source: 'custom',
  instrumentName: 'guitar',
  events: [
    {
      durationBeats: 1,
      notes: [{ note: 'E', stringName: 'e', fret: 0 }],
    },
    {
      durationBeats: 1,
      notes: [{ note: 'F', stringName: 'e', fret: 1 }],
    },
  ],
};

describe('scrolling-tab-panel', () => {
  it('builds a stable performance feedback signature', () => {
    expect(
      getPerformanceFeedbackSignature({
        1: [{ note: 'F', stringName: 'e', fret: 1, status: 'missed' }],
        0: [{ note: 'E', stringName: 'e', fret: 0, status: 'wrong' }],
      })
    ).toBe('0:wrong:E:e:0|1:missed:F:e:1');
  });

  it('changes the structural key when performance feedback changes', () => {
    const baseInput = {
      melody,
      bpm: 90,
      zoomScale: 1,
      studyRange: { startIndex: 0, endIndex: 1 },
    };

    const withoutFeedback = buildScrollingTabPanelStructuralKey(baseInput);
    const withFeedback = buildScrollingTabPanelStructuralKey({
      ...baseInput,
      performanceFeedbackByEvent: {
        0: [{ note: 'E', stringName: 'e', fret: 0, status: 'wrong' }],
      },
    });

    expect(withFeedback).not.toBe(withoutFeedback);
  });
});

