import { describe, expect, it, vi } from 'vitest';
import { executeSessionTimeUpPlan } from './session-timeup-executor';

describe('executeSessionTimeUpPlan', () => {
  it('persists high score when required and stops session', () => {
    const deps = {
      clearTimer: vi.fn(),
      persistHighScore: vi.fn(),
      stopListening: vi.fn(),
      setResultMessage: vi.fn(),
    };

    executeSessionTimeUpPlan(
      {
        message: "Time's Up! Final Score: 42",
        nextHighScore: 42,
        shouldPersistHighScore: true,
      },
      deps
    );

    expect(deps.clearTimer).toHaveBeenCalledTimes(1);
    expect(deps.persistHighScore).toHaveBeenCalledWith(42);
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith("Time's Up! Final Score: 42");
  });

  it('skips high score persistence when not needed', () => {
    const deps = {
      clearTimer: vi.fn(),
      persistHighScore: vi.fn(),
      stopListening: vi.fn(),
      setResultMessage: vi.fn(),
    };

    executeSessionTimeUpPlan(
      {
        message: "Time's Up! Final Score: 10",
        nextHighScore: 99,
        shouldPersistHighScore: false,
      },
      deps
    );

    expect(deps.persistHighScore).not.toHaveBeenCalled();
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
  });
});
