import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPerformancePromptController } from './performance-prompt-controller';
import type { Prompt } from './types';
import type { PerformanceTimingGrade } from './performance-timing-grade';

function createPrompt(overrides?: Partial<Prompt>): Prompt {
  return {
    displayText: 'Performance [1/4]: C',
    targetNote: 'C',
    targetString: 'A',
    targetChordNotes: [],
    targetChordFingering: [],
    targetMelodyEventNotes: [],
    baseChordName: null,
    melodyEventDurationMs: 240,
    ...overrides,
  };
}

function createDeps(options?: { prompt?: Prompt | null; mode?: string; showingAllNotes?: boolean }) {
  const state = {
    currentPrompt: options?.prompt ?? null,
    performancePromptResolved: false,
    performancePromptMatched: false,
    performancePromptHadAttempt: false,
    performancePromptHadWrongAttempt: false,
    pendingTimeoutIds: new Set<number>(),
    isListening: true,
    showingAllNotes: options?.showingAllNotes ?? false,
    currentMelodyEventFoundNotes: new Set<string>(),
    activeSessionStats: {},
    currentInstrument: {},
  };

  const deps = {
    state,
    getTrainingMode: vi.fn(() => options?.mode ?? 'performance'),
    clearWrongDetectedHighlight: vi.fn(),
    recordPerformanceTimelineSuccess: vi.fn(),
    recordPerformanceTimelineMissed: vi.fn(),
    recordSessionAttempt: vi.fn(),
    recordPerformancePromptResolution: vi.fn(),
    updateStats: vi.fn(),
    updateSessionGoalProgress: vi.fn(),
    recordPerformanceTimingAttempt: vi.fn(),
    recordPerformanceTimingByEvent: vi.fn(),
    setInfoSlots: vi.fn(),
    redrawFretboard: vi.fn(),
    drawFretboard: vi.fn(),
    setResultMessage: vi.fn(),
    scheduleSessionTimeout: vi.fn((_: number, callback: () => void) => {
      return setTimeout(callback, 0) as unknown as number;
    }),
    nextPrompt: vi.fn(),
  };

  return { deps, state };
}

describe('performance-prompt-controller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves performance success once and records the result', () => {
    const prompt = createPrompt();
    const { deps, state } = createDeps({ prompt });
    const controller = createPerformancePromptController(deps);

    controller.resolveSuccess(1.25);

    expect(state.performancePromptResolved).toBe(true);
    expect(state.performancePromptMatched).toBe(true);
    expect(deps.clearWrongDetectedHighlight).toHaveBeenCalledTimes(1);
    expect(deps.recordPerformanceTimelineSuccess).toHaveBeenCalledWith(prompt, false);
    expect(deps.recordSessionAttempt).toHaveBeenCalledWith({}, prompt, true, 1.25, {});
    expect(deps.recordPerformancePromptResolution).toHaveBeenCalledWith({}, {
      correct: true,
      hadAttempt: false,
      hadWrongAttempt: false,
    });
    expect(deps.updateStats).toHaveBeenCalledWith(true, 1.25);
    expect(deps.updateSessionGoalProgress).toHaveBeenCalledTimes(1);
    expect(deps.recordPerformanceTimingAttempt).toHaveBeenCalledWith({}, null);
    expect(deps.recordPerformanceTimingByEvent).toHaveBeenCalledWith(null);
    expect(deps.drawFretboard).not.toHaveBeenCalled();
    expect(deps.setResultMessage).not.toHaveBeenCalled();
    expect(deps.nextPrompt).not.toHaveBeenCalled();

    deps.recordSessionAttempt.mockClear();
    deps.nextPrompt.mockClear();
    controller.resolveSuccess(2);
    expect(deps.recordSessionAttempt).not.toHaveBeenCalled();
    expect(deps.nextPrompt).not.toHaveBeenCalled();
  });

  it('shows timing-grade feedback and records timing stats on success', () => {
    const prompt = createPrompt();
    const { deps } = createDeps({ prompt });
    const controller = createPerformancePromptController(deps);
    const timingGrade: PerformanceTimingGrade = {
      bucket: 'aBitLate',
      label: 'A bit late',
      weight: 0.9,
      signedOffsetMs: 82,
    };

    controller.resolveSuccess(0.9, timingGrade);

    expect(deps.recordPerformanceTimingAttempt).toHaveBeenCalledWith({}, timingGrade);
    expect(deps.recordPerformanceTimingByEvent).toHaveBeenCalledWith(timingGrade);
    expect(deps.setResultMessage).toHaveBeenCalledWith('A bit late', 'success');
  });

  it('keeps the nominal deadline active after success so performance stays time-driven', () => {
    const prompt = createPrompt();
    const { deps } = createDeps({ prompt });
    const controller = createPerformancePromptController(deps);

    controller.scheduleAdvance(prompt);
    controller.resolveSuccess(0.42);
    const nominalCallback = deps.scheduleSessionTimeout.mock.calls[0]?.[1] as (() => void) | undefined;
    nominalCallback?.();

    expect(deps.nextPrompt).toHaveBeenCalledTimes(1);
    expect(deps.recordPerformanceTimelineMissed).not.toHaveBeenCalled();
  });

  it('advances on the nominal duration when there was no attempt', () => {
    const prompt = createPrompt({ targetMelodyEventNotes: [{ note: 'C', string: 'A', fret: 3, finger: 1 }] });
    const { deps, state } = createDeps({ prompt });
    const controller = createPerformancePromptController(deps);

    controller.scheduleAdvance(prompt);
    expect(deps.scheduleSessionTimeout).toHaveBeenCalledWith(
      240,
      expect.any(Function),
      'performance nextPrompt'
    );
    const nominalCallback = deps.scheduleSessionTimeout.mock.calls[0]?.[1] as (() => void) | undefined;
    expect(nominalCallback).toBeTypeOf('function');
    nominalCallback?.();

    expect(state.performancePromptResolved).toBe(true);
    expect(state.performancePromptMatched).toBe(false);
    expect(state.performancePromptHadAttempt).toBe(false);
    expect(deps.recordPerformanceTimelineMissed).toHaveBeenCalledWith(prompt);
    expect(deps.recordSessionAttempt).toHaveBeenCalledWith({}, prompt, false, 0, {});
    expect(deps.recordPerformancePromptResolution).toHaveBeenCalledWith({}, {
      correct: false,
      hadAttempt: false,
      hadWrongAttempt: false,
    });
    expect(deps.setResultMessage).toHaveBeenCalledWith('Missed event.', 'error');
    expect(deps.redrawFretboard).not.toHaveBeenCalled();
    expect(deps.nextPrompt).toHaveBeenCalledTimes(1);
  });

  it('does not delay transport after a real attempt', () => {
    const prompt = createPrompt();
    const { deps, state } = createDeps({ prompt });
    const controller = createPerformancePromptController(deps);

    controller.scheduleAdvance(prompt);
    controller.markPromptAttempt();

    const nominalCallback = deps.scheduleSessionTimeout.mock.calls[0]?.[1] as (() => void) | undefined;
    nominalCallback?.();

    expect(state.performancePromptResolved).toBe(true);
    expect(state.performancePromptMatched).toBe(false);
    expect(state.performancePromptHadAttempt).toBe(true);
    expect(deps.recordPerformanceTimelineMissed).toHaveBeenCalledWith(prompt);
    expect(deps.recordPerformancePromptResolution).toHaveBeenCalledWith({}, {
      correct: false,
      hadAttempt: true,
      hadWrongAttempt: false,
    });
    expect(deps.nextPrompt).toHaveBeenCalledTimes(1);
    expect(deps.scheduleSessionTimeout).toHaveBeenCalledTimes(1);
  });

  it('invalidates pending advance and prevents stale callback execution', () => {
    const prompt = createPrompt();
    const { deps } = createDeps({ prompt });
    const controller = createPerformancePromptController(deps);

    controller.scheduleAdvance(prompt);
    controller.invalidatePendingAdvance();
    vi.runAllTimers();

    expect(deps.recordSessionAttempt).not.toHaveBeenCalled();
    expect(deps.nextPrompt).not.toHaveBeenCalled();
  });

  it('resets prompt resolution flags explicitly', () => {
    const prompt = createPrompt();
    const { deps, state } = createDeps({ prompt });
    const controller = createPerformancePromptController(deps);
    state.performancePromptResolved = true;
    state.performancePromptMatched = true;
    state.performancePromptHadAttempt = true;
    state.performancePromptHadWrongAttempt = true;

    controller.resetPromptResolution();

    expect(state.performancePromptResolved).toBe(false);
    expect(state.performancePromptMatched).toBe(false);
    expect(state.performancePromptHadAttempt).toBe(false);
    expect(state.performancePromptHadWrongAttempt).toBe(false);
  });
});
