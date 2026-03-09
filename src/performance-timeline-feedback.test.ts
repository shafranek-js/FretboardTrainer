import { describe, expect, it } from 'vitest';
import type { Prompt } from './types';
import {
  appendPerformanceTimelineAttempts,
  buildPerformanceTimelineFeedbackKey,
  buildPerformanceTimelineSuccessAttempts,
  buildPerformanceTimelineWrongAttempts,
} from './performance-timeline-feedback';

function createPrompt(): Prompt {
  return {
    displayText: 'Performance [1/2]: C + E',
    targetNote: null,
    targetString: null,
    targetChordNotes: ['C', 'E'],
    targetChordFingering: [],
    targetMelodyEventNotes: [
      { note: 'C', string: 'A', fret: 3, finger: 1 },
      { note: 'E', string: 'D', fret: 2, finger: 2 },
    ],
    melodyEventDurationMs: 500,
    baseChordName: null,
  };
}

describe('performance-timeline-feedback', () => {
  it('builds a stable feedback key for the active melody setup', () => {
    expect(
      buildPerformanceTimelineFeedbackKey({
        melodyId: 'melody:1',
        instrumentName: 'guitar',
        melodyTransposeSemitones: 2,
        melodyStringShift: -1,
      })
    ).toBe('melody:1|guitar|2|-1');
  });

  it('extracts positioned success attempts from a performance prompt', () => {
    expect(buildPerformanceTimelineSuccessAttempts(createPrompt())).toEqual([
      { note: 'C', stringName: 'A', fret: 3, status: 'correct' },
      { note: 'E', stringName: 'D', fret: 2, status: 'correct' },
    ]);
  });

  it('builds wrong attempts from target melody positions when a prompt is available', () => {
    expect(buildPerformanceTimelineWrongAttempts(createPrompt(), { note: 'F' })).toEqual([
      { note: 'C', stringName: 'A', fret: 3, status: 'wrong' },
      { note: 'E', stringName: 'D', fret: 2, status: 'wrong' },
    ]);
  });

  it('falls back to the detected wrong note when the prompt has no positioned notes', () => {
    expect(
      buildPerformanceTimelineWrongAttempts(
        {
          displayText: 'Performance: mystery',
          targetNote: 'F',
          targetString: null,
          targetChordNotes: [],
          targetChordFingering: [],
          targetMelodyEventNotes: [],
          baseChordName: null,
        },
        { note: 'F', stringName: 'E', fret: 1 }
      )
    ).toEqual([{ note: 'F', stringName: 'E', fret: 1, status: 'wrong' }]);
  });

  it('deduplicates immediately repeated attempts in the same event bucket', () => {
    const feedbackByEvent = {};

    appendPerformanceTimelineAttempts(feedbackByEvent, 1, [
      { note: 'G', stringName: 'E', fret: 3, status: 'wrong' },
    ]);
    appendPerformanceTimelineAttempts(feedbackByEvent, 1, [
      { note: 'G', stringName: 'E', fret: 3, status: 'wrong' },
      { note: 'A', stringName: 'A', fret: 0, status: 'wrong' },
    ]);

    expect(feedbackByEvent).toEqual({
      1: [
        { note: 'G', stringName: 'E', fret: 3, status: 'wrong' },
        { note: 'A', stringName: 'A', fret: 0, status: 'wrong' },
      ],
    });
  });
});
