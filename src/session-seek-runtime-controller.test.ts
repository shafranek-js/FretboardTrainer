import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionSeekRuntimeController } from './session-seek-runtime-controller';

function createDeps(stateOverrides = {}, trainingMode = 'performance') {
  const state = {
    isListening: true,
    pendingTimeoutIds: new Set([1, 2]),
    currentMelodyEventIndex: 3,
    performanceActiveEventIndex: 3,
    currentMelodyEventFoundNotes: new Set(['E4']),
    pendingSessionStopResultMessage: { text: 'done', tone: 'success' as const },
    ...stateOverrides,
  };

  const deps = {
    state,
    getTrainingMode: vi.fn(() => trainingMode),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'practice' || mode === 'performance'),
    isPerformanceStyleMode: vi.fn((mode: string) => mode === 'practice' || mode === 'performance'),
    clearTrackedTimeouts: vi.fn(),
    invalidatePendingAdvance: vi.fn(),
    clearPerformanceTimelineFeedback: vi.fn(),
    resetPromptResolution: vi.fn(),
    clearWrongDetectedHighlight: vi.fn(),
    startRuntimeClock: vi.fn(),
    nextPrompt: vi.fn(),
  };

  return { state, deps };
}

describe('session-seek-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeks performance sessions, resets transient state, and restarts runtime clock', () => {
    const { state, deps } = createDeps();
    const controller = createSessionSeekRuntimeController(deps);

    const result = controller.seekToEvent(5.7);

    expect(result).toBe(true);
    expect(deps.clearTrackedTimeouts).toHaveBeenCalledWith(state.pendingTimeoutIds);
    expect(deps.invalidatePendingAdvance).toHaveBeenCalledTimes(1);
    expect(deps.clearPerformanceTimelineFeedback).toHaveBeenCalledTimes(1);
    expect(state.currentMelodyEventIndex).toBe(6);
    expect(state.performanceActiveEventIndex).toBe(6);
    expect(state.currentMelodyEventFoundNotes.size).toBe(0);
    expect(deps.resetPromptResolution).toHaveBeenCalledTimes(1);
    expect(state.pendingSessionStopResultMessage).toBeNull();
    expect(deps.clearWrongDetectedHighlight).toHaveBeenCalledTimes(1);
    expect(deps.startRuntimeClock).toHaveBeenCalledWith(6);
    expect(deps.nextPrompt).toHaveBeenCalledTimes(1);
  });

  it('seeks non-performance melody workflow without runtime clock restart', () => {
    const { state, deps } = createDeps({}, 'melody');
    const controller = createSessionSeekRuntimeController(deps);

    const result = controller.seekToEvent(-2);

    expect(result).toBe(true);
    expect(state.currentMelodyEventIndex).toBe(0);
    expect(state.performanceActiveEventIndex).toBeNull();
    expect(deps.startRuntimeClock).not.toHaveBeenCalled();
    expect(deps.nextPrompt).toHaveBeenCalledTimes(1);
  });

  it('does nothing when not listening or outside melody workflow', () => {
    const notListening = createSessionSeekRuntimeController(createDeps({ isListening: false }).deps);
    expect(notListening.seekToEvent(3)).toBe(false);

    const nonMelody = createSessionSeekRuntimeController(createDeps({}, 'random').deps);
    expect(nonMelody.seekToEvent(3)).toBe(false);
  });
});
