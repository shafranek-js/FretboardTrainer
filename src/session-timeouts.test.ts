import { describe, expect, it, vi } from 'vitest';
import { clearTrackedTimeouts, scheduleTrackedCooldown, scheduleTrackedTimeout } from './session-timeouts';

function createFakeScheduler() {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  const clearedIds: number[] = [];

  return {
    setTimeoutFn(callback: () => void) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    clearTimeoutFn(id: number) {
      clearedIds.push(id);
      callbacks.delete(id);
    },
    run(id: number) {
      const callback = callbacks.get(id);
      if (!callback) return;
      callbacks.delete(id);
      callback();
    },
    get clearedIds() {
      return clearedIds;
    },
    has(id: number) {
      return callbacks.has(id);
    },
  };
}

describe('scheduleTrackedTimeout', () => {
  it('tracks timeout ids and removes them after execution', () => {
    const pending = new Set<number>();
    const scheduler = createFakeScheduler();
    const onError = vi.fn();
    const callback = vi.fn();

    const id = scheduleTrackedTimeout({
      pendingTimeoutIds: pending,
      delayMs: 100,
      callback,
      context: 'test timeout',
      onError,
      setTimeoutFn: scheduler.setTimeoutFn,
    });

    expect(pending.has(id)).toBe(true);
    expect(scheduler.has(id)).toBe(true);

    scheduler.run(id);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(pending.has(id)).toBe(false);
  });

  it('reports callback errors through onError', () => {
    const pending = new Set<number>();
    const scheduler = createFakeScheduler();
    const error = new Error('boom');
    const onError = vi.fn();

    const id = scheduleTrackedTimeout({
      pendingTimeoutIds: pending,
      delayMs: 100,
      callback: () => {
        throw error;
      },
      context: 'timeout callback',
      onError,
      setTimeoutFn: scheduler.setTimeoutFn,
    });

    scheduler.run(id);

    expect(onError).toHaveBeenCalledWith('timeout callback', error);
    expect(pending.has(id)).toBe(false);
  });
});

describe('scheduleTrackedCooldown', () => {
  it('sets and clears cooldown around callback execution', () => {
    const pending = new Set<number>();
    const scheduler = createFakeScheduler();
    const cooldownValues: boolean[] = [];
    const callback = vi.fn();

    scheduleTrackedCooldown({
      pendingTimeoutIds: pending,
      delayMs: 50,
      callback,
      context: 'cooldown',
      onError: vi.fn(),
      setCooldown: (value) => cooldownValues.push(value),
      setTimeoutFn: scheduler.setTimeoutFn,
    });

    expect(cooldownValues).toEqual([true]);
    const id = [...pending][0];
    scheduler.run(id);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(cooldownValues).toEqual([true, false]);
  });

  it('clears cooldown even when callback throws', () => {
    const pending = new Set<number>();
    const scheduler = createFakeScheduler();
    const cooldownValues: boolean[] = [];
    const onError = vi.fn();

    scheduleTrackedCooldown({
      pendingTimeoutIds: pending,
      delayMs: 50,
      callback: () => {
        throw new Error('cooldown fail');
      },
      context: 'cooldown error',
      onError,
      setCooldown: (value) => cooldownValues.push(value),
      setTimeoutFn: scheduler.setTimeoutFn,
    });

    const id = [...pending][0];
    scheduler.run(id);

    expect(cooldownValues).toEqual([true, false]);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('clearTrackedTimeouts', () => {
  it('clears all tracked ids and empties the registry', () => {
    const pending = new Set<number>([1, 2, 3]);
    const scheduler = createFakeScheduler();

    clearTrackedTimeouts(pending, scheduler.clearTimeoutFn);

    expect(pending.size).toBe(0);
    expect(scheduler.clearedIds).toEqual([1, 2, 3]);
  });
});
