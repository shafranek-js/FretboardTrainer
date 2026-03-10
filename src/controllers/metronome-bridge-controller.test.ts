import { describe, expect, it, vi } from 'vitest';
import { createMetronomeBridgeController } from './metronome-bridge-controller';

function createDeps() {
  return {
    dom: {
      metronomeVolume: { value: '83' } as HTMLInputElement,
      metronomeVolumeValue: { textContent: '' } as HTMLElement,
    },
    metronomeRuntime: {
      syncBpmDisplay: vi.fn(),
      getClampedBpmFromInput: vi.fn(() => 96),
      resetVisualIndicator: vi.fn(),
    },
    melodyTempo: {
      syncMelodyTempoFromMetronomeIfLinked: vi.fn(async () => {}),
      hydrateMelodyTempoForSelectedMelody: vi.fn(),
      persistSelectedMelodyTempoOverride: vi.fn(),
      syncHiddenMetronomeTempoFromSharedTempo: vi.fn(),
      syncMetronomeTempoFromMelodyIfLinked: vi.fn(async () => {}),
      startMelodyMetronomeIfEnabled: vi.fn(async () => {}),
      syncMelodyMetronomeRuntime: vi.fn(async () => {}),
      renderMetronomeToggleButton: vi.fn(),
      syncMelodyTimelineZoomDisplay: vi.fn(),
      syncScrollingTabZoomDisplay: vi.fn(),
    },
    clampMetronomeVolumePercent: vi.fn(() => 80),
    setMetronomeVolume: vi.fn(),
  };
}

describe('metronome-bridge-controller', () => {
  it('delegates bpm and melody tempo bridge calls', async () => {
    const deps = createDeps();
    const controller = createMetronomeBridgeController(deps);

    controller.syncMetronomeBpmDisplay();
    expect(controller.getClampedMetronomeBpmFromInput()).toBe(96);
    controller.resetMetronomeVisualIndicator();
    await controller.syncMelodyTempoFromMetronomeIfLinked();
    controller.hydrateMelodyTempoForSelectedMelody();
    controller.persistSelectedMelodyTempoOverride();
    controller.syncHiddenMetronomeTempoFromSharedTempo();
    await controller.syncMetronomeTempoFromMelodyIfLinked();
    await controller.startMelodyMetronomeIfEnabled({ alignToPerformanceTimeMs: 12 });
    await controller.syncMelodyMetronomeRuntime();
    controller.renderMetronomeToggleButton();
    controller.syncMelodyTimelineZoomDisplay();
    controller.syncScrollingTabZoomDisplay();

    expect(deps.metronomeRuntime.syncBpmDisplay).toHaveBeenCalledTimes(1);
    expect(deps.metronomeRuntime.getClampedBpmFromInput).toHaveBeenCalledTimes(1);
    expect(deps.metronomeRuntime.resetVisualIndicator).toHaveBeenCalledTimes(1);
    expect(deps.melodyTempo.syncMelodyTempoFromMetronomeIfLinked).toHaveBeenCalledTimes(1);
    expect(deps.melodyTempo.hydrateMelodyTempoForSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.melodyTempo.persistSelectedMelodyTempoOverride).toHaveBeenCalledTimes(1);
    expect(deps.melodyTempo.syncHiddenMetronomeTempoFromSharedTempo).toHaveBeenCalledTimes(1);
    expect(deps.melodyTempo.syncMetronomeTempoFromMelodyIfLinked).toHaveBeenCalledTimes(1);
    expect(deps.melodyTempo.startMelodyMetronomeIfEnabled).toHaveBeenCalledWith({ alignToPerformanceTimeMs: 12 });
    expect(deps.melodyTempo.syncMelodyMetronomeRuntime).toHaveBeenCalledTimes(1);
    expect(deps.melodyTempo.renderMetronomeToggleButton).toHaveBeenCalledTimes(1);
    expect(deps.melodyTempo.syncMelodyTimelineZoomDisplay).toHaveBeenCalledTimes(1);
    expect(deps.melodyTempo.syncScrollingTabZoomDisplay).toHaveBeenCalledTimes(1);
  });

  it('normalizes metronome volume, updates the label, and applies runtime volume', () => {
    const deps = createDeps();
    const controller = createMetronomeBridgeController(deps);

    controller.syncMetronomeVolumeDisplayAndRuntime();

    expect(deps.clampMetronomeVolumePercent).toHaveBeenCalledWith(83);
    expect(deps.dom.metronomeVolume.value).toBe('80');
    expect(deps.dom.metronomeVolumeValue.textContent).toBe('80%');
    expect(deps.setMetronomeVolume).toHaveBeenCalledWith(80);
  });
});
