import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPerformancePromptController } from './performance-prompt-controller';
import type { Prompt } from './types';

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
    recordSessionAttempt: vi.fn(),
    updateStats: vi.fn(),
    updateSessionGoalProgress: vi.fn(),
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
    expect(deps.recordSessionAttempt).toHaveBeenCalledWith({}, prompt, true, 1.25, {});
    expect(deps.updateStats).toHaveBeenCalledWith(true, 1.25);
    expect(deps.updateSessionGoalProgress).toHaveBeenCalledTimes(1);
    expect(deps.drawFretboard).toHaveBeenCalledWith(false, 'C', 'A');
    expect(deps.setResultMessage).toHaveBeenCalledWith('Hit: 1.25s', 'success');

    deps.recordSessionAttempt.mockClear();
    controller.resolveSuccess(2);
    expect(deps.recordSessionAttempt).not.toHaveBeenCalled();
  });

  it('schedules a miss and advances to the next prompt when unresolved', () => {
    const prompt = createPrompt({ targetMelodyEventNotes: [{ note: 'C', string: 'A', fret: 3, finger: 1 }] });
    const { deps, state } = createDeps({ prompt });
    const controller = createPerformancePromptController(deps);

    controller.scheduleAdvance(prompt);
    vi.runAllTimers();

    expect(state.performancePromptResolved).toBe(true);
    expect(state.performancePromptMatched).toBe(false);
    expect(deps.recordSessionAttempt).toHaveBeenCalledWith({}, prompt, false, 0, {});
    expect(deps.setResultMessage).toHaveBeenCalledWith('Missed event.', 'error');
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(deps.nextPrompt).toHaveBeenCalledTimes(1);
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

    controller.resetPromptResolution();

    expect(state.performancePromptResolved).toBe(false);
    expect(state.performancePromptMatched).toBe(false);
  });
});
