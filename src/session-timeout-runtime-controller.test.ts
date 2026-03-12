import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionTimeoutRuntimeController } from './session-timeout-runtime-controller';

function createDeps() {
  const state = {
    pendingTimeoutIds: new Set<number>(),
    cooldown: false,
  };
  const deps = {
    state,
    scheduleTrackedTimeout: vi.fn(({ pendingTimeoutIds, callback }) => {
      pendingTimeoutIds.add(11);
      callback();
      return 11;
    }),
    scheduleTrackedCooldown: vi.fn(({ setCooldown, callback }) => {
      setCooldown(true);
      callback();
      setCooldown(false);
    }),
    onRuntimeError: vi.fn(),
  };

  return { state, deps };
}

describe('session-timeout-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('schedules tracked timeouts against session state', () => {
    const { state, deps } = createDeps();
    const callback = vi.fn();
    const controller = createSessionTimeoutRuntimeController(deps);

    const id = controller.scheduleTimeout(250, callback, 'test timeout');

    expect(id).toBe(11);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(state.pendingTimeoutIds.has(11)).toBe(true);
    expect(deps.scheduleTrackedTimeout).toHaveBeenCalledWith({
      pendingTimeoutIds: state.pendingTimeoutIds,
      delayMs: 250,
      callback,
      context: 'test timeout',
      onError: deps.onRuntimeError,
    });
  });

  it('wraps cooldown scheduling and toggles session cooldown state', () => {
    const { state, deps } = createDeps();
    const callback = vi.fn();
    const controller = createSessionTimeoutRuntimeController(deps);

    controller.scheduleCooldown('cooldown', 400, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(state.cooldown).toBe(false);
    expect(deps.scheduleTrackedCooldown).toHaveBeenCalledTimes(1);
    const call = deps.scheduleTrackedCooldown.mock.calls[0][0];
    expect(call.pendingTimeoutIds).toBe(state.pendingTimeoutIds);
    expect(call.delayMs).toBe(400);
    expect(call.context).toBe('cooldown');
    expect(call.onError).toBe(deps.onRuntimeError);
  });
});
