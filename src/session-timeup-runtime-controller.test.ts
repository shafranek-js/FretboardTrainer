import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionTimeUpRuntimeController } from './session-timeup-runtime-controller';

function createDeps(stateOverrides = {}) {
  const state = {
    currentScore: 42,
    stats: { highScore: 30 },
    timerId: 55,
    showSessionSummaryOnStop: false,
    ...stateOverrides,
  };

  const deps = {
    state,
    clearInterval: vi.fn(),
    saveStats: vi.fn(),
    stopListening: vi.fn(),
    setResultMessage: vi.fn(),
  };

  return { state, deps };
}

describe('session-timeup-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a new high score and stops the session', () => {
    const { state, deps } = createDeps();
    const controller = createSessionTimeUpRuntimeController(deps);

    controller.handleTimeUp();

    expect(deps.clearInterval).toHaveBeenCalledWith(55);
    expect(state.timerId).toBeNull();
    expect(state.stats.highScore).toBe(42);
    expect(deps.saveStats).toHaveBeenCalledTimes(1);
    expect(state.showSessionSummaryOnStop).toBe(true);
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith("Time's Up! Final Score: 42");
  });

  it('skips high-score persistence when the score is not improved', () => {
    const { state, deps } = createDeps({ currentScore: 10, stats: { highScore: 99 }, timerId: null });
    const controller = createSessionTimeUpRuntimeController(deps);

    controller.handleTimeUp();

    expect(deps.clearInterval).not.toHaveBeenCalled();
    expect(state.stats.highScore).toBe(99);
    expect(deps.saveStats).not.toHaveBeenCalled();
    expect(state.showSessionSummaryOnStop).toBe(true);
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
  });
});
