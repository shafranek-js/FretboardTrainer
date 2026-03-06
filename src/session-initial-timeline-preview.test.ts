import { describe, expect, it, vi } from 'vitest';

import { instruments } from './instruments';
import { buildSessionInitialTimelinePreview } from './session-initial-timeline-preview';

const melodyLibraryMocks = vi.hoisted(() => ({
  getMelodyById: vi.fn((melodyId: string) => {
    if (melodyId !== 'builtin:guitar:ode_to_joy_intro') return null;
    return {
      id: 'builtin:guitar:ode_to_joy_intro',
      name: 'Ode to Joy Intro',
      source: 'builtin' as const,
      instrumentName: 'guitar' as const,
      events: Array.from({ length: 24 }, () => ({
        durationBeats: 1,
        notes: [{ note: 'E4', stringName: 'e', fret: 0 }],
      })),
    };
  }),
}));

vi.mock('./melody-library', () => ({
  getMelodyById: melodyLibraryMocks.getMelodyById,
}));

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
