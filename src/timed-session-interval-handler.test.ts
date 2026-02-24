import { describe, expect, it, vi } from 'vitest';
import { createTimedSessionIntervalHandler } from './timed-session-interval-handler';

describe('createTimedSessionIntervalHandler', () => {
  it('decrements timer, updates ui, and triggers time-up at zero', () => {
    let timeLeft = 1;
    const deps = {
      decrementTimeLeft: vi.fn(() => {
        timeLeft -= 1;
        return timeLeft;
      }),
      setTimerValue: vi.fn(),
      handleTimeUp: vi.fn(),
      onRuntimeError: vi.fn(),
    };
    const tick = createTimedSessionIntervalHandler(deps);

    tick();

    expect(deps.decrementTimeLeft).toHaveBeenCalledTimes(1);
    expect(deps.setTimerValue).toHaveBeenCalledWith(0);
    expect(deps.handleTimeUp).toHaveBeenCalledTimes(1);
    expect(deps.onRuntimeError).not.toHaveBeenCalled();
  });

  it('does not trigger time-up while time remains', () => {
    let timeLeft = 3;
    const deps = {
      decrementTimeLeft: vi.fn(() => {
        timeLeft -= 1;
        return timeLeft;
      }),
      setTimerValue: vi.fn(),
      handleTimeUp: vi.fn(),
      onRuntimeError: vi.fn(),
    };
    const tick = createTimedSessionIntervalHandler(deps);

    tick();

    expect(deps.setTimerValue).toHaveBeenCalledWith(2);
    expect(deps.handleTimeUp).not.toHaveBeenCalled();
  });

  it('reports runtime errors thrown during timer updates', () => {
    const error = new Error('timer broke');
    const deps = {
      decrementTimeLeft: vi.fn(() => {
        throw error;
      }),
      setTimerValue: vi.fn(),
      handleTimeUp: vi.fn(),
      onRuntimeError: vi.fn(),
    };
    const tick = createTimedSessionIntervalHandler(deps);

    tick();

    expect(deps.onRuntimeError).toHaveBeenCalledWith('timed interval tick', error);
    expect(deps.setTimerValue).not.toHaveBeenCalled();
  });
});
