import { describe, expect, it, vi } from 'vitest';
import { createMetronomeRuntimeBridgeController } from './metronome-runtime-bridge-controller';

function createDeps() {
  return {
    syncBpmDisplay: vi.fn(),
    getClampedBpmFromInput: vi.fn(() => 96),
    resetVisualIndicator: vi.fn(),
  };
}

describe('metronome-runtime-bridge-controller', () => {
  it('delegates runtime helpers', () => {
    const deps = createDeps();
    const controller = createMetronomeRuntimeBridgeController(deps);

    controller.syncBpmDisplay();
    expect(controller.getClampedBpmFromInput()).toBe(96);
    controller.resetVisualIndicator();

    expect(deps.syncBpmDisplay).toHaveBeenCalledTimes(1);
    expect(deps.getClampedBpmFromInput).toHaveBeenCalledTimes(1);
    expect(deps.resetVisualIndicator).toHaveBeenCalledTimes(1);
  });
});
