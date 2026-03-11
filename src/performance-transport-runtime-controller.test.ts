import { describe, expect, it, vi } from 'vitest';
import { createPerformanceTransportRuntimeController } from './performance-transport-runtime-controller';
import type { MelodyDefinition } from './melody-library';

function createMelody(): MelodyDefinition {
  return {
    id: 'melody:test',
    name: 'Test Melody',
    source: 'custom',
    instrumentName: 'guitar',
    events: [
      { notes: [{ note: 'C', stringName: 'A', fret: 3 }], durationBeats: 1 },
      { notes: [{ note: 'D', stringName: 'A', fret: 5 }], durationBeats: 2 },
    ],
  };
}

function createState() {
  return {
    isListening: true,
    currentInstrument: { name: 'guitar' },
    melodyStudyRangeStartIndex: 0,
    melodyStudyRangeById: {},
    performancePrerollLeadInVisible: false,
    performancePrerollStartedAtMs: null,
    performancePrerollDurationMs: 0,
    performancePrerollStepIndex: null,
    performanceRuntimeStartedAtMs: null,
    performanceTransportAnimationId: 0,
    performanceActiveEventIndex: null,
    currentMelodyEventIndex: 0,
    currentMelodyId: null,
    currentPrompt: null,
    performancePromptResolved: false,
    activeSessionStats: null,
    performanceRunCompleted: false,
    pendingSessionStopResultMessage: null,
    currentMelodyEventFoundNotes: new Set<string>(),
    startTime: 0,
    melodyTransposeSemitones: 0,
    melodyStringShift: 0,
  } as any;
}

function createDom(trainingMode = 'performance') {
  return {
    trainingMode: { value: trainingMode },
    melodySelector: { value: 'melody:test' },
    melodyDemoBpm: { value: '120' },
  } as any;
}

describe('performance-transport-runtime-controller', () => {
  it('updates preroll timeline state and refreshes timeline UI', () => {
    const state = createState();
    const dom = createDom();
    const redrawFretboard = vi.fn();
    const scheduleTimelineRender = vi.fn();
    const controller = createPerformanceTransportRuntimeController({
      dom,
      state,
      isPerformanceStyleMode: (mode) => mode === 'performance' || mode === 'practice',
      getMelodyById: () => createMelody(),
      getPracticeAdjustedMelody: (melody) => melody,
      redrawFretboard,
      scheduleTimelineRender,
      clearPerformanceTimelineFeedback: vi.fn(),
      clearWrongDetectedHighlight: vi.fn(),
      onResolveMissedPrompt: vi.fn(),
      onAdvancePrompt: vi.fn(),
      requestAnimationFrame: vi.fn(() => 1),
      cancelAnimationFrame: vi.fn(),
      now: () => 5_000,
    });

    controller.beginPrerollTimeline(4, 1600);
    controller.advancePrerollTimeline(2, 4);
    controller.finishPrerollTimeline();

    expect(state.performancePrerollLeadInVisible).toBe(false);
    expect(state.performancePrerollStartedAtMs).toBeNull();
    expect(state.performancePrerollDurationMs).toBe(0);
    expect(state.performancePrerollStepIndex).toBeNull();
    expect(redrawFretboard).toHaveBeenCalledTimes(3);
    expect(scheduleTimelineRender).toHaveBeenCalledTimes(3);
  });

  it('syncs the active prompt event from continuous runtime transport', () => {
    const state = createState();
    const dom = createDom();
    state.performanceRuntimeStartedAtMs = 1_000;
    const controller = createPerformanceTransportRuntimeController({
      dom,
      state,
      isPerformanceStyleMode: (mode) => mode === 'performance' || mode === 'practice',
      getMelodyById: () => createMelody(),
      getPracticeAdjustedMelody: (melody) => melody,
      redrawFretboard: vi.fn(),
      scheduleTimelineRender: vi.fn(),
      clearPerformanceTimelineFeedback: vi.fn(),
      clearWrongDetectedHighlight: vi.fn(),
      onResolveMissedPrompt: vi.fn(),
      onAdvancePrompt: vi.fn(),
      requestAnimationFrame: vi.fn(() => 1),
      cancelAnimationFrame: vi.fn(),
      now: () => 1_700,
    });

    const result = controller.syncPromptEventFromRuntime();

    expect(result.context?.melody.id).toBe('melody:test');
    expect(result.activeEventIndex).toBe(1);
    expect(state.performanceActiveEventIndex).toBe(1);
    expect(state.currentMelodyEventIndex).toBe(1);
    expect(state.startTime).toBe(1_500);
  });

  it('completes the performance run and delegates prompt advancement', () => {
    const state = createState();
    const dom = createDom('performance');
    const onResolveMissedPrompt = vi.fn();
    const onAdvancePrompt = vi.fn();
    state.performanceRuntimeStartedAtMs = 1_000;
    state.currentPrompt = { displayText: 'Play', targetNote: 'C' } as any;
    state.activeSessionStats = { completedRun: false } as any;
    const controller = createPerformanceTransportRuntimeController({
      dom,
      state,
      isPerformanceStyleMode: (mode) => mode === 'performance' || mode === 'practice',
      getMelodyById: () => createMelody(),
      getPracticeAdjustedMelody: (melody) => melody,
      redrawFretboard: vi.fn(),
      scheduleTimelineRender: vi.fn(),
      clearPerformanceTimelineFeedback: vi.fn(),
      clearWrongDetectedHighlight: vi.fn(),
      onResolveMissedPrompt,
      onAdvancePrompt,
      requestAnimationFrame: vi.fn(() => 1),
      cancelAnimationFrame: vi.fn(),
      now: () => 2_600,
    });

    controller.syncTransport();

    expect(onResolveMissedPrompt).toHaveBeenCalledTimes(1);
    expect(onAdvancePrompt).toHaveBeenCalledTimes(1);
    expect(state.performanceRunCompleted).toBe(true);
    expect(state.activeSessionStats.completedRun).toBe(true);
    expect(state.performanceActiveEventIndex).toBeNull();
    expect(state.currentMelodyEventIndex).toBe(2);
    expect(state.pendingSessionStopResultMessage).toEqual({
      text: 'Performance complete! (Test Melody)',
      tone: 'success',
    });
  });
});
