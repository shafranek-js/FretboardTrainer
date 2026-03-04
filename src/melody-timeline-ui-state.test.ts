import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import {
  resolveMelodyFretboardPreview,
  resolveMelodyTimelineRenderState,
} from './melody-timeline-ui-state';

describe('melody-timeline-ui-state', () => {
  it('returns preview details for a previewed melody event on the fretboard', () => {
    const preview = resolveMelodyFretboardPreview({
      trainingMode: 'melody',
      isListening: false,
      melodyTimelinePreviewIndex: 0,
      selectedMelodyId: 'builtin:guitar:ode_to_joy_intro',
      instrument: instruments.guitar,
      melodyTransposeSemitones: 0,
      melodyStringShift: 0,
    });

    expect(preview.eventFingering.length).toBeGreaterThan(0);
    expect(preview.targetNote).toBeTruthy();
    expect(preview.targetString).toBeTruthy();
  });

  it('returns null render state outside melody workflow modes', () => {
    const renderState = resolveMelodyTimelineRenderState({
      trainingMode: 'random',
      selectedMelodyId: 'builtin:guitar:ode_to_joy_intro',
      instrument: instruments.guitar,
      melodyTransposeSemitones: 0,
      melodyStringShift: 0,
      melodyStudyRangeStartIndex: 0,
      melodyStudyRangeEndIndex: 0,
      isListening: false,
      currentMelodyEventIndex: 0,
      performanceActiveEventIndex: null,
      melodyTimelinePreviewIndex: null,
      melodyTimelinePreviewLabel: null,
      performanceTimelineFeedbackKey: null,
      performanceTimelineFeedbackByEvent: {},
    });

    expect(renderState).toBeNull();
  });

  it('prefers preview state and reuses source tab text when no practice adjustments exist', () => {
    const renderState = resolveMelodyTimelineRenderState({
      trainingMode: 'melody',
      selectedMelodyId: 'builtin:guitar:ode_to_joy_intro',
      instrument: instruments.guitar,
      melodyTransposeSemitones: 0,
      melodyStringShift: 0,
      melodyStudyRangeStartIndex: 0,
      melodyStudyRangeEndIndex: 0,
      isListening: false,
      currentMelodyEventIndex: 4,
      performanceActiveEventIndex: null,
      melodyTimelinePreviewIndex: 2,
      melodyTimelinePreviewLabel: 'Preview',
      performanceTimelineFeedbackKey: null,
      performanceTimelineFeedbackByEvent: {},
    });

    expect(renderState).not.toBeNull();
    expect(renderState?.activeIndex).toBe(2);
    expect(renderState?.modeLabel).toBe('Preview');
    expect(renderState?.copyText).toContain('count 1');
  });

  it('uses exported adjusted tab text and matching performance feedback in performance mode', () => {
    const feedback = {
      0: [{ note: 'B', stringName: 'e', fret: 7, status: 'correct' as const }],
    };
    const renderState = resolveMelodyTimelineRenderState({
      trainingMode: 'performance',
      selectedMelodyId: 'builtin:guitar:ode_to_joy_intro',
      instrument: instruments.guitar,
      melodyTransposeSemitones: 2,
      melodyStringShift: 0,
      melodyStudyRangeStartIndex: 0,
      melodyStudyRangeEndIndex: 0,
      isListening: true,
      currentMelodyEventIndex: 3,
      performanceActiveEventIndex: 3,
      melodyTimelinePreviewIndex: null,
      melodyTimelinePreviewLabel: null,
      performanceTimelineFeedbackKey: 'builtin:guitar:ode_to_joy_intro|guitar|2|0',
      performanceTimelineFeedbackByEvent: feedback,
    });

    expect(renderState).not.toBeNull();
    expect(renderState?.activeIndex).toBe(3);
    expect(renderState?.modeLabel).toBe('Session');
    expect(renderState?.showPrerollLeadIn).toBe(true);
    expect(renderState?.performanceFeedbackByEvent).toBe(feedback);
    expect(renderState?.copyText).not.toBe(renderState?.baseMelody.tabText?.trim());
  });

  it('uses performanceActiveEventIndex for performance timeline state even when currentMelodyEventIndex moved ahead', () => {
    const feedback = {
      1: [{ note: 'D', stringName: 'e', fret: 10, status: 'correct' as const }],
    };
    const renderState = resolveMelodyTimelineRenderState({
      trainingMode: 'performance',
      selectedMelodyId: 'builtin:guitar:ode_to_joy_intro',
      instrument: instruments.guitar,
      melodyTransposeSemitones: 0,
      melodyStringShift: 0,
      melodyStudyRangeStartIndex: 0,
      melodyStudyRangeEndIndex: 4,
      isListening: true,
      currentMelodyEventIndex: 4,
      performanceActiveEventIndex: 1,
      melodyTimelinePreviewIndex: null,
      melodyTimelinePreviewLabel: null,
      performanceTimelineFeedbackKey: 'builtin:guitar:ode_to_joy_intro|guitar|0|0',
      performanceTimelineFeedbackByEvent: feedback,
    });

    expect(renderState).not.toBeNull();
    expect(renderState?.activeIndex).toBe(1);
    expect(renderState?.performanceFeedbackByEvent).toBe(feedback);
  });
});
