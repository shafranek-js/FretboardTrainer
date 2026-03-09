import { describe, expect, it, vi } from 'vitest';
import { instruments } from './instruments';
import {
  resolveMelodyFretboardPreview,
  resolveMelodyTimelineRenderState,
} from './melody-timeline-ui-state';

const mockedMelody = vi.hoisted(() => ({
  id: 'test:melody',
  name: 'Test Melody',
  source: 'builtin' as const,
  instrumentName: 'guitar' as const,
  tabText: '| count 1 |',
  events: [
    { notes: [{ note: 'E', stringName: 'e', fret: 0 }] },
    { notes: [{ note: 'F', stringName: 'e', fret: 1 }] },
    { notes: [{ note: 'G', stringName: 'e', fret: 3 }] },
    { notes: [{ note: 'A', stringName: 'e', fret: 5 }] },
    { notes: [{ note: 'B', stringName: 'e', fret: 7 }] },
  ],
}));

vi.mock('./melody-library', () => ({
  getMelodyById: (id: string) => (id === mockedMelody.id ? JSON.parse(JSON.stringify(mockedMelody)) : null),
}));

vi.mock('./melody-string-shift', () => ({
  getMelodyWithPracticeAdjustments: (
    melody: typeof mockedMelody,
    transposeSemitones: number,
    stringShift: number
  ) => {
    if (transposeSemitones === 0 && stringShift === 0) {
      return melody;
    }
    return {
      ...melody,
      events: melody.events.map((event, eventIndex) => ({
        ...event,
        notes: event.notes.map((note, noteIndex) =>
          eventIndex === 0 && noteIndex === 0
            ? { ...note, note: 'F#', fret: (note.fret ?? 0) + 2 }
            : { ...note }
        ),
      })),
    };
  },
}));

describe('melody-timeline-ui-state', () => {
  it('returns preview details for a previewed melody event on the fretboard', () => {
    const preview = resolveMelodyFretboardPreview({
      trainingMode: 'melody',
      isListening: false,
      melodyTimelinePreviewIndex: 0,
      selectedMelodyId: 'test:melody',
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
      selectedMelodyId: 'test:melody',
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
      selectedMelodyId: 'test:melody',
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
      selectedMelodyId: 'test:melody',
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
      performanceTimelineFeedbackKey: 'test:melody|guitar|2|0',
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
      selectedMelodyId: 'test:melody',
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
      performanceTimelineFeedbackKey: 'test:melody|guitar|0|0',
      performanceTimelineFeedbackByEvent: feedback,
    });

    expect(renderState).not.toBeNull();
    expect(renderState?.activeIndex).toBe(1);
    expect(renderState?.performanceFeedbackByEvent).toBe(feedback);
  });
  it('uses the current study melody prompt index while listening instead of lagging one event behind', () => {
    const renderState = resolveMelodyTimelineRenderState({
      trainingMode: 'melody',
      selectedMelodyId: 'test:melody',
      instrument: instruments.guitar,
      melodyTransposeSemitones: 0,
      melodyStringShift: 0,
      melodyStudyRangeStartIndex: 0,
      melodyStudyRangeEndIndex: 4,
      isListening: true,
      currentMelodyEventIndex: 2,
      performanceActiveEventIndex: null,
      melodyTimelinePreviewIndex: null,
      melodyTimelinePreviewLabel: null,
      performanceTimelineFeedbackKey: null,
      performanceTimelineFeedbackByEvent: {},
    });

    expect(renderState).not.toBeNull();
    expect(renderState?.activeIndex).toBe(2);
    expect(renderState?.modeLabel).toBe('Session');
  });
});

