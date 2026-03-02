import { describe, expect, it } from 'vitest';

import { instruments } from './instruments';
import { buildSessionInitialTimelinePreview } from './session-initial-timeline-preview';

describe('session-initial-timeline-preview', () => {
  it('returns the first study-range event for performance sessions', () => {
    expect(
      buildSessionInitialTimelinePreview({
        trainingMode: 'performance',
        selectedMelodyId: 'builtin:guitar:ode_to_joy_intro',
        currentInstrument: instruments.guitar,
        melodyTransposeSemitones: 0,
        melodyStringShift: 0,
        melodyStudyRangeStartIndex: 6,
        melodyStudyRangeEndIndex: 14,
      })
    ).toEqual({ eventIndex: 6 });
  });

  it('returns null outside performance mode', () => {
    expect(
      buildSessionInitialTimelinePreview({
        trainingMode: 'melody',
        selectedMelodyId: 'builtin:guitar:ode_to_joy_intro',
        currentInstrument: instruments.guitar,
        melodyTransposeSemitones: 0,
        melodyStringShift: 0,
        melodyStudyRangeStartIndex: 0,
        melodyStudyRangeEndIndex: 20,
      })
    ).toBeNull();
  });

  it('returns null when the selected melody is unavailable', () => {
    expect(
      buildSessionInitialTimelinePreview({
        trainingMode: 'performance',
        selectedMelodyId: 'missing',
        currentInstrument: instruments.guitar,
        melodyTransposeSemitones: 0,
        melodyStringShift: 0,
        melodyStudyRangeStartIndex: 0,
        melodyStudyRangeEndIndex: 20,
      })
    ).toBeNull();
  });
});
