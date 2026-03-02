import { describe, expect, it, vi } from 'vitest';
import { createPwaUpdateController } from './pwa-update-controller';

function createScheduler() {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  return {
    scheduleCheck(callback: () => void) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelScheduledCheck(id: number) {
      callbacks.delete(id);
    },
    runAll() {
      const pending = [...callbacks.entries()];
      callbacks.clear();
      pending.forEach(([, callback]) => callback());
    },
  };
}

describe('pwa-update-controller', () => {
  it('applies the update immediately when no session is active', () => {
    const scheduler = createScheduler();
    const deps = {
      isSessionActive: vi.fn(() => false),
      setStatusText: vi.fn(),
      setResultMessage: vi.fn(),
      applyUpdate: vi.fn(),
      scheduleCheck: vi.fn((callback: () => void, _delayMs: number) => scheduler.scheduleCheck(callback)),
      cancelScheduledCheck: vi.fn((id: number) => scheduler.cancelScheduledCheck(id)),
    };

    const controller = createPwaUpdateController(deps);
    controller.handleNeedRefresh();

    expect(deps.setStatusText).toHaveBeenCalledWith('Updating...');
    expect(deps.setResultMessage).toHaveBeenCalledWith('A new version is ready. Reloading now...');
    expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
    expect(controller.hasPendingUpdate()).toBe(false);
  });

  it('waits for the active session to stop before applying the update', () => {
    const scheduler = createScheduler();
    let sessionActive = true;
    const deps = {
      isSessionActive: vi.fn(() => sessionActive),
      setStatusText: vi.fn(),
      setResultMessage: vi.fn(),
      applyUpdate: vi.fn(),
      scheduleCheck: vi.fn((callback: () => void, _delayMs: number) => scheduler.scheduleCheck(callback)),
      cancelScheduledCheck: vi.fn((id: number) => scheduler.cancelScheduledCheck(id)),
    };

    const controller = createPwaUpdateController(deps);
    controller.handleNeedRefresh();

    expect(deps.setStatusText).toHaveBeenCalledWith('Update ready.');
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'A new version is ready. It will load automatically after the current session stops.'
    );
    expect(deps.applyUpdate).not.toHaveBeenCalled();
    expect(controller.hasPendingUpdate()).toBe(true);

    sessionActive = false;
    scheduler.runAll();

    expect(deps.applyUpdate).toHaveBeenCalledTimes(1);
    expect(controller.hasPendingUpdate()).toBe(false);
  });
});

