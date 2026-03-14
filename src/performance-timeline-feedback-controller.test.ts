import { describe, expect, it, vi } from 'vitest';
import { createPerformanceTimelineFeedbackController } from './performance-timeline-feedback-controller';
import type { Prompt } from './types';

type PerformanceTimelineFeedbackState = Parameters<
  typeof createPerformanceTimelineFeedbackController
>[0]['state'];

function createState(): PerformanceTimelineFeedbackState {
  return {
    performanceTimelineFeedbackKey: null,
    performanceTimelineFeedbackByEvent: { 1: [{ status: 'correct' }] },
    performanceTimingByEvent: { 1: [{ bucket: 'late' }] },
    performanceOnsetRejectsByEvent: { 1: [{ reasonKey: 'weak_attack' }] },
    performanceCaptureTelemetryByEvent: { 1: { promptAttemptCount: 2 } },
    performancePromptHadWrongAttempt: false,
    currentPrompt: {
      displayText: 'Play C',
      targetNote: 'C',
      targetString: 'A',
      targetChordNotes: [],
      targetChordFingering: [],
      targetMelodyEventNotes: [{ note: 'C', string: 'A', fret: 3 }],
    } as Prompt,
    wrongDetectedString: 'E',
    wrongDetectedFret: 7,
  };
}

describe('performance-timeline-feedback-controller', () => {
  it('clears all performance feedback buckets together', () => {
    const state = createState();
    const controller = createPerformanceTimelineFeedbackController({
      state,
      getCurrentEventIndex: () => 1,
      getFeedbackKey: () => 'melody|guitar|0|0',
      redrawFretboard: vi.fn(),
      scheduleTimelineRender: vi.fn(),
    });

    controller.clearFeedback();

    expect(state.performanceTimelineFeedbackKey).toBeNull();
    expect(state.performanceTimelineFeedbackByEvent).toEqual({});
    expect(state.performanceTimingByEvent).toEqual({});
    expect(state.performanceOnsetRejectsByEvent).toEqual({});
    expect(state.performanceCaptureTelemetryByEvent).toEqual({});
  });

  it('records a success attempt into the active event bucket and redraws by default', () => {
    const state = createState();
    state.performanceTimelineFeedbackByEvent = {};
    const redrawFretboard = vi.fn();
    const controller = createPerformanceTimelineFeedbackController({
      state,
      getCurrentEventIndex: () => 2,
      getFeedbackKey: () => 'melody|guitar|0|0',
      redrawFretboard,
      scheduleTimelineRender: vi.fn(),
    });

    controller.recordSuccess(state.currentPrompt);

    expect(state.performanceTimelineFeedbackKey).toBe('melody|guitar|0|0');
    expect(state.performanceTimelineFeedbackByEvent[2]).toHaveLength(1);
    expect(redrawFretboard).toHaveBeenCalledTimes(1);
  });

  it('records wrong attempts and timing into the active event bucket', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-11T12:00:00Z'));
    const state = createState();
    state.performanceTimelineFeedbackByEvent = {};
    state.performanceTimingByEvent = {};
    const scheduleTimelineRender = vi.fn();
    const controller = createPerformanceTimelineFeedbackController({
      state,
      getCurrentEventIndex: () => 3,
      getFeedbackKey: () => 'melody|guitar|0|0',
      redrawFretboard: vi.fn(),
      scheduleTimelineRender,
    });

    controller.recordWrongAttempt('F#');
    controller.recordTiming({
      bucket: 'late',
      label: 'Late',
      weight: 0.4,
      signedOffsetMs: 82,
    });

    expect(state.performancePromptHadWrongAttempt).toBe(true);
    expect(state.performanceTimelineFeedbackByEvent[3]).toHaveLength(1);
    expect(state.performanceTimingByEvent[3]).toEqual([
      {
        bucket: 'late',
        label: 'Late',
        weight: 0.4,
        signedOffsetMs: 82,
        judgedAtMs: Date.parse('2026-03-11T12:00:00Z'),
      },
    ]);
    expect(scheduleTimelineRender).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

