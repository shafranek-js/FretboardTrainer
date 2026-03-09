import { describe, expect, it, vi } from 'vitest';
import { createMetronomeControlsController } from './metronome-controls-controller';

type Listener = () => void | Promise<void>;

type MockControl = {
  listeners: Record<string, Listener>;
  checked: boolean;
  value: string;
  addEventListener: ReturnType<typeof vi.fn>;
};

function createControl(value = '', checked = false): MockControl {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    checked,
    value,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  };
}

function createDeps() {
  return {
    dom: {
      metronomeToggleBtn: createControl(),
      metronomeEnabled: createControl('', false),
      metronomeBpm: createControl('90'),
      metronomeVolume: createControl('50'),
    },
    syncHiddenMetronomeTempoFromSharedTempo: vi.fn(),
    syncMelodyMetronomeRuntime: vi.fn(async () => {}),
    renderMetronomeToggleButton: vi.fn(),
    saveSettings: vi.fn(),
    syncMelodyTempoFromMetronomeIfLinked: vi.fn(async () => {}),
    syncMetronomeVolumeDisplayAndRuntime: vi.fn(),
  };
}

describe('metronome-controls-controller', () => {
  it('toggles the metronome enabled flag from the button and syncs runtime', async () => {
    const deps = createDeps();
    const controller = createMetronomeControlsController(deps as never);

    controller.register();
    await deps.dom.metronomeToggleBtn.listeners.click();

    expect(deps.dom.metronomeEnabled.checked).toBe(true);
    expect(deps.syncHiddenMetronomeTempoFromSharedTempo).toHaveBeenCalledTimes(1);
    expect(deps.syncMelodyMetronomeRuntime).toHaveBeenCalledTimes(1);
    expect(deps.renderMetronomeToggleButton).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('syncs the existing enabled state when the checkbox changes directly', async () => {
    const deps = createDeps();
    const controller = createMetronomeControlsController(deps as never);

    controller.register();
    deps.dom.metronomeEnabled.checked = true;
    await deps.dom.metronomeEnabled.listeners.change();

    expect(deps.syncHiddenMetronomeTempoFromSharedTempo).toHaveBeenCalledTimes(1);
    expect(deps.syncMelodyMetronomeRuntime).toHaveBeenCalledTimes(1);
    expect(deps.renderMetronomeToggleButton).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('reuses the shared tempo sync for bpm input and change events', async () => {
    const deps = createDeps();
    const controller = createMetronomeControlsController(deps as never);

    controller.register();
    await deps.dom.metronomeBpm.listeners.input();
    await deps.dom.metronomeBpm.listeners.change();

    expect(deps.syncMelodyTempoFromMetronomeIfLinked).toHaveBeenCalledTimes(2);
    expect(deps.saveSettings).toHaveBeenCalledTimes(2);
  });

  it('syncs metronome volume for both input and change events', () => {
    const deps = createDeps();
    const controller = createMetronomeControlsController(deps as never);

    controller.register();
    deps.dom.metronomeVolume.listeners.input();
    deps.dom.metronomeVolume.listeners.change();

    expect(deps.syncMetronomeVolumeDisplayAndRuntime).toHaveBeenCalledTimes(2);
    expect(deps.saveSettings).toHaveBeenCalledTimes(2);
  });
});
